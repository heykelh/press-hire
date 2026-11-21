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
export default function Ending({ ctx, score, fails, perfectEgg, badge, levels, stars, learned, reports, maxCombo, bossWon, onReplay }: {
  ctx: Ctx; score: number; fails: number; perfectEgg?: string; badge: boolean;
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
