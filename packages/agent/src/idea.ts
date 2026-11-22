/**
 * Mode « idée » : un jeu créé à partir d'une idée libre et d'options, sans offre d'emploi.
 * L'idée est d'abord transformée en fiche (même format que la fiche du poste : le héros remplace le métier,
 * ses actions remplacent les missions), puis le reste de la chaîne est identique : plan, écriture, contrôles, relecture.
 */
import { z } from "zod";
import type { Offer } from "./offer";
import { ARCADE, THINKING, type MechType } from "./plan";

export const MECHANICS: MechType[] = [...ARCADE, ...THINKING, "wheel"];
export const SKINS = ["arcade", "famicom", "gameboy", "terminal", "synth", "corporate", "comic", "candy", "sunset"] as const;
export const SCENES = [
  "plains", "rooftops", "underground", "jungle", "space", "lab", "paris", "airport", "station", "trading_floor",
  "data_center", "hospital", "factory", "warehouse", "headquarters", "port", "store",
] as const;

const opt = <T extends z.ZodTypeAny>(s: T) => s.optional().or(z.literal("").transform(() => undefined));

export const IdeaOptions = z.object({
  /** l'idée, en quelques phrases (seul champ obligatoire) */
  idea: z.string().trim().min(15, "décris l'idée en une ou deux phrases").max(4000),
  /** nom du jeu ou de l'univers */
  title: opt(z.string().trim().max(80)),
  /** rôle du joueur */
  hero: opt(z.string().trim().max(120)),
  audience: z.enum(["grand_public", "enfants", "pros", "equipe"]).default("grand_public"),
  tone: z.enum(["drole", "absurde", "epique", "serieux", "satirique"]).default("drole"),
  goal: z.enum(["apprendre", "divertir", "promouvoir", "former"]).default("apprendre"),
  difficulty: z.enum(["facile", "normal", "dur"]).default("normal"),
  levels: z.coerce.number().int().min(3).max(6).default(5),
  /** mécaniques souhaitées (vide = l'agent choisit) */
  mechanics: z.array(z.enum(MECHANICS as [MechType, ...MechType[]])).max(11).default([]),
  skin: opt(z.enum(SKINS)),
  scene: opt(z.enum(SCENES)),
  boss: z.boolean().default(true),
  /** langue principale des textes (les deux langues sont toujours écrites) */
  lang: z.enum(["fr", "en"]).default("fr"),
});
export type IdeaOptions = z.output<typeof IdeaOptions>;

export const AUDIENCE_FR: Record<IdeaOptions["audience"], string> = {
  grand_public: "grand public (aucune connaissance supposée)",
  enfants: "enfants de 8 à 12 ans (mots simples, aucune violence, humour gentil)",
  pros: "professionnels du sujet (vocabulaire exact, clins d'œil d'initiés)",
  equipe: "une équipe interne (références au quotidien partagé, ton complice)",
};
export const TONE_FR: Record<IdeaOptions["tone"], string> = {
  drole: "drôle et bienveillant", absurde: "absurde, décalé, surréaliste", epique: "épique, grandiloquent façon quête de héros",
  serieux: "sérieux et sobre, humour discret", satirique: "satirique (on se moque des situations, jamais des personnes)",
};
export const GOAL_FR: Record<IdeaOptions["goal"], string> = {
  apprendre: "faire apprendre de vraies notions sur le sujet",
  divertir: "divertir avant tout (les notions restent justes mais légères)",
  promouvoir: "faire découvrir et aimer un projet, un produit ou une marque (sans publicité mensongère)",
  former: "former à une procédure ou à des réflexes concrets",
};
export const DIFFICULTY_FR: Record<IdeaOptions["difficulty"], string> = {
  facile: "facile : objectifs bas, peu de pièges, beaucoup d'aide",
  normal: "normale",
  dur: "difficile : objectifs élevés, pièges subtils, rythme rapide (mais toujours gagnable)",
};

