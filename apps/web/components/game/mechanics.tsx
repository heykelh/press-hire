"use client";

import { useEffect, useRef, useState } from "react";
import type { Boss, Character, Effect, Level } from "@press-hire/cartridge";
import { evalCurve } from "@press-hire/cartridge";
import { brakeDistance, easeOutCubic, pickWeighted, sliceAt, slices, targetRotation } from "@press-hire/engine";
import { BossSprite, deltaText, Portrait, type Ctx } from "./ui";

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

export function Mechanic({ ctx, m, character, onDone }: { ctx: Ctx; m: M; character?: Character; onDone: () => void }) {
  switch (m.type) {
    case "wheel": return <WheelPlay ctx={ctx} m={m} onDone={onDone} />;
    case "slider": return <SliderPlay ctx={ctx} m={m} onDone={onDone} />;
    case "triage": return <TriagePlay ctx={ctx} m={m} onDone={onDone} />;
    case "quiz": return <QuizPlay ctx={ctx} m={m} onDone={onDone} />;
    case "dialogue": return <DialoguePlay ctx={ctx} m={m} character={character} onDone={onDone} />;
  }
}

/* ======================= ROUE ======================= */

const TAU = Math.PI * 2;

export function WheelCanvas({ m, rot, pointerColor }: { m: Wheel; rot: number; pointerColor: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sl = slices(m.segments.map((s) => s.weight));
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext("2d")!;
    const S = 200, R = 92, cx = S / 2, cy = S / 2 + 6;
    g.clearRect(0, 0, S, S);
    g.imageSmoothingEnabled = false;
    // ombre et anneau
    g.fillStyle = "rgba(0,0,0,.45)";
    g.beginPath(); g.arc(cx + 4, cy + 5, R + 6, 0, TAU); g.fill();
    g.fillStyle = "#111";
    g.beginPath(); g.arc(cx, cy, R + 6, 0, TAU); g.fill();
    m.segments.forEach((seg, i) => {
      const s = sl[i]!;
      // angle 0 = pointeur en haut, sens horaire
      const a0 = s.start + rot - Math.PI / 2, a1 = s.end + rot - Math.PI / 2;
      g.fillStyle = seg.color;
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a1); g.closePath(); g.fill();
      g.strokeStyle = "#111"; g.lineWidth = 2; g.stroke();
      const mid = (a0 + a1) / 2;
      // texte le long du rayon : tient aussi dans les cases étroites
      g.save();
      g.translate(cx, cy);
      g.rotate(mid);
      g.font = `${s.end - s.start < 0.5 ? 6 : 8}px 'Press Start 2P', monospace`;
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = "#000"; g.fillText(seg.code, R * 0.6 + 1, 1);
      g.fillStyle = "#fff"; g.fillText(seg.code, R * 0.6, 0);
      g.restore();
    });
    // lumières de l'anneau
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      g.fillStyle = i % 2 ? "#ffe04a" : "#fff7c0";
      g.fillRect(Math.round(cx + Math.cos(a) * (R + 3)) - 1, Math.round(cy + Math.sin(a) * (R + 3)) - 1, 3, 3);
    }
    // moyeu
    g.fillStyle = "#111"; g.beginPath(); g.arc(cx, cy, 17, 0, TAU); g.fill();
    // pointeur
    g.fillStyle = "#111";
    g.beginPath(); g.moveTo(cx - 11, 0); g.lineTo(cx + 11, 0); g.lineTo(cx, 20); g.closePath(); g.fill();
    g.fillStyle = pointerColor;
    g.beginPath(); g.moveTo(cx - 7, 2); g.lineTo(cx + 7, 2); g.lineTo(cx, 15); g.closePath(); g.fill();
  }, [m, rot, pointerColor, sl]);
  return <canvas ref={ref} width={200} height={200} className="g-wheel" aria-hidden="true" />;
}

