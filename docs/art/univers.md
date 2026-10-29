# NayosBeat — bible des univers

Trois univers, par ordre de priorité. Chacun apporte **un stage** et **deux combattants** : un sur le gabarit **Polyvalent** (portée, projectile, uppercut), un sur le gabarit **Rushdown** (vitesse, ruée, saut plongeant). Les gabarits fixent le gameplay (coups, frame data, hitbox) ; l'univers fixe tout le reste (look, noms, ambiance).

| Priorité | Univers | Polyvalent | Rushdown | Stage |
|---|---|---|---|---|
| 1 | **Sound Clash** | Nayo | Riff | Entrepôt-club |
| 2 | **Néon Underground** | Kaï | Vexa | Toit sous la pluie |
| Bonus | **Archipel des Légendes** | Sora | Kitsune | Cour de temple |

Règles communes à tous les personnages :

- Pixel art lisible à 84 px de haut (Polyvalent) ou 78 px (Rushdown) : **une silhouette forte**, un détail signature visible de loin, pas dix.
- **Deux tenues** par personnage, qui ne diffèrent que par la palette (mêmes pixels) : la seconde sert au joueur 2 en match miroir. Elle doit trancher nettement (couleur dominante différente).
- **Aucune référence** à un jeu, un studio ou un personnage existant.
- Sang stylisé arcade, léger (quelques gouttes, une lèvre fendue sur les portraits), jamais de gore.

---

## 1. Sound Clash (priorité 1)

Un tournoi clandestin dans l'underground musical. On se bat entre deux sets, au milieu des enceintes ; le son est une arme.

L'histoire de Nayo et de Riff, et ses scènes à animer plus tard : [histoire.md](histoire.md).

**Palette d'ambiance** : nuit violette, orange chaud, cyan électrique.

### Stage — L'Entrepôt

Entrepôt reconverti en club, la nuit. Mur d'enceintes empilées au fond, néons violets et orange, une cabine de DJ en hauteur, la foule en silhouettes à contre-jour qui bouge en rythme (boucle de 4 images), fumée basse au sol. Sol en béton ciré avec reflets néon.

### Nayo — Polyvalent

> Boxeur-DJ, calme et sûr de lui, regard posé. Il « mixe » ses combats.

- **Silhouette** : athlétique, garde de boxeur, cheveux noirs en pics désordonnés (style anime), casque audio autour du cou (le détail signature, un design à nous : coque métal brossé, face noire, anneau néon).
- **Tenue** (techwear noir, néon cyan) : veste tech matelassée courte à col montant, écusson néon carré sur le haut de la manche, t-shirt anthracite, ceinture à boucle métal, pantalon cargo à poche latérale et bande LED, rangers à lacets avec liseré néon, mitaines en cuir (doigts nus).
- **Tenue 2** : veste gris clair, pantalon gris, rangers blanches ; le néon devient magenta.
- **Visage et cheveux** : ceux de Tazz, le héros de Zen-Tazzer, repris de ses sprites (visage de trois-quarts, yeux cyan courts au trait de cils épais, cheveux noirs en pics, peau pêche). Expressions sobres : regard ouvert et posé, jamais de sourire gratuit.
- **Palette principale** :
  - peau `#b04a2a #e8844c #fca86a #ffc286` ;
  - cheveux `#0b0b0e #151519 #202026 #2e2e36` ;
  - veste `#0d0d10 #18181d #26262d #36363f` ;
  - cargo `#0e0e11 #19191e #28282f #38383f` ;
  - néon cyan `#00687e #00b8d0 #2ce8f8 #c8fcff` (tenue 2 : magenta `#7a0e56 #d0288e #ff5cc8 #ffd6f2`) ;
  - tenue 2, veste `#6e6e82 #9a9aae #c4c4d2 #e4e4ee`.
- **Effets de coup** (haute définition, propres à Nayo) : croissants d'énergie néon, gerbe de rayons or et orange, onde de choc, étincelles cyan et or.

