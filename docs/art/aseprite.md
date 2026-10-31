# Dessiner les sprites dans Aseprite

Les planches des combattants sont dessinées par le code (`tools/sprites`, `npm run sprites`). Une planche peut aussi être **dessinée à la main dans Aseprite** : elle remplace alors celle du code, **planche par planche**. Les autres planches restent dessinées par le code.

L'extension NayosBeat pour Aseprite (`tools/aseprite/`) crée chaque planche au format exact du jeu : cases, ancre des pieds, palette, durées, guides des boîtes de collision. Elle l'exporte ensuite là où `npm run sprites` la lit et la vérifie.

## En bref

```bash
npm run aseprite:extension      # une fois : construit l'extension
npm run sprites:templates       # les gabarits de toutes les planches (après chaque changement de données)
```

1. Aseprite : **Fichier > Scripts > NayosBeat > Nouvelle planche…**, puis choisir un gabarit, par exemple `art-src/gabarits/nayo/idle.json`. La planche est créée dans `art-src/nayo/idle.aseprite`, à partir de ce que le jeu affiche aujourd'hui.
2. Dessiner.
3. **Fichier > Scripts > NayosBeat > Exporter vers le jeu** : écrit `art-src/nayo/idle.png` (et `art-src/nayo/fx/idle.png` pour les effets).
4. `npm run sprites` : vérifie la planche et l'installe dans le jeu (`src/art/`), dans les deux tenues.
5. `npm run dev` pour la voir en jeu, `npm run sprites:preview -- idle` pour la voir avec ses boîtes.
6. Commiter le `.aseprite`, le `.png` exporté et ce que `npm run sprites` a changé dans `src/art/`.

## Installer l'extension

Prérequis : **Aseprite 1.3 ou plus récent** (l'extension lit les gabarits avec le module `json` de la 1.3), Node.js 22+ et le dépôt cloné.

1. `npm install`, puis `npm run aseprite:extension` : écrit `tools/aseprite/dist/nayosbeat-sprites.aseprite-extension`.
2. Aseprite : **Édition > Préférences > Extensions > Ajouter une extension**, puis choisir ce fichier.
3. Les commandes apparaissent dans **Fichier > Scripts > NayosBeat**.

La première fois qu'une commande lit un gabarit ou écrit un fichier, Aseprite demande l'autorisation d'accéder aux fichiers : l'accepter.

Après une mise à jour de l'extension (`tools/aseprite/extension/`), relancer `npm run aseprite:extension` et la réinstaller.

## Les commandes

| Commande | Rôle |
|---|---|
| Nouvelle planche… | Crée `art-src/<perso>/<planche>.aseprite` à partir d'un gabarit. Refuse d'écraser une planche existante. |
| Exporter vers le jeu | Vérifie la planche, puis écrit ses PNG dans `art-src/<perso>/` et enregistre le `.aseprite`. N'écrit rien s'il y a un problème. |
| Mettre à jour les guides | Recharge les guides, les durées et les étiquettes depuis le gabarit (après `npm run sprites:templates`). Ne touche pas au dessin. |
| Tenue main / alt | Montre la planche dans l'autre tenue : les mêmes numéros de couleur, l'autre palette. L'export écrit toujours la tenue main. |

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

- **orange** : la ligne juste sous les semelles (la dernière rangée des pieds est la rangée 248), avec un repère sous l'ancre (colonne 128) ;
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
| 4 px vides au moins sur les bords gauche, droit et haut de chaque case | Le jeu recadre les cases sans rogner le contour. |
| Rien sous la rangée 250 | Les pieds restent sur le sol. |
| Les pieds au sol dans chaque image de `idle`, `walkForward`, `walkBack`, `crouch`, `block` | Un pied qui flotte se voit tout de suite en jeu. |
| Aucune image vide dans `corps` | Le jeu afficherait un trou. |

`npm run sprites` **avertit** aussi (sans bloquer) quand rien n'est dessiné dans la hitbox d'une image active : le coup toucherait là où on ne voit rien.

**Attention aux couleurs identiques.** Plusieurs numéros ont la même couleur dans la tenue main et une couleur différente en alt, par exemple les contours noirs de la veste et du pantalon de Nayo. La pipette prend le bon numéro. En revanche, une rotation, un redimensionnement ou un collage depuis une autre image peuvent choisir un autre numéro de même couleur. **Tenue main / alt** permet de vérifier.

## Les effets platine des Remix

Les Remix (`specialBoost`, `specialForwardBoost`, `specialAntiAirBoost`) jouent la planche de leur spécial avec ses effets en platine. Ces effets se dessinent **à part**, dans leur propre planche (`art-src/<perso>/specialBoost.aseprite` → `fx/specialBoost.png`), sur le calque `référence` du spécial. Tant qu'ils ne sont pas dessinés, le code redessine en platine les effets du spécial.

## Revenir au dessin du code

Supprimer `art-src/<perso>/<planche>.png` (et `fx/<planche>.png`), puis lancer `npm run sprites`. Le `.aseprite` peut rester : il n'est lu que par Aseprite.

## Quand les données du jeu changent

Après un changement de hitbox, de durée ou de palette : `npm run sprites:templates`, puis **Mettre à jour les guides** dans chaque planche ouverte. Les gabarits (`art-src/gabarits/`) ne sont pas commités : on les regénère à volonté.

Changer la palette d'un personnage (ajouter un matériau, par exemple) **décale les numéros** des couleurs qui suivent. Les planches déjà dessinées sont alors refusées par `npm run sprites` (« color N is … in the file »). Il faut les renuméroter avant de continuer.

## Ce qui ne suit pas les dessins

- `npm run sprites:anatomy` et les tests de `tests/tools/` mesurent les **poses du code** : ils ne disent rien d'une planche dessinée à la main.
- `npm run measure-boxes` lit les PNG du jeu (`src/art/`) : il mesure bien les planches dessinées.

## Fichiers

| Chemin | Rôle | Commité |
|---|---|---|
| `art-src/<perso>/<planche>.aseprite` | Le document de travail | oui |
| `art-src/<perso>/<planche>.png`, `fx/<planche>.png` | L'export, lu par `npm run sprites` | oui |
| `art-src/gabarits/` | Les gabarits (`npm run sprites:templates`) | non |
| `tools/aseprite/extension/` | Le code de l'extension (Lua) | oui |
| `tools/aseprite/dist/` | L'extension empaquetée (`npm run aseprite:extension`) | non |
| `tools/sprites/drawn.ts` | Lecture et vérification des planches dessinées | oui |
| `tools/sprites/aseprite-template.ts` | Contenu des gabarits (guides, règles, palette) | oui |
