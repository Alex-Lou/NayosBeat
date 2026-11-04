# Sakura Arena

Le seizième lieu, apporté par le développeur dans l'issue #155 (« add Sakura bg ») : un prototype de fond en parallaxe, six bandes d'une illustration de sanctuaire aux cerisiers, avec son GIF d'aperçu. Le prototype n'est pas un jeu de calques de profondeur : son propre README prévient qu'il s'agit de coupes horizontales d'une illustration plate, que la canopée, les bâtiments et les spectateurs traversent les frontières de profondeur, et que de grands mouvements de caméra révéleraient des coutures. Il est donc adapté aux trois calques du jeu, et passé en crépuscule.

## 1. La provenance, et ce qu'on en garde

- **Les sources** : `00_full_reference.png`, `01_sky_canopy.png`, `02_mountains.png`, `03_shrines_waterfalls.png`, `04_spectators.png`, `05_fighting_floor.png`, `06_front_floor.png`, `layers.json`, `README.txt` — six images de 1717 × 916, leurs facteurs de parallaxe de 0,08 à 1,0, et les effets suggérés (pétales, lanternes, lucioles).
- **Ce qui est gardé** : la composition — le grand cerisier à gauche, le torii à droite et ses lanternes, le mont Fuji, les sanctuaires et la cascade, les spectateurs et leurs bannières, les dalles de pierre.
- **Ce qui est adapté** : les bandes sont composées dans les trois calques du jeu, aux tailles imposées ; la palette est quantifiée à 256 couleurs, puis passée en crépuscule pour tenir dans la bande des flashs, sans cyan ni magenta vifs.

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

La palette est celle de l'illustration, quantifiée (200 couleurs) puis graduée :

- toute couleur vive à moins de 25° du cyan (185°) ou du magenta (325°) est désaturée — les combattants les possèdent ;
- toute couleur est ramenée sous la bande des flashs (luminance 0,078 au plus, canaux sous le plafond des mesures) ;
- aucune grande couleur n'est plus sombre que le ciel de la boîte grise (luminance 0,0122 au moins), sinon les flashs changeraient plus sur ce fond que sur les autres.

## 4. Les ambiances

- **Crépuscule, ciel clair** : la seule pour l'instant, celle de l'illustration.
- Les autres viendront quand les découpes seront nettoyées (le README du prototype le recommande) et que l'outil saura recolorer une palette dessinée à la main.

## 5. Ce qui bouge

Rien pour l'instant : la planche d'animations est vide. Les effets suggérés par le prototype — pétales, lanternes, lucioles — viendront ensuite, avec le nettoyage des découpes.

## 6. L'outil

`npm run stages` lit désormais **les calques dessinés à la main de n'importe quel lieu** : `art-src/<lieu>/far.png`, `mid.png` et `floor.png`, aux tailles des calques, vérifiés par `loadStageDrawnFrom`. La rue garde son chemin historique. Un lieu sans dossier `art-src/` reste dessiné par le code.

## 7. Les budgets

- Mémoire vidéo : le fond (2,6 Mo), le milieu (3,1 Mo) et le sol (0,6 Mo), sans planche d'animations — sous 9 Mo.
- Les tests de contrat du lieu vérifient les tailles, l'opacité du fond, la bande des flashs et les teintes cyan/magenta.

## 8. La suite

1. Nettoyer les découpes : repeindre les zones occultées derrière les objets, séparer la canopée, les bâtiments, la foule et les lanternes (comme le recommande le README du prototype).
2. Ajouter les effets : pétales qui tombent, lanternes qui respirent, lucioles.
3. Peindre (ou déduire) les autres ambiances.
