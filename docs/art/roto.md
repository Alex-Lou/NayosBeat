# Roto — une sous-couche de sprite à partir d'une image

`npm run roto` ouvre une page : on y dépose une image, l'outil en détoure le sujet, le met à la
taille des combattants, lui pose les pieds sur l'ancre du jeu et le ramène au grain du pixel art.
Ce qui en sort est une **sous-couche à dessiner par-dessus**, pas une planche que le jeu peut
charger. La différence est expliquée au §1.

```bash
npm run roto
```

## 0. Ce que la source doit avoir

L'outil ne comprend rien, il mesure. Pour qu'il trouve l'ancre et l'échelle, l'image doit remplir
quatre conditions :

| Condition | Pourquoi |
|---|---|
| Corps entier, **pieds visibles et posés** | La rangée la plus basse du sujet devient la ligne des semelles. Des pieds coupés, et l'ancre est fausse. |
| **Un seul sujet** | Deux silhouettes, et la boîte englobante ne veut plus rien dire. |
| **Fond uni, ou canal alpha** | Sans modèle de segmentation, un fond chargé ne se détoure pas (§2). |
| **Tourné vers la droite** | Convention des planches ; le moteur retourne le sprite. La case **Retourner** est là pour les autres. |

Un rendu Blender ou une image générée en PNG transparent remplit les quatre d'office. Une photo en
pied devant un mur uni marche aussi.

Pour une vidéo, rien n'est intégré : on en sort les images avec `ffmpeg`, puis on les passe une par
une.

```bash
ffmpeg -i mouvement.mp4 -vf fps=12 images/%03d.png
```

## 1. Ce que l'outil fait, et ce qu'il ne fait pas

**Il fait** : détourer, mesurer, mettre à l'échelle, poser sur l'ancre, réduire au grain, limiter la
palette, poser un contour. C'est-à-dire tout le travail d'alignement, qui est long à la main et que
la machine fait exactement.

**Il ne fait pas** : écrire une planche du jeu. Une planche est un PNG indexé **dont les pixels sont
les numéros de slots** de la palette du combattant (`docs/art/aseprite.md`), parce que la tenue alt
est la même image avec une autre palette. Pour y arriver automatiquement, il faudrait savoir que
*ce* gris sombre est le contour de la veste et *celui-là* le contour du pantalon : c'est un problème
de segmentation que cet outil ne résout pas. La sortie est donc en vraies couleurs, et c'est au
dessin de la ramener dans la palette.

> **Incertitude à lever.** La sous-couche se charge aujourd'hui à la main dans Aseprite. Les
> *reference layers* d'Aseprite acceptent sans doute une image RGB même en mode Indexé, mais ce
> n'est pas vérifié. Si ce n'est pas le cas, il faudra injecter le calque dans le gabarit
> (`tools/sprites/aseprite-template.ts`, qui sait déjà poser un calque verrouillé jamais exporté),
> ce qui touche le format v3 et l'extension.

## 2. La silhouette (`tools/roto/silhouette.ts`)

Deux voies, dans cet ordre :

- **l'image le dit déjà** : assez de pixels transparents, et le canal alpha fait foi ;
- **sinon le fond est détouré** : un remplissage part des **quatre coins**, chacun gardant sa propre
  couleur de référence, et s'étend tant que la couleur reste à moins de `tolérance` de ce coin
  (ΔE en Lab).

Quatre références, donc un mur et un sol de deux couleurs différentes s'en vont tous les deux. La
référence ne bouge jamais, donc un remplissage ne peut pas dériver le long d'un bord doux jusque
dans le sujet. Et ce sont les coins, pas tout le bord, **parce que les pieds touchent souvent le bas
du cadre** : un remplissage parti des pieds mangerait le personnage.

**Un coin qui ne ressemble à aucun autre est écarté.** Un sujet qui remplit le cadre déborde dans un
coin ; y amorcer un remplissage inonde le sujet et rend une silhouette vide, et c'était la seule
façon dont cette méthode échouait sans rien dire. Un coin n'amorce donc un remplissage que si au
moins un autre coin lui ressemble (même tolérance). Si aucun ne s'accorde, les quatre servent : il
n'y a rien à en tirer, et les avertissements du §2.1 diront ce que cela a donné.

Ensuite le bord est nettoyé (`tidy`, une passe par défaut) : un pixel de sujet qui n'a qu'un voisin
de sujet s'en va, un pixel de fond qui en a trois rentre. Les cheveux, la fourrure et le flou de
bougé laissent exactement cette frange d'un pixel sur une photo détourée, et elle se met à grouiller
dès que l'image est réduite. Rien de plus large qu'un pixel n'est touché.

