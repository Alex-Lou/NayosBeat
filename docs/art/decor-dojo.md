# The Dojo

Le quinzième lieu, un nouveau choix du développeur : « Dojo d'entraînement, lanternes. Lanternes. » Il est dessiné selon les règles de propreté (`proprete.md`), et le système des lieux est décrit au §14 de `decor-rue.md`. Une PR par lieu.

## 1. Les choix du développeur

- **L'intérieur, la nuit** : le dojo est couvert (`sheltered`), sa pluie tombe dehors, visible sur les cloisons de papier.
- **Les lanternes** : c'est sa signature. Elles pendent entre les piliers, et la **vague de lumière** est le moment fort : toutes les 40 s, les lanternes s'éclairent l'une après l'autre, lentement, puis reviennent.
- **Les couleurs** : le bois sombre, le papier chaud, la lumière orange des lanternes ; rien de vif près du cyan ni du magenta des combattants.

## 2. La composition, de loin à près

### 2.1 `far`, le fond du dojo (25 %)

- Le mur du fond : les cloisons de papier (shōji) doucement éclairées, leurs montants de bois.
- Le tokonoma : une alcôve avec son rouleau suspendu et sa branche.
- Les poutres hautes, le plafond sombre.

### 2.2 `mid`, la salle (50 %)

- **À gauche et à droite**, les piliers de bois, leurs socles.
- **Au centre**, la salle reste ouverte : le parquet nu, un rouleau qui se balance doucement, un mannequin de bois dans un coin.
- Les lanternes de papier qui pendent entre les piliers (`lantern0`, `lantern1`, `lantern2`), et la vague de lumière (`swell`, le moment fort).
- **Au sol du milieu**, le bois ciré, l'ombre des piliers.

### 2.3 `floor`, le parquet (100 %)

- Les lames de bois, leurs joints tous les 64 unités du monde.
- Les nœuds et les veines du bois, les reflets des lanternes.
- Une marque au sol, usée par les pas.

## 3. La palette

`tools/stage/dojo/palette.ts`, la sienne : le bois sombre, le bois clair, le papier, la lumière orange des lanternes, la corde, le rouleau, le mannequin, la pluie. La lumière des lanternes reste petite, la bande des flashs est respectée (test).

## 4. Les ambiances

- **Minuit, ciel clair** : la base.
- **Minuit, pluie** : la pluie ruisselle sur les cloisons (`rain`), les lanternes restent vives.

## 5. Ce qui bouge

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- |
| `swell` | la vague de lumière qui passe de lanterne en lanterne : le moment fort | une fois par cycle, au `SWELL_AT` |
| `scroll` | le rouleau du tokonoma qui se balance | 4 s |
| `tassel` | le gland des lanternes | 3 s |
| `rain` | la pluie qui ruisselle sur les cloisons, par temps de pluie seulement | 120 pas par boucle |

**La vague de lumière** est le moment fort : toutes les 40 s, à `SWELL_AT`, les lanternes s'éclairent l'une après l'autre et reviennent, chaque état tenu au moins 20 pas (test). Rien ne clignote.

## 6. Les budgets

- **La planche** reste sous 9 Mo pour le lieu, aucune texture au-delà de 2 048 px.
- **La propreté** : sous 4 % de bruit dans `far`, 5 % dans `mid`, 3 % dans `floor`.
- **Les grandes couleurs** restent dans la bande des flashs, dans chaque ambiance (test de contrat).
