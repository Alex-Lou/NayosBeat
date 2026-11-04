# Sakura Arena

Le seizième lieu, apporté par le développeur dans l'issue #155 (« add Sakura bg ») : un prototype de fond en parallaxe, six bandes d'une illustration de sanctuaire aux cerisiers, avec son GIF d'aperçu. Le prototype n'est pas un jeu de calques de profondeur : son propre README prévient qu'il s'agit de coupes horizontales d'une illustration plate, que la canopée, les bâtiments et les spectateurs traversent les frontières de profondeur, et que de grands mouvements de caméra révéleraient des coutures. Il est adapté aux trois calques du jeu, **sans perdre le PNG d'origine** : les calques restent en vraies couleurs, et seule l'exposition baisse pour entrer dans la bande des flashs.

## 1. La provenance, et ce qu'on en garde

- **Les sources** : `00_full_reference.png`, `01_sky_canopy.png`, `02_mountains.png`, `03_shrines_waterfalls.png`, `04_spectators.png`, `05_fighting_floor.png`, `06_front_floor.png`, `layers.json`, `README.txt` — une illustration de 1717 × 916, ses facteurs de parallaxe de 0,08 à 1,0, et les effets suggérés (pétales, lanternes, lucioles). L'illustration complète est conservée dans `art-src/sakura/source/` : c'est la référence, pas une version retouchée.
- **Ce qui est gardé** : la composition et **les couleurs d'origine** — le grand cerisier à gauche, le torii à droite et ses lanternes, le mont Fuji, les sanctuaires et la cascade, les spectateurs et leurs bannières, les dalles de pierre.
- **Ce qui est adapté** : l'illustration est coupée dans les trois calques du jeu, aux tailles imposées. Les calques sont des **PNG en vraies couleurs** (`rgba`), copiés tels quels par `npm run stages` : aucune palette indexée, aucune désaturation, aucun virage de teinte. Ils sont échantillonnés au **plus proche voisin**, pour garder le piqué du PNG. Seule l'exposition est baissée, par une courbe globale, jusqu'à ce que les grandes régions entrent dans la bande des flashs.

## 2. La composition, de loin à près

### 2.1 `far`, le fond (25 %)

- L'illustration entière (ciel, canopée, montagnes, sanctuaires), à l'échelle du jeu, centrée.
- Le calque est **opaque partout** : la ligne du sol du dessin (y = 625 de la source) tombe sur la ligne des pieds du jeu (y = 460 de l'image).

### 2.2 `mid`, transparent (50 %)

- **La bande du milieu est retirée.** C'était elle qui portait la découpe horizontale : son bord supérieur suivait son parallaxe et se voyait comme une couture. Le calque reste, **entièrement transparent**, pour les pétales qui tombent à sa parallaxe.
- Le fond porte donc toute l'illustration, d'un seul tenant.

### 2.3 `floor`, les dalles (100 %)

- La bande du sol de combat (lignes 625 à 734 de la source), étirée à 1 920 × 80.
- **Son bord supérieur (12 px) se fond dans le fond** : plus de ligne dure au sol.
- C'est le sol sous les pieds ; la poussière des combats reste celle d'un sol dur.

## 3. La palette et l'exposition

- **Aucune couleur n'est changée** : ni désaturation, ni rotation de teinte, ni quantification. Les calques sont des PNG en vraies couleurs, et le PNG d'origine reste dans `art-src/sakura/source/`.
- **Une exposition globale** abaisse la lumière : une échelle linéaire sur la luminance (facteur 0,285 sur l'illustration d'origine), calculée pour que la plus claire des grandes régions tombe à 0,0735 de luminance relative.
- **Un plafond de canaux** (`#6d3c57`, le plafond des mesures de flashs) est appliqué aux seules grandes régions, en quelques passes, pour que les mesures d'effets ne bougent pas. Les teintes restent celles de l'illustration, seulement moins lumineuses.
- **Le sol** a son bord haut fondu sur 12 px dans le fond, pour que la bande du premier plan ne fasse pas de ligne dure.
- **Les petits accents** — le soleil, les lanternes, les pétales — ne couvrent pas 1 % de l'écran : ils gardent leur lumière, au-dessus de la bande. C'est ce qui garde le lieu vivant malgré l'exposition basse.
- **Les teintes cyan et magenta** de l'illustration (les cerisiers, la cascade) sont conservées, décision du développeur : le test de teintes du lieu ne s'applique pas à Sakura ; les autres lieux le gardent.
- **Les grandes couleurs** sont mesurées sur une palette grossière de 64 couleurs par calque, qui distingue les régions (ciel, montagnes, sol, lumières) de la trame fine. Le test de contrat du lieu vérifie qu'elles restent dans la bande des flashs.

## 4. Les ambiances

- **Crépuscule, ciel clair** : la seule pour l'instant, celle de l'illustration.
- Les autres viendront quand les découpes seront nettoyées (le README du prototype le recommande).

## 5. Ce qui bouge

- **`petals`** : une rafale de pétales traverse le sanctuaire. Elle est dessinée sur le calque `mid`, en surimpression des calques dessinés à la main : sa première image est transparente, les six suivantes font tomber 40 pétales dans une boîte de 260 × 330 px.
- **Le cycle** : 120 pas d'entrée, 6 images de 20 pas (2 s de chute), 120 pas de sortie, soit 360 pas (6 s). La boîte glisse de −852 à +852 px sur 280 pas : les pétales tombent en traversant le centre de l'écran.
- **Rien d'autre ne bouge** : ni les lanternes, ni la cascade, ni les spectateurs.

## 6. L'outil

- Un lieu peut être marqué **`rgba: true`** (`tools/stage/kit/stage.ts`) : ses trois calques sont des PNG en vraies couleurs sous `art-src/<lieu>/`, et `npm run stages` les copie tels quels. C'est le cas de Sakura.
- Ses grandes couleurs sont mesurées sur une palette grossière (`tools/sprites/quantize.ts`) : 64 couleurs par calque, celles qui couvrent 1 % de l'écran.
- Un accessoire du code peut être une **surimpression** (`overlay`) : sa première image est transparente, et il se pose sur le calque dessiné à la main, quel qu'il soit. C'est ainsi que les pétales passent sur Sakura.
- La rue garde son chemin indexé historique ; les autres lieux restent dessinés par le code.

## 7. Les budgets

- **Mémoire vidéo** : le fond, le milieu, le sol et la planche des pétales restent sous les 9 Mo d'un lieu ; les textures restent sous 2 048 px.
- **Le PNG d'origine** (3,5 Mo) est dans `art-src/sakura/source/`, hors des textures chargées par le jeu.
- Les tests de contrat du lieu vérifient les tailles, l'opacité du fond, la bande des flashs et la présence des pétales.

## 8. La suite

1. Nettoyer les découpes : repeindre les zones occultées derrière les objets, séparer la canopée, les bâtiments, la foule et les lanternes (comme le recommande le README du prototype).
2. Ajouter les autres effets : lanternes qui respirent, lucioles, peut-être une cascade animée.
3. Peindre (ou déduire) les autres ambiances.
