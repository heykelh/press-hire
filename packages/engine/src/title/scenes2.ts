/**
 * Décors inspirés des grands jeux NES : on reprend des techniques de dessin
 * (aplats francs, contours sombres, tuiles 8×8, parallaxe), jamais leurs éléments
 * reconnaissables (pas de tuyaux verts, de blocs « ? », de personnages).
 */
import { mix, shade, type Painter } from "../pixel/painter";
import { textWidth } from "../pixel/font";
import { hash, rng } from "../pixel/rng";
import type { SceneCtx, SceneDef } from "./context";

const OUT = "#0c0c14"; // contour sombre façon NES

/* ---------- PLAINS : plaine de jeu de plateforme, couleurs franches ---------- */

function bump(p: Painter, cx: number, base: number, rw: number, rh: number, fill: string, hi: string): void {
  for (let x = -rw; x <= rw; x++) {
    const h = Math.round(rh * Math.sqrt(1 - (x * x) / (rw * rw)));
    p.rect(cx + x, base - h, 1, h, fill);
    p.px(cx + x, base - h, OUT);
  }
  for (let k = -2; k <= 2; k += 2) p.rect(cx + k * Math.floor(rw / 5), base - Math.floor(rh * 0.7), 1, Math.floor(rh * 0.45), hi);
}

function tiles(p: Painter, x0: number, y0: number, w: number, h: number, base: string): void {
  const hi = shade(base, 0.35), lo = shade(base, -0.35);
  for (let y = y0; y < y0 + h; y += 8)
    for (let x = x0 - ((y - y0) / 8 % 2 ? 4 : 0); x < x0 + w; x += 8) {
      p.rect(x, y, 8, 8, base);
      p.rect(x, y, 8, 1, hi);
      p.rect(x, y, 1, 8, hi);
      p.rect(x + 7, y, 1, 8, lo);
      p.rect(x, y + 7, 8, 1, lo);
    }
}

const plains: SceneDef = {
  groundRatio: 0.78,
  still(p, s) {
    const night = s.time === "night";
    const hillA = night ? "#1c4a3a" : "#2a9a3a", hillB = night ? "#143a2c" : "#1e7a2e";
    bump(p, Math.floor(s.W * 0.18), s.ground, 34, 30, hillB, shade(hillB, 0.2));
    bump(p, Math.floor(s.W * 0.62), s.ground, 22, 18, hillA, shade(hillA, 0.25));
    bump(p, Math.floor(s.W * 0.95), s.ground, 28, 24, hillB, shade(hillB, 0.2));
    // buissons
    const bush = night ? "#1e5a3a" : "#4ac84a";
    for (const fx of [0.38, 0.8]) {
      const bx = Math.floor(s.W * fx);
      for (const [dx, r] of [[0, 6], [8, 8], [16, 6]] as const) {
        p.disc(bx + dx, s.ground - 1, r + 1, OUT);
        p.disc(bx + dx, s.ground - 1, r, bush);
      }
      p.rect(bx - 8, s.ground, 34, 1, OUT);
    }
    tiles(p, 0, s.ground, s.W, s.H - s.ground, night ? "#5a2c1c" : "#c8641c");
    // plateformes flottantes
    const py = s.ground - 30;
    const px0 = Math.floor(s.W * 0.42);
    tiles(p, px0, py, 32, 8, night ? "#6a3420" : "#b85418");
    tiles(p, Math.floor(s.W * 0.12), py - 18, 24, 8, night ? "#6a3420" : "#b85418");
  },
  live(p, s, t) {
    // bloc « donnée » qui rebondit, avec un jeton qui tourne
    const px0 = Math.floor(s.W * 0.42) + 32, py = s.ground - 30;
    const bumpUp = (t % 3) < 0.15 ? 2 : 0;
    p.rect(px0, py - bumpUp, 8, 8, OUT);
    p.rect(px0 + 1, py + 1 - bumpUp, 6, 6, s.accent);
    p.rect(px0 + 1, py + 1 - bumpUp, 6, 1, shade(s.accent, 0.5));
    // icône « graphique en barres » (pas de point d'interrogation)
    p.rect(px0 + 2, py + 5 - bumpUp, 1, 2, OUT);
    p.rect(px0 + 4, py + 3 - bumpUp, 1, 4, OUT);
    p.rect(px0 + 6, py + 2 - bumpUp, 1, 5, OUT);
    const phase = Math.floor(t * 8) % 4;
    const w = [5, 3, 1, 3][phase]!;
    const cy = py - 12 - Math.round(Math.abs(Math.sin(t * 2)) * 3);
    p.rect(px0 + 4 - Math.floor(w / 2), cy, w, 7, "#ffd030");
    if (w > 2) p.rect(px0 + 4 - Math.floor(w / 2), cy, 1, 7, "#fff4a0");
  },
};

