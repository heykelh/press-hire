"use client";

/**
 * Mécaniques d'arcade : attrape-tout, tape-alerte, jauge, mémoire.
 * Le nombre d'objets est fixé d'avance (paquet mélangé) : la difficulté vérifiée par les contrôles est celle du jeu.
 */
import { useEffect, useRef, useState } from "react";
import { arcadeCounts, arcadeTotal, type Effect, type Level } from "@press-hire/cartridge";
import { ICON_SIZE, Painter, drawIcon, shade } from "@press-hire/engine";
import type { Ctx } from "./ui";

type M = Level["mechanic"];
type Catch = Extract<M, { type: "catch" }>;
type Whack = Extract<M, { type: "whack" }>;
type Gauge = Extract<M, { type: "gauge" }>;
type Sequence = Extract<M, { type: "sequence" }>;

const L = (ctx: Ctx, fr: string, en: string) => (ctx.lang === "fr" ? fr : en);
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "—");

/** Paquet mélangé d'indices d'objets, en proportion des poids. */
function deck(items: Array<{ weight: number }>, total: number, rand: () => number): number[] {
  const out: number[] = [];
  arcadeCounts(items.map((x) => x.weight), total).forEach((n, i) => { for (let k = 0; k < n; k++) out.push(i); });
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Paquet en 4 temps : DÉCOUVRIR (deux bons objets d'abord), PRATIQUER, REBONDISSEMENT (les objets « twist »
 * n'arrivent qu'en seconde moitié), MAÎTRISER (le rythme accélère, géré à l'affichage).
 * L'aide adaptative retire une partie des pièges, jamais des bons objets (la difficulté vérifiée reste valable).
 */
function phasedDeck(items: Array<{ weight: number; kind: string; twist?: boolean }>, total: number, rand: () => number, assist = 0): number[] {
  let order = deck(items, total, rand);
  if (assist > 0) {
    let drop = Math.round(order.filter((i) => items[i]!.kind === "bad").length * 0.25 * assist);
    order = order.filter((i) => !(items[i]!.kind === "bad" && drop-- > 0));
  }
  const base = order.filter((i) => !items[i]!.twist);
  const tw = order.filter((i) => items[i]!.twist);
  for (let k = 0, placed = 0; k < base.length && placed < 2; k++) {
    if (items[base[k]!]!.kind === "good") { const [g] = base.splice(k, 1); base.splice(placed, 0, g!); placed++; }
  }
  const half = Math.floor((base.length + tw.length) / 2);
  for (const t of tw) base.splice(Math.min(base.length, half + Math.floor(rand() * (base.length - half + 1))), 0, t);
  return base;
}

/** Applique des effets sans bulle flottante (trop d'événements en arcade). */
const quiet = (ctx: Ctx, effects: Effect[]) => { if (effects.length) ctx.apply(effects); };

export function Icon({ name, size = 28, tint }: { name: string; size?: number; tint?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current?.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    drawIcon(new Painter(g, ICON_SIZE, ICON_SIZE), name, 0, 0, tint);
  }, [name, tint]);
  return <canvas ref={ref} width={ICON_SIZE} height={ICON_SIZE} className="g-icon" style={{ width: size, height: size }} aria-hidden="true" />;
}

/** Compte à rebours 3-2-1 avant les mécaniques en temps réel. */
function useCountdown(ctx: Ctx, paused: boolean): number {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (paused || n <= 0) return;
    const id = setTimeout(() => { setN(n - 1); ctx.chip.blip(n > 1 ? 660 : 990, 0.08); }, 700);
    return () => clearTimeout(id);
  }, [n, paused, ctx.chip]);
  return n;
}

function Legend({ ctx, items, goodLabel, badLabel }: { ctx: Ctx; items: Array<{ id: string; label: { fr: string; en: string }; kind: string; icon: string }>; goodLabel: string; badLabel: string }) {
  const good = items.filter((x) => x.kind === "good"), bad = items.filter((x) => x.kind === "bad");
  return (
    <div className="g-arcade-legend">
      <div><b className="ok">{goodLabel}</b>{good.map((x) => <span key={x.id}><Icon name={x.icon} size={20} /> {ctx.t(x.label)}</span>)}</div>
      {bad.length > 0 && <div><b className="ko">{badLabel}</b>{bad.map((x) => <span key={x.id}><Icon name={x.icon} size={20} /> {ctx.t(x.label)}</span>)}</div>}
    </div>
  );
}