/** Texte qui décrit l'idée et ses options, utilisé à toutes les étapes (analyse, écriture, relecture). */
export function ideaText(o: IdeaOptions): string {
  return [
    `IDÉE : ${o.idea}`,
    o.title ? `Nom du jeu / de l'univers : ${o.title}` : "",
    o.hero ? `Rôle du joueur : ${o.hero}` : "",
    `Public : ${AUDIENCE_FR[o.audience]}`,
    `Ton : ${TONE_FR[o.tone]}`,
    `Objectif : ${GOAL_FR[o.goal]}`,
    `Difficulté : ${DIFFICULTY_FR[o.difficulty]}`,
    `Nombre de niveaux : ${o.levels}${o.boss ? " + un boss final" : ", sans boss"}`,
    o.mechanics.length ? `Mécaniques souhaitées : ${o.mechanics.join(", ")}` : "",
    `Langue principale : ${o.lang === "fr" ? "français" : "anglais"} (écris quand même les deux langues)`,
  ].filter(Boolean).join("\n");
}

/** L'idée vue comme une « offre » : le reste de la chaîne n'a pas à savoir d'où vient le texte. */
export function ideaOffer(o: IdeaOptions): Offer {
  return { title: o.hero, company: o.title, text: ideaText(o), source: "pasted", thin: false };
}

export const IDEA_ANALYZE_SYSTEM = `Tu es un game designer et un expert du sujet qu'on te propose.
On te donne une IDÉE de jeu (pas une offre d'emploi). Tu décris l'univers du jeu dans le format JSON fourni (conçu pour des métiers) :
le héros du jeu prend la place du poste, ses actions prennent la place des missions.
Tu réponds uniquement par un objet JSON conforme au schéma fourni.

Correspondances :
- company : le nom de l'univers, du lieu ou de l'organisation du jeu (inventé si l'idée n'en donne pas, court et accrocheur).
- sector : le thème (ex. « cuisine », « astronomie », « cybersécurité »). jobTitle : le rôle du joueur (ex. « apprenti pâtissier »).
- family : la famille la plus proche du thème, sinon "generic".
- missions : 3 à 7 ACTIONS que le héros fait vraiment dans ce thème, chacune avec un verbe d'action parmi
  filter, react, tune, follow_procedure, inspect, investigate, prioritize, decide, know, persuade, forecast.
  · quote : une courte reprise de l'idée (15 mots maximum) qui justifie l'action.
  · artifacts : 2 à 5 objets CONCRETS et VRAIS du thème, écrits comme on les verrait à l'écran (une recette, une carte du ciel,
    une ligne de journal…), dont si possible un exemple fautif.
  · decision, goodOutcome, kpi (un score moderne et parlant), pitfalls (erreurs classiques de débutant, vraies).
- jargon : 4 à 10 notions du thème à faire découvrir, définies simplement et JUSTEMENT (ce sont elles que le joueur apprend).
- painPoints : le grand problème ou le « méchant » de l'histoire (il deviendra le boss), avec ce qui le justifie dans l'idée.
- softSkills : les qualités que le héros montre. tone : formality 1 (très détendu) à 5 (institutionnel), humor 0 à 3, selon le ton demandé.
- Les faits doivent être exacts : si le thème est réel (science, histoire, métier, sport), n'invente aucune fausse information.`;

export function analyzeIdeaPrompt(o: IdeaOptions, schema: string): string {
  return `SCHÉMA JSON DE LA FICHE :
${schema}

${ideaText(o)}

Décris maintenant l'univers du jeu en JSON.`;
}

/** Consignes ajoutées à l'écriture (elles priment sur la partie « candidature » du rôle système). */
export function ideaWriteRules(o: IdeaOptions): string {
  return `MODE IDÉE (prioritaire sur toute consigne liée à une candidature ou à une offre d'emploi) :
- Ce jeu n'accompagne PAS une candidature. Il n'y a ni candidat ni recruteur : ne parle jamais d'embauche ni de poste à pourvoir.
- target.company = l'univers du jeu ; target.job = le rôle du joueur. analysis.requirements = les notions et gestes du thème ;
  offerQuote = une courte reprise de l'idée.
- JUSTESSE = fidélité au sujet : de vrais faits, de vrais objets, de vraies règles. PÉDAGOGIE et PLAISIR restent les mêmes.
- Public : ${AUDIENCE_FR[o.audience]}. Ton : ${TONE_FR[o.tone]}. Objectif : ${GOAL_FR[o.goal]}.
- Difficulté ${DIFFICULTY_FR[o.difficulty]}.
- Le champ « day » de chaque niveau reprend le monde indiqué dans le plan (ex. « MONDE 1-1 »), pas un jour de la semaine.
- Style toujours rétro 8-bit façon NES : écrans courts, punchlines, rebondissements, fin mémorable.`;
}
