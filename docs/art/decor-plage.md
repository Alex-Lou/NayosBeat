# Sunset Beach

Le neuvième lieu, demandé par le développeur : « une plage, avec effets de sable. Pieds, coup, particules. Ciel clair, ambiance vacances avec gens sous parasol et sur transats. Un bar, des oiseaux et palmiers. Océan derrière bien animé quand pas des gens devant. Ça doit respirer, pas full people. » Il est dessiné selon les règles de propreté (`proprete.md`). Le système des lieux est décrit au §14 de `decor-rue.md`.

## 1. Les choix du développeur

- **La fin de journée dorée**, et pas le plein jour. Un ciel de plein jour sortirait de la bande des flashs (`flashs.md` §3) : les grandes couleurs d'un décor restent sombres, pour que les éclats des coups se voient et restent sous le seuil.
- **Ses météos** : le ciel clair, une averse tropicale et une brume marine. Le lieu n'est pas couvert, et la pluie du rendu y tombe.
- **La poussière de sable complète** (§6), dans le rendu seul : le gameplay ne change pas.
- **Un seul moment, le crépuscule.** Un lieu commence donc sur sa première ambiance, qui n'est plus forcément « minuit, ciel clair » (`stage-layers.ts`, `BASE_ATMOSPHERE`). Les autres lieux ne changent pas.

## 2. La composition, de loin à près

### 2.1 `far`, la mer au soleil couchant (25 %)

- Le ciel, du bleu profond au-dessus jusqu'à l'ambre de l'horizon. Son dégradé est la seule trame du lieu.
- Quatre longs nuages en aplats, éclairés par-dessous.
- Le soleil bas, que l'horizon coupe, et son anneau de lumière.
- Le chemin du soleil sur la mer, qui scintille (`glitter`).
- Le cap à gauche et ses palmiers.
- La mer en bandes jusqu'au rivage.
- Un voilier passe au loin, la voile dorée (`sail`), et les mouettes traversent le ciel (`gull`, `gulls`).

### 2.2 `mid`, la plage (50 %)

- La mer proche, ses vagues qui se brisent et l'écume qui monte sur le sable mouillé.
- Les vagues ne sont animées qu'au milieu (`wave0`, `wave1`), là où personne ne se tient devant : un test le vérifie.
- À gauche, deux parasols rayés. Sous l'un, un transat et une baigneuse allongée qui replie un genou. Sous l'autre, un lecteur assis sur sa serviette.
- À droite, le bar de plage :
  - son toit de chaume et sa frange ;
  - l'enseigne « BEACH BAR » ;
  - la guirlande d'ampoules, fixes ;
  - le comptoir, la barmaid qui secoue un shaker, un client accoudé.
- Deux palmiers, l'un à gauche, l'autre près du bar. Leurs palmes bougent dans la brise.
- Peu de monde : trois personnes et la barmaid. Le milieu reste ouvert sur la mer.

### 2.3 `floor`, le sable sous les pieds (100 %)

- Le sable sec en aplats, et de longues rides tracées par le vent.
- Une ride plus sombre toutes les 64 unités du monde, qui mesure les distances.
- Quelques vieilles empreintes de pas, et le sable plus sombre au premier plan.

## 3. La palette

`tools/stage/plage/palette.ts`, la sienne :
- le ciel, les nuages ;
- le soleil et son chemin sur l'eau ;
- la mer et l'écume ;
- le cap ;
- le sable sec, le sable mouillé ;
- les palmiers ;
- les rayures des parasols, le bois, le chaume ;
- les ampoules du bar ;
- les mouettes ;
- les silhouettes, la peau, le liseré doré, les serviettes ;
- la brume.

Les bleus de la mer et le rouge des parasols restent ternes, loin du cyan et du magenta des combattants (test).

## 4. Les ambiances

- **Crépuscule, ciel clair** : la base.
- **Crépuscule, pluie** : une averse tropicale.
  - Le ciel devient un couvercle gris, le soleil un disque terne derrière, la mer grise.
  - Le sable et les palmiers sont plus sombres, mouillés.
  - Les ampoules du bar restent aussi vives.
- **Crépuscule, brume** : une brume marine.
  - Le cap et le large disparaissent, et le soleil pâlit.
  - Les bancs passent sur la mer, sous le soleil (ils ne cachent jamais une lumière, test), et au ras du rivage.

## 5. Ce qui bouge

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- |
| `wave0`, `wave1` | une vague qui roule, se brise et remonte sur le sable | toutes les 80 tics |
| `glitter` | le chemin du soleil qui scintille | 20 tics par image |
| `sail` | le voilier qui passe au large | 80 s |
| `gull` | une mouette seule qui traverse le ciel | 40 s |
| `gulls` | un vol de trois mouettes, avec la grande vague | 12 s par cycle |
| `palm0`, `palm1` | les palmes dans la brise, chaque palmier à son rythme | 1,5 s |
| `bartender` | la barmaid qui secoue un shaker | toutes les 15 s |
| `reader`, `sunbather` | le lecteur qui lève la main, la baigneuse qui replie un genou | 10 s, 20 s |
| `mist0`, `mist1` | la brume, par temps de brume seulement | 60 et 40 s |

**La grande vague** est le moment fort. Toutes les 40 s (`CYCLE`), à `BIG_WAVE_AT`, une vague plus haute se brise : la crête est plus claire et l'écume court plus loin sur le sable. Un vol de mouettes passe au même moment. Le test vérifie qu'elle tombe une fois par cycle, au bon tic, et que les mouettes passent avec elle.

Aucune animation n'allume ni n'éteint le soleil ou une ampoule (test).

## 6. Le sable

La poussière que soulève le sol dépend du sol du lieu (`ground` dans `src/art/stages.ts` : `hard` ou `sand`, voir `src/render/dust.ts`).

- **Les sols durs** (tous les autres lieux) restent tels quels : quelques grains gris qui montent et s'effacent.
- **Le sable** :
  - des grains couleur sable, trois fois plus nombreux et plus opaques ;
  - lancés plus haut, ils retombent en gerbes et restent posés au sol jusqu'à s'effacer ;
  - il vole partout où la poussière volait déjà : départ d'un dash, coup bas, chute, glissade sous un coup ;
  - **les pieds** le soulèvent aussi : un pas toutes les 12 tics quand on marche, chaque combattant sur son temps ; une bouffée à l'appel d'un saut ; une gerbe des deux côtés à la réception.

Tout se passe dans le rendu : le cœur n'en sait rien (D17), et rien n'est interpolé (D23). La réserve de grains est fixe (72), et le plus ancien est recyclé : rien n'est créé pendant un combat.

## 7. Les budgets

- **La planche** fait 926 × 428, soit 7,84 Mo pour le lieu, sous le plafond de 9 Mo.
- **La propreté** : 2,83 % de bruit dans `far` (le dégradé du ciel), 0,22 % dans `mid`, aucun dans `floor`.
- **Le test de contrat** utilise les vérifications communes des lieux (`tests/tools/stage-contract.ts`).
