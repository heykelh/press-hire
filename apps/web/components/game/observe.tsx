"use client";

/**
 * Mécaniques d'observation : inspection (façon Papers, Please) et enquête (façon Où est Charlie).
 * Elles font pratiquer le geste le plus fréquent des métiers de la donnée, de la conformité et de la sécurité :
 * comparer un document à une règle, repérer ce qui sort du lot.
 */
import { useEffect, useRef, useState } from "react";
import type { Level } from "@press-hire/cartridge";
import type { Ctx } from "./ui";

type M = Level["mechanic"];
type Inspection = Extract<M, { type: "inspection" }>;
type Investigation = Extract<M, { type: "investigation" }>;

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

/* ============================ INSPECTION ============================ */

export function InspectionPlay({ ctx, m, paused, onDone }: { ctx: Ctx; m: Inspection; paused: boolean; onDone: () => void }) {
  const cases = useRef([
    ...m.cases.filter((x) => !x.twist).sort(() => ctx.rand() - 0.5),
    ...m.cases.filter((x) => x.twist).sort(() => ctx.rand() - 0.5),
  ]).current;
  const [i, setI] = useState(0);
  const [marked, setMarked] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<{ choice: "accept" | "reject"; ok: boolean; spotted: boolean } | null>(null);
  const stats = useRef({ ok: 0, spotted: 0, rejects: 0 });
  const limit = m.timeLimitSec ? Math.round(m.timeLimitSec * (1 + 0.5 * (ctx.assist ?? 0))) : 0;
  const [time, setTime] = useState(limit);
  const done = useRef(false);
  const k = cases[Math.min(i, cases.length - 1)]!;

  useEffect(() => { if (cases[i]?.twist) ctx.twist?.(); }, [i, cases, ctx]);
  useEffect(() => {
    if (!limit || paused || done.current) return;
    const id = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [limit, paused]);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    const s = stats.current;
    ctx.report?.([
      { label: L(ctx, "Dossiers bien traités", "Cases handled right"), value: `${s.ok}/${cases.length}` },
      { label: L(ctx, "Champs fautifs repérés", "Faulty fields spotted"), value: `${s.spotted}/${cases.filter((x) => x.correct === "reject").length}` },
    ]);
    setTimeout(onDone, 400);
  };
  useEffect(() => {
    if (!limit || time > 0 || done.current) return;
    for (let r = verdict ? i + 1 : i; r < cases.length; r++) ctx.apply(m.onWrong);
    ctx.fx.pop(L(ctx, "GUICHET FERMÉ", "DESK CLOSED"), false);
    ctx.chip.sfx("bad");
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time]);

  const decide = (choice: "accept" | "reject") => {
    if (verdict || done.current || paused) return;
    const ok = k.correct === choice;
    const spotted = ok && choice === "reject" && marked !== null && !!k.fields[marked]?.faulty;
    ctx.apply(ok ? m.onCorrect : m.onWrong);
    if (spotted) { ctx.apply(m.onSpotted); stats.current.spotted++; }
    if (ok) stats.current.ok++;
    ctx.chip.sfx(ok ? "good" : "bad");
    ctx.fx.pop(ok ? (spotted ? L(ctx, "CONFORME + CHAMP REPÉRÉ", "RIGHT + FIELD SPOTTED") : L(ctx, "BIEN VU", "RIGHT")) : L(ctx, "ERREUR", "WRONG"), ok);
    if (!ok) ctx.fx.shake();
    ctx.combo?.(ok);
    ctx.learn?.(k.conceptId);
    setVerdict({ choice, ok, spotted });
  };
  const next = () => {
    if (!verdict) return;
    setVerdict(null);
    setMarked(null);
    if (i + 1 >= cases.length) finish(); else setI(i + 1);
  };
  useKeys(
    verdict
      ? { Enter: next, " ": next }
      : {
          ArrowRight: () => decide("accept"), ArrowLeft: () => decide("reject"), a: () => decide("accept"), r: () => decide("reject"),
          ...Object.fromEntries(k.fields.map((_, j) => [String(j + 1), () => setMarked(marked === j ? null : j)])),
        },
    !paused,
  );

  return (
    <div className="g-mech g-mech-inspection">
      <div className="g-triage-meta">
        <span className="g-chip">{ctx.t(m.document)} {i + 1}/{cases.length}</span>
        <span className="g-chip">✓ {stats.current.ok}</span>
        {limit ? <span className={`g-chip${time <= 10 ? " hot" : ""}`}>⏱ {Math.max(0, time)}s</span> : null}
      </div>
      <div className="g-desk">
        <aside className="g-rulebook">
          <b>{L(ctx, "RÈGLEMENT", "RULEBOOK")}</b>
          <ol>{m.rules.map((r, j) => <li key={j}>{ctx.t(r)}</li>)}</ol>
        </aside>
        <article key={k.id} className={`g-doc${verdict ? (verdict.ok ? " ok" : " ko") : ""}`}>
          <header>
            <small>{ctx.t(m.document).toUpperCase()}</small>
            <b>{ctx.t(k.title)}</b>
          </header>
          <ul>
            {k.fields.map((f, j) => {
              const reveal = verdict && f.faulty;
              return (
                <li key={j}>
                  <button className={`g-field${marked === j ? " marked" : ""}${reveal ? " faulty" : ""}`} onClick={() => !verdict && setMarked(marked === j ? null : j)} disabled={!!verdict}>
                    <kbd>{j + 1}</kbd>
                    <span>{ctx.t(f.label)}</span>
                    <b>{f.value}</b>
                    {marked === j && !verdict && <em>{L(ctx, "SUSPECT", "SUSPECT")}</em>}
                  </button>
                </li>
              );
            })}
          </ul>
          {verdict && (
            <div className={`g-docstamp ${verdict.choice}`}>{verdict.choice === "accept" ? L(ctx, "APPROUVÉ", "APPROVED") : L(ctx, "REFUSÉ", "DENIED")}</div>
          )}
        </article>
      </div>
      {verdict ? (
        <>
          <p className={`g-explain${verdict.ok ? " ok" : " ko"}`}><b>{verdict.ok ? "✓" : "✗"}</b> {ctx.t(k.why)}</p>
          <button className="g-btn primary" onClick={next}>{L(ctx, "DOSSIER SUIVANT ▶", "NEXT CASE ▶")}</button>
        </>
      ) : (
        <div className="g-choice-row">
          <button className="g-btn bad big" onClick={() => decide("reject")}>✗ {L(ctx, "REFUSER", "REJECT")}</button>
          <button className="g-btn good big" onClick={() => decide("accept")}>✓ {L(ctx, "VALIDER", "APPROVE")}</button>
        </div>
      )}
      {!verdict && <p className="g-rule small">{marked === null ? L(ctx, "Astuce : clique sur le champ fautif avant de refuser (bonus).", "Tip: click the faulty field before rejecting (bonus).") : L(ctx, "Champ marqué. Refuse pour tamponner.", "Field marked. Reject to stamp.")}</p>}
    </div>
  );
}

