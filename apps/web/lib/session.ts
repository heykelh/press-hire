import "server-only";
import { isStudio } from "./studio-auth";
import { planOf, type Plan } from "./plans";
import { dbConfigured, ensureSchema, q } from "./db";

/**
 * Session du studio. Aujourd'hui : un mot de passe unique = le compte « owner ».
 * Demain (SaaS) : remplacer ce fichier par une vraie connexion (lien magique, Google…) qui renvoie l'identifiant du compte.
 * Tout le reste du studio ne connaît que `accountId` et `plan`.
 */
export interface Session {
  accountId: string;
  plan: Plan;
}

export async function getSession(): Promise<Session | null> {
  if (!(await isStudio())) return null;
  const accountId = "owner";
  let planId = "owner";
  if (dbConfigured()) {
    await ensureSchema();
    planId = (await q<{ plan: string }>("select plan from accounts where id = $1", [accountId]))[0]?.plan ?? "owner";
  }
  return { accountId, plan: planOf(planId) };
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error("accès réservé au studio");
  return s;
}

/* ---------- consommation ---------- */

export async function generationsThisMonth(accountId: string): Promise<number> {
  const rows = await q<{ n: number }>(
    "select count(*)::int as n from generations where owner_id = $1 and ok and created_at >= date_trunc('month', now())",
    [accountId],
  );
  return rows[0]?.n ?? 0;
}

export async function liveGamesCount(accountId: string): Promise<number> {
  const rows = await q<{ n: number }>("select count(*)::int as n from cartridges where owner_id = $1 and status = 'live'", [accountId]);
  return rows[0]?.n ?? 0;
}

export async function logGeneration(g: { accountId: string; slug?: string; ok: boolean; provider?: string; durationMs: number; error?: string }) {
  await q("insert into generations (owner_id, slug, ok, provider, duration_ms, error) values ($1, $2, $3, $4, $5, $6)", [
    g.accountId, g.slug ?? null, g.ok, g.provider ?? null, Math.round(g.durationMs), g.error?.slice(0, 500) ?? null,
  ]);
}

/** Plan du propriétaire d'un jeu (pour la mention de fin de partie). */
export async function ownerPlanOfGame(slug: string): Promise<Plan> {
  if (!dbConfigured()) return planOf("owner");
  const rows = await q<{ plan: string }>(
    "select a.plan from cartridges c join accounts a on a.id = c.owner_id where c.slug = $1",
    [slug],
  ).catch(() => []);
  return planOf(rows[0]?.plan ?? "owner");
}
