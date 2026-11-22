/**
 * Le « brief » est ce que le modèle de langue écrit : la cartouche sans les parties
 * que l'on connaît déjà (métadonnées, suivi, relecture).
 * On l'assemble ensuite de façon déterministe, puis on corrige les petites fautes courantes.
 */
import {
  arcadeSplit,
  Cartridge,
  SCHEMA_VERSION,
  applyEffects,
  evalCurve,
  type CartridgeInput,
  type Condition,
  type GameState,
  type Level,
} from "@press-hire/cartridge";
import { z } from "zod";

export const Brief = Cartridge.omit({ meta: true, candidate: true, tracking: true, review: true }).extend({
  ending: Cartridge.shape.ending.omit({ cta: true }),
});
export type Brief = z.input<typeof Brief>;

export interface AssembleCtx {
  slug: string;
  offerUrl?: string;
  contact?: { name: string; role?: string };
  now: Date;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/* ---------------- réparations automatiques (avant validation) ---------------- */

const toId = (s: unknown, fallback: string): string => {
  let id = String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  if (!/^[a-z]/.test(id)) id = `${fallback}_${id}`.slice(0, 40);
  if (id.length < 2) id = `${fallback}_x`;
  return id;
};

const cutWords = (s: string, n: number) => {
  const w = s.trim().split(/\s+/);
  return w.length <= n ? s.trim() : w.slice(0, n).join(" ");
};

const cutChars = (s: string, n: number) => {
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.]+$/, "")}…`;
};

/** Champs dont la valeur est un identifiant (ou une référence à un identifiant). */
const ID_KEYS = new Set(["id", "var", "requirementId", "proofId", "painPointId", "characterId"]);

/** Parcourt le brief et corrige ce qui se corrige sans réfléchir. */
export function repairBrief(raw: unknown): unknown {
  const walk = (v: unknown, key = ""): unknown => {
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (!isObj(v)) {
      if (typeof v === "string" && /^#[0-9a-f]{3}$/i.test(v)) return `#${[...v.slice(1)].map((c) => c + c).join("")}`;
      return v;
    }
    const o: Obj = {};
    for (const [k, x] of Object.entries(v)) {
      if (ID_KEYS.has(k) && typeof x === "string") o[k] = toId(x, k === "var" ? "v" : "id");
      else o[k] = walk(x, k);
    }
    // texte bilingue incomplet : on recopie l'autre langue
    if ("fr" in o || "en" in o) {
      const fr = typeof o.fr === "string" ? o.fr : undefined;
      const en = typeof o.en === "string" ? o.en : undefined;
      if (fr && !en) o.en = fr;
      if (en && !fr) o.fr = en;
    }
    if (key === "requirementIds" && Array.isArray(v)) return v;
    return o;
  };
  const b = walk(raw) as Obj;
  if (!isObj(b)) return b;

  // exigences : citation ≤ 15 mots
  const analysis = b.analysis as Obj | undefined;
  if (isObj(analysis) && Array.isArray(analysis.requirements))
    for (const r of analysis.requirements as Obj[])
      if (typeof r.offerQuote === "string") r.offerQuote = cutWords(r.offerQuote, 15);

  // niveaux : intro ≤ 80 caractères, codes de roue ≤ 5, ordre 1..n
  const fixWheel = (m: Obj | undefined) => {
    if (!isObj(m) || m.type !== "wheel" || !Array.isArray(m.segments)) return;
    for (const s of m.segments as Obj[])
      if (typeof s.code === "string") s.code = s.code.normalize("NFC").toUpperCase().replace(/\s+/g, "").slice(0, 5) || "?";
  };
  const fixQuiz = (m: Obj | undefined) => {
    if (!isObj(m) || m.type !== "quiz" || !Array.isArray(m.questions)) return;
    for (const q of m.questions as Obj[])
      if (Array.isArray(q.options) && typeof q.correctIndex === "number")
        q.correctIndex = Math.max(0, Math.min(q.options.length - 1, Math.round(q.correctIndex)));
  };
  if (Array.isArray(b.levels)) {
    (b.levels as Obj[]).forEach((l, i) => {
      if (isObj(l.intro)) for (const lang of ["fr", "en"]) {
        const t = (l.intro as Obj)[lang];
        if (typeof t === "string") (l.intro as Obj)[lang] = cutChars(t, 80);
      }
      if (typeof l.order !== "number") l.order = i + 1;
      fixWheel(l.mechanic as Obj);
      fixQuiz(l.mechanic as Obj);
    });
    const sorted = [...(b.levels as Obj[])].sort((a, z) => (a.order as number) - (z.order as number));
    sorted.forEach((l, i) => (l.order = i + 1));
  }
  // jauges : zones dans 0..100
  const fixGauge = (m: Obj | undefined) => {
    if (!isObj(m) || m.type !== "gauge" || !Array.isArray(m.zones)) return;
    for (const z of m.zones as Obj[]) {
      if (typeof z.from === "number") z.from = Math.max(0, Math.min(100, z.from));
      if (typeof z.to === "number") z.to = Math.max(0, Math.min(100, z.to));
    }
  };
  if (Array.isArray(b.levels)) for (const l of b.levels as Obj[]) fixGauge(l.mechanic as Obj);
  if (isObj(b.boss)) fixGauge(b.boss.mechanic as Obj);
  if (isObj(b.boss)) {
    fixWheel(b.boss.mechanic as Obj);
    fixQuiz(b.boss.mechanic as Obj);
  }

  // écran titre : détail ≤ 24 caractères, 2 à 5 acteurs
  const ts = b.titleScreen as Obj | undefined;
  if (isObj(ts)) {
    if (isObj(ts.detail) && typeof ts.detail.value === "string") ts.detail.value = ts.detail.value.slice(0, 24);
    if (Array.isArray(ts.actors)) {
      ts.actors = (ts.actors as Obj[]).slice(0, 5);
      const pad = ["clouds", "birds"];
      while ((ts.actors as Obj[]).length < 2) (ts.actors as Obj[]).push({ type: pad[(ts.actors as Obj[]).length]!, speed: 0.6, lane: 0 });
    }
  }
  return b;
}

