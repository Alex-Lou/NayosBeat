# Le décor : Rust Carnival, le parc abandonné sous l'orage

Statut : map jouable, adaptée de l'illustration fournie par le propriétaire (issue #155,
commentaire `6659084817`). Le nom **Rust Carnival** vient de la grande roue rouillée, du carrousel
éteint et du clown néon qui grésille encore.

## 1. L'intention

Un parc d'attractions abandonné, la nuit, sous un orage : la grande roue et ses ampoules, le
carrousel, la tente de cirque, les baraques foraines, le clown néon et une foule de silhouettes
derrière les barrières. Les combattants se battent sur l'asphalte fissuré du terre-plein. Le lieu
s'appelle **Rust Carnival** dans le jeu.

## 2. L'adaptation

L'image source est une image RGB de 1672 × 941 (`art-src/carnival/source/carnival.png`).
`tools/stage/carnival/adapt.ts` la recadre au format 600 × 270 du monde, garde le grain fin de
l'illustration (pas de blocs 2 × 2), la quantifie en 64 couleurs et assombrit l'asphalte sous les
pieds pour que les combattants restent lisibles. Le ciel, la lune et les néons gardent leur éclat.

- `far` : 600 × 270 du monde, 1 200 × 540 en pixels, opaque, défile à 25 %.
- `floor` : 960 × 40 du monde, 1 920 × 80 en pixels, l'asphalte, défile à 100 %.
- Pas de `mid` : l'illustration est une scène unique, la couche serait vide.

## 3. Les animations

Toutes sont des props `overlay`, dans `tools/stage/carnival/index.ts`.

| Prop | Ce qu'il fait | Cycle |
|---|---|---|
| `ferris-lights` | les ampoules de la grande roue poursuivent leur tour | 6 images, 60 pas |
| `storm` | un éclair bleu traverse le ciel et s'éteint | 3 images, une rafale toutes les ~10 s |
| `carousel` | les petites lumières du carrousel s'allument en décalé | 4 images, 60 pas |
| `puddles` | les flaques de l'asphalte renvoient des éclats | 4 images, 120 pas |

Les changements sont des images entières, sans interpolation (D23). L'éclair est localisé et bref ;
il ne crée pas de clignotement plein écran.

## 4. Le branchement

- `tools/stage/maps.ts` ajoute `CARNIVAL` aux cartes du code.
- `src/art/carnival/index.ts` déclare `STAGE_VARIANTS` depuis les images installées.
- `src/art/stages.ts` ajoute la map à `STAGE_MAPS` : « Lieu », entraînement et tests de budget.
- `tests/tools/stage-carnival.test.ts` vérifie les calques, l'atmosphère et les quatre props.

## 5. La clarté et les flashs

Rust Carnival est une scène de nuit très contrastée : lune, néons et ampoules dépassent l'enveloppe
des décors de minuit. Comme Sakura, Dancing Forest, Chinatown, Sunset Beam et les décors HD de Dock,
Rooftop et Temple, elle est donc exclue de `FIGHT_STAGE_COLORS` ; les mesures de flashs restent
prises sur les décors de référence (`docs/flashs.md` §3). L'asphalte, lui, est assombri pour la
lisibilité des combattants.

## 6. Choix écartés

- Garder l'image entière en truecolor : trop fine et trop lumineuse à côté des combattants.
- Utiliser des blocs de 2 × 2 : la demande était de garder le détail et les lumières de cette
  illustration.
- Faire tourner la grande roue : les cabines et les silent-blocks de l'image ne s'y prêtent pas sans
  redessiner la structure ; les ampoules qui poursuivent leur tour suffisent.
