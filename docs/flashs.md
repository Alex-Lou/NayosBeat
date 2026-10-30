# Flashs maîtrisés

*VFX, accessibilité et level design : comment NayosBeat frappe fort sans jamais clignoter. La règle D21 de `combat-v2.md` (« au plus 3 flashs par seconde ») est mise en œuvre ici.*

**En bref.** Aucun voile ne couvre plus l'écran entier. Le punch passe par :
- le gel du cœur (inchangé) ;
- la mise au noir du décor ;
- un éclat de lumière derrière les combattants ;
- une secousse lissée ;
- le son, et la vibration des téléphones et des manettes ;
- la jauge du HUD qui se fissure ou éclate.

La livraison se fait en trois étapes. **L'étape 1 est faite** (§2). Les étapes 2 et 3 sont décrites au §4.

---

## 1. Les règles

### 1.1 Ce qui compte comme un flash

- **Luminance.** Un flash est un changement de luminance relative WCAG d'au moins **ΔL 0,10**, suivi d'un retour, avec une image sombre sous L 0,8. Sur la scène grise, c'est toujours le cas : le ciel `#1b1b2f` est à L 0,012, le sol `#3a3a5c` à L 0,047.
- **Surface.** Il ne compte qu'au-delà d'une surface : **1 200 px² monde** au pic, toutes pièces de la même image additionnées.
  - Au gros plan maximal (×1,45, soit ×2,1 en surface), cela fait 2 520 px² d'écran, soit 70 % du seuil du W3C (3 596 px² pour 1024×768).
- **Cadence.** Pas plus de 3 flashs par seconde (WCAG 2.3.1, ITU-R BT.1702).
- **Rouge saturé.** Une couleur dont `R / (R + G + B) ≥ 0,8`, calculé sur les canaux **linéarisés**, flashe quelle que soit sa luminance. Aucune couleur de voile ou d'énergie n'y arrive (test). `src/render/luminance.ts` fait ces calculs.

### 1.2 Les voiles

- **Couleur.** Leur alpha se calcule à partir de leur couleur et des grandes couleurs de la scène (`alphaForDelta`). Ainsi, un voile cyan et un voile magenta frappent pareil, alors qu'avant le KO cyan était 2,4 fois plus fort que le rose.
- **Plafond.** Ils ne changent jamais la scène de plus de **ΔL 0,08**. Deux exceptions, qui flashent : l'éclat de l'Ultime, en son cœur, et le halo de la super, sur une petite surface.
- **Courbe.** Ils montent en 3 à 4 images, tiennent, puis redescendent en 14 à 30 images (smoothstep). Plus jamais de front d'une seule image.
- **Couleurs.** On n'enchaîne jamais deux voiles de couleurs différentes à moins de 60 images. Le second est ignoré, par exemple en cas de double KO.

### 1.3 La secousse

- **Modèle.** Un trauma qui décroît (1/48 par image), et une amplitude en **trauma²** de 8 px au plus (Eiserloh, GDC 2016).
- **Lissage.** Entre deux cibles, la caméra fait un demi-tour toutes les 4 images au plus, soit 7,5 Hz. Avant, elle s'inversait à chaque image, soit 30 Hz.
- **Graine.** Le hasard est à graine fixe : la même secousse pour les mêmes événements.
- **Premier élan.** L'image part d'abord dans le sens du coup.
- **Réduire les animations.** Avec le réglage système (`prefers-reduced-motion`), l'écran ne tremble plus. Les vibrations restent.

| Événement | Trauma | Pic |
|---|---|---|
| Coup lourd, frappe de super | 0,65 | 3 px |
| Projection, chute | 0,45 | 2 px |
| Gel de la super | 0,5 | 2 px |
| KO simple | 0,85 | 6 px |
| KO en fin de combo | 0,92 | 7 px |
| KO par l'Ultime | 1 | 8 px |

---

## 2. Étape 1 : les vrais dangers retirés

