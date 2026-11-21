/**
 * Bibliothèques par famille de métiers : de vrais documents, indicateurs, pièges et mots du métier.
 * Elles nourrissent le modèle d'exemples concrets au lieu de le laisser tout inventer :
 * c'est ce qui fait dire à un professionnel « c'est exactement mon quotidien ».
 */

export const FAMILIES = [
  "data_analytics", "data_engineering", "data_science_ai", "data_governance", "cybersecurity", "supply_chain",
  "finance_control", "hr", "marketing_growth", "product_tech", "support_ops", "sales", "generic",
] as const;
export type Family = (typeof FAMILIES)[number];

export interface DomainPack {
  family: Family;
  label: string;
  /** décors et habillage qui évoquent le métier (le secteur de l'entreprise peut primer) */
  scenes: string[];
  skin: string;
  actors: string[];
  /** documents réels du métier : conformes / piégés (pour tri, attrape-tout, inspection) */
  artifacts: { good: string[]; bad: string[] };
  /** lignes de journal, de table ou de données typiques (pour l'enquête) */
  evidence: string[];
  kpis: Array<{ name: string; definition: string }>;
  pitfalls: string[];
  jargon: Array<{ term: string; definition: string }>;
  /** moments de la semaine typiques (pour l'histoire) */
  rituals: string[];
  stakeholders: string[];
}

const P = (p: DomainPack) => p;