/* ---------- ROOFTOPS : toits de la ville la nuit, citernes, néon ---------- */

const rooftops: SceneDef = {
  groundRatio: 0.66,
  still(p, s) {
    const t = s.tone;
    // grosse lune
    if (s.time === "night" || s.time === "dawn") {
      const mx = Math.floor(s.W * 0.22), my = Math.floor(s.ground * 0.35), R = Math.max(12, Math.floor(s.H * 0.13));
      p.disc(mx, my, R + 3, mix("#f4ecc8", s.time === "night" ? "#0d1434" : "#7a3c78", 0.75));
      p.disc(mx, my, R, "#f4ecc8");
      p.disc(mx - 4, my + 3, 3, "#d8d0a8");
      p.disc(mx + 5, my - 4, 2, "#d8d0a8");
    }
    const r = rng(s.seed + 4);
    let x = -3;
    while (x < s.W) {
      const w = 6 + Math.floor(r() * 10), h = Math.floor(s.ground * (0.2 + r() * 0.35));
      p.rect(x, s.ground - h, w, h + 2, t.far);
      x += w;
    }
    // toits au premier plan
    const roofs: Array<[number, number]> = [];
    x = -6;
    while (x < s.W) {
      const w = 30 + Math.floor(r() * 40);
      const top = s.ground + Math.floor(r() * 10) - 4;
      roofs.push([x, w]);
      p.rect(x, top, w, s.H - top, t.bld);
      p.rect(x, top, w, 2, t.bldHi);
      p.rect(x, top - 3, 2, 3, t.bldHi);
      p.rect(x + w - 2, top - 3, 2, 3, t.bldHi);
      for (let yy = top + 6; yy < s.H; yy += 7) for (let xx = x + 4; xx < x + w - 4; xx += 6) p.rect(xx, yy, 3, 3, r() < 0.4 ? t.win : t.winOff);
      // citerne d'eau (un toit sur deux)
      if (roofs.length % 2 === 1) {
        const cx = x + 6 + Math.floor(r() * (w - 20));
        p.rect(cx + 1, top - 6, 1, 6, OUT);
        p.rect(cx + 10, top - 6, 1, 6, OUT);
        p.line(cx + 1, top - 6, cx + 10, top - 1, OUT);
        p.rect(cx, top - 18, 12, 12, "#6a4428");
        for (let k = cx + 2; k < cx + 12; k += 3) p.rect(k, top - 18, 1, 12, "#4a2e18");
        for (let k = 0; k < 6; k++) p.rect(cx + 6 - k, top - 19 - (5 - k), k * 2 + 1, 1, "#3a2414");
      } else {
        // cheminées et climatiseur
        p.rect(x + 5, top - 9, 4, 9, shade(t.bld, -0.2));
        p.rect(x + w - 16, top - 5, 10, 5, "#8a8e9a");
        p.rect(x + w - 14, top - 4, 6, 3, "#5a5e6a");
      }
      x += w + 6 + Math.floor(r() * 8);
    }
  },
  live(p, s, t) {
    // enseigne néon qui grésille
    const txt = (s.detail?.value ?? "OPEN 24/7").toUpperCase().slice(0, 14);
    const w = textWidth(txt) + 6, x = Math.floor(s.W * 0.62) - Math.floor(w / 2), y = s.ground - 22;
    const on = !(hash(Math.floor(t * 10)) > 0.9);
    p.rect(x, y, w, 9, "#0a0610");
    p.rect(x, y, w, 1, on ? s.accent : "#301020");
    p.rect(x, y + 8, w, 1, on ? s.accent : "#301020");
    p.text(txt, x + 3, y + 2, on ? shade(s.accent, 0.5) : "#401830");
    p.rect(x + 4, y + 9, 1, 14, "#202028");
    p.rect(x + w - 5, y + 9, 1, 14, "#202028");
    // vapeur d'un conduit
    for (let k = 0; k < 4; k++) {
      const u = (t * 0.4 + k / 4) % 1;
      p.disc(Math.floor(s.W * 0.86) + u * 6, s.ground - 8 - u * 20, 1 + u * 3, mix("#9aa0b8", "#2a3050", u));
    }
  },
};

