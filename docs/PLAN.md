# NayosBeat — Plan de production (v0.1, à valider)

> Jeu de combat 2D en pixel art HQ, 2 personnages, 1 stage simple.
> Cibles : PC modeste + mobile (navigateur), jouable et testable sur les deux dès les premières semaines.
>
> Statut : **PROPOSITION**. Les points marqués 🟡 sont des décisions à valider avant d'écrire du code.

---

## 0. TL;DR

| Sujet | Recommandation |
|---|---|
| Plateforme | **Web d'abord** (un lien = testable sur PC et téléphone), puis empaquetage `.exe` (Tauri 2) et APK si besoin |
| Stack | **TypeScript strict + Vite + Phaser 4** (rendu, audio, chargement, scènes) |
| Architecture | **Cœur de simulation pur TS, déterministe, sans Phaser** → Phaser ne fait qu'afficher l'état |
| Boucle | Logique **fixe à 60 ticks/s**, rendu découplé (OK sur écrans 60/120/144 Hz) |
| Résolution interne | **480×270** (×4 = 1080p, ×8 = 4K), mise à l'échelle entière, filtrage *nearest* |
| Taille perso | ~**80–96 px** de haut |
| Contrôles | 4 boutons : **Léger / Lourd / Spécial / Saut** + directions ; garde = maintenir arrière |
| Mobile | Joystick virtuel flottant + 4 boutons, paysage, plein écran, PWA |
| Modes MVP | 1v1 local (clavier/manettes) + **1 vs CPU** (indispensable pour le mobile) + entraînement |
| Plus tard | Netcode **rollback** en ligne (rendu possible par le cœur déterministe) |

Principe directeur : **gameplay en boîtes grises d'abord, art ensuite.** Un jeu de combat qui n'est pas fun avec des rectangles ne le sera pas avec de beaux sprites.

---

## 1. Choix de la stack (et pourquoi)

### Options comparées

| Critère | **Phaser 4 + TS (web)** ✅ | Godot 4 | Unity |
|---|---|---|---|
| Testable sur mobile sans install | ✅ un lien | ⚠️ export web plus lourd sur mobile | ❌ lourd en WebGL |
| PC "petite config" (dev + jeu) | ✅ navigateur + VS Code | ✅ éditeur léger (~100 Mo) | ❌ éditeur lourd |
| Ta stack (TS, Vite, Tauri) | ✅ 100 % | ⚠️ GDScript/C# | ⚠️ C# |
| Tests auto (CI, Vitest, Playwright) | ✅ natifs | ⚠️ possible, plus de friction | ⚠️ |
| Vérification automatisée (Chromium headless, captures) | ✅ | ⚠️ partiellement | ❌ |
| Outils 2D intégrés (éditeur de scène, animation) | ⚠️ à la main | ✅ excellent | ✅ |
| `.exe` / APK natifs | via Tauri 2 / Capacitor | ✅ natif | ✅ natif |

**Recommandation : Phaser 4 + TypeScript.** Raison principale : la contrainte « jouable/testable sur PC **et** mobile » + « petite config » + ta maîtrise de TS/Vite/Tauri. Godot reste une alternative crédible si tu veux un éditeur visuel — à trancher maintenant, car ça change tout le reste (🟡 **Q1**).

Note : Phaser 4.2.1 est la version stable actuelle sur npm (vérifié). Phaser 4 est encore récent ; le cœur de simulation étant indépendant, le risque est contenu (le rendu peut basculer sur Phaser 3.x ou PixiJS sans toucher au gameplay).

