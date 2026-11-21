/**
 * PRESS HIRE — format de cartouche v0.2
 *
 * Une cartouche décrit un jeu entier en données. Le moteur l'exécute ;
 * l'agent la produit. Elle ne contient jamais de code.
 */
import { z } from "zod";

export const SCHEMA_VERSION = "0.2" as const;

/* ---------- briques communes ---------- */

export const Lang = z.enum(["fr", "en"]);
export type Lang = z.infer<typeof Lang>;

/** Texte bilingue : FR et EN obligatoires partout. */
export const I18n = z.object({
  fr: z.string().min(1),
  en: z.string().min(1),
});
export type I18n = z.infer<typeof I18n>;

const Id = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,39}$/, "identifiant attendu : minuscules, chiffres, _ (2 à 40 caractères)");

const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "couleur attendue au format #rrggbb");

const Url = z.string().min(1); // les emplacements <...> sont tolérés ici, le lint strict les refuse

/* ---------- état du jeu ---------- */

/** Une variable que les mécaniques modifient (budget, satisfaction, risque, stock…). */
export const StateVar = z.object({
  id: Id,
  label: I18n,
  start: z.number(),
  min: z.number(),
  max: z.number(),
  unit: z.string().max(8).optional(),
  display: z.enum(["bar", "counter", "hidden"]).default("counter"),
});
export type StateVar = z.infer<typeof StateVar>;

/** Effet d'un choix, d'une case ou d'une réponse sur une variable. */
export const Effect = z.object({
  var: Id,
  op: z.enum(["add", "mul", "set"]),
  value: z.number(),
});
export type Effect = z.infer<typeof Effect>;

/** Condition sur une variable, pour gagner un niveau ou la partie. */
export const Condition = z.object({
  var: Id,
  op: z.enum([">=", "<=", ">", "<", "=="]),
  value: z.number(),
  /** total : valeur de la variable ; level : variation pendant le niveau en cours */
  scope: z.enum(["total", "level"]).default("total"),
});
export type Condition = z.infer<typeof Condition>;

/* ---------- mécaniques ---------- */

const WheelSegment = z.object({
  id: Id,
  code: z.string().min(1).max(5), // texte affiché sur la case, 5 caractères max
  label: I18n,
  color: Hex,
  weight: z.number().positive(), // probabilité relative
  effects: z.array(Effect).default([]),
});

export const WheelMechanic = z.object({
  type: z.literal("wheel"),
  /** random : le hasard décide (LAST SEAT) ; timing : le joueur arrête la roue (Spin the Stack). */
  stop: z.enum(["random", "timing"]),
  spins: z.number().int().min(1).max(12),
  segments: z.array(WheelSegment).min(4).max(16),
});

/** Courbe qui transforme la valeur du curseur x en variation d'une variable. */
export const Curve = z.discriminatedUnion("family", [
  // a * x + b
  z.object({ family: z.literal("linear"), a: z.number(), b: z.number().default(0) }),
  // x >= t ? above : below
  z.object({ family: z.literal("threshold"), t: z.number(), above: z.number(), below: z.number() }),
  // base * (x / ref) ^ (-e)   (demande qui baisse quand le prix monte)
  z.object({ family: z.literal("elasticity"), base: z.number(), ref: z.number().positive(), e: z.number() }),
  // max * (1 - exp(-k * x))   (rendement décroissant)
  z.object({ family: z.literal("diminishing"), max: z.number(), k: z.number().positive() }),
]);
export type Curve = z.infer<typeof Curve>;

export const SliderMechanic = z.object({
  type: z.literal("slider"),
  control: z.object({
    label: I18n,
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    start: z.number(),
    unit: z.string().max(8).optional(),
  }),
  rounds: z.number().int().min(1).max(12),
  /** À chaque manche, chaque sortie ajoute curve(x) à sa variable. */
  outputs: z.array(z.object({ var: Id, curve: Curve })).min(1).max(4),
  /** Aléa multiplicatif optionnel : 0.1 = ±10 % par manche (tiré avec la graine de la partie). */
  noise: z.number().min(0).max(0.5).default(0),
});

const TriageItem = z.object({
  id: Id,
  label: I18n,
  detail: I18n.optional(),
  correct: z.enum(["accept", "reject"]),
  why: I18n,
});

export const TriageMechanic = z.object({
  type: z.literal("triage"),
  rule: I18n, // la règle affichée au joueur
  items: z.array(TriageItem).min(4).max(20),
  onCorrect: z.array(Effect).default([]),
  onWrong: z.array(Effect).default([]),
  timeLimitSec: z.number().int().min(5).max(300).optional(),
});