export const PACKS: Record<Family, DomainPack> = {
  data_analytics: P({
    family: "data_analytics", label: "Data analyst, BI", scenes: ["headquarters", "trading_floor", "store"], skin: "arcade", actors: ["ticker", "crowd", "clouds"],
    artifacts: {
      good: ["date_commande: 2026-03-14", "CA_HT: 1 240,50 €", "SELECT region, SUM(ca) FROM ventes GROUP BY region", "taux_conversion: 3,2 %", "id_client: C-004812"],
      bad: ["date: 31/02/2026", "prix: -12 €", "SELECT * FROM ventes JOIN clients (sans ON)", "CA en double après jointure", "NULL dans 40 % des lignes", "graphique avec axe tronqué à 95"],
    },
    evidence: ["semaine 12 : 48 120 €", "semaine 13 : 51 300 €", "semaine 14 : 4 980 €  ← export partiel", "client C-0042 compté 3 fois"],
    kpis: [
      { name: "Taux de conversion", definition: "part des visiteurs qui achètent" },
      { name: "Panier moyen", definition: "chiffre d'affaires divisé par le nombre de commandes" },
      { name: "Taux de complétude", definition: "part des champs effectivement remplis" },
    ],
    pitfalls: ["jointure qui duplique les lignes", "comparer des périodes de durées différentes", "moyenne tirée par une valeur aberrante", "tableau de bord que personne n'ouvre"],
    jargon: [
      { term: "Jointure", definition: "assembler deux tables grâce à une colonne commune" },
      { term: "Valeur aberrante", definition: "donnée très éloignée des autres, souvent une erreur" },
      { term: "KPI", definition: "indicateur clé suivi pour piloter une activité" },
      { term: "Granularité", definition: "niveau de détail d'une donnée : jour, semaine, magasin…" },
    ],
    rituals: ["point hebdo du lundi", "demande urgente du directeur", "rafraîchissement du tableau de bord", "comité du jeudi"],
    stakeholders: ["directeur commercial", "contrôleur de gestion", "équipe marketing", "DSI"],
  }),
  data_engineering: P({
    family: "data_engineering", label: "Data engineer", scenes: ["data_center", "factory", "underground"], skin: "terminal", actors: ["server_lights", "train", "drone"],
    artifacts: {
      good: ["dbt run --select stg_orders  ✓ 12 modèles", "schema: order_id INT NOT NULL", "partition: date=2026-11-20", "test unique(order_id) passé", "airflow: dag_sales succès 04:02"],
      bad: ["colonne renommée en amont sans prévenir", "SELECT * en production", "fichier CSV avec séparateur changé", "doublons après rejeu du job", "secret en clair dans le code", "job planifié toutes les minutes"],
    },
    evidence: ["04:00 dag_sales started", "04:02 task load_orders 1 204 331 rows", "04:03 task load_orders 0 rows  ← source vide", "04:05 dbt test unique_order_id FAIL (312)"],
    kpis: [
      { name: "Fraîcheur", definition: "délai entre l'événement et sa disponibilité dans l'entrepôt" },
      { name: "Taux de succès des pipelines", definition: "part des exécutions sans erreur" },
      { name: "Coût par requête", definition: "dépense de calcul pour une requête dans le cloud" },
    ],
    pitfalls: ["changement de schéma non détecté", "rejeu qui crée des doublons", "pipeline sans test", "facture cloud qui explose"],
    jargon: [
      { term: "ETL / ELT", definition: "extraire, transformer et charger des données d'un système à l'autre" },
      { term: "Idempotence", definition: "relancer un traitement donne le même résultat, sans doublon" },
      { term: "Orchestrateur", definition: "outil qui lance les traitements dans le bon ordre (Airflow…)" },
      { term: "Data contract", definition: "accord écrit sur le format des données échangées" },
    ],
    rituals: ["astreinte des pipelines de nuit", "revue de code", "migration vers le cloud", "incident du lundi matin"],
    stakeholders: ["data analysts", "équipe produit", "architecte", "FinOps"],
  }),
  data_science_ai: P({
    family: "data_science_ai", label: "Data scientist, IA", scenes: ["lab", "space", "data_center"], skin: "synth", actors: ["satellite", "fireflies", "server_lights"],
    artifacts: {
      good: ["AUC validation : 0,81", "jeu de test tenu à l'écart", "réponse du chatbot avec source citée", "prompt avec exemples et format de sortie", "drift < 2 %"],
      bad: ["fuite de la cible dans les variables", "précision 99 % sur données déséquilibrées", "réponse inventée sans source", "données personnelles dans le prompt", "modèle jamais réentraîné depuis 2023"],
    },
    evidence: ["v1 précision 0,84", "v2 précision 0,86", "v3 précision 0,99  ← fuite de données", "drift juin : 1,2 %", "drift juillet : 18 %"],
    kpis: [
      { name: "Précision", definition: "part des prédictions positives qui sont justes" },
      { name: "Rappel", definition: "part des vrais cas positifs que le modèle retrouve" },
      { name: "Taux d'hallucination", definition: "part des réponses d'IA inventées ou fausses" },
    ],
    pitfalls: ["surapprentissage", "fuite de données", "métrique inadaptée au déséquilibre", "IA qui invente ses sources"],
    jargon: [
      { term: "Surapprentissage", definition: "le modèle apprend par cœur et échoue sur de nouvelles données" },
      { term: "Hallucination", definition: "réponse d'IA fausse mais formulée avec assurance" },
      { term: "RAG", definition: "l'IA cherche des documents avant de répondre, pour citer ses sources" },
      { term: "Dérive", definition: "les données changent et le modèle devient moins bon" },
    ],
    rituals: ["démo au métier", "revue des expériences", "mise en production", "alerte de dérive"],
    stakeholders: ["métier client", "data engineers", "DPO", "direction"],
  }),
  data_governance: P({
    family: "data_governance", label: "Gouvernance, qualité, conformité des données", scenes: ["headquarters", "lab", "paris"], skin: "corporate", actors: ["clouds", "crowd", "birds"],
    artifacts: {
      good: ["propriétaire : Direction Finance", "base légale : contrat", "durée de conservation : 5 ans", "registre de traitement à jour", "dictionnaire : champ « CA_HT » défini"],
      bad: ["fichier client sans propriétaire", "données de santé dans un tableur partagé", "conservation : illimitée", "modèle d'IA à haut risque sans documentation", "même indicateur, trois définitions"],
    },
    evidence: ["CA (Finance) : 12,4 M€", "CA (Commercial) : 13,1 M€", "CA (Marketing) : 11,9 M€  ← définitions différentes", "table clients : 18 % d'e-mails invalides"],
    kpis: [
      { name: "Taux de qualité", definition: "part des données qui respectent les règles définies" },
      { name: "Couverture du catalogue", definition: "part des données documentées et rattachées à un propriétaire" },
      { name: "Délai de réponse aux demandes RGPD", definition: "temps pour répondre à une personne qui exerce ses droits" },
    ],
    pitfalls: ["donnée sans propriétaire", "indicateur défini différemment selon les équipes", "conservation sans limite", "IA mise en service sans analyse des risques"],
    jargon: [
      { term: "Data owner", definition: "responsable métier d'un ensemble de données" },
      { term: "Lignage", definition: "chemin suivi par une donnée de sa source à son usage" },
      { term: "RGPD", definition: "règlement européen qui protège les données personnelles" },
      { term: "AI Act", definition: "règlement européen qui encadre les systèmes d'IA selon leur risque" },
    ],
    rituals: ["comité data", "audit", "revue du catalogue", "demande d'accès d'une personne"],
    stakeholders: ["DPO", "direction des risques", "data owners", "DSI"],
  }),
  cybersecurity: P({
    family: "cybersecurity", label: "Cybersécurité, SOC", scenes: ["data_center", "rooftops", "underground"], skin: "terminal", actors: ["server_lights", "drone", "satellite"],
    artifacts: {
      good: ["facture fournisseur habituel", "demande d'accès validée manager + RSSI", "mise à jour de sécurité appliquée", "MFA activé"],
      bad: ["« Votre colis est bloqué »", "QR code inconnu", "admin sans validation RSSI", "prestataire parti avec accès actif", "mot de passe Password123!"],
    },
    evidence: ["08:06 sshd: Failed password for root from 185.220.101.7 (x214)", "03:00 sortie réseau 9,8 Go", "m.bernard France 08:12 / Brésil 08:31"],
    kpis: [
      { name: "MTTR", definition: "temps moyen pour résoudre un incident" },
      { name: "Taux de faux positifs", definition: "part des alertes qui ne sont pas de vraies attaques" },
      { name: "SLA", definition: "délai de traitement promis" },
    ],
    pitfalls: ["alerte ignorée parce que trop d'alertes", "accès jamais retirés", "procédure sautée sous la pression"],
    jargon: [
      { term: "Phishing", definition: "faux message qui imite un expéditeur connu pour voler des accès" },
      { term: "SIEM", definition: "outil qui centralise les journaux et lève des alertes" },
      { term: "Moindre privilège", definition: "chacun n'a que les droits nécessaires à son travail" },
    ],
    rituals: ["astreinte", "revue des accès", "exercice de crise", "incident du vendredi soir"],
    stakeholders: ["RSSI", "DSI", "prestataires", "utilisateurs"],
  }),
  supply_chain: P({
    family: "supply_chain", label: "Supply chain, logistique, achats", scenes: ["warehouse", "port", "factory"], skin: "comic", actors: ["truck", "crane", "ship"],
    artifacts: {
      good: ["stock : 120 u, couverture 9 j", "commande PO-4471 livrée à l'heure", "prévision S+2 : 3 400 u", "fournisseur certifié"],
      bad: ["stock négatif : -14", "délai fournisseur : 0 jour", "commande en double", "rupture en rayon depuis 3 jours", "prévision copiée de l'an dernier pendant les soldes"],
    },
    evidence: ["S10 rupture 1,2 %", "S11 rupture 1,4 %", "S12 rupture 9,8 %  ← fournisseur en retard", "entrepôt Lyon : 140 % de capacité"],
    kpis: [
      { name: "OTIF", definition: "part des livraisons à l'heure et complètes" },
      { name: "Taux de rupture", definition: "part des produits indisponibles en rayon" },
      { name: "Couverture de stock", definition: "nombre de jours de ventes que le stock permet de servir" },
    ],
    pitfalls: ["trop de stock qui immobilise de l'argent", "rupture pendant une promotion", "prévision qui ignore la saisonnalité"],
    jargon: [
      { term: "OTIF", definition: "On Time In Full : livré à l'heure et en totalité" },
      { term: "Stock de sécurité", definition: "réserve pour absorber les imprévus" },
      { term: "Lead time", definition: "délai entre la commande et la réception" },
    ],
    rituals: ["réunion S&OP", "inventaire", "pic des soldes", "retard fournisseur"],
    stakeholders: ["acheteurs", "magasins", "transporteurs", "fournisseurs"],
  }),
  finance_control: P({
    family: "finance_control", label: "Finance, comptabilité, contrôle de gestion", scenes: ["trading_floor", "headquarters", "paris"], skin: "corporate", actors: ["ticker", "clouds", "crowd"],
    artifacts: {
      good: ["facture F-2026-118 : 4 800 € HT, bon de commande joint", "écart budget : -2 %", "clôture mensuelle J+5", "rapprochement bancaire OK"],
      bad: ["facture sans bon de commande", "même facture payée deux fois", "RIB fournisseur changé par e-mail", "dépense classée dans le mauvais compte", "provision oubliée"],
    },
    evidence: ["janvier : 1,02 M€", "février : 0,98 M€", "mars : 2,41 M€  ← double comptabilisation", "fournisseur X : 3 factures identiques"],
    kpis: [
      { name: "Écart au budget", definition: "différence entre le prévu et le réalisé" },
      { name: "DSO", definition: "délai moyen d'encaissement des clients" },
      { name: "Délai de clôture", definition: "jours nécessaires pour arrêter les comptes du mois" },
    ],
    pitfalls: ["fraude au changement de RIB", "double paiement", "budget non mis à jour", "charge rattachée au mauvais mois"],
    jargon: [
      { term: "Clôture", definition: "arrêter les comptes d'une période" },
      { term: "Provision", definition: "charge probable enregistrée à l'avance" },
      { term: "Rapprochement bancaire", definition: "vérifier que la comptabilité correspond au relevé de banque" },
    ],
    rituals: ["clôture mensuelle", "revue budgétaire", "audit des comptes", "arbitrage d'investissement"],
    stakeholders: ["DAF", "fournisseurs", "commissaires aux comptes", "managers budgétaires"],
  }),
  hr: P({
    family: "hr", label: "RH, recrutement, paie", scenes: ["headquarters", "plains", "paris"], skin: "comic", actors: ["crowd", "birds", "clouds"],
    artifacts: {
      good: ["candidature complète, compétences alignées", "contrat signé avant l'arrivée", "entretien annuel planifié", "bulletin de paie vérifié"],
      bad: ["annonce avec critère discriminant", "arrivée sans ordinateur ni accès", "heures supplémentaires non payées", "donnée de santé dans un dossier partagé"],
    },
    evidence: ["turnover T1 : 4 %", "turnover T2 : 4 %", "turnover T3 : 15 %  ← une équipe", "délai de recrutement moyen : 48 jours"],
    kpis: [
      { name: "Délai de recrutement", definition: "jours entre l'ouverture du poste et l'arrivée" },
      { name: "Turnover", definition: "part des salariés qui partent sur une période" },
      { name: "Taux d'acceptation des offres", definition: "part des candidats qui acceptent la proposition" },
    ],
    pitfalls: ["critère discriminatoire", "intégration bâclée", "erreur de paie", "silence radio envers les candidats"],
    jargon: [
      { term: "Onboarding", definition: "accueil et intégration d'un nouveau salarié" },
      { term: "Marque employeur", definition: "image de l'entreprise auprès des candidats" },
      { term: "GPEC", definition: "anticiper les compétences dont l'entreprise aura besoin" },
    ],
    rituals: ["comité de recrutement", "campagne d'entretiens annuels", "arrivée du lundi", "clôture de paie"],
    stakeholders: ["managers", "candidats", "salariés", "représentants du personnel"],
  }),
  marketing_growth: P({
    family: "marketing_growth", label: "Marketing, acquisition, CRM", scenes: ["store", "rooftops", "paris"], skin: "arcade", actors: ["crowd", "drone", "ticker"],
    artifacts: {
      good: ["campagne A/B : variante B +12 % de clics", "contact avec consentement", "UTM correctement balisé", "coût d'acquisition sous la cible"],
      bad: ["e-mail envoyé sans consentement", "lien de campagne cassé", "résultat A/B conclu après 2 heures", "budget dépensé sur des robots"],
    },
    evidence: ["CPC lundi 0,42 €", "CPC mardi 0,45 €", "CPC mercredi 3,90 €  ← enchère mal réglée", "taux de désabonnement : 9 %"],
    kpis: [
      { name: "CAC", definition: "coût pour acquérir un client" },
      { name: "Taux de clic", definition: "part des personnes qui cliquent après avoir vu le message" },
      { name: "LTV", definition: "valeur rapportée par un client sur toute sa durée de vie" },
    ],
    pitfalls: ["conclure trop tôt un test A/B", "spammer sa base", "attribuer toutes les ventes au dernier clic"],
    jargon: [
      { term: "Test A/B", definition: "comparer deux versions sur deux groupes pour garder la meilleure" },
      { term: "Funnel", definition: "étapes du parcours, de la découverte à l'achat" },
      { term: "Opt-in", definition: "accord explicite d'une personne pour recevoir des messages" },
    ],
    rituals: ["lancement de campagne", "point performance", "Black Friday", "bilan trimestriel"],
    stakeholders: ["agence", "ventes", "produit", "direction"],
  }),
  product_tech: P({
    family: "product_tech", label: "Produit, développement, QA", scenes: ["space", "rooftops", "lab"], skin: "gameboy", actors: ["rocket", "satellite", "fireflies"],
    artifacts: {
      good: ["ticket avec critères d'acceptation", "tests verts, revue faite", "fonctionnalité derrière un drapeau", "mise en production réversible"],
      bad: ["ticket « faire marcher le truc »", "déploiement le vendredi à 18h sans retour arrière", "mot de passe dans le dépôt", "bug corrigé sans test"],
    },
    evidence: ["v2.3 erreurs 0,2 %", "v2.4 erreurs 0,3 %", "v2.5 erreurs 7,9 %  ← déploiement fautif", "temps de réponse p95 : 2 400 ms"],
    kpis: [
      { name: "Taux d'erreur", definition: "part des requêtes qui échouent" },
      { name: "Lead time", definition: "délai entre l'idée codée et sa mise en production" },
      { name: "Rétention", definition: "part des utilisateurs qui reviennent" },
    ],
    pitfalls: ["périmètre qui gonfle", "dette technique ignorée", "déployer sans pouvoir revenir en arrière"],
    jargon: [
      { term: "Sprint", definition: "cycle court de développement, souvent deux semaines" },
      { term: "MVP", definition: "première version minimale pour apprendre vite" },
      { term: "Rollback", definition: "revenir à la version précédente" },
    ],
    rituals: ["daily", "démo de fin de sprint", "rétrospective", "mise en production"],
    stakeholders: ["product owner", "designers", "utilisateurs", "support"],
  }),
  support_ops: P({
    family: "support_ops", label: "Support, exploitation, relation client", scenes: ["station", "airport", "hospital"], skin: "famicom", actors: ["crowd", "plane_taxi", "ambulance"],
    artifacts: {
      good: ["ticket priorisé P1 avec impact client", "réponse sous 2 h", "procédure suivie", "client rappelé"],
      bad: ["ticket fermé sans réponse", "P1 traité comme P4", "même incident ouvert 5 fois", "promesse impossible au client"],
    },
    evidence: ["tickets lundi : 120", "tickets mardi : 118", "tickets mercredi : 540  ← panne", "satisfaction : 4,6 → 2,1"],
    kpis: [
      { name: "Délai de première réponse", definition: "temps avant la première réponse au client" },
      { name: "CSAT", definition: "satisfaction mesurée après l'échange" },
      { name: "Taux de résolution au premier contact", definition: "part des demandes réglées du premier coup" },
    ],
    pitfalls: ["mauvaise priorisation", "réponses copiées-collées", "incident récurrent jamais analysé"],
    jargon: [
      { term: "Priorité P1", definition: "incident critique qui bloque beaucoup de clients" },
      { term: "Escalade", definition: "transmettre à un niveau plus expert" },
      { term: "Base de connaissances", definition: "réponses documentées pour gagner du temps" },
    ],
    rituals: ["pic du lundi matin", "panne générale", "revue des incidents", "enquête de satisfaction"],
    stakeholders: ["clients", "équipe technique", "managers", "partenaires"],
  }),
  sales: P({
    family: "sales", label: "Commerce, vente, business development", scenes: ["paris", "store", "headquarters"], skin: "arcade", actors: ["crowd", "truck", "clouds"],
    artifacts: {
      good: ["opportunité qualifiée : budget, décideur, besoin, délai", "relance planifiée", "devis validé", "compte rendu dans le CRM"],
      bad: ["opportunité sans décideur", "remise de 40 % non validée", "CRM vide depuis 3 mois", "promesse de fonctionnalité inexistante"],
    },
    evidence: ["pipeline T1 : 1,2 M€", "pipeline T2 : 1,3 M€", "pipeline T3 : 4,8 M€  ← opportunités gonflées", "taux de transformation : 9 %"],
    kpis: [
      { name: "Taux de transformation", definition: "part des opportunités gagnées" },
      { name: "Cycle de vente", definition: "durée entre le premier contact et la signature" },
      { name: "Panier moyen", definition: "montant moyen d'une vente" },
    ],
    pitfalls: ["pipeline surestimé", "remise trop rapide", "oublier de relancer"],
    jargon: [
      { term: "Pipeline", definition: "ensemble des ventes en cours, par étape" },
      { term: "Qualification", definition: "vérifier besoin, budget, décideur et délai" },
      { term: "Churn", definition: "clients perdus sur une période" },
    ],
    rituals: ["prévision du lundi", "rendez-vous client", "négociation", "clôture du trimestre"],
    stakeholders: ["prospects", "avant-vente", "direction commerciale", "juridique"],
  }),
  generic: P({
    family: "generic", label: "Métier général", scenes: ["headquarters", "plains", "paris"], skin: "arcade", actors: ["crowd", "clouds", "birds"],
    artifacts: { good: ["demande claire avec délai", "document validé", "réunion avec ordre du jour"], bad: ["demande floue « pour hier »", "document sans version", "réunion sans décision"] },
    evidence: ["lundi : 12 demandes", "mardi : 14 demandes", "mercredi : 61 demandes  ← lancement"],
    kpis: [{ name: "Délai de traitement", definition: "temps entre la demande et la réponse" }, { name: "Satisfaction", definition: "avis des personnes servies" }],
    pitfalls: ["priorités qui changent sans cesse", "information non partagée"],
    jargon: [{ term: "Livrable", definition: "résultat concret attendu d'une tâche" }],
    rituals: ["réunion d'équipe", "imprévu", "point avec la direction"],
    stakeholders: ["manager", "collègues", "clients internes"],
  }),
};

/** Texte compact d'une bibliothèque, à donner au modèle. */
export function packText(p: DomainPack): string {
  const list = (xs: string[]) => xs.map((x) => `  · ${x}`).join("\n");
  return `BIBLIOTHÈQUE MÉTIER « ${p.label} » (exemples réels, à adapter à l'offre, ne pas recopier mot pour mot)
Documents conformes :
${list(p.artifacts.good)}
Documents piégés :
${list(p.artifacts.bad)}
Indices typiques pour une enquête :
${list(p.evidence)}
Indicateurs : ${p.kpis.map((k) => `${k.name} (${k.definition})`).join(" ; ")}
Erreurs classiques : ${p.pitfalls.join(" ; ")}
Mots du métier : ${p.jargon.map((j) => `${j.term} = ${j.definition}`).join(" ; ")}
Moments de la semaine : ${p.rituals.join(" ; ")}
Interlocuteurs : ${p.stakeholders.join(" ; ")}`;
}
