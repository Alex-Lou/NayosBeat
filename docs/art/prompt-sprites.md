# Prompt sprites — un personnage complet

> **Mis à jour par [prompt-agents.md](prompt-agents.md)** : liste exacte des planches, nombres d'images et durées lus par le jeu, univers et personnages ([univers.md](univers.md)). En cas de différence, ces deux documents font foi ; celui-ci reste utile pour la méthode et les prompts détaillés image par image.

Base : le modèle **Polyvalent** (portée, onde de choc, uppercut). Toutes les tailles, portées et nombres d'images ci-dessous viennent des données du jeu (`src/data/fighters/nayo.ts`) : les respecter, c'est garantir que le dessin colle aux coups (un poing dessiné qui touche là où le jeu fait toucher).

## Mode d'emploi (à lire avant tout)

1. **Les prompts sont en anglais** : les générateurs le comprennent nettement mieux. Les explications restent en français.
2. **Ne jamais tout demander d'un coup.** Aucun générateur ne tient ~140 images cohérentes dans une seule image. Ordre :
   1. Prompt **A** (fiche de référence) → générer plusieurs fois, garder la meilleure : elle devient **LA référence**.
   2. Prompts **C** (animations), **une planche par génération**, en joignant toujours l'image de référence.
   3. Prompts **D** (portraits et expressions), **E** (saignement, effets).
3. **Toujours coller le bloc B (style) au début** de chaque prompt, et remplacer les `{{…}}` par la fiche du personnage (section 1).
4. **Ne jamais citer de jeu, de studio ou de personnage existant** dans un prompt (droits d'auteur) : décrire le style, pas la référence.
5. Après génération : nettoyage obligatoire (section G). Un générateur d'images classique produit du « faux pixel art » (pixels flous, couleurs qui dérivent) : prévoir la remise au propre.

**Outils.** Un générateur généraliste (ChatGPT, Midjourney, Gemini…) fera de belles fiches de référence et de beaux portraits, mais sera peu fiable sur des planches d'animation exactes (nombre d'images, alignement, cohérence d'une image à l'autre). Les outils spécialisés pixel art (de type PixelLab ou Retro Diffusion) ou un artiste avec Aseprite s'en sortent mieux pour les animations. Mes infos sur ces outils peuvent dater : tester sur une planche courte (C1 ou C14) avant de tout lancer.

---

## 0. Contraintes techniques du jeu (ne pas changer sans me prévenir)

| Élément | Valeur |
|---|---|
| Résolution interne du jeu | 480 × 270 px (agrandie ×4 en 1080p) |
| Case de sprite | **128 × 128 px**, fond transparent |
| Ligne de sol dans chaque case | **y = 124** (4 px de marge sous les pieds) |
| Centre des pieds | **x = 64**, identique sur toutes les images |
| Orientation | **regarde vers la droite** (le jeu retourne le sprite) |
| Taille debout | **84 px** des semelles au sommet de la tête, ~32 px de large au torse |
| Taille accroupi | **54 px** |
| Taille en saut (groupé) | **~68 px** |
| Tête | ~14 px de haut (le visage se lit sur les portraits, pas en jeu) |
| Palette | **24 couleurs max** pour le personnage |
| Fréquence du jeu | 60 images/s ; une image dessinée reste affichée 2 à 8 ticks (annexe) |

Repère des portées : `devant` = distance vers l'avant depuis le centre des pieds (x = 64), `hauteur` = distance au-dessus du sol (y = 124). Exemple : « devant 40 px, hauteur 46–58 px » ⇒ le poing atteint x = 104, entre y = 78 et y = 66.

---

## 1. Fiche personnage (à remplir)

> Exemple indicatif à remplacer : c'est une hypothèse pour illustrer, pas un choix.

