import { mix, shade, type Painter } from "../pixel/painter";
import { textWidth } from "../pixel/font";
import { hash, rng } from "../pixel/rng";
import type { SceneCtx, SceneDef } from "./context";
import { SCENES_NES } from "./scenes2";

/* ---------------- briques de décor ---------------- */

function hills(p: Painter, s: SceneCtx, base: number, amp: number, color: string, k = 1): void {
  for (let x = 0; x < s.W; x++) {
    const y = base - amp * (0.55 + 0.25 * Math.sin((x + s.seed % 97) / (23 * k)) + 0.2 * Math.sin((x + 11) / (9 * k)));
    p.rect(x, Math.floor(y), 1, base - Math.floor(y) + 1, color);
  }
}

function skyline(p: Painter, s: SceneCtx, base: number, minH: number, maxH: number, color: string, seed: number, x0 = 0, x1 = s.W): void {
  const r = rng(seed);
  let x = x0 - Math.floor(r() * 6);
  while (x < x1) {
    const w = 6 + Math.floor(r() * 12);
    const h = Math.floor(minH + r() * (maxH - minH));
    p.rect(x, base - h, w, h, color);
    if (r() < 0.25) p.rect(x + Math.floor(w / 2), base - h - 4, 1, 4, color); // antenne
    x += w + Math.floor(r() * 3);
  }
}

interface BuildingOpts { winW?: number; winH?: number; gx?: number; gy?: number; lit?: number; seed?: number; body?: string }

function building(p: Painter, s: SceneCtx, x: number, top: number, w: number, h: number, o: BuildingOpts = {}): void {
  const t = s.tone;
  const body = o.body ?? t.bld;
  p.rect(x, top, w, h, body);
  p.rect(x + w - 2, top, 2, h, shade(body, -0.35));
  p.rect(x, top, w, 1, t.bldHi);
  const ww = o.winW ?? 2, wh = o.winH ?? 2, gx = o.gx ?? 2, gy = o.gy ?? 2;
  const r = rng(o.seed ?? x * 31 + top);
  const lit = o.lit ?? 0.45;
  for (let yy = top + 3; yy + wh <= top + h - 2; yy += wh + gy) {
    for (let xx = x + 2; xx + ww <= x + w - 3; xx += ww + gx) {
      if (t.light) {
        // de jour : reflets du ciel, une colonne sur trois plus claire
        const c = (xx - x) % ((ww + gx) * 3) === 2 ? t.win : t.winOff;
        p.rect(xx, yy, ww, wh, c);
      } else p.rect(xx, yy, ww, wh, r() < lit ? t.win : t.winOff);
    }
  }
}

function tree(p: Painter, s: SceneCtx, x: number, base: number, size: number): void {
  const leaf = s.time === "day" ? "#2e8a3a" : s.time === "night" ? "#0e2a22" : "#3a2240";
  const leafHi = s.time === "day" ? "#58b04a" : s.time === "night" ? "#18402e" : "#5a3050";
  p.rect(x, base - size, 2, size, s.time === "day" ? "#6a4428" : "#24141c");
  p.disc(x + 1, base - size - size * 0.4, size * 0.75, leaf);
  p.disc(x, base - size - size * 0.55, size * 0.4, leafHi);
}

function road(p: Painter, s: SceneCtx, y: number, h: number, dashed = true): void {
  p.rect(0, y, s.W, h, s.tone.road);
  p.rect(0, y, s.W, 1, shade(s.tone.road, 0.15));
  if (dashed) for (let x = 0; x < s.W; x += 10) p.rect(x, y + Math.floor(h / 2), 5, 1, s.tone.mark);
}

/* ---------------- décors ---------------- */

