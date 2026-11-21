/**
 * Consignes données au modèle de langue. Tout ce qui est vérifiable est vérifié ensuite
 * par le schéma et les contrôles : ici, on vise surtout la qualité du jeu.
 */
import { z } from "zod";
import type { Issue } from "@press-hire/cartridge";
import { Brief } from "./brief";
import { EXAMPLE_BRIEF } from "./example";
import type { Offer } from "./offer";
import type { CandidateProfile } from "./profile";

const SCENES = `airport (aéroport, avions), station (gare souterraine), trading_floor (salle des marchés), data_center (salle serveurs),
hospital (hôpital), factory (usine), warehouse (entrepôt intérieur : racks, quais, chariot), headquarters (tours de bureaux),
port (port, porte-conteneurs), store (rue commerçante), plains (plaine et collines façon jeu de plateforme), rooftops (toits de ville la nuit),
underground (métro, tunnels), jungle (jungle, cascade), paris (Paris, tour Eiffel), lab (laboratoire, éprouvettes), space (espace, fusée)`;

const ACTORS = `plane_takeoff, plane_taxi, train, truck, crane, ship, server_lights, ticker (bandeau défilant), ambulance, drone,
clouds, birds, crowd (passants), hero (petit héros qui court), rocket, satellite, fireflies (lucioles)`;

const SKINS = `arcade (grand public, retail, divertissement) ; famicom (transport, industrie, énergie, marques populaires) ;
gameboy (startups, produit, mobile) ; terminal (finance, cybersécurité, data engineering, infra) ;
synth (IA, cloud, médias, innovation) ; corporate (banque, assurance, conseil, public, santé : ton formel) ;
comic (logistique, retail, agences : ton très décontracté)`;

export const SYSTEM_PROMPT = `Tu es game designer et recruteur. À partir d'une offre d'emploi, tu écris le « brief » d'un petit jeu web rétro 8-bit (style NES)
qu'un candidat envoie au recruteur pour se démarquer. Le jeu fait jouer les vraies missions du poste. Il doit être drôle, juste et
donner envie de rencontrer le candidat.

Tu réponds uniquement par un objet JSON conforme au schéma fourni, sans texte autour.

RÈGLES DE CONTENU
- Tout texte visible est bilingue {"fr": "...", "en": "..."}. Français naturel, phrases courtes.
- analysis.requirements : 4 à 7 exigences réelles de l'offre ; offerQuote = citation exacte de l'offre, 15 mots maximum.
  priority "must" pour le cœur du poste. kind "soft" pour les qualités humaines.
- Chaque exigence "must" doit avoir un niveau (levels[].requirementId) ou une preuve (ending.skillsUnlocked).
- 3 à 6 niveaux, mécaniques variées (pas deux fois la même d'affilée), chacun sur une exigence différente.
  Choisir la mécanique selon la mission : triage (trier, contrôler, conformité), quiz (savoir technique, SQL, réglementation),
  slider (régler un seuil, un stock, un budget, un compromis), wheel (aléas du quotidien ; "timing" si le joueur peut viser),
  dialogue (soft skills : recueillir un besoin, convaincre un comité, gérer un client).
- intro d'un niveau : une phrase de 80 caractères maximum. winLine : la réplique de victoire. failJokes : 2 à 4 blagues sur le métier.
- Humour bienveillant sur les situations du métier ; jamais de moquerie de l'entreprise, ne cite jamais son nom dans failJokes ou taunts.
- Ne jamais inventer de chiffres sur l'entreprise. Les nombres du jeu sont des ordres de grandeur plausibles du métier.
- Personnages (characters) : 1 à 4 interlocuteurs crédibles du poste (manager, client interne, comité…), noms fictifs.
- Boss facultatif : seulement si l'offre laisse voir un vrai problème à résoudre (painPoints). Mécanique quiz (au moins autant de
  questions que de points de vie) ou wheel.
- ending.skillsUnlocked : relie 2 à 4 exigences aux preuves du candidat fournies (proofId exact), avec une phrase factuelle.
  N'utilise que les preuves listées, quand leur description correspond vraiment.
- Titre du jeu : 1 à 3 mots percutants, en majuscules possibles. Tagline : une phrase drôle.
- Ne remplis pas meta, candidate, ending.cta, tracking ni review : ils sont ajoutés automatiquement.

DESIGN
- design.skin parmi : ${SKINS}
- titleScreen.scene parmi : ${SCENES}
- titleScreen.actors (2 à 5) parmi : ${ACTORS}
- Choisis un décor qui évoque le métier ou le secteur. Si l'employeur est une ESN ou un cabinet, évoque le secteur du client final.
- palette : bg sombre ou clair selon le ton, accent vif, 4 à 6 couleurs franches (#rrggbb).
- titleScreen.detail : un petit détail tiré de l'offre affiché dans le décor (24 caractères max).

ÉQUILIBRAGE (vérifié automatiquement, la cartouche est refusée sinon)
- Variables d'état (state.vars, 3 à 8) : bornes min < start < max.
- Chaque niveau a son objectif propre : utilise "scope": "level" (la variation pendant ce niveau) ou une variable dédiée au niveau
  qui part de 0. Un niveau ne doit JAMAIS être déjà gagné avant de jouer.
- Un joueur parfait doit pouvoir gagner : calcule-le. Exemple : triage de 8 cartes, onCorrect +5 → maximum 40 ; objectif ≥ 28.
  Quiz de 4 questions, onCorrect +1 → objectif ≥ 3. Dialogue : la somme des meilleurs choix doit dépasser l'objectif.
  Roue : objectif atteignable en ~60 % des cas par un joueur moyen, jamais garanti.
  Slider : outputs = courbes de la valeur du curseur x ; au moins une valeur de x gagne, beaucoup perdent.
- Les objectifs "<=" servent pour les coûts et les risques.

Voici un exemple complet de brief réussi, pour un poste de Data Analyst supply chain :
${JSON.stringify(EXAMPLE_BRIEF)}
`;

let schemaText: string | null = null;
export function briefSchemaText(): string {
  if (!schemaText) schemaText = JSON.stringify(z.toJSONSchema(Brief, { io: "input", unrepresentable: "any" }));
  return schemaText;
}

export function userPrompt(offer: Offer, profile: CandidateProfile, opts: { company?: string; jobTitle?: string; notes?: string }): string {
  const proofs = profile.proofs.map((p) => `- ${p.id} « ${p.label} » : ${p.about}`).join("\n");
  return `SCHÉMA JSON DU BRIEF :
${briefSchemaText()}

PREUVES DU CANDIDAT (proofId à utiliser dans ending.skillsUnlocked) :
${proofs}
Le candidat se présente comme : ${profile.headline.fr}

OFFRE D'EMPLOI
Entreprise : ${opts.company || offer.company || "(à déduire de l'offre)"}
Poste : ${opts.jobTitle || offer.title || "(à déduire de l'offre)"}
${offer.location ? `Lieu : ${offer.location}\n` : ""}${offer.contract ? `Contrat : ${offer.contract}\n` : ""}${offer.url ? `URL : ${offer.url}\n` : ""}
Texte de l'offre :
"""
${offer.text}
"""
${opts.notes ? `\nCONSIGNES DU CANDIDAT POUR CE JEU :\n${opts.notes}\n` : ""}
Écris maintenant le brief JSON complet de ce jeu.`;
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
