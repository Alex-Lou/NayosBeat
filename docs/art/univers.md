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

**Palette d'ambiance** : nuit violette, orange chaud, cyan électrique.

### Stage — L'Entrepôt

Entrepôt reconverti en club, la nuit. Mur d'enceintes empilées au fond, néons violets et orange, une cabine de DJ en hauteur, la foule en silhouettes à contre-jour qui bouge en rythme (boucle de 4 images), fumée basse au sol. Sol en béton ciré avec reflets néon.

### Nayo — Polyvalent

> Boxeur-DJ, calme et sûr de lui, sourire en coin. Il « mixe » ses combats.

- **Silhouette** : athlétique, garde de boxeur haute, casque audio orange autour du cou (le détail signature).
- **Tenue** : bomber noir à finitions côtelées orange (col, poignets, ourlet), t-shirt blanc, jogging gris, bandes blanches aux mains, baskets blanches semelle orange.
- **Tenue 2** : bomber bordeaux, finitions cyan, semelles cyan ; son énergie sonore devient orange.
- **Peau** brun chaud ; cheveux noirs courts, twists sur le dessus, dégradé sur les côtés.
- **Palette principale** :
  - peau `#2a1712 #7d4a32 #a86a4a #d08f68` ;
  - cheveux `#0c0a10 #1c1824 #2b2536 #3f3750` ;
  - bomber `#0b0a12 #1f1c2e #2d2a42 #46425f` ;
  - orange `#4a1a06 #b5460e #f07a1e #ffb35c` ;
  - jogging `#121119 #2f2d40 #43415a #5d5b78` ;
  - blanc `#3d3b4f #9e9cb4 #d9d7e6 #ffffff` ;
  - énergie cyan `#0d3a4a #1d8fb0 #4fd6ff #d8f8ff`.

| Coup (gabarit) | Nom | Mise en scène |
|---|---|---|
| standLight | Direct | Jab sec du bras avant |
| standHeavy | Crochet | Crochet du bras avant avec un pas |
| crouchLight | Coup bas | Coup de pied rasant au tibia |
| crouchHeavy | Balayage | Balayage au sol, main arrière au sol |
| jumpLight | Genou sauté | Genou en avant en l'air |
| jumpHeavy | Coup de pied sauté | Coup de pied plongeant vers l'avant-bas |
| special | Onde sonore | Les paumes poussent une onde sonore (noyau + arcs) |
| specialForward | Coup de pied fendu | Coup de pied latéral volant |
| specialAntiAir | Uppercut | « Le drop » : uppercut montant sur la pointe des pieds |
| throw | Projection | Saisie au col, pivot, jeté par-dessus l'épaule |

- **Entrée** : se craque les poings, ajuste son casque, sourire en coin, garde.
- **Victoire** : poing levé, petit rebond en rythme.

### Riff — Rushdown

> B-girl ultra rapide, provocatrice et rieuse. Elle danse autour de l'adversaire.

- **Silhouette** : petite et vive, appuis bas, casquette à l'envers (détail signature), sweat oversize.
- **Tenue** : sweat cyan oversize à capuche, short cargo noir sur legging, genouillères blanches, baskets montantes blanches et violettes, bracelets éponge.
- **Tenue 2** : sweat jaune soleil, accents violets.
- **Peau** claire et dorée, taches de rousseur ; cheveux auburn en deux tresses qui dépassent de la casquette (animation secondaire).
- **Palette** :
  - sweat `#0b2c3a #13708f #2fb3d9 #9be6ff` ;
  - noir `#0d0c12 #1f1d29 #312e40 #4a4660` ;
  - peau `#3a2216 #b0745a #e0a585 #f6cdb0` ;
  - auburn `#2a0f08 #6e2b14 #a5421c #d9672d` ;
  - violet `#2a1240 #5a2b8a #8a4fd1 #c79bff`.

| Coup (gabarit) | Nom | Mise en scène |
|---|---|---|
| standLight | Jab | Jab rapide, épaule rentrée |
| standHeavy | Coup de coude | Coude tournant en avançant |
| crouchLight | Coup bas | Coup de pied bas en appui sur une main |
| crouchHeavy | Balayage | « Windmill » : balayage en rotation au sol |
| jumpLight | Genou sauté | Genou en avant en l'air |
| jumpHeavy | Talon sauté | Talon qui retombe, jambe tendue |
| special | Ruée | Glissade au sol (footwork) qui finit en coude |
| specialForward | Saut de l'ange | Vrille aérienne qui retombe sur la tête adverse (à parer debout) |
| specialAntiAir | Genou montant | « Freeze » explosif : genou qui jaillit vers le haut |
| throw | Projection | Saisie, roulade et renvoi au sol |

- **Entrée** : tourne sa casquette, toprock (pas de danse), pointe l'adversaire.
- **Victoire** : freeze sur une main, clin d'œil.

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
