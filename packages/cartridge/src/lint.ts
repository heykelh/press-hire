/**
 * Règles métier vérifiées après le schéma Zod.
 * Une erreur bloque la publication ; un avertissement s'affiche seulement.
 * Le mode strict (publication) ajoute les règles « prêt à envoyer ».
 */
import type { Cartridge, Effect, I18n, Mechanic } from "./schema";
import { simulateBestRun } from "./rules";

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
  if (m.type === "catch") (["onGood", "onBad", "onMiss"] as const).forEach((k) => m[k].forEach((e, j) => out.push({ path: `${k}[${j}]`, e })));
  if (m.type === "whack") (["onHit", "onWrong", "onMiss"] as const).forEach((k) => m[k].forEach((e, j) => out.push({ path: `${k}[${j}]`, e })));
  if (m.type === "sequence") (["onSuccess", "onFail"] as const).forEach((k) => m[k].forEach((e, j) => out.push({ path: `${k}[${j}]`, e })));
  if (m.type === "inspection") (["onCorrect", "onWrong", "onSpotted"] as const).forEach((k) => m[k].forEach((e, j) => out.push({ path: `${k}[${j}]`, e })));
  if (m.type === "investigation") (["onFound", "onWrong"] as const).forEach((k) => m[k].forEach((e, j) => out.push({ path: `${k}[${j}]`, e })));
  if (m.type === "gauge") m.zones.forEach((z, i) => z.effects.forEach((e, j) => out.push({ path: `zones[${i}].effects[${j}]`, e })));
  if (m.type === "dialogue")
    m.nodes.forEach((n, i) => n.choices.forEach((ch, k) => ch.effects.forEach((e, j) => out.push({ path: `nodes[${i}].choices[${k}].effects[${j}]`, e }))));
  return out;
}

