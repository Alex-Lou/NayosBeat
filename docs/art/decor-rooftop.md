# Rooftop Rain

Le quatrième lieu des combats, après la rue (`decor-rue.md`), le Viaduct Gym (`decor-gym.md`) et le Loading Dock (`decor-dock.md`). C'est le lieu de Néon Underground (`univers.md` §2) : une mégapole en 2090, où les combats clandestins se jouent sur les toits, sous la pluie, entre deux livraisons. Le système des lieux est décrit au §14 de `decor-rue.md`, la pluie dans `pluie.md`.

## 1. L'intention

Un toit d'immeuble, haut au-dessus de la ville, de nuit. Derrière les combattants se dressent les enseignes géantes qui parlent à la rue d'en bas : on les voit de dos, leurs lettres à l'envers, leur lumière qui déborde dans la pluie. Autour : une cabane d'escalier et sa lampe, deux personnes de la foule à l'abri dessous, un réservoir d'eau, des climatiseurs, une antenne, du linge qui sèche. Au loin, les tours, les voitures volantes. Toutes les 40 s, un dirigeable passe lentement derrière les enseignes en balayant la pluie de son projecteur.

Le lieu doit se lire en une seconde (« sur un toit, dans la ville du futur ») et rester plus calme derrière les combattants qu'au-dessus d'eux : les enseignes et le dirigeable sont dans le haut de l'écran, la charpente et le parapet derrière les corps.

Les choix du développeur :
- les ambiances sont la nuit claire, et deux pluies : à minuit et au crépuscule ;
- le moment fort est le dirigeable ; entre deux passages, des voitures volantes glissent au loin en continu.

## 2. La composition, de loin à près

Mêmes calques, mêmes tailles et même grain que la rue (×2).

### 2.1 `far`, la ville au-delà du toit (25 %)

- Un ciel bleu nuit, violet vers les tours ; deux bancs de nuages bas, le ventre éclairé en violet par la ville.
- Les tours les plus lointaines, à demi effacées dans la brume, puis les plus proches, plus sombres que leur ciel, leur arête éclairée. Leurs fenêtres vont par colonnes, presque toutes endormies.
- Quelques petites enseignes verticales sur les tours (orange, vert, violet, jaune), les feux rouges des flèches, une passerelle entre deux tours.
- Les voies de circulation lointaines : des lignes de points de lumière, trop loin pour bouger.
- **Ce qui glisse dessus** (`index.ts`), sans être dans l'image fixe :
  - **cinq voitures volantes**, une par voie, qui entrent par un bout du calque et sortent par l'autre, chacune à sa vitesse, dans les deux sens (phare pâle devant, feu orange et sa traînée derrière) ;
  - **le dirigeable** (§5).

### 2.2 `mid`, le toit (50 %)

- **Le parapet du fond**, sa couvertine éclairée. Au-delà, la ville.
- **La cabane d'escalier**, à gauche :
  - du béton taché, des tags ;
  - un tuyau de ventilation qui fume, des câbles vers l'enseigne ;
  - la porte d'acier sous sa lampe au sodium ;
  - une flèche de néon vert qui montre le chemin, vers le bas.

  Dessous, deux personnes de la foule : l'une, en capuche, fume ; l'autre, aux cheveux longs, s'abrite sous un parapluie, son dessus éclairé par la lampe.
- **L'enseigne géante ネオン** (« néon », en katakana), vue de dos sur sa charpente d'acier. Ses lettres sont à l'envers : la dernière à gauche, chacune en miroir. Chaque lettre est un caisson : son dos d'acier sombre, ses joints et ses boulons, l'arête éclairée de sa face qui dépasse, et sa lumière violette qui déborde autour. Le rail qui porte les lettres, une passerelle et sa rambarde à leur pied, une échelle ; la rouille au pied des poteaux.
- **Le réservoir d'eau** sur ses pieds, sa peinture bleu-vert passée au gris, ses cerclages qui rouillent, un liseré violet du côté de l'enseigne.
- **Deux climatiseurs**, leurs ventilateurs qui tournent derrière la grille.
- **L'antenne** : un mât en treillis, ses haubans, deux paraboles, trois fouets au sommet et son feu rouge.
- **L'enseigne verticale 大吉** (« grande chance »), sur son mât, vue de dos elle aussi, sa lumière jaune.
- **Le linge**, à droite : deux chemises et une serviette sur un fil entre deux poteaux.
- **Un drone de livraison** qui fait du sur-place devant la charpente.
- **La membrane du toit**, entre le parapet et la ligne du sol : ses lés d'ardoise, éclairés par la lampe et les enseignes. Sous la pluie, des flaques où les enseignes se reflètent à l'envers, étirées et brisées par les rides (§4).