const airport: SceneDef = {
  groundRatio: 0.74,
  still(p, s) {
    const t = s.tone;
    hills(p, s, s.ground, Math.max(8, s.H * 0.08), t.far);
    skyline(p, s, s.ground, 4, Math.max(10, s.H * 0.12), t.mid, s.seed + 3, Math.floor(s.W * 0.55));
    p.rect(0, s.ground, s.W, s.H - s.ground, t.ground);
    p.rect(0, s.ground, s.W, 1, t.groundHi);

    // terminal vitré
    const x0 = Math.floor(s.W * 0.04), w = Math.min(Math.floor(s.W * 0.5), 160), h = 18, top = s.ground - h;
    p.rect(x0, top, w, h, t.bld);
    for (let x = x0; x < x0 + w; x++) {
      const arc = Math.round(2 * Math.sin(((x - x0) / w) * Math.PI));
      p.rect(x, top - arc - 1, 1, arc + 1, t.bldHi);
    }
    p.rect(x0, top + 4, w, 8, t.light ? t.winOff : t.win);
    for (let x = x0 + 2; x < x0 + w; x += 5) p.rect(x, top + 4, 1, 8, t.bldLo);
    if (t.light) for (let x = x0 + 6; x < x0 + w; x += 22) p.line(x, top + 11, x + 6, top + 4, t.win);
    p.rect(x0, top + 12, w, 1, t.bldLo);
    // passerelles
    for (let k = 0; k < 3; k++) {
      const bx = x0 + 18 + k * Math.floor(w / 3);
      p.rect(bx, s.ground - 6, 10, 3, t.bldHi);
      p.rect(bx + 9, s.ground - 4, 2, 4, t.bldLo);
    }

    // tour de contrôle
    const tx = Math.floor(s.W * 0.72), th = Math.min(46, Math.floor(s.ground * 0.55));
    p.rect(tx, s.ground - th, 6, th, t.bld);
    p.rect(tx + 4, s.ground - th, 2, th, t.bldLo);
    p.rect(tx - 5, s.ground - th - 8, 16, 2, t.bldHi);
    p.rect(tx - 6, s.ground - th - 6, 18, 6, t.light ? t.winOff : t.win);
    for (let x = tx - 6; x < tx + 12; x += 3) p.rect(x, s.ground - th - 6, 1, 6, t.bldLo);
    p.rect(tx - 4, s.ground - th, 14, 2, t.bld);
    p.rect(tx + 2, s.ground - th - 14, 1, 6, t.bldHi);

    // piste
    const ry = s.ground + Math.floor((s.H - s.ground) * 0.45);
    p.rect(0, ry - 1, s.W, 9, shade(t.road, -0.1));
    p.rect(0, ry, s.W, 7, t.road);
    for (let x = 0; x < s.W; x += 12) p.rect(x, ry + 3, 6, 1, t.mark);
    for (let x = 4; x < 34 && x < s.W; x += 3) p.rect(x, ry + 1, 2, 5, t.mark);
  },
  live(p, s, time) {
    const ry = s.ground + Math.floor((s.H - s.ground) * 0.45);
    // balisage qui court le long de la piste
    const n = Math.ceil(s.W / 8);
    const head = Math.floor(time * 14) % (n + 6);
    for (let i = 0; i < n; i++) {
      const on = i === head || i === head - 1;
      const c = on ? "#ffffff" : s.time === "day" ? "#c8c860" : "#f8d040";
      p.px(i * 8 + 2, ry - 1, c);
      p.px(i * 8 + 2, ry + 7, s.time === "day" ? "#6a9a3a" : "#40d070");
    }
    const tx = Math.floor(s.W * 0.72), th = Math.min(46, Math.floor(s.ground * 0.55));
    if (Math.floor(time * 2) % 2) p.rect(tx + 1, s.ground - th - 15, 3, 2, "#ff3030");
    // tableau des départs
    if (s.detail) {
      const txt = `${s.detail.label} ${s.detail.value}`.toUpperCase();
      const bw = textWidth(txt) + 6, bx = Math.floor(s.W * 0.04) + 6, by = s.ground - 30;
      p.rect(bx, by, bw, 9, "#0a0a12");
      p.rect(bx, by, bw, 1, "#3a3a4a");
      const shown = Math.min(txt.length, Math.floor(time * 6) % (txt.length + 12));
      p.text(txt.slice(0, shown), bx + 3, by + 2, "#ffb612");
      p.rect(bx + 2, by + 9, 1, s.ground - by - 27 > 0 ? 3 : 3, "#3a3a4a");
    }
  },
};

