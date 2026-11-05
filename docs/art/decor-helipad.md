# H-02 Helipad

Un nouveau lieu, apporté par le développeur dans l'issue #155 : l'héliport **H-02** sur le toit d'une tour, la ville cyberpunk derrière, la lune, l'hélicoptère et ses lumières. Le nom vient du **H-02** peint sur le mur de la tour.

## 1. La provenance, et ce qu'on garde

- **La source** : `art-src/helipad/source/helipad.gif` (836 × 470, 32 images), le GIF du commentaire. La première image est extraite dans `art-src/helipad/source/helipad.png` : c'est elle qui donne les calques fixes.
- **Ce qui est gardé** : la composition et **toutes les couleurs** — le ciel de nuit, la lune, la ville et ses néons, la tour, la porte H-02, le pont, l'hélicoptère, les lumières et les flaques.
- **Ce qui est adapté** : l'illustration est découpée en **trois calques** (la ville et le ciel, la tour, le pont), puis les zones animées du GIF sont rejouées par-dessus. Les calques sont des **PNG en vraies couleurs** (`rgba`), copiés tels quels par `npm run stages`. **Aucune exposition, aucune désaturation, aucune quantification.**
- **Le sol** : la bande du pont est posée à la ligne des pieds, **opaque dès sa première ligne** : les combattants touchent le sol.

## 2. La composition, de loin à près

### 2.1 `far`, la ville et le ciel (25 %)

- Le ciel, la lune, la ville et ses néons, la tour lointaine et le pont.
- **La tour de gauche est repeinte derrière son calque** : une colonne de ciel propre au-dessus de la ligne des toits, puis un morceau de ville pris à droite (sans hélicoptère ni lune), fondu près du bord et adouci par la brume de nuit. C'est ce qui apparaît quand la caméra va au bout et que la tour glisse.
- Les bords de la couche **reprennent l'image en miroir**, pour que la ville continue au lieu d'étirer une colonne.
- Le calque est **opaque partout**.

### 2.2 `mid`, la tour (50 %)

- **La tour de gauche est découpée** à son contour (le bâtiment, la porte H-02, les tuyaux, les caisses du premier plan) et posée sur un calque transparent.
- Elle glisse à 50 %, la ville à 25 % : la tour prend du volume devant le fond.
- Le calque garde ses pixels d'origine, sans retouche.

### 2.3 `floor`, le pont (100 %)

- La bande du pont, étirée à 1 920 × 80.
- **Opaque dès la première ligne**, sous les pieds.
- C'est le sol sous les pieds ; la poussière des combats reste celle d'un sol dur.

## 3. La qualité et les flashs

- **La source est en 836 × 470**, pour une vue de jeu en 960 × 540 : l'agrandissement est de 1,15 ×, fait au plus proche voisin pour garder le pixel art net, sans lissage ni flou ajouté.
- **Le lieu est hors de l'enveloppe des flashs** : ses néons, sa lune et ses lumières sont plus vifs que les lieux de nuit de référence. Il est dans `FLASH_OUTSIDE_STAGES` (`src/render/stage-view.ts`), comme les autres lieux dessinés à la main. Les tables de flashs des autres lieux ne bougent pas.

## 4. Les ambiances

- **Minuit, ciel clair** : la seule pour l'instant, celle de l'illustration.
- Les autres viendront si le développeur fournit d'autres lumières ; l'image n'est pas recolorée d'office.

## 5. Ce qui bouge

- **L'animation du GIF est rejouée dans le jeu**, pas seulement posée en fond. Les images sont échantillonnées une sur deux (16 images), à 12 pas chacune, soit **192 pas (3,2 s)**, la durée du GIF.
- Cinq régions sont animées :
  - `helicopter` : l'hélicoptère, son rotor et son faisceau ;
  - `smoke-right` et `smoke-left` : la fumée des deux bouches ;
  - `beacon-tower` et `beacon-right` : les deux feux rouges.
- Chaque image ne contient que **les pixels qui changent** par rapport à la première : le fond reste celui du calque, et les raccords sont exacts. La planche est en vraies couleurs, avec transparence.
- **Rien n'est interpolé** : chaque image est posée entière (D23).
- **Aperçu animé** : [previews/helipad.gif](previews/helipad.gif).

## 6. L'outil

- Le lieu est marqué **`rgba: true`** (`tools/stage/kit/stage.ts`) : ses calques sont des PNG en vraies couleurs sous `art-src/helipad/`, et `npm run stages` les copie tels quels.
- `tools/stage/helipad/adapt.ts` génère les trois calques fixes depuis la première image du GIF, avec le découpage de la tour et le fond repeint.
- `art-src/helipad/animation.png` et `tools/stage/helipad/anim.ts` contiennent les animations extraites du GIF : une planche vraie couleur et les boîtes des images. `CodeMap.animations` (même fichier `stage.ts`) fait copier la planche et écrire `props.ts` par `npm run stages`.
- Les grandes couleurs sont mesurées sur une palette grossière de 64 couleurs par calque (pour la documentation et le test du lieu), mais le lieu est exclu de l'enveloppe des flashs.

## 7. Les budgets

- **Mémoire vidéo** : la ville (2,5 Mo), la tour (3,0 Mo), le pont (0,6 Mo) et la planche des animations (2,7 Mo) : **8,7 Mo**, sous les 9 Mo d'un lieu.
- **La planche des animations** : 998 × 704 px, sous les 2 048 px d'une texture.
- **Le GIF d'origine** (5,3 Mo) et son image extraite (0,2 Mo) restent dans `art-src/helipad/source/`, hors des textures chargées par le jeu.

## 8. La suite

1. Ajouter une ambiance de pluie ou de brume seulement si le développeur le demande.
2. Ajouter d'autres régions animées (les lumières de la ville, les flaques) si le rendu le mérite.
3. Garder le GIF et son image extraite comme références pour toute retouche future.
