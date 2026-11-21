import { hash, rng } from "../pixel/rng";
import type { Painter } from "../pixel/painter";
import type { SceneCtx, Weather } from "./context";
import { SKY } from "./palettes";

/** Ciel en bandes tramées, astre et étoiles fixes (couche statique). */
export function drawSky(p: Painter, s: SceneCtx): void {
  const stops = SKY[s.time];
  const horizon = s.ground;
  const n = stops.length - 1;
  // bandes : chaque transition = une zone unie puis une zone tramée
  for (let i = 0; i < n; i++) {
    const y0 = Math.floor((horizon * i) / n);
    const y1 = Math.floor((horizon * (i + 1)) / n);
    const h = y1 - y0;
    const solid = Math.ceil(h * 0.45);
    p.rect(0, y0, s.W, solid, stops[i]!);
    const steps = 4;
    const band = Math.max(1, Math.floor((h - solid) / steps));
    for (let k = 0; k < steps; k++) {
      const yy = y0 + solid + k * band;
      const hh = k === steps - 1 ? y1 - yy : band;
      p.dither(0, yy, s.W, hh, stops[i]!, stops[i + 1]!, 3 + k * 3);
    }
  }
  p.rect(0, horizon, s.W, s.H - horizon, stops[n]!);

  const r = rng(s.seed);
  if (s.time === "night" || s.time === "dawn") {
    const count = Math.floor((s.W * horizon) / (s.time === "night" ? 90 : 260));
    for (let i = 0; i < count; i++) {
      const x = Math.floor(r() * s.W), y = Math.floor(r() * horizon * 0.7);
      p.px(x, y, r() < 0.2 ? "#ffffff" : "#8890c8");
    }
  }

  // astre
  if (s.time === "sunset") {
    // soleil rayé posé sur l'horizon
    const cx = Math.floor(s.W * 0.62), cy = horizon - 2, R = Math.max(14, Math.floor(s.W * 0.09));
    p.disc(cx, cy, R, "#fce07a");
    p.disc(cx, cy, R - 3, "#fcb43c");
    for (let k = 0; k < 6; k++) {
      const yy = cy - Math.floor(R * 0.55) + k * Math.ceil(R / 4.5);
      p.rect(cx - R, yy, R * 2 + 1, 1 + Math.floor(k / 2), SKY.sunset[4]!);
    }
  } else if (s.time === "dawn") {
    const cx = Math.floor(s.W * 0.3), cy = horizon, R = Math.max(10, Math.floor(s.W * 0.06));
    p.disc(cx, cy, R + 2, "#f8c890");
    p.disc(cx, cy, R, "#fff0c8");
  } else if (s.time === "day") {
    const cx = Math.floor(s.W * 0.84), cy = Math.floor(horizon * 0.22);
    p.disc(cx, cy, 9, "#fff6a8");
    p.disc(cx, cy, 7, "#ffffff");
  } else {
    const cx = Math.floor(s.W * 0.8), cy = Math.floor(horizon * 0.2);
    p.disc(cx, cy, 7, "#f4f0d8");
    p.disc(cx + 3, cy - 2, 6, SKY.night[1]!);
  }
}

/** Étoiles qui scintillent (couche animée, nuit uniquement). */
export function twinkle(p: Painter, s: SceneCtx, t: number): void {
  if (s.time !== "night") return;
  const n = Math.floor(s.W / 14);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(hash(i * 7 + s.seed) * s.W);
    const y = Math.floor(hash(i * 13 + s.seed) * s.ground * 0.6);
    const on = hash(i + Math.floor(t * 3 + i * 0.37)) > 0.55;
    if (on) {
      p.px(x, y, "#ffffff");
      if (hash(i * 3) > 0.7) {
        p.px(x - 1, y, "#8890c8");
        p.px(x + 1, y, "#8890c8");
        p.px(x, y - 1, "#8890c8");
        p.px(x, y + 1, "#8890c8");
      }
    }
  }
}

export function drawWeather(p: Painter, s: SceneCtx, w: Weather, t: number): void {
  if (s.indoor || w === "clear") return;
  if (w === "rain") {
    const n = Math.floor((s.W * s.H) / 160);
    for (let i = 0; i < n; i++) {
      const sp = 0.8 + hash(i * 5) * 0.6;
      const x = (hash(i) * (s.W + 40) - t * 30 * sp) % (s.W + 40);
      const y = (hash(i * 9) * s.H + t * 140 * sp) % s.H;
      const X = x < 0 ? x + s.W + 40 : x;
      p.line(X, y, X - 1, y + 3, "#9ab4e8");
    }
  } else if (w === "snow") {
    const n = Math.floor((s.W * s.H) / 120);
    for (let i = 0; i < n; i++) {
      const y = (hash(i * 9) * s.H + t * (10 + hash(i) * 14)) % s.H;
      const x = (hash(i) * s.W + Math.sin(t * 1.5 + i) * 3 + s.W) % s.W;
      p.px(x, y, hash(i * 2) > 0.5 ? "#ffffff" : "#c8d4f0");
    }
  } else if (w === "fog") {
    const y0 = s.ground - Math.floor(s.H * 0.28);
    for (let k = 0; k < 3; k++) {
      const off = Math.floor(t * (3 + k * 2)) % 8;
      for (let x = -8; x < s.W; x += 8) {
        const yy = y0 + k * 10 + Math.floor(Math.sin((x + k * 30) / 23) * 3);
        p.dither(x + off, yy, 8, 6, "rgba(0,0,0,0)", "#c8ccd8", 5 + k * 2);
      }
    }
  }
}
