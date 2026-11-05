# Jungle

Un nouveau lieu, apporté par le développeur dans l'issue #155 : les ruines d'un temple au cœur de la jungle, derrière les cascades, la grande arche de lianes, la tête de pierre tiki, la passerelle de bois et la clairière de terre. Le lieu est adapté aux trois calques du jeu, **avec ses couleurs et sa lumière d'origine**.

## 1. La provenance, et ce qu'on garde

- **La source** : `art-src/jungle/source/jungle-bg.png` (1 672 × 941), l'image du commentaire du 5 novembre. C'est la référence, pas une version retouchée.
- **Ce qui est gardé** : la composition et **toutes les couleurs** — les rayons du soleil, la canopée, les ruines sur la falaise, les cascades, les feuillages, les fleurs rouges, le bois et la terre.
- **Ce qui est adapté** : l'illustration est coupée dans les trois calques du jeu, aux tailles imposées. Les calques sont des **PNG en vraies couleurs** (`rgba`), copiés tels quels par `npm run stages`. **Aucune exposition, aucune désaturation, aucune quantification.**
- **Le sol** : la bande de terre est posée à la ligne des pieds, **opaque dès sa première ligne** : les combattants touchent le sol.

## 2. La composition, de loin à près

### 2.1 `far`, le fond (25 %)

- L'illustration entière : les ruines, les cascades, la jungle, la passerelle et la clairière.
- L'image est centrée à la hauteur du jeu, à l'échelle qui la fait tenir juste dans la vue ; les bords de la couche (vus seulement quand la caméra va au bout) **reprennent l'image en miroir**, pour que la jungle continue au lieu d'étirer une colonne.
- Le calque est **opaque partout**.

### 2.2 `mid`, transparent (50 %)

- **Le calque est entièrement transparent.** Il reste pour les feuilles, à sa parallaxe de 0,5. Aucune bande horizontale : pas de couture, pas de décor qui remonte au-dessus du sol.
- Le fond porte toute l'illustration, d'un seul tenant.

### 2.3 `floor`, la terre (100 %)

- La bande de terre de la clairière, étirée à 1 920 × 80.
- **Opaque dès la première ligne**, sous les pieds.
- C'est le sol sous les pieds ; la poussière des combats reste celle d'un sol dur.

## 3. La palette et les flashs

- **Les couleurs sont celles de l'illustration** : le vert profond de la jungle, le bleu des cascades et du ciel, la pierre grise des ruines, le bois de la passerelle, le rouge des fleurs, la terre chaude.
- **Jungle est un lieu de jour** : ses grandes couleurs sont **au-dessus de la bande des flashs**. Les effets de flashs restent mesurés sur les **lieux de nuit**, et `FIGHT_STAGE_COLORS` exclut Jungle comme Sakura et Dancing Forest (`src/render/stage-view.ts`). Le lieu garde donc sa lumière, et les tables de flashs des autres lieux ne bougent pas.

## 4. Les ambiances

- **Aube, ciel clair** : la seule pour l'instant, celle de l'illustration.
- Les autres viendront si le développeur fournit d'autres lumières ; l'image n'est pas recolorée d'office.

## 5. Ce qui bouge

- **`leaves`** : une chute de **48 feuilles** traverse la clairière, sur le calque `mid` transparent. Elles tournoient, tombent et changent de teinte (lime, vert, or, rouge).
- **Le cycle** : 90 pas d'entrée, 6 images de 20 pas (2 s de chute), 90 pas de sortie, soit 300 pas (5 s). La boîte glisse de −835 à +835 px sur 280 pas : les feuilles tombent en traversant le centre de l'écran.
- **Rien d'autre ne bouge** pour l'instant : les cascades, les rayons et la passerelle sont déjà dans le dessin.

## 6. L'outil

- Le lieu est marqué **`rgba: true`** (`tools/stage/kit/stage.ts`) : ses trois calques sont des PNG en vraies couleurs sous `art-src/jungle/`, et `npm run stages` les copie tels quels. C'est le même mécanisme que Sakura et Dancing Forest.
- Les feuilles sont une **surimpression** (`overlay`) : leur première image est transparente, et elles se posent sur le calque transparent.
- Les grandes couleurs sont mesurées sur une palette grossière de 64 couleurs par calque (pour la documentation et le test du lieu), mais le lieu est exclu de l'enveloppe des flashs.

## 7. Les budgets

- **Mémoire vidéo** : le fond (2,5 Mo), le milieu transparent (3,0 Mo), le sol (0,6 Mo) et la planche des feuilles (2,2 Mo) : 8,2 Mo, sous les 9 Mo d'un lieu.
- **La planche des feuilles** : 847 × 674 px, sous les 2 048 px d'une texture.
- **Le PNG d'origine** (3,0 Mo) reste dans `art-src/jungle/source/`, hors des textures chargées par le jeu.

## 8. La suite

1. Nettoyer la découpe du sol si le développeur veut une texture de terre plus fine.
2. Animer les cascades et les rayons si le développeur le demande.
3. Peindre d'autres ambiances seulement si le développeur les demande.
