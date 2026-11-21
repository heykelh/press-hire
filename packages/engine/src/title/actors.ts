import { shade, type Painter } from "../pixel/painter";
import { textWidth } from "../pixel/font";
import { hash } from "../pixel/rng";
import type { ActorCfg, SceneCtx } from "./context";
import { AMBULANCE, BIRD_A, BIRD_B, DRONE, PERSON, PLANE, PLANE_UP, SHIP_HULL, TRUCK } from "./sprites";

const front = (s: SceneCtx) => s.ground + Math.floor((s.H - s.ground) * 0.55);
const laneY = (s: SceneCtx, lane: number) =>
  lane === 0 ? Math.floor(s.ground * 0.22) : lane === 1 ? Math.floor(s.ground * 0.5) : front(s);

type ActorFn = (p: Painter, s: SceneCtx, t: number, a: ActorCfg, i: number) => void;

const planeTakeoff: ActorFn = (p, s, t, a) => {
  const P = 9 / a.speed;
  const u = (t % P) / P;
  const ry = s.ground + Math.floor((s.H - s.ground) * 0.45) - 6;
  const rollEnd = 0.38;
  if (u < rollEnd) {
    const k = u / rollEnd;
    const x = -28 + k * k * (s.W * 0.45 + 28);
    p.sprite(PLANE, x, ry, false, a.color ? { T: a.color } : undefined);
  } else {
    const k = (u - rollEnd) / (1 - rollEnd);
    const x = s.W * 0.45 + k * s.W * 0.9;
    const y = ry - 3 - k * k * (ry + 20);
    if (y > -12) p.sprite(PLANE_UP, x, y, false, a.color ? { T: a.color } : undefined);
  }
};

const planeTaxi: ActorFn = (p, s, t, a) => {
  const span = s.W + 60;
  const x = s.W + 30 - ((t * 9 * a.speed) % span);
  p.sprite(PLANE, x, s.ground + 1, true, a.color ? { T: a.color } : undefined);
};

const clouds: ActorFn = (p, s, t, a, i) => {
  if (s.indoor) return;
  const c = { dawn: "#e8a8b8", day: "#ffffff", sunset: "#f8906a", night: "#1e2650" }[s.time];
  const cs = { dawn: "#b87898", day: "#d8e4f4", sunset: "#c85a5a", night: "#141a3c" }[s.time];
  const n = 3 + Math.floor(s.W / 120);
  for (let k = 0; k < n; k++) {
    const base = hash(k * 31 + i + s.seed);
    const y = Math.floor(s.ground * (0.08 + hash(k * 7 + i) * 0.35));
    const w = 14 + Math.floor(hash(k * 13) * 18);
    const x = ((base * (s.W + 60) + t * (2 + hash(k) * 3) * a.speed) % (s.W + 60)) - 40;
    p.rect(x + 2, y + 3, w, 3, cs);
    p.rect(x, y + 2, w, 3, c);
    p.disc(x + w * 0.3, y + 1, 3, c);
    p.disc(x + w * 0.6, y, 4, c);
    p.rect(x + 1, y + 5, w - 2, 1, cs);
  }
};

const birds: ActorFn = (p, s, t, a, i) => {
  if (s.indoor) return;
  const P = (s.W + 60) / (14 * a.speed);
  const u = ((t + i * 3) % P) / P;
  const y0 = a.lane === 2 ? Math.floor(s.ground * 0.6) : laneY(s, a.lane);
  for (let k = 0; k < 4; k++) {
    const x = -20 + u * (s.W + 60) - k * 7;
    const y = y0 + (k % 2) * 4 + Math.sin(t * 2 + k) * 2;
    p.sprite(Math.floor(t * 6 + k) % 2 ? BIRD_A : BIRD_B, x, y, false, s.time === "night" ? { K: "#c8ccd8" } : undefined);
  }
};

const drone: ActorFn = (p, s, t, a) => {
  const x = s.W * 0.5 + Math.sin(t * 0.5 * a.speed) * s.W * 0.32;
  const y = laneY(s, a.lane === 2 ? 1 : a.lane) + Math.sin(t * 1.7) * 5;
  p.sprite(DRONE, x, y, false, Math.floor(t * 4) % 2 ? undefined : { L: "#3aff6a" });
};

const train: ActorFn = (p, s, t, a) => {
  const y = s.ground - 16;
  // viaduc
  p.rect(0, y + 8, s.W, 2, s.tone.bldLo);
  for (let x = 6; x < s.W; x += 26) p.rect(x, y + 10, 3, s.ground - y - 10, s.tone.bldLo);
  const P = (s.W + 90) / (30 * a.speed);
  const u = (t % (P + 2)) / P;
  if (u > 1) return;
  const x0 = -80 + u * (s.W + 90);
  const body = a.color ?? s.accent;
  for (let k = 0; k < 3; k++) {
    const x = x0 + k * 26;
    p.rect(x, y, 24, 8, body);
    p.rect(x, y, 24, 1, shade(body, 0.35));
    for (let w = 2; w < 22; w += 5) p.rect(x + w, y + 2, 3, 3, s.tone.light ? "#d8f0ff" : "#ffe890");
    p.rect(x, y + 7, 24, 1, shade(body, -0.4));
  }
  p.rect(x0 + 76, y + 2, 2, 4, "#ffffff");
};

const truck: ActorFn = (p, s, t, a, i) => {
  const span = s.W + 50;
  const x = ((t * 22 * a.speed + i * 70) % span) - 30;
  const y = a.lane === 2 ? front(s) - 7 : s.ground - 7;
  p.sprite(TRUCK, x, y, false, { C: a.color ?? s.colors[0] ?? "#d84a2a" });
};

