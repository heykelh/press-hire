/**
 * PRESS HIRE — format de cartouche v0.2
 *
 * Une cartouche décrit un jeu entier en données. Le moteur l'exécute ;
 * l'agent la produit. Elle ne contient jamais de code.
 */
import { z } from "zod";

export const SCHEMA_VERSION = "0.4" as const;
/** versions encore lues (les jeux déjà publiés restent jouables) */
export const SUPPORTED_VERSIONS = ["0.2", "0.3", "0.4", "0.5"] as const;

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
  conceptId: Id.optional(), // notion du métier expliquée à la première apparition
  twist: z.boolean().default(false), // n'apparaît qu'après le rebondissement du niveau
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
  conceptId: Id.optional(),
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

/* ---------- mécaniques d'arcade (v0.3) ---------- */

/** Petites icônes pixel dessinées par le moteur. */
export const ICONS = [
  "file", "bug", "coin", "star", "bomb", "mail", "chart", "shield", "fire", "box",
  "cloud", "key", "warning", "heart", "ticket", "server", "cart", "clock", "drop", "bolt",
] as const;
export const Icon = z.enum(ICONS);

/** Objet d'une mécanique d'arcade : « good » = à attraper / à frapper, « bad » = à éviter. */
const ArcadeItem = z.object({
  id: Id,
  label: I18n, // court : affiché sur l'objet (14 caractères conseillés)
  kind: z.enum(["good", "bad"]),
  icon: Icon.default("box"),
  weight: z.number().positive().default(1),
  conceptId: Id.optional(),
  /** ce qui se passerait dans la vraie vie en cas d'erreur sur cet objet (affiché au joueur) */
  consequence: I18n.optional(),
  /** n'apparaît qu'après le rebondissement du niveau */
  twist: z.boolean().default(false),
});

/** Attrape-tout (façon Kaboom!) : des objets tombent, on déplace le panier. Métriques : précision, rappel. */
export const CatchMechanic = z.object({
  type: z.literal("catch"),
  catcher: I18n, // ce que représente le panier (« ton pipeline », « le filtre anti-spam »…)
  durationSec: z.number().int().min(15).max(60).default(30),
  perSec: z.number().min(0.5).max(3).default(1.2),
  items: z.array(ArcadeItem).min(2).max(8),
  onGood: z.array(Effect).default([]), // un bon objet attrapé
  onBad: z.array(Effect).default([]), // un mauvais objet attrapé
  onMiss: z.array(Effect).default([]), // un bon objet raté
});

/** Tape-taupe : des incidents sortent des trous, il faut les frapper avant qu'ils repartent. Métriques : SLA, MTTR. */
export const WhackMechanic = z.object({
  type: z.literal("whack"),
  durationSec: z.number().int().min(15).max(60).default(30),
  holes: z.number().int().min(4).max(9).default(9),
  perSec: z.number().min(0.5).max(2.5).default(1),
  upMs: z.number().int().min(600).max(3000).default(1400), // temps de présence d'une cible
  targets: z.array(ArcadeItem).min(2).max(8), // good = à frapper, bad = à épargner
  onHit: z.array(Effect).default([]),
  onWrong: z.array(Effect).default([]),
  onMiss: z.array(Effect).default([]),
});

/** Jauge de puissance (façon golf ou baseball 8-bit) : l'aiguille va et vient, on l'arrête dans la bonne zone. */
export const GaugeMechanic = z.object({
  type: z.literal("gauge"),
  label: I18n, // ce que l'on dose (« taux d'échantillonnage », « budget cloud »…)
  rounds: z.number().int().min(1).max(8).default(3),
  speed: z.number().min(0.5).max(2.5).default(1), // allers-retours par seconde
  zones: z
    .array(
      z.object({
        id: Id,
        from: z.number().min(0).max(100),
        to: z.number().min(0).max(100),
        label: I18n,
        color: Hex,
        effects: z.array(Effect).default([]),
      }),
    )
    .min(2)
    .max(7),
});

