# Audit et plan de polish : renforcer ce qui existe

*Statut : **PROPOSITION**, à valider par le propriétaire. Ce document ne change aucun code. Il ne propose ni personnage ni planche de sprites : seulement des effets dessinés par le code, de l'interface, du son synthétisé et des réglages de l'IA.*

> Demande d'origine : « de vrais calculs, éléments, concepts arts, le nécessaire pour créer les vfx, détails, et autres petites choses en plan, pour réellement combler le game design et les lacunes du jeu déjà en place […] juste renforcer HYPER PRO ce qu'on a déjà ».

## En bref

Le jeu a déjà une base solide :
- un hitstop piloté par les données ;
- des gerbes propres à chaque personnage, en pools ;
- un budget de flashs complet et testé ;
- une secousse en trauma² à graine ;
- des options de confort ;
- une IA déterministe ;
- des sons déclenchés par des événements.

Ce qui manque surtout, c'est la **cohérence du retour**. Huit lacunes pèsent le plus, chacune mesurée :

1. **Le poids d'un coup se lit sur ses dégâts, pas sur son gel.**
   - La Mise au tapis de Nayo (gel de 14 tics, met au sol) joue la gerbe, le mot, le son et l'absence de secousse d'un jab.
   - Cinq coups de Riff sont dans le même cas.
2. **La caméra ne réagit à aucun coup.** La spécification promet pourtant un zoom sur le CONTRE.
3. **Le son est identique à chaque coup.**
   - Pas de variation, pas de note pentatonique (pourtant spécifiée deux fois), pas de stéréo.
   - Pas de protection du bus maître.
   - Le KO n'est que 1,6 dB au-dessus d'un coup lourd.
4. **Le CPU triche en garde.** Pendant son blockstun, il lit en direct si le coup suivant est haut ou bas : il pare 50 Balayages sur 50, à tous les niveaux.
5. **Le CPU ne punit pas.** Le Difficile punit même moins que le Facile.
6. **Les combattants, sombres, se fondent dans le décor sombre.** Le contraste médian est de 1,14:1.
7. **Au téléphone, les boutons recouvrent un quart de l'aire de jeu**, alors que 204 px de bandes noires restent vides. Hors combat, il n'y a aucun bouton Retour.
8. **L'entraînement n'apprend pas à punir.**
   - Il n'affiche ni l'avantage (+/−) ni l'historique des entrées.
   - Les boîtes ne s'affichent qu'en mode debug.

Le plan découpe le travail en **16 lots** d'une demi-journée à une journée. La **première tranche** compte 6 lots, environ 4 jours. Elle ne touche ni au cœur ni aux replays dorés. À la fin, le propriétaire peut constater :
- des coups qui pèsent leur vrai poids, à l'image comme au son ;
- un KO qui reste lisible ;
- un tactile qui laisse voir le jeu ;
- un CPU qui se lit et qui punit.

Sommaire :
- §0 Méthode et limites
- §1 Lacunes constatées
- §2 État de l'art, avec ses sources vérifiées
- §3 Propositions chiffrées
- §4 Backlog en lots
- §5 Coupes
- §6 Décisions à prendre
- §7 Idées pour les chantiers en cours
- §8 Incohérences de documentation
- Annexe A : mesures du son

---

## 0. Méthode et limites

**Ce qui a été fait :**

- **Jeu joué.** Le build de production a été joué dans Chromium headless (Playwright) :
  - en PC 1280×720 ;
  - en téléphone paysage 844×390 et 667×375, tactile émulé ;
  - parcours complet : titre, menus, sélection, match contre le CPU, entraînement, pause et résultats.
- **Captures.** Il y a eu 275 captures, dont des rafales d'une image par tic. Pour les obtenir, `requestAnimationFrame` était piloté à la main, avec `performance.now` gelé et avancé de 16,67 ms par pas.
- **Code lu.** Tout `src/render`, `src/audio`, `src/ai`, `src/app`, `src/ui`, `src/input`, et `src/core` sur le gel, les contacts et les données des coups.
- **Mesures faites hors du dépôt :**
  - frame data tirées des vraies données (`src/data/fighters`) ;
  - simulations de l'IA sur le cœur, de 50 à 100 graines par cas ;
  - contrastes WCAG sur les captures ;
  - rendu hors ligne de chaque son de `sfx.ts` dans un `OfflineAudioContext` (Chromium).
- **Prototypes sonores (annexe A).** Les recettes proposées au §3.3 ont été rendues et mesurées. **Les recettes tirées telles quelles de la recherche ont échoué** : le coup lourd était trop grave pour un haut-parleur de téléphone, et la finale écrêtait à +4,8 dBFS. Les valeurs données ici sont celles qui passent la mesure.
- **Organisation du travail :**
  - 4 auditeurs : le jeu joué ; le ressenti des coups et la caméra ; le son ; l'IA, l'interface et le tactile ;
  - 3 chercheurs ;
  - 3 vérificateurs adverses, qui ont rouvert chaque source pour tenter de la réfuter ;
  - la synthèse est la mienne. J'ai revérifié dans le code et sur les captures les constats classés « haute ». J'ai aussi rouvert moi-même deux sources sur le temps de réaction (Wagar, Infil), confirmées mot pour mot.

**Limites, à dire avant tout :**

- **Aucun appareil réel.** Ni iPhone, ni Android, ni manette. Le rendu WebGL était logiciel (SwiftShader) : les 52 images par seconde mesurées ne disent rien d'un vrai téléphone.
- **Aucun son écouté.** Les jugements sur le son sont des chiffres (pic, sonie courte, centroïde, niveau après un passe-haut à 400 Hz qui imite un haut-parleur de téléphone). Toute recette doit passer une écoute, sur casque puis sur téléphone.
- **Joueurs simulés.** Le bot clavier était rudimentaire : ni super, ni Boost, ni prise réussie n'ont été vus en jeu. Le mode 2 joueurs n'a pas été joué.
- **Chiffrages.** Les coûts sont des estimations en heures de travail d'agent, relecture comprise. Ils ne valent pas engagement.
- **Captures.** Les captures citées sont dans [`captures/`](captures/), et chaque lacune renvoie à la sienne.

---

## 1. Lacunes constatées

Échelle de gravité :
- **haute** : touche directement le fun (lire, punir, rythme, temps fort) ou rend le jeu illisible ;
- **moyenne** : se remarque à chaque match ;
- **basse** : finition.

### 1.1 Lisibilité du combat

| # | Lacune | Preuve | Gravité |
|---|---|---|---|
| L1 | Les combattants, aux tenues quasi noires, se fondent dans le ciel bleu nuit. Seuls le visage, les cheveux et les liserés se détachent, ce qui gêne la lecture des poses (garde, appui, récupération). Éclaircir le fond ne suffit pas : les tenues ont deux tons (`#19191e` et `#36363f`). Un fond `#4a4870` donne 2,04:1 sur le ton sombre, mais 1,40:1 sur le clair. | Contraste WCAG médian de la silhouette sur le ciel `#1b1b2f` : 1,14:1 pour Nayo, 1,15:1 pour Riff. Part des pixels sous 1,5:1 : 91 % pour Nayo, 80 % pour Riff. Capture [02](captures/02-silhouettes-sur-fond-sombre.png). Couleurs : `src/render/greybox-stage.ts:10-15`. | haute |
| L2 | Au KO, quatre textes se superposent : « K.O. », « CONTRE ! », « BOUM ! » et « X8 ». Le temps fort se lit comme du bruit. En entraînement, la légende du coup touche l'onomatopée. | Capture [03](captures/03-textes-empiles-au-ko.png), au tic 1147 (prise avec `?debug`, d'où les boîtes). | moyenne |
| L3 | La gerbe du Vinyle couvre la tête et le torse de la victime pendant 9 tics (f23 à f31). Sa réaction ne se lit qu'à partir de f33 : le tremblement prévu par D29 serait caché. | Planche d'une image par tic : capture [04](captures/04-gerbe-du-vinyle-tic-par-tic.png). | moyenne |

### 1.2 Ressenti des coups

| # | Lacune | Preuve | Gravité |
|---|---|---|---|
| L4 | **Le rendu classe un coup « lourd » si ses dégâts atteignent 60.** Ce seuil décide de la gerbe, du mot, de la secousse, du sang, du son et de la vibration. Or le gel, la mise au sol et la place dans la phrase ne suivent pas les dégâts. Exemples : la Mise au tapis de Nayo (50 dégâts, gel 14, met au sol), et chez Riff le Coup de boule, la Hache, le Retourné sauté (50, gel 10) et la fin de corde (45, gel 10, met au sol) sont « légers ». À l'inverse, le Vinyle (gel 8) est « lourd ». Les temps forts de la phrase sonnent donc comme un jab. | `src/render/fight-events.ts:133` (`HEAVY_HIT_DAMAGE = 60`) ; `src/render/fight-feedback.ts:288-313`. | haute |
| L5 | **La secousse part de 0 px sur l'image du contact et culmine 4 images plus tard.** Les légers ne secouent jamais. Valeurs mesurées sur la vraie classe, coup lourd, x par image : `0, −1, −2, −3, −2, 0, 1, 2, 1, 0…` | `src/render/shake.ts:57-88` (la cible part de la position courante, puis est lissée sur 4 images) ; `fight-feedback.ts:309` (`kick` sur les lourds seulement). | moyenne |
| L6 | **La garde n'a pas de poids.** Un Coup bas gardé et un Uppercut gardé donnent la même étincelle et le même son de 50 ms, sans secousse ni vibration. L'étincelle de Riff compte 8 pièces, celle de Nayo 18. Si le budget refuse l'étincelle, il ne reste que le son. | `fight-events.ts:229-230` ; `fight-feedback.ts:190-195`, `:374-378` ; `hit-fx.ts:858-950`, `:1003-1032`. | moyenne |
| L7 | **Le whoosh part au tic 0 du démarrage**, pas sur les images actives. L'Overhand démarre en 19 tics (317 ms) : son whoosh de 90 ms est fini bien avant le coup. **Un coup raté n'a aucun retour.** La récupération punissable ne se voit ni ne s'entend, alors que « lire et punir » est le premier pilier. | `fight-events.ts:173-189` (`attack` à `actionFrame === 0`) ; `sfx.ts:73-74`. | moyenne |
| L8 | Les gerbes ne partent qu'à gauche ou à droite : un uppercut, un marteau et un direct donnent la même gerbe orientée. | `hit-fx.ts:470` (`direction = away > 0 ? 0 : Math.PI`) ; `:991` (angle constant chez Riff) ; `:1110-1130` (éclats tirés au hasard sur 2π). | basse |
| L9 | Aucune poussière quand la victime glisse sous le recul d'un coup lourd ou d'une garde (de 3 à 4 px par tic). | `fight-feedback.ts:193`, `:220`, `:228` (la poussière ne sort que pour les coups bas, les chutes et les dashs). | basse |
| L10 | Haptique : la manette ne vibre qu'au KO de l'Ultime, et toutes les manettes vibrent pareil. L'attaquant ne sent jamais rien, et la garde ne vibre pas. | `fight-feedback.ts:179-183`, `:321` ; `fight-events.ts:296-311` ; `src/input/haptics.ts:13-24`. | basse |
| L11 | Les gerbes et la poussière tirent leur hasard avec `Math.random`. Une capture avant/après n'est donc jamais reproductible, alors que la secousse a une graine. | `hit-fx.ts:290`. | basse (outillage) |

### 1.3 Caméra

| # | Lacune | Preuve | Gravité |
|---|---|---|---|
| L12 | **La caméra ne réagit à aucun coup.** Le cadrage ne dépend que de l'écart entre les combattants et de la hauteur des pieds. Deux zooms promis ne sont pas faits : un « petit zoom de caméra » sur le CONTRE (`docs/combat-v2.md` §7.4, l. 623) et un zoom de 4 % sur le Rebond, le pli et la 3e frappe de la super (`docs/combos-v3.md`, lot P, l. 912). | `src/render/camera-framing.ts:189-202` : aucune lecture de contact ni de gel. Capture [07](captures/07-camera-immobile-sur-punition.png) : cadre identique avant, pendant et après une PUNITION. | haute |
| L13 | En gros plan, le centre suit le milieu des combattants à chaque image, sans fenêtre. Chaque pas en footsies fait donc glisser le décor. *À confirmer en jouant.* | `camera-framing.ts` ; comparaison avec la fenêtre horizontale de Street Fighter décrite par Keren (§2.1). | basse |

