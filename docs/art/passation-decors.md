# Passation : les décors vivants

Ce fichier est pour l'agent qui reprend les décors (les lieux de combat). Il dit où en est le chantier, comment le système marche, comment ajouter un lieu, les règles qui ne se discutent pas et ce qui reste à faire. Lis aussi `CLAUDE.md` (la charte du studio), `docs/art/decor-rue.md` (§13 et §14 surtout) et `docs/art/decor-gym.md` (le modèle d'un nouveau lieu).

## 1. Où en est le chantier

| Quoi | État |
| --- | --- |
| La rue (`rue`), minuit et crépuscule | en ligne (#96) |
| Les enseignes de la rue en anglais et en chinois | en ligne (#98) |
| Plusieurs lieux, l'écran « Lieu », « Lieu » et « Ambiance » dans la pause | en ligne (#99) |
| Le Viaduct Gym (`gym`), minuit et crépuscule | en ligne (#99) |
| Les animations détachées, la boîte commune `tools/stage/kit/`, `npm run stages` | en ligne (#99) |
| `npm run stages:preview` et ce fichier | en ligne (#103) |
| `people.ts` et `signs.ts` prennent leurs rampes en paramètre (§4, étape 2) | en ligne (#107) |
| The Loading Dock (`dock`), minuit et aube, la basse du club ; le moment `dawn` | en ligne (#107) |
| La pluie : la couche du rendu, la rue et le Dock sous la pluie à minuit (`pluie.md`) | en ligne (#117) |
| Une animation peut glisser sur son calque (`StageDrift`) | en ligne (#122) |
| Rooftop Rain (`rooftop`), minuit et deux pluies, le dirigeable (`decor-rooftop.md`) | en ligne (#122) |
| Le gym a sa propre palette ; un lieu couvert (`sheltered`) ; des animations d'une seule météo (`weather`) | en ligne (#126) |
| Le gym sous la pluie : la verrière, la fuite dans le seau (`decor-gym.md`) | en ligne (#126) |
| La brume, dans les quatre lieux ; les météos des dix lieux (`brume.md` §4) | en ligne (#130) |
| La neige ; la propreté des décors (`proprete.md`) ; Temple Courtyard (`temple`), aube, crépuscule, nuit, pluie et neige (`decor-temple.md`) | en ligne (#131) |
| L'Entrepôt, intérieur (`club`), minuit, fumée et pluie à la porte, la basse (`decor-club.md`) | PR du club |

## 2. Ce que veut le développeur

Ses mots, à garder en tête :

- « Faire vivre le décor joliment. Tant dans le ciel que les lumières, couleurs. »
- « Un combat doit pouvoir afficher une météo aléatoire parmi une liste. Et ce sera le cas pour chaque map. »
- « Trottoir et murs atteints visiblement endommagés quand il y a. »
- « Je veux pas de noms français dans les décors. En anglais, ou chinois, ou japonais mais pas QUE français quand c'est en pleine ville. Et sinon dépend de l'endroit. »
- « Prends les 10 mais rends-les hyper cools. »

Ses choix, déjà faits (ne pas les redemander) :

- **Météos** : nuit claire, pluie, brume.
- **Dix lieux**, chacun avec le ciel clair et deux météos qui lui vont (`brume.md` §4) ; une quatrième météo, la **neige** ; pas de plein jour (le temple à l'aube, au crépuscule et la nuit) ; une PR par lieu.
- **Couleurs** : les trois leviers à la fois (une palette par météo, des moments comme minuit et crépuscule, une liberté par lieu).
- **Dégâts** : ils s'accumulent sur le match.
- **Variantes** : des palettes calculées à la génération.
- **Tirage** : nouveau à chaque combat, et « Revanche » garde le décor.
- **Livraison** : par tranches.
- **Choix du lieu** : un écran avec « Aléatoire » en premier ; contre l'ordinateur, tout au hasard ; en entraînement, la pause change le lieu et l'ambiance.

Sa manière de travailler (voir `CLAUDE.md`) :

- tout en français ;
- une question = un choix multiple (`AskUserQuestion`) avec une recommandation sérieuse ;
- le diff le plus petit possible ;
- dire l'incertitude ;
- terminer chaque tâche par : Fichiers modifiés / Ce qui a été modifié / Fichiers intentionnellement non touchés / Suivi nécessaire.

Il a donné un **accord permanent de mise en ligne** : une PR est fusionnée dès que la CI est verte et que tout est vérifié, puis le résultat lui est montré (des captures).

## 3. Le système, en une page

### 3.1 Les données (`src/art/`)

- `stage-layers.ts` définit trois calques :
  - `far` : 600 × 270 unités, défile à 25 %, opaque ;
  - `mid` : 720 × 270, défile à 50 %, transparent là où le fond se voit ;
  - `floor` : 960 × 40, posé à y = 230, défile à 100 %.

  Les images sont deux fois plus fines que le monde (`STAGE_SCALE` = 2). Le même fichier définit aussi les moments (`MOMENTS` : midnight, dusk, dawn), les météos (`WEATHERS` : clear, rain, fog), une ambiance = un moment + une météo, et `StageVariant` (un lieu dans une ambiance).
- `src/art/<lieu>/index.ts` lit ses images (`import.meta.glob`) : la base dans le dossier, chaque autre ambiance dans `src/art/<lieu>/<moment>-<météo>/`.
- `src/art/stages.ts` est le **registre du jeu** : nom du dossier, titre, description, variantes. Un lieu sans images n'est pas proposé.

### 3.2 Le rendu (`src/render/stage-view.ts`)

- `stageVariantFor` tire un lieu, puis une ambiance.
- `loadStage` ne garde en mémoire vidéo qu'une seule ambiance d'un seul lieu, sous les clés `stage/<lieu>/<ambiance>/`.
- `drawStage` pose les calques, puis les animations (`stage-props.ts`, image par image, D23).
- `FIGHT_STAGE_COLORS` réunit les grandes couleurs de tous les lieux dans toutes leurs ambiances. Les voiles et les mesures de flashs se calent dessus.

### 3.3 L'app (`src/app/app.ts`, `src/ui/stage-select.ts`, `src/app/select-stages.ts`)

Elle gère l'écran « Lieu », `stageChoice`, et les options « Lieu » et « Ambiance » de la pause d'entraînement.

### 3.4 Le dessin (`tools/stage/`)

- `kit/` est la boîte commune, qui ne dépend d'aucune palette :
  - `canvas.ts` : `tone` pour un ton tramé, `at` pour une case, `paint`, `fill`, `line`, `ellipse`, `Mask` ;
  - `random.ts` : un hasard déterministe et du bruit ;
  - `light.ts` : des flaques de lumière qui font monter les tons d'une rampe ;
  - `font.ts` : une police 5 × 7 complète, et des caractères chinois 9 × 9 (`spellHan`), à compléter ;
  - `grade.ts` : vire une palette vers une autre heure en restant sous la bande des flashs ;
  - `stage.ts` : les types `CodeStage`, `CodeProp`, `CodeMap`, `StageAtmosphere`.
- `maps.ts` est le **registre des outils** : `[RUE, GYM, DOCK, ROOFTOP]`.
- `rue/` et `gym/` contiennent chacun `palette.ts`, `far.ts`, `mid.ts`, `floor.ts`, `atmospheres.ts` et `index.ts`, qui exporte le `CodeMap`.

### 3.5 L'installation (`tools/sprites/`)

- `npm run stages` (`stages.ts`, `stage-drawn.ts` `writeStages`) dessine chaque lieu, détache les animations, découpe et empaquette leurs images (`stage-props.ts`), puis écrit `src/art/<lieu>/` : les PNG, `colors.ts` et `props.ts`. Chaque ambiance est la même image dans sa palette.
- `npm run stages:preview -- <lieu> [--ends]` écrit `tools/sprites/preview/stages/<lieu>-<ambiance>-<caméra>.png`, non commité : le décor tel que le combat le montre. C'est l'outil de chaque itération. Regarde chaque image (outil Read) avant de juger.

## 4. Ajouter un lieu, pas à pas

1. **Le design d'abord.** Écris `docs/art/decor-<lieu>.md` sur le modèle de `decor-gym.md` : intention, composition calque par calque, palette, ambiances, ce qui bouge, budgets, suite. Présente-le au développeur (choix multiples) avant de coder si quelque chose est ambigu.
2. **La palette** (`tools/stage/<lieu>/palette.ts`). Des rampes du plus sombre au plus clair, la case 0 transparente, 256 couleurs au plus. Chaque lieu a sa propre palette : `rue/people.ts` (les silhouettes) et `rue/signs.ts` (les enseignes, les tags) prennent leurs rampes en paramètre (`FigureRamps`, `SignRamps`, `SprayRamps`). Déclare-les dans ta palette, comme `FIGURE_RAMPS`, `SIGN_RAMPS` et `SPRAY_RAMPS` dans `dock/palette.ts`.
3. **Les calques** : `far.ts` (opaque partout), `mid.ts` (le fond de la scène à la ligne `BASE`, rien sous la ligne 470), `floor.ts` (un repère toutes les 64 unités du monde, pour lire les distances). Pense en pixels d'image (×2) : `mid` fait 1 440 × 540, le sol des personnages est à la ligne 460, et les silhouettes font 80 à 90 px.
4. **Les animations** (`MID_ANIMATIONS` et des `CodeProp` sur `far` si besoin). Chaque image est redessinée dans son rectangle. Si une figure bouge devant le vide du calque, l'animation est « détachée » automatiquement. Garde les rectangles serrés et sans chevauchement inutile : la planche coûte de la mémoire vidéo. Ce qui doit bouger ensemble boucle sur le même cycle (comme le train du gym, `TRAIN_CYCLE`).
   Ce qui traverse tout le calque (un dirigeable, une voiture volante) ne se dessine pas en centaines d'images : une animation peut **glisser** (`drift`, `StageDrift` dans `src/art/stage-layers.ts`). Ses images sont dessinées une fois à leur place, et la vue les déplace d'un départ à une arrivée en pixels d'image. Mets départ et arrivée au-delà des deux bouts du calque, pour que rien n'apparaisse dans le champ (voir `rooftop/index.ts` et son test).
5. **Les ambiances** (`atmospheres.ts`). La base est `midnight-clear`, puis les autres sont virées par `grade` et des rampes repeintes (`repaint`).
6. **Le brancher** :
   - `tools/stage/maps.ts` ;
   - `src/art/<lieu>/index.ts`, en copiant celui du gym ;
   - `src/art/stages.ts` (titre, description) ;
   - un test de contrat `tests/tools/stage-<lieu>.test.ts`, qui appelle les vérifications communes (`stage-contract.ts`, voir `stage-club.test.ts`) et ajoute celles du lieu.
7. **`npm run stages`**, puis `npm run stages:preview -- <lieu> --ends`. Regarde, corrige, recommence.
8. **Les captures en jeu** : `npm run build`, puis servir `dist/` et piloter Chromium avec Playwright (préinstallé). Passe par l'écran « Lieu », lance un combat, et photographie les moments qui vivent. Envoie les captures au développeur.
9. **La CI complète avant de pousser** :
   - `npm run format:check`, `npm run lint`, `npm run typecheck` ;
   - `npm test`, `npm run aseprite:check`, `npm run build` ;
   - `npm run replays:update`, qui doit laisser `tests/core/replays` inchangé.

   Ensuite : PR en brouillon, s'abonner à son activité, fusionner quand c'est vert.

## 5. Les règles qui ne se discutent pas

| Règle | Gardée par |
| --- | --- |
| Le décor ne touche jamais au cœur (D17), rien n'est interpolé (D23) ; les replays dorés ne bougent pas | les replays, `npm run replays:update` |
| Chaque grande couleur (≥ 1 % de l'écran) a une luminance de 0,078 au plus, dans chaque ambiance | `tests/tools/stage-drawn.test.ts` |
| Aucune grande couleur n'est plus sombre que le ciel de la boîte grise (`#1b1b2f`) : les flashs sont mesurés dessus | idem, et `tests/render/flash-areas.test.ts` |
| Aucun canal d'une grande couleur ne dépasse le fond le plus clair des tables de flashs (`#6d4457`, le maximum canal par canal des grandes couleurs de la rue et du gym) | `flash-areas.test.ts`, et le test de contrat du Dock |
| 3 flashs par seconde au plus : rien ne clignote vite sur une grande surface (le néon du gym tient chaque état 20 tics au moins) | `stage-gym.test.ts`, `docs/flashs.md` |
| Le cyan et le magenta sont aux combattants : aucune couleur vive du décor à moins de 25° de leur teinte | tests de contrat des lieux |
| Mémoire vidéo : le lieu le plus lourd sous 9 Mo (calques et planche), textures de 2 048 px au plus | `tests/build/vram-budget.test.ts` |
| Le gameplay est identique partout : même largeur, même sol, mêmes calques | les specs des calques |
| La langue des enseignes dépend du lieu ; en pleine ville, jamais seulement du français | `decor-rue.md` §10 |
| Rien n'est copié : aucun lieu réel, aucune marque, aucun décor de jeu existant | `decor-rue.md` §10 |

## 6. Les pièges déjà rencontrés

- **Ne lance jamais `npm run sprites` en entier** : il redessine Nayo, dont le design est mené ailleurs. Utilise `npm run stages`.
- **Ne touche pas aux sprites de Nayo** (`tools/sprites/nayo`, `src/art/nayo`).
- **Une couleur plus sombre que `#1b1b2f`** décale toutes les tables de flashs (`flash-areas.test.ts` échoue sur « within 10 % »). Remonte la couleur, ne touche pas aux tables.
- **Une grande couleur qui pousse un canal plus haut que `#6d4457`** fait grossir toutes les mesures des effets : ils sont mesurés sur le fond le plus clair, canal par canal (`brightestBackdrop`). `flash-areas.test.ts` échoue alors sur une table (« expected 557 to be less than or equal to 549 »). Le Dock l'a vécu avec la masse de son verre violet (`#503a76`, trop de bleu) et les gris de son aube (trop de vert). Garde la masse dans l'enveloppe et la lumière en touches de moins de 1 % de l'écran, ou ramène une ambiance sous un plafond (`DAWN_CEILING`, `dock/atmospheres.ts`).
- **Le halo du Finisher** (`finisher-halo.test.ts`, 0,27 en cyan) est réglé lui aussi sur toutes les grandes couleurs. Un gris au vert de l'enveloppe, avec peu de rouge, le fait baisser (« expected 0.26 to be close to 0.27 »). Le plafond de l'aube du Dock a un vert un peu plus bas pour cette raison. Un lieu de jour (Temple Courtyard) butera là : il faudra peut-être re-mesurer les tables, ce qui est une décision du développeur.
- **Un premier essai de planche d'animations du gym faisait 1 007 × 1 211.** Les chaînes qui bougeaient, la poussière sur toute la largeur et le train en 30 images ont été allégés. Mesure la planche après chaque animation ajoutée.
- **Chaque image du décor a sa propre profondeur** (`stageDepths`, `stage-view.ts`), croissante dans l'ordre du dessin. Avant, elles avaient toutes la profondeur 0, et l'ordre d'ajout faisait le reste. Les lumières en direct passent devant leurs halos les images sans pixel qui éclaire (`light-show.ts` `showEmitters`), puis les remettent : à profondeur égale, Phaser les rangeait alors après les autres. Au gym, le lointain opaque recouvrait ainsi le milieu et le sol après les premiers coups : « le décor disparaît, il n'apparaît qu'à certains coups » (Android, 3 novembre 2026 ; reproduit avec `?lumieres=haut`). Ne rends jamais deux images du décor à la même profondeur ; le test de régression est dans `stage-view.test.ts`.
- **Deux animations détachées qui se chevauchent** : le test de contrat compose les autres animations à leur première image ; garde ce modèle.
- **Dessiner un lieu prend environ 10 s** : les tests qui le dessinent ont un délai de 60 s.
- **Playwright** :
  - attends le texte de la page (`waitForFunction` sur `document.body.innerText`) plutôt que des délais fixes ;
  - navigue au clavier (« Jouer » apparaît aussi dans « Avant de jouer ») ;
  - l'écran « Lieu » attend « Choisis où se battre ».
- **Ne tue jamais un serveur avec `pkill -f` sur un motif présent dans ta propre commande** : le shell se tue lui-même.
- **`git reset --hard`** : jamais sans copie de ce qui pourrait se perdre (préférence du développeur).

## 7. Ce qui reste à faire

### 7.1 Les tranches du système de décor vivant

1. **La nuit vivante** : des nuages qui dérivent, des fenêtres qui s'allument et s'éteignent (des animations lentes sur `far`).
2. **La pluie** : la couche du rendu est faite (`pluie.md`) ; la rue et le Dock l'offrent à minuit, Rooftop Rain à minuit et au crépuscule. Le gym aussi, couvert : il pleut à sa verrière. Pour un lieu de plus sous la pluie : une palette `midnight-rain` (ou `dusk-rain`) dans ses `atmospheres.ts` suffit, le rendu fait tomber la pluie de lui-même ; des flaques cachées demandent une rampe `WET` (voir le Dock). Un lieu couvert se marque `sheltered` dans `src/art/stages.ts` : le rideau n'y tombe pas, sa pluie se dessine dans des animations de la seule météo `rain` (`weather`, voir le gym).
3. **Les dégâts cumulés sur le match** : fissures du sol aux chutes lourdes et aux KO, mur fissuré quand un combattant y est envoyé fort ; cordes du ring et sac crevé au gym. Ils sont déclenchés par des événements du rendu (jamais par le cœur), avec un plafond, et le décor repart à neuf au match suivant. À concevoir : une architecture d'« états de dégâts » par lieu (des images par cran). Présente-la au développeur avant de coder.
4. **La brume** : faite (`brume.md`) dans les quatre lieux, avec des bancs qui dérivent. Les halos autour des lampes restent à faire. Le tableau des météos des dix lieux est au §4 de `brume.md`.
5. **L'aube** : le moment `dawn` existe depuis le Loading Dock. Il reste à la peindre pour le gym (« le matin froid »).

### 7.2 Les huit lieux restants

Déjà proposés au développeur et acceptés (« prends les 10 ») :

1. **The Loading Dock** (le lieu de Riff) : fait (`docs/art/decor-dock.md`), en minuit et en aube grise, avec la basse du club pour moment fort. Il lui reste la pluie battante, qui viendra avec la tranche pluie.
2. **Rooftop Rain** (Néon Underground) : fait (`docs/art/decor-rooftop.md`), en minuit clair et sous deux pluies (minuit, crépuscule), avec le dirigeable pour moment fort.
3. **Temple Courtyard** (Archipel des Légendes) : fait (`docs/art/decor-temple.md`), à l'aube, au crépuscule et la nuit (pas de plein jour, choix du développeur), sous la pluie et la neige, avec la bourrasque pour moment fort. C'est le premier lieu tenu aux règles de propreté (`proprete.md`).
4. **L'Entrepôt, intérieur** (le club) : fait (`docs/art/decor-club.md`), à minuit, avec la fumée et la pluie à la porte du quai ; la basse pour moment fort ; aucun stroboscope (test).
5. **Le Bal du Samedi** (le lieu de Saphir) : salle de bal des années 50, parquet, lustres, velours, orchestre swing en silhouettes ; vert profond et or. Le seul lieu où les enseignes en français sont justifiées (avec « SWING NIGHT »).
6. **Night Market** : stands, lampions, vapeur des woks, scooter au fond ; enseignes en chinois.
7. **Pachinko Alley** : ruelle de salles de jeu, distributeurs, câbles ; enseignes en japonais et en anglais.
8. **Ferry Deck** : le pont d'un bateau, les îles en parallaxe, un roulis de 1 à 2 px sur le décor seul, jamais sur les combattants. Vagues en cycle de palette, tempête.
9. **The Laundromat 24/7** : la laverie de la rue vue de l'intérieur, calme et froide ; hublots qui tournent, un client endormi, un chat.

L'ordre recommandé : Loading Dock, Rooftop Rain (avec la tranche pluie), Temple Courtyard, puis les autres.

### 7.3 Les dettes connues

- **L'écran « Lieu » est en grille de 4 colonnes** : à vérifier à 11 lieux sur téléphone en paysage.
- **Le métro du gym passe toutes les 40 s** au lieu de 4 minutes (choix assumé, documenté).
- **La rue s'appelle « Warehouse Street »** dans l'écran « Lieu » : le nom reste à valider par le développeur.

## 8. Comment se dit « fini »

Un lieu est fini quand :

- il est jouable, proposé sur l'écran « Lieu », dans au moins deux ambiances ;
- il vit (au moins un moment fort synchronisé, comme le train du gym) ;
- sa doc est écrite ;
- son test de contrat passe ;
- la CI complète est verte ;
- des captures en jeu ont été montrées au développeur.

Une tranche à la fois, et chaque PR laisse le jeu jouable.