const tradingFloor: SceneDef = {
  groundRatio: 0.8,
  still(p, s) {
    const t = s.tone;
    skyline(p, s, s.ground, s.ground * 0.2, s.ground * 0.5, t.far, s.seed);
    const r = rng(s.seed + 9);
    let x = -4;
    while (x < s.W) {
      const w = 18 + Math.floor(r() * 22);
      const h = Math.floor(s.ground * (0.35 + r() * 0.45));
      building(p, s, x, s.ground - h, w, h, { seed: x, lit: 0.35 });
      x += w + 2 + Math.floor(r() * 6);
    }
    // panneau géant
    const bw = Math.min(84, Math.floor(s.W * 0.42)), bh = 34, bx = s.W - bw - Math.floor(s.W * 0.06), by = Math.floor(s.ground * 0.36);
    p.rect(bx - 2, by - 2, bw + 4, bh + 4, "#000000");
    p.rect(bx - 1, by - 1, bw + 2, bh + 2, s.accent);
    p.rect(bx, by, bw, bh, "#05080c");
    for (let gy = by + 6; gy < by + bh; gy += 7) for (let gx = bx; gx < bx + bw; gx += 2) p.px(gx, gy, "#14202a");
    p.rect(bx + 4, by + bh + 2, 2, s.ground - by - bh - 2, "#202430");
    p.rect(bx + bw - 6, by + bh + 2, 2, s.ground - by - bh - 2, "#202430");
    road(p, s, s.ground, s.H - s.ground);
  },
  live(p, s, time) {
    const bw = Math.min(84, Math.floor(s.W * 0.42)), bh = 34, bx = s.W - bw - Math.floor(s.W * 0.06), by = Math.floor(s.ground * 0.36);
    // bougies boursières qui défilent
    const step = Math.floor(time * 2.5);
    const n = Math.floor((bw - 4) / 4);
    let v = 0;
    const vals: number[] = [];
    for (let i = 0; i < n + 1; i++) {
      v += (hash(step + i + s.seed) - 0.47) * 6;
      vals.push(v);
    }
    const lo = Math.min(...vals), hi = Math.max(...vals), span = Math.max(1, hi - lo);
    const Y = (q: number) => by + bh - 4 - ((q - lo) / span) * (bh - 8);
    for (let i = 0; i < n; i++) {
      const a = vals[i]!, b = vals[i + 1]!;
      const up = b >= a;
      const c = up ? "#3ad46a" : "#ff4a5a";
      const x = bx + 2 + i * 4;
      const wickTop = Math.min(Y(a), Y(b)) - 1 - Math.floor(hash(i + step) * 3);
      const wickBot = Math.max(Y(a), Y(b)) + 1 + Math.floor(hash(i * 3 + step) * 3);
      p.rect(x + 1, wickTop, 1, wickBot - wickTop, c);
      p.rect(x, Math.min(Y(a), Y(b)), 3, Math.max(1, Math.abs(Y(a) - Y(b))), c);
    }
    if (s.detail) p.text(s.detail.value.toUpperCase(), bx + 3, by + 2, "#ffd860");
    // fenêtres qui s'allument et s'éteignent
    if (!s.tone.light)
      for (let i = 0; i < 6; i++) {
        const x = Math.floor(hash(i + Math.floor(time / 2) * 17) * s.W);
        const y = Math.floor(s.ground * (0.45 + hash(i * 5 + Math.floor(time / 2)) * 0.45));
        p.rect(x, y, 2, 2, hash(i + time) > 0.5 ? s.tone.win : s.tone.winOff);
      }
  },
};