### 2.3 `floor`, le toit sous les pieds (100 %)

Un sol qui se lit en bandes, pas comme une feuille grise (remarque du développeur) :
- **la membrane** d'ardoise sombre où se tiennent les combattants. Ses lés se recouvrent toutes les 64 unités du monde (un joint en relief et son ombre), et ces joints mesurent les distances comme les dalles de la rue ; des rustines, du gravier ;
- **une allée de dalles** de béton qui traverse le toit, deux dalles par lé, leurs joints sombres ;
- la membrane encore, puis **le caniveau** le long du bord, une grille tous les deux lés ;
- **la couvertine du parapet** au premier plan : son arête éclairée, ses dalles, puis sa face plus sombre, tachée, piquée de rouille.

Le contraste vient d'une membrane plus sombre et d'une allée plus claire, gardée dans la bande des flashs. Les deux bouts s'assombrissent sous l'ombre des parapets. Rien n'y fait une bande tramée sur toute la largeur.

## 3. La palette

`tools/stage/rooftop/palette.ts`, la sienne : 156 couleurs, case 0 comprise. Les silhouettes et les tags viennent du code de la rue (`FigureRamps`, `SprayRamps`).

- **La ville** : le ciel bleu nuit, les nuages, la brume, les tours, les fenêtres.
- **Les enseignes** : le violet (ネオン) et le jaune (大吉). Leurs deux pas les plus sombres sont la lumière qui déborde autour des lettres, sur de grandes surfaces : ils restent dans la bande des flashs et sous le plafond de leurs mesures (`BACKDROP_CEILING`, `kit/grade.ts`). Les pas plus clairs, l'arête des lettres, ne sont que des touches de moins de 1 % de l'écran. Quelques tubes de vert acide (la flèche, le drone) et d'orange (les tours, les feux des voitures).
- **Les matières** : la membrane d'ardoise, le béton froid, l'acier, la rouille, le réservoir.
- **La lumière** : le sodium de la lampe, les feux rouges, les phares pâles, le faisceau du projecteur.
- **Les vivants** : les corps, la peau, le liseré chaud de la lampe, la braise, le parapluie, le linge.
- **Les rampes cachées**, qui ne se voient que sous la pluie (§4) : `WET` et `WET_PAVER` (les flaques), `REFLECT_VIOLET` et `REFLECT_YELLOW` (les enseignes dans les flaques), `BEAM_DROP` (la pluie prise dans le faisceau).

Le cyan et le magenta de Néon Underground (`univers.md`) sont ceux des combattants : le lieu ne les prend pas. Aucune couleur vive n'est à moins de 25° de leurs teintes (test). Sa ville est violette, jaune, vert acide et orange.

## 4. Les ambiances

- **Minuit, ciel clair** (la base) : les enseignes et la lampe dans une nuit sèche.
- **Minuit, pluie** : une pluie battante (`pluie.md`). Le toit et la ville plus sombres et plus froids, trempés ; les enseignes, la lampe et les fenêtres aussi vives que par nuit claire ; le ciel en couvercle bas, les tours lointaines à demi effacées.
- **Crépuscule, pluie** : un orage à la tombée du jour. Le dernier jour en ambre sourd derrière les tours, sous un couvercle bleu ; le ventre des nuages rosé ; le toit mouillé dans l'ombre du soir ; les enseignes à peine allumées, aussi vives que la nuit.

Sous la pluie, trois choses apparaissent, que la palette sèche cache :
- **les flaques**, sur la membrane et les dalles du sol, et sur la membrane du fond ;
- **les enseignes dans les flaques** : sous chacune, la membrane se creuse et l'eau s'y accumule. Ses lettres s'y reflètent à l'envers, étirées vers nous et brisées par les rides, en violet sous ネオン et en jaune sous 大吉 ;
- **la pluie dans le faisceau** du projecteur, des traits qui s'allument.

Comme au Dock, ces dessins sont faits dans des rampes à part. Hors de la pluie, elles reprennent les couleurs de la membrane, du béton ou du faisceau, ton pour ton : rien ne se voit. Le test de contrat le vérifie pour chaque rampe cachée.

## 5. Ce qui bouge

