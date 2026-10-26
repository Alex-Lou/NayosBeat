# NayosBeat

Jeu de combat 2D en pixel art, jouable sur PC et mobile (navigateur).
Plan de production : [docs/PLAN.md](docs/PLAN.md).

## Modes de jeu

- **Contre l'ordinateur** : 3 niveaux (Facile, Normal, Difficile). L'IA réagit avec un délai humain, pare, contre les sauts et enchaîne.
- **2 joueurs** : sur le même appareil (clavier partagé, ou deux manettes).
- **Entraînement** : sans chrono ni KO, vie rechargée, mannequin immobile, qui pare tout ou piloté par l'ordinateur ; affichage des dégâts du dernier combo.

Sensations : étincelles d'impact, tremblement de l'écran sur les gros coups, ralenti et flash sur le KO, sons générés en direct (Web Audio, aucun fichier). Le son se coupe depuis le menu principal (réglage mémorisé sur l'appareil).

Pause : Échap / P, Start à la manette, bouton « II » en tactile. Le jeu se met aussi en pause quand l'onglet est caché ou le téléphone verrouillé.

## Jouer en ligne

Chaque mise à jour de `main` est publiée sur GitHub Pages : **https://alex-lou.github.io/NayosBeat/** (PC et mobile, rien à installer).

## Démarrer

Prérequis : Node.js 22+.

```bash
npm install
npm run dev        # serveur local, accessible aussi depuis un téléphone sur le même réseau
```

## Contrôles

| | Joueur 1 | Joueur 2 | Manette (standard) | Mobile (joueur 1) |
|---|---|---|---|---|
| Déplacements | WASD (ZQSD en AZERTY) | Flèches | Croix / stick gauche | Joystick flottant, moitié gauche |
| Saut | W / Espace | ↑ | A / ✕ | Bouton SAUT |
| Accroupi | S | ↓ | Bas | Joystick vers le bas |
| Coup léger | J | Pavé 1 ou `.` | X / □ | Bouton L |
| Coup lourd | K | Pavé 2 ou `/` | Y / △ | Bouton H |
| Spécial | L | Pavé 3 ou `'` | B / ○ | Bouton S |
| Chope | J + K | Léger + lourd | X + Y ou RB / R1 | Bouton CHOPE |
| Garde | Maintenir arrière (accroupi pour les coups bas) | | | |

Les manettes sont attribuées dans l'ordre de connexion (1re → joueur 1, 2e → joueur 2).

Les touches de P2 suivent la position physique : `.` et `/` sont les deux touches à gauche du Maj droit (`:` et `!` en AZERTY), `'` est juste au-dessus (`ù` en AZERTY).

### Coups spéciaux

| Coup | Simplifié | Classique |
|---|---|---|
| Spécial neutre (Polyvalent : onde de choc, Rushdown : ruée) | S | ↓ ↘ → + L ou H |
| Spécial avant (coup de pied fendu / saut de l'ange) | → + S | — |
| Anti-air invincible (uppercut / genou montant) | ↓ + S | → ↓ ↘ + L ou H |

Les coups légers s'enchaînent sur un autre coup ou un spécial quand ils touchent (ou sont parés), les coups lourds sur un spécial. Les dégâts baissent de 10 % par coup du combo (50 % minimum).

Ajouter `?debug` à l'URL affiche l'overlay de debug et les hurtbox (toujours actif en dev).

## Combat

- Deux modèles de combattants : **Polyvalent** (portée, 1000 PV) et **Rushdown** (vitesse, 900 PV).
- 10 coups chacun (6 normaux, 3 spéciaux, 1 chope), décrits comme données dans `src/data/fighters.ts`.
- Coups bas à parer accroupi, coups sautés à parer debout, chope imparable (mais deux chopes simultanées s'annulent). Hitstop, pushback, chute au sol si touché en l'air ou balayé.
- Rounds de 99 s, 2 rounds gagnants, nouveau match automatique.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification des types + build de production dans `dist/` |
| `npm run preview` | Sert le build de production |
| `npm test` | Tests unitaires (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run format` | Prettier |

## Architecture

```
src/
  core/     Simulation pure et déterministe (aucun import Phaser/DOM, vérifié par ESLint)
  ai/       Ordinateur et mannequins, purs et déterministes eux aussi (graine aléatoire)
  audio/    Effets sonores synthétisés
  app/      Enchaînement des écrans et configuration d'un match
  ui/       Menus et écran titre (HTML par-dessus le jeu)
  data/     Stats des combattants et des stages (données statiques)
  input/    Clavier, manette, tactile → un masque d'inputs par joueur
  loop/     Pas de temps fixe : convertit les frames d'affichage en ticks de simulation
  render/   Phaser : affichage, mise à l'échelle pixel-perfect, overlay de debug
  main.ts   Point d'entrée
tests/      Tests Vitest, même arborescence que src/
```

Dépendances à sens unique : `app` → `ui`, `render` ; `render` → `ai`, `input`, `loop`, `data`, `core` ; `ai` → `core` ; `data` → `core` ; `core` ne dépend de rien.

Police : [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) (licence SIL OFL 1.1), embarquée via `@fontsource/press-start-2p`.
