import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { simulateBestRun } from "@press-hire/cartridge";
import { generate, EXAMPLE_JOB, type GenerateEvent } from "../src";

/**
 * Reproduction de l'échec Wavestone du 23/11 : le boss a 3 phases (chasse aux risques → mémoire → tir),
 * la chasse se gagne en cliquant sur tout (erreurs gratuites), le tir est gagné d'avance,
 * l'inspection du niveau 5 ne rapporte rien. Le modèle ne corrige jamais.
 */
it("répare l'échec Wavestone (chasse « cliquer sur tout », tir gagné d'avance, inspection qui ne rapporte rien)", async () => {
  const { meta: _m, ...b } = JSON.parse(readFileSync(join(__dirname, "../../../fixtures/cartridges/demo-action.json"), "utf8")) as any;
  void _m;
  const L = (id: string) => b.levels.find((l: any) => l.id === id);
  const hunt = structuredClone(L("lvl_hunt"));
  const seq = structuredClone(L("lvl_seq"));
  const shoot = structuredClone(L("lvl_whack"));
  hunt.mechanic.onWrong = []; // cliquer sur tout ne coûte rien
  shoot.mechanic.onHit = []; shoot.mechanic.onWrong = []; // le tir ne compte rien…
  const base = b.boss.phases[0];
  b.boss.phases = [
    { ...structuredClone(base), mechanic: hunt.mechanic, win: [{ var: "hunt", op: ">=", value: 1, scope: "level" }] },
    { ...structuredClone(base), mechanic: seq.mechanic, win: seq.win },
    { ...structuredClone(base), mechanic: shoot.mechanic, win: [{ var: "trust", op: ">=", value: 10 }] }, // …et vise une variable déjà remplie
  ];
  const insp = L("lvl_access");
  insp.mechanic.onCorrect = []; insp.mechanic.onSpotted = []; // l'inspection ne rapporte rien
  // niveau 5 = inspection, comme dans le vrai jeu
  b.levels = [L("lvl_hunt"), L("lvl_gauge"), L("lvl_phish"), L("lvl_seq"), insp].map((l: any, i: number) => ({ ...l, order: i + 1 }));
  const text = JSON.stringify(b);
  const llm = { name: "m", async complete(_s: string, _u: string, o?: any) {
    if (o?.task === "analyze") return JSON.stringify(EXAMPLE_JOB);
    if (o?.task === "pitch") return "{}";
    return text;
  } };
  const events: GenerateEvent[] = [];
  for await (const e of generate({ offerText: "Consultant digital Wavestone. ".repeat(30) }, { llm, now: new Date("2026-11-23"), rand: () => 0.4, skipCritique: true })) events.push(e);
  const last = events.at(-1)!;
  if (last.type === "fail") throw new Error(last.message);
  expect(last.type).toBe("done");
  if (last.type !== "done") return;
  // réparé, pas amputé : les 5 niveaux et les 3 phases restent
  expect(last.cartridge.levels).toHaveLength(5);
  expect(last.cartridge.boss?.phases).toHaveLength(3);
  expect(last.issues.some((i) => i.rule === "salvage")).toBe(false);
  expect(simulateBestRun(last.cartridge).every((r) => r.winnable && !r.wonAtStart && !r.naive?.length)).toBe(true);
});