/* ---------------- plan imposé ---------------- */

/**
 * Applique la fiche du poste et le plan au brief : exigences fixées (le modèle ne garde que la traduction),
 * jours de la semaine repris du plan s'ils manquent.
 */
export function applyPlan(
  brief: Obj,
  requirements: Array<{ id: string; label: { fr: string; en: string } }> | undefined,
  days: Array<{ fr: string; en: string }> | undefined,
  force: { days?: boolean; skin?: string; scene?: string } = {},
): Obj {
  if (requirements?.length) {
    const analysis = (isObj(brief.analysis) ? brief.analysis : {}) as Obj;
    const theirs = (Array.isArray(analysis.requirements) ? analysis.requirements : []) as Obj[];
    analysis.requirements = requirements.map((r) => {
      const t = theirs.find((x) => x.id === r.id);
      const en = isObj(t?.label) && typeof (t!.label as Obj).en === "string" ? String((t!.label as Obj).en) : r.label.en;
      return { ...r, label: { fr: r.label.fr, en } };
    });
    brief.analysis = analysis;
  }
  if (days?.length && Array.isArray(brief.levels)) {
    const ordered = [...(brief.levels as Obj[])].sort((a, b) => Number(a.order) - Number(b.order));
    ordered.forEach((l, i) => { if ((force.days || !isObj(l.day)) && days[i]) l.day = days[i]; });
  }
  if (force.skin) brief.design = { ...(isObj(brief.design) ? brief.design : {}), skin: force.skin };
  if (force.scene) brief.titleScreen = { ...(isObj(brief.titleScreen) ? brief.titleScreen : {}), scene: force.scene };
  return brief;
}

/* ---------------- assemblage ---------------- */

export function assemble(brief: Obj, ctx: AssembleCtx): CartridgeInput {
  const ending = (isObj(brief.ending) ? brief.ending : {}) as Obj;
  const skills = (Array.isArray(ending.skillsUnlocked) ? ending.skillsUnlocked : []) as Obj[];
  const target = (isObj(brief.target) ? brief.target : {}) as Obj;
  const job = (isObj(target.job) ? target.job : {}) as Obj;
  const sources = (Array.isArray(target.sourcesConsulted) ? target.sourcesConsulted : []) as Obj[];
  if (ctx.offerUrl && !sources.some((s) => s.url === ctx.offerUrl))
    sources.unshift({ label: "Offre d'emploi", url: ctx.offerUrl, usedFor: "analysis" });

  const { candidate: _c, meta: _m, tracking: _t, review: _r, ...rest } = brief;
  void _c; void _m; void _t; void _r;
  return {
    ...rest,
    meta: { id: ctx.slug, schemaVersion: SCHEMA_VERSION, createdAt: ctx.now.toISOString(), languages: ["fr", "en"], defaultLang: "fr" },
    target: {
      ...target,
      job: { ...job, ...(ctx.offerUrl ? { url: ctx.offerUrl } : {}) },
      ...(ctx.contact ? { contact: ctx.contact } : {}),
      sourcesConsulted: sources,
    },
    // le récapitulatif de fin ne pointe plus vers des preuves externes
    ending: { ...ending, skillsUnlocked: skills.map(({ proofId: _p, ...x }) => x), cta: [] },
    tracking: { enabled: true },
    review: { status: "draft" },
  } as unknown as CartridgeInput;
}

