"use client";

import { useEffect, useRef, useState } from "react";
import type { Boss, Character, Effect, Level } from "@press-hire/cartridge";
import { evalCurve } from "@press-hire/cartridge";
import { brakeDistance, easeOutCubic, pickWeighted, sliceAt, slices, targetRotation } from "@press-hire/engine";
import { BossSprite, deltaText, Portrait, type Ctx } from "./ui";
import { CatchPlay, GaugeMeter, GaugePlay, SequencePlay, WhackPlay } from "./arcade";
import { InspectionPlay, InvestigationPlay } from "./observe";

type M = Level["mechanic"];
type Wheel = Extract<M, { type: "wheel" }>;
type Slider = Extract<M, { type: "slider" }>;
type Triage = Extract<M, { type: "triage" }>;
type Quiz = Extract<M, { type: "quiz" }>;
type Dialogue = Extract<M, { type: "dialogue" }>;

const L = (ctx: Ctx, fr: string, en: string) => (ctx.lang === "fr" ? fr : en);

/** Applique, fait sonner et affiche les variations. */
function play(ctx: Ctx, effects: Effect[], good: boolean) {
  const d = ctx.apply(effects);
  const lines = deltaText(ctx.c, d, ctx.t);
  lines.forEach((l, i) => setTimeout(() => ctx.fx.pop(l.text, l.good), i * 180));
  ctx.chip.sfx(good ? "good" : "bad");
  if (!good) ctx.fx.shake();
  return lines;
}

/** Touche clavier → action (désactivée pendant la saisie). */
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

export function Mechanic({ ctx, m, character, paused = false, onDone }: { ctx: Ctx; m: M; character?: Character; paused?: boolean; onDone: () => void }) {
  switch (m.type) {
    case "catch": return <CatchPlay ctx={ctx} m={m} paused={paused} onDone={onDone} />;
    case "whack": return <WhackPlay ctx={ctx} m={m} paused={paused} onDone={onDone} />;
    case "gauge": return <GaugePlay ctx={ctx} m={m} paused={paused} onDone={onDone} />;
    case "sequence": return <SequencePlay ctx={ctx} m={m} paused={paused} onDone={onDone} />;
    case "inspection": return <InspectionPlay ctx={ctx} m={m} paused={paused} onDone={onDone} />;
    case "investigation": return <InvestigationPlay ctx={ctx} m={m} paused={paused} onDone={onDone} />;
    case "wheel": return <WheelPlay ctx={ctx} m={m} onDone={onDone} />;
    case "slider": return <SliderPlay ctx={ctx} m={m} onDone={onDone} />;
    case "triage": return <TriagePlay ctx={ctx} m={m} paused={paused} onDone={onDone} />;
    case "quiz": return <QuizPlay ctx={ctx} m={m} onDone={onDone} />;
    case "dialogue": return <DialoguePlay ctx={ctx} m={m} character={character} onDone={onDone} />;
  }
}

/* ======================= ROUE ======================= */

const TAU = Math.PI * 2;
const WS = 240; // taille interne de la toile de la roue

/** Éclaircit (k > 0) ou assombrit (k < 0) une couleur hex. */
const tone = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return `rgb(${ch.join(",")})`;
};

/**
 * Roue de jeu télévisé en pixels : ampoules qui défilent, cases ombrées, picots,
 * languette qui claque sur chaque picot, case gagnante qui clignote.
 * Tout est dessiné dans la boucle d'animation (aucun rendu React par image).
 */