export function lintCartridge(c: Cartridge, opts: { strict?: boolean } = {}): Issue[] {
  const issues: Issue[] = [];
  const add = (rule: string, severity: Severity, path: string, message: string) =>
    issues.push({ rule, severity, path, message });

  const reqIds = new Set(c.analysis.requirements.map((r) => r.id));
  const proofs = c.candidate?.proofs ?? [];
  const proofIds = new Set(proofs.map((p) => p.id));
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
  dup("candidate.proofs", proofs.map((p) => p.id));
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

  /* notions du métier (cartes) */
  const conceptIds = new Set(c.concepts.map((x) => x.id));
  dup("concepts", c.concepts.map((x) => x.id));
  c.concepts.forEach((x, i) => {
    if (x.definition.fr.length > 180) add("concept-length", "warning", `concepts[${i}].definition`, "définition longue (160 caractères conseillés)");
  });
  const usedConcepts = new Set<string>();
  const conceptRef = (id: string | undefined, path: string) => {
    if (!id) return;
    usedConcepts.add(id);
    if (!conceptIds.has(id)) add("concept-ref", "error", path, `notion inconnue : ${id}`);
  };
  if (c.story?.coldOpen.characterId && !charIds.has(c.story.coldOpen.characterId))
    add("character-ref", "error", "story.coldOpen.characterId", `personnage inconnu : ${c.story.coldOpen.characterId}`);

  c.levels.forEach((l, i) => {
    const p = `levels[${i}]`;
    l.teaches.forEach((id, j) => conceptRef(id, `${p}.teaches[${j}]`));
    const m = l.mechanic;
    if (m.type === "triage") m.items.forEach((x, j) => conceptRef(x.conceptId, `${p}.mechanic.items[${j}].conceptId`));
    if (m.type === "quiz") m.questions.forEach((x, j) => conceptRef(x.conceptId, `${p}.mechanic.questions[${j}].conceptId`));
    if (m.type === "catch") m.items.forEach((x, j) => conceptRef(x.conceptId, `${p}.mechanic.items[${j}].conceptId`));
    if (m.type === "whack") m.targets.forEach((x, j) => conceptRef(x.conceptId, `${p}.mechanic.targets[${j}].conceptId`));
    if (m.type === "inspection") m.cases.forEach((x, j) => conceptRef(x.conceptId, `${p}.mechanic.cases[${j}].conceptId`));
    if (m.type === "investigation") m.rounds.forEach((x, j) => conceptRef(x.conceptId, `${p}.mechanic.rounds[${j}].conceptId`));
    if (l.outro?.characterId && !charIds.has(l.outro.characterId)) add("character-ref", "error", `${p}.outro.characterId`, `personnage inconnu : ${l.outro.characterId}`);
    if (l.day && l.day.fr.length > 18) add("day-length", "warning", `${p}.day`, "moment de la semaine trop long (18 caractères)");
    const hasTwistItems =
      (m.type === "catch" && m.items.some((x) => x.twist)) || (m.type === "whack" && m.targets.some((x) => x.twist)) ||
      (m.type === "triage" && m.items.some((x) => x.twist)) || (m.type === "inspection" && m.cases.some((x) => x.twist));
    if (hasTwistItems && !l.twist) add("twist", "warning", `${p}.twist`, "des objets « twist » sans annonce de rebondissement");
    if (!reqIds.has(l.requirementId)) add("level-requirement", "error", `${p}.requirementId`, `exigence inconnue : ${l.requirementId}`);
    if (l.characterId && !charIds.has(l.characterId)) add("character-ref", "error", `${p}.characterId`, `personnage inconnu : ${l.characterId}`);
    if (l.mechanic.type === "dialogue" && l.mechanic.characterId && !charIds.has(l.mechanic.characterId))
      add("character-ref", "error", `${p}.mechanic.characterId`, `personnage inconnu : ${l.mechanic.characterId}`);
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
    if (c.boss.mechanic) {
      mechanicEffects(c.boss.mechanic).forEach(({ path, e }) => checkVar(e.var, `boss.mechanic.${path}`));
      checkMechanic(c.boss.mechanic, "boss.mechanic", add, checkVar);
    }
    (c.boss.phases ?? []).forEach((ph, i) => {
      const p = `boss.phases[${i}]`;
      ph.win.forEach((w, j) => checkVar(w.var, `${p}.win[${j}]`));
      mechanicEffects(ph.mechanic).forEach(({ path, e }) => checkVar(e.var, `${p}.mechanic.${path}`));
      checkMechanic(ph.mechanic, `${p}.mechanic`, add, checkVar);
      if (ph.mechanic.type === "dialogue" && ph.mechanic.characterId && !charIds.has(ph.mechanic.characterId))
        add("character-ref", "error", `${p}.mechanic.characterId`, `personnage inconnu : ${ph.mechanic.characterId}`);
      if (i > 0 && ph.mechanic.type === c.boss!.phases![i - 1]!.mechanic.type)
        add("boss-variety", "warning", `${p}.mechanic`, "deux phases de boss d'affilée avec la même mécanique");
    });
  }
  /* variété : pas trois fois la même mécanique, pas deux fois d'affilée */
  const types = c.levels.map((l) => l.mechanic.type);
  types.forEach((t, i) => {
    if (i > 0 && t === types[i - 1]) add("variety", "warning", `levels[${i}].mechanic`, `deux niveaux d'affilée en « ${t} »`);
  });
  for (const t of new Set(types))
    if (types.filter((x) => x === t).length >= 3) add("variety", "warning", "levels", `mécanique « ${t} » utilisée ${types.filter((x) => x === t).length} fois`);

  c.events.forEach((ev, i) => ev.effects.forEach((e, j) => checkVar(e.var, `events[${i}].effects[${j}]`)));

  /* couverture des exigences */
  const covered = new Set<string>([
    ...c.levels.map((l) => l.requirementId),
    ...proofs.flatMap((p) => p.requirementIds),
    ...c.ending.skillsUnlocked.map((s) => s.requirementId),
  ]);
  c.analysis.requirements.forEach((r, i) => {
    if (r.priority === "must" && !covered.has(r.id))
      add("must-coverage", "error", `analysis.requirements[${i}]`, `exigence obligatoire ni jouée dans un niveau ni rappelée en fin de partie : ${r.id}`);
    const words = r.offerQuote.trim().split(/\s+/).length;
    if (words > MAX_QUOTE_WORDS)
      add("quote-length", "error", `analysis.requirements[${i}].offerQuote`, `citation trop longue (${words} > ${MAX_QUOTE_WORDS} mots)`);
  });
  proofs.forEach((pr, i) =>
    pr.requirementIds.forEach((r) => {
      if (!reqIds.has(r)) add("proof-requirement", "error", `candidate.proofs[${i}]`, `exigence inconnue : ${r}`);
    }),
  );

  /* écran de fin */
  c.ending.skillsUnlocked.forEach((s, i) => {
    if (!reqIds.has(s.requirementId)) add("ending-ref", "error", `ending.skillsUnlocked[${i}]`, `exigence inconnue : ${s.requirementId}`);
    if (s.proofId && !proofIds.has(s.proofId)) add("ending-ref", "error", `ending.skillsUnlocked[${i}]`, `preuve inconnue : ${s.proofId}`);
  });

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

  c.concepts.forEach((x, i) => {
    if (!usedConcepts.has(x.id)) add("concept-unused", "warning", `concepts[${i}]`, `notion jamais enseignée : ${x.id}`);
  });

  /* équilibrage : chaque niveau doit être gagnable, et pas gagné d'avance */
  if (!issues.some((i) => i.severity === "error"))
    for (const r of simulateBestRun(c)) {
      const i = c.levels.findIndex((l) => l.id === r.levelId);
      const at = r.path ?? `levels[${i}]`;
      if (!r.winnable) add("balance-unwinnable", "error", at, `${r.levelId} : impossible à gagner, même en jouant parfaitement`);
      else if (r.wonAtStart) add("balance-trivial", "error", at, `${r.levelId} : déjà gagné avant de jouer (utiliser une variable propre au niveau ou scope "level")`);
      else if (r.winRate !== undefined && r.winRate < 0.3)
        add("balance-luck", "warning", at, `${r.levelId} : trop punitif, un joueur moyen gagne ${Math.round(r.winRate * 100)} % du temps (viser 30 à 80 %)`);
      else if (r.tooHard)
        add("balance-hard", "warning", at, `${r.levelId} : trop exigeant, un joueur qui attrape 75 % des bons objets perd`);
      else if (r.winRate !== undefined && r.winRate > 0.95)
        add("balance-luck", "warning", at, `${r.levelId} : sans enjeu, un joueur moyen gagne ${Math.round(r.winRate * 100)} % du temps`);
    }

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
    case "dialogue":
      break;
    case "catch":
    case "whack": {
      const items = m.type === "catch" ? m.items : m.targets;
      const key = m.type === "catch" ? "items" : "targets";
      if (!items.some((x) => x.kind === "good")) add("arcade-balance", "error", `${p}.${key}`, "il faut au moins un objet « good »");
      if (m.type === "catch" && !items.some((x) => x.kind === "bad")) add("arcade-balance", "error", `${p}.${key}`, "il faut au moins un piège « bad »");
      const ids = new Set<string>();
      items.forEach((x, i) => {
        if (ids.has(x.id)) add("unique-ids", "error", `${p}.${key}[${i}]`, `objet en double : ${x.id}`);
        ids.add(x.id);
        if (x.label.fr.length > 16) add("arcade-label", "warning", `${p}.${key}[${i}]`, "étiquette longue (16 caractères conseillés)");
      });
      break;
    }
    case "gauge": {
      const zs = [...m.zones].sort((a, b) => a.from - b.from);
      zs.forEach((z, i) => {
        if (z.from >= z.to) add("gauge-zones", "error", `${p}.zones`, `zone ${z.id} : from doit être inférieur à to`);
        const next = zs[i + 1];
        if (next && next.from < z.to) add("gauge-zones", "error", `${p}.zones`, `zones ${z.id} et ${next.id} se chevauchent`);
      });
      break;
    }
    case "inspection": {
      m.cases.forEach((k, i) => {
        const faulty = k.fields.filter((f) => f.faulty).length;
        if (k.correct === "reject" && !faulty) add("inspection-fields", "error", `${p}.cases[${i}]`, "un dossier à rejeter doit avoir au moins un champ fautif (faulty)");
        if (k.correct === "accept" && faulty) add("inspection-fields", "error", `${p}.cases[${i}]`, "un dossier à accepter ne peut pas avoir de champ fautif");
      });
      const rej = m.cases.filter((k) => k.correct === "reject").length;
      if (rej === 0 || rej === m.cases.length) add("inspection-balance", "warning", `${p}.cases`, "mélange dossiers conformes et non conformes");
      break;
    }
    case "investigation":
      m.rounds.forEach((r, i) => {
        const v = r.view;
        const n = v.kind === "table" ? v.rows.length : v.kind === "logs" ? v.lines.length : v.values.length;
        if (r.answer >= n) add("investigation-answer", "error", `${p}.rounds[${i}].answer`, `réponse ${r.answer} hors de la vue (${n} éléments)`);
        if (v.kind === "table") v.rows.forEach((row, j) => { if (row.length !== v.columns.length) add("investigation-table", "error", `${p}.rounds[${i}].view.rows[${j}]`, `${row.length} cellules pour ${v.columns.length} colonnes`); });
        if (v.kind === "chart" && v.labels.length !== v.values.length) add("investigation-chart", "error", `${p}.rounds[${i}].view`, "autant d'étiquettes que de valeurs");
      });
      break;
    case "sequence": {
      const ids = new Set<string>();
      m.pads.forEach((x, i) => {
        if (ids.has(x.id)) add("unique-ids", "error", `${p}.pads[${i}]`, `touche en double : ${x.id}`);
        ids.add(x.id);
      });
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
