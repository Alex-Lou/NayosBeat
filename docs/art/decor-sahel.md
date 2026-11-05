# Le décor : Sahel Sunset, la rue du marché au coucher du soleil

Statut : map jouable, adaptée de l'illustration fournie par le propriétaire (issue #155,
commentaire `6660254649`). Le nom **Sahel Sunset** vient du Sahel, la bande de savane au sud du
Sahara, et de la lumière du couchant qui baigne toute la scène.

## 1. L'intention

Une rue de marché africaine à l'heure dorée : les boutiques sous leur auvent de tôle, les habitants
assis devant, les voitures fatiguées, la ligne électrique qui traverse le ciel, l'acacia au-dessus
des toits et le soleil qui descend derrière la colline. Les combattants se battent sur la route de
terre, devant la foule. Le lieu s'appelle **Sahel Sunset** dans le jeu.

## 2. L'adaptation

La source est une image RGB de 1672 × 941 (`art-src/sahel/source/sahel.png`).
`tools/stage/sahel/adapt.ts` la recadre au format 600 × 270 du monde, garde son grain fin (pas de
blocs 2 × 2), la quantifie en 64 couleurs avec un léger tramage et assombrit la route sous les
pieds pour que les combattants restent lisibles. Le ciel, le soleil, les ampoules et les couleurs
chaudes du marché gardent leur éclat.

- `far` : 600 × 270 du monde, 1 200 × 540 en pixels, opaque, défile à 25 %.
- `floor` : 960 × 40 du monde, 1 920 × 80 en pixels, la route de terre, défile à 100 %.
- Pas de `mid` : l'illustration est une scène unique, la couche serait vide.

## 3. Les animations

Toutes sont des props `overlay`, dans `tools/stage/sahel/index.ts`.

| Prop | Ce qu'il fait | Cycle |
|---|---|---|
| `lamp-awning` | l'ampoule sous l'auvent respire | 6 images, 270 pas |
| `lamp-street` | le lampadaire du carrefour respire, à son propre rythme | 6 images, 270 pas |
| `lamp-lane` | la petite lampe de la ruelle suit, plus discrète | 6 images, 270 pas |
| `lamp-high` | le grand lampadaire de droite s'allume et s'apaise | 6 images, 270 pas |
| `laundry` | un reflet chaud parcourt le linge étendu, au vent | 4 images, 96 pas |
| `birds` | une petite nuée traverse le couchant, ailes hautes et basses | 2 images, 20 pas, traversée de 400 pas |
| `dust` | la poussière dorée dérive au ras de la route | 5 images, 200 pas |

Les changements sont des images entières, sans interpolation (D23). Les lampes ont chacune leur
phase : elles ne clignotent pas ensemble, et aucune ne produit d'éclair plein écran. La nuée
d'oiseaux entre et sort par les bords, hors du cadre, pour ne jamais apparaître d'un coup.

## 4. Le branchement

- `tools/stage/maps.ts` ajoute `SAHEL` aux cartes du code.
- `src/art/sahel/index.ts` déclare `STAGE_VARIANTS` depuis les images installées.
- `src/art/stages.ts` ajoute la map à `STAGE_MAPS` : « Lieu », entraînement et tests de budget.
- `src/render/stage-view.ts` ajoute `sahel` à `FLASH_OUTSIDE_STAGES`.
- `tests/tools/stage-sahel.test.ts` vérifie les calques, l'atmosphère, la map et les sept props.

## 5. La clarté et les flashs

Sahel Sunset est un décor de **crépuscule** très lumineux : le soleil, le ciel orangé et les
ampoules dépassent l'enveloppe des décors de minuit. Comme Sakura, Dancing Forest, Jungle,
Chinatown, Sunset Beam et Rust Carnival, il est donc exclu de `FIGHT_STAGE_COLORS` ; les mesures de
flashs restent prises sur les décors de référence (`docs/flashs.md` §3). La route, elle, est assez
sombre et peu saturée pour que les personnages, leurs coups et leurs effets restent lisibles.

## 6. Choix écartés

- Garder l'image entière en truecolor : trop fine et trop lumineuse à côté des combattants.
- Utiliser des blocs de 2 × 2 : la demande était de garder le détail, les couleurs et la clarté de
  cette illustration.
- Découper un second plan : la source est une illustration unique, sans calques ; un faux découpage
  aurait créé des raccords.
- Animer la fumée des cuisines : rien dans l'image ne la motive, et une fumée ajoutée aurait
  demandé de redessiner les toits pour rester crédible.
