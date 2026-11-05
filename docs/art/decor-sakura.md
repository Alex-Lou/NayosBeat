# Sakura Arena

Le seizième lieu, apporté par le développeur dans l'issue #155 (« add Sakura bg ») : le prototype de fond en parallaxe et son GIF animé, l'illustration du sanctuaire aux cerisiers au coucher du soleil. Le prototype n'est pas un jeu de calques de profondeur (son README prévient : ce sont des coupes horizontales d'une illustration plate) ; il est adapté aux trois calques du jeu, **avec ses couleurs et sa lumière d'origine**.

## 1. La provenance, et ce qu'on garde

- **Les sources** : `00_full_reference.png` (1717 × 916), les six bandes, `layers.json`, `README.txt`, et le GIF animé du commentaire du 5 novembre. L'illustration complète est conservée dans `art-src/sakura/source/` : c'est la référence, pas une version retouchée.
- **Ce qui est gardé** : la composition et **toutes les couleurs** — le grand cerisier, le torii et ses lanternes, le mont Fuji, les sanctuaires et la cascade, les spectateurs, les dalles de pierre, le soleil couchant.
- **Ce qui est adapté** : l'illustration est coupée dans les trois calques du jeu, aux tailles imposées. Les calques sont des **PNG en vraies couleurs** (`rgba`), copiés tels quels par `npm run stages`. **Aucune exposition, aucune désaturation, aucune quantification.**
- **Le sol** : la bande du sentier est posée à la ligne des pieds, **opaque dès sa première ligne** : les combattants touchent le sol.

## 2. La composition, de loin à près

### 2.1 `far`, le fond (25 %)

- L'illustration entière, lumineuse : le ciel du couchant, la canopée, les montagnes, les sanctuaires.
- Le calque est **opaque partout** : la ligne du sol du dessin (y = 625 de la source) tombe sur la ligne des pieds du jeu (y = 460 de l'image).

### 2.2 `mid`, transparent (50 %)

- **Le calque est entièrement transparent.** Il reste pour les pétales, à sa parallaxe de 0,5. La bande horizontale du prototype est retirée : c'était elle qui faisait la couture visible.
- Le fond porte toute l'illustration, d'un seul tenant.

### 2.3 `floor`, les dalles (100 %)

- La bande du sol de combat (lignes 625 à 734 de la source), étirée à 1 920 × 80.
- **Opaque dès la première ligne**, sous les pieds ; aucune ligne dure, aucune transparence au sol.
- C'est le sol sous les pieds ; la poussière des combats reste celle d'un sol dur.

## 3. La palette et les flashs

- **Les couleurs sont celles de l'illustration** : le couchant rose et or, les verts sombres, les lanternes chaudes. Aucune retouche.
- **Sakura est le lieu de jour** : ses grandes couleurs (le ciel, le soleil) sont **au-dessus de la bande des flashs**. C'est une décision du développeur : les effets de flashs restent mesurés sur les **lieux de nuit**, et `FIGHT_STAGE_COLORS` exclut Sakura (`src/render/stage-view.ts`). Le lieu garde donc sa lumière, et les tables de flashs des autres lieux ne bougent pas.
- Les pétales et les petites lumières restent des touches.

## 4. Les ambiances

- **Crépuscule, ciel clair** : la seule pour l'instant, celle de l'illustration.
- Les autres viendront quand les découpes seront nettoyées (le README du prototype le recommande).

## 5. Ce qui bouge

- **`petals`** : une rafale de **56 pétales** traverse le sanctuaire, sur le calque `mid` transparent.
- **Le cycle** : 90 pas d'entrée, 6 images de 20 pas (2 s de chute), 90 pas de sortie, soit 300 pas (5 s). La boîte glisse de −852 à +852 px sur 280 pas : les pétales tombent en traversant le centre de l'écran.
- **Rien d'autre ne bouge** pour l'instant ; les lanternes du dessin sont déjà allumées.

## 6. L'outil

- Un lieu peut être marqué **`rgba: true`** (`tools/stage/kit/stage.ts`) : ses trois calques sont des PNG en vraies couleurs sous `art-src/<lieu>/`, et `npm run stages` les copie tels quels. C'est le cas de Sakura.
- Les pétales sont une **surimpression** (`overlay`) : leur première image est transparente, et ils se posent sur le calque transparent.
- Les grandes couleurs sont mesurées sur une palette grossière de 64 couleurs par calque (pour la documentation et le test du lieu), mais le lieu est exclu de l'enveloppe des flashs.

## 7. Les budgets

- **Mémoire vidéo** : le fond (2,5 Mo), le milieu transparent (3,0 Mo), le sol (0,6 Mo) et la planche des pétales (2,5 Mo) : 8,6 Mo, sous les 9 Mo d'un lieu.
- **La planche des pétales** : 1 019 × 645 px, sous les 2 048 px d'une texture.
- **Le PNG d'origine** (3,5 Mo) reste dans `art-src/sakura/source/`, hors des textures chargées par le jeu.

## 8. La suite

1. Nettoyer les découpes : repeindre les zones occultées derrière les objets, séparer la canopée, les bâtiments, la foule et les lanternes (comme le recommande le README du prototype).
2. Ajouter les effets : lanternes qui respirent, lucioles, peut-être une cascade animée.
3. Peindre (ou déduire) les autres ambiances.
