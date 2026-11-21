/**
 * Règles métier vérifiées après le schéma Zod.
 * Une erreur bloque la publication ; un avertissement s'affiche seulement.
 * Le mode strict (publication) ajoute les règles « prêt à envoyer ».
 */
import type { Cartridge, Effect, I18n, Mechanic } from "./schema";

export type Severity = "error" | "warning";
export interface Issue {
  rule: string;
  severity: Severity;
  path: string;
  message: string;
}

const PLACEHOLDER = /<[A-Z_]{2,}>/;
const MAX_INTRO = 80;
const MAX_QUOTE_WORDS = 15;

function texts(t: I18n | undefined): string[] {
  return t ? [t.fr, t.en] : [];
}

/** Toutes les chaînes d'un objet, avec leur chemin (pour repérer emplacements et noms interdits). */
function walkStrings(value: unknown, path: string, out: Array<{ path: string; s: string }>): void {
  if (typeof value === "string") out.push({ path, s: value });
  else if (Array.isArray(value)) value.forEach((v, i) => walkStrings(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) walkStrings(v, path ? `${path}.${k}` : k, out);
}

function mechanicEffects(m: Mechanic): Array<{ path: string; e: Effect }> {
  const out: Array<{ path: string; e: Effect }> = [];
  if (m.type === "wheel") m.segments.forEach((s, i) => s.effects.forEach((e, j) => out.push({ path: `segments[${i}].effects[${j}]`, e })));
  if (m.type === "triage" || m.type === "quiz") {
    m.onCorrect.forEach((e, j) => out.push({ path: `onCorrect[${j}]`, e }));
    m.onWrong.forEach((e, j) => out.push({ path: `onWrong[${j}]`, e }));
  }
  return out;
}

export function lintCartridge(c: Cartridge, opts: { strict?: boolean } = {}): Issue[] {
  const issues: Issue[] = [];
  const add = (rule: string, severity: Severity, path: string, message: string) =>
    issues.push({ rule, severity, path, message });

  const reqIds = new Set(c.analysis.requirements.map((r) => r.id));
  const proofIds = new Set(c.candidate.proofs.map((p) => p.id));
  const painIds = new Set(c.analysis.painPoints.map((p) => p.id));
  const varIds = new Set(c.state.vars.map((v) => v.id));
  const charIds = new Set(c.characters.map((ch) => ch.id));

  /* identifiants uniques */
  const dup = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) add("unique-ids", "error", kind, `identifiant en double : ${id}`);
      seen.add(id);
    }
  };
  dup("analysis.requirements", c.analysis.requirements.map((r) => r.id));
  dup("candidate.proofs", c.candidate.proofs.map((p) => p.id));
  dup("state.vars", c.state.vars.map((v) => v.id));
  dup("levels", c.levels.map((l) => l.id));

  /* langues */
  if (!c.meta.languages.includes(c.meta.defaultLang))
    add("languages", "error", "meta.defaultLang", "la langue par défaut doit figurer dans meta.languages");

  /* variables d'état cohérentes */
  c.state.vars.forEach((v, i) => {
    if (v.min >= v.max) add("var-bounds", "error", `state.vars[${i}]`, `${v.id} : min doit être inférieur à max`);
    if (v.start < v.min || v.start > v.max)
      add("var-bounds", "error", `state.vars[${i}]`, `${v.id} : la valeur de départ sort des bornes`);
  });

  const checkVar = (id: string, path: string) => {
    if (!varIds.has(id)) add("var-ref", "error", path, `variable inconnue : ${id}`);
  };

  /* niveaux */
  const orders = c.levels.map((l) => l.order);
  if (new Set(orders).size !== orders.length) add("level-order", "error", "levels", "deux niveaux ont le même ordre");

  c.levels.forEach((l, i) => {
    const p = `levels[${i}]`;
    if (!reqIds.has(l.requirementId)) add("level-requirement", "error", `${p}.requirementId`, `exigence inconnue : ${l.requirementId}`);
    if (l.characterId && !charIds.has(l.characterId)) add("character-ref", "error", `${p}.characterId`, `personnage inconnu : ${l.characterId}`);
    for (const t of texts(l.intro))
      if (t.length > MAX_INTRO) add("intro-length", "error", `${p}.intro`, `intro trop longue (${t.length} > ${MAX_INTRO} caractères)`);
    l.win.forEach((w, j) => checkVar(w.var, `${p}.win[${j}]`));
    mechanicEffects(l.mechanic).forEach(({ path, e }) => checkVar(e.var, `${p}.mechanic.${path}`));
    checkMechanic(l.mechanic, `${p}.mechanic`, add, checkVar);
  });

  /* boss facultatif */
  if (c.boss) {
    if (!painIds.has(c.boss.painPointId)) add("boss-painpoint", "error", "boss.painPointId", `problème du poste inconnu : ${c.boss.painPointId}`);
    if (c.boss.characterId && !charIds.has(c.boss.characterId)) add("character-ref", "error", "boss.characterId", `personnage inconnu : ${c.boss.characterId}`);
    mechanicEffects(c.boss.mechanic).forEach(({ path, e }) => checkVar(e.var, `boss.mechanic.${path}`));
    checkMechanic(c.boss.mechanic, "boss.mechanic", add, checkVar);
  }

  c.events.forEach((ev, i) => ev.effects.forEach((e, j) => checkVar(e.var, `events[${i}].effects[${j}]`)));

  /* couverture des exigences */
  const covered = new Set<string>([...c.levels.map((l) => l.requirementId), ...c.candidate.proofs.flatMap((p) => p.requirementIds)]);
  c.analysis.requirements.forEach((r, i) => {
    if (r.priority === "must" && !covered.has(r.id))
      add("must-coverage", "error", `analysis.requirements[${i}]`, `exigence obligatoire sans niveau ni preuve : ${r.id}`);
    const words = r.offerQuote.trim().split(/\s+/).length;
    if (words > MAX_QUOTE_WORDS)
      add("quote-length", "error", `analysis.requirements[${i}].offerQuote`, `citation trop longue (${words} > ${MAX_QUOTE_WORDS} mots)`);
  });
  c.candidate.proofs.forEach((pr, i) =>
    pr.requirementIds.forEach((r) => {
      if (!reqIds.has(r)) add("proof-requirement", "error", `candidate.proofs[${i}]`, `exigence inconnue : ${r}`);
    }),
  );

  /* écran de fin */
  c.ending.skillsUnlocked.forEach((s, i) => {
    if (!reqIds.has(s.requirementId)) add("ending-ref", "error", `ending.skillsUnlocked[${i}]`, `exigence inconnue : ${s.requirementId}`);
    if (!proofIds.has(s.proofId)) add("ending-ref", "error", `ending.skillsUnlocked[${i}]`, `preuve inconnue : ${s.proofId}`);
  });
  const ctaTypes = new Set(c.ending.cta.map((x) => x.type));
  if (!ctaTypes.has("cv")) add("cta", "error", "ending.cta", "il manque un bouton CV");
  if (!ctaTypes.has("contact")) add("cta", "error", "ending.cta", "il manque un bouton contact");

  /* données réelles sourcées */
  c.data.forEach((d, i) => {
    if (!d.source.url) add("data-source", "error", `data[${i}].source`, "source sans URL");
  });

  /* on ne se moque pas de l'entreprise */
  const company = c.target.company.name.toLowerCase();
  const mocking: Array<{ path: string; t: I18n }> = [
    ...c.levels.flatMap((l, i) => l.failJokes.map((t, j) => ({ path: `levels[${i}].failJokes[${j}]`, t }))),
    ...(c.boss ? c.boss.taunts.map((t, j) => ({ path: `boss.taunts[${j}]`, t })) : []),
  ];
  if (company.length >= 3)
    for (const { path, t } of mocking)
      if (texts(t).some((s) => s.toLowerCase().includes(company)))
        add("no-mocking", "error", path, "une blague ou une pique cite l'entreprise : on vise le métier, jamais elle");

  /* les avis ne s'affichent jamais tels quels */
  const reviewLabels = c.analysis.painPoints.filter((p) => p.source === "reviews").flatMap((p) => texts(p.label));
  if (c.boss && reviewLabels.length) {
    const shown = texts(c.boss.name).concat(c.boss.taunts.flatMap(texts));
    for (const r of reviewLabels)
      if (shown.some((s) => s.includes(r))) add("no-reviews", "error", "boss", "un avis d'employé est repris tel quel dans le jeu");
  }

  /* ton */
  if (c.analysis.tone.formality === 5 && c.analysis.tone.humorLevel > 1)
    add("tone", "warning", "analysis.tone", "entreprise très formelle : humour 0 ou 1 recommandé");

  /* emplacements non remplis */
  const strings: Array<{ path: string; s: string }> = [];
  walkStrings(c, "", strings);
  for (const { path, s } of strings)
    if (PLACEHOLDER.test(s))
      add("placeholder", opts.strict ? "error" : "warning", path, `emplacement à remplir : ${s.match(PLACEHOLDER)?.[0]}`);

  if (opts.strict && c.review.status === "draft")
    add("review", "warning", "review.status", "cartouche encore en brouillon");

  return issues;
}

