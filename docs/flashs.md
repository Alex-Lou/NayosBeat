# Flashs maîtrisés

*VFX, accessibilité et level design : comment NayosBeat frappe fort sans jamais clignoter. La règle D21 de `combat-v2.md` (« au plus 3 flashs par seconde ») est mise en œuvre ici.*

**En bref.** Aucun voile ne couvre plus l'écran entier. Le punch passe par :
- le gel du cœur (inchangé) ;
- la mise au noir du décor ;
- un éclat de lumière derrière les combattants ;
- une secousse lissée ;
- le son, et la vibration des téléphones et des manettes ;
- la jauge du HUD qui se fissure ou éclate.

La livraison s'est faite en trois étapes, **toutes faites** : l'étape 1 a retiré les vrais dangers (§2) ; les étapes 2 et 3 ont ajouté le budget de flashs et les options du joueur (§4).

---

## 1. Les règles

### 1.1 Ce qui compte comme un flash

- **Luminance.** Un flash est un changement de luminance relative WCAG d'au moins **ΔL 0,10**, suivi d'un retour, avec une image sombre sous L 0,8. Sur la scène grise, c'est toujours le cas : le ciel `#1b1b2f` est à L 0,012, le sol `#3a3a5c` à L 0,047.
- **Surface.** Il ne compte qu'au-delà d'une surface **affichée**, au zoom courant de la caméra, toutes pièces additionnées sur 3 images :
  - effets normaux : **2 520 px² de la vue** 480×270, soit 1 200 px² monde au gros plan maximal (×1,45, ×2,1 en surface) et 70 % du seuil du W3C (3 596 px² pour 1024×768) ;
  - effets réduits ou aucun : **1 100 px² de la vue**, un écran de 27" à 50 cm, soit 523 px² monde au gros plan maximal ;
  - au-delà de ×1,45 (le Finisher), la même surface affichée : 630 px² monde à ×2,0 en normaux.
- **Cadence.** Pas plus de 3 flashs par seconde (WCAG 2.3.1, ITU-R BT.1702).
- **Rouge saturé.** Une couleur dont `R / (R + G + B) ≥ 0,8`, calculé sur les canaux **linéarisés**, flashe quelle que soit sa luminance. Aucune couleur de voile ou d'énergie n'y arrive (test). `src/render/luminance.ts` fait ces calculs.

### 1.2 Les voiles

- **Couleur.** Leur alpha se calcule à partir de leur couleur et des grandes couleurs de la scène (`alphaForDelta`). Ainsi, un voile cyan et un voile magenta frappent pareil, alors qu'avant le KO cyan était 2,4 fois plus fort que le rose.
- **Plafond.** Ils ne changent jamais la scène de plus de **ΔL 0,08** (0,05 pour la vignette en effets réduits). Deux exceptions, qui flashent et que le budget compte : l'éclat de l'Ultime, en son cœur (11 340 à 14 340 px² monde à ΔL ≥ 0,1), et le halo de la super (945 px² monde).
- **Courbe.** Ils montent en 3 à 4 images, tiennent, puis redescendent en 14 à 30 images (smoothstep). Plus jamais de front d'une seule image.
- **Couleurs.** On n'enchaîne jamais deux voiles de couleurs différentes à moins de 60 images. Le second est ignoré, par exemple en cas de double KO.

### 1.3 La secousse

- **Modèle.** Un trauma qui décroît (1/48 par image), et une amplitude en **trauma²** de 8 px au plus (Eiserloh, GDC 2016).
- **Lissage.** Entre deux cibles, la caméra fait un demi-tour toutes les 4 images au plus, soit 7,5 Hz. Avant, elle s'inversait à chaque image, soit 30 Hz.
- **Graine.** Le hasard est à graine fixe : la même secousse pour les mêmes événements.
- **Premier élan.** L'image part d'abord dans le sens du coup.
- **Option.** « Tremblement de l'écran » : normal, réduit (deux fois moins loin) ou aucun. Sans choix du joueur, le réglage système (`prefers-reduced-motion`) le met à « aucun ». Les vibrations restent.
- **La victime tremble** pendant l'arrêt sur image (`hit-shake.ts`, `docs/art/animation-plan.md` §2, V1) : son dessin seul, de ±1 px (coup léger, garde) ou ±2 px (coup lourd, CONTRE, PUNITION, KO), qui change de côté tous les 2 tics du jeu. Réduit : 1 px au plus. Aucun : immobile.

