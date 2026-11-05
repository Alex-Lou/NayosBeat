# H-02 Helipad

Un nouveau lieu, apporté par le développeur dans l'issue #155 : l'héliport **H-02** sur le toit d'une tour, la ville cyberpunk derrière, la lune, l'hélicoptère et ses lumières. Le nom vient du **H-02** peint sur le mur de la tour.

## 1. La provenance, et ce qu'on garde

- **La source** : `art-src/helipad/source/helipad.gif` (836 × 470, 32 images), le GIF du commentaire. La première image, la plus nette, est extraite dans `art-src/helipad/source/helipad.png` : c'est elle qui est adaptée.
- **Ce qui est gardé** : la composition et **toutes les couleurs** — le ciel de nuit, la lune, la ville et ses néons, la tour, la porte H-02, le pont, l'hélicoptère, les lumières et les flaques.
- **Ce qui est adapté** : l'image entière est posée dans les calques du jeu, aux tailles imposées. Les calques sont des **PNG en vraies couleurs** (`rgba`), copiés tels quels par `npm run stages`. **Aucune exposition, aucune désaturation, aucune quantification.**
- **Le sol** : la bande du pont est posée à la ligne des pieds, **opaque dès sa première ligne** : les combattants touchent le sol.

## 2. La composition, de loin à près

### 2.1 `far`, le fond (25 %)

- L'illustration entière : la ville, la lune, la tour, la porte H-02, le pont et l'hélicoptère.
- L'image est centrée à la hauteur du jeu, à l'échelle qui la fait tenir juste dans la vue ; les bords de la couche (vus seulement quand la caméra va au bout) **reprennent l'image en miroir**, pour que la ville continue au lieu d'étirer une colonne.
- Le calque est **opaque partout**.

### 2.2 `mid`, absent

- **Pas de calque du milieu** : l'illustration est une scène unique, et le lieu n'ajoute aucune animation. Cela économise une texture de 3 Mo.

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

- **Rien pour l'instant.** L'hélicoptère, son faisceau, la fumée des bouches et les lumières sont déjà dans le dessin. Le GIF complet reste conservé comme source : ses 32 images pourront servir à une passe animée si le développeur la demande, sans bloquer cette version propre.

## 6. L'outil

- Le lieu est marqué **`rgba: true`** (`tools/stage/kit/stage.ts`) : ses calques sont des PNG en vraies couleurs sous `art-src/helipad/`, et `npm run stages` les copie tels quels. C'est le même mécanisme que Sakura, Dancing Forest, Jungle et Lomé Carnival.
- `noMid: true` : `npm run stages` n'installe pas de calque du milieu, et `writeRgbaStage` le retire aussi des textures vraies couleurs.
- `tools/stage/helipad/adapt.ts` génère le fond et le sol depuis la première image du GIF, avec les bords en miroir.
- Les grandes couleurs sont mesurées sur une palette grossière de 64 couleurs par calque (pour la documentation et le test du lieu), mais le lieu est exclu de l'enveloppe des flashs.

## 7. Les budgets

- **Mémoire vidéo** : le fond (2,5 Mo) et le sol (0,6 Mo) : 3,1 Mo, sous les 9 Mo d'un lieu, sans calque du milieu ni planche d'animations.
- **Le GIF d'origine** (5,3 Mo) et son image extraite (0,2 Mo) restent dans `art-src/helipad/source/`, hors des textures chargées par le jeu.

## 8. La suite

1. Animer l'hélicoptère, la fumée et les lumières à partir du GIF si le développeur le demande.
2. Ajouter une ambiance de pluie ou de brume seulement si le développeur le demande.
3. Garder le GIF et son image extraite comme références pour toute retouche future.
