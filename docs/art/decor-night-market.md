# Night Market

Le dixième lieu, dans la liste acceptée par le développeur (« prends les 10 ») : « stands, lampions, vapeur des woks, scooter au fond ; enseignes en chinois. » Il est dessiné selon les règles de propreté (`proprete.md`), et le système des lieux est décrit au §14 de `decor-rue.md`. Une PR par lieu.

## 1. Les choix du développeur

- **La nuit, et le crépuscule.** Le lieu n'est pas couvert : sa pluie tombe du rendu, et sa brume a ses bancs.
- **Ses météos** : le ciel clair, la pluie et la brume (`brume.md` §4).
- **Ses moments** : minuit (la base) et le crépuscule.
- **Un seul lieu, une identité chaude** : le rouge des lampions, l'orange des woks, le vert-de-gris des auvents. La nuit du marché n'est ni le violet du toit ni le rouge laqué du temple.
- **Les enseignes en chinois** : celles que la police du jeu sait déjà écrire (`font.ts`) — 大吉 (grande fortune), 衣 (vêtement). Aucun nouveau glyphe n'est dessiné.
- **La vie en profondeur** : un plan de ville lointain derrière un plan proche, un train aérien qui passe une fois par cycle au moment où le wok s'embrase, une charrette au fond, des passants, un chat, des tissus qui bougent, des flaques qui reflètent les lampions.

## 2. La composition, de loin à près

### 2.1 `far`, la ville derrière le marché (25 %)

- Le ciel, du bleu profond au ras de la ville jusqu'à une brume chaude au-dessus des toits. Son dégradé est la seule trame du lieu.
- La lune, haute et voilée, et une trentaine d'étoiles.
- Des nuages bas, en aplats.
- **Deux plans de ville** : au fond, des tours pâles proches de la brume ; devant, des immeubles plus sombres, aux toits irréguliers, avec fenêtres allumées, châteaux d'eau, antennes et édicules d'escalier.
- **La ligne aérienne**, au-dessus des toits : sa poutre, ses piliers, et le train qui y passe (`train`, §5).
- Des fils électriques qui pendent d'un poteau à l'autre, et quelques lampions accrochés.

### 2.2 `mid`, la ruelle du marché (50 %)

- **À gauche**, un stand de vêtements : ses poteaux, son auvent rayé, son comptoir, ses tissus pendus (rouge, crème, vert, bleu-vert), son enseigne 衣 et son noren.
- **À droite**, un stand de cuisine : son auvent, son comptoir, le wok et sa vapeur, ses ustensiles pendus, son urne, ses caisses, le cuisinier qui tourne la main au moment du coup de feu, son enseigne 大吉 et son noren, le chat sur le comptoir.
- **Au centre**, la ruelle reste ouverte : la charrette au fond, avec son petit auvent, son lampion pâle et son cuisinier, et deux passants aux abords. Rien ne charge la zone des combattants.
- **En haut**, deux guirlandes de lampions traversent la ruelle, l'une rouge, l'autre pâle ; deux grands lampions pendent sous les auvents, leur halo chaud sur les panneaux.
- **Au fond**, la moto garée près d'une caisse.
- **Au sol du milieu**, le pavé sombre, l'ombre portée des stands, les flaques de lumière des lampions.

### 2.3 `floor`, le pavé sous les pieds (100 %)

- Le pavé en dalles de deux tons, ses joints tous les 64 unités du monde (ils mesurent les distances).
- Des fissures, une bouche d'égout, un caniveau, des papiers, des traces de pas, un trait de craie.
- Les flaques de lumière des lampions, et les flaques d'eau qui les reflètent en traits brisés.
- L'ombre des stands aux deux bouts. Aucune grande couleur claire : le sol reste sous la bande des flashs.

## 3. La palette

`tools/stage/marche/palette.ts`, la sienne :

- le ciel, les nuages, la lune, la brume chaude ;
- la ville lointaine et la ville proche, leurs fenêtres ;
- le bois, les auvents (rouge sombre et crème), le pavé ;
- les lampions rouges et pâles et leur lumière, les fenêtres allumées ;
- les tissus (rouge, crème, vert, bleu-vert), les denrées, les caisses ;
- la moto, le train et ses fenêtres d'or éteint ;
- les silhouettes, la peau, le liseré ;
- la vapeur, le feu du wok ;
- l'ombre portée et la lumière posée (les deux rampes `SHADOW` et `LIGHT_POOL`) ;
- la brume.

Les rouges restent loin du magenta des combattants, et les verts et bleu-vert des tissus sont ternes, loin du cyan (test).

## 4. Les ambiances

- **Minuit, ciel clair** : la base.
- **Crépuscule, ciel clair** : le ciel vire à l'ambre, la ville se découpe, les lampions s'allument plus fort.
- **Minuit, pluie** : le pavé luit, les auvents ruissellent et gouttent (`drip`, §5), les lampions restent vifs.
- **Minuit, brume** : la ville s'efface, la lune pâlit, les lampions brillent dans la brume, deux bancs dérivent (un sur les toits, un bas sur la ruelle).

## 5. Ce qui bouge

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- |
| `train` | le train aérien qui traverse le ciel, fenêtres allumées, phare | une fois par cycle, centré au `FLARE_AT` |
| `steam` | la vapeur du wok qui monte en s'infléchissant | 160 tics par boucle |
| `flare` | le wok qui s'embrase : le moment fort, flamme, étincelles | une fois par cycle de 40 s |
| `cook` | le cuisinier qui remue, puis donne le coup de poignet | autour du `FLARE_AT` |
| `cat` | le chat, sa queue qui fouette | toutes les 4 s |
| `crowd0`, `crowd1` | les passants qui respirent, chacun à son rythme | 1,5 s |
| `cloth` | les tissus pendus qui balancent | 2 s |
| `tasselL`, `tasselR` | le gland des grands lampions | 3 s |
| `drip` | les gouttes de l'auvent, par temps de pluie seulement | 4 s |
| `mist0`, `mist1` | la brume, par temps de brume seulement | 50 et 40 s |

**Le coup de feu** est le moment fort. Toutes les 40 s (`CYCLE`), à `FLARE_AT`, le cuisinier donne le coup de poignet, la flamme monte du wok pendant 60 tics avec ses étincelles, et le train passe au-dessus, centré au même moment. Aucun lampion ne s'allume ni ne s'éteint : les animations ne changent jamais l'appartenance d'un pixel aux rampes de lumière (test).

## 6. Les budgets

- **La planche** reste sous 9 Mo pour le lieu, et aucune texture ne dépasse 2 048 px (`tests/build/vram-budget.test.ts`).
- **La propreté** : les zones des combattants restent sous 4 % de bruit dans `far`, 5 % dans `mid`, 3 % dans `floor`.
- **Les grandes couleurs** restent dans la bande des flashs et sous le plafond des mesures, dans chaque ambiance (test de contrat).
