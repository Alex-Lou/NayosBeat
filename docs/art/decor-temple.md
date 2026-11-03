# Temple Courtyard

Le cinquième lieu des combats, celui de l'Archipel des Légendes (`univers.md` §3) : la cour d'un temple sur une île, la mer et les îles derrière son mur. C'est le premier lieu dessiné selon les règles de propreté (`proprete.md`), et le premier à offrir la neige. Le système des lieux est décrit au §14 de `decor-rue.md`.

## 1. L'intention

Une cour de temple le soir, calme et nette : des lanternes de papier qui oscillent sur un fil, deux lanternes de pierre allumées, un grand portique laqué de rouge et sa corde sacrée, un cerisier, la grande salle à gauche. Au-delà du mur, la mer, des îles et une pagode, la lune et son reflet. Toutes les 40 s, une bourrasque traverse la cour (§5).

Le lieu doit se lire en une seconde (« un temple, sur une île, le soir ») et rester le plus calme de tous derrière les combattants.

Les choix du développeur :
- l'aube, le crépuscule et la nuit, mais pas de plein jour : on reste dans la bande des flashs ;
- la pluie et la neige ;
- la propreté façon BlazBlue, par ses principes et jamais par ses images (`proprete.md`).

## 2. La composition, de loin à près

Mêmes calques, mêmes tailles et même grain que la rue (×2).

### 2.1 `far`, la mer au-delà du mur (25 %)

- Un ciel de nuit en dégradé, la seule trame du lieu.
- La lune, un disque net, son croissant éclairé et un anneau de lumière autour.
- Trois nuages en bandes plates, éclairés par-dessous.
- La mer en bandes nettes jusqu'à l'horizon, et le reflet de la lune en tirets.
- Les îles en silhouettes franches, leur crête éclairée par la lune, et une pagode sur la plus proche, une fenêtre allumée.
- Une barque de pêcheur et sa lanterne, qui traverse au loin (`StageDrift`).

### 2.2 `mid`, la cour (50 %)

- **Le mur de la cour**, ses panneaux et ses poteaux de pierre, son chaperon de tuiles. Le lointain se voit au-dessus.
- **La grande salle**, à gauche :
  - sa base de pierre et ses marches, ses piliers laqués ;
  - ses portes de bois, une partie en papier éclairé de l'intérieur ;
  - son grand toit de tuiles aux bords relevés ;
  - deux lanternes de papier sous l'avant-toit, et un carillon de bronze à l'angle.
- **Les ema et les omikuji** près des marches : de petites tablettes de bois et des nœuds de papier, au bord, à l'écart.
- **Le portique**, au centre :
  - deux piliers rouges et leur pied noir ;
  - deux poutres, celle du haut aux extrémités relevées ;
  - la corde sacrée et ses papiers en zigzag.
- **Deux renards de pierre**, au pied du portique, avec leur bavoir rouge.
- **Deux lanternes de pierre**, leur foyer allumé.
- **Un fil de lanternes de papier**, du portique jusqu'au cerisier.
- **Le cerisier**, à droite : un tronc sombre, et des grappes de fleurs en aplats, éclairées par-dessus.

Derrière les combattants, il n'y a que des masses simples : le mur, les piliers du portique, les lanternes de pierre.

### 2.3 `floor`, le sol de la cour (100 %)

Un sol en bandes nettes :
- de grandes dalles en deux rangées décalées, leurs joints toutes les 64 unités du monde, de la mousse dans certains ;
- une bande de gravier ratissé ;
- la bordure de pierre et son arête éclairée ;
- la mousse au premier plan.

## 3. La palette

`tools/stage/temple/palette.ts`, la sienne.
- **La nuit** : le ciel, les nuages, la lune, la mer, les îles.
- **La cour** : la pierre, la mousse, le bois sombre, la laque rouge, les tuiles.
- **La lumière** : l'orange des lanternes.
- **Le papier, la corde, l'écorce** ; les fleurs du cerisier, d'un rose sourd, loin du magenta des combattants ; les bavoirs ; le bronze.
- **Les rampes cachées de la neige** (`SNOW_TILE`, `SNOW_STONE`, `SNOW_MOSS`, `SNOW_BLOSSOM`) : sans la neige, elles reprennent ton pour ton ce qu'elles couvrent (test).

Le premier essai sortait de la bande des flashs :
- trop sombre : le bois des portes ;
- trop clairs : le papier éclairé des portes, le rose du cerisier et l'arête laquée des piliers.

Ce sont des masses, et les tables de flashs bougeaient : elles sont revenues dans l'enveloppe. Seules les fines arêtes, sous 1 % de l'écran, restent claires.

## 4. Les ambiances

- **Minuit, ciel clair** (la base) : la lune, les lanternes.
- **Crépuscule, ciel clair** : le ciel du bleu profond à un ambre sourd à l'horizon, les nuages rosés, la mer qui prend la chaleur du ciel, les îles sombres en contre-jour.
- **Aube, ciel clair** : une lumière froide d'ardoise, le ciel en couvercle pâle avec un peu de rose au-dessus de la mer, les lanternes encore allumées.
- **Crépuscule, pluie** : l'ambre réduit à une bande à l'horizon, la pierre et le bois mouillés, les lanternes aussi vives.
- **Minuit, neige** : les toits, le chaperon du mur, les lanternes de pierre, les branches du cerisier et les dalles se couvrent d'un gris lavande. Les grandes surfaces restent dans l'enveloppe des flashs ; leurs fines arêtes sont claires. Les flocons tombent dans la couche du rendu (`stage-rain.ts`).

## 5. Ce qui bouge

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- |
| `string` | les quatre lanternes de papier du fil, qui se balancent | une lente oscillation ; large dans la bourrasque |
| `hall` | les deux lanternes de l'avant-toit | en phase avec le fil |
| `shide` | les papiers de la corde sacrée | de temps en temps ; vite dans la bourrasque |
| `chime` | le battant du carillon | dans la bourrasque |
| `petals0` à `petals2` | les pétales qui tombent sous le cerisier | une chute lente ; une volée emportée dans la bourrasque |
| `flame0`, `flame1` | le souffle du feu des lanternes de pierre | chaque état tenu 40 tics au moins |
| `glitter` | le reflet de la lune sur la mer | 20 tics par image |
| `boat` | la barque qui traverse au loin | 50 s |

**La bourrasque**, le moment fort. Toutes les 40 s (un cycle de 2 400 tics, `GUST_CYCLE`), le vent se lève pendant 5 s, à partir de `GUST_AT` :
- les lanternes de papier se balancent large ;
- les papiers de la corde claquent et le carillon sonne ;
- le cerisier lâche une volée de pétales emportés vers la gauche.

Le test de contrat vérifie que tout ce qu'elle secoue boucle sur le même cycle et change dès qu'elle se lève.

## 6. Les budgets

- **La planche des animations** fait 1 001 × 503 : 8,3 Mo avec les calques, sous les 9 Mo d'un lieu.
- **La propreté** (`proprete.md`) : 1,4 % de bruit au lointain, presque rien au milieu et au sol. C'est le lieu le plus propre, et son test le garde.
- **Le budget de mémoire vidéo du match** : en ajoutant ce lieu, le test a révélé qu'il additionnait les textures des lumières de **tous** les lieux, comme si un combat les chargeait tous. Il compte maintenant celles du seul lieu le plus lourd (`vram-budget.test.ts`), comme le disait son commentaire.

## 7. La suite

1. Les dégâts : une dalle fendue, une lanterne de papier déchirée.
2. La brume sur la mer, au matin.
