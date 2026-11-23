"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { publishGame } from "@/app/studio/actions";
import IdeaFields, { ideaBody } from "./IdeaFields";

type Line = { kind: "s" | "w" | "f" | "d" | "t"; text: string };
type Done = { slug: string; title: string; warnings: string[]; mechanics: string[] };

export default function NewGame() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [done, setDone] = useState<Done | null>(null);
  const [published, setPublished] = useState<string | null>(null);
  const [pubError, setPubError] = useState<string | null>(null);
  const [mode, setMode] = useState<"offer" | "idea">("offer");
  const logRef = useRef<HTMLDivElement>(null);

  const push = (l: Line) => {
    setLines((x) => [...x, l]);
    requestAnimationFrame(() => logRef.current?.scrollTo({ top: 1e6 }));
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    let body: Record<string, unknown>;
    if (mode === "idea") {
      const r = ideaBody(fd);
      if ("error" in r) { setLines([{ kind: "f", text: String(r.error) }]); return; }
      body = r;
    } else {
      body = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v));
      if (!body.offerUrl && !body.offerText) {
        setLines([{ kind: "f", text: "Il faut le lien de l'offre ou son texte." }]);
        return;
      }
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
      let ended = false; // un message de fin (réussite ou échec) est arrivé
      // plus aucune nouvelle du serveur pendant 90 s (il envoie un signe de vie toutes les 20 s) : connexion morte
      let quiet: ReturnType<typeof setTimeout> | undefined;
      const arm = () => { clearTimeout(quiet); quiet = setTimeout(() => reader.cancel("silence").catch(() => {}), 90_000); };
      arm();
      for (;;) {
        const { value, done: end } = await reader.read();
        arm();
        if (end) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const raw = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!raw.trim()) continue;
          const ev = JSON.parse(raw);
          if (ev.type === "wait") {
            // une seule ligne « toujours en cours », mise à jour sur place
            setLines((x) => (x.at(-1)?.kind === "t" ? [...x.slice(0, -1), { kind: "t", text: `  ${ev.message}` }] : [...x, { kind: "t", text: `  ${ev.message}` }]));
            continue;
          }
          if (ev.type === "step") push({ kind: "s", text: `> ${ev.message}` });
          else if (ev.type === "warn") push({ kind: "w", text: `! ${String(ev.message).slice(0, 220)}` });
          else if (ev.type === "fail") {
            ended = true;
            push({ kind: "f", text: `✗ ${ev.message}` });
            for (const i of ev.issues ?? []) push({ kind: "f", text: `   [${i.rule}] ${i.path} : ${i.message}` });
          } else if (ev.type === "done") {
            ended = true;
            push({ kind: "d", text: `★ « ${ev.title} » est prêt (brouillon) : ${(ev.mechanics ?? []).join(", ")}. ${ev.attempts > 1 ? `${ev.attempts} passes.` : ""}` });
            if (ev.scores) push({ kind: "d", text: `  Notes des relecteurs : justesse ${ev.scores.accuracy}/10 · pédagogie ${ev.scores.pedagogy}/10 · plaisir ${ev.scores.fun}/10 · waouh ${ev.scores.wow}/10` });
            for (const w of ev.warnings ?? []) push({ kind: "w", text: `! ${w}` });
            setDone(ev);
            router.refresh();
          }
        }
      }
      clearTimeout(quiet);
      if (!ended) push({ kind: "f", text: "✗ Le serveur a coupé la génération sans répondre (délai dépassé ou connexion perdue). Relance-la ; si ça se répète, envoie-moi le journal." });
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
      <div className="st-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "offer"} className={mode === "offer" ? "on" : ""} onClick={() => setMode("offer")} disabled={busy}>
          D&apos;APRÈS UNE OFFRE
        </button>
        <button type="button" role="tab" aria-selected={mode === "idea"} className={mode === "idea" ? "on" : ""} onClick={() => setMode("idea")} disabled={busy}>
          D&apos;APRÈS UNE IDÉE
        </button>
      </div>
      <form onSubmit={submit} className="st-grid" key={mode}>
        {mode === "idea" ? <IdeaFields /> : <>
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
          <span>DESTINATAIRE <em>pour toi, jamais affiché</em></span>
          <input name="contactName" placeholder="Prénom Nom" />
        </label>
        <label>
          <span>SON RÔLE</span>
          <input name="contactRole" placeholder="Head of Data…" />
        </label>
        <label className="full">
          <span>CONSIGNES POUR CE JEU <em>facultatif</em></span>
          <textarea name="notes" style={{ minHeight: 70 }} placeholder="Ex. : insiste sur SQL et la gouvernance, ton sobre, un niveau tape-alerte, un boss sur la dette technique…" />
        </label>
        </>}
        <div className="full st-row">
          <button className="st-btn go" disabled={busy}>{busy ? "GÉNÉRATION…" : "GÉNÉRER LE JEU ▶"}</button>
          <span className="st-hint">
            {mode === "idea"
              ? "1 à 4 min : analyse de l'idée, plan en mondes, écriture, relecture, révision. Toujours en 8-bit NES. Créé en brouillon."
              : "1 à 4 min : analyse du poste, plan, écriture, relecture par trois personnages, révision. Le jeu est créé en brouillon."}
          </span>
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
