import { glyph } from "./font";

/** Matrice de Bayer 4×4 : le tramage ordonné des consoles 8-bit. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export type Sprite = { rows: string[]; colors: Record<string, string> };

/**
 * Dessin pixel en coordonnées entières sur une toile basse résolution.
 * La toile est ensuite agrandie sans lissage par le navigateur.
 */
export class Painter {
  constructor(
    readonly ctx: CanvasRenderingContext2D,
    readonly W: number,
    readonly H: number,
  ) {}

  rect(x: number, y: number, w: number, h: number, c: string): void {
    if (w <= 0 || h <= 0) return;
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  px(x: number, y: number, c: string): void {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  /** Tramage entre deux couleurs : level 0 = tout c1, 16 = tout c2. */
  dither(x: number, y: number, w: number, h: number, c1: string, c2: string, level: number): void {
    const X = Math.round(x), Y = Math.round(y);
    this.rect(X, Y, w, h, c1);
    if (level <= 0) return;
    if (level >= 16) return this.rect(X, Y, w, h, c2);
    this.ctx.fillStyle = c2;
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++)
        if (BAYER[((Y + j) & 3) * 4 + ((X + i) & 3)]! < level) this.ctx.fillRect(X + i, Y + j, 1, 1);
  }

  disc(cx: number, cy: number, r: number, c: string): void {
    this.ctx.fillStyle = c;
    const R = Math.round(r);
    for (let dy = -R; dy <= R; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      this.ctx.fillRect(Math.round(cx) - dx, Math.round(cy) + dy, dx * 2 + 1, 1);
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string): void {
    let X0 = Math.round(x0), Y0 = Math.round(y0);
    const X1 = Math.round(x1), Y1 = Math.round(y1);
    const dx = Math.abs(X1 - X0), dy = -Math.abs(Y1 - Y0);
    const sx = X0 < X1 ? 1 : -1, sy = Y0 < Y1 ? 1 : -1;
    let err = dx + dy;
    this.ctx.fillStyle = c;
    for (let n = 0; n < 2000; n++) {
      this.ctx.fillRect(X0, Y0, 1, 1);
      if (X0 === X1 && Y0 === Y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; X0 += sx; }
      if (e2 <= dx) { err += dx; Y0 += sy; }
    }
  }

  text(s: string, x: number, y: number, c: string, scale = 1): void {
    this.ctx.fillStyle = c;
    let cx = Math.round(x);
    for (const ch of s) {
      const g = glyph(ch);
      for (let r = 0; r < 5; r++)
        for (let k = 0; k < 3; k++)
          if (g[r * 3 + k] === "1") this.ctx.fillRect(cx + k * scale, Math.round(y) + r * scale, scale, scale);
      cx += 4 * scale;
    }
  }

  /** Sprite défini en grille de caractères ; « . » = transparent. */
  sprite(s: Sprite, x: number, y: number, flip = false, override?: Record<string, string>): void {
    const X = Math.round(x), Y = Math.round(y);
    const w = Math.max(...s.rows.map((r) => r.length));
    s.rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i]!;
        if (ch === ".") continue;
        const c = override?.[ch] ?? s.colors[ch];
        if (!c) continue;
        this.ctx.fillStyle = c;
        this.ctx.fillRect(flip ? X + (w - 1 - i) : X + i, Y + j, 1, 1);
      }
    });
  }
}

/** Mélange deux couleurs hex (t = 0 → a, 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

export const shade = (c: string, k: number) => (k >= 0 ? mix(c, "#ffffff", k) : mix(c, "#000000", -k));
