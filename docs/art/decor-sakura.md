# Sakura Arena

Le seizième lieu, apporté par le développeur dans l'issue #155 (« add Sakura bg ») : un prototype de fond en parallaxe, six bandes d'une illustration de sanctuaire aux cerisiers, avec son GIF d'aperçu. Le prototype n'est pas un jeu de calques de profondeur : son propre README prévient qu'il s'agit de coupes horizontales d'une illustration plate, que la canopée, les bâtiments et les spectateurs traversent les frontières de profondeur, et que de grands mouvements de caméra révéleraient des coutures. Il est donc adapté aux trois calques du jeu, et passé en crépuscule.

## 1. La provenance, et ce qu'on en garde

- **Les sources** : `00_full_reference.png`, `01_sky_canopy.png`, `02_mountains.png`, `03_shrines_waterfalls.png`, `04_spectators.png`, `05_fighting_floor.png`, `06_front_floor.png`, `layers.json`, `README.txt` — une illustration de 1717 × 916, ses facteurs de parallaxe de 0,08 à 1,0, et les effets suggérés (pétales, lanternes, lucioles).
- **Ce qui est gardé** : la composition — le grand cerisier à gauche, le torii à droite et ses lanternes, le mont Fuji, les sanctuaires et la cascade, les spectateurs et leurs bannières, les dalles de pierre.
- **Ce qui est adapté** : l'illustration complète est composée dans les trois calques du jeu, aux tailles imposées ; chaque calque est quantifié à 200 couleurs, puis désaturé et ramené dans la bande des flashs, sans cyan ni magenta vifs.

## 2. La composition, de loin à près

### 2.1 `far`, le fond (25 %)

- L'illustration entière (ciel, canopée, montagnes, sanctuaires), à l'échelle du jeu, centrée.
- Le calque est **opaque partout** : la ligne du sol du dessin (y = 625 de la source) tombe sur la ligne des pieds du jeu (y = 460 de l'image).

### 2.2 `mid`, les sanctuaires et les spectateurs (50 %)

- Les bandes 03 à 06 (sanctuaires, cascade, spectateurs, sol), transparentes au-dessus : le fond se voit à travers la canopée.
- La largeur est étirée de 14 % pour couvrir les 1 440 px du calque ; les bandes restent des coupes horizontales, donc aucun raccord latéral.

### 2.3 `floor`, les dalles (100 %)

- La bande du sol de combat (lignes 625 à 734 de la source), étirée à 1 920 × 80.
- C'est le sol sous les pieds ; la poussière des combats reste celle d'un sol dur.

## 3. La palette

Chaque calque est quantifié à **200 couleurs**, par coupe médiane pondérée par les pixels : les teintes fréquentes gardent leur place. Puis :

- **La désaturation** garde 62 % de la saturation d'origine : l'illustration reste reconnaissable, sans le voile de couleurs vives de la première adaptation ;
- **les teintes vives** à moins de 30° du cyan (185°) ou du magenta (325°) sont tournées de 35° — les combattants les possèdent ;
- **une quantification grossière** (64 couleurs) sert à repérer les **régions** de l'image : le ciel, les montagnes, le sol, les lumières. Chaque région qui couvre 1 % de l'écran ou plus reçoit l'exposition de la bande des flashs : ses couleurs fines se partagent une luminance de 0,0132 à 0,0735, avec un écart local qui garde les nuages, les pierres et les feuilles lisibles. Un petit accent loin au-dessus de sa région — le soleil, une lanterne — garde sa lumière ;
- **une passe finale** ramène toute couleur qui couvre encore 1 % de l'écran, exactement, dans la bande et sous le plafond des mesures de flashs (`#6d3c57`), canal par canal.

Les grandes couleurs du lieu restent ainsi dans la bande des flashs, et les petits accents peuvent briller sans peser sur les mesures.

## 4. Les ambiances

- **Crépuscule, ciel clair** : la seule pour l'instant, celle de l'illustration.
- Les autres viendront quand les découpes seront nettoyées (le README du prototype le recommande).

## 5. Ce qui bouge

- **`petals`** : une rafale de pétales traverse le sanctuaire. Elle est dessinée sur le calque `mid`, en surimpression des calques dessinés à la main : sa première image est transparente, les six suivantes font tomber 40 pétales dans une boîte de 260 × 330 px.
- **Le cycle** : 120 pas d'entrée, 6 images de 20 pas (2 s de chute), 120 pas de sortie, soit 360 pas (6 s). La boîte glisse de −852 à +852 px sur 280 pas : les pétales tombent en traversant le centre de l'écran.
- **Rien d'autre ne bouge** : ni les lanternes, ni la cascade, ni les spectateurs. Les pétales sont la signature du lieu ; les autres effets viendront ensuite.

## 6. L'outil

- `npm run stages` lit les calques dessinés à la main de n'importe quel lieu (`art-src/<lieu>/far.png`, `mid.png`, `floor.png`), aux tailles des calques, vérifiés par `loadStageDrawnFrom`. La rue garde son chemin historique. Un lieu sans dossier `art-src/` reste dessiné par le code.
- Un accessoire du code peut être une **surimpression** (`overlay` dans `tools/stage/kit/stage.ts`) : sa première image est transparente, et il se pose sur le calque dessiné à la main, quel qu'il soit. C'est ainsi que les pétales passent sur Sakura ; les autres accessoires restent coupés dans le dessin du code et laissés de côté quand un calque dessiné à la main ne les porte pas.

## 7. Les budgets

- **Mémoire vidéo** : le fond (2,6 Mo), le milieu (3,1 Mo), le sol (0,6 Mo) et la planche des pétales (2,5 Mo) : 8,9 Mo, sous les 9 Mo d'un lieu.
- **La planche des pétales** : 994 × 642 px, sous les 2 048 px d'une texture.
- Les tests de contrat du lieu vérifient les tailles, l'opacité du fond, la bande des flashs, les teintes cyan/magenta et la présence des pétales.

## 8. La suite

1. Nettoyer les découpes : repeindre les zones occultées derrière les objets, séparer la canopée, les bâtiments, la foule et les lanternes (comme le recommande le README du prototype).
2. Ajouter les autres effets : lanternes qui respirent, lucioles, peut-être une cascade animée.
3. Peindre (ou déduire) les autres ambiances.
