/**
 * Chaîne complète de création d'un jeu :
 *   offre → fiche du poste → plan déterministe → écriture → contrôles et corrections
 *         → relecture (praticien, débutant, joueur) → révision → contrôles → jeu prêt.
 * Écrite comme un générateur pour afficher la progression en direct, avec un budget de temps
 * (les étapes de qualité facultatives sautent si la génération traîne).
 */
import { makeSlug, validateCartridge, type Cartridge, type Issue, type ValidationResult } from "@press-hire/cartridge";
import { applyPlan, autoBalance, assemble, repairBrief } from "./brief";
import { ANALYZE_SYSTEM, JobModel, jobSchemaJson, repairJob, requirementsFromJob, type JobModel as Job } from "./job";
import { parseJsonReply, type Llm } from "./llm";
import { fetchOffer, mergeOffer, type Offer } from "./offer";
import { planGame, type GamePlan } from "./plan";
import {
  CRITIC_SYSTEM, Critique, SYSTEM_PROMPT, analyzePrompt, criticPrompt, needsRevision, repairPrompt, revisePrompt, userPrompt,
  type Critique as CritiqueT,
} from "./prompt";

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
  fetchImpl?: typeof fetch;
  now?: Date;
  rand?: () => number;
  /** nombre de tours de correction par le modèle */
  maxRepairs?: number;
  /** temps total autorisé (ms) : au-delà de 55 % on saute la relecture, au-delà de 70 % la révision */
  budgetMs?: number;
  /** désactive la relecture (tests, générations rapides) */
  skipCritique?: boolean;
}

export interface Scores { accuracy: number; pedagogy: number; fun: number; wow: number }

export type GenerateEvent =
  | { type: "step"; message: string }
  | { type: "warn"; message: string }
  | { type: "done"; cartridge: Cartridge; slug: string; issues: Issue[]; attempts: number; scores?: Scores; job?: Job; plan?: string[] }
  | { type: "fail"; message: string; issues?: Issue[] };

type Obj = Record<string, unknown>;
const pick = (o: unknown, ...path: string[]): string | undefined => {
  let cur: unknown = o;
  for (const k of path) cur = cur && typeof cur === "object" ? (cur as Obj)[k] : undefined;
  return typeof cur === "string" && cur.trim() ? cur.trim() : undefined;
};

const errorsOf = (issues: Issue[]) => issues.filter((i) => i.severity === "error");
const onlyBalance = (issues: Issue[]) => errorsOf(issues).every((i) => i.rule.startsWith("balance-"));

const MECH_FR: Record<string, string> = {
  catch: "attrape-tout", whack: "tape-alerte", gauge: "jauge", sequence: "mémoire", inspection: "inspection", investigation: "enquête",
  triage: "tri", quiz: "quiz", dialogue: "échange", slider: "réglage", wheel: "roue",
};