| Champ | À remplir | Exemple |
|---|---|---|
| `{{NAME}}` | Nom | Kaï |
| `{{ARCHETYPE}}` | Style de combat | street boxer with taekwondo kicks and a ki energy wave |
| `{{BODY}}` | Âge, morphologie, posture | athletic young adult, lean, upright confident guard |
| `{{HEAD}}` | Visage, coiffure | short spiky black hair, sharp eyebrows, small scar on the chin |
| `{{OUTFIT}}` | Tenue détaillée | cropped red jacket with rolled sleeves, black tank top, grey cargo pants, white hand wraps, black sneakers |
| `{{SIGNATURE}}` | Un détail de silhouette reconnaissable | red headband with two short tails |
| `{{PALETTE}}` | Couleurs principales | crimson red, charcoal, warm skin tones, off-white wraps, cyan energy |
| `{{ENERGY}}` | Couleur et forme du projectile | cyan-white crescent wave |
| `{{PERSONALITY}}` | Attitude | cocky but disciplined, smirks a lot |
| `{{UNIVERSE}}` | Univers du jeu | urban night streets, neon signs |

Conseil : **une silhouette forte et simple** (un détail signature, pas dix). Les longs éléments flottants (écharpe, cape, cheveux longs) sont beaux mais très durs à garder cohérents d'une image à l'autre.

---

## B. Bloc de style commun (à coller au début de CHAQUE prompt)

```text
STYLE: Authentic pixel art for a 2D side-view arcade fighting game, late-1990s arcade
sprite style. Crisp hand-placed pixels on a strict pixel grid, every pixel a solid
square. Hard cel shading with 3 to 4 tones per material, light coming from the
top-front. 1-pixel outline using the darkest shade of each color ramp (not pure black).
Limited palette of at most 24 colors for the whole character, the same palette in every
image. No anti-aliasing, no gradients, no blur, no glow halos, no noisy dithering
(dithering only sparingly on large surfaces). Transparent background.

CHARACTER: {{NAME}}, {{ARCHETYPE}}. {{BODY}}. Head: {{HEAD}}. Outfit: {{OUTFIT}}.
Signature detail: {{SIGNATURE}}. Palette: {{PALETTE}}. Personality: {{PERSONALITY}}.
The outfit uses one main color ramp (4 shades) and one secondary ramp, so that an
alternate costume can be made later by swapping those two ramps only.

SCALE: Standing character exactly 84 pixels tall from soles to top of head, about
32 pixels wide at the torso, head about 14 pixels tall. Same proportions, same size and
same colors in every frame.
```

## Bloc grille (à coller dans chaque prompt de planche, avec N = nombre d'images)

```text
SPRITE SHEET: exactly N frames in a single horizontal row, each frame inside a 128x128
pixel cell, cells touching with no gaps, no borders, no frame numbers, no text.
In every cell: the character faces right, the center of the feet is at x=64, the ground
line is at y=124, the full body is visible and never cropped. Only the character, no
background, no ground, no shadow.
```

## Bloc négatif (champ « negative prompt », ou à ajouter en fin de prompt avec « Avoid: »)

```text
3D render, painting, illustration, photo, smooth shading, soft brush, anti-aliased
edges, blurry pixels, mixed pixel sizes, gradient, motion blur, lens effects, text,
letters, numbers, watermark, signature, logo, UI, frame borders, background scenery,
floor, cast shadow, extra limbs, extra fingers, missing limbs, cropped body, character
facing left, inconsistent outfit, inconsistent hair, changing body proportions,
perspective camera, top-down view, isometric view
```

---

## A. Fiche de référence (turnaround) — à faire en premier

```text
[STYLE BLOCK]

CHARACTER REFERENCE SHEET, 5 full-body views of the same character standing in a
neutral relaxed pose, side by side on one row, same size and same baseline:
1. front view, 2. three-quarter front view facing right, 3. right side profile,
4. three-quarter back view, 5. back view.
Below them, on a second row: a close-up of the head in front view, three-quarter view
and profile, at 4x scale, still in pixel art. Next to it, the palette as a row of flat
color squares.
Transparent background, no text.

[NEGATIVE BLOCK]
```

Garder la meilleure génération et ne plus la changer : elle est jointe à tous les prompts suivants avec la phrase :

```text
Use the attached reference sheet as the strict model for the character: identical
design, colors, proportions and outline. Do not redesign anything.
```

---

## C. Planches d'animation (une par génération)

Modèle de chaque prompt :

```text
[STYLE BLOCK]
Use the attached reference sheet as the strict model for the character: identical
design, colors, proportions and outline. Do not redesign anything.

ANIMATION: <ligne ANIMATION de la planche>
FRAMES: <ligne FRAMES de la planche>

[GRID BLOCK avec N]
[NEGATIVE BLOCK]
```

