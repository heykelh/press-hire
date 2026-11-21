import { cookies } from "next/headers";
import { z } from "zod";
import { dbConfigured, ensureSchema, q } from "@/lib/db";
import { ntfy } from "@/lib/notify";
import { isStudioCookie, STUDIO_COOKIE } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,80}$/),
  kind: z.enum(["start", "end", "cta", "recruiter"]),
  sid: z.string().regex(/^[a-z0-9]{6,16}$/),
  detail: z.string().max(20).optional(),
});

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|linkedin|whatsapp|telegram|slack|discord|headless|lighthouse|python|curl|wget|node-fetch|axios/i;
/** une notification « quelqu'un joue » au plus toutes les 10 minutes par jeu */
const BURST_MIN = 10;

const COUNTER: Record<string, string> = { start: "plays", end: "ends", cta: "cta_clicks", recruiter: "recruiter_views" };

export async function POST(req: Request) {
  const ok = new Response(null, { status: 204 });
  if (!dbConfigured()) return ok;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const { slug, kind, sid, detail } = parsed.data;

  // filtres : robots, aperçus de liens, et mes propres parties (connecté au studio)
  if (BOTS.test(req.headers.get("user-agent") ?? "")) return ok;
  if (isStudioCookie((await cookies()).get(STUDIO_COOKIE)?.value)) return ok;

  await ensureSchema();
  const game = (await q<{ title: string; company: string; job_title: string; notified_at: string | null }>(
    "select data->'design'->'title'->>'fr' as title, company, job_title, notified_at from cartridges where slug = $1 and status = 'live'",
    [slug],
  ))[0];
  if (!game) return ok;

  // une même session ne compte qu'une fois par type d'événement
  const seen = await q("select 1 from play_events where sid = $1 and slug = $2 and kind = $3 and coalesce(detail, '') = coalesce($4, '') limit 1", [sid, slug, kind, detail ?? null]);
  if (seen.length) return ok;
  await q("insert into play_events (slug, sid, kind, detail) values ($1, $2, $3, $4)", [slug, sid, kind, detail ?? null]);
  const col = COUNTER[kind]!;
  const [row] = await q<{ plays: number; ends: number }>(
    `update cartridges set ${col} = ${col} + 1${kind === "start" ? ", last_play_at = now()" : ""} where slug = $1 returning plays, ends`,
    [slug],
  );

  const base = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, "") ?? new URL(req.url).origin;
  const where = `${game.company} · ${game.job_title}`;
  if (kind === "start" || kind === "recruiter") {
    const recent = game.notified_at && Date.now() - new Date(game.notified_at).getTime() < BURST_MIN * 60_000;
    if (!recent) {
      await q("update cartridges set notified_at = now() where slug = $1", [slug]);
      await ntfy({
        title: kind === "start" ? `🎮 On joue à ${game.title} !` : `👀 Mode recruteur ouvert : ${game.title}`,
        message: `${where}\nPartie n°${row?.plays ?? 1}`,
        click: `${base}/studio`,
        tags: ["video_game"],
        priority: 4,
      });
    }
  } else if (kind === "end") {
    await ntfy({ title: `🏁 ${game.title} terminé jusqu'au bout`, message: where, click: `${base}/studio`, tags: ["checkered_flag"], priority: 3 });
  } else if (kind === "cta") {
    const what = detail === "cv" ? "a ouvert ton CV" : detail === "contact" ? "a cliqué sur « Me contacter »" : detail === "linkedin" ? "a ouvert ton LinkedIn" : "a ouvert ton portfolio";
    await ntfy({ title: `🔥 ${game.title} : quelqu'un ${what}`, message: where, click: `${base}/studio`, tags: ["fire"], priority: 5 });
  }
  return ok;
}