const dataCenter: SceneDef = {
  groundRatio: 0.8,
  indoor: true,
  still(p, s) {
    const wall = ["#040a10", "#081822", "#0c2230", "#102a3a"];
    const n = wall.length - 1;
    for (let i = 0; i < n; i++) {
      const y0 = Math.floor((s.ground * i) / n), y1 = Math.floor((s.ground * (i + 1)) / n);
      p.dither(0, y0, s.W, y1 - y0, wall[i]!, wall[i + 1]!, 6);
    }
    // plafond : chemins de câbles et néons
    p.rect(0, 4, s.W, 2, "#c8a020");
    for (let x = 6; x < s.W; x += 9) p.rect(x, 6, 1, 3, "#806814");
    for (let x = 10; x < s.W; x += 46) {
      p.rect(x, 11, 22, 2, "#d8f4ff");
      p.dither(x - 4, 13, 30, 6, "rgba(0,0,0,0)", "#d8f4ff", 2);
    }
    // faux plancher en perspective
    const fy = s.ground, fh = s.H - fy;
    p.rect(0, fy, s.W, fh, "#0e1a22");
    const vx = s.W / 2;
    for (let k = -12; k <= 12; k++) p.line(vx + k * 6, fy, vx + k * 40, s.H, "#1c3040");
    let y = fy + 2;
    for (let gap = 2; y < s.H; gap += 2) { p.rect(0, y, s.W, 1, "#1c3040"); y += gap; }
    // baies de serveurs
    const rh = Math.floor(s.ground * 0.62), top = s.ground - rh;
    for (let x = 6, i = 0; x + 16 < s.W; x += 22, i++) {
      p.rect(x, top, 16, rh, "#0c1118");
      p.rect(x, top, 16, 1, "#3a4a5c");
      p.rect(x, top, 1, rh, "#2a3644");
      p.rect(x + 15, top, 1, rh, "#060a0e");
      for (let yy = top + 3; yy < s.ground - 2; yy += 3) p.rect(x + 1, yy, 14, 1, "#18222e");
      for (let yy = top + 4; yy < s.ground - 2; yy += 6) p.rect(x + 9, yy, 4, 1, "#22303e");
      p.rect(x + 3, top - 3, 1, 3, "#c8a020");
    }
    // écran mural
    const sw = Math.min(70, Math.floor(s.W * 0.36)), sx = Math.floor(s.W / 2 - sw / 2);
    p.rect(sx - 1, top - 20, sw + 2, 14, "#000000");
    p.rect(sx, top - 19, sw, 12, "#031208");
  },
  live(p, s, time) {
    const rh = Math.floor(s.ground * 0.62), top = s.ground - rh;
    const cols = ["#3af06a", "#3af06a", "#3af06a", "#ffb030", "#3aa8ff"];
    for (let x = 6, i = 0; x + 16 < s.W; x += 22, i++) {
      for (let yy = top + 4, j = 0; yy < s.ground - 2; yy += 3, j++) {
        for (let k = 0; k < 3; k++) {
          const id = i * 97 + j * 7 + k;
          const rate = 2 + hash(id) * 8;
          if (hash(id + Math.floor(time * rate)) > 0.42) p.px(x + 2 + k * 2, yy, cols[Math.floor(hash(id * 3) * cols.length)]!);
        }
      }
    }
    // air froid qui remonte du plancher
    for (let i = 0; i < 24; i++) {
      const x = Math.floor(hash(i * 11) * s.W);
      const y = s.H - ((time * (8 + hash(i) * 10) + hash(i * 5) * s.H) % (s.H - top));
      p.px(x, y, "#5ac8f0");
    }
    const sw = Math.min(70, Math.floor(s.W * 0.36)), sx = Math.floor(s.W / 2 - sw / 2);
    const msg = (s.detail ? s.detail.value : "ALL SYSTEMS GO").toUpperCase();
    p.text(msg.slice(0, Math.floor((sw - 4) / 4)), sx + 2, top - 16, "#3af06a");
    if (Math.floor(time * 2) % 2) p.rect(sx + 2 + Math.min(msg.length, Math.floor((sw - 4) / 4)) * 4, top - 16, 3, 5, "#3af06a");
  },
};

