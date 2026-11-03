# Night Market

Le dixième lieu, dans la liste acceptée par le développeur (« prends les 10 ») et resté à faire : « stands, lampions, vapeur des woks, scooter au fond ; enseignes en chinois. » Il est dessiné selon les règles de propreté (`proprete.md`), et le système des lieux est décrit au §14 de `decor-rue.md`. Une PR par lieu.

## 1. Les choix du développeur

- **La nuit, et le crépuscule.** Le lieu n'est pas couvert : sa pluie tombe du rendu, et sa brume a ses bancs.
- **Ses météos** : le ciel clair, la pluie et la brume (`brume.md` §4).
- **Ses moments** : minuit (la base) et le crépuscule.
- **Un seul lieu, une identité chaude** : le rouge des lampions, l'orange des woks, le vert-de-gris des auvents. La nuit du marché n'est ni le violet du toit ni le rouge laqué du temple.
- **Les enseignes en chinois** : celles que la police du jeu sait déjà écrire (`font.ts`) — 大吉 (grande fortune), 门 (porte), 衣 (vêtement). Aucun nouveau glyphe n'est dessiné.

## 2. La composition, de loin à près

### 2.1 `far`, la ville derrière le marché (25 %)

- Le ciel, du bleu profond au ras de la ville jusqu'à une brume chaude au-dessus des toits. Son dégradé est la seule trame du lieu.
- Des nuages bas, en aplats.
- Les toits et les tours de la ville, en silhouettes plates, avec des fenêtres allumées éparses.
- Une tour plus haute, son feu rouge fixe.
- Des fils électriques qui pendent d'un poteau à l'autre, et quelques lampions accrochés.

### 2.2 `mid`, la ruelle du marché (50 %)

- **À gauche**, un stand de vêtements : ses poteaux, son auvent rayé, son comptoir, des piles de tissus, son enseigne 衣.
- **À droite**, un stand de cuisine : son auvent, son comptoir, le wok et sa vapeur, ses caisses, un vendeur en silhouette, son enseigne 大吉.
- **Au centre**, la ruelle reste ouverte : le lointain se voit entre les deux stands, et rien ne charge la zone des combattants.
- **En haut**, des guirlandes de lampions traversent la ruelle ; deux grands lampions pendent sous les auvents.
- **Au fond**, une moto garée près d'une caisse, et la porte 门 du marché.
- **Au sol du milieu**, le pavé sombre, et l'ombre portée des stands.

### 2.3 `floor`, le pavé sous les pieds (100 %)

- Le pavé en bandes plates, ses joints tous les 64 unités du monde (ils mesurent les distances).
- Quelques plaques plus sombres, et des flaques ternes qui ne reflètent rien de vif.
- Aucune grande couleur claire : le sol reste sous la bande des flashs.

## 3. La palette

`tools/stage/marche/palette.ts`, la sienne :

- le ciel, les nuages, la brume chaude ;
- la ville et ses fenêtres ;
- le bois, les auvents (rouge sombre et crème), le pavé ;
- les lampions et leur lumière, les fenêtres allumées ;
- les tissus, les denrées, les caisses ;
- la moto ;
- les silhouettes, la peau, le liseré ;
- la vapeur, le feu du wok ;
- la brume.

Les rouges restent loin du magenta des combattants, et aucun vert vif ne s'approche du cyan (test).

## 4. Les ambiances

- **Minuit, ciel clair** : la base.
- **Crépuscule, ciel clair** : le ciel vire à l'ambre, la ville se découpe, les lampions s'allument plus fort.
- **Minuit, pluie** : le pavé luit, les auvents ruissellent, les lampions restent vifs.
- **Minuit, brume** : la ville s'efface, les lampions brillent dans la brume, deux bancs dérivent (un sur le lointain, un bas sur la ruelle).

## 5. Ce qui bouge

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- |
| `steam` | la vapeur du wok qui monte | 160 tics par boucle |
| `flare` | le wok qui s'embrase : le moment fort | une fois par cycle de 40 s |
| `sign` | l'enseigne 大吉 qui grince | 5 s |
| `tasselL`, `tasselR` | le gland des grands lampions dans le courant d'air | 3 s |
| `mist0`, `mist1` | la brume, par temps de brume seulement | 50 et 40 s |

**Le wok qui s'embrase** est le moment fort. Toutes les 40 s (`CYCLE`), à `FLARE_AT`, une flamme monte du wok pendant 60 tics, puis retombe. Aucun lampion ne s'allume ni ne s'éteint : les animations ne changent jamais l'appartenance d'un pixel aux rampes de lumière (test).

## 6. Les budgets

- **La planche** reste sous 9 Mo pour le lieu, et aucune texture ne dépasse 2 048 px.
- **La propreté** : les zones des combattants restent sous 4 % de bruit dans `far`, 5 % dans `mid`, 3 % dans `floor`.
- **Les grandes couleurs** restent dans la bande des flashs et sous le plafond des mesures, dans chaque ambiance (test de contrat).
