# PRESS HIRE

Une offre d'emploi en entrée, un jeu rétro 8-bit en ligne en sortie.

Chaque jeu est une **cartouche** : un fichier JSON qui décrit tout le jeu en données. Une seule application Next.js sur Vercel sert tous les jeux ; publier un jeu revient à enregistrer sa cartouche dans Neon, sans redéployer.

## Où on en est

| Phase | Contenu | État |
| --- | --- | --- |
| 0 · Socle | Monorepo, format de cartouche v0.2, contrôles, app qui lit Neon, scripts | ✅ ce dépôt |
| 1a · Écran titre | 14 décors pixel animés, 7 habillages, météo, heures du jour, galerie `/gallery` | ✅ |
| 1b · Niveaux | Mécaniques `wheel` / `slider` / `triage` / `quiz`, juice, audio, écran de fin | à faire |
| 2 · Publier | Image d'aperçu, `/api/track`, notifications ntfy, `/studio` | à faire |
| 3 · Agent | Graphe LangGraph.js sur GitHub Actions : offre → cartouche → URL | à faire |

## Structure

```
press-hire/
  apps/web/                 Next.js : route /[slug], /gallery, /api/health
  packages/engine/          moteur pixel : décors, acteurs, météo, habillages
  packages/cartridge/       format de cartouche (Zod), règles de contrôle, slugs, tests
  fixtures/cartridges/      cartouches de démo (air-france-fuel-demo.json)
  config/candidate.json     ton profil : nom, liens, preuves (à remplir une fois)
  db/schema.sql             table Neon
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
