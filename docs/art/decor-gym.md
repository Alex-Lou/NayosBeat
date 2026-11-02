# Le Viaduct Gym

Le deuxième lieu des combats, après la rue (`decor-rue.md`). C'est le lieu de Nayo : la salle du Viaduc, sous la ligne aérienne, où il a appris à boxer au rythme des trains (`histoire.md`). Le système des lieux est décrit au §14 de `decor-rue.md`.

## 1. L'intention

Une salle de boxe installée dans une arche de viaduc : une voûte de brique noircie par un siècle de trains, de la fonte peinte en vert de chemin de fer, un vieux plancher huilé, un ring bordeaux. La lumière vient de tubes fluorescents, d'un blanc verdâtre et froid. Au bout de l'arche, une verrière en éventail montre la nuit dehors, et la travée suivante du viaduc, où passe le métro.

Le lieu doit se lire en une seconde (« une salle de boxe sous un pont ») et vivre sans jamais distraire du combat. Tout ce qui bouge est petit, sombre, et sur un rythme lent.

## 2. La composition, de loin à près

Mêmes calques, mêmes tailles et même grain que la rue (×2).

### 2.1 `far`, le bout de l'arche (25 %)

- La voûte se referme en anneaux de pierre, plus sombres à mesure qu'ils s'enfoncent.
- Au bout, sous le dernier anneau, la **verrière en éventail** : un cadre de fonte, des rayons depuis un moyeu, deux anneaux de traverses, deux vitres bouchées au contreplaqué.
- Derrière la verrière : le ciel de la rue (mêmes cases de palette), les tours avec quelques fenêtres allumées, la travée suivante du viaduc (tablier, parapet, deux piles), et la rue sombre dessous.
- **Le métro** traverse la verrière de droite à gauche : trois voitures sombres, une bande de fenêtres allumées.

### 2.2 `mid`, la salle (50 %)

- L'anneau le plus proche de la voûte encadre la scène ; ses piles portent les affiches (« NO PAIN / NO GAIN », « FIGHT NIGHT / SAT 9PM »).
- Une poutre de fonte rivetée traverse la voûte. Y pendent, sur des chaînes : trois tubes fluorescents, trois sacs de frappe, le chronomètre de round.
- Au centre, **le ring** : le tablier bordeaux marqué « VIADUCT », trois cordes, les poteaux, les marches. Dedans, deux boxeurs en sparring ; sur le coin, l'entraîneur accoudé aux cordes.
- À gauche, un boxeur travaille le sac du milieu.
- À droite : la poire de vitesse, une boxeuse à la corde à sauter, les casiers (une porte ouverte), le banc, un sac et une serviette.
- Sous chaque tube, un cône de lumière poussiéreuse, en pointillé clairsemé, seulement là où le calque est vide.

### 2.3 `floor`, le plancher (100 %)

Des lames de bois huilé qui courent le long du combat, de plus en plus larges vers l'avant. Un joint toutes les 64 unités du monde mesure les distances, comme les dalles de la rue. Le milieu est usé et plus pâle. Deux croix de ruban marquent les pieds. Les deux bouts s'assombrissent sous les piles.

## 3. La palette

`tools/stage/gym/palette.ts` est la sienne :
- elle emprunte d'abord à la rue, ton pour ton, les onze rampes que le gym dessine : le ciel, les nuages et les tours par la verrière, le contreplaqué, les gens (que le code de la rue dessine, `FigureRamps`), les affiches et leur papier ;
- puis viennent ses propres rampes : la brique de la voûte, la pierre des anneaux, la fonte verte, les tubes, le bois, le ring, le cuir, la peinture, les lampes du chrono, le métro, les casiers, la poussière, le ruban ;
- enfin, la pluie : ses traits sur la verrière, l'eau de la fuite, le zinc du seau.

- Le tout fait 130 couleurs. Jusqu'à la tranche de la pluie, le gym empilait toute la palette de la rue (254 couleurs) : il ne restait plus de place pour une ambiance.
- Rien ne s'approche du cyan ni du magenta des combattants (test `stage-gym`).
- Toutes les grandes couleurs restent sous la bande des flashs, dans chaque ambiance.

## 4. Les ambiances