/* ============================ ENQUÊTE ============================ */

export function InvestigationPlay({ ctx, m, paused, onDone }: { ctx: Ctx; m: Investigation; paused: boolean; onDone: () => void }) {
  const [r, setR] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [state, setState] = useState<"hunt" | "found" | "missed">("hunt");
  const limit = m.timeLimitSec ? Math.round(m.timeLimitSec * (1 + 0.5 * (ctx.assist ?? 0))) : 0;
  const [time, setTime] = useState(limit);
  const found = useRef(0);
  const t0 = useRef(performance.now());
  const times = useRef<number[]>([]);
  const done = useRef(false);
  const round = m.rounds[r]!;
  const v = round.view;

  useEffect(() => {
    setWrong([]);
    setState("hunt");
    setTime(limit);
    t0.current = performance.now();
    if (r >= Math.ceil(m.rounds.length / 2) && m.rounds.length > 1) ctx.twist?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  useEffect(() => {
    if (!limit || paused || state !== "hunt") return;
    const id = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [limit, paused, state]);
  useEffect(() => {
    if (!limit || time > 0 || state !== "hunt") return;
    ctx.apply(m.onWrong);
    ctx.chip.sfx("bad");
    ctx.combo?.(false);
    ctx.learn?.(round.conceptId);
    setState("missed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time]);

  const click = (idx: number) => {
    if (state !== "hunt" || paused || wrong.includes(idx)) return;
    if (idx === round.answer) {
      found.current++;
      times.current.push((performance.now() - t0.current) / 1000);
      ctx.apply(m.onFound);
      ctx.chip.sfx("coin");
      ctx.fx.pop(L(ctx, "TROUVÉ !", "FOUND IT!"), true);
      ctx.combo?.(true);
      ctx.learn?.(round.conceptId);
      setState("found");
    } else {
      ctx.apply(m.onWrong);
      ctx.chip.sfx("bad");
      ctx.fx.shake();
      ctx.combo?.(false);
      const w = [...wrong, idx];
      setWrong(w);
      // trois erreurs : la réponse est montrée
      if (w.length >= 3) { ctx.learn?.(round.conceptId); setState("missed"); }
    }
  };
  const next = () => {
    if (state === "hunt") return;
    if (r + 1 >= m.rounds.length) {
      if (done.current) return;
      done.current = true;
      const avg = times.current.length ? times.current.reduce((a, b) => a + b, 0) / times.current.length : 0;
      ctx.report?.([
        { label: L(ctx, "Anomalies trouvées", "Anomalies found"), value: `${found.current}/${m.rounds.length}` },
        { label: L(ctx, "Temps moyen de détection", "Mean time to detect"), value: avg ? `${avg.toFixed(1)} s` : "—" },
      ]);
      onDone();
    } else setR(r + 1);
  };
  useKeys(state === "hunt" ? {} : { Enter: next, " ": next }, !paused);

  const cls = (idx: number) =>
    `${wrong.includes(idx) ? " ko" : ""}${state !== "hunt" && idx === round.answer ? " ok" : ""}`;

  let view: React.ReactNode = null;
  if (v.kind === "logs")
    view = (
      <div className="g-logs" role="list">
        {v.lines.map((line, idx) => (
          <button key={idx} role="listitem" data-idx={idx} className={`g-logline${cls(idx)}`} onClick={() => click(idx)}>
            <span>{String(idx + 1).padStart(2, "0")}</span>{line}
          </button>
        ))}
      </div>
    );
  else if (v.kind === "table")
    view = (
      <div className="g-dtable" role="table">
        <div className="g-drow head" role="row" style={{ gridTemplateColumns: `repeat(${v.columns.length}, 1fr)` }}>{v.columns.map((h, j) => <span key={j} role="columnheader">{h}</span>)}</div>
        {v.rows.map((row, idx) => (
          <button key={idx} role="row" data-idx={idx} className={`g-drow${cls(idx)}`} onClick={() => click(idx)} style={{ gridTemplateColumns: `repeat(${v.columns.length}, 1fr)` }}>
            {row.map((cell, j) => <span key={j} role="cell">{cell}</span>)}
          </button>
        ))}
      </div>
    );
  else {
    const max = Math.max(...v.values.map(Math.abs), 1e-9);
    view = (
      <div className="g-chart">
        {v.values.map((val, idx) => (
          <button key={idx} data-idx={idx} className={`g-bar2${cls(idx)}`} onClick={() => click(idx)} title={`${v.labels[idx]} : ${val}${v.unit ? " " + v.unit : ""}`}>
            <i style={{ height: `${Math.max(3, (Math.abs(val) / max) * 100)}%` }}><em>{val}</em></i>
            <span>{v.labels[idx]}</span>
          </button>
        ))}
        {v.unit && <small className="g-chart-unit">{v.unit}</small>}
      </div>
    );
  }

  return (
    <div className="g-mech g-mech-investigation">
      <div className="g-triage-meta">
        <span className="g-chip">{L(ctx, "Enquête", "Case")} {r + 1}/{m.rounds.length}</span>
        <span className="g-chip">🔍 {found.current}</span>
        {limit && state === "hunt" ? <span className={`g-chip${time <= 8 ? " hot" : ""}`}>⏱ {Math.max(0, time)}s</span> : null}
        {wrong.length > 0 && state === "hunt" && <span className="g-chip">✗ {wrong.length}/3</span>}
      </div>
      <p className="g-question">{ctx.t(round.prompt)}</p>
      <div className="g-screen g-evidence" key={round.id}>{view}</div>
      {state !== "hunt" && (
        <>
          <p className={`g-explain${state === "found" ? " ok" : " ko"}`}><b>{state === "found" ? "🔍" : "✗"}</b> {ctx.t(round.explain)}</p>
          <button className="g-btn primary" autoFocus onClick={next}>{L(ctx, "SUITE ▶", "NEXT ▶")}</button>
        </>
      )}
    </div>
  );
}
