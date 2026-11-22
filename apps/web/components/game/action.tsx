"use client";

/**
 * Mécaniques d'action, colorées et nerveuses :
 * - COURSE (façon Canabalt / dino de Chrome) : sauter pour ramasser le bon et éviter le reste ;
 * - TIR (façon Space Invaders) : abattre les menaces, épargner les alliés ;
 * - RYTHME (façon Guitar Hero) : envoyer chaque note dans la bonne colonne, en cadence.
 * Les décors suivent l'habillage du jeu (jour, coucher de soleil synthwave, terminal, Game Boy…).
 */
import { useEffect, useRef, useState } from "react";
import type { Level } from "@press-hire/cartridge";
import { arcadeTotal } from "@press-hire/cartridge";
import { Painter, drawIcon, shade } from "@press-hire/engine";
import type { Ctx } from "./ui";
import { Legend, pct, phasedDeck, quiet, useCountdown } from "./arcade";

type M = Level["mechanic"];
type Runner = Extract<M, { type: "runner" }>;
type Shooter = Extract<M, { type: "shooter" }>;
type Rhythm = Extract<M, { type: "rhythm" }>;

const L = (ctx: Ctx, fr: string, en: string) => (ctx.lang === "fr" ? fr : en);
const CW = 168, CH = 126;
const label = (ctx: Ctx, s: { fr: string; en: string }) => ctx.t(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().slice(0, 14);

/** Palette du décor selon l'habillage : toujours lumineuse et contrastée. */
function theme(ctx: Ctx) {
  const skin = ctx.c.design.skin;
  const acc = ctx.c.design.palette.accent;
  if (skin === "synth") return { top: "#1a0b3d", mid: "#6a1b9a", bot: "#ff6f91", sun: "#ffd166", far: "#3c1874", near: "#2b1055", ground: "#140528", line: "#ff2fb0", star: "#ffe9ff", acc };
  if (skin === "terminal") return { top: "#00110a", mid: "#002a16", bot: "#00552c", sun: "#39ff88", far: "#003d1f", near: "#00281a", ground: "#001a0d", line: "#39ff88", star: "#8affc1", acc: "#39ff88" };
  if (skin === "gameboy") return { top: "#9bbc0f", mid: "#8bac0f", bot: "#8bac0f", sun: "#e0f8d0", far: "#306230", near: "#306230", ground: "#0f380f", line: "#0f380f", star: "#e0f8d0", acc: "#0f380f" };
  if (skin === "corporate") return { top: "#5b8def", mid: "#9ec2ff", bot: "#e3eeff", sun: "#ffffff", far: "#7aa6d9", near: "#4f7fbf", ground: "#2f3e5c", line: "#ffffff", star: "#ffffff", acc };
  if (skin === "candy") return { top: "#ff9ed2", mid: "#ffd1ec", bot: "#c8f7ff", sun: "#fff59d", far: "#8ef0c8", near: "#3ccfcf", ground: "#b57edc", line: "#ffffff", star: "#ffffff", acc: "#ff4f9a" };
  if (skin === "sunset") return { top: "#3d0c4a", mid: "#c2185b", bot: "#ff8c42", sun: "#ffd166", far: "#7a1f5c", near: "#4a0d2e", ground: "#2b0a1e", line: "#ffd166", star: "#ffe8c2", acc: "#ff6b35" };
  if (skin === "comic") return { top: "#2ec4ff", mid: "#7fe0ff", bot: "#fff3b0", sun: "#ffde3b", far: "#3ccf7a", near: "#1fa45b", ground: "#a0642c", line: "#ffde3b", star: "#ffffff", acc };
  return { top: "#2d7dff", mid: "#5ec8ff", bot: "#c6f1ff", sun: "#ffe066", far: "#3fcf86", near: "#1f9d57", ground: "#c9783a", line: "#5bea62", star: "#ffffff", acc };
}

/** Ciel en bandes tramées, soleil, deux rangées de collines qui défilent (parallaxe). */
function scenery(p: Painter, th: ReturnType<typeof theme>, scroll: number, groundY: number) {
  const bands = 6;
  for (let i = 0; i < bands; i++) {
    const y0 = Math.floor((i * groundY) / bands), y1 = Math.floor(((i + 1) * groundY) / bands);
    const c1 = i < bands / 2 ? th.top : th.mid, c2 = i < bands / 2 ? th.mid : th.bot;
    p.dither(0, y0, CW, y1 - y0, c1, c2, Math.min(7, (i % 3) * 3 + 1));
  }
  p.disc(CW - 34, Math.floor(groundY * 0.42), 12, th.sun);
  p.disc(CW - 34, Math.floor(groundY * 0.42), 9, shade(th.sun, 0.25));
  for (let x = 0; x < CW; x++) {
    const hf = 16 + Math.sin((x + scroll * 0.25) / 17) * 6 + Math.sin((x + scroll * 0.25) / 7) * 2;
    p.rect(x, groundY - hf, 1, hf, th.far);
    const hn = 8 + Math.sin((x + scroll * 0.6) / 11) * 4;
    p.rect(x, groundY - hn, 1, hn, th.near);
  }
}

/* ============================ COURSE ============================ */

export function RunnerPlay({ ctx, m, paused, onDone }: { ctx: Ctx; m: Runner; paused: boolean; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const count = useCountdown(ctx, paused);
  const [stats, setStats] = useState({ good: 0, bad: 0, miss: 0, left: m.durationSec });
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const live = count <= 0;

  useEffect(() => {
    if (!live) return;
    const cv = ref.current!;
    const p = new Painter(cv.getContext("2d")!, CW, CH);
    const th = theme(ctx);
    const order = phasedDeck(m.items, arcadeTotal(m.durationSec, m.perSec), ctx.rand, ctx.assist ?? 0);
    const labels = m.items.map((it) => label(ctx, it.label));
    // hauteur de chaque objet : en alternance par type (la moitié des bons en l'air, la moitié des pièges au sol)
    const seen = { good: 0, bad: 0 };
    const lanes = order.map((i) => {
      const kind = m.items[i]!.kind as "good" | "bad";
      const k = seen[kind]++;
      return kind === "good" ? (k % 2 === 0 ? "air" : "ground") : (k % 2 === 0 ? "ground" : "air");
    });
    const GY = CH - 22, HX = 30;
    const gap = 1 / m.perSec;
    const st = { t: 0, next: 0.6, spawned: 0, y: 0, vy: 0, good: 0, bad: 0, miss: 0, ended: false, scroll: 0, flash: 0, flashGood: true, step: 0 };
    const items: Array<{ i: number; lane: "air" | "ground"; x: number; done: boolean }> = [];
    const floats: Array<{ x: number; y: number; t: number; s: string; good: boolean }> = [];
    const seenConcept = new Set<string>();

    const jump = () => { if (st.y === 0 && !pausedRef.current && !st.ended) { st.vy = 150; ctx.chip.blip(880, 0.05); } };
    const key = (e: KeyboardEvent) => { if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "z") { e.preventDefault(); jump(); } };
    cv.addEventListener("pointerdown", jump);
    window.addEventListener("keydown", key);

    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (pausedRef.current || st.ended) return;
      st.t += dt;
      const prog = st.spawned / order.length;
      const speed = (62 + 34 * prog) * (1 - 0.12 * (ctx.assist ?? 0)) * (ctx.speed ?? 1);
      st.scroll += speed * dt;
      // saut (gravité)
      if (st.y > 0 || st.vy > 0) { st.y += st.vy * dt; st.vy -= 430 * dt; if (st.y <= 0) { st.y = 0; st.vy = 0; } }
      // apparitions
      if (st.spawned < order.length && st.t >= st.next) {
        const idx = order[st.spawned]!;
        items.push({ i: idx, lane: lanes[st.spawned] as "air" | "ground", x: CW + 8, done: false });
        const it = m.items[idx]!;
        if (it.twist || prog >= 0.5) ctx.twist?.();
        if (it.conceptId && !seenConcept.has(it.conceptId)) { seenConcept.add(it.conceptId); ctx.learn?.(it.conceptId); }
        st.spawned++;
        st.next += gap * (st.spawned <= 3 ? 1.4 : 0.8 + ctx.rand() * 0.45) / (ctx.speed ?? 1);
      }
      const inAir = st.y > 12;
      for (let k = items.length - 1; k >= 0; k--) {
        const o = items[k]!;
        o.x -= speed * dt;
        const it = m.items[o.i]!;
        if (!o.done && o.x <= HX + 8 && o.x >= HX - 6) {
          const contact = (o.lane === "air") === inAir;
          if (contact) {
            o.done = true;
            if (it.kind === "good") { st.good++; quiet(ctx, m.onGood); ctx.chip.sfx("coin"); ctx.combo?.(true); floats.push({ x: o.x, y: GY - 30, t: 0, s: "+", good: true }); }
            else { st.bad++; quiet(ctx, m.onBad); ctx.chip.sfx("bad"); ctx.fx.shake(); ctx.combo?.(false); ctx.oops?.(it.consequence && ctx.t(it.consequence)); st.flash = 0.3; st.flashGood = false; }
            items.splice(k, 1);
            setStats({ good: st.good, bad: st.bad, miss: st.miss, left: Math.max(0, Math.ceil(order.length * gap - st.t)) });
            continue;
          }
        }
        if (!o.done && o.x < HX - 8) {
          o.done = true;
          if (it.kind === "good") { st.miss++; quiet(ctx, m.onMiss); ctx.combo?.(false); ctx.oops?.(it.consequence && ctx.t(it.consequence)); }
          else floats.push({ x: HX, y: GY - 34, t: 0, s: "OK", good: true });
          setStats({ good: st.good, bad: st.bad, miss: st.miss, left: Math.max(0, Math.ceil(order.length * gap - st.t)) });
        }
        if (o.x < -16) items.splice(k, 1);
      }
      if (st.spawned >= order.length && items.length === 0 && !st.ended) {
        st.ended = true;
        ctx.report?.([
          { label: L(ctx, "Ramassés", "Collected"), value: pct(st.good, st.good + st.miss) },
          { label: L(ctx, "Obstacles percutés", "Obstacles hit"), value: String(st.bad) },
          { label: L(ctx, "Distance", "Distance"), value: `${Math.round(st.scroll / 10)} m` },
        ]);
        setTimeout(onDone, 700);
      }
      if (Math.floor(st.t * 20) !== Math.floor((st.t - dt) * 20))
        cv.dataset.state = JSON.stringify({ items: items.filter((o) => !o.done).map((o) => ({ x: (o.x - HX) / CW, air: o.lane === "air", good: m.items[o.i]!.kind === "good" })), y: st.y });

      /* --- dessin --- */
      scenery(p, th, st.scroll, GY);
      p.rect(0, GY, CW, CH - GY, th.ground);
      p.rect(0, GY, CW, 2, th.line);
      for (let x = -((st.scroll) % 12); x < CW; x += 12) p.rect(Math.floor(x), GY + 6, 6, 2, shade(th.ground, 0.25));
      for (let x = -((st.scroll * 1.3) % 20); x < CW; x += 20) p.rect(Math.floor(x), GY + 12, 3, 2, shade(th.ground, -0.25));
      for (const o of items) {
        const it = m.items[o.i]!;
        const y = o.lane === "air" ? GY - 34 + Math.sin(st.t * 5 + o.x / 9) * 2 : GY - 11;
        if (it.kind === "bad") p.disc(Math.floor(o.x), Math.floor(y + 5), 7, "rgba(255,40,60,0.35)");
        else p.disc(Math.floor(o.x), Math.floor(y + 5), 7, "rgba(255,240,120,0.35)");
        drawIcon(p, it.icon, Math.floor(o.x) - 5, Math.floor(y));
        const lab = labels[o.i]!;
        const w = lab.length * 4 - 1;
        p.rect(Math.floor(o.x - w / 2 - 1), Math.floor(y - 9), w + 2, 7, "rgba(0,0,0,0.6)");
        p.text(lab, Math.floor(o.x - w / 2), Math.floor(y - 8), "#ffffff");
      }
      // héros : petit coureur en pixels, jambes animées
      st.step += dt * (st.y === 0 ? 12 : 0);
      const hy = GY - 14 - Math.floor(st.y);
      const body = st.flash > 0 ? "#ff4a4a" : th.acc;
      st.flash = Math.max(0, st.flash - dt);
      p.rect(HX - 3, hy, 7, 7, "#000");
      p.rect(HX - 2, hy + 1, 5, 5, "#ffd9b0");
      p.rect(HX + 1, hy + 2, 1, 1, "#000");
      p.rect(HX - 3, hy - 1, 7, 2, shade(body, -0.3));
      p.rect(HX - 3, hy + 7, 7, 5, body);
      const legA = Math.floor(st.step) % 2 === 0;
      p.rect(HX - 2, hy + 12, 2, 2, legA ? "#222" : "#555");
      p.rect(HX + 2, hy + 12, 2, 2, legA ? "#555" : "#222");
      if (st.y > 0) p.rect(HX - 4, hy + 13, 9, 1, "rgba(0,0,0,0.25)");
      else p.rect(HX - 4, GY - 1, 9, 1, "rgba(0,0,0,0.3)");
      for (const fl of floats) { fl.t += dt; p.text(fl.s, Math.floor(fl.x), Math.floor(fl.y - fl.t * 20), fl.good ? "#5aff8a" : "#ff6a6a", 2); }
      for (let k = floats.length - 1; k >= 0; k--) if (floats[k]!.t > 0.6) floats.splice(k, 1);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); cv.removeEventListener("pointerdown", jump); window.removeEventListener("keydown", key); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  return (
    <div className="g-mech g-arcade g-mech-runner">
      <Legend ctx={ctx} items={m.items} goodLabel={L(ctx, "À RAMASSER", "COLLECT")} badLabel={L(ctx, "À ÉVITER", "AVOID")} />
      <div className="g-metrics">
        <span>⏱ {stats.left}s</span>
        <span>✓ {stats.good}</span>
        <span>💥 {stats.bad}</span>
        <span>{L(ctx, "ratés", "missed")} {stats.miss}</span>
      </div>
      <div className="g-screen">
        <canvas ref={ref} width={CW} height={CH} className="g-arcade-canvas" style={{ touchAction: "none" }} />
        {!live && <div className="g-count">{count > 0 ? count : "GO!"}</div>}
      </div>
      <p className="g-rule small">{L(ctx, "Tu es", "You are")} {ctx.t(m.hero)} · {L(ctx, "ESPACE, ↑ ou tap pour sauter (les objets arrivent au sol ou en l'air)", "SPACE, ↑ or tap to jump (things come low or high)")}</p>
    </div>
  );
}

/* ============================ TIR ============================ */

export function ShooterPlay({ ctx, m, paused, onDone }: { ctx: Ctx; m: Shooter; paused: boolean; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const count = useCountdown(ctx, paused);
  const [stats, setStats] = useState({ hit: 0, wrong: 0, miss: 0, left: m.durationSec });
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const live = count <= 0;

  useEffect(() => {
    if (!live) return;
    const cv = ref.current!;
    const p = new Painter(cv.getContext("2d")!, CW, CH);
    const th = theme(ctx);
    const order = phasedDeck(m.items, arcadeTotal(m.durationSec, m.perSec), ctx.rand, ctx.assist ?? 0);
    const labels = m.items.map((it) => label(ctx, it.label));
    const gap = 1 / m.perSec;
    const SY = CH - 12;
    const st = { t: 0, next: 0.5, spawned: 0, x: CW / 2, target: CW / 2, left: false, right: false, hit: 0, wrong: 0, miss: 0, ended: false, cool: 0, flash: 0 };
    const foes: Array<{ i: number; x: number; y: number; vy: number; wob: number }> = [];
    const shots: Array<{ x: number; y: number }> = [];
    const booms: Array<{ x: number; y: number; t: number; good: boolean }> = [];
    const stars = Array.from({ length: 40 }, (_, k) => ({ x: (k * 37) % CW, y: (k * 53) % CH, z: 1 + (k % 3) }));
    const seenConcept = new Set<string>();

    const toInternal = (clientX: number) => { const r = cv.getBoundingClientRect(); return ((clientX - r.left) / r.width) * CW; };
    const fire = () => { if (st.cool <= 0 && shots.length < 3 && !pausedRef.current && !st.ended) { shots.push({ x: st.x, y: SY - 6 }); st.cool = 0.22; ctx.chip.blip(1400, 0.03); } };
    const move = (e: PointerEvent) => { st.target = toInternal(e.clientX); };
    const tap = (e: PointerEvent) => { st.target = toInternal(e.clientX); fire(); };
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { st.left = true; e.preventDefault(); }
      if (e.key === "ArrowRight") { st.right = true; e.preventDefault(); }
      if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); fire(); }
    };
    const up = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") st.left = false; if (e.key === "ArrowRight") st.right = false; };
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerdown", tap);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const sync = () => setStats({ hit: st.hit, wrong: st.wrong, miss: st.miss, left: Math.max(0, Math.ceil(order.length * gap - st.t)) });

    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (pausedRef.current || st.ended) return;
      st.t += dt;
      st.cool -= dt;
      if (st.left || st.right) st.target = st.x + (st.right ? 1 : -1) * 600 * dt;
      st.x += Math.max(-200 * dt, Math.min(200 * dt, st.target - st.x));
      st.x = Math.max(8, Math.min(CW - 8, st.x));
      const prog = st.spawned / order.length;
      if (st.spawned < order.length && st.t >= st.next) {
        const idx = order[st.spawned]!;
        const it = m.items[idx]!;
        const pace = (st.spawned < 3 ? 0.7 : prog > 0.75 ? 1.2 : 1) * (1 - 0.15 * (ctx.assist ?? 0)) * (ctx.speed ?? 1);
        foes.push({ i: idx, x: 14 + ctx.rand() * (CW - 28), y: -10, vy: (18 + 16 * prog) * pace, wob: ctx.rand() * 6 });
        if (it.twist || prog >= 0.5) ctx.twist?.();
        if (it.conceptId && !seenConcept.has(it.conceptId)) { seenConcept.add(it.conceptId); ctx.learn?.(it.conceptId); }
        st.spawned++;
        st.next += gap * (st.spawned <= 3 ? 1.3 : 0.75 + ctx.rand() * 0.5);
      }
      for (let k = shots.length - 1; k >= 0; k--) { shots[k]!.y -= 170 * dt; if (shots[k]!.y < -4) shots.splice(k, 1); }
      for (let k = foes.length - 1; k >= 0; k--) {
        const f = foes[k]!;
        f.y += f.vy * dt;
        const fx = f.x + Math.sin(st.t * 2 + f.wob) * 6;
        const it = m.items[f.i]!;
        const s = shots.findIndex((b) => Math.abs(b.x - fx) <= 7 && b.y <= f.y + 9 && b.y >= f.y - 3);
        if (s >= 0) {
          shots.splice(s, 1);
          foes.splice(k, 1);
          booms.push({ x: fx, y: f.y + 4, t: 0, good: it.kind === "good" });
          if (it.kind === "good") { st.hit++; quiet(ctx, m.onHit); ctx.chip.sfx("hit"); ctx.combo?.(true); }
          else { st.wrong++; quiet(ctx, m.onWrong); ctx.chip.sfx("bad"); ctx.fx.shake(); ctx.combo?.(false); ctx.oops?.(it.consequence && ctx.t(it.consequence)); st.flash = 0.3; }
          sync();
          continue;
        }
        if (f.y > SY) {
          foes.splice(k, 1);
          if (it.kind === "good") { st.miss++; quiet(ctx, m.onMiss); ctx.chip.blip(160, 0.1); ctx.combo?.(false); ctx.oops?.(it.consequence && ctx.t(it.consequence)); st.flash = 0.2; }
          sync();
        }
      }
      if (st.spawned >= order.length && foes.length === 0 && !st.ended) {
        st.ended = true;
        ctx.report?.([
          { label: L(ctx, "Menaces abattues", "Threats down"), value: pct(st.hit, st.hit + st.miss) },
          { label: L(ctx, "Tirs amis", "Friendly fire"), value: String(st.wrong) },
        ]);
        setTimeout(onDone, 700);
      }
      if (Math.floor(st.t * 20) !== Math.floor((st.t - dt) * 20))
        cv.dataset.state = JSON.stringify({ x: st.x / CW, foes: foes.map((f) => ({ x: (f.x + Math.sin(st.t * 2 + f.wob) * 6) / CW, y: f.y / CH, good: m.items[f.i]!.kind === "good" })) });

      /* --- dessin : espace profond, nébuleuse, étoiles en parallaxe --- */
      p.rect(0, 0, CW, CH, shade(th.top, -0.35));
      p.dither(0, 0, CW, CH, shade(th.top, -0.35), shade(th.mid, -0.2), 2);
      // nébuleuse : quelques disques qui se chevauchent (pas de bloc carré)
      p.disc(30, 34, 18, shade(th.mid, -0.18));
      p.disc(44, 28, 11, shade(th.mid, -0.08));
      p.disc(22, 44, 9, shade(th.bot, -0.2));
      p.disc(CW - 26, 22, 9, th.sun);
      p.rect(CW - 40, 21, 28, 2, shade(th.sun, -0.3));
      for (const s of stars) { s.y = (s.y + s.z * 10 * dt) % CH; p.px(Math.floor(s.x), Math.floor(s.y), s.z === 3 ? th.star : shade(th.star, -0.4)); }
      if (st.flash > 0) { p.rect(0, SY + 2, CW, CH - SY, "rgba(255,60,60,0.45)"); st.flash -= dt; }
      p.rect(0, SY + 6, CW, 1, th.line);
      for (const f of foes) {
        const it = m.items[f.i]!;
        const fx = Math.floor(f.x + Math.sin(st.t * 2 + f.wob) * 6), fy = Math.floor(f.y);
        p.disc(fx, fy + 5, 7, it.kind === "good" ? "rgba(255,70,90,0.45)" : "rgba(90,200,255,0.4)");
        drawIcon(p, it.icon, fx - 5, fy);
        const lab = labels[f.i]!;
        const w = lab.length * 4 - 1;
        p.rect(fx - Math.floor(w / 2) - 1, fy - 9, w + 2, 7, "rgba(0,0,0,0.6)");
        p.text(lab, fx - Math.floor(w / 2), fy - 8, "#ffffff");
      }
      for (const b of shots) { p.rect(Math.floor(b.x), Math.floor(b.y), 1, 4, "#fff6a0"); p.px(Math.floor(b.x), Math.floor(b.y) - 1, "#ffffff"); }
      for (const bo of booms) {
        bo.t += dt;
        const r = Math.floor(2 + bo.t * 26);
        for (let a = 0; a < 8; a++) p.px(Math.floor(bo.x + Math.cos(a * 0.785) * r), Math.floor(bo.y + Math.sin(a * 0.785) * r), bo.good ? "#ffd166" : "#5ac8ff");
      }
      for (let k = booms.length - 1; k >= 0; k--) if (booms[k]!.t > 0.35) booms.splice(k, 1);
      // vaisseau
      const sx = Math.floor(st.x);
      p.rect(sx - 6, SY, 13, 4, th.acc);
      p.rect(sx - 3, SY - 3, 7, 3, shade(th.acc, 0.3));
      p.rect(sx, SY - 6, 1, 3, "#ffffff");
      p.rect(sx - 6, SY + 3, 2, 2, "#ff9f1c");
      p.rect(sx + 5, SY + 3, 2, 2, "#ff9f1c");
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerdown", tap);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  return (
    <div className="g-mech g-arcade g-mech-shooter">
      <Legend ctx={ctx} items={m.items} goodLabel={L(ctx, "À ABATTRE", "SHOOT")} badLabel={L(ctx, "À ÉPARGNER", "SPARE")} />
      <div className="g-metrics">
        <span>⏱ {stats.left}s</span>
        <span>🎯 {stats.hit}</span>
        <span>{L(ctx, "tirs amis", "friendly fire")} {stats.wrong}</span>
        <span>{L(ctx, "passées", "got through")} {stats.miss}</span>
      </div>
      <div className="g-screen">
        <canvas ref={ref} width={CW} height={CH} className="g-arcade-canvas" style={{ touchAction: "none" }} />
        {!live && <div className="g-count">{count > 0 ? count : "GO!"}</div>}
      </div>
      <p className="g-rule small">{L(ctx, "Tu pilotes", "You fly")} {ctx.t(m.ship)} · {L(ctx, "souris ou ← → pour bouger, tap ou ESPACE pour tirer", "mouse or ← → to move, tap or SPACE to fire")}</p>
    </div>
  );
}

/* ============================ RYTHME ============================ */

const TRAVEL = 2.2; // secondes de chute d'une note jusqu'à la ligne
const KEYS = ["d", "f", "j", "k"];

export function RhythmPlay({ ctx, m, paused, onDone }: { ctx: Ctx; m: Rhythm; paused: boolean; onDone: () => void }) {
  const count = useCountdown(ctx, paused);
  const live = count <= 0;
  const beat = 60 / m.bpm;
  // horaires : 2 temps d'écart au début, 1,5 au milieu, 1 temps sur la fin (le tempo « accélère »)
  const times = useRef<number[]>([]);
  if (!times.current.length) {
    let t = TRAVEL + beat;
    times.current = m.notes.map((_, i) => {
      const at = t;
      const prog = i / m.notes.length;
      t += beat * (prog < 0.34 ? 2 : prog < 0.7 ? 1.5 : 1) / (ctx.speed ?? 1);
      return at;
    });
  }
  const [now, setNow] = useState(0);
  const [res, setRes] = useState<Array<null | "perfect" | "good" | "wrong" | "miss">>(() => m.notes.map(() => null));
  const [flash, setFlash] = useState<{ lane: number; ok: boolean; t: number } | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const st = useRef({ t: 0, beatN: -1, ended: false, res: m.notes.map(() => null as null | string) });
  const seenConcept = useRef(new Set<string>());

  useEffect(() => {
    if (!live) return;
    let raf = 0, last = performance.now();
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (paused || st.current.ended) return;
      const s = st.current;
      s.t += dt;
      // métronome
      const b = Math.floor(s.t / beat);
      if (b !== s.beatN) { s.beatN = b; ctx.chip.blip(b % 4 === 0 ? 880 : 660, 0.02); }
      // notes ratées
      times.current.forEach((at, i) => {
        if (!s.res[i] && s.t > at + 0.32) {
          s.res[i] = "miss";
          ctx.apply(m.onMiss);
          ctx.combo?.(false);
          const n = m.notes[i]!;
          if (n.why) setWhy(`${ctx.t(n.label)} → ${ctx.t(m.lanes.find((l) => l.id === n.lane)!.label)} : ${ctx.t(n.why)}`);
          setRes([...s.res] as never);
        }
      });
      if (s.res.every(Boolean) && !s.ended) {
        s.ended = true;
        const r = s.res;
        ctx.report?.([
          { label: L(ctx, "Bien classées", "Sorted right"), value: pct(r.filter((x) => x === "perfect" || x === "good").length, r.length) },
          { label: L(ctx, "Parfaites", "Perfect"), value: String(r.filter((x) => x === "perfect").length) },
        ]);
        setTimeout(onDone, 700);
      }
      setNow(s.t);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, paused]);

  const press = (lane: number) => {
    if (!live || paused || st.current.ended) return;
    const s = st.current;
    // note la plus proche de la ligne, pas encore jouée
    let best = -1, bestD = 9;
    times.current.forEach((at, i) => { const d = Math.abs(at - s.t); if (!s.res[i] && d < bestD) { best = i; bestD = d; } });
    setFlash({ lane, ok: false, t: s.t });
    if (best < 0 || bestD > 0.32) { ctx.chip.blip(200, 0.03); return; }
    const n = m.notes[best]!;
    const right = m.lanes[lane]!.id === n.lane;
    const grade = right ? (bestD < 0.12 ? "perfect" : "good") : "wrong";
    s.res[best] = grade;
    ctx.apply(right ? m.onHit : m.onWrong);
    ctx.combo?.(right);
    if (right) ctx.chip.pad(lane); else { ctx.chip.sfx("bad"); ctx.fx.shake(); }
    if (n.conceptId && !seenConcept.current.has(n.conceptId)) { seenConcept.current.add(n.conceptId); ctx.learn?.(n.conceptId); }
    if (!right && n.why) setWhy(`${ctx.t(n.label)} → ${ctx.t(m.lanes.find((l) => l.id === n.lane)!.label)} : ${ctx.t(n.why)}`);
    setFlash({ lane, ok: right, t: s.t });
    setRes([...s.res] as never);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const i = KEYS.indexOf(e.key.toLowerCase());
      const j = ["1", "2", "3", "4"].indexOf(e.key);
      const a = ["ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"].indexOf(e.key);
      const lane = i >= 0 ? i : j >= 0 ? j : a;
      if (lane >= 0 && lane < m.lanes.length) { e.preventDefault(); press(lane); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, paused]);

  const pulse = live ? 1 - ((now / beat) % 1) : 0;
  const done = res.filter(Boolean).length;
  const okN = res.filter((r) => r === "perfect" || r === "good").length;
  return (
    <div className="g-mech g-mech-rhythm" style={{ ["--pulse" as string]: pulse.toFixed(2) }}>
      <div className="g-metrics">
        <span>♪ {m.bpm} BPM</span>
        <span>✓ {okN}/{done}</span>
        <span>{ctx.t(m.theme)}</span>
      </div>
      <div className="g-rh-stage" data-state={JSON.stringify({ t: now, notes: m.notes.map((n, i) => (res[i] ? null : { at: times.current[i], lane: m.lanes.findIndex((l) => l.id === n.lane) })) })}>
        <div className="g-rh-eq" aria-hidden>{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ height: `${20 + 60 * Math.abs(Math.sin(now * 3 + i * 0.7)) * (0.4 + pulse * 0.6)}%` }} />)}</div>
        <div className="g-rh-track">
          {m.notes.map((n, i) => {
            const at = times.current[i]!;
            const k = 1 - (at - now) / TRAVEL; // 0 en haut, 1 sur la ligne
            const r = res[i];
            if (k < -0.05 || (r && now - at > 0.5)) return null;
            const lane = m.lanes.findIndex((l) => l.id === n.lane);
            return (
              <div key={i} className={`g-rh-note${r ? ` ${r}` : ""}`} style={{ top: `${Math.min(1.1, k) * 82}%`, ...(r && r !== "miss" ? { borderColor: m.lanes[lane]?.color } : {}) }}>
                {ctx.t(n.label)}
                {r === "perfect" && <b>PARFAIT !</b>}{r === "good" && <b>OK</b>}{r === "wrong" && <b>✗</b>}{r === "miss" && <b>RATÉ</b>}
              </div>
            );
          })}
          <div className="g-rh-line" />
        </div>
        {!live && <div className="g-count">{count > 0 ? count : "GO!"}</div>}
      </div>
      <div className="g-rh-pads" style={{ gridTemplateColumns: `repeat(${m.lanes.length}, 1fr)` }}>
        {m.lanes.map((l, i) => (
          <button key={l.id} className={`g-rh-pad${flash && flash.lane === i && now - flash.t < 0.2 ? (flash.ok ? " ok" : " ko") : ""}`} style={{ ["--lc" as string]: l.color }} onPointerDown={() => press(i)}>
            <kbd>{KEYS[i]!.toUpperCase()}</kbd>
            <b>{ctx.t(l.label)}</b>
          </button>
        ))}
      </div>
      {why ? <p className="g-explain bad">{why}</p> : <p className="g-rule small">{L(ctx, "Quand une note touche la ligne, frappe la bonne colonne (D F J K, 1 2 3 4 ou tap).", "When a note hits the line, hit the right column (D F J K, 1 2 3 4 or tap).")}</p>}
    </div>
  );
}
