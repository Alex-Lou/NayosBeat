# NayosBeat — Combos v3 : conception finale

*Nayo « le boxeur posé » mixe ses combats, et la jauge de Boost.*

**Statut.** C'est la conception finale, prête à implémenter. Elle part de la conception « style », choisie par les deux juges, y greffe leurs meilleures idées et applique toutes leurs corrections. Les désaccords sont tranchés au §0.4.

**Ce qui est mesuré.** Chaque chiffre marqué *(mesuré)* vient du prototype `combos-v3/final/`. C'est une copie du cœur du dépôt (HEAD 9fa9ea1), avec ces règles, placée hors du dépôt, qui n'a pas été modifié. L'annexe A donne les commandes qui reproduisent chaque mesure.

**Lecture.** Les dégâts sont mesurés sur Riff (900 PV), sauf mention contraire, et le pourcentage est pris sur 900. Un tic dure 1/60 s. La « fenêtre » d'un appui est le nombre de tics pendant lesquels **un seul** appui fait encore passer toute la suite. ⇢ note un lien, → une annulation, une virgule un coup de corde.

---

## 0. En bref

### 0.1 Ce que le propriétaire demande, ce que cette version répond

| Demande | Réponse |
|---|---|
| « fluidité et variété des combos », « vrais enchaînements » | Après chaque coup qui touche, le bouton et la direction choisissent la suite (§1.4, matrice §2.3). Les jongles passent par des liens larges, de 9 à 11 tics pour les routes de base. On annule jusqu'à la super. |
| « un vrai style », « chaque perso aura son style » | Nayo compte les temps et cogne peu mais lourd : le Direct, la Cross, puis la « basse » au 3e temps. Il fait décoller, écrase au sol (Rebond) et lâche la Mégabasse. Riff enchaîne les rafales : plus de coups, moins de dégâts, et sa Vrille la fait suivre la cible (§4). |
| « mode Tekken, SF, autres jeux connus » | De Tekken : les cordes, un lanceur haut, la jongle par liens et le prolongateur unique (Rebond). De SF : les paliers d'annulation, l'EX (le Remix), la super et un CONTRE qui ouvre une route. De GG et SF6, le Drive Rush et le Roman Cancel deviennent le Rewind. De KI : l'alternance coups normaux / spéciaux. |
| « tous boutons, tous sens, toutes combinaisons » | L, H, S et BOOST, chacun en neutre, →, ← et ↓, après chaque coup qui touche, soit 16 cases par coup ; DASH donne en plus le Rewind (matrice §2.3). |
| « pas infini non plus » | Une limite dure de 12 coups par combo, prouvée (§1.13). S'y ajoutent la phrase (chaque coup une fois), les paliers, les points de jongle et une jauge qu'aucun combo ne peut rembourser. |
| « ajouté du boost », puis « une jauge de boost littérale aussi » | Une jauge de Boost de 3 barres et un bouton BOOST (7e bouton tactile). On y dépense le Remix des trois spéciaux, le Rewind au bouton DASH et la Mégabasse (§1.8). Le punch passe par les fins plus lourdes, le Rebond, le compteur de combo et le son. |
| « la meilleure animation pixel art possible » | Nayo reçoit 3 planches : le Crochet au foie (neuve), le Remontant chassé (dérivée) et la Mégabasse (dérivée). Il reçoit aussi 5 clips de réutilisation honnêtes et des effets Boost « platine » régénérés. Le §5 donne la liste, poses et tics compris. |

### 0.2 « Ajouté du boost » : les deux sens, et pourquoi

Je retiens **les deux sens**.

1. **Le punch** : des enchaînements plus longs, plus variés et plus explosifs. Cela passe par les cordes, la jongle haute, le Rebond, des gels plus longs sur les fins et un rendu qui monte (compteur, tampons, sons).
2. **Une vraie jauge**, que le propriétaire a confirmée (« une jauge de boost littérale aussi ça le ferait »). Elle se remplit en se battant, se lit sous le pouce et se dépense sur un bouton.

La parenthèse « pas infini non plus mais juste ajouté du boost » parle d'intensité. Le propriétaire a ensuite demandé une jauge en toutes lettres : la faire aussi n'est donc pas une supposition. Le nom « Boost » vient d'un geste de DJ, le *bass boost* de la table. C'est pourquoi la super de Nayo s'appelle la Mégabasse.

### 0.3 D'où vient chaque pièce

| Pièce | Origine | État dans cette version |
|---|---|---|
| Phrase (chaque normal une fois par suite d'annulations, les deux légers deux fois) | style | Gardée. Le masque n'indexe que les normaux (15 bits sur 31). |
| Cordes bouton × direction (`branches`) | style, SF, Tekken | Gardées. Les règles de validation viennent de SF ; la règle « L dans toutes les directions finit au sol sur la Cross » vient de Tekken. |
| Paliers d'annulation | SF | Un champ `tier` sur le type `special`, et non un nouveau type de coup. Un spécial qui a **touché** s'annule en super seulement ; un projectile, jamais. |
| Lanceur haut (vy 8), levée qui baisse avec les points, transport de 0,5 px par tic | Tekken | Greffés. C'est la chaleur sans jauge qui manquait à style. |
| Remontant chassé (planche dérivée de backHeavy) | Tekken | Greffé. Le Remontant seul rate après la Cross au-delà de 37 px. |
| Rebond, une fois par combo | Tekken | Greffé dans la couche 2. Le collage au mur est écarté (§7). |
| Double direct (← + L après le Direct) | Tekken | Greffé, réglé à +2 en garde pour respecter la règle de validation du §1.12. |
| Crochet au foie (H, H), planche neuve | SF | Greffé. Il prolonge le Crochet sans affaiblir son recul. |
| Limite dure de combo | SF | Fixée à **12** (§0.4). |
| Gains de jauge tirés des dégâts **scalés** ×3/2, et preuve que la jauge ne se rembourse pas | SF | Greffés. Les gains ne comptent que sur les 6 premiers coups, ce qui rend la borne vérifiable au chargement (§1.8.2). |
| Plan `infinite.test` : recherche et fuzz à jauge infinie | SF | Greffé, mesuré au §1.13. |
| Démarrage de 2 tics au plus après le flash de la super | Tekken | Greffé. Un saut bufferisé ne s'échappe pas (mesuré). |
| Drapeaux « une fois par séquence » regroupés dans un seul champ `flags` | Tekken | Greffé : 4 champs d'état neufs au total. |
| Boost validé au même timing que le spécial (D18 étendu), coûts ∈ {0, 1000, 3000} | Tekken | Greffé. |
| Rewind (le Boost cancel), Mégabasse, compteur VU, Scratch, Crochet en CONTRE qui plie | style | Gardés, corrigés (§0.4). Le Scratch part dans sa propre PR. |
| Repère visuel du Boost « platine » (blanc incandescent et rémanence) | correction des juges | À la place de l'or, qui ne se lirait pas sur la tenue or et cramoisi de Riff (D20). |

### 0.4 Désaccords tranchés

1. **Limite de combo : 10 (juge 2) ou environ 12 (juge 1). Je retiens 12.** Avec les jongles greffées, la recherche en faisceau trouve des combos naturels de 12 coups : Nayo avec la super, Riff sans jauge. Sans limite, Riff atteint 13 (mesuré). Une limite à 10 couperait des routes prévues ; à 12, elle ne coupe que le 13e coup de Riff. Elle ne coupe aucune route de ce document, et c'est un filet que l'on atteint vraiment.
2. **Rebond : tout de suite (juge 1) ou plus tard, si les tests de jeu le demandent (juge 2). Je le mets dans la couche 2.** Le propriétaire a écrit « mode Tekken ». La correction « chaleur sans jauge » du juge 1 est obligatoire. Le Rebond tient en un champ de données, un drapeau et 10 lignes dans `airborne()`, sous la limite de 12 coups.
3. **Place du bouton BOOST.** Ni (52, 200) ni (126, 198) ne passent la règle existante de `touch.test.ts` : 6 à 16 px entre un bouton et son plus proche voisin (24,7 px, et 21 / 23 px). Je retiens **(droite 126, bas 190), Ø 56**, dans l'encoche entre S et PRISE : 13,9 px jusqu'à S, 15,9 px jusqu'à PRISE (vérifié au §1.8.5). Le bouton n'est jamais juste au-dessus de S.
4. **Crochet au foie : tout de suite (juge 1) ou en option (juge 2). Tout de suite**, en planche n° 1. H, H fait partie de la table des cordes du Crochet, il donne le 2e mot de boxe, et il évite le saut de pose d'un Marteau tiré de l'Overhand derrière un Crochet tendu. Le Marteau ne reste que sur L, L, → + H.
5. **Remontant chassé : obligatoire (juge 1) ou seulement si la portée l'exige (juge 2). Je le fais.** Mesuré : sans pas d'appel, le Remontant rate après la Cross à 40 px, alors qu'il passe de 30 à 46 px avec le pas de 12 px.
6. **Gains de jauge.** Les deux juges demandent les dégâts scalés ×3/2. J'ajoute que **seuls les 6 premiers coups d'un combo** rapportent. La borne « un combo rapporte moins d'une barre » devient alors une inégalité vérifiée au chargement (864 < 1000, §1.8.2), au lieu d'un chiffre tiré d'une recherche qui n'est jamais exhaustive. Le CPU construit quand même 1,22 à 1,29 barre par round (mesuré), dans la cible.
7. **Lanceurs : annulation en normal (style) ou liens (Tekken). Je retiens les liens.** Le Remontant et le Remontant chassé ne s'annulent qu'en spécial, comme aujourd'hui. Avec la phrase, une annulation en normal en l'air ressortait le Direct, mais refusait la Cross (déjà jouée) : le joueur appuyait L, L et obtenait Direct, puis rien (mesuré). Le lien remet la phrase à zéro et sa fenêtre fait 9 à 11 tics. La règle tient en une phrase : « après un lanceur, laisse Nayo se remettre, puis recommence ».
8. **Marteau : le « trou » demandé après une Cross gardée.** Avec un démarrage de 14, il y a 2 tics libres entre la fin de la garde et l'impact. Un Jab ou un Direct martelé y perd (CONTRE), mais un reversal invincible y passe : Uppercut, Montée platine, Genou à fond de Riff, Mégabasse (tous mesurés). Un démarrage de 17 ferait gagner le Jab martelé, mais réduirait la fenêtre du Rebond de 10 à 7 tics. Je retiens 14 : le coût du haut, c'est le reversal et −6 en garde. Le Balayage, lui, forme un vrai enchaînement, mais il est à −8 en garde.
9. **Noms.** Le jeu est en français. Le Boost de Nayo s'appelle « platine », pour la platine du DJ et le disque de platine, et pour sa couleur blanche, celle de l'effet. Celui de Riff s'appelle « à fond », dans son idiome punk. « Remix », « Scratch » et « Rewind » sont des mots du sound system que le français emploie tels quels (« rewind ! » crie la foule d'un sound clash). La super de Riff devient le « Slam », le mot français pour le plongeon dans la foule.

### 0.5 Chiffres clés *(mesuré)*

| | Nayo (sur Riff, 900 PV) | Riff (sur Nayo, 1000 PV) |
|---|---|---|
| Combos de référence du §7.8 | tous identiques (106, 126, 163, 164, 195) | tous identiques (88, 143, 164, 140, 149) |
| L, L, L à toute distance où le Direct touche | 70/70 debout, 70/70 accroupi | 53/53 debout, 54/54 accroupi |
| Sans jauge, routes de base | 106 à 217 (12 à 24 %) | 88 à 200 (9 à 20 %) |
| Sans jauge, jongles | 249 à 279 (28 à 31 %) | 209 à 223 (21 à 22 %) |
| Sans jauge, maximum trouvé | 313 (35 %), en 11 coups, route d'expert | 249 (25 %), en 12 coups |
| 1 barre | 244 à 330 (27 à 37 %) | 212 à 250 (21 à 25 %) |
| 3 barres | 330 à 374 (37 à 42 %) | 300 à 321 (30 à 32 %) |
| Coups par combo, au plus | 12 (la limite, atteinte avec la super) | 12 (la limite ; 13 sans elle) |
| Garde d'affilée la plus longue (fuzz, jauge remplie à chaque tic) | 61 tics | 59 tics |
| Jauge construite par round (CPU difficile contre CPU difficile, 93 rounds) | 1,29 barre | 1,22 barre |
| Gain maximal d'un combo (borne prouvée) | 864 < 1000 | 864 < 1000 |

---

## 1. Règles communes (tout le casting)

### 1.1 Entrées et commandes

**Bits** (`src/core/input.ts`) : on ajoute `Boost: 1 << 10`. `PRESS_BUTTONS = ~DIRECTIONS` le couvre déjà.

**Commandes** (`src/core/commands.ts`) : on ajoute `'boost'` et `'boostDash'`.
- Priorité sur un même tic : PRISE > BOOST > S > H > L > DASH (`dash`, `boostDash`, `backdash`) > saut.
- `'boostDash'` se décide **au moment de l'appui** (`afterContact()`). C'est le bit DASH (jamais le double-tap) nouvellement pressé, arrière non tenu, alors que l'état précédent du perso est `action === 'attack'` et `moveConnected`.
- Un DASH pressé avant le contact reste un `dash` ; un double-tap reste un `dash`. Ni l'un ni l'autre ne peut dépenser une barre.
- Dans `groundMove`, `boostDash` donne `dashForward`. Si le Rewind ne peut pas sortir, le DASH tamponné sort donc en dash simple à la fin du coup, comme aujourd'hui (et seulement s'il est encore dans le buffer de 6 tics).

**BOOST se lit comme S** (`boostMove()` dans `moves.ts`). Une manip fraîche passe d'abord, et la première ligne qui s'applique gagne :

