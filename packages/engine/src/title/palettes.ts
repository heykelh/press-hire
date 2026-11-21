export type TimeOfDay = "dawn" | "day" | "sunset" | "night";

/** Dégradés de ciel (du haut vers l'horizon), rendus en bandes tramées. */
export const SKY: Record<TimeOfDay, string[]> = {
  dawn: ["#1c1840", "#3a2a64", "#7a3c78", "#c8607a", "#f09a84", "#f8d0a8"],
  day: ["#2058c0", "#3474d8", "#5894ec", "#84b8f4", "#b8dcfc"],
  sunset: ["#140c34", "#3c1458", "#8a1f5e", "#d23c4c", "#f4762e", "#fcb43c", "#fce07a"],
  night: ["#03040c", "#070a20", "#0d1434", "#141e48", "#1c2a5a"],
};

/** Teintes des éléments du décor selon l'heure. */
export interface Tone {
  far: string; // collines et silhouettes lointaines
  mid: string; // bâtiments en second plan
  bld: string; // bâtiments principaux
  bldHi: string; // arêtes éclairées
  bldLo: string; // ombres
  win: string; // fenêtre allumée
  winOff: string; // fenêtre éteinte
  ground: string;
  groundHi: string;
  road: string;
  mark: string; // marquages au sol
  water: string;
  waterHi: string;
  light: boolean; // jour : fenêtres en reflets plutôt qu'allumées
}

export const TONE: Record<TimeOfDay, Tone> = {
  dawn: {
    far: "#4c3466", mid: "#3a2a58", bld: "#2e2448", bldHi: "#5a4478", bldLo: "#1e1832", win: "#ffc878", winOff: "#231c3a",
    ground: "#241c34", groundHi: "#3c2e50", road: "#2c2640", mark: "#d8c8b0", water: "#3a3070", waterHi: "#c890a8", light: false,
  },
  day: {
    far: "#6c9cd0", mid: "#5a7cac", bld: "#46608c", bldHi: "#8cacd4", bldLo: "#2e4468", win: "#d8f0ff", winOff: "#3a5480",
    ground: "#3c6a34", groundHi: "#5c8c40", road: "#5a5e6a", mark: "#f4f4e8", water: "#2870c8", waterHi: "#a8dcff", light: true,
  },
  sunset: {
    far: "#5a1c50", mid: "#3e1844", bld: "#2a1234", bldHi: "#a8405a", bldLo: "#180a22", win: "#ffb048", winOff: "#24102e",
    ground: "#1c0c22", groundHi: "#3a1a38", road: "#2a1630", mark: "#f8c878", water: "#4a1c5c", waterHi: "#f8a050", light: false,
  },
  night: {
    far: "#10163a", mid: "#141c48", bld: "#1a2456", bldHi: "#2e3c7a", bldLo: "#0c1030", win: "#ffd860", winOff: "#121a44",
    ground: "#0a0c1e", groundHi: "#181c38", road: "#14162c", mark: "#c8c8d8", water: "#0c1440", waterHi: "#4a6ac8", light: false,
  },
};