const ambulance: ActorFn = (p, s, t, a) => {
  const span = s.W + 40;
  const x = s.W + 20 - ((t * 26 * a.speed) % span);
  const y = front(s) - 8;
  const blink = Math.floor(t * 8) % 2;
  p.sprite(AMBULANCE, x, y, true, { R: "#e02a2a", B: blink ? "#2a6ae0" : "#ffffff" });
  if (blink) p.px(x + 10, y - 1, "#ffffff");
};

const ship: ActorFn = (p, s, t, a) => {
  const span = s.W + 80;
  const x = s.W + 40 - ((t * 5 * a.speed + span * 0.45) % span);
  const water = s.ground + Math.floor((s.H - s.ground) * 0.28);
  const y = water - 6;
  const cols = s.colors.length ? s.colors : ["#c84a2a", "#2a7ac8", "#e8b020"];
  for (let k = 0; k < 6; k++)
    for (let r = 0; r < 2; r++) {
      const c = cols[(k + r * 2) % cols.length]!;
      p.rect(x + 3 + k * 4, y - 3 - r * 3, 4, 3, c);
      p.px(x + 3 + k * 4, y - 3 - r * 3, shade(c, 0.3));
    }
  p.sprite(SHIP_HULL, x, y - 3);
  p.rect(x + 4, y + 3, 26, 1, shade(s.tone.water, 0.25));
};

const crane: ActorFn = (p, s, t) => {
  const mx = Math.floor(s.W * 0.9), top = Math.floor(s.ground * 0.28);
  const c = "#f0b020";
  for (let y = top; y < s.ground; y += 4) {
    p.rect(mx, y, 1, 4, c);
    p.rect(mx + 4, y, 1, 4, c);
    p.line(mx, y, mx + 4, y + 4, c);
  }
  p.rect(mx - 30, top - 2, 46, 2, c);
  p.rect(mx + 8, top - 1, 6, 4, "#5a5a6a");
  p.rect(mx + 1, top - 8, 3, 6, c);
  const hx = mx - 26 + Math.floor((Math.sin(t * 0.4) + 1) * 10);
  const hl = 10 + Math.floor((Math.sin(t * 0.9) + 1) * 10);
  p.rect(hx, top, 1, hl, "#202028");
  p.rect(hx - 1, top + hl, 3, 2, "#202028");
};

const ticker: ActorFn = (p, s, t, a) => {
  const y = s.indoor ? s.ground - 9 : s.ground - 8;
  p.rect(0, y, s.W, 8, "#050508");
  p.rect(0, y, s.W, 1, "#2a2a34");
  const items = ["PIX +4.2^", "8BIT -1.3v", "DATA +0.7^", "NES +2.1^", "KPI -0.4v", "ROI +3.8^"];
  const txt = items.join("   ") + "   ";
  const w = textWidth(txt) + 4;
  const off = Math.floor((t * 18 * a.speed) % w);
  let x = -off;
  while (x < s.W) {
    let cx = x;
    for (const it of items) {
      p.text(it, cx, y + 2, it.endsWith("^") ? "#3ad46a" : "#ff4a5a");
      cx += textWidth(it + "   ") + 4;
    }
    x += w;
  }
};

const crowd: ActorFn = (p, s, t, a) => {
  const n = 4 + Math.floor(s.W / 50);
  for (let k = 0; k < n; k++) {
    const dir = hash(k * 3) > 0.5 ? 1 : -1;
    const sp = (4 + hash(k) * 6) * a.speed;
    const span = s.W + 10;
    const x = dir > 0 ? ((hash(k * 7) * span + t * sp) % span) - 5 : span - ((hash(k * 7) * span + t * sp) % span) - 5;
    const y = s.ground + 1 + Math.floor(hash(k * 11) * Math.max(1, (s.H - s.ground) * 0.25));
    const shirt = s.colors[k % s.colors.length] ?? "#3a6ad8";
    p.sprite(PERSON, x, y, false, { B: shirt });
    if (Math.floor(t * 6 + k) % 2) p.px(x + (dir > 0 ? 2 : 0), y + 4, "#20202a");
  }
};

const serverLights: ActorFn = (p, s, t) => {
  if (s.indoor) return;
  // en extérieur : quelques fenêtres qui clignotent en couleurs « data »
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(hash(i * 17 + s.seed) * s.W);
    const y = Math.floor(s.ground * (0.5 + hash(i * 23) * 0.4));
    if (hash(i + Math.floor(t * 3)) > 0.5) p.rect(x, y, 2, 1, ["#3af06a", "#3aa8ff", "#ffb030"][i % 3]!);
  }
};

const ACTORS: Record<string, ActorFn> = {
  plane_takeoff: planeTakeoff,
  plane_taxi: planeTaxi,
  clouds,
  birds,
  drone,
  train,
  truck,
  ambulance,
  ship,
  crane,
  ticker,
  crowd,
  server_lights: serverLights,
};

/** Ordre de dessin : le ciel d'abord, le premier plan ensuite. */
const ORDER = ["clouds", "birds", "crane", "plane_takeoff", "drone", "train", "ship", "plane_taxi", "ticker", "server_lights", "crowd", "truck", "ambulance"];

export function drawActors(p: Painter, s: SceneCtx, actors: ActorCfg[], t: number): void {
  const sorted = actors.map((a, i) => ({ a, i })).sort((x, y) => ORDER.indexOf(x.a.type) - ORDER.indexOf(y.a.type));
  for (const { a, i } of sorted) ACTORS[a.type]?.(p, s, t, a, i);
}
