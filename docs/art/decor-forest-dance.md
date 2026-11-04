# Dancing Forest

Le douzième lieu, un nouveau choix du développeur : « Forêt au matin, arbres dansants. Feuilles. » Il est dessiné selon les règles de propreté (`proprete.md`), et le système des lieux est décrit au §14 de `decor-rue.md`. Une PR par lieu.

## 1. Les choix du développeur

- **Le matin, et rien d'autre** : l'aube, la brume et une pluie fine. Pas de plein jour : les grandes couleurs restent dans la bande des flashs (`flashs.md` §3), comme l'aube du temple.
- **Les feuilles** : c'est sa signature. Elles tombent sans cesse, et le **vent** est le moment fort : toutes les 40 s, une rafale balaie la clairière et les couronnes dansent plus fort.
- **Les couleurs** : les verts restent sombres et ternes, loin du cyan des combattants ; le rose de l'aube reste éteint, loin du magenta.

## 2. La composition, de loin à près

### 2.1 `far`, le fond de la forêt (25 %)

- Le ciel de l'aube, du bleu-gris au-dessus jusqu'à une lueur chaude derrière les arbres. Son dégradé est la seule trame du lieu.
- La lueur du soleil bas, à travers les troncs.
- **Trois plans d'arbres** en silhouettes de plus en plus sombres, les plus lointains pâles et rapprochés de la brume.

### 2.2 `mid`, la clairière (50 %)

- **À gauche et à droite**, deux grands arbres, leurs troncs et leurs racines, leurs couronnes qui dansent (`canopy0`, `canopy1`).
- **Au centre**, la clairière reste ouverte : une souche, un oiseau qui sautille, des feuilles mortes.
- Des feuilles qui tombent sans cesse (`leaves`), et la rafale qui les balaie (`gust`, le moment fort).
- **Au sol du milieu**, la terre du sentier, l'ombre des couronnes.

### 2.3 `floor`, le sentier (100 %)

- La terre tassée, ses repères tous les 64 unités du monde, ses cailloux et ses racines.
- Les feuilles mortes, brunes et vertes, éparpillées.
- Les flaques de lumière de l'aube entre les arbres.

## 3. La palette

`tools/stage/foret/palette.ts`, la sienne : le ciel de l'aube, la lueur, les silhouettes d'arbres, les écorces, les couronnes (vertes, sombres), les feuilles mortes, la terre, la mousse, la pierre, l'oiseau, la brume. Les verts restent loin du cyan et le rose de l'aube, éteint, loin du magenta (test).

## 4. Les ambiances

- **Aube, ciel clair** : la base.
- **Aube, brume** : la forêt se noie dans la brume du matin, deux bancs dérivent entre les troncs.
- **Aube, pluie** : une pluie fine, la terre fonce, les feuilles luisent.

## 5. Ce qui bouge

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- |
| `gust` | la rafale qui balaie les feuilles à travers la clairière : le moment fort | une fois par cycle, centrée au `GUST_AT` |
| `canopy0`, `canopy1` | les couronnes qui dansent, plus fort pendant la rafale | 1,5 s |
| `leaves` | des feuilles qui tombent en tournoyant | 160 pas par boucle |
| `bird` | l'oiseau qui sautille sur la souche | 6 s |
| `mist0`, `mist1` | la brume, par temps de brume seulement | 50 et 40 s |

**La rafale** est le moment fort : toutes les 40 s, à `GUST_AT`, une volée de feuilles traverse la clairière et les couronnes dansent plus fort. Rien ne clignote : chaque état tient au moins 20 pas (test).

## 6. Les budgets

- **La planche** reste sous 9 Mo pour le lieu, aucune texture au-delà de 2 048 px.
- **La propreté** : sous 4 % de bruit dans `far`, 5 % dans `mid`, 3 % dans `floor`.
- **Les grandes couleurs** restent dans la bande des flashs, dans chaque ambiance (test de contrat).