/* ---------- UNDERGROUND : quai de métro carrelé ---------- */

const underground: SceneDef = {
  groundRatio: 0.72,
  indoor: true,
  still(p, s) {
    // voûte et carrelage blanc biseauté
    p.rect(0, 0, s.W, s.H, "#16141c");
    const vault = Math.floor(s.ground * 0.18);
    for (let x = 0; x < s.W; x++) {
      const d = Math.abs(x - s.W / 2) / (s.W / 2);
      const h = Math.floor(vault * (1 - d * d));
      p.rect(x, 0, 1, vault - h, "#0c0a10");
    }
    for (let y = vault; y < s.ground; y += 4)
      for (let x = ((y / 4) % 2) * 3; x < s.W; x += 6) {
        p.rect(x, y, 5, 3, "#e8e4dc");
        p.px(x, y, "#ffffff");
        p.rect(x + 4, y + 1, 1, 2, "#b8b4ac");
      }
    // frise colorée et plaque de station
    p.rect(0, vault + 10, s.W, 3, s.accent);
    // affiches
    for (let x = 12; x < s.W - 30; x += 64) {
      p.rect(x, vault + 20, 22, 28, "#20202a");
      const c = s.colors[(x / 64) % s.colors.length | 0] ?? s.accent;
      p.rect(x + 2, vault + 22, 18, 24, c);
      p.rect(x + 4, vault + 26, 14, 2, shade(c, 0.5));
      p.rect(x + 4, vault + 30, 10, 2, shade(c, 0.5));
      p.disc(x + 11, vault + 39, 4, shade(c, -0.3));
    }
    // quai, bande d'éveil, voies
    p.rect(0, s.ground, s.W, 5, "#8a8478");
    p.rect(0, s.ground, s.W, 1, "#b8b0a0");
    for (let x = 0; x < s.W; x += 3) p.rect(x, s.ground + 1, 2, 2, "#e8c020");
    p.rect(0, s.ground + 5, s.W, s.H - s.ground - 5, "#0c0a0e");
    const ry = s.ground + Math.floor((s.H - s.ground) * 0.55);
    for (let x = 0; x < s.W; x += 6) p.rect(x, ry - 1, 4, 3, "#3a2a20");
    p.rect(0, ry - 3, s.W, 1, "#9a9aa8");
    p.rect(0, ry + 3, s.W, 1, "#9a9aa8");
    // tuyaux au plafond
    p.rect(0, vault + 2, s.W, 2, "#5a5e6a");
    p.rect(0, vault + 5, s.W, 1, "#3a3e4a");
  },
  live(p, s, t) {
    const vault = Math.floor(s.ground * 0.18);
    // plaque de station (bleu nuit, lettres blanches)
    const name = (s.detail?.value ?? "DATA").toUpperCase().slice(0, 16);
    const w = textWidth(name) + 8, x = Math.floor(s.W / 2 - w / 2), y = vault + 16;
    p.rect(x - 1, y - 1, w + 2, 11, "#e8e4dc");
    p.rect(x, y, w, 9, "#1a2a6a");
    p.text(name, x + 4, y + 2, "#ffffff");
    // néons qui clignotent un peu
    for (let i = 0; i * 40 + 10 < s.W; i++) {
      const flick = hash(i * 13 + Math.floor(t * 12)) > 0.95;
      p.rect(i * 40 + 10, vault + 7, 16, 1, flick ? "#606070" : "#f8f8ff");
    }
    // gouttes
    for (let i = 0; i < 4; i++) {
      const gx = Math.floor(hash(i * 7) * s.W), u = (t * 0.7 + hash(i)) % 1;
      p.px(gx, vault + 6 + u * (s.ground - vault), "#7ab4e8");
    }
  },
};

