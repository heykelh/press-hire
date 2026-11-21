"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { publishGame } from "@/app/studio/actions";

type Line = { kind: "s" | "w" | "f" | "d"; text: string };
type Done = { slug: string; title: string; warnings: string[]; profileIncomplete: boolean };

export default function NewGame() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [done, setDone] = useState<Done | null>(null);
  const [published, setPublished] = useState<string | null>(null);
  const [pubError, setPubError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const push = (l: Line) => {
    setLines((x) => [...x, l]);
    requestAnimationFrame(() => logRef.current?.scrollTo({ top: 1e6 }));
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v));
    if (!body.offerUrl && !body.offerText) {
      push({ kind: "f", text: "Il faut le lien de l'offre ou son texte." });
      return;
    }
    setBusy(true); setLines([]); setDone(null); setPublished(null); setPubError(null);
    push({ kind: "s", text: "> INSERT COIN… génération lancée" });
    try {
      const res = await fetch("/api/studio/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `erreur ${res.status}` }));
        push({ kind: "f", text: `✗ ${err.error ?? res.status}` });
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const raw = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!raw.trim()) continue;
          const ev = JSON.parse(raw);
          if (ev.type === "step") push({ kind: "s", text: `> ${ev.message}` });
          else if (ev.type === "warn") push({ kind: "w", text: `! ${ev.message}` });
          else if (ev.type === "fail") {
            push({ kind: "f", text: `✗ ${ev.message}` });
            for (const i of ev.issues ?? []) push({ kind: "f", text: `   [${i.rule}] ${i.path} : ${i.message}` });
          } else if (ev.type === "done") {
            push({ kind: "d", text: `★ « ${ev.title} » est prêt (brouillon). ${ev.attempts > 1 ? `${ev.attempts} passes.` : ""}` });
            for (const w of ev.warnings ?? []) push({ kind: "w", text: `! ${w}` });
            setDone(ev);
            router.refresh();
          }
        }
      }
    } catch (err) {
      push({ kind: "f", text: `✗ connexion coupée : ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!done) return;
    setPubError(null);
    const r = await publishGame(done.slug);
    if (r.ok && r.url) { setPublished(r.url); router.refresh(); }
    else setPubError(r.error ?? "publication refusée");
  }

  return (
    <section className="st-card">
      <h2>NOUVEAU JEU</h2>
      <form onSubmit={submit} className="st-grid">
        <label className="full">
          <span>LIEN DE L&apos;OFFRE</span>
          <input name="offerUrl" type="url" placeholder="https://… (APEC, Welcome to the Jungle, site carrière…)" />
        </label>
        <label className="full">
          <span>TEXTE DE L&apos;OFFRE <em>si le site demande une connexion</em></span>
          <textarea name="offerText" placeholder="Colle ici le texte complet de l'offre (missions, profil, entreprise)…" />
        </label>
        <label>
          <span>ENTREPRISE</span>
          <input name="company" placeholder="déduite de l'offre si vide" />
        </label>
        <label>
          <span>POSTE</span>
          <input name="jobTitle" placeholder="déduit de l'offre si vide" />
        </label>
        <label>
          <span>DÉCIDEUR VISÉ <em>jamais affiché</em></span>
          <input name="contactName" placeholder="Prénom Nom" />
        </label>
        <label>
          <span>SON RÔLE</span>
          <input name="contactRole" placeholder="Head of Data…" />
        </label>
        <label className="full">
          <span>CONSIGNES POUR CE JEU <em>facultatif</em></span>
          <textarea name="notes" style={{ minHeight: 70 }} placeholder="Ex. : insiste sur SQL et la gouvernance, ton sobre, un boss sur la dette technique…" />
        </label>
        <div className="full st-row">
          <button className="st-btn go" disabled={busy}>{busy ? "GÉNÉRATION…" : "GÉNÉRER LE JEU ▶"}</button>
          <span className="st-hint">30 s à 2 min. Le jeu est créé en brouillon : tu le testes avant de publier.</span>
        </div>
      </form>

      {lines.length > 0 && (
        <div className="st-log" ref={logRef} aria-live="polite">
          {lines.map((l, i) => <p key={i} className={`${l.kind}${busy && i === lines.length - 1 ? " cur" : ""}`}>{l.text}</p>)}
        </div>
      )}

      {done && (
        <div className="st-row" style={{ marginTop: 14 }}>
          <a className="st-btn blue" href={`/studio/apercu/${done.slug}`} target="_blank" rel="noopener">▶ JOUER L&apos;APERÇU</a>
          {!published && <button className="st-btn go" onClick={publish}>PUBLIER</button>}
          {published && <PublishedLink url={published} />}
        </div>
      )}
      {done?.profileIncomplete && !published && <p className="st-hint">Complète ton profil avant de publier (nom, e-mail, CV).</p>}
      {pubError && <p className="st-err">{pubError}</p>}
    </section>
  );
}

export function PublishedLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="st-row">
      <a href={url} target="_blank" rel="noopener" className="st-ok">{url}</a>
      <button className="st-btn small" type="button" onClick={() => navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>
        {copied ? "COPIÉ ✓" : "COPIER"}
      </button>
    </span>
  );
}
