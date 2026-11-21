import "server-only";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Cartridge, type Cartridge as CartridgeT } from "@press-hire/cartridge";
import { dbConfigured, ensureSchema, q } from "./db";

export { dbConfigured };

const FIXTURES_DIR = join(process.cwd(), "../../fixtures/cartridges");

/** Les cartouches de démo sont servies sans base, ou si PRESS_HIRE_FIXTURES=1. */
const fixturesEnabled = () => !dbConfigured() || process.env.PRESS_HIRE_FIXTURES === "1";

export type Status = "draft" | "live" | "archived";

async function fromDb(slug: string, statuses: Status[]): Promise<unknown | null> {
  const rows = await q<{ data: unknown }>("select data from cartridges where slug = $1 and status = any($2) limit 1", [slug, statuses]);
  return rows[0]?.data ?? null;
}

async function fromFixtures(slug: string): Promise<unknown | null> {
  try {
    for (const f of await readdir(FIXTURES_DIR)) {
      if (!f.endsWith(".json")) continue;
      const data = JSON.parse(await readFile(join(FIXTURES_DIR, f), "utf8"));
      if (data?.meta?.id === slug) return data;
    }
  } catch {
    /* dossier absent en production : normal */
  }
  return null;
}

export async function countFixtures(): Promise<number> {
  try {
    return (await readdir(FIXTURES_DIR)).filter((f) => f.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

/** Jeu publié (ou, pour l'aperçu du studio, brouillon). */
export async function getCartridge(slug: string, opts: { drafts?: boolean } = {}): Promise<CartridgeT | null> {
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return null;
  let raw: unknown | null = null;
  if (dbConfigured()) raw = await fromDb(slug, opts.drafts ? ["live", "draft", "archived"] : ["live"]);
  if (!raw && fixturesEnabled()) raw = await fromFixtures(slug);
  if (!raw) return null;

  const parsed = Cartridge.safeParse(raw);
  if (!parsed.success) {
    console.error(`[press-hire] cartouche ${slug} invalide`, parsed.error.issues.slice(0, 5));
    return null;
  }
  return parsed.data;
}

export async function countLive(): Promise<number> {
  const rows = await q<{ n: number }>("select count(*)::int as n from cartridges where status = 'live'");
  return rows[0]?.n ?? 0;
}

export async function saveCartridge(c: CartridgeT, status: Status, sourceUrl?: string): Promise<void> {
  await ensureSchema();
  await q(
    `insert into cartridges (slug, data, status, company, job_title, source_url)
     values ($1, $2::jsonb, $3, $4, $5, $6)
     on conflict (slug) do update
       set data = excluded.data, status = excluded.status, company = excluded.company,
           job_title = excluded.job_title, source_url = coalesce(excluded.source_url, cartridges.source_url), updated_at = now()`,
    [c.meta.id, JSON.stringify(c), status, c.target.company.name, c.target.job.title, sourceUrl ?? null],
  );
}

export async function setStatus(slug: string, status: Status): Promise<void> {
  await q("update cartridges set status = $2, updated_at = now() where slug = $1", [slug, status]);
}

export async function deleteCartridge(slug: string): Promise<void> {
  await q("delete from cartridges where slug = $1", [slug]);
  await q("delete from play_events where slug = $1", [slug]);
}

export interface GameRow {
  slug: string;
  status: Status;
  company: string;
  job_title: string;
  title: string;
  source_url: string | null;
  created_at: string;
  plays: number;
  ends: number;
  cta_clicks: number;
  recruiter_views: number;
  last_play_at: string | null;
}

export async function listGames(): Promise<GameRow[]> {
  await ensureSchema();
  return q<GameRow>(
    `select slug, status, company, job_title, data->'design'->'title'->>'fr' as title, source_url,
            created_at, plays, ends, cta_clicks, recruiter_views, last_play_at
       from cartridges where status <> 'archived' or updated_at > now() - interval '90 days'
      order by created_at desc limit 200`,
  );
}
