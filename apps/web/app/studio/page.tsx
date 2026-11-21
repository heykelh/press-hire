import GameList from "@/components/studio/GameList";
import Login from "@/components/studio/Login";
import NewGame from "@/components/studio/NewGame";
import LlmCheck from "@/components/studio/LlmCheck";
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
  const mock = process.env.PRESS_HIRE_MOCK_LLM === "1";
  const qwenKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
  // fournisseurs capables d'écrire un jeu entier (Groq gratuit est trop limité par minute pour cette étape)
  const writers = [
    process.env.GEMINI_API_KEY && "Gemini",
    qwenKey && "Qwen",
    process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL && "OpenRouter",
    process.env.MISTRAL_API_KEY && "Mistral",
    process.env.NVIDIA_API_KEY && "NVIDIA",
    process.env.GROQ_API_KEY && Number(process.env.GROQ_TPM) >= 40000 && "Groq",
  ].filter(Boolean);
  if (!mock && !writers.length)
    problems.push(
      process.env.GROQ_API_KEY
        ? "Seul Groq est configuré : son quota gratuit (8 à 12k jetons/min) suffit pour l'analyse, pas pour écrire un jeu. Ajoute GEMINI_API_KEY ou QWEN_API_KEY."
        : "Aucune clé de modèle : ajoute GEMINI_API_KEY et QWEN_API_KEY (et GROQ_API_KEY pour accélérer) dans les variables Vercel.",
    );
  else if (!mock && writers.length === 1)
    problems.push(`Un seul fournisseur peut écrire les jeux (${writers[0]}) : ajoute-en un deuxième (Gemini ou Qwen) pour qu'une panne ne bloque pas la génération.`);
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
        <LlmCheck />
        <GameList games={games.map((g) => ({ ...g, created_at: String(g.created_at), last_play_at: g.last_play_at ? String(g.last_play_at) : null }))} />
      </main>
    </>
  );
}
