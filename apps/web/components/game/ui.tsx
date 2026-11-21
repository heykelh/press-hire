"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Cartridge, Condition, Effect, GameState, I18n } from "@press-hire/cartridge";
import { TitleRenderer, type Chip, type ImageFilter, type TitleSceneConfig } from "@press-hire/engine";

export type Lang = "fr" | "en";

/** Tout ce dont une mécanique a besoin pour jouer. */
export interface Ctx {
  c: Cartridge;
  lang: Lang;
  t: (x: I18n) => string;
  apply: (effects: Effect[]) => Record<string, number>;
  chip: Chip;
  fx: Fx;
  rand: () => number;
}

export interface Fx {
  shake: () => void;
  confetti: () => void;
  pop: (text: string, good: boolean) => void;
}

/* ---------- fond : le décor de l'écran titre, assombri ---------- */

export function Backdrop({ scene, filter }: { scene: TitleSceneConfig; filter: ImageFilter }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const r = new TitleRenderer(cv, { ...scene, filter });
    const t0 = performance.now();
    let raf = 0, last = 0;
    const size = () => r.resize(window.innerWidth, window.innerHeight);
    size();
    window.addEventListener("resize", size);
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 66) return; // 15 i/s suffisent en fond
      last = now;
      r.frame((now - t0) / 1000);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <canvas ref={ref} className="g-backdrop" aria-hidden="true" />
      <div className="g-veil" aria-hidden="true" />
    </>
  );
}

/* ---------- portrait 16×16 généré depuis la palette du personnage ---------- */

const FACE = [
  "....HHHHHHHH....",
  "...HHHHHHHHHH...",
  "..HHHHHHHHHHHH..",
  "..HHSSSSSSSSHH..",
  "..HSSSSSSSSSSH..",
  "..HSSEESSEESSH..",
  "..HSSWESSWESSH..",
  "...SSSSSSSSSS...",
  "...SSSSMMSSSS...",
  "....SSSSSSSS....",
  ".....SSSSSS.....",
  "...BBBAAAABBB...",
  "..BBBBBAABBBBB..",
  ".BBBBBBAABBBBBB.",
  ".BBBBBBBBBBBBBB.",
  ".BBBBBBBBBBBBBB.",
];

export function Portrait({ palette, size = 72, talking = false }: { palette: { hair: string; skin: string; body: string; accent: string }; size?: number; talking?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let open = false;
    const draw = () => {
      ctx.clearRect(0, 0, 16, 16);
      const col: Record<string, string> = { H: palette.hair, S: palette.skin, E: "#14141c", W: "#ffffff", M: open ? "#7a2020" : "#b05a4a", B: palette.body, A: palette.accent };
      FACE.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === ".") return;
        ctx.fillStyle = col[ch]!;
        ctx.fillRect(x, y, 1, ch === "M" && open ? 2 : 1);
      }));
    };
    draw();
    if (!talking) return;
    const id = setInterval(() => { open = !open; draw(); }, 140);
    const stop = setTimeout(() => { clearInterval(id); open = false; draw(); }, 1600);
    return () => { clearInterval(id); clearTimeout(stop); };
  }, [palette, talking]);
  return <canvas ref={ref} width={16} height={16} className="g-portrait" style={{ width: size, height: size }} aria-hidden="true" />;
}

/* ---------- HUD : objectifs du niveau en cours ---------- */

export function Hud({ ctx, state, levelStart, goals, levelNo, levelCount, children }: {
  ctx: Ctx; state: GameState; levelStart: GameState; goals: Condition[]; levelNo: string; levelCount: number; children?: ReactNode;
}) {
  const { c, t } = ctx;
  return (
    <header className="g-hud">
      <div className="g-hud-top">
        <span className="g-hud-title">{t(c.design.title)}</span>
        <span className="g-hud-level">{levelNo} / {levelCount}</span>
        <span className="g-hud-actions">{children}</span>
      </div>
      <div className="g-goals">
        {goals.map((g, i) => {
          const v = c.state.vars.find((x) => x.id === g.var);
          if (!v) return null;
          const cur = (state[g.var] ?? 0) - (g.scope === "level" ? levelStart[g.var] ?? 0 : 0);
          const span = g.scope === "level" ? Math.max(1, g.value * 1.4) : v.max - v.min;
          const base = g.scope === "level" ? 0 : v.min;
          const pct = Math.max(0, Math.min(100, ((cur - base) / span) * 100));
          const target = Math.max(0, Math.min(100, ((g.value - base) / span) * 100));
          const ok = g.op === "<=" || g.op === "<" ? cur <= g.value : cur >= g.value;
          const fmt = (n: number) => (Math.abs(n) < 10 && n % 1 ? n.toFixed(1) : Math.round(n).toLocaleString(ctx.lang));
          return (
            <div key={i} className={`g-goal${ok ? " ok" : ""}`}>
              <div className="g-goal-label">
                <span>{t(v.label)}{g.scope === "level" ? (ctx.lang === "fr" ? " (ce niveau)" : " (this level)") : ""}</span>
                <span>{fmt(cur)}{v.unit ? ` ${v.unit}` : ""} <b>{g.op} {fmt(g.value)}</b></span>
              </div>
              <div className="g-bar"><i style={{ width: `${pct}%` }} /><em style={{ left: `${target}%` }} /></div>
            </div>
          );
        })}
      </div>
    </header>
  );
}