export function SpinningWheel({ ctx, m, disabled, onResult }: { ctx: Ctx; m: Wheel; disabled?: boolean; onResult: (i: number) => void }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"idle" | "free" | "brake" | "spin">(m.stop === "timing" ? "free" : "idle");
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const S = useRef({ rot: 0, vel: 0, from: 0, to: 0, t0: 0, dur: 0, flap: 0, slice: -1, winner: -1, winT: 0 });
  const sl = slices(m.segments.map((x) => x.weight));
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const accent = ctx.c.design.palette.accent;

  useEffect(() => {
    const cv = cvRef.current!;
    const g = cv.getContext("2d")!;
    const cx = WS / 2, cy = WS / 2 + 8, R = 92;
    let raf = 0, last = performance.now();
    const labels = m.segments.map((x) => x.code);

    const draw = (now: number) => {
      const s = S.current;
      const t = now / 1000;
      g.clearRect(0, 0, WS, WS);
      g.imageSmoothingEnabled = false;
      // ombre portée
      g.fillStyle = "rgba(0,0,0,.45)";
      g.beginPath(); g.arc(cx + 5, cy + 6, R + 14, 0, TAU); g.fill();
      // jante : bois sombre + anneau doré biseauté
      g.fillStyle = "#1b1022"; g.beginPath(); g.arc(cx, cy, R + 14, 0, TAU); g.fill();
      g.fillStyle = "#b8860b"; g.beginPath(); g.arc(cx, cy, R + 7, 0, TAU); g.fill();
      g.fillStyle = "#ffd54a"; g.beginPath(); g.arc(cx, cy, R + 7, Math.PI * 1.05, Math.PI * 1.75); g.lineTo(cx, cy); g.fill();
      g.fillStyle = "#1b1022"; g.beginPath(); g.arc(cx, cy, R + 3, 0, TAU); g.fill();

      const spinning = modeRef.current === "spin" || modeRef.current === "brake" || Math.abs(s.vel) > 0.5;
      const flashing = s.winner >= 0 && t - s.winT < 1.6;
      // cases : couleur, reflet intérieur, ombre extérieure
      m.segments.forEach((seg, i) => {
        const a0 = sl[i]!.start + s.rot - Math.PI / 2, a1 = sl[i]!.end + s.rot - Math.PI / 2;
        const win = flashing && i === s.winner;
        const base = win && Math.floor(t * 8) % 2 === 0 ? tone(seg.color, 0.45) : seg.color;
        const wedge = (r: number, c: string) => { g.fillStyle = c; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a0, a1); g.closePath(); g.fill(); };
        wedge(R, base.startsWith("#") ? tone(base, -0.22) : base);
        wedge(R * 0.86, base);
        wedge(R * 0.5, base.startsWith("#") ? tone(base, 0.18) : base);
        if (flashing && i !== s.winner) wedge(R, "rgba(0,0,0,.45)");
      });
      // séparations
      g.lineWidth = 3; g.strokeStyle = "#140c18";
      for (const x of sl) {
        const a = x.start + s.rot - Math.PI / 2;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke();
      }
      // étiquettes le long du rayon
      m.segments.forEach((seg, i) => {
        const mid = (sl[i]!.start + sl[i]!.end) / 2 + s.rot - Math.PI / 2;
        g.save(); g.translate(cx, cy); g.rotate(mid);
        g.font = `${sl[i]!.end - sl[i]!.start < 0.5 ? 7 : 9}px 'Press Start 2P', monospace`;
        g.textAlign = "center"; g.textBaseline = "middle";
        g.fillStyle = "#000"; g.fillText(labels[i]!, R * 0.62 + 1, 1);
        g.fillStyle = "#fff"; g.fillText(labels[i]!, R * 0.62, 0);
        g.restore();
        void seg;
      });
      // picots dorés aux limites des cases
      for (const x of sl) {
        const a = x.start + s.rot - Math.PI / 2;
        const px = Math.round(cx + Math.cos(a) * (R - 4)), py = Math.round(cy + Math.sin(a) * (R - 4));
        g.fillStyle = "#000"; g.fillRect(px - 3, py - 3, 6, 6);
        g.fillStyle = "#ffd54a"; g.fillRect(px - 2, py - 2, 4, 4);
        g.fillStyle = "#fff7c0"; g.fillRect(px - 2, py - 2, 2, 2);
      }
      // ampoules : clignotent au repos, défilent pendant la rotation, s'emballent à la victoire
      const N = 28;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU;
        const on = flashing ? Math.floor(t * 10) % 2 === 0 : spinning ? (i + Math.floor(t * 24)) % 4 === 0 : (i + Math.floor(t * 2)) % 2 === 0;
        const bx = Math.round(cx + Math.cos(a) * (R + 10)), by = Math.round(cy + Math.sin(a) * (R + 10));
        g.fillStyle = on ? "rgba(255,240,150,.35)" : "transparent";
        g.fillRect(bx - 4, by - 4, 8, 8);
        g.fillStyle = on ? "#fff7c0" : "#6b5a20";
        g.fillRect(bx - 2, by - 2, 4, 4);
      }
      // moyeu
      g.fillStyle = "#140c18"; g.beginPath(); g.arc(cx, cy, 27, 0, TAU); g.fill();
      g.fillStyle = "#b8860b"; g.beginPath(); g.arc(cx, cy, 24, 0, TAU); g.fill();
      g.fillStyle = "#ffd54a"; g.beginPath(); g.arc(cx - 3, cy - 3, 20, 0, TAU); g.fill();
      // languette (pivot en haut), qui claque sur chaque picot
      g.save();
      g.translate(cx, cy - R - 16);
      g.rotate(s.flap);
      g.fillStyle = "#000";
      g.beginPath(); g.moveTo(-10, -2); g.lineTo(10, -2); g.lineTo(0, 24); g.closePath(); g.fill();
      g.fillStyle = accent;
      g.beginPath(); g.moveTo(-7, 0); g.lineTo(7, 0); g.lineTo(0, 19); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,255,255,.7)"; g.fillRect(-4, 1, 3, 6);
      g.fillStyle = "#000"; g.fillRect(-3, -6, 6, 6);
      g.fillStyle = "#ffd54a"; g.fillRect(-2, -5, 4, 4);
      g.restore();
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = S.current;
      const prev = s.rot;
      const md = modeRef.current;
      if (md === "free") s.rot += dt * 3.6 * (1 - 0.2 * (ctx.assist ?? 0));
      else if (md === "spin" || md === "brake") {
        const k = Math.min(1, (now - s.t0) / s.dur);
        s.rot = s.from + (s.to - s.from) * (md === "spin" ? 1 - Math.pow(1 - k, 4) : easeOutCubic(k));
        if (k >= 1) {
          const i = sliceAt(sl, s.rot);
          s.winner = i;
          s.winT = now / 1000;
          setMode(m.stop === "timing" ? "free" : "idle");
          onResultRef.current(i);
        }
      }
      s.vel = dt > 0 ? (s.rot - prev) / dt : 0;
      const cur = sliceAt(sl, s.rot);
      if (cur !== s.slice) {
        if (s.slice >= 0 && md !== "free") { ctx.chip.sfx("tick"); s.flap = -0.55; }
        else if (s.slice >= 0) s.flap = -0.3;
        s.slice = cur;
      }
      s.flap *= Math.exp(-dt * 10);
      if (wrapRef.current) wrapRef.current.dataset.rot = s.rot.toFixed(3);
      draw(now);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m]);

  const go = () => {
    if (disabled) return;
    const s = S.current;
    ctx.chip.sfx("click");
    s.winner = -1;
    if (m.stop === "random") {
      if (modeRef.current !== "idle") return;
      const i = pickWeighted(m.segments.map((x) => x.weight), ctx.rand);
      s.from = s.rot; s.to = targetRotation(sl, i, s.rot, 4 + Math.floor(ctx.rand() * 2), ctx.rand);
      s.t0 = performance.now(); s.dur = 3400;
      setMode("spin");
    } else {
      if (modeRef.current !== "free") return;
      s.from = s.rot; s.to = s.rot + brakeDistance(m.segments.length);
      s.t0 = performance.now(); s.dur = 900;
      setMode("brake");
    }
  };
  useKeys({ " ": go, Enter: go }, !disabled);

  const busy = mode === "spin" || mode === "brake";
  const label = m.stop === "random" ? "GO!" : "STOP!";
  return (
    <div className="g-wheel-wrap" ref={wrapRef}>
      <canvas ref={cvRef} width={WS} height={WS} className="g-wheel" aria-hidden="true" />
      <button className="g-hub" onClick={go} disabled={disabled || busy || (m.stop === "random" && mode !== "idle")}>{label}</button>
    </div>
  );
}

