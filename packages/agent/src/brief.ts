/**
 * Le « brief » est ce que le modèle de langue écrit : la cartouche sans les parties
 * que l'on connaît déjà (métadonnées, suivi, relecture).
 * On l'assemble ensuite de façon déterministe, puis on corrige les petites fautes courantes.
 */
import type { GamePlan } from "./plan";
import {
  Mechanic,
  checkConditions,
  arcadeSplit,
  defenseBest,
  naiveRuns,
  playBest,
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
    if (Array.isArray(b.boss.phases)) {
      b.boss.phases = (b.boss.phases as Obj[]).slice(0, 3);
      for (const ph of b.boss.phases as Obj[]) { fixWheel(ph.mechanic as Obj); fixQuiz(ph.mechanic as Obj); fixGauge(ph.mechanic as Obj); }
      // un boss à phases n'a pas besoin de mécanique classique ; ses points de vie = nombre de phases
      if ((b.boss.phases as Obj[]).length >= 2) { delete b.boss.mechanic; b.boss.hp = (b.boss.phases as Obj[]).length; }
    }
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
  spreadAnswers(b);
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
  force: { days?: boolean; skin?: string; scene?: string; plan?: GamePlan } = {},
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
  // ce qui ne change pas le contenu se recopie directement depuis le plan
  const plan = force.plan;
  if (plan && Array.isArray(brief.levels)) {
    const ordered = [...(brief.levels as Obj[])].sort((a, b) => Number(a.order) - Number(b.order));
    ordered.forEach((l, i) => {
      const pl = plan.levels[i];
      if (!pl) return;
      l.entry = pl.entry;
      l.modifiers = pl.modifiers;
    });
  }
  // mécanique sans type : le plan sait quel mini-jeu était prévu à cette place
  if (plan && Array.isArray(brief.levels)) {
    const ordered = [...(brief.levels as Obj[])].sort((a, b) => Number(a.order) - Number(b.order));
    ordered.forEach((l, i) => {
      const pl = plan.levels[i];
      if (isObj(l.mechanic) && typeof l.mechanic.type !== "string") l.mechanic.type = guessMechanic(l.mechanic, pl?.mechanic);
    });
  }
  if (plan?.boss && isObj(brief.boss) && Array.isArray(brief.boss.phases))
    (brief.boss.phases as Obj[]).forEach((ph, i) => {
      const pp = plan.boss!.phases[i];
      if (isObj(ph.mechanic) && typeof ph.mechanic.type !== "string") ph.mechanic.type = guessMechanic(ph.mechanic, pp?.mechanic);
    });
  fixRequirements(brief);
  if (plan) brief.design = { ...(isObj(brief.design) ? brief.design : {}), format: plan.format };
  if (plan?.boss && isObj(brief.boss)) {
    brief.boss.archetype = plan.boss.archetype;
    if (Array.isArray(brief.boss.phases))
      (brief.boss.phases as Obj[]).forEach((ph, i) => { if (plan.boss!.phases[i]) ph.modifiers = plan.boss!.phases[i]!.modifiers; });
  }
  if (force.skin) brief.design = { ...(isObj(brief.design) ? brief.design : {}), skin: force.skin };
  if (force.scene) brief.titleScreen = { ...(isObj(brief.titleScreen) ? brief.titleScreen : {}), scene: force.scene };
  return brief;
}

/** Type d'une mécanique dont le modèle a oublié « type » : celui dont le schéma accepte le mieux le contenu. */
export function guessMechanic(m: Obj, planned?: string): string {
  let best: { t: string; n: number } | undefined;
  for (const opt of Mechanic.options) {
    const t = String((opt.shape.type as unknown as { value: string }).value);
    const r = opt.safeParse({ ...m, type: t });
    const n = r.success ? 0 : r.error.issues.length;
    if (!best || n < best.n || (n === best.n && t === planned)) best = { t, n };
  }
  return best?.t ?? planned ?? "quiz";
}

/**
 * Les compétences de l'offre citées par le jeu doivent exister, et chaque compétence obligatoire doit être jouée
 * ou rappelée en fin de partie. Les modèles inventent des identifiants et oublient des compétences : on recâble.
 */