/* ---------- effets ---------- */

export function useFx(root: React.RefObject<HTMLDivElement | null>, juice: number): Fx {
  return {
    shake: () => {
      if (!juice || !root.current) return;
      root.current.classList.remove("g-shake");
      void root.current.offsetWidth;
      root.current.classList.add("g-shake");
    },
    confetti: () => {
      if (!juice || !root.current) return;
      const colors = ["#ffd800", "#ff3cd0", "#3ad0ff", "#3ad46a", "#ff5a3a", "#ffffff"];
      for (let i = 0; i < 18 + juice * 14; i++) {
        const d = document.createElement("i");
        d.className = "g-confetti";
        d.style.left = `${Math.random() * 100}%`;
        d.style.background = colors[i % colors.length]!;
        d.style.animationDuration = `${0.9 + Math.random() * 0.9}s`;
        d.style.animationDelay = `${Math.random() * 0.25}s`;
        root.current.appendChild(d);
        setTimeout(() => d.remove(), 2200);
      }
    },
    pop: (text, good) => {
      if (!root.current) return;
      const d = document.createElement("div");
      d.className = `g-pop ${good ? "good" : "bad"}`;
      d.textContent = text;
      root.current.appendChild(d);
      setTimeout(() => d.remove(), 1300);
    },
  };
}

/** Texte « +8 Conformité » à partir des variations obtenues. */
export function deltaText(c: Cartridge, deltas: Record<string, number>, t: (x: I18n) => string): Array<{ text: string; good: boolean }> {
  return Object.entries(deltas)
    .filter(([, d]) => Math.abs(d) > 1e-9)
    .map(([id, d]) => {
      const v = c.state.vars.find((x) => x.id === id);
      const lowerIsBetter = c.levels.some((l) => l.win.some((w) => w.var === id && (w.op === "<=" || w.op === "<")));
      const n = Math.abs(d) < 10 && d % 1 ? d.toFixed(1) : Math.round(d).toString();
      return { text: `${d > 0 ? "+" : ""}${n}${v?.unit ? " " + v.unit : ""} ${v ? t(v.label) : id}`, good: lowerIsBetter ? d < 0 : d > 0 };
    });
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`g-panel ${className}`}>{children}</section>;
}

/* ---------- boss générique en pixels (quand il n'a pas de personnage) ---------- */

const MONSTER = [
  "....X......X....",
  "...XBX....XBX...",
  "...XBBXXXXBBX...",
  "..XBBBBBBBBBBX..",
  ".XBBBBBBBBBBBBX.",
  ".XBWWWBBBBWWWBX.",
  "XBBWKWBBBBWKWBBX",
  "XBBWWWBBBBWWWBBX",
  "XBBBBBBBBBBBBBBX",
  "XBBBKKKKKKKKBBBX",
  "XBBBKTKTKTKKBBBX",
  ".XBBKKKKKKKKBBX.",
  ".XBBBBBBBBBBBBX.",
  "..XBBXBBBBXBBX..",
  "..XBX.XBBX.XBX..",
  "...X...XX...X...",
];

export function BossSprite({ color, size = 96, hurt = false }: { color: string; size?: number; hurt?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current?.getContext("2d");
    if (!g) return;
    let f = 0;
    const draw = () => {
      g.clearRect(0, 0, 16, 18);
      const bob = f % 2;
      const col: Record<string, string> = { X: "#000", B: hurt ? "#fff" : color, W: "#fff", K: "#1a0606", T: "#fff" };
      MONSTER.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === ".") return;
        g.fillStyle = col[ch]!;
        g.fillRect(x, y + 1 + bob, 1, 1);
      }));
      f++;
    };
    draw();
    const id = setInterval(draw, 380);
    return () => clearInterval(id);
  }, [color, hurt]);
  return <canvas ref={ref} width={16} height={18} className="g-boss-sprite" style={{ width: size, height: size * 18 / 16 }} aria-hidden="true" />;
}
