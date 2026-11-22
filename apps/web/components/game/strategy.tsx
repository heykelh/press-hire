"use client";

/**
 * Mécaniques de stratégie et de casse-tête :
 * - DÉFENSE (tower defense en couloirs) : choisir la bonne parade pour chaque menace, avec un budget ;
 * - TUYAUX (façon Pipe Mania) : construire un flux qui passe par les bonnes étapes, dans l'ordre ;
 * - CHASSE AUX RISQUES (objets cachés) : repérer les dangers dans une scène.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Level } from "@press-hire/cartridge";
import { defenseBest } from "@press-hire/cartridge";
import type { Ctx } from "./ui";
import { Icon } from "./arcade";

type M = Level["mechanic"];
type Defense = Extract<M, { type: "defense" }>;
type Pipes = Extract<M, { type: "pipes" }>;
type Hunt = Extract<M, { type: "hunt" }>;

const L = (ctx: Ctx, fr: string, en: string) => (ctx.lang === "fr" ? fr : en);

function useKeys(map: Record<string, () => void>, on = true) {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    if (!on) return;
    const k = (e: KeyboardEvent) => {
      const f = ref.current[e.key] ?? ref.current[e.key.toLowerCase()];
      if (f) { e.preventDefault(); f(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [on]);
}

/* ============================ DÉFENSE ============================ */

type Fall = { lane: number; enemy: string; result: "blocked" | "leaked" };