export function fixRequirements(brief: Obj): void {
  const analysis = isObj(brief.analysis) ? brief.analysis : undefined;
  const reqs = (analysis && Array.isArray(analysis.requirements) ? analysis.requirements : []).filter(isObj) as Obj[];
  if (!reqs.length) return;
  const known = new Set(reqs.map((r) => String(r.id)));
  const levels = (Array.isArray(brief.levels) ? brief.levels : []).filter(isObj) as Obj[];
  const ending = (isObj(brief.ending) ? brief.ending : (brief.ending = {})) as Obj;
  let skills = (Array.isArray(ending.skillsUnlocked) ? ending.skillsUnlocked : []).filter(isObj) as Obj[];
  skills = skills.filter((x) => known.has(String(x.requirementId)));
  const covered = () => new Set([...levels.map((l) => String(l.requirementId)), ...skills.map((x) => String(x.requirementId))]);
  // niveau qui cite une compétence inconnue : on lui donne une compétence pas encore jouée (obligatoires d'abord)
  let k = 0;
  for (const l of levels) {
    if (known.has(String(l.requirementId))) continue;
    const c = covered();
    const free = [...reqs.filter((r) => r.priority === "must" && !c.has(String(r.id))), ...reqs.filter((r) => !c.has(String(r.id)))];
    l.requirementId = String((free[0] ?? reqs[k++ % reqs.length]!).id);
  }
  // compétence obligatoire jouée nulle part : rappelée en fin de partie
  const c = covered();
  for (const r of reqs)
    if (r.priority === "must" && !c.has(String(r.id))) {
      const label = isObj(r.label) ? r.label : { fr: String(r.id), en: String(r.id) };
      skills.push({ requirementId: String(r.id), line: { fr: String(label.fr ?? r.id).slice(0, 140), en: String(label.en ?? label.fr ?? r.id).slice(0, 140) } });
    }
  ending.skillsUnlocked = skills;
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
function bestDelta(c: Cartridge, l: Pick<Level, "mechanic">, varId: string, start: GameState, dir: 1 | -1): number {
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
    case "defense": {
      const { blocked, leaked } = defenseBest(m);
      return run((s) => { for (let i = 0; i < blocked; i++) applyEffects(c, s, m.onBlock); for (let i = 0; i < leaked; i++) applyEffects(c, s, m.onLeak); });
    }
    case "pipes":
      return run((s) => m.rounds.forEach(() => applyEffects(c, s, m.onSolve)));
    case "runner":
      return run((s) => { for (let i = 0; i < arcadeSplit(m).good; i++) applyEffects(c, s, m.onGood); });
    case "shooter":
      return run((s) => { for (let i = 0; i < arcadeSplit(m).good; i++) applyEffects(c, s, m.onHit); });
    case "rhythm":
      return run((s) => m.notes.forEach(() => applyEffects(c, s, m.onHit)));
    case "hunt":
      return run((s) => m.rounds.forEach((r) => r.items.forEach((x) => { if (x.risk) applyEffects(c, s, m.onFound); })));
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
  // les phases du boss se règlent comme des niveaux, après eux
  const units: Array<{ id: string; mechanic: Level["mechanic"]; win: Condition[] }> = [
    ...ordered,
    ...(out.boss?.phases ?? []).map((ph, i) => Object.assign(ph, { id: `boss-phase-${i + 1}` })),
  ];
  for (const l of units) {
    if (levelIds.includes(l.id)) {
      // plusieurs objectifs contradictoires sur une roue : on garde le principal
      if (opts.singleGoal && l.win.length > 1) l.win = l.win.slice(0, 1);
      const goal = (varId: string, dir: 1 | -1, best: number): Condition => {
        // au-dessus de ce que font les stratégies naïves (sinon le niveau se gagne sans réfléchir)
        const naive = Math.max(0, ...naiveRuns(out, l.mechanic, state).map((r) => ((r.end[varId] ?? 0) - (state[varId] ?? 0)) * dir));
        let target = Math.max(1, Math.round(best * 0.7));
        if (naive >= target && naive < best) target = Math.min(best, Math.floor(naive) + 1);
        return { var: varId, op: dir === 1 ? ">=" : "<=", value: target * dir, scope: "level" };
      };
      // dialogue : la meilleure réplique tourne de position (sinon « toujours la première » gagne)
      if (l.mechanic.type === "dialogue" && l.win.length) {
        const w0 = l.win[0]!;
        const dir = w0.op === "<=" || w0.op === "<" ? -1 : 1;
        const gain = (ch: { effects: Array<{ var: string; op: string; value: number }> }) =>
          ch.effects.reduce((t, e) => t + (e.var === w0.var && e.op === "add" ? e.value * dir : 0), 0);
        l.mechanic.nodes.forEach((n, i) => {
          if (n.choices.length < 2) return;
          const best = n.choices.reduce((b, ch, j) => (gain(ch) > gain(n.choices[b]!) ? j : b), 0);
          if (n.choices.every((ch) => gain(ch) === gain(n.choices[best]!))) return;
          const target = (i * 2 + 1) % n.choices.length; // 1, 0, 1… ou 1, 0, 2… : jamais toujours la même place
          const bestCh = n.choices[best]!;
          const others = n.choices.filter((_, j) => j !== best);
          n.choices = [...others.slice(0, target), bestCh, ...others.slice(target)];
        });
      }
      l.win = l.win.map((w): Condition => {
        const dir: 1 | -1 = w.op === "<=" || w.op === "<" ? -1 : 1;
        const best = bestDelta(out, l, w.var, state, dir);
        return best > 0 ? goal(w.var, dir, best) : w;
      });
      // objectifs impossibles (la mécanique ne fait pas bouger leur variable, ou ils se contredisent) :
      // on vise la variable que ce niveau fait vraiment progresser
      // déjà gagné avant de jouer (objectif sur une variable que d'autres niveaux ont déjà remplie) : même traitement
      const ok = playBest(out, l.mechanic, l.win, state) !== null && !checkConditions(l.win, state, state);
      if (!ok) {
        let pick: { v: string; dir: 1 | -1; best: number } | undefined;
        for (const v of out.state.vars)
          for (const dir of [1, -1] as const) {
            const b = bestDelta(out, l, v.id, state, dir);
            if (b > 0 && (!pick || b > pick.best || (b === pick.best && dir === 1))) pick = { v: v.id, dir, best: b };
          }
        if (pick) l.win = [goal(pick.v, pick.dir, pick.best)];
      }
    }
    // avance l'état comme un joueur appliqué, pour le niveau suivant
    for (const w of l.win) {
      const dir: 1 | -1 = w.op === "<=" || w.op === "<" ? -1 : 1;
      const d = bestDelta(out, l, w.var, state, dir);
      if (Number.isFinite(d)) applyEffects(out, state, [{ var: w.var, op: "add", value: d * dir }]);
    }
  }
  // retire l'identifiant technique ajouté aux phases
  for (const ph of out.boss?.phases ?? []) delete (ph as { id?: string }).id;
  return out;
}

/**
 * Les modèles mettent presque toujours la bonne réponse en premier : on fait tourner l'ordre des réponses de quiz
 * et des répliques de dialogue pour que « toujours A » ou « toujours la première » ne gagne jamais.
 * Déterministe (dépend de la position de la question), sans changer le contenu.
 */
export function spreadAnswers(b: Obj): void {
  const mechs: Obj[] = [];
  for (const l of Array.isArray(b.levels) ? (b.levels as Obj[]) : []) if (isObj(l.mechanic)) mechs.push(l.mechanic);
  if (isObj(b.boss)) {
    if (isObj(b.boss.mechanic)) mechs.push(b.boss.mechanic);
    for (const ph of Array.isArray(b.boss.phases) ? (b.boss.phases as Obj[]) : []) if (isObj(ph.mechanic)) mechs.push(ph.mechanic);
  }
  let k = 0;
  for (const m of mechs) {
    if (m.type === "quiz" && Array.isArray(m.questions)) {
      for (const q of m.questions as Obj[]) {
        const opts = q.options as unknown[];
        const ci = Number(q.correctIndex);
        if (!Array.isArray(opts) || opts.length < 2 || !Number.isInteger(ci) || ci < 0 || ci >= opts.length) continue;
        const target = (k++ * 2 + 1) % opts.length; // 1, 3, 0, 2… : jamais toujours la même position
        const correct = opts[ci];
        const others = opts.filter((_, i) => i !== ci);
        q.options = [...others.slice(0, target), correct, ...others.slice(target)];
        q.correctIndex = target;
      }
    }
    if (m.type === "dialogue" && Array.isArray(m.nodes)) {
      (m.nodes as Obj[]).forEach((n, i) => {
        const ch = n.choices as unknown[];
        if (!Array.isArray(ch) || ch.length < 2) return;
        const r = (i + 1) % ch.length; // rotation différente à chaque réplique
        n.choices = [...ch.slice(r), ...ch.slice(0, r)];
      });
    }
  }
}
