# Qualité adaptative : le plan sourcé

> **Décisions du propriétaire, le 1er novembre 2026**
> - L'ordre : A, puis B, puis C.
> - Pas de baisse automatique de la qualité pour l'instant. D ne se fait que si la HD rame sur son PC (question 1, §6).
> - Les bords sans MSAA sont acceptés si la capture A/B ne se voit pas, à ×1 comme à ×2 (question 2, §6).
> - Les vérifications se font sur iPhone, iPad, Android et PC/Mac (question 5, §6).
>
> Les questions 3 et 4 (§6) ne sont pas encore tranchées.
>
> **Les preuves sont hors du dépôt.** Les bancs, mesures et rapports que cite ce plan (§8, et les chemins `confrontation/`, `final/`, `couts/`, `appareils/`, `recherche/`, `PLAN.md`) sont restés dans le dossier de travail du 1er novembre, `/tmp/claude-0/-home-user/52a00850-d99a-5791-bce9-b2e169dbe15f/scratchpad/adaptive/`. Leurs chemins sont gardés tels quels ; ils ne désignent aucun fichier du dépôt. Les numéros de ligne (`fight-scene.ts:439`...) sont ceux de main à `ea2e2fb`.
>
> Le plan ci-dessous est recopié tel quel. Ce qui a changé en le réalisant est écrit à la fin, dans « État ».

NayosBeat, 1er novembre 2026. Casquette : tech lead, puis production. Statut : plan. Aucune ligne du jeu n'est écrite ; le dépôt a été lu à `ea2e2fb` (main), sans rien y modifier.

Ce document fusionne trois sources : le plan de conception (`PLAN.md`), l'état de l'art (`recherche/ETAT-DE-L-ART.md`, recommandations R1 à R18) et trois rapports de confrontation (`confrontation/`). Les chemins sont relatifs à `/tmp/claude-0/-home-user/52a00850-d99a-5791-bce9-b2e169dbe15f/scratchpad/adaptive/`. Les noms entre crochets ([cadence-main], [W7]...) renvoient au §8. Relu en adversaire le 1er novembre (citations, chiffres, niveaux de preuve, charte) ; la version d'avant est `confrontation/PLAN-SOURCE.avant-relecture.md`.

---

## 0. En une page

**Ce que tu as demandé**
1. Un jeu jouable sur un maximum d'appareils : iPhone, iPad, Android, PC et Mac.
2. Qu'il s'adapte au matériel : processeur, carte graphique, vitesse.
3. Un « corrélateur delta ».
4. De l'algorithme procédural et génératif, sans explosion.
5. Du décor, et de vrais sons.
6. De vraies recherches, avec des preuves sérieuses.

**La réponse courte**

| Demande | Réponse | Preuve |
|---|---|---|
| Max d'appareils | Le jeu tourne déjà partout (WebGL, et Canvas en repli). Ce qui reste utile : plus aucune saccade (A), plus de flash blanc ni de combat à l'aveugle (B), environ 16 Mo rendus aux téléphones (C) | §2.2 à §2.4 |
| S'adapter au matériel | Détecter ne donne presque rien : sur iPhone, tout est masqué. On s'adapte donc en mesurant en jeu. Aujourd'hui, il n'y a presque rien à baisser ; le régulateur arrivera avec le premier levier (décor dessiné, HD sur PC) | R12, éprouvé (disponibilité des signaux) |
| Corrélateur delta | Oui, sous les deux formes qui ont tenu aux mesures. 1) Le delta de chaque image est recalé sur la cadence de l'écran (A, tout de suite). 2) Le coût de chaque élément se mesure hors ligne, sur des traces (plus tard). Pas d'apprentissage en direct | bancs sur le vrai code, éprouvé ; r² ≤ 0,29 sous SwiftShader, extrapolé |
| Procédural, génératif | Il est déjà là où il sert : une partie des sprites sort du code (`tools/sprites`), l'autre est dessinée dans Aseprite ; les sons sortent de la synthèse. Pour le décor, rien tant que l'art ne le demande | hypothèse : aucune source |
| Sans explosion | Des plafonds durs : réserves d'effets fixes et budget de flashs, déjà dans main et testés ; mémoire vérifiée au build avec F1 ; voix avec le lot 2 du polish (ni F1 ni le lot 2 ne sont encore dans main) | R15, éprouvé (documentation) |
| Décor | Celui de main (3 couches, environ 1,6 Mo) tient le budget. Son seul cran : masquer la couche du milieu | code de main |
| Vrais sons | Au premier fichier : le service worker d'abord, puis la musique en flux. Le son ne dépend jamais de la qualité | R17, lu |
| Recherches | 85 affirmations sourcées, dont 40 contre-vérifiées et 6 corrigées ; 7 bancs de confrontation. Limite : aucune source ne traite un jeu 2D dans un navigateur mobile, et nos millisecondes viennent d'un GPU simulé. D'où les vérifications sur tes appareils (§7) | EdA §0, §2.3, §2.4 |

**Maintenant : 3 PR, environ 2,5 jours**, contre 8 PR et 16 à 24 jours dans le plan. Ce sont A, B et C, plus la fusion de l'atlas F1 suivie d'un test d'1 à 2 h. **Plus tard : 6 PR, chacune avec un déclencheur écrit.** Aucune ne se fait « au cas où ».

**Le principe sacrifié.** La charte dit : « il baisse sa qualité visuelle plutôt que de ramer ». Ce plan ne le fait pas encore en automatique, parce qu'il n'y a presque rien à baisser : pas de décor dessiné, des effets dont le coût moyen mesuré est faible (un voile coûte pourtant une passe plein écran à l'image de rafale, §2.7), et la seule HD sur PC. Ce qui l'emporte : mesurer avant d'optimiser, YAGNI, finir plutôt qu'élargir. Si tu veux la clause tenue tout de suite, l'option D la tient en partie, en une demi-journée : sur PC seulement, et à la session suivante, pas en plein combat (question 1, §6).

---

## 1. Comment lire ce document

**Niveaux de preuve**, ceux de la recherche (mesure ou produit livré), étendus au code relu et aux bancs :
- **éprouvé** : produit livré, ou mesure publiée et contre-vérifiée ; ou fait vérifié dans le code (WebKit, Phaser 4.2.1, main) ; ou banc qui exécute le vrai code du dépôt.
- **extrapolé** : vrai ailleurs (3D, autre moteur, GPU simulé, modèle d'appareils), puis transposé à un vrai téléphone.
- **hypothèse** : une déduction sans mesure. Elle est marquée « hypothèse, à mesurer à l'étape 0 ». L'étape 0, ce sont les mesures sur tes appareils : la sonde (PR 0), puis les vérifications du §7, au fil des PR.

**Deux réserves valent partout.**
- Les mesures du plan ont été faites dans Chromium headless avec SwiftShader. Le classement des coûts y est reproductible ; les millisecondes, elles, ne valent pour aucun téléphone.
- Les sources audio et robustesse (R16, R17) ont été lues, mais pas contre-vérifiées : elles sont marquées « lu ».

**Homonymes.** Le plan parle d'une « suite R2 » et d'une « Règle R2 », qui n'ont rien à voir avec la R2 de la recherche. Ici, R2 désigne toujours la recherche.

**Les mots employés**
- **Tic** : un pas du cœur du jeu. Il y en a 60 par seconde, sur tout appareil. **Pas visuel** : un pas de l'horloge de l'affichage (animations, effets), 60 par seconde lui aussi.
- **rAF** (`requestAnimationFrame`) : l'appel que le navigateur fait à chaque image. Son horodatage est arrondi : 1 ms sur iPhone, 0,1 ms sur Chrome.
- **Cadence** : le nombre d'images par seconde que le navigateur donne vraiment (60, 30 en Économie d'énergie...). **Vsync** : un rafraîchissement de l'écran. Une image « en retard » en a manqué un.
- **Passe plein écran** : ombrer et mélanger une fois chaque pixel du canvas. C'est l'unité de coût GPU qui se transpose d'un appareil à l'autre.
- **GPU en tuiles** : le GPU des téléphones (Apple, Mali, Adreno), qui dessine l'écran par petits carrés.
- **MSAA** : le lissage des bords par multi-échantillonnage, cher en mémoire.
- **SwiftShader** : un GPU simulé par le processeur, celui de nos bancs.
- **Perte du contexte WebGL** : le navigateur retire au jeu son accès au GPU, par exemple au retour d'arrière-plan sur iOS. Les textures sont alors perdues.
- **Jetsam** : l'arrêt d'une app par iOS quand la mémoire manque.
- **Banc** : un programme jetable, hors du dépôt, qui mesure.

---

## 2. Les décisions et leurs preuves

### 2.1 Ce qui ne bouge jamais

| Décision | Preuve | Niveau |
|---|---|---|
| Le cœur (`src/core`, `src/ai`), les 60 tics/s, `MAX_TICKS` 5 et les replays dorés ne dépendent jamais de la qualité | R1 ; Unity Adaptive Physics allonge le pas fixe, et le billet avertit que tout système qui utilise ce pas est touché [E9, Unity, 2019-2022] | éprouvé |
| Rien n'est interpolé (D23) : le recalage ne fait que répartir le temps réel, et la somme des deltas reste exacte | [cadence-main] | éprouvé (banc, vrai code) |
| HUD, combattants, effets des coups : jamais dégradés | R7 ; Significance Manager [E7, Epic] ; Adaptive Performance « prioritizes reducing scalers with low visual impact first » [E9, Unity] | éprouvé pour le mécanisme ; l'ordre est notre choix |
| Budget de flashs ≤ 3/s, avec les mêmes réponses à tout réglage | charte, `docs/flashs.md` ; la recherche n'en parle pas | règle du projet |
| Résolution de l'art fixe ; `smoothPixelArt` en réglage global (la caméra zoome jusqu'à ×2 au Finisher) | R13 ; guide pixel art de Phaser 4 [E15b, Richards, 2026] ; Godot [E17] ; Unity [E18] | éprouvé |
| Une option « Qualité » pour figer le réglage, dès qu'un réglage existe | R18 ; Lineage W [M4, Android et NCSoft, 2024] | éprouvé |

