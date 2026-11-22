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
    case "defense": {
      const { blocked, leaked } = defenseBest(m);
      for (let i = 0; i < blocked; i++) applyEffects(c, s, m.onBlock);
      for (let i = 0; i < leaked; i++) applyEffects(c, s, m.onLeak);
      break;
    }
    case "pipes":
      for (let i = 0; i < m.rounds.length; i++) applyEffects(c, s, m.onSolve);
      break;
    case "hunt":
      for (const r of m.rounds) for (const x of r.items) if (x.risk) applyEffects(c, s, m.onFound);
      break;
    case "runner": {
      const { good } = arcadeSplit(m);
      for (let i = 0; i < good; i++) applyEffects(c, s, m.onGood);
      break;
    }
    case "shooter": {
      const { good } = arcadeSplit(m);
      for (let i = 0; i < good; i++) applyEffects(c, s, m.onHit);
      break;
    }
    case "rhythm":
      for (let i = 0; i < m.notes.length; i++) applyEffects(c, s, m.onHit);
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
  /** stratégies naïves qui gagnent quand même (le niveau n'apprend rien) */
  naive?: string[];
  /** réflexion : part des parties gagnées par un débutant simulé (3 bonnes réponses sur 4) */
  noviceRate?: number;
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

/**
 * Joueur humain simulé sur une mécanique d'arcade : sa réussite baisse avec la cadence et la vitesse
 * (temps de réaction limité), il se trompe parfois de cible. Victoire si 60 % des parties simulées gagnent.
 */
export function arcadeAverageWins(c: Cartridge, m: Extract<Mechanic, { type: "catch" | "whack" | "runner" | "shooter" }>, win: Condition[], start: GameState): boolean {
  return arcadeHumanRate(c, m, win, start) >= 0.5;
}

/** Part des parties gagnées par un joueur humain moyen (temps de réaction, erreurs), sur 400 parties. */
export function arcadeHumanRate(c: Cartridge, m: Extract<Mechanic, { type: "catch" | "whack" | "runner" | "shooter" }>, win: Condition[], start: GameState, runs = 400): number {
  const { good, bad } = arcadeSplit(m);
  const [onGood, onBad, onMiss] = m.type === "catch" || m.type === "runner" ? [m.onGood, m.onBad, m.onMiss] : [m.onHit, m.onWrong, m.onMiss];
  // cadence : au-delà d'un objet par seconde, chaque dixième de plus coûte ; tape-alerte : cibles brèves plus dures
  const rate = Math.max(0, m.perSec - 1);
  const brief = m.type === "whack" ? Math.max(0, (1200 - m.upMs) / 1000) : 0;
  const pGood = Math.min(0.92, Math.max(0.5, 0.88 - 0.16 * rate - 0.25 * brief));
  const pBad = Math.min(0.35, 0.12 + 0.08 * rate);
  const rnd = seeded(97);
  let wins = 0;
  for (let r = 0; r < runs; r++) {
    const s = { ...start };
    for (let i = 0; i < good; i++) applyEffects(c, s, rnd() < pGood ? onGood : onMiss);
    for (let i = 0; i < bad; i++) if (rnd() < pBad) applyEffects(c, s, onBad);
    if (checkConditions(win, s, start)) wins++;
  }
  return wins / runs;
}

/**
 * Débutant simulé sur les mécaniques de réflexion : il trouve la bonne réponse 3 fois sur 4
 * (c'est le niveau qu'un jeu pédagogique doit permettre de gagner en un ou deux essais).
 */
