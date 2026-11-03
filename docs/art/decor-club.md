# L'Entrepôt, intérieur

Le sixième lieu : le club lui-même, vu de sa piste (`histoire.md`). C'est la salle que le Dock montre par son quai 3 (`decor-dock.md`), cette fois de l'intérieur. Dessiné selon les règles de propreté (`proprete.md`). Le système des lieux est décrit au §14 de `decor-rue.md`.

## 1. L'intention

On se bat sur la piste, au milieu de la foule, devant le DJ :
- au fond, le mur d'enceintes et la cabine ;
- les faisceaux violets des projecteurs ;
- la foule en contre-jour qui danse sur le tempo ;
- à gauche, la porte du quai ouverte sur la cour ;
- à droite, le bar.

Toutes les 40 s, la basse secoue la salle (§5). Le lieu est **couvert** (`sheltered`) : rien ne tombe sur la piste.

Les choix du développeur (`brume.md` §4) :
- minuit seulement ;
- la brume, qui est ici la fumée de la piste ;
- la pluie, vue par la porte du quai ;
- pas de stroboscope, interdit par la règle des 3 flashs (test).

## 2. La composition, de loin à près

### 2.1 `far`, le fond de la salle (25 %)

- Le mur de brique noire, en aplats.
- La charpente au plafond et ses trois projecteurs, leurs faisceaux en longs triangles violets et plats.
- Les deux murs d'enceintes, de quatre caissons de haut et deux de large.
- La cabine du DJ sur son estrade : la façade de bois sombre, la barre de LED violettes fixe, les platines et la table de mixage.
- Le DJ derrière, casquette sur la tête.

### 2.2 `mid`, la piste (50 %)

- Quatre groupes de danseurs en silhouettes, liserés de violet, entre deux piliers d'acier.
- La porte du quai, son rideau roulé en haut : la cour dehors, le béton, la lampe au sodium. Sous la pluie, la pluie tombe dans l'ouverture : c'est une animation de la seule pluie (`weather`).
- Le bar : ses étagères de bouteilles dans la lumière ambrée, le comptoir et sa rampe de laiton, la barmaid.

### 2.3 `floor`, la piste sous les pieds (100 %)

- Un béton poli et sombre en dalles, dont les joints marquent toutes les 64 unités du monde.
- Les longs reflets plats des projecteurs.
- La ligne de scotch au bord de la piste, puis le béton plus sombre au premier plan.

## 3. La palette

`tools/stage/club/palette.ts`, la sienne :
- la brique, l'acier, les caissons et leurs membranes ;
- le violet de la barre et des projecteurs ;
- l'ambre du bar, ses bouteilles, le bois ;
- le béton de la piste et son scotch ;
- la foule, la peau, le liseré violet ;
- la nuit et la cour derrière la porte ;
- la pluie et la fumée, dessinées par leurs seules animations.

## 4. Les ambiances

- **Minuit** (la base).
- **Minuit, brume** : la fumée de la piste. Le fond de la salle se noie dans une brume violette, les enceintes à demi effacées. Les LED et le bar restent aussi vifs. Des bancs de fumée traînent bas sur la piste et devant la scène (`kit/fog.ts`).
- **Minuit, pluie** : la cour derrière la porte, trempée et plus sombre, la pluie dans l'ouverture. La salle reste telle quelle.

## 5. Ce qui bouge

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- |
| `crowd0` à `crowd3` | les groupes qui dansent, un pas sur le temps, chacun décalé | 120 BPM |
| `dj` | le DJ qui hoche la tête sur le temps, la main levée avec la basse | 120 BPM |
| `cones` | les membranes des enceintes qui poussent | sur chaque temps de la basse |
| `bartender` | la barmaid qui secoue un shaker de temps en temps, et hoche la tête avec la basse | toutes les 15 s |
| `doorRain` | la pluie dans la porte, sous la pluie seulement | 3 tics par image |
| `mist0`, `mist1` | la fumée, par temps de brume seulement | 40 et 50 s |

**La basse**, le moment fort. Toutes les 40 s (`BASS_CYCLE`), le club monte le son pendant huit temps, à partir de `BASS_AT` :
- la foule saute bras en l'air à chaque temps ;
- le DJ lève la main ;
- les membranes poussent ;
- la barmaid hoche la tête.

Le test vérifie que tout ce que la basse secoue boucle sur le même cycle et change à son premier temps. Il vérifie aussi qu'aucune animation n'allume ni n'éteint un tube violet : les lumières sont fixes.

## 6. Les budgets

- **La planche** fait 1 013 × 469, soit 8,1 Mo avec les calques, sous les 9 Mo d'un lieu.
- **La propreté** : moins de 0,1 % de bruit dans chaque calque.
- **Le test de contrat** utilise les vérifications communes des lieux (`tests/tools/stage-contract.ts`, à partir de ce lieu).
