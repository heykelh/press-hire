import "server-only";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { Cartridge, type Cartridge as CartridgeT } from "@press-hire/cartridge";

const FIXTURES_DIR = join(process.cwd(), "../../fixtures/cartridges");

export const dbConfigured = () => Boolean(process.env.DATABASE_URL);

/** Les cartouches de démo sont servies sans base, ou si PRESS_HIRE_FIXTURES=1. */
const fixturesEnabled = () => !dbConfigured() || process.env.PRESS_HIRE_FIXTURES === "1";

async function fromDb(slug: string): Promise<unknown | null> {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = (await sql.query("select data from cartridges where slug = $1 and status = 'live' limit 1", [
    slug,
  ])) as Array<{ data: unknown }>;
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

export async function getCartridge(slug: string): Promise<CartridgeT | null> {
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return null;
  let raw: unknown | null = null;
  if (dbConfigured()) raw = await fromDb(slug);
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
  const sql = neon(process.env.DATABASE_URL!);
  const rows = (await sql.query("select count(*)::int as n from cartridges where status = 'live'")) as Array<{ n: number }>;
  return rows[0]?.n ?? 0;
}
