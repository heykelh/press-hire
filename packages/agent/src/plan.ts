/**
 * Plan de jeu : à partir de la fiche du poste (ou de l'idée), on choisit la STRUCTURE du jeu :
 * le format narratif, les missions jouées, la mécanique de chacune, la façon d'entrer dans chaque niveau,
 * les modificateurs, et un boss à plusieurs formes. Le modèle de langue écrit ensuite le contenu.
 *
 * Les choix sont tirés au sort de façon pondérée (le métier oriente, le hasard varie) et pénalisent
 * ce qui a servi dans les derniers jeux : deux offres proches ne donnent pas deux fois le même jeu.
 * Les garanties restent : au moins 2 niveaux d'arcade et 1 de réflexion, pas deux fois la même mécanique d'affilée,
 * au plus un quiz, un boss avec au moins une phase d'action.
 */
import type { JobModel, Verb } from "./job";
import { PACKS, type DomainPack } from "./packs";

export type MechType =
  | "catch" | "whack" | "gauge" | "sequence" | "inspection" | "investigation" | "triage" | "quiz" | "dialogue" | "slider" | "wheel"
  | "defense" | "pipes" | "hunt" | "runner" | "shooter" | "rhythm";
export type Entry = "briefing" | "ambush" | "call";
export type Mod = "turbo" | "fog" | "mirror" | "quake" | "blackout";

export const ARCADE: MechType[] = ["catch", "whack", "gauge", "sequence", "runner", "shooter", "rhythm"];
export const THINKING: MechType[] = ["inspection", "investigation", "triage", "quiz", "dialogue", "slider", "defense", "hunt"];

/** Verbe du métier → mécaniques possibles, de la plus fidèle à la moins fidèle. */
export const VERB_MECHANICS: Record<Verb, MechType[]> = {
  filter: ["catch", "runner", "hunt", "triage", "inspection"],
  react: ["whack", "shooter", "defense", "catch", "rhythm"],
  tune: ["gauge", "slider", "wheel"],
  follow_procedure: ["sequence", "rhythm", "triage", "inspection", "quiz"],
  inspect: ["inspection", "hunt", "catch", "runner", "investigation"],
  investigate: ["investigation", "hunt", "inspection", "shooter", "quiz"],
  prioritize: ["triage", "rhythm", "defense", "whack", "slider"],
  decide: ["slider", "defense", "gauge", "wheel", "dialogue"],
  know: ["quiz", "rhythm", "investigation", "inspection", "runner"],
  persuade: ["dialogue", "wheel", "triage"],
  forecast: ["slider", "gauge", "investigation", "defense", "wheel"],
};

/** Variante d'arcade la plus fidèle à chaque verbe (pour garantir 2 niveaux d'action). */
const ARCADE_OF: Record<Verb, MechType> = {
  filter: "runner", react: "shooter", tune: "gauge", follow_procedure: "rhythm", inspect: "catch", investigate: "shooter",
  prioritize: "rhythm", decide: "gauge", know: "runner", persuade: "sequence", forecast: "gauge",
};

/* ---------------- formats narratifs ---------------- */

type Label = { fr: string; en: string };
const nth = (fr: string, en: string) => (i: number): Label => ({ fr: `${fr} ${i + 1}`, en: `${en} ${i + 1}` });
const list = (xs: Array<[string, string]>) => (i: number, n: number): Label => {
  // répartit les étiquettes sur toute la liste (le dernier niveau prend la dernière)
  const k = n > 1 ? Math.round((i * (xs.length - 1)) / (n - 1)) : 0;
  const [fr, en] = xs[Math.min(xs.length - 1, k)]!;
  return { fr, en };
};

const DAYS: Array<[string, string]> = [
  ["LUNDI 9H", "MONDAY 9AM"], ["LUNDI 15H", "MONDAY 3PM"], ["MARDI 10H", "TUESDAY 10AM"],
  ["MERCREDI 11H", "WEDNESDAY 11AM"], ["JEUDI 14H", "THURSDAY 2PM"], ["VENDREDI 17H", "FRIDAY 5PM"],
];

