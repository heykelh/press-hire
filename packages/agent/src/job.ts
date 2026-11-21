/**
 * Fiche du poste : l'agent analyse d'abord le métier, sans penser au jeu.
 * Chaque mission est décrite par un verbe d'action, les documents manipulés, la décision, l'indicateur
 * et les erreurs classiques. Le jeu est ensuite construit à partir de cette fiche.
 */
import { z } from "zod";
import { FAMILIES } from "./packs";

/** Verbes d'action : ils décident de la mécanique de jeu (voir plan.ts). */
export const VERBS = [
  "filter", // filtrer un flux (mails, données, candidatures, tickets)
  "react", // réagir vite à des urgences, des incidents
  "tune", // doser un seuil, un budget, une fréquence
  "follow_procedure", // dérouler une procédure dans l'ordre
  "inspect", // contrôler un document par rapport à une règle
  "investigate", // trouver une anomalie dans des données
  "prioritize", // trier, classer, arbitrer entre des demandes
  "decide", // trancher sous incertitude
  "know", // maîtriser un savoir technique ou réglementaire
  "persuade", // convaincre, négocier, recueillir un besoin, accompagner
  "forecast", // prévoir, planifier
] as const;
export type Verb = (typeof VERBS)[number];

const S = (max: number) => z.string().min(1).max(max);

export const JobModel = z.object({
  company: S(120),
  sector: S(80),
  jobTitle: S(160),
  family: z.enum(FAMILIES),
  seniority: z.enum(["junior", "confirmed", "senior", "lead"]).default("confirmed"),
  /** ESN, cabinet de recrutement, portage : le jeu évoque alors le secteur du client final */
  intermediary: z.boolean().default(false),
  clientSector: z.string().max(80).optional(),
  missions: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z][a-z0-9_]{1,30}$/),
        label: S(80),
        verb: z.enum(VERBS),
        priority: z.enum(["must", "nice"]).default("must"),
        kind: z.enum(["hard", "soft"]).default("hard"),
        quote: S(160), // extrait exact de l'offre
        artifacts: z.array(S(120)).min(1).max(6), // ce qui passe entre les mains : vrais exemples
        decision: S(200),
        goodOutcome: S(200),
        kpi: z.object({ name: S(60), definition: S(160) }),
        pitfalls: z.array(S(160)).min(1).max(4),
        stakeholders: z.array(S(60)).max(4).default([]),
      }),
    )
    .min(2)
    .max(8),
  tools: z.array(S(40)).max(12).default([]),
  jargon: z.array(z.object({ term: S(40), definition: S(200) })).max(14).default([]),
  painPoints: z.array(z.object({ label: S(120), evidence: S(200) })).max(4).default([]),
  softSkills: z.array(S(60)).max(6).default([]),
  tone: z.object({ formality: z.number().int().min(1).max(5), humor: z.number().int().min(0).max(3) }).default({ formality: 3, humor: 2 }),
});
export type JobModel = z.output<typeof JobModel>;

export const ANALYZE_SYSTEM = `Tu es un recruteur expert et un praticien de terrain de très nombreux métiers.
On te donne une offre d'emploi. Tu décris le POSTE RÉEL, pas un jeu : ce que la personne fait de ses mains chaque semaine.
Tu réponds uniquement par un objet JSON conforme au schéma fourni.

Règles :
- missions : 3 à 7 missions réelles tirées de l'offre (priorité "must" pour le cœur du poste, "nice" pour les plus).
  · verb : le verbe d'action principal parmi filter, react, tune, follow_procedure, inspect, investigate, prioritize, decide, know,
    persuade, forecast. Choisis le geste concret : « analyser les alertes » = investigate ou react, « contrôler la conformité » = inspect,
    « définir les règles de qualité » = tune ou inspect, « animer des ateliers » = persuade, « maîtriser SQL » = know.
  · quote : extrait EXACT de l'offre (15 mots maximum).
  · artifacts : 2 à 5 exemples CONCRETS de ce qui passe entre les mains (une ligne de log, une requête SQL, une facture, un ticket,
    une demande d'accès, une prévision…), écrits comme on les verrait à l'écran, avec des valeurs plausibles. Inclus si possible un exemple fautif.
  · decision : la décision que la personne prend. goodOutcome : à quoi ressemble un travail bien fait.
  · kpi : l'indicateur qui mesure cette mission (nom et définition simple).
  · pitfalls : 1 à 3 erreurs classiques des débutants, concrètes.
  · kind "soft" pour les missions humaines (accompagner, convaincre, animer).
- family : la famille de métiers la plus proche.
- intermediary : true si l'employeur est une ESN, un cabinet de recrutement ou de conseil qui place la personne chez un client ;
  clientSector = le secteur du client final s'il est connu.
- tools : outils et technologies cités. jargon : 4 à 10 mots du métier qu'un débutant ne connaît pas, définis simplement.
- painPoints : le vrai problème que ce recrutement doit résoudre, s'il se devine (evidence = ce qui le montre dans l'offre).
- softSkills : qualités humaines demandées. tone : formalité (1 start-up détendue … 5 institution) et humour possible (0 à 3).
- N'invente aucun fait sur l'entreprise. Si une information manque, déduis prudemment du métier, pas de l'entreprise.`;

let jobSchemaText: string | null = null;
export function jobSchemaJson(): string {
  if (!jobSchemaText) jobSchemaText = JSON.stringify(z.toJSONSchema(JobModel, { io: "input", unrepresentable: "any" }));
  return jobSchemaText;
}

/** Normalise la réponse du modèle avant validation (identifiants, citations trop longues…). */
export function repairJob(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const j = raw as Record<string, unknown>;
  if (Array.isArray(j.missions))
    j.missions = (j.missions as Array<Record<string, unknown>>).slice(0, 8).map((m, i) => {
      const id = String(m.id ?? `m${i + 1}`).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^[^a-z]+/, "").slice(0, 30);
      const quote = String(m.quote ?? m.label ?? "").split(/\s+/).slice(0, 15).join(" ");
      return { ...m, id: id.length >= 2 ? id : `m${i + 1}`, quote: quote || String(m.label ?? "mission") };
    });
  return j;
}

/** Exigences de la cartouche, tirées de la fiche (identifiants fixés : le modèle doit les reprendre). */
export function requirementsFromJob(job: JobModel) {
  return job.missions.map((m) => ({
    id: `req_${m.id}`.slice(0, 40),
    label: { fr: m.label, en: m.label },
    kind: m.kind,
    priority: m.priority,
    offerQuote: m.quote.split(/\s+/).slice(0, 15).join(" "),
  }));
}
