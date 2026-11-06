# Cyber Arène

La map **Cyber Arène** reprend l'illustration fournie par le développeur le 6 novembre :
- le toit d'une arène cyberpunk, sous la lune ;
- la ville et ses néons cyan derrière ;
- l'arche aux oreilles de chat ;
- le garde-corps aux motifs de chat et les machines sur les côtés.

C'est la **référence de qualité** des lieux. Son grain, son trait et ses accents cyan vont avec ceux de Féline. Pour l'instant, c'est le **seul lieu proposé** par le jeu (`OFFERED_STAGES`, `src/art/stages.ts`).

## 1. La provenance, et ce qu'on garde

- **La source** : `art-src/cyberarena/source/cyberarena.png` (1 672 × 941). C'est la référence, pas une version retouchée.
- **Ce qui est gardé** : la composition, **toutes les couleurs** et le grain du pixel art.
- **Ce qui est adapté** : l'illustration est posée entière dans les calques du jeu, aux tailles imposées, par `tools/stage/cyberarena/adapt.ts`. Les calques sont des **PNG en vraies couleurs** (`rgba`), copiés tels quels par `npm run stages`. Il n'y a **aucun filtre d'harmonisation, aucune quantification et aucun flou**.

## 2. La composition, de loin à près

### 2.0 L'échelle

- L'illustration est dessinée pour des personnages environ **1,6 fois plus grands** que Féline : c'est ce que donnent son garde-corps et sa porte.
- Elle est donc posée à **×0,62 de l'échelle de la vue**. Ses personnages auraient ainsi la taille des combattants, et son grain se rapproche de celui de Féline.
- La dalle où les combattants se tiennent (ligne 800 de la source, devant le rebord) tombe sur la ligne des pieds du jeu (y = 460).

### 2.1 `far`, le fond (25 %)

- L'illustration entière, centrée, à cette échelle.
- Au-dessus de l'image, une bande du haut du ciel est répétée. En dessous, c'est une bande du rebord. Les côtés sont **en miroir**, pour que la ville continue.
- Le calque est **opaque partout**.

### 2.2 `mid`, absent

L'illustration est une scène unique : il n'y a pas de calque du milieu.

### 2.3 `floor`, les dalles (100 %)

- Les 80 lignes de la vue sous la ligne des pieds (y = 460 à 540), à la même échelle que le fond, **en miroir sur les côtés**. Elles ne sont pas étirées, donc les dalles et les grilles gardent leurs proportions.
- La bande est **opaque dès la première ligne** : les combattants touchent le sol, et la poussière reste celle d'un sol dur.

## 3. Les flashs et les ambiances

- **Le lieu est hors de l'enveloppe des flashs**, comme les autres lieux dessinés à la main. Il est dans `FLASH_OUTSIDE_STAGES` (`src/render/stage-view.ts`) : ses néons et sa lune sont plus vifs que les lieux de nuit de référence.
- **Une seule ambiance** : minuit, ciel clair, celle de l'illustration.

## 4. Les autres lieux

- Les 21 autres lieux **restent dans le dépôt et dans `STAGE_MAPS`**. Ils servent encore aux voiles de flashs, à la poussière, à la pluie et à leurs tests, mais le jeu ne les propose plus.
- Pour en proposer un à nouveau, on ajoute son nom à `OFFERED` (`src/art/stages.ts`).
- Avec un seul lieu, l'écran « Lieu » est sauté, et le choix au hasard tombe toujours sur la Cyber Arène.
