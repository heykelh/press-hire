import type { TitleScreenProps } from "@/components/TitleScreen";

/**
 * Exemples d'écrans titre pour la galerie : entreprises fictives,
 * un habillage et un décor différents à chaque fois.
 */
export type Preset = Omit<TitleScreenProps, "lang" | "languages" | "onLang" | "onStart" | "mode"> & { company: string; note: string };

export const PRESETS: Preset[] = [
  {
    company: "Compagnie aérienne",
    note: "famicom · aéroport · coucher de soleil",
    title: { fr: "FUEL FIGHTER", en: "FUEL FIGHTER" },
    tagline: { fr: "Chaque kilo compte.", en: "Every kilo counts." },
    skin: "famicom",
    palette: { bg: "#140c34", ink: "#ffffff", accent: "#1b9fe0", colors: ["#1b9fe0", "#e8403c", "#ffb612"] },
    scene: {
      scene: "airport", time: "sunset", weather: "clear", seed: "fuel",
      actors: [{ type: "plane_takeoff", speed: 1, lane: 0 }, { type: "plane_taxi", speed: 0.6, lane: 2 }, { type: "clouds", speed: 0.4, lane: 0 }],
      colors: ["#1b9fe0", "#e8403c", "#ffb612"], accent: "#1b9fe0", detail: { label: "VOL", value: "8BIT 001" },
    },
    animation: "drop", shine: true, badge: "ÉDITION DATA",
  },
  {
    company: "Banque d'investissement",
    note: "terminal · salle des marchés · nuit",
    title: { fr: "MARGIN CALL", en: "MARGIN CALL" },
    tagline: { fr: "Le risque ne dort jamais.", en: "Risk never sleeps." },
    skin: "terminal",
    palette: { bg: "#020a04", ink: "#9effb0", accent: "#33d65a", colors: ["#33d65a"] },
    scene: {
      scene: "trading_floor", time: "night", weather: "clear", seed: "margin",
      actors: [{ type: "ticker", speed: 1, lane: 2 }, { type: "drone", speed: 0.6, lane: 1 }],
      colors: ["#2a7ac8", "#c8a020"], accent: "#3ad46a", detail: { label: "VAR", value: "VAR 99%" },
    },
    animation: "glitch", shine: false,
  },
  {
    company: "Cloud & IA",
    note: "synth · data center · nuit",
    title: { fr: "UPTIME HEROES", en: "UPTIME HEROES" },
    tagline: { fr: "Zéro panne. Zéro excuse.", en: "Zero downtime. Zero excuses." },
    skin: "synth",
    palette: { bg: "#08001a", ink: "#ffffff", accent: "#ff3cd0", colors: ["#ff3cd0", "#3ad0ff"] },
    scene: {
      scene: "data_center", time: "night", weather: "clear", seed: "uptime",
      actors: [{ type: "server_lights", speed: 1, lane: 1 }, { type: "drone", speed: 0.8, lane: 1 }],
      colors: ["#ff3cd0", "#3ad0ff"], accent: "#ff3cd0", detail: { label: "SLA", value: "SLA 99.99" },
    },
    animation: "zoom", shine: true,
  },
  {
    company: "Armateur",
    note: "comic · port · aube",
    title: { fr: "CONTAINER CHAOS", en: "CONTAINER CHAOS" },
    tagline: { fr: "10 000 boîtes. 1 seul tableur.", en: "10,000 boxes. One spreadsheet." },
    skin: "comic",
    palette: { bg: "#1c1840", ink: "#000000", accent: "#e8b020", colors: ["#2a5ab8", "#e8403c", "#e8b020", "#3a9a5a"] },
    scene: {
      scene: "port", time: "dawn", weather: "clear", seed: "container",
      actors: [{ type: "ship", speed: 1, lane: 1 }, { type: "birds", speed: 1, lane: 0 }, { type: "clouds", speed: 0.3, lane: 0 }],
      colors: ["#2a5ab8", "#e8403c", "#e8b020", "#3a9a5a"], accent: "#e8b020",
    },
    animation: "wave", shine: false,
  },
  {
    company: "Industrie",
    note: "game boy · usine · jour",
    title: { fr: "LINE 404", en: "LINE 404" },
    tagline: { fr: "Ligne de prod introuvable.", en: "Production line not found." },
    skin: "gameboy",
    palette: { bg: "#9bbc0f", ink: "#0f380f", accent: "#306230", colors: ["#306230"] },
    scene: {
      scene: "factory", time: "day", weather: "clear", seed: "line404",
      actors: [{ type: "truck", speed: 0.8, lane: 2 }, { type: "clouds", speed: 0.5, lane: 0 }, { type: "birds", speed: 0.8, lane: 0 }],
      colors: ["#c84a2a", "#2a7ac8", "#e8b020"], accent: "#e8a020",
    },
    animation: "drop", shine: false,
  },
  {
    company: "Groupe hospitalier",
    note: "corporate · hôpital · jour",
    title: { fr: "Patient Flow", en: "Patient Flow" },
    tagline: { fr: "Moins d'attente, plus de soins.", en: "Less waiting, more care." },
    skin: "corporate",
    palette: { bg: "#2058c0", ink: "#14213d", accent: "#0a8a7a", colors: ["#0a8a7a"] },
    scene: {
      scene: "hospital", time: "day", weather: "clear", seed: "patient",
      actors: [{ type: "ambulance", speed: 0.8, lane: 2 }, { type: "clouds", speed: 0.4, lane: 0 }],
      colors: ["#0a8a7a", "#2a7ac8"], accent: "#0a8a7a",
    },
    animation: "zoom", shine: false,
  },
  {
    company: "Siège d'un grand groupe",
    note: "arcade · siège social · coucher de soleil",
    title: { fr: "KPI QUEST", en: "KPI QUEST" },
    tagline: { fr: "Monte au 42e étage.", en: "Reach the 42nd floor." },
    skin: "arcade",
    palette: { bg: "#140c34", ink: "#ffffff", accent: "#7a3cff", colors: ["#ff5a5a", "#ffb612", "#3ad46a", "#3ab4ff", "#c87aff"] },
    scene: {
      scene: "headquarters", time: "sunset", weather: "clear", seed: "kpi",
      actors: [{ type: "crowd", speed: 1, lane: 2 }, { type: "drone", speed: 0.7, lane: 1 }, { type: "clouds", speed: 0.3, lane: 0 }],
      colors: ["#ff5a5a", "#ffb612", "#3ab4ff"], accent: "#7a3cff",
    },
    animation: "wave", shine: true,
  },
  {
    company: "Logistique",
    note: "famicom · entrepôt · nuit, pluie",
    title: { fr: "LAST MILE", en: "LAST MILE" },
    tagline: { fr: "Livré avant la pluie. Presque.", en: "Delivered before the rain. Almost." },
    skin: "famicom",
    palette: { bg: "#03040c", ink: "#ffffff", accent: "#f0a020", colors: ["#f0a020", "#2a7ac8", "#d84a2a"] },
    scene: {
      scene: "warehouse", time: "night", weather: "rain", seed: "lastmile",
      actors: [{ type: "truck", speed: 1.2, lane: 2 }, { type: "crane", speed: 1, lane: 1 }],
      colors: ["#f0a020", "#2a7ac8", "#d84a2a"], accent: "#f0a020",
    },
    animation: "zoom", shine: true, badge: "NIGHT SHIFT",
  },
];
