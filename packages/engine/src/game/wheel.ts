/**
 * Géométrie et physique de la roue.
 * Angles en radians, mesurés dans le sens horaire depuis le pointeur (en haut).
 */

export interface Slice {
  index: number;
  start: number;
  end: number;
}

const TAU = Math.PI * 2;

export function slices(weights: number[]): Slice[] {
  const total = weights.reduce((a, b) => a + b, 0);
  let a = 0;
  return weights.map((w, index) => {
    const s = { index, start: a, end: a + (w / total) * TAU };
    a = s.end;
    return s;
  });
}

const norm = (a: number) => ((a % TAU) + TAU) % TAU;

/** Case sous le pointeur pour une rotation donnée de la roue. */
export function sliceAt(sl: Slice[], rotation: number): number {
  const a = norm(-rotation);
  return sl.find((s) => a >= s.start && a < s.end)?.index ?? sl.length - 1;
}

/** Tirage pondéré (mode « hasard »). */
export function pickWeighted(weights: number[], rand: () => number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/** Rotation finale pour que le pointeur tombe dans la case visée, après `turns` tours. */
export function targetRotation(sl: Slice[], index: number, from: number, turns: number, rand: () => number): number {
  const s = sl[index]!;
  const margin = (s.end - s.start) * 0.15;
  const a = s.start + margin + rand() * (s.end - s.start - 2 * margin);
  // on veut norm(-rot) = a  →  rot ≡ -a
  const base = from + turns * TAU;
  let rot = base - norm(base) + norm(-a);
  if (rot < base) rot += TAU;
  return rot;
}

/** Mode « adresse » : distance de freinage fixe, environ 3 cases moyennes. */
export function brakeDistance(count: number): number {
  return (TAU / count) * 3;
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
