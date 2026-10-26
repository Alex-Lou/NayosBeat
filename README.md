# NayosBeat

Jeu de combat 2D en pixel art, jouable sur PC et mobile (navigateur).
Plan de production : [docs/PLAN.md](docs/PLAN.md).

## Démarrer

Prérequis : Node.js 22+.

```bash
npm install
npm run dev        # serveur local, accessible aussi depuis un téléphone sur le même réseau
```

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
  loop/     Pas de temps fixe : convertit les frames d'affichage en ticks de simulation
  render/   Phaser : affichage, mise à l'échelle pixel-perfect, overlay de debug
  main.ts   Point d'entrée
tests/      Tests Vitest, même arborescence que src/
```

Dépendances à sens unique : `render` → `loop`, `core` ; `core` ne dépend de rien.
