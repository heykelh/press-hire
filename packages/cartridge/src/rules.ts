/**
 * Règles de jeu partagées par le moteur (en partie) et par les contrôles (en simulation).
 * Tout est calculé ici : la cartouche ne fournit que des nombres.
 */
import type { Cartridge, Condition, Curve, Effect, Level, Mechanic } from "./schema";

export type GameState = Record<string, number>;

export function initState(c: Cartridge): GameState {
  return Object.fromEntries(c.state.vars.map((v) => [v.id, v.start]));
}

export function clampVar(c: Cartridge, id: string, value: number): number {
  const v = c.state.vars.find((x) => x.id === id);
  if (!v) return value;
  return Math.min(v.max, Math.max(v.min, value));
}

/** Applique des effets ; renvoie les variations réellement obtenues (après bornes). */
export function applyEffects(c: Cartridge, s: GameState, effects: Effect[]): Record<string, number> {
  const deltas: Record<string, number> = {};
  for (const e of effects) {
    const before = s[e.var] ?? 0;
    const raw = e.op === "add" ? before + e.value : e.op === "mul" ? before * e.value : e.value;
    const after = clampVar(c, e.var, raw);
    s[e.var] = after;
    deltas[e.var] = (deltas[e.var] ?? 0) + (after - before);
  }
  return deltas;
}

export function evalCurve(cv: Curve, x: number): number {
  switch (cv.family) {
    case "linear":
      return cv.a * x + cv.b;
    case "threshold":
      return x >= cv.t ? cv.above : cv.below;
    case "elasticity":
      return cv.base * Math.pow(Math.max(x, 1e-9) / cv.ref, -cv.e);
    case "diminishing":
      return cv.max * (1 - Math.exp(-cv.k * x));
  }
}

const OPS: Record<Condition["op"], (a: number, b: number) => boolean> = {
  ">=": (a, b) => a >= b,
  "<=": (a, b) => a <= b,
  ">": (a, b) => a > b,
  "<": (a, b) => a < b,
  "==": (a, b) => Math.abs(a - b) < 1e-9,
};

export function conditionValue(cond: Condition, s: GameState, levelStart: GameState): number {
  const v = s[cond.var] ?? 0;
  return cond.scope === "level" ? v - (levelStart[cond.var] ?? 0) : v;
}

export function checkConditions(conds: Condition[], s: GameState, levelStart: GameState): boolean {
  return conds.every((c) => OPS[c.op](conditionValue(c, s, levelStart), c.value));
}

/* ------------- mécaniques d'arcade : un « paquet » d'objets fixé d'avance ------------- */

/**
 * Nombre d'apparitions de chaque objet, proportionnel aux poids (plus forts restes).
 * Le jeu mélange ce paquet : le nombre de bons objets est donc connu, et la simulation exacte.
 */
export function arcadeCounts(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / sum) * total);
  const counts = raw.map(Math.floor);
  let left = total - counts.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    counts[i]!++;
    left--;
  }
  return counts;
}

export const arcadeTotal = (durationSec: number, perSec: number) => Math.max(1, Math.round(durationSec * perSec));

/** Apparitions de bons et de mauvais objets d'une mécanique catch ou whack. */
export function arcadeSplit(m: { durationSec: number; perSec: number; items?: Array<{ kind: string; weight: number }>; targets?: Array<{ kind: string; weight: number }> }): { good: number; bad: number } {
  const items = m.items ?? m.targets ?? [];
  const counts = arcadeCounts(items.map((x) => x.weight), arcadeTotal(m.durationSec, m.perSec));
  let good = 0, bad = 0;
  items.forEach((x, i) => (x.kind === "good" ? (good += counts[i]!) : (bad += counts[i]!)));
  return { good, bad };
}

/* ------------- simulation « meilleur joueur » pour les contrôles ------------- */

const sumEffects = (es: Effect[]) => es.reduce((t, e) => t + (e.op === "add" ? e.value : 0), 0);

