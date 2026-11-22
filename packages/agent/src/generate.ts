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
import { chainHead, estimateTokens, parseJsonReply, type Llm } from "./llm";
import { IDEA_ANALYZE_SYSTEM, analyzeIdeaPrompt, ideaOffer, ideaWriteRules, type IdeaOptions } from "./idea";
import { fetchOffer, mergeOffer, type Offer } from "./offer";
import { companyText, researchCompany, type CompanyFacts } from "./company";
import { coerceToSchema } from "./coerce";
import { explainIssue, explainIssues } from "./explain";
import { designBrief } from "./design";
import { PACKS } from "./packs";
import { PITCH_SYSTEM, Pitch, pitchPrompt, pitchText } from "./pitch";
import { planGame, planSummary, type GamePlan, type Recent } from "./plan";
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
  /** mode idée : le jeu part d'une idée et d'options, sans offre d'emploi */
  idea?: IdeaOptions;
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
  /** ce qui a servi dans les derniers jeux du compte : formats, mécaniques et boss à ne pas resservir */
  recent?: Recent;
  /** recherche sur l'entreprise (Wikipédia, site officiel) ; false pour la désactiver */
  research?: boolean;
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

/**
 * Retire les niveaux (au plus 2, il en reste au moins 2) ou la phase de boss (il en reste au moins 2)
 * qui portent toutes les erreurs restantes. Rien si une erreur touche autre chose.
 */