/* ---------- JUNGLE : cascade, falaises, palmiers ---------- */

function palm(p: Painter, s: SceneCtx, x: number, base: number, h: number, t: number): void {
  const trunk = s.time === "night" ? "#3a2618" : "#8a5a2a";
  for (let k = 0; k < h; k++) {
    const bend = Math.round(Math.sin(k / h * 1.6) * 4);
    p.rect(x + bend, base - k, 3, 1, k % 3 === 0 ? shade(trunk, -0.3) : trunk);
  }
  const tx = x + Math.round(Math.sin(1.6) * 4) + 1, ty = base - h;
  const leaf = s.time === "night" ? "#164a2a" : "#2ab84a", leafLo = s.time === "night" ? "#0e3018" : "#1a8a34";
  const sway = Math.sin(t * 1.4 + x) * 1.5;
  for (const [ang, len] of [[-2.6, 14], [-1.9, 12], [-0.6, 14], [-1.2, 11], [0.2, 10], [-3.2, 10]] as const) {
    for (let k = 0; k < len; k++) {
      const a = ang + sway * 0.03;
      const px = tx + Math.cos(a) * k, py = ty + Math.sin(a) * k + (k * k) / 26;
      p.rect(px, py, 2, 2, k > len - 4 ? leafLo : leaf);
      if (k % 3 === 1) p.px(px, py + 2, leafLo);
    }
  }
}

