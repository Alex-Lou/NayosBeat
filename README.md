# NayosBeat

Jeu de combat 2D en pixel art, jouable sur PC et mobile (navigateur).
Plan de production : [docs/PLAN.md](docs/PLAN.md).

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

Les manettes sont attribuées dans l'ordre de connexion (1re → joueur 1, 2e → joueur 2).

Ajouter `?debug` à l'URL affiche l'overlay de debug en production (toujours actif en dev).

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
  data/     Stats des combattants et des stages (données statiques)
  input/    Clavier, manette, tactile → un masque d'inputs par joueur
  loop/     Pas de temps fixe : convertit les frames d'affichage en ticks de simulation
  render/   Phaser : affichage, mise à l'échelle pixel-perfect, overlay de debug
  main.ts   Point d'entrée
tests/      Tests Vitest, même arborescence que src/
```

Dépendances à sens unique : `render` → `input`, `loop`, `data`, `core` ; `data` → `core` ; `core` ne dépend de rien.
