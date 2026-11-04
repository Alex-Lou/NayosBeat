# Dune Dusk

Le treizième lieu, un nouveau choix du développeur : « Désert crépuscule, vent. Vent. » Il est dessiné selon les règles de propreté (`proprete.md`), et le système des lieux est décrit au §14 de `decor-rue.md`. Une PR par lieu.

## 1. Les choix du développeur

- **Le crépuscule, et rien d'autre** : le ciel clair, la brume de sable et une pluie rare. Pas de plein jour : les grandes couleurs restent dans la bande des flashs (`flashs.md` §3).
- **Le vent** : c'est sa signature. Le sable file en nappes sur les crêtes, et le **vent** est le moment fort : toutes les 40 s, une rafale balaie la dune et soulève le sable.
- **Le sol est du sable** (`ground: 'sand'`) : la poussière que les combats soulèvent est celle de la plage (`decor-plage.md` §6).
- **Les couleurs** : les sables restent sombres, dans la bande des flashs ; aucune couleur vive ne s'approche du cyan ni du magenta des combattants.

## 2. La composition, de loin à près

### 2.1 `far`, le désert au loin (25 %)

- Le ciel du crépuscule, du bleu profond au-dessus jusqu'à l'ambre du couchant. Son dégradé est la seule trame du lieu.
- Le soleil bas, à demi derrière les dunes.
- **Trois plans de dunes** en vagues de plus en plus sombres, les plus lointaines pâles.

### 2.2 `mid`, la dune (50 %)

- **À gauche et à droite**, les crêtes de la dune, leurs ombres portées.
- **Au centre**, la plaine reste ouverte : un arbre mort, des touffes d'herbe sèche, un scarabée.
- Les nappes de sable qui filent sur les crêtes (`sand0`, `sand1`), et la rafale qui traverse (`gust`, le moment fort).
- **Au sol du milieu**, le sable, l'ombre des crêtes.

### 2.3 `floor`, le sable sous les pieds (100 %)

- Le sable en bandes, ses rides tous les 64 unités du monde.
- Les traces du vent, une touffe par-ci par-là, quelques pierres.
- Les flaques de lumière du couchant.

## 3. La palette

`tools/stage/dunes/palette.ts`, la sienne : le ciel du crépuscule, le soleil, les dunes (trois plans), l'arbre mort, les herbes sèches, le sable, les pierres, le scarabée, la brume. Les sables restent sombres et les couleurs vives sont absentes (test).

## 4. Les ambiances

- **Crépuscule, ciel clair** : la base.
- **Crépuscule, brume** : une brume de sable, les dunes lointaines effacées, deux bancs dérivent.
- **Crépuscule, pluie** : une pluie rare, le sable fonce et luit.

## 5. Ce qui bouge

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- |
| `gust` | la rafale qui balaie le sable à travers la plaine : le moment fort | une fois par cycle, centrée au `GUST_AT` |
| `sand0`, `sand1` | les nappes de sable qui filent sur les crêtes | 120 pas par boucle |
| `beetle` | le scarabée qui avance puis s'arrête | 8 s |
| `mist0`, `mist1` | la brume, par temps de brume seulement | 50 et 40 s |

**La rafale** est le moment fort : toutes les 40 s, à `GUST_AT`, une volée de sable traverse la plaine et les nappes filent plus fort. Rien ne clignote : chaque état tient au moins 20 pas (test).

## 6. Les budgets

- **La planche** reste sous 9 Mo pour le lieu, aucune texture au-delà de 2 048 px.
- **La propreté** : sous 4 % de bruit dans `far`, 5 % dans `mid`, 3 % dans `floor`.
- **Les grandes couleurs** restent dans la bande des flashs, dans chaque ambiance (test de contrat).
