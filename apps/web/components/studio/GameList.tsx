"use client";

import { useState, useTransition } from "react";
import { publishGame, removeGame, unpublishGame } from "@/app/studio/actions";
import { PublishedLink } from "./NewGame";

export interface Row {
  slug: string;
  status: "draft" | "live" | "archived";
  company: string;
  job_title: string;
  title: string;
  source_url: string | null;
  created_at: string;
  plays: number;
  ends: number;
  last_play_at: string | null;
  levels?: Array<{ level: string; won: number; tries: number }>;
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default function GameList({ games }: { games: Row[] }) {
  if (!games.length)
    return (
      <section className="st-card" id="jeux">
        <h2>MES JEUX</h2>
        <p className="st-hint">Aucun jeu pour l&apos;instant : colle une offre ci-dessus.</p>
      </section>
    );
  return (
    <section className="st-card" id="jeux">
      <h2>MES JEUX ({games.length})</h2>
      <table className="st-table">
        <thead>
          <tr><th>JEU</th><th>ÉTAT</th><th>PARTIES</th><th>FINIES</th><th>DERNIÈRE</th><th></th></tr>
        </thead>
        <tbody>{games.map((g) => <GameRow key={g.slug} g={g} />)}</tbody>
      </table>
      <p className="st-hint">Parties jouées par toi (connecté au studio) et par les robots : non comptées.</p>
    </section>
  );
}

function GameRow({ g }: { g: Row }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string; url?: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/${g.slug}` : `/${g.slug}`;

  return (
    <tr>
      <td>
        <span className="st-game-title">{g.title}</span>
        {g.company} · {g.job_title}
        {g.source_url && <> · <a href={g.source_url} target="_blank" rel="noopener noreferrer">offre</a></>}
        {g.levels && g.levels.length > 0 && (
          <div className="st-levels" title="Réussite par niveau (sessions qui l'ont réussi / qui l'ont tenté)">
            {g.levels.map((l) => {
              const r = l.tries ? l.won / l.tries : 0;
              const hard = l.tries >= 5 && r < 0.4;
              return <span key={l.level} className={hard ? "hard" : ""}>{l.level.replace(/^lvl_/, "")} {Math.round(r * 100)} %<small> ({l.tries})</small></span>;
            })}
          </div>
        )}
        {(() => {
          const hard = (g.levels ?? []).filter((l) => l.tries >= 5 && l.won / l.tries < 0.4);
          return hard.length > 0 && (
            <p className="st-warn">⚠ Trop dur pour les vrais joueurs : {hard.map((l) => l.level.replace(/^lvl_/, "")).join(", ")} (moins de 40 % de réussite). Régénère le jeu ou baisse l'objectif de ce niveau.</p>
          );
        })()}
        {msg && (msg.url ? <div><PublishedLink url={msg.url} /></div> : <p className={msg.ok ? "st-ok" : "st-err"}>{msg.text}</p>)}
      </td>
      <td><span className={`st-chip ${g.status}`}>{g.status === "live" ? "EN LIGNE" : g.status === "draft" ? "BROUILLON" : "ARCHIVÉ"}</span></td>
      <td className="num">{g.plays}</td>
      <td className="num">{g.ends}</td>
      <td>{fmt(g.last_play_at)}</td>
      <td>
        <div className="st-actions">
          <a className="st-btn small" href={`/studio/apercu/${g.slug}`} target="_blank" rel="noopener">{g.status === "live" ? "JOUER" : "APERÇU"}</a>
          {g.status === "live" ? (
            <>
              <button className="st-btn small blue" onClick={() => navigator.clipboard.writeText(url).then(() => setMsg({ ok: true, text: "Lien copié : " + url }))}>LIEN</button>
              <button className="st-btn small" disabled={pending} onClick={() => start(async () => { await unpublishGame(g.slug); })}>DÉPUBLIER</button>
            </>
          ) : (
            <>
              <button className="st-btn small go" disabled={pending} onClick={() => start(async () => {
                const r = await publishGame(g.slug);
                setMsg(r.ok ? { ok: true, text: "", url: r.url } : { ok: false, text: r.error ?? "refusé" });
              })}>PUBLIER</button>

            </>
          )}
          <button className="st-btn small danger" disabled={pending} onClick={() => {
            if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3000); return; }
            start(async () => { await removeGame(g.slug); });
          }}>{confirmDel ? "SÛR ?" : "SUPPR."}</button>
        </div>
      </td>
    </tr>
  );
}