export const worldLabel = (i: number): Label => {
  const w = Math.floor(i / 2) + 1;
  const st = (i % 2) + 1;
  return { fr: `MONDE ${w}-${st}`, en: `WORLD ${w}-${st}` };
};

/** Étiquettes de niveau propres à chaque format (18 caractères au plus). */
export const STAGES: Record<string, (i: number, n: number) => Label> = {
  semaine: list(DAYS),
  "nuit-blanche": list([["22H00", "10:00 PM"], ["23H47", "11:47 PM"], ["00H30", "12:30 AM"], ["02H13", "2:13 AM"], ["04H05", "4:05 AM"], ["05H58", "5:58 AM"]]),
  braquage: list([["REPÉRAGE", "SCOUTING"], ["L'ÉQUIPE", "THE CREW"], ["LE PLAN", "THE PLAN"], ["L'APPROCHE", "THE APPROACH"], ["LE COFFRE", "THE VAULT"], ["LE JOUR J", "D-DAY"]]),
  tournoi: list([["ROUND 1", "ROUND 1"], ["ROUND 2", "ROUND 2"], ["ROUND 3", "ROUND 3"], ["QUART DE FINALE", "QUARTER-FINAL"], ["DEMI-FINALE", "SEMI-FINAL"], ["FINALE", "FINAL"]]),
  "emission-tv": list([["ÉPREUVE 1", "ROUND 1"], ["ÉPREUVE 2", "ROUND 2"], ["ÉPREUVE 3", "ROUND 3"], ["LE DUEL", "THE DUEL"], ["LE JOKER", "THE JOKER"], ["SUPER FINALE", "GRAND FINAL"]]),
  boucle: list([["BOUCLE 1", "LOOP 1"], ["BOUCLE 2", "LOOP 2"], ["BOUCLE 4", "LOOP 4"], ["BOUCLE 7", "LOOP 7"], ["BOUCLE 12", "LOOP 12"], ["BOUCLE 23", "LOOP 23"]]),
  survie: nth("VAGUE", "WAVE"),
  enquete: list([["INDICE N°1", "CLUE #1"], ["INDICE N°2", "CLUE #2"], ["INDICE N°3", "CLUE #3"], ["LE TÉMOIN", "THE WITNESS"], ["L'INTERROGATOIRE", "INTERROGATION"], ["RECONSTITUTION", "RECONSTRUCTION"]]),
  speedrun: list([["SPLIT 1", "SPLIT 1"], ["SPLIT 2", "SPLIT 2"], ["SPLIT 3", "SPLIT 3"], ["SPLIT 4", "SPLIT 4"], ["SPLIT 5", "SPLIT 5"], ["DERNIER SPLIT", "FINAL SPLIT"]]),
  quete: worldLabel,
  "premier-jour": list([["08H58", "8:58 AM"], ["09H40", "9:40 AM"], ["11H15", "11:15 AM"], ["MIDI", "NOON"], ["15H00", "3:00 PM"], ["17H45", "5:45 PM"]]),
  simulateur: list([["TRIMESTRE 1", "QUARTER 1"], ["TRIMESTRE 2", "QUARTER 2"], ["TRIMESTRE 3", "QUARTER 3"], ["TRIMESTRE 4", "QUARTER 4"], ["ANNÉE 2", "YEAR 2"], ["BILAN", "REVIEW"]]),
};

/** Affinité des formats avec les verbes du métier. */
const FORMAT_VERBS: Record<string, Verb[]> = {
  semaine: [],
  "nuit-blanche": ["react", "investigate", "follow_procedure"],
  braquage: ["follow_procedure", "decide", "prioritize", "inspect"],
  tournoi: ["persuade", "decide"],
  "emission-tv": ["know", "inspect"],
  boucle: ["follow_procedure", "tune", "investigate"],
  survie: ["filter", "react", "prioritize"],
  enquete: ["investigate", "inspect"],
  speedrun: ["follow_procedure", "prioritize", "forecast"],
  quete: [],
  "premier-jour": [],
  simulateur: ["tune", "forecast", "decide"],
};
export const FORMAT_KEYS = Object.keys(STAGES);