| Événement | Trauma | Pic |
|---|---|---|
| Coup lourd, frappe de super | 0,65 | 3 px |
| Projection, chute (le corps KO en l'air compris, sauf après le Finisher) | 0,45 | 2 px |
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

## 4. Étapes 2 et 3 : le budget et les options (faites)

### 4.1 Le budget de flashs (`src/render/flash-budget.ts`)

Un seul budget par combat, pour les deux joueurs. `FightScene` le crée, le fait avancer sur l'horloge visuelle (`visualClock`, des pas de 1/60 s que le ralenti du KO ne ralentit pas et que la pause arrête) et lui donne le zoom de la caméra à chaque image. Tout ce qui s'allume pendant une image le demande au même moment.

**Ce qui est compté.** Ce qui s'allume en même temps s'additionne, à 2 images près (`FLASH_MERGE`) : la gerbe, le mot, le tampon, l'éclat, le halo, ce que chaque nouvelle image d'un fx de planche allume de neuf, ce qu'un effet étouffé montre quand même, et le HUD (en px² de vue, que le zoom ne grossit pas) : le blanc d'un coup sur la barre de vie, l'annonce (« K.O. », « ROUND 1 »…), la barre et la jauge qui éclatent sous l'Ultime. Si la somme, au zoom courant, atteint 90 % de la surface du mode (`FLASH_MARGIN` : le reste couvre ce qu'un navigateur dessine en plus des mesures), c'est un flash, et il lui faut un créneau.

**Ce qui attend compte aussi.** Le budget garde ce qui s'allumera plus tard (un mot, un tampon qui attendent) à l'image où cela s'allumera. Chaque demande additionne ce qui s'allume dans les 3 images de chaque flash qu'elle pourrait commencer, avant comme après elle : une gerbe accordée 2 images avant un tampon qui attend s'additionne avec lui. Rien ne s'affiche sans passer par le budget : chaque pièce demande (`request`, qui peut prendre un créneau), entre si elle ne fait pas de flash (`admit`), ou attend une image où elle n'en fait pas (`place`).

| Règle | Normaux | Réduits | Aucun |
|---|---|---|---|
| Surface (px² de la vue) | 2 520 | 1 100 | 1 100 |
| Flashs par seconde glissante, climax compris | 3 | 2 | 0 |
| Dont ordinaires | 2 | 1 | 0 |
| Écart minimal avant un ordinaire | 21 images | 60 | — |
| Flashs sur 5 s, dont le dernier réservé à un climax | 8 | 4 | 0 |

- **Climax** : tout KO, et la dernière frappe d'une super (palier 3, pas `pulse`). Il peut prendre le dernier créneau de la seconde et des 5 s, et n'attend pas l'écart.
- **Fusion** : ce qui s'allume 2 images au plus après un flash compté s'allume avec lui, sans compter, sauf s'il s'additionne à ce qui attend juste après (il ferait alors un flash de plus).
- **Décision une fois par tic** : `FightFeedback` met les coups d'un tic de côté (`react`), puis `endTick` demande une seule fois pour leur somme. Un échange de coups fait un flash ou aucun, jamais deux.
- **Les fx de planche** (`FxGate`, `FxPixels`). Chaque image d'un fx est lue une fois dans sa texture. Une nouvelle image demande ce qu'elle allume de neuf : les pixels qui changent le ciel ou le sol d'au moins ΔL 0,1 et que l'image d'avant, au même endroit, n'allumait pas déjà (à ΔL 0,1 près). Toute l'image si le combattant a bougé ou s'est retourné, ou au début du clip. Le fx demande sur son image, qu'il y ait contact ou non : une super parée ou ratée est comptée aussi. Ainsi l'Uppercut qui touche reste clair : après son image tenue pendant le gel, la suivante allume 1 235 px², dont 633 seulement de neuf.
- **Le HUD demande lui-même** (`Hud`, `HealthBar`) : le blanc d'un coup sur la barre, refusé, laisse le coup rouge tout de suite ; l'annonce, refusée, s'écrit dans le sombre des fx (`FX_DARK`). L'éclatement de la barre et de la jauge sous l'Ultime (`SHATTER_VIEW` : 1 700 px² de vue avec les éclats chauds, 580 sans) entre dans la demande du KO ; refusé, il passe avant la gerbe étouffée, et s'il ne tient pas non plus, la barre et la jauge éclatent immobiles (sans éclats).

**Surfaces mesurées** (px² monde à ΔL ≥ 0,1, coloris le plus clair) :

| Pièce | Nayo | Riff |
|---|---|---|
| Gerbe légère, lourde, KO | 400, 1 330, 3 300 | 120, 490, 920 |
| Gerbe `pulse` (aussi le lourd étouffé), KO étouffé | 430, 440 | 490, 440 |
| Uppercut, Montée platine (pic) | 1 235, 1 218 | — |
| Super (anneaux s2, s3, s4 / onde du Slam) | 775, 708, 1 491 | 367 |
| Mots au pic du pop (×1,24) / calmes, sans compteur | léger 431 / 245, lourd 700 / 285, KO 1 538 / 330 | idem |
| Compteur « xN » (pop / calme, par chiffre en plus du « x ») | léger 36 / 31, lourd 57 / 36, KO 110 / 42 | idem |
| Tampon le plus large (« DÉGAGEMENT ! ») : frappé à ×1,6 / calme | 1 792 / 410 | idem |

Les gerbes sont mesurées sur la vraie `HitFx` (test, hasard à graine fixe), les fx sur les vraies planches. Les mots et les tampons sont mesurés sur leurs lettres : le test lit les contours des polices (Bangers, Press Start 2P), les remplit, les encre et pose leur ombre comme le fait le `Text` de Phaser, dans chaque coloris, et vérifie que la table les couvre à 5 % près. Un compteur n'allume jamais plus que son « x » et ses chiffres pris un à un : un « x123 » compte trois chiffres.

**Un flash refusé s'étouffe**, il ne disparaît pas :
- **la gerbe** joue sa version étouffée : le lourd prend la silhouette `pulse` (sans la clé blanche ni le splash), le KO la nouvelle `koMuted`. Si même la version étouffée dépasserait la surface avec ce qui brille déjà (un double KO, budget épuisé, l'éclatement de l'Ultime au gros plan), elle n'est pas jouée : il reste le mot, le son, la secousse, le ralenti ;
- **le mot arrive calme 8 images plus tard au moins, le tampon 8 images après son mot** (`MUTED_DELAY`) : plus petits, sans pop ni frappe, leurs pics ne s'additionnent ni à la gerbe ni entre eux. S'ils ne tiennent pas là (un échange, un double KO, un autre mot qui attend), ils glissent de 4 images en 4 images (`place`, 4 essais), sinon ils ne s'affichent pas (le compteur compte quand même). Les vues comptent leur attente à partir de l'image suivante (`settle`) : une pièce gardée pour l'image N s'affiche à l'image N, à 60 comme à 30 Hz ;
- **les tampons hors coups** (REMIX, Rewind, super, DÉGAGEMENT, PUNITION) et **le mot d'une projection** demandent comme un coup ; refusés, ils passent calmes, tout de suite s'ils tiennent, plus tard sinon. **L'étincelle de garde** ne se joue que si elle ne fait pas de flash ;
- **le blanc d'un coup sur la barre de vie** n'est pas joué ; **l'annonce** s'écrit sombre ;
- **le fx de planche passe sombre** (multiplié par `FX_DARK` `#4C5266`, ΔL ≤ 0,073), de l'image refusée jusqu'à la fin du clip : il ne redevient jamais clair dans le même clip, et sa dissolution reste sombre ;
- **l'éclat de l'Ultime devient un éclat d'encre** `#0C0614` à 0,60 qui assombrit ;
- **le halo de la super** n'est pas joué : il reste la mise au noir.

Le hitstop, les dégâts et le timing ne bougent jamais : le budget ne touche pas au cœur (D17).

**Vérifié par les tests** :
- `flash-budget.test.ts` : les règles, une par une, et 2 000 flux au hasard où l'on compte ce qui est **affiché** (versions étouffées comprises, mots et tampons qui attendent à l'image où ils s'affichent) : jamais plus de 3 / 8, 2 / 4, 0 / 0 ;
- `flash-cadence.test.ts` : 13 routes jouées sur le vrai moteur, leurs événements dans le vrai `FightFeedback`, les fx des vraies planches dans leurs portes (en pixels neufs) et le vrai HUD, un tic par image, au gros plan maximal. Parmi elles, un CONTRE suivi de légers, un échange de deux CONTRE et un double KO. Jamais plus que le mode ne permet, ni deux ordinaires plus proches que l'écart en réduits, et rien en aucun ; le KO garde sa grosse gerbe en normaux ; la Mégabasse qui tue fait 3 flashs (le tampon et le halo, la 1re frappe avec ses anneaux, le KO et son éclat), la 2e frappe étouffée ; « L, ←L, ←L, ←L » n'en fait aucun en normaux, un au plus en réduits ; l'Uppercut qui touche reste clair. Puis des séquences d'événements, dans les trois modes : un léger 15 images après un CONTRE, deux CONTRE à 8 images, un échange, un double KO ;
- `delayed-words.test.ts` : les vrais `Onomatopoeia` et `Stamps`, dans l'ordre de `FightScene`, à 60 et à 30 Hz : chaque mot et chaque tampon s'affiche à l'image même où le budget l'a gardé ;
- `flash-areas.test.ts` : mesuré ≤ table pour chaque gerbe, chaque mot, chaque compteur, chaque tampon et chaque lettre d'annonce, dans chaque coloris ; chaque version étouffée seule, et chaque mot ou tampon calme seul, sous 90 % de la surface des modes réduits au gros plan maximal ; la liste des planches qui allument plus de 300 px² (Uppercut, Montée platine, super) ;
- `health-bar.test.ts`, `hud.test.ts` : l'éclatement mesuré sous `SHATTER_VIEW`, sur le ciel et sur la bande du HUD ; le blanc d'une barre et l'annonce qui demandent au budget ; la casse immobile.

### 4.2 Les options du joueur (`src/app/comfort.ts`)

| Option | Valeurs | Ce qu'elle change |
|---|---|---|
| Effets de flash | normaux, réduits, aucun | Le mode du budget. En réduits et en aucun (« calme ») : mots plus petits (12, 13 et 14 px au lieu de 13, 17 et 26) sans pop, tampon à 11 px sans frappe, avec un fondu, assez petits pour ne jamais flasher seuls au gros plan ; une seule rémanence Boost à 0,22, traînée de dash sous ΔL 0,08 (0,27 en cyan, 0,28 en or), anneau de prise blanc fixe, vignette du KO à ΔL 0,05, éclat de l'Ultime à ΔL 0,08, pas de halo, ni blanc des coups ni éclats chauds sur le HUD. En aucun, tout coup joue sa version étouffée, l'éclat est à l'encre, tout fx de planche est sombre, et les annonces le sont dès qu'elles flasheraient. |
| Tremblement de l'écran | normal, réduit, aucun | La secousse (réduit : deux fois moins loin) et le tremblement de la victime pendant le gel (réduit : 1 px au plus). Aucun garde aussi immobiles la victime, le HUD, l'idle de la sélection et le vinyle du titre. |

- **Défaut.** Ce que le joueur a choisi prime. Sinon, le réglage système « réduire les animations » donne « réduits » et « aucun », sinon « normaux » et « normal ». `watchReducedMotion` suit le système quand il change.
- **Persistance.** Comme le son : `nayosbeat.flashes` et `nayosbeat.shake` dans le stockage de la page, et `saveComfort` n'écrit que l'option changée. Un stockage refusé (navigation privée) garde le choix pour la session.
- **L'écran « Options »** remplace « Son » dans le menu principal (indication « Son, effets de flash, tremblement »). Il contient le son et les deux options ; chacune tourne sur place et la sélection reste dessus. « Retour » revient sur « Options ».
- **Depuis la pause**, une entrée « Options » ouvre le même écran par-dessus le combat. Le changement s'applique **à chaud** (`FightScene.applyComfort`) : budget, secousse, mots, tampons, HUD, anneau de prise, rémanences et dissolution relisent leur réglage à chaque image.
- **L'avis du premier lancement** (`nayosbeat.notice`) : après l'écran titre, une fois, « Avant de jouer », avec « Jouer » et « Options ». Il dit le risque (« des crises convulsives »), les signes à surveiller (vertige, trouble de la vue, contractions des yeux ou du visage, mouvements involontaires, désorientation, perte de conscience) et d'arrêter tout de suite de jouer puis de consulter un médecin s'ils apparaissent, comme les avertissements des consoles, puis les précautions. Il complète le travail sur les effets, il ne le remplace pas (XAG 118). Les mots « épilepsie » et « sans danger » n'apparaissent dans aucun libellé. Un appui dans la première seconde est ignoré (le second appui d'un titre passé en hâte) ; « retour » ramène au titre sans marquer l'avis lu : seuls « Jouer » et « Options » le font.
- **Les menus** reçoivent les classes `calm` (l'invite du titre ne clignote plus, la case choisie ne pulse plus) et `still` (le vinyle du titre ne tourne plus) ; le bloc `@media (prefers-reduced-motion)` a disparu.

### 4.3 Le HUD : deux drapeaux

`HudComfort` remplace l'ancien `reducedMotion` de la barre de vie et de la jauge :
- `flashes` (effets de flash normaux) : le blanc d'un coup sur la barre, le clignotement de « MAX », le balayage de la jauge, le reflet chaud des éclats d'un KO (mêlés à 45 % de blanc sur la barre, la rangée claire de leur barre sur la jauge, blanche à 3 barres) ;
- `motion` (tremblement pas à « aucun ») : les secousses, les éclats et les morceaux d'un KO, les braises du danger, la rotation du vinyle.

En effets réduits, les éclats de la jauge et de la barre restent, sans leur reflet chaud : ce qu'ils allument quand même (le verre vide, le liseré) est compté avec le KO (`SHATTER_VIEW`).

### 4.4 Écarts au design

- **Le seuil suit le zoom courant** (2 520 px² de vue en normaux), pas un seuil monde fixe : au gros plan maximal, c'est le même 1 200 px² monde.
- **Le seuil des modes réduit et aucun est de 1 100 px² de vue** (27" à 50 cm), au lieu de 1 680. Le KO étouffé a donc été rapetissé (440 px² au lieu de 634) pour ne jamais flasher seul.
- **Les fx sont mesurés sur leurs planches, à l'exécution**, au lieu d'une table par coup : l'Uppercut allume 1 235 px² et non 630, les anneaux s4 1 491.
- **Le fx étouffé est sombre (multiplié), pas une silhouette d'encre** : sa forme et sa teinte restent lisibles, il ne cache pas plus les corps que la version claire, et il est choisi au fil du clip, jamais rallumé.
- **Le halo de la super reste** en normaux, compté comme un effet ordinaire ; c'est lui qui donne le platine quand la mise au noir ne se voit guère.
- **« Tremblement » a trois valeurs** (normal, réduit, aucun), comme le demande `finisher.md` §4.5, au lieu d'un oui / non.
- **Une marge de 10 %** (`FLASH_MARGIN`) sous la surface du mode : le budget n'accepte plus une pièce estimée à 99,96 % du seuil.
- **Les mots et les tampons calmes sont plus petits**, pas seulement sans pop : mesurés, le « BOUM ! » du KO à 26 px et le tampon « DÉGAGEMENT ! » flashaient seuls au gros plan, même sans rien autour. Un mot ou un tampon étouffé arrive calme, quel que soit le mode.
- **En réduits, « COMBAT ! » suit « ROUND n » de 45 images** : le budget le refuse (un ordinaire par seconde) et il s'écrit sombre.
- **Avec les flashs à aucun, le KO par l'Ultime ne joue pas de gerbe** : l'éclatement de la barre et de la jauge prend la place (580 + 925 px² de vue dépasseraient 990).
- **Pas encore fait** :
  - les lumières de décor comptées dans le budget (il n'y a pas encore de stage de la phase 6) ;
  - la traînée de dash en normaux : 0,45 sur la silhouette, soit ΔL 0,16 en cyan et en or, ni bornée ni comptée (seule la version calme l'est) ;
  - la vibration de l'attaquant en mode calme ;
  - rallumer un fx sombre quand son image fusionne avec un flash compté (les anneaux s4 de la Mégabasse sur le climax) : la règle « jamais rallumé dans le même clip » reste ;
  - la vérification des mesures des lettres par une capture du navigateur, et le passage des replays dans IRIS.
