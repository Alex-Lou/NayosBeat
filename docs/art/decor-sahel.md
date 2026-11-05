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
`tools/stage/sahel/adapt.ts` la recadre au format 600 × 270 du monde, la **ramène à la grille
2 × 2** de Chinatown (un bloc = un pixel du monde), la quantifie en 64 couleurs et la trame bloc par
bloc.

La route est traitée à part :

- elle commence à la même lumière que le bas du `far`, pour que la couture entre les deux calques
  ne se voie pas ;
- elle s'assombrit et se réchauffe vers le bas, là où se tiennent les combattants ;
- le ciel, le soleil, les ampoules et les couleurs chaudes du marché gardent leur éclat.

Une brume très légère (5 %) passe sur les bâtiments lointains : elle les recule derrière les
combattants sans laver le couchant.

- `far` : 600 × 270 du monde, 1 200 × 540 en pixels, opaque, défile à 25 %.
- `floor` : 960 × 40 du monde, 1 920 × 80 en pixels, la route de terre, défile à 100 %.
- Pas de `mid` : l'illustration est une scène unique, la couche serait vide.

## 3. Les animations

Toutes sont des props `overlay` dessinés sur la même grille 2 × 2, dans
`tools/stage/sahel/index.ts`.

| Prop | Ce qu'il fait | Cycle |
|---|---|---|
| `sun-glow` | le soleil respire derrière la rue | 4 images, 240 pas |
| `string-lights` | la guirlande du marché s'allume en poursuite | 4 images, 120 pas |
| `smoke-left` | la fumée de la cuisine de gauche monte et dérive | 6 images, 240 pas |
| `smoke-right` | celle de droite répond, dans l'autre sens | 6 images, 240 pas |
| `crowd` | la foule d'avant-plan respire, des bras se lèvent | 4 images, 120 pas |
| `laundry` | les ourlets du linge répondent au vent | 4 images, 120 pas |
| `birds` | une nuée traverse le couchant, ailes hautes et basses | 2 images, 20 pas, traversée de 400 pas |
| `lamp-awning` | l'ampoule sous l'auvent respire, avec sa flaque de lumière | 6 images, 270 pas |
| `lamp-street` | le lampadaire du carrefour respire, à son propre rythme | 6 images, 270 pas |
| `lamp-lane` | la petite lampe de la ruelle suit, plus discrète | 6 images, 270 pas |
| `lamp-high` | le grand lampadaire de droite s'allume et s'apaise | 6 images, 270 pas |
| `dust` | la poussière dorée et quelques bouffées roulent sur la route | 5 images, 200 pas |

Les changements sont des images entières, sans interpolation (D23). Les lampes ont chacune leur
phase : elles ne clignotent pas ensemble, et aucune ne produit d'éclair plein écran. Les fumées
montent depuis les toits, contre le ciel, pour rester lisibles sans masquer le centre de la scène.
La nuée d'oiseaux entre et sort par les bords, hors du cadre, pour ne jamais apparaître d'un coup.

## 4. Le branchement

- `tools/stage/maps.ts` ajoute `SAHEL` aux cartes du code.
- `src/art/sahel/index.ts` déclare `STAGE_VARIANTS` depuis les images installées.
- `src/art/stages.ts` ajoute la map à `STAGE_MAPS` : « Lieu », entraînement et tests de budget.
- `src/render/stage-view.ts` ajoute `sahel` à `FLASH_OUTSIDE_STAGES`.
- `tests/tools/stage-sahel.test.ts` vérifie les calques, la grille 2 × 2, l'atmosphère, la map et
  les douze props.

## 5. La clarté et les flashs

Sahel Sunset est un décor de **crépuscule** très lumineux : le soleil, le ciel orangé et les
ampoules dépassent l'enveloppe des décors de minuit. Comme Sakura, Dancing Forest, Jungle,
Chinatown, Sunset Beam et Rust Carnival, il est donc exclu de `FIGHT_STAGE_COLORS` ; les mesures de
flashs restent prises sur les décors de référence (`docs/flashs.md` §3). La route, elle, est assez
sombre et peu saturée pour que les personnages, leurs coups et leurs effets restent lisibles.

## 6. La version vivante

La première version gardait le grain fin de l'illustration (1 pixel pour 1 pixel d'image). Elle
était fidèle, mais à côté des combattants elle se lisait comme un PNG posé derrière eux. Cette
version-ci fait le choix inverse : **un vrai grain de pixel art**, des blocs de 2 × 2 comme
Chinatown, et des animations dessinées dans ce grain.

Ce qui a été ajouté, sans repeindre l'illustration :

- les fumées des cuisines, contre le ciel, pour faire vivre les toits ;
- une foule d'avant-plan, en silhouettes, qui respire et lève quelques bras ;
- une guirlande d'ampoules au-dessus de la rue ;
- des lampes avec halo et flaque de lumière sur la route ;
- la poussière et les oiseaux, déjà là, redessinés dans le grain 2 × 2.

## 7. Choix écartés

- Garder l'image entière en truecolor : elle se lit comme un fond, pas comme un décor de combat.
- Redessiner toute la scène en code : l'illustration porte le détail et la composition ; le code
  ajoute la vie sans les perdre.
- Découper un second plan : la source est une illustration unique, sans calques ; un faux découpage
  aurait créé des raccords.
- Ajouter un calque `mid` : la scène tient sur `far` et `floor`, et la mémoire vidéo reste sous le
  budget.
