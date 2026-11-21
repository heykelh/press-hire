import { Painter } from "../pixel/painter";
import { seedFrom } from "../pixel/rng";
import { drawActors } from "./actors";
import type { ActorCfg, SceneCtx, Weather } from "./context";
import { TONE, type TimeOfDay } from "./palettes";
import { SCENES } from "./scenes";
import { drawSky, drawWeather, twinkle } from "./sky";

/** Filtre appliqué à toute l'image par certains habillages. */
export type ImageFilter = "none" | "gameboy" | "phosphor" | "amber";

export interface TitleSceneConfig {
  scene: string;
  time: TimeOfDay;
  weather: Weather;
  actors: ActorCfg[];
  colors: string[];
  accent: string;
  detail?: { label: string; value: string };
  seed?: string;
  filter?: ImageFilter;
}

const FILTERS: Record<Exclude<ImageFilter, "none">, number[][]> = {
  gameboy: [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]],
  phosphor: [[2, 10, 4], [6, 36, 14], [12, 74, 28], [26, 138, 52], [51, 214, 90], [158, 255, 176]],
  amber: [[12, 6, 0], [48, 24, 0], [110, 58, 0], [190, 110, 10], [255, 176, 40], [255, 220, 140]],
};

/** Taille interne : environ 150 px sur le petit côté, agrandie sans lissage. */
export function internalSize(cssW: number, cssH: number): { W: number; H: number } {
  // paysage : ~150 px de haut ; portrait : ~112 px de large (pixels plus gros sur mobile)
  const scale = Math.max(1, cssW >= cssH ? cssH / 150 : cssW / 112);
  return { W: Math.max(64, Math.round(cssW / scale)), H: Math.max(48, Math.round(cssH / scale)) };
}

export class TitleRenderer {
  private ctx: CanvasRenderingContext2D;
  private still: HTMLCanvasElement;
  private sctx!: SceneCtx;

  constructor(
    private canvas: HTMLCanvasElement,
    private cfg: TitleSceneConfig,
  ) {
    const ctx = canvas.getContext("2d", { willReadFrequently: cfg.filter !== undefined && cfg.filter !== "none" });
    if (!ctx) throw new Error("canvas 2D indisponible");
    this.ctx = ctx;
    this.still = document.createElement("canvas");
  }

  resize(cssW: number, cssH: number): void {
    const { W, H } = internalSize(cssW, cssH);
    this.canvas.width = W;
    this.canvas.height = H;
    this.still.width = W;
    this.still.height = H;
    const def = SCENES[this.cfg.scene] ?? SCENES.headquarters!;
    this.sctx = {
      W,
      H,
      ground: Math.floor(H * def.groundRatio),
      time: this.cfg.time,
      tone: TONE[this.cfg.time],
      colors: this.cfg.colors,
      accent: this.cfg.accent,
      seed: seedFrom(this.cfg.seed ?? this.cfg.scene),
      detail: this.cfg.detail,
      indoor: Boolean(def.indoor),
    };
    const sctx = this.still.getContext("2d")!;
    sctx.clearRect(0, 0, W, H);
    const p = new Painter(sctx, W, H);
    if (!def.indoor) drawSky(p, this.sctx);
    def.still(p, this.sctx);
  }

  frame(t: number): void {
    const s = this.sctx;
    if (!s) return;
    const def = SCENES[this.cfg.scene] ?? SCENES.headquarters!;
    const p = new Painter(this.ctx, s.W, s.H);
    this.ctx.drawImage(this.still, 0, 0);
    if (!s.indoor) twinkle(p, s, t);
    def.live(p, s, t);
    drawActors(p, s, this.cfg.actors, t);
    drawWeather(p, s, this.cfg.weather, t);
    this.applyFilter();
  }

  private applyFilter(): void {
    const f = this.cfg.filter;
    if (!f || f === "none") return;
    const pal = FILTERS[f];
    const img = this.ctx.getImageData(0, 0, this.sctx.W, this.sctx.H);
    const d = img.data;
    const n = pal.length;
    for (let i = 0; i < d.length; i += 4) {
      const l = (0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!) / 255;
      // léger contraste pour que les silhouettes restent lisibles
      const k = Math.min(n - 1, Math.max(0, Math.floor(Math.pow(l, 0.8) * n)));
      const c = pal[k]!;
      d[i] = c[0]!;
      d[i + 1] = c[1]!;
      d[i + 2] = c[2]!;
    }
    this.ctx.putImageData(img, 0, 0);
  }
}