const QuizQuestion = z.object({
  prompt: I18n,
  options: z.array(I18n).min(2).max(4),
  correctIndex: z.number().int().min(0).max(3),
  explain: I18n,
});

export const QuizMechanic = z.object({
  type: z.literal("quiz"),
  questions: z.array(QuizQuestion).min(1).max(10),
  onCorrect: z.array(Effect).default([]),
  onWrong: z.array(Effect).default([]),
});

/** Échange avec un personnage : à chaque réplique, le joueur choisit sa réponse. */
export const DialogueMechanic = z.object({
  type: z.literal("dialogue"),
  characterId: Id.optional(),
  nodes: z
    .array(
      z.object({
        text: I18n, // ce que dit le personnage
        choices: z
          .array(z.object({ text: I18n, reply: I18n, effects: z.array(Effect).default([]) }))
          .min(2)
          .max(3),
      }),
    )
    .min(1)
    .max(6),
});

export const Mechanic = z.discriminatedUnion("type", [
  WheelMechanic,
  SliderMechanic,
  TriageMechanic,
  QuizMechanic,
  DialogueMechanic,
]);
export type Mechanic = z.infer<typeof Mechanic>;
export type MechanicType = Mechanic["type"];

/* ---------- écran titre ---------- */

export const Scene = z.enum([
  "airport",
  "station",
  "trading_floor",
  "data_center",
  "hospital",
  "factory",
  "warehouse",
  "headquarters",
  "port",
  "store",
  // inspirés des grands jeux NES (techniques, pas éléments)
  "plains",
  "rooftops",
  "underground",
  "jungle",
  "paris",
  "lab",
  "space",
]);
export type Scene = z.infer<typeof Scene>;

export const Actor = z.enum([
  "plane_takeoff",
  "plane_taxi",
  "train",
  "truck",
  "crane",
  "ship",
  "server_lights",
  "ticker",
  "ambulance",
  "drone",
  "clouds",
  "birds",
  "crowd",
  "hero",
  "rocket",
  "satellite",
  "fireflies",
]);

export const TitleScreen = z.object({
  scene: Scene,
  time: z.enum(["dawn", "day", "sunset", "night"]),
  weather: z.enum(["clear", "rain", "snow", "fog"]).default("clear"),
  actors: z
    .array(
      z.object({
        type: Actor,
        speed: z.number().min(0.2).max(3).default(1),
        lane: z.number().int().min(0).max(2).default(1),
        color: Hex.optional(),
      }),
    )
    .min(2)
    .max(5),
  logo: z.object({
    animation: z.enum(["drop", "zoom", "glitch", "wave"]),
    shine: z.boolean().default(true),
  }),
  /** Détail tiré de l'offre ou des données, affiché dans le décor (panneau, écran, numéro de vol…). */
  detail: z.object({ label: I18n, value: z.string().max(24) }).optional(),
});

/* ---------- personnages et contenu satirique ---------- */

export const Character = z.object({
  id: Id,
  name: z.string().min(1).max(24),
  role: I18n,
  palette: z.object({ hair: Hex, skin: Hex, body: Hex, accent: Hex }),
  lines: z.array(I18n).default([]),
});
export type Character = z.infer<typeof Character>;

export const GameEvent = z.object({
  id: Id,
  text: I18n,
  effects: z.array(Effect).default([]),
  weight: z.number().positive().default(1),
});

/* ---------- progression ---------- */

export const Level = z.object({
  id: Id,
  order: z.number().int().min(1),
  requirementId: Id,
  title: I18n,
  intro: I18n, // une phrase, 80 caractères max (lint)
  mechanic: Mechanic,
  win: z.array(Condition).min(1),
  winLine: I18n,
  failJokes: z.array(I18n).min(1).max(6),
  hintAfterFails: z.number().int().min(1).max(5).default(2),
  hint: I18n.optional(),
  characterId: Id.optional(),
});
export type Level = z.infer<typeof Level>;

export const Boss = z.object({
  name: I18n,
  painPointId: Id,
  characterId: Id.optional(),
  hp: z.number().int().min(1).max(20),
  mechanic: z.discriminatedUnion("type", [QuizMechanic, WheelMechanic]),
  taunts: z.array(I18n).min(1).max(6),
  defeatLine: I18n,
});
export type Boss = z.infer<typeof Boss>;

/* ---------- cartouche ---------- */

