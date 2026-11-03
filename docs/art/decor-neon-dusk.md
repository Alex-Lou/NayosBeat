# Neon Dusk

Le onzième lieu, un nouveau choix du développeur : « Cyberpunk nuit, pluie. Pluie / fumée / lumière. » Il est dessiné selon les règles de propreté (`proprete.md`), et le système des lieux est décrit au §14 de `decor-rue.md`. Une PR par lieu.

## 1. Les choix du développeur

- **La nuit cyberpunk, et rien d'autre** : minuit, ciel clair, pluie et brume. Pas de plein jour : les grandes couleurs restent dans la bande des flashs (`flashs.md` §3).
- **Les néons** : orange chaud et vert acide, jamais le cyan ni le magenta, qui sont aux combattants (`proprete.md` §1). Le bleu profond de la ville reste terne.
- **La vie** : deux voitures volantes qui traversent le ciel, une au moment fort ; la vapeur des bouches d'égout ; un néon qui respire ; un passant sous un parapluie ; un chat.
- **Les enseignes** : en anglais et en japonais, comme les autres lieux de la mégapole (`decor-rue.md` §10) ; aucune marque, aucun lieu réel.

## 2. La composition, de loin à près

### 2.1 `far`, la mégapole (25 %)

- Le ciel, du bleu profond au-dessus jusqu'à une brume chaude sur la ville. Son dégradé est la seule trame du lieu.
- Deux plans de tours : les plus lointaines pâles, les proches sombres, avec antennes et feux fixes.
- Un panneau holographique au loin, dim, qui ne clignote jamais.
- **Les voitures volantes** : deux silhouettes aux feux chauds qui glissent au-dessus des toits (`car0`, `car1`, §5). Celle de devant est le moment fort : elle passe à basse altitude au milieu du cycle.

### 2.2 `mid`, la rue sous les néons (50 %)

- **À gauche**, un stand de nouilles : son auvent de tôle, son comptoir, sa vapeur, son enseigne japonaise.
- **À droite**, un mur de distributeurs, une enseigne qui respire, un écran holographique.
- **Au centre**, la rue reste ouverte : une bouche d'égout qui fume, un passant sous son parapluie, un chat sur une caisse.
- **En haut**, des câbles et des guirlandes d'ampoules chaudes.
- **Au sol du milieu**, l'asphalte mouillé, les flaques de lumière orange et verte des néons.

### 2.3 `floor`, l'asphalte mouillé (100 %)

- L'asphalte en dalles, ses joints tous les 64 unités du monde.
- Les reflets des néons : des tirets orange et verts, plus courts et plus rares loin des murs.
- Des flaques, une plaque d'égout, des papiers, l'ombre des stands aux deux bouts.

## 3. La palette

`tools/stage/neon/palette.ts`, la sienne : le ciel, la brume, les tours, le néon orange et le néon vert, le bleu terne des murs, la tôle, l'asphalte et ses reflets, les silhouettes, la vapeur, les voitures volantes et leurs feux, la brume.

## 4. Les ambiances

- **Minuit, ciel clair** : la base.
- **Minuit, pluie** : l'asphalte luit, les néons se reflètent, les enseignes restent vives.
- **Minuit, brume** : la ville s'efface, les néons brillent dans la brume, deux bancs dérivent.

## 5. Ce qui bouge

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- | --- |
| `car0` | la voiture volante de devant, qui passe à basse altitude : le moment fort | une fois par cycle, centrée au `CAR_AT` |
| `car1` | une autre, plus loin et plus lente | une fois par cycle, décalée |
| `neon` | l'enseigne qui respire, chaque état tenu 20 pas au moins | 2 s |
| `steam` | la vapeur de la bouche d'égout | 160 pas par boucle |
| `walker` | le passant qui lève puis baisse son parapluie | 5 s |
| `cat` | le chat, sa queue qui fouette | 4 s |
| `mist0`, `mist1` | la brume, par temps de brume seulement | 50 et 40 s |

**La voiture volante** est le moment fort : toutes les 40 s, à `CAR_AT`, elle traverse la rue à hauteur des enseignes, ses feux allumés, et la vapeur monte plus fort au même moment. Aucun néon ne s'allume ni ne s'éteint d'un coup : chaque état tient 20 pas au moins (test).

## 6. Les budgets

- **La planche** reste sous 9 Mo pour le lieu, aucune texture au-delà de 2 048 px.
- **La propreté** : sous 4 % de bruit dans `far`, 5 % dans `mid`, 3 % dans `floor`.
- **Les grandes couleurs** restent dans la bande des flashs, dans chaque ambiance (test de contrat).
