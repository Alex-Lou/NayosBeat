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
`tools/stage/sahel/adapt.ts` la recadre au format 600 × 270 du monde et la garde **à la résolution
des combattants** : un pixel d'image pour un pixel d'image, comme leurs sprites. C'est ce qui compte
pour l'harmonie ; les blocs 2 × 2 de la version précédente faisaient un fond deux fois plus gros
que les personnages.

La matière est travaillée pour que l'illustration ne se lise pas comme un PNG :

- un **median 3 × 3** efface le grain photographique et aplati les textures ;
- la palette est ramenée à **32 couleurs**, avec un léger tramage ordonné ;
- le contraste et la saturation sont relevés pour répondre aux combattants ;
- la route commence à la même lumière que le bas du `far`, puis s'assombrit et se réchauffe vers
  les pieds ;
- une brume très légère (5 %) recule les bâtiments lointains.

- `far` : 600 × 270 du monde, 1 200 × 540 en pixels, opaque, défile à 25 %.
- `floor` : 960 × 40 du monde, 1 920 × 80 en pixels, la route de terre, défile à 100 %.
- Pas de `mid` : l'illustration est une scène unique, la couche serait vide.

## 3. Les animations

Toutes sont des props `overlay`, dessinés au même grain que l'illustration, dans
`tools/stage/sahel/index.ts`. Aucun objet nouveau n'est posé sur la scène : ce sont ses propres
lumières, son linge, ses oiseaux et sa poussière qui bougent.

| Prop | Ce qu'il fait | Cycle |
|---|---|---|
| `sun-glow` | le soleil respire derrière la rue | 4 images, 240 pas |
| `laundry` | un reflet chaud parcourt le linge étendu | 4 images, 96 pas |
| `birds` | une nuée traverse le couchant, ailes hautes et basses | 2 images, 20 pas, traversée de 400 pas |
| `lamp-awning` | l'ampoule sous l'auvent respire | 6 images, 270 pas |
| `lamp-street` | le lampadaire du carrefour respire, à son propre rythme | 6 images, 270 pas |
| `lamp-lane` | la petite lampe de la ruelle suit, plus discrète | 6 images, 270 pas |
| `lamp-high` | le grand lampadaire de droite s'allume et s'apaise | 6 images, 270 pas |
| `dust` | la poussière dorée dérive au ras de la route | 5 images, 200 pas |

Les changements sont des images entières, sans interpolation (D23). Les lampes ont chacune leur
phase : elles ne clignotent pas ensemble, et aucune ne produit d'éclair plein écran. La nuée
d'oiseaux entre et sort par les bords, hors du cadre, pour ne jamais apparaître d'un coup.

## 4. Le branchement

- `tools/stage/maps.ts` ajoute `SAHEL` aux cartes du code.
- `src/art/sahel/index.ts` déclare `STAGE_VARIANTS` depuis les images installées.
- `src/art/stages.ts` ajoute la map à `STAGE_MAPS` : « Lieu », entraînement et tests de budget.
- `src/render/stage-view.ts` ajoute `sahel` à `FLASH_OUTSIDE_STAGES`.
- `tests/tools/stage-sahel.test.ts` vérifie les calques, la palette de 32 couleurs, l'atmosphère,
  la map et les huit props.

## 5. La clarté et les flashs

Sahel Sunset est un décor de **crépuscule** très lumineux : le soleil, le ciel orangé et les
ampoules dépassent l'enveloppe des décors de minuit. Comme Sakura, Dancing Forest, Jungle,
Chinatown, Sunset Beam et Rust Carnival, il est donc exclu de `FIGHT_STAGE_COLORS` ; les mesures de
flashs restent prises sur les décors de référence (`docs/flashs.md` §3). La route, elle, est assez
sombre et peu saturée pour que les personnages, leurs coups et leurs effets restent lisibles.

## 6. L'historique des versions

1. **La première version** gardait le grain fin de l'illustration en 64 couleurs. La résolution
   était bonne, mais la matière restait celle d'une image : à côté des combattants, elle se lisait
   comme un PNG posé derrière eux.
2. **La deuxième version** est passée en blocs 2 × 2. Elle a cassé l'effet PNG, mais elle a créé un
   défaut plus grave : un fond deux fois plus gros que les personnages. C'est cette version qui a
   été rejetée.
3. **Cette version-ci** revient à la résolution des combattants et travaille la matière : médian,
   32 couleurs, contraste, tramage. Les animations restent celles de la scène elle-même.

## 7. Choix écartés

- Les blocs 2 × 2 : la différence de résolution avec les personnages était visible, et elle
  primait sur l'effet pixel art.
- Le truecolor : trop fin et trop lumineux à côté des combattants.
- Ajouter de la fumée, une foule d'avant-plan ou une guirlande : ces objets se lisaient comme des
  éléments posés sur l'image et cassaient son harmonie. La vie vient des lumières, du linge, des
  oiseaux et de la poussière déjà présents.
- Découper un second plan : la source est une illustration unique, sans calques ; un faux découpage
  aurait créé des raccords.
