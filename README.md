# PRESS HIRE

Une offre d'emploi en entrée, un jeu rétro 8-bit en ligne en sortie.

Chaque jeu est une **cartouche** : un fichier JSON qui décrit tout le jeu en données. Une seule application Next.js sur Vercel sert tous les jeux ; publier un jeu revient à enregistrer sa cartouche dans Neon, sans redéployer.

## Où on en est

| Phase | Contenu | État |
| --- | --- | --- |
| 0 · Socle | Monorepo, format de cartouche v0.2, contrôles, app qui lit Neon, scripts | ✅ ce dépôt |
| 1a · Écran titre | 15 décors pixel animés, 7 habillages, météo, heures du jour, galerie `/gallery` | ✅ |
| 1b · Niveaux | 9 mécaniques : `wheel` (hasard/adresse), `slider`, `triage`, `quiz`, `dialogue`, et d'arcade `catch` (Kaboom!), `whack` (tape-taupe), `gauge` (jauge de golf), `sequence` (Simon) ; boss à PV, imprévus, sons chiptune, tutoriel et fiche « comment jouer » par niveau, contrôle d'équilibrage | ✅ |
| 2 · Studio | `/studio` : lien d'offre → jeu généré, contrôlé, corrigé → aperçu → publication ; suivi des parties, notifications ntfy, image d'aperçu | ✅ |
| 3 · Agent | Fiche du poste, bibliothèques métier, plan déterministe verbe → mécanique, écriture guidée, relecture par 3 personnages et révision, contrôles et équilibrage, banc d'essai | ✅ |
| 3b · Format v0.4 | Semaine racontée (ouverture, jours, réactions), cartes métier, rebondissements, conséquences réelles des erreurs, étoiles et grades, aide adaptative, rapport de la semaine, grille à partager, inspection (Papers, Please), enquête (Où est Charlie) | ✅ |
| 4 · v0.8 | Mécaniques d'action : `runner` (course, saut façon Canabalt), `shooter` (tir façon Space Invaders), `rhythm` (colonnes en rythme façon Guitar Hero) ; habillages colorés Bonbon et Coucher de soleil ; jingles ; joueurs simulés humains ; alerte « trop dur » issue des vraies parties ; fiche du poste réparée au lieu d'être rejetée ; objectifs impossibles ré-ciblés automatiquement. Le circuit de tuyaux n'est plus proposé aux nouveaux jeux. | ✅ |

## Comment se joue une cartouche

1. **Écran titre** : clic ou Entrée. Le bouton « ? Comment jouer » ouvre le tutoriel (règles générales et programme des niveaux).
2. **Niveaux** dans l'ordre : présentation (personnage, mission du poste, fiche « comment jouer » avec objectif, contrôles et métriques), mécanique, verdict.
   Le bouton « ? » du bandeau rouvre la fiche et met le jeu en pause.
   Raté : blague, retour à l'état du début du niveau, indice après `hintAfterFails` échecs, bouton « passer » après 3 échecs.
3. **Imprévus** tous les deux niveaux, tirés uniquement parmi ceux qui laissent le niveau suivant gagnable.
4. **Boss** (facultatif) : 3 vies, une bonne réponse ou une case favorable = 1 coup.
5. **Fin** : score, missions du poste jouées, texte à partager, rejouer.

Clavier : Entrée/espace pour valider, 1-9 pour répondre ou frapper, ← → pour le tri, le curseur et le panier. Code Konami si la cartouche le prévoit.

Contrôles d'équilibrage (`pnpm validate`) : chaque niveau doit être gagnable en jouant bien et pas déjà gagné avant de jouer ;
les roues et les jauges sont simulées 600 fois avec un joueur moyen (avertissement si moins de 30 % ou plus de 95 % de victoires) ;
pour l'attrape-tout et le tape-alerte, un joueur qui attrape 75 % des bons objets doit gagner.

## Comment l'agent crée un jeu

1. **Lecture de l'offre** (données structurées de la page, sinon texte collé).
2. **Fiche du poste** : missions réelles, chacune avec son verbe d'action, les documents manipulés, la décision, l'indicateur
   et les erreurs de débutant ; outils, jargon, vrai problème à résoudre, ESN ou cabinet (secteur du client final).