/** Mémoire (façon Simon) : la machine joue une séquence, on la répète. Elle s'allonge à chaque manche. */
export const SequenceMechanic = z.object({
  type: z.literal("sequence"),
  theme: I18n, // ce que représente la séquence (« ordre de déploiement », « étapes du RGPD »…)
  pads: z
    .array(z.object({ id: Id, label: I18n, color: Hex }))
    .min(3)
    .max(6),
  rounds: z.number().int().min(2).max(8).default(4), // longueur de départ 3, +1 par manche
  speedMs: z.number().int().min(350).max(1200).default(650),
  onSuccess: z.array(Effect).default([]),
  onFail: z.array(Effect).default([]),
});

/* ---------- mécaniques d'observation (v0.4) ---------- */

/** Inspection (façon Papers, Please) : un règlement, des documents ; on tamponne, et on désigne le champ fautif. */
export const InspectionMechanic = z.object({
  type: z.literal("inspection"),
  document: I18n, // le type de document inspecté (« demande d'accès », « facture fournisseur »)
  rules: z.array(I18n).min(1).max(6), // le règlement affiché à côté du document
  cases: z
    .array(
      z.object({
        id: Id,
        title: I18n,
        fields: z
          .array(z.object({ label: I18n, value: z.string().min(1).max(80), faulty: z.boolean().default(false) }))
          .min(2)
          .max(8),
        correct: z.enum(["accept", "reject"]),
        why: I18n,
        conceptId: Id.optional(),
        twist: z.boolean().default(false),
      }),
    )
    .min(3)
    .max(12),
  onCorrect: z.array(Effect).default([]),
  onWrong: z.array(Effect).default([]),
  onSpotted: z.array(Effect).default([]), // bonus : champ fautif désigné sur un rejet
  timeLimitSec: z.number().int().min(20).max(300).optional(),
});

const InvestigationView = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("table"),
    columns: z.array(z.string().min(1).max(24)).min(2).max(6),
    rows: z.array(z.array(z.string().max(40))).min(3).max(12),
  }),
  z.object({ kind: z.literal("logs"), lines: z.array(z.string().min(1).max(120)).min(3).max(14) }),
  z.object({
    kind: z.literal("chart"),
    unit: z.string().max(12).optional(),
    labels: z.array(z.string().min(1).max(10)).min(4).max(16),
    values: z.array(z.number()).min(4).max(16),
  }),
]);

/** Enquête (façon Où est Charlie) : une table, des logs ou un graphique ; une anomalie à trouver. */
export const InvestigationMechanic = z.object({
  type: z.literal("investigation"),
  rounds: z
    .array(
      z.object({
        id: Id,
        prompt: I18n,
        view: InvestigationView,
        answer: z.number().int().min(0), // index de la ligne ou du point anormal
        explain: I18n,
        conceptId: Id.optional(),
      }),
    )
    .min(1)
    .max(6),
  onFound: z.array(Effect).default([]),
  onWrong: z.array(Effect).default([]),
  timeLimitSec: z.number().int().min(5).max(90).optional(), // par manche
});

export const Mechanic = z.discriminatedUnion("type", [
  WheelMechanic,
  SliderMechanic,
  TriageMechanic,
  QuizMechanic,
  DialogueMechanic,
  CatchMechanic,
  WhackMechanic,
  GaugeMechanic,
  SequenceMechanic,
  InspectionMechanic,
  InvestigationMechanic,
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

export const LevelEntry = z.enum(["briefing", "ambush", "call"]);
/**
 * turbo : tout va plus vite ; fog : brouillard sur le haut de l'écran ; mirror : commandes inversées (attrape-tout) ;
 * quake : l'écran tremble par moments ; blackout : la lumière saute par moments.
 */
export const Modifier = z.enum(["turbo", "fog", "mirror", "quake", "blackout"]);
export type Modifier = z.infer<typeof Modifier>;

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
  /** conseil propre à ce niveau, affiché dans la fiche « comment jouer » */
  howTo: I18n.optional(),
  /** moment de la semaine (« LUNDI 9H00 ») : les niveaux racontent une semaine type */
  day: I18n.optional(),
  /** notions du métier apprises dans ce niveau (cartes à collectionner) */
  teaches: z.array(Id).max(4).default([]),
  /** rebondissement à mi-niveau : nouvelle règle annoncée, objets « twist » qui arrivent */
  twist: z.object({ text: I18n }).optional(),
  /** réaction d'un personnage après la victoire */
  outro: z.object({ characterId: Id.optional(), text: I18n }).optional(),
  /**
   * Façon d'entrer dans le niveau : briefing (écran d'explication), ambush (pas d'écran : ça démarre
   * avec une alerte), call (un personnage appelle, le téléphone sonne).
   */
  entry: LevelEntry.default("briefing"),
  /** modificateurs façon NES qui changent la sensation de jeu (2 au plus) */
  modifiers: z.array(Modifier).max(2).default([]),
});
export type Level = z.infer<typeof Level>;

