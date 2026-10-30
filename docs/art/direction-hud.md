# Direction du HUD, des titres et de leurs animations

Ce que montrent le haut de l'écran de combat et les titres des menus, et pourquoi. Chaque choix s'appuie sur des jeux de combat reconnus, vérifiés sur des sources ouvertes (liste à la fin). La jauge de Boost a sa spécification dans `docs/combos-v3.md` §1.8.6.

## 1. Principes

- **Une signature : le jaune à bords orangés.** Les titres et la barre de vie partagent la même palette :
  - #FFF4C8 pour le reflet, #F0C94A pour le cœur ;
  - #E07A22 pour le bord, #C4561C pour la profondeur.
  - C'est la barre en tube de Street Fighter III 3rd Strike et de Garou, transposée au jaune du jeu.
- **La couleur d'énergie dit le côté.** Elle colore le liseré du haut des barres, le mot BOOST et la 1re barre de Boost : cyan ou magenta pour Nayo, selon la tenue, et magenta pour Riff. Dans sa tenue 2, Riff passe au cramoisi sur le HUD : son énergie y est l'or, qui se lirait comme le jaune de la vie, et le Boost n'est jamais doré (`hudColorOf`, `src/render/hit-styles.ts`).
- **Le pixel reste net.** Tout est dessiné en pixels de la vue de 480 × 270, que la caméra agrandit 2 ou 4 fois. Une forme dessinée est une suite de « spans », des rangées de pixels d'une couleur (`src/render/hud-paint.ts`). Des fonctions pures les calculent, ce qui permet de les tester sans moteur.
- **Les animations suivent l'horloge du match** (`GameState.frame`, 60 tics par seconde). Elles s'arrêtent avec la pause et sont les mêmes à toute fréquence d'affichage (`health-motion.ts`, `boost-motion.ts`).
- **Pas plus de 3 flashs par seconde** (D21). Avec le réglage système « réduire les animations » (`prefers-reduced-motion`), le HUD ne flashe plus, ne tremble plus et ne fait plus monter de braises ni voler d'éclats.
- **Le danger se dit sans clignoter.** Plutôt qu'une barre qui clignote, une couleur stable et des braises qui montent, comme la Rage de Tekken 8.

## 2. Titres (DOM, `src/styles.css`)

- **Titres des menus et noms de la sélection.**
  - Un liseré orange de 1 px dans les 8 directions.
  - Deux rangées de profondeur #C4561C.
  - Une ombre noire décalée.
  - Les ombres CSS restent nettes, sans flou. Un dégradé en bandes a été écarté : il casse sur les titres de deux lignes.
- **Le logo NAYOSBEAT.**
  - Un liseré de 2 px, de la profondeur et une ombre.
  - Son « O » est un **vinyle en pixels** :
    - un disque de 18 × 18 px (2 par pixel de la police), cerclé d'orange, avec ses sillons et son reflet ;
    - il dépasse les lettres d'un pixel de police en haut et en bas, centré sur elles : un rond aussi haut qu'une lettre carrée paraît plus petit qu'elle ;
    - son étiquette jaune porte une marque qui tourne : 8 images, un tour en 1,8 s, soit environ 33 tours par minute ;
    - il ne tourne pas en mouvement réduit ;
    - il est généré par `tools/sprites/vinyl.ts` dans `src/ui/title-vinyl.png` (284 octets).
  - Le texte reste lisible par les lecteurs d'écran (`aria-label`).

## 3. Barre de vie (`src/render/health-bar.ts`)

- **Forme.**
  - Un tube de 8 rangées sur 176 px.
  - Il est en biais d'un pixel par rangée vers le chrono : un parallélogramme, comme les segments de Street Fighter 6.
  - Un contour sombre de 1 px l'entoure, et un liseré de la couleur d'énergie court sur le haut.
- **Sens.** La vie restante reste collée au chrono ; la perte s'ouvre côté bord de l'écran.
  - C'est le cas dans tous les jeux vérifiés : 3rd Strike, Guilty Gear Strive, BlazBlue, Dragon Ball FighterZ, KOF XIII, Tekken 8.
  - L'ancienne barre de NayosBeat faisait l'inverse.
