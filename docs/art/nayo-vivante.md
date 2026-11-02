# Nayo vivant : lumières en jeu, présence, effets francs (prototype)

Casquette : direction artistique technique. Suite de [nayo-lumiere.md](nayo-lumiere.md), [nayo-essence.md](nayo-essence.md) et [nayo-vfx.md](nayo-vfx.md).

Le verdict du propriétaire, après #97, mot pour mot : « Bah je vois AUCUNE DIFFÉRENCE... visuellement c'est propre mais toujours trop plat, les combattants manquent de personnalité de lumières et effets et VFX propres à chacun en jeu. »

**Le diagnostic.** Les flaques, la lueur et les rémanences de #97 respectaient le budget de flashs, mais elles étaient minuscules : une ellipse de 56 × 12 px au sol, une lueur à ΔL 0,035 sur l'adversaire. Aucune ne touchait les murs, aucune ne changeait la scène. On avait traité toute lumière comme un flash.

**Ce prototype.** Il porte sur deux coups, le **Vinyle** (Remix compris) et la **Mégabasse**, et sur Nayo au repos, pour valider la direction avant de tout généraliser. Il ajoute :

- de vraies lumières en jeu, qui éclairent la rue et les deux combattants (§2) ;
- une présence permanente, faite d'une aura, de LED et de particules de son (§3) ;
- des effets francs : onde de choc, séisme au sol, lignes de vitesse et lignes d'impact (§4).

Tout se coupe avec la qualité adaptative (§5), et rien ne flashe : voir [flashs.md](../flashs.md) §5. Le cœur (`src/core`) n'est pas touché, et les 31 replays dorés sont inchangés (D17, D23).

## 1. Les API de Phaser 4.2.1 retenues

Elles ont été lues dans la source de `node_modules/phaser`, et non de mémoire.

| Besoin | API | Où |
|---|---|---|
| Éclairer les combattants | `LightsManager` (`scene.lights.enable`, `addLight`, `setAmbientColor`) et `setLighting(true)` sur les sprites ; shader `DefineLights.glsl` | `light-show.ts` |
| Éclairer la rue | `PointLight` (`scene.add.pointlight`) : une lueur additive, `couleur × intensité × smoothstep(1 − d/r)` | `light-show.ts` |
| L'aura | Filtre `Glow` en *knockout* (la lueur seule), sur une copie du corps derrière lui | `presence.ts` |
| Les LED qui émettent | Filtre `Key` (isoler la couleur des LED) suivi d'un `Glow`, sur une copie du corps ajoutée par-dessus | `presence.ts` |
| Les effets francs | `Graphics` : ellipses, triangles et lignes pleines | `bold-fx.ts` |

**Trois pièges de Phaser 4.2.1, trouvés en mesurant :**