| Coup (gabarit) | Nom | Mise en scène |
|---|---|---|
| standLight | Direct | Jab sec du bras avant |
| standHeavy | Crochet | Crochet du bras avant avec un pas |
| crouchLight | Coup bas | Coup de pied rasant au tibia |
| crouchHeavy | Balayage | Balayage au sol, main arrière au sol |
| jumpLight | Genou sauté | Genou en avant en l'air |
| jumpHeavy | Coup de pied sauté | Coup de pied plongeant vers l'avant-bas |
| special | Vinyle | Tire un vinyle de sa veste, le scratche à la hanche et le lance à plat : un disque de lumière qui tourne |
| specialForward | Coup de pied fendu | Coup de pied latéral volant |
| specialAntiAir | Uppercut | « La montée » : uppercut montant sur la pointe des pieds (le mot « drop » appartient au Crossfader) |
| throw | Projection | Saisie au col, pivot, jeté par-dessus l'épaule |

- **Entrée** : se craque les poings, ajuste son casque, regard posé, garde.
- **Victoire** : poing levé, petit rebond en rythme.

### Riff — Rushdown

> La punk de rue de Zen-Tazzer : provocatrice, rieuse, elle breake et elle cogne. Elle danse autour de l'adversaire, puis lui rentre dedans.

- **Silhouette** : petite et vive, appuis bas : la base en ginga d'une b-girl, le poing arrière armé d'une bagarreuse. Détail signature : la **frange magenta** sur un crâne rasé sur le côté (animation secondaire, comme la **chaîne** de sa ceinture).
- **Tenue** : blouson de cuir noir court (écusson rond magenta sur la manche), crop top noir, jean noir déchiré aux genoux, ceinture cloutée et chaîne argent, mitaines de cuir, rangers à semelles crantées avec triangles magenta, boucles d'oreilles et ras-du-cou argent, rouge à lèvres magenta.
- **Tenue 2** (miroir) : blouson de cuir **rouge sang**, frange et accents **or**, jean gris délavé, lèvres cramoisies ; peau, cheveux, crop top, rangers et argent inchangés.
- **Peau** pêche chaud, ombres rouille ; cheveux bleu-noir, reflets gris froids ; yeux sarcelle.
- **Palette** (`tools/sprites/riff/palette.ts`) :
  - cuir noir `#040406 #16171d #30333c #6c7890` (tenue 2 : rouge `#3c0a10 #8e1c24 #c4383e #f08a86`) ;
  - jean `#040507 #151920 #2c323d #56627a` (tenue 2 : gris `#17191e #353943 #5c6270 #7c8392`) ;
  - magenta `#4c0b44 #8e1468 #b81e7c #e04a9e` (tenue 2 : or `#6a420c #c89628 #ecc85a #ffe08a`) ;
  - argent `#3e4046 #8e9298 #c4c8cc #f2f4f6` ;
  - peau `#561c22 #cc744d #f1ad7a #ffdcb0`.
- **Effets de coup** (haute définition, propres à Riff, `src/render/hit-styles.ts`) : entailles en griffes **magenta** `#ff3ca0`, éclats en losange **argent** `#d8e0ec` (ses clous et sa chaîne frappés) ; son énergie (dash, traînées, ondes au sol, spéciaux) est magenta. Tenue 2 : griffes **or** `#ffc83a`, éclats **cramoisis** `#e0283c`.

| Coup (gabarit) | Nom | Mise en scène |
|---|---|---|
| standLight | Jab | Jab sec, épaule rentrée |
| chainLight | Revers | Revers tournant à plat, la frange qui fouette |
| lightFinisher | Swipe | Meia lua de compasso : appuyée sur les mains, la jambe balaie |
| forwardLight | Toprock | Pas croisé de danse vers l'avant, puis jab |
| standHeavy | Coup de coude | Coude à plat en fente avant |
| forwardHeavy | Talon | La jambe monte tendue, retombe en coup de hache |
| backHeavy | Retourné | Scorpion sauté, la ranger par-dessus la tête |
| crouchLight | Coup bas | Coup de talon rasant, en appui sur une main |
| crouchHeavy | Windmill | Moulinet au sol, les jambes en rotation |
| jumpLight | Ciseau aérien | Ciseau de jambes en l'air, la ranger arrière plantée sous elle (touche aussi de dos) |
| jumpHeavy | Talon sauté | Talon qui retombe, jambe tendue |
| special | Glissade | Plonge et glisse sur la hanche, rangers en avant, sous le Vinyle |
| specialForward | Saut de l'ange | Vrille aérienne, retombe à deux talons sur la tête adverse (à parer debout) |
| specialAntiAir | Genou montant | « Freeze » explosif : genou qui jaillit vers le haut |
| grab, pummel | Prise, Coup de tête | Saisie d'une main au col, coups de tête courts |
| throwForward, throwBack | Ciseaux, Roulade | Ciseau de jambes qui couche l'adversaire tout près ; monkey flip par-dessus elle |