export function noviceWinRate(c: Cartridge, m: Mechanic, win: Condition[], start: GameState, runs = 400): number | undefined {
  const p = 0.75;
  const rnd = seeded(131);
  const one = (play: (s: GameState) => void) => {
    let w = 0;
    for (let r = 0; r < runs; r++) { const s = { ...start }; play(s); if (checkConditions(win, s, start)) w++; }
    return w / runs;
  };
  switch (m.type) {
    case "triage": return one((s) => m.items.forEach(() => applyEffects(c, s, rnd() < p ? m.onCorrect : m.onWrong)));
    case "quiz": return one((s) => m.questions.forEach(() => applyEffects(c, s, rnd() < p ? m.onCorrect : m.onWrong)));
    case "inspection": return one((s) => m.cases.forEach((k) => {
      const ok = rnd() < p;
      applyEffects(c, s, ok ? m.onCorrect : m.onWrong);
      if (ok && k.correct === "reject" && rnd() < 0.6) applyEffects(c, s, m.onSpotted);
    }));
    case "investigation": return one((s) => m.rounds.forEach(() => applyEffects(c, s, rnd() < 0.7 ? m.onFound : m.onWrong)));
    case "rhythm": return one((s) => m.notes.forEach(() => { const x = rnd(); applyEffects(c, s, x < 0.7 ? m.onHit : x < 0.85 ? m.onWrong : m.onMiss); }));
    case "hunt": return one((s) => m.rounds.forEach((rd) => rd.items.forEach((x) => {
      if (x.risk) applyEffects(c, s, rnd() < 0.8 ? m.onFound : m.onMissed);
      else if (rnd() < 0.12) applyEffects(c, s, m.onWrong);
    })));
    default: return undefined;
  }
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
    const tooHard = m.type === "catch" || m.type === "whack" || m.type === "runner" || m.type === "shooter" ? !arcadeAverageWins(c, m, l.win, start) : undefined;
    const naive = naiveWins(c, l.mechanic, l.win, { ...s });
    const noviceRate = noviceWinRate(c, l.mechanic, l.win, start);
    out.push({ levelId: l.id, path: `levels[${c.levels.indexOf(l)}]`, winnable: end !== null, wonAtStart, winRate, tooHard, naive, noviceRate });
    if (end) Object.assign(s, end);
  }
  // boss à plusieurs formes : chaque phase se vérifie comme un niveau, dans l'ordre
  (c.boss?.phases ?? []).forEach((ph, i) => {
    const start = { ...s };
    const m = ph.mechanic;
    const end = playBest(c, m, ph.win, start);
    const winRate = m.type === "wheel" ? wheelWinRate(c, m, ph.win, start) : m.type === "gauge" ? gaugeWinRate(c, m, ph.win, start) : undefined;
    const tooHard = m.type === "catch" || m.type === "whack" || m.type === "runner" || m.type === "shooter" ? !arcadeAverageWins(c, m, ph.win, start) : undefined;
    out.push({ levelId: `boss-phase-${i + 1}`, path: `boss.phases[${i}]`, winnable: end !== null, wonAtStart: checkConditions(ph.win, start, start), winRate, tooHard, naive: naiveWins(c, m, ph.win, start) });
    if (end) Object.assign(s, end);
  });
  return out;
}

/* ------------- stratégies naïves : on ne doit pas gagner sans réfléchir ------------- */

export interface NaiveRun {
  /** nom lisible de la stratégie (« tout accepter », « toujours la réponse A »…) */
  policy: string;
  end: GameState;
}

/**
 * Joue le niveau avec des stratégies qui ignorent ce que le jeu veut apprendre : ne rien faire,
 * tout prendre, toujours le même côté, toujours la même réponse, toujours le minimum ou le maximum.
 * Si l'une d'elles gagne, le niveau n'apprend rien (inspiré de l'analyse des « stratégies simples dominantes »).
 */