1. **Les lumières disparaissent près des combattants.** `LightsManager.getLights` élimine les lumières hors de `camera.worldView`. Or ce rectangle ignore l'origine de la caméra (`Camera.js`, `preRender`), et celle du combat est en (0, 0) : le rectangle testé est décalé de (largeur/2)(1 − 1/zoom). Comme le jeu n'a jamais plus de lumières que `maxLights`, `LightShow` remplace cette élimination sur l'instance et la rend au `dispose`.
2. **Les combattants s'éclairent d'un seul côté de la lumière, au hasard.** Le shader lit la normal map sur la 2ᵉ unité de texture. Mais `bindUnits` ne lie que les unités sous `renderer.maxTextures`, que le jeu fixait à 1 (contournement d'un bug de SwiftShader, `main.ts`). La normale lue venait donc de la texture précédente. Le jeu passe à `maxTextures: 2` : les indices 0 et 1 sont ceux que SwiftShader interpole exactement, d'après le même commentaire.
3. **Le `PointLight` sature en blanc.** Il transmet `color.r × intensité` au shader, et `color.r` va de 0 à 255 (`BatchHandlerPointLight.js`, `IntegerToColor`). L'opacité voulue se divise donc par 255 (`GLOW_UNIT`).

**Pas de normal maps.** Avec la normale plate par défaut (`__NORMAL`), la lumière tombe sur tout le corps selon la distance. À cette taille, cela se lit déjà comme un éclairage. Les normales grossières que le générateur pourrait tirer du squelette (`tools/sprites/skeleton.ts`) ne viendront que si le propriétaire veut voir le côté tourné vers la lumière s'éclairer seul (§9).

## 2. Les lumières vivantes

### 2.1 Les sources

Ce sont celles de `light-rig.ts`, lues dans l'état à chaque tic : la main du Vinyle, le disque en vol, le poing au sol de la Mégabasse, les autres coups de Nayo qui ont une lumière, et l'éclat d'un coup lourd. Chacune porte une portée : 120 px pour un coup, 110 pour un disque, 90 pour un éclat. La Mégabasse a la sienne, 200 px (`MoveLight.radius`).

Quand les lumières vivantes sont allumées, les flaques et la lueur de #97 s'effacent (`LightRig.live`), car elles s'additionneraient avec elles. Les ombres, elles, s'étirent toujours.

### 2.2 La rue : une lueur additive bornée

Chaque source pose un `PointLight` sur la scène, sous les combattants. Son opacité au cœur est la plus haute qui ne change aucune grande couleur du décor de ΔL 0,09, ou 0,05 en effets calmes (`glowAlpha`). Le pire cas est le fond le plus clair, canal par canal.

| Couleur | Opacité au cœur (calme) | Un mur `#2a2440` devient | ΔL |
|---|---|---|---|
| Cyan de Nayo | 0,187 (0,115) | `#334f70` | 0,053 |
| Magenta (2ᵉ tenue) | 0,237 (0,146) | `#66376f` | 0,046 |
| Platine | 0,143 (0,087) | `#4d4764` | 0,049 |

- **Plusieurs lueurs.** Celles qui se chevauchent sont réduites ensemble (`glowScale`) : leurs cœurs additionnés restent sous la borne.
- **Les détails qui brillent.** Les pixels du décor qui monteraient quand même de 0,1 sous la plus forte lueur, à n'importe quel niveau d'assombrissement, s'éclairent eux-mêmes : fenêtres allumées, lampes, enseignes (`emits`).
  - Ils sont peints une fois par combat sur une toile de la taille de la couche, posée exactement par-dessus, au-dessus des lueurs. Elle n'est visible que lorsqu'une lueur l'est (`keepEmitters`).
  - Les accessoires animés montent au-dessus des lueurs pendant ce temps.
  - Résultat mesuré sur les 6 images du décor (deux ambiances) : moins de 8 % de chaque couche, et aucun pixel éclairé à ΔL ≥ 0,1.
- **Ce qui en résulte.** La rue autour de la main et du disque prend la couleur de la lumière. Les fenêtres, déjà allumées, restent ce qu'elles sont.

### 2.3 Les combattants : la lumière par pixel de Phaser

Les deux corps sont des objets éclairés (`setLighting(true)`) dès le début du combat, pour que le shader soit compilé pendant l'intro et pas au premier Vinyle. L'ambiance reste blanche : rien ne change tant qu'aucune lumière ne brille.

Chaque source a sa lumière Phaser, dans sa couleur. Au cœur, elle multiplie les couleurs du corps par 1 + 0,9 × la couleur (`FIGHTER_LIFT`). Les lumières qui se chevauchent sont partagées pour ne jamais dépasser cette valeur.

Les pixels clairs d'un corps (peau, reflets, la tenue grise de la 2ᵉ tenue) passent alors ΔL 0,1. Une lumière demande donc au budget, en s'allumant, ce que les deux combattants allumeraient (`admit`, jamais un créneau). Les surfaces sont mesurées sur toutes les images de toutes les bandes (`FIGHTER_LIGHT_AREAS`) :

| Tenue | Mesuré (px² monde) | Table |
|---|---|---|
| Nayo, 1ʳᵉ tenue | 389 | 400 |
| Nayo, 2ᵉ tenue | 1 101 | 1 130 |
| Riff, 1ʳᵉ tenue | 478 | 490 |
| Riff, 2ᵉ tenue | 696 | 715 |

- **Accordée**, la lumière éclaire les combattants toute sa vie. **Refusée**, ou en effets calmes, elle n'éclaire que la rue, toute sa vie aussi : elle ne se rallume jamais à mi-chemin.
- Un coup et son disque partagent une décision ; un éclat a la sienne.
- Nayo contre Riff demande 890 px², ce qui tient au gros plan maximal si rien d'autre ne s'allume (1 080 px² monde). En miroir, la demande fait 1 530 px² : elle est toujours refusée, et la lumière n'éclaire que la rue.

### 2.4 La Mégabasse : la rue s'assombrit, le poing la rallume

Sur le gel de la super (l'événement `freeze`), tout le décor est multiplié par 0,4 (une teinte) :

- il descend en 4 images ;
- il reste sombre tant que brille la lumière de la super, par celui qui l'a lancée ;
- il revient en 14 images.

Les combattants ne sont pas teintés.

Sous l'assombrissement, la lueur se recalcule à chaque image sur la rue assombrie : elle peut être plus forte (cyan 0,300, platine 0,242). La rue se rallume donc autour du poing pendant que le reste est dans le noir.

Ce mécanisme remplace la mise au noir de #97 (`FightFeedback.liveDim`). Sa baisse sur les grandes couleurs est de 0,065 au plus, sous les 0,08 de l'ancien voile. Le halo platine reste.

## 3. La présence de Nayo

C'est ce qui le montre vivant entre ses coups, sur l'horloge visuelle, sans rien qui clignote (`presence.ts`, données dans `signatures.ts`, `presence`).

- **L'aura.** Son corps est redessiné derrière lui, à travers un `Glow` en *knockout*.
  - Sa couleur est son énergie assombrie vers l'encre de la nuit jusqu'à ne changer aucune grande couleur du décor de 0,08, opaque (`toneUnder` : `#1a5d6f` en cyan).
  - Elle respire : la portée de la lueur va et vient entre 1,6 et 3,2, en 150 images par cycle, soit 0,4 Hz. Tremblement à « aucun » : elle retient son souffle.
- **Les LED.** Son corps est redessiné par-dessus et ajouté à 0,7, à travers un `Key` qui ne garde que la couleur de ses LED, puis un `Glow`.
  - La couleur gardée est `neonCore` de la palette, vérifiée par le test.
  - Elles brillent sans varier.
- **Les particules de son.** Neuf points de 2 à 3 px dans son énergie montent autour de sa poitrine.
  - Chacun apparaît et s'efface en 150 images (sin²), décalé des autres.
  - Ils s'arrêtent avec le tremblement à « aucun ».
- **Sous la silhouette du Finisher**, rien de tout cela n'est montré.

## 4. Les effets francs

Ce sont des aplats opaques, cernés d'encre, lisibles d'un coup d'œil sur un téléphone (`bold-fx.ts`, données `MoveSignature.bold`). Leur corps est leur couleur assombrie jusqu'à ne changer aucune grande couleur du décor de 0,09 : c'est la teinte et la forme qui les portent, pas la lumière. Seul un fil chaud de 1 px, à l'intérieur d'un anneau, est vif : il demande sa longueur au budget au départ de l'anneau (`hotArea`, `admit`). Refusé, ou en effets calmes, il n'est pas tracé.

| Coup | Image | Effet |
|---|---|---|
| Vinyle | 12 | Onde de choc debout à la main (un haut-parleur vu de profil), de 14 à 64 px, épaisseur de 7 à 2 px |
| Vinyle platine | 12 | La même en platine, ×1,3 |
| Disque en vol | chaque image | Quatre lignes de vitesse derrière lui |
| Mégabasse | 2, 8, 14 | Séisme au sol, de 36 à 230 px (×1, ×1,1, ×1,3 en platine), et douze lignes d'impact qui jaillissent du poing |

## 5. La qualité adaptative : le premier levier

C'est le levier que [qualite-adaptative.md](../qualite-adaptative.md) attendait (§0, §2.8). Voir aussi sa section « État ». Le gameplay ne change jamais.

| Palier | Lumières, rue et combattants | Aura et LED (filtres) | Particules | Effets francs |
|---|---|---|---|---|
| `full` | oui | oui | oui | oui |
| `lean` | oui | non | oui | oui |
| `off` (et Canvas) | non : les flaques de #97 reviennent | non | non | oui (aplats) |

- **Au départ, des plafonds** (`tierCeiling`) :
  - en Canvas, `off` ;
  - avec un rendu logiciel (SwiftShader, llvmpipe), 2 Go de mémoire ou moins, ou des textures sous 4 096 px, `lean` ;
  - `?lumieres=haut|moyen|non` force le plafond.
- **En combat** (`LightGovernor`), après 90 images d'intro, une fenêtre de 120 images dont 20 % ou plus dépassent 25 ms (1,5 image à 60 Hz) fait descendre d'un palier. Le palier descendu devient le plafond de la session : il ne remonte jamais avant un rechargement.

## 6. Les mesures

**Coût d'une image.** Mesuré dans Chromium headless (SwiftShader, donc un GPU simulé par le processeur), dans le build de production servi par `vite preview`, à 960 × 540.

- **Protocole.** Chaque image est avancée à la main, puis le GPU est vidé par la lecture d'un pixel ; le temps est pris côté Node. La séquence est : garde, Vinyle, marche, Mégabasse, trois fois, soit 1 020 images.
- **Ce que valent les chiffres.** SwiftShader exagère tout ce qui remplit des pixels : seul le classement vaut, pas les millisecondes (comme dans [qualite-adaptative.md](../qualite-adaptative.md) §1).

Chaque valeur est la médiane des trois passes. Chaque temps compte aussi l'aller-retour vers le navigateur, le même pour tous les builds.

| Build | Médiane (ms) | p95 (ms) | Écart à main (médiane) |
|---|---|---|---|
| main (ba95769) | 26,1 | 49,0 | — |
| prototype, `full` | 33,3 | 58,8 | +7,2 (+28 %) |
| prototype, `lean` | 27,5 | 58,7 | +1,4 |
| prototype, `off` | 27,1 | 47,2 | +1,0 |

Lecture :
- l'essentiel du surcoût vient des deux `Glow` (aura et LED), que le palier `lean` coupe ;
- les lumières, les lueurs et les particules coûtent environ 1 ms sous SwiftShader, dans le bruit d'une passe à l'autre (main varie de 22,3 à 28,5) ;
- `off` revient au niveau de main ;
- les échantillons des `Glow` ont déjà été réduits (5 × 7 pour l'aura, 4 × 5 pour les LED, contre 10 × 10 par défaut).

**Mémoire vidéo.** Les toiles des émetteurs ajoutent 6,0 Mo, une par couche. Le pire match (Nayo contre Nayo) passe à 59,6 Mo, sous le plafond de 90 (`tests/build/vram-budget.test.ts`, qui les compte). Les filtres y ajoutent leurs tampons, à la taille du sprite.

**Libération.** `LightShow.dispose` retire ses lumières, détruit ses lueurs et ses émetteurs, libère leurs textures, rend à Phaser son élimination des lumières et éteint le gestionnaire. `Presence.dispose` détruit ses sprites filtrés et ses particules. `FightScene.dispose` appelle les deux, et c'est testé.

## 7. Les tests

- `tests/render/live-lights.test.ts` (sur les vraies images) :
  - la borne de la rue à chaque centième de niveau d'assombrissement, et près de cette borne (audacieuse, pas timide) ;
  - le partage des lueurs, échantillonné sur 40 tirages ;
  - aucun pixel du décor à ΔL ≥ 0,1, et moins de 8 % d'émetteurs ;
  - l'assombrissement sous 0,08 ;
  - la table des combattants, à 15 % près de la mesure.
- `tests/render/light-show.test.ts` :
  - rien en `off` ;
  - la lueur à sa place et à sa borne ;
  - une seule demande par source, et un refus qui tient toute sa vie ;
  - le calme ;
  - le plafond des combattants ;
  - l'assombrissement tenu, puis rendu, sans jamais teinter les combattants ;
  - les émetteurs ;
  - le `dispose`.
- `tests/render/light-quality.test.ts` : les plafonds, la descente, le plafond de session.
- `tests/render/presence.test.ts` :
  - la couleur des LED tirée de la palette ;
  - la respiration sous 1 Hz, sans saut ;
  - le ton de l'aura ;
  - des particules sans clignotement ;
  - les paliers, et le `dispose`.
- `tests/render/bold-fx.test.ts` : le bon coup à la bonne image, les tons, le fil chaud seulement accordé, sa longueur bornée, rien pendant le Finisher.
- `flash-cadence.test.ts` et `finisher-flashes.test.ts` jouent maintenant la lumière vivante et les effets francs sur les vraies routes, en demandant en dernier, comme `FightScene`. Ils restent verts sans limite desserrée : la Mégabasse qui tue fait toujours 3 flashs.
- **Mutations.** 15 mutations sur 16 font rougir leur test. La 16ᵉ, une lumière qui prendrait un créneau de climax au lieu d'`admit`, laisse `flash-cadence` vert : ses routes ne saturent pas le budget. C'est `light-show.test.ts` qui fixe le contrat (`admit`, l'aire des deux combattants).

## 8. Écartés

- **Éclairer le décor par la lumière par pixel** (première version).
  - C'est une multiplication : un mur sombre ne gagnait que ΔL 0,02 sous la borne prise sur la couleur la plus claire.
  - Une normal map masque, qui détourne de la lumière les pixels clairs, coupait 50 % du mur dès ×2 : le résultat était moucheté.
  - La lueur additive élève un mur sombre presque autant qu'un clair : ΔL 0,05, 2,5 fois plus visible.
- **Dimmer par l'ambiance de Phaser.** Elle assombrit aussi les combattants, et leurs pixels clairs auraient flashé à la baisse. La teinte ne touche que le décor.
- **Des normal maps par combattant.** Elles doubleraient la mémoire de leurs bandes (+45 Mo en miroir, au-delà de 90). La normale plate suffit à ce stade.
- **Garder `maxTextures: 1`.** Avec cette valeur, la lumière par pixel est fausse (§1, piège 2).

## 9. Généraliser

- **Tous les coups de Nayo.** Leurs lumières passent déjà par ce mécanisme : ce sont les sources de `light-rig.ts`. Pour les effets francs, il suffit d'ajouter des `bold` dans `NAYO_SIGNATURE` (un anneau au sol pour l'Uppercut, une onde pour le Pied fendu) ; les données suffisent.
- **Riff.**
  - Lui donner une `Signature` : lumières, `bold`, et `presence` avec la couleur de ses accents (magenta, or en 2ᵉ tenue), mesurée sur sa palette comme `neonCore`.
  - Ses `FIGHTER_LIGHT_AREAS` existent déjà : elle reçoit la lumière de Nayo.
  - Son Slam a sa propre super : la teinte du décor suit déjà son `freeze` ; il lui faut une lumière de super.
- **Des normales grossières.** Le générateur connaît l'orientation de chaque segment (`skeleton.ts`, `raster.ts`) et peut écrire une normal map par bande, au prix de la mémoire (§8). Seulement si le côté éclairé seul se voit en jeu au point d'en valoir le coût.

## 10. À vérifier, et doutes

- **Sur un vrai téléphone.**
  - Le coût des deux `Glow` (le palier `lean` les coupe).
  - La lisibilité de la lueur en plein soleil.
  - La qualité automatique : une Économie d'énergie iOS à 30 Hz la fera descendre, puisque chaque image dépasse 25 ms. C'est voulu (moins de GPU), mais à confirmer.
- **Une lumière qui se déplace** (le disque) allume, image après image, des pixels neufs sur son chemin. Comme les anneaux de #97, elle n'est comptée qu'une fois, à son allumage.
- **L'aura passe par-dessus Riff** quand Nayo est devant elle. Sur ses pixels clairs, son ton sombre est une baisse de luminance, sur une bande de quelques pixels, qui n'est pas comptée.
- **La décision du propriétaire du 1er novembre** (« pas de baisse automatique pour l'instant ») est dépassée ici, mais seulement pour ce nouveau levier, qui n'existait pas : à confirmer avec lui.
