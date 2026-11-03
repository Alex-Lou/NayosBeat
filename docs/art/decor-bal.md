# Le Bal du Samedi

Le septième lieu : le lieu de Saphir (`univers.md`), une salle de bal des années 50, un samedi soir, l'orchestre de swing sur son estrade. Dessiné selon les règles de propreté (`proprete.md`). Le système des lieux est décrit au §14 de `decor-rue.md`.

## 1. L'intention

On se bat sur le parquet, au milieu des danseurs, devant l'orchestre :
- au fond, l'estrade et son cadre doré, les rideaux de velours vert ouverts sur l'orchestre ;
- les lustres sous le plafond ;
- deux hautes fenêtres sur la nuit ;
- à gauche, le grand escalier par lequel on descend dans la salle (Saphir y fait son entrée) ;
- à droite, la banquette et les tables.

Toutes les 40 s, l'orchestre attaque un chorus (§5). Le lieu est **couvert** (`sheltered`) : rien ne tombe sur la piste.

Les choix du développeur (`brume.md` §4) :
- minuit seulement ;
- la pluie et la neige, vues par les hautes fenêtres ;
- vert profond et or ;
- le seul lieu où les enseignes en français sont justifiées (`passation-decors.md` §7) : « TOUS LES SAMEDIS » sous « SWING NIGHT », « BAL » sur la grosse caisse.

## 2. La composition, de loin à près

### 2.1 `far`, le fond de la salle (25 %)

- Les murs ivoire passés dans la nuit, leurs pilastres et leurs chapiteaux dorés, la corniche, le lambris et sa cimaise.
- Trois lustres sous le plafond, leur couronne dorée, leur rang d'ampoules. Ils sont en haut de l'écran, loin des combattants.
- Deux hautes fenêtres cintrées, leur cadre doré, leur meneau, leurs traverses. Derrière, la nuit en trois aplats, et l'appui dehors. Sur chacune, une draperie et deux rideaux de velours retenus par une embrasse.
- L'estrade : le cadre de scène doré, le rideau du fond en plis, les rideaux ouverts, la draperie festonnée, la jupe plissée de l'estrade.
- Le bandeau « SWING NIGHT » en ampoules, et « TOUS LES SAMEDIS » dessous. Il est accroché sous la draperie, dans l'ouverture, parce que le HUD couvre le mur au-dessus.
- L'orchestre en silhouettes, liserées de la lumière chaude des lampes :
  - la trompette et le saxophone derrière leurs pupitres dorés ;
  - la contrebasse ;
  - la batterie, sa grosse caisse « BAL » et sa cymbale.

### 2.2 `mid`, le bord de la piste (50 %)

- Le grand escalier à gauche : son flanc, son tapis de velours, sa rampe dorée et ses balustres, la lampe du pilastre en bas.
- Deux colonnes ivoire, leurs cannelures, leurs chapiteaux et leurs bases dorées.
- Trois couples qui dansent le swing entre elles : le cavalier, la cavalière en robe rouge sombre.
- À droite, la banquette de velours, deux tables nappées et leurs petites lampes, une invitée assise qui regarde la piste.

### 2.3 `floor`, le parquet sous les pieds (100 %)

- Des rangs de lames couleur miel, leurs joints décalés, un long joint toutes les 64 unités du monde (ils mesurent les distances).
- Les longs reflets plats des lustres sur le vernis.
- Le filet doré au bord de la piste, puis les lames plus sombres au premier plan.

## 3. La palette

`tools/stage/bal/palette.ts`, la sienne :
- le velours vert ;
- l'ivoire des murs ;
- l'or des cadres, des chapiteaux et des cuivres ;
- le parquet ;
- les lampes : leur abat-jour, l'ampoule ;
- la nuit derrière les fenêtres, et l'appui dehors (une rampe cachée, §4) ;
- la pluie et la neige, dessinées par leurs seules animations ;
- les nappes, le bois sombre ;
- les silhouettes, la peau, le liseré chaud, les robes.

Aucune couleur vive près du cyan ou du magenta des combattants (test).

## 4. Les ambiances

- **Minuit** (la base).
- **Minuit, pluie** : la nuit derrière les vitres plus sombre et plus froide, la pluie qui ruisselle sur le verre. La salle reste telle quelle.
- **Minuit, neige** : la nuit derrière les vitres plus pâle, éclairée par la neige, les flocons qui tombent lentement. La neige est tassée sur les appuis dehors. C'est une rampe cachée (`SILL`), du ton de la nuit dans les autres palettes ; un test le vérifie.

## 5. Ce qui bouge

| Animation | Ce qu'elle montre | Rythme |
| --- | --- | --- |
| `band` | l'orchestre qui balance sur le temps : un plongeon, la contrebasse pincée, la caisse frappée | 150 BPM |
| `couple0` à `couple2` | les couples qui dansent : la main dans la main, un balancé, un kick, chacun décalé | 150 BPM |
| `rain0`, `rain1` | la pluie derrière les vitres, sous la pluie seulement | 3 tics par image |
| `snow0`, `snow1` | la neige derrière les vitres, sous la neige seulement | 8 tics par image |

**Le chorus**, le moment fort. Toutes les 40 s (`CHORUS_CYCLE`), l'orchestre attaque un chorus pendant huit temps, à partir de `CHORUS_AT` :
- la trompette et le saxophone se lèvent, pavillons au ciel ;
- le batteur lève ses baguettes ;
- les couples se lancent en swing-out, un temps sur deux : la cavalière part au bout du bras, les mains jointes en l'air.

Le test vérifie que tout ce que le chorus fait bouger boucle sur le même cycle et change à son premier temps. Il vérifie aussi qu'aucune animation n'allume ni n'éteint une ampoule : les lumières sont fixes.

## 6. Les budgets

- **La planche** fait 1 022 × 442, soit 8,05 Mo avec les calques, sous les 9 Mo d'un lieu.
- **La propreté** : 0,04 % de bruit dans `far`, 0,03 % dans `mid`, aucun dans `floor`.
- **Le test de contrat** utilise les vérifications communes des lieux (`tests/tools/stage-contract.ts`).