| Entrée | Coup | Coût | Si on ne peut pas payer |
|---|---|---|---|
| →↓↘ + BOOST, ou ↓ (diagonales ↘ ↙ comprises) + BOOST | Montée (Remix de l'anti-air) | 1000 | rien |
| ↓↘→ + BOOST, ou BOOST seul | Remix du spécial neutre | 1000 | rien |
| ← pur (sans bas, sans manip) + BOOST | Super | 3000 | **rien**, même avec 1 ou 2 barres |
| → + BOOST | Remix du spécial avant | 1000 | rien |

BOOST ne sort jamais autre chose que ce qu'on demande (pilier 2). Le bouton est grisé sous 1 barre ; sa bague dit si la super est prête (§1.8.5).

**Direction d'une corde** (`branchDirOf`). Elle se lit sur `bufferedInput`, relativement à `bufferedFacing`, dans cet ordre : bas (diagonales comprises), puis avant, puis arrière, puis neutre. Haut ne compte jamais : ↗ vaut avant, ↖ vaut arrière, et haut seul vaut neutre (haut fait sauter, il ne choisit rien).

### 1.2 La phrase (masque « chaque coup une fois »)

- **Règle.** Une **phrase** est la suite des coups enchaînés par annulation depuis le dernier départ du neutre. Une annulation n'entre jamais dans un **normal** déjà joué dans la phrase. Le Direct et le Coup bas (« le beat ») ont droit à deux passages.
- **Remise à zéro.** Tout coup lancé depuis le neutre (donc tout lien) recommence la phrase, et le Rewind aussi.
- **Données.** `FighterState.phrase` et `phraseTwice` : deux masques d'entiers. Un bit par identifiant de `PHRASE_MOVE_IDS`, les 15 normaux de la grammaire : standLight, standHeavy, crouchLight, crouchHeavy, jumpLight, jumpHeavy, forwardLight, forwardHeavy, backHeavy, chainLight, lightFinisher, jabRepeat, chainHeavy, chainHigh, chainLaunch. La table des bits `PHRASE_BITS` est précalculée.
- **Où.** `startGroundMove(fighter, id, template, cancelled)` met les masques à jour ; `phraseAllows()` les lit dans `cancelMove`. Les spéciaux n'ont pas de bit, les paliers les limitent (§1.3).
- **Ce qu'elle remplace.** La règle du §7.1, « une annulation sur contact ne donne jamais un coup qui avance », disparaît. Le Jab chassé de Nayo et le Toprock de Riff redeviennent des maillons, une fois par phrase.
- **Effets mesurés.**
  - Chez Riff, ↓L, →L, ↓L, →L sort les trois premiers ; le 4e (Toprock, déjà joué) est refusé.
  - Chez Nayo, ↓L, →L, ↓L : le 3e est refusé, car le Jab chassé ne s'annule qu'en Cross ou en spécial.
  - H, H, H refuse le 3e H ; ↓L, ↓L, ↓L refuse le 3e.

### 1.3 L'échelle d'annulation (paliers)

`tierOf(move)` : 0 pour un normal ou un mouvement, 1 pour un spécial (type `special` sans `tier`), 2 pour un Remix (`tier: 2`), 3 pour la super (`tier: 3`). **Il n'y a pas de nouveau type de coup.**

| Coup en cours (après contact) | Peut s'annuler en |
|---|---|
| Normal | sa corde (§1.4) ; sinon ce que dit `cancelInto`. `'normal'` ouvre les normaux. `'special'` ouvre les trois paliers au-dessus : spécial, Remix, super. |
| Rewind (`boostCancel`, dès f3, sans contact) | normal, spécial, Remix, super |
| Spécial ou Remix | **la super seulement**, et seulement si le coup a **touché** (`FLAG_MOVE_HIT`, pas en garde) et n'est **pas un projectile** |
| Super | rien |
| Projectile (Vinyle, Vinyle platine) | rien : un tir ne rend jamais le lanceur « connecté » |

- **Un palier ne redescend jamais**, et un spécial ne s'annule pas en spécial : au plus un spécial par phrase.
- La super n'a qu'un usage par séquence (`FLAG_SPENT_SUPER`, §1.8.4).
- L'Uppercut gardé reste à −23, faute de pouvoir l'annuler : c'est la faiblesse de Nayo.

### 1.4 Les cordes (bouton × direction)

- **Données.** `MoveData.branches?: readonly Branch[]` remplace `chain`, avec `Branch = { button: 'light' | 'heavy'; dirs?: readonly BranchDir[]; move: MoveId }` et `BranchDir = 'neutral' | 'forward' | 'back' | 'down'`. Une branche sans `dirs` vaut pour toute direction.
- **Lecture** (`branchMove()`, 8 entrées au plus, aucune allocation), dans `cancelMove` et seulement après contact :
  1. une manip fraîche passe d'abord (elle demande un spécial) ;
  2. puis la branche dont le bouton et la direction correspondent ;
  3. sinon `groundMove` et `cancelInto`.
- **Ce qui ne change pas.** Une branche passe outre `cancelInto`, jamais la phrase. S, BOOST, PRISE et DASH n'ont pas de corde.
- **Garde-fous pour le débutant.** Sur la Cross, L dans toutes les directions donne la Mise au tapis. Sur le Direct et le Double direct, L en neutre, → (et ← sur le Double direct) donne la Cross. Martelé dos tenu, L donne Direct, Double direct, Cross, Mise au tapis et finit toujours au sol (mesuré, 115).
- **Garantie.** L, L, L passe partout où le premier L touche, pour les deux persos, debout comme accroupi (mesuré, toutes les distances par demi-pixel).
- **Validation.**
  - Les cibles sont définies et de type normal.
  - Un seul `(bouton, direction)` par coup.
  - Seuls les normaux ont des branches.
  - Le graphe des branches est acyclique et ses chemins comptent 5 coups au plus. Le plus long, chez Nayo, est Direct, Double direct, Cross, Crochet, Crochet au foie.

### 1.5 La jongle à points, le Rebond, la Vrille

**Points**
- `Knockdown.juggle?: number` (c'était un booléen) et `FighterState.juggle: number` (c'était 0 | 1).
- Un lanceur pose ses points sur une cible qui **n'est pas déjà en airHit** : au sol, ou en saut s'il la prend en anti-air.
- Points posés : Remontant et Remontant chassé **4** ; Remontant en CONTRE ou en PUNITION **5** ; Pied fendu platine **2** ; Scratch **2** ; chez Riff, Retourné et Retourné sauté **4**, Genou à fond **2**.
- La validation impose 1 ≤ points ≤ `P_MAX` = 5.

**Coût**
- `MoveData.juggleCost` vaut 1 par défaut. Il vaut **2** pour le Crochet, le Crochet au foie et le Coup de coude de Riff (les lourds frappent fort et peu). Il vaut **0** pour les frappes de la super.
- Un coup ne touche un corps en airHit que si `juggle ≥ coût`.
- À coût 0, il touche tout corps déjà dans le combo (`comboCount > 0`), mais jamais un corps marqué `FLAG_LIMIT` ou `FLAG_BOUNCE`.

**Levée et transport** (`juggleHit()` dans `combat.ts`)
- Un coup sur un corps jonglé dépense ses points. Le corps remonte à `vy = min(3, 1,5 + 0,5 × points restants)` px par tic et file à 0,5 px par tic.
- Plus les points baissent, plus il retombe vite : la jongle s'éteint d'elle-même.
- Un coup qui met au sol sans être un lanceur (Mise au tapis, Uppercut, Pied fendu, Balayage, dernière frappe de la super) **finit la jongle** avec son propre vol, à 0 point.
- Un lanceur qui touche un corps déjà en l'air ne pose aucun point : il le relève, c'est tout.

**Fin et vol**
- À 0 point, le corps est intouchable jusqu'au sol. À l'atterrissage, il passe en knockdown, invulnérable 40 tics, sans coup au sol.
- Le lanceur lève à **8 px/tic** (au lieu de 5) : 31 tics en l'air, sommet vers 60 px. Les liens qui suivent ont 9 à 13 tics de fenêtre (mesuré).

**Rebond, le prolongateur de Nayo**
- `MoveData.extender: 'rebond'`, porté par le Marteau. Il vaut une fois par combo (`FLAG_EXTENDED`, posé sur la victime).
- Le Marteau qui touche un corps jonglé l'écrase au sol à 5 px/tic. Le corps est intouchable pendant la chute (`FLAG_BOUNCE`), puis rebondit à 6 px/tic avec **+2 points**.
- L'impact gèle 4 tics de plus (`EXTENDER_HITSTOP`).
- `airborne()` joue le rebond à l'atterrissage.

**Vrille, le prolongateur de Riff**
- `extender: 'vrille'`, sur son Swipe.
- Sur un corps jonglé, le Swipe ne met plus au sol : il fait tournoyer la cible en l'air (vy 5, vx 1) avec **+2 points**, une fois par combo, et l'impact gèle 4 tics de plus.
- Le même drapeau `FLAG_EXTENDED` sert au Rebond : un combo n'a jamais deux prolongateurs.

**Remise à zéro.** Les marques de la victime (`FLAG_EXTENDED`, `FLAG_BOUNCE`, `FLAG_LIMIT`) s'effacent dans `actOnGround`, quand elle se tient de nouveau en neutre.

### 1.6 CONTRE et PUNITION par coup

- On garde les règles du §7.4 : +20 % de dégâts, +4 tics de hitstun, +3 tics de gel, et seulement sur le premier coup d'un combo.
- **Nouveau** : `MoveData.counter?: { hitstun?: number; pushback?: number; knockdown?: Knockdown }` donne à un coup son propre effet de CONTRE.
  - **Crochet de Nayo** : il **plie** l'adversaire. Le bonus passe à +16 tics de hitstun (au lieu de +4) et le recul à 0,5 px/tic : il se plie sur place. Le Crochet passe à **+17** et ouvre un lien de 18 tics (mesuré). La réaction est hitMid tenue, sans nouvelle planche.
  - **Remontant de Nayo** : il lance avec 5 points au lieu de 4.

### 1.7 Dégâts, décroissance, limite de combo

**Formule inchangée** (§7.7) :
```
scaling% = max(50, 100 − 10 × (n − 1))
bonus%   = 100 + 20 (CONTRE ou PUNITION, 1er coup) + 10 (DROP)
dégâts   = max(1, trunc(damage × scaling% × bonus% / 10000))
chip     = trunc(damage × 15 / 100), spéciaux (tous paliers), jamais mortel
```
Les tabassages et les lancers gardent des dégâts fixes. La table du §7.8 **ne change pas** : les 10 combos de frappe sont mesurés identiques, et la prise ne change pas. Le critère §16-7 tient.

**Décroissance du hitstun** :
- `stun = max(0, hitstun + bonus CONTRE − 2 × max(0, n − 8))`, avec `DECAY_FROM = 8` et `DECAY_STEP = 2` ;
- elle ne joue qu'au sol (un coup en l'air n'étourdit pas, il relève) ;
- aucune route prévue ne la sent, mais une boucle de liens au sol lâche avant la limite.

**Limite dure** : `COMBO_LIMIT = 12`.
- Le coup qui porte `comboCount` à 12 met toujours au sol : levée d'au moins 3 px/tic, 0 point, et `FLAG_LIMIT`, qui efface `FLAG_BOUNCE`.
- `isJuggled()` refuse alors toute frappe et tout projectile jusqu'au sol (`findProjectileHit` passe par `canBeHit`).
- Un tampon « MAX ! » le dit (§1.8.7).

### 1.8 La jauge de Boost

#### 1.8.1 Barres et report

- **Champ et barres.** `FighterState.boost` est un entier de 0 à `BOOST_MAX = 3000`, soit **3 barres** de `BOOST_BAR = 1000`.
- **Report.** La jauge vaut 0 au début du match et se garde d'un round à l'autre, comme la jauge de super de SF : `createRound(…, boosts)`.
  - Le perdant d'un round a gagné de la jauge en encaissant, et garder ses barres devient une décision.
  - Mesuré : au début des rounds 2 et suivants, Nayo a 2,08 barres et Riff 1,88.
- **Entraînement.** Une option « Jauge : normale / pleine (remise à 3 barres à chaque remise en place) / infinie (remplie à chaque tic) ».

#### 1.8.2 Remplissage (`boosted()`, passe pure sur les contacts, dans `assembled()` de `step.ts`)

| Événement | Pour l'attaquant | Pour le défenseur |
|---|---|---|
| Coup qui **touche** (frappe, projectile, tabassage, lancer) | `trunc(dégâts infligés × 3/2)`, avec les dégâts **scalés** de la contact, **si ce coup est l'un des 6 premiers du combo** (`comboCount ≤ BOOST_GAIN_HITS = 6`) | `trunc(dégâts reçus × 1/2)` |
| Coup **gardé** | +20 | +10 |
| Spécial simple (palier 1) démarré quand l'adversaire n'est **pas** en hitstun ni en airHit | +20 (le zoning au Vinyle construit la jauge) | — |
| Coup Boost (Remix, Rewind, super), en touche comme en garde | 0 | la règle ci-dessus |
| Début de son DROP du Crossfader (phase 5, §1.8.8) | +1000 | — |
| Marcher, sauter, attendre | 0 | 0 |

**Borne vérifiée au chargement** (`validateTemplate`, puis `assertValidMatch`) : `3/2 × Σ(n = 1..6) trunc(D × s(n) × b(n) / 10000) + 20 < BOOST_BAR`, où :
- D est le plus gros dégât d'un coup non Boost du casting : 110, l'Uppercut ;
- s(n) vaut 100, 90, 80, 70, 60, 50 ;
- b(1) = 130 (CONTRE et DROP), puis 110.

Soit 3/2 × (143 + 108 + 96 + 84 + 72 + 60) + 20 = **864 < 1000**. Pour les prises (dégâts fixes) : 3/2 × 130 = 195. **Aucun combo ne rapporte une barre** : un combo ne peut jamais payer son propre Rewind ni sa propre super.

**Mesuré** (CPU difficile contre CPU difficile, 40 matchs, 93 rounds de 30,4 s en moyenne, le CPU ne dépense pas) :
- jauge construite par round : Nayo 1,29 barre, Riff 1,22 ;
- part de chacun : 51 % et 49 % ;
- première barre au bout de 7,3 et 7,9 s.

Un humain qui combote construit plus.

#### 1.8.3 Dépenses

| Dépense | Entrée | Coût | Ce que c'est |
|---|---|---|---|
| **Remix** (palier 2) | BOOST, → + BOOST, ↓ + BOOST (manips comprises) | 1000 | La version Boost du spécial : même planche, **même timing** (D18 étendu, validé), une propriété qui ouvre une route. En neutre ou en annulation, partout où un spécial est permis. |
| **Rewind** (le Boost cancel) | DASH pressé **après** le contact, pendant un **normal** au sol qui a touché ou été gardé | 1000, une fois par séquence | Le coup se coupe en un pas de 24 px, annulable dès f3 en normal, spécial, Remix ou super. La **phrase repart à zéro**. Sur un coup qui touche, la cible **s'arrête de glisser**, et un flash de 6 tics marque le moment. |
| **Super** (palier 3) | ← + BOOST, 3 barres, en neutre, en annulation d'un normal, ou d'un spécial ou d'un Remix qui a touché | 3000, une fois par séquence | Nayo : la Mégabasse. Riff : le Slam. |

**Avantage du Rewind** (Nayo, mesuré) :

| Après | En garde | En touche |
|---|---|---|
| Direct | +7 | +11 |
| L, L | +9 | +15 |
| Crochet | +11 | +17 |
| H, H | +9 | +19 |

On ne peut pas l'utiliser sur un spécial : un spécial gardé reste punissable.

#### 1.8.4 Limites (pourquoi la jauge ne fait pas d'infini)

1. Le plafond est de 3000 ; chaque dépense coûte au moins 1000, et un coup Boost ne rapporte rien à celui qui l'utilise.
2. Un combo rapporte au plus 864, et le DROP ne peut démarrer qu'une fois (le curseur est gelé pendant la montée et le DROP). Dans un combo, la jauge ne remonte donc jamais d'une barre entière, hors DROP.
3. `FLAG_SPENT_CANCEL` (Rewind) et `FLAG_SPENT_SUPER` (super) : une fois chacun par **séquence**. Une séquence va d'un premier coup touché ou gardé à la sortie de l'adversaire du hitstun, du blockstun et de l'airHit ; c'est la passe de jauge qui efface les drapeaux. `superGauge()` cache la seconde super à la table des commandes.
4. Rewind + super dans un même combo demande 4 barres sans DROP : c'est impossible (mesuré : le ← + BOOST final ne sort pas, avec 2130 de jauge).
5. En garde : un Rewind coûte 1000, alors qu'une série gardée rapporte au plus +20 par coup. Le fuzz, jauge remplie à chaque tic, mesure 61 tics de garde d'affilée au plus.

#### 1.8.5 Entrées par appareil

| Appareil | BOOST | Rewind |
|---|---|---|
| Clavier, joueur 1 | **O** (`KeyO`, au-dessus de L, qui est S) | Maj gauche (DASH) |
| Clavier, joueur 2 (pavé) | **Pavé 6** (au-dessus de Pavé 3, qui est S) | Pavé 0 |
| Clavier, joueur 2 (portable) | **`BracketLeft`** (« [ » en QWERTY, « ^ » en AZERTY, au-dessus de `'` / `ù`) | Maj droite |
| Manette | **RT / R2** (bouton standard 7, libre aujourd'hui) | LB / L1 |
| Tactile | **7e bouton BOOST** | relâcher le doigt, puis taper DASH (la capture du pointeur interdit le glisser d'un bouton à l'autre) |

**Bouton tactile** (`TOUCH_BUTTONS`) :
```ts
{ label: 'BOOST', fontSize: 8, flag: Input.Boost, className: 'touch-boost', right: 126, bottom: 190, diameter: 56 }
```

**Géométrie, vérifiée à la main sur `touch-layout.ts`** :

| Contrôle | Valeur | Règle |
|---|---|---|
| Écart avec S (163, 126, Ø 64) | hypot(37, 64) − 60 = **13,9 px** | 6 à 16 px : passe |
| Écart avec PRISE (89, 126, Ø 60) | hypot(37, 64) − 58 = **15,9 px** | 6 à 16 px : passe |
| Plus proche voisin de S | toujours PRISE, à 12 px | inchangé |
| Bord haut | à 218 px du bas, soit y = 157 sur 667×375, et y = 151 sur 844×390 avec l'encoche | dans l'écran |
| Bord droit | x + r = 569 | loin du bouton pause (x ≥ 631) |
| Moitié de l'écran | x − r = 513 | dans la moitié droite (≥ 333,5) |
| Bord le plus éloigné de la grappe | toujours DASH, à 265 px | règle inchangée |
| Libellé | 5 × 8 = 40 px | ≤ 56 − 2 × 8 = 40 : tient |
| Zone de toucher | 56 + 16 = 72 px | ≥ 48 px |

Les zones de BOOST et de S se chevauchent de 2 px ; le centre le plus proche gagne, comme entre S et PRISE aujourd'hui (4 px).

**La bague du bouton est la jauge sous le pouce** :
- 3 arcs en `conic-gradient`, pilotés par une variable CSS `--boost-bars` que `touch-controls.ts` ne pose **que quand le nombre de barres change** ;
- l'arc en cours se remplit en `--boost-part` (par pas de 1/20 de barre) ;
- sous 1 barre, le bouton est grisé (opacité 0,45) ;
- à 3 barres, les trois arcs passent en blanc platine et la bague brille : la super est prête.

#### 1.8.6 HUD (`src/render/hud.ts`, vue 480 × 270)

- **Place.** Sous chaque barre de vie, côté extérieur, sur la ligne y = 30 (sous le nom).
  - D'abord le mot « BOOST » en Press Start 2P de 8 px, puis 3 segments de **40 × 4 px**, espacés de 3 px.
  - Joueur 1 : x = 8 pour le mot, segments à x = 52, 95 et 138. Joueur 2 : en miroir.
  - Sur un téléphone de 667 px de large, cela fait environ 56 × 5,6 px CSS.
- **Couleurs.**
  - Segment vide : #2a2a3a, bord de 1 px blanc à 25 %.
  - Segment en cours : la couleur d'énergie du perso dans **sa tenue** (cyan ou magenta pour Nayo, magenta ou cramoisi pour Riff).
  - Segment plein : **blanc platine** (#FFFFFF, liseré de 1 px de la couleur d'énergie).
  - À 3 barres, le mot « BOOST » passe en blanc et clignote à 2 Hz (≤ 3 Hz, D21) ; il reste fixe en « Flashs réduits ».
- **Coût.** Par joueur : 1 texte et 6 rectangles, créés une fois. On ne repeint que quand `floor(boost / 50)` change : largeur du segment en cours, couleurs.
- **Crossfader.** Il reste au centre sous le chronomètre (§8.3). Les formes et les places diffèrent : une piste avec un curseur au centre, des segments au bord.

#### 1.8.7 Repère visuel, sons, tampons

- **Le Boost se voit en « platine »** (blanc incandescent), jamais en or. L'or et le cramoisi sont la 2e tenue de Riff (D20), et la teinte MULTIPLY de Phaser verdirait le cyan (juge 2).
  - Les effets des coups Boost sont des **fx régénérés** par l'outil de sprites, avec une rampe platine : #FFFFFF, #F2F6FF, #C9D6E8, liseré #20243A. C'est le cas des 3 Remix et du Scratch, pour chaque perso et chaque tenue.
  - En plus, **deux images rémanentes** tirées d'un pool : la silhouette du perso en `TintModes.FILL` blanc, à 35 % puis 18 % d'opacité, 3 et 6 tics en arrière, pendant les coups Boost seulement. En « Flashs réduits », une seule image à 25 %, sans flash.
- **Tampons** (images générées, `tools/sprites/stamps`) : « REMIX ! », « REWIND ! », « MÉGABASSE ! », « REBOND ! », « SCRATCH ! », « MAX ! » (la limite de combo). Ceux de Riff : « POGO ! », « VRILLE ! », « SLAM ! ».
- **Sons procéduraux** (`sfx.ts`) :
  - Remix : *bass boost*, un balayage grave saturé ;
  - Rewind : rembobinage, un scratch qui descend ;
  - Mégabasse : trois kicks et un *sub-drop* ;
  - Rebond : un choc mat avec réverbération ;
  - Scratch : « wicka ».
  - Plus la note pentatonique par coup du §7.9, dont le timbre change selon la famille : léger « pat », lourd « thunk », spécial scratch.

#### 1.8.8 Le Crossfader (§8) : séparés, reliés en un point

- **Le Crossfader dit qui mène.** C'est un nombre partagé, gagné par l'initiative, sans bouton (D17 tenu), exprimé par la musique.
- **Le Boost dit ce qu'on brûle.** C'est une réserve à soi, gagnée en frappant et en encaissant, et dépensée aux boutons.
- **Un seul pont** : au début de son DROP, le joueur reçoit **+1 barre** (+1000, plafonnée), et le DROP garde son +10 %.
- **Le « Remix pendant le DROP » du §5.6 disparaît.** « Remix » désigne maintenant les versions Boost, à tout moment. Il n'y a plus de règle d'empilement : une seule famille de variantes.
- **Pourquoi ni fusionner ni remplacer.**
  - Fusionner mettrait un bouton sur le tug-of-war, et le défenseur n'aurait jamais de jauge.
  - Remplacer ferait perdre la mécanique signature, la musique et le décor.
- **Plus tard.** `mix-balance.test` (phase 5) mesurera aussi les barres de Boost par round, DROP compris.

#### 1.8.9 Coût de la jauge

- HUD : environ 70 lignes dans `hud.ts`.
- Bouton tactile : 1 entrée dans `touch-layout.ts`, la bague (environ 20 lignes de `touch-controls.ts` et `styles.css`), et le test de géométrie passé de 6 à 7 boutons.
- Clavier et manette : 4 lignes.
- Art : 6 tampons générés, les fx platine régénérés automatiquement, aucune planche pour les Remix ni le Rewind. La Mégabasse a sa planche (§5).

### 1.9 Le flash

- **Données.** `MoveData.flash?: { frame: number; ticks: number }` : quand le coup atteint `frame`, tout le jeu gèle `ticks` tics, par le hitstop global, dans `assembled()`.
  - Mégabasse : `{ frame: 0, ticks: 20 }`.
  - Rewind : `{ frame: 0, ticks: 6 }`.
  - Slam de Riff : `{ frame: 10, ticks: 20 }` (le gel la prend au sommet de son plongeon).
- **Règle de validation.** Pour une super, il faut `startup − flash.frame ≤ 2` : le coup frappe 2 tics au plus après le gel.
- **Mesuré.** Un saut, un backdash ou un Genou montant appuyés pendant le flash n'échappent pas à la Mégabasse : 264 dégâts dans les trois cas ; le Genou montant se fait même prendre en CONTRE, pour 280.
- **Chronomètre.** Le flash étant un hitstop, le chronomètre du round s'arrête pendant le gel ; c'est à tester (§6).

### 1.10 Le Scratch, signature de Nayo (couche 5, sa propre PR)

- **Entrée.** S neutre **pendant que son Vinyle vole** : aujourd'hui, cet appui ne fait rien (un seul projectile par joueur).
- **Effet.** Le disque fait demi-tour à 4,5 px/tic, avec les données du Scratch.
  - Ce qu'il touche est **lancé vers Nayo** (vy 5, vx 4, 2 points).
  - Il se garde **comme un coup de Nayo**, du côté de Nayo (D8 tenu) : `Landed.guardX`.
  - Il disparaît quand il revient à Nayo.
- **Données.** Le Scratch est le coup optionnel `signature`, avec `recall: true`. Il ajoute `ProjectileState.returning` (un champ haché) et le paramètre `discOut` de `updateFighter` et `groundMove`.
- **Route mesurée** : Vinyle sauté ⇢ S (Scratch) ⇢ →L → ↓S = 50 + 31 + 88 = **169**. Le Scratch passe dans 135 timings sur 235 ; ⇢ →L → →S (141) dans 206 sur 235.

### 1.11 Modèle de données

**`src/core/move-data.ts`**
```ts
export const OPTIONAL_MOVE_IDS = [
  'forwardLight', 'forwardHeavy', 'backHeavy', 'chainLight', 'lightFinisher',
  // Combos v3
  'jabRepeat', 'chainHeavy', 'chainHigh', 'chainLaunch',
  'boostCancel', 'specialBoost', 'specialForwardBoost', 'specialAntiAirBoost', 'super',
  'signature',
] as const;                                   // 30 identifiants en tout
export const PHRASE_MOVE_IDS = [ /* les 15 normaux du §1.2 */ ] as const;
export const MOVEMENT_MOVE_IDS = ['dashForward', 'dashBack', 'boostCancel'];
export type BranchDir = 'neutral' | 'forward' | 'back' | 'down';
export interface Branch { readonly button: 'light' | 'heavy'; readonly dirs?: readonly BranchDir[]; readonly move: MoveId }
export interface Pulse { readonly frame: number; readonly hit: MoveData }   // précalculé
export interface Knockdown { readonly vx: number; readonly vy: number; readonly trip?: boolean; readonly juggle?: number }
// MoveData : chain disparaît, on ajoute :
readonly branches?: readonly Branch[];
readonly juggleCost?: number;                                   // 1 par défaut ; 0 seulement sur les frappes de super
readonly counter?: { readonly hitstun?: number; readonly pushback?: number; readonly knockdown?: Knockdown };
readonly tier?: 2 | 3;                                          // Remix, super (type 'special')
readonly boostCost?: number;                                    // 1000 ou 3000
readonly pulses?: readonly Pulse[];                             // super seulement
readonly flash?: { readonly frame: number; readonly ticks: number };
readonly extender?: 'rebond' | 'vrille';
readonly crouching?: true;                                      // remplace la liste en dur de isCrouchingMove
readonly recall?: true;                                         // couche 5
```

**`src/core/state.ts`, `FighterState`** : `juggle: number` (c'était `0 | 1`), plus quatre champs neufs :
- `boost: number` ;
- `phrase: number` ;
- `phraseTwice: number` ;
- `flags: number`, avec ces bits :

| Bit | Valeur | Côté | Remis à zéro |
|---|---|---|---|
| `FLAG_SPENT_CANCEL` | 1 | attaquant | quand l'adversaire sort de la séquence |
| `FLAG_SPENT_SUPER` | 2 | attaquant | quand l'adversaire sort de la séquence |
| `FLAG_MOVE_HIT` | 4 | attaquant | le coup en cours a **touché** (pas en garde) ; posé par `connected()`, effacé par `startGroundMove` |
| `FLAG_EXTENDED` | 8 | victime | en neutre |
| `FLAG_BOUNCE` | 16 | victime | en neutre |
| `FLAG_LIMIT` | 32 | victime | en neutre |

Avec la couche 5, `ProjectileState` reçoit `returning: boolean`. Tous ces champs vont dans `FIGHTER_FIELDS` et `GAME_FIELDS` (`tools/replays/replay.ts`).

**`src/core/rules.ts`, constantes neuves**

| Constante | Valeur |
|---|---|
| `BOOST_BAR` / `BOOST_MAX` | 1000 / 3000 |
| `BOOST_GAIN_HIT_NUM` / `DEN` / `HITS` | 3 / 2 / 6 |
| `BOOST_GAIN_TAKEN_PERCENT` | 50 |
| `BOOST_GAIN_BLOCKED` / `BLOCKING` / `SPECIAL` | 20 / 10 / 20 |
| `BOOST_DROP_GAIN` (phase 5) | 1000 |
| `DECAY_FROM` / `DECAY_STEP` | 8 / 2 |
| `COMBO_LIMIT` / `COMBO_LIMIT_LIFT` | 12 / px(3) |
| `JUGGLE_LIFT_MIN` / `JUGGLE_LIFT_PER_POINT` / `JUGGLE_CARRY` | px(1,5) / px(0,5) / px(0,5) |
| `JUGGLE_POINTS_MAX` | 5 |
| `REBOND_DOWN` / `BOUNCE_LIFT` / `BOUNCE_POINTS` | px(5) / px(6) / 2 |
| `VRILLE_LIFT` / `VRILLE_CARRY` / `VRILLE_POINTS` | px(5) / px(1) / 2 |
| `EXTENDER_HITSTOP` | 4 |
| `MAX_BRANCH_DEPTH` | 5 |

**Fichiers touchés (code)**

| Zone | Fichiers |
|---|---|
| Cœur | `core/{input,commands,moves,move-data,state,combat,step,round,validate,rules,config,projectiles*}.ts` et `core/fighter/{move,air,neutral,index*}.ts` (* couche 5) |
| Données | `data/fighters/{shared,nayo,riff}.ts`, `data/move-texts.ts` |
| Art | `art/types.ts` (ClipId), `art/nayo/{clips,sheets}.ts`, `art/riff/clips.ts` (FighterClips), `art/validate.ts` ; `tools/sprites/nayo/poses/{chainHeavy,chainLaunch,super}.ts` avec `poses/index.ts` et `cells.ts`, la palette fx « platine », les tampons |
| Rendu | `render/{hud,fight-feedback,fight-events,animation,combo-counter}.ts` (afterimages, tampons, compteur, zoom) |
| Entrées | `input/{touch-layout,touch-controls,keyboard,gamepad}.ts`, `styles.css` |
| Son | `audio/sfx.ts` |
| IA | `ai/plans.ts` (nouveau), `ai/cpu.ts` |
| Replays | `tools/replays/replay.ts` |
| Spec | `docs/combat-v2.md` (sections listées au §6.1, dans la PR de chaque couche) |

**Allocation.**
- Les tables de branches et `PHRASE_BITS` sont précalculées au chargement des données ; `juggleHit` n'alloue que sur un tic de contact.
- La passe de jauge rend le même objet quand rien ne change.
- Mesuré : 1,2 µs par tic, CPU compris, sur la base comme sur le prototype (36 000 tics en 43 ms).

### 1.12 Règles de validation (`validateTemplate`, au début de chaque match)

1. **Branches** : cibles définies et de type normal ; `(bouton, direction)` unique par coup ; branches sur les normaux seulement ; graphe acyclique, de profondeur ≤ `MAX_BRANCH_DEPTH` = 5.
2. **Phrase** : `PHRASE_MOVE_IDS` contient tout identifiant de type normal, et 31 entrées au plus.
3. **Paliers.**
   - `tier: 2` ⇒ type special, `boostCost` 1000, et startup, active et recovery égaux à ceux du spécial d'origine (`REMIX_OF`).
   - `tier: 3` ⇒ type special, `boostCost` 3000, `flash` présent, `startup − flash.frame ≤ 2`, `juggleCost` 0 sur chaque frappe.
   - Un spécial n'a pas de `cancelInto`, et un coup à `projectile` non plus.
4. **Coûts** : `boostCost` ∈ {0, 1000, 3000} ; 1000 seulement sur un Remix ou sur `boostCancel` ; 3000 seulement sur une super.
5. **Jongle** : `Knockdown.juggle` entier, entre 1 et 5 ; `juggleCost` entier ≥ 1, sauf les frappes de super (0).
6. **Prolongateurs** : `extender` seulement sur un normal, et un seul type par perso.
7. **CONTRE** : `counter.hitstun` entier entre 0 et 20 ; `counter.knockdown` valide comme un knockdown.
8. **Séries gardées** : l'avantage en garde de tout normal (`blockstun + 1 − active − recovery`) est ≤ (plus petit démarrage d'un normal ou d'un spécial simple du casting) − 1, aujourd'hui 3 − 1 = 2. Le Double direct est réglé à +2 pour passer. Tout coup qui frappe a un recul > 0.
9. **Rewind** (`boostCancel`) : type movement, `freeCancelFrom` présent, `cancelInto` ⊆ {normal, special}, `boostCost` 1000.
10. **Frappes de super** (`pulses`) : frames croissantes, dans l'actif ; super seulement.
11. **Flash** : seulement sur une super ou sur `boostCancel`, avec `frame < startup`.
12. **Scratch** (`recall`) : projectile, type special, `knockdown.juggle` ≤ 5.
13. **Borne de jauge** (§1.8.2) : 3/2 × Σ(n = 1..6) des dégâts scalés maximaux + `BOOST_GAIN_SPECIAL` < `BOOST_BAR`, et 3/2 × la prise la plus lourde < `BOOST_BAR`.
14. **Règles assouplies**, dites et testées :
    - « seuls les dashs sont de type movement » devient « dashs et boostCancel » ;
    - « les coups optionnels sont des normaux » devient la table `OPTIONAL_KINDS` (Remix et super : special ; boostCancel : movement ; signature : special) ;
    - « seuls les normaux enchaînent » devient la règle 1.

### 1.13 Preuve anti-infini

**Énoncé.**
1. Aucun combo ne dépasse 12 coups.
2. Aucun combo ne rapporte une barre de Boost : la jauge ne peut jamais payer le combo qui la remplit.
3. Toute série gardée finit.

**Preuve de (1)**, par des invariants du code :
- Chaque coup d'un combo augmente `comboCount` de 1. La victime est en hitstun ou en airHit (`continuing`). Une prise ne saisit ni un hitstun ni un airHit (`GRAB_IMMUNE_ACTIONS`), donc une prise ne prolonge jamais un combo.
- Au 12e coup, `applyHit` pose `FLAG_LIMIT`, 0 point et une levée d'au moins 3 px/tic. La victime est en airHit (ou KO).
- `isJuggled()` refuse tout coup sur un corps en airHit marqué `FLAG_LIMIT`, avant tout autre test, pour les frappes comme pour les projectiles (`findProjectileHit` passe par `canBeHit`, et les frappes de super aussi).
- On ne quitte l'airHit qu'en retombant : knockdown invulnérable, puis relevé, puis `actOnGround`, qui remet `comboCount` à 0 et efface les drapeaux. Un 13e coup est impossible. ∎

**Preuve de (2)** :
- Les gains d'un combo sont ≤ 864 (borne du §1.8.2, vérifiée au chargement).
- Un coup Boost ne rapporte rien à celui qui l'utilise, et chaque dépense coûte au moins 1000.
- Le DROP (+1000) démarre au plus une fois par combo, car le curseur est gelé pendant la montée et le DROP. ∎

**Preuve de (3)** :
- En garde, `comboCount` reste à 0, mais la règle de validation 8 garantit qu'un coup lancé du neutre après un normal gardé laisse un trou.
- Une série vraie n'est donc faite que d'annulations :
  - une phrase, où chaque normal sort une fois et les légers deux fois ;
  - au plus un spécial par phrase (paliers) ;
  - au plus un Rewind et une super par séquence (drapeaux) ;
  - chaque coup repousse.
- Chaque élément est borné, la série aussi. ∎

**Bornes plus fines** (pourquoi la limite sert peu) :
- En l'air : au plus 5 points posés, +2 par le Rebond ou la Vrille (une fois), +3 frappes de super à coût 0, soit au plus 10 coups en l'air.
- Au sol : liens limités par le recul et par la décroissance.

**Mesures** :
- **Recherche en faisceau** (largeur 300, profondeur 20). Commandes : L, ↓L, →L, ←L, H, →H, ↓H, ←H, S, →S, ↓S, B, →B, ↓B, ←B, DASH. Départs : L ; L, L, ←H ; ←H ; H en CONTRE ; →H en CONTRE ; ↓L. Pour les deux persos, au milieu et au coin, avec 0, 1000, 2000 ou 3000 de jauge, ou une jauge remplie avant chaque appui :

| | Nayo | Riff |
|---|---|---|
| Sans jauge | 11 coups au plus | 12 |
| 3 barres | 12 | 12 |
| Jauge remplie | 12 | 12 |
| Sans la limite | 12 | **13** |

  La limite coupe donc exactement le 13e coup de Riff.
- **Dégâts maximaux trouvés** : Nayo 313 sans jauge et 374 avec 3 barres (route E4) ; Riff 249 sans jauge et 351 avec 3 barres.
- **Fuzz** à graine (4 graines × 200 000 tics × touché ou garde × milieu ou coin, jauge remise à 3 barres à chaque tic) : 7 coups au plus, 61 tics de garde d'affilée au plus.

---

## 2. Nayo : la liste complète des coups

### 2.1 Son style

Nayo boxe au tempo, comme un DJ compte les temps.
- **Le beat** : un Direct, un deux (Cross).
- **Au 3e temps, la basse**, choisie à la direction : il continue au Crochet, tombe d'en haut (Marteau), fauche en bas (Balayage) ou fait décoller (Remontant chassé).
- En l'air, il **recommence la phrase** à coups de jab, puis **écrase** la cible au sol d'un Marteau qui la fait rebondir. Il finit au Pied fendu ou à l'Uppercut.
- Il **attend ta faute** : son Crochet en CONTRE te plie en deux.
- Avec la jauge, il **mixe** : il rembobine sa phrase (Rewind), passe un Remix platine ou lâche la Mégabasse.

Peu de coups, chacun lourd : 3 à 10 coups, 18 à 31 % sans jauge. On garde ses piliers : les lignes droites du boxeur, le Vinyle qui tient à distance, l'Uppercut invincible.

### 2.2 Table des coups

Colonnes :
- **S/A/R** : démarrage, actif, récupération (total).
- **Avantage** : à la première image active, en touche et en garde.
- **Coût jongle** : points dépensés sur un corps en l'air.
- **Gel** : hitstop.
- **Recul** : en px/tic.

| Entrée | Nom | Ce qu'on voit | S/A/R | Dégâts | Hitstun / blockstun (avantage) | Garde | Annulations et cordes (après contact) | Jongle | Art |
|---|---|---|---|---|---|---|---|---|---|
| L | **Direct** | Jab du bras avant, droit sur la ligne médiane | 4/3/7 (14) | 30 | 14/10 (+5 / +1) | mid ; boîte 10..40 / 46..58, gel 8, recul 2,5 | L neutre ou → : Cross ; ← + L : Double direct ; ↓ + L : Coup bas ; sinon normaux et spéciaux (`cancelInto` normal, special) ; DASH : Rewind | coût 1 | standLight (inchangée) |
| L, puis ← + L | **Double direct** *(nouveau)* | Le gant repart à mi-course et ressort, plus sec : le flicker | 3/2/7 (12) | 20 | 13/10 (+5 / +2) | mid ; 10..40 / 46..58, gel 7, recul 1,5 | L (neutre, →, ←) : Cross ; ↓L : Coup bas ; H (neutre, →) : Crochet ; ↓H : Balayage ; ←H : Remontant chassé ; spécial ; DASH : Rewind | 1 | clip de standLight, images 1 à 5, tics 3, [2], 2, 2, 3 |
| L, L | **Cross** | Le bras arrière, l'épaule tourne, petit pas de 10 px | 6/3/12 (21) | 40 | 18/12 (+4 / −2) | mid ; 10..46 / 46..60, gel 9, recul 1,5 | L (toute direction) : Mise au tapis ; H : Crochet ; → + H : Marteau ; ↓ + H : Balayage ; ← + H : Remontant chassé ; spécial ; DASH : Rewind | 1 | chainLight (inchangée) |
| L, L, L | **Mise au tapis** | Large crochet du bras avant, traînée cyan | 8/3/18 (29) | 50 | KD (3 ; 4) / 12 (KD +31 / −8) | mid ; gel **14** (c'était 11) | rien | fin de jongle | lightFinisher |
| → + L | **Jab chassé** | Pas glissé de 14 px et jab sec | 7/3/10 (20) | 35 | 15/11 (+3 / −1) | mid | L (neutre, →, ←) : Cross ; spécial ; DASH : Rewind | 1 | forwardLight |
| H | **Crochet** | Crochet du bras avant avec un pas ; en CONTRE, l'adversaire se plie sur place | 8/4/16 (28) | 80 | 20/14 (+1 / −5) ; **CONTRE ou PUNITION : 36 tics, recul 0,5, donc +17** | mid ; 10..52 / 44..62, gel 12, recul **3,5** (inchangé) | H (neutre, →) : Crochet au foie ; ↓H : Balayage ; ←H : Remontant chassé ; spécial ; DASH : Rewind | **coût 2** | standHeavy ; le pli rejoue hitMid tenu (stunTick) |
| H, H | **Crochet au foie** *(nouveau)* | Genoux pliés, l'épaule avant plonge, le poing s'enfonce sous les côtes ; croissant cyan bas | 8/3/17 (28) | 60 | 22/12 (+3 / −7) | mid ; **8..46 / 24..44 : touche aussi un accroupi** ; avance de 22 px de f3 à f7 ; f0–2 sur place (l'image 0 passe le poids sur le pied avant) ; gel 11, recul 2,5 | spécial ; DASH : Rewind (pas de normal : à +3, aucun lien ne boucle) | coût 2 | **nouvelle planche, 7 images** (§5) |
| L, L, → + H | **Marteau** *(nouveau)* | L'Overhand sans sa montée : le poing arrière déjà armé retombe sur le crâne ; sur un corps en l'air, il l'écrase au sol : poussière, « REBOND ! » | 14/3/15 (32) | 60 | 19/11 (+2 / −6) ; trou de 2 tics après une Cross gardée | **overhead** ; 12..40 / 36..72 ; avance de 16 px de f0 à f9 ; gel 12, recul 3 | spécial ; DASH : Rewind ; **Rebond** une fois par combo (+2 points, +4 de gel) | 1 | clip de forwardHeavy, images 2 à 8, tics 5, 5, 4, [3], 5, 5, 5 |
| → + H | **Overhand** | Sur la pointe des pieds, le bras arrière passe par-dessus la garde | 19/3/15 (37) | 70 | 18/13 (+1 / −4 ; CONTRE +5) | overhead | rien | 1 | forwardHeavy |
| ← + H | **Remontant** | Uppercut court, tête rentrée ; la cible décolle jusqu'à environ 60 px | 7/4/17 (28) | 65 | lance (vy **8**, vx 0,5) : **4 points**, **5 en CONTRE ou en PUNITION** / 14 (−6) | mid ; 4..30 / 58..104 (rate un accroupi) ; gel 11 | spécial seulement ; les suites en l'air sont des liens (11 tics) | 1 | backHeavy |
| L, L, ← + H ; H, ← + H ; L, ←L, ← + H | **Remontant chassé** *(nouveau)* | Un pas d'appel du pied avant, puis le Remontant | 7/4/17 (28) | 60 | lance (8 ; 0,5) : 4 points / 14 (−6) | mid ; 4..30 / 58..104 ; avance de 12 px de f0 à f6 | spécial seulement | 1 | **planche dérivée de backHeavy** (2 images neuves) |
| ↓ + L | **Coup bas** | Petit coup de tibia | 4/2/8 (14) | 25 | 12/8 (+3 / −1) | low | normaux (Coup bas une 2e fois, Direct, Jab chassé une fois…), spéciaux, DASH : Rewind | 1 | crouchLight |
| ↓ + H | **Balayage** | Balayage, main au sol | 9/3/20 (32) | 70 | KD trip (2 ; 3,5) / 14 (−8) | low | rien | fin de jongle | crouchHeavy |
| L en l'air | **Genou sauté** | Genou volant | 4/6/6 | 30 | 14/10 | overhead | rien | — | jumpLight |
| H en l'air | **Coup de pied sauté** | Coup de pied plongeant | 7/5/10 | 70 | 18/12 | overhead | rien | — | jumpHeavy |
| S, ou ↓↘→ + coup | **Vinyle** | Disque de lumière cyan lancé d'un scratch | 12/1/28 (41) | 60 | 18/14 (−14 au contact) | mid ; projectile 3,5 px/tic | rien ; +20 de jauge au départ (hors combo adverse) ; couche 5 : S pendant qu'il vole donne le Scratch | 1 | special |
| → + S | **Pied fendu** | Coup de pied volant, lignes de vitesse | 11/4/18 (33) | 75 | KD (3 ; 3,5) / 12 (−9) | mid ; gel **14** (c'était 11) | sur touché : super | fin de jongle | specialForward |
| ↓ + S, ou →↓↘ + coup | **Uppercut** | Il se ramasse et jaillit, colonne cyan | 3/8/28 (39) | 110 | KD (3 ; 3) / 12 (−23) | mid ; invincible f0–6 ; gel **16** (c'était 13) | sur touché : super | fin de jongle | specialAntiAir |
| BOOST, ou ↓↘→ + BOOST | **Vinyle platine** (Remix) | Le même lancer, disque blanc à double anneau, deux fois plus rapide | 12/1/28 | 80 | KD (2,5 ; 3) / 18 ; chip 12 | mid ; projectile 5 px/tic ; gel 10 | rien (c'est un projectile) | 1 | special ; fx platine |
| → + BOOST | **Pied fendu platine** (Remix) | Le même coup de pied, traînée blanche ; la cible s'envole très haut au lieu de tomber | 11/4/18 | 85 | lance (vy 8, vx 0) : **2 points** / 12 (−9) ; chip 12 | mid ; gel 14 | sur touché : super ; lien de 8 à 10 tics ensuite | 1 | specialForward ; fx platine |
| ↓ + BOOST, ou →↓↘ + BOOST | **Montée platine** (Remix) | L'Uppercut, colonne blanche plus haute | 3/8/28 | 130 | KD (3,5 ; 2) / 12 (−23) ; chip 19 | mid ; **invincible f0–10** ; gel 16 | sur touché : super | fin de jongle | specialAntiAir ; fx platine |
| DASH après le contact, 1 barre | **Rewind** | Il plonge tête basse ; un disque tourne à l'envers derrière lui ; flash de 6 tics, « REWIND ! », son rembobiné ; la cible touchée s'arrête net | 1/8/3 (12) ; 24 px | 0 | — ; avantage au §1.8.3 | — | dès f3 : normal, spécial, Remix, super ; **la phrase repart** ; une fois par séquence | — | clip de dashForward, images 0, 1, 2, 3, 5, tics 1, 3, 3, 3, 2 |
| ← + BOOST, 3 barres | **Mégabasse** (super) | Il presse son casque (le cue), le jeu gèle 20 tics, « MÉGABASSE ! » ; il se ramasse et frappe trois fois le sol du poing ; trois anneaux de haut-parleur roulent, du sol jusqu'au-dessus d'un saut : BOUM, BOUM, BOUUUM | 2/15/30 (47) après le flash | 80 + 80 + 140 | 22, 22, puis KD (6 ; 2) / 16 à chaque frappe (**−16** après la 3e) ; chip 12, 12, 21 | mid ; boîte 4..60 / 0..90 (les anneaux dessinés) ; **invincible f0–7** ; gels 10, 10, 22 ; frappes à f2, f8 et f14 | rien | coût 0 sur un corps déjà dans le combo | **planche dérivée, 10 images** (§5) |
| S pendant que le Vinyle vole | **Scratch** (couche 5) | La main ouverte vers le disque, puis ramenée d'un coup sec ; le Vinyle fait demi-tour en grattant (« wicka ») et tire vers Nayo ce qu'il touche | 4/1/14 (19) | 50 | lance vers Nayo (vy 5, vx 4) : 2 points / 14 ; chip 7 | mid, **gardé du côté de Nayo** (D8) ; disque à 4,5 px/tic | rien | 1 | clip de special, images 5, 4, 5, 6, 8, tics 2, 3, 3, 5, 6 |
| PRISE, tabassage, Renvoi, Projection d'épaule ; Pas chassé, Retrait | inchangés (§4, §3) | | | | | | Le DASH appuyé avant le contact, ou avec 0 barre, reste un dash | | |

### 2.3 Matrice « tous boutons, tous sens » *(générée par le prototype, `sim/matrix.ts`)*

Après un coup qui a touché ou a été gardé, jauge pleine, phrase neuve, voici ce que donne chaque bouton avec chaque direction (« · » : rien). DASH donne le Rewind (1 barre) après **tout normal** ; PRISE ne s'annule jamais.

| Coup qui a touché | L | → + L | ← + L | ↓ + L | H | → + H | ← + H | ↓ + H | S | → + S | ← + S | ↓ + S | BOOST | → + BOOST | ← + BOOST | ↓ + BOOST |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Direct | Cross | Cross | Double direct | Coup bas | Crochet | Overhand¹ | Remontant | Balayage | Vinyle | Pied fendu | Vinyle | Uppercut | Vinyle pl. | Pied fendu pl. | Mégabasse | Montée pl. |
| Double direct | Cross | Cross | Cross | Coup bas | Crochet | Crochet | Rem. chassé | Balayage | Vinyle | Pied fendu | Vinyle | Uppercut | Vinyle pl. | Pied fendu pl. | Mégabasse | Montée pl. |
| Cross | Mise au tapis | Mise au tapis | Mise au tapis | Mise au tapis | Crochet | **Marteau** | **Rem. chassé** | Balayage | Vinyle | Pied fendu | Vinyle | Uppercut | Vinyle pl. | Pied fendu pl. | Mégabasse | Montée pl. |
| Jab chassé | Cross | Cross | Cross | · | · | · | · | · | Vinyle | Pied fendu | Vinyle | Uppercut | Vinyle pl. | Pied fendu pl. | Mégabasse | Montée pl. |
| Coup bas | Direct | Jab chassé | Direct | Coup bas² | Crochet | Overhand¹ | Remontant | Balayage | Vinyle | Pied fendu | Vinyle | Uppercut | Vinyle pl. | Pied fendu pl. | Mégabasse | Montée pl. |
| Crochet | · | · | · | · | **Crochet au foie** | **Crochet au foie** | **Rem. chassé** | Balayage | Vinyle | Pied fendu | Vinyle | Uppercut | Vinyle pl. | Pied fendu pl. | Mégabasse | Montée pl. |
| Crochet au foie, Marteau, Remontant, Remontant chassé | · | · | · | · | · | · | · | · | Vinyle | Pied fendu | Vinyle | Uppercut | Vinyle pl. | Pied fendu pl. | Mégabasse | Montée pl. |
| Pied fendu, Uppercut, Pied fendu pl., Montée pl. (s'ils ont **touché**) | · | · | · | · | · | · | · | · | · | · | · | · | · | · | Mégabasse | · |
| Mise au tapis, Balayage, Overhand, Vinyle, Vinyle pl., Mégabasse, Scratch | rien | | | | | | | | | | | | | | | |

¹ Pas un combo (19 tics de démarrage) : un piège, un coup d'en haut tardif.
² Une 2e fois seulement (la phrase).

### 2.4 Données exactes des coups nouveaux ou changés (`data/fighters/nayo.ts`)

Elles reprennent le prototype, sans ses réglages lus dans l'environnement.

```ts
standLight: { …inchangé, cancelInto: LIGHT_CANCELS, branches: [
  { button: 'light', dirs: ['neutral', 'forward'], move: 'chainLight' },
  { button: 'light', dirs: ['back'], move: 'jabRepeat' },
  { button: 'light', dirs: ['down'], move: 'crouchLight' } ] },
jabRepeat: strike({ name: 'Double direct', frames: [3, 2, 7], damage: 20, stun: [13, 10], hitstop: 7,
  pushbackPx: 1.5, guard: 'mid', hitbox: box(10, 46, 30, 12), cancelInto: HEAVY_CANCELS, branches: [
  { button: 'light', dirs: ['neutral', 'forward', 'back'], move: 'chainLight' },
  { button: 'light', dirs: ['down'], move: 'crouchLight' },
  { button: 'heavy', dirs: ['neutral', 'forward'], move: 'standHeavy' },
  { button: 'heavy', dirs: ['down'], move: 'crouchHeavy' },
  { button: 'heavy', dirs: ['back'], move: 'chainLaunch' } ] }),
chainLight: { …inchangé, branches: [
  { button: 'light', move: 'lightFinisher' },
  { button: 'heavy', dirs: ['neutral'], move: 'standHeavy' },
  { button: 'heavy', dirs: ['forward'], move: 'chainHigh' },
  { button: 'heavy', dirs: ['down'], move: 'crouchHeavy' },
  { button: 'heavy', dirs: ['back'], move: 'chainLaunch' } ] },
lightFinisher: { …, hitstop: 14 },
forwardLight: { …, cancelInto: HEAVY_CANCELS,
  branches: [{ button: 'light', dirs: ['neutral', 'forward', 'back'], move: 'chainLight' }] },
chainHigh: strike({ name: 'Marteau', frames: [14, 3, 15], damage: 60, stun: [19, 11], hitstop: 12,
  pushbackPx: 3, guard: 'overhead', hitbox: box(12, 36, 28, 36),
  motion: advance(32, { from: 0, to: 10, distancePx: 16 }), cancelInto: HEAVY_CANCELS, extender: 'rebond' }),
backHeavy: { …, knockdown: kd(8, 0.5, { juggle: 4 }), counter: { knockdown: kd(8, 0.5, { juggle: 5 }) },
  cancelInto: HEAVY_CANCELS },
chainLaunch: strike({ name: 'Remontant chassé', frames: [7, 4, 17], damage: 60, stun: [0, 14], hitstop: 11,
  pushbackPx: 3, guard: 'mid', hitbox: box(4, 58, 26, 46), motion: advance(28, { from: 0, to: 7, distancePx: 12 }),
  knockdown: kd(8, 0.5, { juggle: 4 }), cancelInto: HEAVY_CANCELS }),
standHeavy: { …, juggleCost: 2, counter: { hitstun: 16, pushback: px(0.5) }, branches: [
  { button: 'heavy', dirs: ['neutral', 'forward'], move: 'chainHeavy' },
  { button: 'heavy', dirs: ['down'], move: 'crouchHeavy' },
  { button: 'heavy', dirs: ['back'], move: 'chainLaunch' } ] },
chainHeavy: strike({ name: 'Crochet au foie', frames: [8, 3, 17], damage: 60, stun: [22, 12], hitstop: 11,
  pushbackPx: 2.5, guard: 'mid', hitbox: box(8, 24, 38, 20),
  motion: advance(28, { from: 3, to: 8, distancePx: 22 }), cancelInto: HEAVY_CANCELS, juggleCost: 2 }),
crouchLight: { …, crouching: true }, crouchHeavy: { …, crouching: true },
specialForward: { …, hitstop: 14 }, specialAntiAir: { …, hitstop: 16 },
specialBoost: remix(VINYLE, { name: 'Vinyle platine', damage: 80, hitstun: 0, blockstun: 18, hitstop: 10,
  projectile: { speed: px(5), spawnX: px(24), hitbox: box(-10, 32, 20, 20) }, knockdown: kd(2.5, 3) }),
specialForwardBoost: remix(PIED_FENDU, { name: 'Pied fendu platine', damage: 85, knockdown: kd(8, 0, { juggle: 2 }) }),
specialAntiAirBoost: remix(UPPERCUT, { name: 'Montée platine', damage: 130, invincible: { from: 0, to: 11 },
  knockdown: kd(3.5, 2) }),
super: superMove(strike({ name: 'Mégabasse', kind: 'special', frames: [2, 15, 30], damage: 80, stun: [22, 16],
  hitstop: 10, pushbackPx: 1, guard: 'mid', hitbox: box(4, 0, 56, 90), invincible: { from: 0, to: 8 } }),
  [ { frame: 8, damage: 80, stun: [22, 16], hitstop: 10, pushbackPx: 1 },
    { frame: 14, damage: 140, stun: [0, 16], hitstop: 22, pushbackPx: 3, knockdown: kd(6, 2) } ],
  { frame: 0, ticks: 20 }),                 // superMove : tier 3, juggleCost 0, boostCost 3000
boostCancel: boostStep({ name: 'Rewind', duration: 12, frames: 8, distancePx: 24, freeCancelFrom: 3,
  flash: { frame: 0, ticks: 6 } }),         // boostStep : movement, cancelInto [normal, special], boostCost 1000
signature: strike({ name: 'Scratch', kind: 'special', frames: [4, 1, 14], damage: 50, stun: [20, 14], hitstop: 9,
  pushbackPx: 3, guard: 'mid', projectile: { speed: px(4.5), spawnX: 0, hitbox: box(-10, 32, 20, 20) },
  recall: true, knockdown: kd(5, 4, { juggle: 2 }) }),     // couche 5
```

Les aides de `shared.ts` :
- `remix(plain, changes)` donne `{ ...plain, ...changes, tier: 2, boostCost: BOOST_BAR }` ;
- `boostStep(spec)` construit un movement à la courbe du dash ;
- `superMove(first, pulses, flash)` précalcule les frappes ; seule la dernière met au sol.

**Hurtbox.**
- Crochet au foie et Mégabasse : leurs `hurtboxes` se mesurent sur le dessin (`npm run measure-boxes`), car le corps descend. Crochet au foie, mesuré : haut 71 (f0–2), 66,5 (f3–5), 64 (f6–16), 73,5 (f17–22), arrière −27 à −31 (le pied arrière de la fente), avant celui de la garde ; `hurtboxes.test.ts` vérifie que le haut suit le dessin à 1,5 px.
- Le Remontant chassé garde celles du Remontant.

---

## 3. Nayo : la liste des combos et sa page d'aide

### 3.1 Combos *(tous mesurés sur Riff ; distance de départ entre parenthèses)*

« Tactile : oui » veut dire que **chaque** appui a une fenêtre d'au moins 8 tics : au moins 4 lectures à 30 images par seconde, car les appareils sont lus une fois par image, soit 2 tics par lecture à 30 i/s. Les liens de 6 tics ou moins sont marqués « non ». Les fenêtres données sont celles des liens ; une annulation offre 16 à 29 tics.

**Débutant** (que des annulations, sauf mention)

| # | Notation | Dégâts | Coups | Quand | Tactile |
|---|---|---|---|---|---|
| D1 | L, L, L | 30 + 36 + 40 = **106** (11,8 %) | 3, KD | Le premier mot, partout où le Direct touche (garanti debout et accroupi) | oui |
| D2 | L, L → →S | 30 + 36 + 60 = **126** (14,0 %) | 3, KD | La une-deux, puis le Pied fendu (40 px) | oui |
| D3 | →L, L, L | 35 + 36 + 40 = **111** (12,3 %) | 3, KD | Ouvrir de loin (60 px) | oui |
| D4 | L, ←L, ←L, ←L | 30 + 18 + 32 + 35 = **115** (12,8 %) | 4, KD | Dos tenu, en martelant L : le garde-fou finit au sol | oui |
| D5 | ↓L, ↓L, ↓H | 25 + 22 + 56 = **103** (11,4 %) | 3, KD | Contre un adversaire accroupi (34 px) | oui |
| D6 | ← + BOOST (Mégabasse seule, 3 barres) | 80 + 72 + 112 = **264** (29,3 %) | 3, KD | Reversal invincible f0–7, ou punition à 50 px ; −16 en garde | oui |

**Intermédiaire**

| # | Notation | Dégâts | Coups | Quand | Tactile |
|---|---|---|---|---|---|
| I1 | L, L, H → →S | 30 + 36 + 64 + 52 = **182** (20,2 %) | 4, KD | La une-deux qui finit au crochet (40 px) | oui |
| I2 | L, L, →H (Marteau) → →S | 30 + 36 + 48 + 52 = **166** (18,4 %) | 4, KD | Fin haute, contre une garde basse | oui |
| I3 | L, L, ↓H (Balayage) | 30 + 36 + 56 = **122** (13,6 %) | 3, KD | Fin basse, contre une garde haute : avec I2, un 50/50 sans manip | oui |
| I4 | H, H → →S | 80 + 54 + 60 = **194** (21,6 %) | 3, KD | Crochet, puis crochet au foie ; punition de 30 à 60 px | oui |
| I5 | ←H → ↓S | 65 + 99 = **164** (18,2 %) | 2, KD | Référence §7.8 : anti-air ou punition proche | oui |
| I6 | ←H ⇢ L, L, L | 65 + 27 + 32 + 35 = **159** (17,7 %) | 4, KD | Le premier jongle : attends, puis rejoue la phrase en l'air (lien de 11 tics) | oui |
| I7 | ↓L, ↓L, H → →S | 25 + 22 + 64 + 52 = **163** (18,1 %) | 4, KD | Référence §7.8, en partant bas (34 px) | oui |
| I8 | L, L, H, H → →S | 30 + 36 + 64 + 42 + 45 = **217** (24,1 %) | 5, KD | **Le combo de base sans jauge** (40 px) | oui |
| I9 | L, L, H, H → BOOST (1 barre) | 30 + 36 + 64 + 42 + 48 = **220** (24,4 %) | 5, KD | Le Vinyle platine finit plus loin et met au sol | oui |

**Avancé**

| # | Notation | Dégâts | Coups | Quand | Tactile |
|---|---|---|---|---|---|
| A1 | L, L, ←H (chassé) ⇢ L, L, L | 30 + 36 + 48 + 21 + 24 + 25 = **184** (20,4 %) | 6, KD | La une-deux qui fait décoller (lien de 11 tics) | oui |
| A2 | L, L, ←H ⇢ L, L, →H (Rebond) ⇢ L, L, L — **les Quatre temps** | 30 + 36 + 48 + 21 + 24 + 30 + 15 + 20 + 25 = **249** (27,7 %) | 9, KD | Le pain quotidien en jongle, de 30 à 46 px (liens de 9 et 10 tics) | oui |
| A3 | Quatre temps, fin ⇢ L, L → ↓S | … + 15 + 20 + 55 = **279** (31,0 %) | 9, KD | Fin à l'Uppercut, la plus forte sans jauge parmi les routes simples | oui |
| A4 | H, ←H ⇢ L, L, L | 80 + 54 + 24 + 28 + 30 = **216** (24,0 %) | 5, KD | Le crochet puis l'uppercut du boxeur, au contact (≤ 34 px) | oui |
| A5 | H **en CONTRE** (il se plie) ⇢ L, L, H, H → →S | 96 + 27 + 32 + 56 + 36 + 37 = **284** (31,6 %) | 6, KD | La lecture : le Crochet coupe une attaque (lien de 18 tics) | oui |
| A6 | ←H **en CONTRE** ⇢ L, L, →H ⇢ L, L, L | 78 + 27 + 32 + 42 + 18 + 20 + 25 = **242** (26,9 %) | 7, KD | Le Remontant prend un coup adverse et donne 5 points (liens de 10 et 11 tics) | oui |
| A7 | L, L, H → DASH (Rewind) → L, L, H, H → →S (1 barre) | 30 + 36 + 64 + 21 + 24 + 40 + 30 + 37 = **282** (31,3 %) | 8, KD | La phrase repart ; que des annulations (DASH : fenêtre de 22 tics) | oui |
| A8 | H, H → →BOOST ⇢ L → ↓S (1 barre) | 80 + 54 + 68 + 21 + 66 = **289** (32,1 %) | 5, KD | Le Pied fendu platine envoie très haut, l'Uppercut rattrape (lien de 10 tics) | oui |
| A9 | L, L, H, H → →BOOST ⇢ L → ↓S (1 barre) | 30 + 36 + 64 + 42 + 51 + 15 + 55 = **293** (32,6 %) | 7, KD | Le combo de base qui part en l'air (lien de 10 tics) | oui |
| A10 | Anti-air : ←H tardif ⇢ L, L → ↓S | 65 + 27 + 32 + 77 = **201** (22,3 %) | 4, KD | Riff saute de 100 px : le Remontant la prend bas | oui |
| A11 | Vinyle sauté ⇢ S (Scratch) ⇢ →L → ↓S (couche 5) | 50 + 31 + 88 = **169** (18,8 %) | 3, KD | Le zoning qui convertit : sauter le disque ne suffit plus | oui |

**Expert**

| # | Notation | Dégâts | Coups | Quand | Tactile |
|---|---|---|---|---|---|
| E1 | L, ←L, L, ←H ⇢ L, L, →H ⇢ L, L, L — **les Dix temps** | 30 + 18 + 32 + 42 + 18 + 20 + 30 + 15 + 20 + 25 = **250** (27,8 %) | 10, KD | La signature : dix appuis, deux liens larges (9 et 10 tics) | oui |
| E2 | ↓L, →L, L, ←H ⇢ →L, L, →H ⇢ L, ←H → ↓S | 25 + 31 + 32 + 42 + 21 + 20 + 30 + 15 + 32 + 55 = **303** (33,7 %) | 10, KD | Le maximum sans jauge : toute la phrase (liens de 6 et 7 tics) | **non** |
| E3 | L, L, H, H → ←BOOST (3 barres) | 30 + 36 + 64 + 42 + 48 + 40 + 70 = **330** (36,7 %) | 7, KD | La super en fin de combo de base | oui |
| E4 | Quatre temps … ⇢ L, L → ←BOOST (3 barres) | 30 + 36 + 48 + 21 + 24 + 30 + 15 + 20 + 40 + 40 + 70 = **374** (41,6 %) | 11 | Le gros final : la Mégabasse rattrape le corps en l'air | oui |
| E5 | ←H ⇢ L, L → ↓S → ←BOOST (3 barres) | 65 + 27 + 32 + 77 + 48 + 40 + 70 = **359** (39,9 %) | 7 | Jongle puis super, après un anti-air | oui |
| E6 | ↓S → ←BOOST (3 barres) | 110 + 72 + 64 + 98 = **344** (38,2 %) | 4, KD | Reversal au réveil ou anti-air, invincible des deux côtés | oui |
| E7 | L, L, H → DASH → L, L, ←H ⇢ L, L, →H ⇢ L, L, L (1 barre) | 30 + 36 + 64 + 21 + 24 + 30 + 15 + 20 + 30 + 15 + 20 + 25 = **330** (36,7 %) | **12** (la limite) | Le Rewind ouvre la jongle ; le 12e coup claque « MAX ! » | oui |
| E8 | L, L, H → DASH → L, L, H, H → →BOOST ⇢ L → ↓S (2 barres) | 30 + 36 + 64 + 21 + 24 + 40 + 30 + 42 + 15 + 55 = **357** (39,7 %) | 10, KD | Deux barres, en restant au sol puis en l'air | oui |
| E9 | →H (Overhand) **en CONTRE** ⇢ L, L, H, H → →S | 84 + 27 + 32 + 56 + 36 + 37 = **272** (30,2 %) | 6, KD | La lecture sur une garde basse qui attaque (lien de 6 tics) | **non** |

Chaque niveau garde au moins une route faite d'annulations seulement : D1, I8, A7 et E3.

### 3.2 Page d'aide de Nayo (`data/move-texts.ts`, en français)

Le titre change : « Nayo, le boxeur-DJ : il compte les temps, te fait décoller et lâche les basses ».

`MOVE_ORDER` (doit valoir `MOVE_IDS`, ce qui est testé) : special, specialForward, specialAntiAir, specialBoost, specialForwardBoost, specialAntiAirBoost, super, signature, standLight, jabRepeat, chainLight, lightFinisher, forwardLight, standHeavy, chainHeavy, chainHigh, forwardHeavy, backHeavy, chainLaunch, crouchLight, crouchHeavy, jumpLight, jumpHeavy, grab, pummel, throwForward, throwBack, dashForward, boostCancel, dashBack.

**Entrées des coups nouveaux ou changés** (`input` puis `text`)

- **Vinyle** : « S, ou ↓↘→ + un coup ». Le texte actuel, plus : « Pendant qu'il vole, appuie encore S : il revient (Scratch). »
- **Pied fendu** : « Avant + S » : « Un coup de pied volant qui avance d'un grand pas et met au sol : la fin de tes combos. S'il touche, ← + BOOST lance la Mégabasse. Paré, il se fait punir. »
- **Uppercut** : « Bas + S, ou →↓↘ + un coup » : « Il jaillit, poing vers le ciel. Invincible au départ : il bat les sauts et les attaques au réveil. Il finit aussi les jongles. Paré, il reste longtemps sans défense. »
- **Vinyle platine** : « BOOST (1 barre) » : « Le Remix du Vinyle : un disque blanc deux fois plus rapide, qui met au sol. Plus dur à sauter. »
- **Pied fendu platine** : « Avant + BOOST (1 barre) » : « Le Remix du Pied fendu : l'adversaire s'envole très haut au lieu de tomber. Laisse-le redescendre, puis L et bas + S. »
- **Montée platine** : « Bas + BOOST (1 barre) » : « Le Remix de l'Uppercut : plus fort, invincible plus longtemps. Le réveil qui ne pardonne pas, mais toujours puni s'il est paré. »
- **Mégabasse** : « Arrière + BOOST (3 barres) » : « La super. Tout se fige, puis Nayo frappe trois fois le sol : BOUM, BOUM, BOUUUM. Invincible au départ, elle touche du sol jusqu'au-dessus d'un saut et rattrape un adversaire en l'air dans un combo. »
- **Scratch** : « S pendant que le Vinyle vole » : « Le disque fait demi-tour et ramène vers toi celui qui l'a sauté. À parer en reculant face à Nayo, même s'il arrive dans le dos. »
- **Direct** : « L » : « Le jab, ton "un". S'il touche (ou s'il est paré) : L encore donne la Cross, arrière + L le Double direct, bas + L le Coup bas, H le Crochet, arrière + H le Remontant. »
- **Double direct** : « L, puis arrière + L » : « Le jab repart aussitôt du bout du bras. Il laisse l'avantage même paré. Puis L : la Cross. »
- **Cross** : « L, L » : « Ton "deux". Puis choisis la fin : L met au tapis, H continue au Crochet, avant + H tombe d'en haut (Marteau), bas + H fauche en bas (Balayage), arrière + H fait décoller (Remontant chassé). »
- **Mise au tapis** : « L, L, L » : « Le crochet large qui met au sol. Les trois L passent partout où le premier touche. »
- **Crochet** : « H » : « Le gros crochet. H encore : le Crochet au foie. S'il coupe une attaque (CONTRE), l'adversaire se plie en deux : tu as le temps de tout lui mettre. »
- **Crochet au foie** : « H, H » : « Genoux pliés, le poing sous les côtes : il touche aussi un adversaire accroupi. Finis avec S. »
- **Marteau** : « L, L, puis avant + H » : « Le poing déjà armé retombe sur la tête : à parer debout. Sur un adversaire en l'air, il l'écrase au sol et le fait rebondir, une fois par combo. »
- **Remontant** : « Arrière + H » : « L'uppercut court qui fait décoller haut. Enchaîne S tout de suite, ou laisse Nayo se remettre et recommence L, L en l'air. Il rate un adversaire accroupi. »
- **Remontant chassé** : « L, L, puis arrière + H (ou H, puis arrière + H) » : « Le Remontant avec un pas d'appel : il fait décoller même après une Cross qui a repoussé. »
- **Rewind** : « DASH pendant un coup qui touche ou qui est paré (1 barre) » : « Nayo rembobine : le coup se coupe en un plongeon, la cible s'arrête, et ta phrase repart du début (L, L, H…). Une fois par combo. »

**Lignes de « Les bases » à remplacer ou à ajouter**

- **Enchaîner** : « L, L, L. Puis L, L, H, H → S. Un coup qui touche (ou qui est paré) s'enchaîne : chaque coup une fois par enchaînement (les légers deux fois), puis un spécial, puis la super. »
- **Directions** : « Après un coup qui touche, la direction choisit la suite : avant pour le haut ou l'élan, bas pour le bas, arrière pour faire décoller. Haut ne choisit jamais rien. »
- **Jongler** : « Un adversaire envoyé en l'air prend encore quelques coups. Les points sous lui le disent (en entraînement). Le Marteau de Nayo et le Swipe de Riff le relancent une fois. Au 12e coup, "MAX !" : il tombe. »
- **BOOST** : « La jauge sous ta vie : 3 barres, remplies en frappant, en parant et en encaissant, gardées d'un round à l'autre. BOOST + direction donne le Remix de ton spécial (1 barre), arrière + BOOST ta super (3 barres). DASH pendant un coup qui touche : le Rewind (1 barre). Sans assez de barres, rien ne sort. »
- **Le Crossfader** (§17.3, à changer) : « … Curseur à fond : DROP sur le prochain temps fort. Tu frappes plus fort et la foule te donne une barre de Boost. »

**Bloc « Combos » de la page** (nouveau ; un tableau `COMBOS[fighter]` dans `move-texts.ts`, rendu par `controls-content.ts`) : D1, I1, I8, I6, A2 (« les Quatre temps ») et E3, chacun avec sa notation et sa phrase du §3.1.

---

## 4. Riff : les mêmes règles, un autre style (son art est pour une prochaine passe)

**Son style.** Riff rafale. Ses phrases sont plus longues : 5 à 12 coups vifs, pour 10 à 15 % de dégâts de moins par combo que Nayo. Ses gels restent courts (6 à 12 tics). Elle colle à sa cible, et sa Vrille la fait tournoyer en l'air pour qu'elle reprenne aussitôt. Sa jauge lui achète enfin un reversal au sol, au prix d'une barre (le Genou à fond) : sa faiblesse « pas de reversal gratuit » reste son identité.

**Cordes (données du prototype, à valider avec son art)**

| Coup | Suites |
|---|---|
| Jab | L (neutre, →, ←) : Revers ; le reste par `cancelInto` (Coup bas, Toprock une fois…) |
| Revers (L, L) | L (toute direction) : Swipe ; H : Coude ; → + H : **Hache** ; ↓ + H : Windmill ; ← + H : **Retourné sauté** |
| Coup de coude (H) | H (neutre, →) : **Coup de boule** ; ↓H : Windmill ; ←H : Retourné ; coût de jongle 2 |
| Toprock | L (neutre, →, ←) : Revers ; une fois par phrase, maintenant (la phrase remplace le §7.1) |

**Ses nouveaux coups**

| Coup | Données | Art |
|---|---|---|
| **Hache** (L, L, → + H) | 12/3/14 ; overhead ; 50 ; 17/11 (+1 / −5) ; avance de 12 px ; trou de 1 tic après un Revers gardé (démarrage moins blockstun du Revers : 12 − 11 ; à régler avec son art) | clip du Talon, à partir de la jambe levée |
| **Coup de boule** (H, H) | 6/2/14 ; 50 ; 18/12 (+3 / −3) ; boîte 8..34 / 50..66 ; avance de 12 px ; coût de jongle 1 ; la frange fouette en avant | nouvelle planche, 6 images |
| **Retourné sauté** (L, L, ← + H) | Retourné avec un saut d'appel de 14 px ; 50 ; lance à 8, 4 points | planche dérivée du Retourné, 2 images |
| **Retourné** (← + H) | lance à **8** (c'était 5), 4 points ; ne s'annule qu'en spécial | inchangé |
| **Swipe** sur un corps jonglé | **Vrille** : vy 5, vx 1, +2 points, une fois par combo | inchangé, tampon « VRILLE ! » |
| **Pogo** (son Rewind) | DASH après le contact ; un bond avant de 24 px en 10 tics ; annulable dès f3 ; 1 barre | clip de son jumpForward ou de son Footwork |
| **Glissade à fond** | Remix de la Glissade : 80 ; blockstun 20 (environ −3 au contact) | fx platine |
| **Saut de l'ange à fond** | Remix : 80 ; overhead qui met au sol (3 ; 3) | fx platine |
| **Genou à fond** | Remix : 115 ; **invincible à tout de f0 à f6** ; lance (5 ; 1 ; 2 points) | fx platine |
| **Slam** (sa super, ← + BOOST) | Elle bondit dans la foule et retombe rangers en avant. Overhead, sans invincibilité : une fin de combo, pas un reversal. 12/8/26 ; frappes de 120 puis 170 (KD 5 ; 2,5) ; flash au sommet de f10 (20 tics, puis 2 tics avant l'impact) ; −15 en garde | planche dérivée, 4 images neuves (envol de son jumpForward, plongée, impact, onde) |

**Routes mesurées** (sur Nayo, 1000 PV)
- **Sans jauge**
  - Références : L, L, L **88** ; ↓L, ↓L, H → S **143** ; ←H → ↓S **140** (inchangées).
  - L, L, H, H → S **185** ; L, L, H, H → ↓S **200**.
  - L, L, →H → S **141** ; L, L, ↓H **104**.
  - ←H ⇢ L, L, L **132** (lien de 13 tics).
  - **←H ⇢ L, L, L (Vrille) ⇢ L, L → ↓S = 209** (7 coups, liens de 11 et 10 tics).
  - **L, L, ←H ⇢ L, L, L (Vrille) ⇢ L, L → ↓S = 223** (9 coups).
  - Footwork annulé ~L → H, H → ↓S **194**.
  - ↓L, →L, L, ←H ⇢ H, H → ↓S **220** (7).
  - Maximum trouvé : 249 en 12 coups.
- **1 barre**
  - L, L, H → DASH (Pogo) → L, L, H, H → ↓S = **250** (8 coups).
  - L, L, H, H → ↓BOOST (Genou à fond) **212**.
- **3 barres**
  - L, L, H, H → ←BOOST (Slam) = **300**.
  - L, L, ←H ⇢ L, L, L (Vrille) ⇢ L, L → ←BOOST = **321** (10 coups).

**Le contraste avec Nayo se mesure**

| | Nayo | Riff |
|---|---|---|
| Sans jauge | 18 à 31 % | 9 à 22 % |
| Coups | 3 à 10 | 4 à 12 |
| Jauge par round | 1,29 barre | 1,22 barre |
| Reversal | gratuit (l'Uppercut) | payant (1 barre) |
| Super | reversal | finisseur |

---

## 5. Art : l'ordre de travail (Nayo)

Une planche coûte environ une heure-agent, relecture par un directeur d'animation comprise. L'historique montre qu'environ 1 planche sur 5 à 10 demande une seconde passe (fba0e35, a748a72). **Préalable bloquant** : les tests de portée doivent passer par coup, et non plus par planche (§6, couche 0), avant qu'une planche réutilisée reçoive une nouvelle boîte (Marteau, Double direct, Scratch).

**Règles d'animation pour les nouvelles planches** (Cartwright, Slynyrd, Sakurai, refs.md §3) :
- 1 à 2 tics d'anticipation ;
- une image active tenue (le gel la prolonge) ;
- un smear de 1 image dans la couleur d'énergie ;
- un rebond de 1 pixel en récupération ;
- départ et retour en garde, et ancrage aux pieds en (128, 248) ;
- des tics de clip dont la somme vaut S + A + R (validate.ts).

| Ordre | Planche | Type | Images | Tics du clip (actif entre crochets) | Poses clés | Effets | Coût |
|---|---|---|---|---|---|---|---|
| 1 | **Crochet au foie** (`chainHeavy`) | **neuve** | 7 | 3, 3, 2, [3], 6, 6, 5 = 28 | f0 : le poids passe sur le pied avant, le coude avant tombe à la hanche. f1 : pas glissé bas, genoux pliés, poing avant armé à la hanche, gant arrière au menton. f2 : l'épaule roule, le bras balaie bas à l'horizontale (smear cyan). **f3 : impact**, le poing sous les côtes (y 24..44), coude à 90°, hanches tournées, tête derrière l'épaule. f4 : follow-through, le poing recule de 1 à 2 px, l'épaule encore basse. f5 : les genoux se redressent, le bras revient. f6 : la garde, avec un rebond de 1 px. | croissant cyan bas à hauteur de ventre (f3–f4), étoile d'impact | 1 h + relecture |
| 2 | **Remontant chassé** (`chainLaunch`) | **dérivée de backHeavy** (fichier de poses qui importe ses POSES) | 7, dont **2 neuves** | 2, 3, 2, [4], 5, 6, 6 = 28 | f0 (neuve) : le pied avant s'avance (pas d'appel), le talon arrière se lève, le corps plonge. f1 (neuve) : le poids arrive sur le pied avant (12 px de f0 à f6), le poing arrière descend sous le menton. f2–f6 : images 2 à 6 de backHeavy (la montée, l'actif, l'arc montant). | celles de backHeavy | 0,5 h |
| 3 | **Mégabasse** (`super`) | **dérivée** : poses importées de intro, specialAntiAir et backHeavy | 10 images de planche, dont **4 poses neuves** ; le clip en rejoue 12 | s0 1, s1 1, s2 [3], s3 [3], s2 [3], s3 [3], s4 [3], s5 6, s6 7, s7 7, s8 5, s9 5 = 47 (actif de f2 à f16, frappes à f2, f8, f14) | s0 = intro f5, la main plaque le casque, le *cue* (tenue pendant le flash). s1 = Uppercut f0, ramassé, le poing levé haut. **s2 (neuve)** : le poing avant frappe le sol, genoux au fond, bras arrière en balancier. **s3 (neuve)** : le poing rebondit à hauteur du genou, bras plié. s4 = la pose de s2 avec un fx plus grand (la 3e frappe). **s5 (neuve)** : il se relève, les deux bras montent, poitrine ouverte. **s6 (neuve)** : le poing arrière vers le ciel, ancré en garde (à ne pas copier de `victory`, dessiné hors du cycle de garde). s7, s8 = backHeavy f5, f6 (retour). s9 = la garde. | **les anneaux de haut-parleur sont dessinés dans le fx de la planche** (pas procéduraux) : sur s2 et s3, un anneau qui couvre d'emblée x 4..60 / y 0..90 (la boîte) ; sur s4, l'anneau final, plus clair, avec une fissure au sol ; sur s5, il s'efface. Le test de portée de ce coup mesure le **fx** (`reachFrom: 'fx'`). | 1 à 1,5 h |
| 4 | Double direct | **clip** de standLight | images 1, 2, 3, 4, 5 | 3, [2], 2, 2, 3 = 12 | Le poing revient à mi-course (f1) et repart (f2) : honnête, c'est un jab de plus. | ceux du Direct | 10 min |
| 5 | Marteau | **clip** de forwardHeavy | images 2 à 8 | 5, 5, 4, [3], 5, 5, 5 = 32 | L'Overhand pris le poing déjà armé derrière l'oreille ; l'étoile du fx tombe sur f5, qui est l'image active. Le passage depuis la Cross (bras arrière tendu) est couvert par le smear de rendu (couche P), et une image de liaison est prévue en seconde passe. | ceux de l'Overhand | 10 min |
| 6 | Rewind | **clip** de dashForward | images 0, 1, 2, 3, 5 | 1, 3, 3, 3, 2 = 12 | C'est un Pas chassé coupé court : l'image dit vrai. | disque inversé et traînée platine au rendu, tirés d'un pool | 10 min |
| 7 | Scratch (couche 5) | **clip** de special | images 5, 4, 5, 6, 8 | 2, 3, 3, 5, 6 = 19 | Le bras tendu puis ramené. On évite f1–f3, qui montrent le disque en main ; il faut vérifier que les fx de f4 à f6 ne montrent pas de disque, sinon prévoir une image dérivée. | lignes de vitesse ; fx régénéré platine | 15 min |
| 8 | Vinyle, Pied fendu et Montée platine | **mêmes clips** que les spéciaux (D18) | — | identiques | — | **fx régénérés en palette platine**, pour 2 tenues (automatique, moins d'une demi-heure) | 0,5 h |
| 9 | Réactions | aucune | — | — | Le corps en jongle rejoue airHit, qui redémarre à chaque coup. Le Rebond rejoue knockdown f0–f1 (il s'écrase, puis rebondit), puis airHit. Le pli rejoue hitMid tenu, avec une oscillation au rendu. | poussière au Rebond (pool) | 0 |

**Total pour Nayo** : environ 3 à 3,5 heures-agent, relecture comprise. Il faut aussi 12 PNG (strip et fx, ×2 tenues, ×3 planches), 3 lignes RULES dans `nayo-v2-sprites.test.ts`, les entrées de `poses/index.ts`, `sheets.ts`, `clips.ts` et `cells.ts`, 6 tampons et les fx platine.

**Seconde passe, en option** (meilleure animation, aucun effet sur les règles), environ 4 heures-agent :
- une image de liaison Cross → Marteau ;
- une planche Rewind dédiée (le disque qui tourne sur l'avant-bras, 4 images) ;
- une réaction « plié » pour chaque perso (3 + 3 images) ;
- une pose de flash dédiée pour la Mégabasse.

**Refusé, parce que pas honnête** : `victory` ou `timeOver` en frappe ; les images de prise (mains sur un col).

**Riff, à la prochaine passe** :
- Coup de boule (neuve, 6 images) ;
- Retourné sauté (dérivée, 2 images) ;
- Slam (dérivée, 4 neuves, onde magenta au sol dessinée dans le fx) ;
- Hache et Pogo (clips) ;
- fx « à fond » régénérés.

Soit environ 3 heures-agent.

---

## 6. Tests, replays, IA, aide, entraînement, et découpage en PR

### 6.1 Découpage en PR (une couche par PR, replays réenregistrés exprès)

| Couche | Contenu | Spec mise à jour dans la même PR |
|---|---|---|
| **0. Préalables** | Tests de portée **par coup** : `sprites.test.ts` (STRIKES), `nayo-v2-sprites.test.ts` et `tools/sprites/clips.ts` (`strikeOf`) itèrent sur les coups, plus `reachFrom: 'fx'`. `NAYO_CLIPS` et `RIFF_CLIPS` passent en `FighterClips` (partiel sur les optionnels). `isCrouchingMove` devient le champ `crouching`. La table `OPTIONAL_KINDS`. | §9.5, §14.4 |
| **1. Cordes, phrase, paliers** | `branches` à la place de `chain`, la phrase, `tier` et `FLAG_MOVE_HIT`. Double direct et Marteau (clips), puis Crochet au foie (planche n° 1). Riff : Hache (clip) ; son Coup de boule attend son art. IA : les plans de cordes. | §2.8, §5.1, §7.1, §7.2, §10 |
| **2. Jongle** | Points de jongle, lanceurs à 8, levée qui baisse, transport. Rebond et Vrille. Remontant chassé (planche n° 2), Retourné sauté (boîte grise jusqu'à son art). CONTRE par coup. Décroissance et limite de 12. Gels des fins. IA : jongles. | D14, §7.6, §7.7 (décroissance, limite), §10 |
| **P. Présentation** (en parallèle, rendu seul, aucun replay) | Compteur de combo en versus (§7.9). Tampons « REBOND ! » et « MAX ! ». Secousse en trauma² (léger 0,15, lourd 0,3, fin 0,45, Rebond et super 0,6 ; secousse = trauma² × 6 px ; −1,5 par seconde ; divisée par deux en Flashs réduits). Techniques de gel de Sakurai : la victime tremble, horizontalement au sol et verticalement en l'air, l'attaquant à ×0,25. Zoom de 4 % sur le Rebond, le pli et la 3e frappe de la super. Smear de 2 images sur les annulations. Notes pentatoniques. | §7.9 |
| **3. Boost** | Jauge, gains, report, Remix ×3, Rewind, `boostDash`, bit BOOST, clavier, manette, 7e bouton et sa bague, HUD VU, fx platine, rémanences, tampons, sons. IA : plans avec dépense. Option d'entraînement. | §1.2, D17, §2.1–2.5, §5.6 (le Remix devient le Boost ; le Remix du DROP disparaît), §8.2–8.3 (+1 barre au DROP), §16, §18.2 |
| **4. Super** | Mégabasse (planche n° 3), flash, frappes ; Slam de Riff (boîte grise). | §5.4, §10, §11 |
| **5. Scratch** | `signature`, `recall`, `ProjectileState.returning`, `guardX`, `discOut`. | D8 (reformulé : « un coup de Nayo qui arrive dans le dos se pare face à Nayo »), §5.4 |
| **R. Riff** (passe art suivante) | Ses planches, ses données finales, ses plans d'IA. | §5.3, §10.2, §11.3 |

### 6.2 Tests à écrire (une phrase chacun)

**Cœur : entrées et commandes** (`commands.test.ts`, `moves.test.ts`)
- BOOST est prioritaire sur S, H et L, mais pas sur PRISE, sur un même tic.
- Le bit DASH pressé alors que le coup a déjà touché donne `boostDash` ; pressé pendant le démarrage, il donne `dash`, et le double-tap donne toujours `dash`.
- « →L, L, →H » avec un double-tap avant au milieu ne dépense jamais de barre.
- Un DASH appuyé avant le contact d'un Direct ne dépense rien.
- Avec 0 barre, un DASH appuyé dans les 6 derniers tics d'un Direct gardé sort en dash simple après le coup, sans rien dépenser.
- Pour chaque direction (neutre, →, ←, ↓, ↙, ↘, ↗) et chaque jauge (0, 999, 1000, 2999, 3000), BOOST donne exactement le coup de la table du §1.1, ou rien (ligne par cas).
- Une corde se lit relativement à `bufferedFacing`, aussi après un cross-up (une ligne par côté).
- La ligne 5 de la table §2.8 est réécrite : « L dans une annulation donne la corde de la direction tenue » (Direct : ↓L Coup bas, ←L Double direct ; Cross : L toute direction Mise au tapis).

**Phrase et paliers** (`combos.test.ts`, `cancels.test.ts`)
- ↓L, →L, ↓L, →L chez Riff sort les trois premiers et refuse le quatrième ; chez Nayo, le 3e est refusé.
- H, H, H refuse le troisième H ; ↓L, ↓L, ↓L refuse le troisième ; L, ←L, ←L, ←L finit en Mise au tapis.
- Un spécial gardé ne s'annule pas en super ; un spécial qui a touché, oui ; un Vinyle qui touche de loin, jamais.
- Après un Rewind, la phrase repart : L, L, H → DASH → L, L, H passe.
- Un Remix ne s'annule qu'en super ; la super ne s'annule en rien.

**Jongle** (`juggle.test.ts`, qui remplace le bloc « the juggle (§7.6) » de `counter.test.ts`)
- Le Remontant pose 4 points (5 en CONTRE) sur une cible au sol, et aucun sur une cible déjà en l'air.
- Un coup coûte ses points ; à 0 point, plus rien ne touche jusqu'au sol.
- La levée suit `min(3, 1,5 + 0,5 × points restants)`.
- Le Marteau sur un corps jonglé fait un Rebond une seule fois par combo (+2 points, +4 tics de gel) ; un second Marteau relève seulement ; le corps est intouchable pendant la chute.
- La Vrille de Riff fait de même ; Rebond et Vrille partagent le même drapeau.
- Une frappe de super touche un corps à 0 point déjà dans le combo, mais jamais un corps marqué `FLAG_LIMIT` ou `FLAG_BOUNCE`.

**Limite et preuve** (`infinite.test.ts`, test lent)
- Le 12e coup met au sol avec `FLAG_LIMIT` ; pour chaque coup des deux persos, `canBeHit` est faux sur ce corps.
- La recherche en faisceau (largeur 300) des deux persos, au milieu et au coin, avec 0, 1000, 3000 et une jauge remplie, donne au plus 12 coups et au plus 45 % de la vie adverse.
- Le fuzz à graine (4 graines × 200 000 tics, jauge remplie à chaque tic, en touche et en garde, au milieu et au coin) garde `comboCount ≤ 12` à chaque tic et une garde d'affilée ≤ 120 tics.
- Les gains d'un combo sont < 1000 dans toute la recherche, en plus de la borne vérifiée au chargement.

**Jauge** (`boost.test.ts`)
- Gains : 3/2 des dégâts scalés sur les 6 premiers coups, 1/2 pour le défenseur, +20 et +10 en garde, +20 par spécial simple démarré hors combo, 0 pour un coup Boost.
- Plafond de 3000 ; report d'un round à l'autre ; 0 au début du match.
- Le Rewind et la super se dépensent une fois par séquence ; une seconde super dans la même séquence ne sort pas.
- Rewind + super dans un combo, sans DROP, est impossible.
- `mix-balance` (phase 5) et un nouveau test d'équilibre (200 matchs CPU difficile contre CPU difficile) : 1,2 à 3 barres construites par round, et une part de 40 à 60 % pour chaque perso.

**Flash et super**
- Pendant le flash de 20 tics, le chronomètre du round ne bouge pas.
- Un saut, un backdash ou un reversal appuyés pendant le flash n'échappent pas à la Mégabasse.
- La Mégabasse gardée laisse −16.

**Valeurs et symétrie**
- Les 13 combos de la table §7.8 gardent leurs dégâts exacts (critère §16-7, inchangé).
- L, L, L passe à toute distance où le premier L touche (4 paires × debout ou accroupi).
- Chaque route du §3.1 passe avec ses dégâts exacts (`nayo-combos.test.ts`, une ligne par route, depuis la même distance).
- Le Marteau après une Cross gardée bat un Jab martelé, mais perd contre l'Uppercut et la Montée platine.
- `expectMirrored` pour la corde, la phrase, le lanceur et sa jongle, le Rebond, la Vrille, le Rewind, chaque Remix, la super et le Scratch.

**Validation** (`fighters.test.ts`)
- Un cas invalide par règle du §1.12 : cycle de branches, branche en double, profondeur 6, Remix retimé, coût de 500, juggleCost 0 hors super, points à 6, prolongateur sur un spécial, normal à +3 en garde, super qui frappe 3 tics après son flash, borne de jauge dépassée.
- On met à jour les cas « jab annulé en prise », « dash annulé en dash » et « jab annulé sans contact » (toujours invalides) et la nouvelle règle des movements.

**Scratch** (couche 5)
- S pendant que le Vinyle vole donne le Scratch : le disque revient, tire vers Nayo, se pare face à Nayo et disparaît en le rejoignant.
- `perf.test` garde au plus 2 projectiles et 2 contacts.
- Les fx de special f4 à f6 ne montrent pas de disque.

**Art** (`tests/art`, `tests/tools`)
- `validateArt` exige un clip par coup défini, dont la somme des tics vaut S + A + R ; les portées se testent par coup (Marteau, Double direct et Scratch compris), et la Mégabasse par son fx.
- Le Crochet au foie et la Mégabasse restent dans leurs hurtbox, et le Crochet au foie touche visiblement un accroupi.
- Les fx platine se distinguent des 4 tenues (écart de teinte et de saturation au-dessus d'un seuil) et passent en « Flashs réduits ».

**Rendu, entrées, aide**
- `touch.test.ts` : 7 boutons ; écarts de 6 à 16 px ; aucun chevauchement en 667×375 et en 844×390 ; le bord le plus loin toujours à 265 ; le libellé BOOST tient.
- La bague n'écrit dans le DOM que quand le nombre de barres change.
- `hud.test.ts` : le VU ne repeint que quand `floor(boost / 50)` change ; il clignote à 2 Hz au plus.
- `glyphs.test.ts` : « BOOST » et les noms neufs (Double direct, Crochet au foie, Marteau, Remontant chassé, Vinyle platine, Pied fendu platine, Montée platine, Mégabasse, Rewind, Scratch ; Hache, Coup de boule, Retourné sauté, Pogo, Glissade à fond, Saut de l'ange à fond, Genou à fond, Slam) n'ont pas de capitale accentuée.
- `controls-content.test.ts` : `MOVE_ORDER` vaut `MOVE_IDS`, et chaque texte fait plus de 20 caractères.
- `fight-events.test.ts` : événements `boost`, `rewind`, `super`, `rebond` et `limit`.

**IA** (`cpu.test.ts`)
- Les tests de déterminisme à graine, de vivacité (jamais immobile 180 tics en neutre) et d'ordre des niveaux (difficile bat facile au moins 4 fois sur 6) passent toujours.
- **Usage** : en 40 matchs difficiles, chaque dépense (3 Remix, Rewind, super) et chaque corde sort au moins une fois.
- Le CPU ne presse jamais BOOST sans pouvoir payer.

### 6.3 Replays dorés (26)

Chaque couche ajoute des champs d'état hachés : `phrase`, `phraseTwice` et `flags` en 1 ; `juggle` devient un nombre en 2 ; `boost` en 3 ; `returning` en 5. Les **26** replays sont donc rehachés à chaque couche ; c'est voulu. Chaque commit liste ceux dont le **comportement** change, et pourquoi.

| Couche | Comportement changé (à revoir image par image) | Hachage seul |
|---|---|---|
| 1 | chain (directions sur L), combo, directions, normals, footwork (Toprock une fois), training ; ko et timeout (le CPU) | les autres |
| 2 | juggle, counter (pli du Crochet, 5 points), specials et chain (gels des fins), combo, training, ko, timeout | les autres |
| 3 | dash et footwork, si un DASH après contact tombe avec ≥ 1 barre ; ko et timeout (le CPU dépense) | les autres |
| 4 | ko et timeout | les autres |
| 5 | vinyle et specials (S pendant le vol donne le Scratch), ko, timeout | les autres |

**Replays neufs** : `strings.json` (cordes et phrase), `juggle-v3.json` (Quatre temps, Rebond, limite), `boost.json` (Remix, Rewind, super, refus faute de jauge), `scratch.json`.

### 6.4 IA (`src/ai/plans.ts`, nouveau)

- **Format, en données.** `Plan = { after: MoveId; when: { hit: boolean; minBoost?: number; maxDistancePx?: number; counter?: boolean; crouching?: boolean }; steps: readonly InputBits[]; weight: Record<Level, number> }`.
  - Les étapes sont des appuis joués au premier tic où elles peuvent sortir, avec le délai de réaction du profil.
  - Pour un lien, l'étape attend que le perso soit libre.
- **Décision.** `Decider.decide()` choisit un plan parmi ceux dont le `after` vient de connecter, au tirage à graine (mulberry32), au lieu de `[Special, 0]`.
- **Plans de Nayo** :
  - après le Direct : la Cross, puis H, H → →S, ou la fin haute ou basse (mélange 50/50 en garde) ;
  - après le Crochet : H → →S, et le pli en CONTRE ;
  - après le Remontant et l'anti-air : le lien L, L, L, ou les Quatre temps (difficile seulement) ;
  - avec 1 barre : le Rewind (difficile) ou le Pied fendu platine ;
  - avec 3 barres : finir à ←BOOST si la vie adverse ≤ les dégâts de la route, et la Montée platine au réveil (difficile, 1 fois sur 4).
- **Plans de Riff** : symétriques, avec ses cordes, le Pogo et le Slam.
- **Niveaux.**
  - Facile : D1 et D2 seulement, aucune dépense.
  - Normal : cordes et Remix.
  - Difficile : jongles, Rewind, super.
- La pureté, la graine et la lecture seule des entrées brutes sont tenues : l'IA ne lit jamais les entrées de l'adversaire.

### 6.5 Entraînement et aide

- **Entraînement.**
  - Une option « Jauge : normale / pleine / infinie ».
  - Les points de jongle en pastilles au-dessus du mannequin.
  - La phrase en cours en petits noms sous le texte de combo (rendu seul).
  - « MAX ! » à la limite.
  - Le nom du coup, comme aujourd'hui.
- **Aide.**
  - Les textes du §3.2 et la page de Riff ; les lignes « Les bases » ; le bloc « Combos ».
  - Le §17 de la spec, réécrit avec ces textes.
  - La description de sélection de Nayo devient « Boxeur-DJ posé · portée · Vinyle · Uppercut invincible · Mégabasse ».

---

## 7. Reporté, et pourquoi

| Élément | Pourquoi pas maintenant |
|---|---|
| Collage au mur, rupture du mur | §18.2 le garde pour un futur perso ; le Rebond et la Vrille suffisent au second souffle ; cela coûterait `wall.ts` contre une caméra mobile. |
| Mix final de Tekken (4 temps automatiques) | Il glissait de 8 à 10 px par temps sur des planches ancrées au sol : la pire réponse à « la meilleure animation ». La Mégabasse a sa planche. |
| Esquive en planche neuve (Relance de Tekken) | Le Rewind en clip de dashForward fait le même travail à coût nul ; une planche dédiée est en seconde passe. |
| Coup chargé en tenant le bouton (Psycho Knuckle d'Ed) | Il faudrait lire le maintien dans le cœur, plus une planche. Pas demandé, et le pilier 4 s'en accommode mal. |
| Rafale « Platine » S, S, S en rekka | 2 à 3 planches ; S n'a jamais de corde dans cette version, ce qui garde S lisible. |
| Coups retardables, combos à pause | Le buffer de 6 tics se confond avec la pause sur téléphone. |
| Combo Breaker, Burst, Roman Cancel à 3 boutons, parade à fenêtre courte, QCB, bonus de manip | Mauvais au tactile, ou interdits par D5 et D6. |
| Scaling selon le démarreur, plancher à 30 ou 40 % | Les combos gardent 18 à 42 % de la vie avec la formule inchangée ; changer la formule casserait §7.8 sans besoin. |
| Réaction « plié » dessinée, image de liaison Cross → Marteau, planche Rewind dédiée | Seconde passe d'art, sans effet sur les règles. |
| Vrille de Riff, Coup de boule, Retourné sauté, Slam dessinés | Passe d'art de Riff ; les données sont mesurées ici, elles seront réglées avec son art. |
| Cadrage vertical de la caméra pendant une jongle (sommet vers 60 px, 64 px après un Pied fendu platine) | À juger sur téléphone pendant la couche 2 ; c'est du rendu seul. |
| Défis de combos en entraînement (liste à cocher) | Le bloc « Combos » de l'aide suffit pour commencer. |

---

## Annexe A : le prototype et ses mesures

- **Dossier** : `/tmp/claude-0/-home-user/52a00850-d99a-5791-bce9-b2e169dbe15f/scratchpad/combos-v3/final/`.
  - `src/` : le cœur et les données avec ces règles. Les réglages lus dans `process.env` n'existent qu'ici ; le vrai code les pose en constantes de `rules.ts` (pureté, ESLint, `purity.test`).
  - `proto.diff` : la différence avec le dépôt (2051 lignes).
  - `sim/` : les mesures.
  - `build/*.txt` : les sorties.
- **Lancer une mesure** : `./run.sh <nom> [args]`. C'est le rolldown du dépôt, et rien n'est écrit dans le dépôt.

| Mesure | Commande |
|---|---|
| Routes de Nayo avec leurs fenêtres | `./run.sh nayo-final` |
| Routes de Riff | `./run.sh riff-final` |
| L, L, L à toute distance, table §7.8, miroir | `./run.sh guarantee` |
| Recherche en faisceau | `./run.sh search nayo real mid 300 3000` |
| Recherche, jauge infinie, au coin | `./run.sh search riff infinite corner 300` |
| Recherche sans la limite | `COMBO_LIMIT=99 ./run.sh search riff infinite mid 300` |
| Fuzz | `./run.sh fuzz nayo 1 block 200000 corner` |
| Jauge par round | `./run.sh economy hard 40` |
| Matrice du §2.3 | `./run.sh matrix` |
| Trou du Marteau, reversals | `./run.sh gap` |
| Rewind, flash, anti-air | `./run.sh checks` |
| Avantage en garde | `./run.sh blockadv` |
| Règles d'entrée | `./run.sh inputs` |
| Phrase | `./run.sh loop2` |
| Miroir des routes | `./run.sh mirror2` |
| Scratch | `./run.sh scratch` |
| Banc de vitesse | `./run.sh perf` |

- **Ce que le prototype ne couvre pas** : le HUD, la bague tactile et les vraies entrées ; la planche de la Mégabasse (la boîte suit les anneaux à dessiner) ; le DROP (le Crossfader n'existe pas encore) ; l'IA qui dépense (les CPU ne pressent jamais BOOST, la jauge mesurée est celle qu'ils construisent). Ces chiffres seront confirmés dans le dépôt, couche par couche, par les tests du §6.2.

## Annexe B : la couche 3 (le Boost) dans le dépôt

**Confirmé à l'identique** par les tests du dépôt (§6.2) :
- les routes D6, I9, A7, A8, A9 et E3 à E8 de Nayo, et les quatre routes de Riff avec jauge, au point de dégâts près (`nayo-combos.test.ts`, `riff-combos.test.ts`) ;
- −16 pour la Mégabasse gardée, −15 pour le Slam ; le flash gèle le chronomètre ; un saut, un backdash ou le Genou à fond appuyés pendant le flash prennent la Mégabasse (`boost.test.ts`) ;
- les gains, le plafond, le report entre rounds, le Rewind et la super une fois par séquence, Rewind + super hors de portée (2127 de jauge avant le ← + BOOST final : il ne sort pas) ;
- les 28 replays d'avant gardent leur comportement tic par tic : seul leur hachage change, avec le champ `boost`. `boost.json` est neuf.
- Jauge du CPU qui dépense (difficile contre difficile, 319 rounds en alternant les côtés) : Nayo 1,49 barre construite par round, Riff 1,26, soit 54 % et 46 % ; chaque Remix, le Rewind, le Pogo et les deux supers sortent, et le CPU ne presse jamais BOOST sans pouvoir payer (`plans.test.ts`).

**Écarts, choisis dans le dépôt** :
1. Le Pogo a le même flash que le Rewind, `{ frame: 0, ticks: 6 }` (le §1.9 ne nommait que le Rewind) : les deux Boost cancels se voient de la même façon.
2. En entraînement, la jauge est « pleine » par défaut ; l'option tourne entre pleine, infinie et normale (menu du mannequin).
3. Le jeu n'a pas encore d'option « Flashs réduits » : le clignotement de la jauge pleine (2 Hz, sous la limite de D21) et les rémanences n'ont donc pas de variante réduite. Elle viendra avec l'option.
4. Les tampons sont lettrés dans la police BD, comme « CONTRE ! » et « PUNITION ! », au lieu d'images générées : « REMIX ! », et le nom du coup pour le Rewind, le Pogo et les supers.
5. Le disque inversé du Rewind n'est pas dessiné : ses rémanences blanches et son flash le marquent.
6. **Recherche en faisceau.** Celle du prototype jetait toute branche qui ne gagnait pas de coup, donc toutes celles du Rewind : ses maxima avec jauge ne le comptaient jamais. Celle du dépôt joue le Rewind (il s'annule aussitôt par la commande suivante). Elle trouve, sur Riff (900 PV) :
   - sans jauge : 369 au plus (41,0 %), depuis le Crochet en CONTRE ;
   - avec 1 barre : **437 (48,6 %)**, H en CONTRE, L, L, H, H, DASH (Rewind), L, L, ←H, H, ←H, ↓S, 11 coups ;
   - avec 3 barres : 409 (45,4 %), H en CONTRE, L, ←L, L, ←H, →L, L, →H, ↓L, ←H, ↓S, ←BOOST, 12 coups (la limite coupe les frappes de la super) ;
   - jauge remplie à chaque tic : 426 (47,3 %) ;
   - Riff, sur Nayo : 405 au plus (40,5 %).
   Le test garde donc 45 % sans jauge et la moitié de la vie avec (49 % au plus). Aucun infini : 12 coups au plus partout, aucun gain de combo ne paie une barre.

