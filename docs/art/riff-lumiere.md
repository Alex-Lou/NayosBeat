# La lumière de Riff

Riff reçoit le même traitement que Nayo ([nayo-lumiere.md](nayo-lumiere.md)) : la lumière et les couleurs, sur toutes ses images, dans ses deux tenues. Ses poses, ses effets et ses boîtes ne changent pas. Ses lumières de coup (le `fx` de `Lighting`) viendront dans une autre tranche, avec leur propre identité.

Le principe ne change pas : **chaque lumière sur Riff vient d'une source de la rue** ([decor-rue.md](decor-rue.md) §5). C'est la même rue que celle de Nayo, donc les mêmes sources, et rien n'est dynamique : tout est figé dans le sprite.

## 1. Les sources, communes aux deux combattants

Les sources de la rue sont dans `tools/sprites/street-light.ts`. Nayo et Riff les lisent au même endroit, et un test vérifie qu'ils ont la même enseigne.

- **Les réverbères au sodium** donnent la lumière principale. Elle vient d'en haut et de l'avant, elle est chaude, et sa direction est celle de `tools/sprites/raster.ts` (`LIGHT`). Les tons clairs et les éclats de Riff se réchauffent vers l'orange des lampes.
- **L'enseigne violette du club**, derrière elle et en hauteur, donne le contre-jour (`STREET_SIGN` : sa couleur, sa direction, à quel point un bord doit lui faire face). Elle est décrite pour Riff par `RIFF_LIGHTING` (`tools/sprites/riff/index.ts`).
  - Elle ne touche que les bords tournés vers elle, en haut et en arrière : le haut du dos, les épaules, l'arrière de la tête (la crête et le côté rasé) et l'arrière des bras. C'est la forme de la pose qui décide, par le moteur commun (`PixelCanvas.finish`), comme pour Nayo.
  - Elle s'estompe vers le bas, à des hauteurs mises à l'échelle de son corps. Sa garde est plus basse que celle de Nayo (le cou à 107 px au-dessus des pieds contre 122, les hanches à 64 contre 73). Au-dessus de 96 px, la poitrine et plus haut, elle est entière ; entre 74 et 96 px, elle ne garde que le ton clair de la matière ; sous 74 px, il n'y en a plus. Il n'y a donc rien sur les jambes, les bottes ou les semelles.
  - Sur la tête dessinée pixel à pixel, elle prend les cheveux, le chaume du côté rasé et la frange, mais jamais la peau du visage, tournée vers les lampes.
- **Le sol** assombrit le bas du corps (`FLOOR_OCCLUSION`, la même baisse que Nayo). Sous 56 px, la lumière principale baisse progressivement, et aucun éclat ne brille dans cette zone : l'éclat chaud du bout des bottes disparaît près du sol.
- **Riff n'a pas de LED.** Ses accents magenta sont de la peinture, pas de la lumière : rien ne brille (`glow` vide).

## 2. Les rampes et la personnalité

Chaque matière a cinq tons, du plus sombre au plus clair (contour, ombre profonde, ombre, base, lumière), puis un éclat et le ton de contre-jour (`tools/sprites/riff/palette.ts`).

- Les teintes glissent avec la valeur : les ombres tirent vers le bleu-violet, sans jamais de noir pur, et les éclats se réchauffent vers les lampes. Avant, ses noirs étaient presque purs (`#030202`, `#040406`) ; elle était du noir sur noir.
- Sa personnalité passe par ses matières, pas par une autre lumière :
  - **le cuir** (veste, gants, ceinture, bottes) garde un éclat chaud, net et petit ;
  - **le jean** est un denim bleu-noir, plus bleu que le cargo violet de Nayo, et ses plis usés prennent un gris mauve ;
  - **le magenta** de la frange, de l'écusson et des triangles des bottes est une peinture profonde, sans fluo. Ses ombres tirent vers le violet et ses clairs vers le rose ;
  - **les cheveux** sont d'un noir plus neutre que ceux de Nayo, avec un reflet mauve.
- **Seconde tenue :** le cuir rouge sang de bœuf a des ombres qui tirent vers le lie-de-vin et un éclat qui chauffe vers l'orange. L'or de ses accents a des ombres d'un brun violacé, et le jean gris anthracite garde ses valeurs. Le contre-jour sur le rouge est un mauve éteint, pour ne pas souligner la veste d'un trait rose.

## 3. Ce qui a changé dans son dessin