export function salvageBrief(brief: Obj, issues: Issue[]): { brief: Obj; dropped: string[]; reasons: string[] } | null {
  const errs = errorsOf(issues);
  if (!errs.length) return null;
  const lv = new Set<number>();
  const ph = new Set<number>();
  for (const e of errs) {
    const l = e.path.match(/^levels[.[](\d+)/);
    const p = e.path.match(/^boss[.[]phases[.[](\d+)/);
    if (l) lv.add(Number(l[1]));
    else if (p) ph.add(Number(p[1]));
    else return null;
  }
  const levels = Array.isArray(brief.levels) ? (brief.levels as Obj[]) : [];
  const boss = (brief.boss ?? {}) as Obj;
  const phases = Array.isArray(boss.phases) ? (boss.phases as Obj[]) : [];
  if (lv.size > 2 || levels.length - lv.size < 2) return null;
  if (ph.size && phases.length - ph.size < 2) return null;
  const name = (o: Obj | undefined, fb: string) => {
    const t = (o?.title as Obj | undefined)?.fr;
    return typeof t === "string" && t ? `« ${t} »` : fb;
  };
  const dropped = [
    ...[...lv].map((i) => `le niveau ${i + 1} ${name(levels[i], "")}`.trim()),
    ...[...ph].map((i) => `la phase ${i + 1} du boss`),
  ];
  const out: Obj = { ...brief, levels: levels.filter((_, i) => !lv.has(i)) };
  if (ph.size) out.boss = { ...boss, phases: phases.filter((_, i) => !ph.has(i)) };
  return { brief: out, dropped, reasons: [...new Set(errs.map(explainIssue))].slice(0, 2) };
}
const isBalance = (i: Issue) => i.rule.startsWith("balance-") || i.rule === "naive-win";
const onlyBalance = (issues: Issue[]) => errorsOf(issues).every(isBalance);
const anyBalance = (issues: Issue[]) => errorsOf(issues).some(isBalance);

const MECH_FR: Record<string, string> = {
  catch: "attrape-tout", whack: "tape-alerte", gauge: "jauge", sequence: "mémoire", inspection: "inspection", investigation: "enquête",
  triage: "tri", quiz: "quiz", dialogue: "échange", slider: "réglage", wheel: "roue",
  defense: "défense",
  pipes: "tuyaux",
  hunt: "chasse aux risques",
  runner: "course",
  shooter: "tir",
  rhythm: "rythme",
};

export async function* generate(input: GenerateInput, deps: GenerateDeps): AsyncGenerator<GenerateEvent> {
  const now = deps.now ?? new Date();
  const maxRepairs = deps.maxRepairs ?? 2;
  const budget = deps.budgetMs ?? 250_000;
  const t0 = Date.now();
  const elapsed = () => Date.now() - t0;

  const idea = input.idea;
  /* 1. l'offre (ou l'idée) */
  let fetched: Offer | null = null;
  if (idea) yield { type: "step", message: "Mode idée : pas d'offre à lire, on part de ton idée et de tes options." };
  else if (input.offerUrl) {
    yield { type: "step", message: "Lecture de la page de l'offre…" };
    try {
      fetched = await fetchOffer(input.offerUrl, deps.fetchImpl);
      yield { type: "step", message: fetched.source === "jsonld" ? "Offre lue (données structurées de la page)." : `Page lue : ${fetched.text.length} caractères de texte.` };
    } catch (e) {
      yield { type: "warn", message: `Page illisible : ${(e as Error).message}` };
    }
  }
  const offer = idea ? ideaOffer(idea) : mergeOffer(fetched, input.offerText, input.offerUrl);
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
  let pitch: Pitch | undefined;
  /* 1 bis. fiche entreprise : faits publics pour les clins d'œil (jamais en mode idée) */
  let company: CompanyFacts | null = null;
  const companyName = input.company || offer.company;
  if (!idea && deps.research !== false && companyName) {
    yield { type: "step", message: `Fiche entreprise : recherche de faits publics sur « ${companyName} » (Wikipédia, site officiel)…` };
    company = await researchCompany(companyName, { companyUrl: offer.companyUrl, fetchImpl: deps.fetchImpl }).catch(() => null);
    yield company
      ? { type: "step", message: `Fiche entreprise : ${company.sources.map((s) => (s.kind === "wikipedia" ? "Wikipédia" : "site officiel")).join(" + ")}.` }
      : { type: "warn", message: `Aucune source fiable sur « ${companyName} » : pas de clin d'œil à l'entreprise (rien n'est inventé).` };
  }
  const companyBlock = company ? companyText(company) : undefined;
  const allowedSources = new Set(company?.sources.map((s) => s.url) ?? []);

  yield {
    type: "step",
    message: idea ? "Analyse de l'idée : actions du héros, vrais objets du thème, notions à apprendre, grand méchant…" : "Analyse du poste : missions, documents manipulés, indicateurs, pièges…",
  };
  try {
    const raw = idea
      ? await deps.llm.complete(IDEA_ANALYZE_SYSTEM, analyzeIdeaPrompt(idea, jobSchemaJson()), { task: "analyze", temperature: 0.5 })
      : await deps.llm.complete(ANALYZE_SYSTEM, analyzePrompt(offer, input, jobSchemaJson()), { task: "analyze", temperature: 0.3 });
    const parsed = coerceToSchema(JobModel, repairJob(parseJsonReply(raw)));
    if (parsed.success) job = parsed.data;
    else yield { type: "warn", message: `Fiche incomplète (${parsed.error.issues.slice(0, 2).map((i) => i.path.join(".")).join(", ")}) : écriture directe depuis ${idea ? "l'idée" : "l'offre"}.` };
  } catch (e) {
    yield { type: "warn", message: `Analyse impossible (${(e as Error).message.slice(0, 120)}) : écriture directe depuis ${idea ? "l'idée" : "l'offre"}.` };
  }
  let requirements: ReturnType<typeof requirementsFromJob> | undefined;
  if (job) {
    yield {
      type: "step",
      message: idea
        ? `Univers : « ${job.company} », le joueur est ${job.jobTitle} ; ${job.missions.length} actions, ${job.jargon.length} notion${job.jargon.length > 1 ? "s" : ""} à apprendre.`
        : `Fiche du poste : ${job.missions.length} missions, famille « ${(PACKS[job.family] ?? PACKS.generic).label} »${job.intermediary ? `, client final : ${job.clientSector ?? "à déduire"}` : ""}.`,
    };
    // trois variantes de structure, de formats différents ; le directeur créatif choisit
    const rnd = deps.rand ?? Math.random;
    const base = idea
      ? { levels: idea.levels, mechanics: idea.mechanics, skin: idea.skin, scene: idea.scene, boss: idea.boss, idea: true, difficulty: idea.difficulty }
      : {};
    const variants: GamePlan[] = [];
    for (let k = 0; k < 3; k++)
      variants.push(planGame(job, { ...base, recent: deps.recent, rand: rnd, avoidFormats: variants.map((v) => v.format) }));
    plan = variants[0]!;
    yield { type: "step", message: `Directeur créatif : choix entre ${variants.map((v) => `« ${v.format} »`).join(", ")} et écriture du concept…` };
    try {
      const raw = await deps.llm.complete(PITCH_SYSTEM, pitchPrompt(job, variants, idea ? offer.text : "", idea ? "idea" : "job"), { task: "pitch", temperature: 0.95 });
      const parsed = coerceToSchema(Pitch, parseJsonReply(raw));
      if (parsed.success) {
        pitch = parsed.data;
        plan = variants[pitch.choice] ?? variants[0]!;
        yield { type: "step", message: `Concept : « ${pitch.title} » — ${pitch.hook.slice(0, 160)}` };
      } else {
        const why = parsed.error.issues[0];
        yield { type: "warn", message: `Concept illisible${why ? ` (${why.path.join(".") || "réponse"} : ${why.message.slice(0, 80)})` : ""} : on garde la première variante.` };
      }
    } catch (e) {
      yield { type: "warn", message: `Concept impossible (${(e as Error).message.slice(0, 100)}) : on garde la première variante.` };
    }
    requirements = requirementsFromJob(job);
    yield {
      type: "step",
      message: `Plan « ${plan.format} » : ${plan.levels.map((l) => `${l.day.fr} ${MECH_FR[l.mechanic]}${l.entry === "ambush" ? " (embuscade)" : l.entry === "call" ? " (appel)" : ""}${l.modifiers.length ? ` +${l.modifiers.join("+")}` : ""}`).join(" · ")}${plan.boss ? ` · boss ${plan.boss.archetype} : ${plan.boss.phases.map((p) => MECH_FR[p.mechanic]).join(" → ")}` : ""}`,
    };
  }

  /* 3. écriture */
  const user = userPrompt({
    offer, job, plan, requirements, company: input.company, jobTitle: input.jobTitle, notes: input.notes,
    idea: idea ? { rules: ideaWriteRules(idea) } : undefined,
    design: plan ? designBrief({
      format: plan.format,
      mechanics: [...plan.levels.map((l) => l.mechanic), ...(plan.boss?.phases.map((p) => p.mechanic) ?? [])],
      bossArchetype: plan.boss?.archetype,
    }) : undefined,
    concept: pitch ? pitchText(pitch) : undefined,
    companyFacts: companyBlock,
  });
  const writeSize = estimateTokens(SYSTEM_PROMPT) + estimateTokens(user);
  yield { type: "step", message: `Écriture du jeu par ${chainHead(deps.llm, "write", writeSize)}… (la plus longue étape)` };
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
    // dernière version valide : une correction qui abîme le jeu ne doit pas faire perdre un jeu jouable
    let lastGood: { cartridge: Cartridge; issues: Issue[]; brief: Obj; attempts: number } | undefined;
    let lastBrief: Obj | undefined;
    let lastIssues: Issue[] = [];
    for (let attempt = 0; attempt <= repairs; attempt++) {
      let brief: Obj = {};
      try {
        brief = keepSourcedFacts(repairBrief(parseJsonReply(briefText)) as Obj, allowedSources, company?.name);
        brief = applyPlan(brief, requirements, days, {
          days: !!plan,
          skin: plan?.forcedSkin ? plan.skin : undefined,
          scene: plan?.forcedScene ? plan.scene : undefined,
          plan,
        });
      } catch (e) {
        issues = [{ rule: "json", severity: "error", path: "", message: (e as Error).message }];
      }
      if (!slug) {
        const company = idea ? idea.title || job?.company || pick(brief, "design", "title", "fr") || "jeu" : input.company || job?.company || pick(brief, "target", "company", "name") || offer.company || (idea ? "jeu" : "entreprise");
        const title = idea ? idea.hero || job?.jobTitle || ""
          : input.jobTitle || job?.jobTitle || pick(brief, "target", "job", "title") || offer.title || "poste";
        slug = makeSlug(company, title, deps.rand);
      }
      if (Object.keys(brief).length) {
        const r = validateCartridge(assemble(brief, { slug, offerUrl: input.offerUrl, contact: input.contact, now }));
        issues = r.issues;
        const off = r.cartridge && plan ? planIssues(r.cartridge, plan) : [];
        // le plan n'est pas respecté (mécanique remplacée, boss classique) : on redemande tant qu'il reste des tours
        if (r.ok && off.length && attempt < repairs && elapsed() < budget * 0.7) {
          lastGood = { cartridge: r.cartridge!, issues: [...r.issues, ...off.map((i) => ({ ...i, severity: "warning" as const }))], brief, attempts: attempt + 1 };
          issues = [...r.issues, ...off];
          briefText = JSON.stringify(brief);
          yield { type: "step", message: `${off.length} écart${off.length > 1 ? "s" : ""} au plan à corriger (variété des mécaniques)…` };
          try {
            briefText = await deps.llm.complete(SYSTEM_PROMPT, `${user}\n\n${repairPrompt(briefText, off)}`, { task: "repair" });
          } catch (e) {
            yield { type: "warn", message: (e as Error).message };
            return { cartridge: r.cartridge, issues: [...r.issues, ...off.map((i) => ({ ...i, severity: "warning" as const }))], brief, attempts: attempt + 1 };
          }
          continue;
        }
        if (r.ok) return { cartridge: r.cartridge, issues: [...issues, ...off.map((i) => ({ ...i, severity: "warning" as const }))], brief, attempts: attempt + 1 };
        // l'équilibrage se règle sans le modèle : objectifs recalculés par simulation
        if (r.cartridge && anyBalance(r.issues)) {
          yield { type: "step", message: "Réglage automatique de la difficulté…" };
          let cur = r.cartridge;
          let balanced: ValidationResult = r;
          for (let round = 0; round < 3; round++) {
            const ids = errorsOf(balanced.issues)
              .map((i) => {
                const ph = i.path.match(/boss\.phases\[(\d+)\]/);
                if (ph) return `boss-phase-${Number(ph[1]) + 1}`;
                return cur.levels[Number(i.path.match(/levels\[(\d+)\]/)?.[1] ?? -1)]?.id;
              })
              .filter((x): x is string => !!x);
            cur = autoBalance(cur, ids, { singleGoal: round > 0 });
            balanced = validateCartridge(cur);
            if (balanced.ok || !balanced.cartridge || !anyBalance(balanced.issues)) break;
            cur = balanced.cartridge;
          }
          if (balanced.ok && balanced.cartridge) return { cartridge: balanced.cartridge, issues: balanced.issues, brief, attempts: attempt + 1 };
          issues = balanced.issues;
          // le modèle corrige le reste à partir de la version déjà rééquilibrée
          if (balanced.cartridge ?? cur) {
            const { meta: _meta, ...rest } = (balanced.cartridge ?? cur) as unknown as Obj;
            void _meta;
            brief = rest;
          }
        }
        briefText = JSON.stringify(brief);
        lastBrief = brief;
        lastIssues = issues;
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
    if (lastGood) return lastGood;
    // dernier recours sans le modèle : si seuls un ou deux niveaux (ou une phase de boss) sont abîmés, on les retire
    const saved = lastBrief && salvageBrief(lastBrief, lastIssues);
    if (saved && slug) {
      let r = validateCartridge(assemble(saved.brief, { slug, offerUrl: input.offerUrl, contact: input.contact, now }));
      if (!r.ok && r.cartridge && anyBalance(r.issues)) {
        const c = r.cartridge;
        r = validateCartridge(autoBalance(c, c.levels.map((l) => l.id).concat((c.boss?.phases ?? []).map((_, k) => `boss-phase-${k + 1}`)), { singleGoal: true }));
      }
      if (r.ok && r.cartridge) {
        yield { type: "warn", message: `Sauvetage : ${saved.dropped.join(", ")} retiré${saved.dropped.length > 1 ? "s" : ""} (${saved.reasons.join(" ; ")}). Le reste du jeu est complet.` };
        const note: Issue[] = saved.dropped.map((d) => ({ rule: "salvage", severity: "warning", path: "", message: `${d} retiré : ${saved.reasons.join(" ; ")}` }));
        return { cartridge: r.cartridge, issues: [...r.issues, ...note], brief: saved.brief, attempts: repairs + 1 };
      }
    }
    return { issues, attempts: repairs + 1 };
  }

  const first = yield* toCartridge(reply, maxRepairs);
  if (!first.cartridge) {
    const why = explainIssues(first.issues);
    yield { type: "fail", message: `Le jeu n'a pas passé les contrôles après corrections${why.length ? ` : ${why.join(" ; ")}` : ""}.`, issues: errorsOf(first.issues) };
    return;
  }
  let best = first;
  let scores: Scores | undefined;

  /* 4. relecture par trois personnages, puis révision */
  if (!deps.skipCritique && elapsed() < budget * 0.55) {
    yield { type: "step", message: idea ? "Relecture par un expert du sujet, un débutant complet et un joueur exigeant…" : "Relecture par un praticien du métier, un débutant complet et un joueur exigeant…" };
    let critique: CritiqueT | undefined;
    try {
      const raw = await deps.llm.complete(CRITIC_SYSTEM, criticPrompt(JSON.stringify(first.brief), job, offer.text, idea ? "idea" : "job", companyBlock), { task: "critique", temperature: 0.2 });
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
    plan: plan ? [planSummary(plan)] : undefined,
  };
}

/** Écarts entre la cartouche écrite et le plan imposé (mécaniques des niveaux et du boss). */
export function planIssues(c: Cartridge, plan: GamePlan): Issue[] {
  const out: Issue[] = [];
  const levels = [...c.levels].sort((a, b) => a.order - b.order);
  plan.levels.forEach((pl, i) => {
    const l = levels[i];
    if (l && l.mechanic.type !== pl.mechanic)
      out.push({ rule: "plan", severity: "error", path: `levels[${c.levels.indexOf(l)}].mechanic`, message: `le plan impose la mécanique "${pl.mechanic}" pour le niveau ${i + 1} (écrit : "${l.mechanic.type}") : réécris ce niveau avec "${pl.mechanic}"` });
  });
  if (plan.boss) {
    if (!c.boss) out.push({ rule: "plan", severity: "error", path: "boss", message: "le plan impose un boss à plusieurs formes (boss.phases)" });
    else if (!c.boss.phases) out.push({ rule: "plan", severity: "error", path: "boss.phases", message: `le plan impose un boss à ${plan.boss.phases.length} phases (${plan.boss.phases.map((p) => p.mechanic).join(", ")}), pas une mécanique unique` });
    else plan.boss.phases.forEach((pp, i) => {
      const ph = c.boss!.phases![i];
      if (ph && ph.mechanic.type !== pp.mechanic)
        out.push({ rule: "plan", severity: "error", path: `boss.phases[${i}].mechanic`, message: `le plan impose "${pp.mechanic}" pour la phase ${i + 1} du boss (écrit : "${ph.mechanic.type}")` });
    });
  }
  return out;
}

/** Ne garde que les faits sur l'entreprise dont la source vient de la recherche (sinon : rien plutôt qu'une invention). */
export function keepSourcedFacts(brief: Obj, allowed: Set<string>, company?: string): Obj {
  const about = brief.about as Obj | undefined;
  if (!about || typeof about !== "object") return brief;
  const facts = Array.isArray(about.facts) ? (about.facts as Obj[]).filter((f) => typeof f.source === "string" && allowed.has(f.source)) : [];
  if (!facts.length || !company) delete brief.about;
  else brief.about = { company: typeof about.company === "string" && about.company ? about.company : company, facts: facts.slice(0, 4) };
  return brief;
}