### Outillage
- **Vite** (dev server + build), **TypeScript strict**, **ESLint + Prettier**
- **Vitest** (tests du cœur), **Playwright** (smoke tests navigateur + captures)
- **GitHub Actions** : lint + tests + build à chaque PR ; déploiement **GitHub Pages** pour tester sur téléphone (🟡 à confirmer, c'est un déploiement public)
- Art : **Aseprite** (payant ~20 €, ou compilable gratuitement) ou **Pixelorama/LibreSprite** (gratuits) → export *spritesheet + JSON* avec tags d'animation
- SFX placeholder : **jsfxr** ; assets CC0 : Kenney, OpenGameArt (licence vérifiée fichier par fichier)

---

## 2. Architecture

### 2.1 Vue d'ensemble

```
 Périphériques                 Cœur (pur TS, déterministe)               Présentation (Phaser)
┌──────────────┐  InputFrame  ┌───────────────────────────────┐  état  ┌──────────────────────┐
│ Clavier      │──(bitmask)──▶│ step(state, inputsP1, inputsP2)│──────▶│ Sprites / anims      │
│ Manette      │   par joueur │   → nouvel état               │ (lect.)│ VFX, caméra, shake   │
│ Tactile      │   par tick   │ machine à états, frame data,  │        │ UI (vie, timer)      │
│ IA (CPU)     │              │ collisions, rounds            │        │ Audio (via événements)│
└──────────────┘              └───────────────────────────────┘        └──────────────────────┘
```

### 2.2 Les 4 invariants

| Question | Réponse |
|---|---|
| **Où vit l'état ?** | Un unique objet `GameState` (sérialisable, plain data) possédé par le cœur. Phaser ne le modifie **jamais** ; il le lit. Les sprites sont une projection jetable. |
| **Où vit le retour d'info ?** | Overlay debug (hitbox/hurtbox/pushbox, n° de frame, état courant, frame advantage), affichage des inputs, *frame-step* en pause, compteur FPS/temps de tick, hash d'état pour détecter une désynchro. |
| **Qu'est-ce qui casse si je supprime X ?** | Couplage à sens unique : `core` n'importe rien ; `input` et `render` dépendent de `core`, jamais l'inverse. Supprimer le rendu = le cœur tourne toujours (tests headless). |
| **Quand le timing marche-t-il ?** | Tick fixe 60 Hz via accumulateur ; ordre de résolution **fixe et symétrique** (voir 2.4) pour qu'aucun joueur ne soit avantagé par l'ordre de traitement. |

### 2.3 Déterminisme (prépare le rollback / replays / tests)
- Positions/vitesses en **entiers** (unité = 1/100 px). Pas de `float` dans la logique de jeu.
- **Pas de `Math.random()`** ni de `Date.now()` dans le cœur : PRNG à graine stocké dans `GameState`.
- `step()` est une **fonction pure** : mêmes entrées → même état. Test automatique : rejouer une séquence d'inputs 2× → hash identique.
- Bénéfices immédiats : **replays**, reproduction de bugs par fichier d'inputs, tests de non-régression. Bénéfice futur : **rollback netcode**.

### 2.4 Ordre de résolution d'un tick (fixe)
1. Lire les inputs des 2 joueurs → buffer d'inputs (historique ~30 frames)
2. Si *hitstop* actif : décrémenter et sortir (gel)
3. Transitions de machine à états (les 2 joueurs, à partir de l'état **précédent**)
4. Mouvement + gravité + sol
5. Résolution des **pushbox** (personnages ne se traversent pas) + murs/bords de caméra
6. Détection hitbox↔hurtbox **pour les deux joueurs simultanément** (→ échanges de coups possibles)
7. Application des coups (dégâts, hitstun/blockstun, recul, hitstop)
8. Timer, KO, fin de round
9. Émission d'événements (`hit`, `block`, `ko`…) pour le son/VFX — consommés par la présentation

### 2.5 Machine à états du combattant
`Idle · Walk(F/B) · Crouch · PreJump · Air · Landing · Attack(startup→active→recovery) · Hitstun · Blockstun · Knockdown · Wakeup · Throw/Thrown · KO · Win`

### 2.6 Frame data (données, pas code)
Chaque coup est une donnée déclarative, versionnée, testable :

```ts
type Box = { x: number; y: number; w: number; h: number }; // relatif au perso, px

interface MoveData {
  id: string;                 // "5L", "2H", "j.H", "236S"...
  startup: number;            // frames avant la 1re frame active
  active: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  pushback: number;           // 1/100 px
  guard: 'mid' | 'low' | 'overhead';
  cancelInto?: string[];      // ex. normal → spécial
  hitboxes: { frames: [number, number]; box: Box }[];
  hurtboxes?: { frames: [number, number]; box: Box }[]; // surcharge du corps par défaut
  anim: string;               // tag Aseprite
}
```

Les animations sont **pilotées par la frame data** (la logique dit « frame 7 de 5H », le rendu affiche le sprite correspondant) — jamais l'inverse.

### 2.7 Arborescence cible

```
src/
  core/              # ZÉRO import Phaser/DOM
    state.ts         # GameState, création, hash
    step.ts          # la boucle de simulation
    fighter/         # machine à états, physique
    combat/          # collisions, application des coups
    input/           # InputFrame, buffer, détection de motions
    rng.ts
  data/
    fighters/<nom>/  # moves.json, stats.json
    stages/
  input/             # adaptateurs : keyboard.ts, gamepad.ts, touch.ts, ai.ts
  render/            # scènes Phaser : Boot, Menu, Fight, UI, Debug
  audio/
  main.ts
public/assets/       # atlas, sons, polices
tests/
  core/              # Vitest
  e2e/               # Playwright
```

---

## 3. Game design MVP

### 3.1 Format
🟡 **Q2 — « plateforme simple » : quel genre ?**
- **A. Versus classique** (type Street Fighter) : sol plat, murs, barres de vie, rounds, timer. ← *hypothèse de travail de ce plan*
- **B. Platform fighter** (type Smash/Brawlhalla) : plateforme flottante, éjection hors écran, pourcentages. → architecture proche, mais physique, caméra, UI et design très différents.

### 3.2 Règles (hypothèse A)
- 2 rounds gagnants, **99 s** par round, KO / temps écoulé / double KO
- Stage ≈ 2 écrans de large, caméra centrée sur les joueurs, distance max = largeur d'écran
- **Garde** : maintenir arrière (haut) / bas-arrière (bas) — pas de bouton de garde, standard du genre
- **Chope** : Léger + Lourd, à courte portée, *tech* possible (option)
- **Input buffer** : 4–6 frames (indulgent, crucial sur mobile)

### 3.3 Contrôles
| Action | Clavier P1 | Clavier P2 | Manette | Mobile |
|---|---|---|---|---|
| Directions | WASD | Flèches | Stick / croix | Joystick flottant (moitié gauche) |
| Léger | J | Num1 | X / □ | Bouton |
| Lourd | K | Num2 | Y / △ | Bouton |
| Spécial | L | Num3 | B / ○ | Bouton |
| Saut | Espace / ↑ | ↑ | A / ✕ | Bouton (+ haut du joystick) |

Spéciaux accessibles **deux façons** : manipulation classique (quart de cercle ↓↘→ + S) **ou** simplifiée (direction + S), avec un léger bonus de dégâts pour la manip classique (principe des « contrôles modernes » de SF6). 🟡 **Q3**

### 3.4 Moveset MVP par personnage (~12 coups)
- Normaux : debout L/H, accroupi L/H, saut L/H
- 3 spéciaux : `S`, `→+S`, `↓+S` (ex. projectile, avancée, anti-air)
- 1 chope
- 1 super (barre qui se remplit) — *optionnel MVP*

### 3.5 Les deux personnages
Deux archétypes **contrastés** pour que le matchup soit intéressant :
- **Perso 1 — polyvalent** : projectile, anti-air fiable, vitesse moyenne
- **Perso 2 — rushdown** : rapide, portée courte, pression, pas de projectile

🟡 **Q4 — univers/thème ?** Le nom « NayosBeat » évoque la musique : thème rythmique/musical ? Autre ? Tu as déjà des persos en tête ?

### 3.6 Budget d'animation (réaliste)
| Lot | Frames / perso |
|---|---|
| Idle, marche AV/AR, accroupi, saut, atterrissage | ~30 |
| 6 normaux | ~40 |
| 3 spéciaux + chope | ~35 |
| Touché, garde, chute, relevé, KO, victoire | ~30 |
| **Total** | **~130–150** |

⚠️ **L'art est le goulot d'étranglement du projet**, pas le code. À 80–96 px, compter plusieurs semaines par personnage pour un artiste solo. D'où :
1. Gameplay entier jouable en boîtes grises (placeholders procéduraux possibles)
2. Un set **réduit** (~60 frames) pour la première version illustrée
3. Puis enrichissement

🟡 **Q5 — Qui fait l'art ?** Toi / un artiste / assets libres (CC0, itch.io) / placeholders générés en attendant ?

---

## 4. Rendu pixel art « HQ » sur petite config

- Résolution interne **480×270**, rendue dans un canvas puis agrandie en **entier** (×2, ×3, ×4…), bandes noires si besoin
- `image-rendering: pixelated`, `pixelArt: true` / `roundPixels: true` côté Phaser → zéro flou, zéro « pixel qui tremble »
- Sur mobile (ratios variés) : échelle entière si possible, sinon *nearest* non entier (léger compromis, inévitable)
- **Atlas de textures** ≤ 2048×2048, un atlas par perso → très peu de draw calls
- « HQ » vient de la **direction artistique** (palette limitée cohérente, contours sélectifs, animation avec *smears*/anticipation, hit sparks, screen shake, hitstop), pas de la résolution
- 🟡 **Q6** : 480×270 (persos ~90 px, plus rapide à produire) **ou** 640×360 (persos ~120 px, plus de détail, ~1,8× plus de pixels à dessiner par frame)

### Budgets de performance (cibles)
| Métrique | Cible |
|---|---|
| FPS | 60 stables sur iGPU ~2015 et Android milieu de gamme ~2019 |
| Tick logique | < 1 ms |
| Draw calls | < 50 |
| Téléchargement initial | < 10 Mo |
| Latence input → écran | ≤ 3 frames PC, ≤ 5 frames mobile (le tactile ajoute de la latence navigateur) |

---

## 5. Spécifique mobile

- **Paysage forcé** : overlay « tourne ton téléphone » ; verrouillage d'orientation quand le navigateur le permet (Android en plein écran ; pas sur iPhone)
- **Plein écran** + **PWA** (icône sur l'écran d'accueil, lancement sans barre d'adresse)
- Contrôles : multi-touch, joystick **flottant** (apparaît sous le doigt), boutons ≥ 48 dp, taille/opacité réglables, zones mortes 8 directions
- `touch-action: none`, pas de zoom/scroll/menu contextuel, *safe areas* (encoches)
- **Audio débloqué au premier toucher** (contrainte iOS/Android)
- Vibration sur coup reçu (Android uniquement, iOS ne la supporte pas en web)
- Manettes Bluetooth fonctionnent aussi via Gamepad API
- 2 joueurs sur un même téléphone : **non** en MVP (inconfortable) → **vs CPU**

---

## 6. IA (CPU) MVP
- Machine à états simple : approcher / garder la distance / poke à portée / anti-air / garder
- Difficulté via **délai de réaction** (ex. 20 frames facile → 10 difficile) et probabilités — l'IA ne lit **que** l'état visible, pas les inputs futurs (équité)
- Utilise le PRNG du `GameState` → reste déterministe (rejouable)
- Elle produit des `InputFrame` exactement comme un humain → aucun code spécial dans le cœur

---

## 7. Feuille de route

Chaque jalon se termine par une **build jouable** testée sur PC **et** téléphone.

| # | Jalon | Contenu | Définition de « terminé » | Taille |
|---|---|---|---|---|
| **M0** | Fondations | Vite+TS+Phaser, lint, Vitest, CI, boucle fixe 60 Hz, scaling pixel-perfect, overlay debug | Écran vide qui tourne à 60 Hz, CI verte, déployé sur un lien | S |
| **M1** | Boîtes grises qui bougent | 2 rectangles, marche, saut, accroupi, pushbox, murs, caméra ; **clavier + manette + tactile** | Les 2 bougent correctement sur PC et téléphone | M |
| **M2** | Le premier coup | 1 coup L, hitbox/hurtbox, hitstun, garde, hitstop, vie, KO, rounds, timer | Un match complet est jouable ; tests de collisions et de frame data | M |
| **M3** | Moveset complet (gris) | ~12 coups/perso, buffer, motions, cancels, chope, 2 archétypes distincts | Les 2 persos sont différents et le matchup se joue ; test de déterminisme | L |
| **M4** | CPU + entraînement | IA 3 niveaux, mode training (affichage inputs/frame data, reset position) | Jouable seul sur mobile | M |
| **M5** | Pipeline art | Aseprite → atlas → animations synchronisées à la frame data ; perso 1 (set réduit) | Perso 1 illustré, hitboxes alignées sur le sprite | L (art) |
| **M6** | Perso 2 + stage | Perso 2 (set réduit), décor du stage (parallaxe simple) | 2 persos illustrés sur un vrai stage | L (art) |
| **M7** | Game feel | Hit sparks, screen shake, ralenti KO, SFX, musique, annonceur, UI vie/super | « Ça claque » au test aveugle | M |
| **M8** | Menus & finition | Titre, sélection perso, options (remapping, volume, contrôles tactiles), pause | Boucle complète titre → match → revanche | M |
| **M9** | Distribution | PWA, `.exe` via Tauri 2, APK optionnel | Installable sur PC et Android | S |
| **Plus tard** | — | Rollback en ligne (WebRTC), plus de persos/stages, replays | — | XL |

**Ordre volontaire** : le tactile arrive dès **M1** (pas à la fin) pour révéler tôt le risque principal — la jouabilité mobile d'un jeu de combat.

---

## 8. Qualité & tests

- **Unitaires (Vitest)** sur le cœur : transitions d'états, collisions, application des coups, motions (↓↘→), buffer, rounds
- **Validation des données** : chaque `MoveData` est vérifiée au chargement (frames cohérentes, boîtes non vides) → *fail fast*
- **Déterminisme** : rejouer un fichier d'inputs → hash final identique
- **Régression par replay** : chaque bug corrigé = un fichier d'inputs + l'état attendu
- **Smoke E2E (Playwright)** : le jeu démarre, un match se lance, capture d'écran
- **Tests manuels** : checklist PC (clavier, manette) + téléphone (Android Chrome, iOS Safari) à chaque jalon

---

## 9. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Production de l'art sous-estimée | 🔴 | Boîtes grises d'abord, set d'anims réduit, placeholders |
| Tactile peu précis/latent | 🔴 | Tactile dès M1, buffer indulgent, contrôles simplifiés, tests réels sur téléphone |
| Bizarreries iOS Safari (plein écran, audio, orientation) | 🟠 | PWA, déblocage audio, overlay d'orientation, tests iOS tôt |
| Scope creep (3e perso, online…) | 🟠 | Périmètre MVP figé (ce document), le reste en « plus tard » |
| Non-déterminisme qui s'infiltre (floats, `Math.random`) | 🟠 | Règle lint dans `core/` + test de hash |
| Licences d'assets tiers | 🟡 | Uniquement CC0/licence explicite, fichier `CREDITS.md` |

---

## 10. Questions à trancher avant M0

| # | Question | Ma recommandation |
|---|---|---|
| **Q1** | Stack : Phaser 4 + TS (web) ou Godot 4 ? | Phaser 4 + TS |
| **Q2** | Genre : versus classique (SF) ou platform fighter (Smash) ? | À toi — le plan suppose versus classique |
| **Q3** | Contrôles : manips classiques + simplifiées, ou simplifiées seulement ? | Les deux |
| **Q4** | Thème / univers / persos ? | À toi |
| **Q5** | Qui produit l'art ? | Placeholders générés jusqu'à M4, puis à voir |
| **Q6** | Résolution : 480×270 ou 640×360 ? | 480×270 |
| **Q7** | Déployer les builds de test sur GitHub Pages (public) ? | Oui, c'est le plus simple pour tester sur téléphone |
| **Q8** | Online un jour ? (ça ne change pas le MVP, mais justifie le cœur déterministe) | Oui « plus tard » |