3. **Plan varié** (`packages/agent/src/plan.ts`) : tirage pondéré, guidé par le métier et pénalisé par ce qui a servi dans les
   8 derniers jeux du compte (anti-répétition) :
   - un **format narratif** parmi 12 (semaine, nuit blanche, braquage, tournoi, émission de télé, boucle temporelle, survie, enquête,
     speedrun, quête en mondes, premier jour, simulateur), avec ses propres étiquettes de niveaux ;
   - une **mécanique** par niveau parmi 14 (dont DÉFENSE façon tower defense, TUYAUX façon Pipe Mania, CHASSE AUX RISQUES
     façon objets cachés), fidèle au verbe du métier (au moins 2 d'arcade, 1 de réflexion, au plus un quiz, jamais deux fois d'affilée) ;
   - des **entrées** variées : briefing, **embuscade** (ça démarre sans écran) ou **appel entrant** ;
   - des **modificateurs** NES sur 1 à 3 niveaux : turbo, brouillard, miroir, séisme, coupure de courant ;
   - un **boss à 2 ou 3 formes** selon un archétype (hydre, négociateur, saboteur, avalanche, audit final, faux boss, horloge),
     chaque phase avec sa propre mécanique.
4. **Directeur créatif** (étape « pitch ») : trois variantes de plan sont proposées au modèle, qui choisit la plus juste et la plus fun
   et écrit le concept (titre, accroche, running gag, angle et rebondissement de chaque niveau, répliques du boss).
5. **Écriture** guidée par la fiche, le plan, le concept, la **bibliothèque du métier** (`packs.ts`) et la
   **bibliothèque de game design** (voir plus bas). Si le modèle ne respecte pas le plan (mécanique remplacée), on lui redemande.
