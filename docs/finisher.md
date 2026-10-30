# Finisher : Nayo et Riff

Spec de design, version 2. Elle intègre la revue adverse de la v1 (7 bloquants, 14 importants, 9 mineurs). **Validée par le propriétaire le 30 octobre 2026** : les six choix du §6 prennent leur défaut.

- **Sources** : le code de `main` avec la dissolution des effets (`e996dac`), `docs/flashs.md`, `docs/art/direction-hud.md`, `docs/art/dissolution.md`, `docs/combat-v2.md`, `docs/combos-v3.md`.
- **Déjà livré, pris en compte**
  - **Flashs, étape 1** : `veils.ts`, `luminance.ts`, `shake.ts`, l'événement `freeze`, le drapeau `pulse`. Les étapes 2 (le budget, `flash-budget.ts`) et 3 (les options « Effets de flash » et « Tremblement ») ne sont pas codées, et il n'y a pas d'écran Options dans `src/ui` : ce sont des prérequis, la PR 0 (§5.10), à faire d'abord.
  - **Bras arrière de Nayo sur la Mégabasse** (PR #48) : sur s2, s3 et s4, il est balayé le long du dos, poing passé la hanche ; la boîte de corps de la 3e frappe (tics 14 à 17) descend de 55,5 à 49,5 px.
  - **Dissolution des effets** (`dissolve.ts`, `fx-dissolve.ts`) : la mise en scène s'en sert (§1.14, §4.3).
  - **En cours** : la reprise de l'anatomie de toutes les poses ; les poses citées ici peuvent encore bouger.
- **Unités**
  - un **tic** est un pas de simulation, à 60 par seconde ;
  - une **image** est un pas de l'horloge visuelle (`visualClock`, `fight-scene.ts`), soit 1/60 s, la même durée à 60 et à 144 Hz ;
  - pendant la mise en scène, les deux ne coïncident plus.
- Les noms de code sont en anglais.

---

## 0. En bref

**Ce que c'est**
- Le Finisher, c'est la super du personnage lancée **armée** : la Mégabasse pour Nayo, le Slam pour Riff.
- Quand trois voyants sont allumés, arrière + BOOST sort la même super : même départ, même garde, même coût, même risque.
- Si elle touche proprement, sa **dernière frappe gagne le match**. Une mise en scène d'environ 4 s la signe.
- Ce n'est ni un nouveau coup, ni un nouveau bouton, ni une Fatality : il se joue pendant le combat, il peut être paré, et c'est lui qui donne le KO.

**Pour qui**
- **Le joueur qui mène** reçoit une récompense de fin de match qu'il choisit : garder ses 3 barres au lieu de les dépenser.
- **Le joueur mené** voit le danger venir : le mot FINISH, la sirène, sa propre barre orange. Il a des réponses :
  - parer : au neutre, celui qui voit le gel et n'attaque pas pare tout (mesuré, §1.8) ;
  - rester loin ;
  - ne pas se faire ouvrir sous 30 %.
- **Le public** comprend sans connaître le jeu :
  - Nayo : « un, deux, trois… QUATRE » ;
  - Riff : l'aiguille saute, puis toute la salle saute.

**Les trois questions du propriétaire**

1. **Le design.**
   - Nayo a **« Le Quatre »** : il compte sur le temps, et l'autre tombe sur le quatre (§2).
   - Riff a **« Larsen »** : l'aiguille saute, un temps de silence, puis L'Entrepôt saute sur son contretemps (§3).
2. **Comment l'obtenir.** Il faut réunir (§1.1) :
   - la balle de match ;
   - 3 barres de Boost ;
   - un adversaire à 30 % de vie ou moins au **début** du combo ;
   - assez de place dans le combo, et pour le Slam une victime au sol.

   C'est la règle de la v1, gardée par défaut. La variante « FINISH seulement si la super tue déjà » est au §6.1.
3. **Comment le déclencher.** Arrière + BOOST, exactement comme la super :
   - clavier : Q (AZERTY) ou A (QWERTY), ou D, selon le côté, + O ;
   - manette : arrière + RT ;
   - tactile : stick en arrière + BOOST.

   On le place en fin de combo (`L, L, H, H` ou `H`), ou à vide (Nayo en reversal). Voir §1.3.

**La jauge au KO (la règle du propriétaire)**
- Elle reste **normale** pour un KO banal.
- Elle se **fissure** à la fin d'un combo de 3 coups ou plus.
- Elle **éclate** pour l'Ultime (la super qui tue) et pour le Finisher. Avec le Finisher, elle éclate sur la **retombée**, pas au contact (§1.13).

**Les flashs**
- Comptés sur l'image affichée, au vrai zoom, selon la règle unique de `flashs.md` (§4.1).
- **Le Quatre** : 3 flashs comptés (TROIS, QUATRE, la carte). **Larsen** : 2 (la reprise, la carte).
- Jamais 2 climax dans la même seconde, jamais plus de 2 flashs par seconde, 30 images d'écart au moins.
- Aucun voile blanc plein écran, aucun rouge saturé qui varie, pas de sang au gros plan.
- Le spectacle passe par le gel, l'aplat de couleur, les silhouettes, le gros plan, le silence et le son (§4).

**Prérequis** : la PR 0, budget de flashs et options (étapes 2 et 3 de `flashs.md`), 0,5 à 1 jour.

**Coût estimé**
- Environ 4 à 5 jours-agent, PR 0 comprise, dont 1 pour le cœur.
- 5 poses nouvelles : 3 pour Nayo (avec un nouveau mode d'attache du casque), 2 pour Riff.
- 0 image côté victime : rien à payer pour Kaï, Vexa, Sora ni Kitsune.

---

## 1. Règles communes

### 1.1 L'obtenir : trois voyants et de la place

Tout passe par un seul prédicat pur, `finisherReady(state, player, config)`, en entiers et sans allocation. Il est calculé une fois par tic, depuis l'état précédent, comme les menaces.

| # | Voyant | Règle exacte | Chiffres |
|---|---|---|---|
| 1 | Balle de match | `round.wins[p] === ROUNDS_TO_WIN - 1` | `ROUNDS_TO_WIN = 2`. Round 1 : jamais. Round 2 : le gagnant du 1er. Round 3 : les deux. Après un round nul (compté pour les deux) : les deux |
| 2 | Jauge pleine, super libre | `superGauge(fighter) >= BOOST_MAX` | 3000. Après une super dans la séquence, `superGauge` plafonne à 2999 : le voyant reste éteint |
| 3 | Adversaire en danger | `vie × 100 ≤ vieMax × FINISHER_DANGER_PERCENT` (30) | Nayo ≤ 300 PV, Riff ≤ 270 PV |
| 4 | De la place, et une victime que la super peut finir | (a) `comboCount victime + frappes de la super ≤ COMBO_LIMIT` (12), victime ni `FLAG_LIMIT` ni `FLAG_BOUNCE` ; (b) si la super quitte le sol (`motion.y` : le Slam), la victime est au sol (`y === 0`), pas en `airHit` | (a) Nayo : 3 frappes, donc 9 coups avant au plus ; Riff : 2 frappes, donc 10. (b) Riff ←+H puis Slam : la 1re frappe touche une victime en l'air à 57 px, la 2e rate (mesuré) |

**La règle (b) est générique.** Elle vient de la super, pas d'une liste de routes : toute super qui quitte le sol exige une victime au sol. La Mégabasse reste au sol, elle n'est pas concernée : ses routes en l'air passent 3 sur 3.

**Revérifié au premier contact.** Les voyants 3 et 4 sont relus sur le tic du premier contact de la super (la jauge, elle, est déjà dépensée). Entre l'appui et ce contact, la victime a pu sauter (le Slam bondit 10 tics avant son gel) ou prendre un Vinyle. S'ils tombent, pas de verrou : c'est une super ordinaire (§1.6).

**Comment se lit le voyant 3**
- Au neutre ou en garde (`comboCount === 0`), on lit la vie actuelle de l'adversaire.
- En combo, on lit le drapeau **`FLAG_DANGER`** (bit 64, libre aujourd'hui) :
  - il est posé sur la victime au **1er coup** du combo si sa vie *avant* ce coup était sous le seuil, et retiré sinon ;
  - il est effacé avec les autres `VICTIM_FLAGS` quand la victime revient au neutre (`actOnGround`).

**Pourquoi mesurer au début du combo** (règle de l'Astral Heat de BlazBlue)
- Si on mesurait au moment du coup, un combo commencé à 60 % pourrait descendre sous 30 %, puis finir sur une frappe mortelle. Ce serait un combo de 60 %, et les plafonds de 45 % et 50 % sauteraient.
- Avec cette règle, un combo commencé à 31 % ne s'arme jamais, même s'il descend à 5 %.

**Pourquoi 30 %**
- C'est déjà le seuil où la barre de vie passe à l'orange avec des braises (`DANGER = 0.3`, `health-motion.ts`).
- Une seule constante sert les deux : `FINISHER_DANGER_PERCENT = 30` dans le cœur, d'où le rendu tire `DANGER`.

**Ce qui n'est volontairement pas une condition**
- Pas de « round décisif seulement » : ce serait trop rare.
- Pas de jeton ni de limite d'usage. S'il touche, le match est fini ; s'il rate, les 3 barres sont perdues.
- Pas de DROP : il n'est pas codé. Quand il existera, sa barre bonus aidera simplement à atteindre 3 barres.
- Pas de rythme (D17), pas de hasard, pas d'expiration, rien qu'on puisse « farmer » en fuyant.

**Ordres de grandeur mesurés** (scripts du système A, CPU difficile, 200 matchs, règle v1)
- Jauge médiane du joueur en balle de match quand l'adversaire passe sous 30 % : 2770.
- 3 barres pleines à ce moment : 31 % des cas.
- Au moins un moment armé : 56 % des matchs.
- **Cible** : un bon joueur place un Finisher environ un match sur trois. Le CPU difficile conclut 15 à 35 % de ses matchs gagnés par un Finisher.

### 1.2 Le signal : on le voit venir des deux côtés, sans rien qui clignote

Le même prédicat nourrit le HUD, le bouton tactile, le halo, le son et l'IA. Le signal ne ment donc jamais. Il a trois états :

| État | Condition | Jauge (`boost-gauge.ts`) | Bouton BOOST tactile | Halo au sol | Son |
|---|---|---|---|---|---|
| `ready` | voyants 1 à 4 | **FINISH**, fixe, lettres platine `#F2F6FF`, liseré 1 px dans la couleur d'énergie | classe `.finisher` : fond et libellé dans l'énergie | oui | sirène au front montant |
| `blocked` | voyants 1 à 3, mais pas le 4 | FINISH à 40 % d'opacité, fixe | `.full` | non | — |
| `off` | sinon | comme aujourd'hui : MAX qui clignote à 2 Hz à 3000, BOOST en dessous | comme aujourd'hui (`.full` à 3 barres) | non | — |

**Jauge**
- `FINISH_WORD = 'FINISH'` : 6 lettres × 8 px = 48 px. `GAUGE_WIDTH = WORD_X + 48 = 174` (aujourd'hui `WORD_X + 40`).
- La jauge de J1 va de x = 8 à x = 182. Le disque du chrono commence à x = 220 : il reste 38 px de marge. J2 est en miroir, de 298 à 472.
- Un test vérifie l'absence de chevauchement, y compris avec la future piste du Crossfader (x de 192 à 288, sous le disque).
- Le passage d'un état à l'autre est un fondu de 6 images. Le mot change de surface sur 48 × 8 px : ce n'est pas un flash.
- C'est l'arrêt du clignotement de MAX qui fait signal : le calme avant le coup.

**Côté victime** : rien de neuf. Sa barre est déjà orange avec des braises sous 30 %.

**Bouton tactile** (`touch-controls.ts`, `styles.css`)
- `.full` montre déjà 3 arcs blancs et une lueur fixe. Souder les arcs ou ajouter un liseré de 2 px ne se verrait pas, et un chevron serait sous le pouce.
- `.finisher` porte donc un repère franc et fixe :
  - le fond passe à l'énergie à 35 % d'opacité (`--boost-energy`), au lieu du blanc à 15 % ;
  - le libellé BOOST passe à l'énergie, au lieu du platine.
- Le libellé ne change pas de texte : 5 × 8 = 40 px, la place exacte dans 56 px.
- `showFinisher(state)` pose la classe. Rien ne pulse. On n'ajoute aucun bouton, donc la grappe de `touch.test.ts` ne change pas.
- Un test vérifie que `.finisher` change le fond et la couleur par rapport à `.full`.

**Halo au sol**
- Une ellipse de 44 × 6 px du monde, sous les pieds du joueur armé, dans sa couleur d'énergie. Son alpha vient de `alphaForDelta` pour ΔL ≤ 0,08 (0,27 en cyan).
- Elle respire une fois par mesure (120 tics), avec une variation de luminance de 0,05 au plus.
- Elle est fixe en mouvement réduit. Aucune planche à dessiner.

**Son `finisherReady`**
- Une sirène dub, la sirène des sound systems, de 0,8 s au plus.
- Elle part au front montant de `ready` seulement, au plus une fois par round et par joueur. Les deux joueurs l'entendent.
- Synthèse : une onde carrée passée en passe-bas à 2 kHz, avec un vibrato de 6 Hz, qui glisse de la fondamentale à la quinte :
  - Nayo : do 262 Hz → sol 392 Hz ;
  - Riff : mi 330 Hz → si 494 Hz.
- Volume : 9 dB sous `heavyHit`.
- Rien ne dépend du son.

**Au départ du coup**
- Le départ reste celui de la super : gel, mise au noir (`superDim`), halo platine, tampon du nom.
- Le nom du Finisher n'apparaît **qu'au premier contact verrouillé**. Le spectacle ne sort que s'il est mérité, et le départ ne révèle rien de plus que la plaque.

### 1.3 Le déclencher : l'entrée, appareil par appareil

**La commande** : arrière + BOOST, c'est-à-dire **← seul** quand le perso regarde à droite.
- **Pas ↖** : au neutre, haut tenu sans commande en buffer fait sauter (`actOnGround` part en `preJump`), et BOOST en l'air ne donne rien.
- **Jamais avec bas** : ↙ + BOOST donne le Remix de l'anti-air (`boostMove`).
- Une manip fraîche (↓↘→ ou →↓↘ dans les 12 derniers tics) donne un Remix : il ne faut pas en faire une juste avant.
- **Priorité sur un même tic** : PRISE passe avant BOOST. Il ne faut pas appuyer PRISE en même temps.

Touches vérifiées dans `keyboard.ts` (positions physiques, `KeyboardEvent.code`), `gamepad.ts` et `touch-layout.ts` :

| Appareil | Arrière | BOOST |
|---|---|---|
| Clavier, joueur 1 | Q en AZERTY, A en QWERTY (`KeyA`) si le perso regarde à droite ; D (`KeyD`) sinon | O (`KeyO`) |
| Clavier, joueur 2, pavé | ← ou → | Pavé 6 (`Numpad6`) |
| Clavier, joueur 2, portable | ← ou → | `[` en QWERTY, `^` en AZERTY (`BracketLeft`) |
| Manette | croix, ou stick gauche (pris à 0,5) | RT / R2 (bouton 7) |
| Tactile | stick flottant tenu en arrière (lu jusqu'à 35° sous l'horizontale quand FINISH est allumé) | BOOST (centre 126 / 190 depuis le coin bas-droit, diamètre 56) |

**Sur tactile, ↙ arrive vite**
- `bitsFromStick` donne bas dès 22,5° sous l'horizontale (`SECTOR_THRESHOLD`), alors que haut demande 30° et 18 px.
- Un pouce qui tire « arrière » un peu bas donne la Montée platine (1 barre) : le Finisher devient impossible.
- **Correction** : quand FINISH est allumé, à l'appui de BOOST, le stick lit « arrière » jusqu'à 35° sous l'horizontale, côté dos seulement. ↙ franc (45°) reste bas.
- Choix : c'est l'option la plus simple et la plus sûre, car rien ne change hors de l'état armé. Avancer « Ultime en un appui » ajouterait un bouton.
- Le seuil est à mesurer sur téléphone.

**D'où il part** : exactement d'où part la super (`cancelMove`, `tierOf`).
- À vide : au neutre, ou au réveil avec le buffer de 6 tics.
- En annulation d'un normal qui a touché ou qui a été paré.
- En annulation d'un spécial ou d'un Remix qui a **touché** : pas paré, pas un projectile.

**Il ne sort jamais**
- en l'air ;
- pendant une prise (la place de BOOST en prise reste libre) ;
- depuis le Vinyle ;
- après un Remix, un Rewind ou un Pogo : il ne reste que 2 barres.

**Routes de démonstration** (mesurées sur le vrai cœur, distance de centre à centre, au milieu de la scène)

| Perso | Route | Mesure |
|---|---|---|
| Nayo | `L, L, H, H, arrière + BOOST` (le `SUPER_COMBO` de l'aide) | 3 frappes sur 3, à 24, 36 et 48 px |
| Nayo | ↓ + S (Uppercut) qui touche, puis arrière + BOOST | 3 sur 3 à 24 et 36 px, victime en l'air |
| Nayo | à vide, en reversal au réveil | la Mégabasse est invincible de f0 à f7 |
| Riff | `L, L, H, H, arrière + BOOST` | 2 sur 2 à 24 et 36 px |
| Riff | `H, arrière + BOOST` | 2 sur 2 à 24, 36 et 48 px |

- Chez Riff, avant + S (le Saut de l'ange) qui touche, puis arrière + BOOST, marche aussi (2 sur 2).
- **↓ + S (Genou montant) ne marche pas** : la victime retombe en `knockdown` au tic même du gel (f10), avant l'impact à f12. Aucune frappe ne touche à 18, 24, 30 ou 36 px, même avec l'annulation la plus tôt possible. La Glissade (S) suivie du Slam rate aussi.
- Au coin : à mesurer par le test 3.

**Plus tard, désactivée par défaut : l'option d'accessibilité « Ultime en un appui »**
- **Le bit** : `Input.Ultimate = 1 << 11` (libre : BOOST est `1 << 10`). Le cœur le lit comme arrière + BOOST, sans bas ni manip. Il donne la super, ou rien. `PRESS_BUTTONS = ~DIRECTIONS` le couvre déjà.
- **Les touches** :
  - clavier : U (`KeyU`) pour J1 ; Pavé 5 et `]` (« $ » en AZERTY, `BracketRight`) pour J2 ;
  - manette : LT / L2 (bouton 6).
  - U est voisin de I (PRISE) : un appui des deux donne la PRISE, qui a la priorité.
- **Un 8e bouton tactile « ULTIME »**, affiché seulement avec l'option :
  - position `right 56, bottom 200, diameter 64`, police de 8 px. Le libellé fait 48 px, soit la place exacte (64 − 16) ;
  - plus proche voisin : BOOST, à 10,7 px (la règle demande 6 à 16) ; PRISE est à 19,0 px ;
  - le bord le plus éloigné reste à 265 px du bord droit.
- **Pilier 4, franchement** : le démarrage est le même (même tic, un test le vérifie), mais l'option est **plus forte en pratique**. On garde la garde basse ↙ jusqu'à l'appui, et l'erreur ↙ → Remix disparaît. C'est assumé comme une aide d'accès, désactivée par défaut.

### 1.4 La fenêtre

- **Pas d'expiration** : le Finisher reste prêt tant que les voyants restent allumés. La phase « adversaire sous 30 % » dure 412 tics en médiane (6,9 s), entre 280 et 600 tics pour la moitié des cas.
- **En annulation**, la fenêtre se compose de :
  - 6 tics de buffer avant le contact (`INPUT_BUFFER_FRAMES`) ;
  - le gel d'impact, pendant lequel le buffer ne vieillit pas (`frozen`) ;
  - le temps qui reste avant que la victime sorte du hitstun.
- **Mesuré** (appui d'arrière + BOOST k tics après le contact du dernier coup ; la super doit toucher une victime encore en combo) :

| Route | Après le contact | Avec le buffer |
|---|---|---|
| Nayo, après H, H (`L, L, H, H`) | 32 tics | environ 38 tics |
| Riff, après H, H (`L, L, H, H`) | 17 tics | environ 23 tics |
| Riff, après H seul | 34 tics | environ 40 tics |

- Le tactile, lu à 30 images par seconde, demande au moins 8 tics : toutes ces fenêtres passent.

### 1.5 La portée

C'est celle de la super.
- **Mégabasse** : hitbox de 4 à 60 px devant, de 0 à 90 px de haut. Elle touche jusqu'à environ 75 px de centre à centre, au sol comme en l'air. Depuis la tâche 52, la boîte de corps de Nayo sur la 3e frappe (tics 14 à 17) monte à 49,5 px au lieu de 55,5.
- **Slam** : 30 px d'avance (f2 à f12) plus 44 px de hitbox, soit environ 90 px. C'est un overhead. Il quitte le sol de f2 à f16 (sommet à 40 px).

### 1.6 Ce que fait la super armée : le verrou

**Les données sont identiques à la super.** Un test de chargement vérifie qu'aucune donnée n'est propre au Finisher.

**Au départ**, si `finisherReady` est vrai, `startGroundMove` pose **`FLAG_FINISHER`** (bit 128, libre) sur l'attaquant. Comme `FLAG_MOVE_HIT`, ce drapeau survit à la fin de la super : seul le prochain `startAttack` l'efface. Le verrou ne se déduit donc jamais des drapeaux seuls.

**Au premier contact de la super, le verrou prend si les trois conditions tiennent :**
1. la frappe touche (elle n'est pas parée) ;
2. l'attaquant n'est pas touché lui-même sur ce tic, ni par une frappe, ni par un projectile. `step.ts` trouve les deux frappes d'un tic avant d'en appliquer aucune : un échange n'arme rien ;
3. les voyants 3 et 4 tiennent encore sur ce tic (§1.1).

Sinon `FLAG_FINISHER` tombe : c'est une super ordinaire, parée, échangée ou ratée.

**La définition** : `finisherLocked(state, p)` est vrai quand
- l'attaquant est en `action === 'attack'`, avec `move === 'super'`, `FLAG_FINISHER` et `FLAG_MOVE_HIT` ;
- la victime est en `hitstun`, `airHit` ou `ko`.

**Pendant le verrou**
- **Les frappes avant la dernière arrêtent la vie à 1 PV**, par le chemin `minHealth` qui existe déjà dans `applyHit`.
- **La dernière frappe prend toute la vie qui reste**, quel que soit le scaling. C'est f14 pour la Mégabasse, f16 pour le Slam.
- **La paire est intouchable**, comme la paire d'une prise : `canBeHit` est faux pour l'attaquant, et pour la victime contre tout ce qui n'est pas une frappe de la super. Les projectiles des deux joueurs la traversent.
- **Le chrono est gelé.**
- **Rien d'autre ne change** : la victime est en hitstun comme avant.

**La fin du verrou**
- Au KO, ou quand l'attaquant sort de la super.
- Dans le second cas, que la garantie interdit (c'est un filet), la victime garde sa vie (≥ 1 PV) et le chrono repart. Un test le force (test 5).

**Conséquences**
- Le KO se décide sur un vrai contact et sur le grand coup.
- Les images restent honnêtes, et la Mégabasse place toujours ses trois frappes.
- **Une fois verrouillé**, pas de double KO, et le Finisher gagne le match.
- **Avant le verrou**, un échange reste une super ordinaire. Le miroir est possible (même perso, 2e tenue). Deux Mégabasses lancées au même tic s'échangent à f8, après l'invincibilité f0 à f7, pour 96 PV chacune (contre, +20 %). Aucune ne s'arme, et un double KO reste possible, comme aujourd'hui.

**La garantie, imposée par un test** (§5.8, test 3)
- Si la première frappe d'une super verrouillée touche, les suivantes touchent aussi.
- Elle était fausse en v1 : Riff ←+H (Retourné sauté) puis Slam touchait une fois une victime en l'air, puis ratait. Avec `floor`, la victime restait à 1 PV, sans KO. La règle (b) du voyant 4 l'exclut.
- Mesuré : toutes les routes de Riff qui marchent ont la victime au sol en `hitstun` avant le Slam (H ; H, H ; L, L, H, H ; →+S ; ↓+L). Toutes les routes de Nayo en l'air passent 3 sur 3 (↓+S, →+S, ←+H).
- Le test couvre la matrice des routes, aux distances 24, 36 et 48 px, au milieu et au coin, pour J1 et J2.
- Si un cas échoue, on corrige la règle d'état, pas les boîtes : le voyant s'éteint dans ce cas.

**Ce que la frappe mortelle change vraiment**
- Mégabasse seule sur Riff : 80 + 72 + 112 = 264 PV. Sur une Riff à 270 PV ou moins, la super laisse 6 PV au plus ; le Finisher tue.
- Slam seul sur Nayo : 120 + 153 = 273 PV. Sur un Nayo à 300 PV ou moins, la super laisse 27 PV au plus.
- En miroir : jusqu'à 36 PV pour la Mégabasse sur Nayo, 0 pour le Slam sur Riff (273 ≥ 270).
- Les combos à 3 barres font déjà 330 à 374 PV sur Riff et 300 à 321 sur Nayo (combos-v3 §0.5) : depuis 30 %, ils tuent sans aide.
- C'est donc un habillage du KO, pas un gain de puissance. Il ne crée pas de KO depuis une vie haute.

**Pourquoi la v1 reste le défaut** : après A1 à A4, elle est cohérente. Le verrou ne prend que sur un premier contact propre, la paire est intouchable, et les frappes suivantes touchent (règle d'état, test 3) : la frappe mortelle tombe toujours. La variante plus sobre est au §6.1.

### 1.7 Raté ou paré

- **Même sanction que la super, rien de plus.**
  - Les 3 barres sont perdues.
  - En garde : −16 pour la Mégabasse, −15 pour le Slam.
  - À vide : récupération de 30 tics pour la Mégabasse, 26 pour le Slam. Le coup est punissable.
- **Le chip** vaut 15 % des frappes de spécial : 12 + 12 + 21 = 45 PV pour la Mégabasse, 18 + 25 = 43 PV pour le Slam. Il ne prend jamais le dernier point (D16).
- **Aucune pénalité en plus**. C'est la leçon de l'Instant Kill de Guilty Gear : une sanction trop lourde tue l'usage du coup.
- Refaire 3 barres prend environ 1,5 à 2 rounds (1,26 à 1,49 barre par round pour le CPU difficile).
- L'adversaire sous 30 % peut punir avec un combo d'environ 300 PV : une remontée est possible.

### 1.8 Le contre-jeu

- **Voir le danger** : le mot FINISH et le halo chez l'autre, sa propre barre orange, la sirène.
- **À vide, le Finisher se pare au gel.** Mesuré : la Mégabasse et le Slam lancés au neutre sont parés par un défenseur qui ne tient arrière qu'à partir du gel (3 frappes parées pour la Mégabasse ; 2 pour le Slam, 18 + 25 PV de chip). À vide, il ne passe que contre un adversaire engagé dans une attaque.
- **La règle à retenir** : tu vois le gel et tu n'attaques pas : pare.
- **Contre Nayo**
  - Parer : la Mégabasse est un mid, elle se pare debout comme accroupi.
  - Ne pas lancer de spécial qui se fait toucher à 80 px ou moins : c'est la route d'annulation.
  - Rester à plus de 75 px pour faire sortir la Mégabasse à vide, puis punir le −16.
- **Contre Riff**
  - Elle bondit 10 tics, bien visibles, avant le gel.
  - C'est un overhead : se relever et parer debout.
  - La Mégabasse (invincible de f0 à f7) bat le Slam au réveil.
  - En l'air, on ne craint pas son Finisher (voyant 4, règle b).
- **Ne pas se faire ouvrir sous 30 %** : c'est au premier coup du combo que le seuil se lit.
- **Ses propres reversals** : le Genou à fond (1 barre, invincible à tout de f0 à f6), la Montée platine (1 barre, f0 à f10), la Mégabasse (f0 à f7).
- **Au round 3**, les deux joueurs peuvent être armés en même temps. Un échange au même tic ne verrouille personne (§1.6).

### 1.9 Avec le Boost, la super, la limite et le scaling

- **Coût** : 3000. La règle « 0, 1000 ou 3000 » de `validate-boost.ts` tient.
- **Gain** : aucun pour celui qui le lance (c'est un coup Boost). La borne 864 < 1000 tient.
- **Une fois par séquence**, avec `FLAG_SPENT_SUPER`.
- **Rewind, Pogo ou Remix dans le combo, puis Finisher** : impossible, il faudrait 4 barres. Le joueur choisit entre des dégâts tout de suite et le Finisher.
  - En phase 5, le DROP donnera +1 barre. Ce chemin deviendra possible de lui-même, sans règle de plus.
- **Limite de 12** : elle tient grâce au voyant 4 (a).
- **Scaling** : les frappes d'avant la dernière sont scalées normalement, puis arrêtées à 1 PV. La dernière prend la vie restante.
- **Plafonds** : un combo avec Finisher part d'une victime à 30 % ou moins, donc il fait au plus 30 % de la vie max (300 PV pour Nayo, 270 pour Riff). C'est sous 45 % et 50 %.
- **Les combos de référence de combat-v2 §7.8** ne sont jamais armés (round 1, pas de balle de match) : leurs dégâts ne bougent pas.

### 1.10 Rounds et chrono

- **Pendant le gel de la super**, le chrono est arrêté, comme aujourd'hui.
- **Avant le premier contact**, il tourne (par exemple pendant les 10 tics de bond du Slam). S'il tombe à 0 avant le contact, c'est un temps écoulé normal.
- **Tant que `finisherLocked` est vrai**, il est gelé (`round.ts`) : sinon un « TEMPS ! » pourrait tomber sur une victime restée à 1 PV. Si le verrou finit sans KO, il repart.
- **Une fois verrouillé, le Finisher gagne le match.**
- **`ROUND_END_FRAMES` (150) et `MATCH_END_FRAMES` (120) ne changent pas.**
  - La scène est du rendu : elle fait avancer la simulation à son rythme (§1.14).
  - À la fin de la carte, une **boucle dédiée** fait tourner la simulation sans l'afficher jusqu'à `matchEnd` : 292 tics au plus après le KO (22 de gel, pendant lesquels la phase n'avance pas, puis 150 et 120), entrées à zéro, sans `cpuStep`, sans `detectEvents`, sans feedback. Passer par `FixedTimestep`, plafonné à 5 tics par image (`MAX_TICKS_PER_FRAME`), étalerait l'avance sur 60 images, et chutes et changements de phase sonneraient tous ensemble.
  - Elle tient ensuite 60 images de pose de victoire, puis ouvre les résultats.
  - Le vainqueur est connu dès le tic du KO (`round.wins`).

### 1.11 IA (`src/ai/`)

**Constat**
- Les chiffres de la v1 (7 Finishers en 200 matchs, tous des Mégabasses en reversal, 0 pour Riff) venaient d'une autre règle (frappe mortelle dès la première frappe). Ils sont à re-mesurer avec la règle finale (PR 5).

**Données**
- Nouvelle condition de plan `PlanCondition.finisher?: true` : le plan n'est tiré que si `finisherReady` vaut `ready` pour le CPU.
- Le CPU ne lit que ce que le joueur voit : la plaque, les vies, les jauges.

**CPU difficile, en attaque, à la balle de match**
- Pas de super ordinaire tant que l'adversaire est au-dessus de 30 %. Exception : le reversal de Nayo, avec `reversal()` inchangé.
- Il garde ses barres dès qu'il en a 2 (`savesForSuper`, qui existe déjà).
- Quand il est armé, les routes qui finissent sur arrière + BOOST pèsent 12 au lieu de 3 (×4 par rapport à `SPEND.hard`).
- Ses ouvertures sont les plans qui existent déjà pour les deux persos : `L, H, H, arrière + BOOST` (après `standLight`) et `H, arrière + BOOST` (après `standHeavy`).
- Nayo seulement : un plan `↓ + S` qui touche, puis arrière + BOOST (après `specialAntiAir`), sa distance mesurée par `tests/ai/plan-routes.test.ts`.
- Plus aucune ouverture ↓ + S pour Riff : elle rate (§1.3).

**CPU difficile, en défense, quand l'adversaire est armé** (de vrais leviers ; « pare ×1,5 » ne changeait presque rien, le difficile pare déjà à 0,85)
- Contre Riff armée : garde debout dès qu'elle quitte le sol, sans tirer la chance de parade (`guardInput` sait déjà parer debout un overhead).
- Contre Nayo armé : rester à plus de 75 px, et ne plus lancer de spécial à 80 px ou moins.

**CPU normal**
- Il ne lance jamais le Finisher (`SPEND.normal = 0` aujourd'hui).
- Il pare un peu plus contre un adversaire armé (×1,2, de 0,55 à 0,66).

**CPU facile** : il ne dépense rien et n'adapte rien.

**Cibles, figées par des tests** (à mesurer avec la règle finale)
- Au moins un Finisher par perso en 40 matchs difficiles.
- Jamais de BOOST impayable.
- Le Finisher conclut 15 à 35 % des matchs gagnés en difficile.
- Chaque perso garde 40 à 60 % de victoires.

### 1.12 Entraînement

**Option « Finisher »** (`config.trainingFinisher`)
- **Comme en match** (par défaut) : la balle de match est simulée. Il faut quand même 3 barres et un mannequin à 30 % ou moins au début du combo.
- **Toujours prêt** : 3 barres et de la place suffisent (voyants 2 et 4).
- **Désactivé** : arrière + BOOST reste la super, pour la travailler.

**Option « Vie du mannequin : 100 / 50 / 30 / 10 % »** (`config.trainingDummyHealth`)
- C'est la vie à laquelle le mannequin revient après 60 tics de repos (`trainingRefill`, en entiers).
- À 30 %, Nayo revient à 300 PV et Riff à 270 PV : exactement au seuil.
- L'option « Jauge » existante (normale, pleine ou infinie, pleine par défaut) suffit pour les barres.
- Les deux options entrent dans `Replay` et `replayConfig` (`tools/replays/replay.ts`), comme `trainingGauge`.

**Quand la dernière frappe touche le mannequin**
- Il reste à 1 PV (`minHealth`), mais l'événement `finisherBlow` part quand même.
- La scène se joue en version courte (§1.14), simulation figée.
- La jauge et la barre du mannequin éclatent, puis reviennent quand il se recharge.

**La ligne « Combo : N coups · D dégâts »** (`comboText`, 8 px par caractère, 480 px de large) ajoute « · FINISHER », ou une raison courte :
- « pas balle de match » ;
- « début > 30 % » ;
- « plus de place » ;
- « en l'air » (règle b) ;
- « 2 barres » ;
- « échange » (l'attaquant touché au même tic) ;
- « paré ».

La plus longue, « Combo : 12 coups · 1000 dégâts · pas balle de match », fait 51 caractères, soit 408 px. Avec « Toujours prêt » sur un mannequin à 100 %, la ligne montre les dégâts ordinaires de la super, pas la vie entière (environ 1 000).

**Le nom du coup en entraînement** (`move-caption.ts`) affiche « Le Quatre » ou « Larsen » à la place du nom de la super.

### 1.13 La jauge au KO : la règle finale

`KoFinish` passe à quatre valeurs : `'plain' | 'combo' | 'ultimate' | 'finale'`.
- L'actuel `'finisher'` devient `'ultimate'`, pour ne pas se confondre avec le coup `lightFinisher`. Les clés de `TRAUMA.ko` (`shake.ts`) suivent.
- La constante de texte `FINISHER = 'L, L, L'` (`data/texts/shared.ts`) est renommée `LIGHT_FINISHER`.
- La fonction devient `koFinishOf(tier, comboHits, finale)`.

| `KoFinish` | Critère exact | Jauge de Boost du perdant | Barre de vie du perdant | Voile (tâche 49) | Secousse (trauma) | Vibrations |
|---|---|---|---|---|---|---|
| `plain` : « dead normale » | coup final de palier < 3 et `comboCount` < 3, coup final compris (`COMBO_KO_HITS = 3`) | **normale** | normale | aucun | 0,85, soit 5,8 px du monde | — |
| `combo` : « enchaîné proprement » | palier < 3 et `comboCount` ≥ 3 (Remix compris) | **fissurée** en 30 tics (`CRACK_TICKS`), le Boost reste visible | fissurée (`BAR_CRACK_TICKS` 30) | vignette d'énergie, ΔL ≤ 0,08 | 0,92, soit 6,8 px | — |
| `ultimate` : « Ultime » | coup final = la super (palier 3), sans verrou | **éclatée** au contact (`BREAK_TICKS` 48) | éclatée (`BAR_BREAK_TICKS` 48) | l'éclat, ΔL ≤ 0,22 : le seul flash du KO | 1, soit 8 px | téléphone 180 ms, manette 260 ms |
| `finale` : « Finisher » | dernière frappe d'une super verrouillée | **éclatée sur la retombée** (Nayo : KO + 60 images, Riff : KO + 45) | idem | l'éclat sur la retombée, taille × 0,725 ; rien au contact | 0,6 au contact, 1 à la retombée ; décalage ÷ zoom, sur un seul axe (§4.4) | sur la retombée |

**Ce qui se passe ensuite**
- `plain`, `combo` et `ultimate` : la jauge revient entière au round suivant.
- `finale` : elle reste éteinte, le match est fini.

**Autres cas**
- Temps écoulé : les jauges restent normales.
- Double KO : chaque jauge suit son propre coup, et ce n'est jamais un `finale`.

**Fréquences mesurées aujourd'hui** (système A : CPU difficile contre CPU difficile, 80 matchs, 180 rounds)
- 59 % de KO normaux, 37 % fissurés, 4 % éclatés.
- L'éclatement reste rare, comme le veut le propriétaire.

### 1.14 Le déroulé commun après le KO (le contrat de mise en scène)

Un seul metteur en scène, `FinisherScene`, joue un script par perso (`FinisherScript`). Après le KO, les deux scènes sont identiques à 15 images près : le contretemps. t0 = l'image du KO.

| Phase | Durée | Ce qui s'y passe |
|---|---|---|
| Impact tenu | Nayo : t0 à t0 + 14. Riff : t0 jusqu'à la reprise | aplat d'énergie sombre, silhouettes, gros plan ×2,0 en 8 images, aucun flash ajouté. Le gel du cœur (22 tics) s'y consume sans rien montrer |
| Le temps de silence | jusqu'à la retombée | Nayo : la victime vole à 1/2 exact, en silence. Riff : image tenue, l'aiguille saute |
| La retombée R | Nayo : t0 + 60. Riff : t0 + 45, sur le contretemps | le seul éclat, les deux jauges et la barre du perdant éclatent, vibrations, le son revient |
| La suite | R à R + 30 | caméra de ×2,0 à ×1,0 en 30 images, pose de sortie ; chez Riff, le vol à 1/3 jusqu'à R + 57 |
| La carte | à partir de R + 30 | entrée en 4 images, immobile 60, sortie en 8 |
| Pose de victoire | 60 images | puis les résultats |

**Le temps : une piste de tics par image**
- La scène fait avancer la simulation elle-même, au pas de l'horloge visuelle. Pour chaque image, sa piste donne le nombre de tics à jouer :
  - 0 : image tenue ;
  - 1 toutes les 3 images : 1/3 ;
  - 1 toutes les 2 images : 1/2 ;
  - 1 : vitesse normale.
- Jamais d'échelle fractionnaire : chaque tic tient exactement 1, 2 ou 3 images, de façon régulière. D23 (pas d'interpolation) tient sans amendement. Choix : c'est l'option sûre et simple de la revue ; l'autre, interpoler le rendu après le KO, amenderait D23.
- **Le gel du cœur ne montre rien qui bouge** (`frozen` : ni position ni image d'animation ne changent). La scène peut en consommer jusqu'à 5 tics par image sans saccade. C'est ce qui cale les retombées.
- La piste remplace le ralenti du KO (`KO_SLOW_MOTION_FRAMES`, 50 images à 0,35), elle ne s'y ajoute pas.
- **Sous une image tenue, les effets vivent.** Gerbes, poussière, tampons, mots et dissolution des fx avancent déjà sur l'horloge visuelle (`FightFeedback.update`, `FxDissolve`). Seuls les corps, le HUD (qui suit `state.frame`) et la simulation sont figés.

**Les horloges**
- **La musique** (phase 5). combat-v2 §8.4 la cale sur `state.frame` : à l'échelle 0, elle se décalerait. Pendant la scène, la musique et sa grille des temps suivent l'horloge visuelle.
  - La scène coupe la musique au silence (Nayo : le frein après TROIS ; Riff : l'aiguille).
  - Elle la relance à la retombée, sur le « un » d'une mesure (Nayo) ou sur un contretemps (Riff). La retombée ne glisse donc jamais pour attendre la grille.
  - Avant TROIS, DEUX et TROIS de Nayo tombent sur les temps de la musique (§2.3).
- **Le budget de flashs** compte en images, pas en tics (§4.1).
- **Le HUD** garde `state.frame`. Son éclatement suit donc le ralenti, comme celui de l'Ultime suit aujourd'hui le ralenti du KO : chez Riff, ses 48 tics durent 19 × 3 + 29 = 86 images.

**Les règles du round ne bougent pas** : ni `ROUND_END_FRAMES`, ni `MATCH_END_FRAMES`, ni les replays. Après la carte, l'avance rapide de §1.10.

**Version courte** : à partir de la 2e fois dans la séance pour ce perso, avec l'option « Mise en scène : courte », et toujours en entraînement.
- Nayo : compte en croches naturelles, vol à ×1, retombée à t0 + 48.
- Riff : reprise à t0 + 45, vol à ×1, sans L'Ange.
- La carte dure 4 + 36 + 8 images, à partir de R + 12.
- 162 images (Nayo) et 153 images (Riff) depuis l'appui.

**Passer la scène**
- Seulement après le KO. Avant, rien ne se passe : le compte de Nayo dure 60 images.
- En local, les deux joueurs tiennent un bouton 15 images ; contre le CPU, le joueur seul. On compte en images, pas en tics : à l'échelle 0, les tics n'avancent plus.
- Pendant la scène, `FightScene` lit `PlayerInputs` à chaque image, même sans tic (aujourd'hui, elle ne lit les appareils que dans les images qui jouent un tic). La scène lit ces bits-là, aucun autre lecteur d'appareil.
- On saute aux 20 dernières images de la carte, puis à l'avance rapide.

**Le HUD reste entier**
- direction-hud §8.8 veut « le HUD visible tout du long » : on ne le baisse pas. Choix : c'est plus simple et plus sûr qu'un fondu de 12 images à la descente et à la remontée.
- L'annonce « K.O. » ne s'affiche pas pour un `finale` : la carte la remplace. À écrire dans direction-hud.

**Le son passe par un bus `fight`**
- Le `master` de `Sfx` est partagé avec les menus. Le silence et le passe-bas du casque ne le touchent pas : ils agissent sur un bus `fight` (un `GainNode` puis un `BiquadFilterNode`) entre les sons du combat et `master`. Les menus jouent sur `master`, intact.
- La scène pilote le bus image par image (`setValueAtTime` à chaque image), sans rampe programmée d'avance. La pause gèle donc tout, et le menu de pause garde ses sons. Choix : suspendre le contexte en pause couperait aussi ces sons.
- `dispose()` remet le gain à 1 et ouvre le filtre, qu'on passe la scène ou qu'on quitte.

**La caméra**
- Elle ne zoome que pendant le verrou et après le KO, quand plus personne ne contrôle son perso (règle des développeurs de KOF XIII). `FINISHER_CLOSE_UP = 2` ; `MAX_CLOSE_UP = 1,45` reste la limite pendant le jeu.
- ×2,0 n'apporte pas de netteté en soi : la caméra glisse déjà en continu (`frameFight`) et l'échelle CSS peut être fractionnaire (`computeZoom`).
- Les textes du monde (`stamps.ts`, `onomatopoeia.ts`, `move-caption.ts`) prennent leur résolution de `MAX_CLOSE_UP`. Pendant la scène, ils la prennent de `FINISHER_CLOSE_UP`.
- À ×2,0, l'image montre 240 × 135 px du monde, dont 115 au-dessus du sol (`GROUND_Y` = 230), et le HUD en couvre les 15 du haut. Un test vérifie que la victime au sommet de son vol (33 px pour la Mégabasse, 23 pour le Slam) reste dans le cadre.

**Les effets au gros plan** : tout effet de rendu tiré pendant le verrou ou après le KO (gerbe, tampon, éclats, l'éclat de la retombée) prend la taille × 1,45 / 2,0 = **× 0,725**. Sa surface à l'écran reste celle déjà validée au cadrage maximal du jeu. Seuls les fx de planche (anneaux, onde) gardent leur taille : ils sont mesurés au §4.3.

**La dissolution** (`docs/art/dissolution.md`)
- Les fx de la Mégabasse et du Slam se dissolvent déjà en 20 images, comptées en images : elle continue sous une image tenue.
- Elle ne part que sur une vraie disparition : le coup qui finit (sa dernière image d'effets se dissout entière), ou une image qui garde moins de la moitié des pixels de la précédente (`SHRINK`). Les anneaux qui roulent de s2 à s3 ne laissent pas de fantôme.
- La scène s'en sert sans code de plus :
  - Nayo, à QUATRE : s5 garde moins de la moitié des anneaux de s4 (245 à 541 px² contre 1 222 à 1 490) : ils se dissolvent en montant ;
  - Riff, à la reprise : le clip `finale` remplace le Slam, sa dernière image (l'onde) se dissout entière.
- Le liseré n'est jamais plus clair que le pixel qu'il remplace, et les morceaux sont toujours moins nombreux que les pixels qu'ils quittent : c'est un effet qui s'éteint, jamais un flash. Elle referme celui des anneaux.
- Les fx et leurs fantômes restent en couleur par-dessus les silhouettes.

**Décor** : les réactions du décor (phase 6) ne viennent qu'après le KO. La règle « aucune interaction de décor en combat » tient.

---

## 2. Le Finisher de Nayo : « Le Quatre »

### 2.1 Le fantasme

> Il compte. Un, deux, trois, en ligne droite, sur les temps. Puis il choisit le silence. Et le quatre, c'est l'autre qui tombe.

### 2.2 Pourquoi c'est Nayo

- **Ses mots** (histoire.md) : « Je compte jusqu'à quatre. Tu tombes sur le quatre. »
- **La scène 7, sa victoire** : « tout se fige, trois coups au sol ». C'est littéralement la Mégabasse, dont les trois frappes deviennent UN, DEUX, TROIS.
- **« Le silence, c'est moi qui le choisis. »** Après TROIS, la musique se tait.
- **Le casque** : il ne le met jamais en combat. Il le met à la fin de la scène, donc le combat est fini.
- **Son rôle** : il garde son identité. Il frappe en ligne droite, jamais de dos, et son Finisher reste un reversal invincible.
- **Une astuce de DJ** : QUATRE est aussi le « un » de la musique qui revient. Le compte de Nayo et le drop tombent sur la même image.

### 2.3 Storyboard

- t = images depuis l'appui, sans musique. [R] = pose réutilisée, [N] = pose nouvelle.
- Clip de la Mégabasse (47 tics) : s0 pendant 1 tic, s1 1, s2 3, s3 3, s2 3, s3 3, s4 3, s5 6, s6 7, s7 7, s8 5, s9 5. Les frappes tombent à f2 (s2), f8 (s2) et f14 (s4).
- Depuis la tâche 52 (PR #48), sur s2, s3 et s4, le bras arrière est balayé le long du dos, poing passé la hanche, un cran plus haut sur la 3e frappe. Ce sont les poses que la scène tient 24 à 60 images : elles sont définitives.
- Mesuré sur le cœur : depuis l'appui, les frappes tombent aux tics 22, 38 et 54. Le KO laisse 22 tics de gel, puis la victime vole 23 tics (sommet à 33 px) avant de toucher le sol.

| t | Moment | Nayo | Victime | Caméra, fond, VFX | Son |
|---|---|---|---|---|---|
| 0 à 20 | Appui, puis le gel de la super (20 tics) ; chrono arrêté | `super` s0 [R] : il presse l'écouteur | figée | comme la Mégabasse : `superDim`, halo platine, tampon « MÉGABASSE » | `super` (sub-drop) |
| 21 | f1 | s1 [R] | | | |
| **22** | **UN** : la 1re frappe touche, le verrou prend, la vie s'arrête au-dessus de 1 PV | s2 [R] : poing au sol, bras arrière le long du dos, 1er anneau « ) » | réaction du cœur [R] (`hitMid` en général) | Le tampon « LE QUATRE » (platine, Bangers) remplace « MÉGABASSE ». Tampon « UN ». Gerbe `pulse`. L'aplat `#0E3A46` monte en 8 images. | BOUM + note 1 (do, 262 Hz, onde carrée, 120 ms) |
| 22 à 46 | s2 tenu 24 images : 14 images tenues (0 tic), puis les 10 tics du gel à ×1 | s2 tenu : animation limitée | tenue | cadrage de jeu (×1,45 au plus) | — |
| 46 à 52 | f3 à f8 à ×1 | s3, puis s2 [R] | | | |
| **52** | **DEUX** | s2 [R] | réaction relancée [R] | tampon « DEUX », gerbe `pulse` | BOUM + note 2 (mi, 330 Hz) |
| 52 à 76 | s2 tenu 24 images, de même | s2 tenu | tenue | | |
| 76 à 82 | f9 à f14 : la charge, il descend plus bas | s3, puis s4 [R] | | gros plan vers ×2,0 en 8 images (atteint à t = 84) | souffle qui monte, 0,1 s |
| **82** | **TROIS : le KO**, la frappe mortelle | s4 [R] : 3e coup, plus bas, bras arrière un cran plus haut, « ))) » d'un coup, le sol se fend | `ko` [R], projetée (`kd(6, 2)`) | Silhouettes en 6 images : la victime en noir, Nayo en noir cerné de 1 px cyan (la ligne d'action se lit : poing au sol, bras le long du dos). Les anneaux s4 restent en couleur : c'est le flash de TROIS (§4.3). Cône de lumière froide sur Nayo (ΔL ≤ 0,05). Tampon « TROIS » (× 0,725). Gerbe `pulse` (× 0,725). Pas de sang. Secousse horizontale (trauma 0,6, décalage ÷ zoom). | `heavyHit` + note 3 (sol, 392 Hz) + sinus de 55 à 35 Hz sur 0,5 s ; puis un frein de 6 images |
| 82 à 96 | Impact tenu, 14 images : les 22 tics du gel s'y consument | s4 tenu | tenue | gros plan tenu | queue du sub |
| 96 à 142 | **Le silence**, 46 images | s4 tenu : il tient sa frappe, sans la regarder | vole à 1/2 exact (23 tics, 2 images chacun) | rien ne bouge, sauf elle | **silence complet** |
| **142** | **QUATRE : la retombée**, sur le temps (t0 + 60) | s5 [R] : il se relève | `koLanding` [R] : elle claque sur le dos | **L'éclat** cyan, ΔL ≤ 0,22, depuis le point de chute, taille × 0,725 (348 px). Les silhouettes partent en 12 images. Les anneaux s4 se dissolvent en montant (`rise`, jusqu'à 11 px) : le son s'évapore. La jauge et la barre du perdant éclatent. Secousse 1, décalage ÷ zoom. Vibrations. Poussière. Caméra de ×2,0 à ×1,0 en 30 images. | chute (`fall`) + cloche ×3 (t = 142, 157, 172) ; la musique repart sur le « un » (phase 5) |
| 142 à 172 | Retour en garde | s5 à s9 [R], 30 images (le poing au ciel de la Mégabasse, puis la garde) | au sol | | |
| 172 à 244 | **Le casque** | « Prise du casque » [N], 8 images, puis la boucle « Casque posé » [N] / « Tête qui bat » [N], 15 et 15 images, sur les temps | `ko` au sol | Carte **« QUATRE. »** : entrée en 4 images (172 à 176), immobile 60 (176 à 236), sortie en 8 (236 à 244) | le bus `fight` passe en passe-bas, de 8 kHz à 400 Hz en 20 images (le casque se ferme) ; clameur filtrée à t = 202 |
| 244 à 304 | Pose de victoire | boucle du casque | | | |
| 304 | Résultats (5,07 s depuis l'appui), après l'avance rapide | | | | |

**Le compte étiré**
- UN, DEUX et TROIS tombent sur des noires (30 images d'écart) au lieu des croches naturelles (16 tics).
- Après UN et après DEUX, la piste tient l'image 14 images (0 tic), puis joue le gel et le geste à ×1 : 14 + 10 + 6 = 30. C'est de l'animation limitée : des poses tenues, des gestes secs, chaque tic sur une image.
- C'est permis, puisque l'issue est verrouillée dès UN et qu'aucun joueur n'a plus la main.
- **Avec la musique** (phase 5) : DEUX tombe sur le premier temps au moins 16 images après UN (tenue de 0 à 29 images), et TROIS un temps plus tard (tenue de 14).
- **Repli**, si c'est mou au playtest : les croches naturelles (UN à t = 22, DEUX à 38, TROIS à 54).

**Le vol de la victime**
- Le rendu calcule à l'avance, sur une copie de l'état, le nombre N de tics de vol : au plus environ 40, à moins de 0,05 ms par tic. Mesuré : N = 23 pour une victime au sol au KO.
- La retombée R est le premier temps t0 + 30k (k ≥ 2) qui laisse un impact tenu H = 30k − 2N d'au moins 8 images. Pour N = 23 : k = 2, H = 14, R = t0 + 60.
- Une victime en l'air au KO (route ←+H : 36 px à la 3e frappe) vole plus longtemps. Si H tombe sous 8, QUATRE passe au temps suivant, t0 + 90.

### 2.4 Caméra

- **UN et DEUX** : le cadrage de jeu existant (`camera-framing.ts`, ×1,45 au plus).
- **La charge et TROIS** : ×2,0 en 8 images, en ralentissant, centré sur l'impact (le sol reste en bas de l'écran). Tenu pendant l'impact et le silence.
- **QUATRE** : retour à ×1,0 en 30 images, pour voir la chute entière puis la carte.
- **En mouvement réduit** : aucun zoom.

### 2.5 Fond et level design

**Aujourd'hui, sur le stage en boîte grise**
- L'aplat cyan sombre `#0E3A46` (luminance 0,036). Il est dessiné par la scène sous les combattants, pas par `Effects` (§4.2).
- Le cône de lumière froide qui tombe sur Nayo : un trapèze de 60 px du monde de large au sol, ΔL ≤ 0,05.
- L'aplat se dissout en 12 images après la carte.

**Quand L'Entrepôt existera (phase 6), après le KO seulement**
- Sur QUATRE, le mur d'enceintes pompe une fois, puis ses LED s'éteignent.
- En cabine, l'homme sans visage retire son casque pendant que Nayo met le sien : « le gagnant garde la cabine ».
- Le spot blanc sur la perdante, comme le prévoit la spec du KO de L'Entrepôt.

**Pour plus tard, pas dans la version 1**
- La plaque « Salle du Viaduc » et la rame de métro qui passe une fois, en un seul sens, sans faire trembler le décor.

### 2.6 VFX et palette

- **Énergie** : cyan `#30E8FF`. Tenue 2 : magenta `#FF4FC8`, avec l'aplat `#3A0E2E`.
- **Boost** : platine (`#FFFFFF`, `#F2F6FF`, `#C9D6E8`, liseré `#20243A`) pour les anneaux, les tampons et les éclats de jauge. Jamais l'or.
- **Les anneaux « ) »** sont ceux déjà dessinés dans la Mégabasse (fx avant). On ne les agrandit pas en rendu : c'est la caméra qui grossit. Ceux de s4 allument 1 222 à 1 490 px² monde à ΔL ≥ 0,10 : c'est un flash compté (§4.3).
- **Leur fin** : la dissolution de Nayo (`rise`), le haut d'abord, les morceaux qui montent.
- **Silhouettes** : `TintModes.FILL`, comme `boost-echo.ts`. Les fx restent en couleur.
- **Effets au gros plan** : × 0,725 (§1.14).

### 2.7 Typographie

- **Tampons « LE QUATRE », « UN », « DEUX », « TROIS »**
  - En Bangers, qui accepte les accents.
  - Remplissage cyan pour le compte, platine pour le nom, liseré `#20243A`.
  - 40 × 24 px du monde au plus pour le compte au cadrage de jeu (UN, DEUX) ; × 0,725 au gros plan (TROIS : 29 × 17 px), au-dessus du point d'impact.
  - Un seul mouvement d'entrée, puis immobiles, puis un fondu de 8 images.
- **Carte « QUATRE. »**
  - En tube néon : trait cyan de 2 px, âme platine de 1 px, liseré `#20243A`.
  - Environ 40 px du monde de haut, au-dessus de la victime au sol.
  - Au-dessus, « FINISHER » en petit, en Press Start 2P, en platine.
  - Elle entre d'un seul glissé de 8 px, puis ne bouge plus. Aucune lettre ne tremble.

### 2.8 Couches sonores

Tout est synthétisé en Web Audio, dans le modèle de `sfx.ts`.

| Son | Couches |
|---|---|
| UN, DEUX (`countStab`) | BOUM existant ; claque de cuir (bruit de 50 ms, passe-bas 1,5 kHz) ; note carrée de 120 ms, do 262 Hz puis mi 330 Hz : le compte monte |
| TROIS | souffle de bruit qui monte sur 0,1 s ; `heavyHit` ; note sol 392 Hz ; sinus de 55 à 35 Hz sur 0,5 s, volume 0,5 |
| `brake` | dent de scie de 180 à 20 Hz en 6 images, puis le gain du bus `fight` tombe à 0 : le silence |
| QUATRE | `fall` + `bell` ×3 à 15 images d'écart. Cloche : sinus de 1200 Hz sur 1,2 s (volume 0,25), plus 3312 Hz sur 0,6 s, plus 6480 Hz sur 0,25 s, frappe de bruit de 10 ms au-dessus de 8 kHz, décroissance exponentielle |
| Le casque | filtre passe-bas sur le bus `fight`, de 8 kHz à 400 Hz en 20 images, piloté image par image ; la clameur (bruit passe-bande à 500 Hz, 1,5 s) passe dessous |

Ces sons remplacent le son `ko` du KO ordinaire, ils ne s'y ajoutent pas.

### 2.9 Durées

| Version | De l'appui à la fin de la carte |
|---|---|
| Complète, sans musique | 244 images (4,07 s) |
| Complète, avec la musique (tenue après UN de 0 à 29 images) | 230 à 259 images (3,83 à 4,32 s) |
| dont la partie verrouillée avant le KO | 60 images (1,0 s), de UN à TROIS |
| Courte | 162 images (2,7 s) : croches naturelles, retombée à t0 + 48, carte de 48 images |

Repères : la super de 3rd Strike dure 2,9 s, les Critical Arts de SF6 environ 10 s (jugées trop longues). Le Finisher n'arrive qu'à la balle de match, donc au plus une fois par match.

### 2.10 Coût

- **Planche `finale`, 4 images** :
  - 1 image importée de `intro` : les mains au casque, autour du cou ;
  - 3 poses nouvelles :
    1. **« Prise du casque »** : il sort de la garde, les deux mains montent au casque autour du cou, les pouces sous les coques, et le soulèvent du col. Poitrine ouverte, menton droit, regard posé sur l'adversaire, sans sourire. Le pied avant reste celui de la garde.
    2. **« Casque posé »** : les coques sur les oreilles, les deux paumes qui les pressent (comme s0, mais à deux mains), la tête baissée de 10° sur le temps, les genoux qui donnent 1 px. L'anneau néon du casque est dans la couleur d'énergie.
    3. **« Tête qui bat »** : la même pose, tête relevée, genoux tendus. Elle boucle avec la précédente.
- **Le casque sur la tête est un nouveau mode d'attache.** `look.ts` dessine aujourd'hui le casque à une place fixe sur le col (`drawHeadphoneBand`, `drawHeadphones`, centre de la coque à `torso(26, 2)`). Les poses 2 et 3 demandent l'arceau sur la tête, une coque sur chaque oreille, et un ordre de calques avec `stampHead` et les cheveux.
- **Le clip `finale`** est une pose de round optionnelle dans `FighterClips` (comme `victory`). Sans elle, on joue `victory`.
- **Tout le reste est réutilisé** : la Mégabasse s0 à s9 (dans leur dessin de la PR #48) et ses fx.
- **Côté victime** : 0 image (réaction du cœur, `ko`, `koLanding`).
- **Estimation** : 0,5 à 1 jour-agent d'art pour les deux persos, plus une passe de revue par le propriétaire ; environ 1 h de sons par perso.

---

## 3. Le Finisher de Riff : « Larsen »

### 3.1 Le fantasme

> Elle plonge de la scène et retombe rangers en avant. L'aiguille saute, comme l'an dernier. Un temps de silence, une éternité. Puis tout L'Entrepôt saute avec elle, sur son temps à elle.

### 3.2 Pourquoi c'est Riff

- **Son but** (histoire.md) : « que tout L'Entrepôt saute sur son temps à elle, une fois ». Le Finisher le réalise à la lettre.
- **La scène 8, sa victoire** : « elle plonge dans la foule et en retombe rangers en avant, une onde au sol, puis freeze sur une main, la jambe au ciel, clin d'œil ». C'est le Slam, puis son `victory`.
- **Le clash de l'an dernier** : sa ranger a fait sauter l'aiguille de Nayo. « Un temps de silence. Dans un clash, c'est une éternité. »
- **La chaîne d'argent** « claque une demi-seconde après elle » : 30 images après l'impact, c'est le seul son dans le silence.
- **Le contretemps** : elle frappe entre les temps de Nayo. Sa reprise arrive à t0 + 45, un temps et demi après le KO, 15 images avant celle de Nayo.
- **Son rôle** : elle garde son identité. Le Slam est une fin de combo, un overhead sans invincibilité. Riff n'a toujours pas de reversal gratuit au sol.
- **Le nom** : le larsen, c'est le hurlement de l'ampli qu'on bouscule, le cri des concerts punk. C'est un mot français du métier du son.

### 3.3 Storyboard

- t = images depuis l'appui, sans musique (avec la musique, rien ne bouge : elle repart sur un contretemps à la reprise).
- Clip du Slam (46 tics) : s0 pendant 2 tics, s1 3, s2 5, s3 2 (le gel à f10), s4 4 (1re frappe à f12), s5 4 (2e frappe à f16), puis s6 8, s7 9, s8 9.
- Mesuré sur le cœur : depuis l'appui, les frappes tombent aux tics 32 et 48. Le KO laisse 22 tics de gel, puis la victime vole 19 tics (sommet à 23 px).

| t | Moment | Riff | Victime | Caméra, fond, VFX | Son |
|---|---|---|---|---|---|
| 0 à 10 | Appui : charge, décollage, bond vers la foule. Le chrono tourne | `super` s0 à s2 [R] | joue encore : peut parer debout | — | — |
| 10 à 30 | Le gel au sommet du plongeon (20 tics), chrono arrêté | s3 [R] | figée | comme le Slam : `superDim`, halo platine, tampon « SLAM » ; les projecteurs virent au magenta (phase 6) | `super` |
| 31 à 32 | Le piqué | s3, puis s4 | | | |
| **32** | **1re frappe** : armée et touchée, la victime au sol, le verrou prend ; vie arrêtée à 1 | s4 [R] : bottes sur la poitrine | réaction du cœur [R] | Le tampon « LARSEN ! » (platine, Bangers, incliné de −6°) remplace « SLAM ». Gerbe `pulse`. L'aplat `#4C0B44` monte en 8 images. | accord saturé de mi + grosse caisse |
| 33 à 47 | Gel de 12 tics, puis f13 à f15 : elle descend avec lui, à ×1 (plus sec que Nayo) | s4 [R] | | | accord de sol à t = 40 |
| **48** | **2e frappe : le KO**, le stomp | s5 [R] | `ko` [R] (`kd(5, 2.5)`) | Silhouettes en 6 images : la victime en noir, Riff en noir cernée de 1 px magenta. ×2,0 en 8 images. L'onde au sol du Slam (fx s5). 8 éclats argent en losange de 5 × 5 px (ses clous), × 0,725. Gerbe `pulse` × 0,725. Poussière. Pas de sang. Secousse **verticale** (trauma 0,6, décalage ÷ zoom). **Aucun flash.** | grosse caisse (sinus de 140 à 45 Hz, 180 ms), crash (bruit au-dessus de 6 kHz, 400 ms), l'accord de la qui sonne |
| 48 à 93 | **L'image tenue**, 45 images (0,75 s) : les 22 tics du gel s'y consument, puis 0 tic | s5 tenu | tenue | les corps sont figés ; les débris de la gerbe et la poussière vivent encore | |
| **66** | **L'aiguille saute** | | | une rayure argent de 1 px du monde traverse l'aplat en diagonale, tracée en 6 images ; elle reste jusqu'à la reprise | `needleSkip`, puis coupure nette du son |
| 78 | | | | | la chaîne claque, seule |
| *(84)* | *Variante rival, si la victime est Nayo : l'aiguille saute une 2e fois, au même endroit* | | | la rayure se retrace sur elle-même | `needleSkip` |
| **93** | **La reprise**, sur le contretemps (t0 + 45) | « Rebond » [N], 12 images, de 0 à 28 px | `ko` reprend et vole, à 1/3 exact | L'aplat se dissout en 12 images, les silhouettes partent. **L'éclat** magenta, ΔL ≤ 0,22, × 0,725. L'onde s'éparpille le long du sol (dissolution `scatter`). La jauge et la barre du perdant éclatent. Vibrations. Secousse verticale 1, décalage ÷ zoom. La foule saute une fois, toute ensemble. Caméra de ×2,0 à ×1,0 en 30 images. | `crowdJump` (le boum des pieds + « HEY ! ») + l'accord complet ; la musique repart sur son contretemps (phase 5) |
| 105 à 115 | **L'Ange**, au sommet du rebond | « L'Ange » [N], tenue 10 images | vole | 2 rémanences platine (`boost-echo`) | un larsen très bas qui monte |
| 115 à 150 | Vrille avant **sur place**, puis réception, à 1/3 | `jumpForward` f2 à f4 [R], puis `jump` f5 [R] ; arc vertical, sans recul | vole, puis `koLanding` [R] à t = 150 (19 tics × 3 = 57 images après la reprise) | | |
| 123 à 195 | La carte | | | **« T'AS RATÉ UN TEMPS. »** contre Nayo, **« SUR MON TEMPS. »** contre une autre (miroir, persos à venir) : entrée en 4 images (123 à 127), immobile 60 (127 à 187), sortie en 8 (187 à 195) | |
| 150 → | Freeze, retour à ×1 | `victory` [R] : freeze sur une main, la jambe au ciel, clin d'œil | au sol | | le larsen revient (t = 150 à 180, −18 dB au plus) |
| **194** | **Coupure de courant**, une image avant la fin de la carte (« coupe au noir une image trop tôt », scène 8) | | | le décor tombe à 40 % en 4 images (une baisse seule) ; spot blanc sur le perdant (ΔL ≤ 0,08) | `powerCut` |
| 195 à 255 | Pose de victoire | | | | |
| 255 | Résultats (4,25 s depuis l'appui), après l'avance rapide | | | | |

- Riff garde la cadence naturelle de ses deux frappes : 16 images, une croche.
- Toute la durée du Larsen est dans l'après-KO : l'image tenue, puis la reprise.
- **Une seule chronologie** : la victime et Riff touchent le sol sur la même image, R + 57. La descente de Riff dure ce qui reste du vol de la victime après Rebond et L'Ange (57 − 22 = 35 images) ; le vol est calculé à l'avance, comme chez Nayo.
- **Pourquoi 45 images d'image tenue** : au-delà de 0,8 s, sur téléphone, une image figée se lit comme un plantage. Choix : descendre sous 0,8 s est l'option la plus simple et la plus sûre (aucun élément à ajouter). Les effets qui vivent déjà sur l'horloge visuelle animent le début de la tenue.

### 3.4 Caméra

- **Avant le contact** : aucun zoom. Le coup peut encore être paré.
- **Au KO** : de ×1,0 à ×2,0 en 8 images, en ralentissant, centré sur l'impact.
- **Pendant l'image tenue** : aucun mouvement. L'immobilité est l'effet.
- **À la reprise** : retour à ×1,0 en 30 images, pendant le ralenti.
- **Secousse** : verticale pure, parce que c'est un coup qui tombe du ciel. `Shake` reçoit un axe (§4.4). Le décalage est divisé par le zoom.

### 3.5 Fond et level design

**Aujourd'hui, en boîte grise**
- L'aplat magenta sombre `#4C0B44`. Tenue 2 : `#6A420C`.
- **La foule, en attendant la phase 6** : deux rangées de silhouettes noires dessinées par le code (`crowd.ts`, environ 80 lignes), en bas de l'aplat. Elles sautent une fois, ensemble : 6 px en 4 images, puis retour en 8 images.
- Le contraste reste faible (noir sur aplat sombre, ΔL ≈ 0,02) : ce n'est ni un motif ni un flash.

**Quand L'Entrepôt existera (phase 6), après le KO seulement**
- La vraie foule saute, en une image de saut groupé.
- Les membranes du mur d'enceintes pompent une fois.
- L'enseigne néon grésille, puis s'éteint.
- Le DJ se tient le casque, en une image.

### 3.6 VFX et palette

- **Énergie** : magenta `#FF3CA0`, sur la rampe `#4C0B44`, `#8E1468`, `#B81E7C`, `#E04A9E`.
- **Éclats** : argent `#D8E0EC` (ses clous, sa chaîne), 8 losanges de 5 × 5 px, × 0,725 au gros plan.
- **L'onde** (fx s5) : 318 à 350 px² monde à ΔL ≥ 0,10, sous le seuil même à ×2,0 (§4.3). Sa fin, à la reprise : la dissolution de Riff (`scatter`), les bouts les plus loin de ses pieds d'abord, éparpillés le long du sol (jusqu'à 15 px).
- **Boost** : platine pour les tampons et l'éclatement de la jauge. Jamais l'or.
- **Tenue 2** :
  - énergie or `#FFC83A`, aplat `#6A420C` ;
  - éclats cramoisis `#E0283C`, **toujours petits** : c'est un rouge saturé (§4.2) ;
  - le Boost reste platine.

### 3.7 Typographie

- **Tampon « LARSEN ! »** : en Bangers (`boostStamp`), platine, incliné de −6°.
- **Carte en lettres découpées, façon fanzine punk**
  - Chaque lettre en Bangers sur son propre rectangle de papier.
  - Les angles viennent d'une table fixe, jamais du hasard : −6, 4, −3, 7, −5, 2, −4, 5 degrés, en boucle.
  - Papiers noirs et magenta sombre, lettres platine et argent, une agrafe argent de 2 × 2 px par mot.
  - Au-dessus, « FINISHER » en petit, en Press Start 2P, en platine.
  - Entrée d'un bloc en 4 images (un claquement, 1 px de dépassement), puis immobile. Aucune lettre ne tremble.

### 3.8 Couches sonores

| Son | Couches |
|---|---|
| `powerChord` (mi, sol, la) | 2 dents de scie désaccordées de ±7 cents, plus la quinte ; saturation par `WaveShaperNode` en écrêtage dur ; passe-bas à 2,8 kHz ; attaque du médiator (bruit passe-bande à 3 kHz, 15 ms) |
| Impact | grosse caisse (de 140 à 45 Hz, 180 ms) ; crash (bruit au-dessus de 6 kHz, 400 ms) ; l'accord qui sonne |
| `needleSkip` | un clic, puis un bruit passe-bande balayé de 3 kHz à 600 Hz en 60 ms ; puis le gain du bus `fight` tombe à 0 sur l'image suivante |
| `chain` | 3 partiels métalliques (2,1, 3,4 et 5,2 kHz, 80 ms), en 3 clics espacés de 25 ms, joués sur `master` sous le bus coupé |
| `crowdJump` | le boum des pieds qui retombent (bruit passe-bas à 80 Hz, 250 ms) ; un « HEY ! » (bruit sur deux formants, 700 et 1200 Hz, 150 ms) ; l'accord, plus fort |
| `larsen` | sinus à 2,4 kHz, vibrato de 5 Hz, gain qui monte sur 18 images ; plafond à −18 dB et passe-bas à 3 kHz : fort, jamais douloureux |
| `powerCut` | sinus de 60 à 30 Hz (250 ms), puis un ronflement de 50 Hz qui s'éteint en 0,5 s |

**Sans le son**, la rayure et l'image tenue suffisent à faire sentir le silence. Rien de jouable n'en dépend.

### 3.9 Durées

| Version | De l'appui à la fin de la carte |
|---|---|
| Complète, avec ou sans musique | 195 images (3,25 s) |
| dont la partie verrouillée avant le KO | 16 images |
| dont l'image tenue | 45 images (0,75 s) |
| Courte | 153 images (2,55 s) : reprise à t0 + 45, vol à ×1, Rebond puis réception sans L'Ange, carte de 48 images à R + 12 |

### 3.10 Coût

- **Planche `finale`, 6 images**, dont 4 importées : `jumpForward` f2 à f4, `jump` f5.
- **2 poses nouvelles** :
  1. **« Rebond »** : elle saute de la poitrine. Genoux groupés, poing arrière levé haut, bras avant jeté pour l'équilibre, frange dressée, bouche ouverte sur un cri.
  2. **« L'Ange »** : au sommet. Dos cambré, bras en croix, blouson ouvert en ailes (le bas du blouson dessiné large), frange au ciel, chaîne qui flotte au-dessus de l'épaule, tête en arrière. C'est la pose héroïque : une seconde passe est probable.
- **La vrille est avant, sur place.** `jumpForward` est un salto avant (`tools/sprites/riff/poses/jumpForward.ts`, de 22° à 340°) : jouée en reculant, elle se lirait à l'envers. L'arc de rendu est donc vertical, sans recul. Choix : c'est l'option sans planche nouvelle ; un salto arrière demanderait une planche de plus.
- **La hauteur** vient d'un arc de rendu fourni par le metteur en scène : de 0 à 28 px du monde en 12 images, tenu 10, puis retour au sol en 35 avec la vrille, sur la réception de la victime. Les poses restent ancrées aux pieds.
- **Le clip `finale`** est une pose de round optionnelle. Sans elle, on joue `victory`.
- **Côté victime** : 0 image.
- **Estimation** : comprise dans les 0,5 à 1 jour d'art du §2.10 ; environ 1 h pour les sons.

---

## 4. Sécurité photosensible

### 4.1 La règle et ses chiffres

**Une seule règle : celle de `flashs.md` §1.1, mesurée sur l'image affichée.**
- **Luminance** : une variation de luminance relative ΔL ≥ 0,10, mesurée en mélange sRGB comme WebGL (`luminance.ts`).
- **Surface** : 1 200 px² monde au pic, toutes pièces de la même image additionnées, jusqu'au cadrage maximal du jeu (×1,45, soit 2 520 px² de la vue 480 × 270, 70 % du seuil du W3C).
- **Au-delà de ×1,45**, la même surface affichée : 2 520 / zoom² px² monde, soit **630 px² monde à ×2,0**. Le seuil de 40 × 40 = 1 600 px² de la v1 est retiré.
- **Rouge saturé** : `redRatio ≥ 0,8` sur les canaux linéarisés (`SATURATED_RED`). Une paire de transitions sur un rouge saturé compte, quelle que soit sa luminance.

**Le budget** (`flash-budget.ts`, `flashs.md` §4, à livrer dans la PR 0)
- Un seul budget pour les deux joueurs, sur la surface affichée.
- Au plus 3 flashs par seconde glissante, dont 2 ordinaires et 1 réservé au climax (KO, dernière frappe d'une super) ; au plus 8 sur 5 s.
- **Il se compte en images de `visualClock`, pas en tics** : à l'échelle 0, les tics n'avancent plus. `flashs.md` §4 écrit « une fois par tic » : à corriger.
- Un flash refusé s'étouffe : gerbe sans flash, fx de planche choisi sombre, mot et tampon décalés.
- La v1 redéfinissait le budget (3 sur 60 tics) : c'est retiré, le Finisher passe par le budget commun.

**Pour le Finisher**
- Le registre part du **1er coup du combo**, pas de l'appui : les H, H d'avant jouent des gerbes lourdes avec clé flash.
- Le Quatre : 3 flashs comptés au plus ; Larsen : 2. À 30 images d'écart au moins, jamais 2 climax dans la même seconde.
- En phase 5, les frappes du compte ne prennent pas le « flash un peu plus grand » des coups sur le temps (combat-v2 §8.5).

### 4.2 Les couleurs mesurées

Mesures faites sur le stage en boîte grise : ciel `#1B1B2F` (L = 0,012), sol `#3A3A5C` (L = 0,047).

**Aplats plein écran : aucun n'est un flash**

| Aplat | ΔL contre le ciel / contre le sol |
|---|---|
| Nayo `#0E3A46` | +0,023 / −0,011 |
| Nayo, tenue 2, `#3A0E2E` | +0,002 / −0,033 |
| Riff `#4C0B44` | +0,010 / −0,025 |
| Riff, tenue 2, `#6A420C` | +0,058 / +0,023 |
| Noir du silence `#06090D` | −0,010 / −0,044 |

**Alpha maximal d'une lueur, selon la limite de ΔL visée**

| Couleur | ratio rouge | ΔL ≤ 0,08 (lueur, non comptée) | ΔL ≤ 0,22 (l'éclat, compté) |
|---|---|---|---|
| Cyan `#30E8FF` | 0,02 | 0,27 | 0,54 |
| Magenta de Nayo, tenue 2, `#FF4FC8` | 0,60 | 0,47 | 0,85 |
| Magenta de Riff `#FF3CA0` | 0,72 | 0,53 | 0,92 |
| Or de Riff, tenue 2, `#FFC83A` | 0,62 | 0,28 | 0,56 |
| Platine `#F2F6FF` | 0,32 | 0,21 | 0,43 |

**Les rouges saturés**
- Le cramoisi `#E0283C` a un ratio rouge de **0,92**. Il ne doit jamais servir de voile ni de grand flash : seulement de petits éclats.
- Les gouttes de sang (`blood.ts`) sont `#7A0F1A`, `#B81D2B` et `#E8384A` : ratio 0,88 à 0,93. Le KO en lance 9 (`BLEEDS.ko`) ; au gros plan ×2, leur surface serait quadruplée. **Pas de sang au KO d'un `finale`.**
- La traînée de la barre de vie, `#B80200` (ratio 1,00), est dans le HUD : le zoom ne la grossit pas. Ses éclats retombent avec ceux de la barre, sur l'image de l'éclat (§4.3).

**Ce que fait le code à `1080923`** (tâche 49, étape 1)
- Super : mise au noir `#0C0614`, alpha ≤ 0,55, ΔL ≤ 0,08 ; halo platine de 128 px, ΔL 0,2 au cœur, flash sur 560 à 944 px² monde (sous 1 200).
- KO : aucun voile pour `plain`, une vignette ΔL ≤ 0,08 pour `combo`, l'éclat de 480 px (ΔL 0,22 au cœur) pour une super.
- `COLOR_GAP = 60` (`effects.ts`) : un voile d'une autre couleur à moins de 60 images du précédent est ignoré.
- **L'aplat du Finisher n'est pas un voile d'`Effects`** : la scène le dessine sous les combattants. Il suit la mise au noir de 22 images ; dans `Effects`, `COLOR_GAP` l'ignorerait. Il reste sous ΔL 0,06, jamais un flash. L'éclat de la retombée, lui, passe par `Effects` : il tombe 83 images (Riff) et 142 images (Nayo) après la mise au noir.
- Chaque voile prend son alpha de sa couleur et de celle du décor (`alphaForDelta`), jamais d'une opacité fixe.

### 4.3 Le registre des flashs

Mesuré au vrai zoom (scripts au bas de la page). Les fx de planche sont comptés en pixels allumés à ΔL ≥ 0,10 contre le ciel et le sol (2 pixels de planche par pixel du monde).

**Le Quatre** (route `L, L, H, H, arrière + BOOST` ; t depuis l'appui)

| t | Événement | Surface affichée | ΔL | Compté |
|---|---|---|---|---|
| avant 0 | gerbes lourdes des deux H (clé flash) | gerbe lourde | > 0,10 | jusqu'à 2, ordinaires : le budget décide |
| 0 à 20 | `superDim` + halo platine | plein écran ; halo 560 à 944 px² monde | ≤ 0,08 ; 0,2 en local | 0 |
| 22, 52 | gerbes `pulse`, tampons UN et DEUX (≤ 40 × 24 px), anneaux s2 et s3 (509 à 774 px² monde), à ×1,45 au plus | sous 1 200 px² monde | — | 0 |
| 22 à 30 | aplat `#0E3A46` | plein écran | +0,023 / −0,011 | 0 |
| 82 | TROIS : anneaux s4 (1 222 à 1 490 px² monde, jusqu'à 4 900 à 6 000 px² de vue à ×2,0), silhouettes (une baisse), cône ≤ 0,05, tampon et gerbe × 0,725 | au-dessus du seuil | > 0,10 | **1**, climax |
| 142 | QUATRE : l'éclat × 0,725 (zone ≥ 0,10 : 5 450 à 7 550 px² monde, 17 à 23 % de l'image, comme l'éclat de l'Ultime à ×1,45), retour des silhouettes, fin des anneaux, éclatement de la jauge et de la barre | plein cadre | ≤ 0,22 | **1**, climax |
| 172 | carte « QUATRE. » | environ 160 × 40 px de vue | > 0,10 | **1**, par prudence |

- Les anneaux s4 dépassent 1 200 px² monde à tout zoom : TROIS reste un flash, même avec la gerbe `pulse` et sans sang. Dans la super ordinaire, ils tombent sur la même image que la grosse gerbe et l'éclat : un seul flash. Le budget de la PR 0 doit compter les fx de planche.
- Sans gros plan réduit, l'éclat de 480 px à ×2,0 couvrirait 33 à 44 % de l'image (10 350 à 14 350 px² monde), le double de l'Ultime. D'où la taille × 0,725. Choix : c'est plus simple et plus sûr que d'attendre que la caméra revienne à ×1,45, ce qui décalerait le flash du temps.
- **Bilan** : 3 comptés, à 60 puis 30 images d'écart. TROIS et QUATRE sont à 60 images : jamais dans la même seconde. Au plus 2 par seconde (QUATRE et la carte : 1 climax, 1 ordinaire). Sur 5 s, avec les deux H : 5 sur 8.

**Larsen** (route `H, arrière + BOOST`)

| t | Événement | Surface affichée | ΔL | Compté |
|---|---|---|---|---|
| avant 0 | gerbe du H de Riff | déjà sous le seuil (`hit-fx.ts`) | — | 0 |
| 10 à 30 | `superDim` + halo | idem | idem | 0 |
| 32 à 40 | tampon « LARSEN ! », aplat `#4C0B44` | sous 1 200 px² allumés ; plein écran | — ; +0,010 / −0,025 | 0 |
| 48 | KO : silhouettes (une baisse), onde s5 (318 à 350 px² monde, soit 1 270 à 1 400 px² de vue à ×2,0, sous 2 520), 8 éclats argent et gerbe × 0,725 | sous le seuil | — | 0 |
| 66 | rayure de l'aiguille | 1 px | — | 0 |
| 93 | **reprise** : l'éclat magenta × 0,725, silhouettes, jauges | plein cadre | ≤ 0,22 | **1**, climax |
| 123 | carte | environ 220 × 44 px | > 0,10 | **1** |
| 194 | coupure de courant, puis spot | plein écran ; spot | une baisse seule, −0,03 ; ≤ 0,08 | 0 |

**Bilan** : 2 comptés, à 30 images d'écart.

### 4.4 Ce qui remplace les flashs

Le gel, l'aplat de couleur, les silhouettes, le gros plan ×2,0, le silence, le compte, la rayure, la foule, la dissolution et le son.

**Interdits**
- tout voile blanc ou platine plein écran au-dessus de ΔL 0,08 ;
- deux couleurs qui alternent d'une image à l'autre (le schéma de Porygon) ;
- un rouge saturé qui varie en grand, et le sang au gros plan ;
- plus de 5 paires de bandes contrastées, ou des bandes qui changent de sens. Les lignes de vitesse dérivent dans un seul sens. Le plateau vinyle qui tourne a été écarté ;
- un texte qui tremble ;
- un zoom ou une secousse pendant que les joueurs ont la main.

**Secousse** (modèle de `shake.ts` : `MAX_SHAKE = 8` px du monde × trauma²)
- Contact : trauma 0,6, soit 2,9 px. Retombée : trauma 1, soit 8 px.
- **On divise le décalage en pixels par le zoom, pas le trauma.** L'amplitude suit trauma² : diviser le trauma par 2 diviserait l'amplitude par 4. À ×2,0 : 1,4 et 4 px du monde, soit 2,9 et 8 px de la vue, la force d'un KO à ×1,0.
- **`Shake` reçoit un axe.** Aujourd'hui, `kick` vise y = −0,4 et `update` applique y = amplitude / 2 : il n'existe pas de secousse verticale pure. Nayo : horizontale (y = 0) ; Riff : verticale (x = 0).

### 4.5 Les options

- **« Effets de flash : normaux / réduits / aucun »** (PR 0)
  - Réduits : l'éclat est borné à ΔL 0,08 ; les anneaux s4 prennent le fx de planche sombre (`flashs.md` §4). Plus aucun flash compté hors de la carte. La carte entre en fondu de 8 images.
  - Aucun : pas d'éclat. Une désaturation de 60 % remplace les silhouettes. La carte est en argent sur une plaque sombre (ΔL < 0,10).
- **« Tremblement : normal / réduit / aucun »** (PR 0) : réduit divise la secousse par 2.
- **« Mise en scène : complète / courte »** (§1.14).
- **`prefers-reduced-motion`** :
  - ni zoom, ni secousse, ni éclats ;
  - les aplats en fondu de 12 images ;
  - la carte apparaît sans glisser ;
  - la foule reste immobile ;
  - la dissolution éteint ses pixels sur place ;
  - le son, inchangé, porte la scène.

---

## 5. Mise en œuvre

### 5.1 Cœur (pur, en entiers, déterministe)

- **`src/core/finisher.ts`** (environ 90 lignes) :
  - la constante `FINISHER_DANGER_PERCENT = 30` ;
  - `inDanger(fighter, maxHealth)` ;
  - `finisherState(state, player, config)`, qui renvoie `'ready' | 'blocked' | 'off'` ;
  - `finisherReady(...)`, avec la règle d'état (b) ;
  - `finisherLocked(state, player, config)`, la définition du §1.6.
- **`state.ts`** :
  - `FLAG_DANGER = 64`, ajouté à `VICTIM_FLAGS` ;
  - `FLAG_FINISHER = 128`, effacé par `startAttack` comme `FLAG_MOVE_HIT`.
- **`combat.ts`, `applyHit`** :
  - pose ou retire `FLAG_DANGER` quand `comboCount` vaut 1, d'après la vie d'avant le coup (il reçoit `maxHealth`), et après `flightOf`, qui réécrit les drapeaux ;
  - nouveau mode de dégâts, `finisher: 'floor' | 'lethal' | null` : `floor` arrête la vie à 1 au moins, `lethal` la met à `minHealth`.
- **`step.ts`** :
  - calcule `armed` pour les deux joueurs, une fois par tic, et le passe à `updateFighter` comme `discOut` ;
  - `startGroundMove` pose `FLAG_FINISHER` sur la super si le joueur est armé ;
  - au premier contact de la super, après avoir trouvé toutes les frappes du tic : le verrou prend si la frappe touche, si l'attaquant n'est pas touché sur ce tic, et si les voyants 3 et 4 tiennent ; sinon `FLAG_FINISHER` tombe ;
  - `struck` choisit le mode de dégâts selon que la frappe est la dernière ou non ;
  - pendant le verrou : aucune frappe de la victime, aucun projectile sur la paire (`canBeHit` faux, comme pour une prise).
- **`round.ts`** : le chrono ne décompte pas tant que `finisherLocked` est vrai.
- **`config.ts`** : ajout de `trainingFinisher` et `trainingDummyHealth`. **`training.ts`** : `trainingRefill` prend le pourcentage de vie. **`tools/replays/replay.ts`** : les deux champs dans `Replay` et `replayConfig`.
- **Validation** (`validate-boost.ts`) :
  - la dernière frappe de chaque super met au sol, pour que le KO tombe sur un grand coup ;
  - le Finisher n'a aucune donnée à lui.
- **Entrées** : rien dans le cœur en version 1. L'option « Ultime en un appui » (§1.3) viendra plus tard.
- **Pas de nouveau `MoveId`** : ni `OPTIONAL_KINDS`, ni `MOVE_ORDER`, ni clip de coup.
- **Coût en temps** : une fonction par tic, environ 15 comparaisons d'entiers, aucune allocation, moins de 0,05 ms par tic.

### 5.2 Rendu

- **`fight-events.ts`**
  - `KoFinish` : `'plain' | 'combo' | 'ultimate' | 'finale'`, avec `koFinishOf(tier, comboHits, finale)`.
  - Deux nouveaux événements :
    - `finisherLock { by, name, x, y }` au 1er contact verrouillé ;
    - `finisherBlow { by, x, y, away }` sur la dernière frappe, en match comme en entraînement.
- **`shake.ts`** : les clés de `TRAUMA.ko` suivent `KoFinish` ; `kick` prend un axe ; le décalage se divise par le zoom.
- **`fight-feedback.ts`**, pour un KO `finale` :
  - la gerbe `pulse` au lieu de `hitFx.play(style, 'ko')` (sa 1re clé est un flash, 86 px) ;
  - pas de sang (`BLEEDS.ko`) ;
  - ni voile, ni secousse, ni ralenti, ni son `ko` : le metteur en scène s'en charge.
- **`finisher-scene.ts`** (environ 300 lignes) : le metteur en scène.
  - La chronologie et la piste de tics par image (§1.14) ; le calcul du vol à l'avance.
  - Les silhouettes, l'aplat (dessiné par la scène, hors `COLOR_GAP`) et l'éclat sur la retombée (`ECLAT_DELTA`, taille × 0,725).
  - Le forçage de la caméra, l'appel à `Hud.knockOut` sur la retombée, les sons et le bus `fight`, le passage de la scène.
  - Des pools, et `dispose()` qui rend le bus et la caméra.
- **`finisher-scripts.ts`** (environ 120 lignes) : `FinisherScript` par perso. Il contient :
  - le nom et les tampons ;
  - `stretchBlows` (les tenues après UN et DEUX) ;
  - `silence: 'flight' | 'hold'` ;
  - la retombée (`beat` pour Nayo, `offbeat` pour Riff) ;
  - les aplats pour les deux tenues ;
  - la carte (texte, variante rival, style `'neon' | 'cutout'`) ;
  - l'axe de la secousse et les sons.
- **`finisher-card.ts`** (environ 150 lignes) : les deux styles de carte, avec la table d'angles fixe.
- **`crowd.ts`** (environ 80 lignes) : la foule en silhouettes de Riff, en attendant la phase 6.
- **`camera-framing.ts`** : `FINISHER_CLOSE_UP = 2`, un forçage utilisé seulement pendant le verrou et après le KO.
- **`stamps.ts`, `onomatopoeia.ts`, `move-caption.ts`** : la résolution des textes prend le zoom de la scène.
- **`boost-gauge.ts`** : `FINISH_WORD`, les états `ready` et `blocked`, `GAUGE_WIDTH = WORD_X + 48`.
- **`hud.ts`** :
  - le HUD reste entier ;
  - l'annonce « K.O. » supprimée pour un `finale` ;
  - en entraînement, la casse reste jusqu'à la recharge du mannequin ;
  - la raison courte de la ligne Combo.
- **Le halo au sol** se dessine dans la vue du perso.
- **Le bouton tactile** : `touch-controls.ts` (`showFinisher`, lecture d'arrière à 35° à l'appui de BOOST quand FINISH est allumé) et `styles.css` (`.finisher`).
- **`fight-scene.ts`** :
  - pendant la scène, la simulation avance par la piste de la scène, et `PlayerInputs` est lu à chaque image ;
  - les résultats attendent la fin de la scène, puis l'avance rapide jusqu'à `matchEnd` (boucle dédiée, §1.10).
- **`sprite-fighter-view.ts`** : le metteur en scène peut imposer une image tenue, le clip `finale` et un arc de rendu ; la dissolution suit sans changement.

### 5.3 Art

| Perso | Planche | Images | Nouvelles | Réutilisées |
|---|---|---|---|---|
| Nayo | `finale` | 4 | « Prise du casque », « Casque posé », « Tête qui bat » | 1 image de `intro` ; dans la scène : la Mégabasse s0 à s9 |
| Riff | `finale` | 6 | « Rebond », « L'Ange » | `jumpForward` f2 à f4, `jump` f5 ; dans la scène : le Slam s0 à s5, `victory` |

- **Le casque de Nayo sur la tête** est un nouveau mode d'attache dans `look.ts` : arceau sur la tête, deux coques sur les oreilles, ordre de calques avec `stampHead` et les cheveux (§2.10).
- **La tâche 52 est livrée** (PR #48, `afcde98` sur main) : les poses s2 et s4 que la scène tient sont définitives. La PR 4 part de main. Vérifier avant qu'aucune des tâches 53 et 54 ne touche la Mégabasse ni le Slam.
- Les deux tenues et les tons platine sont générés automatiquement (`npm run sprites`).
- Une pose de round optionnelle `finale` s'ajoute dans `FighterClips`, avec repli sur `victory`.
- Des tests de planche, comme pour les autres.
- **Une passe de revue par le propriétaire** est prévue, surtout pour L'Ange et le casque.
- **Côté victime : 0 image.**
- Les tampons, les cartes, les aplats, les silhouettes, la rayure, le cône et la foule sont **du code**, pas des planches.
- **Coût** : 0,5 à 1 jour d'art.

### 5.4 Sons

Nouvelles entrées `SoundName` :
- commune : `finisherReady` ;
- Nayo : `countStab`, `bell`, `brake` ;
- Riff : `powerChord`, `needleSkip`, `chain`, `crowdJump`, `larsen`, `powerCut`.

Le moteur `sfx.ts` doit apprendre :
- le bus `fight` (gain et filtre entre les sons du combat et `master`), piloté image par image, remis à zéro par `dispose()` ;
- le balayage de filtre ;
- le `WaveShaperNode` ;
- les boucles.

Estimation : environ 1 h pour le moteur, environ 1 h par perso.

### 5.5 IA

- `PlanCondition.finisher` dans `plans.ts`. Les ouvertures sont les plans existants `L, H, H, arrière + BOOST` et `H, arrière + BOOST`, pesés ×4 quand le CPU est armé ; plus un plan ↓ + S pour Nayo.
- La défense contre un adversaire armé se règle dans `defense.ts` et `cpu.ts` : garde debout dès que Riff armée quitte le sol, distance de plus de 75 px contre Nayo armé.
- `reversal()` ne change pas.
- Les cibles du §1.11 sont re-mesurées avec la règle finale.

### 5.6 Aide

**Une entrée dans `BASICS`** (sans capitale accentuée) :

> « Finisher : en balle de match, avec 3 barres, quand l'adversaire est à 30 % ou moins (barre orange) au début de ton combo, le mot FINISH remplace MAX. Arrière + BOOST lance alors ta super en Finisher : même départ, mais si elle touche, le match est fini. Parée ou ratée, c'est une super parée ou ratée. Contre un Finisher : tu vois le gel et tu n'attaques pas, pare. »

**Sur chaque page de perso**
- Une phrase de plus dans le texte de la super.
- Une ligne de combo de démonstration :
  - Nayo : `L, L, H, H, arrière + BOOST (FINISH allumé)`, avec « Le Quatre : un, deux, trois, et l'adversaire tombe sur le quatre. »
  - Riff : `H, arrière + BOOST (FINISH allumé)`, avec « Larsen : l'aiguille saute, un temps de silence, et toute la salle saute sur ton temps. »

**Les docs à mettre à jour**
- combos-v3 §1.8.6 : les quatre sortes de KO.
- combat-v2 : la décision **D24** ; §8.4 (pendant la scène, la musique suit l'horloge visuelle) ; §8.5 (pas de flash plus grand sur le compte).
- direction-hud : la plaque FINISH, le HUD entier pendant la scène, la carte à la place de « K.O. » pour un `finale`.
- `docs/flashs.md` : le registre du Finisher, le budget compté en images, les fx de planche à compter (les anneaux s4 de la Mégabasse).

### 5.7 Options de l'application

- L'écran Options n'existe pas : il est créé par la PR 0, avec « Effets de flash » et « Tremblement », mémorisées comme le réglage du son (`localStorage`), accessibles depuis la pause et appliquées à chaud.
- La PR 3 y ajoute « Mise en scène ».
- En entraînement : « Finisher » et « Vie du mannequin », dans le menu d'entraînement, à côté de « Jauge ».

### 5.8 Tests (une phrase chacun)

1. **Prédicat** : `finisherReady` suit sa table de vérité (balle de match, jauge, seuil au début du combo, place, `FLAG_LIMIT`, `FLAG_BOUNCE`, victime en l'air pour le Slam), pour J1 et J2.
2. **Prise du verrou** : il ne prend ni sur une frappe parée, ni si l'attaquant est touché sur ce tic, ni si la victime a sauté pendant le bond du Slam.
3. **Garantie** : sur la matrice des routes, à 24, 36 et 48 px, au milieu et au coin, pour J1 et J2, si la 1re frappe verrouillée touche, toutes touchent.
4. **Frappe mortelle** : les frappes d'avant arrêtent la vie à 1 PV, la dernière met à 0, en miroir J1 et J2.
5. **Fin sans KO** : la victime écartée à la main après la 1re frappe garde sa vie (≥ 1), `finisherLocked` repasse à faux et le chrono repart.
6. **Échanges** : deux Mégabasses au même tic (96 PV chacune, aucun verrou), Slam contre jab au même tic, Vinyle qui touche l'attaquant au tic du 1er contact.
7. **Paire intouchable** : un Vinyle en vol traverse la paire verrouillée, et le chrono ne bouge pas du 1er contact au KO.
8. **Paré ou raté** : 3 barres perdues, −16 ou −15, chip de 45 ou 43 PV qui ne tue jamais, aucune autre pénalité.
9. **Plafonds** : les tests `infinite*` (45 % et 50 %) et les dégâts de combat-v2 §7.8 ne changent pas.
10. **Données** : la super armée et la super ordinaire ont les mêmes données, et la dernière frappe de chaque super met au sol.
11. **`koFinishOf`** : il rend les quatre valeurs selon le palier, le compte de coups et le verrou ; un double KO n'est jamais un `finale`.
12. **HUD** : FINISH tient en 48 px, ne touche ni le disque ni la piste du Crossfader, ne clignote jamais, et suit l'état du prédicat.
13. **Tactile** : `.finisher` change le fond et la couleur par rapport à `.full`, arrière se lit jusqu'à 35° quand FINISH est allumé, et la grappe de `touch.test.ts` ne change pas.
14. **Contrat de scène** : durées, chaque tic tenu exactement 1, 2 ou 3 images, retombées à t0 + 60 et t0 + 45, carte en 4 / 60 / 8, victime dans le cadre à ×2,0, passage compté en images et seulement après le KO, avance rapide jusqu'à `matchEnd` sans événement, `dispose()` qui rend le bus `fight` sans fuite.
15. **Flashs** : la chronologie, depuis le 1er coup du combo et au vrai zoom, passée au `FlashBudget`, donne au plus 3 flashs (Le Quatre) et 2 (Larsen), à 30 images d'écart au moins, jamais 2 climax en 60 images, aucun aplat ni aucune lueur « non comptée » à ΔL ≥ 0,10, aucun voile en rouge saturé et pas de sang au gros plan.
16. **Entraînement** : le mannequin reste à 1 PV, `finisherBlow` part, la scène courte se joue, la ligne Combo dit la raison d'un refus en 480 px au plus, et « Toujours prêt » affiche les dégâts ordinaires.
17. **IA** : au moins un Finisher par perso en 40 matchs difficiles, jamais de BOOST impayable, 15 à 35 % des matchs gagnés conclus par un Finisher, et chaque perso entre 40 et 60 % de victoires.
18. **Aide** : chaque texte fait plus de 20 caractères, pas de capitale accentuée en Press Start 2P, et `MOVE_ORDER` reste égal à `MOVE_IDS`.
19. **Replays** : les 29 hachages ne bougent pas, et `finisher.json` rejoue un Finisher en entraînement.

### 5.9 Replays

- `flags` fait partie de `FIGHTER_FIELDS`. `FLAG_DANGER` ne change l'état que d'un combo commencé sur une victime à 30 % ou moins.
- **Mesuré : aucun des 29 replays ne bouge.** Aucun combo n'y part d'une victime à 30 % ou moins (le plus bas, `ko.json`, part de 53 %), et aucune super n'y est armée (les 5 contacts de super de `boost.json` partent d'une victime à 100 %).
- On ajoute `finisher.json` : en entraînement, option « Toujours prêt », un Finisher verrouillé, la frappe mortelle arrêtée à 1 PV, `finisherBlow`.

### 5.10 Ordre des PR

| # | PR | Contenu | Estimation |
|---|---|---|---|
| 0 | Flashs, étapes 2 et 3 (**prérequis**, à faire d'abord) | `flash-budget.ts` (compté en images de `visualClock`, sur la surface affichée, fx de planche compris) ; écran Options (« Effets de flash », « Tremblement ») ; persistance comme le son ; accès depuis la pause, appliqué à chaud ; avis au premier lancement ; drapeaux `flashes` et `motion` du HUD | 0,5 à 1 jour |
| 1 | Finisher : cœur | `finisher.ts`, drapeaux, verrou (prise, échanges, paire intouchable, fin), frappe mortelle, chrono, renommage de `KoFinish` et de `FINISHER`, options d'entraînement dans `Replay`, `finisher.json`, tests 1 à 11 et 19 | 1 jour |
| 2 | Finisher : signal | FINISH, `.finisher`, lecture d'arrière à 35°, halo, sirène, tests 12 et 13 | 0,25 jour |
| 3 | Finisher : mise en scène | `finisher-scene.ts`, piste de tics, horloges, bus `fight`, avance rapide, passage, caméra et textes à ×2,0, effets × 0,725, `Shake` à axe, scripts, cartes, foule, option « Mise en scène », tests 14 et 15 (avec les poses de repli) | 0,75 à 1 jour |
| 4 | Finisher : art et sons | casque de Nayo (nouvelle attache) et 3 poses, 2 poses de Riff, revue du propriétaire ; 10 sons, moteur `sfx.ts`. Part de main, après la tâche 52 (livrée) | 0,75 à 1,25 jour |
| 5 | Finisher : CPU, entraînement, aide | plans, défense, options d'entraînement, textes, docs, D24, re-mesure de l'IA, tests 16 à 18 | 0,5 jour |

Total : environ 4 à 5 jours-agent. C'est une estimation, pas une mesure.

---

## 6. Décisions du propriétaire

Le 30 octobre 2026, le propriétaire a pris le défaut des six choix (« Prends le défaut »).

1. **La règle du KO armé** : celle de la v1.
   - FINISH s'allume si l'adversaire était à 30 % ou moins au début du combo (`FLAG_DANGER`).
   - Les frappes d'avant s'arrêtent à 1 PV (`floor`), la dernière prend toute la vie (`lethal`).
   - La variante « FINISH seulement si la super tue déjà » est écartée. Elle n'apportait aucun gain de dégâts, et FINISH pouvait s'éteindre au milieu d'un combo.
2. **Le seuil** : 30 %, celui de la barre orange (`FINISHER_DANGER_PERCENT = 30`).
3. **UN, DEUX, TROIS** : sur des noires, avec 14 images tenues après UN et DEUX. Les croches naturelles restent la version courte.
4. **Les anneaux de TROIS** : en couleur, comptés comme un flash. Le Quatre en compte 3, Larsen 2.
5. **Les noms et la plaque** : « Le Quatre » pour Nayo, « Larsen » pour Riff, et la plaque FINISH (48 px, `GAUGE_WIDTH` = 174). « Le Quatre » côtoie « Les Quatre temps » de l'aide de Nayo : le compte et le combo parlent du même quatre.
6. **D24 est inscrite** au journal des décisions (`docs/combat-v2.md`) : le Finisher n'est pas une Fatality.

---

*D'où viennent les chiffres* : de mesures faites sur le vrai cœur, hors dépôt (simulations de CPU, routes, verrou et échanges, vol après le KO, fenêtres d'annulation, surfaces des flashs au zoom, luminances, replays). Chaque PR de mise en œuvre les fige en tests (§5.8).