Vue de jeu : **profil trois-quarts tourné vers la droite** (torse légèrement ouvert vers l'écran, comme dans les jeux de combat d'arcade), garde levée.

### Déplacements et états

**C1 — Attente (idle)** · N = 6, en boucle

```text
ANIMATION: fighting stance idle loop, three-quarter side view facing right, guard up,
fists near the chin, subtle breathing bounce of 1 to 2 pixels, headband tails sway
slightly. Seamless loop: frame 6 flows back into frame 1.
FRAMES: 1 guard neutral, 2 inhale shoulders up 1px, 3 top of breath, 4 exhale,
5 bottom of breath knees slightly bent, 6 back toward neutral.
```

**C2 — Marche avant** · N = 8, en boucle

```text
ANIMATION: walking forward toward the right while keeping the fighting guard, cautious
fighter step, not a casual walk. One full cycle = 2 steps, each step about 24 pixels
long (feet must not slide). Seamless loop.
FRAMES: 1 contact right foot forward, 2 down, 3 passing, 4 up, 5 contact left foot
forward, 6 down, 7 passing, 8 up.
```

**C3 — Marche arrière** · N = 8, en boucle

```text
ANIMATION: stepping backward (to the left) while still facing right, defensive guard,
weight on the back foot, each step about 20 pixels long (feet must not slide).
Seamless loop.
FRAMES: same 8-phase cycle as a walk (contact, down, passing, up, twice), moving
backward.
```

**C4 — S'accroupir** · N = 4 (2 de transition + 2 en boucle)

```text
ANIMATION: crouching. Frames 1-2: going down from standing guard into a low crouch.
Frames 3-4: crouch idle loop with a 1-pixel breathing motion. Crouched height is
exactly 54 pixels, guard kept up in front of the face.
FRAMES: 1 knees bending, 2 almost down, 3 crouch idle A, 4 crouch idle B.
```

**C5 — Saut vertical** · N = 5

```text
ANIMATION: neutral vertical jump. Frame 1 is the take-off squat on the ground.
Frames 2-4 are airborne (draw the character at the same position in the cell, the game
moves it): rising with arms up, tucked knees at the apex (tucked height about 68
pixels), falling with legs extending. Frame 5 is the landing squat on the ground.
FRAMES: 1 take-off squat, 2 rising, 3 apex tucked, 4 falling legs extending,
5 landing squat.
```

**C6 — Saut avant (salto)** · N = 6

```text
ANIMATION: forward jump with a compact front flip, airborne the whole time, drawn
centered in the cell (the game moves it). Tucked body about 68 pixels tall.
FRAMES: 1 launch body leaning forward, 2 tuck rotating 90°, 3 upside-down tuck,
4 tuck rotating 270°, 5 untucking, 6 legs extended ready to land.
```

**C7 — Garde (parade)** · N = 4

```text
ANIMATION: blocking. Frames 1-2: standing block, forearms crossed in front of the
face and chest, body pushed back slightly. Frames 3-4: crouching block (54 pixels
tall), forearms low in front of the knees. The second frame of each pair shows the
recoil of the impact.
FRAMES: 1 standing block, 2 standing block recoil, 3 crouching block,
4 crouching block recoil.
```

**C8 — Touché** · N = 5

```text
ANIMATION: getting hit. Frames 1-3: standing hit reaction, head snapped back, body
bent backward, grimace, then recovering toward guard. Frames 4-5: crouching hit
reaction, staying crouched (54 pixels tall). Painful but not gory.
FRAMES: 1 impact head snapped back, 2 recoil body bent, 3 recovering, 4 crouching
hit impact, 5 crouching hit recovering.
```

**C9 — Touché en l'air** · N = 3

```text
ANIMATION: hit while airborne, launched backward (to the left) in a spinning fall,
drawn centered in the cell.
FRAMES: 1 impact body arched backward, 2 tumbling horizontal, 3 falling head-low
toward the ground.
```

**C10 — Chute et relevé** · N = 7