export function naiveRuns(c: Cartridge, m: Mechanic, start: GameState): NaiveRun[] {
  const out: NaiveRun[] = [];
  const run = (policy: string, play: (s: GameState) => void) => {
    const s = { ...start };
    play(s);
    out.push({ policy, end: s });
  };
  switch (m.type) {
    case "triage":
      for (const side of ["accept", "reject"] as const)
        run(side === "accept" ? "tout accepter" : "tout refuser", (s) =>
          m.items.forEach((it) => applyEffects(c, s, it.correct === side ? m.onCorrect : m.onWrong)));
      break;
    case "quiz": {
      const max = Math.max(...m.questions.map((q) => q.options.length));
      for (let k = 0; k < max; k++)
        run(`toujours la réponse ${"ABCD"[k]}`, (s) =>
          m.questions.forEach((q) => applyEffects(c, s, q.correctIndex === k ? m.onCorrect : m.onWrong)));
      run("toujours la réponse la plus longue", (s) =>
        m.questions.forEach((q) => {
          const lens = q.options.map((o) => o.fr.length);
          applyEffects(c, s, lens.indexOf(Math.max(...lens)) === q.correctIndex ? m.onCorrect : m.onWrong);
        }));
      break;
    }
    case "dialogue":
      run("toujours la première réplique", (s) => m.nodes.forEach((n) => applyEffects(c, s, n.choices[0]!.effects)));
      run("toujours la dernière réplique", (s) => m.nodes.forEach((n) => applyEffects(c, s, n.choices[n.choices.length - 1]!.effects)));
      break;
    case "catch":
    case "whack": {
      const { good, bad } = arcadeSplit(m);
      const [onGood, onBad, onMiss] = m.type === "catch" ? [m.onGood, m.onBad, m.onMiss] : [m.onHit, m.onWrong, m.onMiss];
      run(m.type === "catch" ? "tout attraper" : "taper partout", (s) => {
        for (let i = 0; i < good; i++) applyEffects(c, s, onGood);
        for (let i = 0; i < bad; i++) applyEffects(c, s, onBad);
      });
      run("ne rien faire", (s) => { for (let i = 0; i < good; i++) applyEffects(c, s, onMiss); });
      break;
    }
    case "inspection":
      run("tout accepter", (s) => m.cases.forEach((k) => applyEffects(c, s, k.correct === "accept" ? m.onCorrect : m.onWrong)));
      run("tout refuser", (s) => m.cases.forEach((k) => applyEffects(c, s, k.correct === "reject" ? m.onCorrect : m.onWrong)));
      break;
    case "investigation":
      run("toujours la première ligne", (s) => m.rounds.forEach((r) => applyEffects(c, s, r.answer === 0 ? m.onFound : m.onWrong)));
      run("toujours la dernière ligne", (s) => m.rounds.forEach((r) => {
        const n = r.view.kind === "table" ? r.view.rows.length : r.view.kind === "logs" ? r.view.lines.length : r.view.values.length;
        applyEffects(c, s, r.answer === n - 1 ? m.onFound : m.onWrong);
      }));
      break;
    case "slider":
      for (const [policy, x] of [["toujours le minimum", m.control.min], ["toujours le maximum", m.control.max]] as const)
        run(policy, (s) => {
          for (let r = 0; r < m.rounds; r++)
            for (const o of m.outputs) applyEffects(c, s, [{ var: o.var, op: "add", value: evalCurve(o.curve, x) }]);
        });
      break;
    case "defense": {
      const total = m.waves.reduce((t, w) => t + w.lanes.flat().length, 0);
      run("ne rien placer", (s) => { for (let i = 0; i < total; i++) applyEffects(c, s, m.onLeak); });
      // le défenseur le moins cher partout, renouvelé à chaque vague
      const cheap = [...m.defenders].sort((a, b) => a.cost - b.cost)[0]!;
      const r1 = defensePlay(m, () => m.lanes.map(() => cheap.id));
      run("le moins cher partout", (s) => {
        for (let i = 0; i < r1.blocked; i++) applyEffects(c, s, m.onBlock);
        for (let i = 0; i < r1.leaked; i++) applyEffects(c, s, m.onLeak);
      });
      // le défenseur le plus polyvalent partout
      const wide = [...m.defenders].sort((a, b) => b.counters.length - a.counters.length || a.cost - b.cost)[0]!;
      const r2 = defensePlay(m, () => m.lanes.map(() => wide.id));
      run("le même défenseur partout", (s) => {
        for (let i = 0; i < r2.blocked; i++) applyEffects(c, s, m.onBlock);
        for (let i = 0; i < r2.leaked; i++) applyEffects(c, s, m.onLeak);
      });
      break;
    }
    case "pipes":
      run("ne rien faire", (s) => { for (let i = 0; i < m.rounds.length; i++) applyEffects(c, s, m.onFail); });
      break;
    case "runner": {
      // le moteur alterne les hauteurs : la moitié des bons objets en l'air, la moitié des pièges au sol
      const { good, bad } = arcadeSplit(m);
      const gAir = Math.ceil(good / 2), bGround = Math.ceil(bad / 2);
      run("toujours sauter", (s) => {
        for (let i = 0; i < gAir; i++) applyEffects(c, s, m.onGood);
        for (let i = 0; i < good - gAir; i++) applyEffects(c, s, m.onMiss);
        for (let i = 0; i < bad - bGround; i++) applyEffects(c, s, m.onBad);
      });
      run("ne jamais sauter", (s) => {
        for (let i = 0; i < good - gAir; i++) applyEffects(c, s, m.onGood);
        for (let i = 0; i < gAir; i++) applyEffects(c, s, m.onMiss);
        for (let i = 0; i < bGround; i++) applyEffects(c, s, m.onBad);
      });
      break;
    }
    case "shooter": {
      const { good, bad } = arcadeSplit(m);
      run("tirer sur tout", (s) => {
        for (let i = 0; i < good; i++) applyEffects(c, s, m.onHit);
        for (let i = 0; i < bad; i++) applyEffects(c, s, m.onWrong);
      });
      run("ne rien faire", (s) => { for (let i = 0; i < good; i++) applyEffects(c, s, m.onMiss); });
      break;
    }
    case "rhythm":
      for (const lane of m.lanes)
        run(`toujours la colonne « ${lane.label.fr} »`, (s) => m.notes.forEach((n) => applyEffects(c, s, n.lane === lane.id ? m.onHit : m.onWrong)));
      run("ne rien faire", (s) => m.notes.forEach(() => applyEffects(c, s, m.onMiss)));
      break;
    case "hunt":
      run("cliquer sur tout", (s) => m.rounds.forEach((r) => r.items.forEach((x) => applyEffects(c, s, x.risk ? m.onFound : m.onWrong))));
      run("ne rien faire", (s) => m.rounds.forEach((r) => r.items.forEach((x) => { if (x.risk) applyEffects(c, s, m.onMissed); })));
      break;
    case "gauge": {
      // si même la pire zone fait gagner, la jauge ne demande aucune précision
      const worst = [...m.zones].sort((a, b) => sumEffects(a.effects) - sumEffects(b.effects))[0];
      if (worst) run("viser n'importe où", (s) => { for (let i = 0; i < m.rounds; i++) applyEffects(c, s, worst.effects); });
      break;
    }
    default:
      break;
  }
  return out;
}

