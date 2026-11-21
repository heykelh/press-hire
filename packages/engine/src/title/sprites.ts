import type { Sprite } from "../pixel/painter";

/* Sprites dessinés à la main. Lettres = couleurs, « . » = transparent. */

export const PLANE: Sprite = {
  rows: [
    "......................TT..",
    ".....................TTT..",
    "..WWWWWWWWWWWWWWWWWWWTTTT.",
    ".WBWBWBWBWBWBWBWBWBWWWWWW.",
    "WWWWWWWWWWWWWWWWWWWWWWWWWW",
    ".GGGGGGGGGGGGGGGGGGGGGGGG.",
    "........AAAAAAAA..........",
    ".........L......L.........",
  ],
  colors: { W: "#f4f4f8", B: "#3a5a9a", G: "#a8acc0", T: "#e8403c", A: "#c8ccd8", L: "#30303a" },
};

export const PLANE_UP: Sprite = {
  rows: [
    "......................TT",
    ".....................TTT",
    "...................WWWWT",
    "...............WWWWBWWW.",
    "...........WWWWBWBWWW...",
    ".......WWWWBWBWWWGG.....",
    "...WWWWBWBWWWGGAA.......",
    ".WWWWWWWWGGG.AA.........",
    "WWWGGGG.................",
  ],
  colors: PLANE.colors,
};

export const TRUCK: Sprite = {
  rows: [
    "CCCCCCCCCCCCCCCCC.....",
    "CCCCCCCCCCCCCCCCC.KKK.",
    "CCCCCCCCCCCCCCCCC.KWWK",
    "CCCCCCCCCCCCCCCCC.KKKKK",
    "CCCCCCCCCCCCCCCCC.KKKKK",
    "DDDDDDDDDDDDDDDDDDDDDDD",
    "..OO......OO.....OO....",
  ],
  colors: { C: "#d84a2a", D: "#30303a", K: "#e8e8f0", W: "#5ab4f4", O: "#101018" },
};

export const AMBULANCE: Sprite = {
  rows: [
    ".......RB..........",
    "WWWWWWWWWWWWW......",
    "WWWWWRWWWWWWWWKK...",
    "WWWWRRRWWWWWWWKWWK.",
    "WWWWWRWWWWWWWWKKKKK",
    "WWWWWWWWWWWWWWWWWWW",
    "SSSSSSSSSSSSSSSSSSS",
    "..OO.........OO....",
  ],
  colors: { W: "#f4f4f8", R: "#e02a2a", B: "#2a6ae0", K: "#4a5a7a", S: "#e02a2a", O: "#101018" },
};

export const BIRD_A: Sprite = { rows: ["K...K", ".K.K.", "..K.."], colors: { K: "#1a1a24" } };
export const BIRD_B: Sprite = { rows: [".....", "KK.KK", "..K.."], colors: { K: "#1a1a24" } };

export const DRONE: Sprite = {
  rows: ["SSS...SSS", ".K.....K.", ".KKKKKKK.", "...KLK...", "....K...."],
  colors: { S: "#c8ccd8", K: "#30303a", L: "#ff3a3a" },
};

export const PERSON: Sprite = {
  rows: [".H.", ".F.", "BBB", "BBB", ".L."],
  colors: { H: "#2a1a10", F: "#f0c098", B: "#3a6ad8", L: "#20202a" },
};

export const HELI: Sprite = {
  rows: [
    "...........RRRRRRRRRRR.",
    "................K......",
    "T.........WWWWWWWWW....",
    "TTTTTTTTTWWWWWBBBBWW...",
    "T........WWWWWWWWWWW...",
    "...........K.....K.....",
    "........KKKKKKKKKKKK...",
  ],
  colors: { R: "#30303a", K: "#30303a", T: "#e02a2a", W: "#f4f4f8", B: "#5ab4f4" },
};

export const SHIP_HULL: Sprite = {
  rows: [
    "..........................WWWW..",
    "..........................WBBW..",
    "..........................WWWW..",
    "HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH",
    ".HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH.",
    "..RRRRRRRRRRRRRRRRRRRRRRRRRRRR..",
  ],
  colors: { W: "#f4f4f8", B: "#3a5a9a", H: "#2a2e48", R: "#b02a2a" },
};