Toutes les animations jouent dans le rendu seul (D17), image par image (D23).

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- |
| `car0` à `car4` | une voiture volante par voie, qui traverse et revient | de 10 à 24 s la traversée |
| `blimp` | le dirigeable et son projecteur (plus bas) | toutes les 40 s |
| `mast` | le feu rouge de l'antenne ; ses fouets qui vibrent | 1 s allumé, 1 s éteint |
| `smoker` | la personne en capuche tire sur sa cigarette (braise vive, fumée) | une bouffée toutes les 9 s |
| `steam` | la vapeur du tuyau de la cabane | 14 tics par image |
| `fan0`, `fan1` | les ventilateurs des climatiseurs | 6 et 7 tics par image |
| `laundry` | le linge qui bat au vent | de 40 à 50 tics par image |
| `drone` | le drone qui monte et descend d'un pixel, son voyant | 24 tics par image |

**Le dirigeable**, le moment fort. Toutes les 40 s (un cycle de 2 400 tics, `BLIMP_CYCLE`), il entre par le bout droit du calque à `PASS_AT` (5 s) et en sort par le gauche 25 s plus tard (`PASS`). Il traverse l'écran en une quinzaine de secondes :
- il passe derrière l'enseigne ネオン ;
- son flanc porte un panneau allumé, « TONIGHT » en jaune ; sa nacelle a ses fenêtres allumées et ses feux ;
- **son projecteur balaie la pluie** : un faisceau clairsemé sous la nacelle, qui va et vient entre cinq angles, chacun tenu 50 tics (un aller-retour en 6,7 s). Sous la pluie, les gouttes prises dans le faisceau s'allument ;
- quand il passe au-dessus du toit (le milieu de son passage, `overhead`), son bourdonnement fait vibrer les fouets de l'antenne.

Le test de contrat vérifie que le dirigeable ne se montre que pendant son passage, que l'antenne ne vibre que quand il est au-dessus, et que le feu de l'antenne comme chaque angle du faisceau tiennent 20 tics au moins.

- **Le glissement** (`StageDrift`, `src/art/stage-layers.ts`). Le dirigeable et les voitures traversent tout le calque. En images, il en faudrait des centaines, et la planche ne tiendrait pas en mémoire vidéo. Une animation peut donc glisser : ses images sont dessinées une fois, à leur place, et la vue les déplace d'un départ à une arrivée, d'un pixel entier à la fois, sans rien entre deux. Départ et arrivée sont au-delà des deux bouts du calque (test) : rien n'apparaît ni ne disparaît dans le champ.
- **Pourquoi 40 s** : comme le train du gym et la basse du Dock, pour qu'on le voie au moins une fois par match.
- **Les flashs.** Rien ne clignote vite : le feu de l'antenne tient chaque état une seconde, et sur quelques pixels. Le faisceau change d'angle toutes les 50 tics, clairsemé et sombre ; le dirigeable glisse d'un pixel à la fois.
- **Ce que voit le gros plan.** Au plus près (`MAX_CLOSE_UP`, `camera-framing.ts`), le combat ne montre le monde qu'à partir de y = 71, et le HUD en couvre le haut. Le premier essai faisait passer le dirigeable plus haut : en jeu, on ne voyait que son faisceau. Il passe maintenant juste au-dessus des têtes, sous le HUD. Les enseignes et l'antenne sont descendues aussi : on lit le bas de ネオン, 大吉 en entier et le feu de l'antenne. Au centre, on voit aussi le réservoir et les climatiseurs ; la cabane et le linge sont aux deux bouts.

## 6. Les budgets

- **Les calques** font les mêmes tailles que ceux de la rue : 6,3 Mo en mémoire vidéo.
- **La planche des animations** fait 990 × 348, soit 1,3 Mo : le dirigeable n'y est qu'une fois par angle du faisceau, et chaque voiture une fois.
- **Le dessin** prend environ 1 s à `npm run stages`.
- **Les grandes couleurs** restent dans la bande des flashs et dans l'enveloppe du fond le plus clair des mesures, dans chaque ambiance (test de contrat, comme au Dock). Le ciel du crépuscule, les reflets et la lumière autour des lettres ont été choisis sous le plafond `#6d3c57`.

## 7. La suite

1. Les dégâts : la couvertine écaillée, une dalle qui se soulève, un climatiseur cabossé.
2. La brume : les tours lointaines avalées, un halo autour des enseignes.
3. Plus tard, si le jeu le demande : la pluie qui ruisselle des lettres, des éclairs (à concevoir sous la règle des 3 flashs).