const port: SceneDef = {
  groundRatio: 0.6,
  still(p, s) {
    const t = s.tone;
    skyline(p, s, s.ground, 2, Math.max(8, s.H * 0.1), t.far, s.seed, Math.floor(s.W * 0.4));
    // mer
    const sea = s.H - s.ground;
    p.rect(0, s.ground, s.W, sea, t.water);
    p.dither(0, s.ground, s.W, Math.floor(sea * 0.25), t.waterHi, t.water, 10);
    // quai et conteneurs
    const qx1 = Math.floor(s.W * 0.42), qy = s.ground + Math.floor(sea * 0.42);
    p.rect(0, qy, qx1, s.H - qy, s.time === "day" ? "#7a7e8a" : t.groundHi);
    p.rect(0, qy, qx1, 1, shade(s.time === "day" ? "#7a7e8a" : t.groundHi, 0.25));
    p.rect(qx1 - 1, qy, 2, s.H - qy, t.bldLo);
    const cols = [...s.colors, "#c84a2a", "#2a7ac8", "#e8b020", "#3a9a5a"];
    const r = rng(s.seed + 5);
    for (let x = 4; x + 12 < qx1 - 6; x += 13) {
      const stack = 1 + Math.floor(r() * 4);
      for (let k = 0; k < stack; k++) {
        const c = cols[Math.floor(r() * cols.length)]!;
        const y = qy - (k + 1) * 6;
        p.rect(x, y, 12, 6, c);
        p.rect(x, y, 12, 1, shade(c, 0.3));
        for (let rx = x + 1; rx < x + 12; rx += 2) p.rect(rx, y + 1, 1, 5, shade(c, -0.25));
      }
    }
    // portique
    const cx = Math.floor(s.W * 0.33), boomY = s.ground - Math.floor(s.ground * 0.32);
    const crane = s.accent;
    p.line(cx - 8, qy, cx - 2, boomY, crane);
    p.line(cx + 8, qy, cx + 2, boomY, crane);
    p.line(cx - 7, qy - 1, cx - 1, boomY, crane);
    p.line(cx + 7, qy - 1, cx + 1, boomY, crane);
    p.rect(cx - 6, boomY + Math.floor((qy - boomY) / 2), 12, 1, crane);
    p.rect(cx - 14, boomY - 2, Math.min(80, Math.floor(s.W * 0.45)), 3, crane);
    p.rect(cx - 3, boomY - 7, 6, 5, shade(crane, -0.3));
    p.rect(cx - 2, boomY - 6, 4, 2, t.light ? "#d8f0ff" : t.win);
  },
  live(p, s, time) {
    const sea = s.H - s.ground;
    // reflets sur l'eau
    for (let i = 0; i < Math.floor(s.W / 6); i++) {
      const y = s.ground + 2 + Math.floor(hash(i) * (sea - 4));
      const x = (Math.floor(hash(i * 7) * s.W) + Math.floor(time * (4 + hash(i) * 6))) % s.W;
      if (x > s.W * 0.42 || y < s.ground + sea * 0.42) p.rect(x, y, 3 + Math.floor(hash(i * 3) * 4), 1, s.tone.waterHi);
    }
    // chariot du portique et conteneur suspendu
    const cx = Math.floor(s.W * 0.33), boomY = s.ground - Math.floor(s.ground * 0.32);
    const len = Math.min(80, Math.floor(s.W * 0.45)) - 20;
    const u = (Math.sin(time * 0.6) + 1) / 2;
    const tx = cx - 8 + Math.floor(u * len);
    const drop = 6 + Math.floor(((Math.sin(time * 1.2) + 1) / 2) * 14);
    p.rect(tx - 2, boomY + 1, 6, 2, "#202028");
    p.rect(tx, boomY + 3, 1, drop, "#202028");
    p.rect(tx + 2, boomY + 3, 1, drop, "#202028");
    const c = s.colors[1] ?? "#2a7ac8";
    p.rect(tx - 4, boomY + 3 + drop, 10, 5, c);
    p.rect(tx - 4, boomY + 3 + drop, 10, 1, shade(c, 0.3));
  },
};

