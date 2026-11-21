/**
 * Crée ou met à jour les tables dans Neon (sans danger si elles existent déjà).
 *   pnpm db:init
 */
import { schemaStatements } from "../db/schema";
import { db, loadEnv } from "./lib";

loadEnv();
const sql = db();
for (const s of schemaStatements()) await sql.query(s);
const [row] = (await sql.query("select count(*)::int as n from cartridges")) as Array<{ n: number }>;
console.log(`Base prête : table cartridges (${row?.n ?? 0} jeu(x)).`);