- **Le contre-jour n'est plus peint à la main.** Les traits `rimRun` et `edgeRun` (haut de l'épaule, extérieur du bras, revers, col, cuisse), et le pixel d'accent de l'épaule, sont retirés : le moteur les remplace, d'après la pose. Les matières gardent leur ton de contre-jour, y compris les membres du fond (`farLit`, comme Nayo).
- **Les éclats tournés vers les lampes restent :** l'éclat du cuir sur le revers et sur le dessus de la manche.
- **Rien ne brille près du sol :**
  - le trait clair qui faisait toute la longueur de la semelle devient une rainure sombre ;
  - les plis du jean sur le tibia et le pli du genou prennent un ton usé au lieu de l'éclat ;
  - le triangle magenta des bottes descend d'un ton ;
  - le contre-jour posé à la main sur la tige de la botte disparaît.
- Les fils pâles sur les déchirures du jean sont de la matière, pas un reflet : ils restent clairs.

## 4. Le liseré du rendu

`RIFF` et `RIFF_ALT` ont maintenant `ownLight` (`src/art/riff/index.ts`). `contourFor` (`src/render/silhouette.ts`) ne dessine donc plus le contour clair de l'option A autour d'elle, qui doublait le contre-jour tout autour du corps, pieds compris. Nayo et Riff se lisent maintenant avec le même traitement dans la rue.

## 5. Contrats

- **La silhouette ne bouge pas.** Les pixels opaques de chaque image sont les mêmes qu'avant : 0 pixel de différence sur ses 46 bandes et ses 39 bandes d'effets, dans les deux tenues. Les atlas (JSON) sont identiques, et les effets gardent leurs couleurs au pixel près. Seule leur palette, écrite dans chaque PNG, change.
- **Les boîtes, l'anatomie et les replays ne bougent pas.** `npm run sprites:anatomy` donne le même rapport (0 hors limites, les 6 mêmes à juger), et les 31 replays sont inchangés.
- **Nayo et Saphir sont identiques à l'octet.**
- **Les tests :**
  - `tests/tools/riff-lumiere.test.ts` vérifie :
    - les rampes : cinq tons croissants, pas de noir pur, des ombres plus froides que leur éclat, et des noirs qui tirent vers le bleu-violet ;
    - le contre-jour : violet, le même que celui de Nayo, entièrement dans la silhouette, en haut et en arrière seulement ;
    - le bas du corps : rien sous les hanches (avec l'enseigne éteinte, chaque pixel sous les hanches est le même), aucun éclat de botte près du sol, aucun trait clair sur les semelles ;
    - le liseré : retiré.
  - Ces tests ont été vus rouges en cassant le code : l'enseigne venant d'en bas, le fondu supprimé, l'occlusion supprimée, un noir pur, une ombre trop chaude, le trait de semelle rétabli, l'éclairage retiré et `ownLight` retiré.
  - `tests/render/silhouette.test.ts` vérifie que ni Nayo ni Riff ne reçoivent le liseré.

## 6. Écartés

- **Garder le contre-jour peint à la main** (`rimRun`), plus fin pose par pose : il ne suivait ni la même enseigne ni la même règle de hauteur que Nayo (il touchait la cuisse et la tige de la botte), et il faut le régler pose par pose. Le moteur commun garantit la cohérence de la scène.
- **Une enseigne propre à Riff** (magenta, à sa couleur) : c'est la même rue. Sa personnalité passe par ses matières, et ses lumières de coup lui donneront sa couleur.
- **Les hauteurs de Nayo telles quelles** (84 et 110 px) : sur Riff, plus petite, le contre-jour se serait arrêté au milieu de la poitrine. Les hauteurs suivent son corps.
- **Une lueur autour de ses accents magenta** : ils ne sont pas des sources, une lueur les rendrait fluo.

## 7. Limites connues

- Comme chez Nayo, une fente d'un pixel à l'intérieur de la silhouette (entre un gant et les doigts, contre le visage) peut prendre une touche de contre-jour : le moteur la voit comme un bord tourné vers l'enseigne. C'est rare : au plus 2 % de ses pixels de contre-jour sur les poses des planches. Le test le borne, à moins de 10 % dans une fente et à moins de 5 % de bords qui semblent tournés vers le bas ou l'avant.
- Sa palette compte toujours 7 tons par matière : aucune case n'a été ajoutée, et les numéros des couleurs ne bougent pas.