export const Cartridge = z.object({
  meta: z.object({
    id: z.string().regex(/^[a-z0-9-]{3,80}$/),
    schemaVersion: z.literal(SCHEMA_VERSION),
    createdAt: z.string().datetime(),
    languages: z.array(Lang).min(1),
    defaultLang: Lang,
  }),
  target: z.object({
    company: z.object({ name: z.string().min(1), sector: z.string().min(1), website: Url.optional() }),
    job: z.object({
      title: z.string().min(1),
      url: Url.optional(),
      location: z.string().optional(),
      contract: z.string().optional(),
    }),
    /** Décideur ciblé : sert à l'envoi, jamais affiché dans le jeu. */
    contact: z.object({ name: z.string(), role: z.string().optional() }).optional(),
    sourcesConsulted: z
      .array(z.object({ label: z.string(), url: Url, usedFor: z.enum(["analysis", "data", "tone"]) }))
      .default([]),
  }),
  analysis: z.object({
    requirements: z
      .array(
        z.object({
          id: Id,
          label: I18n,
          kind: z.enum(["hard", "soft"]),
          priority: z.enum(["must", "nice"]),
          offerQuote: z.string().min(1),
        }),
      )
      .min(1),
    painPoints: z.array(z.object({ id: Id, label: I18n, source: z.enum(["offer", "news", "reviews"]) })).default([]),
    tone: z.object({
      formality: z.number().int().min(1).max(5),
      humorLevel: z.number().int().min(0).max(3),
      retroNes: z.boolean(),
      rationale: z.string(),
    }),
  }),
  candidate: z.object({
    name: z.string().min(1),
    headline: I18n,
    links: z.object({ cv: Url, portfolio: Url, linkedin: Url.optional(), email: z.string().min(1) }),
    proofs: z
      .array(
        z.object({
          id: Id,
          label: z.string().min(1),
          url: Url,
          requirementIds: z.array(Id).min(1),
          fact: I18n.optional(),
        }),
      )
      .default([]),
  }),
  design: z.object({
    /** habillage complet (police, logo, cadres, filtre d'image) : chaque jeu doit avoir sa propre identité */
    skin: z.enum(["arcade", "famicom", "gameboy", "terminal", "synth", "corporate", "comic"]).default("arcade"),
    title: I18n,
    tagline: I18n,
    palette: z.object({
      bg: Hex,
      panel: Hex,
      ink: Hex,
      accent: Hex,
      colors: z.array(Hex).min(3).max(8),
    }),
    music: z.object({
      preset: z.enum(["funky", "upbeat", "tense", "lofi", "none"]),
      bpm: z.number().int().min(60).max(200).optional(),
    }),
    juice: z.number().int().min(0).max(3).default(2),
    targetMinutes: z.number().min(1).max(15),
  }),
  titleScreen: TitleScreen,
  state: z.object({ vars: z.array(StateVar).min(1).max(8) }),
  characters: z.array(Character).max(6).default([]),
  events: z.array(GameEvent).max(20).default([]),
  data: z
    .array(
      z.object({
        id: Id,
        label: I18n,
        source: z.object({ name: z.string().min(1), url: Url, license: z.string().optional() }),
        asOf: z.string().min(1),
        rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).max(500),
      }),
    )
    .default([]),
  levels: z.array(Level).min(1).max(12),
  boss: Boss.optional(),
  easterEggs: z
    .array(
      z.object({
        trigger: z.enum(["konami", "title_tap_x5", "idle_30s", "perfect_run"]),
        effect: z.enum(["recruiter_mode", "secret_level", "dev_room", "joke"]),
        content: I18n,
      }),
    )
    .default([]),
  ending: z.object({
    headline: I18n,
    skillsUnlocked: z.array(z.object({ requirementId: Id, proofId: Id, line: I18n })).min(1),
    shareCard: z.object({ text: I18n, showScore: z.boolean().default(true) }),
    challenge: I18n.optional(),
    cta: z
      .array(z.object({ type: z.enum(["cv", "contact", "portfolio", "linkedin"]), label: I18n, url: Url }))
      .min(1),
  }),
  tracking: z.object({ enabled: z.boolean().default(true) }).default({ enabled: true }),
  review: z
    .object({
      status: z.enum(["draft", "approved", "live", "archived"]).default("draft"),
      notes: z.string().optional(),
    })
    .default({ status: "draft" }),
});

/** Cartouche telle qu'écrite (champs par défaut facultatifs). */
export type CartridgeInput = z.input<typeof Cartridge>;
/** Cartouche validée (champs par défaut remplis). */
export type Cartridge = z.output<typeof Cartridge>;
