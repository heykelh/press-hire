/**
 * Publie une cartouche : contrôle strict, enregistrement dans Neon, affichage de l'URL.
 *   pnpm publish:cartridge <fichier.json>
 *   pnpm publish:cartridge <fichier.json> --slug air-france-fuel-demo   (slug imposé)
 *   pnpm publish:cartridge <fichier.json> --force                        (ignore le contrôle strict, pour tester)
 */
import { formatIssues, makeSlug, validateCartridge } from "@press-hire/cartridge";
import { arg, db, flag, loadEnv, readJson } from "./lib";

loadEnv();
const file = process.argv[2];
if (!file || file.startsWith("--")) {
  console.error("Usage : pnpm publish:cartridge <fichier.json> [--slug <slug>] [--force]");
  process.exit(1);
}

const force = flag("force");
const r = validateCartridge(readJson(file), { strict: !force });
if (r.issues.length) console.log(formatIssues(r.issues) + "\n");
if (!r.ok || !r.cartridge) {
  console.error("Publication refusée. Corrige les erreurs ci-dessus (ou --force pour un simple test).");
  process.exit(1);
}

const c = r.cartridge;
const slug = arg("slug") ?? makeSlug(c.target.company.name, c.target.job.title);
const data = { ...c, review: { ...c.review, status: "live" as const } };

const sql = db();
await sql.query(
  `insert into cartridges (slug, data, status, company, job_title)
   values ($1, $2::jsonb, 'live', $3, $4)
   on conflict (slug) do update
     set data = excluded.data, status = 'live', company = excluded.company,
         job_title = excluded.job_title, updated_at = now()`,
  [slug, JSON.stringify(data), c.target.company.name, c.target.job.title],
);

const base = (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
console.log(`Jeu en ligne : ${base}/${slug}`);
