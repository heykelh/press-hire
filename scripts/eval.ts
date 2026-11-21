/**
 * Banc d'essai de l'agent : génère un jeu pour chaque offre de eval/offers/ avec le vrai modèle,
 * et mesure la qualité (notes des relecteurs, contrôles, richesse pédagogique, durée).
 *   pnpm eval                 toutes les offres
 *   pnpm eval -- 02           seulement les offres dont le nom contient « 02 »
 * Résultats : eval/results/<date>.json et un tableau dans la console. À relancer après chaque changement des consignes.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chain, generate, llmsFromEnv, type GenerateEvent } from "@press-hire/agent";
import { loadEnv } from "./lib";

loadEnv();
const filter = process.argv.slice(2).find((a) => !a.startsWith("-"));
const dir = join(process.cwd(), "eval/offers");
const files = readdirSync(dir).filter((f) => f.endsWith(".txt") && (!filter || f.includes(filter))).sort();
const llms = llmsFromEnv();
if (!llms.length) {
  console.error("Ajoute GEMINI_API_KEY (ou GROQ_API_KEY) dans .env pour lancer le banc d'essai.");
  process.exit(1);
}
const llm = chain(llms);
const rows: Array<Record<string, unknown>> = [];

for (const f of files) {
  const t0 = Date.now();
  let last: GenerateEvent | undefined;
  process.stdout.write(`\n▶ ${f}\n`);
  for await (const e of generate({ offerText: readFileSync(join(dir, f), "utf8") }, { llm, budgetMs: 290_000 })) {
    if (e.type === "step" || e.type === "warn") process.stdout.write(`  ${e.type === "warn" ? "!" : ">"} ${e.message}\n`);
    last = e;
  }
  const s = (Date.now() - t0) / 1000;
  if (last?.type === "done") {
    const c = last.cartridge;
    const arcadeItems = c.levels.flatMap((l) => (l.mechanic.type === "catch" ? l.mechanic.items : l.mechanic.type === "whack" ? l.mechanic.targets : []));
    rows.push({
      offre: f, ok: true, secondes: Math.round(s), titre: c.design.title.fr,
      justesse: last.scores?.accuracy, pedagogie: last.scores?.pedagogy, plaisir: last.scores?.fun, waouh: last.scores?.wow,
      niveaux: c.levels.map((l) => l.mechanic.type).join(" "),
      notions: c.concepts.length,
      rebondissements: c.levels.filter((l) => l.twist).length,
      consequences: arcadeItems.length ? `${arcadeItems.filter((x) => x.consequence).length}/${arcadeItems.length}` : "-",
      histoire: c.story ? "oui" : "non",
      avertissements: last.issues.filter((i) => i.severity === "warning").length,
    });
    mkdirSync(join(process.cwd(), "eval/results/games"), { recursive: true });
    writeFileSync(join(process.cwd(), "eval/results/games", f.replace(".txt", ".json")), JSON.stringify(c, null, 2));
  } else rows.push({ offre: f, ok: false, secondes: Math.round(s), erreur: last?.type === "fail" ? last.message : "?" });
}

mkdirSync(join(process.cwd(), "eval/results"), { recursive: true });
const out = join(process.cwd(), "eval/results", `${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`);
writeFileSync(out, JSON.stringify(rows, null, 2));
console.log("\n");
console.table(rows);
const ok = rows.filter((r) => r.ok);
const avg = (k: string) => (ok.length ? (ok.reduce((t, r) => t + Number(r[k] ?? 0), 0) / ok.length).toFixed(1) : "-");
console.log(`Réussite ${ok.length}/${rows.length} · justesse ${avg("justesse")} · pédagogie ${avg("pedagogie")} · plaisir ${avg("plaisir")} · waouh ${avg("waouh")}`);
console.log(`Détail : ${out}`);