```text
ANIMATION: knockdown and wake-up. The character falls on their back, bounces once,
lies on the ground, then gets back up into the fighting stance. Lying body length must
stay within the cell.
FRAMES: 1 falling backward, 2 hitting the ground, 3 small bounce, 4 lying flat on the
back, 5 pushing up on one hand, 6 kneeling and rising, 7 back on feet nearly in guard.
```

**C11 — KO** · N = 5

```text
ANIMATION: defeated by knockout, slow dramatic fall, eyes closed, body limp, ending
lying on the ground motionless. Last frame is held.
FRAMES: 1 hit hard head thrown back, 2 knees buckling, 3 falling backward,
4 hitting the ground, 5 lying unconscious.
```

**C12 — Entrée de round** · N = 6

```text
ANIMATION: round intro pose showing personality ({{PERSONALITY}}): cracks knuckles,
tightens the headband, then snaps into fighting stance.
FRAMES: 1 relaxed standing, 2 hands together cracking knuckles, 3 knuckles crack,
4 hand on headband tightening it, 5 confident smirk, 6 snap into fighting stance.
```

**C13 — Victoire et défaite** · N = 8 (6 victoire en boucle + 2 défaite au temps)

```text
ANIMATION: frames 1-6: victory pose loop, fist raised high, triumphant, slight
celebratory bounce, seamless loop from frame 6 to frame 4. Frames 7-8: time-over loss,
standing exhausted, hands on knees, head down, breathing heavily.
FRAMES: 1 turning toward the screen, 2 raising fist, 3 fist high, 4 victory loop A,
5 victory loop B, 6 victory loop C, 7 exhausted hands on knees A, 8 exhausted B.
```

### Coups

Chaque coup indique l'image **ACTIVE** (celle où le coup touche) et la portée réelle du jeu : le membre qui frappe doit atteindre cette zone sur l'image active.

**C14 — Direct (léger debout)** · N = 5 · active : image 3 · devant 40 px, hauteur 46–58 px

```text
ANIMATION: fast straight jab with the front fist, standing, minimal body movement.
On the active frame the fist reaches 40 pixels in front of the feet center, at a
height of 46 to 58 pixels above the ground (face level).
FRAMES: 1 chamber shoulder turn, 2 arm extending, 3 ACTIVE full extension,
4 retracting, 5 back to guard.
```

**C15 — Crochet (lourd debout)** · N = 7 · active : image 4 · devant 54 px, hauteur 44–62 px

```text
ANIMATION: heavy powerful hook punch, big wind-up with hip and shoulder rotation,
weight shifting forward. On the active frame the fist reaches 54 pixels in front of
the feet center, at a height of 44 to 62 pixels above the ground.
FRAMES: 1 wind-up begins, 2 deep wind-up, 3 swing starting, 4 ACTIVE fist at full
reach, 5 follow-through, 6 recovering balance, 7 back to guard.
```

**C16 — Coup bas (léger accroupi)** · N = 5 · active : image 3 · devant 38 px, hauteur 4–14 px

```text
ANIMATION: crouching quick low kick to the shin, staying crouched (54 pixels tall).
On the active frame the foot reaches 38 pixels in front of the feet center, 4 to 14
pixels above the ground.
FRAMES: 1 crouch chamber leg, 2 kick extending, 3 ACTIVE foot extended low,
4 retracting, 5 back to crouch guard.
```

**C17 — Balayage (lourd accroupi)** · N = 7 · active : image 4 · devant 52 px, hauteur 2–14 px

```text
ANIMATION: crouching sweep, spinning low on one hand, the extended leg sweeps along the
floor. On the active frame the foot reaches 52 pixels in front of the feet center,
2 to 14 pixels above the ground.
FRAMES: 1 crouch drop, 2 hand on floor starting spin, 3 leg swinging, 4 ACTIVE leg
fully extended along the floor, 5 spin continues, 6 leg coming back, 7 back to crouch.
```

