import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

/** Charge .env à la racine du repo s'il existe (Node 20.12+). */
export function loadEnv(): void {
  try {
    process.loadEnvFile(resolve(process.cwd(), ".env"));
  } catch {
    /* pas de .env : on garde l'environnement tel quel */
  }
}

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL manquant : copie .env.example en .env et colle la chaîne de connexion Neon.");
    process.exit(1);
  }
  return neon(url);
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

export const flag = (name: string) => process.argv.includes(`--${name}`);