const jungle: SceneDef = {
  groundRatio: 0.7,
  still(p, s) {
    const t = s.tone;
    const far = s.time === "day" ? "#5a8ab0" : t.far, mid = s.time === "day" ? "#2e6a5a" : shade(t.far, -0.2);
    // montagnes en deux couches
    for (let x = 0; x < s.W; x++) {
      const y1 = s.ground - 24 - Math.abs(((x + 40) % 70) - 35) * 0.9 - Math.sin(x / 7) * 2;
      p.rect(x, y1, 1, s.ground - y1, far);
      const y2 = s.ground - 10 - Math.abs(((x + 10) % 46) - 23) * 0.7;
      p.rect(x, y2, 1, s.ground - y2, mid);
    }
    // falaise de la cascade
    const cx = Math.floor(s.W * 0.7), cw = Math.max(26, Math.floor(s.W * 0.14)), top = Math.floor(s.ground * 0.35);
    const rock = s.time === "day" ? "#7a6a5a" : "#3a3040", rockHi = shade(rock, 0.25), rockLo = shade(rock, -0.35);
    p.rect(cx - 14, top, 14, s.H - top, rock);
    p.rect(cx + cw, top + 6, 16, s.H - top, rock);
    for (let y = top; y < s.H; y += 5) {
      p.rect(cx - 14, y, 14, 1, rockLo);
      p.rect(cx + cw, y + 2, 16, 1, rockLo);
      p.rect(cx - 12 + (y % 7), y + 2, 4, 1, rockHi);
    }
    p.rect(cx - 16, top - 3, cw + 34, 4, s.time === "day" ? "#2ab84a" : "#164a2a");
    // rivière
    const ry = s.ground + Math.floor((s.H - s.ground) * 0.45);
    p.rect(0, s.ground, s.W, s.H - s.ground, s.time === "day" ? "#3a7a2a" : "#122a18");
    p.rect(0, ry, s.W, s.H - ry, t.water);
    p.rect(0, ry, s.W, 1, t.waterHi);
    // pont de corde
    const by = Math.floor(s.ground * 0.62);
    for (let x = 0; x < cx - 14; x += 4) {
      const sag = Math.round(Math.sin((x / (cx - 14)) * Math.PI) * 5);
      p.rect(x, by + sag, 3, 2, "#8a5a2a");
      p.px(x, by + sag - 4, "#5a3a1a");
    }
  },
  live(p, s, t) {
    const cx = Math.floor(s.W * 0.7), cw = Math.max(26, Math.floor(s.W * 0.14)), top = Math.floor(s.ground * 0.35);
    // cascade animée
    const off = Math.floor(t * 30);
    for (let x = cx; x < cx + cw; x++) {
      for (let y = top; y < s.H; y += 1) {
        const v = (((y - off + (x % 5) * 3) % 9) + 9) % 9;
        p.px(x, y, v < 2 ? "#ffffff" : v < 5 ? "#9ad8ff" : "#4aa0e8");
      }
    }
    const ry = s.ground + Math.floor((s.H - s.ground) * 0.45);
    for (let k = 0; k < 10; k++) p.disc(cx + hash(k) * cw, ry + 1, 1 + ((t * 3 + k) % 3), "#ffffff");
    // palmiers
    palm(p, s, Math.floor(s.W * 0.08), s.ground + 4, Math.floor(s.ground * 0.55), t);
    palm(p, s, Math.floor(s.W * 0.33), s.ground + 6, Math.floor(s.ground * 0.42), t);
    palm(p, s, Math.floor(s.W * 0.93), s.ground + 4, Math.floor(s.ground * 0.5), t);
    // reflets de la rivière
    for (let i = 0; i < 12; i++) {
      const x = (Math.floor(hash(i * 3) * s.W) + Math.floor(t * 12)) % s.W;
      p.rect(x, ry + 2 + Math.floor(hash(i) * (s.H - ry - 3)), 4, 1, s.tone.waterHi);
    }
  },
};

/* ---------- PARIS : façades haussmanniennes, toits de zinc, métro ---------- */

