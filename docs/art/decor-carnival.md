# Lomé Carnival

La map **Lomé Carnival** reprend l'illustration fournie par le développeur dans l'issue #155, commentaire `6659084817` : le parc d'attractions abandonné, la grande roue, le carrousel, les baraques foraines, le clown néon et l'orage. Elle remplace l'ancienne version « Rust Carnival », qui recadrait et zoomait l'image ; ici, **toute l'illustration** est gardée, avec ses couleurs d'origine.

## 1. La provenance, et ce qu'on garde

- **La source** : `art-src/carnival/source/carnival.png` (1 672 × 941), l'image du commentaire du 5 novembre. C'est la référence, pas une version retouchée.
- **Ce qui est gardé** : la composition et **toutes les couleurs** — la nuit d'orage, la lune, les nuages, les néons, la grande roue, le carrousel, le clown, la foule et l'asphalte mouillé.
- **Ce qui est adapté** : l'illustration est posée entière dans les calques du jeu, aux tailles imposées. Les calques sont des **PNG en vraies couleurs** (`rgba`), copiés tels quels par `npm run stages`. **Aucune exposition, aucune désaturation, aucune quantification, aucun assombrissement du sol.**
- **Le sol** : la bande d'asphalte est posée à la ligne des pieds, **opaque dès sa première ligne** : les combattants touchent le sol.

## 2. La composition, de loin à près

### 2.1 `far`, le fond (25 %)

- L'illustration entière : le ciel, la lune, l'orage, la grande roue, les tentes, le carrousel et les façades.
- L'image est centrée à la hauteur du jeu, à l'échelle qui la fait tenir juste dans la vue ; les bords de la couche (vus seulement quand la caméra va au bout) **reprennent l'image en miroir**, pour que le parc continue au lieu d'étirer une colonne.
- Le calque est **opaque partout**.

### 2.2 `mid`, absent

- **Pas de calque du milieu** : l'illustration est une scène unique, et les animations se posent sur le fond et le sol. Cela économise une texture de 3 Mo.
- Les props sont des **surimpressions** (`overlay`) : leur première image est transparente, et elles se posent sur le décor.

### 2.3 `floor`, l'asphalte (100 %)

- La bande d'asphalte de la clairière, étirée à 1 920 × 80.
- **Opaque dès la première ligne**, sous les pieds.
- C'est le sol sous les pieds ; la poussière des combats reste celle d'un sol dur.

## 3. Le nom et les flashs

- **Lomé Carnival** : un nom africain qui situe le carnaval abandonné, sans changer l'image. C'est le titre affiché dans « Lieu ».
- **Le lieu est hors de l'enveloppe des flashs** : ses néons, sa lune et ses lumières sont plus vifs que les lieux de nuit de référence. Il est dans `FLASH_OUTSIDE_STAGES` (`src/render/stage-view.ts`), comme Sakura, Dancing Forest, Jungle, Chinatown, Sunset Beam, Dock, Rooftop et Temple. Les tables de flashs des autres lieux ne bougent pas.

## 4. Les ambiances

- **Minuit, ciel clair** : la seule pour l'instant, celle de l'illustration.
- Les autres viendront si le développeur fournit d'autres lumières ; l'image n'est pas recolorée d'office.

## 5. Ce qui bouge

| Prop | Ce qu'il fait | Cycle |
| --- | --- | --- |
| `ferris-lights` | les ampoules de la grande roue poursuivent leur tour | 6 images, 60 pas |
| `carousel` | les petites lumières du carrousel s'allument en décalé | 4 images, 120 pas |
| `puddles` | les flaques de l'asphalte renvoient des éclats | 4 images, 120 pas |

- **L'orage reste celui du dessin** : l'éclair et la lune sont déjà dans l'illustration, aucun éclair supplémentaire n'est ajouté.
- Les changements sont des images entières, sans interpolation (D23).

## 6. L'outil

- Le lieu est marqué **`rgba: true`** (`tools/stage/kit/stage.ts`) : ses calques sont des PNG en vraies couleurs sous `art-src/carnival/`, et `npm run stages` les copie tels quels. C'est le même mécanisme que Sakura, Dancing Forest et Jungle.
- `noMid: true` : `npm run stages` n'installe pas de calque du milieu, et `writeRgbaStage` le retire aussi des textures vraies couleurs.
- `tools/stage/carnival/adapt.ts` génère le fond et le sol depuis la source, avec les bords en miroir.
- Les grandes couleurs sont mesurées sur une palette grossière de 64 couleurs par calque (pour la documentation et le test du lieu), mais le lieu est exclu de l'enveloppe des flashs.

## 7. Les budgets

- **Mémoire vidéo** : le fond (2,5 Mo), le sol (0,6 Mo) et la planche des animations (3,3 Mo) : 6,4 Mo, sous les 9 Mo d'un lieu, et sans calque du milieu.
- **La planche des animations** : 1 000 × 874 px, sous les 2 048 px d'une texture.
- **Le PNG d'origine** (3,0 Mo) reste dans `art-src/carnival/source/`, hors des textures chargées par le jeu.

## 8. La suite

1. Ajouter une ambiance de pluie ou de brume seulement si le développeur le demande.
2. Aligner encore les ampoules de la grande roue si un décalage se voit en jeu.
3. Garder l'image d'origine comme référence pour toute retouche future.
