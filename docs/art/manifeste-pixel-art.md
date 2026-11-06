# Manifeste technique : un décor au grain des combattants

Ce document dit comment obtenir la qualité de **Sahel Sunset** (`docs/art/decor-sahel.md`) sur
n'importe quel lieu : une illustration (ou un décor codé) qui partage l'écran avec les personnages
sans jamais avoir l'air d'une image posée derrière eux. Il vaut pour tout agent et tout artiste.
Les chiffres sont ceux qui marchent sur Sahel ; ils se règlent, la méthode ne change pas.

## 1. Les six lois

1. **Le même grain que les personnages, partout.** Un pixel d'image du décor vaut un pixel de leurs
   sprites, sur tous les plans : ciel, rue, sol. Jamais de blocs 2 × 2 (le fond devient deux fois
   plus grossier que les personnages), jamais une illustration réduite au plus proche (elle devient
   du bruit).
2. **Accentuer, ne jamais flouter.** Les personnages ont des aplats nets et un trait sombre. Le
   décor aussi : des amas de couleur francs, des arêtes durcies, un contour là où une forme en
   rencontre une autre. Une zone floue à côté d'un sprite net se lit toujours comme « une image ».
3. **Des plans réels.** Le ciel, la rue et le sol sont trois calques qui défilent à leur vitesse
   (25 %, 50 %, 100 %). Ce qui est derrière un plan est complété, jamais un trou.
4. **Le sol se dessine.** C'est là que l'œil compare le décor aux pieds des combattants : il est
   dessiné pixel par pixel, en perspective, avec sa lumière et ses ombres, des pieds de la foule au
   bord de l'écran.
5. **Une seule lumière, une seule ombre.** Les ombres du décor prennent la teinte de celles des
   personnages (§2, l'étalonnage commun) : c'est le filtre qui fait qu'ils habitent le même monde.
6. **La vie vient de la scène elle-même.** On anime les gens, les lumières, la fumée et les objets
   qui y sont, au même grain, par pixels entiers (D23). Rien n'est collé dans un autre style.

## 2. La chaîne de conversion d'une illustration

Fichier de référence : `tools/stage/sahel/adapt.ts`. Elle part de l'illustration RGB, dans
`art-src/<lieu>/source/`.

| Étape | Ce qu'elle fait | Réglage Sahel | Pourquoi |
|---|---|---|---|
| Échelle | chaque plan à sa taille (`far` 1 200, `mid` 1 440, `floor` 1 920 px de large) | `mid` ×0,861, la rangée 600 de la source sur la ligne du sol (460) | le plan du milieu couvre tout son défilement sans étirement |
| Rééchantillonnage par aires | chaque pixel = moyenne exacte, en lumière linéaire, de la zone source qu'il couvre | — | pas d'aliasing : c'était le « PNG dégueulasse » |
| Kuwahara | chaque pixel prend la moyenne de son quadrant le plus calme | rayon **2** | des amas propres ; au rayon 1, les contours deviennent des miettes |
| Netteté | chaque pixel s'éloigne de la moyenne 3 × 3 de ses voisins | ×**1,6** | rend aux arêtes la dureté des sprites |
| Étalonnage | contraste et saturation autour du milieu, en Lab | `mid` : saturation 1, contraste 1,06 | le décor reste sous les personnages sans s'éteindre |
| Palette | k-means en Lab, propre à chaque plan | `far` 18, `mid` 32 couleurs | les personnages en ont ~70 : le décor plus sobre |
| Tramage | ordonné (Bayer 4 × 4), seulement où il y a un dégradé | ciel seulement | ailleurs, le tramage est du bruit qui scintille |
| Orphelins | un pixel seul de sa couleur prend celle de ses voisins | 2 passes, puis 1 après le contour | amas nets, comme les sprites |
| Contour | 1 px sombre (60 % de la clarté, même teinte) sur la lisière du ciel et le côté sombre des arêtes | écart de clarté ≥ **13** (Lab) | le trait Guilty Gear / BlazBlue, en plus doux que celui des personnages |

### L'étalonnage commun (`tools/stage/kit/unify.ts`)

Même au même grain, un décor peint et des sprites ne partagent pas leurs ombres : celles des
personnages sont d'un violet-bleu nuit (mesuré sur leurs sprites : Lab L ≈ 9, a ≈ +5, b ≈ −9 dans
la bande la plus sombre ; a ≈ +10, b ≈ −12 dans la suivante), celles d'une peinture de coucher de
soleil d'un brun chaud. Côte à côte, ce sont deux images. `unifyPalette` est appliquée à **toutes
les palettes du lieu** (chaque plan, le sol dessiné, la fumée, les oiseaux) :

