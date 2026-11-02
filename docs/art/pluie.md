# La pluie

La deuxième tranche du décor vivant (`passation-decors.md` §7.1), après les ambiances. Une ambiance est un moment et une météo (`decor-rue.md` §13). La pluie est la météo `rain` : un lieu qui l'offre la peint dans ses données, et le rendu la fait tomber.

## 1. Les choix du développeur

- **Une couche du rendu**, plutôt que des images précalculées par lieu (des dizaines de Mo pour une pluie plein écran).
- **Derrière les combattants seulement** : ils restent parfaitement lisibles.
- **Les lieux sous la pluie** :
  - la rue et le Dock à minuit (cette tranche) ;
  - Rooftop Rain, sous la pluie à minuit et au crépuscule (`decor-rooftop.md`) ;
  - le gym, avec sa verrière qui ruisselle (la suivante).

## 2. La couche de pluie (`src/render/stage-rain.ts`)

- **Ce qu'elle dessine** :
  - un **rideau** de traits penchés par le vent, de la hauteur du décor jusqu'à la ligne du sol. Il mêle les gouttes proches, longues, et les lointaines, plus courtes et plus pâles, dans une seule tuile : il ne coûte qu'une passe de l'écran ;
  - des **éclaboussures** sur toute la profondeur du sol, pour qu'elles ne s'alignent jamais.
- **Où** : derrière les combattants et sous le voile du super (`DEPTH.rain`). Le rideau suit les trois quarts des mouvements de la caméra, entre le calque du milieu et le sol.
- **Le temps** :
  - un pas de l'horloge visuelle fait tomber le rideau de 14 pixels d'image et le déporte de 4, le long de ses propres traits ;
  - les éclaboussures changent toutes les 3 étapes, entre 4 variantes.

  Tout se fait en pixels entiers, sans rien entre deux tics (D23), et dans le rendu seul : le cœur n'en sait rien (D17), les replays ne bougent pas.
- **La mémoire** : ses deux tuiles sont faites par le code au chargement, d'une graine fixe (384 × 384 et 512 × 320 pixels, soit 1,2 Mo), une fois. Elles restent dans le cache pour tous les combats sous la pluie.
- **La qualité** : au plus bas niveau de lumières (`light-quality.ts`, `off`), le rideau disparaît, une passe d'écran de moins sur un téléphone qui rame. Les éclaboussures restent.
- **Les flashs** : aucune goutte ne change une grande couleur d'aucun lieu de plus de 0,1 en luminance (test). La pluie ne clignote donc jamais, même en mouvement. Le test rougit si l'on rend les gouttes opaques.

## 3. Les palettes mouillées

Un lieu sous la pluie se repeint, case pour case, comme pour toute ambiance :
- les murs et le sol plus sombres et plus froids, trempés ;
- les lampes, les néons et les fenêtres aussi vifs que par nuit claire, ce qui les fait ressortir ;
- le ciel en couvercle bas, les tours à demi effacées.

Les grandes couleurs restent dans la bande des flashs et sous le plafond canal par canal des mesures (`ceiled`, `BACKDROP_CEILING`, `kit/grade.ts`, sorti de l'aube du Dock pour servir à tous).

**Les flaques cachées** (Dock). Un dessin est le même dans toutes les ambiances : seule la palette change. Pour que la pluie laisse des flaques, le Dock les dessine avec une rampe à part, `WET`. Hors de la pluie, elle reprend les couleurs du béton, ton pour ton : rien ne se voit, et les PNG du Dock sec sont restés identiques à l'octet. Sous la pluie, elle devient l'eau qui reflète.

La rue n'a pas de flaques cachées : le gym empile sa palette sur celle de la rue, et une case de plus le ferait dépasser 256 couleurs. Ses flaques dessinées et son trottoir assombri suffisent pour cette tranche.

## 4. La suite

1. Rooftop Rain, qui teste la pluie à fond (minuit et crépuscule) : fait (`decor-rooftop.md`). Il ajoute des rampes cachées pour les reflets des enseignes dans les flaques et la pluie prise dans le faisceau du dirigeable.
2. Le gym : sa propre palette, puis la verrière qui ruisselle et la gouttière qui fuit dans un seau.
3. Plus tard, si le jeu le demande : quelques gouttes devant les combattants, coupées par « Réduire les effets ».
