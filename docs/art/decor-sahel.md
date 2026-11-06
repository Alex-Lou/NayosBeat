# Le décor : Sahel Sunset, la rue du marché au coucher du soleil

Statut : map jouable, adaptée de l'illustration fournie par le propriétaire (issue #155,
commentaire `6660254649`). Le nom **Sahel Sunset** vient du Sahel, la bande de savane au sud du
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
2. **Aplatissement de Kuwahara** : les dégradés peints deviennent des aplats, les contours restent ;
   puis un **masque de netteté** (×1,5) redonne aux arêtes la dureté de celles des personnages.
3. **Palette k-means en Lab**, petite et propre à chaque plan ; pas de tramage sur la rue et la
   route, un tramage léger dans le ciel seulement, pour ses bandes.
4. **Pixels orphelins supprimés** : un pixel seul de sa couleur prend celle de ses voisins. Les
   amas sont nets, comme sur les sprites.
5. **Contour** : un pixel sombre là où la rue rencontre le ciel, et sur le côté sombre des arêtes
   (écart de clarté de 16 en Lab), comme le trait des personnages, en plus doux.

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

Les plans peints sont un peu moins saturés que les personnages : les combattants s'en détachent.

## 3. Le sol, dessiné

La terre de l'illustration, même pixellisée, restait une peinture floue juste sous les pieds des
combattants, là où l'œil compare le plus. Elle est donc **dessinée pixel par pixel**
(`tools/stage/sahel/floor.ts`), dans une seule surface qui va des pieds de la foule jusqu'au bord
de l'écran :

- `floor` est entièrement dessiné ;
- dans `mid`, à partir de la rangée 404, chaque pixel de terre nue de la peinture (sa terre cuite,
  ou le gris de sa poussière) est remplacé par la même terre dessinée ; les pneus, les fûts, les
  caisses, les pieds et l'herbe restent ceux de la peinture, et les miettes de peinture de moins de
  48 pixels perdues dans la terre disparaissent.

Ce qui fait le dessin :

- **la perspective** : la taille du grain, des mottes, des cailloux, des ornières et des fissures
  suit `scaleAt(rangée)` = e^(0,0147 × (rangée − 460)) : ×1 aux pieds, ×3,2 au bord de l'écran,
  ×0,55 au fond de la rue ;
- **la lumière** : le soleil bas, derrière la rue, éclaire le fond de la route ; elle s'assombrit
  vers le spectateur. Les cailloux sont éclairés sur le dessus et jettent leur ombre vers l'avant ;
  les ornières ont leur lèvre éclairée et leur fond dans l'ombre ;
- **la matière** : une terre cuite en 10 tons (celle de la rue peinte), des mottes sombres à sommet
  clair et des plaques tassées, des cailloux en amas là où la terre est meuble, des fissures, deux
  flaques qui gardent le violet et l'or du ciel, quelques touffes sèches.

Le tramage ordonné n'intervient qu'au milieu de chaque marche de ton : le reste est en aplats.

## 4. Les animations

Toutes sont des props `overlay`, dans `tools/stage/sahel/index.ts`, sur le plan de ce qu'elles
animent.

| Prop | Plan | Ce qu'il fait | Cycle |
|---|---|---|---|
| `sun-glow` | `far` | le soleil respire derrière la rue | 4 images, 240 pas |
| `laundry` | `mid` | un reflet chaud parcourt le linge étendu | 4 images, 96 pas |
| `birds` | `far` | une nuée traverse le couchant, ailes hautes et basses | 2 images, traversée de 400 pas |
| `lamp-awning` | `mid` | l'ampoule sous l'auvent respire | 6 images, 270 pas |
| `lamp-street` | `mid` | le lampadaire du carrefour respire, à son propre rythme | 6 images, 270 pas |
| `lamp-lane` | `mid` | la lampe de la ruelle suit, plus discrète | 6 images, 270 pas |
| `lamp-high` | `mid` | le grand lampadaire de droite s'allume et s'apaise | 6 images, 270 pas |
| `dust` | `floor` | la poussière dorée dérive au ras de la route | 5 images, 200 pas |

Les changements sont des images entières, sans interpolation (D23). Les lampes ont chacune leur
phase et aucune ne produit d'éclair plein écran.

## 5. Le branchement

- `tools/stage/maps.ts` : `SAHEL`, avec ses trois plans.
- `src/art/sahel/index.ts` : `STAGE_VARIANTS` depuis les images installées.
- `src/art/stages.ts` : la map dans `STAGE_MAPS` (« Lieu », entraînement, budgets).
- `src/render/stage-view.ts` : `sahel` dans `FLASH_OUTSIDE_STAGES`.
- `tests/tools/stage-sahel.test.ts` : les trois plans, la découpe, les palettes, les pixels
  orphelins (moins de 8 % sur les plans peints, 12 % sur le sol tramé), la map et les huit props.

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
5. **Cette version** : le sol est dessiné en perspective, la rue est plus nette.

Un décor entièrement redessiné en code a aussi été essayé : plus cohérent en théorie, mais plat et
pauvre à côté de l'illustration ; écarté.
