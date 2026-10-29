# NayosBeat — Combat v2 : spécification finale

> **Statut** : spécification de référence pour M8.1 à M8.6. Elle remplace les trois propositions de travail (écoles Street Fighter, Mortal Kombat, Little Fighter) et retient, point par point, ce que les trois revues ont jugé le meilleur.
> **Base** : HEAD `e9fb5b2`. Le cœur (`src/core`), les données, les entrées, l'IA et l'app sont décrits tels qu'ils sont dans ce commit.
> **Unités** : durées en **tics** (60 par seconde), distances en **px monde** (le code stocke ×100 via `px()`).
> **Boîtes** : `x a..b / y c..d` = de a à b px devant le centre du combattant tourné vers la droite, de c à d px au-dessus de ses pieds.
> **Avantage** : formule du moteur, coup qui touche sur son 1er tic actif : `stun + 1 − (actif + récupération)`.
> **Mise au sol (KD)** : la victime vole puis reste 40 tics au sol. Avec la gravité de coup commune (0,5 px/tic², §3.9) et une levée de V px/tic, elle retombe au tic `L = 4·V − 1` (V 2 → 7, V 2,5 → 9, V 3 → 11, V 3,5 → 13, V 5 → 19). Avantage KD = `L + 41 − (actif + récupération)`.
> **Mesures** : arcs de saut, courbes de dash et portées de cross-up ont été calculés avec l'arithmétique entière du moteur (scripts `scratchpad/combat/final/cross.mjs` et `curves.mjs`). Chaque valeur chiffrée de ce document devient un test.

---

## 0. En une page

### 0.1 Ce que le joueur a demandé, ce que la v2 répond

| Demande | Réponse v2 | § |
|---|---|---|
| « C'est quoi l'onde ? » | L'Onde sonore devient le **Vinyle** : Nayo lance un disque de lumière cyan qui tourne et file à hauteur de poitrine. Un objet qu'on voit voler, dessiné exactement à la hauteur de sa hitbox. Chaque spécial a un nom qui dit ce qu'il fait, une forme d'effet unique, et une phrase d'aide par personnage. Le piège « ↓↘→ + S ne donne jamais l'onde » disparaît. | 5, 17 |
| « Il manque des coups direction + touche » | **→+L, →+H, ←+H** pour chaque personnage, et la chaîne **L, L, L** avec un coup final qui met au sol. Grammaire unique : « L → H → S. Ou L, L, L. » | 5 |
| « Les coups bas ne touchent pas visuellement » | Hurtbox calées sur le dessin (±1,5 px, testé au pixel). Étincelles au **vrai point d'impact**, calculé par le cœur. Réactions haut / milieu / bas / fauché. Poussière au sol. Test automatique « contact visible » pour chaque coup bas. | 9 |
| « Un poil plus de variété dans les sprites » | Environ 115 nouvelles images pour Nayo (dashs, coups de direction, prise, réactions selon la hauteur, chute fauchée, relevé), et Riff entièrement illustrée (environ 265 images). | 11 |
| « Des compteurs de combos » | Le compteur en cours (`combo-counter.ts`) est finalisé, avec les étiquettes **CONTRE** / **PUNITION**, une traînée de vie blanche, des onomatopées BD et une note de musique qui monte à chaque coup. | 7.8 |
| « Un bouton prise : lancer ou tabasser » | Bouton **PRISE** sur tous les appareils : saisir, **tenir**, **tabasser** (L), **lancer devant** (H, S ou PRISE) ou **derrière** (← + H, S ou PRISE). La victime peut **se dégager** au tout début ou **se débattre** pour écourter. Lancer automatique si le joueur ne choisit rien. | 4 |
| « Gaffe aux hitbox » | Règles écrites et testées : portée dessinée = portée réelle, plus aucune portée invisible, tableau des portées figé en test, vue debug complète. | 9, 10 |
| « Chaque perso son style, ses forces, ses faiblesses » | **Nayo** : contrôle, portée, Vinyle, Uppercut invincible. **Riff** : vitesse, dash annulable, Glissade sous le Vinyle, deux overheads, cross-up ; 900 PV, pas de reversal au sol. Riff, la punk de Zen-Tazzer, frappe en **magenta et argent**. | 6 |
| « Pense au dash (bouton ou double direction) » | **Les deux**, sur tous les appareils : double-tap avant/arrière **et** bouton **DASH**. Dash de Nayo 56 px en 18 tics. Dash de Riff 64 px, annulable en coup ou en prise avec élan. Backdash qui évite les prises mais pas les coups. | 2, 3 |
| « Plus fluide, plus rapide, robuste » | Marche +20 à 25 %. Sauts plus secs (32 et 28 tics au lieu de 37 et 34). Buffer de 6 tics qui garde aussi saut et dash. Garde de proximité. Cross-ups possibles. Stick tactile corrigé (sauts involontaires, faux dashs, appuis perdus à 30 i/s). | 2, 3 |
| « Inspiré mais original » | **Le Crossfader** : une table de mixage entre les barres de vie. Prendre l'initiative tire le curseur vers soi et la musique bascule sur son thème. Curseur plein : **DROP** sur le temps fort suivant. Aucun bouton, aucune précision rythmique demandée. | 8 |
| Level design | **L'Entrepôt** d'abord (120 BPM), puis Le Toit et La Cour du Temple. Même largeur partout, coins marqués, décor qui bat au tempo sans jamais gêner la lecture. Salle d'entraînement graduée. | 12 |
| DRY, KISS, SOLID, YAGNI, pas de fuite, pas de souci de perfs | Un module par concept, cœur pur et déterministe, données déclaratives, aucune allocation qui grandit, pools côté rendu, contrats `dispose()` testés, banc de perfs, replays dorés, mode endurance. | 14 |

### 0.2 Journal des décisions

