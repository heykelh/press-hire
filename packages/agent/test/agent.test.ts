import { describe, expect, it } from "vitest";
import { simulateBestRun, validateCartridge } from "@press-hire/cartridge";
import {
  EXAMPLE_BRIEF,
  EXAMPLE_BRIEF_ARCADE,
  briefSchemaText,
  generate,
  parseJsonReply,
  parseOfferHtml,
  type GenerateEvent,
  type Llm,
} from "../src";

const OFFER_TEXT = "Nous recherchons un Data Analyst pour la supply chain. ".repeat(20);

const scripted = (...replies: string[]): Llm & { calls: number } => {
  const l = {
    name: "mock",
    calls: 0,
    async complete() {
      const r = replies[Math.min(l.calls, replies.length - 1)]!;
      l.calls++;
      return r;
    },
  };
  return l;
};

async function run(llm: Llm, extra: Record<string, unknown> = {}) {
  const events: GenerateEvent[] = [];
  for await (const e of generate({ offerText: OFFER_TEXT, ...extra }, { llm, now: new Date("2026-11-21T12:00:00Z"), rand: () => 0.1 }))
    events.push(e);
  return { events, last: events[events.length - 1]! };
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe("lecture d'offre", () => {
  it("lit le JobPosting JSON-LD", () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [{ "@type": "WebPage" }, {
        "@type": "JobPosting", title: "Data Engineer H/F", hiringOrganization: { name: "ACME" },
        description: "<p>Construire des pipelines&nbsp;de données.</p><ul><li>SQL</li><li>Python</li></ul>" + "<p>détail</p>".repeat(80),
        jobLocation: { address: { addressLocality: "Lyon" } }, employmentType: "FULL_TIME",
      }],
    })}</script></head><body>menu</body></html>`;
    const o = parseOfferHtml(html, "https://x.test/offre");
    expect(o.source).toBe("jsonld");
    expect(o.title).toBe("Data Engineer H/F");
    expect(o.company).toBe("ACME");
    expect(o.location).toBe("Lyon");
    expect(o.text).toContain("pipelines de données");
    expect(o.text).toContain("• SQL");
  });

  it("repère une page vide (mur de connexion)", () => {
    expect(parseOfferHtml("<html><body><main>Connectez-vous</main></body></html>").thin).toBe(true);
  });
});

describe("génération", () => {
  it("le schéma du brief s'exporte en JSON Schema", () => {
    expect(briefSchemaText().length).toBeGreaterThan(1000);
  });

  it("assemble un brief valide en cartouche publiable", async () => {
    const llm = scripted(JSON.stringify(EXAMPLE_BRIEF));
    const { last } = await run(llm, { offerUrl: undefined });
    expect(last.type).toBe("done");
    if (last.type !== "done") return;
    expect(llm.calls).toBe(1);
    expect(last.slug).toMatch(/^carrefour-france-data-analyst-[a-z2-9]{4}$/);
    expect(last.cartridge.meta.id).toBe(last.slug);
    expect(last.cartridge.candidate).toBeUndefined();
    expect(last.cartridge.ending.cta).toEqual([]);
    expect(last.cartridge.ending.skillsUnlocked.every((s) => s.proofId === undefined)).toBe(true);
    // prêt à publier : aucun emplacement, contrôle strict OK
    const strict = validateCartridge(last.cartridge, { strict: true });
    expect(strict.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("accepte un brief à mécaniques d'arcade", async () => {
    const { last } = await run(scripted(JSON.stringify(EXAMPLE_BRIEF_ARCADE)));
    expect(last.type).toBe("done");
    if (last.type !== "done") return;
    expect(last.cartridge.levels.map((l) => l.mechanic.type)).toEqual(["catch", "whack", "gauge", "sequence"]);
  });

  it("répare seul les petites fautes (codes, intro, traduction, réponse en bloc ```)", async () => {
    const b = clone(EXAMPLE_BRIEF) as any;
    const wheel = b.levels.find((l: any) => l.mechanic.type === "wheel");
    wheel.mechanic.segments[0].code = "rafraîchi";
    b.levels[0].intro = { fr: "Une intro beaucoup trop longue pour tenir dans la petite bulle du jeu, il faut absolument la couper.", en: "x" };
    delete b.design.tagline.en;
    b.analysis.requirements[0].id = "Req-Clean";
    for (const l of b.levels) if (l.requirementId === "req_clean") l.requirementId = "Req-Clean";
    const { last } = await run(scripted("```json\n" + JSON.stringify(b) + "\n```"));
    expect(last.type).toBe("done");
    if (last.type !== "done") return;
    const w = last.cartridge.levels.find((l) => l.mechanic.type === "wheel")!.mechanic;
    expect(w.type === "wheel" && w.segments[0]!.code).toBe("RAFRA");
    expect(last.cartridge.levels[0]!.intro.fr.length).toBeLessThanOrEqual(80);
    expect(last.cartridge.design.tagline.en).toBe(last.cartridge.design.tagline.fr);
  });

  it("renvoie les erreurs au modèle et accepte sa correction", async () => {
    const bad = clone(EXAMPLE_BRIEF) as any;
    bad.levels[0].requirementId = "req_inexistante";
    const llm = scripted(JSON.stringify(bad), JSON.stringify(EXAMPLE_BRIEF));
    const { events, last } = await run(llm);
    expect(last.type).toBe("done");
    expect(llm.calls).toBe(2);
    expect(events.some((e) => e.type === "step" && e.message.includes("correction"))).toBe(true);
  });

  it("règle lui-même un niveau gagné d'avance", async () => {
    const b = clone(EXAMPLE_BRIEF) as any;
    // objectif atteint dès le départ : disponibilité ≥ 80 alors qu'elle part de 92
    const lvl = b.levels.find((l: any) => l.mechanic.type === "slider");
    lvl.win = [{ var: "availability", op: ">=", value: 80 }];
    const llm = scripted(JSON.stringify(b));
    const { last } = await run(llm, { });
    expect(last.type).toBe("done");
    if (last.type !== "done") return;
    expect(llm.calls).toBe(1);
    const fixed = last.cartridge.levels.find((l) => l.mechanic.type === "slider")!;
    expect(fixed.win[0]!.scope).toBe("level");
    expect(simulateBestRun(last.cartridge).every((r) => r.winnable && !r.wonAtStart)).toBe(true);
  });

  it("échoue proprement sur une offre trop courte ou un modèle muet", async () => {
    const short = [];
    for await (const e of generate({ offerText: "court" }, { llm: scripted("{}") })) short.push(e);
    expect(short.at(-1)).toMatchObject({ type: "fail" });
    const { last } = await run(scripted("pas du json", "toujours pas", "non"));
    expect(last).toMatchObject({ type: "fail" });
  });

  it("parseJsonReply tolère du texte autour", () => {
    expect(parseJsonReply('Voici : {"a": 1} fin')).toEqual({ a: 1 });
  });
});
