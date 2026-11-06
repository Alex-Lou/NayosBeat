# Le décor : Sahel Sunset, la rue du marché au coucher du soleil

Statut : map jouable, adaptée de l'illustration fournie par le propriétaire (issue #155,
commentaire `6660254649`). La méthode générale est dans `docs/art/manifeste-pixel-art.md`. Le nom **Sahel Sunset** vient du Sahel, la bande de savane au sud du
Sahara, et de la lumière du couchant qui baigne toute la scène.

## 1. L'intention

Une rue de marché africaine à l'heure dorée : les boutiques sous leur auvent de tôle, les habitants
assis devant, les voitures fatiguées, la ligne électrique qui traverse le ciel, l'acacia au-dessus
des toits et le soleil qui descend derrière la colline. Les combattants se battent sur la route de
terre, devant la foule.

## 2. La pixellisation

La source est une image RGB de 1672 × 941 (`art-src/sahel/source/sahel.png`). Elle n'est pas posée
telle quelle derrière les combattants : `tools/stage/sahel/adapt.ts` la **convertit en pixel art**,
au grain des personnages (un pixel d'image pour un pixel de leurs sprites), et la **sépare en trois
plans** qui défilent chacun à leur vitesse.

| Plan | Ce qu'il montre | Taille (pixels) | Défilement | Couleurs |
|---|---|---|---|---|
| `far` | le ciel et le soleil seuls | 1 200 × 540 | 25 % | 18 |
| `mid` | la rue : maisons, foule, voitures, fils, acacia ; sa terre est dessinée | 1 440 × 540 | 50 % | 32 + 25 |
| `floor` | la route de terre sous les pieds, **dessinée en code** | 1 920 × 80 | 100 % | 25 |

Chaque plan passe par la même chaîne :

1. **Rééchantillonnage par aires**, en lumière linéaire : chaque pixel est la moyenne exacte de la
   zone de l'illustration qu'il couvre. Pas d'échantillonnage au plus proche, donc pas de bruit
   d'aliasing (c'était le défaut de « PNG » des versions précédentes).
2. **Aplatissement de Kuwahara** (rayon 2) : les dégradés peints deviennent des aplats, les
   contours restent ; puis un **masque de netteté** (×1,6) redonne aux arêtes la dureté de celles
   des personnages.
3. **Palette k-means en Lab**, petite et propre à chaque plan ; pas de tramage sur la rue et la
   route, un tramage léger dans le ciel seulement, pour ses bandes.
4. **Pixels orphelins supprimés** : un pixel seul de sa couleur prend celle de ses voisins. Les
   amas sont nets, comme sur les sprites.
5. **Contour** : un pixel sombre (60 % de la clarté) là où la rue rencontre le ciel, et sur le côté
   sombre des arêtes (écart de clarté de 13 en Lab), comme le trait des personnages, en plus doux ;
   une dernière passe ôte les miettes de contour.

### La découpe du ciel

