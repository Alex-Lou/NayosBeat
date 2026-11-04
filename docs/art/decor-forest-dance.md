# Dancing Forest

Le douzième lieu, un choix du développeur : « Forêt au matin, arbres dansants. Feuilles. » La référence du développeur (le pin Pinterest) a donné l'atmosphère et la composition : une **forêt de nuit**, une **hutte** à toit de tuiles et verrière, un **chat noir** dans la lumière, un **vélo**, un **panneau**, un **banc**, des herbes folles, de grands arbres et une canopée dense. Le lieu est **dessiné par le code**, à sa manière : la référence inspire, elle n'est pas copiée.

## 1. Les choix du développeur

- **La nuit** : minuit, ciel clair, la pluie et la brume. Les grandes couleurs restent dans la bande des flashs (`flashs.md` §3) ; la lumière chaude de la hutte est une petite touche.
- **La hutte** : le cœur du lieu — son toit, sa verrière bleu-vert, ses fenêtres chaudes, sa lampe, son panneau, son banc et son vélo. Le chat noir veille dans la flaque de lumière.
- **Les feuilles** : la signature. Elles tombent sans cesse, et le **vent** est le moment fort : toutes les 40 s, une rafale balaie la clairière et les couronnes dansent plus fort.
- **Les couleurs** : les verts et les teals restent sombres, loin du cyan des combattants ; la lumière de la hutte est chaude, loin du magenta.

## 2. La composition, de loin à près

### 2.1 `far`, le fond de la forêt (25 %)

- La forêt de nuit, d'un seul tenant : la **haute canopée** (deux ou trois couches de masses de feuilles, des branches), les **grands troncs** et leurs plans successifs, la brume entre les plans.
- Le ciel ne se voit que par les trouées de la canopée ; aucune grande bande de ciel vide.
- Opaque partout.

### 2.2 `mid`, la hutte et la clairière (50 %)

- **Au centre, la hutte** : un toit de tuiles à bord ondulé, une **verrière bleu-vert** à gauche, des murs de planches, une porte, deux fenêtres chaudes, une lampe sur le poteau de droite, un panneau, un banc, un vélo.
- **Le chat noir** dans la lumière de la lampe, sa queue qui remue (`cat`).
- **À gauche et à droite**, deux grands arbres, leurs troncs, leurs racines et leurs couronnes qui dansent (`canopy0`, `canopy1`).
- **Au-dessus**, la branche et les feuilles du premier plan (`canopy2`), qui dansent aussi.
- Des feuilles qui tombent sans cesse (`leaves`), et la rafale qui les balaie (`gust`, le moment fort).
- Les fougères, les buissons et l'herbe au pied de la hutte.

### 2.3 `floor`, le sol de la forêt (100 %)

- La terre, la mousse, le sentier de terre, l'herbe et les fougères, les feuilles mortes, les cailloux et les racines.
- Les flaques de lumière chaude de la hutte entre les herbes.
- Plat là où les combattants se tiennent (`proprete.md`).

## 3. La palette

`tools/stage/foret/palette.ts`, la sienne : la nuit bleu-vert, la canopée (verts et teals sombres), les écorces, la hutte (bois sombre, verrière, lumière chaude), le chat noir, la terre, la mousse, l'herbe, les feuilles mortes, la pierre, la brume. Les grandes masses restent dans la bande des flashs ; la lumière de la hutte, petite, peut briller. Les verts restent loin du cyan et la lumière chaude loin du magenta (test).

## 4. Les ambiances

- **Minuit, ciel clair** : la base.
- **Minuit, brume** : la forêt se noie dans la brume, deux bancs dérivent entre les troncs.
- **Minuit, pluie** : une pluie fine, la terre fonce, les feuilles luisent.

## 5. Ce qui bouge

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- |
| `gust` | la rafale qui balaie les feuilles à travers la clairière : le moment fort | une fois par cycle, centrée au `GUST_AT` |
| `canopy0`, `canopy1`, `canopy2` | les couronnes et la branche du premier plan qui dansent, plus fort pendant la rafale | 1,5 s |
| `leaves` | des feuilles qui tombent en tournoyant | 160 pas par boucle |
| `bird` | l'oiseau qui sautille sur la souche | 6 s |
| `hut` | la lampe et les fenêtres qui respirent | 1,5 s |
| `cat` | la queue du chat qui remue | 2 s |
| `mist0`, `mist1` | la brume, par temps de brume seulement | 50 et 40 s |

**La rafale** est le moment fort : toutes les 40 s, à `GUST_AT`, une volée de feuilles traverse la clairière et les couronnes dansent plus fort. Rien ne clignote : chaque état tient au moins 20 pas (test).

## 6. Les budgets

- **La planche** reste sous 9 Mo pour le lieu, aucune texture au-delà de 2 048 px.
- **La propreté** : sous 4 % de bruit dans `far`, 5 % dans `mid`, 3 % dans `floor`.
- **Les grandes couleurs** restent sous le fond le plus clair des tables de flashs, dans chaque ambiance (test de contrat).
- **La lumière de la hutte** reste une petite touche : elle ne doit pas devenir une grande couleur claire (`stage-foret.test.ts`).

## 7. La suite

1. Pousser les détails de la référence : les feuilles de la canopée, l'écorce des grands arbres, les herbes folles.
2. Peut-être une deuxième hutte ou un second chat, si le développeur le souhaite.
3. Les autres ambiances (la neige, l'aube) si le lieu en a besoin.
