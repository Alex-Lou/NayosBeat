# Les planches en atlas

*Étape F1 du plan d'animation : chaque image est recadrée à ce qu'elle dessine, et les images d'une planche sont rangées ensemble. C'est le socle des intermédiaires de F2, qui doublent le nombre d'images.*

**En bref.** Une case de planche fait 256 × 256 pixels, et un combattant n'en dessine qu'une petite part. Avant, une planche était une rangée de cases égales, recadrées à la boîte commune de toutes ses images. Le coin vide de chaque image prenait de la mémoire vidéo. Désormais, chaque image est découpée à sa propre boîte, et les découpes sont rangées en étagères sur une seule image : l'atlas de la planche. **Rien ne change à l'écran** : Phaser remet chaque découpe à sa place dans la case, et ancres, retournements, portraits et flashs mesurés restent les mêmes.

## 1. Ce que `npm run sprites` écrit

Pour chaque planche (`idle`) et chaque bande d'effets (`fx/idle`), dans chaque tenue :

- **`<planche>.png`** : l'image, où les découpes sont rangées.
- **`<planche>.json`** : l'atlas, au format *hash* que Phaser lit nativement. Chaque image de la planche y porte son numéro (`"0"`, `"1"`…) et :
  - `frame` : la découpe, dans l'image ;
  - `spriteSourceSize` : la même découpe, dans la case ;
  - `sourceSize` : la case ;
  - `trimmed: true`.
- **`cells.ts`** (un par combattant, commun aux deux tenues) garde la case logique et l'ancre, comme avant, et gagne `frames` : l'étendue opaque de chaque image dans sa case (0 × 0 pour une image vide). Les morts (M1) s'en servent pour les coins.

Les deux tenues ont le même atlas : c'est le même dessin, dans d'autres couleurs.

**Les planches dessinées à la main** (`art-src/<perso>/`, voir [aseprite.md](aseprite.md)) suivent le même chemin. L'artiste exporte toujours une rangée de cases entières de 256 px. `npm run sprites` la vérifie, puis la recadre et la range en atlas comme une planche du code, avec ses effets (`fx/`) et les effets platine d'un Remix dessinés à part. L'atlas est un format du jeu, pas un format de dessin.

**Ce qui n'est pas en atlas.**

- **Le portrait dessiné** (`portrait.png`, 96 × 96 px) : une seule image, sans case ni ancre, que la vignette affiche en entier. Il est écrit tel quel dans les deux tenues.
- **Le stage** (`src/art/rue/`) : une image par calque (fond, plan moyen, sol), chacune affichée en entier et décalée en parallaxe par sa propre texture. Il n'y a ni images à ranger ensemble, ni case autour du dessin. Le fond est opaque partout et le sol couvre toute sa largeur : il n'y a rien à recadrer. Seul le plan moyen peut avoir du vide. Dessinés au grain des combattants (×2), les trois calques pèsent 6,3 Mo : un atlas ne gagnerait presque rien, et compliquerait le chargement et le défilement. Seules les animations du décor (les props) sont découpées et rangées dans une planche, `props.png` ([decor-rue.md](decor-rue.md) §6).

**La découpe.** C'est la boîte de ce que l'image dessine, avec 2 pixels vides autour, sans sortir de la case. Une image vide garde un seul pixel transparent.

**Le rangement** (`tools/sprites/atlas.ts`, `packShelves`). Les découpes sont posées côte à côte, de la plus haute à la plus basse, en étagères. L'image fait au plus 2 048 px de large, et autant de haut quand c'est possible. Toutes les largeurs sont essayées, et la plus petite surface est gardée. Cela fait environ 5 Mo de moins qu'une largeur fixée d'avance (la racine de la surface).

**Les bords coupés.** Quelques effets touchent le bord de leur case de 256 px : 24 images de 16 bandes d'effets, toutes coupées en bas, comme l'onde au sol. Leur découpe n'a pas de marge de ce côté. Le lissage du pixel art (`smoothPixelArt`) lit un peu au-delà du bord d'une découpe. L'atlas répète donc ce bord une fois, puis laisse un pixel vide avant la découpe suivante : le lissage voit ce qu'il voyait au bord de l'ancienne image.

**Les aperçus** (`tools/sprites/preview/`) restent des rangées de cases, plus faciles à regarder qu'un atlas.

## 2. Dans le jeu

