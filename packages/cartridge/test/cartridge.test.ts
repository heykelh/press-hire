import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Cartridge, arcadeCounts, lintCartridge, makeSlug, validateCartridge } from "../src";

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
  it("accepte une fin sans profil ni boutons (format v0.3)", () => {
    expect(rules(parse((c) => {
      delete c.candidate;
      c.ending.cta = [];
      c.ending.skillsUnlocked = c.ending.skillsUnlocked.map(({ proofId, ...rest }: any) => rest);
      c.levels.forEach((l: any) => (l.requirementId = c.analysis.requirements[0].id));
      c.analysis.requirements.forEach((r: any) => (r.priority = "nice"));
    }))).toEqual([]);
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

describe("mécaniques d'arcade", () => {
  it("répartit le paquet d'objets selon les poids, sans en perdre", () => {
    expect(arcadeCounts([3, 1], 36)).toEqual([27, 9]);
    const c = arcadeCounts([1, 1, 1], 10);
    expect(c.reduce((a, b) => a + b, 0)).toBe(10);
  });
});

describe("format v0.4", () => {
  const soc = () => JSON.parse(readFileSync(new URL("../../../fixtures/cartridges/demo-arcade-soc.json", import.meta.url), "utf8"));
  it("la démo SOC (inspection, enquête, histoire, notions) passe tous les contrôles", () => {
    const r = validateCartridge(soc());
    expect(r.issues.filter((i) => i.severity === "error")).toEqual([]);
  });
  it("refuse un dossier à rejeter sans champ fautif", () => {
    const c = soc();
    const insp = c.levels.find((l: any) => l.mechanic.type === "inspection");
    insp.mechanic.cases[1].fields.forEach((f: any) => (f.faulty = false));
    expect(validateCartridge(c).issues.map((i) => i.rule)).toContain("inspection-fields");
  });
  it("refuse une notion inconnue et une réponse d'enquête hors limites", () => {
    const c = soc();
    c.levels[0].teaches = ["c_inconnue"];
    c.levels.find((l: any) => l.mechanic.type === "investigation").mechanic.rounds[0].answer = 99;
    const rules = validateCartridge(c).issues.map((i) => i.rule);
    expect(rules).toContain("concept-ref");
    expect(rules).toContain("investigation-answer");
  });
});

describe("mécaniques d'action et joueurs humains (v0.8)", () => {
  const action = () => load("demo-action.json");
  const lv = (c: any, id: string) => c.levels.find((l: any) => l.id === id);

  it("la démo d'action (course, tir, rythme) passe sans avertissement", () => {
    expect(validateCartridge(action()).issues).toEqual([]);
  });

  it("le tir refuse « tirer sur tout » quand les alliés ne coûtent rien", () => {
    const c = action();
    lv(c, "lvl_whack").mechanic.onWrong = [];
    expect(validateCartridge(c).issues.map((i) => i.rule)).toContain("naive-win");
  });

  it("le rythme refuse « toujours la même colonne » et signale une colonne inconnue", () => {
    const c = action();
    const m = lv(c, "lvl_gauge").mechanic;
    m.onWrong = []; m.onMiss = []; m.onHit = [{ var: "tuning", op: "add", value: 4 }];
    expect(validateCartridge(c).issues.map((i) => i.rule)).toContain("naive-win");
    const c2 = action();
    lv(c2, "lvl_gauge").mechanic.notes[0].lane = "nope";
    expect(validateCartridge(c2).issues.map((i) => i.rule)).toContain("rhythm-lane");
  });

  it("un objectif presque parfait en réflexion est signalé trop dur pour un débutant", () => {
    const c = action();
    lv(c, "lvl_access").win[0].value = 16;
    const issues = validateCartridge(c).issues;
    expect(issues.some((i) => i.rule === "balance-hard" || i.rule === "balance-unwinnable")).toBe(true);
  });
});