function WheelPlay({ ctx, m, onDone }: { ctx: Ctx; m: Wheel; onDone: () => void }) {
  const [left, setLeft] = useState(m.spins);
  const [last, setLast] = useState<number | null>(null);
  const goodSpins = useRef(0);
  const toward = (effects: Effect[]) => effects.reduce((t, e) => t + (e.op === "add" ? e.value : 0), 0);
  const onResult = (i: number) => {
    const seg = m.segments[i]!;
    setLast(i);
    const good = toward(seg.effects) >= 0;
    play(ctx, seg.effects, good);
    if (good) goodSpins.current++;
    const n = left - 1;
    setLeft(n);
    if (n <= 0) {
      ctx.report?.([{ label: L(ctx, "Lancers favorables", "Good spins"), value: `${goodSpins.current}/${m.spins}` }]);
      setTimeout(onDone, 1300);
    }
  };
  const seg = last !== null ? m.segments[last] : undefined;
  return (
    <div className="g-mech g-mech-wheel">
      <p className="g-rule">
        {m.stop === "random"
          ? L(ctx, "Lance la roue : chaque case change la partie.", "Spin the wheel: every slot changes the game.")
          : L(ctx, "Arrête la roue au bon moment (espace ou clic).", "Stop the wheel at the right moment (space or click).")}
      </p>
      <SpinningWheel ctx={ctx} m={m} disabled={left <= 0} onResult={onResult} />
      <div className="g-wheel-info">
        <span className="g-chip">{L(ctx, "Lancers", "Spins")} : {left}</span>
        {seg && <p className="g-callout"><b style={{ color: seg.color }}>{seg.code}</b> {ctx.t(seg.label)}</p>}
      </div>
      <ul className="g-legend">
        {m.segments.map((s) => (
          <li key={s.id}><i style={{ background: s.color }} />{s.code} · {ctx.t(s.label)}</li>
        ))}
      </ul>
    </div>
  );
}

