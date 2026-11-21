"use client";

import { useState, useTransition } from "react";
import type { CandidateProfile } from "@press-hire/agent";
import { saveProfileAction } from "@/app/studio/actions";

type P = CandidateProfile;
const slugId = (s: string) => "proof_" + (s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "x").slice(0, 30);

export default function ProfileForm({ initial }: { initial: P }) {
  const [p, setP] = useState<P>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof P>(k: K, v: P[K]) => setP((x) => ({ ...x, [k]: v }));
  const setProof = (i: number, patch: Partial<P["proofs"][number]>) =>
    setP((x) => ({ ...x, proofs: x.proofs.map((pr, j) => (j === i ? { ...pr, ...patch } : pr)) }));

  const save = () => start(async () => {
    const clean: P = { ...p, linkedin: p.linkedin?.trim() || undefined, proofs: p.proofs.map((pr) => ({ ...pr, id: pr.id || slugId(pr.label) })) };
    const r = await saveProfileAction(JSON.stringify(clean));
    setMsg(r.ok ? { ok: true, text: "Profil enregistré ✓" } : { ok: false, text: r.error ?? "erreur" });
  });

  return (
    <>
      <section className="st-card">
        <h2>IDENTITÉ</h2>
        <div className="st-grid">
          <label><span>NOM AFFICHÉ</span><input value={p.name} onChange={(e) => set("name", e.target.value)} /></label>
          <label><span>E-MAIL</span><input type="email" value={p.email} onChange={(e) => set("email", e.target.value)} /></label>
          <label><span>TITRE (FR)</span><input value={p.headline.fr} onChange={(e) => set("headline", { ...p.headline, fr: e.target.value })} /></label>
          <label><span>TITRE (EN)</span><input value={p.headline.en} onChange={(e) => set("headline", { ...p.headline, en: e.target.value })} /></label>
          <label><span>LIEN DU CV <em>PDF en ligne</em></span><input value={p.cv} onChange={(e) => set("cv", e.target.value)} /></label>
          <label><span>PORTFOLIO</span><input value={p.portfolio} onChange={(e) => set("portfolio", e.target.value)} /></label>
          <label className="full"><span>LINKEDIN <em>facultatif</em></span><input value={p.linkedin ?? ""} onChange={(e) => set("linkedin", e.target.value)} /></label>
        </div>
      </section>

      <section className="st-card">
        <h2>PREUVES (PROJETS)</h2>
        <p className="st-hint">L&apos;agent relie ces projets aux exigences de chaque offre, d&apos;après leur description : sois précis sur ce qu&apos;ils démontrent.</p>
        {p.proofs.map((pr, i) => (
          <div className="st-proof" key={i}>
            <label><span>NOM</span><input value={pr.label} onChange={(e) => setProof(i, { label: e.target.value })} /></label>
            <label><span>LIEN</span><input value={pr.url} onChange={(e) => setProof(i, { url: e.target.value })} /></label>
            <button className="st-btn small danger" type="button" style={{ marginTop: 22 }} onClick={() => setP((x) => ({ ...x, proofs: x.proofs.filter((_, j) => j !== i) }))}>✕</button>
            <textarea value={pr.about} onChange={(e) => setProof(i, { about: e.target.value })} placeholder="Ce que ce projet démontre (outils, compétences, résultats)…" />
          </div>
        ))}
        <div className="st-row" style={{ marginTop: 12 }}>
          <button className="st-btn small" type="button" disabled={p.proofs.length >= 12}
            onClick={() => setP((x) => ({ ...x, proofs: [...x.proofs, { id: "", label: "", url: "https://", about: "" }] }))}>+ AJOUTER UN PROJET</button>
        </div>
      </section>

      <div className="st-row">
        <button className="st-btn go" onClick={save} disabled={pending}>{pending ? "…" : "ENREGISTRER"}</button>
        {msg && <span className={msg.ok ? "st-ok" : "st-err"}>{msg.text}</span>}
      </div>
    </>
  );
}