### 1.4 Rythme d'un match et d'un round

| # | Lacune | Preuve | Gravité |
|---|---|---|---|
| L14 | **Le jeu est silencieux entre deux coups.** Il n'y a ni musique, ni tempo, ni ambiance. La musique et le Crossfader sont prévus en phase 5 (`docs/combat-v2.md` l. 1392-1397), mais `src/audio` ne contient que `sfx.ts`, et ni `mix.ts` ni `beatTicks` n'existent. | `ls src/audio` ; `grep -rn beatTicks src` ne trouve rien. | haute (ressentie) ; c'est une fonctionnalité, voir §6 Q4 |
| L15 | **Le KO ne domine pas le mix.** En sonie sur 50 ms, il ne dépasse le coup lourd que de 1,6 dB (−21,9 contre −23,5 dB), et son pic est plus bas (−11,6 contre −10,2 dBFS). Sur un haut-parleur de téléphone, il gagne 3 dB. La fin « sur un temps fort » n'est pas portée par le son. | Annexe A, mesure hors ligne de `sfx.ts:58-72`. | moyenne |
| L16 | Entre la validation de la difficulté et « ROUND 1 », l'écran reste noir 1,1 s, sans fondu. Sur un appareil lent, cela ressemble à un plantage. | Capture `pc-13-intro` (noir 200 ms après la validation) et horodatage du tic 36 de l'intro. | basse |

### 1.5 IA du CPU

| # | Lacune | Preuve | Gravité |
|---|---|---|---|
| L17 | **Le CPU lit en direct le haut et le bas pendant sa garde.** En blockstun, la garde se calcule sur l'adversaire du tic courant, pas sur la vue retardée `seen`. Au tic 0 d'un coup bas, même le Facile (24 tics de réaction) est déjà accroupi. Le 50/50 prévu (`plans.ts:93-94`) ne marche donc jamais. Cela contredit aussi la règle « il ne lit que l'état visible, avec son délai ». | `src/ai/cpu.ts:96-101` (`guardInput(me, liveOpponent, upcomingMove(liveOpponent…))`). Simulation sur 50 graines, Balayage à 36 px sur un CPU en blockstun de 14 tics : **50 gardes sur 50, en Facile, Normal et Difficile**. Le même Balayage sur un CPU au repos, en Facile : 19 touches, 4 gardes. | haute |
| L18 | **Le CPU ne punit pas.** Aucune règle ne regarde la récupération adverse : `whiffPunish` (§13.1) n'existe pas. Le joueur n'apprend jamais que l'Uppercut à −23 est dangereux. | `cpu.ts:168-243`. Sur 100 graines, part des coups punis en Facile / Normal / Difficile : **Uppercut gardé (−23) 61 / 50 / 39 %**, Balayage gardé (−8) 35 / 28 / 21 %, Uppercut raté (28 tics de récupération) 3 / 2 / 1 %. | haute |
| L19 | Le délai de réaction est fixe : 24, 14 et 8 tics. À 8 tics, le Difficile réagit sous le plancher humain (12 à 19 tics, §2.2). Il n'a ni variance, ni mémoire des habitudes du joueur. Le test « Difficile bat Facile » ne demande que 4 victoires sur 6 (la spécification §13.4 en voulait 65 %). | `src/ai/profiles.ts:29, 43, 57` ; `tests/ai/cpu.test.ts:117-125`. | moyenne |

### 1.6 Entraînement, aide et prise en main

