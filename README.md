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
| 3 · Agent | Génération depuis le studio (Gemini, Groq en secours), réparations automatiques, équilibrage de secours | ✅ (première version) |

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
| `GEMINI_API_KEY` | clé gratuite sur https://aistudio.google.com/apikey (modèle par défaut `gemini-flash-latest`, réglable avec `GEMINI_MODEL`) |
| `GROQ_API_KEY` | facultatif, secours : https://console.groq.com/keys (`GROQ_MODEL`, défaut `llama-3.3-70b-versatile`) |
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
