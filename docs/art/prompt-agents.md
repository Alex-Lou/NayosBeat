# Prompt pour agents extérieurs — sprites, portraits, effets, décors

Ce document se donne tel quel à un ou deux agents (IA avec génération d'images, ou artistes). Il remplace la partie « format » de [prompt-sprites.md](prompt-sprites.md) : en cas de différence, **ce document fait foi**, car il reprend exactement ce que le jeu lit (`src/art/`).

- **Agent A — Combattants** : planches d'animation des personnages.
- **Agent B — Portraits, effets, décors** : bustes et expressions, icônes, projectiles, stages.

Un seul agent peut tout faire, dans l'ordre A puis B. L'univers, les personnages et leurs palettes sont dans [univers.md](univers.md), à joindre au prompt.

Ordre de production : **Sound Clash** (Nayo, Riff, l'Entrepôt), puis **Néon Underground**, puis **Archipel des Légendes**.

---

## 1. Règles communes (à coller en tête de chaque prompt)

```text
You produce pixel art for "NayosBeat", a 2D side-view arcade fighting game rendered at
480x270 and scaled up with nearest-neighbour filtering. Follow these rules strictly:

- True pixel art on a strict grid: every pixel one solid color, no anti-aliasing, no blur,
  no gradients, no soft brushes, no noisy dithering.
- Indexed PNG with transparency; one palette per character of at most 40 colors, including
  a 4-tone ramp per material (outline, shadow, base, light). Light comes from the top-front.
- 1-pixel outline using the darkest tone of each material (never pure black everywhere).
- Facing right in every frame. The game mirrors the sprite for the other side.
- Two colorways per character: the second one uses EXACTLY the same pixels, only the palette
  changes (palette swap). It must contrast strongly with the first (different main color).
- Never reference, copy or imitate an existing game, studio, character or trademark.
- Blood is arcade-style and light: a few dark-red drops or a split lip, never gore.
- Deliver files exactly as named in the specification; never rename, resize or reorder.
```

---

## 2. Agent A — Combattants

### 2.1 Format des planches (contrat technique, non négociable)

| Élément | Valeur |
|---|---|
| Une planche | Une bande horizontale d'images de **128 × 128 px**, collées, sans marge ni bordure |
| Point d'ancrage | Centre des pieds en **x = 64**, sol sur la rangée **y = 124** de chaque case |
| Marges | Rien à moins de 2 px des bords gauche, droit et haut ; rien sous la rangée 125 |
| Taille debout (en garde) | Polyvalent : 78 à 84 px des semelles au sommet du crâne ; Rushdown : 72 à 78 px |
| Taille accroupi | Polyvalent : ≤ 58 px ; Rushdown : ≤ 54 px (la zone où l'on est touché fait 54 et 50 px) |
| En l'air | Le corps se dessine par rapport aux pieds (le jeu déplace le sprite) ; rien sous la rangée 125 |
| Fichiers | `src/art/<perso>/main/<planche>.png` et `src/art/<perso>/alt/<planche>.png` |

Les pieds d'un personnage au sol touchent la rangée 124 **dans chaque image** : un pied qui flotte ou qui s'enfonce se voit tout de suite en jeu.

### 2.2 Les 25 planches d'un personnage

Les noms de fichiers sont ceux de la première colonne. Les durées sont en ticks (60 par seconde) : le jeu affiche chaque image exactement ce temps-là. Pour les coups, l'image **active** (en gras) est celle où le coup peut toucher : le poing ou le pied doit y atteindre le bord de la hitbox (section 2.3).

**Déplacements et états** (les mêmes pour les deux gabarits) :

| Planche | Images | Contenu, image par image | Durées |
|---|---|---|---|
| `idle` | 6 | Garde, respiration en boucle (1 à 2 px d'amplitude) | 8 × 6, boucle |
| `walkForward` | 8 | Marche en garde, pieds qui ne se croisent pas, pas de ~14 px (Rushdown ~19 px) | 3 × 8, boucle |
| `walkBack` | 8 | Recul en garde, pas de ~12 px (Rushdown ~14 px) | 3 × 8, boucle |
| `crouch` | 4 | 2 images de descente, puis accroupi en boucle | 2, 2, puis 12, 12 en boucle |
| `jump` | 5 | Élan au sol, montée, sommet groupé, descente, réception au sol | élan 4 (3 Rushdown), air ~38 (~35), réception 3 |
| `jumpForward` | 6 | Salto avant groupé (le corps tourne autour des hanches) | 5, 6, 6, 6, 6, 9 |
| `block` | 4 | Garde debout, recul de garde debout, garde accroupie, recul accroupi | impact 4 puis tenue |
| `hit` | 5 | Debout : tête rejetée, plié en deux, retour ; accroupi : impact, retour | 4, 6, tenue / 5, tenue |
| `airHit` | 3 | Projeté en arrière, vrille, chute tête basse | 4, 8, tenue |
| `knockdown` | 6 | Choc au sol jambes en l'air, rebond, allongé, appui sur une main, à genou, relevé | 3, 3, 16, 6, 6, 6 (= 40) |
| `ko` | 5 | Tête rejetée, chute en arrière, choc au sol, rebond, allongé inconscient | 5, 7, 4, 6, tenue |
| `intro` | 6 | Entrée en scène propre au personnage (voir univers.md) | 15, 12, 12, 15, 16, 20 (= 90) |
| `victory` | 6 | 3 images vers la pose, puis boucle de 3 images | 8, 8, 8, puis 10 × 3 en boucle |
| `timeOver` | 2 | Défaite au temps : mains sur les genoux, essoufflé | 20, 20, boucle |
| `projectile` | 4 | Le projectile seul (pas le perso), centré en **x = 64, y = 81** de la case (43 px au-dessus du sol), en boucle | 3 × 4, boucle |

Le Rushdown n'a pas de projectile : sa planche `projectile` est inutile. La longueur des pas suit la vitesse de marche du gabarit : avec ces durées, des pas plus courts ou plus longs font glisser les pieds sur le sol.

**Coups — gabarit Polyvalent** (Nayo, Kaï, Sora) :

| Planche | Images | Durées par image (active en gras) |
|---|---|---|
| `standLight` | 5 | 2, 2, **3**, 4, 3 |
| `standHeavy` | 7 | 3, 3, 2, **4**, 5, 5, 6 |
| `crouchLight` | 5 | 2, 2, **2**, 4, 4 |
| `crouchHeavy` | 7 | 3, 3, 3, **3**, 6, 7, 7 |
| `jumpLight` | 4 | 2, 2, **6**, 6 (la dernière reste jusqu'à la réception) |
| `jumpHeavy` | 5 | 3, 4, **5**, 5, 5 (idem) |
| `special` | 7 | 4, 4, 4, **8** (le projectile part au début de cette image), 7, 7, 7 |
| `specialForward` | 7 | 3, 4, 4, **4**, 6, 6, 6 |
| `specialAntiAir` | 7 | 3, **3**, **5**, 7, 7, 7, 7 |
| `throw` | 5 | 3, **2** (saisie), 6, 8, 8 |

**Coups — gabarit Rushdown** (Riff, Vexa, Kitsune) :

| Planche | Images | Durées par image (active en gras) |
|---|---|---|
| `standLight` | 5 | 1, 2, **2**, 3, 3 |
| `standHeavy` | 7 | 2, 2, 2, **3**, 4, 5, 5 |
| `crouchLight` | 5 | 1, 2, **2**, 4, 3 |
| `crouchHeavy` | 7 | 2, 2, 3, **3**, 6, 6, 6 |
| `jumpLight` | 4 | 1, 2, **6**, 5 |
| `jumpHeavy` | 5 | 3, 3, **5**, 5, 4 |
| `special` (Ruée) | 7 | 3, 3, 2, **6**, 6, 5, 5 |
| `specialForward` | 7 | 4, 4, 4, 4, **4**, 7, 7 |
| `specialAntiAir` | 7 | 2, 2, **3**, **3**, 8, 8, 8 |
| `throw` | 5 | 3, **2**, 6, 8, 8 |

### 2.3 Où le coup doit atteindre (hitbox)

Repère : x vers l'avant depuis le centre des pieds, y vers le haut depuis le sol, en pixels. Sur l'image active, le dessin doit atteindre le **bord avant** de la zone (± 6 px), dans la bande de hauteur indiquée. Pour l'anti-air, c'est le **haut** de la zone qui compte.

| Coup | Polyvalent : x, y | Rushdown : x, y |
|---|---|---|
| standLight | 10–40, 46–58 | 9–33, 42–54 |
| standHeavy | 10–54, 44–62 | 9–43, 40–58 |
| crouchLight | 12–38, 4–14 | 10–32, 4–14 |
| crouchHeavy | 12–52, 2–14 (au ras du sol) | 10–44, 2–14 |
| jumpLight | 4–30, 10–26 (depuis les pieds) | 4–26, 8–24 |
| jumpHeavy | 2–36, −4–18 (vers l'avant-bas) | 2–32, −4–18 |
| specialForward | 8–44, 24–40 (coup de pied volant) | 4–34, 44–78 (à parer debout : retombe d'en haut) |
| specialAntiAir | 4–30, 30–**100** (poing au-dessus de la tête) | 4–28, 30–**92** (genou qui jaillit) |
| throw | 6–26, 20–60 (mains au col) | 6–26, 20–60 |
| special (Ruée) | — (projectile) | 8–36, 40–56 (le corps avance pendant la ruée) |

Le jeu ne déplace pas le combattant pendant la plupart des coups. Si le dessin fait un pas pour atteindre la zone, il se superpose à l'adversaire à bout portant : un pas de plus de 10 px se voit.

Quatre coups font vraiment avancer le combattant. Leur dessin reste centré sur x = 64, sans dessiner le trajet :

| Coup | Avancée |
|---|---|
| Coup de pied fendu (Polyvalent) | ~30 px |
| Ruée (Rushdown) | ~54 px |
| Saut de l'ange (Rushdown) | ~35 px |
| Genou montant (Rushdown) | ~12 px |

Le Saut de l'ange reste au sol pour le jeu : le bond se dessine dans la case, le corps décollé de la rangée 124.

### 2.4 Prompt Agent A

```text
[COMMON RULES]

ROLE: You are the character animator. Produce every sprite strip of one fighter at a time,
in this order: Nayo, Riff (Sound Clash), then Kaï, Vexa, then Sora, Kitsune.

INPUTS: the attached universe bible (univers.md) for each character's look, outfit, two
palettes, signature detail and move names; the attached specification (sections 2.1 to
2.3 of prompt-agents.md) for the exact strip list, frame counts, timings and reach.

PROCESS for each character:
1. Make a model sheet first: front, three-quarter, side views and the 4-tone ramps of every
   material for both colorways. It is the reference for every later strip; never redesign.
2. Draw the strips in the order of section 2.2, one strip per generation, with the model
   sheet attached. For each strip respect the frame count exactly.
3. On each attack's active frame, make the striking fist or foot reach the far edge of the
   hitbox listed in section 2.3, inside its height band.
4. Export the strip twice, main and alt colorway, as indexed PNGs with the same pixels.

QA, for every strip, before delivering it:
- width = frames x 128, height = 128, transparent background, indexed palette;
- feet center at x = 64 and soles on row 124 in every grounded frame;
- nothing closer than 2 px to the left, right or top edge; nothing below row 125;
- same proportions, outline and palette as the model sheet;
- active frames reach the hitbox edge (within 6 px short, 8 px past);
- loops (idle, walks, crouch end, victory end, timeOver, projectile) are seamless.

DELIVERABLES: src/art/<character>/main/<strip>.png and src/art/<character>/alt/<strip>.png,
with <character> in lowercase without accents (nayo, riff, kai, vexa, sora, kitsune) and
<strip> exactly as named in section 2.2; plus the model sheet as
docs/art/<character>-model.png. Report any deviation instead of hiding it.
```

---

## 3. Agent B — Portraits, effets, décors

### 3.1 Portraits et expressions

| Fichier | Format | Contenu |
|---|---|---|
| `src/art/<perso>/portraits.png` | 8 cases de 96 × 96 px | Neutre, concentré, cri, sourire en coin, douleur, très touché (lèvre fendue, arcade ouverte), KO, victoire |
| `src/art/<perso>/portrait-angles.png` | 3 cases de 96 × 96 px | Profil, trois-quarts, face (neutre) |
| `src/art/<perso>/icon.png` | 2 cases de 32 × 32 px | Icône du HUD : normale, touchée |

Les portraits sont tournés vers la droite, en trois-quarts, cadrés tête et épaules. Ils utilisent la palette du personnage, avec les deux tenues. Ils sont prévus pour les écrans de sélection et de résultats (intégration à venir).

### 3.2 Effets

| Fichier | Format | Contenu |
|---|---|---|
| `src/art/fx/hit-sparks.png` | 6 cases de 48 × 48 px | Étincelle d'impact (coup lourd), centrée |
| `src/art/fx/block-sparks.png` | 4 cases de 48 × 48 px | Étincelle de garde, froide (bleutée) |
| `src/art/fx/dust.png` | 5 cases de 48 × 24 px | Poussière de réception et de chute, posée sur la rangée du bas |

Aujourd'hui, le jeu dessine ses étincelles et son sang lui-même. Ces planches servent à les remplacer plus tard : elles sont optionnelles.

### 3.3 Décors (stages)

| Élément | Valeur |
|---|---|
| Écran | 480 × 270 px, la caméra suit les combattants horizontalement |
| Largeur du stage | 960 px (la caméra se déplace de 0 à 480) |
| Sol | Les pieds sont à **y = 230** : la bande 230–270 est le sol, vue de face |
| Calques | `far.png` (fond, défile à 25 % : 600 × 270), `mid.png` (plan moyen, 50 % : 720 × 270), `floor.png` (sol, 100 % : 960 × 40) |
| Animations | Facultatives, en bandes de 4 images : `far-anim.png`, `mid-anim.png` (foule, pluie, lanternes) |
| Fichiers | `art-src/<stage>/far.png`, `mid.png`, `floor.png`, avec `<stage>` = `entrepot`, `toit`, `temple` : `npm run sprites` les vérifie et les copie dans `src/art/<stage>/` (voir [aseprite.md](aseprite.md)). Le jeu ne lit encore que l'Entrepôt |
| Lisibilité | Contraste faible et couleurs moins saturées que les combattants : les persos doivent ressortir |

### 3.4 Prompt Agent B

```text
[COMMON RULES]

ROLE: You are the illustrator for portraits, effects and stages. Work in this order:
Sound Clash (Nayo and Riff portraits, the Warehouse stage), then Néon Underground, then
Archipel des Légendes; effects at the end.

INPUTS: the attached universe bible (univers.md); the attached specification (section 3 of
prompt-agents.md) for every file, size and layer; the fighters' model sheets made by the
character animator (docs/art/<character>-model.png) as the strict reference for faces,
outfits and palettes.

PORTRAITS: bust, three-quarter view facing right, same palette as the sprites, both
colorways; 8 expressions as listed, split lip and cut eyebrow only on "badly hurt";
readable at 96x96, then reduced by hand (not resampled) to the 32x32 HUD icons.

STAGES: three parallax layers sized exactly as listed; the floor band starts at y = 230 and
is seen from the front; keep stage colors less saturated and lower in contrast than the
fighters; any animated element is a seamless 4-frame loop.

QA: exact sizes, indexed PNGs, transparent where nothing is drawn (except stage far layer),
pixel-perfect grid, no text or logos, no copied or imitated existing work.

DELIVERABLES: files exactly as named in section 3; report any deviation.
```

---

## 4. Intégration (pour l'équipe du jeu)

- Les planches sont aujourd'hui **générées** par `npm run sprites` (`tools/sprites`). Une planche faite à la main se dépose dans `art-src/<perso>/` (voir [aseprite.md](aseprite.md)) : `npm run sprites` la vérifie, puis remplace celle du code, planche par planche. Ne rien déposer dans `src/art/` : `npm run sprites` réécrit ce dossier.
- Les tests automatiques vérifient les tables de chaque personnage (`validateArt`) :
  - durées des animations égales à la frame data ;
  - indices d'images présents dans les planches ;
  - fichiers présents.

  Le cadrage, les pieds au sol et la portée des coups ne sont testés que sur les planches générées (`tests/tools/sprites.test.ts`). Pour des planches livrées à la main, ces points se contrôlent :
  - à l'œil, en jeu, avec `?debug` (les hitbox s'affichent) ;
  - ou avec un test qui lit les PNG, à écrire.

  Une planche hors format se renvoie à l'agent avec l'écart constaté.
- Riff, Kaï, Vexa, Sora et Kitsune demandent chacun leur dossier `src/art/<perso>/` et leurs tables (`sheets.ts`, `clips.ts`, `index.ts`), sur le modèle de Nayo, avec les durées du gabarit Rushdown pour Riff, Vexa et Kitsune.
