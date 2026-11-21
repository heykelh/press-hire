/**
 * Vérifie une cartouche.
 *   pnpm validate fixtures/cartridges/air-france-fuel-demo.json
 *   pnpm validate <fichier> --strict     (règles de publication)
 */
import { formatIssues, validateCartridge } from "@press-hire/cartridge";
import { flag, readJson } from "./lib";

const file = process.argv[2];
if (!file || file.startsWith("--")) {
  console.error("Usage : pnpm validate <fichier.json> [--strict]");
  process.exit(1);
}

const strict = flag("strict");
const r = validateCartridge(readJson(file), { strict });
console.log(formatIssues(r.issues));
const errors = r.issues.filter((i) => i.severity === "error").length;
const warnings = r.issues.length - errors;
console.log(`\n${r.ok ? "OK" : "REFUSÉE"}${strict ? " (mode publication)" : ""} : ${errors} erreur(s), ${warnings} avertissement(s).`);
process.exit(r.ok ? 0 : 1);
