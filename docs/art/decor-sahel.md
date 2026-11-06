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
| `mid` | la rue : maisons, foule, voitures, fils, acacia | 1 440 × 540 | 50 % | 48 |
| `floor` | la route de terre sous les pieds | 1 920 × 80 | 100 % | 14 |

Chaque plan passe par la même chaîne :

1. **Rééchantillonnage par aires**, en lumière linéaire : chaque pixel est la moyenne exacte de la
   zone de l'illustration qu'il couvre. Pas d'échantillonnage au plus proche, donc pas de bruit
   d'aliasing (c'était le défaut de « PNG » des versions précédentes).
2. **Aplatissement de Kuwahara** : les dégradés peints deviennent des aplats, les contours restent.
3. **Palette k-means en Lab**, petite et propre à chaque plan ; pas de tramage sur la rue et la
   route, un tramage léger dans le ciel seulement, pour ses bandes.
4. **Pixels orphelins supprimés** : un pixel seul de sa couleur prend celle de ses voisins. Les
   amas sont nets, comme sur les sprites.
5. **Contour** : un pixel sombre là où la rue rencontre le ciel, et sur le côté sombre des arêtes
   fortes, comme le trait des personnages, en plus doux.

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
ligne du sol, à la rangée 460. `far` la prend à 1 200 pixels de large. `floor` est la terre du
premier plan de l'illustration (rangées 770 à 863), à l'échelle de `mid`, sa fin fondue dans son
début sur 140 pixels pour qu'elle se répète sans couture ni motif en miroir.

### Le réglage

Les plans sont un peu moins saturés et moins contrastés que les personnages, la route plus sombre
encore (saturation 0,78, lumière ×0,74) : les combattants s'en détachent toujours.

## 3. Les animations

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

## 4. Le branchement

- `tools/stage/maps.ts` : `SAHEL`, avec ses trois plans.
- `src/art/sahel/index.ts` : `STAGE_VARIANTS` depuis les images installées.
- `src/art/stages.ts` : la map dans `STAGE_MAPS` (« Lieu », entraînement, budgets).
- `src/render/stage-view.ts` : `sahel` dans `FLASH_OUTSIDE_STAGES`.
- `tests/tools/stage-sahel.test.ts` : les trois plans, la découpe, les palettes, les pixels
  orphelins (moins de 8 %), la map et les huit props.

## 5. La clarté et les flashs

Sahel Sunset est un décor de **crépuscule** très lumineux : comme Sakura, Dancing Forest, Jungle,
Chinatown, Sunset Beam et Lomé Carnival, il est exclu de `FIGHT_STAGE_COLORS` ; les mesures de
flashs restent prises sur les décors de référence (`docs/flashs.md` §3).

## 6. L'historique

1. Grain fin, 64 couleurs, échantillonné au plus proche : fidèle, mais bruité ; un « PNG » derrière
   les combattants.
2. Blocs 2 × 2 : un fond deux fois plus grossier que les personnages. Rejeté.
3. Grain 1 ×, médian et 32 couleurs : mieux, mais toujours une seule image plate.
4. **Cette version** : une vraie conversion en pixel art, au grain des personnages, en trois plans.

Un décor entièrement redessiné en code a aussi été essayé : plus cohérent en théorie, mais plat et
pauvre à côté de l'illustration ; écarté.