/** Stratégies naïves qui gagnent le niveau (liste vide = le niveau demande vraiment de réfléchir). */
export function naiveWins(c: Cartridge, m: Mechanic, win: Condition[], start: GameState): string[] {
  return naiveRuns(c, m, start).filter((r) => checkConditions(win, r.end, start)).map((r) => r.policy);
}

/* ------------- défense : placement des défenseurs ------------- */

type Defense = Extract<Mechanic, { type: "defense" }>;

/**
 * Joue toutes les vagues avec une stratégie de placement (un identifiant de défenseur ou null par couloir).
 * Règles du moteur : budget de départ, revenu ajouté avant chaque vague suivante, un défenseur par couloir
 * qui reste en place ; le remplacer coûte son prix plein (pas de remboursement). Si le budget manque, le couloir garde l'ancien.
 */
export function defensePlay(m: Defense, choose: (wave: number, current: Array<string | null>, gold: number) => Array<string | null>): { blocked: number; leaked: number } {
  let gold = m.budget;
  let cur: Array<string | null> = m.lanes.map(() => null);
  let blocked = 0, leaked = 0;
  m.waves.forEach((w, wi) => {
    if (wi > 0) gold += m.income;
    const want = choose(wi, cur, gold);
    const next = [...cur];
    want.forEach((id, lane) => {
      if (id === cur[lane]) return;
      const d = m.defenders.find((x) => x.id === id);
      if (id === null) { next[lane] = null; return; }
      if (d && d.cost <= gold) { gold -= d.cost; next[lane] = id; }
    });
    cur = next;
    w.lanes.forEach((enemies, lane) => {
      const d = m.defenders.find((x) => x.id === cur[lane]);
      for (const e of enemies) (d?.counters.includes(e) ? blocked++ : leaked++);
    });
  });
  return { blocked, leaked };
}

/** Meilleur placement (recherche en faisceau sur les vagues) : le plus d'ennemis bloqués. */
export function defenseBest(m: Defense): { blocked: number; leaked: number } {
  type St = { gold: number; cur: Array<string | null>; blocked: number; leaked: number };
  let beam: St[] = [{ gold: m.budget, cur: m.lanes.map(() => null), blocked: 0, leaked: 0 }];
  const opts: Array<string | null> = [null, ...m.defenders.map((d) => d.id)];
  m.waves.forEach((w, wi) => {
    const next: St[] = [];
    for (const st of beam) {
      const gold0 = st.gold + (wi > 0 ? m.income : 0);
      // toutes les combinaisons de placement (au plus 6^4 = 1296)
      const combos: Array<Array<string | null>> = [[]];
      for (let lane = 0; lane < m.lanes.length; lane++) {
        const grown: Array<Array<string | null>> = [];
        for (const cmb of combos) for (const o of [st.cur[lane]!, ...opts]) grown.push([...cmb, o ?? null]);
        combos.splice(0, combos.length, ...grown);
      }
      for (const want of combos) {
        let gold = gold0;
        let ok = true;
        want.forEach((id, lane) => {
          if (id === st.cur[lane] || id === null) return;
          const d = m.defenders.find((x) => x.id === id)!;
          gold -= d.cost;
          if (gold < 0) ok = false;
        });
        if (!ok) continue;
        let b = 0, l = 0;
        w.lanes.forEach((enemies, lane) => {
          const d = m.defenders.find((x) => x.id === want[lane]);
          for (const e of enemies) (d?.counters.includes(e) ? b++ : l++);
        });
        next.push({ gold, cur: want, blocked: st.blocked + b, leaked: st.leaked + l });
      }
    }
    // on garde les meilleurs états (bloqués d'abord, puis l'or restant)
    next.sort((a, b) => b.blocked - a.blocked || b.gold - a.gold);
    beam = next.slice(0, 60);
  });
  const best = beam[0]!;
  return { blocked: best.blocked, leaked: best.leaked };
}
