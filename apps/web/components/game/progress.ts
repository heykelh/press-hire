/**
 * Progression : étoiles par niveau, grades, grille à partager.
 * Fonctions pures, testables et partagées par le jeu et l'écran de fin.
 */
import type { Cartridge, Condition, GameState, I18n, Level } from "@press-hire/cartridge";

export const DEFAULT_RANKS: I18n[] = [
  { fr: "Stagiaire", en: "Intern" },
  { fr: "Junior", en: "Junior" },
  { fr: "Confirmé", en: "Confirmed" },
  { fr: "Expert", en: "Expert" },
];

/** Avance obtenue sur un objectif, rapportée à la cible (0 = juste atteint, 0,25 = 25 % au-delà). */
function margin(w: Condition, s: GameState, start: GameState): number {
  const cur = (s[w.var] ?? 0) - (w.scope === "level" ? start[w.var] ?? 0 : 0);
  const span = Math.max(1, Math.abs(w.value));
  return w.op === "<=" || w.op === "<" ? (w.value - cur) / span : (cur - w.value) / span;
}

/** 1 étoile : réussi. 2 : du premier coup. 3 : du premier coup et largement (25 % au-delà de chaque objectif). */
export function levelStars(level: Level, s: GameState, start: GameState, fails: number): 1 | 2 | 3 {
  if (fails > 0) return 1;
  const wide = level.win.every((w) => margin(w, s, start) >= 0.25);
  return wide ? 3 : 2;
}

export function rankIndex(stars: number, max: number): number {
  const r = max > 0 ? stars / max : 0;
  return r >= 0.85 ? 3 : r >= 0.6 ? 2 : r >= 0.3 ? 1 : 0;
}

export function ranksOf(c: Cartridge): I18n[] {
  return c.design.ranks ?? DEFAULT_RANKS;
}

/** Grille façon Wordle : 🟩 3 étoiles, 🟨 2, 🟧 1, ⬛ passé ; 💥 boss vaincu. */
export function shareGrid(opts: {
  title: string; rank: string; stars: Record<string, number>; levels: Level[]; boss?: boolean; bossWon?: boolean;
  cards: number; cardsTotal: number; score: number; url: string; lang: "fr" | "en";
}): string {
  const squares = opts.levels.map((l) => ({ 3: "🟩", 2: "🟨", 1: "🟧" } as Record<number, string>)[opts.stars[l.id] ?? 0] ?? "⬛").join("");
  const boss = opts.boss ? (opts.bossWon ? " 💥" : " 💀") : "";
  const total = Object.values(opts.stars).reduce((a, b) => a + b, 0);
  const fr = opts.lang === "fr";
  return [
    `${opts.title} · ${opts.rank}`,
    `${squares}${boss}  ⭐ ${total}/${opts.levels.length * 3}`,
    `📘 ${opts.cards}/${opts.cardsTotal} ${fr ? "cartes métier" : "job cards"} · ${opts.score.toLocaleString(opts.lang)} pts`,
    opts.url,
  ].join("\n");
}
