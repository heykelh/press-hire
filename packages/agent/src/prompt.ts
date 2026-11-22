/**
 * Consignes données au modèle de langue, une par étape :
 * écriture du jeu (à partir de la fiche du poste et du plan), relecture par trois personnages, révision, corrections.
 * Tout ce qui est vérifiable est vérifié ensuite par le schéma, les contrôles et la simulation.
 */
import { z } from "zod";
import type { Issue } from "@press-hire/cartridge";
import { Brief } from "./brief";
import { EXAMPLE_BRIEF, EXAMPLE_BRIEF_ARCADE } from "./example";
import type { JobModel } from "./job";
import type { Offer } from "./offer";
import { packText } from "./packs";
import { planText, type GamePlan } from "./plan";

const SCENES = `airport, station, trading_floor, data_center, hospital, factory, warehouse, headquarters, port, store, plains, rooftops,
underground, jungle, paris, lab, space`;
const ACTORS = `plane_takeoff, plane_taxi, train, truck, crane, ship, server_lights, ticker, ambulance, drone, clouds, birds, crowd, hero,
rocket, satellite, fireflies`;
const SKINS = `arcade (grand public), famicom (transport, industrie), gameboy (start-up, produit), terminal (cyber, data engineering, finance de marché),
synth (IA, innovation), corporate (banque, assurance, public : ton formel), comic (logistique, retail, ton décontracté)`;
const ICONS = "file, bug, coin, star, bomb, mail, chart, shield, fire, box, cloud, key, warning, heart, ticket, server, cart, clock, drop, bolt";

