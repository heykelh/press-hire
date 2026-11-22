/**
 * Plan de jeu déterministe : à partir de la fiche du poste, on choisit les missions jouées,
 * la mécanique de chacune (par son verbe d'action), le moment de la semaine et le boss.
 * Le modèle de langue écrit ensuite le contenu, mais ne choisit plus la structure : c'est plus juste et plus varié.
 */
import type { JobModel, Verb } from "./job";
import { PACKS, type DomainPack } from "./packs";

export type MechType = "catch" | "whack" | "gauge" | "sequence" | "inspection" | "investigation" | "triage" | "quiz" | "dialogue" | "slider" | "wheel";

export const ARCADE: MechType[] = ["catch", "whack", "gauge", "sequence"];
export const THINKING: MechType[] = ["inspection", "investigation", "triage", "quiz", "dialogue", "slider"];

/** Verbe du métier → mécaniques possibles, de la plus fidèle à la moins fidèle. */
export const VERB_MECHANICS: Record<Verb, MechType[]> = {
  filter: ["catch", "triage", "inspection"],
  react: ["whack", "triage", "catch"],
  tune: ["gauge", "slider", "wheel"],
  follow_procedure: ["sequence", "quiz", "triage"],
  inspect: ["inspection", "triage", "catch"],
  investigate: ["investigation", "quiz", "triage"],
  prioritize: ["triage", "whack", "inspection"],
  decide: ["slider", "gauge", "quiz"],
  know: ["quiz", "investigation", "inspection"],
  persuade: ["dialogue", "quiz", "triage"],
  forecast: ["slider", "gauge", "investigation"],
};

const DAYS = [
  { fr: "LUNDI 9H", en: "MONDAY 9AM" },
  { fr: "LUNDI 15H", en: "MONDAY 3PM" },
  { fr: "MARDI 10H", en: "TUESDAY 10AM" },
  { fr: "MERCREDI 11H", en: "WEDNESDAY 11AM" },
  { fr: "JEUDI 14H", en: "THURSDAY 2PM" },
  { fr: "VENDREDI 17H", en: "FRIDAY 5PM" },
];

export interface PlannedLevel {
  order: number;
  missionId: string;
  requirementId: string;
  mechanic: MechType;
  day: { fr: string; en: string };
  verb: Verb;
}

export interface GamePlan {
  levels: PlannedLevel[];
  boss?: { painPoint: string; mechanic: "quiz" | "gauge" | "wheel" };
  pack: DomainPack;
  /** décor et habillage conseillés */
  scene: string;
  skin: string;
  /** décor ou habillage choisis par l'utilisateur : le modèle doit les reprendre */
  forcedScene?: boolean;
  forcedSkin?: boolean;
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
  /** "week" : moments de la semaine (offre d'emploi) ; "worlds" : MONDE 1-1, 1-2… (mode idée) */
  stages?: "week" | "worlds";
}

/** Étiquettes « MONDE 1-1 » façon NES : deux niveaux par monde. */
export const worldLabel = (i: number) => {
  const w = Math.floor(i / 2) + 1;
  const st = (i % 2) + 1;
  return { fr: `MONDE ${w}-${st}`, en: `WORLD ${w}-${st}` };
};

