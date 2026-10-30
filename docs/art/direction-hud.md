# Direction du HUD, des titres et de leurs animations

Ce que montrent le haut de l'écran de combat et les titres des menus, et pourquoi. Chaque choix s'appuie sur des jeux de combat reconnus, vérifiés sur des sources ouvertes (liste à la fin). La jauge de Boost a sa spécification dans `docs/combos-v3.md` §1.8.6.

## 1. Principes

- **Une signature : le jaune à bords orangés.** Les titres et la barre de vie partagent la même palette :
  - #FFF4C8 pour le reflet, #F0C94A pour le cœur ;
  - #E07A22 pour le bord, #C4561C pour la profondeur.
  - C'est la barre en tube de Street Fighter III 3rd Strike et de Garou, transposée au jaune du jeu.
- **La couleur d'énergie dit le côté.** Elle colore le liseré du haut des barres, le mot BOOST et la 1re barre de Boost : cyan ou magenta pour Nayo, magenta ou cramoisi pour Riff, selon la tenue.
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
- **Nouveau round.** La barre se remplit en 0,75 s au lieu d'apparaître pleine.

## 4. Jauge de Boost (`src/render/boost-gauge.ts`)

Spécification complète : `docs/combos-v3.md` §1.8.6. En bref :

- **Une capsule et un tube.** La capsule montre le nombre de barres. Dans le tube, les barres s'empilent, chacune par-dessus la précédente, comme dans Marvel vs. Capcom 2 et Dragon Ball FighterZ. Les couleurs sont l'énergie, puis l'énergie éclaircie, puis le platine du Boost (jamais l'or, §1.8.7). Elles sont proches en clarté : un pixel clair puis un pixel sombre marquent où la barre qui se remplit rejoint celle du dessous.
- **Pleine.** Le mot devient « MAX », comme la plaque MAXIMUM de King of Fighters XV : la jauge change de mot, pas seulement de couleur. Un reflet passe sur le tube.
- **En jeu.** La jauge monte au lieu de sauter, et une lumière balaie la barre qui vient de se compléter.
- **Dépense.** Elle se vide vite, le front en blanc : une barre en 10 tics, la super en une demi-seconde, comme la Tension de Guilty Gear Strive.
- **KO.** Elle vole en carrés qui tombent, le motif de désintégration de King of Fighters XV. Elle revient entière au round suivant, avec son Boost.

## 5. Chrono et rounds (`src/render/hud-discs.ts`)

- **Le chrono est posé sur un vinyle**, comme le « O » du titre. Plusieurs jeux donnent une identité au chrono : le cadran néon de Skullgirls, le disque de Strive, le néon de SF6.
  - Le disque fait 40 px, cerclé d'orange avec une rangée de profondeur, avec des sillons et un reflet.
  - Un repère jaune fait le tour du sillon extérieur en 16 pas, un pas tous les 7 tics : un tour en 1,9 s, à peu près un 33 tours. Il passe par-dessus les chiffres, sans jamais en cacher le blanc.
  - Il ne tourne que quand le chrono tourne. En entraînement, où il n'y a pas de chrono, il tourne tout le temps.
  - Les chiffres sont en Press Start 2P de 16 px, blancs cernés de noir. À 10 s ou moins, ils passent à l'orange, sans clignoter.
- **Rounds gagnés.**
  - Des disques de 7 px au bout intérieur de chaque barre : la 1re victoire est la plus près du chrono.
  - Gagné : jaune à liseré orange. À gagner : sombre.
- **Bande.** Une bande sombre translucide (#0C0614 à 55 %) court sous le haut du HUD et s'efface en deux paliers, comme dans Strive. Elle garde la barre et les noms lisibles sur un décor chargé.

## 6. Coût

Le HUD est créé une fois par combat :

- 2 barres, chacune un Graphics ;
- 2 jauges, chacune un Graphics et 2 textes ;
- les pastilles de rounds, 2 Graphics ;
- la bande ;
- le vinyle, une texture dessinée une fois, avec un Graphics pour son repère ;
- les textes : noms, chrono, annonces.

Un Graphics n'est repeint que quand ce qu'il montre change : longueur en pixels, couleur, flash, braise, balayage ou éclat. Au repos, rien n'est redessiné.

## 7. Références

Sources ouvertes lues : manuels web officiels, Dustloop, Wavu, chroniques UI officielles de SF6, captures officielles (Steam, Wikipedia) mesurées au pixel.

| Jeu | Ce qu'on en garde |
| --- | --- |
| Street Fighter III 3rd Strike, Garou | Barre en tube : rangées nettes, cœur jaune, bords orangés |
| Guilty Gear Strive | Traînée rouge #B80200 ; bande sombre derrière le HUD ; orange sous 30 % ; vidange rapide de la Tension (2 % par image chez Strive ; ici une barre en 10 tics) ([Dustloop](https://www.dustloop.com/w/GGST/HUD)) |
| BlazBlue Central Fiction | Couleur qui porte l'état ; paliers de couleur de la jauge Heat ([Dustloop](https://www.dustloop.com/w/BBCF/HUD)) |
| Marvel vs. Capcom 2 | Barres empilées de couleurs différentes, gros chiffre de niveau ([manuel Capcom](https://game.capcom.com/manual/MVCFC/en/switch/page/7/1)) |
| Dragon Ball FighterZ | Couches du Ki, chiffre du niveau ([Dustloop](https://www.dustloop.com/w/DBFZ/HUD)) |
| King of Fighters XV | Plaque MAXIMUM quand la jauge est pleine ; carrés qui se désagrègent ([manuel SNK](https://www.snk-corp.co.jp/webmanual/kofxv/en/gamestart2.php)) |
| Street Fighter 6 | Segments en parallélogramme, reflet haut et ombre basse, liseré de front ; les joueurs confirmés lisent les jauges en vision périphérique ([chronique UI](https://www.streetfighter.com/6/ja-jp/column/detail/ui04)) |
| Tekken 8 | Braises de la Rage au lieu d'un clignotement ([Wavu](https://wavu.wiki/t/Rage)) |
| Granblue Fantasy Versus Rising | Seuil de danger à 30 % ([Dustloop](https://www.dustloop.com/w/GBVSR/HUD)) |
| Skullgirls | Chrono à identité forte (cadran néon) |
| Mortal Kombat 1 | Sons aux seuils de vie, pour l'accessibilité (à faire) |

**Non vérifié**, faute de source ouverte lisible :

- le tremblement et le flash de la barre au coup : aucune source ne les documente, ce sont des choix du jeu ;
- les seuils exacts des couleurs de 3rd Strike et de BlazBlue ;
- les couleurs de niveau de MvC3 et de Skullgirls.

SuperCombo, Mizuumi, Game UI Database et Fandom bloquent la lecture automatique, et ce blocage a été respecté.

## 8. À venir

- **Menus, textes et animations de transition.** La recherche continue, et cette fiche sera complétée.
- **Sons aux seuils de vie** de 50 % et 25 % (Mortal Kombat 1).
- **Crossfader** (`docs/combat-v2.md` §8.3) : il ira sous le vinyle du chrono.
- **Option « Flashs réduits »** dans le jeu, en plus du réglage système.