| # | Lacune | Preuve | Gravité |
|---|---|---|---|
| L20 | **L'entraînement n'apprend pas à punir.** Il manque l'avantage +/− après un échange, l'historique des entrées et la remise en position (centre, coins). Les boîtes ne s'affichent qu'avec `?debug`. Le mannequin ne se règle pas depuis la pause : il faut quitter et repasser par toute la sélection. Le jalon M4 (`docs/PLAN.md` l. 258) et la phase 3 (`render/advantage-meter.ts`, option « Afficher les boîtes », combat-v2 l. 1380) le prévoyaient. | `src/render/hud-text.ts:36-38` (`comboText` seul) ; `src/render/fight-scene.ts:226-229` ; `src/app/app.ts:452-495` (pause sans branche d'entraînement). | haute |

### 1.7 Menus et interface

| # | Lacune | Preuve | Gravité |
|---|---|---|---|
| L21 | **Au tactile, aucun Retour hors combat.** La sélection, la Difficulté et le Mannequin n'ont pas de bouton Retour. L'aide affiche « Flèches choisir · Entrée / A valider · Echap / B retour », des touches qui n'existent pas sur un téléphone. `popstate` n'est pas géré : le geste retour d'Android quitte la page. Le menu principal déborde de 6 px (396 px pour 390). | Capture [05](captures/05-selection-tactile-sans-retour.png) ; `src/ui/fighter-select.ts:121` et `src/ui/menu.ts:108` (aide écrite en dur) ; `menu.ts:161-165`. | haute |
| L22 | **Sur grand écran, les menus DOM ne grandissent pas.** En 1280×720, les sous-lignes, l'aide, l'avis épileptique et les commandes font 8 px CSS, à côté d'un combat plein écran. L'aide, en `#778` à 75 % sur `#11111f`, reste sous 4,5:1. | `getComputedStyle` en 1280×720 ; `src/styles.css:266-275`, `:414-421`. | moyenne |
| L23 | La page Commandes répète trois fois « Commandes » et met tout le joueur 2 sur une ligne de 8 px. L'aide « ↑↓ choisir » y est fausse : les onglets sont horizontaux. | Capture `pc-04-commandes` ; `src/app/controls-content.ts`. | basse |

### 1.8 Accessibilité

| # | Lacune | Preuve | Gravité |
|---|---|---|---|
| L24 | Aucun remappage des touches ni des boutons, aucune taille de texte. Le son n'a qu'une option, oui ou non. | `src/input/keyboard.ts:11-40` (constantes) ; `src/app/comfort.ts:12-37` ; `app.ts:228-250`. | moyenne |
| L25 | La lutte en prise se joue en martelant les boutons (un appui = 3 tics gagnés). | `docs/combat-v2.md` §4 ; règle « Avoid repeated inputs » (§2.2). | basse |

*Point fort : cyan contre magenta reste distinct dans les trois daltonismes simulés (ΔE 46 en protanopie, 18 en deutéranopie, 127 en tritanopie), avec un écart de luminance qui porte la paire.*

### 1.9 Son

| # | Lacune | Preuve | Gravité |
|---|---|---|---|
| L26 | **Aucune variation.** Une corde de 5 coups joue 5 fois le même `lightHit`, à l'effet de mitraillette. Le bruit est toujours lu depuis l'échantillon 0 du même tampon. Nayo et Riff partagent tous les sons. | `src/audio/sfx.ts:180-189` (`play(name)` sans paramètre) ; `:225` (`source.start(start)` sans décalage). | haute |
| L27 | **Les notes pentatoniques ne sont pas codées**, alors que la spécification les demande trois fois. Le CONTRE n'a pas de son propre, et rien n'est en stéréo. Le pilier « les combos se jouent comme des phrases » reste muet. | `docs/combat-v2.md:684`, `:1379` ; `docs/combos-v3.md:364`, `:912`. `grep -ri pentaton src` ne trouve rien ; aucun `StereoPannerNode`. | haute |
| L28 | **Rien ne protège le bus maître** : `master.connect(destination)`. Deux lourds dans le même tic font +6 dB, et la finale (2 lourds et un KO) monte à −1,7 dBFS. Avec une musique, cela écrêtera. | `sfx.ts:162-164` ; annexe A. | moyenne |
| L29 | **Les sons graves se perdent sur un téléphone.** Après le passe-haut qui imite un haut-parleur, le coup lourd perd 2,5 dB et ne dépasse plus le léger que de 5 dB. Le super (centroïde 169 Hz) et la chute (219 Hz) deviennent un souffle. | Annexe A. | moyenne |
| L30 | **iOS et manette.** `unlock()` n'est appelé que par les menus, et la manette ne compte pas comme un geste. `navigator.audioSession` n'est pas réglé, donc l'interrupteur silencieux de l'iPhone coupe probablement tout (*à vérifier sur un appareil*). Le contournement du bug WebKit 283419 (contexte « running » mais muet) manque. | `src/app/app.ts:115`, `:552` ; `src/ui/title-screen.ts:57-59` ; §2.3. | moyenne |
| L31 | Les sons de déplacement sont quasi inaudibles : l'atterrissage est 23 dB sous un coup léger, le dash 20 dB sous. La polyphonie n'est pas bornée, et aucun test ne couvre le module audio. | Annexe A ; `ls tests` ne montre pas de `tests/audio`. | basse |

### 1.10 Décor et lisibilité du sol

| # | Lacune | Preuve | Gravité |
|---|---|---|---|
| L32 | **Les repères au sol sont quasi invisibles et ne mesurent rien.** Ce sont des points de 2×2 px tous les 32 px, à 1,43:1 sur le sol. Ils ne correspondent à aucune portée de jeu : le Direct porte à 46-53 px, le corps à corps s'arrête à 60 px. La limite ciel/sol est à 1,56:1. | `greybox-stage.ts:7-8`, `:30-33` ; mesure sur la capture d'entraînement. | moyenne |
| L33 | **Les coins sont invisibles.** Le mur, c'est le bord de la caméra. Acculé, le combattant est coupé au bord sans aucun indice, alors que le CPU projette exprès vers le coin. | Capture [06](captures/06-coin-invisible.png) ; `greybox-stage.ts:24-38`. | basse |
| L34 | Un liseré de 1 px entoure l'écran en production. Il est voulu, pour repérer les artefacts de mise à l'échelle (commentaire de `greybox-stage.ts:21-22`) : c'est une clôture de Chesterton. | `greybox-stage.ts:35-37`. | basse |

### 1.11 Tactile

| # | Lacune | Preuve | Gravité |
|---|---|---|---|
| L35 | **Les boutons recouvrent l'aire de jeu, alors que 204 px de bandes noires restent vides.** En 844×390, le canvas est centré (640×360 CSS, de x = 102 à 742) et la grappe est ancrée au bord droit. Elle couvre 25 % de la largeur du jeu et 55 % de sa hauteur. Un combattant acculé à droite disparaît sous les pouces. Seul SAUT est dans la bande noire. | Capture [01](captures/01-tactile-boutons-sur-le-jeu.png) ; mesures DOM : L 610-678, H 684-752, S 649-713, DASH 579-635, BOOST 690-746 (y 172 à 372). | haute |
| L36 | Le bouton Pause mesure 32×24 px CSS, sous les 44 px d'Apple et les 48 dp d'Android. En 667×375, il chevauche la fin de la barre de vie de P2. | Mesure DOM ; `src/styles.css`, règle `.pause-button`. | basse |
| L37 | Le stick, flottant, est invisible au repos, et rien n'est réglable : ni la taille, ni l'opacité. | `src/styles.css:51-64` ; `src/input/touch-layout.ts:34-107`. | basse |

**Écarts à la spécification relevés au passage** (prévus, mais pas faits) :
- phase 3 : avantage d'entraînement, option des boîtes, démo du CPU, notes pentatoniques, punition par le CPU ;
- lot P de combos-v3 : tampons REBOND, VRILLE et MAX, smear de 2 images, zoom de 4 % ;
- §13 : `whiffPunish`, `overhead` conditionné et styles de l'IA.

Ce plan reprend les plus rentables de ces écarts. Les autres sont rangés dans les coupes.

---

## 2. État de l'art utile, avec ses sources vérifiées

**Règle suivie.** Une source n'est citée que si un chercheur l'a ouverte, puis si un vérificateur adverse l'a rouverte pour tenter de la réfuter. Aucune n'a été réfutée. Huit ont été **corrigées** (titre, auteur ou date), et ce sont les valeurs corrigées qui figurent ici. Quand une source n'apporte qu'une description et pas le contenu, c'est écrit.

### 2.1 Le « juice », les effets en pixel art et la caméra

| Source | Ce qu'elle dit (citation exacte ou paraphrase signalée) | Ce qu'on en tire |
|---|---|---|
| Tom Armitage, « Making Game "Feel" », infovore.org, 22/10/2013. Il cite Jan Willem Nijman (Vlambeer), interrogé par Graham Smith pour Rock Paper Shotgun. https://infovore.org/tag/feel/ | « We then kick the camera back 6 pixels from where you are aiming, and "add 4 to the screenshake". » ; « The game also freezes for about 10-20 milliseconds whenever you hit something. » ; « The get hit animation always starts with a frame white, then two frames of the character looking hit with big eyes. » ; le projectile est rond à sa première image pour simuler un éclair de bouche. Le jeu tourne à 30 i/s en 320×240. | Conversion vers NayosBeat (60 tics, 480 px de large) : durées ×2, pixels ×1,5. Le recul de caméra de 6 px donne 9 px, la frame blanche 2 tics, la pose « touché » 4 tics. Le gel de 10 à 20 ms est celui d'un shooter ; un jeu de combat garde ses 7 à 16 tics. |
| Martin Jonasson et Petri Purho, dépôt `juicy-breakout` (README.rst, LICENSE, `Settings.as`, `Shaker.as`), 2012. https://github.com/grapefrukt/juicy-breakout | « An example that we made for a talk at Nordic Game Indie Night » ; chaque effet principal est un interrupteur à `false` par défaut ; le Shaker est un ressort amorti (`_drag = .1`, `_elasticity = .1`). Le README ne nomme pas le talk ; le titre « Juice it or lose it » vient d'ailleurs. | La méthode du talk : chaque couche de « jus » se coupe à part, pour juger en jouant. Le ressort a une période d'environ 20 images, soit 3 Hz : parfait pour faire reculer un élément de HUD sans aléa. |
| Game Developer Staff, « Video: Sprucing up cameras with math », 03/01/2018. https://www.gamedeveloper.com/programming/video-sprucing-up-cameras-with-math | « In this GDC 2016 session, SMU Guildhall's Squirrel Eiserloh discusses the math behind camera behaviors… » | Cette page confirme seulement l'existence du talk d'Eiserloh (GDC 2016) et son sujet. **Ni les diapositives ni la vidéo n'ont été lues.** |
| Projet Bevy, exemple « Screen Shake ». https://bevy.org/examples/camera/2d-screen-shake/ | « It follows the GDC talk "Math for Game Programmers: Juicing Your Cameras With Math" by Squirrel Eiserloh » ; « Camera shakes don't feel punchy when they go up linearly, so we use an exponent of 2.0. » Constantes : `TRAUMA_DECAY_PER_SECOND = 0.5`, `MAX_TRANSLATION = 20.0`, `MAX_ANGLE = 10°`. | `shake.ts` suit déjà ce modèle (trauma²) et décroît 2,5 fois plus vite, un bon choix pour la lisibilité. **Aucune rotation** : en 480×270, elle casserait la grille des pixels. |
| KidsCanCode, « Screen Shake », Godot 4 Recipes (sans date). https://kidscancode.org/godot_recipes/4.x/2d/screen_shake/index.html | « A square (2) or cube (3) relationship is typically the best » ; un aléa tiré à chaque image donne « a rather erratic feel ». | Justifie la cible lissée toutes les 4 images (`SHAKE_STEP`) déjà en place. |
| Itay Keren, « Scroll Back: The Theory and Practice of Cameras in Side-Scrollers », Game Developer, 11/05/2015, adapté de son talk à l'IGS de la GDC 2015. https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers | Street Fighter : « a horizontal camera window which keeps the camera steady for the most part » ; Smash : « zooms out as much as needed » ; la secousse, une « disconnection between the camera and the controls », donne du drame. | `frameFight` fait déjà la moyenne et le zoom à la Smash. Il lui manque la **fenêtre** de Street Fighter (L13) et la **poussée** sur un coup fort (L12). |
| Pedro Medeiros (saint11), « Pixel Art Tutorials », page datée du 12/07/2020 ; planches « Impact », « Explosions part 1 », « Motion Blur » et « Animation Easing » (GIF lus image par image). https://saint11.art/blog/pixel-art-tutorials/ | Impact : « I like to pause one frame before the impact », « Use only for very exaggerated impacts », « Shake camera and target ». Explosions : « Flash Blast Fire Smoke », « 1 Contrast flash — This will make other frames feel brighter », « Fire fades quickly », « Smoke fades slowly ». Motion Blur : « Lighter colors "bleed" over darker colors », « Darker colors are used for fading ». | Une grammaire d'éclat en 4 couches. **Le contraste sombre rend le blanc plus éclatant sans ajouter de luminance**, ce qui épargne le budget de flashs. Les queues d'effets doivent descendre une rampe de teintes plutôt que fondre en alpha. |
| Andrey Sitnik et Ivan Solovev, easings.net, et son source `easingsFunctions.ts`. https://easings.net/ | `easeOutBack : 1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2)` avec `c1 = 1.70158` ; `easeOutExpo : 1 - pow(2, -10 * x)`. | Les courbes en tics du §3.0. |
| Robert Penner, *Robert Penner's Programming Macromedia Flash MX*, chapitre 7, 2002. http://robertpenner.com/easing/penner_chapter7_tweening.pdf | « Easing is acceleration, a change in speed. » ; sur la glissade exponentielle : « you can't directly find the tween's position for a given time », « it gets there when it gets there ». | Un effet doit se calculer en **forme fermée** sur l'âge entier en tics de l'événement : il est alors reproductible, sans état caché, et conforme à D23. La glissade (`lerp` récursif) est à réserver aux suiveurs continus, comme le zoom. |
| Masahiro Sakurai, « Thinking About Hitstop », chronique de Famitsu Vol. 490-491, traduite par Source Gaming Team, 11/11/2015. https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/ | « In general, the more damage an attack inflicts, the longer the hitstop period. » ; « Projectiles have comparatively less hitstop » ; « grounded characters in hitstop vibrate side to side and aerial characters in hitstop vibrate up and down » ; « we alter the intensity of the vibration depending on the distance of the camera » ; il plafonne le gel. | Trois règles vérifiables sur nos données (§3.1, P20), et l'amplitude des vibrations ajustée au zoom (§6 Q2). |
| Infil, *The Fighting Game Glossary*, entrées « Screen Freeze » et « Hitstop ». https://glossary.infil.net/ | Screen Freeze : « Usually the screen gets darker, the camera angle might change, and the character does some special pose. » | La mise au noir de la super est déjà faite. Le rapproché sur le lanceur reste à faire (§7, Finisher). |

**Introuvable ou non lu** :
- la vidéo « The Art of Screenshake » (Nijman, 2013) : aucune transcription ;
- le talk « Juice it or lose it » : aucune transcription ;
- les diapositives d'Eiserloh ;
- la colonne de Capcom sur le hitstop de SFV (HTTP 503) ;
- le support de Junya C. Motomura sur Guilty Gear Xrd (503) ;
- un article solide sur la conception des hit sparks : aucun trouvé.

Ces sources ne sont donc pas citées.

### 2.2 Conception des jeux de combat, IA et accessibilité

| Source | Ce qu'elle dit | Ce qu'on en tire |
|---|---|---|
| Wiki Dustloop, « GGST/Mechanics », section Attack Level, tableau « Hitstun and Blockstun Values », et section Counter Hit. https://www.dustloop.com/w/GGST/Mechanics | Hitstop de 11 à 15 du niveau 0 au niveau 4 ; hitstun debout de 12 à 21 ; garde au sol de 9 à 18. Contre moyen : gel de 21 et ralenti de 25F ; gros contre : gel de 31 et ralenti de 35F, « a unique, cinematic hitstop for easy confirms ». | L'étalon chiffré. Le gel de GGST tient dans un rapport de 1,36 (de 11 à 15) ; celui de NayosBeat va de 7 à 16 (×2,3) et monte à 22 sur le Boost. Notre CONTRE n'ajoute que 3 tics (D15) : le rendu doit donc faire le reste (P11, P12). |
| Wiki Dustloop, « GGST/Esoterica », section Hitstop. https://www.dustloop.com/w/GGST/Esoterica | « If a character gets hit while experiencing hitstop, then the previous hitstop immediately ends and the new attack's hitstop begins. » | NayosBeat prend le maximum des gels du tic (`step.ts`). Les deux règles se défendent ; la nôtre est juste à documenter. |
| SmashWiki, « Hitlag ». https://www.ssbwiki.com/Hitlag | « Hitlag has a cap of 20 frames in Melee, and 30 frames […] from Brawl onward. » Formule d'Ultimate : `⌊⌊⌊(d×0.65+6)×h×e×s⌋×p⌋×c⌋`. | Le seul plafond public chiffré. Notre pire cumul hors Finisher vaut 22 + 3 + 4 = 29 tics : un test peut le verrouiller (P20). |
| Celia Wagar, « Hitstop/Hitfreeze/Hitlag/Hitpause/Hitshit », Critpoints, 2017, mis à jour en 2025. https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/ | Dans SF2, le gel « froze the state of both characters for like 10 frames » et laisse le temps d'annuler ; « Hitsparks are also useful as additional feedback and establishing the point of contact ». | Les gerbes doivent montrer le **point de contact**, sans couvrir la victime (L3, P5). |
| Celia Wagar, « How to Read a Book: Reads in Competitive Games », Critpoints, 2017, mis à jour en 2025. https://critpoints.net/2017/06/26/how-to-read-a-book-reads-in-competitive-games/ *(rouverte et confirmée par moi)* | « Human reaction time is about 15 frames for something you're expecting… » ; « Players create a new plan of actions every 20-26 frames or so » ; « Humans tend to abhor doing the same thing more than 3 times in a row… » (affirmations de l'autrice, sans étude citée). | Les paramètres d'un CPU qu'on peut « lire » (P16). |
| Infil, « On Reaction Times », *The Complete KI Guide* (sans date). https://ki.infil.net/reaction.html *(rouverte et confirmée par moi)* | « 265 milliseconds converts to approximately 16 frames » ; « it is possible to react to moves that have 16 frames of startup or more quite consistently » ; l'overhead de Jago (19 images) est réactif mais « quite close to the reaction limit » ; « moves that have an obvious visual or aural windup tell are easier to react to ». | L'Overhand de Nayo démarre en 19 tics, comme celui de Jago, et les overheads de Riff en 16 et 17 : au seuil, ce qui colle à D8. Un CPU qui réagit en 8 tics les pare donc toujours. |
| Tommy Thompson, « The Killer Groove: The Shadow AI of Killer Instinct », Game Developer, 13/10/2017. https://www.gamedeveloper.com/programming/the-killer-groove-the-shadow-ai-of-killer-instinct | Choix par plus proches voisins sur plus de 40 métriques, relatives à l'adversaire ; « with a small probability may switch to a lower-ranked action » ; « if a shadow is repeatedly being punished for making a specific action […] it will shift priorities » ; joueurs humains « around 12–19 frames ». | Une IA crédible sans apprentissage lourd : un classement plus un peu d'aléa, et l'abandon de ce qui se fait punir (P16, version minimale). |
| ICE Lab, Université Ritsumeikan, « Fighting Game AI Competition — Rules ». https://ice.ci.ritsumei.ac.jp/~ftgaic/index-3.html | « the information sent to AIs will have a delay of 15 frames » | L'étalon académique pour le niveau Normal. |
| Kusano, Liu, Paliyawan, Thawonmas et Harada, « Motion Gaming AI using Time Series Forecasting and Dynamic Difficulty Adjustment », IEEE CoG 2019. https://www.ice.ci.ritsumei.ac.jp/~ruck/PAP/cog2019-kusano.pdf | Une difficulté adaptative qui « suppress[es] unnatural behaviors such as intentionally taking damage with no defense at all ». | **Coupé pour l'instant** (§5) : retenir seulement qu'un CPU qui lâche sa garde exprès sonne faux. |
| Tang, Zhu, Zhao et Lucas, « Enhanced Rolling Horizon Evolution Algorithm with Opponent Model Learning », arXiv, 2020. https://arxiv.org/abs/2003.13949 | « The model is learned during the live gameplay. » | **Coupé** (§5). La version solo-indé tient en quelques compteurs. |
| Marijn Rongen, « Street Fighter 6 takes the fight to blind accessibility », Can I Play That?, 05/05/2023. https://caniplaythat.com/?p=11891 | Sons de distance, de hauteur d'attaque, de cross-up et de jauges ; « I could not find any narration in the menus » (sur la démo PS5). | L'inventaire minimal d'une audiodescription. **Coupé pour l'instant** (§5), mais le bus du §3.3 le rendra possible. |
| Dakota « KozPlayer » Hills, « Street Fighter 6's innovative accessibility settings… », EventHubs, 15/10/2022. https://www.eventhubs.com/news/2022/oct/15/sf6-innovative-accessibility-options | « a constant sound that will change from a low to a high pitched tone […] in a real match it can be a bit too much » | Chaque son d'aide doit pouvoir s'activer à part, et se tester d'abord en entraînement. |
| Steven « Dreamking23 » Chavez, « Street Fighter 6's training mode will feature visual frame data bar… », EventHubs, 16/09/2022. https://www.eventhubs.com/news/2022/sep/16/sf6-training-visual-frame-data | Tweet officiel : « See the startup, total, and recovery frames for an individual move or an entire combo all at once. This also includes the opponent's recovery! » | Le frame meter est une pure projection de l'état (D17) et l'outil le plus direct pour apprendre à punir (P19). |
| sdshamshel, « Street Fighter 6 and the History of "Modern Controls" », Ogiue Maniax, 06/08/2023. https://ogiuemaniax.com/2023/08/06/street-fighter-6-and-the-history-of-modern-controls/ | « damage dealt is reduced by 1/5 » (simplification du blogueur, sans source primaire). | Rappelle seulement que `docs/PLAN.md` contredit D5 (§8). |
| Game Accessibility Guidelines, « Full list ». https://gameaccessibilityguidelines.com/full-list/ | « Allow controls to be remapped / reconfigured » ; « Ensure no essential information is conveyed by a fixed colour alone » ; « Include an option to adjust the game speed » ; « Avoid repeated inputs (button-mashing/quick time events) » ; « Ensure no essential information is conveyed by sounds alone ». | P24 (remappage), P25 (lutte tenue) ; la vitesse d'entraînement est coupée (§5). |
| Microsoft, « Xbox Accessibility Guideline 117: Visual distractions and motion settings », 2022. https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117 | « Avoid the use of camera shake, camera bobbing effects, motion blur […] or provide an option to turn off these behaviors. » | L'option « Tremblement » existe déjà. **Toute nouvelle poussée de caméra (P12) doit lui obéir.** |
| Christian Nutt et Michael Zenke, « In-Depth: How Valve Makes Art To Enhance Gameplay », Game Developer, 29/07/2008, d'après Moby Francke et Randy Lundeen (Valve). https://www.gamedeveloper.com/art/in-depth-how-valve-makes-art-to-enhance-gameplay | « We wanted very unique shapes » ; « we gradated the character from the dark bottoms to the contrasting upper torso for better readability » ; décor rouge chaud, décor bleu froid. | La hiérarchie de lisibilité à appliquer au décor et au contour (P8) : le contraste se concentre en haut du corps. |

**Introuvable** :
- les pages de SuperCombo (SF6), bloquées par Anubis : **les gels de SF6 par force et les bonus officiels du Punish Counter ne sont donc pas vérifiés**, et ne sont pas cités ;
- le wiki de Skullgirls (bloqué) ;
- les vidéos de Sakurai, qui ne sont connues que par le résumé de Nintendo Wire (Amelia Fruzzetti, « This Week In Sakurai (12/5-12/11): Fine Tuning, Hit Stop, and Cheating the System », 12/12/2022, lu et vérifié) ;
- une étude en laboratoire sur le temps de réaction dans les jeux de combat : aucune trouvée.

### 2.3 Le son des coups et Web Audio

| Source | Ce qu'elle dit | Ce qu'on en tire |
|---|---|---|
| Rodney Gates, « Rodney Gates Special: Creating Hand-to-Hand Combat Audio for "Robert Ludlum's The Bourne Conspiracy" », Designing Sound, 22/04/2011. https://designingsound.org/2011/04/22/rodney-gates-special-creating-hand-to-hand-combat-audio-for-robert-ludlums-the-bourne-conspiracy/ | Les premiers impacts, à « 10 or more tracks of elements », « became quite the voice hogs » ; la version finale garde « no more than 4, maybe 5 tracks of elements » par type d'impact, en « randomized variants ». | **Au plus 4 couches par impact**, et des variantes à chaque coup (P13, P14). |
| CRI Middleware, « AtomCraft's Randomization Features », 16/01/2017. https://blog.criware.com/index.php/2017/01/16/atomcrafts-randomization-features/ | « Unlike the real world, games offer a limited number of interactions, which results in repetitiveness. » (L'article randomise hauteur, volume, EQ et panoramique, sans donner de plages chiffrées.) | Les plages en cents de P14 sont **mes propres dérivations** : aucune source lue n'en donne. |
| Luc Engelen (Kabisa), « Browser beats I: synthesizing a kick drum », kabisa.nl, 25/05/2020, republié sur DEV le 01/02/2021. https://dev.to/kabisasoftware/browser-beats-i-synthesizing-a-kick-drum-1gej | « quickly lowering the frequency of the triangle wave from 220Hz to 55Hz over the course of 100 milliseconds » | Le modèle du corps d'un coup lourd. Pris tel quel, il est trop grave pour un téléphone (annexe A). |
| Cole Willsea, paquet npm `dj-snazzy-snare` 1.0.0, `index.js`, 2015. https://app.unpkg.com/dj-snazzy-snare/files/index.js | (paraphrase) Bruit passe-haut à 1 000 Hz, plus une triangle à 200 Hz saturée, puis un compresseur (seuil −15, knee 33, ratio 5, attaque 5 ms, relâche 150 ms). | Une claque, c'est du bruit pour le claquement et un ton saturé pour le corps (P13). |
| MDN, « AudioParam: exponentialRampToValueAtTime() » et « AudioParam: setTargetAtTime() ». https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime | « Exponential ramps are considered more useful when changing frequencies… » ; une rampe exponentielle vers 0 lève une erreur ; `setTargetAtTime` progresse de « 1 − e⁻¹ ≈ 63.2% » par constante de temps, « useful for decay or release ». | Une queue de D ms tombe à −60 dB avec τ = D / 6,9. `sfx.ts` vise déjà 0,0001 : pas de bug sur ce point. |
| MDN, « DynamicsCompressorNode » (interface et constructeur). https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode/DynamicsCompressorNode | « Compression can help prevent clipping and distortion when multiple sounds are combined » ; valeurs par défaut : seuil −24, knee 30, ratio 12, attaque 0,003, relâche 0,25. | **Mesure (annexe A) :** dans Chromium, ce nœud réglé en limiteur dur (−6/20) **remonte de 3,4 dB un coup léger isolé** (gain de compensation automatique) et **laisse passer la finale à +0,5 dBFS**. Ce n'est pas un limiteur. Le plan retient un **écrêteur doux** (`WaveShaper`), transparent sous −3 dBFS (P13). |
| W3C, *Web Audio API 1.1*, Editor's Draft. https://webaudio.github.io/web-audio-api/ | État « interrupted » : « This context is currently interrupted and cannot process audio until the interruption ends. » ; le démarrage peut exiger une « sticky activation ». | `unlock()` doit être réessayé à chaque geste, y compris en combat (P15). |
| MDN, « Web Audio API best practices ». https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices | « Create or resume context from inside a user gesture » | Idem. |
| MDN, « Advanced techniques: Creating and sequencing audio ». https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques | « Noise is just random numbers when it comes to audio data » | Démarrer le bruit à un **décalage aléatoire** du tampon partagé ne coûte rien (P14). |
| WebKit Bugzilla, bug 283419, « iOS AudioContext does not change state from running when an external system app starts to play sounds », 2024 ; commentaire 3 du 05/03/2025. https://bugs.webkit.org/show_bug.cgi?id=283419 | « For me, context.suspend() and then context.resume() will fix the problem. » (le témoignage d'un seul utilisateur ; bug toujours ouvert) | Parade : `suspend()` puis `resume()` au retour au premier plan, **à vérifier sur un iPhone** (P15). |
| Zachary Quarles, « Game Audio Theory: Ducking », Game Developer, 29/01/2009. https://www.gamedeveloper.com/audio/game-audio-theory-ducking | Dans Fracture, la voix off baisse le reste à −9 dB en 500 ms, puis le remonte en 1 000 ms ; « If it's used too frequently or aggressively, it will become distracting ». | Ducking réservé aux temps forts (KO, Ultime, Finisher), jamais à chaque coup. Les valeurs d'impact de P13 sont **mon extrapolation** : aucune source lue ne traite le ducking d'un impact. |
| Mick Gordon et Jean-Edouard Miclot, « Next-Gen Audio in Killer Instinct », GDC 2014, description de la session seulement. https://gdcvault.com/play/1020402/Next-Gen-Audio-in-Killer | « …mix choices, loudness standards, the dynamic soundtrack, designing around 60fps… » | Confirme seulement que le mix et la conception à 60 i/s sont des sujets à part entière. **Contenu de la conférence non lu.** |
| Zeos Greene, « Book Review: Designing Sound », Cycling '74, 03/10/2017 (compte rendu du livre d'Andy Farnell). https://cycling74.com/articles/book-review-designing-sound | « Thinking about sound as a process serves as the backbone of Designing Sound » | Source secondaire : le livre lui-même n'a pas pu être ouvert (403). |