/** Joue le niveau au mieux. Renvoie l'état final ou null si aucune stratégie ne gagne. */
export function playBest(c: Cartridge, m: Mechanic, win: Condition[], start: GameState): GameState | null {
  const s = { ...start };
  switch (m.type) {
    case "triage":
      m.items.forEach(() => applyEffects(c, s, m.onCorrect));
      break;
    case "quiz":
      m.questions.forEach(() => applyEffects(c, s, m.onCorrect));
      break;
    case "dialogue":
      for (const n of m.nodes) {
        // choix qui rapproche le plus des objectifs
        const best = [...n.choices].sort((a, b) => scoreToward(b.effects, win) - scoreToward(a.effects, win))[0]!;
        applyEffects(c, s, best.effects);
      }
      break;
    case "wheel": {
      const best = [...m.segments].sort((a, b) => scoreToward(b.effects, win) - scoreToward(a.effects, win))[0]!;
      for (let i = 0; i < m.spins; i++) applyEffects(c, s, best.effects);
      break;
    }
    case "catch": {
      const { good } = arcadeSplit(m);
      for (let i = 0; i < good; i++) applyEffects(c, s, m.onGood);
      break;
    }
    case "whack": {
      const { good } = arcadeSplit(m);
      for (let i = 0; i < good; i++) applyEffects(c, s, m.onHit);
      break;
    }
    case "gauge": {
      const best = [...m.zones].sort((a, b) => scoreToward(b.effects, win) - scoreToward(a.effects, win))[0]!;
      for (let i = 0; i < m.rounds; i++) applyEffects(c, s, best.effects);
      break;
    }
    case "sequence":
      for (let i = 0; i < m.rounds; i++) applyEffects(c, s, m.onSuccess);
      break;
    case "inspection":
      for (const k of m.cases) {
        applyEffects(c, s, m.onCorrect);
        if (k.correct === "reject") applyEffects(c, s, m.onSpotted);
      }
      break;
    case "investigation":
      for (let i = 0; i < m.rounds.length; i++) applyEffects(c, s, m.onFound);
      break;
    case "slider": {
      for (let x = m.control.min; x <= m.control.max + 1e-9; x += m.control.step) {
        const t = { ...start };
        for (let r = 0; r < m.rounds; r++)
          for (const o of m.outputs) applyEffects(c, t, [{ var: o.var, op: "add", value: evalCurve(o.curve, x) }]);
        if (checkConditions(win, t, start)) return t;
      }
      return null;
    }
  }
  return checkConditions(win, s, start) ? s : null;
}

/** Poids d'un ensemble d'effets vers les objectifs (signe selon le sens de la condition). */
function scoreToward(effects: Effect[], win: Condition[]): number {
  let score = 0;
  for (const e of effects) {
    const cond = win.find((w) => w.var === e.var);
    const dir = !cond ? 0 : cond.op === "<=" || cond.op === "<" ? -1 : 1;
    score += dir * (e.op === "add" ? e.value : 0);
  }
  return score || sumEffects(effects) * 0.001;
}

export interface LevelCheck {
  /** chemin dans la cartouche (levels[i] ou boss.phases[i]) */
  path?: string;
  levelId: string;
  winnable: boolean;
  wonAtStart: boolean;
  /** roues : part des parties gagnées par un joueur moyen (hasard, ou visée une fois sur deux en mode adresse) */
  winRate?: number;
  /** arcade : un joueur moyen (75 % des bons objets) ne gagne pas */
  tooHard?: boolean;
}

/** Petit générateur déterministe pour les simulations. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Joueur moyen sur une jauge : vise la meilleure zone, l'atteint une fois sur deux (sinon position au hasard). */
export function gaugeWinRate(c: Cartridge, m: Extract<Mechanic, { type: "gauge" }>, win: Condition[], start: GameState, runs = 600): number {
  const rand = seeded(runs * 31 + m.zones.length);
  const best = [...m.zones].sort((a, b) => scoreToward(b.effects, win) - scoreToward(a.effects, win))[0]!;
  let wins = 0;
  for (let r = 0; r < runs; r++) {
    const s = { ...start };
    for (let i = 0; i < m.rounds; i++) {
      const x = rand() < 0.5 ? (best.from + best.to) / 2 : rand() * 100;
      const z = m.zones.find((q) => x >= q.from && x < q.to);
      if (z) applyEffects(c, s, z.effects);
    }
    if (checkConditions(win, s, start)) wins++;
  }
  return wins / runs;
}

