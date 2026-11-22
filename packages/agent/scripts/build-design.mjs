// Copie les fichiers de la bibliothèque de game design (design/*.md) dans un module TypeScript,
// pour qu'ils soient livrés avec l'application sans lecture de fichiers à l'exécution.
// Lancer après chaque modification d'un fichier .md : pnpm --filter @press-hire/agent design
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "design");
const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
const body = files.map((f) => `  ${JSON.stringify(f.replace(/\.md$/, ""))}: ${JSON.stringify(readFileSync(join(dir, f), "utf8"))},`).join("\n");
const out = `// Fichier généré par scripts/build-design.mjs à partir de design/*.md : ne pas modifier à la main.\nexport const DESIGN_FILES: Record<string, string> = {\n${body}\n};\n`;
const target = join(root, "src", "design.generated.ts");
if (process.argv.includes("--check")) {
  const cur = readFileSync(target, "utf8");
  if (cur !== out) { console.error("design.generated.ts n'est pas à jour : lance pnpm --filter @press-hire/agent design"); process.exit(1); }
  console.log("bibliothèque de design à jour");
} else {
  writeFileSync(target, out);
  console.log(`${files.length} fichiers → src/design.generated.ts`);
}
