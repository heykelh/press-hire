import type { Cartridge, GameState } from "@press-hire/cartridge";

/**
 * Score final : chaque variable visible compte selon sa position dans ses bornes
 * (une variable « coût » baisse le score quand elle monte), plus un bonus sans échec.
 */
export function finalScore(c: Cartridge, s: GameState, fails: number): number {
  let total = 0;
  for (const v of c.state.vars) {
    if (v.display === "hidden") continue;
    const k = ((s[v.id] ?? v.start) - v.min) / (v.max - v.min || 1);
    const lowerIsBetter = c.levels.some((l) => l.win.some((w) => w.var === v.id && (w.op === "<=" || w.op === "<")));
    total += (lowerIsBetter ? 1 - k : k) * 1000;
  }
  const bonus = Math.max(0, 1500 - fails * 300);
  return Math.round((total + bonus) / 10) * 10;
}