/* ======================= CURSEUR ======================= */

function SliderPlay({ ctx, m, onDone }: { ctx: Ctx; m: Slider; onDone: () => void }) {
  const ctl = m.control;
  const [x, setX] = useState(ctl.start);
  const [round, setRound] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const decimals = Math.max(0, -Math.floor(Math.log10(ctl.step)));
  const fmt = (v: number) => v.toFixed(decimals);

  const confirm = () => {
    if (busy) return;
    setBusy(true);
    const effects: Effect[] = m.outputs.map((o) => {
      const noise = m.noise ? 1 + (ctx.rand() * 2 - 1) * m.noise : 1;
      return { var: o.var, op: "add", value: evalCurve(o.curve, x) * noise };
    });
    const lines = play(ctx, effects, true);
    setLog((l) => [`#${round} ${fmt(x)}${ctl.unit ?? ""} → ${lines.map((z) => z.text).join(" · ") || "="}`, ...l].slice(0, 4));
    setTimeout(() => {
      setBusy(false);
      if (round >= m.rounds) {
        ctx.report?.([{ label: L(ctx, "Réglage retenu", "Final setting"), value: `${fmt(x)}${ctl.unit ?? ""}` }]);
        onDone();
      } else setRound(round + 1);
    }, 700);
  };
  const nudge = (d: number) => setX((v) => Math.min(ctl.max, Math.max(ctl.min, +(v + d * ctl.step).toFixed(6))));
  useKeys({ ArrowLeft: () => nudge(-1), ArrowRight: () => nudge(1), Enter: confirm, " ": confirm });

  const pct = ((x - ctl.min) / (ctl.max - ctl.min)) * 100;
  return (
    <div className="g-mech g-mech-slider">
      <p className="g-rule">{ctx.t(ctl.label)}</p>
      <div className="g-slider-value">{fmt(x)}<small>{ctl.unit ?? ""}</small></div>
      <div className="g-slider-row">
        <button className="g-btn small" onClick={() => nudge(-1)} aria-label="-">◀</button>
        <input
          type="range" min={ctl.min} max={ctl.max} step={ctl.step} value={x}
          onChange={(e) => setX(+e.target.value)}
          style={{ "--p": `${pct}%` } as React.CSSProperties}
          aria-label={ctx.t(ctl.label)}
        />
        <button className="g-btn small" onClick={() => nudge(1)} aria-label="+">▶</button>
      </div>
      <div className="g-slider-scale"><span>{fmt(ctl.min)}</span><span>{fmt(ctl.max)}</span></div>
      <button className="g-btn primary" onClick={confirm} disabled={busy}>
        {L(ctx, "VALIDER", "CONFIRM")} {m.rounds > 1 ? `(${round}/${m.rounds})` : ""}
      </button>
      {log.length > 0 && <ul className="g-log">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>}
    </div>
  );
}