6. **Contrôles** (schéma, cohérence, simulation de l'équilibrage), corrections automatiques, tours de correction par le modèle.
7. **Relecture** par trois personnages (un praticien du métier, un débutant complet, un joueur exigeant), notes sur 10,
   puis **révision** si une note est sous 7. Les étapes de qualité sautent si la génération dépasse son budget de temps.

### Ce que vérifient les contrôles (v0.8)

- **Gagnable, pas gagné d'avance, pas trop dur** (simulation d'un joueur parfait et d'un joueur moyen).
- **Pas gagnable sans réfléchir** : le moteur rejoue chaque niveau avec des stratégies naïves (tout accepter, taper partout,
  toujours la réponse A, la réponse la plus longue, toujours la première réplique, toujours le minimum ou le maximum,
  ne rien placer…). Si l'une gagne, le niveau est refusé et corrigé : réponses de quiz et répliques réparties automatiquement,
  objectif remonté au-dessus de ce que fait la meilleure stratégie naïve, ou réécriture par le modèle.
- **Joueurs humains simulés** : en arcade (attrape-tout, tape-alerte, course, tir), un joueur dont la réussite baisse avec la cadence
  et qui se trompe parfois doit gagner une partie sur deux ; en réflexion (tri, quiz, inspection, enquête, rythme, chasse), un débutant
  qui trouve 3 réponses sur 4 doit gagner au moins une fois sur quatre (avertissement `balance-hard` sinon).
- **Objectif impossible réparé seul** : si l'objectif d'un niveau ou d'une phase de boss porte sur une variable que la mécanique
  ne fait jamais bouger, l'équilibrage choisit la variable que la mécanique fait le plus monter et fixe l'objectif à 70 % du meilleur score.
- **Fiche du poste tolérante** : une réponse du modèle presque conforme (texte trop long, liste trop longue, objet au lieu de texte…)
  est corrigée au lieu de faire échouer toute la génération.
- **Relecture adversariale** : les relecteurs cherchent les choix sans conséquence, les règles décoratives, les notions jamais jouées.

### Fiche entreprise

Pour une offre d'emploi, l'agent cherche des faits publics sur l'employeur : sa page Wikipédia (en écartant les homonymes)
et la page d'accueil du site officiel quand l'offre la donne. Le jeu en tire 1 à 3 clins d'œil (un produit, un métier, une ville)
et un encart « Clins d'œil à … » en fin de partie, chaque fait avec sa source. Un fait dont la source n'est pas dans la recherche
est supprimé ; sans source fiable, pas de clin d'œil. Jamais d'avis d'employés, jamais de moquerie, jamais de logo.

### Arcade

Écran PRÊT ? / GO ! au début de chaque partie de jeu, décompte des points à chaque niveau, vie bonus (1UP) avant le boss
pour 80 % des étoiles, petites musiques aux moments clés (début, niveau réussi, arrivée du boss, 1UP, game over, record), et **tableau des 10 meilleurs scores de chaque jeu publié** avec 3 initiales (table `scores`,
route `/api/score` ; tes propres parties connectées au studio ne comptent pas).

### Mécaniques d'action (v0.8)

- **Course** (`runner`) : le héros court, ESPACE ou tap pour sauter ; les objets arrivent au sol ou en l'air. On saute pour attraper les bons objets en hauteur et passer au-dessus des pièges au sol.
- **Tir** (`shooter`) : vaisseau en bas, souris ou flèches pour bouger, ESPACE ou tap pour tirer ; on abat les menaces et on épargne les alliés (le tir ami coûte cher).
- **Rythme** (`rhythm`) : les cas tombent en rythme sur une ligne ; on frappe la bonne colonne (D F J K, 1-4 ou tap) au bon moment. La colonne est la bonne réponse métier (par exemple faux positif / surveiller / escalader) et l'explication s'affiche en cas d'erreur.
- Démo : `fixtures/cartridges/demo-action.json` (habillage Bonbon).

Dans le studio, chaque jeu affiche la réussite réelle par niveau ; un niveau tenté au moins 5 fois et réussi moins de 40 % du temps est signalé « trop dur ».

### Bibliothèque de game design (les « fichiers skills » de l'agent)

`packages/agent/design/*.md` contient le savoir-faire du studio, en français, modifiable sans toucher au code :

| Fichier | Contenu |
| --- | --- |
| `role.md` | le rôle (game designer, level designer, scénariste, auteur comique, formateur) et les règles d'or |
| `formats.md` | les 12 formats narratifs : résumé, étiquettes, ouverture, boss, moment troll |
| `mechanics.md` | chaque mécanique : geste du métier, comment la rendre juste, réglages, rebondissements, trolls ; entrées et modificateurs |
| `boss.md` | les archétypes de boss et les règles des phases |
| `humor.md` | la boîte à outils comique et les limites |
| `level-design.md` | le rythme d'un jeu, comment faire apprendre, les réglages de difficulté |

L'agent n'envoie au modèle que les sections utiles au jeu en cours (format choisi, mécaniques du plan, archétype du boss).
Inspirations (reformulées, pas copiées) : [abagames/agentic-gamedev-skills](https://github.com/abagames/agentic-gamedev-skills)
(MIT : stratégies naïves, relecture adversariale, arcadisation) et
[gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) (Apache 2.0 : rythme,
tower defense, casse-têtes).

Après une modification : `pnpm --filter @press-hire/agent design` (les tests vérifient que c'est à jour). Pour ajouter un format
ou un boss, ajouter aussi sa ligne dans `STAGES` / `BOSS_TEMPLATES` de `plan.ts`.

**Banc d'essai** : `pnpm eval` génère un jeu pour chaque offre de `eval/offers/` avec le vrai modèle et affiche notes,
durée, nombre de notions, de rebondissements, de conséquences. À relancer après chaque changement des consignes pour vérifier que l'agent progresse.

## Le studio (générer un jeu depuis le site)

1. Ouvre `https://press-hire.vercel.app/studio` et entre ton mot de passe (`STUDIO_PASSWORD`).
2. **Nouveau jeu** : colle le lien de l'offre. Si le site demande une connexion (APEC…), colle aussi le texte de l'offre.
   Entreprise, poste, décideur visé et consignes sont facultatifs.
3. L'agent écrit le jeu, le passe aux contrôles, demande au modèle de corriger ce qui cloche (2 tours au plus) et règle lui-même
   la difficulté en dernier recours. Le jeu est créé en **brouillon**.
4. **Jouer l'aperçu**, puis **Publier** : tu obtiens l'URL à envoyer. Tableau des jeux : parties lancées, parties finies, dernière partie.

**Publication** : le jeu généré est enregistré dans Neon en brouillon, visible seulement depuis le studio. « Publier » relance les
contrôles stricts et le passe « en ligne » : l'appli lit la base et le sert aussitôt à `/<entreprise-poste-xxxx>`, sans redéploiement.
« Dépublier » le remet en brouillon (le lien renvoie alors une page introuvable).

Notifications ntfy (abonne-toi au sujet `NTFY_TOPIC` dans l'appli ntfy) : quand quelqu'un lance un jeu (une fois toutes les 10 min par jeu)
et quand il le termine. Tes propres parties (connecté au studio) et les robots ne comptent pas.

### Pages du site

`/` accueil · `/demos` jeux de démonstration · `/gallery` décors · `/studio` création et suivi (mot de passe). Les jeux eux-mêmes n'ont pas de barre de navigation.

### Préparé pour un futur SaaS

- table `accounts` (offre de chaque compte) et colonne `owner_id` sur chaque jeu : toutes les requêtes du studio sont filtrées par compte ;
- `apps/web/lib/plans.ts` : offres Propriétaire (toi, sans limite), Gratuit, Pro (générations par mois, jeux en ligne, mention « Fait avec PRESS HIRE », notifications) ;
- table `generations` : chaque génération est journalisée (durée, modèle, succès) pour les quotas et la facturation ;
- `apps/web/lib/session.ts` est le seul endroit à changer pour passer du mot de passe unique à de vrais comptes.

### Variables Vercel

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Neon (déjà réglée) |
| `STUDIO_PASSWORD` | mot de passe du studio, 8 caractères minimum |
| `GEMINI_API_KEY` | 1er choix, gratuit sans carte : https://aistudio.google.com/apikey — `gemini-flash-latest` puis `gemini-flash-lite-latest` (`GEMINI_MODEL`) |
| `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` | 2e choix, gratuit sans carte : Workers AI, 10 000 neurons/jour (environ 500 par jeu avec `@cf/zai-org/glm-4.7-flash`), puis `@cf/openai/gpt-oss-120b` (`CLOUDFLARE_MODEL`) |
| `ZAI_API_KEY` | 3e choix, gratuit : Z.ai `glm-4.7-flash`, une requête à la fois (`ZAI_MODEL`) |
| `QWEN_API_KEY` | facultatif : Alibaba Cloud Model Studio (Singapour), quota gratuit d'environ 1M de jetons par modèle pendant 90 jours, puis payant : régler une alerte de dépense — `qwen-plus` puis `qwen-flash` (`QWEN_MODEL`, `QWEN_BASE_URL`) |
| `GROQ_API_KEY` | conseillé, gratuit sans carte : https://console.groq.com — très rapide, sert à l'analyse et à la relecture (quota gratuit trop petit pour l'écriture) ; `GROQ_TPM` si plan payant |
| `SAMBANOVA_API_KEY` | conseillé, gratuit sans carte : https://cloud.sambanova.ai — DeepSeek-V3.1, gpt-oss-120b, Llama 3.3 70B ; 20 requêtes et 200 000 jetons par jour et par modèle (`SAMBANOVA_MODEL`) |
| `OPENROUTER_API_KEY` | conseillé, gratuit sans carte : https://openrouter.ai/keys — modèles `…:free` (Nemotron 3 Ultra, Gemma 4 par défaut), 50 requêtes/jour au total (`OPENROUTER_MODEL`) |
| `MISTRAL_API_KEY`, `NVIDIA_API_KEY` | facultatifs, en fin de file |
| `LLM_ORDER` | facultatif : ordre des fournisseurs, ex. `gemini,zai,cloudflare,groq` |

Fiabilité : chaque appel est réessayé 2 fois sur surcharge ou quota (attente croissante, `Retry-After` respecté), puis le fournisseur
suivant prend le relais ; un fournisseur tombé passe en fin de file pendant 5 minutes. Chaque fournisseur à petit quota par minute
déclare sa limite : un appel trop gros le saute sans requête (l'écriture d'un jeu pèse environ 30k jetons en entrée), et les petites
étapes passent par lui en priorité pour économiser les quotas de Gemini et Qwen. Le bouton **Tester les modèles** du studio
montre en quelques secondes lesquels répondent.
| `NTFY_TOPIC` | sujet ntfy long et impossible à deviner |
| `PUBLIC_BASE_URL` | `https://press-hire.vercel.app` |

Les tables se mettent à jour toutes seules au premier passage dans le studio (`pnpm db:init` fait la même chose en local).

## Structure

```
press-hire/
  apps/web/                 Next.js : /[slug], /studio, /gallery, /api/track, /api/studio/generate
  packages/agent/           offre → brief (modèle de langue) → cartouche : lecture d'offre, consignes, corrections
  packages/engine/          moteur pixel : décors, acteurs, météo, habillages, roue, sons, score
  packages/cartridge/       format de cartouche (Zod), règles de contrôle, équilibrage, slugs, tests
  fixtures/cartridges/      cartouches de démo (air-france-fuel-demo.json)
  db/schema.ts              tables Neon (idempotent)
  scripts/                  validate, db:init, publish:cartridge
```

## Démarrer en local (PowerShell)

```powershell
cd press-hire
pnpm install
pnpm test
pnpm validate fixtures\cartridges\air-france-fuel-demo.json
pnpm dev
```

Puis ouvre http://localhost:3000/air-france-fuel-demo. Sans base configurée, l'app sert les cartouches de démo.

Le message « Ignored build scripts » de pnpm peut être ignoré.

## Brancher Neon

1. Sur https://console.neon.tech, crée un projet `press-hire` (région Europe, Francfort).
2. Bouton **Connect**, copie la chaîne **pooled**.
3. Crée ton fichier `.env` et colle-la dans `DATABASE_URL` :

```powershell
Copy-Item .env.example .env
notepad .env
pnpm db:init
```

Tu dois lire : `Base prête : table cartridges (0 jeu(x)).`

En local sans Neon, un proxy HTTP compatible Neon devant un Postgres fonctionne aussi : `NEON_FETCH_ENDPOINT=http://localhost:4444/sql`.

## Déployer sur Vercel

1. Pousse le dépôt sur GitHub (dépôt **privé**) :

```powershell
git add .
git commit -m "Phase 0 : socle PRESS HIRE"
git branch -M main
git remote add origin https://github.com/heykelh/press-hire.git
git push -u origin main
```

2. Sur Vercel : **Add New → Project**, importe `press-hire`.
3. **Root Directory** : `apps/web`. Le reste est détecté (Next.js, pnpm).
4. **Environment Variables** : `DATABASE_URL` (la même chaîne), et `PRESS_HIRE_FIXTURES` = `1` pour garder la démo visible.
5. **Deploy**.

**Critère de passage de la phase 0** : `https://<ton-projet>.vercel.app/api/health` répond `"db":"connected"`.

## Publier une cartouche

```powershell
pnpm validate <fichier.json> --strict        # contrôle de publication
pnpm publish:cartridge <fichier.json>        # enregistre dans Neon et affiche l'URL
```

La publication refuse toute cartouche qui contient encore un emplacement `<...>` (lien CV, e-mail, extrait d'offre…). Pour un simple essai de la chaîne :

```powershell
pnpm publish:cartridge fixtures\cartridges\air-france-fuel-demo.json --slug af-demo-test --force
```

## Écrans titre

Chaque cartouche choisit un décor (`titleScreen.scene`), une heure, une météo, 2 à 5 éléments animés et un **habillage** (`design.skin`) :

| Habillage | Rendu | Pour |
| --- | --- | --- |
| `arcade` | lettres multicolores en relief, vignettage CRT | grand public, retail |
| `famicom` | bandeau rouge et crème façon boîte de jeu 80's | transport, industrie, énergie |
| `gameboy` | 4 verts, toute l'image filtrée | startups, produit, mobile |
| `terminal` | phosphore vert, titre tapé au clavier | finance, cybersécurité, infra |
| `synth` | chrome et néon rose | IA, cloud, innovation |
| `corporate` | carte blanche sobre, bouton plein | banque, assurance, santé, public |
| `comic` | contour épais, trame de points, bulles | logistique, agences |

Décors : `airport`, `trading_floor`, `data_center`, `port`, `factory`, `hospital`, `headquarters`, et 7 inspirés des grands jeux NES (techniques de dessin, aucun élément repris) : `plains`, `rooftops`, `underground`, `jungle`, `paris`, `lab`, `space`.

Galerie des 15 exemples : `/gallery`.

## Contrôles d'une cartouche

Le schéma Zod vérifie la forme ; `packages/cartridge/src/lint.ts` vérifie le fond, notamment :

- chaque niveau est rattaché à une exigence de l'offre, chaque exigence obligatoire a un niveau ou une preuve ;
- toutes les variables citées dans les effets et les conditions existent ;
- aucune blague ni pique ne cite l'entreprise ; aucun avis d'employé n'est repris tel quel ;
- intro de niveau ≤ 80 caractères, extrait d'offre ≤ 15 mots ;
- l'écran de fin a un bouton CV et un bouton contact ;
- toute donnée réelle a une source avec URL et une date.