**C18 — Genou sauté (léger en l'air)** · N = 4 · active : image 3 · devant 30 px, hauteur 10–26 px

```text
ANIMATION: jumping knee strike, airborne, drawn centered in the cell (heights below are
measured from the soles). On the active frame the knee reaches 30 pixels in front of
the feet center, 10 to 26 pixels above the soles.
FRAMES: 1 airborne tuck, 2 knee rising, 3 ACTIVE knee thrust forward, 4 returning to
tuck.
```

**C19 — Coup de pied sauté (lourd en l'air)** · N = 5 · active : image 3 · devant 36 px, hauteur −4 à 18 px

```text
ANIMATION: jumping diagonal downward kick, airborne, drawn centered in the cell. On the
active frame the foot reaches 36 pixels in front of the feet center, from 4 pixels
below the soles to 18 pixels above them (kicking down and forward).
FRAMES: 1 airborne chamber, 2 leg chambered high, 3 ACTIVE leg extended diagonally
down-forward, 4 holding, 5 returning to tuck.
```

**C20 — Onde de choc (spécial)** · N = 7 · lancement : image 4 · le projectile apparaît 24 px devant, hauteur 36–50 px

```text
ANIMATION: energy wave special move. The character gathers {{ENERGY}} energy between
both palms at the hip, then thrusts both palms forward to release it. Draw the energy
in the hands only; the projectile itself is a separate sheet. On the release frame the
palms are 24 pixels in front of the feet center, at a height of 36 to 50 pixels.
FRAMES: 1 pulling hands back to the hip, 2 energy starting to glow between palms,
3 energy ball growing, 4 RELEASE both palms thrust forward, 5 holding the pose,
6 recovering, 7 back to guard.
```

**C21 — Projectile (onde de choc)** · N = 7 (4 en boucle + 3 dissipation) · zone de jeu 16 × 14 px

```text
ANIMATION: the flying energy projectile alone, no character, traveling to the right.
{{ENERGY}}. The solid core is 16x14 pixels, centered in the cell at x=64, y=81; a trail
may extend to the left. Frames 1-4: seamless flight loop with a flickering trail.
Frames 5-7: dissipation burst on impact.
FRAMES: 1-4 flight loop, 5 impact burst, 6 fading sparks, 7 last sparks.
```

**C22 — Coup de pied fendu (spécial avant)** · N = 7 · active : image 4 · devant 44 px, hauteur 24–40 px

```text
ANIMATION: leaping flying side kick traveling forward. The character springs forward
low, flies with the kick leg extended, and lands. Keep the character centered in the
cell (the game moves it forward). On the active frame the foot reaches 44 pixels in
front of the feet center, at a height of 24 to 40 pixels above the ground.
FRAMES: 1 crouch spring, 2 launching forward, 3 airborne leg chambered, 4 ACTIVE flying
kick fully extended, 5 landing, 6 recovering, 7 back to guard.
```

**C23 — Uppercut (anti-air)** · N = 7 · active : images 2–3 · devant 30 px, hauteur 30–100 px

```text
ANIMATION: rising uppercut anti-air. Starts from a deep crouch, explodes upward with the
fist rising straight above the head. The feet stay on the ground (on tiptoes at the
peak): the body does not leave the cell's ground line. On the active frames the fist
goes from 30 to 100 pixels above the ground, up to 30 pixels in front of the feet
center (100 pixels is above the head: the arm is fully raised).
FRAMES: 1 deep crouch fist low, 2 ACTIVE fist rising past the face, 3 ACTIVE fist fully
overhead on tiptoes, 4 holding at the peak, 5 arm coming down, 6 settling, 7 back to
guard.
```

**C24 — Projection (chope)** · N = 5 · saisie : image 2 · devant 26 px, hauteur 20–60 px

```text
ANIMATION: grab and throw. The character reaches forward, grabs an (invisible)
opponent by the collar, pivots and hurls them behind. Draw only this character, hands
shaped as if holding someone. On the grab frame the hands are 26 pixels in front of
the feet center, at a height of 20 to 60 pixels.
FRAMES: 1 reaching forward, 2 GRAB hands closing on the collar, 3 pivoting and lifting,
4 throwing over the shoulder, 5 recovering into guard.
```

---

## D. Portraits et expressions faciales

Les visages font ~14 px en jeu : les expressions vivent sur des **portraits**, utilisés au HUD, à la sélection et sur l'écran de résultats.

**D1 — Planche d'expressions** · N = 8 bustes, cases 96 × 96 px

```text
[STYLE BLOCK — replace the SCALE paragraph with:] Bust portraits, head and shoulders,
three-quarter view facing right, head about 48 pixels tall, same design and palette as
the attached reference sheet.

EXPRESSION SHEET: exactly 8 portraits in one horizontal row, each in a 96x96 pixel
cell, no gaps, no text, transparent background:
1 neutral calm, 2 focused determined, 3 battle shout mouth open, 4 cocky smirk,
5 pain grimace eyes squeezed, 6 heavily hurt with a bloody lip and a cut on the
eyebrow, 7 knocked out eyes closed head tilted, 8 victory grin.

[NEGATIVE BLOCK]
```

**D2 — Angles du visage** · N = 3, cases 96 × 96 px

```text
[STYLE BLOCK — bust portrait scale as in D1]
FACE ANGLES: exactly 3 neutral bust portraits in one row, 96x96 cells: 1 right side
profile, 2 three-quarter view facing right, 3 front view. Identical design.

[NEGATIVE BLOCK]
```

**D3 — Niveaux de blessure** · N = 3, cases 96 × 96 px

```text
[STYLE BLOCK — bust portrait scale as in D1]
DAMAGE LEVELS: the same three-quarter bust portrait, focused expression, 3 times in one
row, 96x96 cells: 1 intact, 2 bruised (swollen cheek, small scratch, sweat),
3 badly hurt (bloody lip, bleeding cut above the eyebrow, torn collar, bruises).
Arcade-style stylized blood: a few dark-red pixels, no open wounds, no gore.

[NEGATIVE BLOCK]
```

**D4 — Icône HUD** · N = 2, cases 32 × 32 px

```text
[STYLE BLOCK]
HUD ICON: tiny head icon of the character, three-quarter view facing right, readable at
32x32 pixels: 1 normal, 2 hurt. Bold shapes, minimal detail.

[NEGATIVE BLOCK]
```

---

## E. Saignement et effets

Le sang reste **stylisé arcade** (quelques pixels rouge sombre, pas de plaie ouverte) : c'est plus lisible en petit, et beaucoup de générateurs refusent le gore.

**E1 — Gouttes de sang (effet d'impact)** · N = 8, cases 32 × 32 px

```text
[STYLE BLOCK — no character]
BLOOD FX SHEET, stylized arcade blood, 3-color dark red ramp, exactly 8 frames in one
row of 32x32 cells, transparent background:
frames 1-5: a burst of droplets flying to the right after a heavy hit (spawn, spread,
arc, falling, fading); frames 6-8: a small splat on the ground (impact, spread, fade).
Pixel art, no gore.

[NEGATIVE BLOCK]
```

**E2 — Sprite abîmé (optionnel)** · N = 6, cases 128 × 128

Variante de C1 (attente) avec lèvre en sang, bleus et tenue déchirée, affichée quand la vie est basse. **Optionnel** : faire ça sur tous les coups multiplierait le travail par deux. À ne faire qu'après le reste.

```text
[STYLE BLOCK]
Use the attached reference sheet and the attached idle sheet as strict models.
ANIMATION: the same idle loop as attached, identical poses, but the character is
battle-worn: bloody lip, small bleeding cut above the eyebrow, bruise on the cheek,
torn sleeve, heavier breathing. Stylized arcade blood, no gore.
[GRID BLOCK with N=6]
[NEGATIVE BLOCK]
```

---

## F. Prompt « agent » (tout-en-un)

Pour un agent capable de générer et vérifier des images lui-même. Coller la totalité de ce fichier après ce texte.

```text
You are a senior pixel artist for a 2D arcade fighting game. Produce the complete sprite
set of one character, following the attached specification exactly (sizes, cells,
baseline, frame counts, active frames and reach are hard requirements from the game
engine).

Process:
1. Make the reference sheet (A). Generate several, pick the most readable and
   consistent one, and never change it afterwards.
2. Make every animation sheet C1 to C24, one sheet per generation, always with the
   reference sheet attached as the strict model.
3. Make the portraits D1 to D4 and the effects E1 (E2 only if asked).
4. After each sheet, check it against the QA list below. Regenerate or fix any sheet
   that fails. Never ship a sheet that fails a check.

QA list for every sheet:
- exact frame count, cells of the exact size, no gaps, no text, transparent background;
- feet center at x=64 and ground at y=124 in every grounded frame;
- same height (84 px standing, 54 px crouching), same proportions, same outfit, same
  palette (24 colors max) as the reference;
- real pixel art: one color per pixel, no anti-aliasing, no blur, 1-pixel outline;
- active frame reaches the stated area (distance in front of the feet center, height
  above the ground);
- loops are seamless; character faces right.

Deliverables: one PNG per sheet named `<character>_<sheet>.png`
(example: `kai_c14_direct.png`), plus a short report listing each sheet, its frame count
and any deviation from the specification.
Do not reference any existing game, studio or character.
```

---

## G. Nettoyage et livraison

1. **Remise à l'échelle.** Si l'image sort en haute résolution (souvent ×4 à ×8), la réduire **au plus proche voisin** (jamais bilinéaire) jusqu'à la taille exacte de la grille.
2. **Palette.** Forcer la palette de la fiche de référence (Aseprite : *Sprite → Color Mode → Indexed* avec la palette chargée) : supprime les couleurs parasites.
3. **Alignement.** Vérifier le centre des pieds (x = 64) et le sol (y = 124) sur chaque image ; recaler à la main si besoin.
4. **Contour et pixels orphelins.** Retouche manuelle rapide : pixels isolés, doubles contours, mains déformées.
5. **Export.** Une bande PNG horizontale par planche, sans marge, nom `<perso>_<planche>.png`. Je m'occupe du découpage et du branchement dans le jeu (durées, boucles, image active).

Volume total : ~140 images de combat + 13 portraits + 8 effets. Pour un premier test jouable, le minimum est **C1, C2, C4, C5, C7, C8, C10, C11, C14, C15** (~55 images).

---

## Annexe — Durée de chaque image (pour l'animateur et pour moi)

En ticks à 60 par seconde. Les sommes collent aux données du jeu : démarrage / actif / récupération.

| Planche | Durées par image | Total |
|---|---|---|
| C1 attente | 8 · 8 · 8 · 8 · 8 · 8 (boucle) | 48 |
| C2 marche avant | 5 × 8 (boucle, 1,2 px/tick ⇒ 48 px par cycle) | 40 |
| C3 marche arrière | 5 × 8 (boucle, 1 px/tick ⇒ 40 px par cycle) | 40 |
| C4 accroupi | 2 · 2 · puis 12 · 12 (boucle) | — |
| C5 saut | 4 (élan) · ~13 · ~12 · ~13 (en l'air, ~38 ticks) · 3 (réception) | — |
| C14 Direct (4/3/7) | 2 · 2 · **3** · 4 · 3 | 14 |
| C15 Crochet (8/4/16) | 3 · 3 · 2 · **4** · 5 · 5 · 6 | 28 |
| C16 Coup bas (4/2/8) | 2 · 2 · **2** · 4 · 4 | 14 |
| C17 Balayage (9/3/20) | 3 · 3 · 3 · **3** · 6 · 7 · 7 | 32 |
| C18 Genou sauté (4/6/6) | 2 · 2 · **6** · 6 | 18 |
| C19 Pied sauté (7/5/10) | 3 · 4 · **5** · 5 · 5 | 25 |
| C20 Onde de choc (12/1/28) | 4 · 4 · 4 · **1**+7 · 7 · 7 · 7 | 41 |
| C22 Pied fendu (11/4/18) | 3 · 4 · 4 · **4** · 6 · 6 · 6 | 33 |
| C23 Uppercut (3/8/28) | 3 · **3** · **5** · 7 · 7 · 7 · 7 | 39 |
| C24 Projection (3/2/22) | 3 · **2** · 6 · 8 · 8 | 27 |
| C10 chute et relevé | 4 · 4 · 4 · 16 · 4 · 4 · 4 | 40 |

En gras : images actives (le coup peut toucher). L'uppercut est invincible pendant les 8 premiers ticks (images 1 à 2 et le début de la 3).

Pour le modèle **Rushdown**, les mêmes planches servent, avec d'autres coups (Jab, Coup de coude, Ruée, Saut de l'ange, Genou montant) et des chiffres différents : je ferai sa version si besoin.
