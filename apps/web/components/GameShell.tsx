"use client";

import { useState } from "react";
import type { Cartridge } from "@press-hire/cartridge";
import TitleScreen from "./TitleScreen";

/**
 * Coquille du jeu : écran titre, puis (phase 1b) les niveaux.
 * En attendant les mécaniques, « start » ouvre le sommaire de la cartouche.
 */
export default function GameShell({ c }: { c: Cartridge }) {
  const [lang, setLang] = useState(c.meta.defaultLang);
  const [started, setStarted] = useState(false);
  const p = c.design.palette;
  const ts = c.titleScreen;

  if (!started)
    return (
      <TitleScreen
        title={c.design.title}
        tagline={c.design.tagline}
        skin={c.design.skin}
        palette={p}
        scene={{
          scene: ts.scene,
          time: ts.time,
          weather: ts.weather,
          actors: ts.actors,
          colors: p.colors,
          accent: p.accent,
          seed: c.meta.id,
          detail: ts.detail ? { label: ts.detail.label[lang], value: ts.detail.value } : undefined,
        }}
        animation={ts.logo.animation}
        shine={ts.logo.shine}
        lang={lang}
        languages={c.meta.languages}
        onLang={setLang}
        onStart={() => setStarted(true)}
        badge={c.target.company.sector.toUpperCase()}
      />
    );

  const levels = [...c.levels].sort((a, b) => a.order - b.order);
  return (
    <main className="wrap crt" style={{ background: p.bg, color: p.ink, minHeight: "100vh", maxWidth: "none" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <button className="tag" onClick={() => setStarted(false)} style={{ cursor: "pointer", color: "inherit", font: "inherit" }}>
          ◂ {lang === "fr" ? "Écran titre" : "Title screen"}
        </button>
        <section className="panel accent">
          <p>{c.design.title[lang]}</p>
          <ol className="levels">
            {levels.map((l) => (
              <li key={l.id}>
                {l.title[lang]} <span className="tag">{l.mechanic.type}</span>
              </li>
            ))}
            {c.boss && (
              <li>
                BOSS : {c.boss.name[lang]} <span className="tag">{c.boss.mechanic.type}</span>
              </li>
            )}
          </ol>
          <p className="mut" style={{ fontSize: 9 }}>
            {lang === "fr" ? "Les niveaux jouables arrivent avec la suite de la phase 1." : "Playable levels arrive with the rest of phase 1."}
          </p>
        </section>
      </div>
    </main>
  );
}
