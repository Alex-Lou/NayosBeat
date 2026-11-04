# The Loading Dock

Le troisième lieu des combats, après la rue (`decor-rue.md`) et le Viaduct Gym (`decor-gym.md`). C'est le lieu de Riff : la cour de service derrière L'Entrepôt, de l'autre côté de « Warehouse Street ». C'est par la porte de fer de ce côté que Riff passait quand les vigiles la chassaient de devant (`histoire.md`). Le système des lieux est décrit au §14 de `decor-rue.md`.

## 1. L'intention

Une cour de livraison, la nuit d'un clash : le mur arrière du club en brique noircie, un auvent d'acier peint « LOADING DOCK », trois quais aux rideaux de fer couleur prune passée, la rouille qui coule. Le club est juste derrière le mur. On le voit dans les hautes fenêtres, où la foule danse en ombres contre le verre dépoli, et par le quai 3, grand ouvert sur la salle : le DJ en live derrière ses platines, la foule en contre-jour. Dehors, la cour vit sa vie de cour : une camionnette à quai, une vieille berline, des poubelles, un clodo qui dort dans l'allée. On l'entend aussi : de temps en temps, la basse secoue toute la cour (§5).

Le lieu doit se lire en une seconde (« derrière le club, là où on n'a pas le droit d'être ») et rester plus calme derrière les combattants qu'au-dessus d'eux.

Les choix du développeur :
- les ambiances sont minuit et l'aube grise ;
- le moment fort est la basse du club ;
- le lieu se trouve derrière L'Entrepôt.

## 2. La composition, de loin à près

Mêmes calques, mêmes tailles et même grain que la rue (×2).

### 2.1 `far`, ce qu'on voit au-dessus du toit et par l'allée (25 %)

- Le ciel de la rue, ton pour ton (la même ville à la même heure), deux bancs de nuages.
- Les tours de la ville, quelques fenêtres allumées ; une cheminée de brique et son panache ; deux réservoirs d'eau sur les toits voisins.
- Par l'allée de gauche : la rue de derrière, des entrepôts bas à toits en dents de scie, la ligne aérienne sur ses poutres où passe le train aérien à chaque cycle, un réverbère. Il est placé au-dessus de la plaque « NO PARKING », pour ne jamais tomber à côté du chat.

### 2.2 `mid`, la cour (50 %)

- **Le mur arrière du club**, en brique, avec ses piliers. La suie des aérations l'assombrit vers le haut. Sur le toit : l'édicule de l'escalier, un groupe de ventilation, une antenne.
- **Six hautes fenêtres** au verre dépoli, éclairées en violet de l'intérieur. Dans les trois du milieu, les ombres de la foule (têtes, épaules, bras levés) dansent sur le tempo. Les trois autres ont un carreau cassé et un carreau orange, des lumières du club.
- **L'auvent** d'acier, peint « LOADING DOCK », avec ses tirants et une applique au sodium au-dessus de chaque quai.
- **Trois quais** et leurs rideaux de fer :
  - le prune passé, la rouille qui coule des lames, un grand chiffre au pochoir ;
  - le quai 3, son rideau roulé tout en haut, grand ouvert sur la salle (`club.ts`) : la brume violette, des enceintes au fond, le DJ sur une estrade basse derrière son pupitre (casque sur une oreille, casquette, sweat ; deux platines, la table de mixage et ses voyants, une lampe col-de-cygne, une barre de LED violettes fixe). Devant lui, la foule en silhouettes : des danseurs en capuche, un couple qui s'embrasse, quelqu'un qui tire sur un bédo dont la fumée monte dans la lumière ;
  - devant lui, la lumière violette qui se répand sur la cour.
- **La cour** (`yard.ts`) : une camionnette de livraison reculée contre le quai 1, vue de face (pare-brise, désodorisant qui pend, phares éteints, clignotants orange), des caisses de bouteilles vides à côté ; une vieille berline bordeaux garée au pied de l'escalier, la vitre arrière baissée, un autocollant, de la rouille sur l'aile ; deux poubelles à roulettes, des cartons et des canettes ; dans l'allée, un clodo qui dort sous une couverture sur son carton, son caddie à côté.
- **La porte de service**, à gauche :
  - en acier riveté, avec un filet de violet dessous ;
  - la chaîne passée dans la poignée et le moraillon, le cadenas qui pend ;
  - l'enseigne « EXIT », une lampe grillagée et ses papillons de nuit ;
  - la plaque « 后门 » (« porte de derrière », pour les livreurs du quartier) et des affichettes sans texte.
- **Deux vigiles** en doudoune devant la porte : l'un fume, l'autre a les bras croisés.
- **Le quai** lui-même : béton, cornière peinte en bandes de danger, butoirs de caoutchouc, coulures de rouille, tags. À gauche, l'escalier de béton et sa rampe jaune.
- **L'annexe du monte-charge**, à droite, en parpaings : la grille en accordéon tirée, « FREIGHT » au pochoir, et un conduit qui fume sur le toit. Au pied, une pile de palettes.
- **L'allée**, à gauche : le coin du voisin, un grillage à roulettes coiffé de barbelés, la plaque « NO PARKING ». Devant : la benne et son chat, des sacs-poubelle.
- **Le fond de la cour**, entre le pied du quai et la ligne du sol, en bandes : le tablier de béton au pied du quai, la rigole d'acier, puis l'asphalte où entrent les camions, dans les flaques de lumière des appliques. Une flaque d'eau devant le quai 2 où se reflète l'applique.