const factory: SceneDef = {
  groundRatio: 0.74,
  still(p, s) {
    const t = s.tone;
    hills(p, s, s.ground, Math.max(10, s.H * 0.12), t.far, 1.6);
    p.rect(0, s.ground, s.W, s.H - s.ground, t.ground);
    const x0 = Math.floor(s.W * 0.08), x1 = Math.floor(s.W * 0.8), h = Math.max(22, Math.floor(s.ground * 0.28)), top = s.ground - h;
    const body = t.light ? "#b8bcc8" : t.bld;
    p.rect(x0, top, x1 - x0, h, body);
    p.rect(x0, top, x1 - x0, 1, t.bldHi);
    p.rect(x0, top + h - 3, x1 - x0, 3, shade(body, -0.25));
    // toit en dents de scie
    for (let x = x0; x < x1 - 12; x += 12) {
      for (let k = 0; k < 12; k++) p.rect(x + k, top - Math.floor(k * 0.7), 1, Math.floor(k * 0.7), k > 9 ? t.bldHi : shade(body, -0.15));
      p.rect(x + 11, top - 7, 1, 7, t.light ? t.win : t.win);
      p.rect(x + 10, top - 6, 1, 6, t.light ? t.winOff : shade(t.win, -0.3));
    }
    for (let x = x0 + 4; x < x1 - 6; x += 7) p.rect(x, top + 5, 4, 5, t.light ? "#3a5480" : t.win);
    p.rect(x0 + 10, s.ground - 10, 14, 10, t.bldLo);
    for (let yy = s.ground - 9; yy < s.ground; yy += 2) p.rect(x0 + 11, yy, 12, 1, shade(t.bldLo, 0.2));
    // cheminées rayées
    for (const fx of [0.6, 0.68]) {
      const cx = Math.floor(s.W * fx), ch = Math.floor(s.ground * 0.42);
      for (let k = 0; k < ch; k++) p.rect(cx, s.ground - h - ch + k, 5, 1, Math.floor(k / 4) % 2 ? "#e8e8f0" : "#d83a2a");
    }
    // tapis roulant
    const by = s.ground + Math.floor((s.H - s.ground) * 0.38);
    p.rect(0, by, s.W, 3, "#30323e");
    p.rect(0, by + 3, s.W, 1, "#16161e");
    for (let x = 6; x < s.W; x += 24) p.rect(x, by + 4, 2, s.H - by - 4, "#20222c");
  },
  live(p, s, time) {
    const h = Math.max(22, Math.floor(s.ground * 0.28));
    // fumée
    for (const [i, fx] of [0.6, 0.68].entries()) {
      const cx = Math.floor(s.W * fx) + 2, ch = Math.floor(s.ground * 0.42), y0 = s.ground - h - ch;
      for (let k = 0; k < 6; k++) {
        const u = (time * 0.18 + k / 6 + i * 0.5) % 1;
        const y = y0 - u * y0 * 0.95;
        const x = cx + Math.sin(u * 5 + k) * 4 + u * 18;
        const r = 2 + u * 7;
        const c = s.time === "day" ? mix("#f0f0f4", "#b8bcc8", u) : mix("#5a5a70", "#2a2a3c", u);
        if (u < 0.92) p.disc(x, y, r, c);
      }
    }
    // tapis : rouleaux et caisses
    const by = s.ground + Math.floor((s.H - s.ground) * 0.38);
    const off = Math.floor(time * 12) % 4;
    for (let x = -off; x < s.W; x += 4) p.px(x, by + 1, "#5a5e70");
    for (let k = 0; k < 5; k++) {
      const x = ((time * 12 + k * (s.W / 5 + 7)) % (s.W + 20)) - 10;
      const c = s.colors[k % s.colors.length] ?? "#c89040";
      p.rect(x, by - 6, 8, 6, shade(c, -0.1));
      p.rect(x, by - 6, 8, 1, shade(c, 0.3));
      p.rect(x + 3, by - 6, 2, 6, shade(c, -0.35));
    }
    // bras robot
    const rx = Math.floor(s.W * 0.86), ry = by - 1;
    const a1 = -1.9 + Math.sin(time * 1.4) * 0.5, a2 = a1 + 1.4 + Math.sin(time * 1.4 + 1) * 0.6;
    const jx = rx + Math.cos(a1) * 12, jy = ry + Math.sin(a1) * 12;
    const ex = jx + Math.cos(a2) * 10, ey = jy + Math.sin(a2) * 10;
    p.rect(rx - 3, ry - 2, 7, 3, "#30323e");
    p.line(rx, ry - 2, jx, jy, "#e8a020");
    p.line(rx + 1, ry - 2, jx + 1, jy, "#e8a020");
    p.line(jx, jy, ex, ey, "#e8a020");
    p.rect(ex - 1, ey - 1, 3, 3, "#30323e");
    // gyrophare
    const x0 = Math.floor(s.W * 0.08), top = s.ground - h;
    p.rect(x0 + 2, top - 3, 2, 2, Math.floor(time * 3) % 2 ? "#ffb020" : "#5a3a10");
  },
};