/* ============================ ATTRAPE-TOUT ============================ */

const CW = 168, CH = 126, BUCKET = 26;

export function CatchPlay({ ctx, m, paused, onDone }: { ctx: Ctx; m: Catch; paused: boolean; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const count = useCountdown(ctx, paused);
  const [stats, setStats] = useState({ good: 0, bad: 0, miss: 0, left: m.durationSec });
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const live = count <= 0;

  useEffect(() => {
    if (!live) return;
    const cv = ref.current!;
    const g = cv.getContext("2d")!;
    const p = new Painter(g, CW, CH);
    const pal = ctx.c.design.palette;
    const assist = ctx.assist ?? 0;
    const order = phasedDeck(m.items, arcadeTotal(m.durationSec, m.perSec), ctx.rand, assist);
    const gap = 1 / m.perSec;
    const seenConcept = new Set<string>();
    const st = { t: 0, next: 0.2, spawned: 0, x: CW / 2, target: CW / 2, left: false, right: false, good: 0, bad: 0, miss: 0, flash: 0, flashGood: true, ended: false };
    const falling: Array<{ i: number; x: number; y: number; vy: number; wob: number }> = [];
    const floats: Array<{ x: number; y: number; t: number; s: string; good: boolean }> = [];
    const labels = m.items.map((it) => ctx.t(it.label).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 14));

    const toInternal = (clientX: number) => {
      const r = cv.getBoundingClientRect();
      return ((clientX - r.left) / r.width) * CW;
    };
    const move = (e: PointerEvent) => { st.target = toInternal(e.clientX); };
    const down = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") { st.left = true; e.preventDefault(); } if (e.key === "ArrowRight") { st.right = true; e.preventDefault(); } };
    const up = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") st.left = false; if (e.key === "ArrowRight") st.right = false; };
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerdown", move);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (pausedRef.current || st.ended) return;
      st.t += dt;
      // panier : suit le pointeur, ou les flèches
      if (st.left || st.right) st.target = st.x + (st.right ? 1 : -1) * 160 * dt * 4;
      st.x += Math.max(-220 * dt, Math.min(220 * dt, st.target - st.x));
      st.x = Math.max(BUCKET / 2, Math.min(CW - BUCKET / 2, st.x));
      // apparitions
      if (st.spawned < order.length && st.t >= st.next) {
        const idx = order[st.spawned]!;
        const it0 = m.items[idx]!;
        const prog = st.spawned / order.length;
        // découvrir : lent ; maîtriser : rapide ; aide : plus lent
        const pace = (st.spawned < 3 ? 0.7 : prog > 0.75 ? 1.2 : 1) * (1 - 0.15 * assist);
        falling.push({ i: idx, x: 14 + ctx.rand() * (CW - 28), y: -12, vy: (30 + 24 * prog) * pace, wob: ctx.rand() * 6 });
        if (it0.twist || prog >= 0.5) ctx.twist?.();
        if (it0.conceptId && !seenConcept.has(it0.conceptId)) { seenConcept.add(it0.conceptId); ctx.learn?.(it0.conceptId); }
        st.spawned++;
        st.next += gap * (st.spawned <= 3 ? 1.3 : 0.75 + ctx.rand() * 0.5);
      }
      const by = CH - 16;
      for (let k = falling.length - 1; k >= 0; k--) {
        const f = falling[k]!;
        f.y += f.vy * dt;
        const it = m.items[f.i]!;
        const inX = Math.abs(f.x - st.x) <= BUCKET / 2 + 3;
        if (f.y + 5 >= by && f.y + 5 <= by + 8 && inX) {
          falling.splice(k, 1);
          if (it.kind === "good") { st.good++; quiet(ctx, m.onGood); ctx.chip.sfx("coin"); ctx.combo?.(true); floats.push({ x: f.x, y: by - 8, t: 0, s: "+", good: true }); }
          else { st.bad++; quiet(ctx, m.onBad); ctx.chip.sfx("bad"); ctx.fx.shake(); ctx.combo?.(false); ctx.oops?.(it.consequence && ctx.t(it.consequence)); st.flash = 0.25; st.flashGood = false; floats.push({ x: f.x, y: by - 8, t: 0, s: "!", good: false }); }
          setStats({ good: st.good, bad: st.bad, miss: st.miss, left: Math.max(0, Math.ceil(order.length * gap - st.t)) });
        } else if (f.y > CH + 6) {
          falling.splice(k, 1);
          if (it.kind === "good") { st.miss++; quiet(ctx, m.onMiss); ctx.chip.blip(180, 0.06); ctx.combo?.(false); ctx.oops?.(it.consequence && ctx.t(it.consequence)); setStats({ good: st.good, bad: st.bad, miss: st.miss, left: Math.max(0, Math.ceil(order.length * gap - st.t)) }); }
        }
      }
      if (st.spawned >= order.length && falling.length === 0 && !st.ended) {
        st.ended = true;
        const caught = st.good + st.bad;
        ctx.report?.([
          { label: L(ctx, "Précision", "Precision"), value: pct(st.good, caught) },
          { label: L(ctx, "Rappel", "Recall"), value: pct(st.good, st.good + st.miss) },
          { label: L(ctx, "Pièges attrapés", "Traps caught"), value: String(st.bad) },
        ]);
        setTimeout(onDone, 700);
      }

      // état lisible par les tests automatisés (positions en % de la largeur)
      if (Math.floor(st.t * 20) !== Math.floor((st.t - dt) * 20))
        cv.dataset.state = JSON.stringify({ x: st.x / CW, items: falling.map((f) => ({ x: f.x / CW, y: f.y / CH, good: m.items[f.i]!.kind === "good" })) });

      /* --- dessin --- */
      p.rect(0, 0, CW, CH, pal.bg);
      p.dither(0, 0, CW, CH * 0.6, pal.bg, shade(pal.bg, 0.12), 3);
      for (let i = 0; i < 18; i++) p.px((i * 53) % CW, (i * 29 + Math.floor(st.t * 6)) % (CH - 30), shade(pal.ink, -0.4));
      p.rect(0, CH - 8, CW, 8, shade(pal.panel, -0.2));
      p.dither(0, CH - 8, CW, 8, shade(pal.panel, -0.2), shade(pal.panel, 0.1), 6);
      for (const f of falling) {
        const it = m.items[f.i]!;
        const x = f.x + Math.sin(st.t * 3 + f.wob) * 1.5;
        drawIcon(p, it.icon, x - 5, f.y - 5);
        const lab = labels[f.i]!;
        const w = lab.length * 4 - 1;
        p.rect(x - w / 2 - 1, f.y - 13, w + 2, 7, "rgba(0,0,0,0.55)");
        p.text(lab, x - w / 2, f.y - 12, "#ffffff");
      }
      // panier
      const bx = st.x - BUCKET / 2;
      const col = st.flash > 0 ? (st.flashGood ? "#3ad46a" : "#ff4a4a") : pal.accent;
      st.flash = Math.max(0, st.flash - dt);
      p.rect(bx - 1, by - 1, BUCKET + 2, 10, "#000");
      p.rect(bx, by, BUCKET, 8, col);
      p.rect(bx + 2, by + 2, BUCKET - 4, 2, shade(col, 0.4));
      p.rect(bx, by + 6, BUCKET, 2, shade(col, -0.4));
      for (const fl of floats) {
        fl.t += dt;
        p.text(fl.s, fl.x - 1, fl.y - fl.t * 20, fl.good ? "#5aff8a" : "#ff6a6a", 2);
      }
      for (let k = floats.length - 1; k >= 0; k--) if (floats[k]!.t > 0.6) floats.splice(k, 1);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerdown", move);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  const caught = stats.good + stats.bad;
  return (
    <div className="g-mech g-arcade g-mech-catch">
      <Legend ctx={ctx} items={m.items} goodLabel={L(ctx, "À ATTRAPER", "CATCH")} badLabel={L(ctx, "À ÉVITER", "AVOID")} />
      <div className="g-metrics">
        <span>⏱ {stats.left}s</span>
        <span>{L(ctx, "Précision", "Precision")} <b>{pct(stats.good, caught)}</b></span>
        <span>{L(ctx, "Rappel", "Recall")} <b>{pct(stats.good, stats.good + stats.miss)}</b></span>
        <span>✓ {stats.good} · ✗ {stats.bad}</span>
      </div>
      <div className="g-screen">
        <canvas ref={ref} width={CW} height={CH} className="g-arcade-canvas" style={{ touchAction: "none" }} />
        {!live && <div className="g-count">{count > 0 ? count : "GO!"}</div>}
      </div>
      <p className="g-rule small">{L(ctx, "Tu contrôles", "You control")} {ctx.t(m.catcher)}</p>
    </div>
  );
}

/* ============================ TAPE-ALERTE ============================ */

type Hole = { item: number; upAt: number; state: "up" | "hit" | "wrong" | "gone"; life?: number } | null;

export function WhackPlay({ ctx, m, paused, onDone }: { ctx: Ctx; m: Whack; paused: boolean; onDone: () => void }) {
  const count = useCountdown(ctx, paused);
  const live = count <= 0;
  const [holes, setHoles] = useState<Hole[]>(() => Array(m.holes).fill(null));
  const [stats, setStats] = useState({ hit: 0, miss: 0, wrong: 0, react: 0, left: m.durationSec });
  const S = useRef({ holes: Array<Hole>(m.holes).fill(null), t: 0, next: 0.3, spawned: 0, order: [] as number[], hit: 0, miss: 0, wrong: 0, react: 0, ended: false });
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const gap = 1 / m.perSec;

  useEffect(() => {
    if (!live) return;
    const s = S.current;
    const assist = ctx.assist ?? 0;
    s.order = phasedDeck(m.targets, arcadeTotal(m.durationSec, m.perSec), ctx.rand, assist);
    const seenConcept = new Set<string>();
    const upFor = (n: number) => m.upMs * (1 + 0.25 * assist) * (n < 3 ? 1.4 : n / s.order.length > 0.75 ? 0.85 : 1);
    let raf = 0, last = performance.now();
    const push = () => {
      setHoles([...s.holes]);
      setStats({ hit: s.hit, miss: s.miss, wrong: s.wrong, react: s.react, left: Math.max(0, Math.ceil(s.order.length * gap - s.t)) });
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (pausedRef.current || s.ended) return;
      s.t += dt;
      let changed = false;
      // cibles qui repartent
      s.holes.forEach((h, i) => {
        if (!h) return;
        const age = (s.t - h.upAt) * 1000;
        if (h.state === "up" && age > (h.life ?? m.upMs)) {
          const it = m.targets[h.item]!;
          if (it.kind === "good") { s.miss++; quiet(ctx, m.onMiss); ctx.chip.blip(200, 0.06); ctx.combo?.(false); ctx.oops?.(it.consequence && ctx.t(it.consequence)); }
          s.holes[i] = { ...h, state: "gone" };
          changed = true;
        } else if (h.state !== "up" && age > (h.life ?? m.upMs) + 300) { s.holes[i] = null; changed = true; }
      });
      // apparitions
      if (s.spawned < s.order.length && s.t >= s.next) {
        const free = s.holes.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0);
        if (free.length) {
          const i = free[Math.floor(ctx.rand() * free.length)]!;
          const idx = s.order[s.spawned]!;
          const it0 = m.targets[idx]!;
          s.holes[i] = { item: idx, upAt: s.t, state: "up", life: upFor(s.spawned) };
          if (it0.twist || s.spawned / s.order.length >= 0.5) ctx.twist?.();
          if (it0.conceptId && !seenConcept.has(it0.conceptId)) { seenConcept.add(it0.conceptId); ctx.learn?.(it0.conceptId); }
          s.spawned++;
          s.next = s.t + gap * (0.7 + ctx.rand() * 0.6);
          ctx.chip.blip(520, 0.03);
          changed = true;
        }
      }
      if (s.spawned >= s.order.length && s.holes.every((h) => !h || h.state !== "up") && !s.ended) {
        s.ended = true;
        ctx.report?.([
          { label: "SLA", value: pct(s.hit, s.hit + s.miss) },
          { label: "MTTR", value: s.hit ? `${(s.react / 1000).toFixed(2)} s` : "—" },
          { label: L(ctx, "Fausses alertes frappées", "Wrong hits"), value: String(s.wrong) },
        ]);
        setTimeout(onDone, 800);
      }
      if (changed || Math.floor(s.t * 4) !== Math.floor((s.t - dt) * 4)) push();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  const whack = (i: number) => {
    const s = S.current;
    const h = s.holes[i];
    if (!live || pausedRef.current || !h || h.state !== "up") return;
    const it = m.targets[h.item]!;
    if (it.kind === "good") {
      const r = (s.t - h.upAt) * 1000;
      s.react = (s.react * s.hit + r) / (s.hit + 1);
      s.hit++;
      quiet(ctx, m.onHit);
      ctx.chip.sfx("hit");
      ctx.combo?.(true);
      s.holes[i] = { ...h, state: "hit" };
    } else {
      s.wrong++;
      quiet(ctx, m.onWrong);
      ctx.chip.sfx("bad");
      ctx.fx.shake();
      ctx.combo?.(false);
      ctx.oops?.(it.consequence && ctx.t(it.consequence));
      s.holes[i] = { ...h, state: "wrong" };
    }
    setHoles([...s.holes]);
    setStats((x) => ({ ...x, hit: s.hit, wrong: s.wrong, react: s.react }));
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= m.holes) { e.preventDefault(); whack(n - 1); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  const cols = m.holes <= 4 ? 2 : 3;
  return (
    <div className="g-mech g-arcade g-mech-whack">
      <Legend ctx={ctx} items={m.targets} goodLabel={L(ctx, "À FRAPPER", "HIT")} badLabel={L(ctx, "À ÉPARGNER", "SPARE")} />
      <div className="g-metrics">
        <span>⏱ {stats.left}s</span>
        <span>SLA <b>{pct(stats.hit, stats.hit + stats.miss)}</b></span>
        <span>MTTR <b>{stats.hit ? `${(stats.react / 1000).toFixed(2)} s` : "—"}</b></span>
        <span>✗ {stats.wrong}</span>
      </div>
      <div className="g-screen">
        <div className="g-holes" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {holes.map((h, i) => {
            const it = h ? m.targets[h.item]! : null;
            return (
              <button key={i} className={`g-hole${h ? ` ${h.state}` : ""}`} onPointerDown={(e) => { e.preventDefault(); whack(i); }} aria-label={`${i + 1}${it ? ` : ${ctx.t(it.label)}` : ""}`}>
                <kbd>{i + 1}</kbd>
                {it && (
                  <span className={`g-mole ${it.kind}`}>
                    <Icon name={it.icon} size={34} />
                    <em>{ctx.t(it.label)}</em>
                  </span>
                )}
                {h?.state === "hit" && <i className="g-bonk">BONK!</i>}
                {h?.state === "wrong" && <i className="g-bonk ko">OUPS</i>}
              </button>
            );
          })}
        </div>
        {!live && <div className="g-count">{count > 0 ? count : "GO!"}</div>}
      </div>
    </div>
  );
}

/* ============================ JAUGE ============================ */

/** Jauge réutilisable (niveau ou boss) : renvoie l'index de la zone, ou -1 hors zone. */
export function GaugeMeter({ ctx, m, disabled, paused, speedMul = 1, onResult }: { ctx: Ctx; m: Gauge; disabled?: boolean; paused?: boolean; speedMul?: number; onResult: (zone: number, pos: number) => void }) {
  const mulRef = useRef(speedMul);
  mulRef.current = speedMul * (1 - 0.2 * (ctx.assist ?? 0));
  const needle = useRef<HTMLDivElement>(null);
  const S = useRef({ t: ctx.rand(), pos: 0, stopped: false, lastTick: -1 });
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = S.current;
      if (s.stopped || pausedRef.current || disabled) return;
      s.t += dt * m.speed * mulRef.current;
      const ph = s.t % 1;
      s.pos = (ph < 0.5 ? ph * 2 : 2 - ph * 2) * 100;
      const tick = Math.floor(s.pos / 10);
      if (tick !== s.lastTick) { s.lastTick = tick; ctx.chip.blip(300 + tick * 40, 0.015); }
      if (needle.current) needle.current.style.left = `${s.pos}%`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [m.speed, disabled, ctx.chip]);

  const stop = () => {
    const s = S.current;
    if (s.stopped || disabled || pausedRef.current) return;
    s.stopped = true;
    const zi = m.zones.findIndex((z) => s.pos >= z.from && s.pos < z.to);
    setResult(zi);
    onResult(zi, s.pos);
    setTimeout(() => { s.stopped = false; setResult(null); }, 1100);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); stop(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const z = result !== null && result >= 0 ? m.zones[result] : null;
  return (
    <div className="g-gauge-wrap">
      <div className="g-gauge">
        {m.zones.map((zn) => (
          <div key={zn.id} className={`g-zone${z?.id === zn.id ? " on" : ""}`} style={{ left: `${zn.from}%`, width: `${zn.to - zn.from}%`, background: zn.color }}>
            <span>{ctx.t(zn.label)}</span>
          </div>
        ))}
        {Array.from({ length: 11 }, (_, i) => <i key={i} className="g-tick" style={{ left: `${i * 10}%` }} />)}
        <div ref={needle} className={`g-needle${result !== null ? " stopped" : ""}`} />
      </div>
      <div className="g-gauge-row">
        <button className="g-btn primary big" onClick={stop} disabled={disabled || result !== null}>STOP!</button>
        <p className="g-callout" style={{ visibility: result !== null ? "visible" : "hidden" }}>
          {z ? <><b style={{ color: z.color }}>■</b> {ctx.t(z.label)}</> : L(ctx, "Hors zone !", "Off the chart!")}
        </p>
      </div>
    </div>
  );
}

export function GaugePlay({ ctx, m, paused, onDone }: { ctx: Ctx; m: Gauge; paused: boolean; onDone: () => void }) {
  const [round, setRound] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const done = useRef(false);
  const bestId = useRef([...m.zones].sort((a, b) => b.effects.reduce((t, e) => t + (e.op === "add" ? e.value : 0), 0) - a.effects.reduce((t, e) => t + (e.op === "add" ? e.value : 0), 0))[0]!.id).current;
  const bestHits = useRef(0);
  // rebondissement : seconde moitié des manches plus rapide
  const late = m.rounds > 1 && round > Math.ceil(m.rounds / 2);
  useEffect(() => { if (late) ctx.twist?.(); }, [late, ctx]);
  const onResult = (zi: number) => {
    const z = m.zones[zi];
    const sum = z ? z.effects.reduce((t, e) => t + (e.op === "add" ? e.value : 0), 0) : -1;
    if (z) ctx.apply(z.effects);
    if (z?.id === bestId) bestHits.current++;
    ctx.combo?.(sum > 0);
    ctx.chip.sfx(sum > 0 ? "good" : "bad");
    if (sum > 0) ctx.fx.pop(ctx.t(z!.label), true); else ctx.fx.shake();
    setLog((l) => [`#${round} ${z ? ctx.t(z.label) : L(ctx, "hors zone", "off")}`, ...l].slice(0, 5));
    setTimeout(() => {
      if (round >= m.rounds) {
        if (!done.current) {
          done.current = true;
          ctx.report?.([{ label: L(ctx, "Zone idéale atteinte", "Sweet spot hits"), value: `${bestHits.current}/${m.rounds}` }]);
          onDone();
        }
      } else setRound(round + 1);
    }, 1150);
  };
  return (
    <div className="g-mech g-mech-gauge">
      <p className="g-rule">{ctx.t(m.label)}</p>
      <span className="g-chip">{L(ctx, "Manche", "Round")} {round} / {m.rounds}</span>
      <GaugeMeter ctx={ctx} m={m} paused={paused} disabled={done.current} speedMul={late ? 1.3 : 1} onResult={onResult} />
      {log.length > 0 && <ul className="g-log">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>}
    </div>
  );
}

/* ============================ MÉMOIRE ============================ */

export function SequencePlay({ ctx, m, paused, onDone }: { ctx: Ctx; m: Sequence; paused: boolean; onDone: () => void }) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"wait" | "show" | "input" | "ok" | "ko">("wait");
  const [lit, setLit] = useState<number | null>(null);
  const [pos, setPos] = useState(0);
  const [score, setScore] = useState(0);
  const seq = useRef<number[]>([]);
  const done = useRef(false);
  const okCount = useRef(0);

  // nouvelle manche : séquence de 3 + manche notes, sans triple répétition
  useEffect(() => {
    if (paused) return;
    const len = Math.max(2, 3 + round - ((ctx.assist ?? 0) >= 2 ? 1 : 0));
    const speed = m.speedMs * (1 + 0.3 * (ctx.assist ?? 0));
    const s: number[] = [];
    while (s.length < len) {
      const n = Math.floor(ctx.rand() * m.pads.length);
      if (s.length >= 2 && s[s.length - 1] === n && s[s.length - 2] === n) continue;
      s.push(n);
    }
    seq.current = s;
    setPos(0);
    setPhase("wait");
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("show"), 700));
    s.forEach((n, i) => {
      timers.push(setTimeout(() => { setLit(n); ctx.chip.pad(n, speed / 1000 * 0.8); }, 700 + i * speed));
      timers.push(setTimeout(() => setLit(null), 700 + i * speed + speed * 0.7));
    });
    timers.push(setTimeout(() => setPhase("input"), 700 + s.length * speed));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const finishRound = (ok: boolean) => {
    if (ok) { setScore((x) => x + 1); ctx.apply(m.onSuccess); ctx.chip.sfx("good"); ctx.fx.pop("✓", true); }
    else { ctx.apply(m.onFail); ctx.chip.sfx("bad"); ctx.fx.shake(); }
    ctx.combo?.(ok);
    if (ok) okCount.current++;
    setPhase(ok ? "ok" : "ko");
    setTimeout(() => {
      if (round + 1 >= m.rounds) {
        if (!done.current) {
          done.current = true;
          ctx.report?.([{ label: L(ctx, "Séquences parfaites", "Perfect sequences"), value: `${okCount.current}/${m.rounds}` }]);
          onDone();
        }
      } else setRound(round + 1);
    }, 1100);
  };

  const press = (n: number) => {
    if (phase !== "input" || paused) return;
    setLit(n);
    ctx.chip.pad(n, 0.18);
    setTimeout(() => setLit((x) => (x === n ? null : x)), 180);
    if (seq.current[pos] !== n) return finishRound(false);
    if (pos + 1 >= seq.current.length) return finishRound(true);
    setPos(pos + 1);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= m.pads.length) { e.preventDefault(); press(n - 1); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const msg =
    phase === "show" || phase === "wait" ? L(ctx, "ÉCOUTE…", "LISTEN…")
    : phase === "input" ? `${L(ctx, "À TOI !", "YOUR TURN!")} ${pos}/${seq.current.length}`
    : phase === "ok" ? L(ctx, "PARFAIT !", "PERFECT!") : L(ctx, "RATÉ…", "MISSED…");
  return (
    <div className="g-mech g-mech-sequence">
      <p className="g-rule">{ctx.t(m.theme)}</p>
      <div className="g-triage-meta">
        <span className="g-chip">{L(ctx, "Manche", "Round")} {round + 1} / {m.rounds}</span>
        <span className="g-chip">✓ {score}</span>
      </div>
      <p className={`g-seq-msg ${phase}`} data-seq={phase === "input" ? seq.current.join(",") : ""}>{msg}</p>
      <div className={`g-pads n${m.pads.length}`}>
        {m.pads.map((pd, i) => (
          <button key={pd.id} className={`g-pad${lit === i ? " lit" : ""}`} style={{ "--pc": pd.color } as React.CSSProperties}
            onPointerDown={(e) => { e.preventDefault(); press(i); }} disabled={phase !== "input"}>
            <kbd>{i + 1}</kbd>{ctx.t(pd.label)}
          </button>
        ))}
      </div>
    </div>
  );
}