### 2.2 Le delta recalé (1er étage du corrélateur delta)

| Décision | Preuve | Niveau |
|---|---|---|
| Le défaut : le delta brut de Phaser va aux horloges (`fight-scene.ts:439` et `:463` ; `smoothStep: false` dans `main.ts:87`). Une image reçoit alors 0 tic, la suivante 2 | code de main | éprouvé |
| Il se voit : sans interpolation, une image courte suivie d'une longue fait une saccade | [M8, Android Frame pacing, 2026, lu] | extrapolé |
| Son ampleur : de 4,5 à 12 % des images du vrai jeu (relevé de la critique ; de 0,8 à 17 % selon la définition d'une tranche stable) | PLAN §1 (traces en Chromium headless) | extrapolé ; sur téléphone : hypothèse, à mesurer à l'étape 0 (compteur d'A) |
| Une seule horloge recalée suffit : de 0 à 0,55 % d'images cassées, contre 1,2 à 29 % des tics pour main (et jusqu'à 49 % des pas visuels). C'est à peu près autant que la PR 1 du plan, avec ses deux horloges (0 à 0,55 % aussi ; à 90 Hz, 0,55 % des tics contre 0,43) | [cadence-main], vrais `FixedTimestep` et `TickPacer` | éprouvé pour le mécanisme ; entrées simulées |
| La cadence se mesure en combat : aucune API n'annonce un bridage | [W6] (EdA §2.1, correction 3 : le bridage se déduit, aucune API ne l'annonce) ; bug WebKit 215745 (2020) : le bridage est voulu | éprouvé |
| Au-dessus de 60 Hz, Safari donne N/k Hz, où k est N/60 arrondi à l'entier le plus proche, un demi arrondi vers le bas (165 Hz → 55, 144 → 72, 100 → 50, mais 90 → 90) ; à 60 Hz ou moins, N. On ajoute 55 Hz à la liste | `AnimationFrameRate.cpp:35-45` (`framesPerSecondNearestFullSpeed`, WebKit main) ; [safari-rates] à 165 Hz : de 1,3-2,5 % à 0 %, avec la tolérance de la ligne suivante (55 Hz seul : 0 et 1,6 %) | éprouvé (code), banc |
| L'horloge vaut 1 ms sur iPhone : la tolérance du recalage devient grain + 0,5 ms | R3 ; [W7, bug WebKit 228137, 2021] ; `Performance.cpp:73` (WebKit main) ; [safari-rates] | éprouvé (1 ms) ; tolérance : banc |
| Le grain se lit au démarrage : le plus petit écart non nul entre deux lectures de l'horloge | R3 | hypothèse, à mesurer à l'étape 0 |

### 2.3 Sûreté

| Décision | Preuve | Niveau |
|---|---|---|
| En rendu Canvas, les voiles teintés sortent blancs au KO. On les coupe, et on masque les objets éteints par le budget (`FX_DARK`, carte du Finisher comprise) | aucun code de teinte dans le rendu Canvas de Phaser (`renderer/canvas`) ; PLAN §1 ; `finisher-card.ts:147` et `:193` | éprouvé (code) |
| Sur une perte du contexte, le combat se met en pause, et c'est le joueur qui reprend | [perte-contexte] : 123 tics joués à l'aveugle en 2 s ; aucun écouteur dans `src/` ; R16 [W9, bug WebKit 261313, 2023, lu] | éprouvé (mesure) ; source lue |
| Un seul contexte audio : `noAudio` pour Phaser | `main.ts` ne passe pas `audio` ; `sfx.ts:205` ; [sans-webgl] : 2 contextes | éprouvé |
| Les textures peintes une seule fois survivent à la restauration du contexte tant qu'elles sont peintes dans un canvas : Phaser 4.2.1 recrée chaque texture depuis sa source (`WebGLRenderer.js:1048-1052`, `WebGLTextureWrapper.createResource`), et une `CanvasTexture` a son canvas pour source. Seule une texture peinte sur le GPU (`DynamicTexture`, aucune dans `src/`) serait à repeindre. R16 demande de tout regénérer : pour un canvas, le code de Phaser 4.2.1 le fait déjà | R16 [W9][E15a, Phaser 4.2.1, lu] ; code de Phaser 4.2.1 ; [perte-contexte] : 242 envois de textures après la restauration | éprouvé (code) ; l'essai de B le vérifie, et la regénération de R16 n'est ajoutée que s'il montre un trou |

### 2.4 Le contexte maigre

| Décision | Preuve | Niveau |
|---|---|---|
| Contexte WebGL sans MSAA, ni profondeur, ni stencil, passé par `config.context`, avec repli | `smoothPixelArt` force le MSAA (`Config.js:411-415`, Phaser 4.2.1) ; aucun masque ni filtre dans `src/` | éprouvé (code) |
| `smoothPixelArt` lisse dans le shader, sans MSAA : l'image ne change presque pas (0,15 % de pixels) | le guide de Phaser [E15b] et `Config.js:407` décrivent le lissage du shader, mais ni l'un ni l'autre ne dit que le MSAA est inutile : cela vient de l'A/B du plan (PLAN §6, dossier `gpu/`, sous SwiftShader) | éprouvé (banc), mais avant le Finisher : à refaire sur ses triangles |
| Gain mémoire : environ 16 Mo (15,8) par combat sur téléphone. Le tampon de dessin passe de 19,8 à 4,0 Mo en comptant deux tampons de couleur, comme le PLAN §5 ; de 17,8 à 2,0 Mo en n'en comptant qu'un, comme [memoire] | [memoire] ; PLAN §5 | éprouvé (calcul) |
| Gain GPU : le MSAA pèse de 41 à 51 % du GPU, la profondeur et le stencil 9 % (14 % en médiane) | [classement], sous SwiftShader | extrapolé ; sur un GPU en tuiles, le gain est surtout de la mémoire : hypothèse, à mesurer à l'étape 0 |

### 2.5 La mémoire : rien n'explose