Enfin les poussières partent : le plus grand îlot est gardé, et tout îlot valant au moins `minShare`
de lui (une main détachée, une arme). Un trou à l'intérieur du sujet est gardé par construction — le
remplissage ne l'atteint jamais.

**La limite est celle de la méthode, pas un défaut** : fond uni, oui ; bibliothèque derrière le
sujet, non.

## 2.1 Ce que l'outil refuse de deviner

`tools/roto/concerns.ts`. L'outil mesure, il ne comprend pas. Un portrait de studio sans pieds dans
le cadre lui donne une silhouette parfaitement propre dont le pixel le plus bas est l'ombre d'un
col — et il posera ce col sur l'ancre, mettra une tête à la hauteur d'un combattant entier, et
annoncera « pieds posés sur l'ancre » sans ciller. **Une réponse fausse et confiante est pire que
pas de réponse.** Chaque jugement qu'il ne peut pas porter est donc levé par son nom, avec le chiffre
qui l'a levé.

| Avertissement | Ce qu'il mesure | Ce qu'il veut dire |
|---|---|---|
| `narrow-base` | la base fait moins de **25 %** de la largeur du sujet | ce n'est pas des pieds : une ombre, une queue, un col. **L'ancre est une supposition.** |
| `cut-off` | la boîte du sujet touche un bord de l'image | ce qui est hors cadre manque à toutes les mesures |
| `nothing-kept` | moins d'1 % de l'image gardé | tolérance trop haute, ou le sujet a la couleur de son fond |
| `everything-kept` | plus de 95 % gardé | le fond n'a pas été reconnu |
| `corner-dropped` | un coin se tenait sur le sujet | le sujet remplit le cadre |
| `specks` | plus de 3 îlots écartés | le détourage accroche le fond |
| `overflow` | le sujet sort de la case | la hauteur demandée est trop grande |

Ce sont des **avertissements, pas des erreurs** : chacun a un cas où il est normal, donc rien n'est
refusé. `anchorIsAGuess` regroupe ceux qui ruinent une planche, et la ligne « Pose » change alors de
mot : « base posée sur l'ancre », pas « pieds ».

## 3. La pose (`tools/roto/place.ts`)

Deux règles viennent du pipeline et ne sont pas des réglages :

- la dernière rangée des pieds est sur la rangée de l'ancre (`src/art/types.ts` `ANCHOR`, rangée
  248 d'une case de 256), et le centre des pieds sur sa colonne ;
- **aucun pixel à demi transparent** (`docs/art/aseprite.md`) : le rééchantillonnage garde la
  couverture pour moyenner les couleurs, puis l'alpha bascule à la moitié.

Le rééchantillonnage est **par aires, en lumière linéaire, et seulement sur les pixels du sujet** :
le bord de la silhouette ne prend jamais la couleur du mur derrière. Quand la source est plus petite
que la cible, les aires tombent sous le pixel et cela devient une copie au plus proche — ce que veut
le pixel art de toute façon, rien n'est interpolé (D23).