/** Notion du métier, gagnée comme une carte à collectionner. */
export const Concept = z.object({
  id: Id,
  term: I18n, // 28 caractères conseillés
  definition: I18n, // 160 caractères conseillés, pour un débutant complet
  example: I18n.optional(),
  icon: Icon.default("star"),
});
export type Concept = z.infer<typeof Concept>;

/** Phase d'un boss à plusieurs formes : n'importe quelle mécanique, avec sa propre condition de victoire. */
export const BossPhase = z.object({
  /** ce que fait le boss dans cette phase (« Il lance 300 tickets à la fois ! ») */
  intro: I18n,
  mechanic: Mechanic,
  win: z.array(Condition).min(1),
  /** réplique quand le joueur rate la phase */
  taunt: I18n.optional(),
  modifiers: z.array(Modifier).max(2).default([]),
});
export type BossPhase = z.infer<typeof BossPhase>;

export const Boss = z
  .object({
    name: I18n,
    /** archétype (hydre, négociateur, saboteur…) */
    archetype: z.string().max(30).optional(),
    painPointId: Id,
    characterId: Id.optional(),
    hp: z.number().int().min(1).max(20),
    /** boss classique (une seule mécanique, un coup par bonne action) */
    mechanic: z.discriminatedUnion("type", [QuizMechanic, WheelMechanic, GaugeMechanic]).optional(),
    /** boss à plusieurs formes : 2 ou 3 phases, chacune une mécanique différente (chaque phase gagnée = un coup) */
    phases: z.array(BossPhase).min(2).max(3).optional(),
    taunts: z.array(I18n).min(1).max(6),
    defeatLine: I18n,
  })
  .refine((b) => !!b.mechanic || !!b.phases, { message: "le boss a besoin d'une mécanique ou de phases", path: ["phases"] });
export type Boss = z.infer<typeof Boss>;

/* ---------- cartouche ---------- */

export const Cartridge = z.object({
  meta: z.object({
    id: z.string().regex(/^[a-z0-9-]{3,80}$/),
    schemaVersion: z.enum(SUPPORTED_VERSIONS),
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
  }).optional(), // ancien format : profil du candidat (plus généré depuis la v0.3)
  design: z.object({
    /** habillage complet (police, logo, cadres, filtre d'image) : chaque jeu doit avoir sa propre identité */
    skin: z.enum(["arcade", "famicom", "gameboy", "terminal", "synth", "corporate", "comic"]).default("arcade"),
    /** format narratif du jeu (semaine, nuit-blanche, braquage, tournoi…) : sert aussi à varier d'un jeu à l'autre */
    format: z.string().max(30).optional(),
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
    /** grades gagnés avec les étoiles, du débutant au confirmé (vrais titres du métier) */
    ranks: z.array(I18n).length(4).optional(),
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
  /** histoire : scène d'ouverture et conclusion */
  story: z
    .object({
      coldOpen: z.object({
        time: I18n.optional(), // « LUNDI, 8H57 »
        characterId: Id.optional(),
        lines: z.array(I18n).min(1).max(4),
      }),
      epilogue: I18n.optional(),
    })
    .optional(),
  /** notions du métier à collectionner */
  concepts: z.array(Concept).max(14).default([]),
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
    /** missions du poste jouées pendant la partie (proofId : ancien format) */
    skillsUnlocked: z.array(z.object({ requirementId: Id, proofId: Id.optional(), line: I18n })).default([]),
    shareCard: z.object({ text: I18n, showScore: z.boolean().default(true) }),
    challenge: I18n.optional(),
    cta: z
      .array(z.object({ type: z.enum(["cv", "contact", "portfolio", "linkedin"]), label: I18n, url: Url }))
      .default([]), // ancien format, plus généré

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
