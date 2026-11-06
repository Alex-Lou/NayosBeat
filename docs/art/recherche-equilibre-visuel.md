# L'équilibre visuel entre les combattants et le décor

Ce document dit pourquoi, même au même grain, un décor peut écraser les personnages, et comment on
le mesure. Il complète le manifeste (`docs/art/manifeste-pixel-art.md`) : le manifeste dit comment
convertir une illustration ; ce document dit **combien** de détail et de contraste le décor a le
droit de porter.

## 1. Le problème

Après l'étalonnage commun (#213), Sahel Sunset avait le grain, les ombres et la lumière des
personnages, mais restait « trop présent » : la rue portait presque autant de petits contrastes que
les sprites et descendait jusqu'au noir. L'œil ne trouvait plus les combattants en premier.

## 2. Ce que disent les gens du métier

- **Gabriele Purpura**, breakdown d'un décor de jeu de combat (ArtStation, 2026) : un sol propre,
  la complexité dans les plans du milieu et du fond, les plans séparés par la valeur et
  l'atmosphère, le mouvement à la périphérie ; le décor est un second rôle.
- **Mystpixel**, « 5 Visual Clutter Culprits » (2026) : désaturer avec la profondeur et réserver le
  contraste le plus fort aux personnages ; un décor aussi contrasté qu'eux devient du bruit en
  plein combat.
- **Pixnote** (conseils de pixel art) : un fond moins saturé et moins contrasté que les sprites qui
  passent devant.
- **SNK, The King of Fighters XIII** (page « 2D dot » officielle) : les sprites reçoivent de
  légères variations de couleur pour refléter les tons du décor, et des reflets de lumière ; le
  décor, lui, est peint en grandes masses.
- Le conseil qui revient sur les forums de pixel art : personnages au contraste fort, décor dans les
  valeurs moyennes.

## 3. Les mesures

Le **détail** est l'écart moyen de clarté (Lab L) entre deux pixels voisins d'une même rangée : il
dit combien de petits contrastes porte une image. Mesuré sur des décors et des sprites de
référence, puis sur les nôtres :

| Image | Détail | Clarté p5 – p95 |
|---|---|---|
| Street Fighter III 3rd Strike, décors (Dudley, Hugo, Alex, Ken) | 1,6 à 3,5 | 2 – 99 (le plus sombre derrière les combattants : 2 à 10) |
| Street Fighter III, sprites (Ryu, Ken, Dudley) | ≈ 7 à 7,8 | — |
| King of Fighters XIII, décors | 1,1 à 1,3 | 8 – 88 |
| King of Fighters XIII, sprites (Kyo, Terry) | 6,2 à 7 | 2 – 99 |
| Nos sprites (Nayo, Riff) | 5,9 et 9,1 | 2 – 76 |
| Sahel `mid` avant | **4,9** | **1** – 67 |
| Sahel `mid` après | **2,6** | **15** – 66 |
| Sahel `floor` avant / après | 1,7 / 1,5 | 19 / 21 – 43 |
| Sahel `far` | 0,2 | 46 – 67 |

Chez Capcom comme chez SNK, le décor porte **entre un sixième et la moitié** du détail des
sprites, autour d'un tiers. Le nôtre en portait plus de 80 % : c'était l'équilibre manquant.

## 4. Les règles qui en sortent

1. **Un tiers du détail des personnages** derrière eux : le plan du milieu sous 40 % du détail
   moyen de leurs sprites, visé vers un tiers. Le sol, plus calme encore ; le ciel, presque
   lisse.
2. **Le quasi-noir est aux personnages.** Le décor ne descend pas sous L 12 : l'étalonnage commun
   (`tools/stage/kit/unify.ts`, `DARK_FLOOR`) resserre ses ombres de 0 – 24 vers 12 – 24, dans
   l'ordre, sans en fondre deux. Les traits sombres des combattants restent les plus sombres de
   l'écran.
3. **Des masses, pas des miettes.** Le détail baisse en fusionnant les coups de pinceau en aplats
   (Kuwahara au rayon 3), pas en floutant : les arêtes restent nettes, avec une netteté plus
   douce (×0,7) et un contour seulement sur les vraies arêtes (écart de clarté de 22). Au rayon 4,
   le détail tombe à 2,2 mais la jeep et les pneus deviennent mous : refusé.
4. **Les contours du décor plus doux que ceux des personnages** : 65 % de la clarté de leur couleur
   au bord du ciel, 75 % à l'intérieur.

Ces deux premières règles sont vérifiées par `tests/tools/stage-sahel.test.ts`.

## 5. Ce qui reste à essayer

- **La lumière du lieu sur les personnages** (la règle de KOF XIII) : une lumière d'ambiance propre
  à chaque lieu, chaude au couchant de Sahel, au lieu du blanc neutre que pose aujourd'hui
  `LightShow`. À faire avec les mesures de flash et le budget de lumières.
- Mesurer de la même façon les autres lieux dessinés, et en faire un test commun.