La **hauteur debout** par défaut est de **157 px d'art** (314 sur une case HD). Ce n'est pas la
valeur de `docs/art/prompt-sprites.md` §0 (84 px du monde, soit 168 d'art) : 157 est ce que mesure
la seule planche dessinée à la main aujourd'hui, `art-src/feline/idle.png`, image 1, rangées 92 à
248. Le tableau est une cible, la planche est le dessin.

## 4. La chaîne de pixels (`tools/roto/pixelize.ts`)

C'est celle des décors (`docs/art/manifeste-pixel-art.md` §2, `tools/stage/sahel/adapt.ts`), dans le
même ordre, ramenée à ce dont un personnage a besoin :

```
Kuwahara → netteté → saturation → contour → palette → orphelins
```

Ce qu'un personnage a en plus : **le contour est dessiné sur le bord de la silhouette**, avant le
choix de la palette, pour que la médiane lui dépense un slot au lieu de l'arrondir. Ce trait sombre
d'1 px est l'essentiel de ce qui fait qu'un sprite se lit sur n'importe quel fond.

Ce qui est laissé de côté dans cette première version, et pourquoi :

- **pas de tramage.** Sur un décor il ne tourne que sur les dégradés ; sur un personnage c'est du
  bruit qui grouille dès que la caméra bouge (`docs/art/proprete.md`). Un sprite veut des aplats.
- **pas de slots de palette.** Voir §1.
- **médiane plutôt que la méthode par superpixels.** Voir §6.

## 5. Comment les valeurs par défaut ont été choisies

Par mesure, sur une planche qu'on a déjà. `art-src/feline/idle.png`, image 1, a été agrandie ×4,
posée sur un mur éclairé avec du grain, puis repassée dans la chaîne et comparée au dessin
d'origine.

Résultat : la silhouette mesure **629 px** pour 628 attendus, et la case retombe sur **314 px** de
haut, soit exactement les 157 px d'art du sprite ×2. L'échelle et l'ancre sont donc justes au pixel.

En revanche, les premiers réglages (Kuwahara 2, orphelins 2) **effaçaient l'œil et l'oreille** : à
cette taille ces détails font deux pixels, et Kuwahara, qui prend la moyenne du quadrant le plus
calme, préfère la masse de cheveux unie. D'où les valeurs retenues :

| Réglage | Défaut | Pourquoi |
|---|---|---|
| Kuwahara | **0** | Utile sur une peinture, destructeur sur un visage de 2 px. Reste au curseur pour une photo granuleuse. |
| Netteté | 0,7 | La valeur des décors. |
| Saturation | 1,1 | Celle de Gerstner et al. §4.4, une habitude de pixel artist. |
| Contour | 70 % de la clarté | La fourchette du manifeste (65 à 75 %). |
| Couleurs | 32 | Assez pour une sous-couche fidèle ; un sprite fini en garde moins. |
| Orphelins | 1 | À 2 passes, les reflets isolés commencent à partir. |
| Nettoyage du bord | 1 passe | Enlève la frange d'un pixel des cheveux sans toucher aux vraies formes. |

### Le seuil de `narrow-base`

Mesuré sur les deux cas sous la main : la planche sur un mur plante ses pieds sur **94 %** de sa
largeur, le portrait pose son col sur **5 %**. Un quart passe loin des deux, et du bon côté — celui
qui laisse un combattant se tenir les pieds joints.

## 6. La suite, si cela vaut le coup

**La méthode par superpixels.** Gerstner, DeCarlo, Alexa, Finkelstein, Gingold et Nealen,
*Pixelated Image Abstraction* (NPAR 2012), optimisent **ensemble** le découpage de l'image et la
palette, au lieu de réduire puis quantifier. Leur étude utilisateur la donne meilleure que la
méthode naïve. Les paramètres du papier, pour le jour où :

- superpixels initialisés sur une grille régulière, un par pixel de sortie ; SLIC modifié,
  `d = dc + m·√(N/M)·dp` en Lab avec **m = 45** (SLIC seul conseille 10), la couleur d'un superpixel
  étant **sa couleur de palette**, pas sa moyenne — c'est là toute l'astuce ;
- lissage laplacien des centres, **40 %** vers la moyenne des 4 voisins, puis filtre bilatéral sur
  les couleurs représentatives ;
- palette par recuit déterministe à masse contrainte : `T₀ = 1,1·Tc`, `α = 0,7`, `Tf = 1`,
  `P(ck|ps) ∝ P(ck)·e^(−‖ms′−ck‖/T)`, séparation des sous-clusters le long de l'axe principal ;
- **carte d'importance** (§4.5) : `P(ps)` pondéré par l'importance moyenne des pixels du superpixel.
  C'est exactement là que **notre silhouette se branche** — le sujet important, le reste non.

**Les slots de palette**, si la segmentation par matériau devient faisable.

**Un mode portrait.** Le pipeline a déjà un format de portrait (96 × 96, palette du personnage,
`art-src/<perso>/portrait.png`, voir `docs/art/aseprite.md`). Une photo de tête n'a pas de pieds et
n'a rien à faire sur une case de combat ; elle a tout à faire sur un portrait. C'est la suite la plus
évidente, et la moins chère : la même chaîne, un autre cadre, sans ancre.

**Désigner le fond au clic.** Quand les quatre coins sont sur le sujet, plus rien ne distingue le
fond. Un clic sur la source pour ajouter un point de départ réglerait ces cas-là.

**Les séquences.** Une planche entière, pas une image : le nombre d'images vient de
`src/art/<perso>/sheets.ts`, et il faudra une palette figée pour toute la planche et un ancrage
repris image par image, sinon le résultat grouille.

## Sources

- Gerstner, DeCarlo, Alexa, Finkelstein, Gingold, Nealen, *Pixelated Image Abstraction*, NPAR 2012 —
  <https://pixl.cs.princeton.edu/pubs/Gerstner_2012_PIA/index.php>
- Version journal, *Pixelated image abstraction with integrated user constraints*, Computers &
  Graphics 37(5) — <http://www.nealen.net/papers/pixelated_image_abstraction-journal.pdf>
- MakeItPixel, le détail d'un convertisseur libre (réduction, quantification, tramage) —
  <https://github.com/MiguelMJ/MakeItPixel/wiki/Process>
