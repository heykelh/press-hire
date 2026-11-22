"use client";

import { useEffect, useState } from "react";
import type { Level } from "@press-hire/cartridge";
import { rankIndex, ranksOf, shareGrid } from "./progress";
import { ConceptCard, Stars } from "./story";
import type { Ctx } from "./ui";

/**
 * Fin de partie : grade, score, rapport de la semaine (vrais indicateurs du métier),
 * cartes métier à retourner, grille à partager façon Wordle.
 */
export default function Ending({ ctx, score, fails, perfectEgg, badge, levels, stars, learned, reports, maxCombo, bossWon, onReplay, slug, canSubmit = false }: {
  ctx: Ctx; score: number; fails: number; perfectEgg?: string; badge: boolean; slug: string; canSubmit?: boolean;
  levels: Level[]; stars: Record<string, number>; learned: string[];
  reports: Record<string, Array<{ label: string; value: string }>>; maxCombo: number; bossWon: boolean;
  onReplay: () => void;
}) {
  const { c, t, lang } = ctx;
  const fr = lang === "fr";
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(0);
  const total = Object.values(stars).reduce((a, b) => a + b, 0);
  const rank = t(ranksOf(c)[rankIndex(total, levels.length * 3)]!);

  // compteur de score qui défile
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 1400);
      setShown(Math.round((score * (1 - Math.pow(1 - k, 3))) / 10) * 10);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    ctx.chip.sfx("win");
    ctx.fx.confetti();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const req = (id: string) => c.analysis.requirements.find((r) => r.id === id);
  const url = typeof window !== "undefined" ? window.location.href.split("#")[0]! : "";
  const grid = shareGrid({
    title: t(c.design.title), rank, stars, levels, boss: !!c.boss, bossWon,
    cards: learned.length, cardsTotal: c.concepts.length, score, url, lang,
  });
  const share = () => {
    navigator.clipboard?.writeText(`${t(c.ending.shareCard.text)}\n${grid}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };

  // missions jouées : celles de la fin, sinon celles des niveaux
  const recap = c.ending.skillsUnlocked.length
    ? c.ending.skillsUnlocked.map((s) => ({ label: req(s.requirementId) ? t(req(s.requirementId)!.label) : s.requirementId, line: t(s.line) }))
    : levels.map((l) => ({ label: req(l.requirementId) ? t(req(l.requirementId)!.label) : t(l.title), line: t(l.winLine) }));

  return (
    <div className="g-ending">
      <h2 className="g-ending-head">{t(c.ending.headline)}</h2>
      {c.story?.epilogue && <p className="g-epilogue">{t(c.story.epilogue)}</p>}

      <div className="g-badge-row">
        <div className="g-rank">
          <span>{fr ? "GRADE OBTENU" : "RANK"}</span>
          <b>{rank}</b>
          <Stars n={Math.round((total / Math.max(1, levels.length * 3)) * 3)} />
        </div>
        <div className="g-score">
          <span>SCORE</span>
          <b>{shown.toLocaleString(lang)}</b>
          <small>{fails === 0 ? (fr ? "SANS FAUTE" : "FLAWLESS") : `${fails} ${fr ? (fails > 1 ? "échecs" : "échec") : fails > 1 ? "fails" : "fail"}`} · COMBO ×{maxCombo}</small>
        </div>
      </div>
      {perfectEgg && <p className="g-callout">★ {perfectEgg}</p>}
      <HighScores ctx={ctx} slug={slug} score={score} canSubmit={canSubmit} />
      {c.about && (
        <section className="g-panel g-about">
          <h3 className="g-h3">{fr ? `CLINS D'ŒIL À ${c.about.company.toUpperCase()}` : `NODS TO ${c.about.company.toUpperCase()}`}</h3>
          <ul>
            {c.about.facts.map((f, i) => (
              <li key={i}>{t(f.text)} <a href={f.source} target="_blank" rel="noopener noreferrer nofollow">{fr ? "source" : "source"} ↗</a></li>
            ))}
          </ul>
        </section>
      )}

      <section className="g-panel">
        <h3 className="g-h3">{fr ? "RAPPORT DE LA SEMAINE" : "WEEKLY REPORT"}</h3>
        <ul className="g-report">
          {levels.map((l) => (
            <li key={l.id}>
              <div className="g-report-head">
                <span>{l.day ? <em>{t(l.day)}</em> : null}<b>{t(l.title)}</b></span>
                <Stars n={stars[l.id] ?? 0} />
              </div>
              {reports[l.id] && <p>{reports[l.id]!.map((r) => `${r.label} ${r.value}`).join(" · ")}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="g-panel">
        <h3 className="g-h3">{fr ? "CE QUE TU VIENS DE JOUER" : "WHAT YOU JUST PLAYED"}</h3>
        <ul className="g-skills">
          {recap.map((s, i) => (
            <li key={i} style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
              <span className="g-skill-badge">✓</span>
              <div>
                <p className="g-skill-req">{s.label}</p>
                <p>{s.line}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {c.concepts.length > 0 && (
        <section className="g-panel">
          <h3 className="g-h3">📘 {fr ? "CARTES MÉTIER" : "JOB CARDS"} {learned.length}/{c.concepts.length}</h3>
          <div className="g-cards">
            {c.concepts.map((x) => <ConceptCard key={x.id} ctx={ctx} concept={x} owned={learned.includes(x.id)} />)}
          </div>
        </section>
      )}

      <section className="g-share">
        <pre className="g-grid">{grid.split("\n").slice(0, 3).join("\n")}</pre>
        <button className="g-btn small" onClick={share}>{copied ? (fr ? "COPIÉ ✓" : "COPIED ✓") : fr ? "COPIER MON RÉSULTAT" : "COPY MY RESULT"}</button>
      </section>

      {c.ending.challenge && <p className="g-challenge">{t(c.ending.challenge)}</p>}

      <button className="g-btn primary" onClick={onReplay}>{fr ? "↺ REJOUER POUR 3 ÉTOILES" : "↺ REPLAY FOR 3 STARS"}</button>
      {badge && <a className="g-made" href="/" target="_blank" rel="noopener">{fr ? "Fait avec" : "Made with"} PRESS HIRE</a>}
    </div>
  );
}

/* ------------- tableau des meilleurs scores (3 initiales) ------------- */

type ScoreRow = { initials: string; score: number };
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function HighScores({ ctx, slug, score, canSubmit }: { ctx: Ctx; slug: string; score: number; canSubmit: boolean }) {
  const fr = ctx.lang === "fr";
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  const [letters, setLetters] = useState([0, 0, 0]);
  const [pos, setPos] = useState(0);
  const [sent, setSent] = useState<{ rank: number | null; initials: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!canSubmit) return;
    fetch(`/api/score?slug=${encodeURIComponent(slug)}`).then((r) => r.json()).then((d) => setRows(d.scores ?? [])).catch(() => setRows([]));
  }, [slug, canSubmit]);

  const initials = letters.map((i) => ABC[i]).join("");
  const qualifies = rows !== null && (rows.length < 10 || score > (rows[rows.length - 1]?.score ?? 0));

  const submit = async () => {
    if (sent) return;
    setErr(null);
    try {
      let sid = sessionStorage.getItem("ph_sid");
      if (!sid) { sid = Math.random().toString(36).slice(2, 12); sessionStorage.setItem("ph_sid", sid); }
      const r = await fetch("/api/score", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, initials, score, sid }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? "erreur"); return; }
      setRows(d.scores ?? []);
      setSent({ rank: d.rank ?? null, initials });
      ctx.chip.jingle("hiscore");
    } catch {
      setErr(fr ? "réseau indisponible" : "network unavailable");
    }
  };

  // saisie façon borne : ▲ ▼ change la lettre, ◀ ▶ change de case, Entrée valide ; on peut aussi taper au clavier
  useEffect(() => {
    if (!canSubmit || sent || !qualifies) return;
    const k = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === "ARROWUP" || key === "ARROWDOWN") {
        e.preventDefault();
        setLetters((l) => l.map((v, i) => (i === pos ? (v + (key === "ARROWUP" ? 1 : ABC.length - 1)) % ABC.length : v)));
      } else if (key === "ARROWRIGHT") setPos((p) => Math.min(2, p + 1));
      else if (key === "ARROWLEFT") setPos((p) => Math.max(0, p - 1));
      else if (key === "ENTER") void submit();
      else if (key.length === 1 && ABC.includes(key)) {
        setLetters((l) => l.map((v, i) => (i === pos ? ABC.indexOf(key) : v)));
        setPos((p) => Math.min(2, p + 1));
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSubmit, sent, qualifies, pos, letters]);

  if (!canSubmit)
    return (
      <section className="g-panel g-hiscore">
        <h3 className="g-h3">{fr ? "MEILLEURS SCORES" : "HIGH SCORES"}</h3>
        <p className="g-dim">{fr ? "Le tableau des scores s'ouvre quand le jeu est publié." : "The high-score table opens once the game is published."}</p>
      </section>
    );

  const bump = (i: number, d: number) => setLetters((l) => l.map((v, k) => (k === i ? (v + d + ABC.length) % ABC.length : v)));
  return (
    <section className="g-panel g-hiscore">
      <h3 className="g-h3">{fr ? "MEILLEURS SCORES" : "HIGH SCORES"}</h3>
      {!sent && qualifies && (
        <div className="g-initials">
          <p>{fr ? "NOUVEAU RECORD ! ENTRE TES INITIALES" : "NEW HIGH SCORE! ENTER YOUR INITIALS"}</p>
          <div className="g-initials-row">
            {letters.map((v, i) => (
              <div key={i} className={`g-initial${i === pos ? " on" : ""}`} onClick={() => setPos(i)}>
                <button type="button" onClick={() => bump(i, 1)} aria-label="lettre suivante">▲</button>
                <b>{ABC[v]}</b>
                <button type="button" onClick={() => bump(i, -1)} aria-label="lettre précédente">▼</button>
              </div>
            ))}
            <button type="button" className="g-btn primary" onClick={() => void submit()}>OK</button>
          </div>
          {err && <p className="g-hint">⚠ {err}</p>}
        </div>
      )}
      {rows === null ? <p className="g-dim">…</p> : rows.length === 0 && !sent ? (
        <p className="g-dim">{fr ? "Personne encore. Tu peux être le premier." : "Nobody yet. Be the first."}</p>
      ) : (
        <ol className="g-hitable">
          {rows.map((r, i) => (
            <li key={i} className={sent && i === rows.findIndex((x) => x.initials === sent.initials && x.score === score) ? "me" : ""}>
              <span>{String(i + 1).padStart(2, "0")}</span><b>{r.initials}</b><span>{String(r.score).padStart(6, "0")}</span>
            </li>
          ))}
        </ol>
      )}
      {sent && sent.rank && sent.rank > 10 && <p className="g-dim">{fr ? `Ton rang : ${sent.rank}e` : `Your rank: #${sent.rank}`}</p>}
    </section>
  );
}
