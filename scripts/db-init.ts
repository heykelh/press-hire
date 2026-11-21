/**
 * Crée les tables dans Neon (sans danger si elles existent déjà).
 *   pnpm db:init
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { db, loadEnv } from "./lib";

loadEnv();
const sql = db();

const statements = readFileSync(resolve(process.cwd(), "db/schema.sql"), "utf8")
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

for (const s of statements) await sql.query(s);
const [row] = (await sql.query("select count(*)::int as n from cartridges")) as Array<{ n: number }>;
console.log(`Base prête : table cartridges (${row?.n ?? 0} jeu(x)).`);
