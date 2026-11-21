"use client";

import { useEffect, useState } from "react";
import type { Ctx } from "./ui";

const isPlaceholder = (u: string) => /<|%3C/i.test(u);

export default function Ending({ ctx, score, fails, recruiter, perfectEgg, onReplay }: {
  ctx: Ctx; score: number | null; fails: number; recruiter: boolean; perfectEgg?: string; onReplay: () => void;
}) {
  const { c, t, lang } = ctx;
  const fr = lang === "fr";
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(score === null ? 0 : 0);

  // compteur de score qui défile
  useEffect(() => {
    if (score === null) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 1400);
      setShown(Math.round((score * (1 - Math.pow(1 - k, 3))) / 10) * 10);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    if (!recruiter) { ctx.chip.sfx("win"); ctx.fx.confetti(); }
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const req = (id: string) => c.analysis.requirements.find((r) => r.id === id);
  const proof = (id: string) => c.candidate.proofs.find((p) => p.id === id);

  const share = () => {
    const parts = [t(c.ending.shareCard.text)];
    if (c.ending.shareCard.showScore && score !== null) parts.push(`${fr ? "Score" : "Score"} : ${score}`);
    parts.push(typeof window !== "undefined" ? window.location.href.split("#")[0]! : "");
    navigator.clipboard?.writeText(parts.join("\n")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };

  return (
    <div className="g-ending">
      {recruiter && <p className="g-chip accent">{fr ? "MODE RECRUTEUR · l'essentiel en 30 s" : "RECRUITER MODE · the gist in 30 s"}</p>}
      <h2 className="g-ending-head">{t(c.ending.headline)}</h2>
      <p className="g-ending-who">{c.candidate.name} — {t(c.candidate.headline)}</p>

      {score !== null && (
        <div className="g-score">
          <span>SCORE</span>
          <b>{shown.toLocaleString(lang)}</b>
          <small>{fails === 0 ? (fr ? "SANS FAUTE" : "FLAWLESS") : `${fails} ${fr ? (fails > 1 ? "échecs" : "échec") : fails > 1 ? "fails" : "fail"}`}</small>
        </div>
      )}
      {recruiter && (
        <section className="g-panel">
          <h3 className="g-h3">{fr ? "CE QUE LE JEU FAIT JOUER" : "WHAT THE GAME COVERS"}</h3>
          <ol className="g-covered">
            {[...c.levels].sort((a, b) => a.order - b.order).map((l) => {
              const r = req(l.requirementId);
              return <li key={l.id}><b>{t(l.title)}</b>{r ? ` · ${t(r.label)}` : ""}</li>;
            })}
          </ol>
        </section>
      )}
      {perfectEgg && <p className="g-callout">★ {perfectEgg}</p>}

      <section className="g-panel">
        <h3 className="g-h3">{fr ? "CE QUE ÇA PROUVE, POUR DE VRAI" : "WHAT IT PROVES, FOR REAL"}</h3>
        <ul className="g-skills">
          {c.ending.skillsUnlocked.map((s, i) => {
            const r = req(s.requirementId);
            const p = proof(s.proofId);
            return (
              <li key={i} style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
                <span className="g-skill-badge">✓</span>
                <div>
                  <p className="g-skill-req">{r ? t(r.label) : s.requirementId}</p>
                  <p>{t(s.line)}</p>
                  {p && (
                    <a className="g-proof" href={p.url} target="_blank" rel="noopener noreferrer">
                      ▶ {p.label}{p.fact ? ` · ${t(p.fact)}` : ""}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="g-cta">
        {c.ending.cta.map((b, i) => {
          const off = isPlaceholder(b.url);
          const href = b.type === "contact" && !b.url.startsWith("http") && !b.url.startsWith("mailto:") ? `mailto:${b.url}` : b.url;
          return off ? (
            <span key={i} className="g-btn disabled" title={fr ? "Lien à compléter" : "Link to be filled"}>{t(b.label)}</span>
          ) : (
            <a key={i} className={`g-btn${i === 0 ? " primary" : ""}`} href={href} target="_blank" rel="noopener noreferrer">{t(b.label)}</a>
          );
        })}
      </div>

      <section className="g-share">
        <p>{t(c.ending.shareCard.text)}</p>
        <button className="g-btn small" onClick={share}>{copied ? (fr ? "COPIÉ ✓" : "COPIED ✓") : fr ? "COPIER POUR PARTAGER" : "COPY TO SHARE"}</button>
      </section>

      {c.ending.challenge && <p className="g-challenge">{t(c.ending.challenge)}</p>}

      <button className="g-btn" onClick={onReplay}>{recruiter ? (fr ? "▶ JOUER QUAND MÊME" : "▶ PLAY ANYWAY") : fr ? "↺ REJOUER" : "↺ PLAY AGAIN"}</button>
    </div>
  );
}
