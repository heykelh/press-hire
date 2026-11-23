import { describe, expect, it } from "vitest";
import { simulateBestRun, validateCartridge } from "@press-hire/cartridge";
import { coerceToSchema } from "../src/coerce";
import { Pitch } from "../src/pitch";
import {
  ARCADE,
  autoBalance,
  THINKING,
  BOSS_TEMPLATES,
  STAGES,
  VERB_MECHANICS,
  EXAMPLE_JOB,
  JobModel,
  planGame,
  EXAMPLE_BRIEF,
  EXAMPLE_BRIEF_ARCADE,
  briefSchemaText,
  generate,
  parseJsonReply,
  parseOfferHtml,
  chain,
  LlmError,
  withRetry,
  type GenerateEvent,
  type Llm,
} from "../src";

const OFFER_TEXT = "Nous recherchons un Data Analyst pour la supply chain. ".repeat(20);

const scripted = (...replies: string[]): Llm & { calls: number } => {
  const l = {
    name: "mock",
    calls: 0,
    async complete(_s: string, _u: string, opts?: { task?: string }) {
      // ces tests portent sur l'écriture et les corrections : pas de fiche du poste (repli sur l'offre)
      if (opts?.task === "analyze" || opts?.task === "pitch") return "{}";
      const r = replies[Math.min(l.calls, replies.length - 1)]!;
      l.calls++;
      return r;
    },
  };
  return l;
};

