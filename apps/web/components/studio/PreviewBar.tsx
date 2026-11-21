"use client";

import { useState } from "react";
import { publishGame } from "@/app/studio/actions";

export default function PreviewBar({ slug, blocking }: { slug: string; blocking: string[] }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="pv-bar" role="region" aria-label="Aperçu du studio">
      <p>APERÇU</p>
      {url ? (
        <a className="st-btn go" href={url} target="_blank" rel="noopener">EN LIGNE ↗</a>
      ) : (
        <button className="st-btn go" onClick={async () => {
          const r = await publishGame(slug);
          if (r.ok && r.url) setUrl(r.url); else setErr(r.error ?? "refusé");
        }}>PUBLIER</button>
      )}
      <a className="st-btn" href="/studio">STUDIO</a>
      <button className="st-btn" onClick={() => setHidden(true)} aria-label="Masquer">✕</button>
      {(err || (!url && blocking.length > 0)) && (
        <p style={{ flexBasis: "100%", color: "#ffd479", fontFamily: "Pixelify Sans, sans-serif", fontSize: 14 }}>
          {err ?? `À régler avant publication : ${blocking.slice(0, 2).join(" · ")}`}
        </p>
      )}
    </div>
  );
}