- **Couleurs.**
  - Jaune à bords orangés.
  - À 30 % de vie ou moins, orange profond, avec des braises de 2 px puis 1 px qui montent du tube et en sortent, sous le haut de l'écran. Le seuil de 30 % est celui de Strive et de Granblue Fantasy Versus. Il se juge sur la vie du perso, pas sur la barre qui se remplit au début d'un round.
- **Coup reçu.**
  - La barre tombe tout de suite.
  - Derrière elle, une **traînée rouge** (#B80200, celle de Strive) garde ce que le combo a pris.
  - Elle attend la fin du combo (ou le KO), puis 0,5 s, puis se vide en 1,25 s pour une barre entière.
  - Ce que le dernier coup a pris s'allume **en blanc pendant 4 tics**, au plus une fois tous les 20 tics (3 par seconde).
  - Un coup qui prend 6 % de la barre ou plus la fait trembler d'un pixel, de gauche à droite, pendant 8 tics.
- **Front.** Le bout de la vie restante est un pixel plus clair, comme le liseré de front de Street Fighter 6.
- **KO.** Comme la jauge de Boost (§4), la barre dit comment le combattant est tombé :
  - **un coup seul** (moins de 3 coups dans le combo) : elle se vide, sans plus ;
  - **la fin d'un combo** de 3 coups ou plus : elle se **fissure**. Quatre fissures la traversent, claires sur le tube vide et sombres sur la traînée rouge, coupent son liseré, et cinq éclats tombent ;
  - **l'Ultime** (et plus tard le Finisher) : elle **éclate** en même temps que la jauge. Elle tremble, ses éclats de verre (ceux du haut à la couleur du perso) et de la traînée rouge sont projetés puis retombent sur la scène en 48 tics, avec 18 étincelles jaunes et orange ; son cadre reste éteint.
  - En mouvement réduit : les fissures apparaissent d'un coup, et l'explosion laisse directement le cadre éteint.
- **Nouveau round.** La barre se remplit en 0,75 s au lieu d'apparaître pleine, réparée.

## 4. Jauge de Boost (`src/render/boost-gauge.ts`)

Spécification complète : `docs/combos-v3.md` §1.8.6. En bref :

- **Une capsule et un tube.** La capsule montre le nombre de barres. Dans le tube, les barres s'empilent, chacune par-dessus la précédente, comme dans Marvel vs. Capcom 2 et Dragon Ball FighterZ. Les couleurs sont l'énergie, puis l'énergie éclaircie, puis le platine du Boost (jamais l'or, §1.8.7). Elles sont proches en clarté : un pixel clair puis un pixel sombre marquent où la barre qui se remplit rejoint celle du dessous.
- **Pleine.** Le mot devient « MAX », comme la plaque MAXIMUM de King of Fighters XV : la jauge change de mot, pas seulement de couleur. Un reflet passe sur le tube.
- **En jeu.** La jauge monte au lieu de sauter, et une lumière balaie la barre qui vient de se compléter.
- **Dépense.** Elle se vide vite, le front en blanc : une barre en 10 tics, la super en une demi-seconde, comme la Tension de Guilty Gear Strive.
- **KO.** Elle dit comment le combattant est tombé : normale après un coup seul, fissurée à la fin d'un combo de 3 coups ou plus, éclatée sous l'Ultime ou le Finisher : elle tremble, ses carrés (le motif de désintégration de King of Fighters XV) sont projetés puis retombent, avec des étincelles, et les téléphones et les manettes vibrent. Elle revient entière au round suivant, avec son Boost.

## 5. Chrono et rounds (`src/render/hud-discs.ts`)