**Introuvable** :
- Chris Lowis, « Synthesising Drum Sounds with the Web Audio API » (dev.opera, redirigé) ;
- le livre blanc de FMOD sur les voix virtuelles (rendu en JavaScript) ;
- le tutoriel Wwise sur le sidechain (403) ;
- toute interview de sound designer de SF6 ou de Skullgirls.

Les règles de polyphonie et de priorité de P13 sont donc **mes dérivations**.

---

## 3. Propositions chiffrées

Conventions :
- 1 tic = 16,67 ms ;
- les « px » sont des pixels du monde, dans une vue de 480×270 ;
- toutes les propositions sont du **rendu seul** et respectent D17 et D23, sauf mention contraire ;
- toute surface lumineuse nouvelle passe par `flash-budget.ts`, et `flash-areas.test.ts` et `flash-cadence.test.ts` sont relancés ;
- coût en heures, tests compris ;
- risque : ce qui peut mal tourner.

### 3.0 Outils communs

- **Courbes en forme fermée** (Penner, easings.net) : `valeur = a + (b − a) × f(âge / N)`, où l'âge est le nombre entier de tics depuis l'événement, arrondi au pixel.
  - Impact : `easeOutExpo` sur 6 tics, `[0 ; 0,69 ; 0,90 ; 0,97 ; 0,99 ; 1]`.
  - Retour : `easeOutCubic` sur 8 tics, `[0 ; 0,33 ; 0,58 ; 0,76 ; 0,88 ; 0,95 ; 0,98 ; 1]`.
  - Arrivée qui rebondit : `easeOutBack` sur 8 tics, avec un pic de 110 % au tic 5. Le rebond n'est visible qu'au-delà de 20 px de course.
- **Hasard à graine pour les effets** (L11) : `hash32(tic, joueur, numéro de l'effet)`, avec le mulberry32 déjà présent dans `shake.ts`, à la place de `Math.random` dans `hit-fx.ts` et `dust.ts`. Coût 1 h. Gain : des captures avant/après identiques, et des tests de surface stables.

### 3.1 Ressenti des coups

**P1. Le poids vient des données, pas des dégâts** (L4)

- **Recette.** Un seul prédicat dans `fight-events.ts`, partagé par `attack`, `hit` et `block` : `lourd = hitstop ≥ 10 ou knockdown ou (garde 'overhead' et fin de corde) ou CONTRE`.
- **Nouveau palier « fin »** (knockdown au sol) :
  - la gerbe du lourd, avec un trauma de 0,55 (pic de 2 px) ;
  - le son du lourd, plus la recette « chute » raccourcie à 90 ms.
- **Les 6 coups concernés** passent du léger au lourd : la Mise au tapis de Nayo ; le Coup de boule, la Hache, le Retourné sauté et la fin de corde de Riff. Le Vinyle, projectile au gel de 8, repasse en léger, conformément à la règle de Sakurai sur les projectiles.
- **Fichiers :** `src/render/fight-events.ts`, `fight-feedback.ts`, plus un test qui vérifie le prédicat sur la table des coups.
- **Coût :** 2 h. **Risque :** plus de coups lourds, donc plus de demandes au budget de flashs. Les versions étouffées prennent déjà le relais ; remesurer `flash-areas.test.ts`.

**P2. Secousse : premier élan dès l'image du contact, et à-coup des légers** (L5)

