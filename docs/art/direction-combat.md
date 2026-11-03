# La direction visuelle du combat : contour, ombrage, effets

*Casquette : direction artistique. Écrite le 3 novembre 2026, à la demande du propriétaire : « un peu plus d'effets visuels à la BlazBlue, dans les décors, les déplacements et les attaques de chaque personnage ; du bord noir léger et pro, des ombrages magnifiques ».*

Ce document fixe la direction **commune** aux quatre combattants (Nayo, Riff, Saphir, Watt) et aux décors. Chaque spec de personnage (`docs/<perso>.md`) et de décor (`docs/art/decor-*.md`) s'y réfère. Il ne remplace ni `flashs.md` (les flashs), ni `dissolution.md`, ni `direction-hud.md`.

---

## 0. Les décisions du propriétaire (3 novembre 2026)

1. **L'ordre** : la direction commune d'abord, sur les quatre combattants. L'arsenal de Watt (phase 2, `watt-arsenal.md`) vient après.
2. **Le contour** : **noir fin, partout**.
3. **Les effets**, pour chaque personnage : les images rémanentes, les traînées d'attaque, les ondes au sol et l'aura de puissance.
4. **Les décors** : ce document en donne la direction. La session principale la répartit aux sessions des décors.

## 1. La référence, et ce qu'on n'en prend pas

« Façon BlazBlue » est une **direction de qualité**, pas une source. On en retient des principes :
- des silhouettes nettes et lisibles d'un coup d'œil ;
- des volumes francs ;
- des effets en couches de couleur, qui accompagnent le geste ;
- des temps forts marqués.

On ne reprend **aucun** personnage, aucune pose, aucune palette, aucun effet reconnaissable, aucun nom. Chaque effet naît du personnage et de son univers, le Sound Clash : le vinyle et les ondes de Nayo, les griffes magenta de Riff, les arcs saphir de Saphir, les arcs électriques et le VU-mètre de Watt.

## 2. Le contour : noir fin, partout

- **Une encre commune**, `#0a0710`. C'est un noir à peine violacé, accordé aux ombres, qui tirent vers le bleu violet (`nayo/palette.ts`).
  - Elle remplace le ton de contour de chaque matière, aujourd'hui un bleu-nuit propre à chacune.
  - Les ombres, elles, ne deviennent jamais noires : seul le trait l'est.
- **1 px de l'art** (un demi-pixel du monde), tout autour de la silhouette, **côté lumière compris**. Aujourd'hui, le côté lumière prend un ton plus clair.
  - Le contre-jour (§3.3) reste à l'intérieur du trait : c'est lui qui donne le côté lumière.
- **Les contours intérieurs** séparent un bras d'un torse ou une jambe de l'autre. Ils prennent l'encre côté ombre, et un ton sombre de la matière côté lumière : un trait plus léger à l'intérieur qu'autour.
- **Les têtes** dessinées à la grille (`head.ts`) suivent la même règle, puisque leur contour vient des mêmes palettes.
- **Les effets** n'ont jamais de contour noir : la lumière n'a pas de bord.
- **Ce que l'essai a montré** : sur des tenues sombres, le trait noir se voit peu à l'œil. Il se voit surtout sur fond clair, autour des mains, de la peau et des tenues 2 claires. Le gain le plus visible viendra des ombrages et des effets.

## 3. L'ombrage

### 3.1 Les tons

- **4 tons par matière**, plus un reflet pour les matières brillantes : ombre profonde, ombre, base, lumière. C'est déjà la rampe du générateur (`raster.ts`), et elle se règle dans chaque `palette.ts`.
- Les ombres tirent vers le bleu violet, les lumières vers le chaud des lampes de la rue : le ton change de teinte avec sa valeur.
- **Pas de dégradé, pas d'anticrénelage** : chaque pixel est une case de la palette.

### 3.2 Les volumes

- Des volumes **francs** : la séparation entre lumière et ombre est nette, en une ou deux bandes, jamais un passage mou de quatre tons.
- Les plis (`creases`) et les coutures sont tracés dans le ton d'ombre, et non dans l'encre.
- Les ombres portées : une partie devant une autre lui projette une ombre courte (`raster.ts`). Elles restent.

### 3.3 Le contre-jour