- **Le chrono est posé sur un vinyle**, comme le « O » du titre. Plusieurs jeux donnent une identité au chrono : le cadran néon de Skullgirls, le disque de Strive, le néon de SF6.
  - Le disque fait 40 px, cerclé d'orange avec une rangée de profondeur, avec des sillons et un reflet.
  - Un repère jaune fait le tour du sillon extérieur en 16 pas, un pas tous les 7 tics : un tour en 1,9 s, à peu près un 33 tours. Il passe par-dessus les chiffres, sans jamais en cacher le blanc.
  - Il ne tourne que quand le chrono tourne. En entraînement, où il n'y a pas de chrono, il tourne tout le temps.
  - Les chiffres sont en Press Start 2P de 16 px, blancs cernés de noir. À 10 s ou moins, ils passent à l'orange, sans clignoter.
- **Rounds gagnés.**
  - Des disques de 7 px au bout intérieur de chaque barre : la 1re victoire est la plus près du chrono.
  - Gagné : jaune à liseré orange. À gagner : sombre.
- **Bande.** Une bande sombre translucide (#0C0614 à 55 %) court sous le haut du HUD et s'efface en deux paliers, comme celle qui passe derrière les barres de Street Fighter 6 ([chronique UI #004](https://www.streetfighter.com/6/ja-jp/column/detail/ui04)). Elle garde la barre et les noms lisibles sur un décor chargé.

## 6. Coût

Le HUD est créé une fois par combat :

- 2 barres, chacune un Graphics ;
- 2 jauges, chacune un Graphics et 2 textes ;
- les pastilles de rounds, 2 Graphics ;
- la bande ;
- le vinyle, une texture dessinée une fois, avec un Graphics pour son repère ;
- les textes : noms, chrono, annonces.

Un Graphics n'est repeint que quand ce qu'il montre change : longueur en pixels, couleur, flash, braise, balayage ou éclat. Au repos, rien n'est redessiné.

Le jeu dessine avec une seule texture par appel (`maxTextures: 1`, `src/main.ts`) : passer d'un texte à un Graphics peut ouvrir un nouvel appel de dessin. Si un téléphone peine, regrouper les Graphics puis les textes est la première piste, à mesurer avant.

## 7. Références

Sources ouvertes lues : manuels web officiels, Dustloop, Wavu, chroniques UI officielles de SF6, captures officielles (Steam, Wikipedia) mesurées au pixel.

| Jeu | Ce qu'on en garde |
| --- | --- |
| Street Fighter III 3rd Strike | Barre en tube, mesurée sur une [capture Steam](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/586200/ss_23514c0ab2b463aac9c2e0e74b95275c73ccc206.1920x1080.jpg) : contour #730101, blanc #F5FFF7, or-orange #F5B50B, jaune #FBFF0A sur 2 rangées, jaune plus foncé #F8DF06, or #F9B607, cadre #A1A8C2 |
| Garou | Barre de 6 px : reflet #FFFF98, corps #FFE916, ombre #F1BE00, contour #1E162C ([capture](https://upload.wikimedia.org/wikipedia/en/f/f6/NEOGEO_Garou_-_Mark_of_the_Wolves.png)) |
| Guilty Gear Strive | Traînée rouge #B80200 et orange sous 30 %, mesurés sur une [capture Steam](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1384160/ss_9a79a69cfd22eaaad420f97cc0205dac8f85be43.1920x1080.jpg) ; seuil de 30 % ([Dustloop](https://www.dustloop.com/w/GGST/HUD)) ; vidange rapide de la Tension (2 % par image chez Strive ; ici une barre en 10 tics) ([Dustloop](https://www.dustloop.com/w/GGST/Mechanics)) |
| BlazBlue Central Fiction | Paliers de couleur de la jauge Heat : bleu, vert, rouge, puis or à 100 % ([Dustloop](https://www.dustloop.com/w/BBCF/HUD)) |
| Marvel vs. Capcom 2 | Barres empilées de couleurs différentes, gros chiffre de niveau dans une capsule ([manuel Capcom](https://game.capcom.com/manual/MVCFC/en/switch/page/7/1)). Le sens de remplissage, du bord de l'écran vers le chrono, est un choix de NayosBeat |
| Dragon Ball FighterZ | Couches du Ki, chiffre du niveau ([Dustloop](https://www.dustloop.com/w/DBFZ/HUD)) |
| King of Fighters XV | Plaque MAXIMUM quand la jauge est pleine ; carrés qui se désagrègent ([manuel SNK](https://www.snk-corp.co.jp/webmanual/kofxv/en/gamestart2.php)) |
| Street Fighter 6 | Segments en parallélogramme, reflet haut et ombre basse, liseré de front ; bande sombre translucide derrière chaque barre ; les joueurs confirmés lisent les jauges en vision périphérique ([chronique UI #004](https://www.streetfighter.com/6/ja-jp/column/detail/ui04)) |
| Tekken 8 | La Rage fait luire la barre en rouge ([Wavu](https://wavu.wiki/t/Rage)), des volutes montent au-dessus ([capture Steam](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1778820/ss_5115ee8e47dda957a648a1fedb5325c7b49ec898.1920x1080.jpg)) : d'où les braises, sans clignotement |
| Granblue Fantasy Versus Rising | Seuil de danger à 30 % ([Dustloop](https://www.dustloop.com/w/GBVSR/HUD)) |
| Skullgirls | Chrono à identité forte, un cadran néon ([capture Steam](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/245170/ss_710091eb4f29c8095eecab5694a8ea67a0bc454d.1920x1080.jpg)) |
| Mortal Kombat 1 | Sons aux seuils de vie, pour l'accessibilité ([GamingBolt](https://gamingbolt.com/mortal-kombat-1-accessibility-features-detailed), à faire) |

**Non vérifié**, faute de source ouverte lisible :

- le tremblement et le flash de la barre au coup : aucune source ne les documente, ce sont des choix du jeu ;
- les seuils exacts des couleurs de 3rd Strike ;
- le sens de remplissage de la jauge de MvC2 (la capture du manuel suggère du centre vers la capsule) ;
- les couleurs de niveau de MvC3 et de Skullgirls.

SuperCombo, Mizuumi, Game UI Database et Fandom bloquent la lecture automatique, et ce blocage a été respecté.

## 8. Suite : menus, textes et animations

La recherche (7 agents, puis une critique qui a rouvert une trentaine de sources) propose la suite, par ordre de priorité. Les points ci-dessous tiennent compte des corrections de la critique.

**Bientôt**

1. **Les menus sur la grille de 8.** Press Start 2P n'est nette qu'en multiples de 8 px.
   - Options à 16 px (12 aujourd'hui), petits textes à 8 px (7 et 10 aujourd'hui), coins carrés au lieu de `border-radius: 4px`.
   - Une seule ligne d'aide sous la liste, pour l'option choisie, plutôt qu'une indication dans chaque option (Sakurai, [colonne Famitsu vol. 138](https://sourcegaming.info/2016/06/07/rethinking-your-menus-sakurais-famitsu-column-vol-138/)). Sinon, avec l'option « Installer le jeu », le menu principal dépasse un écran de 375 px de haut.
   - Sur un écran à densité fractionnaire (2,625 par exemple), les décalages des ombres des titres tombent entre deux pixels physiques : un facteur calculé au chargement pourrait les arrondir.
2. **L'option choisie en plaque.** Plaque jaune, texte sombre, plaque arrière corail décalée de 2 px, 8 px entre les options, et une flèche à gauche, pour que le choix ne tienne pas qu'à la couleur. C'est le choix par plaques superposées de Persona 5 Royal ([capture](https://i0.wp.com/www.siliconera.com/wp-content/uploads/2024/01/persona-5-royal-menu.jpg?resize=1200%2C675)) et de Hi-Fi Rush ([capture](https://interfaceingame.com/wp-content/uploads/hi-fi-rush/hi-fi-rush-main-menu.png)).
3. **L'écran de sélection.**
   - Le « ? » reste réservé à « Aléatoire » et les cases à venir deviennent des pochettes vides, comme Guilty Gear Xrd sépare le cadenas du hasard ([capture](https://interfaceingame.com/wp-content/uploads/guilty-gear-xrd-revelator/guilty-gear-xrd-revelator-select-the-character.png)).
   - Le cadre lumineux et flou de la case choisie devient un cadre net, bord jaune et anneau corail.
4. **Une seule source pour le mouvement réduit**, `prefersReducedMotion()`, partagée par la sélection et le HUD en attendant l'option du jeu.
5. **Les textes du combat en lettrage cuit.** Le chrono, les noms et les annonces passent au jaune à bords orangés, dessinés une fois en pixels, plutôt qu'avec le contour de Phaser, qui est anticrénelé. Il ne faut les cuire qu'une fois la police chargée (`document.fonts.check`) : sinon la police de secours resterait en cache jusqu'au rechargement de la page.

**Plus tard**

6. **Options de confort et budget de flashs.**
   - Deux options : « Effets de flash : normaux, réduits, aucun » et « Tremblement de l'écran ». Leur valeur par défaut vient du système. SF6 et Tekken 8 en ont ([Digistatement](https://digistatement.com/street-fighter-sf-6-how-to-disable-screen-shake/), [Can I Play That](https://caniplaythat.com/2024/02/28/tekken-8-accessibility-review/)).
   - Un `FlashBudget` pur accorde au plus 3 flashs par seconde glissante.
   - Les voiles plein écran du KO et de la super (`effects.ts`, 10 à 12 tics à 70 %) couvrent bien plus que la surface à partir de laquelle un flash compte pour le W3C ([WCAG 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)) : ils doivent passer par ce budget.
7. **Début de round sur le temps** (90 tics, soit 3 temps à 120 BPM).
   - « ROUND n » entre d'un coup sec, d'abord en contour seul, puis plein, comme dans KOF XV.
   - « COMBAT ! » tombe sur le 3e temps : c'est l'entrée de SF6, ramenée à 4 tics.
8. **Le KO.** « K.O. » en lettrage complet, des rayons violets et orange plutôt que le rouge et les flashs blancs de 3rd Strike, et le HUD visible tout du long.
9. **Un compteur de combo** côté attaquant, s'il complète les onomatopées.
   - Il grossit avec le combo, comme dans Strive.
   - Il est en couleurs chaudes pour un vrai combo, et en couleurs froides en entraînement quand le combo était évitable, la convention d'Arc System Works ([Dustloop](https://www.dustloop.com/w/GGXRD-R2/HUD)).
10. **Une UI qui bat avec la musique.**
    - Une horloge du temps (`BEAT_TICKS = 30`) et un seul élément qui bat à chaque temps, avec un accent au premier temps de la mesure.
    - Seules les réussites sont récompensées, comme dans Hi-Fi Rush ([Kotaku](https://kotaku.com/hi-fi-rush-game-pass-rhythm-game-visual-options-1850053933)).
    - Le Crossfader va sous le vinyle du chrono (`docs/combat-v2.md` §8.3).
11. **Les transitions des menus.**
    - Une barre balaie l'écran en 250 ms, comme un crossfader.
    - À deux joueurs, le repère de J1 va en haut à gauche de la case et celui de J2 en bas à droite, comme dans KOF XV.
    - L'écran VS dure 3 mesures, comme dans Guilty Gear Xrd.
12. **Un lettrage par combattant.** Nayo en tube néon cyan, Riff en lettres découpées magenta. Chaque personnage de SF6 a sa police ([chronique UI #002](https://www.streetfighter.com/6/column/detail/ui02)).
13. **Sons aux seuils de 50 % et 25 %, et un mode daltonien** pour le trio cyan, magenta et orange (Mortal Kombat 1).
14. **Les jeux de DJ et de rythme.** Étudier la jauge Euphoria de DJ Hero et la Groove Gauge de beatmania IIDX (seuil à 80 %), pour décider de repères à 1/3 et 2/3 sur le Boost.

**Tranché par le propriétaire.** La jauge n'éclate pas à chaque KO : elle reste normale après un KO ordinaire, se fissure à la fin d'un combo propre, et n'éclate que sous l'Ultime ou le Finisher (§4).
