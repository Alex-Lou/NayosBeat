# La dissolution des gros effets

*Demande du propriétaire : « pour des gros comme la Mégabasse ou d'autres un peu stylés, des effets de dissolution pour la disparition ».*

**En bref.** Les effets dessinés dans les planches ne disparaissent plus d'une image à l'autre. Ce sont, par exemple, les anneaux de haut-parleur de la Mégabasse, l'onde du Slam ou les traits platine des Remix. Ce qu'un effet cesse de montrer se désagrège sur place, un pixel du monde à la fois :
- un liseré à l'énergie du combattant ronge le bord de la dissolution ;
- les morceaux s'en vont, et chaque combattant a sa manière.

## 1. Quand

- **Quels coups.** Les spéciaux, les Remix et la super, c'est-à-dire tout coup de palier 1 ou plus (`tierOf`). Les normaux, trop fréquents, gardent leur coupure nette.
- **Ce qui se dissout.** Seulement ce qui disparaît vraiment :
  - **le coup finit, ou il est coupé par un coup reçu** : la dernière image d'effets se dissout entière ;
  - **l'effet s'éteint** : quand l'image suivante garde moins de la moitié des pixels de la précédente (`SHRINK`), comme les anneaux de la Mégabasse qui laissent la place à la poussière, ce qui n'est plus là se dissout.
- **Ce qui ne se dissout pas.** Une image à peu près aussi pleine que la précédente, comme les anneaux qui roulent d'une frappe à l'autre, est de l'animation, pas une disparition. Elle ne laisse pas de fantôme : aucune traînée ne s'empile.
- **Où.** Là où elle était : un anneau posé au sol s'éteint au sol, même si le combattant bouge.
- **Jamais en double.** Si l'image d'un fantôme revient à sa place, le fantôme s'efface aussitôt : l'image vivante le recouvre exactement, et l'éclat ne se double jamais.
- **Seuil.** Moins de 48 pixels qui s'en vont ne valent pas un fantôme.

## 2. Comment

**Chaque pixel a son tour**
- Il disparaît à un moment tiré d'un bruit fixe, le même pour un pixel du monde donné : 2 × 2 pixels de planche partent ensemble, et le pixel art reste net.
- Ce moment est biaisé selon le combattant :
  - **Nayo** (`rise`) : le haut part d'abord. Son son s'évapore et les morceaux montent, jusqu'à 11 px du monde, avec un léger flottement.
  - **Riff** (`scatter`) : les bouts les plus éloignés de ses pieds partent d'abord. L'onde de choc s'éparpille vers l'extérieur, le long du sol (jusqu'à 15 px), et se soulève à peine.
- Chaque pixel du monde dérive d'un bloc : ses 2 × 2 pixels de planche restent ensemble.

**Le liseré**
- Un pixel proche de son tour brûle dans l'énergie du combattant : cyan pour Nayo, magenta pour Riff, ou celle de la 2e tenue.
- Sa couleur est le minimum, canal par canal, de la sienne et de l'énergie. Il n'est donc **jamais plus clair** que le pixel qu'il remplace.

**Pas un flash** (docs/flashs.md)
- Les morceaux qui dérivent allument quelques pixels là où il n'y avait rien.
- Mais ils sont épars, toujours moins nombreux que les pixels de l'effet qu'ils quittent, et de moins en moins nombreux d'une image à l'autre.
- C'est un effet qui s'éteint, jamais un flash.

**Durée et rythme**
- 20 images (0,33 s), comptées en images affichées : la même durée à 60 Hz et à 144 Hz.
- Le fantôme est repeint toutes les 2 images. La dissolution avance par paliers, comme le pixel art, et la carte graphique reçoit deux fois moins d'envois.

**Réduire les animations.** Avec le réglage système `prefers-reduced-motion`, les pixels s'éteignent là où ils sont, sans bouger.

## 3. Code

- **`src/render/dissolve.ts`** (pur) :
  - `vanishing` : les pixels qui s'en vont, et le tour de chacun ;
  - `paintGhost` : le fantôme à un moment donné ;
  - `noiseAt` : le bruit fixe ;
  - `dissolveStyleOf` : `slash` donne `rise`, `claw` donne `scatter`.
- **`src/render/fx-dissolve.ts`** : `FxDissolve`, quatre fantômes par combattant, chacun dans sa texture canvas. Quand les quatre sont pris, le plus avancé cède sa place.
  - Les pixels de chaque image d'effets sont lus une fois, depuis sa planche, puis gardés.
  - `SpriteFighterView` lui donne à chaque image ce qu'elle montre et si le coup est stylé.
- **Tests** : `tests/render/dissolve.test.ts`, `tests/render/fx-dissolve.test.ts`.