const paris: SceneDef = {
  groundRatio: 0.8,
  still(p, s) {
    const t = s.tone;
    const day = s.time === "day";
    // tour en treillis au loin
    const ex = Math.floor(s.W * 0.78), eb = s.ground, eh = Math.floor(s.ground * 0.95);
    const tc = day ? "#5a4a40" : "#140a1c";
    for (let k = 0; k < eh; k++) {
      const half = Math.max(1, Math.round(((eh - k) / eh) ** 2.2 * 16));
      p.rect(ex - half, eb - k, 2, 1, tc);
      p.rect(ex + half - 1, eb - k, 2, 1, tc);
      if (k % 4 === 0) p.rect(ex - half, eb - k, half * 2 + 1, 1, tc);
    }
    p.rect(ex - 9, eb - Math.floor(eh * 0.32), 19, 2, tc);
    p.rect(ex - 5, eb - Math.floor(eh * 0.6), 11, 2, tc);
    p.rect(ex, eb - eh - 6, 1, 6, tc);
    // immeubles
    const stone = day ? "#e8dcc0" : s.time === "sunset" ? "#c8906a" : "#4a4460";
    const stoneLo = shade(stone, -0.18), zinc = day ? "#6a7890" : "#2a3048";
    const r = rng(s.seed + 8);
    let x = -4;
    while (x < s.W) {
      const w = 34 + Math.floor(r() * 16), h = Math.floor(s.ground * (0.5 + r() * 0.12)), top = s.ground - h;
      p.rect(x, top, w, h, stone);
      p.rect(x + w - 1, top, 1, h, stoneLo);
      for (let k = 0; k < 9; k++) p.rect(x + k, top - 9 + k, w - k * 2, 1, zinc);
      // lucarnes et conduits
      for (let dx = x + 6; dx < x + w - 6; dx += 10) {
        p.rect(dx, top - 7, 4, 5, stone);
        p.rect(dx + 1, top - 6, 2, 3, t.light ? "#3a4a6a" : t.win);
      }
      p.rect(x + w - 8, top - 14, 5, 6, "#a8603a");
      // fenêtres hautes et balcons
      for (let yy = top + 4, f = 0; yy + 7 < s.ground - 10; yy += 10, f++) {
        for (let dx = x + 4; dx + 4 < x + w - 2; dx += 7) {
          p.rect(dx, yy, 4, 7, t.light ? "#5a6a8a" : r() < 0.5 ? t.win : t.winOff);
          p.rect(dx, yy, 4, 1, stoneLo);
        }
        if (f === 1 || f === 3) {
          p.rect(x + 2, yy + 8, w - 4, 1, OUT);
          for (let k = x + 2; k < x + w - 2; k += 2) p.px(k, yy + 7, OUT);
        }
      }
      // rez-de-chaussée : boutique avec store
      const aw = s.colors[Math.floor(r() * s.colors.length)] ?? "#c8201c";
      p.rect(x + 3, s.ground - 10, w - 6, 3, aw);
      for (let k = x + 3; k < x + w - 3; k += 4) p.rect(k, s.ground - 10, 2, 3, "#f4ecd8");
      p.rect(x + 4, s.ground - 7, w - 8, 7, t.light ? "#a8c8e8" : t.win);
      x += w;
    }
    // trottoir et chaussée pavée
    p.rect(0, s.ground, s.W, 3, "#9a968c");
    p.rect(0, s.ground + 3, s.W, s.H - s.ground - 3, day ? "#5a5a62" : "#22222c");
    for (let y = s.ground + 5; y < s.H; y += 3)
      for (let xx = (y % 2) * 2; xx < s.W; xx += 4) p.px(xx, y, day ? "#6a6a74" : "#2c2c38");
    // entrée de métro à rambarde verte
    const mx = Math.floor(s.W * 0.3);
    p.rect(mx, s.ground - 9, 20, 2, "#2a6a3a");
    p.rect(mx, s.ground - 9, 1, 9, "#2a6a3a");
    p.rect(mx + 19, s.ground - 9, 1, 9, "#2a6a3a");
    for (let k = mx + 2; k < mx + 19; k += 3) p.rect(k, s.ground - 6, 1, 6, "#2a6a3a");
    p.rect(mx + 9, s.ground - 18, 2, 9, "#2a6a3a");
    p.text("METRO", mx - 1, s.ground - 25, "#e8c020");
  },
  live(p, s, t) {
    // la tour scintille la nuit, quelques secondes par minute
    if (!s.tone.light && (t % 20) < 5) {
      const ex = Math.floor(s.W * 0.78), eh = Math.floor(s.ground * 0.95);
      for (let i = 0; i < 18; i++) {
        const k = Math.floor(hash(i + Math.floor(t * 8) * 31) * eh);
        const half = Math.max(1, Math.round(((eh - k) / eh) ** 2.2 * 16));
        p.px(ex + Math.floor((hash(i * 3 + Math.floor(t * 8)) * 2 - 1) * half), s.ground - k, "#ffffff");
      }
    }
    // réverbères
    for (let x = 18; x < s.W; x += 52) {
      p.rect(x, s.ground - 16, 1, 16, OUT);
      p.rect(x - 1, s.ground - 19, 3, 3, s.tone.light ? "#30303a" : "#ffe890");
      if (!s.tone.light) p.dither(x - 4, s.ground - 20, 9, 8, "rgba(0,0,0,0)", "#ffe890", 2 + (Math.floor(t * 2 + x) % 2));
    }
  },
};

/* ---------- LAB : laboratoire high-tech, tubes et consoles ---------- */