/* ======================= TRI ======================= */

function TriagePlay({ ctx, m, paused, onDone }: { ctx: Ctx; m: Triage; paused: boolean; onDone: () => void }) {
  // cartes ordinaires mélangées d'abord, rebondissement (« twist ») à la fin
  const items = useRef([
    ...m.items.filter((x) => !x.twist).sort(() => ctx.rand() - 0.5),
    ...m.items.filter((x) => x.twist).sort(() => ctx.rand() - 0.5),
  ]).current;
  const [i, setI] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; why: string } | null>(null);
  const [score, setScore] = useState(0);
  const limit = m.timeLimitSec ? Math.round(m.timeLimitSec * (1 + 0.5 * (ctx.assist ?? 0))) : 0;
  const [time, setTime] = useState(limit);
  const done = useRef(false);
  const scoreRef = useRef(0);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    ctx.report?.([{ label: L(ctx, "Bonnes décisions", "Right calls"), value: `${scoreRef.current}/${items.length}` }]);
    setTimeout(onDone, 400);
  };
  useEffect(() => { if (items[i]?.twist) ctx.twist?.(); }, [i, items, ctx]);

  useEffect(() => {
    if (!limit || paused) return;
    const id = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [limit, paused]);
  useEffect(() => {
    if (!limit || time > 0 || done.current) return;
    // temps écoulé : chaque carte restante compte comme une erreur
    const rest = items.length - i;
    for (let k = 0; k < rest; k++) ctx.apply(m.onWrong);
    ctx.fx.pop(L(ctx, "TEMPS ÉCOULÉ", "TIME'S UP"), false);
    ctx.chip.sfx("bad");
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time]);

  const pick = (choice: "accept" | "reject") => {
    if (feedback || done.current) return;
    const it = items[i]!;
    const ok = it.correct === choice;
    if (ok) { setScore((s) => s + 1); scoreRef.current++; }
    play(ctx, ok ? m.onCorrect : m.onWrong, ok);
    ctx.combo?.(ok);
    ctx.learn?.(it.conceptId);
    setFeedback({ ok, why: ctx.t(it.why) });
  };
  const next = () => {
    if (!feedback) return;
    setFeedback(null);
    if (i + 1 >= items.length) finish(); else setI(i + 1);
  };
  useKeys(feedback
    ? { Enter: next, " ": next, ArrowRight: next }
    : { ArrowLeft: () => pick("reject"), ArrowRight: () => pick("accept"), n: () => pick("reject"), y: () => pick("accept"), o: () => pick("accept") });

  const it = items[Math.min(i, items.length - 1)]!;
  return (
    <div className="g-mech g-mech-triage">
      <p className="g-rule">{ctx.t(m.rule)}</p>
      <div className="g-triage-meta">
        <span className="g-chip">{i + 1} / {items.length}</span>
        <span className="g-chip">✓ {score}</span>
        {limit ? <span className={`g-chip${time <= 5 ? " hot" : ""}`}>⏱ {Math.max(0, time)}s</span> : null}
      </div>
      <div key={it.id} className={`g-card${feedback ? (feedback.ok ? " ok" : " ko") : ""}`}>
        <p className="g-card-label">{ctx.t(it.label)}</p>
        {it.detail && <p className="g-card-detail">{ctx.t(it.detail)}</p>}
        {feedback && <p className="g-card-why"><b>{feedback.ok ? "✓" : "✗"}</b> {feedback.why}</p>}
      </div>
      {feedback ? (
        <button className="g-btn primary" onClick={next}>{L(ctx, "SUIVANT ▶", "NEXT ▶")}</button>
      ) : (
        <div className="g-choice-row">
          <button className="g-btn bad" onClick={() => pick("reject")}>✗ {L(ctx, "REJETER", "REJECT")}</button>
          <button className="g-btn good" onClick={() => pick("accept")}>✓ {L(ctx, "ACCEPTER", "ACCEPT")}</button>
        </div>
      )}
    </div>
  );
}

