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
  levelId: string;
  winnable: boolean;
  wonAtStart: boolean;
  /** roues : part des parties gagnées par un joueur moyen (hasard, ou visée une fois sur deux en mode adresse) */
  winRate?: number;
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
    const winRate = l.mechanic.type === "wheel" ? wheelWinRate(c, l.mechanic, l.win, start) : undefined;
    out.push({ levelId: l.id, winnable: end !== null, wonAtStart, winRate });
    if (end) Object.assign(s, end);
  }
  return out;
}