Le ciel est trouvé par remplissage depuis le bord haut, de proche en proche, sur des pas de couleur
calmes, et seulement sur des couleurs de crépuscule (assez claires, assez saturées : le mur
blanchi en haut à gauche n'est pas du ciel). Le remplissage saute les fils et les brindilles de
moins de 5 pixels : ils restent dans la rue, le ciel derrière eux reste du ciel. Les îlots de rue
de moins de 60 pixels perdus dans le ciel y retournent ; les poches de « ciel » de moins de 400
pixels dans la rue redeviennent rue.

Dans `far`, la rue est **effacée** derrière le ciel : chaque pixel caché prend la couleur médiane du
ciel de sa rangée, mêlée à un remplissage pyramidal. La parallaxe ne découvre donc jamais un trou ni
le fantôme d'un toit.

### L'échelle

`mid` est l'illustration à 1 440 pixels de large (×0,861) ; la rangée 600 de la source tombe sur la
ligne du sol, à la rangée 460. `far` la prend à 1 200 pixels de large.

### Le réglage

La rue garde sa saturation (×1) avec un contraste relevé (×1,06) : nette, mais sous les
personnages, qui gardent leur trait plus sombre.

### L'étalonnage commun

Toutes les palettes du lieu (`far`, `mid`, le sol dessiné, la fumée, les oiseaux) passent par
`unifyPalette` (`tools/stage/kit/unify.ts`) : leurs ombres prennent la teinte violet-bleu nuit des
personnages, leurs tons moyens se calment un peu, le couchant et les lampes restent tels quels.
Voir `docs/art/manifeste-pixel-art.md` §2.

## 3. Le sol, dessiné

La terre de l'illustration, même pixellisée, restait une peinture floue juste sous les pieds des
combattants, là où l'œil compare le plus. Elle est donc **dessinée pixel par pixel**
(`tools/stage/sahel/floor.ts`), dans une seule surface qui va des pieds de la foule jusqu'au bord
de l'écran :

- `floor` est entièrement dessiné ;
- dans `mid`, à partir de la rangée 404, chaque pixel de terre nue de la peinture (sa terre cuite,
  ou le gris de sa poussière) est remplacé par la même terre dessinée ; les pneus, les fûts, les
  caisses, les pieds et l'herbe restent ceux de la peinture, et les miettes de peinture de moins de
  120 pixels perdues dans la terre disparaissent.

Ce qui fait le dessin :

- **la perspective** : la taille du grain, des mottes, des cailloux, des ornières et des fissures
  suit `scaleAt(rangée)` = e^(0,0147 × (rangée − 460)) : ×1 aux pieds, ×3,2 au bord de l'écran,
  ×0,55 au fond de la rue ;
- **la lumière** : le soleil bas, derrière la rue, éclaire le fond de la route ; elle s'assombrit
  vers le spectateur. Les cailloux sont éclairés sur le dessus et jettent leur ombre vers l'avant ;
  les ornières ont leur lèvre éclairée et leur fond dans l'ombre ;
- **la matière** : une terre cuite en 10 tons (celle de la rue peinte), des mottes sombres à sommet
  clair et des plaques tassées, des cailloux en amas là où la terre est meuble, des fissures, deux
  flaques qui gardent le violet et l'or du ciel, quelques touffes sèches ;
- **les bords, à la Guilty Gear / BlazBlue** : chaque caillou a trois valeurs plates, un contour
  sombre, un liseré de soleil sur le dessus et une ombre portée à bord dur ; les mottes une arête
  claire en haut et une ligne sombre en bas ; les fissures un trait du ton le plus sombre.

Le tramage ordonné n'intervient qu'au milieu de chaque marche de ton : le reste est en aplats.

## 4. La vie

Toutes les animations sont des props `overlay`, sur le plan de ce qu'elles animent, dans une
**palette commune** (`tools/stage/sahel/shared.ts`) : les couleurs de `mid` d'abord, puis celles
de chaque effet.

### La foule (`crowd.ts`)

Trois zones de foule — sous l'auvent à gauche, au fond de la rue, devant l'étal à droite — et
33 personnes relevées à la main (milieu et haut de la tête). Leurs propres pixels sombres (tête et
épaules) sont repris dans `mid.png` et déplacés par pixels entiers, sur le rythme du Loading Dock :

- un **beat** de 30 pas (120 par minute) sur une boucle de 2 400 pas (40 s) : une personne sur deux
  hoche la tête d'un pixel, l'autre au temps suivant ;
- le **drop**, 8 temps au milieu de la boucle : tout le monde monte de 2 px, deux personnes sur
  trois lèvent les bras (les deux, ou un qui salue), dans le ton le plus sombre de leur torse, le
  poing liseré de soleil.

### Les effets (`vfx.ts`, `index.ts`)

| Prop | Plan | Ce qu'il fait | Cycle |
|---|---|---|---|
| `sun-glow` | `far` | le soleil respire derrière la rue | 4 images, 240 pas |
| `birds` | `far` | une nuée traverse le couchant, ailes hautes et basses | traversée de 400 pas |
| `crowd-left`, `crowd-centre`, `crowd-right` | `mid` | la foule vit sur le beat, lève les bras au drop | 2 400 pas |
| `laundry` | `mid` | un reflet chaud parcourt le linge étendu | 4 images, 96 pas |
| `lamp-awning`, `lamp-street`, `lamp-lane`, `lamp-high` | `mid` | les ampoules respirent, chacune à sa phase | 6 images, 270 pas |
| `brazier-glow` | `mid` | la lueur du fût qui brûle, sur le fût, la Jeep et la terre | 3 images, irrégulier |
| `brazier-fire` | `mid` | les flammes (4 tons francs) et leurs étincelles | 6 images, 30 pas |
| `brazier-smoke`, `grill-smoke` | `mid` | la fumée du fût et du grill de l'étal : bouffées à bord dur, face éclairée, contour | 8 images, 72 et 80 pas |
| `cone-street`, `cone-lane` | `mid` | les cônes de lumière des lampadaires, qui vacillent parfois | 2 images, irrégulier |
| `moths` | `mid` | des papillons de nuit tournent autour du grand lampadaire | 8 images, 32 pas |
| `radio` | `mid` | la radio sur la caisse, ses haut-parleurs battent le beat | 2 400 pas |

Les changements sont des images entières (D23) ; seules les lumières sont translucides, en anneaux
à bord net. La poussière pleine largeur de la version précédente est retirée : 1,4 Mo de mémoire
vidéo pour presque rien à l'écran.

## 5. Le branchement

- `tools/stage/maps.ts` : `SAHEL`, avec ses trois plans.
- `src/art/sahel/index.ts` : `STAGE_VARIANTS` depuis les images installées.
- `src/art/stages.ts` : la map dans `STAGE_MAPS` (« Lieu », entraînement, budgets).
- `src/render/stage-view.ts` : `sahel` dans `FLASH_OUTSIDE_STAGES`.
- `tests/tools/stage-sahel.test.ts` : les trois plans, la découpe, les palettes, les pixels
  orphelins (moins de 8 % sur les plans peints, 12 % sur le sol tramé), la map, les 18 props et le
  beat commun.
- `tests/tools/stage-drawn.test.ts` : Sahel, hors de l'enveloppe des flashs, est exempté de la
  bande de clarté des décors de minuit, comme Dock, Rooftop et Temple.

## 6. La clarté et les flashs

Sahel Sunset est un décor de **crépuscule** très lumineux : comme Sakura, Dancing Forest, Jungle,
Chinatown, Sunset Beam et Lomé Carnival, il est exclu de `FIGHT_STAGE_COLORS` ; les mesures de
flashs restent prises sur les décors de référence (`docs/flashs.md` §3).

## 7. L'historique

1. Grain fin, 64 couleurs, échantillonné au plus proche : fidèle, mais bruité ; un « PNG » derrière
   les combattants.
2. Blocs 2 × 2 : un fond deux fois plus grossier que les personnages. Rejeté.
3. Grain 1 ×, médian et 32 couleurs : mieux, mais toujours une seule image plate.
4. Une vraie conversion en pixel art, au grain des personnages, en trois plans ; mais le sol restait
   la peinture, flou sous les pieds.
5. Le sol dessiné en perspective, la rue plus nette.
6. La rue au grain des personnages (Kuwahara 2, contours), la terre accentuée à la Guilty Gear /
   BlazBlue, la foule vivante, le feu, la fumée, les lumières et la radio.
7. **Cette version** : l'étalonnage commun, qui donne au décor les ombres des personnages.

Un décor entièrement redessiné en code a aussi été essayé : plus cohérent en théorie, mais plat et
pauvre à côté de l'illustration ; écarté.