export function DefensePlay({ ctx, m, paused, onDone }: { ctx: Ctx; m: Defense; paused: boolean; onDone: () => void }) {
  const [wave, setWave] = useState(0);
  const [gold, setGold] = useState(m.budget);
  const [cur, setCur] = useState<Array<string | null>>(() => m.lanes.map(() => null));
  const [pick, setPick] = useState<string | null>(m.defenders[0]?.id ?? null);
  const [running, setRunning] = useState(false);
  const [falls, setFalls] = useState<Fall[]>([]);
  const [last, setLast] = useState<string | null>(null);
  const stats = useRef({ blocked: 0, leaked: 0, spent: 0 });
  const seen = useRef(new Set<string>());
  const done = useRef(false);
  const best = useMemo(() => defenseBest(m), [m]);
  const w = m.waves[wave]!;
  const enemy = (id: string) => m.enemies.find((e) => e.id === id);
  const def = (id: string | null | undefined) => m.defenders.find((d) => d.id === id);

  useEffect(() => { if (wave > 0 && wave === m.waves.length - 1) ctx.twist?.(); }, [wave, m.waves.length, ctx]);

  const place = (lane: number) => {
    if (running || paused || done.current) return;
    if (!pick) { // retirer
      if (cur[lane] === null) return;
      setCur((c) => c.map((x, i) => (i === lane ? null : x)));
      ctx.chip.sfx("click");
      return;
    }
    if (cur[lane] === pick) return;
    const d = def(pick)!;
    if (d.cost > gold) { ctx.chip.sfx("bad"); ctx.fx.pop(L(ctx, "BUDGET INSUFFISANT", "NOT ENOUGH BUDGET"), false); return; }
    setGold((g) => g - d.cost);
    stats.current.spent += d.cost;
    setCur((c) => c.map((x, i) => (i === lane ? pick : x)));
    ctx.chip.sfx("coin");
  };

  const launch = () => {
    if (running || paused || done.current) return;
    setRunning(true);
    ctx.chip.sfx("click");
    // les ennemis descendent par rangées : le k-ième ennemi de chaque couloir en même temps
    const depth = Math.max(...w.lanes.map((l) => l.length), 0);
    const steps: Fall[][] = [];
    for (let k = 0; k < depth; k++) {
      const row: Fall[] = [];
      w.lanes.forEach((list, lane) => {
        const e = list[k];
        if (!e) return;
        const d = def(cur[lane]);
        row.push({ lane, enemy: e, result: d?.counters.includes(e) ? "blocked" : "leaked" });
      });
      steps.push(row);
    }
    let k = 0;
    const tick = () => {
      if (k >= steps.length) {
        setTimeout(() => {
          setFalls([]);
          setRunning(false);
          if (wave + 1 >= m.waves.length) finish();
          else { setWave(wave + 1); setGold((g) => g + m.income); if (m.income) ctx.fx.pop(`+${m.income} 🪙`, true); }
        }, 650);
        return;
      }
      const row = steps[k++]!;
      setFalls(row);
      for (const f of row) {
        const en = enemy(f.enemy);
        if (f.result === "blocked") { stats.current.blocked++; ctx.apply(m.onBlock); ctx.combo?.(true); }
        else {
          stats.current.leaked++;
          ctx.apply(m.onLeak);
          ctx.combo?.(false);
          if (en?.consequence && !seen.current.has(en.id)) { seen.current.add(en.id); setLast(ctx.t(en.consequence)); }
        }
        ctx.learn?.(en?.conceptId);
      }
      const leaks = row.filter((f) => f.result === "leaked").length;
      ctx.chip.sfx(leaks ? "bad" : "good");
      if (leaks) ctx.fx.shake();
      setTimeout(tick, 750);
    };
    setTimeout(tick, 250);
  };

  const finish = () => {
    if (done.current) return;
    done.current = true;
    const s = stats.current;
    const total = s.blocked + s.leaked || 1;
    ctx.report?.([
      { label: L(ctx, "Taux de blocage", "Block rate"), value: `${Math.round((s.blocked / total) * 100)} %` },
      { label: L(ctx, "Meilleur possible", "Best possible"), value: `${Math.round((best.blocked / (best.blocked + best.leaked || 1)) * 100)} %` },
      { label: L(ctx, "Budget dépensé", "Budget spent"), value: `${s.spent} 🪙` },
    ]);
    setTimeout(onDone, 400);
  };

  useKeys(
    {
      ...Object.fromEntries(m.defenders.map((d, i) => [String(i + 1), () => setPick(d.id)])),
      "0": () => setPick(null),
      Enter: launch,
    },
    !paused && !running,
  );

  return (
    <div className="g-mech g-mech-defense">
      <div className="g-triage-meta">
        <span className="g-chip">{L(ctx, "VAGUE", "WAVE")} {wave + 1}/{m.waves.length}</span>
        <span className="g-chip gold">🪙 {gold}</span>
        <span className="g-chip">🛡 {stats.current.blocked}</span>
        <span className={`g-chip${stats.current.leaked ? " hot" : ""}`}>💥 {stats.current.leaked}</span>
      </div>
      {w.intro ? <p className="g-def-intro">{ctx.t(w.intro)}</p> : null}
      <div className="g-def-board" style={{ gridTemplateColumns: `repeat(${m.lanes.length}, 1fr)` }}>
        {m.lanes.map((lane, i) => {
          const queue = w.lanes[i] ?? [];
          const fall = falls.find((f) => f.lane === i);
          const d = def(cur[i]);
          return (
            <div key={i} className="g-def-lane">
              <b className="g-def-lname">{ctx.t(lane)}</b>
              <div className="g-def-queue" aria-label={L(ctx, "menaces de la vague", "threats this wave")}>
                {running ? null : queue.map((e, k) => (
                  <span key={k} className="g-def-enemy" title={ctx.t(enemy(e)?.label ?? { fr: e, en: e })}>
                    <Icon name={enemy(e)?.icon ?? "bug"} size={22} />
                    <small>{ctx.t(enemy(e)?.label ?? { fr: e, en: e })}</small>
                  </span>
                ))}
                {!running && !queue.length ? <em>{L(ctx, "calme", "quiet")}</em> : null}
              </div>
              <div className="g-def-track">
                {fall ? (
                  <span key={`${wave}-${fall.enemy}-${Math.random()}`} className={`g-def-fall ${fall.result}`}>
                    <Icon name={enemy(fall.enemy)?.icon ?? "bug"} size={26} />
                    <b>{fall.result === "blocked" ? L(ctx, "BLOQUÉ", "BLOCKED") : L(ctx, "PASSE !", "LEAK!")}</b>
                  </span>
                ) : null}
              </div>
              <button className={`g-def-slot${d ? " on" : ""}${pick && !running ? " can" : ""}`} onClick={() => place(i)} disabled={running}>
                {d ? <><Icon name={d.icon} size={24} /><span>{ctx.t(d.label)}</span></> : <span>{L(ctx, "VIDE", "EMPTY")}</span>}
              </button>
            </div>
          );
        })}
      </div>
      <div className="g-def-base">🏰 {ctx.t(m.base)}</div>
      <div className="g-def-palette">
        {m.defenders.map((d, i) => (
          <button key={d.id} className={`g-def-card${pick === d.id ? " on" : ""}${d.cost > gold ? " poor" : ""}`} onClick={() => setPick(d.id)} disabled={running} title={ctx.t(d.why)}>
            <kbd>{i + 1}</kbd>
            <Icon name={d.icon} size={24} />
            <b>{ctx.t(d.label)}</b>
            <span className="g-def-cost">🪙 {d.cost}</span>
            <small>{L(ctx, "contre", "stops")} : {d.counters.map((id) => ctx.t(enemy(id)?.label ?? { fr: id, en: id })).join(", ")}</small>
          </button>
        ))}
        <button className={`g-def-card remove${pick === null ? " on" : ""}`} onClick={() => setPick(null)} disabled={running}>
          <kbd>0</kbd><b>{L(ctx, "RETIRER", "REMOVE")}</b><small>{L(ctx, "vide un couloir", "clears a lane")}</small>
        </button>
      </div>
      {last ? <p className="g-explain bad">💥 {last}</p> : null}
      <button className="g-btn primary big" onClick={launch} disabled={running || paused}>
        {running ? L(ctx, "VAGUE EN COURS…", "WAVE INCOMING…") : L(ctx, "LANCER LA VAGUE ▶", "LAUNCH WAVE ▶")}
      </button>
    </div>
  );
}

