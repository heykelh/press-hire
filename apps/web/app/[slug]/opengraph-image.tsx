import { ImageResponse } from "next/og";
import { getCartridge } from "@/lib/cartridges";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Un jeu rétro PRESS HIRE";

/** Image d'aperçu du lien (LinkedIn, e-mail, messageries) aux couleurs du jeu. */
export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const c = await getCartridge((await params).slug);
  const title = c?.design.title.fr ?? "PRESS HIRE";
  const tagline = c?.design.tagline.fr ?? "Insert coin";
  const p = c?.design.palette ?? { bg: "#0a0b1e", ink: "#ffffff", accent: "#1b9fe0", colors: ["#1b9fe0", "#c8107e", "#ffb612", "#82be00"] };
  const job = c ? `${c.target.job.title} · ${c.target.company.name}` : "";
  const blocks = Array.from({ length: 30 }, (_, i) => p.colors[(i * 7) % p.colors.length]!);
  const dark = parseInt(p.bg.slice(1, 3), 16) + parseInt(p.bg.slice(3, 5), 16) + parseInt(p.bg.slice(5, 7), 16) < 380;
  const ink = dark ? "#ffffff" : "#111111";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: p.bg, padding: 56, position: "relative" }}>
        <div style={{ display: "flex", gap: 0, position: "absolute", left: 0, right: 0, bottom: 0, height: 40 }}>
          {blocks.map((col, i) => <div key={i} style={{ width: 40, height: i % 3 === 0 ? 40 : 24, marginTop: i % 3 === 0 ? 0 : 16, background: col }} />)}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: p.accent, letterSpacing: 6, fontWeight: 700 }}>▶ PRESS START</div>
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 40, fontSize: title.length > 18 ? 96 : 124, fontWeight: 900, lineHeight: 1, color: ink, textShadow: `8px 8px 0 ${p.accent}`, letterSpacing: 2 }}>
          {title.toUpperCase()}
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 40, color: ink, opacity: 0.9, maxWidth: 1000 }}>{tagline}</div>
        <div style={{ display: "flex", marginTop: "auto", marginBottom: 40, fontSize: 28, color: ink, opacity: 0.7 }}>{job ? `Un jeu de candidature · ${job}` : ""}</div>
      </div>
    ),
    size,
  );
}