- les **ombres** (L < 40, entièrement sous 14) tirent leur teinte vers celle des personnages, à
  72 % ;
- les **tons moyens** perdent 14 % de chroma et un peu de jaune, au plus fort à L 50 ;
- les **lumières** (le couchant, les lampes, le feu) ne bougent pas.

C'est un réglage par palette, pas un filtre au rendu : les personnages, leurs effets et les mesures
de flash restent exactement ce qu'ils sont.

### La découpe du ciel

- Remplissage depuis le bord haut, par petits pas de couleur (ΔE ≤ 3,2), sur des couleurs de
  crépuscule seulement (clarté ≥ 34, chroma ≥ 15) : un mur blanchi n'est pas du ciel.
- Il saute les fils et les brindilles de moins de 5 px : la ligne reste dans la rue.
- Les îlots de rue de moins de 60 px dans le ciel y retournent ; les poches de « ciel » de moins de
  400 px dans la rue redeviennent rue.
- Les graines ne partent que du milieu du bord haut : un toit qui touche le bord n'en est pas.

### Le ciel derrière la rue

Dans `far`, la rue est effacée : chaque pixel caché prend la couleur médiane du ciel de sa rangée,
mêlée (30 %) à un remplissage pyramidal. Le défilement ne découvre jamais un trou ni le fantôme
d'un toit.

## 3. Le sol dessiné

Fichier de référence : `tools/stage/sahel/floor.ts` (`paintEarth`).

- **Perspective par rangée d'écran** : `scaleAt(y) = e^(0,0147 × (y − 460))`. Grain, mottes,
  cailloux, ornières et fissures en prennent la taille : ×1 aux pieds, ×3,2 au bord de l'écran,
  ×0,55 au fond de la rue. Le bruit est un peu étiré en largeur (le sol fuit).
- **La lumière d'un seul côté** : la source (le soleil bas) est derrière la rue ; le fond du sol est
  clair, le devant sombre. Chaque objet est éclairé du même côté.
- **Valeurs plates, trois par objet** : un caillou a un dessus clair, un flanc moyen, un dessous
  sombre ; pas de dégradé.
- **Les bords Guilty Gear / BlazBlue** : un contour sombre (le ton le plus sombre de la terre) sous
  et autour de chaque forme, un liseré de soleil sur son bord haut, une ombre portée vers l'avant à
  bord dur. Les mottes ont une arête claire en haut et une ligne sombre en bas ; les ornières une
  lèvre claire et un fond sombre ; les fissures un trait sombre et un liseré clair au-dessus.
- **Une seule surface** : dans `mid`, la terre nue peinte (sa terre cuite, ou le gris de sa
  poussière) est remplacée par la même terre dessinée sous la ligne de la foule ; les objets restent
  peints ; les miettes de peinture de moins de 120 px perdues dans la terre disparaissent.
- **Le tramage** n'intervient qu'au milieu de chaque marche de ton (`tone` du kit) : le reste est en
  aplats.

## 4. La vie

Fichiers de référence : `tools/stage/sahel/crowd.ts`, `vfx.ts`, et le Loading Dock
(`tools/stage/dock/mid.ts`) pour le rythme.

### La foule

- Les personnes sont **celles de la peinture** : leurs pixels sont repris dans `mid.png` et déplacés
  par pixels entiers. Rien n'est redessiné dans un autre style.
- Chaque personne est donnée par le milieu et le haut de sa tête (relevés à la main sur une grille
  ×3) ; seuls ses pixels sombres (sous un seuil de clarté propre à la zone) bougent : la tête et les
  épaules, pas le mur derrière.
