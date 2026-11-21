"use client";

import { useState } from "react";
import TitleScreen from "@/components/TitleScreen";
import { PRESETS } from "@/lib/presets";

export default function Gallery() {
  const [open, setOpen] = useState<number | null>(null);
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const cur = open === null ? null : PRESETS[open];

  return (
    <main className="wrap" style={{ maxWidth: 1180 }}>
      <h1 className="logo center" style={{ fontSize: 22 }}>PRESS HIRE · ÉCRANS TITRE</h1>
      <p className="center mut" style={{ fontSize: 10 }}>
        {PRESETS.length} exemples, entreprises fictives. Clique sur un écran pour le voir en grand.{" "}
        <button className="tag" onClick={() => setLang(lang === "fr" ? "en" : "fr")} style={{ cursor: "pointer", color: "inherit", font: "inherit" }}>
          {lang === "fr" ? "EN" : "FR"}
        </button>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 28, marginTop: 24 }}>
        {PRESETS.map((p, i) => (
          <figure key={i} style={{ margin: 0 }}>
            <TitleScreen {...p} lang={lang} languages={["fr"]} mode="card" onStart={() => setOpen(i)} />
            <figcaption style={{ fontSize: 9, marginTop: 10, lineHeight: 1.8 }}>
              {p.company}
              <br />
              <span className="mut">{p.note}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      {cur && (
        <TitleScreen {...cur} lang={lang} languages={["fr", "en"]} onLang={setLang} mode="full" onStart={() => setOpen(null)} />
      )}
    </main>
  );
}