- Le contre-jour est une ligne de 1 px, à l'intérieur du contour, sur les bords tournés vers la lumière du fond.
- Il prend **la couleur de la lumière du lieu** (le violet de l'enseigne dans la rue), ou **l'énergie du personnage** pendant un Boost et un spécial.
- Il descend le long du dos et des jambes (l'essai sur Nayo : `fade` de 70 à 20 px de l'art), pas seulement sur le haut du dos.
- Les surfaces de lumière vivante (`fighterLightArea`) se remesurent quand le contre-jour change.

### 3.4 La masse

Le propriétaire trouve les combattants chétifs. On leur donne plus de masse **sans toucher aux boîtes de jeu** :
- épaules, bras, mains et bottes plus épais ;
- un dos qui ne bombe pas (l'essai 2 sur Nayo).

Les tests de boîtes (`hurtboxes`, `watt-sprites`, la règle sans corps-à-corps) bornent ce gain.

## 4. Les effets de chaque personnage

Chaque effet prend **la couleur d'énergie du personnage** et sa tenue 2 (`univers.md`) :

| Combattant | Énergie | Tenue 2 |
|---|---|---|
| Nayo | cyan | magenta |
| Riff | magenta `#ff3ca0` | or `#ffc83a` |
| Saphir | saphir `#3A6CF0` | lilas `#C0A0FF` |
| Watt | vert VU `#1EC85A` | UV `#E070FF` |

### 4.1 Les images rémanentes

- **Quand** : au dash, au backdash, sur les spéciaux qui avancent (la Surcharge, la Glissade) et pendant la super.
- **Comment** : 2 ou 3 silhouettes du personnage, à plat dans son énergie, laissées sur les images précédentes. Elles s'effacent en 6 à 10 images, sans clignoter.
- **Où** : c'est le rendu qui les tire du sprite affiché, sans nouvelle planche. Elles ne touchent jamais au cœur (D17), et rien n'est interpolé entre deux tics (D23).

### 4.2 Les traînées d'attaque

- **Quand** : sur les coups lourds, les spéciaux et la super. Les coups légers n'ont qu'un trait, ou rien.
- **Comment** : des arcs de mouvement **en couches**, un cœur clair dans une enveloppe de l'énergie. C'est la forme des smears de Nayo (`vfx.ts`), à étendre aux quatre.
- **La règle** : la traînée suit exactement le chemin du membre qui frappe, et s'arrête où la hitbox s'arrête : « ce qu'on voit, c'est ce qui touche ».

### 4.3 Les ondes au sol

- **Quand** : à l'impact d'un coup lourd, à l'atterrissage d'un saut et d'un lancer, au départ d'un dash et sur un corps qui rebondit.
- **Comment** :
  - une onde plate qui court sur le sol ;
  - de la poussière dans la couleur du sol du lieu ;
  - des fissures courtes sur les gros impacts (un KO, un lancer de Watt) ;
  - l'énergie du personnage en fin liseré.

### 4.4 L'aura de puissance

- **Quand** : la jauge de Boost pleine (3 barres), pendant un Remix et pendant la super. Pour Watt, aussi sa tension pleine (`watt-arsenal.md` §3.2).
- **Comment** : des flammèches ou des ondes qui montent autour du corps, dans son énergie, derrière lui. Elles ne passent jamais devant son visage.
- **Le signal de Watt** : son aura passe aussi par son ampoule et les LED de ses bras.

## 5. Les décors

À répartir par la session principale aux sessions des décors.

- **Ils répondent au combat** : la poussière et les flaques réagissent aux ondes au sol (§4.3), les lumières du lieu prennent un éclat bref sur les gros impacts (sous le budget de flashs), et la foule réagit aux temps forts.
- **La profondeur** : des plans en parallaxe, et une brume ou une lumière d'ambiance entre les plans (déjà commencé : `brume.md`, la pluie et la neige).
- **Le contour** : les décors n'ont **pas** l'encre des personnages. Le trait noir est réservé à ce qui se bat, et c'est ce qui le détache du fond.
- **Les contrastes** : le plan où l'on se bat reste moins contrasté que les combattants (`proprete.md`).

## 6. Les limites, pour tout ce qui précède

- **Les flashs** : 3 par seconde au plus (`flashs.md`). Les effets passent par le budget (`flash-budget.ts`) et ont leur version sombre quand ils sont refusés. En flashs réduits, aucun flash n'est compté hors de la carte du Finisher. Le style passe par la forme, les couches et la couleur, jamais par un éclat blanc plein écran.
- **La mémoire** :
  - textures de 4 096 px au plus ;
  - mémoire vidéo d'un match sous 90 Mo.

  Les images rémanentes et les auras réutilisent le sprite affiché : elles ne coûtent pas de nouvelles planches.
- **Les appareils faibles** : chaque effet a une version allégée, choisie au démarrage selon ce que l'appareil peut faire, puis selon les images par seconde mesurées en jeu. Le gameplay ne change jamais.
- **Les tests** : les surfaces de lumière vivante, `OUTLINE_AREAS` et les budgets de flashs dépendent des pixels. On les remesure à chaque changement de contour, de contre-jour ou de masse.

## 7. L'ordre de travail proposé

1. **Le contour noir** sur les quatre : la palette commune (`tools/sprites/palette.ts`) et le côté lumière du contour (`raster.ts`). Puis la régénération, les tests de pixels et une planche avant/après.
2. **La masse et le contre-jour**, combattant par combattant, en partant de l'essai 2 sur Nayo.
3. **Les images rémanentes**, un effet du rendu commun aux quatre.
4. **Les ondes au sol**, puis les **traînées** étendues aux quatre.
5. **L'aura de puissance.**
6. **Les décors**, par leurs sessions.

Chaque étape est une PR qui finit sur une planche avant/après montrée au propriétaire.