const hospital: SceneDef = {
  groundRatio: 0.78,
  still(p, s) {
    const t = s.tone;
    skyline(p, s, s.ground, s.ground * 0.1, s.ground * 0.3, t.far, s.seed);
    p.rect(0, s.ground, s.W, s.H - s.ground, t.ground);
    const w = Math.min(Math.floor(s.W * 0.54), 140), x = Math.floor(s.W / 2 - w / 2), h = Math.floor(s.ground * 0.56), top = s.ground - h;
    const body = s.time === "day" ? "#e4e8f0" : s.time === "night" ? "#2a3460" : "#5a3a60";
    building(p, s, x, top, w, h, { body, winW: 3, winH: 2, gx: 2, gy: 3, lit: 0.55, seed: 77 });
    // ailes
    building(p, s, x - 26, top + 14, 26, h - 14, { body: shade(body, -0.12), winW: 2, seed: 78 });
    building(p, s, x + w, top + 10, 24, h - 10, { body: shade(body, -0.12), winW: 2, seed: 79 });
    // héliport
    p.rect(x + 6, top - 2, 26, 2, "#40445a");
    p.text("H", x + 17, top - 8, "#f4f4f8");
    // entrée
    p.rect(Math.floor(s.W / 2) - 16, s.ground - 12, 32, 2, s.accent);
    p.rect(Math.floor(s.W / 2) - 10, s.ground - 10, 20, 10, t.light ? "#a8d8f8" : t.win);
    p.rect(Math.floor(s.W / 2), s.ground - 10, 1, 10, t.bldLo);
    // arbres
    for (const fx of [0.06, 0.14, 0.86, 0.94]) tree(p, s, Math.floor(s.W * fx), s.ground, 7);
    road(p, s, s.ground + Math.floor((s.H - s.ground) * 0.45), Math.ceil((s.H - s.ground) * 0.4));
  },
  live(p, s, time) {
    const w = Math.min(Math.floor(s.W * 0.54), 140), x = Math.floor(s.W / 2 - w / 2), h = Math.floor(s.ground * 0.56), top = s.ground - h;
    // croix lumineuse qui pulse
    const cx = x + w - 16, cy = top + 4;
    const c = Math.floor(time * 1.5) % 2 ? "#2ad45a" : "#18a040";
    p.rect(cx - 1, cy - 4, 4, 11, "#0a2a14");
    p.rect(cx - 4, cy - 1, 10, 5, "#0a2a14");
    p.rect(cx, cy - 3, 2, 9, c);
    p.rect(cx - 3, cy, 8, 3, c);
    // hélicoptère posé, rotor qui tourne
    const hx = x + 8, hy = top - 9;
    const frame = Math.floor(time * 12) % 3;
    p.rect(hx + 10, hy + 2, 10, 4, "#f4f4f8");
    p.rect(hx + 16, hy + 3, 3, 2, "#5ab4f4");
    p.rect(hx + 2, hy + 3, 8, 1, "#e02a2a");
    p.rect(hx + 11, hy + 6, 9, 1, "#30303a");
    p.rect(hx + 15, hy, 1, 2, "#30303a");
    const rl = [11, 7, 3][frame]!;
    p.rect(hx + 15 - rl, hy, rl * 2 + 1, 1, "#30303a");
  },
};