/* ======================= QUIZ ======================= */

function QuizPlay({ ctx, m, onDone }: { ctx: Ctx; m: Quiz; onDone: () => void }) {
  const [q, setQ] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const cur = m.questions[q]!;
  const right = useRef(0);
  const choose = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    const ok = k === cur.correctIndex;
    if (ok) right.current++;
    play(ctx, ok ? m.onCorrect : m.onWrong, ok);
    ctx.combo?.(ok);
    ctx.learn?.(cur.conceptId);
  };
  const next = () => {
    if (picked === null) return;
    setPicked(null);
    if (q + 1 >= m.questions.length) {
      ctx.report?.([{ label: L(ctx, "Bonnes réponses", "Right answers"), value: `${right.current}/${m.questions.length}` }]);
      onDone();
    } else setQ(q + 1);
  };
  useKeys(picked === null
    ? Object.fromEntries(cur.options.map((_, k) => [String(k + 1), () => choose(k)]))
    : { Enter: next, " ": next });
  return (
    <div className="g-mech g-mech-quiz">
      <QuizCard ctx={ctx} q={cur} picked={picked} onPick={choose} counter={`${q + 1} / ${m.questions.length}`} />
      {picked !== null && <button className="g-btn primary" onClick={next}>{L(ctx, "SUIVANT ▶", "NEXT ▶")}</button>}
    </div>
  );
}

function QuizCard({ ctx, q, picked, onPick, counter }: { ctx: Ctx; q: Quiz["questions"][number]; picked: number | null; onPick: (k: number) => void; counter?: string }) {
  return (
    <>
      {counter && <span className="g-chip">{counter}</span>}
      <p className="g-question">{ctx.t(q.prompt)}</p>
      <div className="g-options">
        {q.options.map((o, k) => {
          const state = picked === null ? "" : k === q.correctIndex ? " ok" : k === picked ? " ko" : " dim";
          return (
            <button key={k} className={`g-option${state}`} onClick={() => onPick(k)} disabled={picked !== null}>
              <kbd>{k + 1}</kbd> {ctx.t(o)}
            </button>
          );
        })}
      </div>
      {picked !== null && <p className={`g-explain${picked === q.correctIndex ? " ok" : " ko"}`}>{ctx.t(q.explain)}</p>}
    </>
  );
}

/* ======================= DIALOGUE ======================= */

