import type { Metadata } from "next";
import SiteNav from "@/components/site/SiteNav";
import { listDemos } from "@/lib/cartridges";
import DemoCards from "./DemoCards";

export const metadata: Metadata = { title: "PRESS HIRE · démos", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DemosPage() {
  const demos = await listDemos();
  return (
    <>
      <SiteNav current="/demos" />
      <main className="wrap" style={{ maxWidth: 1180 }}>
        <h1 className="logo center" style={{ fontSize: 20 }}>DÉMOS JOUABLES</h1>
        <p className="center mut" style={{ fontSize: 9 }}>Des jeux complets générés depuis de vraies offres (ou fictives). Clique pour jouer.</p>
        {demos.length ? (
          <DemoCards demos={demos.map((c) => ({
            slug: c.meta.id, title: c.design.title, tagline: c.design.tagline, skin: c.design.skin, palette: c.design.palette,
            scene: { scene: c.titleScreen.scene, time: c.titleScreen.time, weather: c.titleScreen.weather, actors: c.titleScreen.actors, colors: c.design.palette.colors, accent: c.design.palette.accent, seed: c.meta.id },
            animation: c.titleScreen.logo.animation, shine: c.titleScreen.logo.shine,
            caption: `${c.target.job.title} · ${c.target.company.name}`,
            mechanics: c.levels.map((l) => l.mechanic.type).join(" · "),
          }))} />
        ) : (
          <p className="center mut">Aucune démo embarquée sur ce déploiement (variable PRESS_HIRE_FIXTURES).</p>
        )}
      </main>
    </>
  );
}