### 2.3 `floor`, le tablier de la cour (100 %)

Une cour qui se lit en bandes, pas comme une feuille grise (remarque du développeur) :
- **l'asphalte** où se tiennent les combattants, sombre et granuleux ;
- **les lignes jaunes** usées : celle du bord de voie, et une ligne de stationnement toutes les 64 unités du monde, qui mesurent les distances comme les dalles de la rue ;
- les joints de goudron sur les fissures, une plaque d'égout, des taches d'huile, des traces de pneus qui entrent par le portail ;
- **la bordure** de béton au premier plan, son arête éclairée, la grille d'égout à son pied, puis une bande de trottoir en dalles.

Le contraste vient d'un asphalte plus sombre, pas d'un béton plus clair : une grande couleur plus claire ferait bouger les mesures de flashs (§6).

Les deux bouts s'assombrissent sous l'ombre des murs. Rien n'y fait une bande tramée sur toute la largeur.

## 3. La palette

`tools/stage/dock/palette.ts` est la première palette d'un lieu qui n'empile pas celle de la rue. Elle compte 156 couleurs, case 0 comprise. Les silhouettes, les tags et les enseignes viennent du code de la rue, qui prend désormais ses rampes en paramètre (`FigureRamps`, `SignRamps`, `SprayRamps`) : le Dock passe les siennes.

- **Les matières** : brique suie, béton chaud, asphalte, acier bleu-gris, rideaux prune, rouille, jaune de danger éteint, caoutchouc.
- **La lumière** : le sodium des appliques, le violet du club à travers le verre et en nappes sur la brique et le béton (`BRICK_VIOLET`, `CONCRETE_VIOLET`), quelques carreaux orange.
- **Les vivants** : les corps, la peau, les vêtements (`CLOTH`, `HAIR`), les liserés chauds des vigiles, les braises des cigarettes.
- **Les signes** : « EXIT » en vert, les enseignes, les peintures des tags (rose, violet, ocre, crème, vert, toutes ternes).
- **Les objets** : bois des palettes, vert de la benne, sacs, chat, vapeur, papier ; la camionnette et la berline (de grandes surfaces, gardées dans la bande et l'enveloppe des flashs), la couverture, le carton, les bouteilles.

Les teintes réservées aux combattants sont tenues à l'écart : aucune couleur vive à moins de 25° du cyan ni du magenta (test). Le « magenta » du lieu est un prune terne et un rose de tag éteint, loin de celui de Riff.

## 4. Les ambiances

- **Minuit, ciel clair** (la base) : le club bat son plein, les appliques au sodium, le violet aux fenêtres.
- **L'aube, ciel clair** : la fin de la fête. Une lumière froide d'ardoise descend dans la cour, la brique et le béton virent au gris-bleu, les ombres au bleu. Les appliques sont encore allumées, plus pâles que le jour qui vient, et le violet pâlit dans les fenêtres. Le ciel est un couvercle gris, un peu plus clair au-dessus des toits.
- **Minuit, pluie** : une pluie battante (`pluie.md`). La brique et le béton plus sombres et plus froids, trempés ; les appliques et le violet du club aussi vifs que par nuit claire ; des flaques sur le sol, dessinées dans une rampe cachée (`WET`) qui ne se voit que sous la pluie.

L'aube est un nouveau moment (`dawn`, « aube » dans l'option « Ambiance » de la pause). Les autres lieux ne l'offrent pas encore. En entraînement, choisir « aube » sur un lieu qui ne l'a pas en tire une au hasard, comme pour toute ambiance absente.

## 5. Ce qui bouge

Toutes les animations jouent dans le rendu seul (D17), image par image (D23).

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- |
| `crowd0` à `crowd2` | les ombres de la foule dans les trois fenêtres du milieu, la moitié qui plonge sur le temps | 120 BPM, deux images par temps |
| `bouncer0`, `bouncer1` | le premier vigile tire sur sa cigarette (braise vive, fumée) | une bouffée toutes les 10 s |
| `cat` | la queue du chat qui fouette | toutes les 5 s |
| `moths` | trois papillons autour de la lampe grillagée | 5 tics par image |
| `vent` | la vapeur du conduit de l'annexe | 12 tics par image |
| `club` | le DJ en live (platines, scratch, crossfader, main au casque) et la foule : les danseurs plongent tour à tour, le fumeur tire sur son bédo et souffle la fumée, le couple s'embrasse | 120 BPM, deux images par temps |
| `sleeper` | le clodo qui se retourne sous sa couverture | toutes les 13 s |
| `shutter0`, `shutter1`, `ripple`, `rust` | voir la basse, plus bas | |