/** Joueur moyen sur une mécanique d'arcade : 75 % des bons objets, 20 % des pièges. */
export function arcadeAverageWins(c: Cartridge, m: Extract<Mechanic, { type: "catch" | "whack" }>, win: Condition[], start: GameState): boolean {
  const { good, bad } = arcadeSplit(m);
  const s = { ...start };
  const [onGood, onBad, onMiss] = m.type === "catch" ? [m.onGood, m.onBad, m.onMiss] : [m.onHit, m.onWrong, m.onMiss];
  const g = Math.round(good * 0.75);
  for (let i = 0; i < g; i++) applyEffects(c, s, onGood);
  for (let i = 0; i < good - g; i++) applyEffects(c, s, onMiss);
  for (let i = 0; i < Math.round(bad * 0.2); i++) applyEffects(c, s, onBad);
  return checkConditions(win, s, start);
}

/** Taux de victoire d'un joueur moyen sur une roue. */
export function wheelWinRate(c: Cartridge, m: Extract<Mechanic, { type: "wheel" }>, win: Condition[], start: GameState, runs = 600): number {
  const rand = seeded(runs * 7919 + m.segments.length);
  const total = m.segments.reduce((t, x) => t + x.weight, 0);
  const best = [...m.segments].sort((a, b) => scoreToward(b.effects, win) - scoreToward(a.effects, win))[0]!;
  let wins = 0;
  for (let r = 0; r < runs; r++) {
    const s = { ...start };
    for (let i = 0; i < m.spins; i++) {
      let seg = best;
      if (m.stop === "random" || rand() < 0.5) {
        let x = rand() * total;
        seg = m.segments.find((z) => (x -= z.weight) < 0) ?? m.segments[m.segments.length - 1]!;
      }
      applyEffects(c, s, seg.effects);
    }
    if (checkConditions(win, s, start)) wins++;
  }
  return wins / runs;
}

/** Parcourt les niveaux dans l'ordre en jouant au mieux. */
export function simulateBestRun(c: Cartridge): LevelCheck[] {
  const s = initState(c);
  const out: LevelCheck[] = [];
  const levels: Level[] = [...c.levels].sort((a, b) => a.order - b.order);
  for (const l of levels) {
    const start = { ...s };
    const wonAtStart = checkConditions(l.win, start, start);
    const end = playBest(c, l.mechanic, l.win, start);
    const m = l.mechanic;
    const winRate = m.type === "wheel" ? wheelWinRate(c, m, l.win, start) : m.type === "gauge" ? gaugeWinRate(c, m, l.win, start) : undefined;
    const tooHard = m.type === "catch" || m.type === "whack" ? !arcadeAverageWins(c, m, l.win, start) : undefined;
    out.push({ levelId: l.id, path: `levels[${c.levels.indexOf(l)}]`, winnable: end !== null, wonAtStart, winRate, tooHard });
    if (end) Object.assign(s, end);
  }
  // boss à plusieurs formes : chaque phase se vérifie comme un niveau, dans l'ordre
  (c.boss?.phases ?? []).forEach((ph, i) => {
    const start = { ...s };
    const m = ph.mechanic;
    const end = playBest(c, m, ph.win, start);
    const winRate = m.type === "wheel" ? wheelWinRate(c, m, ph.win, start) : m.type === "gauge" ? gaugeWinRate(c, m, ph.win, start) : undefined;
    const tooHard = m.type === "catch" || m.type === "whack" ? !arcadeAverageWins(c, m, ph.win, start) : undefined;
    out.push({ levelId: `boss-phase-${i + 1}`, path: `boss.phases[${i}]`, winnable: end !== null, wonAtStart: checkConditions(ph.win, start, start), winRate, tooHard });
    if (end) Object.assign(s, end);
  });
  return out;
}