/* ---------------- boss ---------------- */

type PhaseOpt = { mechanics: MechType[]; mod?: Mod };
/** Archétypes de boss (voir design/boss.md) : mécaniques possibles de chaque phase. */
export const BOSS_TEMPLATES: Record<string, { verbs: Verb[]; phases: PhaseOpt[] }> = {
  hydre: { verbs: ["filter", "react", "prioritize"], phases: [{ mechanics: ["catch", "runner"] }, { mechanics: ["shooter", "whack"], mod: "turbo" }, { mechanics: ["gauge", "rhythm"] }] },
  negociateur: { verbs: ["persuade", "decide"], phases: [{ mechanics: ["dialogue"] }, { mechanics: ["gauge"] }, { mechanics: ["slider", "wheel"] }] },
  saboteur: { verbs: ["inspect", "investigate", "follow_procedure"], phases: [{ mechanics: ["inspection", "hunt"] }, { mechanics: ["sequence", "rhythm"], mod: "blackout" }, { mechanics: ["shooter", "whack"] }] },
  avalanche: { verbs: ["filter", "react"], phases: [{ mechanics: ["runner", "catch"] }, { mechanics: ["shooter"], mod: "turbo" }, { mechanics: ["defense", "triage"] }] },
  "audit-final": { verbs: ["inspect", "know", "investigate"], phases: [{ mechanics: ["inspection", "hunt"] }, { mechanics: ["investigation"] }, { mechanics: ["triage", "quiz"] }] },
  siege: { verbs: ["react", "prioritize", "decide"], phases: [{ mechanics: ["defense"] }, { mechanics: ["shooter", "whack"], mod: "quake" }, { mechanics: ["defense", "gauge"] }] },
  "faux-boss": { verbs: [], phases: [{ mechanics: ["wheel", "quiz"] }, { mechanics: ["whack", "catch"] }, { mechanics: ["gauge", "sequence"], mod: "turbo" }] },
  horloge: { verbs: ["follow_procedure", "forecast", "tune"], phases: [{ mechanics: ["rhythm", "sequence"] }, { mechanics: ["gauge"], mod: "turbo" }, { mechanics: ["runner", "catch"] }] },
};

/* ---------------- plan ---------------- */

export interface PlannedLevel {
  order: number;
  missionId: string;
  requirementId: string;
  mechanic: MechType;
  day: Label;
  verb: Verb;
  entry: Entry;
  modifiers: Mod[];
}

export interface PlannedBoss {
  painPoint: string;
  archetype: string;
  phases: Array<{ mechanic: MechType; modifiers: Mod[] }>;
}

export interface GamePlan {
  format: string;
  levels: PlannedLevel[];
  boss?: PlannedBoss;
  pack: DomainPack;
  /** décor et habillage conseillés */
  scene: string;
  skin: string;
  /** décor ou habillage choisis par l'utilisateur : le modèle doit les reprendre */
  forcedScene?: boolean;
  forcedSkin?: boolean;
}

/** Ce qui a servi dans les derniers jeux (du plus récent au plus ancien) : on évite de le resservir. */
export interface Recent {
  formats: string[];
  mechanics: string[];
  bosses: string[];
}

export interface PlanOptions {
  maxLevels?: number;
  /** nombre exact de niveaux (mode idée) */
  levels?: number;
  /** mécaniques imposées par l'utilisateur : elles remplacent les règles de variété par défaut */
  mechanics?: MechType[];
  skin?: string;
  scene?: string;
  /** false : pas de boss ; true : un boss même sans « vrai problème » dans la fiche */
  boss?: boolean;
  /** format imposé ; sinon tiré au sort selon le métier */
  format?: string;
  /** mode idée : les mondes façon NES sont favorisés */
  idea?: boolean;
  difficulty?: "facile" | "normal" | "dur";
  recent?: Recent;
  /** formats à exclure (pour proposer des variantes différentes) */
  avoidFormats?: string[];
  rand?: () => number;
}

