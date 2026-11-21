import GameList from "@/components/studio/GameList";
import Login from "@/components/studio/Login";
import NewGame from "@/components/studio/NewGame";
import SiteNav from "@/components/site/SiteNav";
import { listGames } from "@/lib/cartridges";
import { dbConfigured } from "@/lib/db";
import { generationsThisMonth, getSession, liveGamesCount } from "@/lib/session";
import { studioConfigured } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";

const lim = (n: number) => (Number.isFinite(n) ? String(n) : "∞");

export default async function StudioPage() {
  const session = await getSession();
  if (!session)
    return (
      <>
        <SiteNav current="/studio" />
        <Login configured={studioConfigured()} />
      </>
    );

  const problems: string[] = [];
  if (!dbConfigured()) problems.push("DATABASE_URL n'est pas réglé : le studio a besoin de la base Neon.");
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY && process.env.PRESS_HIRE_MOCK_LLM !== "1")
    problems.push("Aucune clé de modèle : ajoute GEMINI_API_KEY (et si tu veux GROQ_API_KEY) dans les variables Vercel.");
  if (!process.env.NTFY_TOPIC) problems.push("NTFY_TOPIC n'est pas réglé : pas de notification quand quelqu'un joue.");

  const [games, used, live] = dbConfigured()
    ? await Promise.all([listGames(session.accountId), generationsThisMonth(session.accountId), liveGamesCount(session.accountId)])
    : [[], 0, 0];

  return (
    <>
      <SiteNav current="/studio" />
      <main className="st">
        <div className="st-top">
          <h1>STUDIO</h1>
          <p className="st-usage">
            Offre <b>{session.plan.label}</b> · jeux générés ce mois-ci <b>{used}/{lim(session.plan.generationsPerMonth)}</b> · en ligne <b>{live}/{lim(session.plan.liveGames)}</b>
          </p>
        </div>
        {problems.length > 0 && <div className="st-card hot">{problems.map((p) => <p key={p} className="st-warn">{p}</p>)}</div>}
        <NewGame />
        <GameList games={games.map((g) => ({ ...g, created_at: String(g.created_at), last_play_at: g.last_play_at ? String(g.last_play_at) : null }))} />
      </main>
    </>
  );
}
