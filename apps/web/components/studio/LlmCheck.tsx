"use client";

import { useState } from "react";

type R = { name: string; ok: boolean; ms: number; error?: string };

/** Bouton « tester les modèles » : vérifie en 20 secondes quels fournisseurs répondent maintenant. */
export default function LlmCheck() {
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<R[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/studio/llm-check");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? r.status);
      setRows(j.results);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="st-card">
      <div className="st-row">
        <h2 style={{ margin: 0 }}>MODÈLES</h2>
        <button className="st-btn small" onClick={run} disabled={busy}>{busy ? "TEST EN COURS…" : "TESTER LES MODÈLES"}</button>
        <span className="st-hint" style={{ margin: 0 }}>Essayés dans cet ordre ; un modèle en panne est sauté automatiquement.</span>
      </div>
      {err && <p className="st-err">{err}</p>}
      {rows && (
        rows.length ? (
          <table className="st-table" style={{ marginTop: 10 }}>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name}>
                  <td className="num">{i + 1}</td>
                  <td>{r.name}</td>
                  <td>{r.ok ? <span className="st-chip live">OK</span> : <span className="st-chip archived">KO</span>}</td>
                  <td className="num">{(r.ms / 1000).toFixed(1)} s</td>
                  <td className={r.ok ? "" : "st-err"}>{r.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="st-err">Aucun modèle configuré : ajoute GEMINI_API_KEY et/ou QWEN_API_KEY sur Vercel.</p>
      )}
    </section>
  );
}
