# Dessiner les sprites dans Aseprite

Les planches des combattants sont dessinées par le code (`tools/sprites`, `npm run sprites`). Une planche peut aussi être **dessinée à la main dans Aseprite** : elle remplace alors celle du code, **planche par planche**. Les autres planches restent dessinées par le code.

L'extension NayosBeat pour Aseprite (`tools/aseprite/`) crée chaque planche au format exact du jeu : cases, ancre des pieds, palette, durées, guides des boîtes de collision. Elle l'exporte ensuite là où `npm run sprites` la lit et la vérifie.

Les icônes de l'application, le vinyle du titre et le stage (la rue devant L'Entrepôt) se dessinent de la même façon : voir [Icônes et vinyle du titre](#icônes-et-vinyle-du-titre) et [Le stage](#le-stage-la-rue-devant-lentrepôt). Le portrait de chaque combattant aussi, mais il n'existe qu'à la main : voir [Portraits](#portraits).

## En bref

```bash
npm run aseprite:extension      # une fois : construit l'extension
npm run sprites:templates       # les gabarits de toutes les planches (après chaque changement de données)
```

Pour aller plus vite sur un seul personnage ou une seule planche :

```bash
npm run sprites -- riff                         # ne régénère que Riff
npm run sprites:templates -- riff portrait      # un seul gabarit (ou -- riff, -- ui, -- rue)
```

1. Aseprite : **Fichier > Scripts > NayosBeat > Nouvelle planche…**, puis choisir un gabarit, par exemple `art-src/gabarits/nayo/idle.json`. La planche est créée dans `art-src/nayo/idle.aseprite`, à partir de ce que le jeu affiche aujourd'hui.
2. Dessiner.
3. **Fichier > Scripts > NayosBeat > Exporter vers le jeu** : écrit `art-src/nayo/idle.png` (et `art-src/nayo/fx/idle.png` pour les effets).
4. `npm run sprites` : vérifie la planche et l'installe dans le jeu (`src/art/`), dans les deux tenues, recadrée et rangée en atlas comme celles du code ([atlas.md](atlas.md)).
5. `npm run dev` pour la voir en jeu, `npm run sprites:preview -- idle` pour la voir avec ses boîtes.
6. Commiter le `.aseprite`, le `.png` exporté et ce que `npm run sprites` a changé dans `src/art/`.

## Installer l'extension

Prérequis : **Aseprite 1.3 ou plus récent** (l'extension lit les gabarits avec le module `json` de la 1.3), Node.js 22+ et le dépôt cloné.

1. `npm install`, puis `npm run aseprite:extension` : écrit `tools/aseprite/dist/nayosbeat-sprites.aseprite-extension`.
2. Aseprite : **Édition > Préférences > Extensions > Ajouter une extension**, puis choisir ce fichier.
3. Les commandes apparaissent dans **Fichier > Scripts > NayosBeat**.

La première fois qu'une commande lit un gabarit ou écrit un fichier, Aseprite demande l'autorisation d'accéder aux fichiers : l'accepter.

Après une mise à jour de l'extension (`tools/aseprite/extension/`), relancer `npm run aseprite:extension` et la réinstaller.

`npm run aseprite:check` (lancé aussi par la CI) fait tourner l'extension hors d'Aseprite, contre une imitation de son API (`tools/aseprite/test/`). Le scénario crée des planches, les retouche, les exporte, essaie des exports fautifs, puis fait relire et comparer le résultat par `npm run sprites`. Ça vérifie la logique de l'extension, pas Aseprite lui-même. Il demande Lua 5.4 (`lua5.4`, ou `lua`). Sur Debian ou Ubuntu, la liste des paquets doit d'abord être à jour, sinon l'installation échoue :

```bash
sudo apt-get update
```

```bash
sudo apt-get install -y lua5.4
```

## Les commandes

| Commande | Rôle |
|---|---|
| Nouvelle planche… | Crée `art-src/<perso>/<planche>.aseprite` à partir d'un gabarit. Refuse d'écraser une planche existante. |
| Exporter vers le jeu | Vérifie la planche, puis écrit ses PNG dans `art-src/<perso>/` et enregistre le `.aseprite`. N'écrit rien s'il y a un problème. |
| Mettre à jour les guides | Recharge les guides, les durées et les étiquettes depuis le gabarit (après `npm run sprites:templates`). Ne touche pas au dessin, ni à une palette libre. |
| Tenue main / alt | Montre la planche dans l'autre tenue : les mêmes numéros de couleur, l'autre palette. L'export écrit toujours la tenue main. Seuls les combattants ont deux tenues. |

## Le document

Une case de **256 × 256 px** par image : les sprites sont dessinés deux fois plus fin que le décor. Le personnage regarde vers la droite, et le jeu le retourne pour l'autre côté. Il y a autant d'images que le jeu en attend, et chaque image a sa durée en jeu (60 tics par seconde).

| Calque | Rôle |
|---|---|
| `corps` | Le personnage. Exporté dans `<planche>.png`. |
| `effets` | Les effets avant (énergie, éclairs, traits de vitesse), dessinés par-dessus les deux combattants. Exporté dans `fx/<planche>.png` ; vide = pas d'effets (le fichier est supprimé). |
| `dessin` | Pour un projectile seulement, à la place de `corps` et `effets`. |
| `référence` | Pour les effets platine d'un Remix : le corps du spécial, à dessiner par-dessus. Verrouillé, jamais exporté. |
| `guides` | Verrouillé, jamais exporté. |

Les guides, image par image :

- **orange** : la ligne juste sous les semelles (le code pose la dernière rangée des pieds sur la rangée 248), avec un repère sous l'ancre (colonne 128) ;
- **bleu** : la pushbox (le corps qui empêche les combattants de se traverser) ;
- **vert** : les hurtbox (où le personnage peut être touché) ;
- **rouge** : la hitbox, sur les images actives d'un coup. Le poing ou le pied dessiné doit l'atteindre.

Les étiquettes : `actif` sur les images où le coup touche, `boucle` sur la partie qui tourne en boucle (garde, marche…).

`corps` peut être un **groupe** de calques : ses sous-calques visibles sont exportés, de bas en haut. Un calque masqué (un croquis) ne l'est pas. L'opacité et les modes de fusion des calques sont ignorés : un pixel est un numéro de couleur. Les calques de tuiles sont refusés.

## Les règles

L'extension les vérifie avant d'exporter. `npm run sprites` les vérifie à nouveau et refuse de générer quoi que ce soit tant qu'une planche est fautive. Les messages numérotent les images à partir de 1, comme Aseprite.

| Règle | Pourquoi |
|---|---|
| Mode **Indexé**, palette du personnage | Le jeu lit des **numéros** de couleur : la tenue alt est la même image avec une autre palette. |
| Ne pas modifier la palette dans Aseprite | Une couleur modifiée est refusée. Les couleurs se changent dans `tools/sprites/<perso>/palette.ts`, puis on relance `npm run sprites:templates`. |
| Les couleurs de guide (les 4 dernières) ne vont pas dans le dessin | Elles ne sont pas des couleurs du personnage. |
| Le nombre d'images du gabarit | Les images sont liées aux coups (`src/art/<perso>/sheets.ts`, `clips.ts`). Le changer passe par le code. |
| 4 px vides au moins sur les bords gauche, droit et haut de chaque case, effets compris | Le jeu recadre les cases sans rogner le contour. Les effets peuvent descendre sous le sol (poussière), pas sortir de la case. |
| Rien sous la rangée 250 | Les pieds restent sur le sol. |
| Les pieds au sol dans chaque image de `idle`, `walkForward`, `walkBack`, `crouch`, `block` : le pixel le plus bas de chaque image entre les rangées **246 et 250** (248 au juste) | Un pied qui flotte se voit tout de suite en jeu. |
| Aucune image vide dans `corps` | Le jeu afficherait un trou. |

`npm run sprites` **avertit** aussi (sans bloquer) quand rien n'est dessiné dans la hitbox d'une image active : le coup toucherait là où on ne voit rien.

**Attention aux couleurs identiques.** Plusieurs numéros ont la même couleur dans la tenue main et une couleur différente en alt, par exemple les contours noirs de la veste et du pantalon de Nayo. La pipette prend le bon numéro. En revanche, une rotation, un redimensionnement ou un collage depuis une autre image peuvent choisir un autre numéro de même couleur. **Tenue main / alt** permet de vérifier.

## Les effets platine des Remix

Les Remix (`specialBoost`, `specialForwardBoost`, `specialAntiAirBoost`) jouent la planche de leur spécial avec ses effets en platine. Ces effets se dessinent **à part**, dans leur propre planche (`art-src/<perso>/specialBoost.aseprite` → `fx/specialBoost.png`), sur le calque `référence` du spécial. Tant qu'ils ne sont pas dessinés, le code redessine en platine les effets du spécial.

## Icônes et vinyle du titre

Deux images de l'interface se dessinent aussi dans Aseprite, dans `art-src/ui/`. Leurs gabarits sont `art-src/gabarits/ui/icon.json` et `vinyl.json` (`npm run sprites:templates`, ou `-- ui` pour eux seuls).

| Image | Format | Ce que le jeu en fait |
|---|---|---|
| `icon` | **Un dessin maître** de 64 × 64 px, une image | Les quatre icônes de l'application, chacune agrandie d'un facteur entier pour rester nette, centrée sur le fond : ×3 pour 192 px, ×8 pour 512, ×2 pour 180 (iOS), ×4 pour la version « maskable » de 512, qui tient ainsi dans le cercle de 80 % que gardent les lanceurs. |
| `vinyl` | **8 images de 18 × 18 px**, 0,225 s chacune | Le O de NAYOSBEAT sur l'écran titre, qui tourne en 1,8 s. Le CSS du titre attend exactement ce format (`src/styles.css`, `.title-vinyl`) : l'outil refuse tout autre format. |

Ce qui change par rapport aux combattants :

- **La palette est libre** (256 couleurs au plus) : ces images n'ont qu'une tenue. Le gabarit propose une palette de départ (celle de Nayo et le fond pour l'icône, les 7 couleurs du vinyle), à modifier à volonté dans Aseprite. L'export écrit la palette du dessin, et `npm run sprites` la reconstruit au plus juste.
- **Un seul calque, `dessin`**, sans guides.
- **L'icône ne peut pas avoir de pixel à demi transparent** : elle est posée sur le fond. Un pixel transparent laisse voir le fond (`#1b1b2f`). Le vinyle, lui, peut en avoir.
- Chaque image est vérifiée (format, aucune image vide) avant que `npm run sprites` n'écrive quoi que ce soit.

Tant qu'elles ne sont pas dessinées, le code dessine l'icône (la tête de Nayo dans son anneau néon) et le vinyle, comme avant.

## Portraits

Le buste d'un combattant sur l'écran de sélection : `art-src/<perso>/portrait.png`, gabarit `art-src/gabarits/<perso>/portrait.json`.

- **96 × 96 px, une image**, dans la **palette du personnage**, avec ses numéros, comme les planches : l'écran de sélection montre aussi la tenue alt en match miroir, et **Tenue main / alt** fonctionne.
- Le gabarit part d'un carré de 48 px autour de la tête de sa garde (la 1re image de `idle`), agrandi ×2 : le cadrage des vignettes actuelles (des carrés de 56 et 58 px), avec deux fois plus de pixels pour affiner. Chaque pixel de départ y est donc un bloc de 2 × 2.
- `npm run sprites` l'installe dans les deux tenues : `src/art/<perso>/main/portrait.png` et `alt/portrait.png`. La vignette l'affiche en entier, agrandi.
- Sans portrait dessiné, l'écran garde le carré découpé dans la garde, comme avant.

## Le stage (la rue devant L'Entrepôt)

Le décor des combats, en trois calques qui défilent d'autant moins vite qu'ils sont loin (parallaxe). Le code les dessine (`tools/stage/rue/`, voir [decor-rue.md](decor-rue.md)), et chacun peut être **redessiné à la main, calque par calque** : `art-src/rue/`, gabarits `art-src/gabarits/rue/` (`npm run sprites:templates -- rue`). Le gabarit part du calque que le jeu affiche aujourd'hui : celui du code, ou le dessin déjà fait.

| Calque | Monde | Image (×2) | Défile à | Règle |
|---|---|---|---|---|
| `far` (fond) | 600 × 270 | 1 200 × 540 | 25 % | Opaque partout : rien n'est derrière lui. |
| `mid` (plan moyen) | 720 × 270 | 1 440 × 540 | 50 % | Transparent où rien n'est dessiné. Vidé, il n'écrit rien : celui du code reste. |
| `floor` (sol) | 960 × 40 | 1 920 × 80 | 100 % | Son bord haut est la ligne de sol, où se posent les pieds. |

- Les calques se dessinent **au grain des combattants** : 2 pixels d'image par pixel du monde (`STAGE_SCALE`). Leurs largeurs couvrent exactement ce que la caméra voit d'un bout à l'autre de l'arène. Un calque à l'ancienne taille (1 px = 1 px du monde) est refusé.
- La caméra zoome jusqu'à ×1,45 quand les combattants se rapprochent : le décor est alors agrandi avec eux.
- **Palette libre**, mais **pas de pixel à demi transparent** : chaque pixel est opaque ou transparent.
- Sur le fond et le plan moyen, une ligne de guide montre où commence le sol (rangées 460 et 461) : ce qui est dessous est caché par le sol.
- Ce que [flashs.md](../flashs.md) §3 demande au décor : contraste faible et couleurs moins saturées que les combattants, pas de rayures fines et serrées (la secousse les ferait vibrer).
- Sans `src/art/rue/` (aucune image installée), les combats gardent la boîte grise.

### Les animations du décor

Le plan moyen porte des **props** : la file d'attente, le videur, les gens aux fenêtres et aux balcons, le chat, la vapeur, le néon du club ([decor-rue.md](decor-rue.md) §6). Le code les dessine image par image, puis `npm run sprites` les découpe : chaque image ne garde que les pixels qui changent par rapport au calque fixe. Elles sont rangées dans `src/art/rue/props.png` et décrites dans `src/art/rue/props.ts`.

Un prop reste tant que le calque installé dessine, sous lui, ce que le code y dessinait. Si une retouche à la main change ces pixels-là, le prop est retiré et `npm run sprites` le dit (« stage prop left out »). Sinon, il peindrait les pixels du code par-dessus la retouche. Pour garder une animation, il faut donc retoucher autour d'elle, ou la redessiner dans le code. Les props ne se dessinent pas encore dans Aseprite.

### Les flashs, sur le décor

Les voiles de flash (protection photosensible, [flashs.md](../flashs.md)) se règlent sur les **grandes couleurs** du stage : celles qu'un calque étale sur au moins 1 % de l'écran (en pixels du monde). `npm run sprites` les calcule et les écrit dans `src/art/rue/colors.ts`.

Les tests de flashs (`npm test`) mesurent alors les étincelles, les mots et les voiles **sur ces couleurs**, en particulier sur la plus sombre, celle que les flashs éclairent le plus. Un décor qui ferait dépasser une limite fait échouer les tests. Il y a deux façons d'y répondre :

- **Ramener les grandes couleurs dans la bande des effets.** C'est la voie la plus simple. La rue du code garde ses grandes couleurs entre le ciel de la boîte grise (`#1b1b2f`, la plus sombre) et une luminance de 0,08 au plus, où un effet noir dépasserait ΔL 0,08 ; les tons froids (sarcelle, gris bleu) s'arrêtent vers 0,045, où le halo cyan du Finisher dépasse déjà. Une grande zone claire (une vitrine, une laverie) doit rester sombre dans sa masse, et ne s'éclairer que par petites touches.
- **Régler à nouveau les effets.** Il faut alors remesurer les tables de `src/render/flash-areas.ts`, ou revoir la teinte sombre des effets dans `src/render/veils.ts`. C'est une décision de code, à prendre en connaissance de cause.

À l'essai, un club au mur d'enceintes presque noir (`#0c0a10`) faisait échouer deux tests : les effets sombres y montaient à ΔL 0,082 au lieu de 0,08 au plus. La première version de la rue en faisait échouer cinq : ses vitrines chaudes et sa laverie, trop claires sur plus de 1 % de l'écran, et deux tons un peu plus sombres que le ciel de la boîte grise.

## Sans Aseprite

Le pipeline ne dépend pas d'Aseprite : `npm run sprites` lit des PNG. Pour en produire autrement (un script, un autre éditeur), il suffit d'écrire ce que l'extension écrirait :

- **Le PNG** : indexé 8 bits, les images côte à côte sur une rangée. Largeur = `width` × `frames` du gabarit, hauteur = `height`.
- **La palette** : pour un combattant (planches, effets, portrait), celle de sa tenue main, **numéros compris**, c'est-à-dire `palette.main` du gabarit sans les 4 couleurs de guide qu'une planche y ajoute à la fin. Pour une palette libre (`palette.free` : icône, vinyle, stage), n'importe quelles couleurs, 256 au plus. Dans tous les cas, l'index 0 est transparent.
- **Où** : le chemin du champ `file` du calque exporté, à partir de `art-src/<folder>/`.
- **Les règles** : celles du champ `rules` de ce calque, les mêmes que `npm run sprites` vérifie.

Le format des gabarits (`art-src/gabarits/<folder>/<name>.json`, version 3) :

| Champ | Contenu |
|---|---|
| `folder`, `name` | Le dossier dans `art-src/` et le nom de l'image. |
| `width`, `height`, `frames` | La taille d'une case et le nombre d'images. |
| `durations` | La durée de chaque image, en secondes. |
| `palette` | `main` (et `alt` pour un combattant), en `#rrggbbaa`, et `free`. |
| `tags` | Les étiquettes : `name`, `from`, `to` (images comptées à partir de 0). |
| `layers` | De l'arrière vers l'avant : `name`, `file` (absent pour un guide ou une référence), `rules`, `locked`, `opacity`, et `frames`. `frames` donne les pixels de départ de chaque case, en paires `[nombre, couleur]`, rangée par rangée. |

Pour partir d'un gabarit :
1. décoder les paires de `layers[i].frames[f]` en une case de `width` × `height` ;
2. placer les cases côte à côte et retoucher ;
3. écrire le PNG avec `encodeIndexedPng` (`tools/sprites/png.ts`) et la palette ci-dessus ;
4. lancer `npm run sprites`. Un dessin fautif est refusé sans rien écrire : le message dit quel fichier, quelle image, quel pixel, et la règle.

## Revenir au dessin du code

Supprimer `art-src/<perso>/<planche>.png` (et `fx/<planche>.png`), `art-src/ui/icon.png` / `vinyl.png`, ou `art-src/rue/<calque>.png`, puis lancer `npm run sprites`. Le `.aseprite` peut rester : il n'est lu que par Aseprite. Sans `art-src/<perso>/portrait.png`, l'écran de sélection revient au carré découpé dans la garde ; sans `art-src/rue/<calque>.png`, le calque revient à celui du code.

## Quand les données du jeu changent

Après un changement de hitbox, de durée ou de palette : `npm run sprites:templates`, puis **Mettre à jour les guides** dans chaque planche ouverte. Les gabarits (`art-src/gabarits/`) ne sont pas commités : on les regénère à volonté.

Changer la palette d'un personnage (ajouter un matériau, par exemple) **décale les numéros** des couleurs qui suivent. Les planches déjà dessinées sont alors refusées par `npm run sprites` (« color N is … in the file »). Il faut les renuméroter avant de continuer.

## Ce qui ne suit pas les dessins

- `npm run sprites:anatomy` et les tests de `tests/tools/` mesurent les **poses du code** : ils ne disent rien d'une planche dessinée à la main.
- `npm run measure-boxes` lit les PNG du jeu (`src/art/`) : il mesure bien les planches dessinées.
- `tests/tools/atlas.test.ts` compare l'atlas de chaque planche dessinée à son dessin : le recadrage n'en perd aucun pixel.

## Fichiers

| Chemin | Rôle | Commité |
|---|---|---|
| `art-src/<perso>/<planche>.aseprite` | Le document de travail | oui |
| `art-src/<perso>/<planche>.png`, `fx/<planche>.png` | L'export, lu par `npm run sprites` | oui |
| `art-src/ui/icon.*`, `art-src/ui/vinyl.*` | Le dessin maître des icônes et le vinyle du titre (document et export) | oui |
| `art-src/<perso>/portrait.*` | Le portrait de l'écran de sélection (document et export) | oui |
| `art-src/rue/far.*`, `mid.*`, `floor.*` | Les calques du stage redessinés à la main (documents et exports) | oui |
| `src/art/rue/` | Le stage tel que le jeu le lit : ses calques, ses props (`props.png`, `props.ts`) et ses grandes couleurs (`colors.ts`), écrits par `npm run sprites` | oui |
| `src/art/stage-layers.ts` | Tailles, grain, défilement et règles des calques, format des props, communs au jeu et aux outils | oui |
| `tools/stage/rue/` | Le dessin de la rue par le code ([decor-rue.md](decor-rue.md)) | oui |
| `art-src/gabarits/` | Les gabarits (`npm run sprites:templates`) | non |
| `tools/aseprite/extension/` | Le code de l'extension (Lua) | oui |
| `tools/aseprite/test/`, `tools/aseprite/check.ts` | Le banc d'essai de l'extension (`npm run aseprite:check`) | oui |
| `tools/aseprite/dist/` | L'extension empaquetée (`npm run aseprite:extension`) | non |
| `tools/sprites/cell.ts` | Le contrat de la case (marges, sol), commun au code, aux dessins et aux tests | oui |
| `tools/sprites/drawn.ts` | Lecture et vérification des planches dessinées | oui |
| `tools/sprites/ui-drawn.ts`, `tools/sprites/colors.ts` | Lecture et vérification des images d'interface dessinées, palettes libres | oui |
| `tools/sprites/stage-drawn.ts` | Lecture et vérification du stage dessiné, son installation, ses grandes couleurs | oui |
| `tools/sprites/stage-props.ts` | Les props du stage : découpe, contrôle sous les retouches, planche | oui |
| `tools/sprites/aseprite-template.ts` | Contenu des gabarits (guides, règles, palette) | oui |