const headquarters: SceneDef = {
  groundRatio: 0.8,
  still(p, s) {
    const t = s.tone;
    skyline(p, s, s.ground, s.ground * 0.15, s.ground * 0.4, t.far, s.seed);
    const r = rng(s.seed + 2);
    for (let x = -6; x < s.W; ) {
      const w = 16 + Math.floor(r() * 18);
      const h = Math.floor(s.ground * (0.25 + r() * 0.3));
      if (Math.abs(x + w / 2 - s.W / 2) > 30) building(p, s, x, s.ground - h, w, h, { seed: x + 5 });
      x += w + 3;
    }
    // tour de verre centrale
    const tw = Math.max(30, Math.min(44, Math.floor(s.W * 0.18))), tx = Math.floor(s.W / 2 - tw / 2), th = Math.floor(s.ground * 0.86), top = s.ground - th;
    const glassA = t.light ? "#6aa0d8" : shade(s.accent, -0.55), glassB = t.light ? "#a8d0f4" : shade(s.accent, -0.35);
    for (let x = tx; x < tx + tw; x++) p.rect(x, top, 1, th, (x - tx) % 4 < 2 ? glassA : glassB);
    for (let y = top + 4; y < s.ground; y += 4) p.rect(tx, y, tw, 1, shade(glassA, -0.3));
    p.rect(tx, top, tw, 2, t.bldHi);
    p.rect(tx + 4, top - 6, tw - 8, 6, t.bld);
    p.rect(tx + Math.floor(tw / 2), top - 18, 1, 12, t.bldHi);
    // parvis, drapeaux, arbres
    p.rect(0, s.ground, s.W, s.H - s.ground, t.groundHi);
    for (let x = 0; x < s.W; x += 8) p.rect(x, s.ground, 1, s.H - s.ground, t.ground);
    for (let y = s.ground + 4; y < s.H; y += 5) p.rect(0, y, s.W, 1, t.ground);
    for (let k = 0; k < 3; k++) p.rect(tx - 24 + k * 6, s.ground - 22, 1, 22, "#c8ccd8");
    tree(p, s, Math.floor(s.W * 0.08), s.ground, 6);
    tree(p, s, Math.floor(s.W * 0.92), s.ground, 6);
  },
  live(p, s, time) {
    const tw = Math.max(30, Math.min(44, Math.floor(s.W * 0.18))), tx = Math.floor(s.W / 2 - tw / 2), th = Math.floor(s.ground * 0.86), top = s.ground - th;
    if (Math.floor(time * 1.6) % 2) p.rect(tx + Math.floor(tw / 2) - 1, top - 19, 3, 2, "#ff3030");
    // reflet qui balaie la façade
    const u = (time * 0.25) % 1.6;
    const yb = s.ground - u * (th + 30);
    for (let k = 0; k < 6; k++) {
      const yy = Math.floor(yb + k);
      if (yy > top && yy < s.ground) p.rect(tx, yy, tw, 1, "rgba(255,255,255,0.18)");
    }
    // drapeaux au vent
    for (let k = 0; k < 3; k++) {
      const c = s.colors[k % s.colors.length] ?? s.accent;
      const fx = tx - 23 + k * 6, fy = s.ground - 22;
      for (let i = 0; i < 6; i++) {
        const wave = Math.round(Math.sin(time * 6 + i * 0.9 + k) * 0.8);
        p.rect(fx + i, fy + wave, 1, 4, c);
      }
    }
  },
};

export const SCENES: Record<string, SceneDef> = {
  ...SCENES_NES,
  airport,
  trading_floor: tradingFloor,
  data_center: dataCenter,
  port,
  factory,
  hospital,
  headquarters,
  // en attendant leurs décors dédiés
  station: SCENES_NES.underground!,
  warehouse: SCENES_NES.warehouse!,
  store: SCENES_NES.paris!,
};