export const SYSTEM_PROMPT = `Tu es le game designer principal d'un studio de jeux mobiles à succès, ET un praticien expérimenté du métier visé.
Tu écris le « brief » JSON d'un jeu web rétro 8-bit (style NES) qu'un candidat envoie avec sa candidature.
Trois objectifs, dans cet ordre :
1. JUSTESSE : un professionnel du poste doit se dire « c'est exactement mon quotidien ». On montre de vrais documents du métier
   (une ligne de log, une requête SQL, une facture, une demande d'accès), jamais des étiquettes vagues comme « Donnée sale ».
2. APPRENDRE EN JOUANT : quelqu'un qui ne connaît rien au métier doit comprendre ce qu'il fait et repartir avec des notions.
3. PLAISIR ET « WAOUH » : une histoire (la semaine type du poste), des rebondissements, de l'humour bienveillant, des métriques d'aujourd'hui.

Tu réponds uniquement par un objet JSON conforme au schéma fourni, sans texte autour.

STRUCTURE
- Respecte le PLAN fourni : format, ordre des niveaux, mécanique de chacun, entrée (entry), modificateurs (modifiers), requirementId,
  étiquette "day" de chaque niveau, et boss à plusieurs formes (boss.phases). Suis le CONCEPT du directeur créatif s'il est fourni.
- analysis.requirements : reprends EXACTEMENT les exigences fournies (mêmes id), traduis seulement le label en anglais.
- Tout texte visible est bilingue {"fr": "...", "en": "..."}. Français naturel, phrases courtes.

HISTOIRE (le jeu suit le FORMAT du plan : semaine type, nuit blanche, braquage, tournoi, émission de télé, boucle temporelle…)
- story.coldOpen : 2 à 3 répliques d'ouverture qui posent la crise dans l'esprit du format, avec time (le premier moment du format) et le personnage principal.
- story.epilogue : une phrase de conclusion drôle.
- characters : 1 à 3 personnages récurrents crédibles (manager, client interne…), noms fictifs. Ils reviennent dans les niveaux.
- Chaque niveau : day (repris du plan), intro (80 caractères max), outro {characterId, text} = la réaction d'un personnage après la victoire.
- design.ranks : 4 grades qui sont de vrais titres du métier, du débutant au confirmé (ex. « Stagiaire SOC », « Analyste N1 », « Analyste N2 », « Lead SOC »).

APPRENDRE (chaque niveau : découvrir, pratiquer, rebondissement, maîtriser)
- concepts : 5 à 10 notions du métier (term, definition pour un débutant complet en 160 caractères max, icon). Ce sont des cartes à collectionner.
- Chaque niveau : teaches = 1 à 2 notions qu'il fait découvrir. Relie aussi les objets concernés par conceptId (la notion s'affiche
  au moment où l'objet apparaît pour la première fois).
- Chaque niveau a un rebondissement : twist {text} = nouvelle règle ou nouvelle menace annoncée à mi-niveau, et des objets ou dossiers
  marqués "twist": true qui n'arrivent qu'après (catch, whack, triage, inspection). Pour gauge, investigation, sequence : le texte suffit.
- Erreurs = leçons : sur les objets d'arcade, "consequence" = ce qui se passerait vraiment dans l'entreprise (« 48 000 € virés à Chypre »),
  drôle et concret. Au tri et à l'inspection, "why" explique la règle. Au quiz, "explain" explique.
- howTo : un conseil concret pour réussir ce niveau. hint : l'indice après des échecs.
- failJokes : 2 à 3 blagues sur le métier. winLine : la réplique de victoire avec un vrai indicateur du métier si possible.

MÉCANIQUES
- catch (Kaboom!) : filtrer un flux ; good = à laisser entrer, bad = à éviter ; étiquettes de 14 caractères max qui ressemblent à de vrais objets.
- whack (tape-taupe) : réagir à des incidents ; good = à frapper, bad = à épargner (un test prévu, une fausse alerte…).
- gauge (jauge de golf) : doser ; une zone idéale de 12 à 18 points, des zones « trop » / « pas assez » aux noms drôles.
- sequence (Simon) : 3 à 5 étapes d'une procédure réelle, dans le bon ordre.
- inspection (Papers, Please) : document = le type de dossier ; rules = 2 à 4 règles réelles du métier ; cases = 5 à 8 dossiers avec
  2 à 4 champs (label, value réaliste) ; un dossier à rejeter a exactement un champ "faulty": true, un dossier conforme n'en a aucun ;
  mélange conformes et non conformes.
- investigation (Où est Charlie) : 2 à 3 manches ; view = logs (lignes réalistes), table (colonnes + lignes) ou chart (labels + valeurs) ;
  answer = index de l'anomalie (0 = première ligne) ; explain = pourquoi c'est l'anomalie.
- triage, quiz, slider, wheel, dialogue : comme dans les exemples.
- entry : "briefing" (écran d'explication), "ambush" (pas d'écran : l'intro est une alerte courte qui claque), "call" (un personnage
  appelle : renseigne characterId, l'intro est ce qu'il dit au téléphone).
- modifiers : ceux du plan, à justifier dans l'intro ou le twist (« La clim du data center lâche : TURBO ! »).
- BOSS À PLUSIEURS FORMES : boss.phases = 2 à 3 phases du plan, chacune { intro, mechanic (mécanique complète, comme un niveau),
  win (condition de victoire, scope "level" conseillé), taunt, modifiers }. Pas de boss.mechanic. hp = nombre de phases.
  Les phases reprennent les notions vues pendant le jeu et montent en intensité.
- Icônes possibles : ${ICONS}.

DESIGN
- design.skin parmi : ${SKINS}. titleScreen.scene parmi : ${SCENES}. titleScreen.actors (2 à 5) parmi : ${ACTORS}.
- Si l'employeur est une ESN ou un cabinet, évoque le secteur du client final. palette : 4 à 6 couleurs franches (#rrggbb).
- titleScreen.detail : un détail tiré de l'offre affiché dans le décor (24 caractères max).

RÈGLES
- Humour bienveillant ; jamais de moquerie de l'entreprise, ne cite pas son nom dans failJokes ou taunts. N'invente aucun fait sur l'entreprise.
- Ne remplis pas meta, candidate, ending.cta, tracking ni review.
- ending.skillsUnlocked : 3 à 6 missions jouées (requirementId + phrase concrète). ending.challenge : un défi lié à une métrique du jeu.

ÉQUILIBRAGE (vérifié par simulation, la cartouche est refusée sinon)
- state.vars : 3 à 8 variables, min < start < max. Une variable dédiée par niveau (start 0) et des objectifs "scope": "level".
- Un niveau n'est JAMAIS gagné avant de jouer, et un joueur parfait peut toujours gagner. Calcule :
  · catch/whack : le jeu tire exactement round(durationSec × perSec) objets répartis selon les poids ; objectif atteint si le joueur
    attrape 75 % des bons objets et 20 % des pièges.
  · triage/inspection : nombre de dossiers × onCorrect (+ onSpotted pour les rejets) ; objectif ≈ 70 % du maximum.
  · quiz/investigation : nombre de questions × gain ; objectif = maximum - 1 manche.
  · gauge : meilleure zone touchée 2 fois sur 3. sequence : objectif = rounds - 1.
  · dialogue : la somme des meilleurs choix dépasse l'objectif.

Exemples de briefs valides. ILS MONTRENT LA FORME DU JSON, PAS UN MODÈLE DE JEU : ne copie ni leur histoire, ni leur format,
ni leurs mécaniques, ni leur boss, ni leurs blagues. Ton jeu doit être différent et propre au métier visé.
1. Analyste SOC (mécaniques d'arcade, inspection, enquête, histoire, notions) :
${JSON.stringify(EXAMPLE_BRIEF_ARCADE)}

2. Data Analyst supply chain (tri, curseur, quiz, dialogue, roue) — format plus ancien, sans histoire ni notions : à compléter dans ton brief.
${JSON.stringify(EXAMPLE_BRIEF)}
`;