export async function* generate(input: GenerateInput, deps: GenerateDeps): AsyncGenerator<GenerateEvent> {
  const now = deps.now ?? new Date();
  const maxRepairs = deps.maxRepairs ?? 2;
  const budget = deps.budgetMs ?? 250_000;
  const t0 = Date.now();
  const elapsed = () => Date.now() - t0;

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

  /* 2. fiche du poste */
  let job: Job | undefined;
  let plan: GamePlan | undefined;
  yield { type: "step", message: "Analyse du poste : missions, documents manipulés, indicateurs, pièges…" };
  try {
    const raw = await deps.llm.complete(ANALYZE_SYSTEM, analyzePrompt(offer, input, jobSchemaJson()), { task: "analyze", temperature: 0.3 });
    const parsed = JobModel.safeParse(repairJob(parseJsonReply(raw)));
    if (parsed.success) job = parsed.data;
    else yield { type: "warn", message: `Fiche du poste incomplète (${parsed.error.issues.slice(0, 2).map((i) => i.path.join(".")).join(", ")}) : écriture directe depuis l'offre.` };
  } catch (e) {
    yield { type: "warn", message: `Analyse impossible (${(e as Error).message.slice(0, 120)}) : écriture directe depuis l'offre.` };
  }
  let requirements: ReturnType<typeof requirementsFromJob> | undefined;
  if (job) {
    plan = planGame(job);
    requirements = requirementsFromJob(job);
    yield {
      type: "step",
      message: `Fiche du poste : ${job.missions.length} missions, famille « ${plan.pack.label} »${job.intermediary ? `, client final : ${job.clientSector ?? "à déduire"}` : ""}.`,
    };
    yield {
      type: "step",
      message: `Plan : ${plan.levels.map((l) => `${l.day.fr} ${MECH_FR[l.mechanic]}`).join(" · ")}${plan.boss ? ` · boss ${MECH_FR[plan.boss.mechanic]}` : ""}`,
    };
  }

  /* 3. écriture */
  yield { type: "step", message: `Écriture du jeu par ${deps.llm.name}… (la plus longue étape)` };
  const user = userPrompt({ offer, job, plan, requirements, company: input.company, jobTitle: input.jobTitle, notes: input.notes });
  let reply: string;
  try {
    reply = await deps.llm.complete(SYSTEM_PROMPT, user, { task: "write" });
  } catch (e) {
    yield { type: "fail", message: (e as Error).message };
    return;
  }

  let slug: string | null = null;
  const days = plan?.levels.map((l) => l.day);

  /** Texte du modèle → cartouche valide (corrections automatiques, tours de correction, équilibrage de secours). */
  async function* toCartridge(text: string, repairs: number): AsyncGenerator<GenerateEvent, { cartridge?: Cartridge; issues: Issue[]; brief?: Obj; attempts: number }> {
    let issues: Issue[] = [];
    let briefText = text;
    for (let attempt = 0; attempt <= repairs; attempt++) {
      let brief: Obj = {};
      try {
        brief = applyPlan(repairBrief(parseJsonReply(briefText)) as Obj, requirements, days);
      } catch (e) {
        issues = [{ rule: "json", severity: "error", path: "", message: (e as Error).message }];
      }
      if (!slug) {
        const company = input.company || job?.company || pick(brief, "target", "company", "name") || offer.company || "entreprise";
        const title = input.jobTitle || job?.jobTitle || pick(brief, "target", "job", "title") || offer.title || "poste";
        slug = makeSlug(company, title, deps.rand);
      }
      if (Object.keys(brief).length) {
        const r = validateCartridge(assemble(brief, { slug, offerUrl: input.offerUrl, contact: input.contact, now }));
        issues = r.issues;
        if (r.ok) return { cartridge: r.cartridge, issues, brief, attempts: attempt + 1 };
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
          if (balanced.ok && balanced.cartridge) return { cartridge: balanced.cartridge, issues: balanced.issues, brief, attempts: attempt + 1 };
          issues = balanced.issues;
        }
        briefText = JSON.stringify(brief);
      }
      if (attempt === repairs || elapsed() > budget * 0.85) break;
      const n = errorsOf(issues).length;
      yield { type: "step", message: `${n} correction${n > 1 ? "s" : ""} demandée${n > 1 ? "s" : ""} au modèle (tour ${attempt + 1}/${repairs})…` };
      try {
        briefText = await deps.llm.complete(SYSTEM_PROMPT, `${user}\n\n${repairPrompt(briefText, errorsOf(issues))}`, { task: "repair" });
      } catch (e) {
        yield { type: "warn", message: (e as Error).message };
        break;
      }
    }
    return { issues, attempts: repairs + 1 };
  }

  const first = yield* toCartridge(reply, maxRepairs);
  if (!first.cartridge) {
    yield { type: "fail", message: "Le jeu n'a pas passé les contrôles après corrections.", issues: errorsOf(first.issues) };
    return;
  }
  let best = first;
  let scores: Scores | undefined;

  /* 4. relecture par trois personnages, puis révision */
  if (!deps.skipCritique && elapsed() < budget * 0.55) {
    yield { type: "step", message: "Relecture par un praticien du métier, un débutant complet et un joueur exigeant…" };
    let critique: CritiqueT | undefined;
    try {
      const raw = await deps.llm.complete(CRITIC_SYSTEM, criticPrompt(JSON.stringify(first.brief), job, offer.text), { task: "critique", temperature: 0.2 });
      const parsed = Critique.safeParse(parseJsonReply(raw));
      if (parsed.success) critique = parsed.data;
    } catch (e) {
      yield { type: "warn", message: `Relecture impossible : ${(e as Error).message.slice(0, 120)}` };
    }
    if (critique) {
      scores = critique.scores;
      const s = critique.scores;
      yield { type: "step", message: `Notes : justesse ${s.accuracy}/10 · pédagogie ${s.pedagogy}/10 · plaisir ${s.fun}/10 · waouh ${s.wow}/10.` };
      if (needsRevision(critique) && elapsed() < budget * 0.7) {
        const weak = critique.levels.filter((l) => l.problems.length).length;
        yield { type: "step", message: `Révision : ${weak} niveau${weak > 1 ? "x" : ""} à améliorer, ${critique.global.length} correction${critique.global.length > 1 ? "s" : ""} globale${critique.global.length > 1 ? "s" : ""}…` };
        try {
          const revised = await deps.llm.complete(SYSTEM_PROMPT, `${user}\n\n${revisePrompt(JSON.stringify(first.brief), critique)}`, { task: "revise" });
          const second = yield* toCartridge(revised, 1);
          if (second.cartridge) {
            best = second;
            yield { type: "step", message: "Version révisée retenue." };
          } else yield { type: "warn", message: "La version révisée ne passait pas les contrôles : on garde la première." };
        } catch (e) {
          yield { type: "warn", message: `Révision impossible : ${(e as Error).message.slice(0, 120)}` };
        }
      }
      const notes = [
        `Relecture : justesse ${s.accuracy}/10, pédagogie ${s.pedagogy}/10, plaisir ${s.fun}/10, waouh ${s.wow}/10.`,
        ...critique.global.slice(0, 5),
      ].join("\n");
      best.cartridge = { ...best.cartridge!, review: { ...best.cartridge!.review, notes } };
    }
  }

  yield {
    type: "done",
    cartridge: best.cartridge!,
    slug: slug!,
    issues: best.issues,
    attempts: best.attempts,
    scores,
    job,
    plan: plan?.levels.map((l) => `${l.day.fr} ${l.mechanic}`),
  };
}