- **Minuit, ciel clair** (la base) : la salle à la fermeture, les tubes seuls allumés.
- **Crépuscule, ciel clair** : le soleil bas par la verrière, de l'ambre sur la brique et le plancher, des ombres bleues sous la voûte, des tubes plus pâles que le jour qui reste. Les cases empruntées à la rue prennent sa palette du crépuscule (le ciel, les tours) ; celles du gym sont virées par `grade` (`tools/stage/kit/grade.ts`).
- **Minuit, pluie** (`pluie.md`) : il pleut dehors. Par la verrière, la nuit de pluie de la rue, ton pour ton ; sous la voûte, la brique et le plancher plus froids et plus humides, les tubes aussi vifs qu'avant. Le gym est **couvert** (`sheltered`, `src/art/stages.ts`) : le rideau de pluie du rendu ne tombe jamais sur le combat. La pluie se dessine dehors, dans ses propres images (§5).

## 5. Ce qui bouge

Toutes les animations jouent dans le rendu seul (D17), image par image (D23).

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- |
| `sparring` | jab, esquive, cross, garde | sur le tempo du club (120 BPM) |
| `bagwork` | jab et cross sur le sac, qui balance | idem |
| `speedbag` | la poire qui claque | 6 tics par image |
| `skipping` | la corde au-dessus, devant, sous les pieds | 8 tics par image |
| `timer` | ROUND en vert 3 minutes, REST en rouge 1 minute | le vrai rythme d'un round |
| `flicker` | le tube de droite qui fatigue | chaque état tient au moins 20 tics |
| `train` | le métro dans la verrière (22 images) | toutes les 40 s |
| `swing0`, `swing1` | les deux autres sacs, secoués par le train | en phase avec le train |
| `dust0` à `dust2` | la poussière qui tombe dans la lumière des tubes | en phase avec le train |

| `downpour` | sous la pluie : les traits de pluie derrière les vitres, penchés comme le rideau du rendu, et les filets d'eau qui coulent sur les carreaux | 3 tics par image |
| `drip`, `bucket` | sous la pluie : la pluie qui suinte de la voûte goutte de la poutre dans un seau de zinc, au pied du ring ; chaque goutte fait une onde | une goutte toutes les 1,6 s ; quatre fois plus vite au passage du train |

- **Sous la pluie seulement.** `downpour`, `drip` et `bucket` sont des animations d'une seule météo (`weather`, `src/art/stage-layers.ts`) : le seau n'est là que les jours de pluie.
- **La pluie à la verrière** ne couvre que le verre sous la lueur de la ville, de la hauteur des tours au tablier du viaduc, sur 510 px de large (le verre en fait 514). Deux de ses images tiennent ainsi côte à côte dans la planche, ce qui garde le gym dans sa mémoire vidéo (§6). Le haut de l'éventail reste sombre : rien n'y éclaire la pluie.
- **Le train, accéléré.** Dans l'histoire, le métro passe toutes les quatre minutes. En combat, il passe toutes les 40 s, pour qu'on le voie au moins une fois par match. Tout ce qu'il secoue boucle sur le même cycle de 2 400 tics (test).
- **Les flashs.** Le tube qui fatigue s'éteint et se rallume au plus 1,5 fois par seconde, sur une petite surface. Les fenêtres du métro restent petites et lointaines.
- **Les animations détachées.** Les boxeurs, les sacs et la corde bougent devant la verrière ou la brique du fond, que le calque du milieu laisse vides. Ces animations sont « détachées » (`decor-rue.md` §14).

## 6. Les budgets

- **Les calques** font les mêmes tailles que ceux de la rue : 6,3 Mo en mémoire vidéo.
- **La planche des animations** fait 1 014 × 624, soit 2,4 Mo (998 × 332 avant la pluie) : 8,7 Mo en tout, sous les 9 Mo d'un lieu. Le premier essai faisait 1 007 × 1 211 et dépassait le budget. Il a été allégé :
  - les chaînes restent fixes, seul le sac pivote ;
  - la poussière est découpée tube par tube ;
  - le train passe en 22 images de 4 tics.

  La pluie a dépassé elle aussi au premier essai (9,07 Mo) : ses images, de 544 px de large, ne tenaient qu'une par rangée de la planche, et un filet d'eau continu de 300 px de haut imposait une rangée de cette hauteur. Ses images font maintenant 510 px, et le train fait tomber les gouttes plus vite plutôt qu'en filet.
- **Le dessin** prend environ 10 s à `npm run stages`.

## 7. La suite

1. Les dégâts : les cordes qui cèdent, un sac qui crève, le plancher marqué aux chutes lourdes.
2. L'aube, « le matin froid » : le moment `dawn` existe (Loading Dock, `decor-dock.md` §4), il reste à peindre sa palette.
