import "server-only";
import { neon, neonConfig } from "@neondatabase/serverless";
import { schemaStatements } from "../../../db/schema";

// développement local : un proxy HTTP compatible Neon devant un Postgres (voir README)
if (process.env.NEON_FETCH_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;

export const dbConfigured = () => Boolean(process.env.DATABASE_URL);

export function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquant : la base Neon n'est pas configurée");
  return neon(process.env.DATABASE_URL);
}

export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await sql().query(text, params)) as T[];
}

let ready: Promise<void> | null = null;

/** Met la base à jour une fois par instance : plus besoin de relancer db:init après une mise à jour. */
export function ensureSchema(): Promise<void> {
  if (!ready)
    ready = (async () => {
      for (const s of schemaStatements()) await sql().query(s);
    })().catch((e) => {
      ready = null;
      throw e;
    });
  return ready;
}
