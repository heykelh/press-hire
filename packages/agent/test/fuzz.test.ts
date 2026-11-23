import { it, expect } from "vitest";
import { generate, EXAMPLE_BRIEF, EXAMPLE_BRIEF_ARCADE, EXAMPLE_JOB, type GenerateEvent } from "../src";

const clone = (x: any) => JSON.parse(JSON.stringify(x));
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

/** Abîme une réponse de modèle comme le font vraiment les modèles. */
function corrupt(b: any, r: () => number): string[] {
  const done: string[] = [];
  const n = 1 + Math.floor(r() * 3); // 1 à 3 niveaux abîmés
  for (let k = 0; k < n; k++) {
    const i = Math.floor(r() * b.levels.length);
    const l = b.levels[i]; const m = l.mechanic;
    const kind = Math.floor(r() * 6);
    if (kind === 0) {
      // liste trop courte, y compris imbriquée (rounds[0].items…)
      const lists: Array<[any, string, string]> = [];
      const walk = (o: any, path: string, depth: number) => {
        if (!o || typeof o !== "object" || depth > 3) return;
        for (const key of Object.keys(o)) {
          const v = o[key];
          if (Array.isArray(v)) { if (v.length > 1) lists.push([o, key, `${path}.${key}`]); v.forEach((x, j) => walk(x, `${path}.${key}.${j}`, depth + 1)); }
          else if (v && typeof v === "object" && !("fr" in v)) walk(v, `${path}.${key}`, depth + 1);
        }
      };
      walk(m, `L${i + 1}`, 0);
      if (lists.length) { const [o, key, p] = lists[Math.floor(r() * lists.length)]!; o[key] = o[key].slice(0, 1); done.push(`${p} trop court`); }
    } else if (kind === 1) {
      l.win = [{ var: b.state.vars[Math.floor(r() * b.state.vars.length)].id, op: ">=", value: 999 }]; done.push(`L${i + 1} impossible`);
    } else if (kind === 2) {
      l.win = [{ var: b.state.vars[0].id, op: ">=", value: -999 }]; done.push(`L${i + 1} gagné d'avance`);
    } else if (kind === 3) {
      delete m.type; done.push(`L${i + 1} sans type`);
    } else if (kind === 4) {
      l.title = { fr: "x".repeat(300), en: "x" }; done.push(`L${i + 1} titre long`);
    } else if (m.type === "dialogue" || m.type === "quiz") {
      if (m.type === "quiz") m.questions.forEach((q: any) => { const c = q.options[q.correctIndex]; q.options.splice(q.correctIndex, 1); q.options.unshift(c); q.correctIndex = 0; });
      done.push(`L${i + 1} bonne réponse toujours en premier`);
    }
  }
  if (b.boss?.phases && r() < 0.3) {
    const ph = b.boss.phases[Math.floor(r() * b.boss.phases.length)];
    const lists = Object.keys(ph.mechanic).filter((x) => Array.isArray(ph.mechanic[x]) && ph.mechanic[x].length > 1);
    if (lists.length) { ph.mechanic[lists[0]!] = ph.mechanic[lists[0]!].slice(0, 1); done.push(`boss phase ${lists[0]} trop court`); }
  }
  if (b.boss?.phases && r() < 0.5) {
    for (const ph of b.boss.phases) ph.win = [{ var: b.state.vars[0].id, op: ">=", value: -5 }];
    done.push("boss gagné d'avance");
  }
  return done;
}

it("l'agent livre un jeu même quand le modèle rend une réponse abîmée et ne la corrige jamais", async () => {
  const fails: string[] = [];
  const N = Number(process.env.FUZZ_N ?? 400);
  for (let seed = Number(process.env.FUZZ_FROM ?? 1); seed <= N; seed++) {
    const r = rng(seed);
    const b = clone(seed % 2 ? EXAMPLE_BRIEF_ARCADE : EXAMPLE_BRIEF);
    const what = corrupt(b, r);
    const text = JSON.stringify(b);
    const llm = { name: "m", async complete(_s: string, _u: string, o?: any) {
      if (o?.task === "analyze") return JSON.stringify(EXAMPLE_JOB);
      if (o?.task === "pitch") {
        const lv = [{ angle: "Un vrai dossier du métier.", twist: "La règle change en cours de route." }, { order: "2", angle: "Une réunion qui dérape.", twist: "Le client rappelle." }];
        const pitch: any = { choice: seed % 3, why: "x", title: "OPÉRATION TEST", hook: "Une accroche suffisamment longue pour être lue.", runningGag: "La machine à café.", levels: seed % 4 === 0 ? { a: lv[0], b: lv[1] } : lv, boss: { name: "Le Boss", phases: [{ intro: "Il attaque." }] } };
        return JSON.stringify(pitch);
      }
      return text;
    } };
    let last: GenerateEvent | undefined;
    const pitchBad: string[] = [];
    for await (const e of generate({ offerText: "Data analyst supply chain. ".repeat(30) }, { llm, now: new Date("2026-11-23"), rand: rng(seed * 7), skipCritique: true })) { last = e; if (e.type === "warn" && /Concept illisible/.test(e.message)) pitchBad.push(e.message); }
    if (pitchBad.length) fails.push(`#${seed} concept rejeté : ${pitchBad[0]}`);
    if (last?.type !== "done") fails.push(`#${seed} [${what.join(", ")}] → ${(last as any)?.message?.slice(0, 260)}`);
  }
  if (fails.length) console.log(fails.join("\n"));
  expect(fails.length).toBe(0);
}, 600_000);
