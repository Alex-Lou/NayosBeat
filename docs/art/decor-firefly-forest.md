# Firefly Forest

Le quatorzième lieu, un nouveau choix du développeur : « Forêt enchantée, lucioles. Lucioles. » Il est dessiné selon les règles de propreté (`proprete.md`), et le système des lieux est décrit au §14 de `decor-rue.md`. Une PR par lieu.

## 1. Les choix du développeur

- **La nuit, et rien d'autre** : le ciel clair, la brume et une pluie fine. Pas de plein jour : les grandes couleurs restent dans la bande des flashs (`flashs.md` §3).
- **Les lucioles** : c'est sa signature. Elles dérivent sans cesse autour de la mare, et l'**essaim** est le moment fort : toutes les 40 s, une volée de lucioles traverse la clairière.
- **Les champignons luisants** : leur halo respire lentement, jamais un clignotement.
- **Les couleurs** : la nuit est bleu-vert, les lucioles jaune-vert, loin du cyan et du magenta des combattants.

## 2. La composition, de loin à près

### 2.1 `far`, le fond de la forêt (25 %)

- Le ciel de la nuit, du bleu profond au-dessus jusqu'à une lueur verte pâle derrière les arbres. Son dégradé est la seule trame du lieu.
- La lune, pâle, à travers les branches.
- **Trois plans d'arbres** en silhouettes de plus en plus sombres.

### 2.2 `mid`, la clairière (50 %)

- **À gauche et à droite**, deux grands arbres aux branches tordues, leurs lianes.
- **Au centre**, la clairière reste ouverte : la mare, ses lucioles, les champignons luisants au pied des arbres.
- Les lucioles qui dérivent (`fireflies`), et l'essaim qui traverse (`swarm`, le moment fort).
- **Au sol du milieu**, la terre et la mousse, l'ombre des arbres.

### 2.3 `floor`, le sentier (100 %)

- La terre et la mousse, ses repères tous les 64 unités du monde.
- Les racines, les pierres, les champignons.
- Les reflets pâles de la lune sur les flaques.

## 3. La palette

`tools/stage/lucioles/palette.ts`, la sienne : le ciel de la nuit, la lune, les silhouettes d'arbres, les écorces bleu-vert, les couronnes, la mare, les lucioles et les champignons luisants, la terre, la mousse, la brume. Les verts restent loin du cyan des combattants (test).

## 4. Les ambiances

- **Minuit, ciel clair** : la base.
- **Minuit, brume** : la forêt se noie dans la brume, les lucioles brillent dedans, deux bancs dérivent.
- **Minuit, pluie** : une pluie fine, la terre fonce, les champignons luisent.

## 5. Ce qui bouge

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- |
| `swarm` | l'essaim de lucioles qui traverse la clairière : le moment fort | une fois par cycle, centré au `SWARM_AT` |
| `fireflies` | les lucioles qui dérivent autour de la mare | 160 pas par boucle |
| `glow` | les champignons luisants, leur halo qui respire | chaque état tenu 20 pas au moins |
| `vines` | les lianes qui balancent | 3 s |
| `mist0`, `mist1` | la brume, par temps de brume seulement | 50 et 40 s |

**L'essaim** est le moment fort : toutes les 40 s, à `SWARM_AT`, une volée de lucioles traverse la clairière. Rien ne clignote : chaque état tient au moins 20 pas (test).

## 6. Les budgets

- **La planche** reste sous 9 Mo pour le lieu, aucune texture au-delà de 2 048 px.
- **La propreté** : sous 4 % de bruit dans `far`, 5 % dans `mid`, 3 % dans `floor`.
- **Les grandes couleurs** restent dans la bande des flashs, dans chaque ambiance (test de contrat).