function checkMechanic(
  m: Mechanic,
  p: string,
  add: (rule: string, severity: Severity, path: string, message: string) => void,
  checkVar: (id: string, path: string) => void,
): void {
  switch (m.type) {
    case "wheel": {
      const ids = new Set<string>();
      m.segments.forEach((s, i) => {
        if (ids.has(s.id)) add("unique-ids", "error", `${p}.segments[${i}]`, `case en double : ${s.id}`);
        ids.add(s.id);
      });
      if (m.segments.every((s) => s.effects.length === 0)) add("wheel-effects", "warning", p, "aucune case n'a d'effet");
      break;
    }
    case "slider": {
      const c = m.control;
      if (c.min >= c.max) add("slider-range", "error", `${p}.control`, "min doit être inférieur à max");
      if (c.start < c.min || c.start > c.max) add("slider-range", "error", `${p}.control`, "la valeur de départ sort des bornes");
      if (c.step > c.max - c.min) add("slider-range", "error", `${p}.control`, "pas plus grand que la plage");
      m.outputs.forEach((o, i) => checkVar(o.var, `${p}.outputs[${i}]`));
      break;
    }
    case "triage": {
      const acc = m.items.filter((x) => x.correct === "accept").length;
      if (acc === 0 || acc === m.items.length)
        add("triage-balance", "error", `${p}.items`, "il faut au moins un élément à accepter et un à rejeter");
      break;
    }
    case "quiz": {
      m.questions.forEach((q, i) => {
        if (q.correctIndex >= q.options.length)
          add("quiz-answer", "error", `${p}.questions[${i}]`, "la bonne réponse pointe hors des options");
      });
      break;
    }
  }
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