**La basse du club**, le moment fort. Toutes les 40 s (un cycle de 2 400 tics, `BASS_CYCLE`), le club monte le son pendant huit temps, à partir de `BASS_AT`. À chaque temps de la basse :
- la foule saute, bras en l'air, dans les fenêtres et dans la salle, et le DJ lève sa main libre ; le couple, lui, continue de s'embrasser ;
- le clodo se redresse à moitié, la tête levée ;
- les rideaux des quais 1 et 2 vibrent dans leurs glissières pendant les quatre premiers temps, un peu décalés l'un de l'autre, la barre du bas qui saute ;
- la flaque frissonne d'un anneau. C'est l'image d'ouverture de l'histoire : « dans une flaque, l'eau tremble avant qu'on entende quoi que ce soit » ;
- la rouille tombe de l'auvent devant les quais 1 et 2, derrière les combattants, pendant les trois premiers temps ;
- les deux vigiles hochent la tête ;
- le chat se hérisse, dos rond, pendant cinq temps.

Le test de contrat vérifie que tout ce que la basse secoue boucle sur le même cycle, et que la basse les change tous à son premier temps.

- **Pourquoi 40 s** : comme le train du gym, pour qu'on la voie au moins une fois par match.
- **Le quai 3.** Le premier essai y montrait les jambes des danseurs, sept paires de traits fins : en jeu, le développeur y a vu des « lignes noires ». Il ne veut personne derrière un rideau à moitié fermé (« pourquoi des gens resteraient derrière un store à moitié ouvert ? »), des silhouettes dedans mais pas de fêtards dehors, de la vie, un DJ animé comme en live, et des styles qui se lisent : capuches, clopes, bédos, un baiser. Le quai 3 est donc grand ouvert sur la salle, et la cour a ses voitures, ses poubelles et son clodo. Les gens sont entiers, dessinés par le code des personnages (`drawFigure`). Un premier DJ semblait debout sur sa table : son pupitre monte maintenant à sa taille.
- **Ce que voit le gros plan.** En combat, le HUD cache les fenêtres, et le chat comme le quai 3 sont hors du cadre au centre. La basse se lit donc d'abord derrière les combattants : les rideaux qui vibrent, la rouille qui pleut, les vigiles qui hochent la tête, la flaque. Le premier essai ne faisait vibrer qu'un rideau et tomber quelques grains entre deux quais : c'était trop discret en jeu.
- **Le mot « drop »** appartient au Crossfader (`combat-v2.md`). Le décor dit « la basse ».
- **Les flashs.** Rien ne s'allume ni ne s'éteint. Les ombres de la foule changent la luminance de moins de 0,1 (verre violet contre ombre), sous le seuil d'un flash WCAG, et sur de petites surfaces. Le rideau vibre d'un pixel, sans changer de ton.
- **Les animations détachées.** Le chat (devant l'allée) et la vapeur (devant le ciel) bougent devant le vide du calque : elles sont « détachées » (`decor-rue.md` §14). Les autres bougent devant le mur, qui est opaque.

## 6. Les budgets

- **Les calques** font les mêmes tailles que ceux de la rue : 6,3 Mo en mémoire vidéo.
- **La planche des animations** fait 1 019 × 222, soit 0,90 Mo : les fenêtres ne redessinent que là où dansent les ombres, et les rideaux que leurs dernières lames.
- **Le dessin** prend 1 à 2 s à `npm run stages`.
- **Les grandes couleurs**, celles qui couvrent 1 % de l'écran, respectent deux règles dans chaque ambiance :
  - elles restent dans la bande des flashs : pas plus claires qu'une luminance de 0,078, pas plus sombres que `#1b1b2f` ;
  - aucun de leurs canaux ne dépasse le fond le plus clair sur lequel les tables de flashs ont été mesurées (`#6d4457`, le maximum canal par canal des grandes couleurs de la rue et du gym).

  Le premier essai dépassait en bleu, avec la masse du verre violet (`#503a76`), et en vert, avec les gris de l'aube. Toutes les tables de `flash-areas.test.ts` bougeaient. Le verre est donc devenu un violet plus sourd, la lumière gardée en touches, et un test du Dock garde cette enveloppe.
- **Le halo du Finisher** prend l'opacité la plus haute qui n'éclaire aucune grande couleur (0,27 en cyan, `finisher-halo.test.ts`). Le cyan ajoute du vert : un gris d'aube au vert de l'enveloppe, avec peu de rouge, faisait tomber cette opacité à 0,26. Les masses de l'aube sont donc ramenées sous un plafond au vert un peu plus bas (`DAWN_CEILING`, `atmospheres.ts`).

## 7. La suite

1. La pluie battante (tranche pluie) : le rideau de gouttes, la flaque qui grandit, les gouttières de l'auvent.
2. Les dégâts : le rideau de fer cabossé quand un combattant y est envoyé fort, le béton du quai écaillé.
3. Les autres lieux pourront offrir l'aube, à commencer par le gym (« le matin froid »).
