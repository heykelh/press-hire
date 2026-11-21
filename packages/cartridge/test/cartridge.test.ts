import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Cartridge, lintCartridge, makeSlug, validateCartridge } from "../src";

const FIX = join(__dirname, "../../../fixtures/cartridges");
const load = (f: string) => JSON.parse(readFileSync(join(FIX, f), "utf8"));
const demo = () => load("air-france-fuel-demo.json");

describe("fixtures", () => {
  for (const f of readdirSync(FIX).filter((x) => x.endsWith(".json"))) {
    it(`${f} passe le schéma et le lint (hors publication)`, () => {
      const r = validateCartridge(load(f));
      expect(r.issues.filter((i) => i.severity === "error")).toEqual([]);
      expect(r.ok).toBe(true);
    });
  }

  it("la démo est refusée à la publication tant que les emplacements ne sont pas remplis", () => {
    const r = validateCartridge(demo(), { strict: true });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.rule === "placeholder" && i.severity === "error")).toBe(true);
  });
});

describe("règles métier", () => {
  const parse = (mut: (c: any) => void) => {
    const c = demo();
    mut(c);
    return lintCartridge(Cartridge.parse(c));
  };
  const rules = (issues: ReturnType<typeof lintCartridge>) => issues.filter((i) => i.severity === "error").map((i) => i.rule);

  it("refuse une variable inconnue dans un effet", () => {
    expect(rules(parse((c) => (c.levels[2].mechanic.segments[0].effects[0].var = "budget")))).toContain("var-ref");
  });
  it("refuse un niveau rattaché à une exigence inconnue", () => {
    expect(rules(parse((c) => (c.levels[0].requirementId = "req_x")))).toContain("level-requirement");
  });
  it("refuse une exigence obligatoire sans niveau ni preuve", () => {
    expect(rules(parse((c) => (c.levels = c.levels.filter((l: any) => l.requirementId !== "req_ops"))))).toContain("must-coverage");
  });
  it("refuse une blague qui cite l'entreprise", () => {
    expect(rules(parse((c) => (c.levels[0].failJokes[0].fr = "Air France vous regarde.")))).toContain("no-mocking");
  });
  it("refuse une intro trop longue", () => {
    expect(rules(parse((c) => (c.levels[0].intro.fr = "x".repeat(81))))).toContain("intro-length");
  });
  it("refuse une fin sans bouton contact", () => {
    expect(rules(parse((c) => (c.ending.cta = c.ending.cta.filter((x: any) => x.type !== "contact"))))).toContain("cta");
  });
  it("accepte une cartouche sans boss", () => {
    expect(rules(parse((c) => delete c.boss))).toEqual([]);
  });
  it("refuse un tri où tout est à accepter", () => {
    expect(rules(parse((c) => c.levels[1].mechanic.items.forEach((i: any) => (i.correct = "accept"))))).toContain("triage-balance");
  });
});

describe("slug", () => {
  it("est lisible et se termine par 4 caractères", () => {
    const s = makeSlug("Air France", "Data Analyst IA Fuel & Efficiency (H/F)", () => 0);
    expect(s).toMatch(/^air-france-data-analyst-ia-fuel-[a-z2-9]{4}$/);
  });
});
