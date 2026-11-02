# L'essence de Nayo : lumières de coup et animation

Suite de [nayo-lumiere.md](nayo-lumiere.md). La lumière de rue rendait Nayo « très léché », mais sans âme : aucune ombre portée par ses coups, aucune magie. Cette tranche donne à ses coups leur propre lumière, figée dans les images, et retravaille l'animation des spéciaux, du Boost, du Super et des coups lourds.

Le rendu (`src/render/`, traînées, images rémanentes, flaques de lumière au sol) est l'affaire d'une autre branche (`feat/nayo-essence-fx`). Ici, tout est dans les sprites : rien n'est calculé en jeu, le cœur ne change pas.

## 1. Recherche : ce qui a été retenu, et pourquoi

Les jeux et ressources ci-dessous sont des références de **technique** seulement. Aucun personnage, coup ou asset n'en est repris (charte du dépôt).

- **Lumière figée par image, effets qui redéfinissent l'éclairage.** Les jeux de combat en pixel art appliquent des règles d'éclairage fixes à toutes les images d'un personnage, et laissent les effets (feu, électricité, aura) les redéfinir le temps d'un coup. L'exemple cité est le contre-jour orangé d'un personnage entouré de flammes (fil PixelJoint). *Retenu* : la lumière de rue reste la règle, et chaque effet la redéfinit localement, image par image. Pas de normal map ni de shader : le jeu tourne sur des téléphones modestes, et une lumière figée ne coûte rien en jeu.
- **Une lumière colorée, pas seulement plus claire.** Les guides de contre-jour conseillent de colorer la lumière plutôt que d'éclaircir la valeur, et d'en mettre peu pour qu'elle se lise. Ils conseillent aussi une source chaude et une froide pour modeler un volume (Oleander Studios, Muddy Colors). *Retenu* : la lumière d'un effet prend sa teinte (cyan du son, or de l'impact, blanc du Boost) à peu près à la valeur de la surface. La veste noire devient sarcelle profonde, la peau cyan pâle. La matière se lit encore. Le son froid contre les réverbères chauds donne le contraste chaud/froid.
- **Lumière et ombre par paquets de pixels.** Pixelblog 6 (Slynyrd, Raymond Schlitter) : en pixel art, la lumière se gère par paquets de couleur, sinon l'image paraît plate. *Retenu* : deux niveaux seulement (effleuré, en plein), un nettoyage des pixels isolés, et le côté ombré d'une forme effleurée garde son ombre.
- **Anticipation courte, smear, impact tenu, follow-through.** Pixelblog 9 (melee attacks, Slynyrd) : une anticipation courte pour la réactivité, un ou deux smears sur la trajectoire, la pose d'impact tenue un peu plus longtemps, un follow-through plus long, et un rebond d'un pixel à la fin. La conférence GDC 2014 de Mariel Cartwright (Lab Zero, *Skullgirls*), « Fluid and Powerful Animation within Frame Restrictions » : une seule image d'anticipation suffit à faire lire un coup, et le follow-through des cheveux et des détails comble l'absence d'intervalles. *Retenu* : les durées des images ne bougent pas (elles suivent les données de jeu), donc ce sont les poses qui changent : des extrêmes plus marqués, des smears sur les images actives, un dépassement dans la récupération.
- **Peu d'images, des poses clés fortes.** Arc System Works a présenté *Guilty Gear Xrd* à la GDC 2015 (« The X Factor Between 2D and 3D ») : une animation « limitée » à la japonaise, avec moins d'images et des poses clés tenues, choisie pour la lisibilité plutôt que la fluidité. *Retenu* : chaque image active d'un spécial est une pose extrême lisible en silhouette. Le dessin entre deux images n'est pas un mélange tiède des deux.

## 2. Le moteur : la lumière des effets

Le générateur connaît la position de chaque effet de chaque image : le disque du Vinyle dans la main, l'étincelle du poing, la colonne de l'Uppercut, les anneaux de la Mégabasse. Chacun devient une lumière (`tools/sprites/effect-light.ts`).

- **Les sources** (`glowsOf`) :
  - disque et énergie : forte (1,2 et 1,1), autour de la main ;
  - éclair d'impact : la plus forte (1,3), courte portée ;
  - colonne : trois lumières sur sa hauteur, qui faiblissent quand elle retombe ;
  - anneau, éclats : de plus en plus faibles au fil de leur vie ;
  - lignes de vitesse et traînée : faibles, au bout du membre ;
  - poussière du sol et arc de garde : aucune lumière.

  Une pose peut ajouter ses propres lumières (`Pose.glows`) quand aucun effet dessiné ne les donne : le disque qui vient de quitter la main, la charge avant qu'elle se voie.
- **Sur le corps** (`PixelCanvas.lightBy`, `finish`, avec `Lighting.fx`) :
  - **La couleur.** Chaque pixel reçoit une intensité : la puissance de la source, une atténuation douce avec la distance, et l'angle entre sa normale et la direction de la source. La source est un peu devant le corps, comme le calque des effets. Au-dessus du seuil « effleuré », le pixel prend la teinte effleurée de sa matière ; au-dessus du seuil « en plein », la teinte pleine. Une surface effleurée garde ses ombres : seuls ses tons de base et de lumière prennent la couleur.
  - **Les ombres de forme.** Ce qui tourne le dos à une source perd de la lumière principale (`shadow`) et descend d'une bande.
  - **Le contraste.** Une image qui porte une source forte perd un peu de lumière principale partout ailleurs (`drama`). Les images de coup ont donc un éclairage dramatique, très différent de la garde.
  - **La tête.** Elle est un tampon de pixels exacts. `PixelCanvas.volume` lui donne les normales d'une boule, pour qu'elle soit éclairée par-dessous ou de côté comme le reste. Ses pixels ombrés prennent le ton juste plus sombre de leur rampe.
- **Les teintes** (`tools/sprites/nayo/palette.ts`, `EFFECT_TINTS`) : chaque matière a deux tons sous chaque lumière, effleuré et en plein, dans les deux tenues. Cela fait 11 matières × 3 lumières × 2 tons = 66 cases de palette, ajoutées après les détails de Nayo. Le Boost est **or là où il effleure, blanc incandescent là où il frappe en plein** : la lumière platine reste blanche (§1.8.7 de combos-v3), et l'or vient de sa retombée.

## 3. Le vocabulaire de la lumière de rue, gardé

- **Des sources cohérentes.** Chaque lumière vient d'un effet visible à l'image, ou de ce qui vient d'en partir (`Pose.glows`), jamais d'un reflet générique.
- **Rien sous les pieds.** Aucune lumière d'effet sur les 4 px au-dessus du sol (`EffectLighting.floor`) : ni les semelles ni les mains posées au sol ne s'allument par en dessous.
- **Pas de liseré.** La lumière suit la normale de chaque pixel, et non le contour : seuls les bords tournés vers la source s'allument, en touches. Les contours entre deux pièces, les néons, les traînées et les accents plats ne changent pas.
- **Rien ne bouge.** La silhouette (les pixels opaques) est identique avec et sans la lumière des effets, et une lumière ne déborde jamais dans l'image voisine.
- **Riff ne change pas** : elle n'a pas de `Lighting`, ses images restent identiques à l'octet.

## 4. Contrats et tests

`tests/tools/nayo-essence.test.ts` vérifie :

- le côté tourné vers la source prend sa couleur, et l'autre non ;
- une lumière par en dessous éclaire le dessous ;
- le côté opposé s'assombrit, et une source forte assombrit le reste de l'image ;
- une source hors de portée n'éclaire rien ;
- une lumière ne déborde pas dans l'image voisine et ne change pas la silhouette ;
- chaque matière a sa teinte dans les deux tenues, plus claire en plein ;
- le son est cyan, ou magenta sur la seconde tenue, et le Boost blanc ;
- les spéciaux sont éclairés, jamais sous les pieds ;
- la garde, la marche et les coups reçus n'ont aucune lumière d'effet.

Chacun de ces tests a été vu rouge en cassant exprès le moteur : normale inversée, image non bornée, ombre ou contraste retirés, sol non protégé.