let schemaText: string | null = null;
export function briefSchemaText(): string {
  if (!schemaText) schemaText = JSON.stringify(z.toJSONSchema(Brief, { io: "input", unrepresentable: "any" }));
  return schemaText;
}

export interface WriteContext {
  offer: Offer;
  job?: JobModel;
  plan?: GamePlan;
  requirements?: unknown[];
  company?: string;
  jobTitle?: string;
  notes?: string;
  /** mode idée : consignes qui remplacent le cadre « candidature » */
  idea?: { rules: string };
  /** extraits de la bibliothèque de game design utiles à ce jeu */
  design?: string;
  /** concept du directeur créatif (étape pitch) */
  concept?: string;
}

const extras = (w: WriteContext) => [w.design, w.concept].filter(Boolean).join("\n\n");

export function userPrompt(w: WriteContext): string {
  const { offer } = w;
  if (w.idea) return ideaUserPrompt(w, w.idea.rules);
  const jobBlock = w.job && w.plan
    ? `FICHE DU POSTE (analyse préalable de l'offre) :
${JSON.stringify(w.job)}

EXIGENCES À REPRENDRE TELLES QUELLES dans analysis.requirements :
${JSON.stringify(w.requirements)}

${planText(w.job, w.plan)}

${packText(w.plan.pack)}
`
    : "";
  return `SCHÉMA JSON DU BRIEF :
${briefSchemaText()}

${extras(w)}

${jobBlock}
OFFRE D'EMPLOI
Entreprise : ${w.company || w.job?.company || offer.company || "(à déduire de l'offre)"}
Poste : ${w.jobTitle || w.job?.jobTitle || offer.title || "(à déduire de l'offre)"}
${offer.location ? `Lieu : ${offer.location}\n` : ""}${offer.contract ? `Contrat : ${offer.contract}\n` : ""}${offer.url ? `URL : ${offer.url}\n` : ""}
Texte de l'offre :
"""
${offer.text}
"""
${w.notes ? `\nCONSIGNES POUR CE JEU (prioritaires) :\n${w.notes}\n` : ""}
Écris maintenant le brief JSON complet de ce jeu.`;
}

function ideaUserPrompt(w: WriteContext, rules: string): string {
  const jobBlock = w.job && w.plan
    ? `FICHE DE L'UNIVERS (analyse préalable de l'idée, au format d'une fiche de poste) :
${JSON.stringify(w.job)}

EXIGENCES À REPRENDRE TELLES QUELLES dans analysis.requirements :
${JSON.stringify(w.requirements)}

${planText(w.job, w.plan, "idea")}

${packText(w.plan.pack)}
(La bibliothèque ci-dessus n'est qu'une source d'inspiration de forme : le contenu vient du thème de l'idée.)
`
    : "";
  return `SCHÉMA JSON DU BRIEF :
${briefSchemaText()}

${rules}

${extras(w)}

${jobBlock}
${w.offer.text}
${w.notes ? `\nCONSIGNES POUR CE JEU (prioritaires) :\n${w.notes}\n` : ""}
Écris maintenant le brief JSON complet de ce jeu.`;
}

export function analyzePrompt(offer: Offer, opts: { company?: string; jobTitle?: string; notes?: string }, schema: string): string {
  return `SCHÉMA JSON DE LA FICHE DU POSTE :
${schema}

OFFRE D'EMPLOI
Entreprise : ${opts.company || offer.company || "(à déduire)"}
Poste : ${opts.jobTitle || offer.title || "(à déduire)"}
${offer.location ? `Lieu : ${offer.location}\n` : ""}
"""
${offer.text}
"""
${opts.notes ? `\nPrécisions du candidat : ${opts.notes}\n` : ""}
Décris maintenant le poste réel en JSON.`;
}

/* ---------------- relecture ---------------- */

