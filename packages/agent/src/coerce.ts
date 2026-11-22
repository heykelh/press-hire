/**
 * Réparation générique d'une réponse de modèle à partir des erreurs de validation Zod :
 * texte trop long → tronqué ; liste trop longue → coupée ; objet à la place d'un texte → son nom ;
 * nombre écrit en texte → converti ; valeur hors liste ou élément illisible → retiré quand c'est possible.
 * On revalide jusqu'à 4 fois. Sert pour la fiche du poste et le concept (qui ne doivent pas tout faire échouer).
 */
import type { z } from "zod";

type Obj = Record<string | number, unknown>;

function at(root: unknown, path: PropertyKey[]): { parent: Obj | undefined; key: PropertyKey | undefined; value: unknown } {
  let parent: Obj | undefined;
  let cur: unknown = root;
  let key: PropertyKey | undefined;
  for (const k of path) {
    parent = cur as Obj;
    key = k;
    cur = cur && typeof cur === "object" ? (cur as Obj)[k as string] : undefined;
  }
  return { parent, key, value: cur };
}

const asText = (v: unknown): string | undefined => {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v && typeof v === "object") {
    const o = v as Obj;
    for (const k of ["name", "label", "title", "fr", "text", "value"]) if (typeof o[k] === "string") return o[k] as string;
  }
  return undefined;
};

export function coerceToSchema<S extends z.ZodTypeAny>(schema: S, raw: unknown): z.ZodSafeParseResult<z.output<S>> {
  let data = structuredClone(raw);
  let res = schema.safeParse(data) as z.ZodSafeParseResult<z.output<S>>;
  for (let pass = 0; pass < 4 && !res.success; pass++) {
    let changed = false;
    // les suppressions d'éléments de liste se font de la fin vers le début
    const issues = [...res.error.issues].sort((a, b) => String(b.path.join(".")).localeCompare(String(a.path.join("."))));
    for (const is of issues) {
      const { parent, key, value } = at(data, is.path);
      const i = is as unknown as { code: string; maximum?: number | bigint; minimum?: number | bigint; expected?: string; origin?: string; type?: string };
      if (!parent || key === undefined) continue;
      const k = key as string;
      if (i.code === "too_big" && typeof value === "string" && i.maximum !== undefined) {
        const max = Number(i.maximum);
        parent[k] = value.slice(0, max - 1).replace(/\s+\S*$/, "").trim() || value.slice(0, max);
        changed = true;
      } else if (i.code === "too_big" && Array.isArray(value) && i.maximum !== undefined) {
        parent[k] = value.slice(0, Number(i.maximum));
        changed = true;
      } else if (i.code === "invalid_type" && i.expected === "string" && asText(value) !== undefined) {
        parent[k] = asText(value);
        changed = true;
      } else if (i.code === "invalid_type" && i.expected === "array" && value && typeof value === "object") {
        // { "1": {...}, "2": {...} } → liste de ses valeurs ; un seul objet → liste d'un élément
        const vals = Object.values(value as Obj);
        parent[k] = vals.length && vals.every((x) => x && typeof x === "object") ? vals : [value];
        changed = true;
      } else if (i.code === "invalid_type" && i.expected === "array" && typeof value === "string") {
        parent[k] = [value];
        changed = true;
      } else if (i.code === "invalid_type" && i.expected === "number" && typeof value === "string" && !Number.isNaN(Number(value))) {
        parent[k] = Number(value);
        changed = true;
      } else if (Array.isArray(parent)) {
        // élément illisible dans une liste : on le retire
        parent.splice(Number(k), 1);
        changed = true;
      } else if (i.code === "too_small" && typeof value === "string") {
        delete parent[k];
        changed = true;
      } else if (i.code === "invalid_value" || i.code === "invalid_enum_value") {
        delete parent[k]; // la valeur par défaut du schéma reprend la main
        changed = true;
      }
    }
    if (!changed) break;
    res = schema.safeParse(data) as z.ZodSafeParseResult<z.output<S>>;
  }
  void data;
  return res;
}