async function run(llm: Llm, extra: Record<string, unknown> = {}) {
  const events: GenerateEvent[] = [];
  for await (const e of generate({ offerText: OFFER_TEXT, ...extra }, { llm, now: new Date("2026-11-21T12:00:00Z"), rand: () => 0.1, skipCritique: true }))
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
    expect(last.cartridge.levels.map((l) => l.mechanic.type)).toEqual(["catch", "whack", "inspection", "gauge", "investigation", "sequence"]);
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
    bad.events[0].effects[0].var = "variable_inexistante"; // seul le modèle sait quelle variable il voulait
    const llm = scripted(JSON.stringify(bad), JSON.stringify(EXAMPLE_BRIEF));
    const { events, last } = await run(llm);
    expect(last.type).toBe("done");
    expect(llm.calls).toBe(2);
    expect(events.some((e) => e.type === "step" && e.message.includes("correction"))).toBe(true);
  });

  it("recâble seul une compétence inventée par le modèle, sans lui redemander", async () => {
    const bad = clone(EXAMPLE_BRIEF) as any;
    bad.levels[0].requirementId = "req_inexistante";
    const llm = scripted(JSON.stringify(bad));
    const { last } = await run(llm);
    expect(last.type).toBe("done");
    expect(llm.calls).toBe(1);
  });

  it("règle lui-même un niveau gagné d'avance", async () => {
    const b = clone(EXAMPLE_BRIEF) as any;
    // objectif atteint dès le départ : disponibilité ≥ 80 alors qu'elle part de 92 (le coût garde l'arbitrage)
    const lvl = b.levels.find((l: any) => l.mechanic.type === "slider");
    lvl.win = [{ var: "availability", op: ">=", value: 80 }, { var: "stock_cost", op: "<=", value: 220 }];
    const llm = scripted(JSON.stringify(b));
    const { last } = await run(llm, { });
    expect(last.type).toBe("done");
    if (last.type !== "done") return;
    expect(llm.calls).toBe(1);
    const fixed = last.cartridge.levels.find((l) => l.mechanic.type === "slider")!;
    expect(fixed.win[0]!.scope).toBe("level");
    expect(simulateBestRun(last.cartridge).every((r) => r.winnable && !r.wonAtStart)).toBe(true);
  });

  it("répare seul des objectifs impossibles (variable jamais touchée par la mécanique, boss compris)", async () => {
    const b = clone(EXAMPLE_BRIEF_ARCADE) as any;
    const quizLike = b.levels.find((l: any) => l.mechanic.type === "inspection");
    quizLike.win = [{ var: "playbook", op: ">=", value: 5, scope: "level" }]; // l'inspection ne touche jamais « playbook »
    for (const ph of b.boss.phases) ph.win = [{ var: "access", op: ">=", value: 30 }]; // ni les phases du boss
    const llm = scripted(JSON.stringify(b), JSON.stringify(b), JSON.stringify(b));
    const { last } = await run(llm, {});
    expect(last.type).toBe("done");
    if (last.type !== "done") return;
    expect(simulateBestRun(last.cartridge).every((r) => r.winnable)).toBe(true);
  });

  it("sauve le jeu quand un seul niveau reste malformé après les corrections (liste trop courte)", async () => {
    const b = clone(EXAMPLE_BRIEF_ARCADE) as any;
    const insp = b.levels.find((l: any) => l.mechanic.type === "inspection");
    insp.mechanic.cases = insp.mechanic.cases.slice(0, 2); // « Too small: expected array to have >=3 items »
    const n = b.levels.length;
    const { events, last } = await run(scripted(JSON.stringify(b), JSON.stringify(b), JSON.stringify(b)), {});
    expect(last.type).toBe("done");
    if (last.type !== "done") return;
    expect(last.cartridge.levels).toHaveLength(n - 1);
    expect(last.issues.some((i) => i.rule === "salvage")).toBe(true);
    expect(events.some((e) => e.type === "warn" && /Sauvetage/.test(e.message) && /trop peu de dossiers/.test(e.message))).toBe(true);
  });

  it("l'équilibrage déplace la meilleure réplique d'un dialogue (« toujours la première » ne gagne plus)", async () => {
    const { last } = await run(scripted(JSON.stringify(EXAMPLE_BRIEF)), {});
    if (last.type !== "done") throw new Error("exemple invalide");
    const c = clone(last.cartridge) as any;
    const dl = c.levels.find((l: any) => l.mechanic.type === "dialogue");
    const w = dl.win[0];
    for (const n of dl.mechanic.nodes)
      n.choices.forEach((ch: any, j: number) => { ch.effects = [{ var: w.var, op: "add", value: j === 0 ? 3 : -1 }]; });
    dl.win = [{ var: w.var, op: ">=", value: 3, scope: "level" }];
    expect(validateCartridge(c).issues.some((i) => i.rule === "naive-win")).toBe(true);
    const fixed = autoBalance(c, [dl.id]);
    const r = validateCartridge(fixed);
    expect(r.issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  it("répare seul des phases de boss déjà gagnées avant de jouer", async () => {
    const b = clone(EXAMPLE_BRIEF_ARCADE) as any;
    for (const ph of b.boss.phases) ph.win = [{ var: "trust", op: ">=", value: 40 }]; // trust part de 50 : gagné d'avance
    const { last } = await run(scripted(JSON.stringify(b), JSON.stringify(b), JSON.stringify(b)), {});
    if (last.type === "fail") throw new Error(last.message);
    if (last.type !== "done") return;
    expect(last.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(simulateBestRun(last.cartridge).some((r) => r.wonAtStart)).toBe(false);
  });

  it("lit un concept dont les niveaux arrivent en objet au lieu d'une liste", () => {
    const raw = { choice: 1, why: "x", title: "TITRE", hook: "Une accroche assez longue pour passer.", runningGag: "Le café.",
      levels: { "1": { order: 1, angle: "Un angle.", twist: "Un twist." }, "2": { order: 2, angle: "Autre angle.", twist: "Autre." } },
      boss: { name: "Boss", phases: [{ intro: "Il attaque." }] } };
    const r = coerceToSchema(Pitch, raw);
    expect(r.success).toBe(true);
  });

  it("explique un échec en français quand rien n'est récupérable", async () => {
    const { last } = await run(scripted("pas du json", "toujours pas", "non"), {});
    expect(last.type).toBe("fail");
    if (last.type === "fail") expect(last.message).toMatch(/JSON/);
  });

  it("refuse un niveau qui se gagne sans réfléchir, et fait tourner les bonnes réponses", async () => {
    const b = clone(EXAMPLE_BRIEF) as any;
    const quiz = b.levels.find((l: any) => l.mechanic.type === "quiz").mechanic;
    for (const q of quiz.questions) q.correctIndex = 0; // le biais classique : la bonne réponse toujours en premier
    const { last } = await run(scripted(JSON.stringify(b)), {});
    expect(last.type).toBe("done");
    if (last.type !== "done") return;
    const qz = last.cartridge.levels.find((l) => l.mechanic.type === "quiz")!.mechanic as { questions: Array<{ correctIndex: number }> };
    expect(new Set(qz.questions.map((q) => q.correctIndex)).size).toBeGreaterThan(1);
    expect(last.issues.some((i) => i.rule === "naive-win")).toBe(false);
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

/* ---------------- pipeline complet : fiche du poste, plan, relecture, révision ---------------- */

const SOC_JOB = EXAMPLE_JOB;


const tasked = (map: Record<string, string | string[]>) => {
  const calls: string[] = [];
  const llm: Llm = {
    name: "mock",
    async complete(_s, _u, opts) {
      const task = opts?.task ?? "?";
      calls.push(task);
      const v = map[task] ?? "{}";
      return Array.isArray(v) ? v[Math.min(calls.filter((c) => c === task).length - 1, v.length - 1)]! : v;
    },
  };
  return { llm, calls };
};

async function runFull(llm: Llm) {
  const events: GenerateEvent[] = [];
  for await (const e of generate({ offerText: OFFER_TEXT }, { llm, now: new Date("2026-11-21T12:00:00Z"), rand: () => 0.1 })) events.push(e);
  return { events, last: events[events.length - 1]! };
}

describe("fiche du poste et plan", () => {
  const job = JobModel.parse(SOC_JOB);
  const plan = planGame(job);

  it("choisit la mécanique parmi celles qui correspondent au verbe du métier", () => {
    const faithful = plan.levels.filter((l) => VERB_MECHANICS[l.verb].includes(l.mechanic)).length;
    expect(faithful).toBeGreaterThanOrEqual(plan.levels.length - 2);
  });

  it("garantit variété, arcade, réflexion, format, entrées et boss à plusieurs formes", () => {
    for (let seed = 1; seed <= 25; seed++) {
      let x = seed;
      const rand = () => ((x = (x * 16807) % 2147483647) / 2147483647);
      const p = planGame(job, { rand });
      const m = p.levels.map((l) => l.mechanic);
      expect(m.length).toBeGreaterThanOrEqual(4);
      expect(m.filter((x) => ARCADE.includes(x)).length).toBeGreaterThanOrEqual(2);
      expect(m.some((x) => THINKING.includes(x))).toBe(true);
      expect(m.filter((x) => x === "quiz").length).toBeLessThanOrEqual(1);
      for (let i = 1; i < m.length; i++) expect(m[i]).not.toBe(m[i - 1]);
      expect(m.includes("pipes")).toBe(false);
      expect(STAGES[p.format]).toBeDefined();
      for (const l of p.levels) expect(l.day.fr.length).toBeLessThanOrEqual(18);
      expect(p.levels[0]!.entry).toBe("briefing");
      expect(p.levels.some((l) => l.entry !== "briefing")).toBe(true);
      expect(p.levels[0]!.modifiers).toEqual([]);
      const b = p.boss!;
      expect(b.phases.length).toBeGreaterThanOrEqual(2);
      expect(b.phases.some((ph) => ARCADE.includes(ph.mechanic))).toBe(true);
      for (let i = 1; i < b.phases.length; i++) expect(b.phases[i]!.mechanic).not.toBe(b.phases[i - 1]!.mechanic);
    }
  });

  it("varie vraiment d'un jeu à l'autre, et évite ce qui a servi récemment", () => {
    const formats = new Set<string>(), bosses = new Set<string>(), shapes = new Set<string>();
    let x = 42;
    const rand = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 40; k++) {
      const p = planGame(job, { rand });
      formats.add(p.format); bosses.add(p.boss!.archetype); shapes.add(p.levels.map((l) => l.mechanic).join(","));
    }
    expect(formats.size).toBeGreaterThanOrEqual(5);
    expect(bosses.size).toBeGreaterThanOrEqual(3);
    expect(shapes.size).toBeGreaterThanOrEqual(8);
    expect(Object.keys(BOSS_TEMPLATES).length).toBeGreaterThanOrEqual(7);
    // historique : le format et le boss du dernier jeu reviennent beaucoup moins souvent
    let same = 0, sameRecent = 0;
    for (let k = 0; k < 60; k++) {
      const a = planGame(job, { rand });
      const b = planGame(job, { rand, recent: { formats: [a.format], mechanics: [], bosses: [a.boss!.archetype] } });
      const c = planGame(job, { rand });
      if (c.format === a.format) same++;
      if (b.format === a.format) sameRecent++;
    }
    expect(sameRecent).toBeLessThan(same);
  });

  it("ajoute un échange quand l'offre demande des qualités humaines", () => {
    const p = planGame(JobModel.parse({ ...SOC_JOB, softSkills: ["pédagogie"] }));
    expect(p.levels.some((l) => l.mechanic === "dialogue")).toBe(true);
  });
});

describe("pipeline complet", () => {
  const brief = JSON.stringify(EXAMPLE_BRIEF_ARCADE);
  const good = JSON.stringify({ scores: { accuracy: 9, pedagogy: 8, fun: 9, wow: 8 }, levels: [], global: ["Rien à redire."] });
  const weak = JSON.stringify({
    scores: { accuracy: 6, pedagogy: 5, fun: 8, wow: 6 },
    levels: [{ id: "lvl_phish", accuracy: 5, pedagogy: 5, fun: 8, problems: ["étiquettes trop vagues"], fix: "montrer de vrais objets de mails" }],
    global: ["ajouter une notion sur le MFA"],
  });

  it("analyse, planifie, écrit, relit et livre une cartouche notée", async () => {
    const { llm, calls } = tasked({ analyze: JSON.stringify(SOC_JOB), write: brief, critique: good, repair: brief });
    const { events, last } = await runFull(llm);
    expect(calls.filter((c) => !["pitch", "repair"].includes(c))).toEqual(["analyze", "write", "critique"]);
    expect(calls[1]).toBe("pitch");
    expect(last.type).toBe("done");
    if (last.type !== "done") return;
    expect(last.scores).toEqual({ accuracy: 9, pedagogy: 8, fun: 9, wow: 8 });
    expect(last.cartridge.analysis.requirements.map((r) => r.id)).toContain("req_iam");
    expect(last.cartridge.review.notes).toContain("justesse 9/10");
    expect(events.some((e) => e.type === "step" && e.message.startsWith("Plan « "))).toBe(true);
    expect(last.slug).toMatch(/^demo-cyber-analyste-soc-[a-z2-9]{4}$/);
  });

  it("révise le jeu quand les relecteurs le jugent faible", async () => {
    const { llm, calls } = tasked({ analyze: JSON.stringify(SOC_JOB), write: brief, critique: weak, revise: brief, repair: brief });
    const { events, last } = await runFull(llm);
    expect(calls.filter((c) => !["pitch", "repair"].includes(c))).toEqual(["analyze", "write", "critique", "revise"]);
    expect(last.type).toBe("done");
    expect(events.some((e) => e.type === "step" && e.message === "Version révisée retenue.")).toBe(true);
  });

  it("garde la première version si la révision est cassée", async () => {
    const { llm } = tasked({ analyze: JSON.stringify(SOC_JOB), write: brief, critique: weak, revise: "pas du json", repair: "toujours pas" });
    const { events, last } = await runFull(llm);
    expect(last.type).toBe("done");
    expect(events.some((e) => e.type === "warn" && e.message.includes("on garde la première"))).toBe(true);
  });

  it("se passe de la fiche du poste si l'analyse échoue", async () => {
    const { llm } = tasked({ analyze: "n'importe quoi", write: brief, critique: good });
    const { events, last } = await runFull(llm);
    expect(last.type).toBe("done");
    expect(events.some((e) => e.type === "warn" && /Analyse impossible|incomplète/.test(e.message))).toBe(true);
  });
});

describe("heure limite (jamais de coupure silencieuse)", () => {
  it("un modèle qui ne répond jamais n'empêche pas un message de fin avant l'heure limite", async () => {
    const slow = { name: "lent", async complete(_s: string, _u: string, o?: any) {
      if (o?.task === "analyze") return JSON.stringify(EXAMPLE_JOB);
      if (o?.task === "pitch") return "{}";
      // l'écriture : le modèle traîne jusqu'à ce que l'heure limite tombe
      const left = (o?.deadline ?? Date.now() + 5000) - Date.now();
      await new Promise((r) => setTimeout(r, Math.max(0, left - 9000)));
      const { expiredError } = await import("../src/llm");
      throw expiredError();
    } };
    const t = Date.now();
    const events: GenerateEvent[] = [];
    for await (const e of generate({ offerText: "Consultant digital. ".repeat(40) }, { llm: chain([slow]), now: new Date(), skipCritique: true, budgetMs: 12_000 })) events.push(e);
    const last = events.at(-1)!;
    expect(last.type).toBe("fail");
    if (last.type === "fail") expect(last.message).toMatch(/Temps maximal/);
    expect(Date.now() - t).toBeLessThan(12_000);
  }, 20_000);

  it("pas de nouvel essai ni d'attente qui dépasse l'heure limite", async () => {
    let calls = 0;
    const flaky = withRetry({ name: "503", async complete() { calls++; throw Object.assign(new LlmError("503", true, 503), {}); } }, { baseMs: 4000 });
    const t = Date.now();
    await expect(flaky.complete("s", "u", { deadline: Date.now() + 9000 })).rejects.toBeTruthy();
    expect(Date.now() - t).toBeLessThan(3000);
    expect(calls).toBe(1);
  });
});
