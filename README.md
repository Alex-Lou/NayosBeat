# NayosBeat

Jeu de combat 2D en pixel art, jouable sur PC et mobile (navigateur).
Plan de production : [docs/PLAN.md](docs/PLAN.md).

## Modes de jeu

- **Contre l'ordinateur** : 3 niveaux (Facile, Normal, Difficile). L'IA réagit avec un délai humain, pare, contre les sauts et enchaîne.
- **2 joueurs** : sur le même appareil (clavier partagé, ou deux manettes).
- **Entraînement** : sans chrono ni KO, vie rechargée, mannequin immobile, qui pare tout ou piloté par l'ordinateur ; affichage des dégâts du dernier combo.

Sensations : étincelles d'impact, tremblement de l'écran sur les gros coups, ralenti et flash sur le KO, sons générés en direct (Web Audio, aucun fichier). Le son se coupe depuis le menu principal (réglage mémorisé sur l'appareil).

Pause : Échap / P, Start à la manette, bouton « II » en tactile. Le jeu se met aussi en pause quand l'onglet est caché, la fenêtre quittée, ou le téléphone verrouillé ou tourné en portrait. À la reprise, les touches utilisées dans le menu n'agissent pas sur le combat.

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
| Prise | J + K | Léger + lourd | X + Y ou RB / R1 | Bouton CHOPE |
| Garde | Maintenir arrière (accroupi pour les coups bas) | | | |

Les manettes sont attribuées dans l'ordre de connexion (1re → joueur 1, 2e → joueur 2).

Les touches de P2 suivent la position physique : `.` et `/` sont les deux touches à gauche du Maj droit (`:` et `!` en AZERTY), `'` est juste au-dessus (`ù` en AZERTY).

### Coups spéciaux

| Coup | Simplifié | Classique |
|---|---|---|
| Spécial neutre (Nayo : onde sonore, Riff : ruée) | S | ↓ ↘ → + L ou H |
| Spécial avant (coup de pied fendu / saut de l'ange) | → + S | — |
| Anti-air invincible (uppercut / genou montant) | ↓ + S | → ↓ ↘ + L ou H |

Les coups légers s'enchaînent sur un autre coup ou un spécial quand ils touchent (ou sont parés), les coups lourds sur un spécial. Les dégâts baissent de 10 % par coup du combo (50 % minimum).

Ajouter `?debug` à l'URL affiche l'overlay de debug et les hurtbox (toujours actif en dev).

Nayo est dessiné (sprites générés par `npm run sprites`, provisoires en attendant les planches définitives) ; Riff reste en boîte grise jusqu'à ses propres sprites. Dans un match miroir, le joueur 2 porte la seconde tenue (techwear gris clair, néon magenta).

## Combat

- Univers **Sound Clash** : **Nayo**, boxeur-DJ (polyvalent : portée, 1000 PV) et **Riff**, b-girl (rushdown : vitesse, 900 PV).
- 10 coups chacun (6 normaux, 3 spéciaux, 1 prise), décrits comme données dans `src/data/fighters/` (un fichier par personnage, les aides communes dans `shared.ts`).
- Coups bas à parer accroupi, coups sautés à parer debout, prise imparable (mais deux prises simultanées s'annulent). Hitstop, pushback, chute au sol si touché en l'air ou balayé.
- Le cœur dit où les coups touchent (`GameState.contacts`, centre du recouvrement des boîtes) : les étincelles et les sons en partent.
- La refonte du combat (v2) suit `docs/combat-v2.md`.
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
| `npm run sprites` | Redessine les planches de sprites (`tools/sprites` → `src/art`) |
| `npm run bench` | Banc de perfs de la simulation (100 000 tics CPU contre CPU) |
| `npm run replays:update` | Réenregistre les hashs des replays dorés (`tests/core/replays`), seulement quand le jeu doit changer |

## Architecture

```
src/
  core/     Simulation pure et déterministe (aucun import Phaser/DOM, vérifié par ESLint)
  ai/       Ordinateur et mannequins, purs et déterministes eux aussi (graine aléatoire)
  art/      Sprites : planches PNG et tables d'animation, vérifiées contre la frame data
  audio/    Effets sonores synthétisés
  app/      Enchaînement des écrans et configuration d'un match
  ui/       Menus et écran titre (HTML par-dessus le jeu)
  data/     Stats des combattants (un fichier par personnage) et des stages (données statiques)
  input/    Clavier, manette, tactile → un masque d'inputs par joueur
  loop/     Pas de temps fixe : convertit les frames d'affichage en ticks de simulation
  render/   Phaser : affichage, mise à l'échelle pixel-perfect, overlay de debug
  main.ts   Point d'entrée
tests/      Tests Vitest, même arborescence que src/
tools/      Générateur de sprites (Node, sans dépendance)
```

Dépendances à sens unique : `app` → `ui`, `render` ; `render` → `art`, `ai`, `input`, `loop`, `data`, `core` ; `art` → `data`, `core` ; `ai` → `data`, `core` ; `data` → `core` ; `core` ne dépend de rien (vérifié par ESLint pour `core`, `data` et `ai`).

## Qualité et sécurité

- TypeScript strict et ESLint avec règles typées (`strictTypeChecked`) ; `core/`, `ai/` et `data/` interdits d'accès au moteur, au DOM, à l'horloge et au hasard non reproductible.
- Replays dorés : des séquences d'entrées scriptées rejouées à chaque test, qui doivent retomber sur le même état final (hash) ; un refactor ne change rien au jeu.
- Pas de fuite : un test vérifie que chaque classe qui écoute la page (entrées, menus) retire tous ses écouteurs à `dispose()`. Pas de dérive de perfs : 10 minutes de jeu CPU contre CPU doivent tenir dans un budget fixe.
- Données des combattants et du stage validées au démarrage (entiers, plages d'images, cohérence des coups).
- Build publié avec une Content-Security-Policy stricte (tout depuis la même origine, aucun script ni style en ligne).
- CI à permissions minimales, actions épinglées par SHA, `npm audit` bloquant, mises à jour hebdomadaires par Dependabot.

Police : [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) (licence SIL OFL 1.1), embarquée via `@fontsource/press-start-2p`.
