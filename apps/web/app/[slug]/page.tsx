import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { getCartridge } from "@/lib/cartridges";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCartridge((await params).slug);
  if (!c) return { title: "PRESS HIRE" };
  const lang = c.meta.defaultLang;
  return {
    title: c.design.title[lang],
    description: c.design.tagline[lang],
    robots: { index: false, follow: false },
  };
}

/**
 * Phase 0 : la page prouve que la cartouche est lue et validée.
 * Phase 1 : le moteur NES remplace cet aperçu.
 */
export default async function GamePage({ params }: Props) {
  const c = await getCartridge((await params).slug);
  if (!c) notFound();

  const lang = c.meta.defaultLang;
  const p = c.design.palette;
  const vars = {
    "--bg": p.bg,
    "--panel": p.panel,
    "--ink": p.ink,
    "--accent": p.accent,
    background: p.bg,
    color: p.ink,
    minHeight: "100vh",
  } as CSSProperties;

  const title = [...c.design.title[lang]];
  const levels = [...c.levels].sort((a, b) => a.order - b.order);

  return (
    <div style={vars}>
      <main className="wrap center">
        <h1 className="logo" aria-label={c.design.title[lang]}>
          {title.map((ch, i) =>
            ch === " " ? (
              <span key={i} className="sp" />
            ) : (
              <span key={i} style={{ color: p.colors[i % p.colors.length], animationDelay: `${i * 0.08}s` }}>
                {ch}
              </span>
            ),
          )}
        </h1>
        <p>{c.design.tagline[lang]}</p>
        <p className="mut blink">{lang === "fr" ? "APPUYEZ POUR JOUER" : "PRESS START"}</p>

        <section className="panel accent" style={{ textAlign: "left" }}>
          <p className="mut" style={{ fontSize: 9 }}>
            CARTOUCHE {c.meta.id} · v{c.meta.schemaVersion}
          </p>
          <p>
            {c.target.company.name} · {c.target.job.title}
          </p>
          <p>
            <span className="tag">{c.titleScreen.scene}</span>
            <span className="tag">{c.titleScreen.time}</span>
            {c.titleScreen.actors.map((a, i) => (
              <span key={i} className="tag">
                {a.type}
              </span>
            ))}
          </p>
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
            {lang === "fr" ? "Moteur de jeu : phase 1, en construction." : "Game engine: phase 1, under construction."}
          </p>
        </section>
      </main>
    </div>
  );
}
