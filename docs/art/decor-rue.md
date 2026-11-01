# Le décor : la rue devant L'Entrepôt, la nuit

Casquette : direction artistique. Statut : premier décor du jeu, il remplace la boîte grise.

La demande du propriétaire, mot pour mot : « Un fond de rue en nuit / pixel art, des gens à la fenêtre et sur balcons, commerces un peu pourris style vieux quartiers de NY. » C'est la rue devant L'Entrepôt, le club du tournoi Sound Clash ([histoire.md](histoire.md)). Le décor est dessiné par le code (`tools/stage/rue/`), puis il se retouche calque par calque dans Aseprite ([aseprite.md](aseprite.md), § « Le stage »).

## 1. L'intention

Une rue de vieux quartier, à minuit, un soir de finale. La ville dort mal : quelques fenêtres veillent, des gens fument au balcon, la file attend devant une porte de fer sans enseigne. Dessous, quelque chose cogne, et la file se balance sur ce temps-là, à 120 BPM.

Trois règles passent avant la beauté du décor :

1. **Les combattants d'abord.** Le décor est plus sombre, moins contrasté et moins saturé qu'eux ([flashs.md](../flashs.md) §3). Le cyan et le magenta leur appartiennent : le décor n'a que du violet, de l'orange chaud et des gris colorés.
2. **Le fond se lit en masses.** De grands aplats calmes derrière les torses, le détail en haut de l'écran et sur les côtés. Aucune rayure fine et serrée : la secousse les ferait vibrer à 7,5 Hz. Les briques, les lames de rideau de fer et les barreaux restent rares, espacés et à un seul cran de contraste.
3. **Le sol mesure.** Les dalles du trottoir donnent les distances, les deux bouts de la rue se voient (audit P9).

## 2. Le grain : ×2, comme les combattants

Les combattants sont dessinés deux fois plus fin que le monde (`ART_SCALE = 2`, cases de 256 px, rendu de 960 × 540). Le décor d'avant se dessinait à 1 px = 1 px du monde : chacun de ses pixels couvrait quatre pixels d'un combattant. Côte à côte, deux grains de pixel différents se voient tout de suite, et c'est la marque d'un décor bâclé. Les jeux de combat en pixel art dessinent leurs décors au grain de leurs personnages.

**Choix : le décor passe à ×2** (`STAGE_SCALE = 2` dans `src/art/stage-layers.ts`). Les tailles et les positions restent comptées en pixels du monde ; seules les images doublent.

| Calque | Monde | Image | Défile à | Mémoire vidéo (RGBA) |
|---|---|---|---|---|
| `far` | 600 × 270 | 1 200 × 540 | 25 % | 2,47 Mo |
| `mid` | 720 × 270 | 1 440 × 540 | 50 % | 2,97 Mo |
| `floor` | 960 × 40 | 1 920 × 80 | 100 % | 0,59 Mo |
| `props` (planche des animations) | | 960 × 191 | | 0,70 Mo |

Soit **6,72 Mo** pour tout le décor (mesuré, en Mio), contre 1,6 Mo à ×1 : quatre fois plus, mais 7,5 % du plafond de 90 Mo d'un match. La plus grande texture fait 1 920 px, sous les 2 048 px que tout téléphone accepte (et loin des 4 096 de la charte). Le test `tests/build/vram-budget.test.ts` compte le décor et ses animations, et vérifie leurs tailles. Au téléchargement, les quatre PNG indexés pèsent 68 Ko.

Ce qui est sacrifié : un peu de mémoire. Ce qui est gagné : un seul grain de pixel à l'écran.

## 3. La composition, de loin à près

La caméra voit 480 × 270 px du monde. En gros plan (×1,45), elle ne garde que les rangées 71 à 258. Le haut de l'écran est sous le HUD (environ 40 px). L'essentiel se joue donc entre les rangées 80 et 230.

