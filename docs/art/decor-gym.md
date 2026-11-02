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

`tools/stage/gym/palette.ts` commence par la palette de la rue, case pour case. Le gym reprend ainsi le code de la rue pour ses silhouettes, ses néons et son ciel. Il ajoute ensuite ses propres rampes : la brique de la voûte, la pierre des anneaux, la fonte verte, les tubes, le bois, le ring, le cuir, la peinture, les lampes du chrono, le métro, les casiers, la poussière et le ruban.

- Le tout tient dans 256 couleurs (254 aujourd'hui) : il ne reste presque plus de place. Un prochain lieu qui voudrait le code de la rue devra lui faire accepter ses rampes en paramètre plutôt que d'empiler sa palette.
- Rien ne s'approche du cyan ni du magenta des combattants (test `stage-gym`).
- Toutes les grandes couleurs restent sous la bande des flashs, dans chaque ambiance.

## 4. Les ambiances

- **Minuit, ciel clair** (la base) : la salle à la fermeture, les tubes seuls allumés.
- **Crépuscule, ciel clair** : le soleil bas par la verrière, de l'ambre sur la brique et le plancher, des ombres bleues sous la voûte, des tubes plus pâles que le jour qui reste. Les cases de la rue prennent sa palette du crépuscule (le ciel, les tours) ; celles du gym sont virées par `grade` (`tools/stage/kit/grade.ts`).

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

- **Le train, accéléré.** Dans l'histoire, le métro passe toutes les quatre minutes. En combat, il passe toutes les 40 s, pour qu'on le voie au moins une fois par match. Tout ce qu'il secoue boucle sur le même cycle de 2 400 tics (test).
- **Les flashs.** Le tube qui fatigue s'éteint et se rallume au plus 1,5 fois par seconde, sur une petite surface. Les fenêtres du métro restent petites et lointaines.
- **Les animations détachées.** Les boxeurs, les sacs et la corde bougent devant la verrière ou la brique du fond, que le calque du milieu laisse vides. Ces animations sont « détachées » (`decor-rue.md` §14).

## 6. Les budgets

- **Les calques** font les mêmes tailles que ceux de la rue : 6,3 Mo en mémoire vidéo.
- **La planche des animations** fait 998 × 332, soit 1,3 Mo. Le premier essai faisait 1 007 × 1 211 et dépassait le budget. Il a été allégé :
  - les chaînes restent fixes, seul le sac pivote ;
  - la poussière est découpée tube par tube ;
  - le train passe en 22 images de 4 tics.
- **Le dessin** prend environ 10 s à `npm run stages`.

## 7. La suite

1. Les dégâts : les cordes qui cèdent, un sac qui crève, le plancher marqué aux chutes lourdes.
2. La pluie sur la verrière, et une gouttière qui fuit dans un seau.
3. L'aube, « le matin froid » : un nouveau moment, à ajouter à `MOMENTS`.
