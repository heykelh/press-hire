import Link from "next/link";
import { hasPlaceholders } from "@press-hire/agent";
import GameList from "@/components/studio/GameList";
import Login from "@/components/studio/Login";
import NewGame from "@/components/studio/NewGame";
import { listGames } from "@/lib/cartridges";
import { dbConfigured } from "@/lib/db";
import { getProfile } from "@/lib/settings";
import { isStudio, studioConfigured } from "@/lib/studio-auth";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  if (!(await isStudio())) return <Login configured={studioConfigured()} />;

  const problems: string[] = [];
  if (!dbConfigured()) problems.push("DATABASE_URL n'est pas réglé : le studio a besoin de la base Neon.");
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY && process.env.PRESS_HIRE_MOCK_LLM !== "1")
    problems.push("Aucune clé de modèle : ajoute GEMINI_API_KEY (et si tu veux GROQ_API_KEY) dans les variables Vercel.");
  if (!process.env.NTFY_TOPIC) problems.push("NTFY_TOPIC n'est pas réglé : pas de notification quand quelqu'un joue.");

  const [profile, games] = dbConfigured() ? await Promise.all([getProfile(), listGames()]) : [null, []];
  const incomplete = profile ? hasPlaceholders(profile) : false;

  return (
    <main className="st">
      <div className="st-top">
        <h1>PRESS <b>HIRE</b> · STUDIO</h1>
        <nav>
          <Link className="st-btn small" href="/studio/profil">PROFIL</Link>
          <Link className="st-btn small" href="/gallery">DÉCORS</Link>
          <form action={logout}><button className="st-btn small">QUITTER</button></form>
        </nav>
      </div>

      {problems.length > 0 && (
        <div className="st-card hot">
          {problems.map((p) => <p key={p} className="st-warn">{p}</p>)}
        </div>
      )}
      {incomplete && (
        <p className="st-warn">
          Ton profil contient encore des emplacements (nom, e-mail, lien du CV). Tu peux générer des jeux, mais pas les publier :{" "}
          <Link href="/studio/profil">compléter le profil</Link>.
        </p>
      )}

      <NewGame />
      <GameList games={games.map((g) => ({ ...g, created_at: String(g.created_at), last_play_at: g.last_play_at ? String(g.last_play_at) : null }))} />
    </main>
  );
}
