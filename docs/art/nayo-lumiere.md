# La lumière de Nayo

Tranche 1 du plan « Nayo vivant » : la lumière et les couleurs, sur toutes ses images à la fois. Les poses (tranche 3), les spéciaux et le Boost (tranche 2) et Riff ne changent pas.

Le principe : **chaque lumière sur Nayo vient d'une source de la rue** ([decor-rue.md](decor-rue.md) §5). Il n'y a pas de reflet générique, et rien n'est dynamique : tout est figé dans le sprite.

## 1. Les sources

- **Les réverbères au sodium** donnent la lumière principale. Elle vient d'en haut, à l'avant, et elle est chaude.
  - Sa direction est celle de `tools/sprites/raster.ts` (`LIGHT`), commune aux deux combattants.
  - Chaque forme porte une normale (bras et jambes en cylindres, torse en tonneau). Chaque pixel prend un cran de sa rampe selon l'angle qu'il fait avec cette lumière, dans toutes les poses.
  - Les tons clairs et les éclats se réchauffent vers l'orange des lampes.
- **L'enseigne violette du club**, derrière lui et en hauteur, donne le contre-jour. Il est le même sur les deux tenues, car il éclaire la rue et non la tenue. Sa couleur et sa direction sont celles de la rue (`tools/sprites/street-light.ts`, communes avec Riff). Il est décrit par `NAYO_LIGHTING` (`tools/sprites/nayo/index.ts`) et appliqué par `PixelCanvas.finish(lighting)`.
  - Il ne touche que les bords vraiment tournés vers lui, en haut et en arrière : haut du dos, épaules, arrière de la tête et des bras. Un pixel de bord regarde vers l'enseigne quand les pixels vides autour de lui (sur 2 px) sont de ce côté. C'est la forme de la pose qui décide, jamais un côté fixe d'une pièce.
  - Un bord bien en face prend le ton de l'enseigne ; un bord un peu moins en face prend le ton clair de sa matière. Les autres bords ne prennent rien. Le contre-jour se pose donc en touches, et non en ligne qui ferait tout le tour.
  - Il s'estompe vers le bas. Au-dessus de 110 px au-dessus des pieds (la poitrine et plus haut), il est entier ; entre 84 et 110 px, il ne garde que le ton clair ; sous 84 px (les hanches), il n'y en a plus. Il n'y a donc rien sur les jambes, les bottes ou les semelles.
- **Le sol** assombrit le bas du corps, comme une occlusion ambiante.
  - Sous 64 px, la lumière principale baisse progressivement : jusqu'à 0,55 en n·L au niveau du sol.
  - Les tons suivent donc le volume, sans coupure droite.
  - Aucun éclat ne brille dans cette zone : pas de reflet en ligne sur les semelles ni sur les tranches des bottes.
- **Les LED de la tenue** (poche, botte, emblème) sont des sources elles-mêmes.
  - Leur couleur est douce, et non fluo (`neonCore`).
  - Le tissu qui les touche prend une lueur discrète (`neonHalo`, 1 px, 4 voisins), toujours à l'intérieur de la silhouette.
  - L'anneau du casque reste une ligne simple.

## 2. Les rampes

Chaque matière a cinq tons, du plus sombre au plus clair (contour, ombre profonde, ombre, base, lumière), puis un éclat et le ton de contre-jour (`tools/sprites/nayo/palette.ts`).

- Les teintes glissent avec la valeur : les ombres tirent vers le bleu-violet, sans jamais de noir pur, et les lumières se réchauffent.
- La veste matelassée gonfle entre ses coutures. À côté de chaque couture, la pente tournée vers les réverbères prend un ton de plus, l'autre un ton de moins (`puffSeam` sur les manches, la même règle le long du dos). Le sens se lit d'après l'orientation du segment du squelette.
- Les manches sont mates : sur un tube matelassé fin, un éclat se lit comme un pixel égaré. Les éclats restent sur le dos de la veste, les gants, la ceinture, le métal, le casque et les bottes, au-dessus de la zone du sol.

## 3. Le liseré du rendu

Le contour clair de l'option A (`src/render/silhouette.ts`, `?silhouette=a`, par défaut) doublait le contre-jour tout autour du corps, y compris sous les pieds. Ce liseré est maintenant réservé aux combattants dont les sprites n'ont pas leur propre lumière :

- `FighterArt.ownLight` dit qu'un combattant a sa propre lumière ;
- `contourFor` ne dessine aucun contour pour lui ;
- Nayo (ses deux tenues) n'a plus de liseré. Riff l'a perdu à son tour avec sa propre lumière ([riff-lumiere.md](riff-lumiere.md)).

## 4. L'ombre au sol

Avant : une ellipse noire pleine, à 35 % d'opacité, qui rétrécit pendant un saut. Après (`src/render/sprite-fighter-view.ts`) : deux ellipses, une pénombre large et pâle et un cœur plus sombre, d'un violet très profond plutôt que noir. Le bord est doux en deux paliers, sans flou, et le tout rétrécit pendant un saut comme avant. C'est du rendu pur : rien n'est lu dans le cœur ni interpolé entre deux tics (D17, D23). Les deux combattants en profitent.

## 5. Contrats

- **La silhouette ne bouge pas.** Les pixels opaques de chaque image sont les mêmes qu'avant cette tranche : 0 pixel de différence sur les 48 bandes, corps et effets. Les effets gardent leurs couleurs. L'ajout d'une couleur de palette a seulement fait glisser d'une case les numéros des couleurs du Boost.
- **Riff ne change pas.** Sans `lighting`, `finish()` garde l'ancien contre-jour : ses images restent identiques à l'octet.
- **Les tests :**
  - `tests/tools/nayo-lumiere.test.ts` vérifie les rampes (cinq tons croissants, pas de noir pur, des ombres froides, un contre-jour violet et jamais cyan). Il vérifie aussi que l'éclairage reste dans la silhouette, qu'aucun contre-jour ne descend sous les hanches, qu'il tombe en haut et en arrière, et que le bas s'assombrit.
  - `tests/render/silhouette.test.ts` vérifie qui reçoit le liseré.

## 6. Écartés

- **Première version (refusée par le propriétaire) :** un contre-jour cyan sur tous les bords tournés vers l'arrière, des pieds à la tête, avec des halos fluo. Le liseré du rendu par-dessus faisait « autocollant ».
- **Huit cases par matière** (deux tons de contre-jour) : cela change la palette partagée, et donc les images de Riff. Le ton clair de la matière joue le second ton.
- **Un contre-jour peint à la main par membre**, comme le `rimRun` qu'avait Riff : c'est plus fin, mais il faut le régler pose par pose. Ce sera à revoir avec la tranche 3, si les poses le demandent.
- **Un liseré du rendu seulement atténué** pour Nayo : il ferait toujours le tour, pieds compris. Il est donc retiré pour lui.
- **Une occlusion par paliers de hauteur**, qui baisse le ton d'un cran sous une hauteur fixe : elle trace une ligne droite à travers les jambes. Elle a été remplacée par une baisse progressive de la lumière.