### 3.1 `far`, le fond (25 %)

- **Le ciel** : une nuit violette, du plus sombre en haut à une lueur de ville, violette puis orangée, vers l'horizon. Des bandes de teintes, avec un tramage étroit à chaque passage, jamais de dégradé lissé. Quelques nuages bas, éclairés par-dessous.
- **La ville au loin** : des tours en silhouettes, proches de la couleur du ciel (la perspective atmosphérique), quelques fenêtres allumées très atténuées, des réservoirs d'eau sur les toits.
- **Le viaduc** : la ligne aérienne du métro, celle sous laquelle Nayo a appris à boxer. Un tablier d'acier rivé, ses piles et un contreventement en croix, espacé et large.

Ce calque ne se voit qu'au-dessus de L'Entrepôt, plus bas que ses voisins, et dans la ruelle : c'est la fenêtre du décor sur la ville.

### 3.2 `mid`, la rue d'en face (50 %)

De gauche à droite :

1. **Le coin gauche** : un échafaudage de trottoir, avec un pont, des poteaux et une palissade de contreplaqué couverte d'affiches déchirées et de tags. Son poteau éclairé marque le bout de la rue.
2. **L'immeuble de briques rouges** : quatre étages, des fenêtres à guillotine, un escalier de secours en zigzag. Au rez-de-chaussée, **l'épicerie** : un auvent fatigué, une vitrine jaune et des cageots de fruits dehors, un caisson lumineux « ÉPICERIE » et un chat dans la vitrine. À côté, l'entrée de l'immeuble.
3. **L'Entrepôt** : un ancien entrepôt d'un seul haut niveau, en brique peinte écaillée. Sur sa façade, une vieille réclame peinte presque effacée, « ENTREPÔTS », qui a donné son nom au club. Plus haut, des fenêtres d'atelier à petits carreaux, dont certaines laissent filtrer la lumière violette du club. En bas, un rideau de fer tagué, la **porte de fer**, une lampe grillagée, un petit néon (un disque violet et une flèche orange, sans nom : Sound Clash n'a pas d'affiche), **le videur** et **la file d'attente**.
4. **La ruelle** : un passage sombre entre deux immeubles, un mur du fond sous une ampoule nue, une benne, la vapeur d'une bouche d'égout éclairée par le second réverbère. Au-dessus, le ciel et le viaduc.
5. **L'immeuble de briques claires** : des balcons de fer forgé, avec des gens accoudés. Au rez-de-chaussée, **la laverie** : la lumière froide des néons de plafond, les hublots des machines, une enseigne « LAVERIE » dont deux lettres sont mortes. Puis une boutique fermée, au rideau de fer tagué.
6. **Le coin droit** : un pilier de brique, une bouche d'incendie et des sacs-poubelle. Le bout de la rue.

En bas du calque, la partie du trottoir qui va des combattants aux façades : du béton sans joints (les joints sont sur le sol, voir §3.3), des trappes de cave en acier, trois flaques de la dernière pluie qui reflètent le néon, les réverbères et la laverie, et les deux réverbères au bord du trottoir (devant l'immeuble rouge et à l'entrée de la ruelle, jamais devant une enseigne ni devant les gens du balcon).

### 3.3 `floor`, le sol (100 %)

- **Le trottoir** où se tiennent les combattants : des dalles de béton. Un joint franc tous les 64 px du monde, à peu près la limite du corps à corps, et un trait de dalle discret tous les 32 px. Les repères de 16 px que l'audit P9 propose pour la boîte grise feraient ici des rayures serrées : ils restent à la boîte grise. Quelques taches, une fissure rare : le sol vit, mais ses repères restent les plus contrastés du calque. Son ton est le même d'un bout à l'autre, sans dégradé : une bande de tramage sur toute la largeur vibrerait à la secousse.
- **La bordure** de granit au premier plan, éclairée sur son arête, puis le caniveau et l'asphalte sombre. En gros plan, la caméra coupe la bordure.
- **Les deux bouts** : le sol s'assombrit sur les 24 derniers pixels du monde, sous l'échafaudage à gauche et sous le pilier à droite.