/** Tirage pondéré : renvoie l'élément de meilleur score (score + bruit). */
function pickBest<T>(items: T[], score: (x: T) => number, rand: () => number, noise = 1.5): T {
  let best = items[0] as T, bestS = -Infinity;
  for (const x of items) {
    const s = score(x) + rand() * noise;
    if (s > bestS) { best = x; bestS = s; }
  }
  return best;
}

/** Pénalité selon l'ancienneté dans l'historique (récent = forte). */
const recency = (list: string[] | undefined, key: string, strong = 3) => {
  const i = list?.indexOf(key) ?? -1;
  return i < 0 ? 0 : i < 2 ? strong : i < 5 ? strong / 2 : strong / 4;
};

function chooseFormat(job: JobModel, o: PlanOptions, rand: () => number): string {
  if (o.format && STAGES[o.format]) return o.format;
  const verbs = job.missions.map((m) => m.verb);
  const pool = FORMAT_KEYS.filter((f) => !o.avoidFormats?.includes(f));
  return pickBest(pool, (f) => {
    const aff = FORMAT_VERBS[f]!.length ? verbs.filter((v) => FORMAT_VERBS[f]!.includes(v)).length / verbs.length * 4 : 0.8;
    const bonus =
      (f === "quete" && o.idea ? 2 : 0) +
      (f === "premier-jour" && job.seniority === "junior" ? 2 : 0) +
      (f === "semaine" ? 0.3 : 0);
    return aff + bonus - recency(o.recent?.formats, f, 4);
  }, rand, 2.2);
}

