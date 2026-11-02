# La lumière de Nayo

Tranche 1 du plan « Nayo vivant » : la lumière et les couleurs, sur toutes ses images à la fois. Les poses (tranche 3), les spéciaux et le Boost (tranche 2) et Riff ne changent pas.

## 1. Les deux lumières

- **La lumière principale** vient d'en haut et de l'avant, vers le spectateur. C'est celle de `tools/sprites/raster.ts` (`LIGHT`), commune aux deux combattants. Elle est chaude : ce sont les réverbères au sodium de la rue (`docs/art/decor-rue.md` §5). Chaque forme porte une normale (bras et jambes en cylindres, torse en tonneau, tête stampée), et chaque pixel prend un cran de sa rampe selon l'angle avec cette lumière. Elle suit donc toutes les poses.
- **Le contre-jour** est un néon derrière Nayo, en haut : cyan, et magenta sur la seconde tenue. Il éclaire le dos, l'arrière des bras et des jambes, et les cheveux. Il est décrit par `NAYO_LIGHTING` (`tools/sprites/nayo/index.ts`) et appliqué par `PixelCanvas.finish(lighting)` :
  - un pixel du bord de la silhouette regarde vers le néon quand les pixels vides autour de lui sont de ce côté (2 px à la ronde) ; c'est la forme de la pose qui décide, jamais un côté fixe d'une pièce ;
  - un bord qui fait bien face au néon (cosinus ≥ 0,72) prend le ton de contre-jour de sa matière, un bord de biais (≥ 0,3) son ton clair, les autres rien : la lumière s'estompe en tournant, au lieu de détourer le personnage comme un autocollant ;
  - la tête est un tampon dessiné à la main, avec son propre contour : le contre-jour des cheveux va sur le pixel juste à l'intérieur de ce contour ;
  - les membres du fond restent un cran plus sombres, mais gardent le contre-jour : ce sont eux qui sont le plus près du néon.

## 2. Les rampes

Chaque matière a cinq tons, du plus sombre au plus clair (contour, ombre profonde, ombre, base, lumière), puis un éclat et le ton de contre-jour (`tools/sprites/nayo/palette.ts`). Les teintes glissent avec la valeur : les ombres tirent vers le bleu-violet, sans jamais de noir pur ; les lumières se réchauffent. Le noir de la veste, du pantalon et des bottes se lit ainsi en volumes, et non plus en aplat gris.

- La veste matelassée gonfle entre ses coutures : à côté de chaque couture, la pente tournée vers la lumière principale prend un ton de plus, l'autre un ton de moins (`puffSeam` sur les manches, la même règle le long du dos). Le sens se lit d'après l'orientation du segment du squelette.
- Les éclats (`gloss`) restent calculés par la réflexion de la lumière principale : bottes, gants, ceinture, casque, métal.

## 3. Les néons

Les bandes LED (poche, botte) et l'emblème de la manche ont un cœur presque blanc (`neonCore`). Les pixels de tissu qui le touchent prennent le halo (`neonHalo`, 1 px, 4 voisins), toujours à l'intérieur de la silhouette. L'anneau du casque reste une ligne simple : à cette taille, son halo le remplirait. La lumière est figée dans le sprite : rien ne clignote (`docs/flashs.md`).

## 4. L'ombre au sol

Avant : une ellipse noire pleine, à 35 % d'opacité, qui rétrécit pendant un saut. Après (`src/render/sprite-fighter-view.ts`) : deux ellipses, une pénombre large et pâle et un cœur plus sombre, d'un violet très profond plutôt que noir. Le bord est doux en deux paliers, sans flou, et le tout rétrécit pendant un saut comme avant. C'est du rendu pur : rien n'est lu dans le cœur ni interpolé entre deux tics (D17, D23). Les deux combattants en profitent.

## 5. Contrats

- **La silhouette ne bouge pas.** Les pixels opaques de chaque image sont les mêmes qu'avant cette tranche : 0 pixel de différence sur les 48 bandes, corps et effets. Les effets gardent leurs couleurs ; seuls les numéros de cases de la palette des effets du Boost ont glissé d'une case.
- **Riff ne change pas.** Sans `lighting`, `finish()` garde l'ancien contre-jour : ses images restent identiques à l'octet.
- Le test `tests/tools/nayo-lumiere.test.ts` vérifie les rampes (cinq tons croissants, pas de noir pur, des ombres froides), que l'éclairage reste dans la silhouette, et que le contre-jour tombe du bon côté.

## 6. Écartés

- **Huit cases par matière** (deux tons de contre-jour) : cela change la palette partagée, et donc les images de Riff. Le ton clair de la matière joue le second ton.
- **Un contre-jour peint à la main par membre**, comme `rimRun` chez Riff : c'est plus fin, mais il faudrait le régler pose par pose. Ce sera à revoir avec la tranche 3, si les poses le demandent.
- **Un contre-jour de la couleur du décor** pour les deux tenues : le cyan jure avec les accents magenta de la seconde tenue. Le contre-jour prend donc le néon de chaque tenue.