function DialoguePlay({ ctx, m, character, onDone }: { ctx: Ctx; m: Dialogue; character?: Character; onDone: () => void }) {
  const convinced = useRef(0);
  const [n, setN] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const node = m.nodes[n]!;
  const speech = choice === null ? ctx.t(node.text) : ctx.t(node.choices[choice]!.reply);
  const typed = useTyped(speech);

  const choose = (k: number) => {
    if (choice !== null) return;
    setChoice(k);
    const ch = node.choices[k]!;
    const sum = ch.effects.reduce((t, e) => t + (e.op === "add" ? e.value : 0), 0);
    const best = Math.max(...node.choices.map((x) => x.effects.reduce((t, e) => t + (e.op === "add" ? e.value : 0), 0)));
    if (sum >= best) convinced.current++;
    ctx.combo?.(sum >= best);
    play(ctx, ch.effects, sum >= 0);
  };
  const next = () => {
    if (choice === null) return;
    setChoice(null);
    if (n + 1 >= m.nodes.length) {
      ctx.report?.([{ label: L(ctx, "Réponses convaincantes", "Convincing replies"), value: `${convinced.current}/${m.nodes.length}` }]);
      onDone();
    } else setN(n + 1);
  };
  useKeys(choice === null
    ? Object.fromEntries(node.choices.map((_, k) => [String(k + 1), () => choose(k)]))
    : { Enter: next, " ": next });

  return (
    <div className="g-mech g-mech-dialogue">
      <div className="g-speaker">
        {character && <Portrait palette={character.palette} size={88} talking={typed.length < speech.length} />}
        <div>
          {character && <p className="g-speaker-name">{character.name} <small>{ctx.t(character.role)}</small></p>}
          <p className="g-bubble">{typed}<span className="g-caret" /></p>
        </div>
      </div>
      {choice === null ? (
        <div className="g-options">
          {node.choices.map((ch, k) => (
            <button key={k} className="g-option" onClick={() => choose(k)}><kbd>{k + 1}</kbd> {ctx.t(ch.text)}</button>
          ))}
        </div>
      ) : (
        <>
          <p className="g-you">« {ctx.t(node.choices[choice]!.text)} »</p>
          <button className="g-btn primary" onClick={next}>{L(ctx, "SUITE ▶", "NEXT ▶")} <small>{n + 1}/{m.nodes.length}</small></button>
        </>
      )}
    </div>
  );
}

/** Texte qui s'écrit lettre à lettre. */
export function useTyped(text: string, cps = 60): string {
  const [k, setK] = useState(0);
  useEffect(() => {
    setK(0);
    const id = setInterval(() => setK((v) => { if (v >= text.length) { clearInterval(id); return v; } return v + 2; }), 1000 / (cps / 2));
    return () => clearInterval(id);
  }, [text, cps]);
  return text.slice(0, k);
}

/* ======================= BOSS ======================= */