/* ============================ TUYAUX ============================ */

const N = 1, E = 2, S = 4, W = 8;
const DIRS = [N, E, S, W] as const;
const OPP: Record<number, number> = { [N]: S, [S]: N, [E]: W, [W]: E };
const STEP: Record<number, [number, number]> = { [N]: [-1, 0], [S]: [1, 0], [E]: [0, 1], [W]: [0, -1] };
const rot = (mask: number, times: number) => {
  let m = mask;
  for (let i = 0; i < ((times % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
};
const PIECES = [N | S, E | W, N | E, E | S, S | W, W | N];

interface Cell { mask: number; tag?: { kind: "station" | "forbidden"; label: string; order?: number } }
interface Grid { size: number; cells: Cell[]; srcRow: number; sinkRow: number; solution: number[]; goal: number[] }

/** Grille toujours soluble : un chemin aléatoire relie la source à la sortie, puis tout est mélangé. */
function makeGrid(size: number, stations: string[], forbidden: string[], rand: () => number): Grid {
  const idx = (r: number, c: number) => r * size + c;
  for (let attempt = 0; attempt < 60; attempt++) {
    const srcRow = Math.floor(rand() * size), sinkRow = Math.floor(rand() * size);
    const path: Array<[number, number]> = [[srcRow, 0]];
    const seen = new Set([idx(srcRow, 0)]);
    const minLen = Math.max(size + 1, stations.length * 2 + 3);
    const dfs = (r: number, c: number): boolean => {
      if (c === size - 1 && r === sinkRow && path.length >= minLen) return true;
      const order = [...DIRS].sort(() => rand() - 0.5);
      for (const d of order) {
        const [dr, dc] = STEP[d]!;
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= size || nc >= size || seen.has(idx(nr, nc))) continue;
        seen.add(idx(nr, nc)); path.push([nr, nc]);
        if (path.length <= size * size * 0.6 && dfs(nr, nc)) return true;
        seen.delete(idx(nr, nc)); path.pop();
      }
      return false;
    };
    if (!dfs(srcRow, 0)) continue;
    const cells: Cell[] = Array.from({ length: size * size }, () => ({ mask: PIECES[Math.floor(rand() * PIECES.length)]! }));
    const solution: number[] = [];
    path.forEach(([r, c], i) => {
      const prev = path[i - 1], next = path[i + 1];
      const inDir = prev ? (prev[0] < r ? N : prev[0] > r ? S : prev[1] < c ? W : E) : W;
      const outDir = next ? (next[0] < r ? N : next[0] > r ? S : next[1] < c ? W : E) : E;
      cells[idx(r, c)] = { mask: inDir | outDir };
      solution.push(idx(r, c));
    });
    // étapes réparties le long du chemin, dans l'ordre
    stations.forEach((label, k) => {
      const at = Math.round(((k + 1) * (path.length - 1)) / (stations.length + 1));
      const [r, c] = path[Math.max(1, Math.min(path.length - 2, at))]!;
      cells[idx(r, c)]!.tag = { kind: "station", label, order: k + 1 };
    });
    // étapes interdites : à côté du chemin, tentantes
    const onPath = new Set(solution);
    const near = Array.from({ length: size * size }, (_, i) => i).filter((i) => !onPath.has(i) && solution.some((p) => Math.abs((p % size) - (i % size)) + Math.abs(Math.floor(p / size) - Math.floor(i / size)) === 1));
    forbidden.forEach((label) => {
      const pool = near.filter((i) => !cells[i]!.tag);
      const i = pool[Math.floor(rand() * pool.length)];
      if (i !== undefined) cells[i]!.tag = { kind: "forbidden", label };
    });
    // mélange des rotations (le chemin ne doit pas être déjà bon)
    const goal = cells.map((x) => x.mask);
    for (const cell of cells) cell.mask = rot(cell.mask, Math.floor(rand() * 4));
    const g = { size, cells, srcRow, sinkRow, solution, goal };
    if (traceFlow(g).reached) { cells[solution[0]!]!.mask = rot(cells[solution[0]!]!.mask, 1); }
    return g;
  }
  // repli : ligne droite
  const cells: Cell[] = Array.from({ length: size * size }, () => ({ mask: N | S }));
  const r0 = Math.floor(size / 2);
  for (let c = 0; c < size; c++) cells[r0 * size + c] = { mask: N | S };
  stations.forEach((label, k) => { cells[r0 * size + Math.min(size - 1, k + 1)]!.tag = { kind: "station", label, order: k + 1 }; });
  for (let c = 0; c < size; c++) cells[r0 * size + c]!.mask = E | W;
  return { size, cells, srcRow: r0, sinkRow: r0, solution: Array.from({ length: size }, (_, c) => r0 * size + c), goal: cells.map((x) => x.mask) };
}

/** Suit le flux depuis la source : cases traversées, sortie atteinte ou non. */
function traceFlow(g: Grid): { path: number[]; reached: boolean } {
  const path: number[] = [];
  let r = g.srcRow, c = 0, entry = W;
  const seen = new Set<number>();
  while (r >= 0 && c >= 0 && r < g.size && c < g.size) {
    const i = r * g.size + c;
    const cell = g.cells[i]!;
    if (!(cell.mask & entry) || seen.has(i)) return { path, reached: false };
    seen.add(i);
    path.push(i);
    const out = cell.mask & ~entry;
    const [dr, dc] = STEP[out]!;
    if (c === g.size - 1 && out === E) return { path, reached: r === g.sinkRow };
    r += dr; c += dc; entry = OPP[out]!;
  }
  return { path, reached: false };
}

function PipeSvg({ mask }: { mask: number }) {
  const seg = (d: number) => {
    const [x, y] = d === N ? [50, 0] : d === S ? [50, 100] : d === E ? [100, 50] : [0, 50];
    return <line key={d} x1={50} y1={50} x2={x} y2={y} />;
  };
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="g-pipe-svg">
      {DIRS.filter((d) => mask & d).map(seg)}
      <circle cx={50} cy={50} r={11} />
    </svg>
  );
}

export function PipesPlay({ ctx, m, paused, onDone }: { ctx: Ctx; m: Pipes; paused: boolean; onDone: () => void }) {
  const [round, setRound] = useState(0);
  const r = m.rounds[Math.min(round, m.rounds.length - 1)]!;
  const limit = Math.round(m.timeSec * (1 + 0.5 * (ctx.assist ?? 0)) / (ctx.speed ?? 1));
  const [grid, setGrid] = useState<Grid>(() => makeGrid(m.size, m.rounds[0]!.stations.map((x) => ctx.t(x)), m.rounds[0]!.forbidden.map((x) => ctx.t(x)), ctx.rand));
  const [time, setTime] = useState(limit);
  const [result, setResult] = useState<null | { ok: boolean; why: string }>(null);
  const stats = useRef({ solved: 0, moves: 0 });
  const done = useRef(false);
  const flow = useMemo(() => traceFlow(grid), [grid]);
  const visited = flow.path.map((i) => grid.cells[i]!.tag).filter(Boolean);
  const hitForbidden = visited.some((t) => t!.kind === "forbidden");
  const order = visited.filter((t) => t!.kind === "station").map((t) => t!.order);
  const inOrder = order.length === r.stations.length && order.every((o, k) => o === k + 1);

  useEffect(() => { if (round > 0 && round === m.rounds.length - 1) ctx.twist?.(); }, [round, m.rounds.length, ctx]);
  useEffect(() => {
    if (paused || result || done.current) return;
    const id = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [paused, result]);
  useEffect(() => {
    if (result || done.current) return;
    if (flow.reached && inOrder && !hitForbidden) {
      stats.current.solved++;
      ctx.apply(m.onSolve);
      ctx.chip.sfx("win");
      ctx.fx.confetti();
      ctx.combo?.(true);
      ctx.learn?.(r.conceptId);
      setResult({ ok: true, why: ctx.t(r.explain) });
    } else if (time <= 0) {
      ctx.apply(m.onFail);
      ctx.chip.sfx("bad");
      ctx.fx.shake();
      ctx.combo?.(false);
      ctx.learn?.(r.conceptId);
      // on montre la solution
      setGrid((g) => ({ ...g, cells: g.cells.map((c) => ({ ...c })) }));
      setResult({ ok: false, why: ctx.t(r.explain) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, time]);

  const turn = (i: number) => {
    if (paused || result || done.current) return;
    stats.current.moves++;
    ctx.chip.sfx("click");
    setGrid((g) => ({ ...g, cells: g.cells.map((c, k) => (k === i ? { ...c, mask: rot(c.mask, 1) } : c)) }));
  };
  const next = () => {
    if (!result) return;
    if (round + 1 >= m.rounds.length) {
      if (done.current) return;
      done.current = true;
      ctx.report?.([
        { label: L(ctx, "Flux construits", "Flows built"), value: `${stats.current.solved}/${m.rounds.length}` },
        { label: L(ctx, "Rotations", "Rotations"), value: String(stats.current.moves) },
      ]);
      setTimeout(onDone, 300);
      return;
    }
    const nr = m.rounds[round + 1]!;
    setGrid(makeGrid(m.size, nr.stations.map((x) => ctx.t(x)), nr.forbidden.map((x) => ctx.t(x)), ctx.rand));
    setRound(round + 1);
    setTime(limit);
    setResult(null);
  };
  useKeys(result ? { Enter: next, " ": next } : {}, !paused);

  const onFlow = new Set(flow.path);
  return (
    <div className="g-mech g-mech-pipes">
      <div className="g-triage-meta">
        <span className="g-chip">{L(ctx, "MANCHE", "ROUND")} {round + 1}/{m.rounds.length}</span>
        <span className={`g-chip${time <= 10 && !result ? " hot" : ""}`}>⏱ {Math.max(0, time)}s</span>
        <span className="g-chip">{ctx.t(m.flow)}</span>
      </div>
      <p className="g-pipes-goal">
        {r.stations.map((s, k) => <span key={k} className={`g-pipes-step${order.includes(k + 1) ? " ok" : ""}`}>{k + 1}. {ctx.t(s)}</span>)}
        {r.forbidden.map((s, k) => <span key={`f${k}`} className="g-pipes-step no">⛔ {ctx.t(s)}</span>)}
      </p>
      <div className="g-pipes-wrap">
        <span className="g-pipes-end src" style={{ top: `${((grid.srcRow + 0.5) / grid.size) * 100}%` }}>▶ {ctx.t(m.source)}</span>
        <div className="g-pipes-grid" style={{ gridTemplateColumns: `repeat(${grid.size}, 1fr)` }}>
          {grid.cells.map((cell, i) => (
            <button
              key={i}
              className={`g-pipe${onFlow.has(i) ? " wet" : ""}${cell.tag ? ` tag ${cell.tag.kind}` : ""}${result && !result.ok && grid.solution.includes(i) ? " hint" : ""}`}
              onClick={() => turn(i)}
              data-mask={cell.mask}
              data-goal={grid.solution.includes(i) ? grid.goal[i] : undefined}
              aria-label={cell.tag ? cell.tag.label : L(ctx, "tuyau", "pipe")}
            >
              <PipeSvg mask={cell.mask} />
              {cell.tag ? <small>{cell.tag.kind === "station" ? `${cell.tag.order}. ` : "⛔ "}{cell.tag.label}</small> : null}
            </button>
          ))}
        </div>
        <span className="g-pipes-end sink" style={{ top: `${((grid.sinkRow + 0.5) / grid.size) * 100}%` }}>{ctx.t(m.sink)} ◀</span>
      </div>
      {hitForbidden && !result ? <p className="g-explain bad">⛔ {L(ctx, "Le flux passe par une étape interdite !", "The flow goes through a forbidden step!")}</p> : null}
      {flow.reached && !inOrder && !hitForbidden && !result ? <p className="g-explain bad">{L(ctx, "Ça coule… mais pas par toutes les étapes, dans l'ordre.", "It flows… but not through every step, in order.")}</p> : null}
      {result ? (
        <div className={`g-explain ${result.ok ? "good" : "bad"}`}>
          <b>{result.ok ? L(ctx, "FLUX OK !", "FLOW OK!") : L(ctx, "TEMPS ÉCOULÉ", "TIME'S UP")}</b> {result.why}
          <button className="g-btn primary" onClick={next} autoFocus>{L(ctx, "SUITE ▶", "NEXT ▶")}</button>
        </div>
      ) : null}
    </div>
  );
}

/* ============================ CHASSE AUX RISQUES ============================ */

export function HuntPlay({ ctx, m, paused, onDone }: { ctx: Ctx; m: Hunt; paused: boolean; onDone: () => void }) {
  const [round, setRound] = useState(0);
  const r = m.rounds[Math.min(round, m.rounds.length - 1)]!;
  // positions dispersées (grille légèrement décalée, sans chevauchement)
  const spots = useMemo(() => {
    const n = r.items.length;
    const cols = n <= 8 ? 4 : 5;
    const rows = Math.ceil(n / cols);
    const cells = Array.from({ length: cols * rows }, (_, i) => i).sort(() => ctx.rand() - 0.5).slice(0, n);
    return cells.map((cell) => ({
      x: ((cell % cols) + 0.2 + ctx.rand() * 0.6) / cols,
      y: (Math.floor(cell / cols) + 0.2 + ctx.rand() * 0.6) / rows,
    }));
  }, [r, ctx]);
  const [state, setState] = useState<Record<string, "found" | "wrong">>({});
  const [revealed, setRevealed] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [hints, setHints] = useState(1 + (ctx.assist ?? 0));
  const limit = m.timeLimitSec ? Math.round(m.timeLimitSec * (1 + 0.5 * (ctx.assist ?? 0))) : 0;
  const [time, setTime] = useState(limit);
  const stats = useRef({ found: 0, wrong: 0, missed: 0, risks: 0 });
  const done = useRef(false);
  const risks = r.items.filter((x) => x.risk);
  const found = risks.filter((x) => state[x.id] === "found").length;

  useEffect(() => { if (round > 0 && round === m.rounds.length - 1) ctx.twist?.(); }, [round, m.rounds.length, ctx]);
  useEffect(() => {
    if (!limit || paused || revealed || done.current) return;
    const id = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [limit, paused, revealed]);
  useEffect(() => {
    if (limit && time <= 0 && !revealed) end();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time]);
  useEffect(() => { if (found === risks.length && !revealed) setTimeout(end, 600); /* tout trouvé */ }, [found]); // eslint-disable-line react-hooks/exhaustive-deps

  const click = (id: string) => {
    if (paused || revealed || state[id] || done.current) return;
    const it = r.items.find((x) => x.id === id)!;
    if (it.risk) {
      ctx.apply(m.onFound);
      ctx.chip.sfx("good");
      ctx.fx.pop(L(ctx, "RISQUE REPÉRÉ", "RISK SPOTTED"), true);
      stats.current.found++;
    } else {
      ctx.apply(m.onWrong);
      ctx.chip.sfx("bad");
      ctx.fx.shake();
      stats.current.wrong++;
    }
    ctx.combo?.(it.risk);
    ctx.learn?.(it.conceptId);
    setState((s) => ({ ...s, [id]: it.risk ? "found" : "wrong" }));
    setNote({ ok: it.risk, text: `${ctx.t(it.label)} : ${ctx.t(it.explain)}` });
    if (hint === id) setHint(null);
  };
  const askHint = () => {
    if (!hints || revealed) return;
    const left = risks.filter((x) => !state[x.id]);
    const h = left[Math.floor(ctx.rand() * left.length)];
    if (!h) return;
    setHints(hints - 1);
    setHint(h.id);
    ctx.chip.sfx("click");
    setTimeout(() => setHint((x) => (x === h.id ? null : x)), 1800);
  };
  function end() {
    if (revealed) return;
    const missed = risks.filter((x) => state[x.id] !== "found");
    for (let i = 0; i < missed.length; i++) ctx.apply(m.onMissed);
    stats.current.missed += missed.length;
    stats.current.risks += risks.length;
    if (missed.length) { ctx.chip.sfx("bad"); setNote({ ok: false, text: `${L(ctx, "Oubliés", "Missed")} : ${missed.map((x) => `${ctx.t(x.label)} (${ctx.t(x.explain)})`).join(" · ")}` }); }
    else { ctx.chip.sfx("win"); ctx.fx.confetti(); }
    setRevealed(true);
  }
  const next = () => {
    if (round + 1 >= m.rounds.length) {
      if (done.current) return;
      done.current = true;
      const s = stats.current;
      ctx.report?.([
        { label: L(ctx, "Risques trouvés", "Risks found"), value: `${s.found}/${s.risks}` },
        { label: L(ctx, "Fausses alertes", "False alarms"), value: String(s.wrong) },
      ]);
      setTimeout(onDone, 300);
      return;
    }
    setRound(round + 1);
    setState({});
    setRevealed(false);
    setNote(null);
    setTime(limit);
    setHints(1 + (ctx.assist ?? 0));
  };
  useKeys(revealed ? { Enter: next, " ": next } : { h: askHint }, !paused);

  return (
    <div className="g-mech g-mech-hunt">
      <div className="g-triage-meta">
        <span className="g-chip">{ctx.t(r.title)}</span>
        <span className="g-chip">🔍 {found}/{risks.length}</span>
        <span className={`g-chip${stats.current.wrong ? " hot" : ""}`}>✗ {Object.values(state).filter((x) => x === "wrong").length}</span>
        {limit ? <span className={`g-chip${time <= 10 ? " hot" : ""}`}>⏱ {Math.max(0, time)}s</span> : null}
      </div>
      <div className="g-hunt-scene" aria-label={ctx.t(m.scene)}>
        <span className="g-hunt-place">{ctx.t(m.scene)}</span>
        {r.items.map((it, i) => {
          const st = state[it.id];
          const miss = revealed && it.risk && st !== "found";
          return (
            <button
              key={it.id}
              className={`g-hunt-item${st ? ` ${st}` : ""}${miss ? " missed" : ""}${hint === it.id ? " hint" : ""}`}
              style={{ left: `${spots[i]!.x * 100}%`, top: `${spots[i]!.y * 100}%` }}
              onClick={() => click(it.id)}
              disabled={revealed || !!st}
            >
              <Icon name={it.icon} size={30} />
              <small>{ctx.t(it.label)}</small>
              {st === "found" ? <i>✔</i> : st === "wrong" ? <i>✗</i> : miss ? <i>!</i> : null}
            </button>
          );
        })}
      </div>
      {note ? <p className={`g-explain ${note.ok ? "good" : "bad"}`}>{note.text}</p> : null}
      <div className="g-row">
        {!revealed ? (
          <>
            <button className="g-btn" onClick={askHint} disabled={!hints}>💡 {L(ctx, "INDICE", "HINT")} ({hints})</button>
            <button className="g-btn primary" onClick={end}>{L(ctx, "J'AI FINI", "DONE")}</button>
          </>
        ) : (
          <button className="g-btn primary big" onClick={next} autoFocus>{L(ctx, "SUITE ▶", "NEXT ▶")}</button>
        )}
      </div>
    </div>
  );
}
