# NayosBeat : plan final de l'animation

Fluidité, morts variées, réactions variées, vie au repos

> **État : V0 et V1 livrés** (branche `feat/anim-voir`) ; prochaines étapes F1, puis F2 et la porte G1. Écarts au texte ci-dessous :
> - « Animation : d'avant » (`AnimOptions.legacy`) coupe aussi ce que V1 apporte : les horloges des poses de round, le tremblement de la victime et le claquement du KO en l'air. Sinon l'interrupteur ne montrerait aucune différence.
> - `FightMemory` garde déjà le dernier coup reçu par chaque perso (tic, gel, poids, sens) : le tremblement en a besoin, car `state.contacts` ne dure qu'un tic et ne dit pas si le coup était lourd. Un gel qui n'est pas celui du coup (le flash d'une super) ne fait pas trembler. `note(next, events)` est appelé juste après `detectEvents`, et R1 y ajoutera son souvenir.
> - `deaths.ts`, `reactions.ts` et `rest-poses.ts` reprennent le choix d'aujourd'hui (`deathClipOf`, `hitClipOf`, `flightClipOf`, `roundPoseOf`). Les horloges des poses au repos vivent dans `rest-poses.ts` (`restTickOf`), appelé par `clipTickOf`. Les modules ne reçoivent le `ShowContext` que quand ils s'en servent : M1, R1 et P2 l'ajouteront à leur appel (une ligne d'`animation.ts`).
> - `ko.json` n'atteint plus de KO avec les règles d'aujourd'hui : son round 1 finit en plein combat, à 668 contre 416 PV. Les tests et le film du KO prennent le Retourné de Riff sur un Nayo à 1 PV, et le match CPU à graine fixe `cpu:15` (KO de Nayo en l'air, victoire de Riff).
> - Le film est cadré à 480×270 px du monde autour de la caméra du cœur, sans le zoom du jeu (jusqu'à ×1,45). Les scripts `anim:*` tournent avec `--experimental-transform-types`, à cause de `src/ai`.
> - La vitesse imposée se combine au ralenti du KO au lieu de le remplacer. Le `TickPacer(1, n)` donne des images de jeu ; le ralenti du KO y place ses tics (7 pour 20, soit 0,35) et compte sa fenêtre de 50 images dans ce même temps (`FightFeedback.ticksFor`). À ½, la mort dure donc 2 fois sa durée normale, et 4 fois à ¼ ; avant, le ralenti du KO était ignoré, et à ½ la mort passait plus vite qu'à vitesse normale.
> - Au ralenti, un tic ne passe qu'une image sur 2 ou 4 : la manette est interrogée à chaque image (`PlayerInputs.poll`), et ses appuis sont gardés jusqu'à la lecture suivante, comme ceux du clavier et du tactile.
> - Les réglages choisis en entraînement ne valent que pour l'entraînement (le reste de la session). Les matchs CPU et 2 joueurs suivent toujours l'adresse, puisque leur pause n'a pas ces réglages.

- Base : `main` à `39d35ca` (worktree `wt-arm`).
- Sources : les quatre designs, leurs quatre critiques, et les scripts de mesure de `anim-design/<chantier>/` et `anim-design/critique-<chantier>/`.
- Chaque chiffre vient de ces mesures. Une estimation est signalée comme telle.

---

## 0. Pourquoi ce plan, et les règles qui le gouvernent

Le propriétaire a dit, mot pour mot : « je vois pas trop la différence dans la fluidité, dans la variété ni dans les animations, ni dans les morts ».

Les tours précédents ont corrigé des poses (anatomie, bras). Ils n'ont changé ni le nombre d'images, ni le rythme, ni le choix de ce qu'on montre. Les quatre critiques arrivent au même constat. Chaque design promettait un gain que le propriétaire ne verrait pas, pour l'une de ces raisons :
- un gain caché sous la gerbe du coup ;
- une amplitude trop faible pour un téléphone ;
- un endroit que l'œil ne regarde pas ;
- un chiffre qui mesure la règle elle-même ;
- une nouvelle pose qui refait l'ancienne.

**Règle 1. On prouve avant de dessiner.** Aucune planche nouvelle ne part sans une preuve animée validée par le propriétaire. La preuve se joue avant et après, côte à côte, à vitesse réelle et au ralenti, à l'échelle d'un téléphone (480×270 px du monde, zoom de 1,45 au plus), avec la gerbe incrustée. Il y a quatre portes, G1 à G4. Si le propriétaire ne voit pas la différence à une porte, on corrige avant de continuer.

**Règle 2. On vise là où l'œil passe du temps.** Part du temps à l'écran, Nayo / Riff, en CPU contre CPU difficile :

| Ce qu'on voit | Temps à l'écran | État aujourd'hui |
|---|---|---|
| Arrêt sur image (hitstop) | ≈ 20 % | victime figée |
| `airHit` | 7,5 / 7,8 % | ≈ 7 images/s, dernière image tenue tout le vol |
| `knockdown` | 6,3 / 7,2 % | couché 20 tics, puis coupe d'au moins 8 px vers `getup` |
| `hitHigh` | 3,2 / 6,1 % | une seule image d'impact |
| `ko` | 4,5 % (Riff) | toujours la même mort |
| `getup` | 2,3 / 2,6 % | — |
| Poses de round | ≈ 640 tics par match (15 %) | identiques à chaque round |
| `idle` du joueur humain qui attend | 36 à 64 % du combat (`passive-human.ts`) | Nayo bouge de 1 px |

**Règle 3. Les invariants techniques ne bougent jamais :**
- aucun fichier de `src/core` ni de `src/data` n'est modifié, et les 29 replays restent identiques ;
- le rendu ne touche jamais au cœur (D17) ;
- pas d'interpolation entre deux tics (D23) : toute image en plus est dessinée d'avance ;
- les clés gardent leur numéro dans leur bande. `QUICK`, `chainHigh`, `koLanding`, `thrownFall` et les scripts du Finisher restent valides ;
- tout nouveau clip est optionnel et a un repli : au pire, le jeu montre le clip d'aujourd'hui ;
- les boîtes du cœur ne changent pas. Une pose qui dépasse se corrige ; on ne touche jamais aux boîtes.

---

## 1. Vue d'ensemble

### 1.1 Les PR dans l'ordre

| # | PR | Chantier | Dépend de | Durée (jours-agent, estimée) | Le propriétaire voit |
|---|---|---|---|---|---|
| V0 | Outils pour voir : vitesse, A/B, films comparés | transverse | — | 0,75 | un interrupteur « Animation : nouvelle / d'avant » et un ralenti ½ et ¼ en entraînement |
| V1 | Gains immédiats sans art, plus la couture du rendu | transverse (repos, réactions, morts) | — | 0,75 | victoire jouée en entier à chaque round ; victime qui tremble à chaque coup ; KO en l'air qui claque au sol |
| F1 | Recadrage image par image, en atlas | fluidité | — | 1 | rien à l'écran : 63 → ≈ 40 Mo de mémoire vidéo |
| F2 | Moteur d'intermédiaires et planches pilotes | fluidité | F1 | 2 | chutes, KO, réactions et dashs à environ 2 fois plus d'images, en A/B |
| **G1** | **Porte : le propriétaire juge F2 en A/B** | | F2, V0 | — | |
| F3 | Ponts entre clips et vol étiré | fluidité | F2 | 1 | plus de saut au relevé ni à la retombée ; `airHit` bouge pendant le vol |
| F4 | Lissage de toutes les planches | fluidité | F3 | 1,5 | tout le jeu à environ 25 images/s à l'écran |
| F5 | (option) paires de prise planifiées ensemble | fluidité | F4 | 1 | tenir, tabasser, lancer arrière plus fluides |
| M0 | Preuve des 4 morts de Nayo (hors dépôt) → **porte G2** | morts | V0 | 0,5 | 4 morts animées, comparées à aujourd'hui |
| M1 | Mécanique des morts (rendu) | morts | V1, F3, PR 1 du Finisher | 1,5 | rien seul (repli `classic`) ; livrée avec M2 |
| M2 | Planches de mort de Nayo | morts | M1, G2 | 2 | 4 morts distinctes de Nayo, chute au ralenti, chocs |
| M3 | Planches de mort de Riff | morts | M1, G2 | 2 | 4 morts de Riff, dont un vrai effondrement |
| M4 | Sons de mort | morts | M1 | 0,5 | une signature sonore par mort |
| R0 | Preuve des réactions à l'échelle du jeu (hors dépôt) → **porte G3** | réactions | V0 | 0,5 | jongle sans saut, uppercut, chute sonnée |
| R1 | Réactions, lot 1 : rendu et art (Nayo, puis Riff) | réactions | M1, G3 | 1 + 2 × 1,25 | jongle sans saut, corps soulevé, chute sonnée et relevé titubant, coup d'en haut qui écrase |
| R2 | Réactions, lot 2 : `hitHook`, `crumple` | réactions | R1 | 2 × 1,25 | crochet qui fait tourner le buste ; contre qui plie |
| R3 | (option) variantes motivées, `hitBack`, `held` | réactions | R2 et retour du propriétaire | 1,5 | contre et punition plus forts |
| P2 | Repos de Nayo, avec l'écran de sélection → **porte G4** avant l'art | repos | V1, F2 | 2 | rebond de garde lisible, 2 gestes, intros et victoires selon le score |
| P3 | Repos de Riff | repos | P2 (règles) | 1,5 | idem pour Riff |
| P4 | (option) `introMirror` | repos | P3 | 0,5 | — |

Total sans les options : environ 24 jours-agent. Avec les couloirs parallèles décrits plus bas, il faut environ 12 à 14 jours. Ce sont des estimations.

L'ordre demandé est respecté : la fluidité d'abord, car elle change le pipeline de toutes les planches, puis les morts, les réactions et le repos. V0 et V1 passent avant tout le reste, pour trois raisons : ils ne demandent pas d'art, ils touchent des fichiers que les quatre chantiers modifieront ensuite, et ils donnent au propriétaire de quoi voir et comparer dès le premier jour. La correction d'horloge du repos (son ancien lot A) est avancée dans V1 : sa critique demande qu'elle parte tout de suite.

### 1.2 Les couloirs parallèles

```
Couloir rendu     V0 ─ V1 ──────────── F3(rendu) ─ M1 ─ R1(rendu) ─ P2(règles)
Couloir pipeline  F1 ─ F2 ─ [G1] ─ F3 ─ F4 ─ (F5)
Art de Nayo                  M2 ─ R1 Nayo ─ R2 Nayo ─ P2 art
Art de Riff                  M3 ─ R1 Riff ─ R2 Riff ─ P3 art
Preuves (hors dépôt)    M0 [G2] · R0 [G3] · captures P [G4]   pendant F2 à F4
```

- **F1 en parallèle de V0 et V1** : aucun fichier commun (voir §8).
- **Les preuves M0, R0 et les captures du repos** se préparent dans `anim-design/` pendant F2 à F4. Elles ne touchent pas au dépôt.
- **L'art de Nayo et celui de Riff avancent en parallèle.** Leurs fichiers sont disjoints (`tools/sprites/<perso>/`, `src/art/<perso>/`). Dans un même couloir de perso, une seule PR d'art à la fois, parce que `clips.ts`, `sheets.ts`, `poses/index.ts` et `smoothing.ts` du perso sont communs.
- **Les PR de rendu passent en série** (V1 → F3 → M1 → R1 → P2). Elles touchent `animation.ts` et `sprite-fighter-view.ts`. La couture posée par V1 réduit chacune à son propre module, plus une ligne.

---

## 2. Étape 0, transverse : de quoi voir la différence

### V0 : vitesse, A/B, films comparés (0,75 jour)

C'est la réponse directe à « je vois pas la différence » : le propriétaire bascule lui-même entre avant et après, au ralenti, sur le même coup.

**Fichiers**
- `src/loop/tick-pacer.ts` (nouveau, pur). `TickPacer(ticks, frames)` donne exactement `ticks` tics pour `frames` images de `visualClock`, à la Bresenham, sans facteur fractionnaire. Avec un facteur sur `deltaMs`, la gigue de rAF ou un écran à 144 Hz font tenir un tic 1, 2 ou 3 images de façon irrégulière (critique des morts). Le ralenti du KO (M1) le réutilise. On le propose aussi à la PR 3 du Finisher comme primitive de sa piste de tics. La première des deux PR qui arrive l'introduit, et l'autre l'adopte.
- `src/render/fight-scene.ts`, ligne 310 : quand un rythme est imposé, `pacer.advance(visualFrames)` remplace `timestep.advance(deltaMs * timeScale())`, et le ralenti du KO règle ses tics dans les images de jeu qu'il donne (voir l'état, en tête). Sinon, rien ne change.
- `src/render/anim-options.ts` (nouveau) : `AnimOptions { legacy: boolean }`. Chaque chantier lit `legacy` et montre alors le choix d'aujourd'hui :
  - fluidité : les clips des clés ;
  - morts : `classic` ;
  - réactions : les clips actuels ;
  - repos : les règles actuelles.
- `src/app/app.ts` :
  - menu d'entraînement (`chooseDummy`, à côté de « Jauge ») : « Vitesse : normale / ½ / ¼ » et « Animation : nouvelle / d'avant » ;
  - les mêmes entrées dans la pause de l'entraînement, appliquées à chaud ;
  - paramètres d'URL de développement `?anim=avant` et `?vitesse=2` (le dénominateur), valables dans tous les modes et jamais enregistrés. Ils servent à comparer en match CPU, là où les KO arrivent.
- `tools/anim/film.ts` (nouveau). Il joue un replay de `tools/replays` ou un match CPU à graine fixe avec `step()`, et appelle `showFighter` à chaque tic, une fois avec `legacy` et une fois sans. Il enregistre, par tic et par perso : bande, image, x, y, sens, et les contacts. Le même checkout donne donc l'avant et l'après.
- `tools/anim/compare.ts` (nouveau). Il fusionne deux films en une page HTML autonome : deux colonnes, lecture à 60 Hz, vitesses 1, ½ et ¼, pas à pas tic par tic, ×1 à l'échelle d'un téléphone (480×270 px du monde sur 15 cm) et ×2. La gerbe est incrustée : son dessin quand il existe en bande, sinon un disque opaque de 34 px (coup léger) ou 58 px (coup lourd), tenu 7 ou 10 images au point de contact.
- `package.json` : scripts `anim:film` et `anim:compare`. `.gitignore` : `tools/anim/out/`.

**Tests**
- `tests/loop/tick-pacer.test.ts` : 1 tic pour 2 images, 2 pour 3 et 1 pour 4, exacts sur 600 images, à 60 et à 144 Hz avec gigue.
- `tests/render/anim-options.test.ts` : par défaut, `legacy` vaut faux et ne change rien.
- `tests/tools/film.test.ts` : deux passes sur `ko.json` donnent le même film.
- Les replays ne bougent pas : la vitesse ne change que le nombre de tics par image d'écran, pas la simulation.

**Ce que le propriétaire voit** : l'outil, pas encore de différence. On le lui dit.

### V1 : gains immédiats sans art, et la couture du rendu (0,75 jour)

Quatre changements, tous du rendu seul, tous visibles sans aucune planche nouvelle.

1. **L'horloge des poses de round** (vient du repos, vérifiée par sa critique).
   - Dans `clipTickOf` (`src/render/animation.ts:140`) et non après coup, pour ne pas laisser deux horloges de victoire côte à côte.
   - Victoire et `timeOver` : `tic = min(actionFrame, tics depuis la fin du round)`. Le vainqueur démarre au tic 0 quand il se remet en garde (73 cas sur 73 sans saut).
   - Idle en combat : `min(actionFrame, phaseFrame)`. Aujourd'hui l'idle démarre à l'image 5 ou 7, parce que son actionFrame vaut 90 au premier tic (148 cas sur 148).
   - Le choix `finish` / `finale` de l'ancien design est supprimé : après un Finisher, c'est `victory`, et le metteur en scène de la PR 3 l'écrase s'il le veut.
2. **La victime tremble pendant l'arrêt sur image** (proposé par les critiques des réactions et de la fluidité).
   - Nouveau fichier `src/render/hit-shake.ts`, pur : un décalage horizontal de ±1 px du monde (coup léger), ou ±2 px (coup lourd, CONTRE, punition), alterné tous les 2 tics de `state.frame`. `frozen()` fait avancer `frame` pendant le gel, donc c'est déterministe.
   - Il s'applique au perso dont l'action est `hitstun`, `airHit`, `trip` ou `ko` tant que `state.hitstop > 0`, et à 1 px pour `blockstun`.
   - Il ne touche que la position du sprite, pas l'ombre ni le x du cœur.
   - Il respecte « Tremblement de l'écran » (`src/app/comfort.ts`, `isStill`) : réduit donne 1 px au plus, aucun donne 0.
   - Cela touche 100 % des coups, sur environ 20 % du temps d'écran.
3. **Le KO qui retombe du ciel claque au sol** (vient des morts, corrigé par leur critique).
   - `src/render/fight-events.ts` : `detectEvents` émet `fall` avec `ko: true` quand `before.action === 'ko' && before.y > 0 && after.y === 0`.
   - `src/render/fight-feedback.ts` : son `fall` et `TRAUMA.fall`, sans poussière. `fx/ko` dessine déjà la poussière sur f3 à f6, que `koLanding` rejoue.
   - Pour un KO `finale` (après la PR 1 du Finisher), rien : le metteur en scène joue lui-même la retombée.
   - Cela concerne 46 à 50 % des KO, muets aujourd'hui à l'atterrissage.
4. **La couture**, invisible mais décisive pour travailler en parallèle.
   - `showFighter` reçoit un `ShowContext { options: AnimOptions; memory: FightMemory | null }`.
   - Le choix est délégué à trois modules, aujourd'hui des fonctions identité : `src/render/deaths.ts` (depuis `koClipOf`), `src/render/reactions.ts` (depuis `hitClipOf` et `flightClipOf`) et `src/render/rest-poses.ts` (idle, intro, victoire, timeOver).
   - `src/render/fight-memory.ts` (nouveau) : le souvenir de rendu que tient `FightScene`. Il est noté dans la boucle de tics, juste après `detectEvents` (`fight-scene.ts:321`), et remis à zéro dans `init()`. Une revanche repart en phase `intro` sans événement : le souvenir ne doit pas en survivre.
   - `src/render/sprite-fighter-view.ts` : `update(state, frames, context)`.

**Tests**
- `tests/render/animation.test.ts` : les lignes 231 à 243 sont adaptées (la continuité de roundEnd à matchEnd tient toujours). Nouveaux cas : la victoire au tic 0 au premier tic d'idle du vainqueur (sur `ko.json`), l'idle au tic 0 au début du combat.
- `tests/render/flash-cadence.test.ts` est relancé : les fx de victoire de Nayo partiront de l'image 0.
- `tests/render/hit-shake.test.ts` : l'amplitude par cas, 0 hors hitstop, le respect de `isStill`, l'ombre fixe.
- `tests/render/fight-events.test.ts` : `fall` avec `ko: true` sur un KO aérien, une seule fois.
- `tests/render/fight-feedback.test.ts` : pas de poussière en double.
- Les tests existants passent sans changement, puisque les modules délégués sont l'identité.

**Ce que le propriétaire voit**
- La victoire jouée en entier à chaque round. Riff plonge enfin dans son freeze, le poing au ciel de Nayo se voit à chaque round : aujourd'hui, 31 à 39 % des rounds, et la sortie de garde une fois sur 340.
- La victime qui tremble sous chaque coup.
- Les KO en l'air qui claquent au sol.

---

## 3. Chantier 1 : fluidité

### 3.1 Le design retenu

Le mécanisme de base est vérifié par la critique dans le code :
- les clés passent en premier dans la bande et restent intactes (0 pixel changé) ;
- à chaque tic, la même clé est à l'écran qu'aujourd'hui ;
- les images actives ne changent pas ;
- 0 limite dure d'anatomie ;
- le cœur ne change pas.

On le garde :
- tween en espace des articulations (`inbetween`), vrille par le plus court chemin, pied posé qui pivote, contact au sol mesuré sur le dessin ;
- échelle de décision : articulations, puis poings en ligne droite, puis coupe franche, et abandon des doublons de moins d'un pixel de sprite ;
- clés d'abord, intermédiaires après, numérotés « nombre de clés + rang » ;
- `src/art/<perso>/played.ts` généré, et aucune logique de tween dans le jeu ;
- réglage `every: 1,5` par défaut.

Les critiques imposent ces changements :

1. **On fige ce qui doit l'être, et rien de plus.** Sont figées :
   - les entrées actives des seuls coups qui ont une hitbox, une saisie ou un projectile ;
   - l'entrée juste avant une entrée active ;
   - la fin d'étourdissement (`endFrames`) et la dernière tenue ;
   - **toute transition qui traverse un changement de boîte du coup** (`move.hurtboxes[].frames`). Sans cela, `hurtboxes.test.ts` casse : jusqu'à 9,5 px d'écart sur le `chainHeavy` de Nayo et 18 px sur sa super. Relancer `measure-boxes` modifierait le cœur.

   Les coups de déplacement (`dashForward`, `dashBack`, `boostCancel`, Rewind) ne sont plus figés. Aujourd'hui, 13 à 17 de leurs 16 à 22 tics le sont, et le `dashForward` de Nayo reste à 20,2 images/s.
2. **Les paires de prise sont exclues** de F2 à F4 : `hold`, `held`, `pummel`, `throwBack`, `thrownBack`. Deux tweens indépendants ne gardent pas la prise : le cou s'écarte jusqu'à 38 px des poings, pour une limite de 4. Elles ne seront planifiées qu'ensemble (F5, en option), et aucune transition ne traversera une discontinuité de placement : changement de côté, lâcher, passage à `thrownFall`.
3. **Les boucles gardent une cadence régulière** (idle, accroupi, marche, tenue) : toutes les transitions sont découpées pareil, ou aucune. L'idle de Nayo est exclu jusqu'à P2. Avec `every: 1,5`, il deviendrait [6,6,6,3,3,6,6,6,3,3], soit deux à-coups par boucle.
4. **Pas de débordement sur les bandes de posture** (`POSTURE_CLIPS` : idle, block, hitHigh, hitMid, crouch, hitCrouch, jump). Un intermédiaire qui sort de la boîte des clés, bout du gant compris, est écarté par l'échelle, avec une tolérance de 0. On ne met pas d'assertion qui arrêterait `npm run sprites` : la case de `hitHigh` passait de 88 à 89 px.
5. **Où porte l'effort.** Les planches pilotes de F2 sont celles où l'œil passe du temps : vols, chutes, relevés, KO, réactions, dashs. `standHeavy` reste comme témoin. Ses intermédiaires sont presque indiscernables à taille réelle (`ticks-nayo-standHeavy.png`), donc on ne le vend pas comme un gain.
6. **Les coupes entre clips deviennent le plus gros saut** une fois le reste lissé. Médiane 8 px, 90e centile 42 px, 8 129 coupes en 20 min. Les enchaînements déterministes reçoivent donc des ponts (F3).
7. **La dernière image d'`airHit` est tenue pendant tout le vol** : 7,5 % du temps d'écran, à environ 7 images/s. F3 étire la planche sur le vol, avec `ticksToLand`, au lieu de la tenir.
8. **Le contrat avec le Finisher.**
   - Ses clips (`finale`, Rebond, L'Ange) ne sont pas lissés par défaut : c'est à son équipe de les activer, car l'animation limitée et calée sur les temps est voulue.
   - `playedClips` retombe sur le clip des clés quand `played.ts` ne connaît pas un clip ou une bande. La PR du Finisher qui ajoute `finale` ne casse donc ni sa CI ni le jeu.
   - Un helper `playedRange(art, sheet, keyFrom, keyTo)` rend les images jouées d'une plage de clés, pour ses scripts à 1/3 (`jumpForward` f2 à f4 puis `jump` f5).
9. **Les poses de round** (intro, victoire, timeOver) ne sont pas lissées en F4. C'est le repos qui les redessine. Elles gonflaient la bande la plus large (intro de Riff, 4 181 px) et la mémoire, pour des poses vues une fois par round. Elles seront décidées en P2 et P3, dans le budget.
10. **`sheets.ts` garde le nombre de clés.** Seuls `FighterArt.sheets` et `Fighter.sheets` portent le total. Sinon trois tests cassent : `nayo-v2-sprites.test.ts:213-215` et `367-374`, et `riff-sprites.test.ts:50-53`.

### 3.2 F1 : recadrage image par image, en atlas (1 jour)

**Fichiers**
- `tools/sprites/generate.ts` : chaque image est recadrée à sa boîte, avec 2 px de marge, et rangée en étagères sur une page de 2 048 px de large au plus, par bande (corps et fx). Il écrit à côté de chaque PNG un JSON d'atlas au format hash (`frame`, `trimmed`, `spriteSourceSize`, `sourceSize`), que Phaser 4 recadre nativement. `cells.ts` garde la case logique et l'ancre, comme aujourd'hui, et gagne l'étendue opaque de chaque image : M1 en a besoin pour les coins.
- `src/art/strip-urls.ts` : il trouve aussi les `.json`.
- `src/art/types.ts` : `Cell.frames?` (étendues par image).
- `src/render/art-textures.ts`, `loadArt` : `load.atlas`. On garde `spritesheet` pour les bandes sans atlas (projectiles). `TransformerImage.js` retourne l'image sur `frame.realWidth` (vérifié par la critique), donc `anchorOrigin` reste valable.
- `src/render/fx-pixels.ts`, `of()` : on garde la découpe et son décalage, sans reconstituer la case commune. Sinon le cache garde la taille des cases (16,8 Mo de fx pour Nayo après lissage, au lieu de 2,5 Mo).
- `src/ui/fighter-select.ts` (`paintPortrait`) et `src/app/select-fighters.ts` : le portrait est lu dans la découpe de l'image 0 de l'idle.
- `tests/render/fx-strips.ts` : il lit les pages et l'atlas, et plus une rangée de cases égales. Il alimente `flash-areas.test.ts` et `flash-cadence.test.ts`.
- Précache du service worker : il doit inclure les `.json` (`src/app/service-worker.ts`, `tests/build/service-worker.test.ts`).

**Tests**
- `tests/render/sprite-loading.test.ts` : les images sont chargées en atlas, avec leur recadrage.
- Nouveau cas dans `anchor-origin.test.ts` : une image recadrée et retournée tombe sur la même ancre qu'une image entière.
- `FxPixels` rend les mêmes pixels opaques qu'avant, à la même position du monde.
- Le portrait est identique au pixel près.
- `flash-areas` et `flash-cadence` passent sans changement de seuil.
- Nouveau test `tests/build/vram-budget.test.ts` : il somme les pages d'atlas du pire appariement, miroir compris (deux tenues), et le compare au plafond du §9.

**Ce que le propriétaire voit** : rien, et c'est voulu. La mémoire vidéo d'un match passe d'environ 63 à environ 40 Mo. Le chiffre de 33 Mo du design oubliait la perte du rangement.

### 3.3 F2 : moteur d'intermédiaires et planches pilotes (2 jours)

**Nouveaux fichiers**
- `tools/sprites/tween.ts` : `inbetween()`, `tweenEffects()`, `TweenOptions { snap?, straightArms?, lower? }`. Repris de `anim-design/fluidite/tween.ts`.
- `tools/sprites/inbetweens.ts` :
  - `Smoothing { every, counts?, ease?, snap?, straightArms?, loop? }` ;
  - `frozenOf(clips, template)` : les règles de gel du §3.1, point 1 ;
  - `candidates`, `planStrip` (l'échelle, avec le rejet hors boîte des clés pour la posture) ;
  - `smoothClip`, `keyAt` ;
  - la règle des boucles (cadence régulière ou rien).
- `tools/sprites/nayo/smoothing.ts`, `tools/sprites/riff/smoothing.ts` : la table, limitée aux pilotes. Pour Nayo et Riff : `airHit`, `knockdown`, `getup`, `ko` (donc aussi `koLanding`), `trip`, `hitHigh`, `hitMid`, `hitLow`, `hitCrouch`, `dashForward`, `dashBack`, et `standHeavy` comme témoin. Les paires de prise et les clips du Finisher en sont exclus explicitement.
- `src/art/nayo/played.ts`, `src/art/riff/played.ts` : générés (« Generated, do not edit »).

**Fichiers modifiés**
- `tools/sprites/fighter.ts` : `keys(sheet)`. `poses(sheet)` rend les clés puis les intermédiaires. `timing(sheet)` reste le temps des clés.
- `tools/sprites/nayo/index.ts`, `tools/sprites/riff/index.ts` : `planStrip` mémorisé.
- `tools/sprites/sheet.ts`, `drawStrip` :
  - les clés exactement comme aujourd'hui ;
  - les intermédiaires avec `mixMotion` ;
  - une passe de contact au sol.
- `tools/sprites/generate.ts` : il écrit `played.ts`.
- `src/art/types.ts` :
  - `playedClips(keyClips, played)`, avec repli clip par clip ;
  - `playedRange` ;
  - `FighterArt.keyClips` (le A/B de V0).
- `src/art/nayo/index.ts`, `src/art/riff/index.ts` : `clips` joués, `keyClips`, `sheets` avec le total (`sheets.ts` inchangé).
- `src/render/animation.ts` : avec `options.legacy`, la source des clips devient `art.keyClips` (une ligne).
- `tools/sprites/preview.ts` : aperçu dans l'ordre de jeu (clé en jaune, intermédiaire en bleu) et mode `--ticks`.

**Tests** (`tests/tools/inbetweens.test.ts`, nouveau)
1. Pour chaque clip, la même clé à l'écran à chaque tic (deux tours pour les boucles), et la même durée.
2. `activeFrames` identique pour chaque coup, et toute image active est une clé.
3. `played.ts` à jour, comparé seulement sur les bandes de la table de lissage.
4. Aucun doublon : au moins 0,5 px du monde d'écart avec les voisines.
5. Aucune saccade : le plus grand pas d'une articulation vaut au plus 3 fois le pas moyen (mesuré : 2,32).
6. Clés intactes : les K premières cases sont identiques au dessin des clés seules.
7. Contact au sol entre deux clés qui touchent le sol.
8. Les paires de prise et les clips du Finisher n'ont aucun intermédiaire.
9. Les boucles ont une cadence régulière.
10. `dashForward` reçoit au moins N intermédiaires (le gel ne le bloque plus).
11. Sur les bandes de posture, aucun intermédiaire ne sort de la boîte des clés.

Les tests existants jugent aussi les intermédiaires, et doivent passer sans retouche : `anatomy.test.ts`, `hurtboxes.test.ts` (y compris « chainHeavy/super: its boxes come down with the body », grâce au gel), `visible-contact.test.ts` et `hold-pairs.test.ts`.

**Ce que le propriétaire voit**, en entraînement à ½ et ¼ avec l'interrupteur A/B, et dans les films comparés :
- le KO de Nayo passe de 8 à environ 22 images ; sur ses 24 premiers tics, l'image change 17 fois au lieu de 5 ;
- la chute passe de 3 à 7 changements d'image sur ses 10 tics de mouvement ;
- les réactions passent de 22 à environ 44 images/s ;
- les dashs ne sont plus bloqués à 20 images/s.

**Porte G1.** Le propriétaire juge F2 en A/B. S'il ne voit pas la différence, on agit avant F4 : `every: 1` sur les chutes et KO (45 à 51 images/s mesurées), plus de ponts, ou une clé de passage dessinée là où le tween échoue.

### 3.4 F3 : ponts entre clips et vol étiré (1 jour)

- **Les ponts.** La dernière tenue d'un clip reçoit des intermédiaires vers la première clé du clip suivant, quand le cœur rend l'enchaînement déterministe :
  - `knockdown` → `getup` : `standUp()` sait au tic près quand le relevé commence (`stunFrames ≤ durée de getup`). Le pont vise le clip de relevé que choisira `standUp()`, `getupDazed` compris après R1 ;
  - `airHit` → `knockdown`, sur les k derniers tics avant le sol (médiane de la coupe aujourd'hui : 15,8 px) ;
  - `thrownFall` → `knockdown` ;
  - `preJump` → `jump` et `preJumpForward` → `jumpForward` (médiane : 17,9 px).

  Pas de pont après le lâcher d'une prise, ni vers l'idle à la fin d'un coup, car l'action suivante dépend des entrées. La case logique de la bande s'agrandit si besoin, sans coût mémoire grâce au recadrage de F1.
- **Le vol étiré.** `airHit` f1 à f3, avec leurs intermédiaires, sont répartis sur le vol mesuré par `ticksToLand(y, vy)` (mêmes pas entiers que `airborne`, avec `HIT_GRAVITY`), au lieu de tenir la dernière image. Le pont `airHit` → `knockdown` s'enchaîne sur les derniers tics.
- **Fichiers**
  - `src/render/flight.ts` (nouveau, pur) : `ticksToLand`, `flightTick`. M1 le réutilise.
  - `tools/sprites/inbetweens.ts` : les `bridges`.
  - `tools/sprites/<perso>/smoothing.ts` : la liste des ponts.
  - `tools/sprites/generate.ts` : `played.ts` gagne `bridges`.
  - `src/art/types.ts` : `Clip.bridge?: { to, frames, ticks }`.
  - `src/render/animation.ts` : le pont est montré quand il reste au plus sa durée de tics.
- **Tests**
  - Un vol étiré finit au tic exact de l'atterrissage, pour chaque couple vy / vx du recensement des morts.
  - Le pont `knockdown` → `getup` finit sur `getup` f0 à moins de 2 px de sprite.
  - Pas de pont quand le clip suivant n'est pas celui prévu (relevé interrompu, coup reçu au sol).
  - `hurtboxes.test.ts` et `visible-contact.test.ts` inchangés.
- **Ce que le propriétaire voit** : plus de saut au relevé, à chaque chute, ni à la retombée, à chaque jongle. Le corps bouge pendant tout le vol au lieu de se figer.

### 3.5 F4 : toutes les planches (1,5 jour)

- La table complète : `default: { every: 1,5 }`, des courbes `in` avant l'image active, `out` après, et `inOut` ailleurs, avec des réglages par transition pour les chutes (rebond `out`, retombée `in`).
- Toujours exclus : les paires de prise, les clips du Finisher, les poses de round, et l'idle de Nayo jusqu'à P2.
- Relire chaque planche en `--ticks`. Pour le relevé roulé de Riff et sa vrille avant : `counts` à 0 ou une clé de passage dessinée.
- Mesurer la mémoire vidéo réelle (`vram-budget.test.ts`).
- Docs : une section « Fluidité » dans un nouveau `docs/art/fluidite.md`, et une note sous D23 dans `docs/combat-v2.md` : « images dessinées d'avance, pas d'interpolation ».
- **Ce que le propriétaire voit** : à l'écran, l'image change environ 24,9 fois par seconde au lieu de 14,4 pour Nayo (×1,73), et 26,0 au lieu de 14,0 pour Riff (×1,86). On ne lui promet pas ×2.

### 3.6 F5, en option : les paires de prise planifiées ensemble (1 jour)

- `planPair(holder, held)` : les mêmes intermédiaires des deux côtés, aux mêmes tics, la position du col dérivée de celle des poings, et aucune transition qui traverse un changement de côté ou un lâcher.
- Le juge : `hold-pairs.test.ts`, sur les quatre combinaisons (cou à moins de 4 px du milieu des poings).
- À ne lancer que si G1 et F4 ont convaincu.

---

## 4. Chantier 2 : morts variées

### 4.1 Le design retenu

On garde :
- 4 morts par perso, choisies côté rendu, sans toucher au cœur ;
- le KO d'aujourd'hui (`ko`, `koLanding`) réservé au `finale` du Finisher et au repli ;
- le ralenti déplacé sur la chute, puisque le gel du coup final le mange aujourd'hui (0 à 12 tics ralentis pour un gel de 22 à 5 tics) ;
- un choc au sol pour chaque mort, sans aucun flash.

Les critiques imposent ces changements :

1. **Quatre poses de repos vraiment différentes**, puisque c'est ce qu'on regarde le plus longtemps : environ 120 des 150 tics de roundEnd, plus les 120 de matchEnd. Dans le design, 50 à 56 % des KO finissaient sur le dos, tête en arrière, comme aujourd'hui.

   | Mort | Silhouette au repos | Distance au vainqueur |
   |---|---|---|
   | Effondrement | à genoux, plié en avant, front au sol, fesses en l'air (compacte et haute) ; tête vers le vainqueur | à ses pieds |
   | Éjecté | roulade arrière par-dessus l'épaule, puis glissade ; finit allongé sur le flanc, dos au vainqueur, jambes tendues | loin |
   | Vrille | à plat ventre, étendu, bras devant la tête, jambes retombées du scorpion | moyenne |
   | Balayé | sur le flanc, recroquevillé, mains au tibia ; la cause se lit dans la pose | tout près |

   Critère de revue, testé : entre deux silhouettes de repos, un recouvrement (IoU) de 0,55 au plus. Chaque pose de repos est aussi à au moins 8 px du monde, en écart articulaire moyen, de `ko` f7 et de `knockdown` f3. On vérifie ce seuil en M0.
2. **Un vrai effondrement vers l'avant pour Riff.** Son `ko` actuel (elle titube, s'assoit, bascule sur le dos) reste pour le `finale` et le repli. Le design le réutilisait, et environ 75 % de ses morts auraient ressemblé à aujourd'hui.
3. **La mort se choisit d'abord selon `KoFinish`** (PR 1 du Finisher), puis selon la forme du coup, puis selon la physique, avec un anti-répétition :
   - `finale` → `classic`. La scène du Finisher reste maître, et on lui propose nos réceptions (par exemple `koSpinLanding` pour QUATRE) sans les imposer ;
   - `ultimate` et `combo` → une mort spectaculaire, jamais l'effondrement : vrille si la victime est en l'air ou lancée vers le haut, sinon éjecté. La Mégabasse qui tue à sa 1re ou 2e frappe (59 % d'effondrements dans le design) devient spectaculaire ;
   - `plain` : `trip` donne le balayé. `thrown` donne l'éjecté. En l'air, une forme `uppercut` ou une victime déjà en l'air donne la vrille, sinon l'éjecté. Au sol, une forme `overhead` ou un coup au corps (`mid`, `low`, accroupi, tabassage) donne l'effondrement ; `hook` ou `straight` lourd en hauteur donne l'éjecté ; un coup léger en hauteur donne l'effondrement ;
   - la forme vient d'une table par coup, partagée avec les réactions : `src/art/<perso>/blows.ts`. Plus de seuil `vy >= 2·|vx|`, qui faisait tenir la vrille du Slam à une égalité de sub-pixel ;
   - **anti-répétition** : jamais deux fois la même mort de suite pour une même victime dans un match. On passe alors à la jumelle physiquement plausible : effondrement ↔ éjecté au sol, vrille ↔ éjecté en l'air, balayé → vrille. Le souvenir vit dans `FightMemory` et repart à zéro au match suivant, de façon déterministe. Un joueur humain qui finit toujours par le même coup voit donc quand même deux morts différentes par match.
4. **Le ralenti, compté en images.** Il passe par `TickPacer` (V0) :
   - `plain` : 2 tics pour 3 images ;
   - `combo` et `ultimate` : 1 tic pour 2 images, pour ne pas diluer la signature du Finisher (« vole à 1/2 exact ») ;
   - il couvre au plus 12 tics de gel, puis les 30 premiers tics de chute ;
   - `finale` : rien ne change tant que la PR 3 du Finisher n'est pas fusionnée (le ralenti d'aujourd'hui reste), puis plus rien, car sa piste prend le relais ;
   - **le nouveau ralenti n'agit que quand la mort choisie a sa planche.** Une mort `classic` garde le ralenti d'aujourd'hui. On ne ralentit pas la même mort qu'avant, ce qui soulignerait qu'elle est toujours la même.
5. **Au ralenti, un dessin par tic.** Les planches de mort reçoivent `every: 1` sur la fenêtre ralentie dans `smoothing.ts` : c'est le pipeline de F2. La vrille utilise 8 clés et le tween par le plus court chemin, soit 16 dessins effectifs (22,5°). Le recul se calcule tic par tic, pas par dessin.
6. **Les coins, sans décalage forcé à f0.**
   - Si le mur derrière la victime est plus près que la longueur couchée plus le recul, on choisit une mort qui tombe vers l'avant (l'effondrement).
   - Sinon, le recul est borné seulement sur les images couchées, avec l'étendue par image que F1 écrit dans `cells.ts`.
   - Le sens du recul suit la poussée du cœur (signe de `vx` au KO, `away`), pas `facing`. Dans 2,7 % des KO, les deux diffèrent.
7. **Les chocs.**
   - Le choc de la retombée vient de l'état (V1).
   - Les chocs dessinés en milieu de clip, comme les genoux de l'effondrement, sont déclenchés par la vue au franchissement de l'index, avec la clé (clip, index) : ils ne se rejouent pas au passage de `koBlownFlight` à `koBlownLanding`.
8. **L'effondrement tient au moins 20 tics à genoux**, pas 10. Une victime accroupie démarre à f2 ou f3, sinon elle fait un bond vers le haut.
9. **L'angle de départ de la vrille** est transmis par `knockOut(death, from)`, au tic même du KO : `applyHit` remet `actionFrame` à 0, et l'information n'existe plus après.
10. **Une signature sonore par mort** (M4) :
    - effondrement : double choc de genoux, puis la claque du corps ;
    - éjecté : souffle, choc, puis frottement pendant la glissade ;
    - vrille : un souffle par tour, puis le choc ;
    - balayé : les talons, puis le choc de la tête.

### 4.2 M0 : la preuve (hors dépôt, 0,5 jour), puis la porte G2

- Dans `anim-design/morts/` : on dessine les poses clés des 4 morts de Nayo par le vrai pipeline (`proto.ts`, à compléter avec les nouvelles poses de repos), puis on les lisse avec le tween de F2.
- On produit les films comparés (V0) d'un KO de chaque sorte : aujourd'hui contre après, à vitesse de jeu et au ralenti, ×1 à l'échelle du téléphone et ×2.
- On mesure l'IoU des 4 poses de repos et leur écart à `ko` f7 et `knockdown` f3.
- **G2** : le propriétaire dit s'il voit 4 morts différentes. Les planches ne partent qu'ensuite.

### 4.3 M1 : la mécanique (1,5 jour)

**Fichiers**
- `src/render/deaths.ts` (le module posé par V1) :
  - `type Death = 'classic' | 'crumple' | 'blown' | 'spin' | 'swept'` ;
  - `deathOf(before, after, finish, shape, memory, walls)`, avec la règle du §4.1, points 3 et 6 ;
  - `spinDrawing`, et le recul tic par tic.
- `src/art/nayo/blows.ts`, `src/art/riff/blows.ts` (nouveaux) : la forme de chaque coup de l'attaquant (`'straight' | 'hook' | 'overhead' | 'uppercut'`), câblée dans `index.ts`. Les tables sont celles du design des réactions, relues coup par coup. R1 les réutilise.
- `src/art/types.ts` :
  - `BlowShape` et `FighterArt.blows` ;
  - `DEATH_CLIP_IDS` optionnels dans `FighterClips` : `koCrumple`, `koBlownFlight`, `koBlownLanding`, `koSpin`, `koSpinLanding`, `koSweptFlight`, `koSweptLanding` ;
  - `Clip.drift?`, `Clip.thuds?`, `Clip.flight?`.
- `src/art/validate.ts` : les longueurs et les index.
- `src/render/flight.ts` (F3) : il étire les planches de vol.
- `src/render/fight-memory.ts` : la dernière mort de chaque victime dans le match.
- `src/render/sprite-fighter-view.ts` :
  - `knockOut(death, from)`, oublié quand `action !== 'ko'` ;
  - les chocs au franchissement de l'index ;
  - l'ombre suit le x dessiné ;
  - un getter `drawnX` ;
  - une image imposée par le metteur en scène du Finisher prime sur la mort.
- `src/render/fight-scene.ts` :
  - sur l'événement `ko`, calcule la mort et appelle `knockOut`. Le calcul reste dans la scène et le champ `death` n'est pas ajouté à `fight-events.ts`, que la PR 1 du Finisher modifie ;
  - `framedXs` lit `drawnX`.
- `src/render/fight-feedback.ts` : `KO_SLOW` par `KoFinish`, avec `TickPacer`, appliqué seulement si la mort a sa planche (§4.1, point 4).

**Dépendances** : la PR 1 du Finisher (`KoFinish`), et F3 (`flight.ts`, et les planches lissées).

**Tests**
- `tests/render/deaths.test.ts` : une table déterministe par coup, pour les deux persos et chaque `KoFinish`. Elle remplace le test de répartition sur `playCpuMatches`, qui liait le rendu aux réglages de l'IA. Elle contient :
  - la Mégabasse qui tue à sa 1re frappe donne une mort spectaculaire ;
  - le Slam sans cas d'égalité ;
  - l'anti-répétition sur une suite de 5 KO par le même coup ;
  - la règle du coin ;
  - le sens du recul pris sur `away`.
- `tests/render/animation.test.ts` :
  - le routage des clips ;
  - une planche de vol finit au tic exact de l'atterrissage ;
  - la vrille atterrit sur son dessin à plat ;
  - le repli `classic` quand une planche manque.
- `tests/render/fight-feedback.test.ts` : le rythme exact du ralenti par `KoFinish`, l'ancien ralenti pour `classic`, `finale` intact, et au plus 10 images de plus entre le KO et le round suivant.
- Test de la vue : un choc par (clip, index), même à 5 tics par image.

**Ce que le propriétaire voit** : rien de nouveau tant que M2 n'est pas là, puisque le repli `classic` garde aujourd'hui. M1 et M2 lui sont montrés ensemble.

### 4.4 M2 : les planches de Nayo (2 jours), et M3 : celles de Riff (2 jours)

**Fichiers (Nayo ; pour Riff, mêmes chemins sous `riff/`)**
- `tools/sprites/nayo/poses/koCrumple.ts`, `koBlown.ts`, `koSpin.ts`, `koSwept.ts`. `tumble` passe de `airHit.ts` à `common.ts`.
- `tools/sprites/nayo/poses/index.ts`, `src/art/nayo/sheets.ts`, `src/art/nayo/clips.ts`, `tools/sprites/nayo/smoothing.ts` (`every: 1` sur la fenêtre ralentie).
- Fichiers générés : PNG main, alt et fx, atlas, `cells.ts`, `played.ts`.

**Contenu**
- Effondrement :
  - impact, les jambes lâchent, genoux au sol (choc léger) ;
  - à genoux, hors service, au moins 20 tics, tête qui roule ;
  - il bascule, plié en avant, front au sol (choc lourd), puis tenu.
- Éjecté :
  - arraché, vol à plat, choc des épaules (lourd) ;
  - roulade arrière par-dessus l'épaule, glissade avec poussière dessinée dans les fx ;
  - allongé sur le flanc ;
  - recul dessiné de 40 px (48 pour Riff), qui s'ajoute aux 9 à 26 px du cœur.
- Vrille : 1 à 3 saltos (N = clamp(round(vol / 14), 1, 3)), à plat ventre (choc lourd), scorpion, retombée, bras devant la tête.
- Balayé : les jambes au ciel, le dos qui claque, la tête qui frappe, les talons qui s'abattent, puis il roule sur le flanc, recroquevillé, mains au tibia.
- Riff (M3) :
  - un effondrement vers l'avant, dessiné ;
  - la mèche et la chaîne suivent la vrille sur leurs ressorts ;
  - les bottes volent sur l'éjecté ;
  - le balayé part assis, comme son `knockdown`, mais finit sur le flanc.

**Tests**
- `tests/tools/nayo-v2-sprites.test.ts` et `riff-sprites.test.ts`, nouvelles règles :
  - `lands` : la 1re image de l'atterrissage prolonge la dernière du vol ;
  - `rests` : la hanche à 8 px du sol au plus, rien sous le sol, rien hors de la case.
- Nouveau `tests/tools/death-poses.test.ts` : IoU ≤ 0,55 entre poses de repos, et écart à `ko` f7 et `knockdown` f3 au-dessus du seuil fixé en M0.
- `anatomy.test.ts` propre, y compris aucun bras dans le sol (le brouillon du balayé f1 en enfonçait un).
- `vram-budget.test.ts` sous le plafond.

**Ce que le propriétaire voit**
- En match CPU, avec `?anim=avant` pour comparer : 4 morts aux silhouettes opposées.
- La chute au ralenti, 30 tics sur environ 45 à 60 images, au lieu de 0 à 6 tics.
- Un choc au sol à chaque mort.
- Jamais deux fois la même mort de suite pour une même victime dans un match.

### 4.5 M4 : les sons de mort (0,5 jour, en parallèle de M2 et M3)

- `src/audio/sfx.ts` : `koKnees`, `koSlide`, `koWhoosh`, `koHeels`, par synthèse, sans nouvel échantillon.
- `src/render/fight-feedback.ts` : le son suit le choc (clip, index).
- Conflit possible avec la PR 4 du Finisher, qui ajoute des `SoundName` et un bus `fight` au moteur : on ajoute nos entrées en bloc séparé, pour un rebase trivial.
- Test : chaque mort déclenche sa suite de sons, une seule fois.

---

## 5. Chantier 3 : réactions variées

### 5.1 Le design retenu

On garde :
- le choix de la réaction selon la forme du coup ;
- aucun changement du cœur, des replays ni du calibrage des hurtboxes ;
- le souvenir noté dans la seule boucle de tics ;
- des clips optionnels avec repli ;
- le petit saut de `hitLow` dès 16 tics de stun (2,7 % des coups, sans image nouvelle).

Les critiques imposent ces changements :

1. **On abandonne les « autres impacts » alternés par parité.** Ils cassaient trois tests de planche, faisaient sauter un bras de 30 à 40 px à la sortie du gel, et se jouaient sur l'image cachée sous la gerbe : opaque, 34 à 58 px, sur les deux tiers du gel environ. La baisse de 43,8 % à 2,5 % ne mesurait que la règle elle-même.
2. **On commence par ce qui se voit sans masque** (lot 1) :
   - la jongle relancée sans saut. Aujourd'hui la tête saute de 31 à 62 px chez Nayo, environ 7 fois par minute ;
   - le corps soulevé par l'uppercut : environ 47 % des lancers, 330 sur 698 ;
   - la chute sonnée et le relevé titubant après au moins 4 coups : 5,2 fois par minute, 30 tics d'images nouvelles au sol, sans gerbe ;
   - le coup d'en haut qui écrase : genoux et hanches restent hors de la gerbe ;
   - le tremblement de la victime, déjà livré par V1.
3. **Des clips séparés, sur des bandes séparées, avec leurs propres images jusqu'au retour en garde.** Pas de `Clip.alt` ni de `Shown.alt`. Sinon, tout ce qui résout `clip.frames[clipFrameAt(...)]` rate l'image sans rien signaler : `flash-cadence.test.ts:351`, `hold-pairs.test.ts:48`, FxGate, FxPixels. Les poses communes sont importées, pas redessinées. Le test « ends next to the guard » reste valable tel quel.
4. **Le souvenir sans arithmétique d'horloge.** `FightMemory` garde, par défenseur, le dernier contact « hit » reçu, jusqu'au retour en neutre ou au changement de `round.number`. Il l'efface si `state.frame` ne se suit pas (saut d'état, remise à zéro en entraînement). L'identité `phaseFrame − actionFrame` se perdait au passage à matchEnd (`round.ts:42`), et peut-être pendant le verrou du Finisher.
5. **Pour choisir la secousse de relance, une table d'inclinaison par image**, générée depuis les poses (spin + torso ; Nayo aujourd'hui −15, −50, −70, −82°), et non la règle « airHit ≥ 2 ». On prend la secousse la plus proche : 15° d'écart au plus avec l'image interrompue.
6. **Le repli sans souvenir reste égal à aujourd'hui** : `reactionHeavy || stunTotal >= 16` pour `hitLow` (`animation.test.ts:84`).
7. **Le contrat avec le Finisher** :
   - les variantes sont coupées tant que `finisherLocked` est vrai, ce qui garde les réactions [R] du Slam et de la Mégabasse, sauf accord écrit de son équipe ;
   - la `FinisherScene` appelle `memory.note()` si elle fait avancer la simulation elle-même ;
   - l'image qu'elle impose prime.
8. **Distinction mesurée hors de la gerbe** : IoU ≤ 0,55 entre deux types de réaction, calculée en excluant le disque de la gerbe autour du point de contact. Le seuil de 0,70 laissait passer deux images consécutives d'une même réaction.
9. **Le lot 2 vise ce qui reste visible.**
   - `hitHook` : le buste tourne jusqu'à montrer le dos sur les images 1 et 2, après le gel, au lieu d'une tête tournée de 17° sous la gerbe.
   - `crumple` : son seul déclencheur, le CONTRE du Crochet, vient de Nayo. On dessine donc Riff d'abord, puisque c'est elle qui le subit en Nayo contre Riff. Le pli est atteint 6 à 8 tics après le gel, car la victime n'est visible que 9 tics en médiane avant le coup suivant.
10. **`hitBack` passe en option (R3)** : 1 fois par minute (54 coups), et non 1,9. On y met aussi les variantes motivées : CONTRE et punition plus forts (571 coups debout sur 1 680, soit 34 %, sans aspect propre aujourd'hui) et le côté de la tête selon la main qui frappe. Le second impact de `held` y va aussi, en clip séparé jugé par `hold-pairs.test.ts`.

### 5.2 R0 : la preuve (hors dépôt, 0,5 jour), puis la porte G3

- Dans `anim-design/reactions/` : les poses clés de Nayo pour `airHitAgain`, `airHitUp`, `knockdownDazed` + `getupDazed` et `hitCrush`, lissées par le tween de F2.
- Films comparés sur les séquences réelles les plus fréquentes : L, L, H, H puis balayage, jongle relancée, uppercut. Gerbe incrustée, à l'échelle du téléphone.
- **G3** : le propriétaire voit-il la différence, gerbe comprise ?

### 5.3 R1 : lot 1 (rendu 1 jour, puis art 1,25 jour par perso : Nayo, puis Riff)

**Rendu**
- `src/render/reactions.ts` (le module posé par V1) : `chooseReaction(fighter, blow, tilts)`.
  - En l'air : `trip` donne `trip`. Une jongle relancée donne `airHitAgain` ou `airHitAgainFlat`, choisi par l'inclinaison. Une forme `uppercut` donne `airHitUp`. Sinon, `airHit`.
  - Debout : accroupi donne `hitCrouch`. Une forme `overhead` donne `hitCrush` ou `hitCrushLight`. Sinon, le clip d'aujourd'hui.
  - Au sol : `knockdown` devient `knockdownDazed` quand `comboCount ≥ 4`, et `standUp()` mesure alors `getupDazed`.
  - Tout est coupé quand `finisherLocked` est vrai ou quand `options.legacy` est vrai.
- `src/render/fight-memory.ts` : `note(previous, next)` (dernier contact par défenseur) et `of(state, player)`.
- `src/art/types.ts` :
  - `VARIANT_CLIP_IDS` optionnels : `hitCrush`, `hitCrushLight`, `airHitUp`, `airHitAgain`, `airHitAgainFlat`, `knockdownDazed`, `getupDazed` ;
  - `VARIANT_FALLBACK` ;
  - `clipOf()` suit le repli.
- `src/art/validate.ts` : `knockdownDazed` et `getupDazed` vont ensemble, et leurs tics totalisent les 40 de la chute. Les clips de stun ont `endFrames`.
- `tools/sprites/generate.ts` : la table d'inclinaison par image des bandes aériennes (`tilts`, écrite dans `cells.ts`).
- `tools/sprites/<perso>/smoothing.ts` : le pont `knockdownDazed` → `getupDazed` (F3).

**Art** (par perso, bandes nouvelles)
- `airHitAgain` : 4 images (penché, à plat, retombe, puis la pose d'`airHit` 3, importée).
- `airHitUp` : 4 images (secousse verticale, menton en l'air, puis les poses d'`airHit` 1 à 3, importées).
- `knockdownDazed` : 5 images (les poses de `knockdown` 0 à 2 importées, puis sonné A et sonné B : tête qui roule, main au front).
- `getupDazed` : 6 images, pour finir exactement en garde.
- `hitCrush` : 5 images (écrasé, enfoncé, repousse, remonte, garde basse), sans l'image « autre impact ».
- Fichiers : `tools/sprites/<perso>/poses/airHitAgain.ts`, `airHitUp.ts`, `knockdownDazed.ts`, `getupDazed.ts`, `hitCrush.ts`, plus `poses/index.ts`, `sheets.ts`, `clips.ts` et `smoothing.ts`. `tumble` est exporté (déjà fait en M2).
- À valider par le propriétaire : la chute sonnée remplace la provocation de Riff au sol dans 28 % des chutes.

**Tests**
- `tests/render/reactions.test.ts` :
  - chaque règle ;
  - le repli sans souvenir égal aux clips actuels (tous les tests de `animation.test.ts` restent verts) ;
  - rien quand `finisherLocked` est vrai.
- `tests/render/fight-memory.test.ts` : le souvenir tient sur `combo.json`, `juggle.json` et `crossup.json`, survit au passage à matchEnd, et s'efface sur un saut de `frame` ou un changement de round.
- `tests/tools/nayo-v2-sprites.test.ts` et `riff-sprites.test.ts` :
  - `RULES` (nombre d'images) ;
  - `toGuard: 'near'` pour `hitCrush`, `toGuard: 'exact'` pour `getupDazed`.
- `tests/tools/hurtboxes.test.ts`, nouveau cas : chaque image de `hitCrush` reste dans le dessin debout, à 1,5 px près, et la tête ne descend jamais à plus de 2 px sous le pli de `hitMid` (58,2 px chez Nayo).
- Nouveau `tests/tools/reaction-distinct.test.ts` :
  - IoU ≤ 0,55 hors du disque de la gerbe ;
  - `airHitAgain` à 15° au plus de l'image interrompue.

**Ce que le propriétaire voit**
- Plus de saut quand une jongle est relancée.
- Le corps soulevé à la verticale par les uppercuts.
- Les coups venus d'en haut qui écrasent.
- Après un gros combo, un perso sonné au sol qui se relève en vacillant, au lieu du kip-up.

### 5.4 R2 : lot 2 (1,25 jour par perso ; Riff d'abord pour `crumple`)

**Art**
- `hitHook` (5 images) :
  - tourné : le buste pivote jusqu'à montrer le dos à l'image 1 ;
  - vrille ;
  - retour ;
  - ressaisi ;
  - garde sonnée.

  La différence porte sur les jambes, les hanches et le bras arrière, hors de la gerbe.
- `crumple` (6 images, 36 tics au plus) : impact, les genoux lâchent, plié dès 6 à 8 tics après le gel, il remonte en titubant, tenue.

**Fichiers** : `tools/sprites/<perso>/poses/hitHook.ts`, `crumple.ts`, puis `sheets.ts`, `clips.ts`, `smoothing.ts` et `src/art/<perso>/blows.ts` (déjà là). `src/render/reactions.ts` :
- `stunTotal ≥ 30` donne `crumple` ;
- une forme `hook` en hauteur donne `hitHook` ou `hitHookLight`.

**Tests** : les mêmes familles qu'en R1. `crumple` reste dans le dessin debout, la tête au-dessus du seuil de `hitMid`.

**Ce que le propriétaire voit** :
- les crochets (Crochet, Coude, Revers ; environ 11,6 % des coups) font tourner le buste ;
- le contre du Crochet plie l'adversaire.

### 5.5 R3, en option, après retour du propriétaire (1,5 jour)

- CONTRE et punition plus forts : clips `hitHighCounter` et `hitMidCounter`, avec une image 0 plus ample et un pas de titubation en plus, en accord avec le tampon CONTRE.
- Le côté de la tête selon la main qui frappe : la table `blows.ts` gagne `hand`.
- `hitBack` (coup dans le dos) : seul le bord côté agresseur est contrôlé ; l'avant est toléré jusqu'à 4 px.
- `held` : le second impact en clip séparé, jugé par `hold-pairs.test.ts`, avec le col à 14 px au plus des poings (`COLLAR.below`).

---

## 6. Chantier 4 : vie au repos

### 6.1 Le design retenu

On garde :
- l'horloge de la victoire et le départ de l'idle à 0, livrés en V1 ;
- les intros selon le score à partir du round 2 (`introAhead` pour qui mène, `introBehind` pour qui est mené, l'intro actuelle à égalité) ;
- les victoires selon l'issue : `victoryRound` pour un round gagné sans le match, `victory` pour le match, `victoryClose` pour le match gagné avec 25 % de vie ou moins ;
- les gestes de repos qui durent exactement une boucle d'idle et commencent et finissent sur GUARD ;
- une graine déterministe (`phaseFrame − still`, stable sur 4 292 plages sur 4 292).

Les critiques imposent ces changements :

1. **Ni `finish` ni `finale` dans la règle.** Après un Finisher, c'est `victory`, et le metteur en scène de la PR 3 l'écrase s'il le veut. Le `finale` de Riff est une séquence jouée pendant la scène, pas une pose de victoire. `fight-scene.ts` et la signature d'`update()` ne bougent pas pour le repos. Un round gagné par une `ultimate` sans gagner le match donne `victoryRound`.
2. **Pas d'intros de repli découpées dans la planche actuelle.** Elles ne montraient aucune image nouvelle et tombaient à environ 4 images/s, avec des ressorts de Riff sans cause visible. On attend les vraies planches.
3. **Des amplitudes lisibles sur un téléphone, vers le bas.** Les marges de la hurtbox sont nulles : en garde, le dessin avance à 15 pour une boîte à 13,5, ce qui épuise déjà la tolérance de 1,5. Critères mesurables, testés :
   - le rebond de garde de Nayo descend de 3 à 4 px du monde, la tête jamais plus haute ni plus en avant qu'en GUARD ;
   - un geste fait bouger une extrémité (poing, coude, pied) d'au moins 8 à 10 px du monde par rapport à GUARD, ou change la boîte englobante d'autant ;
   - des gestes qui changent la silhouette sans tricher sur la boîte : gants qui descendent aux hanches, bras secoués le long du corps, épaules roulées bras ballants ;
   - `idleHop` saute de 4 à 6 px, ou on le retire.
4. **Des silhouettes neuves.** On ne reprend pas STAND, CUP ni STARE de l'intro dans `victoryRound` et `introAhead`, sinon on y lit « le geste de l'intro, encore ». Seuls SINK et GUARD servent à finir. Chaque pose nouvelle a au moins une silhouette qu'on ne voit nulle part ailleurs.
5. **Intros et victoires libérées de NEUTRAL et de l'enveloppe de hurtbox.** Hors de la phase `fight`, `step.ts` met les entrées à 0. Il suffit qu'elles ne recouvrent pas l'adversaire (160 px d'écart à l'intro, le perdant au sol dans sa pose de mort). Ce sont les poses les plus regardées : les brider les rendrait invisibles.
6. **La priorité va à l'idle du perso que tient le joueur.** Un joueur qui ne touche à rien reste en idle 36 à 64 % du combat. On fait 2 gestes par perso au lieu de 3, et un rebond de garde soigné.
7. **L'écran de sélection passe dans le lot de Nayo.** C'est le seul endroit où l'idle se voit plusieurs secondes à chaque match. Il demande une deuxième image de fond dans les keyframes CSS et respecte « Tremblement ».
8. **La propriété des planches avec la fluidité.** Le repos possède les fichiers de poses (`idle.ts`, `intro.ts`, `victory*.ts`, gestes). La fluidité possède les règles de lissage. Chaque PR du repos ajoute elle-même ses lignes dans `smoothing.ts` en suivant ces règles : cadence régulière pour l'idle, `every: 2` pour les poses de round seulement si le budget le permet.
9. **Mémoire** : les variantes d'intro et de victoire sont chargées en arrière-plan pendant le round 1, pas au preload par `playedSheets`, et jamais au KO, où l'envoi au GPU ferait un à-coup.
10. **Pas de « raccord net au premier tic » vendu pour Nayo** : son image d'idle 5 est à 0,5 px de GUARD. Seule Riff y gagne.

### 6.2 La porte G4, avant l'art

Captures avant et après tirées des replays (`showFighter` est pur) : la fin de round de `ko.json`, le passage au round 2 et 10 s d'idle, à l'échelle du téléphone. On y montre les poses clés du rebond, des deux gestes, des intros et des victoires de Nayo, lissées par le tween. Le propriétaire valide l'amplitude et le ton, notamment Riff qui crache par terre.

### 6.3 P2 : Nayo (2 jours)

**Règles (rendu)**
- `src/render/rest-poses.ts` (le module posé par V1) :
  - `introOf`, `victoryOf` (round, vie ; ni `finish` ni `finale`) ;
  - `restOfIdle` (geste après `BREAK_FROM_LOOP = 2` boucles, puis toutes les `BREAK_EVERY = 5`, réglables, choisi par la graine) ;
  - `CLOSE_WIN_QUARTERS = 1` ;
  - tout est coupé avec `options.legacy`.
- `src/art/types.ts` : `OPTIONAL_STATE_CLIP_IDS` (`idleBreakA`, `idleBreakB`, `introAhead`, `introBehind`, `victoryRound`, `victoryClose`). La même liste accueille le `finale` du Finisher : celui qui arrive en second ajoute son entrée.
- `src/art/validate.ts` :
  - un geste dure exactement la boucle d'idle ;
  - `intro*` dure 90 tics (`INTRO_FRAMES`) ;
  - `victory*` a un `loopFrom`.
- `src/render/art-textures.ts` : le chargement en arrière-plan des poses de round variantes.

**Art**
- `tools/sprites/nayo/poses/idle.ts`, réécrit : rebond de 3 à 4 px vers le bas, calé au pixel, cadence régulière.
- 2 gestes : `idleGloves.ts` (gants aux hanches, épaules roulées) et `idleShake.ts` (bras secoués le long du corps), ou la nuque si elle passe le critère d'amplitude, avec un prototype refait à 60 tics.
- `introAhead.ts`, `introBehind.ts`, `victoryRound.ts`, `victoryClose.ts`, avec des silhouettes neuves.
- `poses/index.ts`, `src/art/nayo/sheets.ts`, `clips.ts`, `tools/sprites/nayo/smoothing.ts` (l'idle entre dans le lissage, maintenant qu'il a de l'amplitude).
- Écran de sélection : `src/app/select-fighters.ts`, `src/ui/fighter-select.ts`. L'idle passe trois fois, puis un geste ; le portrait reste cadré (`{x:30, y:0, size:56}`).

**Tests**
- Nouveau `tests/render/rest-poses.test.ts` :
  - la table des règles : round 1, 1-0, 0-1, 1-1, round gagné sans le match, match gagné à 25 % et à 26 %, `ultimate`, clip absent qui retombe ;
  - le déterminisme : deux passes sur `ko.json` et `combo.json`, et 20 000 tics de cpu-match, donnent la même suite ;
  - un geste ne commence et ne finit que sur un multiple de la boucle, et la graine ne change pas pendant un gel.
- `tests/tools/sprites.test.ts` et `nayo-v2-sprites.test.ts` :
  - pour les gestes : 1re image à 2 px au plus de GUARD, dernière égale à GUARD, NEUTRAL, durée de 60 tics ;
  - pour les intros : dernière image égale à GUARD, et 90 tics.
- `tests/tools/hurtboxes.test.ts` : l'idle et les gestes restent dans l'enveloppe debout, à 1,5 px près (`measureFrames`, `calibrate`), et la tête ne monte jamais au-dessus de GUARD.
- Nouveau `tests/tools/rest-amplitude.test.ts` : rebond d'au moins 3 px, geste d'au moins 8 px.
- Les intros et victoires ne recouvrent pas l'adversaire.
- Les anneaux et éclats nouveaux restent sous 300 px² du monde (`flash-areas.test.ts`).
- `tests/art/nayo.test.ts` : `validateArt` propre. `tests/ui` : le portrait et les keyframes du geste.

**Ce que le propriétaire voit**
- En entraînement et à la sélection : Nayo qui rebondit en garde comme un boxeur, et un geste quand il attend.
- Au round 2 : une intro différente pour celui qui mène et celui qui est mené.
- Sur un match 2-1 : trois victoires différentes au lieu de la même trois fois.

### 6.4 P3 : Riff (1,5 jour), et P4 en option

- L'idle de Riff ne change pas : il bouge déjà de 5,2 px.
- 2 gestes : `idleNose.ts`, le pouce sous le nez, à 4,5 px au plus devant le centre de la tête, à re-mesurer contre la limite de portée de 14 ; et `idleFringe.ts`, le souffle sur la mèche, que les ressorts font voler.
- `introAhead.ts` (main en cornet derrière l'oreille), `introBehind.ts` (les rangers dans le sol), `victoryRound.ts` (crache par terre ; repli : main sur la hanche), `victoryClose.ts`.
- Même lot de tests dans `tests/tools/riff-sprites.test.ts` : TOTALS, FROM_GUARD et TO_GUARD, NEUTRAL (limite 14), l'enveloppe de la hurtbox.
- P4 : `introMirror` au round 1 d'un match miroir.

---

## 7. Articulation avec le Finisher (contrat)

| Point | Ce que nous faisons | Ce que nous demandons à l'équipe Finisher |
|---|---|---|
| `KoFinish` (sa PR 1) | M1 le lit. On attend sa fusion avant M1. | rien |
| Ralenti du KO | `TickPacer` (V0). `finale` garde le ralenti d'aujourd'hui jusqu'à sa PR 3. | adopter `TickPacer` pour sa piste, ou nous laisser adopter la sienne |
| Choc de retombée (V1) | pas de son ni de secousse pour un `finale` | rien : son metteur en scène joue la retombée |
| Lissage | ses clips (`finale`, Rebond, L'Ange) ne sont pas lissés. `playedClips` retombe sur le clip des clés. `playedRange` existe. | activer le lissage s'il le souhaite ; ne pas régénérer `played.ts` à la main |
| Numéros de clés | stables (s2, s4, `koLanding`, `jumpForward` f2 à f4, `jump` f5) | rien |
| Morts | `finale` → `classic` | regarder si `koSpinLanding` convient à QUATRE (proposition) |
| Réactions | coupées tant que `finisherLocked` est vrai | appeler `FightMemory.note()` dans la `FinisherScene` si elle fait avancer la simulation |
| Image imposée | prime toujours sur la mort, la réaction et le repos | rien |
| Repos | ne choisit jamais `finale` ; après un Finisher, `victory` | imposer `finale` depuis le metteur en scène, comme prévu au §5.2 de sa spec |
| `victory`, garde, Mégabasse, Slam | non modifiés par le repos ni par les réactions | rien |
| Sons | M4 ajoute ses `SoundName` en bloc séparé | rien |

Ordre de fusion avec le Finisher :
- V0, V1 et F1 à F4 ne dépendent pas de lui ;
- M1 vient après sa PR 1 ;
- si sa PR 3 arrive avant M1, M1 se rebase sur sa piste de tics ;
- R1 doit connaître `finisherLocked`, qui vient de sa PR 1.

---

## 8. Fichiers partagés et règles de conflit

| Fichier | PR qui le touchent | Règle |
|---|---|---|
| `src/render/animation.ts` | V1, F2 (une ligne), F3, M1, R1, P2 | en série ; après V1, chaque PR ne touche que son module (`deaths.ts`, `reactions.ts`, `rest-poses.ts`, `flight.ts`) et une ligne |
| `src/render/sprite-fighter-view.ts` | V1, M1, PR 3 du Finisher | en série ; l'image imposée prime |
| `src/render/fight-scene.ts` | V0, V1, M1, PR 1 et PR 3 du Finisher | V0 puis V1 ; M1 n'ajoute qu'un appel sur `ko` et `framedXs` |
| `src/render/fight-feedback.ts` | V1, M1, M4, PR 1 et PR 3 du Finisher | V1 avant M1 ; M1 après la PR 1 |
| `src/render/fight-events.ts` | V1, PR 1 du Finisher | V1 n'ajoute que `ko: true` sur `fall` ; rebase trivial |
| `src/art/types.ts` | F1, F2, F3, M1, R1, P2, PR 4 du Finisher | ajouts en blocs distincts (une liste d'IDs optionnels par chantier) |
| `tools/sprites/generate.ts`, `sheet.ts`, `fighter.ts` | F1, F2, F3, R1 (inclinaisons) | couloir pipeline seulement |
| `src/art/<perso>/clips.ts`, `sheets.ts`, `tools/sprites/<perso>/poses/index.ts`, `smoothing.ts` | toutes les PR d'art du perso | une PR d'art à la fois par perso ; Nayo et Riff en parallèle |
| `cells.ts`, `played.ts`, PNG, atlas (générés) | toutes les PR d'art | jamais fusionnés à la main : `npm run sprites` après chaque rebase |
| `src/app/app.ts` | V0 | seul |
| `src/audio/sfx.ts` | M4, PR 4 du Finisher | entrées en bloc séparé |
| `src/app/select-fighters.ts`, `src/ui/fighter-select.ts` | F1 (portrait), P2 (geste) | F1 bien avant P2 |

Ce qui peut se faire en parallèle sans conflit :
- F1 en même temps que V0 et V1 ;
- l'art de Nayo en même temps que celui de Riff ;
- M4 en même temps que M2 et M3 ;
- les trois preuves (M0, R0, captures du repos) hors dépôt, pendant F2 à F4 ;
- les PR 0 à 2 du Finisher en même temps que tout le couloir pipeline.

---

## 9. Budget de mémoire vidéo

Le plafond provisoire est de **90 Mo par match dans le pire appariement**, miroir compris (deux tenues chargées). Il est à confirmer sur le plus ancien iPhone visé. `tests/build/vram-budget.test.ts` (F1) le vérifie à chaque PR d'art.

| Étape | Estimation | Source |
|---|---|---|
| Aujourd'hui | 62,8 Mo (66,5 avec projectiles et fx platine) | mesuré |
| Après F1 | ≈ 40 Mo | critique de la fluidité |
| Après F4, sans les poses de round | ≈ 70 à 75 Mo | estimation : 81,8 Mo mesurés avec les poses de round |
| Morts, 8 bandes par perso, lissées | + 6 à 12 Mo | estimation : la critique donne environ +10 Mo sans recadrage ni lissage |
| Réactions, lots 1 et 2 | + 4 à 8 Mo (miroir compris) | estimation |
| Repos, poses de round chargées pendant le round 1 | + 5 à 7 Mo (miroir compris) | estimation |

La somme dépasse le plafond si tout est lissé. Les leviers, dans cet ordre :
1. un meilleur rangement des atlas (environ −7 Mo) ;
2. ne pas lisser les poses de round ;
3. les variantes de round chargées en arrière-plan et libérées entre deux matchs ;
4. des fx recadrés au plus juste ;
5. `every: 2` sur les bandes peu vues.

Chaque PR d'art annonce son coût mesuré dans sa description.

---

## 10. Ce que le propriétaire verra, étape par étape

| Après | Où regarder | Ce qu'il verra | Ce qu'il ne verra pas encore |
|---|---|---|---|
| V0 | menu d'entraînement | « Vitesse ½ / ¼ » et « Animation : nouvelle / d'avant » | aucune différence : c'est l'outil |
| V1 | n'importe quel match | la victoire en entier à chaque round (Riff dans son freeze, le poing de Nayo) ; la victime qui tremble sous chaque coup ; les KO en l'air qui claquent au sol | la fluidité, les morts |
| F2, porte G1 | entraînement à ½, en A/B ; films comparés | KO, chutes, réactions, dashs avec environ 2 fois plus d'images | les relevés et retombées sautent encore |
| F3 | chutes et jongles | plus de saut au relevé ni à la retombée ; le corps bouge pendant le vol | — |
| F4 | tout le jeu | environ 25 images/s à l'écran au lieu de 14 | les paires de prise (F5) |
| M0, porte G2 | films comparés | 4 morts de Nayo animées | — |
| M1 + M2 | match CPU, `?anim=avant` pour comparer | 4 morts distinctes de Nayo, chute au ralenti, chocs | les morts de Riff |
| M3 + M4 | match CPU | les 4 morts de Riff, une signature sonore par mort | — |
| R0, porte G3 | films comparés, gerbe incrustée | jongle sans saut, uppercut, chute sonnée | — |
| R1 | match CPU, entraînement | jongle relancée sans saut ; corps soulevé ; coups d'en haut qui écrasent ; relevé titubant après un gros combo | crochets, contre plié |
| R2 | match CPU | le buste qui tourne sous un crochet ; le contre qui plie | — |
| Captures P, porte G4 | captures avant et après | le rebond, les gestes, les intros et victoires de Nayo | — |
| P2 | sélection, entraînement, round 2 | Nayo qui rebondit en garde, ses gestes ; des intros et victoires selon le score | Riff |
| P3 | idem | idem pour Riff | — |

**Comment juger, à lui dire tel quel :**
- En entraînement, mettre « Vitesse ½ », frapper, faire tomber et relancer en jongle, puis basculer « Animation : d'avant ».
- En match CPU, comparer avec `?anim=avant`.
- Les films comparés montrent la même séquence, côte à côte, à l'échelle de son téléphone.

**Ce qui restera, honnêtement :**
- Contre le CPU, l'idle en plein combat reste presque invisible : des plages de 1 tic en médiane, 52 au plus. Le repos se voit surtout à la sélection, en entraînement, aux intros, aux victoires, et quand il attend lui-même.
- Le gel du coup (environ 20 % du temps) reste un gel, mais il tremble.
- Les coupes vers l'idle à la fin d'un coup restent franches : elles dépendent des entrées.
- Le gain de fluidité à l'écran est d'environ ×1,7 à ×1,9, pas ×2.

---

## 11. Risques résiduels

1. **G1 échoue** : le propriétaire ne voit pas F2. Parade : `every: 1` sur chutes et KO, plus de ponts, et des clés de passage dessinées, avant d'investir dans F4. Les chantiers d'art ne sont pas bloqués : ils dessinent des clés.
2. **Le tween échoue sur certains mouvements complexes** (relevé roulé de Riff, vrille avant) : `counts` à 0, ou une clé dessinée, relue en `--ticks`.
3. **Le scintillement des mouvements fins** : la règle des doublons et `snap` sur les hanches des bandes de repos. À relire à l'œil, à taille réelle.
4. **La mémoire vidéo** : le plafond est testé et les leviers sont listés au §9. À confirmer sur un vrai téléphone dès F4.
5. **Le calendrier du Finisher** : M1 attend sa PR 1, et R1 lit `finisherLocked`. Si sa PR 3 bouge `fight-scene.ts` en profondeur, M1 se rebase dessus (1 jour était optimiste ; compter 1,5).
6. **Le ton** : Riff qui crache par terre, la chute sonnée à la place de sa provocation, la tête de l'effondré aux pieds du vainqueur. Tout passe par G2, G3 ou G4.
7. **Les parts mesurées viennent du CPU.** Un humain fait plus de jongles et de cross-ups. Les règles s'attachent à l'événement, donc elles tiennent ; seules les parts changeront. L'anti-répétition garantit la variété des morts quel que soit le joueur.
8. **Le temps de génération** : environ 2 fois plus d'images à dessiner, soit +12 s par génération complète et +30 à 60 s en CI.
9. **Les scripts de mesure** qui importent `src/ai` (`cpu.ts`) tournent avec `node --experimental-transform-types --no-warnings --import ./tools/sprites/ts-imports.js`.