/* ---------------- équilibrage de secours ---------------- */

/** Meilleure variation atteignable d'une variable pendant un niveau (en jouant pour elle seule). */
function bestDelta(c: Cartridge, l: Level, varId: string, start: GameState, dir: 1 | -1): number {
  const m = l.mechanic;
  const gain = (effects: Array<{ var: string; op: string; value: number }>) =>
    effects.filter((e) => e.var === varId && e.op === "add").reduce((t, e) => t + e.value * dir, 0);
  const run = (fn: (s: GameState) => void) => {
    const s = { ...start };
    fn(s);
    return ((s[varId] ?? 0) - (start[varId] ?? 0)) * dir;
  };
  switch (m.type) {
    case "triage":
      return run((s) => m.items.forEach(() => applyEffects(c, s, m.onCorrect)));
    case "quiz":
      return run((s) => m.questions.forEach(() => applyEffects(c, s, m.onCorrect)));
    case "dialogue":
      return run((s) => m.nodes.forEach((n) => applyEffects(c, s, [...n.choices].sort((a, b) => gain(b.effects) - gain(a.effects))[0]!.effects)));
    case "wheel": {
      const best = [...m.segments].sort((a, b) => gain(b.effects) - gain(a.effects))[0]!;
      return run((s) => { for (let i = 0; i < m.spins; i++) applyEffects(c, s, best.effects); });
    }
    case "catch":
      return run((s) => { for (let i = 0; i < arcadeSplit(m).good; i++) applyEffects(c, s, m.onGood); });
    case "whack":
      return run((s) => { for (let i = 0; i < arcadeSplit(m).good; i++) applyEffects(c, s, m.onHit); });
    case "sequence":
      return run((s) => { for (let i = 0; i < m.rounds; i++) applyEffects(c, s, m.onSuccess); });
    case "gauge": {
      const best = [...m.zones].sort((a, b) => gain(b.effects) - gain(a.effects))[0]!;
      return run((s) => { for (let i = 0; i < m.rounds; i++) applyEffects(c, s, best.effects); });
    }
    case "inspection":
      return run((s) => m.cases.forEach((k) => { applyEffects(c, s, m.onCorrect); if (k.correct === "reject") applyEffects(c, s, m.onSpotted); }));
    case "investigation":
      return run((s) => m.rounds.forEach(() => applyEffects(c, s, m.onFound)));
    case "slider": {
      let top = -Infinity;
      for (let x = m.control.min; x <= m.control.max + 1e-9; x += m.control.step)
        top = Math.max(top, run((s) => {
          for (let r = 0; r < m.rounds; r++)
            for (const o of m.outputs) if (o.var === varId) applyEffects(c, s, [{ var: o.var, op: "add", value: evalCurve(o.curve, x) }]);
        }));
      return top;
    }
  }
  return 0;
}

/**
 * Dernier recours quand le modèle n'arrive pas à équilibrer : chaque objectif devient
 * « gagner pendant ce niveau » environ 70 % du maximum atteignable.
 */
export function autoBalance(c: Cartridge, levelIds: string[], opts: { singleGoal?: boolean } = {}): Cartridge {
  const out = structuredClone(c);
  const ordered = [...out.levels].sort((a, b) => a.order - b.order);
  const state: GameState = Object.fromEntries(out.state.vars.map((v) => [v.id, v.start]));
  for (const l of ordered) {
    if (levelIds.includes(l.id)) {
      // plusieurs objectifs contradictoires sur une roue : on garde le principal
      if (opts.singleGoal && l.win.length > 1) l.win = l.win.slice(0, 1);
      l.win = l.win.map((w): Condition => {
        const dir: 1 | -1 = w.op === "<=" || w.op === "<" ? -1 : 1;
        const best = bestDelta(out, l, w.var, state, dir);
        if (!(best > 0)) return w;
        const v = Math.max(1, Math.round(best * 0.7 * 10) / 10) * dir;
        return { var: w.var, op: dir === 1 ? ">=" : "<=", value: v, scope: "level" };
      });
    }
    // avance l'état comme un joueur appliqué, pour le niveau suivant
    for (const w of l.win) {
      const dir: 1 | -1 = w.op === "<=" || w.op === "<" ? -1 : 1;
      const d = bestDelta(out, l, w.var, state, dir);
      if (Number.isFinite(d)) applyEffects(out, state, [{ var: w.var, op: "add", value: d * dir }]);
    }
  }
  return out;
}
