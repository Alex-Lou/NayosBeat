# Le décor : Sunset Beam, le bar de plage au coucher du soleil

Statut : map jouable, adaptée de l'illustration fournie par le propriétaire (issue #155,
commentaire `6658248658`). Le décor est en pixel art indexé, détaillé, coloré et éclairé ; son sol
est assombri pour que les combattants restent lisibles.

## 1. L'intention

Un bar de plage à l'heure du coucher du soleil : le DJ et ses enceintes à gauche, le comptoir et ses
lanternes à droite, la foule derrière la corde, la mer et le soleil au centre. Les combattants se
battent sur la terrasse, devant la foule. Le lieu s'appelle **Sunset Beam**.

## 2. L'adaptation

La source est une image RGB de 2172 × 724 (`art-src/sunset/source/sunset.png`). Elle est plus large
que le décor : `tools/stage/sunset/adapt.ts` la recadre au format 600 × 270 du monde, garde son
grain fin (pas de blocs 2 × 2, contrairement à Chinatown) et la quantifie en 64 couleurs avec un
léger tramage.

Le contraste est concentré là où il faut :

- le ciel, le soleil, les néons et les guirlandes gardent leurs couleurs et leur clarté ;
- la terrasse au sol est assombrie et légèrement désaturée pour que les combattants s'en détachent ;
- le fond reste plus sombre et moins saturé que les personnages.

- `far` : 600 × 270 du monde, 1 200 × 540 en pixels, opaque, défile à 25 %.
- `floor` : 960 × 40 du monde, 1 920 × 80 en pixels, la terrasse, défile à 100 %.
- Pas de `mid` : la scène est une illustration unique, la couche serait vide.

## 3. Les animations

Toutes sont des props `overlay` sur `far`, dans `tools/stage/sunset/index.ts`.

| Prop | Ce qu'il fait | Cycle |
|---|---|---|
| `string-lights` | les ampoules des guirlandes respirent, quelques halos | 4 images, 120 pas |
| `torches` | les torches de la foule vacillent | 4 images, 60 pas |
| `equalizer` | l'égaliseur du booth du DJ monte et descend | 6 images, 36 pas |
| `sun-shimmer` | des éclats de lumière traversent le reflet du soleil | 4 images, 96 pas |

Les changements sont des images entières, sans interpolation (D23). Aucune animation ne dépasse le
budget de flashs : les ampoules et les torches sont petites et lentes.

## 4. Le branchement

- `tools/stage/maps.ts` ajoute `SUNSET` aux cartes du code.
- `src/art/sunset/index.ts` déclare `STAGE_VARIANTS` depuis les images installées.
- `src/art/stages.ts` ajoute la map à `STAGE_MAPS` : « Lieu », entraînement et tests de budget.
- `tests/tools/stage-sunset.test.ts` vérifie les calques, l'atmosphère et les quatre props.

## 5. La clarté et les flashs

Sunset Beam est un décor de **crépuscule** très lumineux. Comme Sakura, Dancing Forest et Chinatown,
il est exclu de l'enveloppe des décors de minuit (`FIGHT_STAGE_COLORS`) : les mesures de flashs
restent prises sur les décors sombres, et le décor garde sa lumière. Le sol, lui, est assez sombre
pour que les personnages et leurs effets restent lisibles.

## 6. Choix écartés

- Garder l'image entière en truecolor : trop fine et trop lumineuse à côté des combattants.
- Utiliser des blocs de 2 × 2 comme Chinatown : la demande était justement de garder le détail et la
  clarté de cette illustration.
- Découper un second plan : la source est une illustration unique, sans calques ; un faux découpage
  aurait créé des raccords.