export function planGame(job: JobModel, opts: PlanOptions = {}): GamePlan {
  const rand = opts.rand ?? Math.random;
  const pack = PACKS[job.family] ?? PACKS.generic;
  const target = opts.levels ?? Math.min(opts.maxLevels ?? 6, Math.max(4, Math.min(6, job.missions.length + 1)));
  // missions principales d'abord ; à priorité égale, l'ordre est tiré au sort (l'histoire change d'un jeu à l'autre)
  const missions = job.missions
    .map((m) => ({ m, k: (m.priority === "must" ? 0 : 10) + rand() * 3 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.m);
  const format = chooseFormat(job, opts, rand);

  // une mission peut revenir avec une autre mécanique si l'offre en a peu
  const queue = [...missions];
  while (queue.length < target) queue.push(missions[queue.length % missions.length]!);
  const chosen = queue.slice(0, target);

  /* 1. mécaniques : tirage pondéré, fidèle au verbe, pénalisé si déjà utilisé ici ou récemment */
  const wanted = [...new Set(opts.mechanics ?? [])];
  const used = new Map<MechType, number>();
  const levels: Array<{ missionId: string; requirementId: string; mechanic: MechType; verb: Verb }> = [];
  for (const m of chosen) {
    const prefs = VERB_MECHANICS[m.verb];
    const prev = levels[levels.length - 1]?.mechanic;
    const already = levels.filter((l) => l.missionId === m.id).map((l) => l.mechanic);
    const cands = prefs.filter((x) => x !== prev && !already.includes(x) && !(x === "quiz" && used.has("quiz")));
    const pool = cands.length ? cands : [...ARCADE, ...THINKING].filter((x) => x !== prev && (used.get(x) ?? 0) < 2);
    const pick = pickBest(pool, (x) => {
      const rank = prefs.indexOf(x);
      return (rank < 0 ? 0 : 1.6 - 0.5 * rank) - (used.get(x) ?? 0) * 2.5 - (opts.recent?.mechanics.filter((r) => r === x).length ?? 0) * 0.35;
    }, rand, 2.2);
    used.set(pick, (used.get(pick) ?? 0) + 1);
    levels.push({ missionId: m.id, requirementId: `req_${m.id}`.slice(0, 40), mechanic: pick, verb: m.verb });
  }
  if (wanted.length) applyWanted(levels, wanted);
  else {
    // au moins 2 niveaux d'arcade
    const arcadeCount = () => levels.filter((l) => ARCADE.includes(l.mechanic)).length;
    for (const l of [...levels].sort(() => rand() - 0.5)) {
      if (arcadeCount() >= 2) break;
      if (ARCADE.includes(l.mechanic)) continue;
      const alt = ARCADE_OF[l.verb];
      if (levels.some((x) => x.mechanic === alt)) {
        const other = ARCADE.find((a) => !levels.some((x) => x.mechanic === a));
        if (other) l.mechanic = other;
        continue;
      }
      l.mechanic = alt;
    }
    // au moins 1 niveau de réflexion
    if (!levels.some((l) => THINKING.includes(l.mechanic))) levels[levels.length - 1]!.mechanic = VERB_MECHANICS[levels[levels.length - 1]!.verb].find((x) => THINKING.includes(x)) ?? "investigation";
    // une qualité humaine demandée : un échange (dialogue) s'il n'y en a pas
    if (job.softSkills.length && !levels.some((l) => l.mechanic === "dialogue")) {
      const soft = levels.find((l) => job.missions.find((m) => m.id === l.missionId)?.kind === "soft")
        ?? [...levels].reverse().find((l) => THINKING.includes(l.mechanic)) ?? levels[levels.length - 1]!;
      soft.mechanic = "dialogue";
    }
  }
  // pas deux fois la même mécanique d'affilée
  for (let pass = 0; pass < 3; pass++)
    for (let i = 1; i < levels.length; i++)
      if (levels[i]!.mechanic === levels[i - 1]!.mechanic) {
        const j = levels.findIndex((x, k) => k > i && x.mechanic !== levels[i]!.mechanic && levels[k - 1]?.mechanic !== levels[i]!.mechanic);
        if (j > 0) [levels[i], levels[j]] = [levels[j]!, levels[i]!];
      }

  /* 2. entrées : briefing au niveau 1, puis 1 ou 2 embuscades (arcade) et un appel */
  const entries: Entry[] = levels.map(() => "briefing");
  const n = levels.length;
  const callIdx = pickBest(
    levels.map((_, i) => i).filter((i) => i > 0),
    (i) => (levels[i]!.mechanic === "dialogue" ? 3 : levels[i]!.verb === "persuade" ? 2 : THINKING.includes(levels[i]!.mechanic) ? 1 : 0),
    rand,
  );
  if (n >= 3) entries[callIdx] = "call";
  const ambushCands = levels.map((_, i) => i).filter((i) => i > 0 && i !== callIdx && ARCADE.includes(levels[i]!.mechanic));
  const ambushes = n >= 5 && rand() < 0.6 ? 2 : 1;
  for (let k = 0; k < ambushes && ambushCands.length; k++) {
    const i = ambushCands.splice(Math.floor(rand() * ambushCands.length), 1)[0]!;
    if (entries[i - 1] !== "ambush" && entries[i + 1] !== "ambush") entries[i] = "ambush";
  }

  /* 3. modificateurs : sur 0 à 3 niveaux selon la difficulté, jamais au niveau 1 */
  const nMods = opts.difficulty === "facile" ? 0 : opts.difficulty === "dur" ? Math.min(3, n - 2) : n >= 5 ? 2 : 1;
  const mods: Mod[][] = levels.map(() => []);
  const modCands = levels.map((_, i) => i).filter((i) => i >= 1 && ARCADE.includes(levels[i]!.mechanic));
  for (let k = 0; k < nMods && modCands.length; k++) {
    const i = modCands.splice(Math.floor(rand() * modCands.length), 1)[0]!;
    const mech = levels[i]!.mechanic;
    const options: Mod[] =
      mech === "catch" ? ["turbo", "fog", "mirror", "quake"]
      : mech === "whack" || mech === "shooter" ? ["turbo", "fog", "quake"]
      : mech === "runner" ? ["turbo", "quake", "blackout"]
      : ["turbo", "blackout", "quake"];
    mods[i] = [options[Math.floor(rand() * options.length)]!];
  }

  const label = STAGES[format]!;
  const planned: PlannedLevel[] = levels.map((l, i) => ({
    ...l, order: i + 1, day: opts.idea && format === "semaine" ? worldLabel(i) : label(i, n), entry: entries[i]!, modifiers: mods[i]!,
  }));

  /* 4. boss à plusieurs formes */
  const painLabel = job.painPoints[0]?.label ?? (opts.boss ? `${job.company} : le défi final` : undefined);
  let boss: PlannedBoss | undefined;
  if (painLabel && opts.boss !== false) {
    const verbs = job.missions.map((m) => m.verb);
    const archetype = pickBest(Object.keys(BOSS_TEMPLATES), (a) => {
      const t = BOSS_TEMPLATES[a]!;
      const aff = t.verbs.length ? verbs.filter((v) => t.verbs.includes(v)).length / verbs.length * 4 : job.tone.humor >= 2 ? 1.2 : 0;
      return aff - recency(opts.recent?.bosses, a, 4);
    }, rand, 2);
    const tpl = BOSS_TEMPLATES[archetype]!;
    const count = n <= 4 && opts.difficulty !== "dur" ? 2 : 3;
    const steps = count === 2 ? [tpl.phases[0]!, tpl.phases[tpl.phases.length - 1]!] : tpl.phases;
    const phases: PlannedBoss["phases"] = [];
    for (const st of steps) {
      const prev = phases[phases.length - 1]?.mechanic;
      const m = st.mechanics.filter((x) => x !== prev)[Math.floor(rand() * st.mechanics.filter((x) => x !== prev).length)] ?? st.mechanics[0]!;
      phases.push({ mechanic: m, modifiers: st.mod && opts.difficulty !== "facile" ? [st.mod] : [] });
    }
    if (!phases.some((p) => ARCADE.includes(p.mechanic))) phases[phases.length - 1] = { mechanic: "whack", modifiers: ["turbo"] };
    boss = { painPoint: painLabel, archetype, phases };
  }

  return {
    format,
    levels: planned,
    boss,
    pack,
    forcedScene: !!opts.scene,
    forcedSkin: !!opts.skin,
    scene: opts.scene ?? pack.scenes[Math.floor(rand() * pack.scenes.length)] ?? pack.scenes[0]!,
    skin: opts.skin ?? colorfulSkin(job, pack, rand),
  };
}

/**
 * Mécaniques imposées : chacune est utilisée au moins une fois (si le nombre de niveaux le permet),
 * de préférence sur le niveau dont le verbe s'y prête, puis on complète sans répéter deux fois d'affilée.
 */
function applyWanted(levels: Array<{ mechanic: MechType; verb: Verb; missionId: string }>, wanted: MechType[]) {
  const fixed = new Set<number>();
  for (const w of wanted.slice(0, levels.length)) {
    let i = levels.findIndex((l, k) => !fixed.has(k) && VERB_MECHANICS[l.verb].includes(w));
    if (i < 0) i = levels.findIndex((_, k) => !fixed.has(k));
    if (i < 0) break;
    levels[i]!.mechanic = w;
    fixed.add(i);
  }
  const count = (m: MechType) => levels.filter((l) => l.mechanic === m).length;
  levels.forEach((l, k) => {
    if (fixed.has(k)) return;
    const prev = levels[k - 1]?.mechanic;
    const own = VERB_MECHANICS[l.verb].find((m) => wanted.includes(m) && m !== prev);
    l.mechanic = own ?? [...wanted].sort((a, b) => count(a) - count(b)).find((m) => m !== prev) ?? wanted[0]!;
  });
  // dernière passe : jamais deux fois la même d'affilée ; si besoin, on redistribue (la plus fréquente d'abord)
  if (levels.some((l, k) => k > 0 && l.mechanic === levels[k - 1]!.mechanic)) {
    const left = new Map<MechType, number>();
    for (const l of levels) left.set(l.mechanic, (left.get(l.mechanic) ?? 0) + 1);
    let prev: MechType | undefined;
    for (const l of levels) {
      const cands = [...left.entries()].filter(([m, c]) => c > 0 && m !== prev).sort((a, b) =>
        b[1] - a[1] || Number(VERB_MECHANICS[l.verb].includes(b[0])) - Number(VERB_MECHANICS[l.verb].includes(a[0])));
      const m = cands[0]?.[0] ?? wanted.find((x) => x !== prev) ?? l.mechanic;
      if (left.get(m)) left.set(m, left.get(m)! - 1);
      l.mechanic = m;
      prev = m;
    }
  }
}

const ENTRY_FR: Record<Entry, string> = {
  briefing: "briefing (écran d'explication)",
  ambush: "EMBUSCADE (pas d'écran : une alerte et ça démarre ; l'intro doit claquer comme une alerte)",
  call: "APPEL ENTRANT (un personnage appelle : l'intro est ce qu'il dit au téléphone ; renseigne characterId)",
};

export function planText(job: JobModel, plan: GamePlan, mode: "job" | "idea" = "job"): string {
  const lines = plan.levels.map((l) => {
    const m = job.missions.find((x) => x.id === l.missionId)!;
    return `- Niveau ${l.order} · « ${l.day.fr} » · mécanique "${l.mechanic}" · entrée ${ENTRY_FR[l.entry]}${l.modifiers.length ? ` · modificateurs ${l.modifiers.join(", ")} (à justifier dans l'histoire)` : ""} · requirementId "${l.requirementId}"
    ${mode === "idea" ? "Action du héros" : "Mission"} : ${m.label} (verbe ${l.verb}). Décision : ${m.decision}. Bien fait : ${m.goodOutcome}.
    Indicateur : ${m.kpi.name} (${m.kpi.definition}). Erreurs de débutant : ${m.pitfalls.join(" ; ")}.
    Documents réels : ${m.artifacts.join(" | ")}`;
  });
  const b = plan.boss;
  const bossText = b
    ? `- BOSS « ${b.painPoint} », archétype "${b.archetype}", ${b.phases.length} phases (boss.phases, PAS de boss.mechanic, hp = ${b.phases.length}, archetype = "${b.archetype}") :
${b.phases.map((p, i) => `    · phase ${i + 1} : mécanique "${p.mechanic}"${p.modifiers.length ? `, modificateurs ${p.modifiers.join(", ")}` : ""}, avec son intro (ce que fait le boss), sa condition de victoire (win) et sa réplique d'échec (taunt)`).join("\n")}`
    : mode === "idea" ? "- Pas de boss." : "- Pas de boss (aucun vrai problème visible dans l'offre).";
  return `PLAN DU JEU (imposé : garde cet ordre, ces mécaniques, ces entrées, ces modificateurs, ces requirementId et ces étiquettes « day ») :
Format : "${plan.format}" (design.format = "${plan.format}").
${lines.join("\n")}
${bossText}
${plan.forcedScene ? `Décor imposé : ${plan.scene}.` : `Décor conseillé : ${plan.scene} (ou un décor plus proche du secteur).`} ${plan.forcedSkin ? `Habillage imposé : ${plan.skin}.` : `Habillage conseillé : ${plan.skin}.`}`;
}

/** Résumé court d'un plan (pour le choix entre variantes). */
export function planSummary(plan: GamePlan): string {
  return `format ${plan.format} : ${plan.levels.map((l) => `${l.day.fr} ${l.mechanic}${l.entry !== "briefing" ? `/${l.entry}` : ""}${l.modifiers.length ? `+${l.modifiers.join("+")}` : ""}`).join(" · ")}${plan.boss ? ` · BOSS ${plan.boss.archetype} (${plan.boss.phases.map((p) => p.mechanic + (p.modifiers.length ? `+${p.modifiers.join("+")}` : "")).join(" → ")})` : ""}`;
}

/**
 * Habillage : on privilégie les plus colorés, selon le ton de l'offre (très formel : sobre ; détendu : bonbon, BD, néon).
 * L'habillage de la famille de métiers reste possible, mais n'est plus systématique.
 */
export function colorfulSkin(job: JobModel, pack: DomainPack, rand: () => number): string {
  const f = job.tone.formality;
  const pool =
    f >= 5 ? ["corporate", "famicom"]
    : f === 4 ? ["famicom", "sunset", "corporate", pack.skin]
    : f === 3 ? ["arcade", "sunset", "synth", "famicom", pack.skin]
    : ["comic", "candy", "sunset", "arcade", "synth"];
  return pool[Math.floor(rand() * pool.length)]!;
}
