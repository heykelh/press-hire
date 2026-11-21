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

/** Jeu publié ; avec `owner`, aussi les brouillons de ce compte (aperçu du studio). */
export async function getCartridge(slug: string, opts: { owner?: string } = {}): Promise<CartridgeT | null> {
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return null;
  let raw: unknown | null = null;
  if (dbConfigured()) {
    if (opts.owner) {
      await ensureSchema();
      raw = (await q<{ data: unknown }>("select data from cartridges where slug = $1 and owner_id = $2 limit 1", [slug, opts.owner]))[0]?.data ?? null;
    } else raw = await fromDb(slug, ["live"]);
  }
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

export async function saveCartridge(c: CartridgeT, status: Status, owner: string, sourceUrl?: string): Promise<void> {
  await ensureSchema();
  await q(
    `insert into cartridges (slug, data, status, company, job_title, source_url, owner_id)
     values ($1, $2::jsonb, $3, $4, $5, $6, $7)
     on conflict (slug) do update
       set data = excluded.data, status = excluded.status, company = excluded.company,
           job_title = excluded.job_title, source_url = coalesce(excluded.source_url, cartridges.source_url), updated_at = now()
     where cartridges.owner_id = excluded.owner_id`,
    [c.meta.id, JSON.stringify(c), status, c.target.company.name, c.target.job.title, sourceUrl ?? null, owner],
  );
}

export async function setStatus(slug: string, status: Status, owner: string): Promise<void> {
  await q("update cartridges set status = $2, updated_at = now() where slug = $1 and owner_id = $3", [slug, status, owner]);
}

export async function deleteCartridge(slug: string, owner: string): Promise<void> {
  const rows = await q("delete from cartridges where slug = $1 and owner_id = $2 returning slug", [slug, owner]);
  if (rows.length) await q("delete from play_events where slug = $1", [slug]);
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
  last_play_at: string | null;
  /** par niveau : sessions qui l'ont tenté, sessions qui l'ont réussi */
  levels: Array<{ level: string; won: number; tries: number }>;
}

export async function listGames(owner: string): Promise<GameRow[]> {
  await ensureSchema();
  return q<GameRow>(
    `select c.slug, c.status, c.company, c.job_title, c.data->'design'->'title'->>'fr' as title, c.source_url,
            c.created_at, c.plays, c.ends, c.last_play_at,
            (select coalesce(json_agg(json_build_object('level', s.level, 'won', s.won, 'tries', s.tries) order by s.level), '[]'::json)
               from (select split_part(e.detail, ':', 1) as level,
                            count(*) filter (where split_part(e.detail, ':', 2) = '1')::int as won,
                            count(distinct e.sid)::int as tries
                       from play_events e where e.slug = c.slug and e.kind = 'level' group by 1) s) as levels
       from cartridges c where c.owner_id = $1
      order by c.created_at desc limit 200`,
    [owner],
  );
}

/** Cartouches de démonstration (dossier fixtures), pour la page /demos. */
export async function listDemos(): Promise<CartridgeT[]> {
  if (!fixturesEnabled()) return [];
  const out: CartridgeT[] = [];
  try {
    for (const f of (await readdir(FIXTURES_DIR)).sort()) {
      if (!f.endsWith(".json")) continue;
      const r = Cartridge.safeParse(JSON.parse(await readFile(join(FIXTURES_DIR, f), "utf8")));
      if (r.success) out.push(r.data);
    }
  } catch {
    /* pas de démos embarquées */
  }
  return out;
}
