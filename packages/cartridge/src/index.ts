import { Cartridge } from "./schema";
import { hasErrors, lintCartridge, type Issue } from "./lint";

export * from "./schema";
export * from "./lint";
export * from "./slug";
export * from "./rules";

export type ValidationResult =
  | { ok: true; cartridge: Cartridge; issues: Issue[] }
  | { ok: false; cartridge?: Cartridge; issues: Issue[] };

/** Schéma Zod puis règles métier. `strict` = règles de publication. */
export function validateCartridge(input: unknown, opts: { strict?: boolean } = {}): ValidationResult {
  const parsed = Cartridge.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        rule: "schema",
        severity: "error" as const,
        path: i.path.join("."),
        message: i.message,
      })),
    };
  }
  const issues = lintCartridge(parsed.data, opts);
  return hasErrors(issues)
    ? { ok: false, cartridge: parsed.data, issues }
    : { ok: true, cartridge: parsed.data, issues };
}

export function formatIssues(issues: Issue[]): string {
  if (!issues.length) return "Aucun problème.";
  return issues
    .map((i) => `${i.severity === "error" ? "ERREUR" : "avert."}  [${i.rule}] ${i.path || "(racine)"} : ${i.message}`)
    .join("\n");
}