- **Entrée** : plantée comme si la rue était à elle, elle rejette sa frange d'une main, tend l'autre paume en l'air (« viens »), puis tombe en garde sur le temps.
- **Victoire** : freeze sur une main, la jambe au ciel, clin d'œil.
- **Temps écoulé** : bras croisés, elle boude en tapant du pied.

---

## 2. Néon Underground (priorité 2)

Une mégapole en 2090. Les combats clandestins se jouent sur les toits, sous la pluie, entre deux livraisons.

**Palette d'ambiance** : bleu nuit, magenta, cyan, jaune.

### Stage — Le Toit

Toit d'immeuble sous la pluie (pluie en boucle), enseignes néon géantes en arrière-plan, voitures volantes au loin (parallaxe lent), flaques qui reflètent les néons, antennes et climatiseurs en avant-plan.

### Kaï — Polyvalent

> Ancien boxeur pro au bras droit bionique, discipliné, mâchoire serrée.

- **Silhouette** : carrée, bras bionique chromé (le détail signature), bandeau rouge à deux pans.
- **Tenue** : veste courte rouge sans manche droite (le bras bionique est à nu), débardeur noir, pantalon cargo gris, bottes de combat.
- **Tenue 2** : veste blanche, bandeau bleu.
- **Coups** :
  - Onde sonore → « Décharge » (onde électrique cyan tirée du gant) ;
  - Uppercut → « Piston » (le bras propulsé vers le haut) ;
  - Coup de pied fendu → « Fente chromée ».
- **Entrée** : le bras bionique se déplie avec des étincelles.
- **Victoire** : rentre la garde, crache par terre.

### Vexa — Rushdown

> Coursière parkour, nerveuse et insolente, toujours en mouvement.

- **Silhouette** : longiligne, lunettes de vision relevées sur le front (le détail signature), sac de livraison en bandoulière.
- **Tenue** : combinaison noire à bandes jaunes, gants sans doigts, baskets à semelles lumineuses.
- **Tenue 2** : combinaison blanche, bandes magenta.
- **Coups** :
  - Ruée → « Sprint électrique » ;
  - Saut de l'ange → « Salto mural » ;
  - Genou montant → « Genou électrifié ».
- **Entrée** : arrive en glissade, abaisse ses lunettes.
- **Victoire** : s'assoit sur son sac, ricane.

---

## 3. Archipel des Légendes (bonus)

Des îles de légende où les arts martiaux se transmettent avec les esprits.

**Palette d'ambiance** : crépuscule orange, bleu profond, rouge laqué.

### Stage — La Cour du Temple

Cour de temple au crépuscule, lanternes qui oscillent (boucle), cerisiers dont les pétales tombent, la mer et des îles en arrière-plan, dalles de pierre au sol.

### Sora — Polyvalent

> Moine guerrier, serein et juste, peu de mots.

- **Silhouette** : chapelet de grosses perles autour du cou (le détail signature), crâne rasé.
- **Tenue** : kimono court bleu et blanc, ceinture de corde, pieds bandés.
- **Tenue 2** : kimono safran.
- **Coups** :
  - Onde sonore → « Vague d'esprit » (ki bleuté) ;
  - Uppercut → « Dragon ascendant ».
- **Entrée** : salut, mains jointes.
- **Victoire** : méditation, une feuille tombe.

### Kitsune — Rushdown

> Combattante au masque de renard, rusée et moqueuse.

- **Silhouette** : masque de renard relevé sur le côté (le détail signature), longue tresse.
- **Tenue** : tenue rouge et noire ajustée, griffes de métal aux gants, sandales.
- **Tenue 2** : blanc et or.
- **Coups** :
  - Ruée → « Charge du renard » ;
  - Saut de l'ange → « Plongeon du renard » ;
  - Genou montant → « Bond du renard ».
- **Entrée** : apparaît dans un tourbillon de feuilles, baisse son masque.
- **Victoire** : rit derrière son masque, queue de renard fantôme.
