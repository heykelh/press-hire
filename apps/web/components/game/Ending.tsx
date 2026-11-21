"use client";

import { useEffect, useState } from "react";
import type { Ctx } from "./ui";

export default function Ending({ ctx, score, fails, perfectEgg, badge, onReplay }: {
  ctx: Ctx; score: number; fails: number; perfectEgg?: string; badge: boolean; onReplay: () => void;
}) {
  const { c, t, lang } = ctx;
  const fr = lang === "fr";
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(0);

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

  const share = () => {
    const parts = [t(c.ending.shareCard.text)];
    if (c.ending.shareCard.showScore) parts.push(`Score : ${score}`);
    parts.push(window.location.href.split("#")[0]!);
    navigator.clipboard?.writeText(parts.join("\n")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };

  // récapitulatif : missions de la fin, sinon celles des niveaux
  const recap = c.ending.skillsUnlocked.length
    ? c.ending.skillsUnlocked.map((s) => ({ label: req(s.requirementId) ? t(req(s.requirementId)!.label) : s.requirementId, line: t(s.line) }))
    : [...c.levels].sort((a, b) => a.order - b.order).map((l) => ({ label: req(l.requirementId) ? t(req(l.requirementId)!.label) : t(l.title), line: t(l.winLine) }));

  return (
    <div className="g-ending">
      <h2 className="g-ending-head">{t(c.ending.headline)}</h2>
      <p className="g-ending-who">{c.target.job.title} · {c.target.company.name}</p>

      <div className="g-score">
        <span>SCORE</span>
        <b>{shown.toLocaleString(lang)}</b>
        <small>{fails === 0 ? (fr ? "SANS FAUTE" : "FLAWLESS") : `${fails} ${fr ? (fails > 1 ? "échecs" : "échec") : fails > 1 ? "fails" : "fail"}`}</small>
      </div>
      {perfectEgg && <p className="g-callout">★ {perfectEgg}</p>}

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

      <section className="g-share">
        <p>{t(c.ending.shareCard.text)}</p>
        <button className="g-btn small" onClick={share}>{copied ? (fr ? "COPIÉ ✓" : "COPIED ✓") : fr ? "COPIER POUR PARTAGER" : "COPY TO SHARE"}</button>
      </section>

      {c.ending.challenge && <p className="g-challenge">{t(c.ending.challenge)}</p>}

      <button className="g-btn primary" onClick={onReplay}>{fr ? "↺ REJOUER" : "↺ PLAY AGAIN"}</button>
      {badge && <a className="g-made" href="/" target="_blank" rel="noopener">{fr ? "Fait avec" : "Made with"} PRESS HIRE</a>}
    </div>
  );
}