1. Dans `kick()`, partir de `fromX = −away × 0,6` au lieu de la position courante.
   - Lourd (trauma 0,65, amplitude 8 × 0,65² = 3,4 px) : l'image 1 vaut déjà 3,4 × (−0,6 − 0,4 × 0,156) = **−2 px**, et le pic de 3 px arrive à l'image 2 ou 3.
   - KO (trauma 0,85, amplitude 5,8 px) : **−4 px** à l'image 1.
2. **À-coup des légers**, hors trauma : 1 px dans le sens du coup pendant 2 images, puis retour, sans oscillation. En « réduit », la valeur arrondie donne 0 px ; en « aucun », rien.
3. Le plafond de 7,5 Hz et la graine restent les mêmes.

- **Fichiers :** `src/render/shake.ts`, `fight-feedback.ts`, et `tests/render/shake.test.ts`, qui doit vérifier que l'image 1 n'est pas nulle, et qu'il n'y a jamais plus d'un demi-tour par 4 images.
- **À faire dans le même changement :** l'axe et la division par le zoom demandés par `docs/finisher.md` §4.4 (voir §6 Q2), pour ne refondre `shake.ts` qu'une fois.
- **Coût :** 2 h. **Risque :** mettre à jour le tableau des pics de `docs/flashs.md` §1.3.

**P3. La garde a un poids** (L6)

- Passer `heavy` à l'événement `block`, avec le prédicat de P1.
- **Garde lourde :**
  - étincelle à l'échelle ×1,3 (de 20×44 à 26×60 px) ;
  - 10 stries au lieu de 6 ;
  - l'à-coup de 1 px de P2 ;
  - le son « garde lourde » de P13 ;
  - 8 ms de vibration pour celui qui garde.
- **Riff :** 4 stries courtes en plus de ses éclats, soit 12 pièces.
- **Étincelle refusée par le budget :** jouer 2 stries (moins de 60 px²) plutôt que rien.
- **Hors de portée de ce plan :** le gel de garde plus court (« blockstop »). Il toucherait au cœur et aux replays dorés (§5).
- **Fichiers :** `fight-events.ts`, `fight-feedback.ts`, `hit-fx.ts`.
- **Coût :** 2,5 h. **Risque :** faible.

**P4. Le whoosh sur les images actives, et le coup raté qui se voit** (L7)

1. Émettre `attack` au **premier tic actif** (`actionFrame === startup`). Pour les cordes, garder un frottement discret au tic 0 : la recette « whiff léger » de P13, à −6 dB.
2. **Nouvel événement `whiff`**, émis au premier tic de récupération d'un coup normal ou spécial qui n'a rien touché (`FLAG_MOVE_HIT` absent) et qui est lourd au sens de P1. Il se lit dans l'état, sans toucher au cœur.
   - **Image :** 2 arcs de « vaguelette », à la couleur d'énergie de l'attaquant et à alpha 0,4, au bout de la hitbox (`hitbox.x + width`). Ils vivent 6 tics : 2 à plein, puis descente de la rampe de teintes (§3.2, P7).
   - Aucun mot, aucune surface claire (moins de 150 px²).
   - **Son :** « whiff lourd » de P13.
- **Fichiers :** `fight-events.ts`, `fight-feedback.ts`, `hit-fx.ts`, `sfx.ts`.
- **Coût :** 3 h. **Risque :** les coups ratés du CPU deviennent audibles, à juger en jouant.

**P5. La gerbe montre le contact sans cacher la victime** (L3)

- Pour les spéciaux et les projectiles :
  - plafonner le cœur opaque de l'étoile à **24 px** de diamètre, contre environ 67 px aujourd'hui ;
  - le décaler de **10 px vers l'attaquant**, au point de contact ;
  - garder le halo à alpha 0,4, teinté de l'énergie de l'attaquant ;
  - durée : 3 tics pleins, puis 4 tics de rayons seuls, puis les étincelles.
- La victime est alors lisible dès le 4e tic du gel, au lieu du 10e.
- Le Finisher et l'Ultime gardent leur grosse gerbe : c'est leur rôle.
- **Fichiers :** `src/render/hit-fx.ts`, `hit-styles.ts`.
- **Coût :** 2,5 h. **Risque :** aucun flash ajouté : la surface baisse. C'est un prérequis du tremblement de la victime (D29).

**P6. Gerbes orientées** (L8)

- Un angle **de rendu**, tiré des données du coup (le cœur ne change pas) :
  - knockdown avec levée (vy > 0) : −55° ;
  - anti-air spécial : −70° ;
  - overhead et Rebond : +35° ;
  - coup bas : inchangé (il rase le sol).
- `star()` et `claw()` reçoivent cette direction, et le miroir est conservé. Chez Riff, 60 % des éclats partent dans un cône de ±0,9 rad.
- **Coût :** 2 h. **Risque :** aucun, les surfaces ne changent pas.

**P7. Une trace au sol, et des queues en rampe de teintes** (L9)

- **Poussière de glissade :**
  - pour un combattant au sol en hitstun ou blockstun avec |vx| ≥ 2 px/tic : 2 grains tous les 4 tics, derrière les talons ;
  - lue dans l'état, donc figée pendant le gel ;
  - couleur `#b9b2c8` à alpha 0,45 ;
  - pool de 12 à 20 grains.
- **Rampe de teintes** (saint11) pour les étincelles et la fumée, au lieu d'un fondu en alpha : `core → strike → energy → #33334a`. Les étincelles restent 2 tics par teinte, la fumée 6 à 8.
- **Coût :** 2 h. **Risque :** aucun ; la luminance additive baisse.

### 3.2 Lisibilité et décor

**P8. Les silhouettes se détachent** (L1). *Une décision de direction artistique, §6 Q1.*

- **Le calcul :** les tenues ont deux tons, `#19191e` (L ≈ 0,010) et `#36363f` (L ≈ 0,037). Aucun fond uni ne sépare les deux tons à 2:1 à la fois :

| Fond | Contraste avec `#19191e` | Contraste avec `#36363f` |
|---|---|---|
| `#1b1b2f` (actuel) | 1,04:1 | 1,41:1 |
| `#3c3c62` | 1,68:1 | 1,15:1 |
| `#4a4870` | 2,04:1 | 1,40:1 |
| `#5a5a88` | 2,71:1 | 1,85:1 |

