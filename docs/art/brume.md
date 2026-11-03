# La brume

La troisième météo des lieux (`passation-decors.md` §7.1), après la nuit claire et la pluie (`pluie.md`). Une ambiance est un moment et une météo (`decor-rue.md` §13). La brume est la météo `fog`.

## 1. Les choix du développeur

- **Dix lieux jouables, chacun avec ses météos** : le ciel clair et deux météos qui lui vont (tableau du §4).
- **Une quatrième météo, la neige**, pour Temple Courtyard d'abord. Elle viendra avec lui.
- **Pas de plein jour** : le temple se joue à l'aube, au crépuscule et la nuit, dans la bande des flashs (`flashs.md` §3).
- **Une PR par lieu**, la brume d'abord, parce qu'elle sert à tous.

## 2. Ce qu'elle fait

Elle est faite pour n'importe quel lieu, dans `tools/stage/kit/fog.ts`.

- **La palette** (`fogged`) :
  - les rampes du lointain (le ciel, les nuages, les tours) se noient dans la couleur de la brume, ton pour ton : plates, presque effacées ;
  - le reste du lieu y descend un peu, plus près ;
  - les lumières (lampes, néons, fenêtres) restent aussi vives : elles brillent dans la brume ;
  - les masses repassent sous le plafond des mesures de flashs (`ceiled`).
- **Les bancs de brume** (`mistProp`), deux par lieu :
  - des voiles clairsemés, plus pleins au cœur, à travers lesquels le décor se voit ;
  - ils dérivent lentement d'un bout du calque à l'autre (`StageDrift`), chacun dans son sens et à sa vitesse (40 s pour les bancs bas, 50 à 60 s pour ceux du lointain) ;
  - ils n'existent que par temps de brume (`weather: 'fog'`).
- **Où elle est** :
  - dans le lointain, sur le calque `far` ;
  - ou basse, au ras du sol, sur le calque `mid`, devant les murs et derrière les combattants.

  Jamais sur le sol (`floor`), qui est devant eux : ils restent parfaitement lisibles (test).
- **Le rendu n'y fait rien** : aucune couche en plus, aucune passe d'écran en plus. Tout est dans les données du lieu. Le cœur n'en sait rien (D17), et rien n'est interpolé (D23).

## 3. Les lieux dans la brume

- **La rue** : les tours et la ligne aérienne s'effacent. Une brume basse traîne sur le trottoir, derrière la file d'attente du club ; un banc passe au-dessus des toits.
- **Le Viaduct Gym** : couvert, il voit la brume par sa verrière, la nuit de brume de la rue, ton pour ton. Aucun banc ne dérive sous la voûte : il passerait devant la brique.
- **The Loading Dock** : la ville au-dessus du toit a disparu, la rue de derrière n'est plus qu'un creux gris au bout de l'allée. Une brume basse traîne dans la cour, au pied du quai.
- **Rooftop Rain** : la mégapole noyée, ses tours en fantômes. Les enseignes violettes et jaunes brillent dans la brume, et les bancs passent devant les tours. Le faisceau du dirigeable les traverse.

## 4. Les météos des dix lieux

Le ciel clair partout, plus deux météos qui vont au lieu. Les moments (minuit, crépuscule, aube) s'y ajoutent, lieu par lieu.

| Lieu | Météos | Moments |
| --- | --- | --- |
| Warehouse Street (`rue`) | pluie, brume | minuit, crépuscule |
| Viaduct Gym (`gym`), couvert | pluie, brume (par la verrière) | minuit, crépuscule |
| The Loading Dock (`dock`) | pluie, brume | minuit, aube |
| Rooftop Rain (`rooftop`) | pluie (minuit, crépuscule), brume | minuit, crépuscule |
| Temple Courtyard (`decor-temple.md`) | pluie (crépuscule), neige (nuit) | aube, crépuscule, nuit |
| L'Entrepôt, intérieur (`decor-club.md`), couvert | brume (la fumée de la piste), pluie (par la porte du quai) | minuit |
| Le Bal du Samedi (`decor-bal.md`), couvert | pluie, neige (par les hautes fenêtres) | minuit |
| Sunset Beach (`decor-plage.md`), demandée en plus | pluie (une averse tropicale), brume (marine) | crépuscule seulement |
| Night Market | pluie, brume | minuit, crépuscule |
| Pachinko Alley | pluie, brume | minuit |
| Ferry Deck | brume, pluie (la tempête) | minuit, crépuscule |
| The Laundromat 24/7, couvert (11e, en option) | pluie, neige (par la vitrine) | minuit |

Le développeur veut dix lieux : les quatre faits et six nouveaux. Le plan en listait sept (`passation-decors.md` §7.2) : la laverie passe en dernier, en option, car la rue la montre déjà de l'extérieur.

## 5. Les budgets

- **Les bancs** coûtent une image chacun dans la planche des animations :
  - la rue passe à 977 × 236 (7,2 Mo pour le lieu) ;
  - le Dock à 994 × 328 (7,6 Mo) ;
  - Rooftop Rain à 1 020 × 416 (8,0 Mo).

  Tous restent sous les 9 Mo d'un lieu. Le gym n'a pas de banc, et sa planche ne bouge pas.
- **Les grandes couleurs** de la brume restent dans la bande des flashs et dans l'enveloppe du fond le plus clair, dans chaque lieu (tests de contrat). La brume est sombre, une nuit de brume : elle aplatit le lointain sans l'éclaircir.

## 6. La suite

1. La neige (Temple Courtyard).
2. Plus tard, si le jeu le demande : des halos autour des lampes dans la brume, dans des rampes cachées comme les flaques du Dock.