- **Un beat partagé** (30 pas, 120 par minute) sur une boucle de 40 s : une personne sur deux hoche
  la tête, l'autre au temps suivant. **Le drop** (8 temps au milieu de la boucle) : tout le monde
  monte de 2 px, deux personnes sur trois lèvent les bras (épaule, coude, poing au-dessus de la
  tête, 3 px d'épaisseur, le poing liseré de soleil), dans le ton le plus sombre de leur torse.
- La radio sur la caisse bat le même temps : la foule a une source.

### Les effets

- **Feu** : trois ou quatre tons francs (rouge sombre, orange, jaune, cœur blanc), des langues qui
  changent d'image, des étincelles d'un pixel qui refroidissent en montant.
- **Fumée** : des bouffées à bord dur, une face éclairée vers le soleil, une face d'ombre et un
  contour du côté de l'ombre ; elles grossissent, dérivent avec le vent et s'éclaircissent par un
  motif ordonné, jamais par un flou.
- **Lumière** : la seule transparence permise. Halos, cônes des lampadaires et lueur du feu en deux
  ou trois anneaux translucides à bord net, qui respirent ou vacillent par images entières.
- **Petits vivants** : papillons de nuit autour des lampes, oiseaux qui traversent le ciel.

### Une palette pour toutes les animations

Toutes les animations d'un lieu partagent **une seule planche, donc une seule palette** : celle de
la première animation. Chaque groupe de couleurs doit donc être enrôlé dans la palette commune
(`shared.ts` : `enlist`, `imageIn`) avant qu'aucune image ne soit faite. Sans cela, les couleurs
d'une animation sont lues dans la palette d'une autre (les silhouettes deviennent noires, les
oiseaux disparaissent).

## 5. Les budgets

- **Mémoire vidéo** : moins de 9 Mo par lieu, planche d'animations comprise
  (`tests/build/vram-budget.test.ts`). Sahel : `far` 2,6 + `mid` 3,1 + `floor` 0,6 + planche ≈ 2
  Mo. Une animation pleine largeur coûte cher (la poussière sur toute la route faisait 1,4 Mo) :
  préférer des rectangles serrés.
- **Flashs** : un lieu lumineux sort de l'enveloppe de minuit (`FLASH_OUTSIDE_STAGES`) ; ses
  couleurs ne servent pas à mesurer les flashs.
- **D23** : rien n'est interpolé entre deux tics ; tout mouvement est une image entière ou un
  glissement par pixels entiers.
- **Au plus 3 flashs par seconde** : les lampes ne clignotent jamais plein écran.

## 6. Le contrôle

À chaque itération, avant de juger :

1. **Les trois vues** : caméra à gauche, au centre, à droite, avec Nayo et Riff posés sur la ligne
   du sol, couches et animations composées comme le jeu le fait.
2. **Le zoom ×3** à côté des personnages : le décor doit tenir la comparaison pixel pour pixel.
3. **L'avant / après** au même cadrage.
4. **Un instant calme et un instant du drop** : la foule vit, les bras sont attachés aux corps.
5. **Les tests** : taille et opacité des plans, palettes, moins de 8 % de pixels orphelins sur les
   plans peints (12 % sur le sol tramé), budget vidéo, beat de 2 400 pas.

## 7. Les pièges déjà rencontrés

| Piège | Symptôme | Remède |
|---|---|---|
| Blocs 2 × 2 | fond deux fois plus gros que les personnages | toujours 1 × 1 |
| Échantillonnage au plus proche | bruit, « PNG » | rééchantillonnage par aires |
| Kuwahara au rayon 1 | contours en miettes | rayon 2, puis netteté |
| Une seule image | décor plat | trois plans, ciel complété |
| Sol peint | flou sous les pieds | sol dessiné, une seule surface |
| Miroir pour boucler un sol | taches symétriques | fondu de la fin dans le début, ou sol dessiné |
| Mur blanc pris pour du ciel | trous dans la rue | seuil de chroma, graines au milieu du bord |
| Fils qui coupent le ciel | bandes de ciel non découpées | sauts de 5 px |
| Palettes d'animations différentes | silhouettes noires, effets invisibles | une palette commune |
| Têtes détectées automatiquement | bras flottant au-dessus des têtes | têtes relevées à la main |
| Ombres chaudes de la peinture | personnages et décor « dans deux mondes » | étalonnage commun des palettes |
| Fumée en disques réguliers | « colonne de boules » | tailles, balancements et dérive propres à chaque bouffée |

## 8. La recette pour un nouveau lieu

1. Mettre l'illustration dans `art-src/<lieu>/source/`.
2. Copier `tools/stage/sahel/adapt.ts`, régler l'échelle (la rangée de la source qui tombe sur le
   sol), les seuils du ciel, les palettes.
3. Passer chaque palette par `unifyPalette` (kit/unify.ts), puis lancer `adapt.ts` et
   `npm run stages`.
4. Écrire le sol dans `floor.ts` : la terre, la pierre ou l'asphalte du lieu, sa lumière, sa
   perspective ; le brancher aussi dans `mid` sous la ligne de la foule.
5. Relever les têtes de la foule sur une grille ×3, régler les seuils, brancher `crowd.ts`.
6. Ajouter les effets du lieu dans `vfx.ts`, chaque palette enrôlée dans `shared.ts`.
7. Contrôler (§6), vérifier le budget, documenter dans `docs/art/decor-<lieu>.md`.