export const CRITIC_SYSTEM = `Tu relis le brief JSON d'un jeu de candidature rétro, sous trois casquettes à la fois :
1. LE PRATICIEN : 10 ans dans ce métier précis. Il note la JUSTESSE : les documents, les décisions, les erreurs, les chiffres
   sont-ils ceux du vrai poste ? Rien d'inventé sur l'entreprise ? Les règles d'inspection et les anomalies d'enquête sont-elles réalistes ?
2. LE DÉBUTANT COMPLET : il ne connaît rien au métier. Il note la PÉDAGOGIE : comprend-il ce qu'il fait ? Les notions sont-elles
   expliquées au bon moment, simplement ? Les erreurs lui apprennent-elles quelque chose ?
3. LE JOUEUR EXIGEANT : il joue à des jeux mobiles tous les jours. Il note le PLAISIR (variété, rythme, rebondissements, humour)
   et le « WAOUH » (ouverture, histoire, personnalisation, fin).
Sois sévère et concret : 7/10 = correct, 9/10 = remarquable. Pour chaque problème, propose une correction précise et faisable dans le brief.
Réponds uniquement en JSON :
{"scores":{"accuracy":0-10,"pedagogy":0-10,"fun":0-10,"wow":0-10},
 "levels":[{"id":"…","accuracy":0-10,"pedagogy":0-10,"fun":0-10,"problems":["…"],"fix":"…"}],
 "global":["correction globale…"]}`;

export const Critique = z.object({
  scores: z.object({ accuracy: z.number(), pedagogy: z.number(), fun: z.number(), wow: z.number() }),
  levels: z.array(z.object({ id: z.string(), accuracy: z.number(), pedagogy: z.number(), fun: z.number(), problems: z.array(z.string()).default([]), fix: z.string().default("") })).default([]),
  global: z.array(z.string()).default([]),
});
export type Critique = z.infer<typeof Critique>;

export function criticPrompt(brief: string, job: JobModel | undefined, offerText: string, mode: "job" | "idea" = "job"): string {
  const idea = mode === "idea"
    ? `MODE IDÉE : ce jeu ne vient pas d'une offre d'emploi mais de l'idée ci-dessous. « Le praticien » est un expert du sujet,
« justesse » = fidélité au sujet. Vérifie aussi le respect du public, du ton et de la difficulté demandés.
${offerText}

`
    : "";
  return `${idea}${job ? `FICHE DU POSTE :\n${JSON.stringify(job)}\n\n` : `OFFRE :\n"""\n${offerText.slice(0, 6000)}\n"""\n\n`}BRIEF À RELIRE :
${brief}

Note et corrige maintenant, en JSON.`;
}

/** Le brief doit-il être révisé ? */
export function needsRevision(c: Critique, threshold = 7): boolean {
  const s = c.scores;
  return Math.min(s.accuracy, s.pedagogy, s.fun, s.wow) < threshold || c.levels.some((l) => Math.min(l.accuracy, l.pedagogy, l.fun) < threshold - 1);
}

export function revisePrompt(brief: string, critique: Critique): string {
  const weak = critique.levels.filter((l) => l.problems.length || Math.min(l.accuracy, l.pedagogy, l.fun) < 7);
  return `Trois relecteurs (un praticien du métier, un débutant complet, un joueur exigeant) ont noté ton brief :
justesse ${critique.scores.accuracy}/10, pédagogie ${critique.scores.pedagogy}/10, plaisir ${critique.scores.fun}/10, waouh ${critique.scores.wow}/10.

Corrections demandées par niveau :
${weak.map((l) => `- ${l.id} : ${l.problems.join(" ; ")} → ${l.fix}`).join("\n") || "(aucune)"}
Corrections globales :
${critique.global.map((g) => `- ${g}`).join("\n") || "(aucune)"}

Applique toutes ces corrections en gardant le plan (ordre, mécaniques, requirementId, jours) et l'équilibrage,
puis renvoie le brief JSON complet révisé, et rien d'autre.

Brief actuel :
${brief}`;
}

export function repairPrompt(previous: string, issues: Issue[]): string {
  const list = issues.slice(0, 40).map((i) => `- [${i.rule}] ${i.path || "(racine)"} : ${i.message}`).join("\n");
  return `Ton brief JSON a été refusé par les contrôles. Erreurs :
${list}

Corrige toutes ces erreurs sans appauvrir le jeu, puis renvoie le brief JSON complet corrigé (et rien d'autre).
Rappel : un niveau "déjà gagné avant de jouer" se corrige avec "scope": "level" ou une variable dédiée qui part de 0 ;
un niveau "impossible à gagner" se corrige en baissant l'objectif ou en augmentant les gains des bons choix.

Brief refusé :
${previous}`;
}
