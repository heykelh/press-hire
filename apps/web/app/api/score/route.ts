/**
 * Tableau des meilleurs scores d'un jeu publié : 3 initiales façon borne d'arcade.
 * GET ?slug=… → les 10 meilleurs ; POST { slug, initials, score, sid } → enregistre et renvoie le classement.
 * Garde-fous : jeu publié seulement, initiales A-Z/0-9, score plafonné selon le jeu, une entrée par session et par jeu,
 * pas plus d'une entrée toutes les 20 secondes par session.
 */
import { cookies } from "next/headers";
import { z } from "zod";
import { dbConfigured, ensureSchema, q } from "@/lib/db";
import { isStudioCookie, STUDIO_COOKIE } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Slug = z.string().regex(/^[a-z0-9-]{3,80}$/);
const Body = z.object({
  slug: Slug,
  initials: z.string().regex(/^[A-Z0-9]{3}$/),
  score: z.number().int().min(0).max(1_000_000),
  sid: z.string().regex(/^[a-z0-9]{6,16}$/),
});

// quelques combinaisons refusées (initiales injurieuses courantes)
const BLOCK = new Set(["FUK", "FCK", "KKK", "NZI", "SEX", "PD0", "PUT", "CUL", "BIT", "ASS", "FDP", "NTM", "TAG"]);

type Row = { initials: string; score: number; created_at: string };

async function top(slug: string): Promise<Row[]> {
  return q<Row>("select initials, score, created_at from scores where slug = $1 order by score desc, created_at asc limit 10", [slug]);
}

export async function GET(req: Request) {
  const slug = Slug.safeParse(new URL(req.url).searchParams.get("slug"));
  if (!slug.success) return Response.json({ error: "slug" }, { status: 400 });
  if (!dbConfigured()) return Response.json({ scores: [] });
  await ensureSchema();
  return Response.json({ scores: await top(slug.data) });
}

export async function POST(req: Request) {
  if (!dbConfigured()) return Response.json({ error: "indisponible" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "données invalides" }, { status: 400 });
  const { slug, initials, score, sid } = parsed.data;
  if (BLOCK.has(initials)) return Response.json({ error: "initiales refusées" }, { status: 400 });
  // mes propres parties de test (connecté au studio) ne comptent pas
  if (isStudioCookie((await cookies()).get(STUDIO_COOKIE)?.value)) return Response.json({ scores: await top(slug), rank: null, skipped: true });

  await ensureSchema();
  const game = (await q<{ levels: number }>(
    "select jsonb_array_length(coalesce(data->'levels', '[]'::jsonb)) as levels from cartridges where slug = $1 and status = 'live'",
    [slug],
  ))[0];
  if (!game) return Response.json({ error: "jeu introuvable" }, { status: 404 });
  // plafond large : un score impossible est refusé
  const cap = 6000 + game.levels * 3000;
  if (score > cap) return Response.json({ error: "score impossible" }, { status: 400 });

  const mine = await q<{ created_at: string }>("select created_at from scores where slug = $1 and sid = $2 order by created_at desc limit 1", [slug, sid]);
  if (mine[0] && Date.now() - new Date(mine[0].created_at).getTime() < 20_000) return Response.json({ error: "trop rapide" }, { status: 429 });

  await q("insert into scores (slug, initials, score, sid) values ($1, $2, $3, $4)", [slug, initials, score, sid]);
  const r = await q<{ rank: number }>("select count(*)::int + 1 as rank from scores where slug = $1 and score > $2", [slug, score]);
  return Response.json({ scores: await top(slug), rank: r[0]?.rank ?? null });
}
