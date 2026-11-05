# Le décor : Chinatown, le temple au bord de l'eau

Statut : map jouable, adaptée de l'illustration fournie par le propriétaire (issue #155, commentaire
`6655655839`). Le décor est en pixel art indexé, au grain du jeu, et animé par trois props.

## 1. L'intention

Un temple au bord de l'eau, dans une forêt dense : cascade, pont rouge, lanterne de pierre, bannières
rouges, bassin et grande place de terre devant le sanctuaire. Le lieu s'appelle **Chinatown** dans le
jeu. La place de terre est le sol des combattants ; le temple et la cascade restent derrière eux.

## 2. L'adaptation

L'illustration source est une image RGB de 1677 × 938 (`art-src/chinatown/source/chinatown.png`).
`tools/stage/chinatown/adapt.ts` la prépare : recadrage au format du décor, échantillonnage en blocs
de 2 × 2 (le grain des planches du jeu), désaturation et assombrissement, puis palette de 48
couleurs avec tramage ordonné. Le résultat est écrit dans `art-src/chinatown/far.png` et
`floor.png` ; `npm run stages` l'installe dans `src/art/chinatown/`.

Le décor est **volontairement moins contrasté et moins saturé que les combattants** : c'est ce qui le
fait tenir derrière eux au lieu de leur voler la vedette. Le sol est sombre, les lanternes gardent
leur chaleur, et le cyan/magenta restent aux personnages.

- `far` : 600 × 270 du monde, 1 200 × 540 en pixels, opaque, défile à 25 %.
- `mid` : 720 × 270 du monde, transparent ; la couche reste vide, le décor n'a pas de second plan.
- `floor` : 960 × 40 du monde, 1 920 × 80 en pixels, le sol de terre et d'herbe, défile à 100 %.

## 3. Les animations

Toutes sont des props posés sur `far`, en `overlay` (ils se dessinent par-dessus l'illustration
dessinée à la main). Le code est dans `tools/stage/chinatown/index.ts`.

| Prop | Ce qu'il fait | Cycle |
|---|---|---|
| `waterfall` | éclats blancs et bleus qui descendent sur la cascade, éclaboussures en bas | 6 images, 36 pas |
| `lanterns` | respiration chaude des deux lanternes de pierre | 4 images, 200 pas |
| `fireflies` | lucioles jaunes et vertes qui dérivent sur le bassin et les arbres | 6 images, 240 pas, glissement de −520 à 520 px |

Aucun flash rapide : les lanternes respirent lentement, les props sont des changements d'image
entiers (D23), et `prefers-reduced-motion` n'arrête que les animations du menu, pas le décor de
combat, qui suit l'horloge visuelle du jeu.

## 4. Le branchement

- `tools/stage/maps.ts` ajoute `CHINATOWN` aux cartes du code.
- `src/art/chinatown/index.ts` déclare `STAGE_VARIANTS` depuis les images installées.
- `src/art/stages.ts` ajoute la map à `STAGE_MAPS` : elle apparaît donc dans « Lieu », dans les
  choix d'entraînement et dans les tests de budget vidéo.
- `tests/tools/stage-chinatown.test.ts` vérifie les tailles, les couches, l'atmosphère et les trois
  props.

## 5. Les flashs

Chinatown est un décor de **crépuscule**, comme Sakura est le décor de jour : ses verts, son eau et
ses lanternes sortent de l'enveloppe des décors de minuit. Les mesures de flashs restent prises sur
ces derniers (`FIGHT_STAGE_COLORS`, docs/flashs.md §3), et Chinatown est exclu de l'enveloppe comme
Sakura. C'est un choix documenté, pas un oubli : le décor est volontairement plus lumineux que la
nuit, et les effets gardent leur référence sur les décors sombres.

## 6. Choix écartés

- Garder l'illustration en truecolor (comme Sakura) : trop fine et trop saturée à côté des
  combattants, contraire à la demande d'harmonie visuelle.
- Découper un vrai second plan dans l'image : la source est une illustration unique, sans calques ;
  un faux découpage aurait créé des raccords visibles.
- Animer la cascade par une vidéo ou un shader : un prop de 6 images suffit, reste déterministe et
  ne coûte rien au cœur.