const lab: SceneDef = {
  groundRatio: 0.78,
  indoor: true,
  still(p, s) {
    const wall = "#1a2a3a", panel = "#22364a", rivet = "#5a7a9a";
    p.rect(0, 0, s.W, s.H, wall);
    for (let y = 0; y < s.ground; y += 16)
      for (let x = (y / 16) % 2 ? -12 : 0; x < s.W; x += 24) {
        p.rect(x + 1, y + 1, 22, 14, panel);
        p.rect(x + 1, y + 1, 22, 1, shade(panel, 0.25));
        p.px(x + 3, y + 3, rivet);
        p.px(x + 21, y + 3, rivet);
        p.px(x + 3, y + 13, rivet);
        p.px(x + 21, y + 13, rivet);
      }
    // sol en caillebotis
    p.rect(0, s.ground, s.W, s.H - s.ground, "#2a3038");
    for (let y = s.ground; y < s.H; y += 3) p.rect(0, y, s.W, 1, "#1a1e26");
    for (let x = 0; x < s.W; x += 3) p.rect(x, s.ground, 1, s.H - s.ground, "#1a1e26");
    p.rect(0, s.ground, s.W, 2, "#e8c020");
    for (let x = 0; x < s.W; x += 8) p.rect(x, s.ground, 4, 2, OUT);
    // consoles
    const cw = 30;
    for (let x = Math.floor(s.W * 0.06); x + cw < s.W; x += Math.floor(s.W * 0.36)) {
      p.rect(x, s.ground - 22, cw, 22, "#3a4a5a");
      p.rect(x, s.ground - 22, cw, 1, "#7a8a9a");
      p.rect(x + 3, s.ground - 19, cw - 6, 10, "#031208");
      for (let k = 0; k < 5; k++) p.rect(x + 4 + k * 5, s.ground - 6, 3, 2, ["#e02a2a", "#2ad45a", "#e8c020", "#3aa8ff", "#e02a2a"][k]!);
    }
  },
  live(p, s, t) {
    // tubes à essai géants avec bulles
    const tubes = [0.24, 0.5, 0.76].map((f) => Math.floor(s.W * f));
    tubes.forEach((tx, i) => {
      const th = Math.floor(s.ground * 0.62), top = s.ground - 6 - th;
      const liquid = s.colors[i % s.colors.length] ?? s.accent;
      p.rect(tx - 9, top - 4, 18, 4, "#5a6a7a");
      p.rect(tx - 9, s.ground - 6, 18, 6, "#5a6a7a");
      p.rect(tx - 8, top, 16, th, "#9ad0e8");
      p.rect(tx - 7, top + 4, 14, th - 4, shade(liquid, -0.1));
      p.rect(tx - 6, top + 4, 2, th - 4, shade(liquid, 0.4));
      p.rect(tx - 7, top + 4 + Math.round(Math.sin(t * 2 + i) * 1), 14, 1, shade(liquid, 0.6));
      for (let b = 0; b < 6; b++) {
        const u = (t * (0.3 + hash(b + i * 9) * 0.3) + hash(b * 7 + i)) % 1;
        p.disc(tx - 4 + hash(b * 3 + i) * 8, s.ground - 8 - u * (th - 8), u > 0.7 ? 1 : 0.6, "#ffffff");
      }
    });
    // écrans des consoles
    const cw = 30;
    for (let x = Math.floor(s.W * 0.06), k = 0; x + cw < s.W; x += Math.floor(s.W * 0.36), k++) {
      for (let row = 0; row < 3; row++) {
        const len = 4 + Math.floor(hash(row + k * 5 + Math.floor(t * 3)) * (cw - 12));
        p.rect(x + 5, s.ground - 17 + row * 3, len, 1, "#3af06a");
      }
      if (Math.floor(t * 2 + k) % 2) p.px(x + 4, s.ground - 6, "#ffffff");
    }
  },
};

/* ---------- SPACE : base lunaire, planète, antenne ---------- */