export function BossFight({ ctx, boss, character, onEnd }: { ctx: Ctx; boss: Boss; character?: Character; onEnd: (won: boolean) => void }) {
  const LIVES = 3;
  const [hp, setHp] = useState(boss.hp);
  const [lives, setLives] = useState(LIVES);
  const [taunt, setTaunt] = useState(ctx.t(boss.taunts[0]!));
  const [hurt, setHurt] = useState(false);
  const [q, setQ] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [spins, setSpins] = useState(0);
  const ended = useRef(false);
  const m = boss.mechanic!; // boss classique (les boss à plusieurs formes sont joués par Game)
  const maxSpins = m.type === "wheel" ? Math.max(m.spins, boss.hp + LIVES) : m.type === "gauge" ? Math.max(m.rounds, boss.hp + LIVES) : 0;

  const hit = (good: boolean, effects: Effect[]) => {
    play(ctx, effects, good);
    let nh = hp, nl = lives;
    if (good) {
      nh = hp - 1; setHp(nh);
      ctx.chip.sfx("hit"); ctx.fx.shake();
      setHurt(true); setTimeout(() => setHurt(false), 400);
    } else {
      nl = lives - 1; setLives(nl);
      setTaunt(ctx.t(boss.taunts[Math.floor(ctx.rand() * boss.taunts.length)]!));
    }
    return { nh, nl };
  };
  const check = (nh: number, nl: number, outOfMoves = false) => {
    if (ended.current) return;
    if (nh <= 0) { ended.current = true; setTimeout(() => onEnd(true), 900); }
    else if (nl <= 0 || outOfMoves) { ended.current = true; setTimeout(() => onEnd(false), 900); }
  };

  const choose = (k: number) => {
    if (m.type !== "quiz" || picked !== null) return;
    setPicked(k);
    const cur = m.questions[q % m.questions.length]!;
    const ok = k === cur.correctIndex;
    const r = hit(ok, ok ? m.onCorrect : m.onWrong);
    check(r.nh, r.nl);
  };
  const next = () => { if (picked === null || ended.current) return; setPicked(null); setQ(q + 1); };
  useKeys(m.type === "quiz" && picked !== null ? { Enter: next, " ": next } : m.type === "quiz" ? Object.fromEntries(m.questions[q % m.questions.length]!.options.map((_, k) => [String(k + 1), () => choose(k)])) : {});

  const onSpin = (i: number) => {
    if (m.type === "quiz") return;
    const seg = m.type === "wheel" ? m.segments[i] : m.zones[i];
    const effects = seg?.effects ?? [];
    // une case ou zone favorable = un coup ; pour la jauge, la meilleure zone compte même sans effet chiffré
    const sum = effects.reduce((t, e) => t + (e.op === "add" ? e.value : 0), 0);
    const best = m.type === "gauge" && seg ? m.zones.indexOf(seg as never) === bossBestZone : false;
    const r = hit(sum > 0 || best, effects);
    const s = spins + 1; setSpins(s);
    check(r.nh, r.nl, s >= maxSpins);
  };

  const bossBestZone = m.type === "gauge"
    ? m.zones.map((z, i) => [z.effects.reduce((t, e) => t + (e.op === "add" ? e.value : 0), 0), i] as const).sort((a, b) => b[0] - a[0])[0]![1]
    : -1;

  return (
    <div className="g-mech g-boss">
      <div className={`g-boss-head${hurt ? " hurt" : ""}`}>
        {character ? <Portrait palette={character.palette} size={96} talking={!hurt} /> : <BossSprite color={ctx.c.design.palette.colors[0]!} hurt={hurt} />}
        <div className="g-boss-info">
          <p className="g-boss-name">{ctx.t(boss.name)}</p>
          <div className="g-hp" aria-label={`HP ${hp}/${boss.hp}`}>
            {Array.from({ length: boss.hp }, (_, k) => <i key={k} className={k < hp ? "on" : ""} />)}
          </div>
          <p className="g-lives">{L(ctx, "Vies", "Lives")} {"♥".repeat(Math.max(0, lives))}{"♡".repeat(LIVES - Math.max(0, lives))}</p>
        </div>
      </div>
      <p className="g-bubble boss">{taunt}</p>
      {m.type === "quiz" ? (
        <>
          <QuizCard ctx={ctx} q={m.questions[q % m.questions.length]!} picked={picked} onPick={choose} />
          {picked !== null && !ended.current && <button className="g-btn primary" onClick={next}>{L(ctx, "ATTAQUER ▶", "ATTACK ▶")}</button>}
        </>
      ) : (
        <>
          {m.type === "wheel"
            ? <SpinningWheel ctx={ctx} m={m} disabled={ended.current} onResult={onSpin} />
            : <GaugeMeter ctx={ctx} m={m} disabled={ended.current} onResult={(zi) => onSpin(zi)} />}
          <span className="g-chip">{m.type === "wheel" ? L(ctx, "Lancers", "Spins") : L(ctx, "Essais", "Tries")} : {maxSpins - spins}</span>
        </>
      )}
    </div>
  );
}