Les joints restent verticaux. Une vraie perspective demanderait un défilement par rangée (la technique des jeux d'arcade), que le pipeline n'a pas : c'est noté pour plus tard (§10).

### 3.4 La perspective

Les trois calques trichent comme les jeux de combat classiques. Le calque `mid` défile à 50 % : il est censé être deux fois plus loin que les combattants. Ses gens font donc à peu près la moitié de leur taille (41 px du monde contre 84), et ses façades se posent 30 px au-dessus de la ligne de sol, au fond du trottoir. Sinon, une porte posée au ras des pieds paraîtrait plus petite qu'un combattant.

## 4. La palette

Une seule palette pour tout le décor (`tools/stage/rue/palette.ts`), en rampes de teintes. Chaque rampe va d'une ombre froide et violette à une lumière chaude et orangée : la nuit et les réverbères au sodium sont dans les couleurs elles-mêmes, pas dans un filtre. Il n'y a ni alpha ni dégradé lissé. Les lumières se calculent (§5), puis chaque pixel prend un cran de sa rampe, avec un tramage ordonné limité au tiers central de chaque passage.

| Rampe | Rôle |
|---|---|
| ciel | Nuit violette, puis lueur de ville vers l'horizon |
| ville lointaine | Silhouettes à un cran du ciel |
| acier | Viaduc, escaliers de secours, réverbères, balcons |
| brique rouge, brique peinte, brique claire | Les trois façades |
| pierre | Corniches, linteaux, appuis de fenêtre |
| vitre sombre | Les fenêtres éteintes, qui reflètent le ciel |
| intérieur chaud, intérieur froid | Les fenêtres allumées, la laverie |
| tôle | Les rideaux de fer |
| néon orange, néon violet | Les enseignes et le néon du club |
| silhouette | Les gens, avec leurs liserés de lumière |
| béton, granit, asphalte | Le trottoir, la bordure, la chaussée |
| tags, affiches | Des couleurs passées, jamais le cyan ni le magenta des combattants |

Les contrastes mesurés par `src/render/luminance.ts` sont au §8.

## 5. La lumière

Les sources :

- **Deux réverbères au sodium** au bord du trottoir : une lumière orange qui tombe de haut et éclaire les façades en flaques larges.
- **Les vitrines** : la lumière chaude de l'épicerie, la lumière froide de la laverie. Elles éclairent le trottoir devant elles et le bas des passants.
- **La porte du club** : une lampe grillagée et le néon violet.
- **Les fenêtres allumées** : une lampe dans la pièce, des rideaux tirés sur les côtés.
- **Le rebond de la rue** : le bas des façades s'éclaircit d'un cran et demi vers le trottoir. C'est la lumière des vitrines et des réverbères renvoyée par le sol. C'est aussi le contre-jour de l'audit P8 : derrière les torses, le mur monte à 1,61:1 contre le ton sombre des tenues (§8).

La lumière sculpte les volumes. Les corniches et les appuis de fenêtre ont une arête éclairée et une ombre portée dessous. Les escaliers de secours sont éclairés sur le dessus de leurs barres. Les gens ont un liseré sur le côté de leur source et restent sombres ailleurs, comme les silhouettes à contre-jour de l'Entrepôt.

## 6. Ce qui bouge

Des « props » : de petites animations de quelques images, posées sur un calque et jouées par le rendu (`src/render/stage-props.ts`). Elles ne touchent jamais au cœur (D17). Elles comptent les pas de l'horloge visuelle, 60 par seconde, et changent d'image d'un coup, sans rien interpoler (D23). Ce sont des découpes : chaque image ne porte que les pixels qui changent par rapport à l'image fixe du calque.

| Prop | Calque | Rythme |
|---|---|---|
| La file d'attente | `mid` | Chacun se balance sur le temps, 120 BPM (30 pas), pas tous sur le même |
| Le videur | `mid` | Il tourne la tête de temps en temps |
| Le fumeur à la fenêtre | `mid` | Il porte sa cigarette, lentement, la fumée monte |
| Le couple au balcon | `mid` | L'un parle avec les mains, l'autre hoche la tête |
| Le guetteur de l'escalier de secours | `mid` | Accoudé à la rampe, il hoche la tête sur deux temps |
| Une silhouette derrière un rideau | `mid` | Elle passe, rarement |
| Le chat de l'épicerie | `mid` | Il bat de la queue |
| La vapeur de la bouche d'égout | `mid` | Des bouffées qui montent et s'élargissent, 12 images de 6 pas |
| Le néon du club | `mid` | Il respire sur une mesure (2 s), à faible écart de luminance |

Aucune lumière ne s'allume ni ne s'éteint, et aucun néon ne clignote. Le néon du club respire une fois toutes les 2 secondes : entre ses images, l'écart de luminance d'un pixel est de 0,051 au plus, sur 89 px² du monde, loin du seuil d'un flash (ΔL 0,1 sur une grande surface). Les animations sont déphasées : elles ne s'additionnent pas ([flashs.md](../flashs.md) §3).

Les gens bougent à la mesure du club : un temps dure 30 pas (120 BPM). La file avance par demi-temps, chacun plonge ou hoche la tête sur le sien.

Un prop est libéré à la fin du combat, avec le reste (`tests/render/disposal.test.ts`). Sa texture, comme celle des calques, reste chargée pour le combat suivant.

## 7. Les budgets

- **Mémoire vidéo** : 6,72 Mo, calques et props compris (§2), comptée par le test du budget.
- **Flashs** : rien ne clignote. Les grandes couleurs du décor (celles qu'un calque étale sur 1 % de l'écran au moins) règlent les voiles, et les tests de flashs se jouent sur elles. La plus sombre reste au moins aussi claire que le ciel de la boîte grise (`#1b1b2f`).
- **Performances** : trois images de calque et neuf petits sprites qui partagent une seule texture, dessinés à la suite du calque du milieu. Par image : une boucle de neuf entrées, et un changement d'image de temps en temps. Rien d'autre ne tourne : aucun shader, aucune particule, aucune allocation en combat.
- **Mobiles faibles** : le décor est opaque à l'arrière et transparent ailleurs, sans mélange. Son seul cran de qualité, si un jour le régulateur de [qualite-adaptative.md](../qualite-adaptative.md) en a besoin, c'est de figer les props, puis de masquer le calque du milieu.

## 8. Les contrastes mesurés

Mesurés avec la luminance relative de `src/render/luminance.ts`, sur les images installées. Les tons des tenues sont ceux de l'audit P8 : `#19191e` (le sombre) et `#36363f` (le clair).

| Zone | Luminance moyenne | Contre `#19191e` | Contre `#36363f` |
|---|---|---|---|
| Ciel, en haut (sous le HUD) | 0,012 | 1,04:1 | 1,41:1 |
| Mur de L'Entrepôt, en haut | 0,027 | 1,28:1 | 1,15:1 |
| Mur de L'Entrepôt, à hauteur des torses | 0,046 | 1,61:1 | 1,10:1 |
| Trottoir du plan moyen | 0,043 | 1,55:1 | 1,06:1 |
| Dalles du sol | 0,041 | 1,53:1 | 1,04:1 |

Les **grandes couleurs** sont au nombre de 37 (`src/art/rue/colors.ts`). La plus sombre est `#1b1b2f`, le ciel de la boîte grise (L 0,0122) : les étincelles et les mots s'y mesurent comme avant. La plus claire est `#6d4357` (L 0,0795). Toutes restent dans la bande où les effets sont réglés (voir [aseprite.md](aseprite.md), « Les flashs, sur le décor ») :

- aucune n'est plus sombre que le ciel de la boîte grise ;
- aucune n'est assez claire pour qu'un effet noir la change de plus de ΔL 0,08 ;
- les tons froids (sarcelle de la laverie, gris bleu) s'arrêtent vers L 0,045, où le halo cyan du Finisher dépasserait sinon ΔL 0,08.

Cette bande borne le contraste des combattants sur le décor. Un fond neutre ne peut pas dépasser environ L 0,05, soit 1,65:1 contre le ton sombre des tenues. Le décor y monte à hauteur des torses (1,61:1). Le reste de la séparation revient au contour des combattants (audit P8, option A, lot 6).

Les tests le gardent : `tests/tools/stage-drawn.test.ts` (la bande), `tests/tools/stage-rue.test.ts` (le cyan et le magenta laissés aux combattants, le contrat des calques, les props), et tous les tests de flashs.

## 9. Le rendu Canvas

En rendu Canvas (`?rendu=canvas`, `render-mode.ts`), Phaser ne teinte rien. Le décor n'utilise aucune teinte, aucun mélange et aucun alpha : il s'affiche à l'identique, props compris (vérifié en capture). Il n'y a rien à simplifier.

## 10. La propriété intellectuelle

Rien n'est copié : aucun jeu, aucun lieu réel, aucune marque, aucun logo. Les enseignes sont des mots génériques en français (« ÉPICERIE », « LAVERIE », « OUVERT »). La vieille réclame dit « ENTREPÔTS ». Le néon du club est un dessin à nous. Les tags sont tracés au hasard par le code. Les affiches sont des aplats sans texte. La rue s'inspire des vieux quartiers de New York (escaliers de secours, réservoirs d'eau, échafaudages, ligne aérienne), mais ce n'est aucune rue réelle.

## 11. Les itérations

Chaque version a été regardée en planche, puis en jeu, avant d'être corrigée.

1. **Première passe** : les silhouettes ressemblaient à des robots (torses en boîte, bras collés au corps). Elles ont été refaites en volumes : tête, épaules tombantes, taille, membres coniques, et un liseré qui s'efface vers les jambes. La peinture écaillée faisait des taches de sang : elle laisse maintenant voir la brique. La vieille réclame avait l'air d'un panneau à LED : c'est devenu une bande pâle et usée. Les graffitis ressemblaient à des arêtes de poisson. La vapeur était un chapelet de points. Enfin, il y avait une marche de ton entre le trottoir et le sol.
2. **En jeu** : en gros plan, la réclame criait derrière les têtes, et un graffiti beige faisait une tache derrière Nayo. Les tours lointaines n'étaient que des blocs. Le réverbère de droite coupait « LAVERIE », puis le couple du balcon. Le bas des façades était trop sombre pour détacher les tenues noires.
3. **Les flashs** : la première rue faisait échouer cinq tests (vitrines chaudes et laverie trop claires sur plus de 1 % de l'écran, deux tons sous le ciel de la boîte grise). Les grandes zones claires ont été assombries dans leur masse, la lumière gardée en petites touches, et le ton le plus sombre ramené au ciel de la boîte grise. Aucune règle n'a bougé.
4. **La finition** : des flaques qui se lisent comme de l'eau, des bandes de tramage pleine largeur retirées du sol et du trottoir, un rebond de lumière plus fort en bas des façades.

## 12. Plus tard

- Un défilement par rangée du sol, pour des joints en vraie perspective.
- Un métro qui passe sur le viaduc toutes les quatre minutes, comme à la salle du Viaduc.
- Des props dessinés à la main dans Aseprite, avec leur gabarit.
- Le chat qui traverse la rue entre deux rounds, les rideaux de fer qui tremblent sur le DROP : seulement si le jeu le demande.