/** Choisit 4 à 6 niveaux : missions principales d'abord, mécaniques variées, au moins 2 d'arcade et 1 de réflexion. */
export function planGame(job: JobModel, opts: PlanOptions = {}): GamePlan {
  const pack = PACKS[job.family] ?? PACKS.generic;
  const target = opts.levels ?? Math.min(opts.maxLevels ?? 6, Math.max(4, Math.min(6, job.missions.length + 1)));
  const missions = [...job.missions].sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "must" ? -1 : 1));

  // une mission peut revenir avec une autre mécanique si l'offre en a peu
  const queue = [...missions];
  while (queue.length < target) queue.push(missions[queue.length % missions.length]!);
  const chosen = queue.slice(0, target);

  const used = new Map<MechType, number>();
  const levels: Array<Omit<PlannedLevel, "order" | "day">> = [];
  for (const m of chosen) {
    const prefs = VERB_MECHANICS[m.verb];
    const prev = levels[levels.length - 1]?.mechanic;
    const already = levels.filter((l) => l.missionId === m.id).map((l) => l.mechanic);
    const pick =
      prefs.find((x) => x !== prev && !already.includes(x) && (used.get(x) ?? 0) === 0) ??
      prefs.find((x) => x !== prev && !already.includes(x) && (used.get(x) ?? 0) < 2) ??
      [...ARCADE, ...THINKING].find((x) => x !== prev && !used.has(x))!;
    used.set(pick, (used.get(pick) ?? 0) + 1);
    levels.push({ missionId: m.id, requirementId: `req_${m.id}`.slice(0, 40), mechanic: pick, verb: m.verb });
  }

  const wanted = [...new Set(opts.mechanics ?? [])];
  if (wanted.length) applyWanted(levels, wanted);
  // au moins 2 mécaniques d'arcade : on convertit les niveaux dont le verbe s'y prête le mieux
  const ARCADE_OF: Record<Verb, MechType> = {
    filter: "catch", react: "whack", tune: "gauge", follow_procedure: "sequence", inspect: "catch", investigate: "whack",
    prioritize: "whack", decide: "gauge", know: "catch", persuade: "sequence", forecast: "gauge",
  };
  const arcadeCount = () => levels.filter((l) => ARCADE.includes(l.mechanic)).length;
  if (!wanted.length) for (const l of [...levels].sort((a, b) => Number(ARCADE.includes(ARCADE_OF[b.verb])) - Number(ARCADE.includes(ARCADE_OF[a.verb])))) {
    if (arcadeCount() >= 2) break;
    if (ARCADE.includes(l.mechanic)) continue;
    const alt = ARCADE_OF[l.verb];
    if (levels.filter((x) => x.mechanic === alt).length >= 1) continue;
    l.mechanic = alt;
  }
  // au moins 1 mécanique de réflexion
  if (!wanted.length && !levels.some((l) => THINKING.includes(l.mechanic))) levels[levels.length - 1]!.mechanic = "quiz";
  // une qualité humaine demandée : un échange (dialogue) s'il n'y en a pas
  if (!wanted.length && job.softSkills.length && !levels.some((l) => l.mechanic === "dialogue")) {
    const soft = levels.find((l) => job.missions.find((m) => m.id === l.missionId)?.kind === "soft") ?? levels[levels.length - 1]!;
    soft.mechanic = "dialogue";
  }
  // pas deux fois la même mécanique d'affilée
  for (let i = 1; i < levels.length; i++)
    if (levels[i]!.mechanic === levels[i - 1]!.mechanic && i + 1 < levels.length) [levels[i], levels[i + 1]] = [levels[i + 1]!, levels[i]!];

  const step = levels.length > 1 ? (DAYS.length - 1) / (levels.length - 1) : 0;
  const planned = levels.map((l, i) => ({
    ...l, order: i + 1, day: opts.stages === "worlds" ? worldLabel(i) : DAYS[Math.round(i * step)]!,
  }));

  const painLabel = job.painPoints[0]?.label ?? (opts.boss ? `${job.company} : le défi final` : undefined);
  const boss = painLabel && opts.boss !== false
    ? { painPoint: painLabel, mechanic: (job.jargon.length >= 5 ? "quiz" : planned.some((l) => l.mechanic === "gauge") ? "quiz" : "gauge") as "quiz" | "gauge" }
    : undefined;

  return {
    levels: planned, boss, pack,
    forcedScene: !!opts.scene,
    forcedSkin: !!opts.skin,
    scene: opts.scene ?? pack.scenes[0]!,
    skin: opts.skin ?? (job.tone.formality >= 5 ? "corporate" : pack.skin),
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
}

export function planText(job: JobModel, plan: GamePlan, mode: "job" | "idea" = "job"): string {
  const lines = plan.levels.map((l) => {
    const m = job.missions.find((x) => x.id === l.missionId)!;
    return `- Niveau ${l.order} · ${l.day.fr} · mécanique "${l.mechanic}" · requirementId "${l.requirementId}"
    ${mode === "idea" ? "Action du héros" : "Mission"} : ${m.label} (verbe ${l.verb}). Décision : ${m.decision}. Bien fait : ${m.goodOutcome}.
    Indicateur : ${m.kpi.name} (${m.kpi.definition}). Erreurs de débutant : ${m.pitfalls.join(" ; ")}.
    Documents réels : ${m.artifacts.join(" | ")}`;
  });
  return `PLAN DU JEU (imposé : garde cet ordre, ces mécaniques, ces requirementId et ces ${mode === "idea" ? "mondes" : "jours"}) :
${lines.join("\n")}
${plan.boss ? `- Boss : « ${plan.boss.painPoint} », mécanique "${plan.boss.mechanic}".` : mode === "idea" ? "- Pas de boss." : "- Pas de boss (aucun vrai problème visible dans l'offre)."}
${plan.forcedScene ? `Décor imposé : ${plan.scene}.` : `Décor conseillé : ${plan.scene} (ou un décor plus proche du secteur).`} ${plan.forcedSkin ? `Habillage imposé : ${plan.skin}.` : `Habillage conseillé : ${plan.skin}.`}`;
}
