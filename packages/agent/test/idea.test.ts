import { describe, expect, it } from "vitest";
import { validateCartridge } from "@press-hire/cartridge";
import { EXAMPLE_BRIEF_ARCADE, EXAMPLE_JOB, IdeaOptions, JobModel, generate, ideaText, planGame, type GenerateEvent, type Llm } from "../src";

const job = JobModel.parse(EXAMPLE_JOB);

describe("mode idée", () => {
  it("valide le formulaire avec des valeurs par défaut sûres", () => {
    const o = IdeaOptions.parse({ idea: "Un apprenti boulanger qui sauve la fournée de Noël", levels: "4", skin: "" });
    expect(o).toMatchObject({ levels: 4, tone: "drole", audience: "grand_public", boss: true, mechanics: [] });
    expect(o.skin).toBeUndefined();
    expect(IdeaOptions.safeParse({ idea: "court" }).success).toBe(false);
    expect(ideaText(o)).toContain("apprenti boulanger");
  });

  it("respecte le nombre de niveaux, les mécaniques choisies, le format et l'absence de boss", () => {
    const p = planGame(job, { levels: 4, mechanics: ["quiz", "catch"], idea: true, format: "quete", boss: false, skin: "gameboy" });
    expect(p.levels).toHaveLength(4);
    expect(new Set(p.levels.map((l) => l.mechanic))).toEqual(new Set(["quiz", "catch"]));
    for (let i = 1; i < p.levels.length; i++) expect(p.levels[i]!.mechanic).not.toBe(p.levels[i - 1]!.mechanic);
    expect(p.levels.map((l) => l.day.fr)).toEqual(["MONDE 1-1", "MONDE 1-2", "MONDE 2-1", "MONDE 2-2"]);
    expect(p.boss).toBeUndefined();
    expect(p.skin).toBe("gameboy");
    expect(p.forcedSkin).toBe(true);
    expect(p.forcedScene).toBe(false);
  });

  it("ne répète jamais une mécanique d'affilée, même avec peu de mécaniques choisies", () => {
    for (let k = 0; k < 60; k++) {
      const p = planGame(job, { levels: 3 + (k % 4), mechanics: k % 2 ? ["quiz", "catch"] : ["whack", "gauge", "triage"], idea: true });
      for (let i = 1; i < p.levels.length; i++) expect(p.levels[i]!.mechanic).not.toBe(p.levels[i - 1]!.mechanic);
    }
  });

  it("utilise chaque mécanique demandée au moins une fois quand il y a assez de niveaux", () => {
    const wanted = ["wheel", "sequence", "dialogue", "inspection", "gauge"] as const;
    const p = planGame(job, { levels: 6, mechanics: [...wanted], idea: true });
    for (const m of wanted) expect(p.levels.some((l) => l.mechanic === m)).toBe(true);
  });

  it("génère un jeu complet sans offre d'emploi, avec les mondes et l'habillage imposés", async () => {
    const prompts: Record<string, string> = {};
    const llm: Llm = {
      name: "mock",
      async complete(system, user, opts) {
        prompts[opts?.task ?? "?"] = system + user;
        if (opts?.task === "analyze") return JSON.stringify(job);
        if (opts?.task === "pitch") return "{}";
        return JSON.stringify(EXAMPLE_BRIEF_ARCADE);
      },
    };
    const idea = IdeaOptions.parse({ idea: "Un stagiaire du SOC qui doit repousser une vague de phishing pendant la fête de Noël", skin: "synth", title: "Noël Rouge", levels: 6 });
    const events: GenerateEvent[] = [];
    for await (const e of generate({ idea }, { llm, now: new Date("2026-11-22T12:00:00Z"), rand: () => 0.1, skipCritique: true })) events.push(e);
    const done = events.find((e) => e.type === "done");
    if (done?.type !== "done") throw new Error(JSON.stringify(events.filter((e) => e.type !== "step"), null, 1));
    expect(validateCartridge(done.cartridge).ok).toBe(true);
    expect(done.cartridge.design.skin).toBe("synth");
    expect(done.cartridge.levels[0]!.day?.fr).toBeTruthy();
    expect(done.cartridge.design.format).toBeTruthy();
    expect(done.slug.startsWith("noel-rouge")).toBe(true);
    expect(prompts.analyze).toContain("IDÉE de jeu");
    expect(prompts.write).toContain("MODE IDÉE");
    expect(prompts.write).not.toContain("OFFRE D'EMPLOI\n");
  });
});