| Décision | Preuve | Niveau |
|---|---|---|
| L'atlas F1 recadre les planches : un match passe de 66,5 à 38,5 Mo. Son test au build bloque au-delà de 90 Mo et des pages de 2 048 px | branche `feat/anim-atlas` (`8f9e351`, rebasée sur `ea2e2fb` ; `d4ae4e0` en est la sauvegarde), `tests/build/vram-budget.test.ts` ; R15 [W12, MDN, 2026] | éprouvé (code) |
| Une session avec les 4 tenues fait environ 86 Mo avec C et 102 sans : 77,0 Mo de planches, environ 5 Mo de canvas, et 4,0 ou 19,8 Mo de tampon (compté comme au PLAN §5). Avant F1, les textures seules en faisaient déjà 138,8 | [perimetre-data] (calcul sur les PNG) ; [session-miroirs] (mesure sous Chromium, textures seules) | éprouvé (calcul) ; 138,8 : mesuré |
| Le plafond de 90 Mo par match reste provisoire | charte ; environ 200 Mo de mémoire de canvas observés par des utilisateurs sur un iPhone SE [W8, PQINA, 2022, lu] ; la limite d'iOS n'est documentée nulle part | hypothèse, à mesurer à l'étape 0 |
| Les réserves d'effets sont fixes : sang 24 et 12, poussière 12, mots 6, tampons 4, dissolution 4. C'est déjà le cas dans le jeu | code de main ; R14 ; [E21, Nystrom, lu] | éprouvé |
| Pas de mipmaps : c'est déjà le cas, puisque Phaser 4.2.1 n'en crée que si `mipmapFilter` est posé (`Config.js:367`), et main ne le pose pas. Reste à l'écrire dans le contrat d'atlas (`docs/art/atlas.md` de F1 n'en parle pas) : la caméra ne fait que rapprocher | R15 [W12] : 30 % de mémoire en plus, inutiles sans dézoom ; code de Phaser 4.2.1 | éprouvé |
| Textures de 4 096 px au plus, pages de 2 048 | R15 [W12] ; la valeur réelle de `MAX_TEXTURE_SIZE` dans Safari iOS n'est pas documentée | éprouvé ; valeur iOS : hypothèse, à mesurer à l'étape 0 |

### 2.6 Le coût de chaque élément, hors ligne (2e étage du corrélateur)

| Décision | Preuve | Niveau |
|---|---|---|
| Pas d'apprentissage du coût en direct | [correlation] : ce qui est actif n'explique au plus que 29 % des variations du travail JS d'une image (r² ≤ 0,29 image par image ; de 0,17 à 0,49 sur des fenêtres de 10 à 60 images) ; aucune validation publiée (EdA §0, point 2 ; §2.3) | extrapolé (mesure sous SwiftShader) ; l'absence de validation publiée : éprouvée |
| Le coût se lit hors ligne, sur des traces de vrais appareils, par A/B à réglage forcé | Funkhouser [A1, 1993], Gobbetti [A2, 1999], Wimmer [A3, 2003] : coefficients calibrés hors ligne par régression | éprouvé (3D), extrapolé à la 2D |
| Le coût d'un évènement est la moyenne de tous les Δ de la trace, pas la médiane des 31 derniers | [grain-delta] : à 1 ms de grain, la médiane lit 0,05 ms pour un vrai coût de 0,25 ; la moyenne lit 0,249 | éprouvé (banc) |
| Unité de coût GPU : la passe plein écran, calculée sur la géométrie. Son prix se mesure une fois par appareil | [pixel-passes] ; le coût suit les pixels remplis (EdA §0, point 9, d'après [A14, Cantlay, NVIDIA, 2007] : « overdraw can be almost unbounded ») ; R4 (extrapolé) | calcul exact ; prix : hypothèse, à mesurer à l'étape 0 |
| Le grain et `crossOriginIsolated` vont dans l'en-tête de chaque trace | R3 [W7] | éprouvé (valeurs) |

### 2.7 Le décor, quand il sera dessiné

| Décision | Preuve | Niveau |
|---|---|---|
| Le décor est celui de main : `far` 600×270 (opaque), `mid` 720×270 (facultative), `floor` 960×40, à la résolution du monde. Il pèse environ 1,6 Mo | `src/art/stage-layers.ts` (PR #59) | éprouvé (code) |
| Son seul cran : masquer `mid`, soit une passe plein écran d'écart | [pixel-passes] : 1,15 passe contre 2,15 ; ordre de coupe R7, [E9] | calcul ; gain en ms : hypothèse, à mesurer à l'étape 0 |
| Une couche opaque n'est pas gratuite sur un GPU de téléphone : Phaser mélange tous ses quads, et le contexte n'a plus de profondeur. Rien n'élimine donc les pixels cachés | `WebGLBlendParametersFactory.js` (Phaser 4.2.1 : mélange actif par défaut) ; [E20, lu] : la transparence crée du surdessin | éprouvé pour Phaser (code) ; l'effet sur un GPU en tuiles : extrapolé, à mesurer à l'étape 0 |
| À l'image de rafale, le voile du super ou la vignette du KO coûte une passe, autant qu'une couche | [pixel-passes] ; [classement] : leurs « 0,57 ms » sont une moyenne de match, avec ±7 ms de bruit | calcul |
| Chaque réglage est dimensionné sur son image de rafale, plus une passe de marge | R9 (marge de 10 à 15 % du budget ; la traduire en une passe est notre choix) ; Wimmer [A3] mesure 1,5 ms de bruit | extrapolé |
| Les couleurs de toutes les couches règlent déjà les voiles et les mesures de flash | `stage-view.ts:12` (`FIGHT_STAGE_COLORS`) | éprouvé (code) |

### 2.8 La qualité automatique, quand il y aura un levier

| Décision | Preuve | Niveau |
|---|---|---|
| Il baisse vite en combat, ne monte qu'entre deux matchs, et une baisse fixe le plafond de la session | R9 ; Unreal « baisse vite, remonte doucement » [E3, Epic, 2026] ; l'oscillation de la rétroaction est mesurée [A1] et vue chez Kakao [M5, 2023] ; [governor-bench] : 1 à 1,2 changement par 10 min | éprouvé (produits) pour « baisser vite, remonter lentement » ; le plafond de session est notre choix ; chiffres : modèle |
| Le retard se juge sur l'intervalle entre images : c'est le seul signal d'un GPU saturé sur mobile | aucun temps GPU sur Android ni sur iOS (0,43 et 0,46 % des rapports) [W5, Web3D Survey] ; [governor-cases] S2 | éprouvé pour l'absence de temps GPU ; extrapolé pour la lecture de l'intervalle (R2 ; EdA §3.2 : « notre déduction, aucune source ne la décrit ») |
| Mais T suit tout de suite une cadence plus rapide. Une baisse sous une cadence plus lente est à l'essai : elle est annulée si elle n'a rien changé | [governor-cases] S1, S1b ; EdA §3.2 (« si l'intervalle se resserre... ») | banc (modèle) ; l'idée : hypothèse de la recherche |
| Un réglage qui échoue deux sessions de suite devient le plafond appris | [governor-cases] S3, S5 ; disjoncteur de R9 ; drei [E13] | banc (modèle) |
| Plancher : la demi-cadence, soit 30 images/s régulières à 2 tics chacune, sans patcher Phaser. Son coût de jeu : les entrées ne sont lues qu'une fois par image affichée (`fight-scene.ts:448-451`), donc tous les 2 tics. `combos-v3.md` (l. 702) compte déjà avec ce cas pour le tactile, mais les liens de 6 tics ou moins y deviennent plus durs : la charte veut le même gameplay partout, c'est donc à peser en F (question 3) | R11 ; Game Mode d'Android [M7] ; Apple [M11, lu] ; [demi-cadence] dans le vrai Phaser 4.2.1 ; [governor-cases] S4 | éprouvé sur Android et chez Apple, extrapolé au navigateur (R11) ; mécanisme : banc dans le vrai Phaser ; régularité sur appareil : hypothèse, à mesurer à l'étape 0 |
| Au démarrage, seulement des plafonds : Canvas, rendu logiciel, `MAX_TEXTURE_SIZE` < 4 096, `deviceMemory` ≤ 2. Sur iPhone, cela se réduit à « tactile → moyenne » | R12 ; [W2][W3][W4] (MDN, WebKit, Mozilla) | éprouvé (disponibilité des signaux) |
| Pas de mini-test au démarrage : le 1er match en tient lieu | PLAN §4.4 (de 190 à 665 ms, bruité d'un facteur 3, sous SwiftShader) | extrapolé ; on le rouvre au-delà de 1 % de retard sur les 30 premières secondes |
| Sur PC Chrome, Compute Pressure interdit la montée en état « serious » ou « critical » | R12 [W1, W3C, 2026] | éprouvé (disponibilité) |
| Les images du Finisher comptent : c'est un pic | choix (correspondances, P31) | hypothèse, à mesurer à l'étape 0 |

### 2.9 Les sons

| Décision | Preuve | Niveau |
|---|---|---|
| Le son ne dépend jamais de la qualité. Le polish propose l'inverse (`AUDIT-ET-PLAN.md`, § « Qualité adaptative » : 12 voix en haut de gamme, 6 en bas, et les réserves de `hit-fx` réduites de moitié) : ce plan ne le reprend pas, faute de coût mesuré | 0,33 ms, hors du fil d'image [classement] ; aucune donnée publiée sur le coût d'une voix Web Audio sur mobile (EdA §2.3) | hypothèse, à mesurer à l'étape 0 |
| Bus, 12 voix, priorités, écrêteur doux : c'est le lot 2 du polish qui les tient, pas ce chantier. Le lot 2 n'est pas encore dans main | `docs/polish/AUDIT-ET-PLAN.md`, P13 ; R17 [E21, lu] | écrêteur : mesuré sous Chromium (P13) ; 12 voix et priorités : « mes dérivations », dit le polish, sans source ni mesure |
| Bruitages en AudioBuffer partagés. Musique en flux, par un seul élément audio et une seule `MediaElementSource`. Ambiances de 12 s au plus, décodées | R17 ; [W13, W3C Web Audio 1.1, 2026, lu] : l'AudioBuffer pour les sons de moins d'une minute | extrapolé (lu) |
| Le service worker est prêt avant le 1er fichier publié : cache hors version, réponse 206 aux requêtes Range | `build/sw-template.js` l. 28 et 40-46 : aujourd'hui, le cache est vidé à chaque push | éprouvé (code) ; Safari : hypothèse, à mesurer à l'étape 0 |
| iOS : `audioSession = 'ambient'`, pour respecter l'interrupteur silencieux | PLAN §7.2 ; aucune source dans la recherche | hypothèse, à mesurer à l'étape 0 |
| Format : AAC (.m4a), seul. C'est un écart à R17, qui veut Opus en principal et AAC en socle (EdA §3.5) : un seul fichier par son, à confirmer par `canPlayType` sur tes appareils | [W14, MDN, lu] : AAC en MP4 lu par tous les grands navigateurs, selon MDN | extrapolé (lu) |

---

## 3. Les contradictions résolues

**Ce sur quoi tout le monde est d'accord.** Les deux documents s'accordent sur tout ce que des produits livrés prouvent : baisser vite et remonter lentement, couper d'abord ce qui se voit le moins, des plafonds durs, l'art à résolution fixe, une option pour le joueur, la simulation jamais touchée. Sur 69 clauses de la recherche, 30 sont reprises, 16 en partie, et 9 sont contredites par le plan (le cœur de R2, R4, R5 et R6). Dans l'autre sens, une seule décision du plan sur 100 est contredite de front, et 11 en partie (correspondances, §3).

| Sujet | Qui avait raison | Pourquoi | Ce qui change |
|---|---|---|---|
| Prédire le coût ou réagir (R4 à R6, R8) | Le plan, pour l'instant | Les mesures de la recherche portent sur des scènes 3D de 1993 à 2003, à centaines d'objets [A1][A2][A3]. Ici : une poignée de postes, un r² ≤ 0,29, et l'apprentissage en ligne n'a aucune validation publiée | On réagit. Chaque réglage est dimensionné sur sa rafale : c'est la plus petite prédiction possible. R8 est reportée, avec un déclencheur chiffré (§4) |
| Juger sur l'intervalle ou sur le travail (R2) | Partagé | Sur mobile, seul l'intervalle voit un GPU saturé : R2 prise à la lettre reste à 30 i/s (S2). Mais le plan perd 2 réglages en 5 s quand l'Économie d'énergie s'active (S1), et ne voit plus rien quand elle se coupe (S1b : 27,8 % de retard) | Une règle asymétrique et une baisse à l'essai, environ 15 lignes pures, dans F |
| Lire un coût par la médiane de 31 Δ | La recherche (R3) | À 1 ms de grain, la médiane colle à la grille : 0,05 ms lu pour 0,25 [grain-delta] | Moyenne de tous les Δ de la trace |
| L'Économie d'énergie est-elle une surcharge ? | La recherche | Le plan se contredit : « pas une surcharge », puis il trouve « voulu » que le réglage baisse. WebKit bride exprès [W6] | Couvert par la 2e ligne |
| Bridage à 30 i/s de Safari en surchauffe | Le plan, sous réserve | Ce bridage dépend d'un réglage interne de WebKit, faux par défaut (`RespondToThermalPressureAggressively`, `Page.cpp:570-572`, `UnifiedWebPreferences.yaml:5325-5331`). Mais ce défaut peut être changé par le navigateur (`defaultsOverridable: true`) : sa valeur dans Safari iOS n'est pas vérifiée, et Apple écrivait en 2020 qu'un appareil « warm » bride aussi [W6] | La chaleur est traitée comme une vraie baisse de capacité ; l'Économie d'énergie activée en plein combat, sur iPhone, le vérifie (§7) |
| « Safari vise environ 60 Hz » | Ni l'un ni l'autre | Au-dessus de 60 Hz, WebKit donne N/k, avec k = N/60 arrondi, un demi vers le bas : 165 Hz → 55, 144 → 72, 90 → 90 (`AnimationFrameRate.cpp:35-45`) | 55 Hz ajouté ; les cas Safari Mac entrent dans les tests d'A |
| Chauffe : converger d'une session à l'autre (R9, R10) | La recherche | Sans mémoire de l'échec, la HD est retentée puis retirée 5 sessions sur 5 (S3) | Plafond appris après 2 échecs |
| Plancher quand plus rien ne tient (R11) | La recherche | Sans plancher : 11,6 % d'images irrégulières ; avec la demi-cadence : 1,0 % (S4) | Plancher en demi-cadence, dans F |
| « Limiter la cadence demande de patcher Phaser » (plan) | Ni l'un ni l'autre : c'est faux | Envelopper `game.loop.callback` suffit : 148 rAF pour 74 mises à jour, 0 ms perdue, dans le vrai Phaser 4.2.1 [demi-cadence] | Pas de patch |
| Les effets ne coûtent « rien en GPU », et une couche opaque « coûte peu » sur téléphone (plan) | La recherche [A14][E20, lu] | Ce « rien » est une moyenne de match. Phaser mélange tout et, sans profondeur, rien n'est éliminé | On compte en passes plein écran ; les voiles entrent dans les rafales |
| Mini-test au démarrage (R5) | Le plan (KISS) | Il est bruité d'un facteur 3 ; le réglage appris donne 0,2 % de retard sur les 30 premières secondes de la 2e session (modèle ; 0,36 à 0,40 % sur toute la session) | On le rouvre au-delà de 1 % de retard sur les 30 premières secondes de la 1re session |
| Cœurs et nom du GPU (R12) | Partagé | Repérer un rendu logiciel n'est pas classer un GPU, et Firefox garde « llvmpipe » (`SanitizeRenderer.cpp`). La règle des 4 cœurs, elle, n'est étayée par rien | Le rendu logiciel reste un plafond ; la règle des 4 cœurs est retirée ; la ligne Firefox du plan est corrigée |
| Réglages changés d'un bloc (M3, M4) | Dissous par main | Un cran = une couche (`mid`) : un seul levier à la fois | — |
| Ambiances en flux (R17) | Le plan | La source même de la recherche [W13, lu] décrit l'AudioBuffer comme un son « usually somewhat less than a minute », et ne demande le flux que « for longer sounds, such as music soundtracks » | Boucles de 12 s décodées |
| Compresseur sur le bus maître (plan §7.2) | Le polish, par une mesure | Sous Chromium, il remonte un coup léger de 3,4 dB et laisse passer la finale à +0,5 dBFS | L'écrêteur doux du lot 2 |
| Décor de 4 couches fines, 9,3 Mo (plan) | Main (PR #59) | 3 couches à la résolution du monde, environ 1,6 Mo ; deux fois moins fines que les combattants, c'est le choix de la PR #59 (`docs/art/aseprite.md`) | Le plan est recalé sur main |
| « Générer les couches statiques une seule fois (au chargement) dans des textures » (recherche §3.4, déduction) | Personne : pas de désaccord | C'est déjà le cas : les couches de main sont des PNG chargés une fois. Le §3.4 ne demande pas de les aplatir en une seule (la lecture « aplatie » vient de correspondances, P9) ; aplatir serait de toute façon impossible, puisqu'elles défilent à 0,25, 0,5 et 1 | Rien |
| Deux horloges et un rephasage à chaque round (PR 1 du plan) | Le banc sur main | Une seule horloge recalée fait aussi bien [cadence-main] | A est plus petite |

Deux corrections au plan lui-même [cadence-main], [dbg-ralenti] :
- son modèle « aujourd'hui » était optimiste : 13 % d'images cassées à 60 Hz, contre 29 % quand on compte le ralenti comme main ;
- son seuil de test de 0,25 % ne tient pas à 90 Hz quand la 1re image est longue (0,43 à 0,55 %).

---

## 4. Ce qui est coupé ou reporté

La charte dit « couper plutôt qu'étirer ». Ce qui est coupé ne revient que sur une preuve nouvelle ; ce qui est reporté revient sur un déclencheur écrit.

**Coupé**

| Quoi | Pourquoi |
|---|---|
| Apprendre le coût en direct (R5, mise à jour en ligne) | r² ≤ 0,29, de 42 à 170 changements par minute (PLAN §4.2) ; aucune validation publiée (EdA §2.3) |
| Modèle prédictif et allocateur glouton à chaque image (R4, R6) | Une poignée de postes, pas des dizaines. Ce serait le moteur maison que la charte range parmi les pièges. Remplacé par des passes calculées et un prix mesuré |
| Mini-test au démarrage (R5) | Bruité d'un facteur 3, de 190 à 665 ms ; le 1er match en tient lieu. Seuil de réouverture au §3 |
| Règle « 4 cœurs ou moins → moyenne » | Rien ne l'étaye ; le régulateur fait ce travail |
| Servir le jeu en COOP et COEP (R3) | GitHub Pages ne pose pas d'en-têtes ; la moyenne des Δ suffit à 1 ms |
| Compresseur sur le bus maître | Mesuré par le polish : il remonte un coup léger de 3,4 dB |
| 2e horloge, rephasage à chaque round et à la fin du ralenti | La variante à une horloge fait aussi bien |
| Minuterie de 1,5 s après la restauration du contexte | Le joueur reprend depuis la pause |
| `setDepth` conditionnel (PR 2 du plan) | Son gain n'a jamais été mesuré, et la ligne a bougé |
| Fond procédural en shader | Une passe plein écran de plus à chaque image ; le décor est dessiné à la main |
| Tampon d'effets à demi-résolution (R14) | En basse résolution, ses bords scintillent, ce qui est contraire au pixel art ; la version mixte qui les corrige ajoute un filtre de Sobel et une passe ; et le gain s'annule quand l'effet couvre peu d'écran, ce qui est notre cas hors des voiles [A14]. R14 le donne elle-même pour une hypothèse |
| Monte-Carlo et smoke Playwright en CI | Le premier teste un modèle, pas le jeu ; le second serait un outillage nouveau. Ils restent des essais jetables, hors du dépôt |

**Reporté**

| Quoi | Le déclencheur qui le rouvre |
|---|---|
| Traces et coût par élément (PR 5 du plan) → I | L'Entrepôt dessiné, ou un appareil qui rame |
| Cran du décor et option « Qualité » (PR 6) → E | I montre que `mid` coûte sur un vrai téléphone |
| Pièces de décor emboîtées (suite à faible discrépance), animation du décor, 4e couche | La direction artistique les dessine |
| Qualité automatique (PR 7) → F | Un vrai appareil qui rame encore après A, B et C, et un levier à baisser |
| Grand livre, classes 90/70, déchargement, marque anti-jetsam (PR 3) → G | Le cas « session » passe au rouge (F2 à F4), ou un plantage d'iPhone est rapporté |
| Moins de travail par image (PR 4), avec le test de perte du contexte (R16) ; une regénération seulement pour une texture peinte sur le GPU (§2.3) → H | Un profil sur un vrai téléphone qui montre un à-coup |
| Vrais sons (PR 8) → J | Le 1er fichier audio ; le service worker passe avant sa publication |
| Anticiper les pics (R8) : masquer le décor sous l'aplat du Finisher quand il est opaque, ou pendant le gel d'un super | Plus de 5 % d'images en retard sur les images de rafale, dans les traces |
| Compute Pressure (R12) | Avec F |
| Temps GPU par `EXT_disjoint_timer_query`, sur PC (R12) | Avec I, dans les traces seulement |
| Rendu limité à 60 i/s sur les écrans de 120 et 144 Hz | Une trace à 120 Hz qui rame |
| Dissolution sur le GPU | Les traces la placent en tête des coûts |
| Levier CPU (moins d'effets par réglage) | Les traces trouvent un appareil limité par le processeur ; le budget de flashs est alors re-prouvé pour chaque variante |
| Palier « haute+ », Screen Wake Lock, hash à la place de `Math.random` dans les effets | Un besoin réel |

---

## 5. La séquence de PR

Chaque PR se fait en deux commits : un refactor sans changement de comportement, puis la fonctionnalité. Elle passe la CI complète (`format:check`, `lint`, `typecheck`, `test`, `aseprite:check`, `build`), laisse le jeu jouable, puis se vérifie 15 min sur tes appareils avec `?debug`.

| Ordre | PR | Coût | Ce que tu verras |
|---|---|---|---|
| 1 | 0. La sonde sur tes appareils | 1 à 2 h | Un JSON par appareil |
| 2 | A. Le combat ne saccade plus | 0,5 à 1 j | Des combats réguliers ; le compteur « hors cadence » à 0 |
| 3 | B. Sûreté | environ 1 j | Rien sur un appareil normal ; plus de KO blanc sans WebGL |
| 4 | C. Contexte maigre | environ 0,5 j | La même image ; environ 16 Mo de moins sur téléphone |
| 5 | Fusion de F1, puis le cas « session » | 1 à 2 h | Rien ; un test qui rougira avec F2 à F4 |
| — | D. HD apprise (option) | 0,5 j | Sur ton PC, la HD retirée à la session suivante si elle a ramé |

**Pourquoi cet ordre.** A touche tous les joueurs, et son compteur est la première mesure sur un vrai téléphone. Elle passe entre deux PR du Finisher, pas en parallèle : les PR 4 et 5 à venir touchent `fight-scene.ts` et `fight-feedback.ts` (perimetre.md ; `docs/finisher.md`, « Ce qui reste », ne nomme pas `update()`, le conflit est donc un risque, pas une certitude). B ferme un risque contraire à la charte : un flash hors budget. C vient ensuite : sa preuve demande des captures du Finisher, et son gain, surtout de la mémoire, sert le cas « session ».

### 0. La sonde (1 à 2 h, aucun code du jeu)
- Ouvrir `appareils/sonde-appareil/index.html` dans le navigateur et en PWA, sur chacun de tes appareils (question 5).
- Elle relève déjà la cadence, le grain des horodatages, `MAX_TEXTURE_SIZE`, `deviceMemory`, le rendu et `crossOriginIsolated`.
- Les tests de jetsam et de session audio attendent G et J.
- **Risque** : aucun. **Preuve** : elle a déjà tourné en headless (`appareils/mesures/sonde-appareil-chromium-headless.json`).

### A. Le combat ne saccade plus (0,5 à 1 j)
- **Contenu**
  - `src/loop/cadence.ts` (nouveau, environ 90 lignes) : l'estimateur de cadence et le recalage, repris du banc du plan. La liste des cadences inclut 55 Hz, et la tolérance vaut grain + 0,5 ms.
  - `src/loop/fixed-timestep.ts` : `rephase(phaseMs)` ; l'abandon du retard repose la phase au lieu de la remettre à 0.
  - `src/render/fight-scene.ts` : le delta est recalé avant l'horloge visuelle, et l'horloge des tics disparaît. Sur tous les chemins, les tics valent `feedback.ticksFor(...)` sur les pas visuels, ralenti du KO compris (7 tics pour 20 images). La phase est reposée au départ et au changement de cadence.
  - `src/render/debug-overlay.ts` : un compteur « hors cadence ».
- **Ce que tu verras** : des combats réguliers, surtout sur iPhone, sur les écrans à 120 Hz et en Économie d'énergie. Le ralenti du KO et le Finisher le deviennent aussi.
- **Risque**
  - Un conflit possible avec les PR 4 et 5 du Finisher, dans `fight-scene.ts` : fusionner A entre deux de ces PR.
  - Une cadence inconnue : le delta brut passe, comme aujourd'hui. C'est un échec sûr.
  - Le ralenti du KO joue 17 ou 18 tics en 50 images, au lieu de 17,5 en moyenne : l'affichage seul est touché (D17).
- **Preuve**
  - `tests/loop/cadence.test.ts`, avec les vrais `FixedTimestep` et `TickPacer` : les 14 cas de [cadence-main], plus Safari Mac 144 → 72 et 165 → 55.
  - Seuils : au plus 0,6 % à 90 Hz avec 1,5 ms de gigue, au plus 0,1 % ailleurs. La somme des deltas est exacte.
  - Mutations qui doivent faire rougir le test : phase forcée à 0, report forcé à 0, cadence figée à 60 Hz.
  - Replays dorés intacts.

### B. Sûreté (environ 1 j)
- **Contenu**
  - Perte du contexte : sur `LOSE_WEBGL`, `FightScene` appelle la pause existante (`sceneData.onPause()`, dont le menu est en DOM, donc visible sans canvas).
  - Rendu Canvas, par un seul aiguillage lu une fois : les voiles teintés sont coupés (la mise au noir reste) ; les objets `FX_DARK` sont masqués (`anchored-sprite.ts:62`, `fx-dissolve.ts:164`, `finisher-card.ts:147` et `:193`), comme les teintes pleines (écho du Boost, traînées).
  - Un avis : « Mode simplifié : ton navigateur n'offre pas l'accélération graphique. »
  - `audio: { noAudio: true }` dans `main.ts`.
  - `?rendu=canvas`, pour voir le mode simplifié sur un appareil normal.
- **Ce que tu verras** : rien sur un appareil normal. Sans WebGL, le KO ne flashe plus blanc, et un avis explique pourquoi. Une perte du contexte ouvre la pause au lieu de faire jouer à l'aveugle.
- **Risque** : un objet teinté oublié (vérifier les étincelles, `hit-fx.ts:1161`). Des textures de canvas manquantes après la restauration : on ajoute alors la regénération de R16.
- **Preuve**
  - Un test pur de la règle « montrer ou masquer selon le rendu », avec les faux objets existants (`fake-dom.ts`, `hud-fakes.ts`).
  - Un essai jetable en Chromium headless : avec `--disable-webgl`, aucun voile blanc au KO ; avec `WEBGL_lose_context`, 0 tic pendant la perte, puis la pause ; un seul `new AudioContext`.

### C. Contexte maigre (environ 0,5 j)
- **Contenu**
  - `main.ts` crée le contexte : WebGL2, sinon WebGL1 avec `OES_standard_derivatives` (que `smoothPixelArt` exige), en `{ antialias: false, depth: false, stencil: false }`. Il le passe par `config.context`. Si la création échoue, Phaser crée le sien, comme aujourd'hui.
  - Le commentaire sur les appels de dessin est corrigé : 20 en moyenne, 27 au plus.
- **Ce que tu verras** : la même image, environ 16 Mo de moins par combat sur téléphone, et un GPU moins chargé sur un PC à puce intégrée en 1920×1080.
- **Risque** : les bords des Graphics perdent leur lissage (anneau de prise, HUD dessiné, cône et éclats du Finisher) : c'est la question 2. Un 2e contexte sur iOS si le repli se déclenchait après une création réussie : le code n'en crée qu'un.
- **Preuve**
  - Captures A/B à graine fixe de 6 images : neutre, anneau de prise, super, KO, carte du Finisher et gros plan ×2. Au plus 0,2 % de pixels différents, puis une relecture à l'œil.
  - `getContextAttributes().antialias` vaut `false`.
  - L'essai de perte de contexte de B est rejoué.

### Fusion de F1, puis le cas « session » (1 à 2 h)
- F1 appartient au chantier de l'animation, et se fusionne quand sa PR est verte. D'ici là, rien ne touche `art-textures`, `fx-pixels` ni `dissolve`. Seule exception, B touche `fx-dissolve.ts:164` (le masquage de `FX_DARK`), loin des deux lignes que F1 y change (l. 144-145) : si F1 passe d'abord, B se rebase dessus.
- On ajoute à `tests/build/vram-budget.test.ts` un cas « session » : les 4 tenues, le tampon de dessin et les canvas. Avec C, il fait environ 86 Mo, sous les 90.
- **Preuve** : doubler exprès une tenue fait rougir le test, avec le nom de l'appariement.

### D. La HD apprise (option, 0,5 j, après C)
- Si un combat en 1920×1080 a eu plus de 5 % d'images en retard (phases `fight` et `roundEnd`), la session suivante démarre en 960×540.
- C'est une clé lue une fois au démarrage, puisque `RENDER_SIZE` se choisit au boot (`main.ts:30`). Aucun redimensionnement en cours de session.
- **Risque** : un verdict faux, mémorisé. La clé porte une version, et repart de zéro à chaque version.
- **Preuve** : un test pur de la règle, puis ton PC.

**Total maintenant : environ 2,5 jours**, plus 0,5 j pour D si tu la retiens.

### Plus tard, chacune sur son déclencheur (§4)

| PR | Coût | Contenu | Ce que tu verras |
|---|---|---|---|
| I. Les traces | environ 1 j | `?perf=trace` (anneau préalloué de 1,7 Mo) et `?quality=` ; grain et `crossOriginIsolated` en tête ; A/B par réglage ; prix d'une passe ; temps GPU sur PC | Un JSON des coûts de chaque appareil |
| E. Le cran du décor et l'option | environ 1 j | Masquer `mid` ; option haute / basse sur le modèle de `comfort.ts` (« auto » arrive avec F) ; tests de flashs et de luminance pour chaque réglage | Le décor, et « Qualité » dans Options |
| F. La qualité automatique | 2 à 2,5 j | Le régulateur du plan et ses 4 corrections (§2.8) ; la détection en plafonds ; Compute Pressure ; les scénarios S1 à S5 en tests, avec leur chronologie épinglée | Un téléphone faible qui s'allège seul, sans va-et-vient : au plus 2 changements la 1re session, 0 ensuite |
| G. Le déchargement | environ 1 j | Décharger la paire la moins récemment jouée ; classes et marque anti-jetsam seulement avec une mesure de jetsam | Une longue session sans plantage |
| H. Moins de travail par image | 2 à 3 j | Mots préparés au chargement, dans des canvas ; test de perte du contexte (R16), et une regénération seulement si une texture est peinte sur le GPU | Plus d'à-coup quand un mot apparaît |
| J. Les vrais sons | 2 à 3 j | Le service worker d'abord ; un seul élément audio pour la musique ; `audioSession` ; le tout par-dessus les bus du polish | Musique et ambiances ; l'interrupteur silencieux respecté |

Si tout arrive, I passe avant E et F. **Total plus tard : de 9 à 12 jours au plus**, et seulement si leurs déclencheurs arrivent.

---

## 6. Décisions à prendre

**1. Faut-il tenir tout de suite, en automatique, la clause « baisse plutôt que ramer » ?**
- Défaut recommandé : non. On fait C, on regarde la HD sur ton PC avec la surcouche, et on ne fait D (0,5 j) que si elle rame.
- Ce que ça change : 0,5 j de plus, et seul le PC est concerné, puisque la HD n'existe pas sur tactile.

**2. Accepte-t-on les bords en escalier sans MSAA (anneau de prise, cône et éclats du Finisher) ?**
- Défaut recommandé : oui, si la capture A/B ne se voit pas à l'œil, à ×1 comme à ×2. Sinon, le contexte maigre reste, et le cône est redessiné en texture dans le chantier du Finisher.
- Ce que ça change : le critère d'acceptation de C. La mémoire gagnée ne change pas.

**3. Le jour où plus aucun réglage ne tient (téléphone chaud) : demi-cadence ou réglage sans décor ?**
- Défaut recommandé : la demi-cadence, à 30 images/s régulières. Elle est éprouvée sur Android et chez Apple, et extrapolée au navigateur (R11) ; elle est mesurée dans le banc (S4 : de 11,6 à 1,0 % d'images irrégulières). Le décor reste.
- Ce que ça change : la forme de F. Rien n'est à coder avant F. Le prix à accepter : à 30 images/s, les entrées ne sont lues que tous les 2 tics, et les liens de 6 tics ou moins deviennent plus durs (`combos-v3.md`, l. 702). C'est déjà le cas aujourd'hui sous l'Économie d'énergie de Safari, mais la demi-cadence le provoquerait elle-même sur un téléphone chaud.

**4. Quand le décor arrive : un seul cran, ou les 4 paliers du plan ?**
- Défaut recommandé : un seul cran (masquer `mid`), plus l'option manuelle. E coûte alors environ 1 j, au lieu de 3 à 5. Les pièces emboîtées et l'animation du décor ne viennent que si la direction artistique les dessine.
- Ce que ça change : la taille de E, et ce que fait l'option.

**5. Sur quels appareils vérifie-t-on ?**
- Défaut recommandé : un iPhone, un Android et ton PC. Sans Android à 90 ou 120 Hz, le haut rafraîchissement se vérifie sur un écran de PC à 144 Hz. Safari sur un Mac à 144 ou 165 Hz, si tu en as un.
- Ce que ça change : ce que couvre le §7. Les cas manquants restent prouvés par un banc seulement.

---

## 7. À vérifier sur un vrai téléphone

1. **Sonde (PR 0)** : grain de l'horloge sur iPhone (1 ms attendu), `crossOriginIsolated` (faux attendu), `MAX_TEXTURE_SIZE` réel sur iPhone et iPad (au moins 4 096 attendu).
2. **Après A** : avec `?debug`, un combat CPU contre CPU entier, compteur « hors cadence » à 0, sur iPhone, Android et PC. Puis, sur iPhone, l'Économie d'énergie activée en plein combat, puis coupée.
3. **Après B** : iPhone, l'app 1 min en arrière-plan puis le retour : pause, puis reprise propre. La pause sur `visibilitychange` existe déjà (`pause-input.ts:32`) : ce test vérifie surtout l'image après la restauration ; la perte « à l'écran », elle, se vérifie par l'essai `WEBGL_lose_context` de B. En Mode Isolement, si tu acceptes de l'activer : l'avis s'affiche, et le KO ne sort pas blanc.
4. **Après C** : la même image à l'œil sous Safari (anneau de prise, carte du Finisher en ×2). Sur ton PC, avec Chrome en 1920×1080 : le temps GPU avant et après, ou à défaut les images/s de la surcouche.
5. **Le jour du décor (I, puis E)** : le prix d'une passe plein écran sur iPhone et Android, `mid` affichée puis masquée.
6. **Le jour de F** : 15 min de combats en boucle sur l'Android qui chauffe, en comptant les changements de réglage.
7. **Le jour des sons (J)** : l'interrupteur silencieux, une autre app qui joue de la musique, un appel entrant, la lecture hors ligne en PWA.

---

## 8. Les fichiers de preuve

**Bancs et mesures** (relatifs à `adaptive/`)

| Nom | Fichier | Ce qu'il tranche |
|---|---|---|
| [cadence-main] | `confrontation/perimetre-bancs/out/cadence-main.txt` | Une horloge recalée contre main et contre la PR 1 du plan |
| [dbg-ralenti] | `confrontation/perimetre-bancs/dbg-ralenti.ts` | Le ralenti compté comme main (13 contre 29 %) |
| [governor-cases] | `confrontation/bancs/out/governor-cases.txt` | S1 à S5 : plan, R2 à la lettre, corrigé |
| [grain-delta] | `confrontation/bancs/out/grain-delta.txt` | Médiane contre moyenne, à 1 ms de grain |
| [safari-rates] | `confrontation/bancs/out/safari-rates.txt` | La règle de WebKit, et 55 Hz |
| [pixel-passes] | `confrontation/bancs/out/pixel-passes.txt` | Les passes plein écran, sur la géométrie de main |
| [demi-cadence] | `confrontation/bancs/out/demi-cadence.json` | La demi-cadence dans le vrai Phaser 4.2.1 |
| [governor-bench] | `final/governor-bench.ts` | Le régulateur du plan sur 400 appareils modèles (résultats au PLAN §4.3, sans fichier de sortie) |
| [classement] | `couts/classement.txt` | Le coût de chaque poste, sous SwiftShader |
| [memoire] | `couts/memoire.txt` | Le tampon de dessin et les textures |
| [correlation] | `couts/correlation.txt` | r² du modèle linéaire, image par image |
| [perte-contexte] | `appareils/mesures/perte-contexte.json` | 123 tics à l'aveugle |
| [sans-webgl] | `appareils/mesures/sans-webgl.json` | Le rendu Canvas, 2 contextes audio |
| [session-miroirs] | `appareils/mesures/session-miroirs.json` | 138,8 Mo de textures (seules) après une session avec les 4 tenues, avant F1 |
| [perimetre-data] | `confrontation/perimetre-data/` | Les PNG de F1, pour les chiffres de session |

**Code relu.** WebKit (`Performance.cpp`, `AnimationFrameRate.cpp`, `Page.cpp`, `UnifiedWebPreferences.yaml`) dans `confrontation/dl/` et `recherche/dl/` ; Phaser 4.2.1 et main dans `/home/user/NayosBeat`, en lecture seule.

**Sources publiées** (détail et liens : EdA §6) :
- [A1] Funkhouser et Séquin, SIGGRAPH 1993. [A2] Gobbetti et Bouvier, IEEE Visualization 1999. [A3] Wimmer et Wonka, EGSR 2003. [A14] Cantlay (NVIDIA), GPU Gems 3, 2007.
- [E3] Epic, Dynamic Resolution, UE 5.8. [E7] Epic, Significance Manager. [E9] Unity, Adaptive Performance (Berger, 2019 et 2022). [E13] pmndrs, drei PerformanceMonitor. [E15a] Phaser 4.2.1, TimeStep.js et WebGLRenderer.js, lu. [E15b] Richards (Phaser Studio), Phaser 4 Pixel Art Guide, 2026. [E17] Godot, Multiple resolutions. [E18] Unity, 2D Pixel Perfect 5.0. [E20] French (Arm), 2026, lu. [E21] Nystrom, Game Programming Patterns, lu.
- [M4] Android et NCSoft, Lineage W, 2024. [M5] Android et Kakao Games, 2023. [M7] Android, FPS throttling et Gameloft. [M8] Android, Frame pacing, 2026, lu. [M11] Apple, ProMotion et WWDC21 10147, lu.
- [W1] W3C, Compute Pressure, 2026. [W2] MDN, deviceMemory. [W3] WebKit, NavigatorBase.cpp. [W4] WebKit et Mozilla, nom du GPU. [W5] Khronos et Web3D Survey, timer query. [W6] MDN requestAnimationFrame, bug WebKit 215745 (2020), `UnifiedWebPreferences.yaml` et `AnimationFrameRate.cpp`. [W7] bug WebKit 228137, 2021, et W3C High Resolution Time, 2026. [W8] PQINA, 2022, lu. [W9] bug WebKit 261313, 2023, lu. [W12] MDN, WebGL best practices, 2026. [W13] W3C, Web Audio 1.1, 2026, lu. [W14] WebKit, Safari 18.4, et MDN, codecs, lu.

**Rapports de confrontation** : `confrontation/correspondances.md` (plan et recherche, ligne à ligne), `confrontation/contradictions.md` (les 7 contradictions et leurs bancs), `confrontation/perimetre.md` (le tri par ce qui sert le joueur).

---

## État

**A livrée** le 1er novembre 2026. Elle comprend :
- `src/loop/cadence.ts` : l'estimateur de cadence, le recalage, et l'horloge visuelle qui les assemble ;
- `FixedTimestep.rephase` ;
- une seule horloge dans `FightScene` : les tics valent `FightFeedback.ticksFor` sur ses pas, ralenti du KO compris ;
- le compteur « hors cadence » de `?debug`.

Preuve : `tests/loop/cadence.test.ts`, sur les vrais `FixedTimestep`, `TickPacer` et `FrameClock`.

**Écarts au plan, mesurés** (simulateur `tests/loop/cadence-sim.ts`, même modèle et mêmes graines que [cadence-main]) :
- **Tolérance du recalage : 2 × (grain + 0,5 ms), et non grain + 0,5 ms (§2.2).** Un delta recalé est l'écart entre deux horodatages : celui de l'image, et celui d'où part le compte des périodes. Chacun peut être faux de son arrondi et de 0,5 ms de gigue. Le 0 % de [safari-rates] venait d'un premier horodatage sans gigue ; en jeu, la grille repart d'un horodatage bruité (la 1re image, puis chaque échec du recalage). Avec grain + 0,5 ms, Safari Mac à 165 Hz (55 Hz, 0,5 ms de gigue) cassait 0,41 % des images, et Chrome à 165 Hz 1,08 % ; avec 2 × (grain + 0,5 ms), 0,06 et 0,02 %.
- **Calage sur une cadence connue à 1,5 % près, et non 3 % (§4.1 du plan de conception).** Une tranche de 16 images qui en contient une en retard dure 17/16 de la période. À 60 Hz, elle se lit 56,5 Hz, à 2,6 % de 55 Hz, que A ajoute à la liste. À 3 %, « 60 Hz, gigue 1,5 ms, 3 % d'images en retard » passait sur 55 Hz 220 fois en 100 combats (0,50 % d'images cassées), et 10 % d'images en retard en cassaient 19 %. À 1,5 %, 0 % et 0,02 %. 1 % aurait été trop serré : 240 Hz arrondi à 1 ms n'était plus reconnu.
- **Une cadence plus lente n'est lue que si la tranche la plus courte la donne aussi (§4.1 du plan de conception : 1er quartile seul).** Une image en retard allonge sa tranche ; elle ne la raccourcit jamais. Une cadence plus rapide se lit donc sur le 1er quartile ou sur la tranche la plus courte. Une plus lente demande que les deux concordent. Sur un écran chargé, la plupart des tranches contiennent une image en retard, et le 1er quartile lisait 40 à 50 Hz à 60, ou 60 et 55 Hz à 72. Sur 70 écrans chargés (de 55 à 144 Hz, de 10 à 50 % d'images en retard, 0,5 ou 1,5 ms de gigue), les tics cassés passent en moyenne de 3,0 % avec la règle du plan à 1,2 % (7,6 % sur main). A fait pire que main dans 13 de ces cas au lieu de 22, et de 3,6 points au plus au lieu de 5,0.
- **Pas d'anneau vidé après 250 ms (§4.1 du plan de conception)**, comme le banc retenu : la lecture ignore jusqu'à 47 tranches sur 64. Une pause de 3 s en plein combat ne casse aucune image.
- **Main, compté dans l'ordre du jeu** (le KO tombe sur un tic de l'image, le ralenti part de la suivante) : de 1,2 à 20,4 % des tics hors ralenti cassés, contre 1,2 à 29 % dans [cadence-main], qui ralentissait déjà l'image du KO. Le même simulateur, dans l'ordre de [cadence-main], redonne ses chiffres (28,28 % à 60 Hz). A n'en dépend pas.

**Mesures** : % d'images qui cassent la cadence, tics hors ralenti / pas visuels, 100 combats de 60 s, 2 KO, 1re image de 250 ms, intro de 1,5 s non comptée.

| Cas | main | A |
|---|---|---|
| 60 Hz, grain 0,1 ms | 13,89 / 42,67 | 0 / 0 |
| Safari 60 Hz, grain 1 ms | 15,84 / 48,67 | 0 / 0 |
| 60 Hz, gigue 1,5 ms | 14,60 / 33,40 | 0 / 0 |
| 60 Hz, gigue 3 ms | 20,35 / 33,53 | 0 / 0 |
| Safari 59,94 Hz (écran qui dérive), grain 1 ms | 1,17 / 1,16 | 0,07 / 0,06 |
| iOS 30 Hz (Économie d'énergie), grain 1 ms | 14,54 / 44,66 | 0 / 0 |
| 90 Hz, gigue 1,5 ms | 7,47 / 10,42 | 0,53 / 0,54 |
| 120 Hz, gigue 1,5 ms | 9,44 / 16,13 | 0 / 0 |
| 144 Hz, gigue 0,5 ms | 2,16 / 2,82 | 0,02 / 0 |
| 60 Hz, gigue 1,5 ms, 3 % d'images en retard | 14,22 / 34,81 | 0 / 0 |
| 60 Hz surchargé (50 % d'images sur 2 vsyncs) | 12,58 / 35,98 | 0 / 0 |
| Fréquence variable : 120 Hz en combat, 60 attendus | 6,34 / 16,06 | 0 / 0 |
| 120 Hz puis 60 Hz à 25 s (économiseur) | 9,27 / 10,33 | 0 / 0 |
| Safari 60 Hz puis 30 Hz à 25 s (Économie d'énergie) | 20,16 / 43,34 | 0 / 0 |
| Safari Mac 144 Hz → 72 Hz, grain 1 ms, gigue 0,5 ms | 3,02 / 6,36 | 0,05 / 0 |
| Safari Mac 165 Hz → 55 Hz, grain 1 ms, gigue 0,5 ms | 1,80 / 1,61 | 0,06 / 0 |
| 60 Hz, gigue 1,5 ms, pause de 3 s | 15,33 / 28,39 | 0 / 0 |
| 60 Hz chargé : 20 % d'images en retard, gigue 1,5 ms | 14,38 / 33,30 | 0,05 / 0,05 |
| Safari Mac 144 Hz → 72 Hz chargé : 30 % d'images en retard | 3,73 / 6,19 | 0,54 / 0,49 |

Dans le ralenti du KO, A joue exactement 7 tics pour 20 pas visuels, vérifié après chaque image. Les pas suivent le temps réel à 2 pas près au plus sur un combat de 60 s ; chaque changement de cadence repose la phase, et rend ou prend moins d'un pas. Aucun temps n'est perdu ni inventé sur la durée.

Les mutations du §5 font rougir le test :
- phase forcée à 0 : jusqu'à 31 % d'images cassées ;
- report forcé à 0 : jusqu'à 11 %, et les pas dérivent de 3,6 à 232 pas ;
- cadence figée à 60 Hz : jusqu'à 25 %.

La règle du plan pour lire la cadence, remise à la place de la nouvelle, fait aussi rougir les deux cas chargés (11,2 et 6,7 %).

**Limites connues** (hors des cas du §5) :
- Safari sur un Mac à 144 ou 165 Hz qui perd 30 à 50 % de ses images peut faire pire que main. Le pire relevé est 5,2 % contre 1,6 % (55 Hz, 40 % d'images en retard). Les tranches s'y lisent sur des cadences voisines, et un recalage sur une cadence proche mais fausse déplace des pas.
- À 144 Hz sous 1,5 ms de gigue, A fait comme main (5,3 % contre 5,1 %) : la gigue y vaut le cinquième d'une période.
- Un écran qui dérive (59,94 Hz) sous 1,5 ms de gigue, avec le grain de Chrome, casse encore 2,2 % des images, contre 2,8 % sur main. La phase y glisse lentement à travers une frontière de pas.
- Sur un écran qui n'est pas à 60 Hz (ni à 30), le 1er combat de la session part de 60 Hz. Ses 96 premières images, de 0,7 s à 144 Hz à 1,8 s à 55 Hz, ne sont pas recalées sur leur cadence, comme sur main ; l'intro en couvre 1,5 s. Les combats suivants partent de la cadence du précédent.

Ces cas tiennent tous à un appareil chargé ou très bruité. Le compteur d'A dira sur tes appareils s'ils existent. Une lecture de la cadence qui tienne sous la charge (la période la plus longue dont presque tous les deltas sont des multiples) ne se ferait que sur une trace qui le montre.

À vérifier (§7, point 2) : avec `?debug`, un combat CPU contre CPU entier, sur iPhone, iPad, Android et PC/Mac. Le compteur « hors cadence » doit rester à 0 ; sur un écran qui n'est pas à 60 Hz, le 1er combat de la session peut en compter quelques-uns à son début.