- **Chargement** (`src/render/art-textures.ts`, `loadArt`). Une planche qui a un atlas est chargée avec `load.atlas`. Une planche sans atlas reste chargée comme une rangée de cases égales (`load.spritesheet`).
- **Affichage.** Une image recadrée garde la taille de sa case (`frame.realWidth`). L'origine qui met les pieds sur la position (`anchorOrigin`) et le retournement restent donc justes, sans rien changer à `AnchoredSprite`.
- **Les pixels des effets** (`src/render/fx-pixels.ts`, `FxPixels`). Chaque image d'effets est lue une fois dans sa découpe, et gardée avec sa place dans la case. On ne reconstitue pas la case entière : le cache garde la taille des découpes. Ce qu'une image allume de neuf se compare à l'image d'avant à la même place de la case (`placedOn`). La dissolution (`vanishing`) place elle aussi ses pixels dans la case.
- **L'écran de sélection** (`src/app/select-fighters.ts`, `src/ui/fighter-select.ts`). Le combattant en garde et le buste de sa case montrent chaque image dans sa découpe : un élément posé sur la découpe, dans la case ou dans le carré du buste, avec l'image de l'atlas derrière. L'atlas de l'idle est inclus dans le code (`idleAtlas`), car l'écran en a besoin tout de suite. Les autres atlas sont des fichiers que le combat charge avec leurs images.
  - Un portrait dessiné à la main (`portraitImage`, voir [aseprite.md](aseprite.md#portraits)) passe avant le buste découpé dans la garde : la vignette l'affiche en entier. Le buste découpé ne sert que sans lui.
  - Le combattant en garde passe toujours par l'atlas de son idle, que l'idle soit dessiné par le code ou à la main.
- **Hors ligne.** Les atlas sont des fichiers du build : le service worker les met en cache avec les images.
- **Les outils** qui mesurent les planches (`npm run measure-boxes`, les tests) les lisent à travers l'atlas (`cellReader`). La page qui compare deux films (`npm run anim:compare`) embarque l'atlas de chaque image et dessine chaque image depuis sa découpe.

## 3. Mémoire vidéo

Les textures d'un match, en RGBA, d'après les PNG chargés : toutes les planches et tous les effets qu'un clip joue, projectiles et effets platine compris.

| Match | Avant | Après |
|---|---|---|
| Nayo contre Riff | 66,5 Mo | 38,5 Mo |
| Nayo contre Nayo (deux tenues), le pire | 70,4 Mo | 41,2 Mo |
| Riff contre Riff (deux tenues) | 62,6 Mo | 35,9 Mo |

Ces chiffres ont été mesurés de nouveau après le rebase de F1 sur le créateur de sprites (planches dessinées, portrait, stage), V0 et V1 de l'animation et l'IA : ils ne bougent pas, car `npm run sprites` écrit les mêmes octets.

- Sans les projectiles ni les effets platine, Nayo contre Riff passe de 62,7 à 37,4 Mo. Le plan visait environ 40 Mo.
- Les effets fondent le plus : de 10,4 à 2,2 Mo pour Nayo, car ils occupent peu de place dans des cases larges.
- Les découpes seules feraient 35,7 Mo. Le reste est la perte du rangement.
- Le stage n'est pas encore dessiné : les combats gardent la boîte grise, sans texture. Dessiné, il ajoutera 1,5 Mo au plus (ses trois calques en RGBA).

**Le plafond.** `tests/build/vram-budget.test.ts` somme les textures du pire appariement, miroir compris, avec le stage quand il est dessiné, et vérifie qu'il reste sous **90 Mo**. Ce plafond est provisoire, à confirmer sur le plus ancien iPhone visé. Le test vérifie aussi qu'aucune texture ne dépasse 2 048 px de côté. Chaque PR d'art annonce son coût mesuré.

## 4. Ce qui le garantit

- **Les pixels.** `tests/tools/atlas.test.ts` vérifie que l'atlas rend chaque pixel de chaque case, tel que le générateur le reçoit (plusieurs planches redessinées, et chaque planche dessinée à la main, comparée à son dessin et non au code), que les découpes ne se chevauchent pas, et que la seconde tenue a le même atlas. Au passage à F1, les 34,9 millions de pixels des 344 images, dans les deux tenues, ont été comparés aux anciennes rangées : aucun écart, cases et ancres identiques.
- **Les planches dessinées.** Au rebase de F1 sur le créateur de sprites, un essai jetable a été généré puis retiré : l'idle de Nayo exporté depuis son gabarit avec un pixel de plus en haut d'une image, `standLight` et ses effets avec un pixel retouché, et les effets platine de `specialBoost` dessinés à part. Chacun est sorti en atlas, la découpe agrandie a suivi le pixel ajouté, et tous les tests sont passés. Un atlas qui ne rend pas son dessin fait échouer `tests/tools/atlas.test.ts`.
- **Les ancres et les retournements.** `tests/render/anchor-origin.test.ts` refait le calcul de Phaser (`TransformerImage`) pour une image recadrée, retournée ou non.
- **Les effets.** `tests/render/fx-pixels.test.ts` vérifie que `FxPixels` lit les mêmes pixels, à la même place, et compte les mêmes flashs qu'avec des cases entières. `flash-areas` et `flash-cadence` passent sans changer de seuil.
- **L'écran de sélection.** `tests/app/select-fighters.test.ts` refait le calcul du navigateur pour le buste et chaque image de l'idle, et les compare pixel par pixel aux cases. Un portrait dessiné passe avant le buste découpé (`tests/ui/fighter-select.test.ts`).
- **À l'écran.** Au passage à F1, les 1 712 images que charge un match (Nayo, Riff, et la 2e tenue de Nayo), retournées une sur deux, à des positions fractionnaires, ont été rendues en WebGL avant et après (Chromium, SwiftShader, avec le lissage du jeu), à la résolution d'un téléphone, puis comparées :
  - au zoom normal du combat, 0,08 % des pixels diffèrent, tous d'un seul niveau sur 255 ;
  - au plus près (zoom 1,45), 0,8 à 1,2 % des pixels diffèrent, presque tous d'un ou deux niveaux, au plus de 20 niveaux, sur les fondus entre deux pixels de planche.

  Ces écarts viennent de l'arrondi des coordonnées de texture, qui changent avec la taille de l'image. Ils sont invisibles. Sur l'écran de sélection, à son échelle non entière, chaque pixel de planche garde sa couleur, mais la limite entre deux d'entre eux peut se déplacer d'un pixel d'écran.