| Moment | Avant | Maintenant |
|---|---|---|
| Super (Mégabasse, Slam) | Voile `#f2f6ff` à 63 % sur tout l'écran, HUD compris, ΔL +0,37 en une image. Chez Riff, il partait à f0, 10 tics avant le gel. | Sur le tic du gel (événement `freeze` : Nayo f0, Riff f10), **mise au noir** du décor sous les deux combattants, qui restent éclairés : `#0c0614` à 55 %, 4 images de montée, 18 de tenue, 14 de sortie. **Halo platine** derrière le lanceur, 128 px de diamètre, ΔL 0,2 au cœur, moins de 1 200 px² de flash. Le tampon et le son de la super restent à f0 : une super coupée avant son gel ne se fige pas, mais se voit et s'entend. |
| Frappes de la Mégabasse et du Slam | Trois gerbes lourdes à 3,75 Hz | **Crescendo** : les frappes avant la dernière (`pulse`) jouent une gerbe sans flash (silhouette du lourd, sans clé blanche, sans splash, aura à 0,45) et un petit « BOUM ! » de 13 px. La dernière garde la grosse gerbe. |
| KO simple | Voile plein écran à la couleur du gagnant (ΔL jusqu'à +0,27) | **Aucun voile** |
| KO en fin de combo (3 coups ou plus) | idem | **Vignette** à l'énergie du gagnant sur les bords, sous le HUD : ΔL 0,08 dans les coins, transparente sur 45 % du centre. Ce n'est pas un flash. |
| KO par l'Ultime (une super) | idem | **Éclat** à l'énergie du gagnant, depuis l'impact, derrière les combattants : 480 px de diamètre, ΔL 0,22 au cœur. Il s'éteint avant les bords, puisque le gros plan ne montre que 330 px. C'est le seul vrai flash du KO, sur la même image que la gerbe. |
| Secousse | ±amplitude inversée à chaque image | Lissée, en trauma², 7,5 Hz au plus (§1.3) |

**Ce qui ne change pas :**
- le gel, les dégâts et le timing : le rendu ne touche jamais au cœur (D17) ;
- la vibration des manettes et des téléphones sur l'Ultime ;
- la jauge qui se fissure ou éclate.

**Calques :**
- la mise au noir : un rectangle monde à la profondeur `DEPTH.dim` (0,25), entre le décor et les rémanences ;
- le halo et l'éclat : des images monde à `DEPTH.backdrop` (0,3) ;
- la vignette : une image écran à la profondeur 9, sous le HUD (10) ;
- les textures `fx:glow` (256 px) et `fx:vignette` (128×72) : blanches, peintes une fois, teintées à chaque voile.

**Code :**
- `src/render/luminance.ts`, `veils.ts`, `shake.ts` et `effects.ts` ;
- l'événement `freeze` et le drapeau `pulse` de `fight-events.ts` ;
- `fight-feedback.ts`.

---

## 3. Level design (stages de la phase 6)

- **Couleurs.** Chaque stage donne ses grandes couleurs (`FeedbackStage.colors`). Les voiles s'y règlent seuls : sur un décor clair, la mise au noir se retient pour rester sous ΔL 0,08.
- **Mise au noir.** Sur la scène grise, elle ne se voit guère que sur le sol (ΔL −0,03). Un stage plus clair la rendra plus marquée, dans la même limite.
- **Lumières du décor.** De petites lumières qui clignotent **en phase** additionnent leur surface : il faut les déphaser ou les compter.
- **Secousse.** Elle fait osciller tout motif contrasté du fond à 7,5 Hz. Il faut éviter les rayures fines et serrées dans les calques du fond.

---

## 4. Étapes suivantes

1. **Budget de flashs** (`flash-budget.ts`). Un seul budget pour les deux joueurs, décidé une fois par tic sur la surface **affichée**. Il permet 3 flashs par seconde au plus, dont 2 ordinaires, le dernier créneau étant réservé au climax (KO, dernière frappe d'une super), et 8 sur 5 secondes. Un flash refusé s'étouffe :
   - la gerbe en variante sans flash ;
   - le fx de planche choisi sombre au début de son clip ;
   - le mot et le tampon décalés de 8 et 16 images.
2. **Option « Effets de flash »** (normaux, réduits, aucun) et « Tremblement ». Elles sont dans un écran Options, dans la pause (appliquées à chaud) et dans un avis au premier lancement. Le HUD reçoit deux drapeaux distincts : `flashes` (flash de barre, clignotement, balayage) et `motion` (secousses, éclats, braises, rotation). Les éclats de la jauge restent, car ils ne sont jamais blancs.