- **Option A, un contour de 1 px** (recommandée pour l'essai) :
  - quatre copies du sprite décalées de ±1 px sur x et y, dessinées derrière lui ;
  - en silhouette pleine (`TintModes.FILL`, déjà utilisé par `anchored-sprite.ts:67-69` pour les rémanences) ;
  - couleur `#5a5a88`, à 2,63:1 sur le ciel actuel et à 2,71:1 sur le ton sombre des tenues, avec une teinte facultative de la couleur du joueur à 30 % ;
  - coût de rendu : 8 sprites de plus par image, négligeable ;
  - le contour se projette à l'échelle du monde : 1,45 px d'écran en gros plan, à vérifier en capture ;
  - **c'est une décision de direction artistique** : un contour clair change le style des planches.
- **Option B, un contre-jour** (sans toucher aux sprites) :
  - une bande de dégradé `#1b1b2f → #3a3550` sur les 100 px au-dessus du sol, plus une bande de contre-jour `#4a4870` derrière les torses (de y = sol − 90 à sol − 60) ;
  - c'est la règle de Valve, le contraste porté en haut du corps ;
  - elle remonte le ton sombre à 2,04:1, mais **baisse** le ton clair à 1,40:1. C'est un compromis.
- **Fichiers :** `src/render/sprite-fighter-view.ts` (option A) ou `greybox-stage.ts` (option B).
- **Coût :** 3 h pour A, 1,5 h pour B, plus des captures A/B mesurées avec le même script.
- **Risque :**
  - B change `GREYBOX_COLORS`, que `alphaForDelta` utilise pour régler les voiles : tous les tests de flashs sont à relancer ;
  - A n'y touche pas.

**P9. Un sol qui mesure, et des coins visibles** (L32, L33, L34)

- **Ligne d'horizon :** 1 px `#5a5a88` à `GROUND_Y`. La limite ciel/sol passe de 1,56:1 à environ 2,6:1.
- **Repères au sol :**
  - un trait de 1×4 px tous les 16 px ;
  - un trait de 2×6 px tous les 64 px ;
  - couleur `#6a6a9a`, à 2,13:1 sur le sol (contre 1,43:1 aujourd'hui) ;
  - 16 px, c'est environ un tiers de la portée du Direct, et 64 px, à peu près la limite du corps à corps : on lit les distances d'un coup d'œil.
- **Coins :**
  - aux x = 0 et 960 du monde, une colonne de 6 px `#4a4870`, avec une arête claire `#8888aa` ;
  - sur 24 px devant le mur, un assombrissement du sol de 0 à 25 % de noir ;
  - dessiné une fois, statique, sans flash.
- **Liseré de 1 px :** ne le dessiner que si `isDebugEnabled()`. Il garde son rôle, qui est de repérer les artefacts de mise à l'échelle.
- **Fichiers :** `greybox-stage.ts`.
- **Coût :** 2 h, captures avant/après comprises. **Risque :** quasi nul. La phase 6 remplacera ce décor, mais ces repères en donnent le cahier des charges.

**P10. Une seule voix à la fois pour les textes du temps fort** (L2)

- **Règle de priorité dans `caption-stack.ts` :** à l'annonce « K.O. » (ou de la future plaque FINISH), toutes les onomatopées et étiquettes déjà affichées s'effacent en 4 tics, en `easeOutCubic` vers alpha 0. Il ne reste que « K.O. » et le compteur de coups, déplacé **sous** « K.O. » (+18 px).
- **Entraînement :** la légende du coup prend une ligne fixe (y = 40 px, sous le HUD) que les onomatopées ne peuvent pas occuper.
- **Test :** aucun rectangle de texte n'en chevauche un autre au tic du KO.
- **Fichiers :** `src/render/caption-stack.ts`, `onomatopoeia.ts`, `move-caption.ts`, `hud-text.ts`.
- **Coût :** 3 h. **Risque :** faible.

**P11. CONTRE et PUNITION reconnaissables à leur forme** (règle « fixed colour alone » des GAG)

- Les deux étiquettes se distinguent déjà par leur texte. Pour les lire d'un coup d'œil :
  - **CONTRE :** un cadre penché de 8° ;
  - **PUNITION :** un cadre droit, souligné de 2 px ;
  - les deux apparaissent au tic 0 du gel, en `easeOutBack` sur 6 tics, et restent jusqu'à la fin du gel + 20 tics.
- Ils sont toujours comptés dans le budget de flashs.
- **Fichiers :** `src/render/stamps.ts`.
- **Coût :** 1,5 h.

### 3.3 Caméra

**P12. La caméra accompagne le coup, seulement pendant le gel** (L12, L13)

- **Poussée.** Elle ne se lit que si `state.hitstop > 0`, à partir du dernier contact :

| Contact | Zoom |
|---|---|
| Lourd ou CONTRE | ×1,04 |
| Prolongateur (Rebond, Vrille) ou dernière frappe d'une super | ×1,06 |
| KO | ×1,08 |
| Légers | rien |

  - au gros plan maximal, 1,45 devient 1,51 à 1,57 ;
  - le centre se déplace de 25 % vers `contact.x`, de 12 px au plus ;
  - la caméra monte en 2 images (EASE 0,5, soit 75 % atteints), puis relâche dès la fin du gel avec l'EASE normal de 0,1 ;
  - **rien si « Tremblement » vaut « aucun »** (XAG 117) ;
  - personne n'a la main pendant le gel, donc la règle de `docs/finisher.md:904` tient.
- **Fenêtre de footsies**, en gros plan seulement : le milieu cadré ne suit les combattants que s'ils sortent d'une zone morte de ±8 px autour du centre. La caméra repart alors en collant au bord de la fenêtre. Le décor reste immobile pendant les micro-déplacements (Keren). *À valider en jouant.*
- **Contraintes :**
  - D17 : lecture seule de l'état ;
  - D23 : les combattants ne sont pas interpolés, seule la caméra glisse, comme aujourd'hui.
- **Fichiers :** `src/render/camera-framing.ts`, `fight-scene.ts`, plus des tests purs de `frameFight`.
- **Coût :** 4 h.
- **Risque :** la surface affichée des flashs grossit de (1,57 / 1,45)² ≈ ×1,17 au maximum. `budget.setZoom` en tient déjà compte ; relancer `flash-cadence.test.ts`.

### 3.4 Son

Toutes ces recettes ont été **rendues et mesurées** (annexe A), sauf mention contraire. Les gains sont donnés en dB par rapport au bus.

**P13. Le bus, la sécurité et quatre recettes refaites** (L15, L28, L29)

- **Chaîne :**
  1. les voix vont dans les bus `combat` (0 dB), `prio` (KO, super, Finisher ; 0 dB), `ui` (−6 dB) et, plus tard, `musique` (−14 dB) ;
  2. puis dans le maître, à 0,5 comme aujourd'hui ;
  3. puis dans un **écrêteur doux** (`WaveShaper`) : linéaire jusqu'à |x| = 0,7 (−3 dBFS), puis `0,7 + 0,3 × tanh((|x| − 0,7) / 0,3)` ;
  4. puis dans `destination`.
- **Pourquoi pas un `DynamicsCompressorNode`.** Mesuré sous Chromium et réglé en limiteur (seuil −6, ratio 20), il :
  - remonte un coup léger isolé de 3,4 dB ;
  - laisse passer la finale à +0,5 dBFS.

  L'écrêteur doux, lui, laisse un coup léger **identique au dB près** et tient la finale à **−0,6 dBFS**.
- **Piège de mesure.** Un son qui démarre à t = 0 dans un `OfflineAudioContext` subit le transitoire de démarrage du compresseur. Il faut mesurer à t ≥ 300 ms.
- **Polyphonie :**
  - 12 voix de combat au plus, plus 4 voix d'UI comptées à part ;
  - priorités : 0 = KO, super, Finisher (jamais volés) ; 1 = lourd, prise, chute ; 2 = léger, garde ; 3 = whiff, dash, saut, atterrissage ;
  - quand toutes les voix sont prises, on vole la plus ancienne de la priorité la plus basse : `gain.setTargetAtTime(0, now, 0,002)`, puis `stop` à +10 ms, sans clic ;
  - **anti-empilement :** le même son, venu du même joueur, est ignoré s'il arrive moins de 2 tics après le précédent. Un échange de coups ne double plus le niveau (+6 dB aujourd'hui).
- **Recettes mesurées :**

| Son | Couches | Mesure |
|---|---|---|
| **Coup léger** (≈ 80 ms) | (1) bruit passe-haut 2 500 Hz, 12 ms, −7 dB ; (2) triangle 520 → 180 Hz en 40 ms, puis `WaveShaper` tanh (pente 4), τ = 12 ms, arrêt à 80 ms, −13 dB ; (3) bruit passe-bande 1 500 Hz, Q 1,2, 45 ms, −9 dB | Sonie courte −28,6 dB, comme aujourd'hui ; **sur téléphone, −26,6 contre −31,0 (+4,4 dB)** |
| **Coup lourd** (≈ 200 ms) | (1) bruit passe-haut 2 000 Hz, 15 ms, −2 dB ; (2) sinus 180 → 50 Hz en 90 ms, puis tanh (pente 6), τ = 35 ms, arrêt à 260 ms, −8 dB ; (3) bruit passe-bande 700 Hz, Q 0,8, 130 ms, 0 dB ; (4) carré 400 → 110 Hz en 100 ms, puis passe-bas 2 500 Hz, 130 ms, −12 dB | −18,0 dB (contre −23,5), **téléphone −21,4 (contre −26,0)**, pic −4,1 dBFS |
| **Garde** (≈ 125 ms, aucun grave) | (1) bruit passe-bande 3 500 Hz, Q 4, 25 ms, −2 dB ; (2) carré 1 150 → 950 Hz en 40 ms, puis passe-bas 6 000 Hz, 60 ms, −16 dB ; (3) triangle 1 720 Hz fixe (rapport non harmonique, d'où le côté métallique), τ = 20 ms, arrêt à 140 ms, −14 dB | −29,2 dB (contre −33,4), téléphone −28,5, centroïde 1 741 Hz : elle reste la plus aiguë |
| **KO** (≈ 800 ms, bus `prio`) | (1) bruit passe-haut 1 500 Hz, 25 ms, −2 dB ; (2) sinus 160 → 35 Hz en 400 ms, puis tanh (pente 5), τ = 110 ms, arrêt à 800 ms, −8 dB ; (3) bruit passe-bas qui balaie de 2 500 à 300 Hz en 600 ms, −4 dB ; (4) dent de scie 330 → 70 Hz en 600 ms, puis passe-bas 1 600 Hz, 650 ms, −14 dB | **−15,4 dB, soit 2,6 dB au-dessus du nouveau lourd** (contre 1,6 aujourd'hui), téléphone −19,3, pic −5,0 dBFS |

- **Hiérarchie obtenue** (sonie courte sur téléphone) : léger −26,6 < lourd −21,4 < KO −19,3. Chaque palier s'entend ; le lourd devance le léger de 5,2 dB.
- **Défaut connu.** Le nouveau léger est plus sombre (centroïde 415 Hz contre 951). Il faut l'écouter. Si le « pat » manque, monter la couche (3) à 2 200 Hz.
- **Ducking du KO**, non prototypé, extrapolé de Quarles : les bus `combat` et `musique` passent à −6 dB en environ 15 ms (`setTargetAtTime(0,5, t, 0,005)`), tiennent 300 ms, puis reviennent en environ 750 ms (τ = 0,25 s). C'est réservé au KO, à l'Ultime et au Finisher.
- **Recettes non prototypées, à mesurer pendant le lot :**
  - **whiff léger :** bruit passe-bande à Q 1,5, dont la fréquence balaie de 700 à 2 200 Hz en 80 ms ; le gain monte de 0 à −12 dB en 25 ms, puis tombe à 0,0001 en 90 ms ;
  - **whiff lourd :** passe-bande à Q 1,2, balayage de 400 à 1 400 Hz en 140 ms, montée en 40 ms, fin à 160 ms ;
  - **chute :** sinus 110 → 38 Hz en 120 ms (τ = 35 ms), plus un bruit passe-bas 450 Hz de 200 ms à −6 dB, plus un rebond à +117 ms (7 tics) : sinus 90 → 40 Hz de 80 ms à −9 dB ;
  - **chute, couche à ajouter :** un transitoire passe-haut à 3 kHz de 12 ms, pour l'entendre sur un téléphone.
- **Fichiers :** `src/audio/sfx.ts`, plus `tests/audio/sfx.test.ts` (nouveau) :
  - il valide les données des recettes (gains et durées positifs, fréquences ≥ 1) ;
  - il vérifie, avec un faux `AudioContext`, le plafond de voix et l'anti-empilement.
- **Coût :** 5 h.
- **Risque :** goût personnel. Il faut une écoute du propriétaire, sur casque et sur téléphone, avant la fusion.

**P14. Chaque coup sonne un peu différemment, et la phrase chante** (L26, L27)

- **Variation à chaque déclenchement :**

| Son | Écart de hauteur (detune) |
|---|---|
| Léger | ±40 cents |
| Lourd | ±25 cents |
| Garde | ±30 cents |
| Chute | ±20 cents |
| KO, menu | 0 (ce sont des signatures) |

  - gain de chaque couche ±1,5 dB ;
  - fréquence de coupure ±10 % ;
  - lecture du bruit à un décalage aléatoire : `start(t, r × (0,5 − durée))` ;
  - tirage par `hash32(tic, joueur, son)` côté coque : un replay sonne pareil, et le hasard du cœur n'est pas touché.
- **Note de combo** (combat-v2 §7.9) :
  - le coup *n* du combo ajoute un sinus de 80 ms à −20 dB (attaque 3 ms, τ = 15 ms) ;
  - hauteur : `440 × 2^(g[min(n − 1, 5)] / 12)` Hz, avec `g = [0, 3, 5, 7, 10, 12]` (pentatonique de la mineur). Cela donne **440, 523, 587, 659, 784, 880 Hz**, une octave au-dessus de la spécification pour passer sur un haut-parleur de téléphone ;
  - le timbre suit la famille : triangle pour un léger (« pat »), sinus plus une octave basse à −26 dB pour un lourd (« thunk »), et pour un spécial, une note glissée de −200 cents à 0 en 40 ms (« scratch ») ;
  - **la tonalité du stage n'est écrite nulle part** : la mineur est une hypothèse (§6 Q6).
- **CONTRE :** carré 1 320 → 660 Hz en 70 ms à −15 dB, plus un bruit passe-haut 8 kHz de 30 ms à −20 dB, au tic même, sur le son du lourd.
- **Stéréo :** `pan = clamp((x − centre caméra) / 240, −0,5, 0,5)`, avec un `StereoPannerNode` par voix. Les événements `jump`, `land` et `projectile` reçoivent `by` et `x`, en rendu seul (`fight-events.ts:124-126`).
- **Fichiers :** `sfx.ts` (`play(name, { detune, pan, offset })`), `fight-feedback.ts`, `fight-events.ts`, plus un test des fréquences par rang.
- **Coût :** 4 h. **Risque :** saturation, couverte par P13. P13 passe donc d'abord.

**P15. Le son marche sur iPhone et à la manette** (L30)

1. `unlock()` sur tout `pointerdown` et `keydown` pendant le combat, et à la première entrée de manette (le contexte reste suspendu si le navigateur refuse, sans erreur). L'écouteur est libéré dans `dispose()`.
2. Au retour au premier plan (`visibilitychange` → `visible`), appeler `suspend()` puis `resume()` : la parade du bug WebKit 283419.
3. `if ('audioSession' in navigator) navigator.audioSession.type = 'playback'`. **Mon incertitude :** son effet sur l'interrupteur silencieux de l'iPhone n'est attesté par aucune source lue ici. À vérifier sur un appareil avant de garder la ligne.

- **Fichiers :** `sfx.ts`, `fight-scene.ts` ou `app.ts`.
- **Coût :** 1,5 h. **Risque :** ne se teste que sur un iPhone réel, en Safari et en PWA.

**P16, partie son. Les déplacements et le volume par catégorie** (L31)

- **Atterrissage :** bruit 0,3 plus un sinus 90 → 50 Hz de 50 ms à 0,15.
- **Dash :** 0,25.
- **Options :** deux réglages, **Effets** et **Musique**, à 0, 25, 50, 75 ou 100 %.
  - Nouvelle clé versionnée `nayosbeat.audio.v1` (loi de Hyrum) ;
  - l'ancienne valeur `'off'` devient 0 et `'on'` devient 100 ;
  - lecture tolérante, comme aujourd'hui.
- **Coût :** 2 h.

### 3.5 IA du CPU

**P17. Le CPU voit avec son délai, même en garde** (L17)

- Pousser `liveOpponent` dans `seen` à **chaque** tic, blockstun et gel compris.
- Lire la garde haute ou basse sur `seen[0]`, la vue retardée.
- **Le côté** (cross-up) peut rester lu en direct : c'est plus indulgent pour le joueur, et c'est un choix à écrire.
- Le mannequin « Pare tout » reste parfait : c'est son rôle.
- **Test de régression** (`tests/ai/cpu.test.ts`) : un CPU Facile en blockstun de 14 tics prend le Balayage lancé au tic 0 dans au moins 80 % des graines. Il le pare à 100 % aujourd'hui : le test rougit avant le correctif.
- **Coût :** 2 h. **Risque :** les simulations longues de l'IA bougent (victoires, part de la jauge), mais pas les replays dorés : le CPU est hors du cœur.

**P18. Le CPU punit, selon son niveau** (L18, L19)

- **Profil :** `punish` vaut 0,15 en Facile, 0,5 en Normal et 0,85 en Difficile. Il se lit sur la vue retardée.
- **Quand punir :** l'adversaire vu est en récupération (`startup + active ≤ actionFrame`), il lui reste au moins `reaction + startup` tics, et il est à portée.
  - Facile : le Direct (L).
  - Au-dessus : le plan le plus fort qui atteint, par exemple le Crochet (H), qui déclenche PUNITION.
- **Après une garde :** même règle au dernier tic de blockstun, si le coup gardé est à −5 ou pire. Le Direct démarre en 4 tics.
- **Réaction :**

| Niveau | Aujourd'hui | Proposé |
|---|---|---|
| Facile | 24 tics | 24 tics |
| Normal | 14 tics | **16 tics** (265 ms, Infil) |
| Difficile | 8 tics | **12 tics** |

  - à 12 tics, face aux overheads de 16 à 19 tics, il reste au Difficile 4 à 7 tics pour basculer sa garde, comme un très bon humain ;
  - plus une **gigue** de 0 à 6 tics tirée à chaque nouvelle menace, à la graine.
- **Anti-répétition** (Wagar) : en Difficile, pas de 4e répétition de suite de la même option de neutre.
- **Tests :**
  - sur 50 graines, le Difficile punit l'Uppercut gardé ≥ 80 % du temps, et le Facile ≤ 30 % ;
  - aucun niveau ne punit un coup à +1 ;
  - aucune garde avant `reactionFrames` tics après le début du coup vu (ce test aurait attrapé L17) ;
  - « Difficile bat Facile » remonte à 65 %, comme le voulait §13.4.
- **Fichiers :** `src/ai/cpu.ts`, `profiles.ts`, `tests/ai/*`.
- **Coût :** 5 h.
- **Risque :** un Difficile plus dur sur la punition mais plus lent à réagir. C'est le **bon** Difficile pour un jeu dont le fun est « lire et punir », mais il faut le jouer. Si la découpe de `cpu.ts` (§13.3) devient nécessaire, elle passe dans un commit de refactor séparé, avant ce lot.

### 3.6 Entraînement et prise en main

**P19. L'avantage et la pause d'entraînement** (L20)

1. **Avantage.** Quand les deux combattants redeviennent libres, calculer `t_libre(P2) − t_libre(P1)` en tics : c'est une fonction pure et testée, qui ne fait que lire l'état.
   - Affichage dans la ligne d'info : « Avantage : +2 » en `#7bea8a` ou « −5 » en `#ffa04a` ;
   - **le signe est écrit**, pour ne pas dépendre de la couleur ;
   - il reste jusqu'au prochain échange.
2. **Pause d'entraînement**, branche `mode === 'training'` de `showPause`, avec des items qui bouclent sur place comme « Jauge » (`app.ts:396-404`) :
   - Mannequin : Immobile, Pare tout ou Ordinateur ;
   - Position : centre, coin gauche ou coin droit ;
   - Boîtes : oui ou non (`BoxOverlay` existe déjà).
3. **Historique des entrées :**
   - 12 lignes en bas à gauche, une ligne par changement d'entrée, avec sa durée en tics (plafonnée à 99) ;
   - flèches de 7×7 px reprises de `controls-content.ts`, lues sur `fighter.input`.
4. **Frame meter**, plus tard (§4) :
   - 2 lignes de 60 cases de 3 px avec 1 px de joint, centrées sur 240 px, à y ≈ 40 ;
   - démarrage en vert, actif en rouge, récupération en bleu, stun en jaune, invincible en blanc rayé, chaque état avec **un motif en plus de la couleur** ;
   - les tics de gel ne comptent pas.

   *Ces couleurs sont un choix pour NayosBeat : celles de SF6 n'ont pas pu être vérifiées.*

- **Fichiers :** `src/app/app.ts`, `match-setup.ts`, et les nouveaux `src/render/advantage-meter.ts` (nom prévu par la spécification) et `input-history.ts`.
- **Coût :** 2 h, puis 3 h, puis 3 h, puis 4 h pour le frame meter.
- **Risque :** faible, rien ne touche au cœur.

**P20. Les règles du gel deviennent des tests de données**, sans changer de valeur

- **Barème :** `|hitstop − (5 + ⌊dégâts / 10⌋)| ≤ 3` pour toute frappe, avec une liste blanche nommée (prises, projectiles, Boost, Finisher). Les frappes de Nayo suivent déjà presque exactement cette loi : Coup bas 25 → 7, Overhand 70 → 12, Uppercut 110 → 16.
- **Plafond :** `hitstop + COUNTER_HITSTOP + EXTENDER_HITSTOP ≤ 30`, hors Finisher. On en est aujourd'hui à 29 (SmashWiki : 30 depuis Brawl).
- **Projectiles :** gel ≤ ⌊0,75 × (5 + dégâts / 10)⌋ (Sakurai). Le Vinyle y est à 8, le test verrouille l'existant.
- **Coût :** 1 h. **Risque :** aucun, c'est un garde-fou pour les prochains coups.

### 3.7 Menus, tactile et accessibilité

**P21. Le tactile laisse voir le jeu** (L35, L36, L37, L21)

- **Canvas aligné à gauche** en mode tactile (`justify-content: flex-start`, zone sûre respectée) :
  - les 204 px libérés passent à droite ;
  - la grappe (265 px de large) ne recouvre plus qu'environ 60 px du jeu, au lieu de 163 ;
  - ajouter au test de géométrie de `touch-layout.ts` : « recouvrement du canvas ≤ 10 % de sa largeur » ;
  - *variante si l'alignement à gauche gêne :* boutons à opacité 0,35 au repos et 0,8 à l'appui, quand un combattant est à moins de 60 px du bord droit.
- **Pause :** une cible de 48×48 px, avec le visuel inchangé ou porté à 36×28, dans la bande noire, hors des barres de vie.
- **Retour :** un bouton « ‹ Retour » DOM de 48 px de haut, en haut à gauche, chaque fois que `onBack` existe (`Menu`, `FighterSelect`), généré une fois pour toutes.
  - L'aide devient « Touche pour choisir » sous `@media (pointer: coarse)` ;
  - `history.pushState` à chaque écran et `popstate` vers `onBack`, pour le geste retour d'Android.
- **Stick :** un anneau fantôme à alpha 0,06 en bas à gauche, tant qu'aucun toucher n'a eu lieu dans le match.
- **Fichiers :** `src/styles.css`, `src/ui/menu.ts`, `fighter-select.ts`, `src/input/touch-layout.ts`, `src/main.ts`.
- **Coût :** 4 h. **Risque :** faible ; à vérifier sur un vrai téléphone, pouce posé.

**P22. Des menus à la bonne taille** (L22, L23, L24 en partie)

- **`--ui-scale` :** une variable CSS sur `#ui`, égale au zoom entier déjà calculé (1 sur téléphone, 2 en 1280×720). Les polices du DOM sont multipliées par elle. Press Start 2P reste nette à 16 et 24 px.
- **Option « Taille du texte » :** normale ou grande. Elle pose une classe qui fait passer 8 → 12, 7 → 10 et 12 → 16 px.
- **Aide :** en `#9a9ab0`, sans opacité, au-dessus de 4,5:1.
- **Page Commandes :**
  - l'onglet devient « Clavier / manette » ;
  - le sous-titre est masqué quand il répète le titre ;
  - le joueur 2 passe en tableau.
- **Transition :** pas d'écran noir entre la difficulté et le combat (L16). La carte DOM reste affichée jusqu'au premier rendu de la scène, puis un fondu de 150 ms prend le relais.
- **Coût :** 5 h. **Risque :** débordement vertical en 1366×768, à tester.

**P23. Haptique par joueur** (L10)

- La manette est associée à son joueur, comme dans `player-inputs`.

| Événement | Vibration |
|---|---|
| Léger reçu | 25 ms à 0,25 |
| Lourd reçu | 60 ms à 0,6 |
| Lourd donné | 30 ms à 0,3, moteur faible seul |
| Garde | 20 ms à 0,2 |

- Téléphone : 6 ms pour l'attaquant d'un lourd.
- iOS n'a pas l'API : le son couvre.
- **Coût :** 2,5 h.

**P24. Remappage** (L24)

- Un écran « Touches » qui écoute la prochaine touche ou le prochain bouton, par joueur et par appareil.
- Stocké dans `nayosbeat.keys.v1`, validé à la lecture, réinitialisable.
- Il refuse les conflits ; Échap et Start restent fixes.
- **Coût :** 7 h. **Risque :** le plus gros chantier d'accessibilité. Il vient après le ressenti.

**P25. Lutte tenue** (L25)

- Une option qui transforme un bouton tenu en un appui synthétique tous les 12 tics (5 par seconde, le rythme du CPU Normal), dans `src/input`.
- Le cœur ne voit que des appuis, et l'équité est bornée : on reste sous les 8 par seconde du Difficile.
- **Coût :** 1,5 h.

### 3.8 Musique minimale (conditionnelle, §6 Q4)

**P26. Une boucle de batterie à 120 BPM, sans Crossfader.** *Non prototypée.*

- **Tempo :** 1 temps = 30 tics, calé sur `state.frame % 30` et planifié 100 ms à l'avance sur `context.currentTime`.
- **Instruments :**
  - kick : sinus 150 → 45 Hz en 120 ms ;
  - caisse claire : bruit passe-bande 1,8 kHz de 90 ms, plus une triangle à 190 Hz ;
  - charleston : bruit passe-haut 7 kHz de 30 ms.
- **Mix :** bus `musique` à −14 dB ; `suspend()` en pause ; ducking au KO (P13).
- **Règle :** elle ne fait que lire l'état. D17 tient : le tempo reste cosmétique.
- **Fichiers :** `src/audio/music.ts` (nouveau, environ 150 lignes).
- **Coût :** 6 h. **Risque :** une musique pauvre peut nuire. C'est au propriétaire de juger à l'oreille, et elle se coupe sans regret.

---

## 4. Backlog priorisé en lots

**Ordre de la charte :**
1. le ressenti et la lisibilité d'abord ;
2. puis ce qui se voit le plus pour le moins d'effort ;
3. ce qui ne touche pas au cœur avant ce qui y touche.

Chaque lot se termine sur quelque chose de jouable et de vérifiable, avec des captures avant/après prises par le même script.

| # | Lot | Contenu | Coût | Ce que le propriétaire verra |
|---|---|---|---|---|
| **1** | **Le poids juste** | P1, P2, §3.0 (hasard à graine), P7 (poussière) | 6 h | La Mise au tapis, le Coup de boule et la Hache frappent comme des coups lourds. L'écran bouge dès l'image du contact, les légers ont leur petit à-coup, la victime laisse une trace au sol. Planche tic par tic avant/après. |
| **2** | **Le son qui cogne** | P13, P15 | 6,5 h | Les coups lourds et le KO dominent, même sur le haut-parleur du téléphone. Un échange de coups ne sature plus. Le son marche au premier coup à la manette. Fichiers audio avant/après et tableau de mesures. |
| **3** | **Le temps fort reste fort** | P10, P5, P11 | 7 h | Au KO, plus que « K.O. » et le compteur. Le Vinyle montre le contact sans cacher Riff. CONTRE et PUNITION se reconnaissent à leur cadre. |
| **4** | **Le tactile respire** | P21 | 4 h | Sur téléphone, le jeu n'est plus sous les pouces, la pause se touche du premier coup, et on peut revenir en arrière dans les menus. |
| **5** | **Un CPU qu'on lit** | P17, P18 | 7 h | Le 50/50 marche enfin contre l'ordinateur. Le Difficile punit l'Uppercut gardé, le Facile presque jamais. Taux mesurés avant/après sur 50 graines. |
| **6** | **On voit qui est où** | P9, puis P8 en A/B | 5 h | Un sol qui mesure les distances, des coins visibles, des silhouettes qui se détachent. Captures A/B mesurées en contraste, pour choisir l'option. |
| 7 | La phrase s'entend | P14 | 4 h | Chaque coup de combo monte une note, le CONTRE a son « clac », les coups sonnent du côté où ils frappent. |
| 8 | La caméra accompagne | P12 | 4 h | Un petit serrage de cadre sur les gros coups et au KO, et un décor qui ne glisse plus à chaque pas. |
| 9 | Le coup raté se paie | P4, P3 | 5,5 h | Le whoosh tombe pile sur le coup, un coup lourd raté se voit et s'entend, une garde lourde sonne lourd. |
| 10 | L'entraînement apprend à punir | P19 (1 et 2), P20 | 6 h | « Avantage : −23 » après un Uppercut gardé. Mannequin, position et boîtes se règlent depuis la pause. |
| 11 | Les gerbes ont un sens | P6 | 2 h | L'uppercut gicle vers le haut, le marteau vers le bas. |
| 12 | Des menus à la bonne taille | P22, P16 (partie son) | 7 h | Des menus lisibles sur un grand écran, une option de taille de texte, des volumes Effets et Musique séparés, plus d'écran noir avant le combat. |
| 13 | Entraînement complet | P19 (3 et 4) | 7 h | L'historique des entrées et le frame meter. |
| 14 | Haptique par joueur | P23 | 2,5 h | Chaque joueur sent ses propres coups. |
| 15 | Musique minimale *(si Q4 = oui)* | P26 | 6 h | Un tempo entre les coups. |
| 16 | Accessibilité motrice | P24, P25 | 8,5 h | Touches reconfigurables, lutte sans marteler. |

**Première tranche recommandée : lots 1 à 6.** Elle fait environ 36 h, soit 4 à 5 jours. Elle ne touche ni au cœur ni aux replays dorés. Elle couvre les 8 lacunes de l'« En bref ».

**Total :** environ 98 h, soit 12 à 14 jours.

**Ordre de dépendance :**
- le lot 2 passe avant le lot 7 (le bus protège des notes ajoutées) ;
- le lot 3 passe avant le tremblement de la victime de D29 (sinon la gerbe le cache) ;
- le lot 1 et la refonte de `shake.ts` du Finisher se font ensemble (§7).

---

## 5. Coupes : ce qu'il ne faut pas faire maintenant

| Idée | Pourquoi pas maintenant |
|---|---|
| Raccourcir le gel en garde (« blockstop ») ou monter le gel des légers de 7 à 9 tics (GGST commence à 11) | Cela touche au cœur et réenregistre les replays dorés. À essayer d'abord en boîte grise sur téléphone, puis à écrire au journal si on l'adopte. Les gains de rendu seul passent avant. |
| PUNITION en « scène » de 18 tics de gel, ou ralenti à la GGST | C'est une mécanique de cœur. Le rendu (P11, P12) donne déjà la lisibilité. |
| Rotation de caméra (Bevy 10°, KidsCanCode 0,1 rad) | Elle casse la grille des pixels en 480×270. **Jamais.** |
| Clignotement de couleurs complémentaires (saint11) | Il scintille à 30 Hz, contre `docs/flashs.md`. **Jamais.** |
| Image d'impact à l'encre sur la victime, smear procédural de 2 images | Elles se superposeraient au tremblement de la victime (D29) sur le même sprite. À reprendre après la tranche d'animation, avec une mesure de surface. |
| Difficulté adaptative (Kusano 2019), modèle de l'adversaire appris (Tang 2020), raisonnement à partir de cas (Shadow AI) | Trop pour un solo. P18 et son anti-répétition donnent l'essentiel. |
| Audiodescription à la SF6 (son de distance, hauteur d'attaque, cross-up) | Elle demande le bus de P13 et beaucoup de réglages à l'oreille, avec des joueurs concernés. À reprendre après le lot 7. |
| Vitesse d'entraînement à 50 ou 75 % | Elle touche à la boucle (`src/loop`). Elle est utile, mais vient après l'avantage et l'historique. |
| Enregistrement et relecture du mannequin | 4 h ou plus, après le lot 13. |
| Crossfader (cœur, `mix.ts`, thèmes, fondu enchaîné, DROP) | C'est une **fonctionnalité** de la phase 5, pas du polish. Hors de ce plan. |
| Découpe de l'IA en modules (§13.3) | Seulement si P18 l'exige, et alors dans un commit de refactor séparé. |
| Post-traitements par shader (bloom, CRT, aberration) | Un coût GPU sur les mobiles faibles, sans gain de lisibilité. Cela contredit la qualité adaptative. |
| Glisser le doigt d'un bouton tactile à l'autre | Risque d'appuis involontaires. À juger en jouant, pas à coder d'avance. |
| Thèmes musicaux par personnage | Ils dépendent du Crossfader. |

---

## 6. Décisions à prendre

Chaque question part d'une hypothèse.

- **Q1. Contour (A) ou contre-jour (B) pour les silhouettes ?**
  - *Hypothèse :* faire les deux en captures A/B mesurées dans le lot 6, puis le propriétaire choisit.
  - A sépare mieux : 2,6:1 sur les deux tons. B est plus discret, mais c'est un compromis (2,04:1 contre 1,40:1).
- **Q2. La secousse et la poussée de caméra en gros plan : amplitude constante à l'écran, ou qui grossit avec le zoom ?**
  - *Hypothèse :* constante à l'écran (le décalage est divisé par `closeUp`), comme le veut `finisher.md` §4.4 et comme Sakurai le fait selon la distance de la caméra.
  - Sinon, le pic de 8 px devient 11,6 px en gros plan.
- **Q3. Les nouveaux délais de réaction du CPU, 24, 16 et 12 tics, plus une gigue de 0 à 6 tics ?**
  - *Hypothèse :* oui. Le Difficile devient « humain » et punit davantage.
- **Q4. Une boucle de batterie (P26) avant le Crossfader ?**
  - *Hypothèse :* oui, mais en lot 15, après le bus son. Le silence entre deux coups est la lacune la plus « ressentie » qui ne relève pas du polish.
- **Q5. En tactile, le canvas aligné à gauche ?**
  - *Hypothèse :* oui. Les boutons passent dans la bande libérée, et la variante en transparence sert de repli.
- **Q6. La tonalité des notes de combo ?**
  - *Hypothèse :* la mineur, pour L'Entrepôt. Le stage n'en écrit aucune.

---

## 7. Idées pour les chantiers en cours (rangées à part)

### Animation en tranche verticale (D29)

- **Le tremblement de la victime.** Les huit techniques de Sakurai (Nintendo Wire, 2022) en font une liste de contrôle.
  - Amplitude `A = min(3, 1 + ⌊gel / 6⌋)` px, alternée tous les 2 tics. Elle perd 1 px tous les ⌊gel / 3⌋ tics.
  - Sur x au sol, sur y en l'air. L'attaquant bouge de 0 à 1 px, et la hurtbox reste fixe.
  - L'amplitude est divisée par `closeUp` (Q2).
- **Prérequis :** P5, sinon la gerbe du Vinyle cache la victime pendant 9 tics.
- **Le son qui suit le gel :** pour un coup lourd, une queue de 80 à 150 ms dont la durée suit celle du gel.
- **Le KO qui claque au sol :** la recette « chute » de P13, avec son rebond à 7 tics. Elle est aujourd'hui mixée à −29 dB RMS : trop bas pour un temps fort.
- **L'écran de résultats** se pose sur le KO figé, sans pose de victoire ni nom du vainqueur dans le canvas. La victoire jouée en entier y trouvera sa place.

### Finisher (PR 3 à 5)

- **Sons manquants.** `finisherLock` et `finisherBlow` n'ont aucun cas dans `fight-feedback.ts:react` : le verrou et la frappe mortelle sont muets.
  - Au verrou : un « record scratch » avec ducking de −18 dB pendant 300 ms ;
  - à la frappe : un impact en 4 couches, plus fort que le KO, sur le bus `prio`.
- **Textes :** la règle de priorité de P10 doit couvrir la plaque FINISH.
- **Secousse :** faire l'axe et la division par le zoom de §4.4 **dans le même changement** que P2.
- **Rapproché pendant le gel de la super** (Infil, « Screen Freeze ») : `closeUp + 0,15`, borné à 1,45, en `easeOutCubic` sur 4 tics, puis retour en 14 tics.
- **Entraînement (PR 5) :** `trainingDummyHealth` et `trainingFinisher` existent dans le cœur, mais ni le menu Mannequin ni `matchConfigOf` (`match-setup.ts:174-182`) ne les exposent. Ils prendront place dans la pause d'entraînement de P19.

### Qualité adaptative

- Les pools de `hit-fx` (72 étincelles, 72 points, 56 stries) et le nombre de pièces par gerbe (jusqu'à environ 68 au KO de Nayo) sont un levier naturel : la moitié des points et des étincelles sur les appareils faibles. La surface des flashs ne fait que baisser.
- Le plafond de voix de P13 se règle par niveau : 12 en haut de gamme, 6 en bas.
- **Les mesures d'images par seconde de cet audit (SwiftShader, 52 i/s, p95 à 33 ms) ne valent rien pour un vrai appareil.** La sonde en jeu doit mesurer sur de vrais téléphones.

### HUD

- Le danger de la barre de vie (or contre orange) se lit mal en deutéranopie (ΔE 14) quand le mode calme coupe les braises.
- Ajouter un indice qui ne dépend pas de la couleur, par exemple un liseré statique en dents de scie, la prochaine fois qu'on touche à la barre.

---

## 8. Incohérences de documentation relevées (signalées, non corrigées)

1. `docs/PLAN.md` l. 174 promet « un léger bonus de dégâts pour la manip classique ». Cela contredit **D5** (« Aucun bonus de dégâts pour les manips »). PLAN.md est à aligner sur D5.
2. `docs/combos-v3.md` l. 862 renvoie à « refs.md §3 ». Aucun `refs.md` n'est suivi par git : le lien est mort.
3. Plusieurs points de la phase 3 de `docs/combat-v2.md` (l. 1379-1381) et du lot P de `docs/combos-v3.md` (l. 912) sont rédigés comme faits ou en cours, mais ne sont pas dans le code :
   - notes pentatoniques ;
   - `advantage-meter.ts` ;
   - option des boîtes ;
   - punition par le CPU ;
   - zoom de 4 % ;
   - smear ;
   - tampons REBOND, VRILLE et MAX.

   Ce plan les reprend ou les coupe explicitement.

---

## Annexe A : mesures du son

**Méthode :**
- Chromium headless, `OfflineAudioContext` mono à 48 kHz, maître à 0,5 comme dans `sfx.ts` ;
- bruit pseudo-aléatoire à graine fixe ;
- sons démarrés à t = 300 ms (pour éviter le transitoire de démarrage du compresseur, voir P13) ;
- **sonie courte :** RMS maximal sur une fenêtre glissante de 50 ms ;
- **téléphone :** la même mesure après deux passe-hauts de 2 pôles à 400 Hz, qui imitent un petit haut-parleur. C'est une approximation, pas une mesure d'appareil ;
- **centroïde :** spectre moyen par trames de 2 048 points (grossier, indicatif) ;
- le script de prototype est resté hors du dépôt. Il se refait avec les recettes de P13 et les paramètres ci-dessus.

| Son | Sonie courte (dB) | Pic (dBFS) | Centroïde (Hz) | Téléphone (dB) |
|---|---|---|---|---|
| Coup léger, actuel | −29,2 | −12,9 | 951 | −31,0 |
| Coup léger, proposé | −28,6 | −11,6 | 415 | **−26,6** |
| Coup lourd, actuel | −23,5 | −10,2 | 618 | −26,0 |
| Coup lourd, proposé | **−18,0** | −4,1 | 261 | **−21,4** |
| Garde, actuelle | −33,4 | −15,9 | 1 418 | −32,0 |
| Garde, proposée | −29,2 | −13,9 | 1 741 | −28,5 |
| KO, actuel | −21,9 | −11,6 | 576 | −23,0 |
| KO, proposé | **−15,4** | −5,0 | 319 | **−19,3** |

**Sommes simultanées :**

| Cas | Sonie courte (dB) | Pic (dBFS) |
|---|---|---|
| Lourd + KO, actuels | −18,7 | −5,7 |
| Lourd + KO, proposés, sans protection | −11,6 | **+1,0 (écrête)** |
| Lourd + KO, proposés, avec un compresseur réglé en limiteur (−6 / 20) | −12,6 | −0,7 |
| Finale 2 lourds + KO, proposés, sans protection | −8,5 | **+4,8** |
| Finale, proposés, avec un compresseur réglé en limiteur | −11,8 | **+0,5 (passe au-dessus de 0)** |
| Finale, proposés, avec l'**écrêteur doux** de P13 | −8,9 | **−0,6** |
| Coup léger seul, actuel, avec l'écrêteur doux | −29,2 | −12,9 (**inchangé**) |
| Coup léger seul, actuel, avec un compresseur réglé en limiteur | −25,8 | −9,5 (**+3,4 dB de compensation**) |

**Correction d'un constat d'audit.** Mesuré en RMS sur toute sa durée, le KO actuel semblait plus faible qu'un coup lourd (−30,1 contre −26,6 dB). En sonie courte, il est **un peu plus fort** (+1,6 dB), mais son pic est plus bas. La conclusion tient (le KO ne domine pas), sous une forme plus nuancée. C'est cette forme que retient L15.

**Les recettes de la recherche, prises telles quelles, ont échoué.** Le premier essai reprenait les couches et les gains de la recherche :
- le coup lourd tombait à un centroïde de 133 Hz et ne gagnait que 2 dB sur un téléphone ;
- le KO crêtait à −0,9 dBFS seul ;
- la finale montait à +6,4 dBFS.

Les recettes de P13 sont le troisième réglage. Elles déplacent l'énergie vers 700 à 1 500 Hz (bruit passe-bande, carré filtré, saturation tanh), et baissent les corps graves de 8 dB.