/** Roue jouable : renvoie l'index de la case obtenue via onResult. */
export function SpinningWheel({ ctx, m, disabled, onResult }: { ctx: Ctx; m: Wheel; disabled?: boolean; onResult: (i: number) => void }) {
  const [rot, setRot] = useState(0);
  const [mode, setMode] = useState<"idle" | "free" | "brake" | "spin">(m.stop === "timing" ? "free" : "idle");
  const anim = useRef({ from: 0, to: 0, t0: 0, dur: 0, rot: 0, last: 0 });
  const sl = slices(m.segments.map((s) => s.weight));
  const lastSlice = useRef(-1);

  useEffect(() => {
    if (mode === "idle") return;
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const a = anim.current;
      if (mode === "free") {
        const dt = a.last ? (now - a.last) / 1000 : 0;
        a.last = now;
        a.rot += dt * 3.6; // ≈ 0,57 tour/s
      } else {
        const k = Math.min(1, (now - a.t0) / a.dur);
        a.rot = a.from + (a.to - a.from) * easeOutCubic(k);
        if (k >= 1) {
          cancelAnimationFrame(raf);
          setRot(a.rot);
          a.last = 0;
          const i = sliceAt(sl, a.rot);
          setMode(m.stop === "timing" ? "free" : "idle");
          onResult(i);
          return;
        }
      }
      const cur = sliceAt(sl, a.rot);
      if (cur !== lastSlice.current) { lastSlice.current = cur; if (mode !== "free") ctx.chip.sfx("tick"); }
      setRot(a.rot);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const go = () => {
    if (disabled) return;
    const a = anim.current;
    ctx.chip.sfx("click");
    if (m.stop === "random") {
      if (mode !== "idle") return;
      const i = pickWeighted(m.segments.map((s) => s.weight), ctx.rand);
      a.from = a.rot; a.to = targetRotation(sl, i, a.rot, 3 + Math.floor(ctx.rand() * 2), ctx.rand);
      a.t0 = performance.now(); a.dur = 2800;
      setMode("spin");
    } else {
      if (mode !== "free") return;
      a.from = a.rot; a.to = a.rot + brakeDistance(m.segments.length);
      a.t0 = performance.now(); a.dur = 900;
      setMode("brake");
    }
  };
  useKeys({ " ": go, Enter: go }, !disabled);

  const busy = mode === "spin" || mode === "brake";
  const label = m.stop === "random" ? "GO!" : "STOP!";
  return (
    <div className="g-wheel-wrap" data-rot={rot.toFixed(3)}>
      <WheelCanvas m={m} rot={rot} pointerColor={ctx.c.design.palette.accent} />
      <button className="g-hub" onClick={go} disabled={disabled || busy || (m.stop === "random" && mode !== "idle")}>{label}</button>
    </div>
  );
}

function WheelPlay({ ctx, m, onDone }: { ctx: Ctx; m: Wheel; onDone: () => void }) {
  const [left, setLeft] = useState(m.spins);
  const [last, setLast] = useState<number | null>(null);
  const toward = (effects: Effect[]) => effects.reduce((t, e) => t + (e.op === "add" ? e.value : 0), 0);
  const onResult = (i: number) => {
    const seg = m.segments[i]!;
    setLast(i);
    play(ctx, seg.effects, toward(seg.effects) >= 0);
    const n = left - 1;
    setLeft(n);
    if (n <= 0) setTimeout(onDone, 1300);
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
      if (round >= m.rounds) onDone(); else setRound(round + 1);
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

function TriagePlay({ ctx, m, onDone }: { ctx: Ctx; m: Triage; onDone: () => void }) {
  const items = useRef([...m.items].sort(() => ctx.rand() - 0.5)).current;
  const [i, setI] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; why: string } | null>(null);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(m.timeLimitSec ?? 0);
  const done = useRef(false);

  const finish = () => { if (!done.current) { done.current = true; setTimeout(onDone, 400); } };

  useEffect(() => {
    if (!m.timeLimitSec) return;
    const id = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [m.timeLimitSec]);
  useEffect(() => {
    if (!m.timeLimitSec || time > 0 || done.current) return;
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
    if (ok) setScore((s) => s + 1);
    play(ctx, ok ? m.onCorrect : m.onWrong, ok);
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
        {m.timeLimitSec ? <span className={`g-chip${time <= 5 ? " hot" : ""}`}>⏱ {Math.max(0, time)}s</span> : null}
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
  const choose = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    play(ctx, k === cur.correctIndex ? m.onCorrect : m.onWrong, k === cur.correctIndex);
  };
  const next = () => {
    if (picked === null) return;
    setPicked(null);
    if (q + 1 >= m.questions.length) onDone(); else setQ(q + 1);
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
    play(ctx, ch.effects, sum >= 0);
  };
  const next = () => {
    if (choice === null) return;
    setChoice(null);
    if (n + 1 >= m.nodes.length) onDone(); else setN(n + 1);
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
  const m = boss.mechanic;
  const maxSpins = m.type === "wheel" ? Math.max(m.spins, boss.hp + LIVES) : 0;

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
    if (m.type !== "wheel") return;
    const seg = m.segments[i]!;
    const sum = seg.effects.reduce((t, e) => t + (e.op === "add" ? e.value : 0), 0);
    const r = hit(sum > 0, seg.effects);
    const s = spins + 1; setSpins(s);
    check(r.nh, r.nl, s >= maxSpins);
  };

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
          <SpinningWheel ctx={ctx} m={m} disabled={ended.current} onResult={onSpin} />
          <span className="g-chip">{L(ctx, "Lancers", "Spins")} : {maxSpins - spins}</span>
        </>
      )}
    </div>
  );
}