const space: SceneDef = {
  groundRatio: 0.74,
  indoor: true, // ciel propre : pas de météo terrestre
  still(p, s) {
    p.rect(0, 0, s.W, s.H, "#02020a");
    const r = rng(s.seed + 1);
    for (let i = 0; i < (s.W * s.H) / 40; i++) p.px(Math.floor(r() * s.W), Math.floor(r() * s.ground), r() < 0.15 ? "#ffffff" : "#5a5a8a");
    // planète rayée
    const px = Math.floor(s.W * 0.75), py = Math.floor(s.ground * 0.32), R = Math.max(16, Math.floor(s.H * 0.2));
    p.disc(px, py, R, "#1a4ab0");
    for (let y = -R; y <= R; y += 4) {
      const half = Math.floor(Math.sqrt(R * R - y * y));
      if (Math.floor((y + R) / 4) % 3 === 0) p.rect(px - half, py + y, half * 2, 2, "#3ab45a");
    }
    p.disc(px + 4, py - 4, R - 2, "rgba(255,255,255,0)");
    for (let y = -R; y <= R; y++) {
      const half = Math.floor(Math.sqrt(R * R - y * y));
      p.rect(px + Math.floor(half * 0.4), py + y, Math.ceil(half * 0.6), 1, "rgba(0,0,20,0.45)");
    }
    // sol lunaire et cratères
    for (let x = 0; x < s.W; x++) {
      const y = s.ground + Math.round(Math.sin(x / 17) * 2 + Math.sin(x / 5) * 0.8);
      p.rect(x, y, 1, s.H - y, "#8a8a96");
      p.px(x, y, "#c8c8d4");
    }
    for (let i = 0; i < 7; i++) {
      const cx = Math.floor(r() * s.W), cy = s.ground + 4 + Math.floor(r() * (s.H - s.ground - 6)), cr = 2 + Math.floor(r() * 4);
      p.disc(cx, cy, cr, "#6a6a76");
      p.rect(cx - cr + 1, cy - 1, cr * 2 - 2, 1, "#4a4a56");
    }
    // dôme de la base
    const dx = Math.floor(s.W * 0.28), dr = Math.max(14, Math.floor(s.H * 0.12));
    for (let y = -dr; y <= 0; y++) {
      const half = Math.floor(Math.sqrt(dr * dr - y * y));
      p.rect(dx - half, s.ground + y, half * 2, 1, "#c8d4e8");
    }
    for (let k = -dr + 3; k < dr - 2; k += 5) p.rect(dx + k, s.ground - 4, 3, 2, s.accent);
    p.rect(dx - dr - 8, s.ground - 6, 10, 6, "#9aa4b8");
    p.rect(dx + dr - 2, s.ground - 5, 12, 5, "#9aa4b8");
  },
  live(p, s, t) {
    // antenne parabolique qui pivote
    const ax = Math.floor(s.W * 0.52), ay = s.ground - 2;
    p.rect(ax, ay - 10, 1, 10, "#c8d4e8");
    const frame = Math.floor(t * 1.2) % 4;
    const w = [10, 7, 4, 7][frame]!;
    p.rect(ax - Math.floor(w / 2), ay - 14, w, 2, "#e8eef8");
    p.rect(ax - Math.floor(w / 2) + 1, ay - 12, Math.max(1, w - 2), 1, "#9aa4b8");
    if (Math.floor(t * 3) % 2) p.px(ax, ay - 17, "#ff3a3a");
    // étoiles qui scintillent
    for (let i = 0; i < 20; i++) {
      if (hash(i + Math.floor(t * 2.5)) > 0.6) continue;
      p.px(Math.floor(hash(i * 41 + s.seed) * s.W), Math.floor(hash(i * 17) * s.ground * 0.9), "#ffffff");
    }
    // rover
    const rx = ((t * 6) % (s.W + 30)) - 15;
    p.rect(rx, s.ground + 3, 12, 4, "#d8d8e4");
    p.rect(rx + 2, s.ground + 1, 4, 2, s.accent);
    p.disc(rx + 2, s.ground + 8, 1.5, "#30303a");
    p.disc(rx + 10, s.ground + 8, 1.5, "#30303a");
  },
};

export const SCENES_NES: Record<string, SceneDef> = { plains, rooftops, underground, jungle, paris, lab, space };
