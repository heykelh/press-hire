/**
 * Chaîne complète : offre → brief (modèle de langue) → cartouche assemblée → contrôles → corrections.
 * Écrite comme un générateur pour pouvoir afficher la progression en direct dans le studio.
 */
import { makeSlug, validateCartridge, type Cartridge, type Issue, type ValidationResult } from "@press-hire/cartridge";
import { autoBalance, assemble, repairBrief } from "./brief";
import { parseJsonReply, type Llm } from "./llm";
import { fetchOffer, mergeOffer, type Offer } from "./offer";
import type { CandidateProfile } from "./profile";
import { SYSTEM_PROMPT, repairPrompt, userPrompt } from "./prompt";

export interface GenerateInput {
  offerUrl?: string;
  offerText?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  contact?: { name: string; role?: string };
}

export interface GenerateDeps {
  llm: Llm;
  profile: CandidateProfile;
  fetchImpl?: typeof fetch;
  now?: Date;
  rand?: () => number;
  /** nombre de tours de correction par le modèle */
  maxRepairs?: number;
}

export type GenerateEvent =
  | { type: "step"; message: string }
  | { type: "warn"; message: string }
  | { type: "done"; cartridge: Cartridge; slug: string; issues: Issue[]; attempts: number }
  | { type: "fail"; message: string; issues?: Issue[] };

type Obj = Record<string, unknown>;
const pick = (o: unknown, ...path: string[]): string | undefined => {
  let cur: unknown = o;
  for (const k of path) cur = cur && typeof cur === "object" ? (cur as Obj)[k] : undefined;
  return typeof cur === "string" && cur.trim() ? cur.trim() : undefined;
};

const errorsOf = (issues: Issue[]) => issues.filter((i) => i.severity === "error");
const onlyBalance = (issues: Issue[]) => errorsOf(issues).every((i) => i.rule.startsWith("balance-"));

export async function* generate(input: GenerateInput, deps: GenerateDeps): AsyncGenerator<GenerateEvent> {
  const now = deps.now ?? new Date();
  const maxRepairs = deps.maxRepairs ?? 2;

  /* 1. l'offre */
  let fetched: Offer | null = null;
  if (input.offerUrl) {
    yield { type: "step", message: "Lecture de la page de l'offre…" };
    try {
      fetched = await fetchOffer(input.offerUrl, deps.fetchImpl);
      yield { type: "step", message: fetched.source === "jsonld" ? "Offre lue (données structurées de la page)." : `Page lue : ${fetched.text.length} caractères de texte.` };
    } catch (e) {
      yield { type: "warn", message: `Page illisible : ${(e as Error).message}` };
    }
  }
  const offer = mergeOffer(fetched, input.offerText, input.offerUrl);
  if (offer.thin) {
    yield {
      type: "fail",
      message: input.offerUrl
        ? "Le site n'a pas laissé lire l'offre (connexion obligatoire ou page en JavaScript). Colle le texte de l'offre dans le champ prévu et relance."
        : "Il faut le lien de l'offre ou son texte (au moins quelques paragraphes).",
    };
    return;
  }

  /* 2. premier jet */
  yield { type: "step", message: `Écriture du jeu par ${deps.llm.name}… (30 s à 2 min)` };
  const user = userPrompt(offer, deps.profile, input);
  let reply: string;
  try {
    reply = await deps.llm.complete(SYSTEM_PROMPT, user);
  } catch (e) {
    yield { type: "fail", message: (e as Error).message };
    return;
  }

  let slug: string | null = null;
  let issues: Issue[] = [];
  let cartridge: Cartridge | undefined;
  let briefText = reply;

  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    let brief: Obj;
    try {
      brief = repairBrief(parseJsonReply(briefText)) as Obj;
    } catch (e) {
      issues = [{ rule: "json", severity: "error", path: "", message: (e as Error).message }];
      brief = {};
    }
    if (!slug) {
      const company = input.company || pick(brief, "target", "company", "name") || offer.company || "entreprise";
      const job = input.jobTitle || pick(brief, "target", "job", "title") || offer.title || "poste";
      slug = makeSlug(company, job, deps.rand);
    }
    if (Object.keys(brief).length) {
      const assembled = assemble(brief, { slug, profile: deps.profile, offerUrl: input.offerUrl, contact: input.contact, now });
      const r = validateCartridge(assembled);
      issues = r.issues;
      cartridge = r.cartridge;
      if (r.ok) {
        yield { type: "done", cartridge: r.cartridge, slug, issues, attempts: attempt + 1 };
        return;
      }
      // il ne reste que l'équilibrage : on règle les objectifs nous-mêmes
      if (r.cartridge && onlyBalance(r.issues)) {
        yield { type: "step", message: "Réglage automatique de la difficulté…" };
        let cur = r.cartridge;
        let balanced: ValidationResult = r;
        for (let round = 0; round < 3; round++) {
          const ids = errorsOf(balanced.issues)
            .map((i) => cur.levels[Number(i.path.match(/levels\[(\d+)\]/)?.[1] ?? -1)]?.id)
            .filter((x): x is string => !!x);
          cur = autoBalance(cur, ids, { singleGoal: round > 0 });
          balanced = validateCartridge(cur);
          if (balanced.ok || !balanced.cartridge || !onlyBalance(balanced.issues)) break;
          cur = balanced.cartridge;
        }
        if (balanced.ok && balanced.cartridge) {
          yield { type: "done", cartridge: balanced.cartridge, slug, issues: balanced.issues, attempts: attempt + 1 };
          return;
        }
        issues = balanced.issues;
      }
      briefText = JSON.stringify(brief);
    }
    if (attempt === maxRepairs) break;

    const n = errorsOf(issues).length;
    yield { type: "step", message: `${n} correction${n > 1 ? "s" : ""} demandée${n > 1 ? "s" : ""} au modèle (tour ${attempt + 1}/${maxRepairs})…` };
    try {
      briefText = await deps.llm.complete(SYSTEM_PROMPT, `${user}\n\n${repairPrompt(briefText, errorsOf(issues))}`);
    } catch (e) {
      yield { type: "fail", message: (e as Error).message, issues };
      return;
    }
  }
  void cartridge;
  yield { type: "fail", message: "Le jeu n'a pas passé les contrôles après corrections.", issues: errorsOf(issues) };
}