| # | Décision | Origine | Pourquoi |
|---|---|---|---|
| D1 | Dash = **double-tap ET bouton DASH**, partout | sf, mk, lf | Le double-tap est la norme ; le bouton est indispensable au tactile (stick flottant, lecture à 30 i/s) |
| D2 | Dash et backdash sont des **coups de type `movement`** (MoveData) | sf | Buffer, validation des clips, lecture par l'IA et tests de frame data gratuits (DRY) |
| D3 | Mouvement par frame en données (`RootMotion`) à la place de `advance` | sf | Un seul mécanisme pour dashs, avancées, Saut de l'ange aérien |
| D4 | **S lit d'abord les manips**, avec une règle de « manip fraîche » | mk + revue tactile | ↓↘→ + S donne enfin le Vinyle, sans sortie accidentelle quand le pouce passe d'accroupi à la marche |
| D5 | **Aucun bonus de dégâts** pour les manips | mk | Le tactile est la plateforme principale : un bonus serait une pénalité mobile |
| D6 | Pas de quart de cercle arrière (QCB) | lf + revue tactile | Il sort par accident quand le pouce glisse de ↙ (garde basse) à ← |
| D7 | **Pushbox aérienne surélevée** : cross-ups possibles sur un adversaire debout | mk, lf | Plus d'expression en neutre ; la portée est figée par test |
| D8 | Seule **Riff** a un coup qui touche derrière elle en l'air | sf | Identité : Nayo joue franc, Riff joue l'ambiguïté |
| D9 | Hurtbox **calées sur le dessin**, une boîte par bande verticale | lf | KISS ; mesuré au pixel, pas deviné |
| D10 | `GameState.contacts` = **source unique** des étincelles, réactions et événements | lf | Le rendu cesse de deviner ; zéro allocation quand rien ne touche |
| D11 | Prise : tenue limitée par le **temps**, **lancer automatique** si on ne choisit rien | lf | Simple, sûr pour un débutant qui appuie une fois |
| D12 | **PUNITION** : une prise sur un adversaire en récupération ne se dégage pas | lf | Récompense lisible du « whiff punish » |
| D13 | Le coup bat la prise sur un même tic ; deux prises = dégagement | sf, mk, lf | Pierre-feuille-ciseaux classique |
| D14 | **Jongle à points** après un lanceur (←+H) : 4 points (5 en CONTRE), chaque coup en l'air en coûte, la limite de 12 coups ferme tout (combos v3, `docs/combos-v3.md` §1.5, §1.7). C'était un seul coup en l'air | lf, combos v3 | Du contenu pour les combos et le compteur, sans boucle : les points, le prolongateur unique et la limite bornent la jongle |
| D15 | CONTRE sur le premier coup seulement (+20 %, +4 de hitstun, +3 de hitstop) | sf, mk | Récompense la lecture sans gonfler les combos |
| D16 | Dégâts en garde (chip) : spéciaux seulement, 15 %, jamais mortels | sf | Le zoning a du poids sans devenir odieux |
| D17 | Mécanique signature = **Crossfader** (sans bouton) ; le tempo reste **cosmétique** | sf + revues | Pas de bonus « en rythme » : injuste selon l'appareil (latence tactile, Bluetooth) |
| D18 | Le Remix du DROP **ne touche jamais au timing** (type qui l'interdit) | mk | Les clips restent valides, aucun art en plus |
| D19 | Pas d'air dash, pas de double saut, pas de course, pas de roulade au réveil | sf, mk | Lisibilité sur téléphone ; l'annulation du dash de Riff donne l'élan sans nouvel état |
| D20 | Riff frappe en **magenta et argent** (tenue 2 : or et cramoisi) ; c'était violet et jaune avant qu'elle devienne la punk de Zen-Tazzer (phase 4) | sf, mk, lf | Nayo est cyan : les deux joueurs se distinguent d'un coup d'œil ; le magenta est celui de sa frange |
| D21 | Flashs au plus 3 par seconde, option « Flashs réduits » | revue tactile (WCAG 2.3.1) | Accessibilité photosensible |
| D22 | Textes d'aide **hors du cœur** (`data/move-texts.ts`) | mk | Le cœur ne porte pas de présentation |
| D23 | Pas d'interpolation des personnages entre deux tics | sf, mk | La fluidité vient de l'animation et de la réactivité, pas d'une latence de 16 ms |

---

## 1. Piliers et emprunts

### 1.1 Cinq piliers (ils tranchent chaque décision)

1. **Lisible en une seconde sur un téléphone.** Silhouette, couleur, son et nom racontent la même chose. Chaque règle a un retour visuel.
2. **Des bases nerveuses et justes.** Ce que le joueur demande sort au premier tic possible ; ce qu'il ne demande pas ne sort jamais.
3. **Les boîtes ne mentent pas.** Ce qui touche est ce qui est dessiné, à 1,5 px près, et c'est testé sur les PNG.
4. **Une action = un appui** (direction + bouton au plus). Tous les appareils sont égaux ; aucune manip n'est obligatoire ni plus forte.
5. **La musique est le monde.** Le décor, le HUD et le DROP vivent au tempo du stage ; le gameplay ne demande **jamais** de jouer en rythme.

### 1.2 Ce qu'on prend aux meilleurs

| Jeu | Ce qu'on retient | Ce que ça devient dans NayosBeat | Ce qu'on laisse |
|---|---|---|---|
| Street Fighter 6 | Dash net, backdash punissable, garde de proximité, dégagement de prise, contrôles simplifiés, CONTRE et PUNITION | Pas chassé de Nayo, backdash anti-prise mais frappable, `guard`, direction + S, CONTRE / PUNITION | La jauge Drive (le Crossfader la remplace) |
| Guilty Gear Strive | Élan conservé, bouton Dash, récompense de l'attaque | Dash annulable de Riff avec 50 % d'élan, bouton DASH, gains du Crossfader quand on avance | Course maintenue, Roman Cancel |
| King of Fighters XV | Sauts vifs, rythme rapide | Sauts plus courts et plus secs ; saut bas de Riff | Petits sauts, roulades |
| Tekken | Précision des déplacements, membres et hauteurs | Courbes par frame exactes, Glissade sous les coups hauts | Pas de côté (3D) |
| Mortal Kombat | Coups de commande lisibles, impacts lourds, lanceurs | →H, ←H, lanceur ←H avec une jongle | Fatalities, chaînes à apprendre par cœur |
| Little Fighter 2 / Smash | Saisir puis frapper l'adversaire tenu, lancers directionnels, se débattre, « L, L, L » | Prise tenue, tabassage, lancers ←/→, lutte, chaîne L, L, L | Pourcentages, éjections |
| Under Night In-Birth | Le tug-of-war du GRD (on gagne en prenant l'initiative) | **Le Crossfader**, exprimé par la musique et la table de mixage | La jauge de super et le Veil Off |
| Hi-Fi Rush | Un monde qui bat au tempo | Décor, foule, HUD et KO calés sur le BPM | Le bonus d'appui en rythme |

---

## 2. Entrées

### 2.1 Boutons logiques (`src/core/input.ts`)

| Logique | Bit | Rôle |
|---|---|---|
| Up / Down / Left / Right | 1, 2, 4, 8 | Inchangé (SOCD : gauche + droite = neutre, haut + bas = haut) |
| Jump | 16 | Saut (haut saute aussi) |
| Light | 32 | Coup léger (L) |
| Heavy | 64 | Coup lourd (H) |
| Special | 128 | Spécial (S) |
| **Grab** | **256** (`1 << 8`) | **PRISE**. L + H ensemble reste un alias (règle actuelle de `pressedButton`) |
| **Dash** | **512** (`1 << 9`) | **DASH** : dash vers l'adversaire, backdash si arrière est tenu. Le double-tap fait la même chose |

`PRESS_BUTTONS = ~DIRECTIONS` (`player-inputs.ts`) couvre déjà les nouveaux bits : la suppression des boutons tenus en sortie de menu s'applique sans changement.

### 2.2 Clavier (positions physiques : AZERTY d'abord, QWERTY entre parenthèses)

| Action | Joueur 1 | Joueur 2 (pavé) | Joueur 2 (portable) |
|---|---|---|---|
| Directions | Z Q S D (W A S D) | Flèches | Flèches |
| Saut | Espace, Z | ↑ | ↑ |
| L / H / S | J / K / L | Pavé 1 / 2 / 3 | `.` `/` `'` (`;` `!` `ù`) |
| **PRISE** | **I** (au-dessus de K), ou J + K | **Pavé 4**, ou 1 + 2 | **`;`** (M en AZERTY) |
| **DASH** | **Maj gauche**, ou double-tap | **Pavé 0**, ou double-tap | **Maj droite**, ou double-tap |
| Pause | Échap, P | — | — |

Le dash va à la main des déplacements ; PRISE est sous le majeur, au-dessus des coups.

### 2.3 Manette (mapping standard W3C)

| Action | Bouton |
|---|---|
| Directions | Croix ou stick gauche, avec **hystérésis** : direction prise à 0,5, relâchée sous 0,35 (le stick qui tremble au bord ne fabrique plus de faux double-taps) |
| Saut | A / Croix (0) |
| L / H / S | X / Carré (2) · Y / Triangle (3) · B / Rond (1) |
| **PRISE** | **RB / R1 (5)** : devient un vrai bit Grab au lieu de la macro L + H. X + Y reste un alias |
| **DASH** | **LB / L1 (4)** |
| Pause | Start (9) |

LT, RT, Select, L3, R3 et le stick droit restent libres (remappage et provocation plus tard). L'hystérésis vit dans `gamepad.ts` (état précédent par manette), jamais dans le cœur.

### 2.4 Tactile (joueur 1)

**Décision : un bouton DASH visible par défaut, et le double-tap du stick qui marche aussi.**
- Un double-tap au stick flottant (zone morte 12 px, centre qui suit le doigt) demande de revenir dans la zone morte puis d'en ressortir en moins de 200 ms : faisable, mais aléatoire.
- Les appareils sont lus une fois par image affichée. À 30 i/s, un relâchement plus court qu'une image disparaît et le dash ne sort pas.
- Un backdash sous pression doit sortir à 100 %. Avec le bouton, la direction vient du stick : arrière + DASH = backdash.
- Le « flick » façon Smash (dash si le stick part vite) est écarté : il déclenche des dashs en marchant.

**Grappe de droite** (centres en px CSS depuis le coin bas-droit, `env(safe-area-inset-*)` ajouté partout). Les centres de L, H, SAUT et S ne bougent pas (mémoire musculaire), PRISE prend la place de CHOPE, DASH est le seul nouveau bouton.

```
            rangée haute (centre à 126 du bas)   [DASH]   [ S ]   [PRISE]
            rangée basse (centre à 52 du bas)  [ L ]   [ H ]   [SAUT]
```

| Bouton | Centre (droite, bas) | Diamètre | Couleur et icône | Rôle |
|---|---|---|---|---|
| L | 200, 52 | 68 | blanc, « L » | coup léger |
| H | 126, 52 | 68 | orange, « H » | coup lourd |
| SAUT | 52, 52 | 60 | vert, flèche ↑ | saut |
| S | 163, 126 | 64 | couleur d'énergie du perso (cyan Nayo, magenta Riff), « S » | spécial |
| **PRISE** | 89, 126 | 60 | or, icône main | prise, lancer, dégagement |
| **DASH** | 237, 126 | 56 | bleu, double chevron « » » | dash ; stick en arrière + DASH = backdash |

- Écarts entre bords voisins de 6 à 16 px. Le bord le plus éloigné est à 265 px du bord droit : dans la zone du pouce, même sur un iPhone SE en paysage (moitié droite de 333 px).
- **Zones de toucher** : rayon visible + 8 px (cible ≥ 48 dp). Là où deux zones se chevauchent, **le centre le plus proche gagne**. Un seul écouteur `pointerdown` sur la zone droite fait ce test, au lieu d'un écouteur par bouton (moins d'écouteurs, aucun conflit).
- **Retour d'appui** : échelle 0,92 et bord éclairé, posés par `classList` **seulement quand l'état change**.
- **Vibration** (Android, réglage « Vibrations », actif par défaut) : 30 ms quand on est saisi (le signal du dégagement arrive dans la main), 15 ms sur un coup lourd reçu. Vibration à chaque appui : option, désactivée par défaut.
- **Stick** :
  - zone morte avec hystérésis : direction prise à 12 px, relâchée sous 8 px ;
  - **haut** plus exigeant, pour supprimer les sauts involontaires en marchant ou en gardant : haut si `ny < −0,5` (plus de 30° au-dessus de l'horizontale) **et** course ≥ 18 px (relâché sous 14 px). Les diagonales de saut à 45° marchent toujours ;
  - les autres directions gardent les 8 secteurs de 45° (`sin 22,5°`) : garde basse généreuse ;
  - **verrou de neutre** : si le stick est passé par le neutre depuis la dernière lecture, `read()` rend une fois des directions à 0, puis l'état réel à la lecture suivante. Un double-tap n'est plus perdu sur un téléphone à 30 i/s ;
  - `followFinger` réutilise un objet point au lieu d'en allouer un à chaque mouvement.
- `bitsFromStick(dx, dy, state)` et `nearestButton(x, y, layout)` sont des fonctions pures, testées. La disposition est une donnée (`src/input/touch-layout.ts`) testée en géométrie pure : aucun chevauchement visible en 667×375 et en 844×390.

### 2.5 Lecture des commandes (`src/core/commands.ts`, extrait de `fighter.ts`)

```ts
export type Command = 'light' | 'heavy' | 'special' | 'grab' | 'dash' | 'backdash' | 'jump';
```

- **Front montant** seulement (bouton nouvellement appuyé), comme aujourd'hui.
- **Priorité sur un même tic** : Prise (bit Grab, ou L/H pressé avec L + H tenus) > S > H > L > dash/backdash > saut.
- **Buffer à une case**, la dernière commande gagne. `INPUT_BUFFER_FRAMES` passe de 5 à **6** (100 ms, pour la latence tactile). Le buffer garde, comme aujourd'hui, la direction tenue, la manip et l'orientation au moment de l'appui. Il ne vieillit pas pendant le hitstop.
- **Le buffer garde aussi le saut et le dash.** Un appui SAUT, un front montant de haut, un appui DASH ou un double-tap fait jusqu'à 6 tics avant la fin d'une récupération, d'une garde ou d'un atterrissage sort au premier tic libre. Tenir haut fait toujours sauter.
- **DASH** : à l'appui, arrière tenu donne `backdash`, sinon `dash` (neutre, avant, haut ou bas).
- La conversion « L + H tardif » en Prise pendant les 3 premiers tics d'un normal qui n'a pas touché est conservée.

### 2.6 Double-tap (O(1), sans parcourir l'historique)

Trois champs d'état : `tapDirection` (−1, 0 ou 1, en coordonnées du stage), `tapFrames` (âge du premier tap), `tapReleased`.

```
À chaque tic hors hitstop (pendant le hitstop, rien ne vieillit) :
  d = direction horizontale PURE de l'entrée (gauche ou droite, ni haut ni bas), sinon 0
  si l'entrée n'a aucune direction           → tapReleased = vrai (si tapDirection ≠ 0)
  sinon si d = 0 (diagonale, haut, bas)      → tapDirection = 0 (remise à zéro)
  sinon si d ≠ tapDirection et tapDirection ≠ 0 → tapDirection = 0 puis traité comme un premier tap
  sur un front montant de d :
    si d = tapDirection, tapReleased et tapFrames ≤ DASH_TAP_WINDOW (12)
        → commande 'dash' (d vers l'adversaire) ou 'backdash' (d à l'opposé), puis tapDirection = 0
    sinon → tapDirection = d, tapFrames = 0, tapReleased = faux
  tapFrames += 1 (plafonné)
```

- Il faut **au moins un tic sans aucune direction** entre les deux taps : ↓↘→, ↓↘→↓↘→ ou → ↗ → ne dashent jamais.
- L'âge part du **premier appui** : marcher longtemps, relâcher puis taper ne dashe pas.
- Le dash part du côté où est l'adversaire au tic de l'émission.

### 2.7 Manips (bonus de confort, jamais obligatoires)

| Manip | Spécial |
|---|---|
| ↓↘→ + L, H ou S | `special` |
| →↓↘ + L, H ou S | `specialAntiAir` |

- **Aucune autre manip** (pas de QCB, de demi-cercle, de charge ni de 360). **Aucun bonus de dégâts.**
- **Règle de manip fraîche** (`motion.ts`) : la 1re étape a lieu dans les `MOTION_SPAN_FRAMES` = 12 derniers tics, et la **dernière étape a été entrée** (pas seulement tenue) dans les `MOTION_END_FRAMES` = 6 derniers tics (le tic de l'appui compte dans chaque fenêtre, comme pour le buffer) (au lieu de « tenue dans les 4 derniers tics »).
  - Un vrai ↓↘→ + S sort le Vinyle.
  - S'accroupir, marcher en avant un instant, puis appuyer S donne le spécial avant, comme le joueur tactile le veut.
  - La même règle protège L et H : marcher après une garde basse puis appuyer L ne sort plus un Vinyle par accident.

### 2.8 Commande → coup (`src/core/moves.ts`, sous forme de table)

**Au sol**, la première ligne qui s'applique gagne :

| # | Commande | Condition | Coup |
|---|---|---|---|
| 1 | grab | — | `grab` |
| 2 | light, heavy, special | manip →↓↘ fraîche | `specialAntiAir` |
| 3 | light, heavy, special | manip ↓↘→ fraîche | `special` |
| 4 | special | bas (diagonales comprises) / avant / sinon | `specialAntiAir` / `specialForward` / `special` |
| 5 | light, heavy | en annulation d'un coup qui a touché ou été gardé, sans manip fraîche : la corde (`branches`) de ce bouton et de la direction tenue, lue avant les lignes 6 à 9 (`docs/combos-v3.md` §1.4) | le coup de la corde (Direct : ↓L Coup bas, ←L Double direct ; Cross : L, toute direction, Mise au tapis) |
| 6 | light, heavy | bas (diagonales comprises) | `crouchLight` / `crouchHeavy` |
| 7 | light | avant | `forwardLight` (repli : `standLight`) |
| 8 | heavy | avant / arrière | `forwardHeavy` / `backHeavy` (repli : `standHeavy`) |
| 9 | light, heavy | sinon (arrière + L reste le Direct ou le Jab, le reversal le plus rapide en sortie de garde) | `standLight` / `standHeavy` |
| 10 | dash / backdash | seulement depuis un état neutre (jamais en annulation d'un coup) | `dashForward` / `dashBack` |
| 11 | jump | seulement depuis un état neutre | pré-saut |

**En l'air** : L donne `jumpLight`, H donne `jumpHeavy`. S, PRISE et DASH ne font rien (pas de spécial aérien, pas de prise aérienne, pas d'air dash).

**En tenant l'adversaire** (§4) : L donne `pummel` ; H, S ou PRISE donnent `throwForward` ; avec arrière tenu, `throwBack`.

**En étant tenu** : PRISE (ou L + H) dans la fenêtre de dégagement donne le dégagement ; tout autre appui de bouton compte comme « se débattre ».

**Coups optionnels avec repli** : `CORE_MOVE_IDS` sont obligatoires pour tous ; `OPTIONAL_MOVE_IDS` (`forwardLight`, `forwardHeavy`, `backHeavy`, `chainLight`, `lightFinisher`, et les cordes des combos v3 : `jabRepeat`, `chainHeavy`, `chainHigh`, `chainLaunch`) retombent sur le normal debout s'ils manquent ; une corde ne mène qu'à un coup que le personnage a (validation). Leur type est fixé par la table `OPTIONAL_KINDS` (tous des normaux). Nayo les définit tous ; Riff tous sauf `jabRepeat`.

---

## 3. Déplacements v2

### 3.1 Valeurs

| | Nayo : v1 → **v2** | Riff : v1 → **v2** |
|---|---|---|
| Marche avant / arrière (px/tic) | 1,2 / 1,0 → **1,5 / 1,2** | 1,6 / 1,2 → **1,9 / 1,4** |
| Pré-saut | 4 → **4** (le 4e tic est le décollage) | 3 → **3** |
| Saut : vitesse initiale / gravité | 9,5 / 0,5 → **10,5 / 0,65** | 9,5 / 0,55 → **10 / 0,7** |
| En l'air (pieds au-dessus du sol) | 36 → **31 tics**, réception au 32e | 33 → **27 tics**, réception au 28e |
| Sommet | 85,5 → **79,6 px** | 77,35 → **66,5 px** |
| Saut avant / arrière (px/tic) | 1,8 / 1,6 → **2,2 / 1,9** (70 px parcourus) | 2,2 / 1,8 → **2,6 / 2,1** (73 px) |
| Atterrissage | 3 → **3** | 3 → **2** |
| Pieds au-dessus de 48 px (passe le Vinyle) | **20 tics** | **15 tics** |
| Dash | — → **18 tics, 56 px** | — → **16 tics, 64 px, annulable dès f8** |
| Backdash | — → **22 tics, 44 px**, anti-prise f0–11 | — → **20 tics, 48 px**, anti-prise f0–10 |

- Riff saute plus bas et plus vite (jump-ins durs à cueillir au réflexe : identité rushdown). Nayo garde un saut plus haut, qui passe mieux les projectiles.
- Le commentaire actuel de `RUSHDOWN` (« ~87 px ») est faux (77,35) : il disparaît avec les nouvelles valeurs.
- **Foulée** : la boucle de marche doit couvrir `vitesse × durée de la boucle`, sinon les pieds glissent. Nayo : 12 images × 2 tics = 24 tics, donc 36 px en avant et 28,8 px en arrière. Riff : 10 images × 2 tics = 20 tics, donc 38 px et 28 px. Les poses de marche sont recalées (même nombre d'images).

### 3.2 Dash : « Pas chassé » (Nayo), « Footwork » (Riff)

Dash et backdash sont des coups de type `movement` : pas de hitbox, un mouvement par frame (`motion.dx`), des plages d'invulnérabilité. Courbe **ease-out quadratique** (poussée forte, freinage doux, le « pop » des dashs de SF et KOF), calculée une fois dans les données par `dashCurve(distancePx, frames)` en sous-pixels entiers, avec une somme exacte.

| | Total | Déplacement | Distance | Vitesses (px/tic, f1 → fin) | Récupération | Annulation |
|---|---|---|---|---|---|---|
| Nayo `dashForward` | 18 | f1–14 | 56 | 7,71 · 7,15 · 6,57 · 6,00 · 5,43 · 4,85 · 4,29 · 3,71 · 3,15 · 2,57 · 2,00 · 1,43 · 0,85 · 0,29 | f15–17 | aucune ; un coup bufferisé sort à f18 |
| Riff `dashForward` | 16 | f1–12 | 64 | 10,22 · 9,34 · 8,44 · 7,56 · 6,66 · 5,78 · 4,89 · 4,00 · 3,11 · 2,22 · 1,34 · 0,44 | f13–15 | **dès f8 en normal ou en Prise** (`freeCancelFrom: 8`), avec élan (§3.4) |

Cumul du dash de Nayo (px) : 7,7 · 14,9 · 21,4 · 27,4 · 32,9 · 37,7 · 42,0 · 45,7 · 48,9 · 51,4 · 53,4 · 54,9 · 55,7 · 56,0.

**Règles communes**
- Le dash part seulement d'un état neutre (`idle`, marche, accroupi, `guard`), ou du buffer en sortie d'atterrissage, de récupération ou de garde. Jamais en annulation d'un coup.
- Pendant un dash : pas de garde, on peut être frappé et saisi. Un coup reçu pendant un dash n'est pas un CONTRE (seules les attaques le sont, §7.4).
- Les pushbox restent actives : on ne traverse pas l'adversaire ; un mur arrête le dash.
- Orientation figée pendant le dash.

### 3.3 Backdash : « Retrait »

| | Total | Déplacement | Distance | Vitesses (px/tic) | Anti-prise | Invulnérable aux coups |
|---|---|---|---|---|---|---|
| Nayo `dashBack` | 22 | f1–16 | 44 | 5,33 · 4,98 · 4,64 · 4,30 · 3,95 · 3,61 · 3,27 · 2,92 · 2,58 · 2,23 · 1,89 · 1,55 · 1,20 · 0,86 · 0,52 · 0,17 | f0–11 | non |
| Riff `dashBack` | 20 | f1–14 | 48 | 6,61 · 6,12 · 5,64 · 5,14 · 4,65 · 4,17 · 3,67 · 3,18 · 2,70 · 2,20 · 1,72 · 1,22 · 0,74 · 0,24 | f0–10 | non |

Le backdash fait rater une prise (c'est la défense contre la Prise) mais perd contre un coup placé au réveil (« meaty »). Esprit de SF6 : aucun backdash invincible, donc aucune sortie de pression sans risque. Sa fin (f12–21 pour Nayo, f11–19 pour Riff) est punissable et compte comme une récupération pour la PUNITION (§4.2).

### 3.4 Footwork de Riff (l'élan, sans course)

- Le dash de Riff s'annule dès f8 (≈ 53 px déjà parcourus) en normal ou en Prise. Pas en spécial.
- **Élan** : le coup lancé garde 50 % de la vitesse du frame d'annulation (≈ 2 px/tic à f8), qui décroît de `PUSHBACK_FRICTION` (0,25 px/tic, la même règle que le recul : DRY). Soit environ 9 px de glissement en plus. Pendant les frames où le coup a son propre `motion`, c'est ce mouvement qui s'applique.
- Résultat : un « dash-jab » et un « dash-prise » fluides, cœur du rushdown, compensés par 900 PV, une portée courte et l'absence de reversal au sol.
- Pas d'état `run` en plus (KISS) : l'annulation fait le même travail.

### 3.5 Sauts, pushbox aérienne, pushbox couchée, cross-ups

**Pushbox v2** (nouveaux champs du gabarit) :

| | Debout | Accroupi | **En l'air** (nouveau) | **Couché** (nouveau, en `knockdown`) |
|---|---|---|---|---|
| Nayo | 28 × 80 | 32 × 50 | 24 × 44, de 30 à 74 px au-dessus des pieds | 28 × 20 |
| Riff | 26 × 74 | 30 × 46 | 22 × 40, de 26 à 66 px | 26 × 20 |

La pushbox aérienne est celle des sauts. Un coup au sol qui quitte le sol (le Saut de l'ange, §5.5) garde sa pushbox debout, portée à sa hauteur : il pousse l'adversaire accroupi qu'il vise au lieu de s'enfoncer en lui puis d'en être chassé d'un bloc à l'impact.

Au relevé, la pushbox debout revient ; si le sauteur la chevauche encore, la séparation se fait selon x : de vrais cross-ups ambigus au réveil.

**Cross-ups simulés** (saut avant, adversaire immobile, loin des murs ; « derrière » = le sauteur finit de l'autre côté) :

| Sauteur → cible | Debout | Accroupi | Couché |
|---|---|---|---|
| Nayo → Nayo | ≤ 57 px | ≤ 65 px | ≤ 70 px |
| Nayo → Riff | ≤ 59 px | ≤ 65 px | ≤ 70 px |
| Riff → Nayo | ≤ 51 px | ≤ 64 px | ≤ 72 px |
| Riff → Riff | ≤ 57 px | ≤ 67 px | ≤ 72 px |

Au-dessus d'un adversaire couché, le corps reste sous la pushbox aérienne : la portée est la longueur du saut (70,4 px pour Nayo, 72,8 pour Riff, arrondie au pixel par le moteur). Les premières valeurs (76 et 78) venaient des anciennes vitesses de saut.

Pour comparaison, le moteur actuel ne traverse jamais un adversaire debout, mais traverse déjà un adversaire accroupi (jusqu'à 55 à 61 px avec les sauts actuels). Ce tableau est figé par `tests/core/crossup.test.ts` sur le vrai moteur ; la pushbox aérienne est le seul réglage.

- Passer derrière ne suffit pas pour un cross-up : il faut une hitbox qui touche **derrière** le sauteur. Seule Riff en a une (j.L « Ciseau aérien », x −14..26). Nayo peut changer de côté, jamais frapper de dos.
- La garde lit déjà la position de l'attaquant (`isBlocking`) : il faut garder dans l'autre sens, c'est un vrai cross-up.
- Les combattants en l'air gardent leur côté ; au sol, ils se tournent vers l'adversaire au premier tic neutre. Les coups bufferisés gardent l'orientation de l'appui (déjà le cas).
- Pas de contrôle en l'air : le saut reste un engagement.

### 3.6 Garde de proximité (nouvelle action `guard`)

Quand on tient arrière **et** que l'adversaire menace, le combattant **s'arrête en pose de garde** (debout, ou accroupi s'il tient bas) au lieu de reculer. Règle de SF2 à SF6 : on voit qu'on garde, et on ne sort plus de portée par accident d'un coup qu'on allait garder.

- Menace (`src/core/threat.ts`, fonction pure partagée avec l'IA : DRY) : un coup adverse (hors `movement`) en démarrage ou actif dont la portée (`threatReach(move)` = bord avant de la hitbox + mouvement jusqu'à la fin des frames actives) plus `THREAT_MARGIN` (24 px) couvre la distance ; ou un projectile adverse qui s'approche à moins de 96 px.
- `step` calcule la menace une fois par tic, à partir de l'état **précédent** de l'adversaire, et la passe à `updateFighter` dans une petite vue `{ x, threatened }` au lieu du seul `opponentX`.
- `guard` entre dans `BLOCKING_ACTIONS` ; on peut y être saisi comme en `idle`.
- Clip : dernière image de `blockStand` ou de `blockCrouch` (la garde installée), tenue. La première est l'impact : montrée avant tout contact, elle se lirait comme un coup reçu, et le vrai blocage ne changerait plus rien à l'image.

### 3.7 Pré-saut, atterrissage, demi-tour

- **Pré-saut** 4 / 3 tics : on peut y être saisi, comme dans SF (sauter n'est pas une fuite gratuite face à la Prise).
- **Atterrissage** 3 / 2 tics : le buffer enchaîne un coup au sol juste après une attaque sautée.
- **Demi-tour** instantané au sol (inchangé). Aucune animation de demi-tour qui retarde (la précision prime).

### 3.8 Chute, relevé, protection anti-prise

- KD 40 tics, invulnérable (inchangé). Le clip est découpé en `knockdown` (chute et sol) puis `getup` (relevé, joué sur les 10 derniers tics).
- **Protection anti-prise** : 4 tics d'immunité aux prises à la sortie de **n'importe quel** hitstun, blockstun, KD ou dégagement (`THROW_PROTECTION_FRAMES` = 4, compteur `throwImmuneFrames`). Plus de boucles de prise impossibles à éviter ; un coup placé au réveil reste possible.
- Le réveil reste **sans invincibilité** aux coups. Les sorties invincibles sont l'Uppercut de Nayo (et, contre les attaques aériennes seulement, le Genou montant de Riff).
- Pas de roulade ni de relevé rapide ou retardé (YAGNI) : la mise au sol donne de l'avantage au réveil, pas un jeu de devinette en plus.

### 3.9 Gravité de coup commune

Aujourd'hui, `airHit` utilise la gravité du **défenseur** (`airborne()` lit `template.gravity`) : l'avantage d'une mise au sol dépend du réglage de saut de la victime. En v2, `HIT_GRAVITY = px(0.5)` (`rules.ts`) s'applique à `airHit`, `ko` et aux projections. L'avantage d'un KD ne dépend plus que du coup.

### 3.10 Comparaison (ordres de grandeur publics, à titre indicatif)

| | Dash avant | Backdash | Pré-saut | Remarque |
|---|---|---|---|---|
| SF6 | ≈ 19 frames, fixe | ≈ 23 frames, punissable | 4 | dash lisible |
| GG Strive | course maintenue | court, invulnérable au début | 4 | course = identité |
| KOF XV | course | backstep invulnérable | 4 | petits sauts |
| Tekken | annulable | annulable | — | déplacements fins |
| Smash | dash initial puis course | — | 3 | élan |
| **NayosBeat v2** | **18 (Nayo) / 16 annulable à f8 avec élan (Riff)** | **22 / 20, anti-prise, frappable** | **4 / 3** | double-tap + bouton, buffer 6 |

### 3.11 Écarté (et pourquoi)

| Élément | Raison |
|---|---|
| Air dash, double saut | Neutre illisible sur téléphone, anti-air dévalorisé |
| Course (`run`) | L'annulation du dash de Riff donne l'élan sans nouvel état |
| Roulade, relevé rapide | Moins de devinettes ; à revoir si le réveil devient étouffant |
| Contrôle en l'air | Les sauts restent un engagement |
| Interpolation de rendu entre tics | Jusqu'à 16 ms de latence visuelle. La fluidité vient de l'animation (foulée recalée, traînées, poussière, clips étirés sur la vraie durée du stun) et de la réactivité (buffer, verrou de neutre) |

---

## 4. La Prise

### 4.1 Déroulé

```
PRISE ──► tentative (démarrage 5, actif 3, très courte portée)
            │ rate ──────────► 20 (Nayo) / 19 (Riff) tics de récupération : punissable (PUNITION)
            │ frappée au même tic ─► le coup gagne, la tentative est un CONTRE
            │ deux Prises au même tic ─► DÉGAGEMENT (personne n'est saisi)
            ▼ saisit : arrêt sur image 6 tics, son « grab », vibration côté victime
          CLINCH  t0–t11 : la victime peut se DÉGAGER (PRISE ou L+H, ou PRISE pressée ≤ 6 tics avant)
            │               le choix de l'attaquant est mémorisé et part à t12
            │ dégagée ─► « DÉGAGEMENT ! » : les deux reculent (4 px/tic), 14 tics d'étourdissement, 0 dégât
            ▼
          TENIR   t ≥ 12 :
            ├─ L ────────────────► TABASSER (coup attaché, dégâts fixes) puis retour à TENIR
            ├─ H, S ou PRISE ────► LANCER DEVANT
            ├─ ← + H, S ou PRISE ► LANCER DERRIÈRE (changement de côté)
            └─ limite atteinte sans lancer ─► LANCER DEVANT automatique
          LIMITE = 56 − 3 × (appuis de la victime après t12), au minimum 36
```

### 4.2 Règles

1. **Portée** : hitbox de prise testée contre les hurtbox. Nayo x 6..30 / y 20..60 (touche jusqu'à 43 px de centre à centre), Riff x 6..28 / y 20..56 (41 px). C'est plus court que tout coup.
2. **Ne peut pas être saisi** : en l'air (y > 0) ; en hitstun, blockstun, `airHit`, KD, KO ; déjà en prise ; pendant les 4 tics de protection ; pendant la plage anti-prise d'un backdash ; pendant une invincibilité totale (Uppercut).
3. **Peut être saisi** : debout, accroupi (sinon garder en bas-arrière ne coûterait rien), en pré-saut, en atterrissage, en garde de proximité, en dash, en attaque ou en récupération.
4. **Priorités au même tic** : coup contre Prise, le coup gagne ; Prise contre Prise, dégagement ; projectile contre Prise, le projectile touche et la Prise ne se résout pas.
5. **À la saisie** : la victime est placée au contact (centres à la somme des demi-largeurs de pushbox, calculée, pas stockée : 27 px pour Nayo contre Riff). Les deux combattants deviennent intouchables (les projectiles les traversent). `GameState.hold` est créé.
6. **Dégagement** : PRISE (ou L + H) pendant t0–t11 (`GRAB_TECH_FRAMES` = 12, soit 200 ms), ou une Prise déjà dans le buffer. 200 ms se jouent à l'anticipation pour la plupart des joueurs, au réflexe pour les meilleurs ; la vibration et l'anneau (§4.5) aident.
7. **PUNITION** : une prise qui saisit un adversaire **en récupération** (fin d'attaque après ses frames actives, atterrissage, fin de dash ou de backdash, prise ratée) **ne se dégage pas**. Tampon « PUNITION ! ».
8. **Se débattre** : à partir de t12, chaque nouvel appui de bouton de la victime (L, H, S, PRISE, SAUT, DASH ; pas les directions) retire 3 tics à la limite (`STRUGGLE_FRAMES`), plancher 36 (`HOLD_MIN_FRAMES`). On ne s'échappe pas : on écourte le tabassage et on peut priver l'attaquant du choix de lancer.
9. **Tabasser** : un coup de tabassage ne part que s'il finit avant la limite du moment. Un tabassage ou un lancer commencé va toujours au bout. Le temps fait la limite, pas un compteur : **2 coups de genou au plus pour Nayo, 3 coups de tête pour Riff** sans lutte. Le choix de l'attaquant, mémorisé pour t12, ne s'efface que par un autre choix (L, H, S, PRISE) : un saut ou un dash n'ont pas de coup dans une prise, et un stick tactile qui glisse vers ↖ sur ← + H ne le perd pas.
10. **Dégâts fixes** pour le tabassage et les lancers : pas de scaling, pas de bonus de CONTRE ni de DROP. Ils comptent comme des coups dans le compteur de combo.
11. **Coins** : si la victime sortirait d'un mur, toute la paire est décalée (l'attaquant recule d'autant). Le lancer derrière depuis le coin **met l'adversaire au coin**.
12. **Fin de round pendant une prise** (temps écoulé) : la prise se rompt comme un dégagement, sans dégâts. Un KO par tabassage ou par lancer termine le round normalement. En entraînement, pas de recharge de vie pendant une prise.

### 4.3 Données de la prise (attaquant)

Les coups de prise sont des `MoveData` joués par l'attaquant pendant `holding`. Pour un lancer, le **démarrage est le frame du lâcher** et l'actif vaut 1 tic : au lâcher, la victime reçoit `applyHit` avec ses dégâts et son `knockdown` (levée `vy`, vitesse `vx`), part en `airHit` (réaction `thrown`), retombe avec `HIT_GRAVITY`, puis 40 tics de KD. Pour un lancer derrière, au frame `sideSwitchFrame`, la victime passe de l'autre côté (`x = attaquant − orientation × contact`) ; l'arc au-dessus de l'épaule est dessiné par le clip, le cœur ne stocke pas de trajectoire (KISS).

| | Nayo | Riff |
|---|---|---|
| `grab` (tentative) | 5 / 3 / 20 (28), hitbox 6..30 / 20..60 | 5 / 3 / 19 (27), hitbox 6..28 / 20..56 |
| `pummel` | **Coup de genou** : 6 / 1 / 9 (16), **15** fixes, hitstop 6 | **Coup de tête** : 4 / 1 / 7 (12), **10** fixes, hitstop 5 |
| `throwForward` | **Renvoi** (pousse et direct qui l'envoie) : lâcher f10, 10 / 1 / 25 (36), **100**. Levée 3,5, vx 3,5 : retombe à ≈ 72 px de Nayo. **KD +28** | **Ciseaux** (ciseau de jambes, l'adversaire tombe tout près) : lâcher f10, 10 / 1 / 21 (32), **85**. Levée 3, vx 2 : retombe à ≈ 49 px. **KD +30** |
| `throwBack` | **Projection d'épaule** (au col, pivot, par-dessus l'épaule) : côté changé f6, lâcher f14, 14 / 1 / 27 (42), **90**. Levée 3,5, vx 3 : ≈ 66 px derrière. **KD +26** | **Roulade** (monkey flip) : côté changé f6, lâcher f14, 14 / 1 / 25 (40), **80**. Levée 3,5, vx 3 : ≈ 66 px derrière. **KD +28** |
| Dégagement | les deux : 14 tics d'étourdissement, recul 4 px/tic | idem |

Arrêt sur image au lâcher : 10 tics pour les quatre lancers (6 pour le genou, 5 pour le coup de tête). Le côté change au tic 6, premier tic de l'élan par-dessus la tête, là où le dessin passe derrière (décision prise avec l'art de Nayo : au tic 8, la victime serait dessinée deux tics du mauvais côté). Avantage d'un lancer = `L + 40 − récupération` (L = 4·levée − 1). Après un Renvoi, Nayo a le temps d'un dash (18) et d'un coup placé ; Riff, après des Ciseaux, est à 49 px avec +30 : elle peut approcher et tenter un cross-up au réveil.

### 4.4 Tabasser ou lancer : une vraie décision

| | Sans tabasser | Tabassage maximal (sans lutte) | Après le lancer |
|---|---|---|---|
| Nayo, Renvoi | 100 | 2 × 15 + 100 = **130** | adversaire envoyé loin : Nayo reprend sa distance de Vinyle |
| Nayo, Projection d'épaule | 90 | **120** | change de côté : met l'adversaire dans le coin si Nayo y était |
| Riff, Ciseaux | 85 | 3 × 10 + 85 = **115** | adversaire tout près : pression au réveil |
| Riff, Roulade | 80 | **110** | change de côté |

Pour mémoire, la Projection actuelle fait 110 / 100 sans aucune option. Une victime qui se débat vite (8 appuis par seconde) retire environ 3 tics tous les 7 à 8 tics : Riff ne place plus que deux coups de tête, et Nayo, s'il tabasse deux fois, arrive à la limite et part en lancer automatique devant. Tabasser au maximum fait donc risquer le choix du côté. Le plancher de 36 garantit qu'un lancer immédiat (dès t12) n'est jamais gêné.

### 4.5 Affichage, son et haptique

- **Anneau de prise** autour de la victime : il se vide jusqu'à la limite, en partant du haut, du côté de l'attaquant (sa moitié proche, cachée derrière l'attaquant, se vide d'abord ; la moitié que voit la victime, en dernier, de la même façon des deux côtés de l'écran) ; chaque appui de la victime le fait sauter. Pendant t0–t11, l'anneau clignote (au plus 3 fois par seconde) en blanc : c'est le moment de se dégager.
- **Tampons** : « DÉGAGEMENT ! », « PUNITION ! » (phase 2, en lettrage BD : la police Bangers a les capitales accentuées, le test des glyphes le vérifie), « CONTRE ! » (phase 3, voir §7.9).
- **Entraînement** : rappel sous l'attaquant, « L frapper · H lancer · ← H derrière ».
- **Sons** : saisie (cuir et tissu), genou ou tête (sourd), lancer (souffle puis impact au sol), dégagement (deux claques).
- **Vibration** de 30 ms côté victime (tactile Android).

### 4.6 Cas limites (chacun devient un test de `tests/core/hold.test.ts`)

Saisie contre Uppercut invincible : rate. Contre backdash dans sa plage anti-prise : rate. Contre Saut de l'ange (en l'air) : rate. Pendant la protection de 4 tics : rate. Deux saisies au même tic : dégagement. Dégagement bufferisé avant la saisie : compte. Dégagement à t11 : compte ; à t12 : trop tard. PUNITION : le dégagement est ignoré. Limite au plancher. Tabassage qui ne tient plus avant la limite : ne part pas. Lancer automatique. Lancer derrière dos au coin. KO par tabassage. Temps écoulé pendant la prise. Projectile qui traverse la paire. Symétrie P1/P2. Déterminisme.

---

## 5. Coups : grammaire, normaux de direction, spéciaux

### 5.1 Grammaire commune (pour tout le casting, présent et futur)

| Entrée | Rôle |
|---|---|
| L / H | coup rapide / coup fort |
| L, L, L | **chaîne** : deuxième coup, puis coup final qui met au sol ; au 3e temps, H et sa direction choisissent une autre fin (cordes, `docs/combos-v3.md` §1.4) |
| L ou H, avec une direction, **après un coup qui touche** | **corde** : avant pour le haut ou l'élan, bas pour le bas, arrière pour faire décoller ; haut ne choisit rien |
| ↓ + L / ↓ + H | coup bas rapide / **balayage** (fauche, met au sol) |
| **→ + L** | coup d'approche propre au personnage |
| **→ + H** | **overhead** : à parer **debout** |
| **← + H** | **lanceur** anti-air : fait décoller (4 points de jongle), s'annule en spécial, ou se lie à la phrase rejouée en l'air ; rate les adversaires accroupis |
| S / → + S / ↓ + S | spécial neutre / spécial avant / **anti-air** |
| PRISE | saisie, puis tabasser ou lancer |
| DASH | dash, ou backdash avec arrière |

Résumé pour l'aide : **« L, L, L. Puis L, L, H, H, S. »** et **« ← + H fait décoller. »** Les cordes de chaque personnage : `docs/combos-v3.md` §2.3-2.4 (Nayo) et §4 (Riff).

### 5.2 Nayo, « le boxeur posé »

| Entrée | Nom | Ce que l'on voit | À quoi ça sert |
|---|---|---|---|
| L, puis L | **Cross** (`chainLight`) | Le « deux » du boxeur : bras arrière lancé, épaule qui tourne, petit pas | Prolonge le Direct ; s'annule en spécial |
| L, L, L | **Mise au tapis** (`lightFinisher`) | Crochet large du bras avant qui envoie au sol, traînée cyan | Finit la chaîne des débutants, met au sol |
| → + L | **Jab chassé** (`forwardLight`) | Pas glissé en avant et jab sec, garde haute | S'approcher en frappant (14 px), commencer un combo de loin. −1 en garde |
| → + H | **Overhand** (`forwardHeavy`) | Il monte sur la pointe des pieds ; le bras arrière passe *par-dessus* la garde et retombe sur la tête ; arc cyan visible dès le démarrage | **Overhead** : ouvre un adversaire qui garde accroupi. Lent (19 tics) et télégraphié : à mélanger avec le Balayage |
| ← + H | **Remontant** (`backHeavy`) | Uppercut court, tête rentrée, le poing monte presque à la verticale | Anti-air normal, sans invincibilité ; **lanceur** : s'annule en Uppercut pour une jongle |

Ses cordes des combos v3 (Double direct, Crochet au foie, Marteau, Remontant chassé) et le style « boxeur-DJ » qui les relie : `docs/combos-v3.md` §2.

### 5.3 Riff, « la punk qui breake et cogne »

| Entrée | Nom | Ce que l'on voit | À quoi ça sert |
|---|---|---|---|
| L, puis L | **Revers** (`chainLight`) | Revers tournant à plat, la frange magenta qui fouette | Prolonge le Jab ; s'annule en spécial |
| L, L, L | **Swipe** (`lightFinisher`) | Le corps bascule sur les mains (meia lua de compasso), coup de pied circulaire qui balaie l'adversaire | Finit la chaîne, met au sol |
| → + L | **Toprock** (`forwardLight`) | Pas croisé de danse vers l'avant puis jab, la frange et la chaîne de ceinture suivent | Avance de 20 px, **+1 en garde**, s'annule en normal : pression et pièges |
| → + H | **Talon** (`forwardHeavy`) | Jambe tendue qui monte, rangers en l'air, puis retombe en coup de hache | **Overhead** plus rapide que celui de Nayo (17 tics), −4 en garde |
| ← + H | **Retourné** (`backHeavy`) | Scorpion sauté : elle décolle de 16 px, la ranger accrochée par-dessus sa tête, et couvre aussi derrière elle | Anti-air normal, aussi contre les cross-ups (x −12..22) ; **lanceur** ; les coups bas passent sous elle de f6 à f10 (§10.2) |

Ses cordes des combos v3 (Hache, Coup de boule, Retourné sauté) et sa Vrille : `docs/combos-v3.md` §4.

### 5.4 Spéciaux de Nayo : le nom dit ce que c'est, l'image dit où ça frappe, le son dit quand

| Entrée | Nom | Ce que l'on voit et entend | Rôle | Comment le contrer |
|---|---|---|---|---|
| S, ou ↓↘→ + L/H/S | **Vinyle** (ex « Onde sonore ») | Nayo tire un vinyle de sa veste et le lance à plat d'un geste de scratch. Un **disque de lumière de 20 px** : bord cyan, sillons blancs, étiquette noire, trois images rémanentes, qui tourne à **hauteur de poitrine** (exactement la hauteur de sa hitbox). Son « scratch-whoosh » ; il éclate en éclats de notes à l'impact | **Projectile** : force l'adversaire à sauter (Nayo l'attend à l'Uppercut ou au Remontant) ou à garder. Touche debout et accroupi. Un seul à la fois | Sauter par-dessus (pieds au-dessus de 48 px pendant 15 à 20 tics), garder (−14 à bout portant), la Glissade de Riff passe dessous |
| → + S | **Pied fendu** | Coup de pied latéral volant, avance de 30 px, lignes de vitesse cyan, impact en éventail | Punir, finir un combo (**met au sol**), traverser le milieu d'écran | −9 en garde : le punir |
| ↓ + S, ou →↓↘ + L/H/S | **Uppercut** (« la montée ») | Il s'accroupit, puis jaillit sur la pointe des pieds, poing vers le ciel, colonne d'énergie cyan et or, « boum » de basse | **Anti-air invincible** (f0–6) et reversal au réveil | −23 en garde, punition maximale ; l'appâter avec un saut à vide ou un backdash |

### 5.5 Spéciaux de Riff

| Entrée | Nom | Ce que l'on voit | Rôle | Comment le contrer |
|---|---|---|---|---|
| S, ou ↓↘→ + L/H/S | **Glissade** (remplace la « Ruée ») | Elle plonge au sol et glisse sur la hanche, rangers en avant, appuyée sur l'avant-bras ; traînée magenta au ras du sol, éclats argent sous les semelles | **Passe sous le Vinyle et sous les coups hauts** (corps à 28,5 px de haut de f2 à f20, mesuré sur le dessin). Coup **bas** qui fauche et met au sol, traverse 64 px. Son outil anti-zoning et sa fin de combo | Garder **accroupi** (−9 au contact, −2 en bout de portée), sauter, frapper bas (le Coup bas la touche) |
| → + S | **Saut de l'ange** | Vrille aérienne qui **quitte vraiment le sol** (sommet 34 px) et retombe talons en premier | **Overhead** qui passe au-dessus des coups bas (f4–f18) et des prises (en l'air de f3 à f19) | Garder **debout** (−7) ; un anti-air la fait tomber |
| ↓ + S, ou →↓↘ + L/H/S | **Genou montant** | « Freeze » explosif, genou qui jaillit, éclats en losange argent, onde magenta au sol | Anti-air. **Invincible seulement contre les attaques aériennes** (f0–5) : ce n'est pas un reversal au sol, c'est sa faiblesse. Dessinée en l'air de f4 à f15, elle passe alors au-dessus des coups bas (§10.2) | −17 en garde ; un coup au sol placé au réveil le bat (dès son démarrage, f0–3 ; ensuite un coup moyen ou haut, les coups bas passent dessous) |

### 5.6 Remix (pendant le DROP du Crossfader, §8)

Chaque personnage a **un** spécial signature avec une variante Remix, précalculée au chargement des données. Le type `Remix` **interdit** de changer le démarrage, l'actif ou la récupération : les clips restent valides, aucun art en plus (seuls les effets changent de couleur).

| Personnage | Spécial | Remix | Visuel |
|---|---|---|---|
| Nayo | Vinyle | vitesse 3,5 → 5 px/tic, 75 dégâts, hitstun 22 | double anneau doré |
| Riff | Glissade | 80 dégâts, blockstun 20 (−3 au contact : presque sûre) | traînée double, magenta et or |

---

## 6. Identités

### 6.1 Nayo, Polyvalent : « il mixe ses combats »

- **Look** (`docs/art/univers.md`) : le visage et le look de Tazz, techwear noir, néon **cyan**, casque audio. Tenue 2 : gris clair et magenta. Effets : croissants néon cyan, gerbes or.
- **Personnalité** : calme, sûr de lui, il attend la faute.
- **Plan de jeu** : tenir l'adversaire entre 90 et 150 px avec le Vinyle ; Uppercut ou Remontant sur les sauts ; Jab chassé et L, L pour punir ; Overhand ou Balayage pour ouvrir ; Renvoi pour reprendre la distance.
- **Forces** : portée des normaux immobiles (Crochet 65 px) ; le seul projectile du duo ; un reversal invincible complet ; 1000 PV ; de meilleurs dégâts par coup ; des lancers qui font de la place.
- **Faiblesses** : mobilité moyenne (dash non annulable, marche plus lente) ; grande hurtbox ; spéciaux très punissables (Uppercut −23, Vinyle −14 au contact) ; normaux plus lents (4 tics contre 3) ; aucun cross-up ; overhead lent (19 tics).

### 6.2 Riff, Rushdown : « la punk qui breake et cogne »

- **Look** (`docs/art/univers.md`) : la punk de Zen-Tazzer. Frange **magenta** sur crâne rasé sur le côté, blouson de cuir noir court, crop top, jean noir déchiré, ceinture cloutée et **chaîne** argent, rangers aux triangles magenta, mitaines. Sa garde : la base en ginga d'une b-girl, le poing arrière armé d'une bagarreuse.
- **Couleurs** : cuir noir `#040406 #16171d #30333c #6c7890`, magenta `#4c0b44 #8e1468 #b81e7c #e04a9e`, argent `#5c5e64 #8e9298 #c4c8cc #f2f4f6`. Tenue 2 (miroir) : blouson de cuir rouge sang `#3c0a10 #8e1c24 #c4383e`, frange et accents **or** `#6a420c #c89628 #ecc85a`, jean gris délavé.
- **Effets** (`hit-styles.ts`, `tools/sprites/riff/palette.ts`) : énergie **magenta** `#ff3ca0` (dash, traînées, ondes, spéciaux), entailles en griffes magenta et éclats **argent** `#d8e0ec` ; tenue 2 : énergie or `#ffc83a`, éclats cramoisis `#e0283c`. Le magenta de Riff ne croise jamais celui de la tenue 2 de Nayo (seulement en miroir).
- **Personnalité** : provocatrice, rieuse ; toprock en attente ; saut avant en salto.
- **Plan de jeu** : entrer au dash annulable, passer sous le Vinyle à la Glissade, coller, puis mélanger bas (Coup bas, Windmill, Glissade), haut (Talon, Saut de l'ange) et Prise, avec le cross-up au réveil.
- **Forces** : la meilleure mobilité ; les normaux les plus rapides (3 tics) ; Toprock à +1 en garde ; deux overheads ; le cross-up ; la Glissade bat le zoning ; tabassage ×3 ; le Retourné (f6–f10) et le Genou montant (f4–f15) sautent au-dessus des coups bas (§10.2).
- **Faiblesses** : 900 PV ; portée immobile courte (Coude 56 px) ; dégâts par coup faibles ; **pas de reversal au sol** ; ses outils d'approche se punissent quand ils sont mal espacés ; anti-air moins fiable.

### 6.3 Statistiques comparées

| | Nayo | Riff |
|---|---|---|
| PV | 1000 | 900 |
| Marche avant / arrière | 1,5 / 1,2 | 1,9 / 1,4 |
| Dash / backdash | 18 tics, 56 px / 22 tics, 44 px | 16 tics, 64 px, annulable f8 / 20 tics, 48 px |
| Saut (en l'air, sommet, distance) | 31 tics, 79,6 px, 70 px | 27 tics, 66,5 px, 73 px |
| Coup le plus rapide | 4 tics (Direct, Coup bas) | 3 tics (Jab, Coup bas) |
| Plus longue portée sans bouger | Crochet 65 px | Coude 56 px |
| Overheads | Overhand 19 tics | Talon 17 tics, Saut de l'ange 16 tics |
| Reversal | Uppercut, invincible à tout f0–6 | aucun au sol (Genou : invincible aux attaques aériennes f0–5) |
| Projectile | Vinyle 3,5 px/tic | aucun (la Glissade passe dessous) |
| Lancers (devant / derrière, tabassage max) | 100 / 90, 2 × 15 | 85 / 80, 3 × 10 |
| Combo de base / lanceur | 163 / 164 | 143 / 140 |

`tests/data/fighters.test.ts` vérifie ces écarts : chaque personnage a au moins trois forces et trois faiblesses mesurables dans les données (vitesse, PV, démarrage le plus rapide, portée, reversal, projectile).

### 6.4 Le matchup

- Nayo veut 90 à 150 px ; Riff veut moins de 60 px.
- Le Coup bas et le Direct de Nayo arrêtent le dash de Riff, qui n'est pas invincible.
- La Glissade de Riff punit un Vinyle mal placé ; le Coup bas de Nayo bat la Glissade.
- Le Saut de l'ange bat le Balayage mais perd contre l'Uppercut et le Remontant.
- Le Retourné et le Genou montant passent au-dessus du Coup bas et du Balayage (de f6 à f10, de f4 à f15) : Nayo les prend au démarrage, ou frappe moyen.
- Le cross-up de Riff au réveil oblige Nayo à deviner, à backdasher (contre la prise) ou à sortir l'Uppercut.

### 6.5 Les quatre suivants (`univers.md`) : une mécanique chacun, codée le jour où on les fait (YAGNI)

| Perso | Archétype | Mécanique signature | Force | Faiblesse |
|---|---|---|---|---|
| **Kaï** (Néon Underground) | Boxeur lourd | « Blindage » : son → + H et son Piston encaissent un coup sans broncher | Dégâts, armure | Le plus lent, dash minuscule |
| **Vexa** (Néon Underground) | Parkour | « Rebond mural » : au coin, un second saut sur le mur | Sortie du coin, vitesse | 850 PV, dégâts faibles |
| **Sora** (Archipel) | Défensif zen | « Paume sereine » : une posture de parade qui riposte aux coups hauts et moyens | Meilleure défense, contrôle | Peu de mélanges, lent |
| **Kitsune** (Archipel) | Filou | « Bond du renard » : téléportation courte derrière l'adversaire | Mélanges | Dégâts faibles, téléport punissable |

Règle de casting : les **mêmes directions** pour les mêmes rôles (§5.1), seuls le contenu et l'outil signature changent. Un fichier de données par personnage (`data/fighters/<nom>.ts`) : les gabarits POLYVALENT et RUSHDOWN deviennent des archétypes (une intention), plus des chiffres partagés.

---

## 7. Combos

### 7.1 Annulations (une phrase par règle)

| Coup | S'annule en | Condition |
|---|---|---|
| Légers (L, ↓L), Toprock de Riff | normal, spécial | après contact (touché ou gardé), jusqu'à la fin du coup (fenêtre indulgente, faite pour le tactile) |
| Tout normal qui a des `branches` | en plus : ses **cordes** (bouton × direction, `docs/combos-v3.md` §1.4), lues avant `cancelInto`, qu'elles passent outre | idem |
| Cross / Revers, Double direct, Jab chassé, Toprock | spécial, et leurs cordes | idem |
| Lourds (H), coups des cordes (Crochet au foie, Marteau, Coup de boule, Hache), lanceurs (←H, Remontant chassé, Retourné sauté) | spécial | idem |
| Spéciaux | seulement un palier plus haut (`tierOf`, la super des combos v3), s'ils ont **touché** (`FLAG_MOVE_HIT`) et ne sont pas un projectile : rien tant qu'il n'y a pas de super | idem |
| Overheads (→H), balayages, coups finaux, coups sautés, prises | rien | — |
| Dash de Riff | normal, Prise | **sans contact**, dès f8 (`freeCancelFrom`) |

Seuls les coups de type `movement` peuvent s'annuler en Prise (règle de validation). Aucun coup ne s'annule en Prise.

**La phrase** (`docs/combos-v3.md` §1.2) remplace l'ancienne règle « une annulation sur contact ne donne jamais un coup qui avance » : une annulation n'entre jamais dans un normal déjà joué depuis le dernier coup lancé du neutre (le Direct et le Coup bas, deux fois). Le Jab chassé et le Toprock redeviennent des maillons, une fois par phrase : ↓L, → + L, ↓L, → + L de Riff sort les trois premiers, le quatrième attend la fin du Coup bas. Un coup lancé du neutre (un lien) commence une nouvelle phrase. Le dash de Riff, qui n'a rien touché, s'annule en n'importe quel normal.

### 7.2 Chaîne L, L, L et cordes

La chaîne est une corde comme les autres (`docs/combos-v3.md` §1.4) : `branches` est une donnée du coup (`{ button: 'light', dirs: ['neutral', 'forward'], move: 'chainLight' }`), lue dans l'annulation, avant la table des commandes : le bouton et la direction tenue quand il a été appuyé, relativement au côté regardé, donnent le coup suivant. Une manip fraîche passe d'abord (elle demande un spécial). Aucun compteur d'état. Sur la Cross et le Revers, L dans **toutes** les directions donne le coup final : le débutant qui martèle finit toujours au sol. **Garantie** : L, L, L passe à toute distance où le premier L touche, debout comme accroupi, pour les deux personnages, si chaque appui tombe assez tôt pour garder le combo (test). Pour cela, le deuxième coup avance de 10 px et repousse peu (1,5 px/tic), et le coup final avance de 10 à 12 px.

### 7.3 Liens

Un coup suit si `démarrage ≤ avantage − 1` (avant recul). Direct (+5) → coup de 4 tics ; Jab de Riff (+6) → Jab ou Coup bas ; Overhand ou Talon en CONTRE (+5) → Direct ou Jab.

### 7.4 CONTRE et PUNITION

- Toucher un adversaire **pendant qu'il attaque** (coup de type `normal`, `special` ou `grab`, à n'importe quel frame ; pas les `movement`, pas les coups de prise) est un CONTRE : **+20 % de dégâts, +4 tics de hitstun** (sauf mise au sol), **+3 tics de hitstop**, petit zoom de caméra (rendu seul), grosse étincelle.
- Le tampon dit « **CONTRE !** » si l'adversaire était en démarrage ou actif, « **PUNITION !** » s'il était en récupération (coup ou prise ratés). Même bonus, deux mots pour apprendre à punir.
- Une Prise sur une récupération (de coup, de dash, de backdash, d'atterrissage) est une PUNITION et ne se dégage pas (§4.2).
- Par construction, seul le premier coup d'un combo peut être un CONTRE (ensuite la victime est en hitstun). `isCounterHit(defender, template)` est une fonction pure du cœur, réutilisée par le rendu (DRY).

### 7.5 Dégâts en garde (chip)

Les **spéciaux** gardés infligent 15 % de leurs dégâts (`SPECIAL_CHIP_PERCENT`, tronqué). Le chip ne peut pas tuer : la vie descend au minimum à 1. Les normaux n'infligent rien en garde.

### 7.6 Jongle à points (combos v3, `docs/combos-v3.md` §1.5)

- Les lanceurs (`knockdown.juggle`, un nombre de points) envoient en `airHit` une victime qui n'y était pas déjà (au sol, ou en saut s'ils la prennent en anti-air) : Remontant et Remontant chassé **4 points** (le Remontant en CONTRE ou en PUNITION, **5**) ; Retourné et Retourné sauté de Riff, 4. Levée **8 px/tic**, vx 0,5 : 31 tics en l'air, sommet vers 60 px.
- Un coup ne touche un corps en `airHit` que s'il lui reste ses points (`juggleCost`, 1 par défaut, **2** pour le Crochet, le Crochet au foie et le Coup de coude). Il les dépense ; le corps remonte à `min(3, 1,5 + 0,5 × points restants)` px/tic et file à 0,5 px/tic : plus les points baissent, plus il retombe vite.
- Un coup qui met au sol sans être un lanceur (Mise au tapis, Uppercut, Pied fendu, Balayage) **finit la jongle** dans son propre vol ; un lanceur sur un corps déjà en l'air ne pose aucun point, il le relève. À 0 point, le corps est intouchable jusqu'au sol, puis passe en knockdown. Toujours pas de coup au sol (OTG).
- **Prolongateur**, une fois par combo (`FLAG_EXTENDED`) : le **Marteau** de Nayo écrase le corps jonglé au sol à 5 px/tic (intouchable pendant la chute, `FLAG_BOUNCE`), qui rebondit à 6 px/tic avec 2 points de plus (le Rebond) ; le **Swipe** de Riff le fait tournoyer en l'air (vy 5, vx 1, 2 points de plus : la Vrille). L'impact gèle 4 tics de plus (`EXTENDER_HITSTOP`). Les marques de la victime s'effacent quand elle se tient de nouveau en neutre.
- Les suites en l'air sont des **liens** : après le lanceur, on laisse le personnage se remettre et on recommence la phrase (fenêtres de 9 à 13 tics, mesurées). La jongle compte dans le compteur et le scaling.

### 7.7 Formule de dégâts (unique, entière, déterministe)

```
scaling% = max(50, 100 − 10 × (coups − 1))             // inchangé : 100, 90, 80, 70, 60, puis 50
bonus%   = 100 + (CONTRE ? 20 : 0) + (DROP ? 10 : 0)
dégâts   = max(1, trunc(damage × scaling% × bonus% / 10000))
chip     = trunc(damage × 15 / 100), spéciaux seulement, la vie ne descend pas sous 1
```

Tabassage et lancers : dégâts fixes, sans scaling ni bonus. Il n'y a **aucun** bonus de manip (D5).

**CONTRE propre à un coup** (`counter`, `docs/combos-v3.md` §1.6) : le Crochet de Nayo en CONTRE ou en PUNITION **plie** l'adversaire, +16 tics de hitstun au lieu de +4 et un recul de 0,5 px/tic (+17, un lien de 18 tics) ; le Remontant lance avec 5 points au lieu de 4.

**Décroissance du hitstun** : `stun = max(0, hitstun + bonus de CONTRE − 2 × max(0, coups − 8))` (`DECAY_FROM` 8, `DECAY_STEP` 2), au sol seulement : aucune route prévue ne la sent, mais une boucle de liens lâche avant la limite.

**Limite dure** : `COMBO_LIMIT` = **12**. Le coup qui porte le combo à 12 met toujours au sol (levée d'au moins 3 px/tic, 0 point, `FLAG_LIMIT`), et rien ne touche plus le corps, ni coup ni projectile, jusqu'au sol. La recherche en faisceau trouve au plus 11 coups pour Nayo et 12 pour Riff, sans jauge (`tests/core/infinite.test.ts`).

### 7.8 Combos de référence (dégâts calculés avec la formule ; chacun devient un test de `tests/core/combos.test.ts`)

| Perso | Combo | Dégâts |
|---|---|---|
| Nayo | L, L, L (Direct, Cross, Mise au tapis) | 30 + 36 + 40 = **106**, KD |
| Nayo | L, L → Pied fendu | 30 + 36 + 60 = **126**, KD |
| Nayo | ↓L, ↓L, H → Pied fendu | 25 + 22 + 64 + 52 = **163**, KD |
| Nayo | ←H (lance) → Uppercut (jongle) | 65 + 99 = **164**, KD |
| Nayo | Overhand **en CONTRE** ⇢ Direct → Cross → Pied fendu | 84 + 27 + 32 + 52 = **195**, KD |
| Nayo | Prise, 2 coups de genou, Renvoi | **130** |
| Riff | L, L, L (Jab, Revers, Swipe) | 25 + 27 + 36 = **88**, KD |
| Riff | ↓L, ↓L, H → Glissade | 20 + 18 + 56 + 49 = **143**, KD |
| Riff | Dash (annulé à f8) → Jab → Coude → Genou montant | 25 + 63 + 76 = **164**, KD |
| Riff | ←H (lance) → Genou montant (jongle) | 55 + 85 = **140**, KD |
| Riff | Talon **en CONTRE** ⇢ Jab → Revers → Swipe | 72 + 22 + 24 + 31 = **149**, KD |
| Riff | Ciseau aérien **en cross-up** (sur un Nayo accroupi) → ↓L → ↓L → Glissade | 25 + 18 + 16 + 49 = **108**, KD |
| Riff | Prise, 3 coups de tête, Ciseaux | **115** |

Soit 9 à 22 % de la vie adverse : un combo compte, une erreur ne tue pas.

### 7.9 Compteur, HUD et onomatopées

- **Base** : `src/render/combo-counter.ts` (encore hors commit) : chiffre de 24 px qui « pop » (+60 % sur 8 images, flash blanc de 2 images), teinté de la couleur d'énergie de l'attaquant, « COMBO », « N dégâts », maintenu 70 images dont 20 de fondu. Il reste **en haut**, sous la barre de l'attaquant (les coins du bas sont sous les pouces).
- **Ajouts** : tampon CONTRE ou PUNITION à côté du chiffre quand le premier coup en était un ; tabassage et jongle comptent (`comboCount` augmente si la victime est en hitstun, en `airHit` jonglable ou tenue).
- **Traînée de vie** : la part perdue reste blanche sur la barre, puis se vide 30 images après la fin du combo. On lit ce que le combo a coûté.
- **Onomatopées BD** (tâche #22) : une **série** = coups portés par un joueur sans en recevoir entre deux, même hors combo. Calculée dans le rendu à partir des contacts ; remise à zéro quand on est touché ou au round suivant. Au point d'impact : « PAF » (1), « BAM » (2), « VLAN » (3), « CRAC » (4), « BOUM » (5 et plus), « K.O. » au KO. Taille qui grandit avec la série, rotation ±8°, couleur de l'attaquant, 18 images. **Pool fixe de 6 objets.**
- **Tampons en images** : « CONTRE ! », « PUNITION ! », « DÉGAGEMENT ! », « DROP ! » et les onomatopées sont des **images générées** (`tools/sprites/stamps`), pas du texte : aucune limite de glyphes, accents compris. Le texte du HUD (chiffres, « COMBO », « dégâts ») reste en police ; `tests/render/glyphs.test.ts` vérifie que chaque chaîne affichée n'utilise que des glyphes présents dans Press Start 2P (pas de capitale accentuée).
- **Musique** : chaque coup d'un combo joue une note qui monte une gamme pentatonique dans la tonalité du stage (audio seul, aucun effet de jeu). À 5 coups, la foule réagit.
- Le texte n'est réécrit **que si la valeur change** (déjà la règle de `ComboCounter`).

---

## 8. Le Crossfader : la mécanique signature

### 8.1 L'idée

Dans un *sound clash*, deux sound systems s'affrontent et **la foule choisit**. Nayo est un boxeur-DJ ; le stage est un club. Entre les deux barres de vie se trouve un **crossfader de table de mixage** : chaque personnage a son thème musical, calé au tempo du stage.

- Celui qui **prend l'initiative** (avance, presse, touche, saisit, fait garder son projectile) **tire le curseur vers lui**, et **la musique bascule vers son thème**.
- Curseur à fond : **montée** (le son se tend) jusqu'au prochain temps fort de la mesure, puis **DROP** : pendant trois mesures, le joueur frappe un peu plus fort et son spécial signature passe en **Remix**.

L'inspiration avouée est le GRD d'Under Night In-Birth (un tug-of-war qui récompense l'initiative). La nouveauté est de l'exprimer entièrement par la musique et l'univers : on **entend** qui mène.

### 8.2 Règles

**État** : `GameState.mix = { level, buildUp, drop, dropFrames }`. `level` va de −1000 (côté P1) à +1000 (côté P2). Il revient à 0 à chaque round et à la fin d'un DROP.

| Événement (pour l'acteur) | Effet sur le curseur |
|---|---|
| Coup ou projectile qui **touche** | +40 |
| Coup ou projectile **gardé** par l'adversaire | +25 |
| CONTRE ou PUNITION | +20 en plus |
| Projectile franchi par un saut adverse (le projectile passe sous un adversaire en l'air) | +10 |
| Prise qui **saisit** | +50 |
| Coup de tabassage | +15 |
| **Dégagement** (pour celui qui se dégage) | +30 |
| Marcher ou dasher **vers** l'adversaire | +1 par tic, **seulement tant que sa moitié est sous 500** (on ne remplit pas le curseur en marchant) |
| Reculer (marche arrière hors garde, backdash) **à moins de 150 px et sans projectile à soi à l'écran** | −1 par tic |
| Garder, être touché, sauter, rester immobile | 0 |

- **Montée** : `|level| = 1000` déclenche la montée du joueur concerné ; le curseur est **gelé**. Le DROP démarre au prochain **temps fort** (`frame % (4 × stage.beatTicks) === 0`, soit au plus 2 s à 120 BPM). La montée sert de compte à rebours lisible.
- **DROP** : 3 mesures (12 temps : 360 tics à 120 BPM). Pour celui qui l'a : **+10 % de dégâts** et son spécial signature en **Remix** (§5.6). Un seul DROP à la fois ; le curseur reste gelé pendant la montée et le DROP.
- **Le zoning compte** : un Vinyle qui touche, est gardé ou force un saut fait monter le curseur ; reculer derrière son propre projectile ou au-delà de 150 px ne coûte rien. Nayo n'est pas puni pour jouer son plan.
- **Anti-boule de neige** : le curseur récompense l'**initiative**, pas les dégâts. Être touché ne coûte rien. Un défenseur qui punit gagne autant qu'un attaquant.
- **Ordre de grandeur** : un joueur entreprenant fait environ un DROP toutes les 25 à 45 s, soit 1 à 2 par round de 99 s. Le réglage fin se fait par simulation (§8.6).

### 8.3 Interface (lisible sur téléphone)

- Sous le chronomètre : une **piste de 96 × 4 px** avec un **curseur de 8 × 12 px**. La moitié du côté du meneur se remplit dans sa couleur (cyan ou magenta).
- La piste **pulse sur chaque temps** (1 px de lueur, 2 Hz à 120 BPM, toujours sous 3 Hz).
- **Montée** : le curseur clignote sur chaque temps restant (« 3 · 2 · 1 ») ; le son monte (filtre qui s'ouvre).
- **DROP** : tampon « DROP ! » ; les lumières du stage passent à la couleur du joueur ; la foule saute ; aura additive autour du joueur (sprite de pool) ; petite lampe « DROP » sous sa barre de vie tant qu'il dure.
- **Accessibilité** : aucun clignotement au-delà de 3 par seconde (WCAG 2.3.1) ; l'option « Flashs réduits » remplace les flashs de lumière par des couleurs fixes et réduit les secousses.

### 8.4 Musique (`src/audio/music.ts`, nouveau)

- Un **séquenceur procédural** (Web Audio, comme `sfx.ts`) : une boucle de batterie par stage, plus un **thème par personnage** décrit en données (`src/audio/patterns/*.ts` : notes, batterie, basse). Le BPM est un paramètre : un thème tourne sur tous les stages sans être recomposé.
- Le niveau du curseur pilote un **fondu enchaîné à puissance constante** entre les deux thèmes. Au DROP, la section « drop » du thème du joueur part sur le temps fort.
- **Synchronisation** : l'horloge de rythme est `state.frame`, qui avance aussi pendant le hitstop, donc reste alignée sur le temps réel. Le son est programmé 100 ms à l'avance sur l'horloge de l'`AudioContext`. Si la dérive dépasse 40 ms, on se recale au temps fort suivant. Pause et onglet caché : `suspend()`. Au KO, « vinyl brake » (le disque ralentit pendant le ralenti).
- **Rien de jeu ne dépend de l'audio** : la musique lit l'état, jamais l'inverse. Le jeu se joue sans le son.

### 8.5 Le tempo, toujours cosmétique

- Le décor, la foule, les lumières et la piste du Crossfader battent au tempo du stage.
- Un coup qui touche à ±2 tics d'un temps joue un « stab » musical et un flash un peu plus grand : **aucun effet sur les dégâts** (D17).
- Entraînement : métronome audible activable.

### 8.6 Déterminisme, KISS et réglage

- Tout le gameplay du Crossfader est dans `src/core/mix.ts`, une passe pure après la résolution du tic : gains calculés à partir de `GameState.contacts` et des déplacements du tic, temps forts calculés à partir de `frame` et de `stage.beatTicks`.
- **Un seul nombre** partagé, **une** règle de déclenchement, **un** effet (+10 % et un Remix). Aucun bouton.
- `tests/core/mix-balance.test.ts` : 200 matchs CPU difficile contre CPU difficile, graine fixe, sans écran, en alternant les côtés. Il vérifie que la moyenne de DROP par round reste entre **0,8 et 2,5**, et que **la part de DROP de chaque personnage reste entre 40 et 60 %** sur Nayo contre Riff.

---

## 9. Hitbox honnêtes et coups bas qui touchent visiblement

### 9.1 Diagnostic (faits mesurés)

1. `fight-events.ts` `contactPoint` place étincelles, flash de garde et sang à `x ± 12 px` et à une hauteur **fixe** (50 px debout, 28 accroupi), quel que soit le coup : un coup au tibia étincelle à la poitrine.
2. La réaction ne dépend que du drapeau accroupi : aucune réaction à la jambe, aucune chute fauchée.
3. Les hurtbox (±16 debout, ±18 accroupi) dépassent les orteils dessinés (13,5 à 14,5 px) : un coup bas à portée maximale touche avec 2,5 à 5 px de vide.
4. L'Uppercut a 7,5 à 10 px de portée horizontale invisible ; Riff est une boîte grise qui dessine sa pushbox et non sa hurtbox.

### 9.2 Hurtbox calées sur le dessin

- Type : chaque posture a une **liste** de boîtes (`standingHurtboxes`, `crouchingHurtboxes`, `airHurtboxes`), au plus deux. La phase 1.1 convertit l'existant en listes d'une boîte (équivalence stricte).
- **Règle de calibration** : le bord avant d'une boîte suit le bord avant **dessiné** à ±1,5 px sur toute sa hauteur, sur les poses neutres, de garde et de coup reçu. Le bord arrière suit le pied arrière. Une posture n'a deux boîtes (jambes, buste) que si le dessin s'écarte de plus de 3 px entre ces bandes. Les valeurs sont **mesurées** sur les PNG régénérés (outil `npm run measure-boxes`, qui imprime le bord dessiné par bande de 4 px), pas devinées.
- Valeurs de départ (mesures actuelles : avant du corps entre 12,5 et 14,5 px selon la hauteur et la pose) :

| | Debout | Accroupi | En l'air |
|---|---|---|---|
| Nayo | x −16..13 / y 0..82 | x −17..14 / y 0..55 | x −15..13 / y 4..72 |
| Riff | x −15..12 / y 0..76 | x −16..13 / y 0..50 | x −14..12 / y 4..64 |

- Valeurs calibrées sur les planches (`npm run measure-boxes`, testées par `tests/tools/hurtboxes.test.ts`) :

| | Debout | Accroupi | En l'air |
|---|---|---|---|
| Nayo | x −27..13,5 / y 0..78,5 | x −18,5..14 / y 0..57 | jambes x −22..21 / y 4..44, buste x −11..18 / y 44..86,5 |
| Riff | x −33,5..15 / y 0..75 | x −32..15 / y 0..57,5 | jambes x −28..18 / y 4..44, buste x −21..14,5 / y 44..81 |

  Riff, la punk : sa base de b-girl est large (le pied arrière à −27 en garde, −33,5 quand un coup au ventre le fait glisser), le bout des rangers à 16 px (la boîte s'arrête un pixel avant, comme celle de Nayo, pour qu'un coup bas à sa portée maximale touche la ranger et jamais l'air devant), la frange à 75 px debout et 81 en saut.
- **Hurtbox de coup** (`MoveData.hurtboxes`, par plage de frames) : remplace la posture pendant le coup, là où le dessin quitte la posture (mesuré par `npm run measure-boxes -- riff --moves`). La Glissade s'en sert (−42..20 / 0..28,5 de f2 à f20 : la tête au sol derrière elle, les rangers qui frappent devant). Riff aussi pour les coups qui la décollent du sol : le Retourné (−15..15 / 16..96 de f6 à f10, le saut du scorpion), le Genou montant (−24..13,5 / 32..111 de f4 à f9, −16,5..13 / 24..106 de f10 à f15, son freeze en l'air ; le genou tendu devant reste un membre), le Retrait (−21..14 / 12..75 de f5 à f8, son flip : les coups bas l'effleurent encore, leur hitbox monte à 14) et le Saut de l'ange (−24..30,5 / 32..78 de f12 à f15, roulée en boule au sommet). `tests/tools/hurtboxes.test.ts` vérifie chaque image d'un coup au sol contre les boîtes en vigueur (pieds à plus de 4 px au-dessus du bas de la boîte, ou corps au-dessus d'elle : refusé) ; `tests/core/lifted-boxes.test.ts` fige les échanges que ces boîtes changent. Les membres tendus ne sont pas encore touchables (YAGNI : les pokes restent disjoints, mais honnêtes en portée) ; le champ le permettra si le jeu en a besoin.

### 9.3 Le point d'impact vient du cœur (`GameState.contacts`)

- Le cœur connaît déjà l'intersection quand il détecte un coup. Il écrit, pour chaque contact du tic, le **centre du recouvrement** entre la hitbox active (ou celle du projectile) et la hurtbox touchée, en sous-pixels, dans `GameState.contacts` (au plus 2 entrées). Quand rien ne touche, `contacts` vaut la constante gelée `EMPTY_CONTACTS` : zéro allocation.
- Les intersections se calculent **sur place**, en arithmétique sur les bords (`overlaps(box, x, y, facing, other, ox, oy, ofacing)` dans `boxes.ts`), sans créer de `WorldBox` (`toWorld` reste pour le debug).
- `fight-events.ts` lit `contacts` au lieu de deviner : l'étincelle d'un Coup bas jaillit au tibia (≈ 9 px du sol). Sur un coup bas : étincelle « rasante » horizontale et nuage de poussière au sol, pas de sang (le sang reste aux coups lourds hauts et moyens).
- Une seule géométrie, partagée par le cœur et le rendu (DRY).

### 9.4 Réaction selon la hauteur (`FighterState.reaction`)

`applyHit` pose la réaction à partir de la géométrie du contact, sans donnée en plus :

| Réaction | Condition |
|---|---|
| `low` | coup gardé `low` (coup bas), ou impact dans le tiers inférieur de la hurtbox |
| `high` | impact au-dessus de 60 % de la hauteur debout du défenseur |
| `mid` | sinon |
| `crouch` | défenseur accroupi |
| `trip` | mise au sol marquée `trip` (balayages, Glissade) : levée faible (2 px/tic), la victime tombe sur le dos |
| `launch` | lanceur ou mise au sol classique |
| `thrown` | lâcher d'un lancer |

Le cœur garde aussi `reactionHeavy` (hitstun ≥ 18) et `stunTotal` (durée du stun reçu). Le rendu reste une fonction pure de l'état : utile pour les replays et le rollback.

### 9.5 Tests d'alignement (`tests/tools/sprites.test.ts`, durcis)

| Vérification | Tolérance |
|---|---|
| Bout du membre ou de l'effet dessiné contre bord lointain de la hitbox, frappes | −3 / +4 px (au lieu de −6 / +8), dans la bande de hauteur de la hitbox |
| Coups bas : bout du **pied** dessiné contre bord de la hitbox | −2 / +3 px |
| Uppercut et anti-airs | contrôlés **aussi en horizontal** |
| Bord avant des hurtbox contre bord dessiné, poses neutres, de garde, de coup reçu | ±1,5 px sur toute la hauteur de la boîte |
| **Contact visible** : pour chaque coup bas, à la distance maximale où il touche (calculée depuis les boîtes) contre chaque posture adverse, les masques alpha de l'attaquant et du défenseur rendus côte à côte se touchent | écart ≤ 1 px |
| Riff | les mêmes tests depuis la phase 4 (`tests/tools/riff-sprites.test.ts`, `hurtboxes.test.ts`, `visible-contact.test.ts`, `hold-pairs.test.ts`), sauf la portée du Genou montant, vérifiée vers le haut seulement (−6 / +8) tant que son saut dessiné attend sa décision. Le Ciseau aérien, dont la hitbox commence derrière elle, est aussi mesuré **vers l'arrière** (−3 / +4 contre le bord −14) |
| **Par coup, non par planche** (combos v3) | les portées se mesurent pour chaque coup qui frappe, avec la planche que joue son clip (`strikesOf`, `tools/sprites/clips.ts`) : le Double direct sur la planche du Direct, le Marteau sur celle de l'Overhand, la Hache sur celle du Talon. Le Crochet au foie, le Remontant chassé, le Coup de boule et le Retourné sauté jouent leurs propres planches (branche d'art `feat/combos-v3-art`). Une planche dessinée avant son coup (la Mégabasse, le Slam) se mesure contre la frappe prévue de sa table d'attente (`tools/sprites/<nom>/pending-timing.ts`), jusqu'à ce que son coup la joue |

Correctifs de données déjà identifiés : Uppercut x 4..30 → **4..24** ; j.L de Nayo x 4..30 → **4..28** (corps à 25,5) ; Crochet x 10..54 → **10..52** et pose du bras qui atteint 51 à 53 ; Balayage x 12..52 → **12..51** (pied à 49,5, effet à 53).

### 9.6 Vue debug et boîte grise

- Debug (`?debug` ou DEV) : pushbox (bleu), pushbox aérienne et couchée, hurtbox (vert), hurtbox de coup (pointillés), hitbox active (rouge), invincibilité (teinte blanche), anti-prise (contour jaune). Option « Afficher les boîtes » dans le menu d'entraînement.
- Un personnage sans art (Riff jusqu'à la phase 4) : la boîte grise dessine **sa hurtbox** et un « pied » de 6 × 4 px dans la direction du regard. Sa hitbox rouge n'apparaît plus hors debug. Dès que son art existe, ses planches prennent le relais.

---

## 10. Frame data v2

Colonnes : **S/A/R** = démarrage / actif / récupération (total). **Dg** = dégâts (chip entre parenthèses). **HS/BS** = hitstun / blockstun. **Stop** = hitstop. **Recul** = vitesse initiale de glissade du défenseur (px/tic). **Av.** = avantage touché / gardé. **KD (V)** = mise au sol avec levée V ; la victime vole à la vitesse du recul, sauf les lanceurs (0,5 px/tic) et les lancers (vx indiqué). Portée = distance maximale de centre à centre contre Nayo debout (bord avant 13 px). Combos v3 (`docs/combos-v3.md`) : la colonne « Annule en » donne aussi les cordes ; un coup en l'air coûte 1 point de jongle, sauf « jongle 2 » ; les gels des fins (Mise au tapis, Pied fendu, Uppercut) sont plus longs.

### 10.1 Nayo (1000 PV)

| Id | Entrée | Nom | S/A/R (tot) | Dg | HS/BS | Stop | Recul | Garde | Hitbox x / y | Mouvement | Av. | Portée | Annule en |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| standLight | L | Direct | 4/3/7 (14) | 30 | 14/10 | 8 | 2,5 | mid | 10..40 / 46..58 | — | +5/+1 | 53 | normal, spécial ; cordes : L (neutre, →) Cross, ←L Double direct, ↓L Coup bas |
| jabRepeat | L, ← + L | Double direct | 3/2/7 (12) | 20 | 13/10 | 7 | 1,5 | mid | 10..40 / 46..58 | — | +5/**+2** | 53 | spécial ; cordes : L (neutre, →, ←) Cross, ↓L Coup bas, H (neutre, →) Crochet, ↓H Balayage, ←H Remontant chassé |
| chainLight | L après Direct | Cross | 6/3/12 (21) | 40 | 18/12 | 9 | 1,5 | mid | 10..46 / 46..60 | +10 px f0–5 | +4/−2 | 69 | spécial ; cordes : L (toute direction) Mise au tapis, H Crochet, →H Marteau, ↓H Balayage, ←H Remontant chassé |
| lightFinisher | L après Cross | Mise au tapis | 8/3/18 (29) | 50 | KD (3)/12 | **14** | 4 | mid | 10..48 / 44..62 | +12 px f0–7 | KD +31 / −8 | 73 | — ; finit une jongle |
| forwardLight | → + L | Jab chassé | 7/3/10 (20) | 35 | 15/11 | 8 | 2,5 | mid | 10..42 / 46..58 | +14 px f0–6 | +3/−1 | 69 | spécial ; corde : L (neutre, →, ←) Cross |
| standHeavy | H | Crochet | 8/4/16 (28) | 80 | 20/14 ; **CONTRE 36, recul 0,5 (plie)** | 12 | 3,5 | mid | **10..52** / 44..62 | — | +1/−5 (CONTRE +17) | 65 | spécial ; cordes : H (neutre, →) Crochet au foie, ↓H Balayage, ←H Remontant chassé ; jongle 2 |
| chainHeavy | H, H | Crochet au foie | 8/3/17 (28) | 60 | 22/12 | 11 | 2,5 | mid | 8..46 / **24..44** (touche l'accroupi) | +22 px f3–7 (f0–2 sur place) ; hurtbox qui descend avec le corps : haut 71 (f0–2), 66,5 (f3–5), 64 (f6–16), 73,5 (f17–22) | +3/−7 | 81 | spécial ; jongle 2 |
| chainHigh | L, L, → + H | Marteau | 14/3/15 (32) | 60 | 19/11 | 12 | 3 | **overhead** | 12..40 / 36..72 | +16 px f0–9 | +2/−6 | 69 | spécial ; **Rebond** sur un corps jonglé, une fois par combo |
| forwardHeavy | → + H | Overhand | 19/3/15 (37) | 70 | 18/13 | 12 | 3 | **overhead** | 12..40 / 36..72 | +8 px f6–13 | +1/−4 (CONTRE +5) | 61 | — |
| backHeavy | ← + H | Remontant | 7/4/17 (28) | 65 | lance (**8**, 4 points ; 5 en CONTRE)/14 | 11 | 3 | mid | 4..30 / **58**..104 | — | lance / −6 | 43 (rate l'accroupi) | spécial |
| chainLaunch | L, L, ← + H | Remontant chassé | 7/4/17 (28) | 60 | lance (8, 4 points)/14 | 11 | 3 | mid | 4..30 / 58..104 | +12 px f0–6 | lance / −6 | 55 (rate l'accroupi) | spécial |
| crouchLight | ↓ + L | Coup bas | 4/2/8 (14) | 25 | 12/8 | 7 | 2,5 | low | 12..38 / 4..14 | — | +3/−1 | 51 | normal, spécial |
| crouchHeavy | ↓ + H | Balayage | 9/3/20 (32) | 70 | KD trip (2)/14 | 11 | 3,5 | low | **12..51** / 2..14 | — | KD +25 / −8 | 64 | — |
| jumpLight | air L | Genou sauté | 4/6/6 | 30 | 14/10 | 8 | 2 | overhead | **4..28** / 10..26 | — | — | 41 | — |
| jumpHeavy | air H | Coup de pied sauté | 7/5/10 | 70 | 18/12 | 11 | 3 | overhead | 2..36 / −4..18 | — | — | 49 | — |
| special | S, ↓↘→ | **Vinyle** | 12/1/28 (41) | 60 (9) | 18/14 | 8 | 3 | mid | projectile 3,5 px/tic, né à 24 px devant, boîte **−10..10 / 32..52** | — | −14 au contact (gardé) | écran | — |
| specialForward | → + S | Pied fendu | 11/4/18 (33) | **75** (11) | **KD (3)**/12 | **14** | 3,5 | mid | 8..44 / 24..40 | +30 px f3–14 | KD +30 / −9 | 77 | — |
| specialAntiAir | ↓ + S, →↓↘ | Uppercut | 3/8/28 (39) | 110 (16) | KD (3)/12 | **16** | 3 | mid | **4..24** / 30..100 | — | KD +16 / −23 | 37 | — ; invincible f0–6 (coups, projectiles, prises) |

### 10.2 Riff (900 PV)

| Id | Entrée | Nom | S/A/R (tot) | Dg | HS/BS | Stop | Recul | Garde | Hitbox x / y | Mouvement | Av. | Portée | Annule en |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| standLight | L | Jab | 3/2/6 (11) | 25 | 13/9 | 7 | 2,5 | mid | 9..33 / 42..54 | — | +6/+2 | 46 | normal, spécial ; corde : L (neutre, →, ←) Revers |
| chainLight | L après Jab | Revers | 5/3/10 (18) | 30 | 16/11 | 8 | 1,5 | mid | 8..38 / 44..58 | +10 px f0–4 | +4/−1 | 61 | spécial ; cordes : L (toute direction) Swipe, H Coude, →H Hache, ↓H Windmill, ←H Retourné sauté |
| chainHigh | L, L, → + H | Hache | 12/3/14 (29) | 50 | 17/11 | 10 | 2,5 | **overhead** | 8..34 / 34..70 | +12 px f0–7 | +1/−5 | 59 | spécial |
| chainLaunch | L, L, ← + H | Retourné sauté | 6/5/15 (26) | 50 | lance (8, 4 points)/13 | 10 | 3 | mid | −12..22 / 58..100 | +14 px f0–1 (le bond d'appel, les deux rangers en l'air) ; hurtbox du Retourné de f6 à f10 | lance / −6 | 49 (rate l'accroupi) | spécial |
| lightFinisher | L après Revers | Swipe | 7/3/18 (28) | 45 | KD (2,5)/11 | 10 | 4 | mid | 8..42 / 30..56 | +10 px f0–6 | KD +29 / −9 | 65 | — ; **Vrille** sur un corps jonglé, une fois par combo |
| forwardLight | → + L | Toprock | 8/2/10 (20) | 30 | 15/12 | 8 | 2,5 | mid | 8..32 / 44..58 | +20 px f0–7 | +4/**+1** | 65 | normal, spécial (une fois par phrase) ; corde : L (neutre, →, ←) Revers |
| standHeavy | H | Coup de coude | 6/3/14 (23) | 70 | 19/13 | 11 | **2** | mid | 9..43 / 40..58 | — | +3/−3 | 56 | spécial ; cordes : H (neutre, →) Coup de boule, ↓H Windmill, ←H Retourné ; jongle 2 |
| chainHeavy | H, H | Coup de boule | 6/2/14 (22) | 50 | 18/12 | 10 | 2 | mid | 8..34 / 50..66 | +12 px f0–5 | +3/−3 | 59 | spécial |
| forwardHeavy | → + H | Talon | 17/3/14 (34) | 60 | 17/12 | 11 | **2,5** | **overhead** | 8..34 / 34..70 | +15 px f4–13 | +1/−4 (CONTRE +5) | 62 | — |
| backHeavy | ← + H | Retourné | 6/5/15 (26) | 55 | lance (**8**, 4 points)/13 | 10 | 3 | mid | **−12..22** / **58**..100 | hurtbox −15..15 / 16..96 de f6 à f10 | lance / −6 | 35 (rate l'accroupi) | spécial |
| crouchLight | ↓ + L | Coup bas | 3/2/7 (12) | 20 | 12/8 | 6 | 2 | low | 10..32 / 4..14 | — | +4/0 | 45 | normal, spécial |
| crouchHeavy | ↓ + H | Windmill | 7/3/18 (28) | 65 | KD trip (2)/13 | 10 | 3 | low | 10..44 / 2..14 | — | KD +27 / −7 | 57 | — |
| jumpLight | air L | **Ciseau aérien** | 3/6/5 | 25 | 13/9 | 7 | 2 | overhead | **−14..26** / 6..24 | — | — | 39, et derrière | — |
| jumpHeavy | air H | Talon sauté | 6/5/9 | 65 | 17/11 | 10 | 3 | overhead | 2..32 / −4..18 | — | — | 45 | — |
| special | S, ↓↘→ | **Glissade** | 10/8/16 (34) | 70 (10) | KD trip (2)/14 | 10 | 3,5 | **low** | 6..36 / 2..14 | 64 px f1–17 (ease-out) ; hurtbox −42..20 / 0..28,5 de f2 à f20 | KD +24 à +31 / −9 au contact, −2 en bout | ≈ 102 | — |
| specialForward | → + S | Saut de l'ange | 16/4/14 (34) | 70 (10) | 18/10 | 11 | 3 | overhead | 0..30 / 16..56 | dx 2,2 px f4–19 (35 px) ; **y en arc f3–19, sommet 34 px à f11** | +1/−7 | 69 | — |
| specialAntiAir | ↓ + S, →↓↘ | Genou montant | 4/6/24 (34) | 95 (14) | KD (3)/12 | 12 | 3 | mid | 4..28 / 30..92 | +12 px f0–7 ; hurtbox −24..13,5 / 32..111 de f4 à f9, −16,5..13 / 24..106 de f10 à f15 | KD +22 / −17 | 47 | — ; invincible f0–5 **contre les attaques aériennes seulement** |

Hauteur du Saut de l'ange par frame (px, f3 → f19) : 5,9 · 11,6 · 17,0 · 21,9 · 26,1 · 29,4 · 31,9 · 33,5 · 34,0 · 33,5 · 31,9 · 29,4 · 26,1 · 21,9 · 17,0 · 11,6 · 5,9. Les coups bas (hitbox sous 14 px) la ratent de f4 à f18 ; une prise la rate de f3 à f19. Au sommet (f12 à f15), roulée en boule à 32 px au-dessus de ses pieds, elle passe aussi au-dessus du Direct (46..58), pas de l'Uppercut.

Le Retourné et le Genou montant sont dessinés en l'air sans quitter le sol (le moteur ne les lève pas) : leurs hurtbox suivent le dessin (§9.2). Les coups bas (hitbox sous 14 px) ratent le Retourné de f6 à f10 et le Genou montant de f4 à f15 ; ils les touchent avant et après (CONTRE au démarrage et en actif, PUNITION en récupération). Le Retrait (12..75 de f5 à f8) reste effleuré par les coups bas. Décision prise par défaut (§18.3).

Vitesses de la Glissade (px/tic, f1 → f17) : 7,31 · 6,86 · 6,43 · 5,97 · 5,54 · 5,09 · 4,65 · 4,21 · 3,77 · 3,32 · 2,88 · 2,43 · 2,00 · 1,55 · 1,10 · 0,67 · 0,22.

### 10.3 Prise et déplacements

Voir §4.3 (prise, tabassage, lancers) et §3.2–3.3 (dash, backdash). Récapitulatif :

| Id | Nayo | Riff |
|---|---|---|
| `grab` | 5/3/20 (28), 6..30 / 20..60, portée 43 | 5/3/19 (27), 6..28 / 20..56, portée 41 |
| `pummel` | 6/1/9 (16), 15 fixes | 4/1/7 (12), 10 fixes |
| `throwForward` | 10/1/25 (36), 100, KD (3,5 ; vx 3,5) +28 | 10/1/21 (32), 85, KD (3 ; vx 2) +30 |
| `throwBack` | 14/1/27 (42), 90, côté f6, KD (3,5 ; vx 3) +26 | 14/1/25 (40), 80, côté f6, KD (3,5 ; vx 3) +28 |
| `dashForward` | 18, 56 px f1–14 | 16, 64 px f1–12, annulable f8 (normal, Prise, élan 50 %) |
| `dashBack` | 22, 44 px f1–16, anti-prise f0–11 | 20, 48 px f1–14, anti-prise f0–10 |

### 10.4 Portées figées

Le tableau des portées (chaque coup contre chaque posture des deux personnages) est **généré** par un script et figé en test d'instantané (`tests/data/ranges.test.ts`) : aucune portée ne change par accident.

---

## 11. Planches d'animation à produire

Rappels du pipeline : 1 px de sprite = ½ px monde, cellule de 256, ancre en (128, 248). La somme des tics d'un clip d'attaque doit égaler S + A + R (`assertValidArt`). « Actif » donne l'index de l'image active et ses tics. Règle d'art pour tout ce qui décolle (Saut de l'ange, jongles, lancers) : **la hauteur vient du moteur**, la pose reste ancrée aux pieds.

### 11.1 Réactions et états (les deux personnages)

| Planche | Images | Tics | Rôle |
|---|---|---|---|
| `hitHigh` / `hitMid` / `hitLow` | 5 / 5 / 5 | léger (hitstun < 18) : images 0, 1, 4 ; lourd : 0 à 4 ; dernière image calée sur la fin du stun (`endFrames: 1`) | tête rejetée / plié au ventre / jambe touchée qui plie, saut sur un pied. Remplacent `hitStand` |
| `hitCrouch` | 3 | 3, 4, puis tenue | accroupi (les images accroupies de l'ancienne planche `hit`) |
| `trip` | 4 | 2, 2, 2, puis tenue (vol de 7 tics) | jambes fauchées, chute sur le dos ; enchaîne sur `knockdown` |
| `knockdown` / `getup` | 4 / 5 | 3, 3, 4, 20 (30) puis 2 × 5 (10) = 40 | découpage de l'ancien `knockdown` (9 images) : la chute et le sol, puis le relevé |
| `held` | 2 | 4, 4 en boucle, l'image 1 d'abord ; elle rejoue « encaisse » dès le tic d'impact de chaque tabassage, tenue pendant son arrêt sur image | victime tenue qui lutte |
| `thrownBack` | 4 | 3, 3, 4, 4 : image pour image avec le `throwBack` jusqu'au lâcher (tic 14), derrière l'attaquant dès le tic 6. Pendant le vol, la dernière image reste dessinée là où il a été lâché (seule la hauteur suit la pushbox), puis `airHit` 2 et 3 à sa vraie place aux deux derniers tics (clip `thrownFall`), puis la chute : aucun saut à la passation | soulevée et retournée par-dessus l'épaule (arc dessiné dans la cellule) |
| `tech` | 4 | 3, 3, 4, 4 (14 = étourdissement du dégagement) | mains écartées, recul |
| `guard` | — | dernière image de `blockStand` / `blockCrouch` (la garde installée, pas l'impact), tenue | garde de proximité (aucune nouvelle image) |
| `blockStand` / `blockCrouch` | — | existantes ; dernière image calée sur la fin du blockstun | — |

### 11.2 Nayo : nouvelles planches

| Planche | Images | Tics (somme) | Actif | Hitbox x / y | Notes |
|---|---|---|---|---|---|
| `dashForward` | 6 | 1, 4, 4, 3, 3, 3 (18) | — | — | appel, glisse (traînée cyan, poussière au tic 0), réception |
| `dashBack` | 6 | 1, 4, 4, 4, 4, 5 (22) | — | — | petit bond arrière, garde haute |
| `chainLight` (Cross) | 6 | 2, 2, 2, **3**, 6, 6 (21) | image 3 = tics 6–8 | 10..46 / 46..60 | épaule arrière lancée, pas sur les images 0–2 |
| `lightFinisher` (Mise au tapis) | 7 | 2, 3, 3, **3**, 5, 6, 7 (29) | image 3 = tics 8–10 | 10..48 / 44..62 | crochet large, traînée cyan |
| `forwardLight` (Jab chassé) | 6 | 2, 2, 3, **3**, 4, 6 (20) | image 3 = tics 7–9 | 10..42 / 46..58 | pas glissé sur les images 0–2 |
| `forwardHeavy` (Overhand) | 9 | 4, 4, 4, 4, 3, **3**, 5, 5, 5 (37) | image 5 = tics 19–21 | 12..40 / 36..72 | pointe des pieds sur les images 3–4 ; arc cyan dès l'image 2 (effet) |
| `backHeavy` (Remontant) | 7 | 2, 2, 3, **4**, 5, 6, 6 (28) | image 3 = tics 7–10 | 4..30 / 56..104 | poing presque vertical, tête rentrée |
| `grab` (remplace `throw`) | 6 | 2, 3, **3**, 6, 7, 7 (28) | image 2 = tics 5–7 | 6..30 / 20..60 | images 3–5 : saisie dans le vide (prise ratée) |
| `hold` | 2 | 6, 6 en boucle | — | — | tient au col |
| `pummel` (Coup de genou) | 4 | 3, 3, **1**, 9 (16) | impact image 2 = tic 6 | — | genou au ventre |
| `throwForward` (Renvoi) | 8 | 3, 3, 4, **1**, 6, 6, 6, 7 (36) | lâcher image 3 = tic 10 | — | pousse, direct qui envoie |
| `throwBack` (Projection d'épaule) | 9 | 3, 3, 4, 4, **1**, 6, 7, 7, 7 (42) | lâcher image 4 = tic 14 ; côté changé au tic 6 | — | les poings rejoignent le cou de `thrownBack` à chaque tic (test de la paire) |
| `held`, `thrownBack`, `tech`, `hitHigh`, `hitMid`, `hitLow`, `trip`, `getup` | voir 11.1 | | | | |

**Planches retouchées** : `jump` (images 1–4 : 6, 8, 8, 10 = 32 tics en l'air), `jumpForward` (3, 4, 4, 4, 4, 5, 4, 4 = 32), `walkForward` / `walkBack` (foulée recalée sur 36 et 28,8 px), `specialAntiAir` (poing qui atteint 22 à 24 px), `special` (geste de lancer du vinyle, même timing 3, 3, 3, 3, 8, 6, 5, 5, 5 = 41, le disque part à l'image 4), `projectile` (6 → **8 images**, 2 tics chacune en boucle : disque de 20 px, sillons, étiquette, rémanences), `standHeavy` (bras jusqu'à 51–53 px).

**Effets** (`fx/`) : `dashForward` (traînée), `forwardHeavy` (arc d'impact), `backHeavy` (arc montant), `lightFinisher`, `throwForward`, `projectile` (éclats en notes à l'impact, 5 images × 2 tics, rendu seul).

Total Nayo : environ **115 images nouvelles**, plus les retouches.

### 11.3 Riff : jeu complet (phase 4 ; générateur `tools/sprites/riff/` sur le squelette partagé)

| Planche | Images | Tics (somme) | Actif | Hitbox x / y | Notes |
|---|---|---|---|---|---|
| `idle` | 8 | 7, 4, 5, 5, 7, 3, 9, 8 (48) en boucle | — | — | toprock sur place, la frange et la chaîne de ceinture en animation secondaire |
| `walkForward` / `walkBack` | 10 / 10 | 2 × 10 en boucle | — | — | pas dansés, foulée 38 / 28 px |
| `crouch` | 6 | 2, 2, 2, 8, 8, 8 (boucle depuis 3) | — | — | appuis bas |
| `jump` | 6 | pré-saut [0] 3 ; air [1–4] 6, 7, 7, 8 (28) ; atterrissage [5] 2 | — | — | — |
| `jumpForward` | 7 | 3, 4, 4, 4, 4, 4, 5 (28) | — | — | **salto avant** ; l'image 0 est son pré-saut (clip `preJumpForward`, avant tenu), les images 1–6 l'air |
| `block` | 6 | debout 0–2, accroupi 3–5 (comme Nayo) | — | — | — |
| `hitHigh`, `hitMid`, `hitLow`, `hitCrouch`, `trip`, `airHit`, `knockdown`, `getup`, `ko`, `held`, `thrownBack`, `tech` | 5, 5, 5, 3, 4, 4, 6, 5, 8, 2, 4, 4 | comme Nayo (KD 40) | — | — | — |
| `intro` / `victory` / `timeOver` | 10 / 8 / 4 | intro = 90 | — | — | rejette sa frange d'une main, « viens » ; freeze sur une main et clin d'œil |
| `dashForward` (Footwork) | 6 | 1, 3, 3, 3, 3, 3 (16) | — | — | traînée magenta ; image 4 = posture d'annulation |
| `dashBack` | 6 | 1, 4, 4, 3, 3, 5 (20) | — | — | petit flip arrière |
| `standLight` (Jab) | 5 | 1, 2, **2**, 3, 3 (11) | image 2 | 9..33 / 42..54 | épaule rentrée |
| `chainLight` (Revers) | 6 | 2, 3, **3**, 3, 3, 4 (18) | image 2 | 8..38 / 44..58 | la frange fouette |
| `lightFinisher` (Swipe) | 7 | 2, 2, 3, **3**, 5, 6, 7 (28) | image 3 | 8..42 / 30..56 | coup de pied circulaire |
| `forwardLight` (Toprock) | 6 | 2, 3, 3, **2**, 5, 5 (20) | image 3 | 8..32 / 44..58 | pas de danse sur les images 0–2 |
| `standHeavy` (Coude) | 7 | 2, 2, 2, **3**, 4, 5, 5 (23) | image 3 | 9..43 / 40..58 | coude tournant |
| `forwardHeavy` (Talon) | 8 | 4, 4, 4, 5, **3**, 4, 5, 5 (34) | image 4 | 8..34 / 34..70 | jambe qui monte puis hache |
| `backHeavy` (Retourné) | 7 | 2, 2, 2, **5**, 5, 5, 5 (26) | image 3 | −12..22 / 56..100 | scorpion |
| `crouchLight` | 5 | 1, 2, **2**, 3, 4 (12) | image 2 | 10..32 / 4..14 | sur une main |
| `crouchHeavy` (Windmill) | 8 | 2, 2, 3, **3**, 4, 4, 5, 5 (28) | image 3 | 10..44 / 2..14 | rotation au sol |
| `jumpLight` (Ciseau aérien) | 5 | 1, 2, **6**, 2, 3 (14) | image 2 | −14..26 / 6..24 | ciseau de jambes, la ranger arrière plantée sous elle sur le bord −14 : cross-up |
| `jumpHeavy` (Talon sauté) | 6 | 3, 3, **5**, 3, 3, 3 (20) | image 2 | 2..32 / −4..18 | — |
| `special` (Glissade) | 8 | 2, 4, 4, **4, 4**, 3, 7, 6 (34) | images 3–4 | 6..36 / 2..14 | corps bas dès l'image 1, exactement pendant sa hurtbox basse (f2–f20) : dessinée sur 3, 3, 4, 4, 4, 5, 5, 6, re-calée sur le jeu |
| `specialForward` (Saut de l'ange) | 9 | 3, 3, 3, 3, 4, **4**, 4, 5, 5 (34) | image 5 | 0..30 / 16..56 | vrille, talons en premier |
| `specialAntiAir` (Genou montant) | 8 | 2, 2, **3, 3**, 6, 6, 6, 6 (34) | images 2–3 | 4..28 / 30..92 | freeze explosif |
| `grab` | 6 | 2, 3, **3**, 6, 6, 7 (27) | image 2 | 6..28 / 20..56 | — |
| `hold` | 2 | 6, 6 en boucle | — | — | — |
| `pummel` (Coup de tête) | 4 | 2, 2, **1**, 7 (12) | impact tic 4 | — | — |
| `throwForward` (Ciseaux) | 7 | 3, 3, 4, **1**, 7, 7, 7 (32) | lâcher tic 10 | — | ciseau de jambes, chute tout près |
| `throwBack` (Roulade) | 8 | 3, 3, 4, 4, **1**, 8, 8, 9 (40) | côté changé tic 6, lâcher tic 14 | — | monkey flip |

Riff : 43 planches, environ **265 images**. Elles se jouent par `src/art/riff/clips.ts` (le générateur lit les mêmes tics pour la frange et la chaîne) : les réactions (`hitHigh`, `hitMid`, `hitLow`, `hitCrouch`, `block`) ont leur dernière image calée sur la fin du stun (`endFrames`), `thrownBack` suit le `throwBack` de celui qui lance (3, 3, 4, 4), et un KO en l'air (lanceur, balayage, lancer, coup en l'air) vole comme un `airHit` puis joue `koLanding` (le `ko` depuis l'assise, image 4 ; image 3 pour Nayo) dès que le corps touche le sol. C'est le poste le plus lourd : il démarre **en parallèle dès la phase 1**, dans des fichiers séparés, sans attendre le gameplay (la boîte grise honnête suffit pour jouer).

### 11.4 Variété à coût nul

- Les coups légers reçus jouent une version courte de la même planche (images 0, 1, 4).
- `endFrames` (dans `art/types.ts`) : les N dernières images d'un clip de stun se calent sur la **fin réelle** du stun (`stunTotal`). Le retour en garde tombe pile quand le joueur peut agir : animation plus fluide et plus honnête.
- Deuxième pose de victoire : phase 7.

---

## 12. Stages et level design

### 12.1 Règles communes

| Règle | Valeur | Pourquoi |
|---|---|---|
| Largeur de jeu | **960 px pour tous**, sol plat, départ à 160 px | Équité : même distance au coin partout ; les tests existants restent valides |
| Murs | bords de caméra (480 px) et extrémités du stage (inchangé) | — |
| Interactions de décor | **aucune** | Équité et lisibilité compétitive |
| Tempo | `StageConfig.beatTicks` entier : 120 BPM = 30, 100 BPM = 36, 90 BPM = 40 | Le Crossfader et le décor en dépendent |
| Coins | **un gros élément vertical marque chaque bord** | On voit pourquoi on est bloqué |

**Lisibilité (checklist vérifiée sur captures à chaque stage)**

1. Le décor reste entre 10 et 40 % de valeur : les combattants ressortent toujours.
2. Aucun aplat saturé cyan ou magenta (les couleurs des persos) dans la bande de 20 à 110 px au-dessus du sol derrière les combattants : la place est réservée aux projectiles et aux étincelles.
3. Aucune animation de décor à hauteur de combattant qui ressemble à un projectile.
4. **Rien ne recouvre les pieds** : la brume au sol passe *derrière* les combattants, à 15 % d'opacité au plus. Les coups bas restent visibles.
5. Le premier plan reste dans les 12 px du bas, sombre, et aux bords seulement.
6. Rien ne bouge plus vite que le temps derrière les combattants ; aucun clignotement au-delà de 3 par seconde.

**Parallaxe** : fond 0,1–0,2 · mur 0,3 · foule 0,5 · sol 1,0 · premier plan 1,2 (bords bas seulement). Une couche de facteur f fait `480 + 480 × f` px de large. La caméra est bornée au stage, donc le décor « tient » au coin.

### 12.2 L'Entrepôt (Sound Clash, stage de lancement, 120 BPM)

| Couche | Parallaxe | Contenu | Animation au tempo |
|---|---|---|---|
| Plafond | 0,1 | charpente métallique, nuit violette, projecteurs suspendus | les projecteurs pulsent sur les temps, **couleur du meneur du Crossfader** |
| Mur du fond | 0,3 | **mur d'enceintes** ; cabine de DJ en mezzanine au centre, DJ en silhouette ; enseigne néon orange « NAYOSBEAT » | membranes qui pompent (2 images) ; le DJ hoche la tête, lève les bras au DROP |
| Foule | 0,5 | deux rangées de silhouettes à contre-jour, plus denses au centre | rebond de 4 images **sur le BPM** ; sursaut sur les coups lourds, à 5 coups de combo et au KO |
| Sol (jeu) | 1,0 | béton ciré, reflets néon orange et violet (jamais cyan), repères discrets tous les 32 px | reflets qui suivent les lumières |
| Brume | 1,0, derrière | fumée basse | dérive lente (0,2 px/image) |
| Premier plan | 1,2 | deux enceintes et des câbles dans les coins bas | — |

- **Coins** : à gauche, une pile d'enceintes géante ; à droite, un rideau métallique tagué.
- **Lumière** : douche chaude depuis la cabine, contre-jours de la couleur du meneur.
- **DROP** : projecteurs et LED à la couleur du joueur, confettis de son (pool), au plus 3 flashs par seconde.
- **KO** : « vinyl brake », lumières coupées sauf un spot blanc sur le perdant, décor désaturé à 60 %, clameur une seconde après.

### 12.3 Salle de répétition (entraînement)

Variante sobre de l'Entrepôt : lumières fixes, pas de foule, **règle de distance au sol** (graduations tous les 16 px, chiffres tous les 64 px), métronome LED au mur (activable). Utile pour « faire gaffe aux hitbox » : on mesure les portées à l'œil.

### 12.4 Plus tard, avec leurs personnages

- **Le Toit** (Néon Underground, 100 BPM) : ciel urbain et voitures volantes (0,1–0,2) ; enseignes géantes qui clignotent au temps (0,3) ; antennes et châteaux d'eau (0,5) ; pluie sur deux couches, **derrière** les combattants ; flaques qui reflètent ; coins : climatiseurs et panneau publicitaire. Au DROP, la pluie se fige un temps ; au KO, coupure de courant.
- **La Cour du Temple** (Archipel, 90 BPM, taiko) : mer et îles au crépuscule (0,1–0,2) ; cerisiers, pétales rares (pool de 24) ; lanternes qui oscillent au temps et prennent la couleur du joueur au DROP ; dalles ; coins : torii laqué et mur de pierre.

### 12.5 Données et performance

- `StageConfig` (cœur, gameplay seul) : `width`, `startDistance`, **`beatTicks`**. `data/stages.ts` : `WAREHOUSE`, `REHEARSAL` (entraînement), plus tard `ROOFTOP`, `TEMPLE`. `MatchSetup` gagne `stage`.
- `StageArt` (rendu seul) : couches, facteurs de parallaxe, boucles d'ambiance au tempo. Généré par `tools/stages/` comme les sprites, dans `src/art/stages/<id>/`. Affiché par `src/render/stage/stage-view.ts`. Le cœur n'en sait rien.
- Chaque couche est une texture pré-rendue (Image ou TileSprite) ; la foule = **une** feuille de sprites ; l'image d'une boucle se calcule à partir de `state.frame` ; lumières = sprites additifs d'un pool. **Au plus 12 appels de dessin** pour le stage, aucun `Graphics` redessiné par image.

---

## 13. IA

Le CPU reste pur dans ses décisions, à graine, et pilote le jeu par des entrées brutes, avec son délai de réaction. Il ne lit jamais les entrées adverses. Les bits Dash et Grab lui évitent de simuler des double-taps ou des accords.

### 13.1 Nouveaux champs de profil

| Champ | Facile | Normal | Difficile |
|---|---|---|---|
| `dash` : dasher au lieu de marcher à mi-distance | 0,10 | 0,25 | 0,40 |
| `backdash` : sortir d'une pression de près après une garde | 0,05 | 0,15 | 0,25 |
| `tech` : tenter le dégagement, à `min(réaction, 11)` tics | 0,10 | 0,30 | 0,50 |
| `struggle` : appuis par seconde quand il est tenu | 2 | 5 | 8 |
| `pummels` : tabassages voulus avant de lancer | 0 | 1 | autant que possible |
| `overhead` : →H contre un adversaire vu accroupi sur au moins 2 de ses 3 dernières gardes | 0,10 | 0,25 | 0,40 |
| `chain` : L, L, L et lanceur → spécial | 0,20 | 0,50 | 0,85 |
| `whiffPunish` : frapper une récupération à portée | 0,10 | 0,35 | 0,70 |

### 13.2 Comportements

- **Styles par personnage** (`ai/styles.ts`, données, choisis par `match-setup`) :
  - Nayo, « contrôle » : distance idéale 90–150 px ; Vinyle au-delà de 130 px ; Remontant contre les sauts proches, Uppercut au-delà ; Overhand contre la garde basse ; après un Direct qui touche, L puis Pied fendu (normal et difficile).
  - Riff, « pression » : dash annulé en Jab ou en Prise de près ; Glissade quand un Vinyle arrive entre 60 et 140 px ; Saut de l'ange contre un adversaire accroupi ; cross-up au réveil (difficile) ; mélange Coup bas / Talon / Prise.
- **Prise** : en tenant, il tabasse selon son profil puis lance **derrière** si son propre dos est à moins de 60 px d'un mur, sinon devant. Tenu, il tente le dégagement selon `tech` (c'est **son propre état** qu'il voit, c'est équitable) puis se débat à sa cadence.
- **Anti-air** inchangé : bas + S. Le difficile utilise aussi ←H puis S (jongle) contre les sauts proches.
- **Crossfader** : agression +0,15 quand il mène, +0,25 pendant son DROP ; garde +0,15 pendant le DROP adverse.
- **Menace** : `core/threat.ts` (la même que la garde de proximité) remplace sa propre règle `reach + 30`. `opponentMove` ignore les coups `movement`, sinon le CPU « garde » contre un dash.
- **Perception** : l'historique des états adverses devient un **tampon circulaire** de taille fixe (capacité = réaction maximale + 1), écrit sur place une fois par tic par le contrôleur du CPU, au lieu de `[...cpu.seen, liveOpponent].slice(...)` à chaque tic. Le CPU reste déterministe (même séquence, mêmes sorties). Son état n'appartient pas à `GameState` et n'est jamais rejoué en rollback (le CPU est toujours local).

### 13.3 Organisation (`cpu.ts` fait 295 lignes : un module par responsabilité)

| Module | Rôle |
|---|---|
| `ai/cpu.ts` | point d'entrée `cpuStep`, profils |
| `ai/perception.ts` | tampon circulaire, vue retardée |
| `ai/defense.ts` | menaces, garde, anti-air, dégagement, lutte |
| `ai/offense.ts` | jeu par distance, selon le style |
| `ai/hold-tactics.ts` | décisions en tenant |
| `ai/plans.ts` | **séquences d'entrées en données** : `jumpIn`, `dashIn`, `tickThrow`, `overheadMix`, `crossUp`, `chainLLL`, `launcherCombo`. Réutilisées par la démo d'entraînement (DRY) |
| `ai/styles.ts` | Nayo « contrôle », Riff « pression » |

### 13.4 Tests (`tests/ai/*`)

Déterminisme (même graine, même match) ; chaque plan produit l'action voulue (le plan dash donne `dashForward`) ; avec `tech` à 1 et une réaction ≤ 11, le CPU tenu se dégage toujours ; jamais bloqué (il agit au moins une fois toutes les 3 s en neutre) ; sur 40 matchs difficiles à graine, chaque mécanique nouvelle (dash, backdash, prise, tabassage, lancer derrière, chaîne, overhead, jongle, Glissade) est utilisée au moins une fois ; difficile bat normal et normal bat facile dans au moins 65 % des matchs ; Nayo contre Riff en difficile contre difficile : chaque personnage gagne entre 40 et 60 % des matchs.

---

## 14. Ingénierie

### 14.1 Où vit chaque concept

| Concept | Cœur (pur, déterministe) | Données | Entrées | Rendu / audio | IA | UI |
|---|---|---|---|---|---|---|
| Bits Prise et Dash | `input.ts` | — | `keyboard.ts`, `gamepad.ts`, `touch-controls.ts`, `touch-layout.ts`, `styles.css` | — | plans | Commandes |
| Commandes, buffer, double-tap | **`commands.ts`** (extrait de `fighter.ts`) | `rules.ts` | — | — | — | — |
| Manips fraîches | `motion.ts` | `rules.ts` | — | — | — | — |
| Commande → coup, coups optionnels, Remix | `moves.ts` (`groundMove`, `airMove`, `holdMove`, `moveOf`) | — | — | — | — | — |
| Machine à états | `fighter/{index,neutral,air,move,stun}.ts` | — | — | — | — | — |
| Mouvement par frame | `fighter/move.ts` | `fighters/shared.ts` (`advance`, `dashCurve`, `leapArc`) | — | — | — | — |
| Menace, garde de proximité | **`threat.ts`** | `rules.ts` | — | — | `defense.ts` | — |
| Pushbox aérienne, couchée, paire tenue | `positions.ts` | gabarits | — | debug | — | — |
| Géométrie, contacts | `boxes.ts` (`overlaps`), `combat.ts` (`findHit`, point d'impact) | — | — | `fight-events.ts` lit `contacts` | — | — |
| Coups : garde, CONTRE, chip, jongle, réaction, scaling | `combat.ts` | — | — | `animation.ts` lit `reaction` | — | — |
| Prise | **`hold.ts`** (la paire) | `grab`, `pummel`, `throwForward`, `throwBack` | — | anneau, tampons, sons | `hold-tactics.ts` | aide |
| Crossfader | **`mix.ts`** | `stages.ts` (`beatTicks`), signature et Remix | — | `crossfader-hud.ts`, `audio/music.ts`, `stage/` | styles | aide |
| Stages | `StageConfig` seulement | `stages.ts` | — | `render/stage/`, `art/stages/` | — | sélection |
| Textes d'aide | — | **`move-texts.ts`** (hors cœur) | — | libellé en entraînement | — | `controls-content.ts` (généré) |
| Retour haptique | — | — | **`haptics.ts`** | appelé par la scène sur les événements | — | réglage |

**Couches** (ESLint, déjà en place pour `core/` et `ai/`, étendu à `data/`) : `core` n'importe rien ; `data` n'importe que les types du cœur ; `ai` n'importe que `core` et `data` ; seuls la scène de combat et l'app relient les appareils au rendu. Pas de `Math.random`, `Date.now`, `performance`, `window` ni `document` dans `core`, `ai`, `data`.

**Découpages** (aucun module au-delà d'environ 300 lignes, un concept par module) :
- `data/fighters.ts` (355 lignes) → `data/fighters/{shared,nayo,riff}.ts`. `shared.ts` porte `box()`, `advance()`, `dashCurve()`, `leapArc()`, `kd()`, les tables d'annulation et `defineFighter()` (qui précalcule le Remix).
- `core/fighter.ts` → `core/fighter/{index,neutral,air,move,stun}.ts`.
- `core/config.ts` → `config.ts` (boîtes, gabarit, match) et `move-data.ts` (coups).
- `ai/cpu.ts` → §13.3.

### 14.2 Types (extraits)

```ts
// core/input.ts
export const Input = { /* … inchangé … */ Grab: 1 << 8, Dash: 1 << 9 } as const;

// core/commands.ts
export type Command = 'light' | 'heavy' | 'special' | 'grab' | 'dash' | 'backdash' | 'jump';

// core/move-data.ts
export const CORE_MOVE_IDS = [
  'standLight', 'standHeavy', 'crouchLight', 'crouchHeavy', 'jumpLight', 'jumpHeavy',
  'special', 'specialForward', 'specialAntiAir',
  'grab', 'pummel', 'throwForward', 'throwBack',   // 'throw' est renommé 'grab'
  'dashForward', 'dashBack',
] as const;
export const OPTIONAL_MOVE_IDS = [
  'forwardLight', 'forwardHeavy', 'backHeavy', 'chainLight', 'lightFinisher',
] as const;
export type CoreMoveId = (typeof CORE_MOVE_IDS)[number];
export type OptionalMoveId = (typeof OPTIONAL_MOVE_IDS)[number];
export type MoveId = CoreMoveId | OptionalMoveId;
export type MoveKind = 'normal' | 'special' | 'grab' | 'throw' | 'movement';

/** Déplacement par frame, en sous-pixels ; longueur = durée du coup. y > 0 = en l'air. */
export interface RootMotion { readonly dx: readonly number[]; readonly y?: readonly number[] }
/** Remplace les hurtbox de posture pendant `frames`. */
export interface MoveHurtbox { readonly frames: FrameRange; readonly boxes: readonly Box[] }
/** Vol de la victime ; remplace le recul et AIR_HIT_LIFT. */
export interface Knockdown {
  readonly vx: number; readonly vy: number;
  readonly trip?: boolean;    // réaction « fauché »
  readonly juggle?: number;   // lanceur : ses points de jongle (combos v3, 1 à 5)
}

export interface MoveData {
  readonly name: string;
  readonly kind: MoveKind;
  readonly startup: number; readonly active: number; readonly recovery: number;
  readonly damage: number; readonly hitstun: number; readonly blockstun: number;
  readonly hitstop: number; readonly pushback: number; readonly guard: Guard;
  readonly hitbox?: Box;
  readonly projectile?: ProjectileData;
  readonly motion?: RootMotion;                 // remplace `advance`
  readonly hurtboxes?: readonly MoveHurtbox[];
  readonly cancelInto?: readonly MoveKind[];
  readonly branches?: readonly Branch[];        // cordes après contact (combos v3, remplace `chain`)
  readonly juggleCost?: number;                 // points de jongle dépensés en l'air (1 par défaut)
  readonly counter?: CounterEffect;             // CONTRE propre au coup (le Crochet qui plie)
  readonly extender?: 'rebond' | 'vrille';      // prolongateur, une fois par combo
  readonly crouching?: true;                    // joué accroupi (remplace isCrouchingMove)
  readonly freeCancelFrom?: number;             // annulation sans contact (dash de Riff)
  readonly invincible?: FrameRange & { readonly against?: 'all' | 'air' };
  readonly throwInvincible?: FrameRange;        // backdash
  readonly knockdown?: Knockdown;
  readonly sideSwitchFrame?: number;            // lancers derrière
}

/** Variante du DROP : jamais le timing (démarrage, actif, récupération). */
export type Remix = Partial<Pick<MoveData,
  'damage' | 'hitstun' | 'blockstun' | 'hitstop' | 'pushback' | 'knockdown' | 'invincible'>>
  & { readonly projectileSpeed?: number };

// core/config.ts
export interface FighterTemplate {
  /* … champs existants, sauf les trois hurtbox uniques … */
  readonly airPushbox: BoxSize & { readonly lift: number };
  readonly lyingPushbox: BoxSize;
  readonly standingHurtboxes: readonly Box[];
  readonly crouchingHurtboxes: readonly Box[];
  readonly airHurtboxes: readonly Box[];
  readonly moves: Readonly<Record<CoreMoveId, MoveData>>
    & Readonly<Partial<Record<OptionalMoveId, MoveData>>>;
  readonly signature?: { readonly move: MoveId; readonly remix: Remix };
  readonly remixMoves: Readonly<Partial<Record<MoveId, MoveData>>>;  // précalculé par defineFighter()
}
export interface StageConfig {
  readonly width: number; readonly startDistance: number; readonly beatTicks: number;
}

// core/state.ts (ajouts)
export type FighterAction = /* … existants … */ | 'guard' | 'holding' | 'held' | 'tech';
export type Reaction = 'high' | 'mid' | 'low' | 'crouch' | 'trip' | 'launch' | 'thrown';
export interface FighterState {
  /* … existants ; bufferedAttack devient bufferedCommand … */
  readonly bufferedCommand: Command | null;
  readonly tapDirection: -1 | 0 | 1;
  readonly tapFrames: number;
  readonly tapReleased: boolean;
  readonly throwImmuneFrames: number;
  readonly juggle: number;                      // points de jongle restants (combos v3)
  readonly phrase: number; readonly phraseTwice: number;  // la phrase (combos v3 §1.2)
  readonly flags: number;                       // FLAG_MOVE_HIT, FLAG_EXTENDED, FLAG_BOUNCE, FLAG_LIMIT
  readonly reaction: Reaction | null;
  readonly reactionHeavy: boolean;
  readonly stunTotal: number;
}
export interface Contact {
  readonly by: 0 | 1;
  readonly kind: 'hit' | 'block' | 'grab' | 'tech' | 'pummel' | 'throw';
  readonly move: MoveId;
  readonly x: number; readonly y: number;          // centre du recouvrement, sous-pixels
  readonly damage: number;                         // chip compris en garde
  readonly counter: 'counter' | 'punish' | null;
}
export interface HoldState {
  readonly holder: 0 | 1;
  readonly frame: number;      // tics depuis la saisie
  readonly limit: number;      // HOLD_LIMIT_FRAMES moins la lutte, plancher HOLD_MIN_FRAMES
  readonly techable: boolean;  // faux sur une PUNITION
}
export interface MixState {
  readonly level: number;                 // −1000 (P1) … +1000 (P2)
  readonly buildUp: 0 | 1 | null;
  readonly drop: 0 | 1 | null;
  readonly dropFrames: number;
}
export interface GameState {
  /* … existants … */
  readonly contacts: readonly Contact[];  // EMPTY_CONTACTS quand rien ne touche
  readonly hold: HoldState | null;
  readonly mix: MixState;
}
```

Les tabassages déjà donnés se lisent dans `HoldState` via le temps (aucun compteur). Le sous-coup en cours de l'attaquant est son `move` habituel (`pummel`, `throwForward`, `throwBack`).

### 14.3 Pipeline d'un tic (`step.ts`, ordre fixe et symétrique)

1. Entrées à 0 hors phase `fight` (inchangé).
2. Hitstop : `readInput` seul ; buffer, double-tap et limite de prise gelés ; les appuis de lutte sont mémorisés et comptés à la sortie.
3. Si `hold` : `updateHold(state, inputs, config)` fait avancer la paire (dégagement, lutte, tabassage, lâcher, placement, lancer automatique, rupture en fin de round). Sinon : `updateFighter(A, inA, tplA, viewOf(B))` et `updateFighter(B, inB, tplB, viewOf(A))`, où la vue `{ x, threatened }` vient de l'état **précédent**.
4. `resolvePositions` : pushbox aérienne et couchée ; pas de séparation dans la paire tenue, qui est décalée d'un bloc contre les murs.
5. `updateProjectiles` : ils ignorent la paire tenue ; `NO_PROJECTILES` constant quand la liste est vide.
6. Détection, tout avant d'appliquer, sans allocation : frappes A→B et B→A, prises, projectiles. Le coup bat la Prise ; Prise contre Prise = dégagement ; projectile contre Prise = le projectile touche.
7. Résolution : `applyHit` (garde, chip, CONTRE, jongle, réaction, scaling, bonus de DROP), `startHold`, `techGrab` ; `contacts` rempli (au plus 2 entrées).
8. Hitstop = max des contacts (+3 sur un CONTRE) ; `updateMix` ; caméra ; entraînement (pas de recharge pendant une prise) ; round.

### 14.4 Validation des données (`core/validate.ts`, au démarrage de chaque match)

- `motion.dx` (et `motion.y`) a exactement la longueur du coup ; `y ≥ 0` et `y = 0` au dernier frame.
- Les plages de `hurtboxes`, `invincible`, `throwInvincible` et `freeCancelFrom` sont dans le coup.
- Type `movement` : 0 dégât, pas de hitbox ni de projectile. Type `grab` : seulement `grab`, avec une hitbox. Type `throw` : seulement `pummel`, `throwForward`, `throwBack`, sans hitbox ; les lancers ont un `knockdown` et `sideSwitchFrame < startup` pour `throwBack`.
- Seuls les `movement` peuvent annuler en `grab` ; `cancelInto` ne contient jamais `throw` ni `movement`.
- Un coup optionnel défini a un clip (l'art itère sur les coups **définis**, `FighterClips` partiel sur les optionnels), et le type que lui donne la table `OPTIONAL_KINDS` (tous des normaux aujourd'hui).
- Combos v3 (`docs/combos-v3.md` §1.12, règles 1, 2 et 5 à 8, `core/validate-combos.ts`) : les cordes mènent à des normaux définis, une seule par bouton et direction, seulement depuis un normal, sans boucle et sur 5 coups au plus ; tout normal a son bit dans la phrase (`PHRASE_MOVE_IDS`, 31 au plus) ; un lanceur donne de 1 à 5 points, un coup coûte 1 point au moins ; un prolongateur est un normal, et un seul type par personnage ; un CONTRE propre ajoute de 0 à 20 tics de hitstun et lance comme un lanceur ; l'avantage en garde de tout normal (`blockstun + 1 − actif − récupération`) reste sous le démarrage le plus court du personnage (+2 au plus aujourd'hui : une série gardée finit toujours) ; tout coup qui frappe repousse.
- `remix` ne contient aucun champ de timing (garanti par le type, vérifié à l'exécution).
- Hurtbox : au moins une boîte par posture, au plus deux, sans trou entre elles.
- `airPushbox.lift ≥ 0` ; `beatTicks` entier ≥ 12 ; projectiles interdits sur les coups aériens (inchangé).
- Art (`art/validate.ts`) : un clip par état et par coup défini ; tics = durées (dashs, lancers, `knockdown` + `getup` = 40, `tech` = 14).

### 14.5 Performance (budget mesuré, pas supposé)

**Cœur**
- L'état immuable reste : c'est la base des replays, des tests et du futur rollback. Par tic : un `GameState`, au plus deux `FighterState`, et rien d'autre quand il ne se passe rien.
- **Interdit sur le chemin du tic** : fermetures, `map` / `filter` évitables, `toWorld` dans les collisions, chaînes de caractères, Remix recalculé, tableaux qui grandissent avec l'historique.
- `contacts` = `EMPTY_CONTACTS`, projectiles = `NO_PROJECTILES` quand rien ne change ; intersections sur place ; double-tap en O(1) ; courbes, Remix et hurtbox précalculés au chargement.
- `readInput` construit l'historique de directions (16 entrées) en une seule allocation au lieu de `slice` puis spread. S'il le faut au banc, il passe en entiers compactés (4 bits par tic).
- **Banc** `tests/core/perf.bench.ts` (`vitest bench`) : 100 000 tics CPU contre CPU ; moyenne < 0,05 ms par tic sur la machine de dev. **Test de garde-fou** en CI : 36 000 tics (10 min de jeu) doivent tenir sous 3 fois la référence mesurée à la phase 1.1, et l'état ne grossit pas (au plus 2 projectiles, historique borné).

**Rendu**
- Aucune allocation par image en régime établi. Tout objet Phaser est créé dans `create()` puis recyclé par des pools (comme `hit-fx.ts` et `blood.ts`) : poussière 12, rémanences 6, onomatopées 6, tampons 4, particules du DROP 32, confettis 24.
- `syncViews` réutilise ses tableaux (aujourd'hui `xs` est reconstruit par spread et `map` à chaque image) ; `followFinger` réutilise son point.
- Texte et classes CSS écrits **seulement quand la valeur change**.
- Pas de `Graphics.clear()` redessiné par image hors debug.

### 14.6 Fuites

- Chaque classe qui écoute quelque chose expose `dispose()` (déjà la règle pour `KeyboardInput`, `TouchControls`, `PauseInput`, `DebugOverlay`). Nouveaux : `MusicPlayer` (nœuds `stop()` et `disconnect()`, contexte `suspend()` hors combat), `StageView`, `CrossfaderHud`, `HoldPrompt`, pools.
- `FightScene` les collecte au `SHUTDOWN` ; pas de singleton qui retient une scène ; écouteurs de scène en `once`.
- `tests/render/disposal.test.ts` : un `EventTarget` factice compte les ajouts et les retraits ; après `dispose()`, zéro écouteur restant.
- Mode **`?soak`** (développement) : CPU contre CPU en boucle sur 20 matchs ; l'overlay debug affiche le tas JS et le nombre d'objets de scène. Critère : nombre de nœuds DOM constant, tas qui grossit de moins de 5 Mo entre le 5e et le 20e match.

### 14.7 Tests

- **Cœur** : un fichier par module nouveau (`commands`, `movement`, `crossup`, `threat`, `hold`, `combos`, `mix`, `mix-balance`, `perf`). Les tests existants sont mis à jour **explicitement** quand une valeur change (marche, sauts, buffer, hurtbox), dans la même PR, jamais supprimés en silence.
- **Replays dorés** : `tests/core/replays/*.json` (séquence d'entrées et hash final attendu), enregistrés **avant** la refonte de la phase 1.1, un par mécanique nouvelle ensuite ; `npm run replays:update` se lance volontairement.
- **Symétrie** P1/P2 et **déterminisme** pour chaque mécanique nouvelle.
- **Données** : les deux personnages valides, Remix valides, portées figées (instantané), un texte d'aide pour chaque coup défini.
- **Art** : alignements durcis (§9.5), clips de tous les coups définis.
- **Entrées** : seuils du stick, hystérésis, verrou de neutre, centre le plus proche, géométrie de la disposition tactile (deux tailles d'écran), nouveaux bits.
- **Rendu** : `fight-events` (contacts, nouveaux événements), glyphes, pools, disposal.

---

## 15. Plan par phases

Chaque phase (et chaque PR à l'intérieur) laisse une build **jouable sur PC et sur téléphone**, avec `npm test`, `npm run lint` et `npm run typecheck` au vert, l'aide « Commandes » à jour, sans drapeau de fonctionnalité.

### Phase 1 — Les bases (M8.1), livrable seule, en trois PR successives

**PR 1.1 « Fondations sans changement de jeu »**
- Enregistrer 10 replays dorés sur HEAD **avant** de toucher au code.
- Découpages : `data/fighters/{shared,nayo,riff}.ts` (POLYVALENT → `NAYO`, RUSHDOWN → `RIFF`, `FighterId` devient `'nayo' | 'riff'`), `core/fighter/*`, `core/commands.ts` (extraction de `readInput` et `pressedButton`, mêmes résultats), `core/move-data.ts`.
- `advance` → `motion` (`RootMotion` produit par le helper `advance()`) ; hurtbox → listes d'une boîte ; renommage `throw` → `grab` (MoveId, clip, aide).
- `GameState.contacts` + `EMPTY_CONTACTS` ; `overlaps()` sur place ; `NO_PROJECTILES`.
- Corrections d'allocations du rendu (`syncViews`, `followFinger`) ; banc de perfs ; lint étendu à `data/` ; harnais de test `disposal`.
- **Fini quand** : les replays donnent exactement les mêmes hashs ; tous les tests existants passent (seuls les renommages changent).

**PR 1.2 « Lisibilité immédiate »** (une partie de M8.3)
- `fight-events.ts` lit `contacts` : étincelles, sang et flash au vrai point d'impact ; poussière et étincelle rasante sur les coups bas.
- Hurtbox calées sur le dessin (après régénération des sprites de M7.3), outil `measure-boxes`, test « contact visible », tolérances durcies ; correctifs Uppercut 4..24, j.L 4..28, Crochet 10..52, Balayage 12..51.
- Règle de manip fraîche ; S lit d'abord les manips (↓↘→ + S = Vinyle).
- Vinyle : renommage, boîte −10..10 / 32..52, vitesse 3,5 ; planche `projectile` redessinée (8 images), `special` retouché.
- Aide : `data/move-texts.ts`, page « Les bases », une page par personnage (ouverte sur celui choisi), nom du coup au-dessus du perso en entraînement (40 tics), descriptions de sélection (§17.3).
- Compteur de combo commité et finalisé ; test des glyphes.
- Boîte grise de Riff : hurtbox et pied, hitbox rouge en debug seulement ; overlay debug complet.
- **Fini quand** : l'étincelle d'un Coup bas apparaît à moins de 14 px du sol et à moins de 2 px de l'orteil dessiné ; ↓↘→ + S donne le Vinyle ; s'accroupir puis marcher 13 tics et appuyer S donne le Pied fendu ; chaque coup a son texte.

**PR 1.3 « Déplacements v2 »**
- Cœur : bits Grab et Dash ; buffer 6 avec saut et dash ; double-tap O(1) ; `dashForward` et `dashBack` (`movement`) pour les deux ; annulation et élan de Riff ; marche et sauts v2 ; `HIT_GRAVITY` ; pushbox aérienne et couchée ; garde de proximité (`threat.ts`) ; protection anti-prise de 4 tics.
- **Le bouton PRISE arrive dès maintenant** : le bit Grab déclenche la projection instantanée actuelle (coup `grab`, mêmes données qu'aujourd'hui). La prise tenue arrive en phase 2.
- Appareils : clavier (I, Maj gauche, Pavé 4 et 0, `;` et Maj droite), manette (RB, LB, hystérésis), tactile (DASH, PRISE à la place de CHOPE, tailles, centre le plus proche, seuil du haut, hystérésis, verrou de neutre, icônes, retour d'appui, vibration).
- Art : `dashForward` et `dashBack` de Nayo, `jump` et `jumpForward` re-timés, foulée de marche recalée ; pools de poussière et de rémanences.
- IA : dash et backdash par les bits ; `opponentMove` ignore les `movement` ; menace partagée.
- **Tests** : `commands` (double-tap à 12 tics oui, 13 non ; tic neutre exigé ; aucun dash sur ↓↘→ ni sur → ↗ → ; DASH + arrière = backdash ; buffer du saut et du dash) ; `movement` (distances 56, 44, 64, 48 au sous-pixel, durées, anti-prise du backdash, backdash frappable, annulation de Riff à f8 et pas à f7, élan) ; arcs (31 tics / 79,6 px et 27 / 66,5) ; `crossup` (tableau §3.5) ; garde de proximité ; protection anti-prise ; appareils.
- **Fini quand** : toutes les valeurs du §3 sont vérifiées par des tests ; le dash sort à chaque essai au bouton sur les trois appareils.

### Phase 2 — La Prise (M8.2)

- `core/hold.ts` : `GameState.hold`, actions `holding` et `held`, coups `pummel`, `throwForward`, `throwBack`, dégagement, lutte, limite, lancer automatique, PUNITION, coins, rupture en fin de round, priorités contre les coups et les projectiles.
- Art Nayo : `grab` (remplace `throw`), `hold`, `pummel`, `throwForward`, `throwBack`, `held`, `thrownBack`, `tech`.
- HUD : anneau de prise, tampons, rappel en entraînement ; sons ; vibration.
- IA : `hold-tactics.ts`, dégagement et lutte.
- **Tests** : tous les cas du §4.6 ; avantages KD des lancers à ±1 tic du tableau ; Nayo 2 et Riff 3 tabassages au plus sans lutte ; plancher de 36.

### Phase 3 — Coups v2, combos, réactions (M8.3)

- Coups optionnels et `chain` (L, L, L) ; →L, →H, ←H des deux personnages ; Glissade (remplace la Ruée, hurtbox basse) ; Saut de l'ange aérien (`motion.y`) ; invincibilité `against: 'air'` du Genou ; Pied fendu qui met au sol.
- CONTRE et PUNITION ; chip ; jongle après lanceur ; formule de dégâts ; réactions (`reaction`, `reactionHeavy`, `stunTotal`, `endFrames`) ; `knockdown` découpé en `getup`.
- Art Nayo : `chainLight`, `lightFinisher`, `forwardLight`, `forwardHeavy`, `backHeavy`, `hitHigh`, `hitMid`, `hitLow`, `trip`, `getup`, effets.
- HUD : tampons CONTRE / PUNITION, traînée de vie, onomatopées (#22), notes pentatoniques.
- Entraînement : avantage après chaque échange (`render/advantage-meter.ts`, fonction pure testée), option « Afficher les boîtes », démo d'un coup choisi par le CPU (`ai/plans.ts`).
- IA : coups de direction, chaînes, lanceur, Glissade contre le Vinyle, overhead contre la garde basse, punition des coups ratés.
- **Tests** : table commande → coup complète, repli des coups optionnels, garantie L, L, L, la Glissade passe sous le Vinyle et prend le Coup bas, le Saut de l'ange passe le Balayage et prend l'Uppercut, une seule jongle, CONTRE seulement au premier coup, chip non mortel, combos de référence (§7.8), portées figées.

### Phase 4 — Riff illustrée (M8.6, piste art commencée en parallèle dès la phase 1)

- Générateur `tools/sprites/riff/` sur le squelette partagé ; `src/art/riff/{sheets,clips,cells,index}.ts` ; `src/art/index.ts` mappe `riff`.
- Les 43 planches du §11.3, la punk de Zen-Tazzer (noir, magenta et argent ; tenue 2 rouge et or), effets magenta.
- Validation de ses boîtes contre son art (mêmes tests que Nayo).
- `docs/art/univers.md` mis à jour : couleurs de Riff, Vinyle, « la montée » pour l'Uppercut (le mot « drop » appartient désormais au Crossfader), Glissade.

### Phase 5 — Le Crossfader (M8.5)

- `core/mix.ts`, `beatTicks`, signature et Remix (`defineFighter`).
- `render/crossfader-hud.ts` ; `audio/music.ts` et `audio/patterns/*` (séquenceur, fondu enchaîné, recalage, « vinyl brake ») ; stab cosmétique sur le temps ; métronome d'entraînement ; option « Flashs réduits ».
- IA : prise en compte du curseur.
- **Tests** : chaque gain du §8.2 ; plafond des gains de mouvement ; exemption de recul du zoning ; gel pendant la montée ; DROP pile sur un temps fort ; durée de 12 temps ; remise à zéro par round ; Remix sans changement de timing ; `mix-balance` (0,8 à 2,5 DROP par round, part de chaque personnage entre 40 et 60 %).

### Phase 6 — L'Entrepôt et la Salle de répétition

- `render/stage/stage-view.ts` piloté par les données ; `tools/stages/` ; L'Entrepôt complet (§12.2), Salle de répétition (§12.3) ; choix du stage dans `MatchSetup`.
- **Tests** : appels de dessin du stage ≤ 12 ; checklist de lisibilité sur captures (manuelle, avec les scripts de capture existants) ; aucun flash au-delà de 3 par seconde (test de la logique des lumières).

### Phase 7 — Audit et équilibrage (M8.4)

- Endurance (`?soak`), banc de perfs, revue des allocations par image, revue des couches.
- Équilibrage par simulation CPU contre CPU (200 graines : dégâts, usage, victoires par personnage).
- Test à l'aveugle avec trois joueurs occasionnels (critère 1 du §16).
- Deuxième pose de victoire ; Le Toit et La Cour du Temple arrivent avec leurs personnages.

---

## 16. Critères d'acceptation

1. **Comprendre les spéciaux** : un joueur qui découvre le jeu explique ce que fait chaque spécial après **un** match contre le CPU facile (test à l'aveugle). L'aide liste chaque coup de chaque personnage avec son rôle.
2. **Dash fiable** : il sort à tous les essais au bouton (clavier, manette, tactile) et à au moins 9 essais sur 10 au double-tap au clavier et à la manette. Aucun faux dash sur ↓↘→ (test).
3. **Mouvements** : marche, sauts, dashs, backdashs et cross-ups ont exactement les valeurs du §3 (tests). Aucun saut involontaire en marchant au stick (le haut exige 30° et 18 px, test).
4. **Coups bas visibles** : l'étincelle d'un Coup bas apparaît au tibia, à moins de 2 px de l'orteil dessiné ; le test « contact visible » passe pour chaque coup bas contre chaque posture.
5. **Hitbox honnêtes** : aucune portée invisible au-delà des tolérances du §9.5, pour les deux personnages ; tableau des portées figé.
6. **Prise** : tous les cas du §4.6 sont couverts par des tests ; une prise ratée est punissable par chaque normal de 4 tics ou moins ; un débutant qui n'appuie qu'une fois sur PRISE projette toujours.
7. **Combos** : tous les combos du §7.8 passent avec les dégâts indiqués ; L, L, L passe à toute distance où le premier L touche.
8. **Crossfader** : 0,8 à 2,5 DROP par round et part de chaque personnage entre 40 et 60 % en simulation ; le jeu se joue entièrement sans le son.
9. **Déterminisme** : les replays dorés donnent le même hash ; symétrie P1/P2 testée pour chaque mécanique nouvelle.
10. **Performance et mémoire** : tic < 0,05 ms en moyenne (banc) ; 60 i/s sur un Android milieu de gamme ; endurance sans croissance (§14.6) ; stage ≤ 12 appels de dessin.
11. **Identités** : chaque personnage a au moins trois forces et trois faiblesses mesurables dans les données (§6.3, test) ; en difficile contre difficile, chacun gagne entre 40 et 60 % des matchs.
12. **Accessibilité** : aucun clignotement au-delà de 3 par seconde ; option « Flashs réduits » ; boutons tactiles ≥ 48 dp.

---

## 17. Pour le joueur : les spéciaux expliqués

*(Textes de l'écran « Commandes », dans `data/move-texts.ts`.)*

### 17.1 Nayo, le boxeur-DJ : calme, il te tient à distance et te punit

- **Vinyle** (S, ou ↓↘→ + un coup) : Nayo lance un **disque de lumière** qui file droit devant, à hauteur de poitrine. C'est un **projectile** : de loin, il t'oblige à sauter (et Nayo t'attend avec l'Uppercut) ou à parer. Il touche debout comme accroupi. Pour l'éviter : saute par-dessus, ou, avec Riff, glisse dessous. Un seul disque à la fois. C'est l'ancienne « onde sonore ».
- **Pied fendu** (→ + S) : un coup de pied volant qui avance d'un grand pas et **met au sol**. Parfait pour finir un combo. S'il est paré, Nayo se fait punir.
- **Uppercut** (↓ + S) : il jaillit, poing vers le ciel. **Invincible au départ** : il bat les sauts et les attaques au réveil. S'il le rate ou se fait parer, il reste longtemps sans défense.
- **Ses coups de direction** : → + L, un jab qui avance ; → + H, l'**Overhand**, un coup qui tombe sur la tête (à parer **debout**) ; ← + H, le **Remontant**, qui fait décoller l'adversaire en l'air : enchaîne avec S. **L, L, L** : jab, cross, puis la Mise au tapis.

### 17.2 Riff, la punk de rue : elle entre, breake et te fait deviner

- **Glissade** (S, ou ↓↘→ + un coup) : elle plonge et **glisse pieds en avant**. Elle passe **sous le Vinyle de Nayo** et sous les coups hauts. C'est un coup **bas** : pare-la **accroupi**. Si elle touche, tu tombes.
- **Saut de l'ange** (→ + S) : une vrille en l'air qui retombe sur ta tête. Coup **haut** : pare-le **debout**. Il passe au-dessus des coups bas, mais un anti-air la fait tomber.
- **Genou montant** (↓ + S) : un genou explosif vers le haut, contre les sauts. Il n'est invincible **que contre les attaques en l'air** : au sol, Riff n'a pas de coup magique pour se sortir d'une pression.
- **Ses coups de direction** : → + L, le **Toprock**, un pas de danse qui avance et reste sûr ; → + H, le **Talon**, qui tombe sur la tête (à parer **debout**) ; ← + H, le **Retourné**, qui fait décoller et couvre aussi derrière elle. **L, L, L** : jab, revers, puis le Swipe. En sautant tout près, son Ciseau aérien peut te toucher **de dos**.

### 17.3 Pour tous (page « Les bases »)

- **Parer** : maintiens arrière. Accroupi contre les coups bas, **debout contre les coups d'en haut** et les sauts.
- **DASH** (ou deux fois avant) : un bond rapide vers l'adversaire. Avec **arrière** (ou deux fois arrière), un bond en retrait qui fait rater les prises, mais pas les coups.
- **PRISE** (ou L + H) : de tout près, tu saisis l'adversaire. Puis **L** pour frapper, **H** (ou **S**, ou **PRISE**) pour le lancer devant, **← + H** pour le lancer derrière toi. Si tu ne choisis rien, tu le lances devant.
- **Si on te saisit** : appuie **tout de suite** sur PRISE pour te dégager ; ensuite, tape sur les boutons pour qu'on te lâche plus vite. Sur une PUNITION (tu étais en train de finir un coup), impossible de te dégager.
- **Enchaîner** : « L → H → S. Ou L, L, L. » ← + H fait décoller : enchaîne avec S.
- **CONTRE** : frappe quelqu'un qui attaque, ça fait plus mal. **PUNITION** : frappe-le quand il rate.
- **Le Crossfader** : avance, attaque, fais garder ton projectile : le curseur vient vers toi et la musique devient la tienne. Curseur à fond : **DROP** sur le prochain temps fort. Tu frappes plus fort et ton spécial passe en version **Remix**.

Descriptions de sélection (`roster.ts`) : Nayo « Boxeur-DJ posé · portée · Vinyle · Uppercut invincible » ; Riff « Punk de rue explosive · dash · Glissade · deux overheads · moins de vie ».

---

## 18. Risques, reports et décisions prises par défaut

### 18.1 Risques

| Risque | Parade |
|---|---|
| L'art est le goulot (Riff ≈ 265 images, Nayo ≈ 115) | Générateur procédural partagé ; Riff en parallèle dès la phase 1 ; le gameplay n'attend jamais l'art (boîte grise honnête) |
| Grappe tactile chargée (6 boutons) | Centres inchangés pour les 4 boutons connus, test de géométrie sur deux écrans, tailles hiérarchisées, centre le plus proche ; taille et opacité réglables plus tard (PLAN §5) |
| Cross-ups déroutants pour les débutants | Une seule source de coup de dos (Riff) ; portée figée par test ; le demi-tour se lit à l'image |
| Le dégagement de prise trop dur | Fenêtre de 200 ms, vibration, anneau qui clignote, buffer ; le CPU facile saisit peu |
| Effet boule de neige du Crossfader | Gains liés à l'initiative, pas aux dégâts ; DROP limité à +10 % ; test de part par personnage |
| Synchronisation audio sur iOS | La musique suit le cœur, jamais l'inverse ; recalage au temps fort ; rien de gameplay ne dépend du son |
| Régression de ressenti pendant la refonte | Replays dorés avant toute modification ; banc de perfs ; checklist PC et téléphone à chaque phase |

### 18.2 Reporté (YAGNI)

| Élément | Quand |
|---|---|
| Super, seconde jauge | Après des retours de jeu sur le Crossfader |
| Membres touchables sur les pokes | Si le jeu manque de « whiff punish » (le champ `hurtboxes` le permet déjà) |
| Petit saut, air dash, contrôle en l'air | Avec un personnage qui en a besoin (Vexa ?) |
| Relevé rapide, roulade | Si le réveil devient étouffant |
| Armure, parade, rebond mural, téléportation | Un par futur personnage (§6.5) |
| Coups multi-touches, prise aérienne, prise de commande | Si un personnage en a besoin |
| Remappage, affichage des entrées | Menus M8 |
| Calibrage de latence audio | Seulement si un retour de jeu le réclame (aucun gameplay ne dépend du son) |

### 18.3 Décisions prises par défaut (le propriétaire est absent ; chacune est réversible)

1. Le bouton DASH est **visible par défaut** sur le tactile.
2. Le nom des spéciaux s'affiche **en entraînement seulement**, pour garder l'écran propre en match.
3. Riff frappe en **magenta et argent**, la punk de Zen-Tazzer (`univers.md` mis à jour en phase 4).
4. Vibrations : actives par défaut sur « saisi » et « coup lourd reçu », désactivées sur les appuis.
5. Le mot « drop » appartient au Crossfader : l'Uppercut de Nayo devient « la montée » dans la mise en scène.
6. Le Retourné et le Genou montant de Riff sont dessinés en l'air (phase 4) et leurs hurtbox suivent ce dessin : ils passent **au-dessus des coups bas** (de f6 à f10, de f4 à f15, §10.2). Réversible : redessiner les poses ancrées au sol et rendre la hurtbox debout, ou donner au Genou une courbe de hauteur comme au Saut de l'ange (sa portée dessinée attend aussi cette décision, §9.5).
7. Le Ciseau aérien garde sa hitbox −14..26 : la ranger arrière est redessinée sur son bord arrière au lieu d'aller à −38. Élargir la hitbox vers l'arrière (≈ −36) changerait les portées de cross-up (§3.5) : à trancher par le propriétaire.
8. En attente : le Pied fendu de Nayo est dessiné en vol, 20 px au-dessus du sol de f6 à f14, avec sa hurtbox debout (seule exception de `tests/tools/hurtboxes.test.ts`). Une hurtbox calée sur le dessin le ferait passer au-dessus des coups bas : un changement du jeu de Nayo, pas une correction.

---

## Annexe A : constantes (`src/core/rules.ts`)

```ts
export const INPUT_BUFFER_FRAMES = 6;            // était 5
export const DIRECTION_HISTORY_FRAMES = 16;      // inchangé
export const MOTION_SPAN_FRAMES = 12;            // nouveau : la manip entière tient en 12 tics
export const MOTION_END_FRAMES = 6;              // était 4 : dernière étape ENTRÉE il y a 6 tics au plus
export const DASH_TAP_WINDOW = 12;
export const THROW_CONVERSION_FRAMES = 3;        // inchangé
export const THROW_PROTECTION_FRAMES = 4;
export const THREAT_MARGIN = px(24);
export const PROJECTILE_THREAT_RANGE = px(96);
export const HIT_GRAVITY = px(0.5);
export const AIR_HIT_LIFT = px(3);               // inchangé, levée par défaut
export const PUSHBACK_FRICTION = px(0.25);       // inchangé, sert aussi à l'élan
export const DASH_MOMENTUM_PERCENT = 50;
export const GRAB_HITSTOP = 6;
export const GRAB_TECH_FRAMES = 12;
export const HOLD_LIMIT_FRAMES = 56;
export const HOLD_MIN_FRAMES = 36;
export const STRUGGLE_FRAMES = 3;
export const THROW_TECH_STUN = 14;               // était 12 (= la planche `tech`)
export const THROW_TECH_PUSHBACK = px(4);        // inchangé
export const COUNTER_DAMAGE_PERCENT = 20;
export const COUNTER_HITSTUN = 4;
export const COUNTER_HITSTOP = 3;
export const SPECIAL_CHIP_PERCENT = 15;
export const COMBO_SCALING_STEP = 10;            // inchangé
export const COMBO_SCALING_FLOOR = 50;           // inchangé
export const MIX_MAX = 1000;
export const MIX_MOVEMENT_CAP = 500;
export const MIX_RETREAT_FREE_DISTANCE = px(150);
export const DROP_BARS = 3;                      // 12 temps
export const DROP_DAMAGE_PERCENT = 10;
```

Les gains du Crossfader (§8.2) sont des constantes nommées de `mix.ts` (`MIX_GAIN_HIT = 40`, `MIX_GAIN_BLOCKED = 25`, etc.), à côté de la seule fonction qui les lit.

## Annexe B : ce qui change dans `src/data/fighters.ts`

| | Nayo | Riff |
|---|---|---|
| Gabarit | marche 1,5 / 1,2 ; saut 10,5 / 0,65, 2,2 / 1,9 ; hurtbox v2 ; pushbox aérienne et couchée | marche 1,9 / 1,4 ; saut 10 / 0,7, 2,6 / 2,1 ; atterrissage 2 ; hurtbox v2 ; pushbox aérienne et couchée |
| Renommés | `throw` → `grab` ; `special` « Onde sonore » → « Vinyle » | `throw` → `grab` ; `special` « Ruée » → « Glissade » (nouvelles données) |
| Modifiés | Vinyle (3,5 px/tic, boîte −10..10 / 32..52) ; Pied fendu (75, met au sol) ; Uppercut (4..24) ; Crochet (10..52) ; Balayage (12..51, fauche) ; j.L (4..28) | Saut de l'ange (vraiment en l'air, hitbox 0..30 / 16..56) ; Genou montant (invincible aux attaques aériennes seulement) ; Windmill (fauche) ; j.L (−14..26, cross-up) |
| Nouveaux | `dashForward`, `dashBack`, `pummel`, `throwForward`, `throwBack`, `forwardLight`, `forwardHeavy`, `backHeavy`, `chainLight`, `lightFinisher` | idem |
