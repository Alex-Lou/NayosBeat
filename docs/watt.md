# Watt — la spec du 4e combattant de Sound Clash

*Porte 1a (`docs/art/perso-3.md` §5, passation `docs/art/passation-personnages.md`), à valider par le propriétaire. Concept choisi à la porte 0 : A, le colosse de la prise, tiré du colosse de Zen-Tazzer, avec une demande du propriétaire en plus : **une tête d'ampoule**, exploitée en jeu.*

*Les chiffres de jeu ont été écrits en données hors du dépôt, puis passés aux validateurs du moteur : `validateTemplate`, `comboProblems` et `boostProblems` ne trouvent rien. Ils ont aussi été passés à la loi du gel et joués dans le moteur (portées, saut, prise, L, L, L, routes, super). Ils entrent dans `src/data/fighters/watt*.ts` à la porte 1b, où ils se figent. Les hurtbox restent provisoires jusqu'au dessin (portes 2 et 3). Ce qui est une estimation est marqué comme tel.*

Id : `watt`. Nom affiché : `Watt`. Aucune capitale accentuée, ni dans son nom ni dans ceux de ses coups.

**Provenance** (passation §1.5). Zen-Tazzer, `Alex-Lou/Zen-Tazzer`, version `cad2a9adf9038392fe8638c88b0e883bdfb95de3`, lue en lecture seule :
- **le corps, la tenue, la silhouette et les LED** : `assets/Mobs/0 - Mobs/2 - Mob Idle/2 - Mob Idle 1.png` à `3` (l'attente) ;
- **la Surcharge** : `assets/Mobs/0 - Mobs/3 - Mob Idle/3 - Mob Idle 1.png` à `4` (la charge, le même homme) ;
- **la tête d'ampoule** : dessinée de zéro, à la demande du propriétaire (2 novembre 2026). Rien d'autre n'est repris.

---

## 1. Identité (au format de combat-v2 §6.2)

### Watt, Lutteur : « il attrape, il porte, il éteint »

- **Look** :
  - un colosse en blouson matelassé noir, sweat et pantalon de travail noirs, genouillères, rangers ;
  - **sur les deux bras, un exosquelette de manutention**, des pinces aux mains, avec des LED de VU-mètre sur les avant-bras et les épaules. Il le porte par-dessus les manches : ce ne sont pas des bras remplacés ;
  - à la place de la tête, **une ampoule** : un globe de verre sombre, un filament qui s'allume de son énergie, un culot de laiton vissé dans le col. Personne ne demande ;
  - tenue 2 : le blouson sable, des LED et un filament UV.
- **Couleurs** : masse noire, énergie vert VU `#1EC85A`. Tenue 2 : blouson sable, énergie UV `#E070FF`. Les mesures sont au §8.
- **Effets** :
  - des pinces qui se referment (forme `claw`, celle de Riff, en vert VU) ;
  - des étincelles en croix, comme un arc électrique ;
  - la dissolution `rise` plutôt que `scatter` : une ampoule qui « s'éparpille », c'est une tête qui éclate, et le jeu ne fait rien de cruel. **C'est une exception à la règle « `claw` donne `scatter` »** (`dissolution.md`), à décider (§12) ;
  - le lettrage néon.
- **Personnalité** : chaleureux, patient, il donne des consignes et dit « on ». Il ne s'inscrit pas au tournoi : il porte le son. Il ne se bat que quand on touche au matériel, ou quand on lui demande gentiment.
- **Plan de jeu** :
  - avancer garde haute ;
  - au contact, poser la question : garder, et il **attrape** (la prise la plus longue du jeu) ; frapper, et le **Marteau** te plie en CONTRE ;
  - punir de loin avec la **Surcharge** ;
  - cueillir les sauts avec le **Plafonnier** ;
  - garder 3 barres pour **Plein feu**, son seul reversal, que l'adversaire **voit venir sur sa tête** (§2).
- **Forces** (dans les données, mesurées dans le moteur) :
  1. **la prise la plus longue** : elle attrape jusqu'à 53 px de centre à centre sur Nayo et 54 sur Riff. Sur Nayo debout, les boîtes des autres s'arrêtent à 43,5 px (Nayo, Saphir) et 41,5 (Riff), celle de Watt à 53,5 ;
  2. **le plus de vie** : 1 150 PV, contre 1 000, 900 et 950 ;
  3. **des lancers qui pèsent** : Déchargement 120, Vissage 110, et un Serrage de 18 par coup (Nayo : 100, 90, 15).
- **Faiblesses** :
  1. **lent** : marche à 1,2 en avant et 1,0 en arrière, dash de 36 px, backdash de 32 px **sans protection contre la prise**, saut de 33 tics ;
  2. **un seul reversal, payé 3 barres** (Plein feu). Son anti-air n'est invincible qu'aux coups aériens ;
  3. **ni projectile, et une portée courte au sol** : son coup le plus rapide (Paume, 4 tics) ne porte qu'à 45,5 px. Le Marteau (67,5 px) est sous le Chassé de Saphir (71,5 px).

**Le test d'identité** (`tests/data/fighters.test.ts`, porte 1b) : Watt a le plus de vie, la prise la plus longue et les lancers les plus lourds du casting ; sa marche arrière est la plus lente. Il ne casse pas l'identité de Saphir (`fighters.test.ts:65`) :
- sa boîte de H s'arrête à 54 px, contre 58 pour elle ;
- sa marche arrière est à 1,0, contre 1,6 ;
- son backdash fait 32 px, contre 52 ;
- son coup le plus rapide sort en 4 tics, contre 5.

C'est vérifié dans le moteur.

**Description du roster** (62 signes) : « Roadie à tête d'ampoule · prise longue · Surcharge · Plein feu ».

**Titre de l'aide** : « Le roadie : il attrape, il porte et il éteint ».

---

## 2. L'ampoule, en jeu

Le propriétaire a demandé une tête d'ampoule, et qu'elle serve au jeu. Le cœur ne la voit pas : le rendu lit l'état sans jamais l'écrire (D17). Elle sert donc à **la lecture du jeu**, première chose qui le rend fun : lire l'adversaire.

| Idée | Ce que le joueur voit | Ce que ça change au jeu | Coût, et qui le fait |
|---|---|---|---|
| **1. La jauge sur la tête** | le filament monte d'un cran par barre de Boost : faible à 0, plein à 3. Les changements se font en fondu lent (`flashs.md` §5) | **on lit son reversal** : ampoule pleine, Plein feu est prêt, et l'adversaire réfléchit avant de presser au réveil. C'est le signal le plus lisible du casting, à la taille d'un téléphone | du rendu qui lit la jauge : à mesurer à la porte 4 dans `live-lights.ts` (présence en données), sinon un peu de code de rendu pour la session principale |
| **2. Le filament est son visage** | les 8 expressions sont des formes et des intensités du filament (§9) | on lit **son état** : qui force, qui encaisse, qui est épuisé | des retouches de planche, chez l'agent (porte 2) |
| **3. Le KO l'éteint** | à `out`, le filament s'éteint. Le verre ne casse jamais | une fin lisible et douce : rien de cruel | des planches, chez l'agent |
| **4. Il porte sa lumière** | dans L'Entrepôt sombre, son ampoule éclaire ses épaules et le côté de l'adversaire qui lui fait face. Tenu dans la prise, le visage adverse passe au vert | **la prise se voit de loin** : la lumière verte sur l'adversaire dit « il est pris » | une lumière vivante (`PointLight`) à la porte 4, dans le budget de flashs |
| **5. Les coups parlent électricité** | Coup de jus, Surcharge, Plafonnier, Plein feu, Rallumage ; ses Remix sont « survoltés » | le nom dit ce que c'est (combat-v2 §5.4) | des données |
| **6. Le Finisher l'éteint aussi** | Couvre-feu : la salle s'éteint, puis son ampoule, en dernier (§7) | une fin signée | `powerCut` existe ; l'ampoule qui s'éteint en dernier demande peut-être du rendu (§7.4) |

**Ce que l'ampoule ne fait pas**, exprès :
- **Elle ne trahit jamais un coup avant qu'il sorte.** Si elle s'allumait au démarrage des frappes et pas de la prise, le joueur lirait « pas de lumière = prise », et l'outil signature mourrait. Elle ne change qu'avec la jauge, les coups reçus, et au pic d'un spécial (`kiai`, après le démarrage).
- **Aucun flash, aucun éblouissement.** Un « coup aveuglant » serait un flash plein écran, interdit (WCAG 2.3.1, D21). Toute variation de l'ampoule est lente, et sa surface (un globe d'environ 15 × 15 px du monde, sous 300 px²) reste sous la règle des effets de planche.
- **Rien dans le cœur.** Une mécanique de « surchauffe » serait une ressource de cœur (Jax, Mortal Kombat 11, a des bras qui chauffent) : écartée, parce que la jauge de Boost dit déjà tout.

---

## 3. Statistiques comparées (au format de combat-v2 §6.3, mesurées dans le moteur)

| | Nayo | Riff | Saphir | Watt |
|---|---|---|---|---|
| PV | 1000 | 900 | 950 | **1150** |
| Marche avant / arrière | 1,5 / 1,2 | 1,9 / 1,4 | 1,6 / 1,6 | 1,2 / **1,0** |
| Dash / backdash | 18 t, 56 px / 22 t, 44 px | 16 t, 64 px, annulable f8 / 20 t, 48 px | 18 t, 48 px / 18 t, 52 px, anti-prise f0–10 | 20 t, 36 px / 24 t, 32 px, **sans anti-prise** |
| Saut (en l'air, sommet, distance) | 31 t, 79,6 px, 70 px | 27 t, 66,5 px, 73 px | 29 t, 70,8 px, 66 px | 33 t, 60,2 px, 54,4 px (47,6 en arrière) |
| Coup le plus rapide | 4 tics | 3 tics | 5 tics | 4 tics (Paume, 45,5 px) |
| Plus longue portée sans bouger | Crochet 65 px | Coude 56 px | Chassé 71,5 px | Marteau 67,5 px |
| Overheads | Overhand 19 t | Talon 17, Saut de l'ange 16 | Fouetté plongeant 18 t | Coup de pilon 22 t, Coup de masse en corde |
| Reversal | Uppercut f0–6 | aucun au sol | aucun | **Plein feu** (super, f0–9) |
| Anti-air invincible aux coups aériens | — | Genou montant | — | Plafonnier f0–9 |
| Projectile | Vinyle 3,5 px/t | aucun | aucun | aucun |
| Prise (portée de la boîte sur Nayo debout) | 43,5 | 41,5 | 43,5 | **53,5** (attrape jusqu'à 53 px sur Nayo, 54 sur Riff) |
| Lancers (devant / derrière, tabassage) | 100 / 90, 15 | 85 / 80, 10 | 80 / 85, 10 | **120 / 110, 18** |
| Combo de base (L, L, L) / meilleur sans jauge | 163 / — | 143 / — | 99 / 205 | 108 / 195 |

---

## 4. Le matchup (au format de combat-v2 §6.4)

Pente visée : **défavorable contre Nayo, favorable contre Riff, à 6-4 au plus** (estimation, à vérifier en boîte grise par la session principale). Contre Saphir : défavorable, parce qu'elle le tient à mi-distance et ressort (estimation).

- **Contre Nayo**
  - Le Vinyle et le Crochet (65 px) le tiennent dehors. Watt avance garde haute, saute de loin (14 tics au-dessus de 48 px, assez pour passer le Vinyle), ou traverse avec la **Surcharge survoltée** (1 barre, invincible de f4 à f17).
  - Au contact, Nayo choisit : garder, et Watt l'attrape à 53 px ; frapper, et le Marteau le plie en CONTRE.
  - L'Uppercut punit ses sauts de près : Watt saute de loin, ou pas du tout.
- **Contre Riff**
  - Elle doit venir au contact, et sa garde ne la protège plus de la prise à 54 px.
  - Le Plafonnier cueille le Saut de l'ange et ses sauts.
  - Mais son Jab (3 tics) sort avant la Paume (4) : au contact, elle gagne l'échange de coups rapides, et Watt doit choisir entre garder et attraper.
  - Le dash annulable de Riff la sort de sa portée ; sa Glissade passe sous le Marteau. Le Ratissage et la Paume basse la touchent.
- « Lui veut la distance. Watt veut tes épaules. Il lance, l'autre encaisse et avance. »
- « Elle veut le contact. Lui aussi, pour la tenir. Elle tourne, il attend. »

**Ce qu'il donne à un CPU** : les CPU gardent beaucoup au contact (PR #79), et contre Watt garder, c'est se faire prendre. **Le risque est qu'il soit trop fort contre le CPU.** À mesurer en boîte grise ; la réponse est dans les plans du CPU (se dégager, sauter), donc chez la session principale.

---

## 5. Les coups

### 5.1 Ce qu'on voit (cahier §4.3.2)

Les noms des normaux sont des gestes, ceux de l'haltérophilie : il **porte** (Épaulé, Jeté, Arraché). La métaphore électrique est réservée aux spéciaux, à la super et au Finisher.

| Entrée | Nom | Ce qu'on voit | Où | À quoi ça sert | Comment le contrer |
|---|---|---|---|---|---|
| L | **Paume** | La pince avant s'ouvre et pousse, paume à plat, à hauteur de ventre | milieu | ouvrir L, L, L (45,5 px) | le Jab de Riff passe avant (3 tics contre 4) |
| L, L | **Crochet court** | Un crochet court de la pince arrière, un pas de 8 px | milieu | prolonger ; s'annule en spécial | −2 en garde |
| L, L, L | **Jeté** | Les deux bras poussent vers l'avant, comme on jette une barre au-dessus de sa tête | milieu, met au sol | finir la chaîne | −8 en garde : le punir |
| → + L | **Pas lourd** | Un pas lourd de 14 px, puis la Paume | milieu | entrer en frappant | un coup bas au démarrage |
| H | **Marteau** | Le poing avant tombe de haut en bas, à hauteur de poitrine ; **CONTRE qui plie** (hitstun +20, l'adversaire reste sur place) | milieu | sa portée (67,5 px) ; punir qui presse au contact | −7 en garde ; la Glissade passe dessous |
| H, H | **Double marteau** | Les deux poings ensemble, 8 px en avant | milieu, met au sol | finir la corde lourde | −8 en garde |
| L, L, → + H | **Coup de masse** | Le poing par-dessus la garde, dans la corde ; **Rebond** sur un corps jonglé | **overhead** | ouvrir une garde basse en combo | garder debout ; −6 |
| L, L, ← + H | **Épaulé** | Il ramasse l'adversaire par en dessous et le monte aux épaules, après un pas de 10 px | milieu, **lanceur** (4 points) | le lanceur de corde | rate l'accroupi |
| → + H | **Coup de pilon** | Le poing monte haut derrière l'ampoule, puis tombe tout droit | **overhead** | ouvrir un adversaire accroupi (22 tics, très télégraphié) | garder debout ; −4 |
| ← + H | **Arraché** | Les deux bras arrachent vers le ciel | milieu, **lanceur** (4 points) | anti-air normal | rate l'accroupi ; −7 |
| ↓ + L | **Paume basse** | La pince à plat, au ras du sol | **bas** | le coup bas rapide | −2 en garde |
| ↓ + H | **Ratissage** | Accroupi, le bras balaie le sol comme un râteau | **bas**, met au sol | le balayage | −10 en garde |
| en l'air, L | **Coude plongeant** | Le coude vers le bas | overhead | sauter sur un adversaire | un anti-air |
| en l'air, H | **Plaquage** | Le corps entier vers le bas, bras ouverts | overhead | le saut lourd | l'Uppercut, le Genou montant |
| S | **Coup de jus** | Les deux pinces en avant sur un pas de 16 px ; au contact, l'exosquelette décharge, et une petite gerbe d'arcs verts part | milieu, met au sol | finir un combo ; sa punition proche (73,5 px) | −12 en garde |
| → + S | **Surcharge** | La charge du dessin source : épaule en avant, 56 px | milieu, met au sol | **punir de loin** (107,5 px) | −11 en garde ; un projectile le prend en course |
| ↓ + S | **Plafonnier** | Il cueille le sauteur au-dessus de son ampoule et le rabat au sol | milieu, met au sol | l'anti-air, **invincible aux coups aériens** de f0 à f9 | sauter tard, ou feinter le saut ; −19 en garde |
| PRISE | **Prise** | Les pinces s'ouvrent, puis se referment sur les épaules ; le visage adverse passe au vert | — | **l'outil signature** : la prise la plus longue (53 px) | sauter, ou rester à plus de 54 px ; démarre en 6 tics |
| en tenant, L | **Serrage** | Les pinces serrent, les LED montent | — | le tabassage, 18 par coup | se débattre |
| en tenant, H | **Déchargement** | Il soulève l'adversaire et le pose plus loin, comme une caisse qu'on décharge | — | le gros lancer devant (120) | — |
| en tenant, ← + H | **Vissage** | Il le fait tourner d'un quart de tour, comme on visse une ampoule, puis le passe par-dessus son épaule | — | changer de côté (projection debout, sur les planches de victime existantes) | — |
| DASH | **Avancée** | Un pas lourd, les épaules d'abord, 36 px | — | entrer | un coup qui le cueille |
| ← + DASH | **Recul** | Un pas en arrière, 32 px, sans protection contre la prise | — | sortir, mal | une prise, une course |

`jabRepeat` n'est pas pris, comme chez Riff et Saphir : **28 ids sur 29.**

### 5.2 Frame data (au format de combat-v2 §10.2, mesurée dans le moteur)

Portée : de centre à centre, contre Nayo debout, mesurée sur les boîtes (comme `tests/data/ranges.test.ts`). Contre Riff et Saphir debout, elle fait 0,5 à 1,5 px de plus.

| Id | Entrée | Nom | S/A/R (tot) | Dg | Gel | Garde | Hitbox x / y | Mouvement | Av. (touché / gardé) | Portée | Annule en |
|---|---|---|---|---|---|---|---|---|---|---|---|
| standLight | L | Paume | 4/2/9 (15) | 30 | 8 | mid | 8..32 / 40..54 | — | +3 / 0 | 45,5 | normal, spécial ; corde L (neutre, →, ←) Crochet court |
| chainLight | L, L | Crochet court | 6/3/12 (21) | 38 | 8 | mid | 8..36 / 42..58 | +8 px f0–5 | +3 / −2 | 57,5 | spécial ; cordes : L (toute direction) Jeté, H Marteau, → + H Coup de masse, ↓ + H Ratissage, ← + H Épaulé |
| lightFinisher | L, L, L | Jeté | 9/3/18 (30) | 55 | 10 | mid | 8..40 / 34..62 | +10 px f0–8 | KD / −8 | 63,5 | — |
| forwardLight | → + L | Pas lourd | 9/2/11 (22) | 32 | 8 | mid | 8..34 / 40..54 | +14 px f0–8 | +3 / −1 | 61,5 | spécial ; corde L (neutre, →, ←) Crochet court |
| standHeavy | H | Marteau | 12/3/20 (35) | 85 | 13 | mid | **14..54** / 40..58 | — | −1 / −7 ; CONTRE +20, recul 0,5 | **67,5** | spécial ; cordes : H (neutre, →) Double marteau, ↓ + H Ratissage, ← + H Arraché ; jongle 2 |
| chainHeavy | H, H | Double marteau | 11/3/20 (34) | 70 | 12 | mid | 12..48 / 30..64 | +8 px f0–7 | KD / −8 | 69,5 | spécial |
| chainHigh | L, L, → + H | Coup de masse | 15/3/16 (34) | 60 | 11 | **overhead** | 10..42 / 36..76 | +10 px f0–7 | +1 / −6 | 65,5 | spécial ; **Rebond** une fois par combo |
| chainLaunch | L, L, ← + H | Épaulé | 8/4/18 (30) | 55 | 10 | mid | 4..34 / 58..104 | +10 px f0–5 | lance (8 ; 4 points) / −7 | 57,5 (rate l'accroupi) | spécial |
| forwardHeavy | → + H | Coup de pilon | 22/3/16 (41) | 75 | 12 | **overhead** | 12..46 / 36..76 | +12 px f6–17 | +2 / −4 | 71,5 | — |
| backHeavy | ← + H | Arraché | 8/4/18 (30) | 65 | 11 | mid | 2..32 / 58..104 | — | lance (8 ; 4 points) / −7 | 45,5 (rate l'accroupi) | spécial |
| crouchLight | ↓ + L | Paume basse | 5/2/9 (16) | 24 | 7 | low | 8..36 / 2..14 | — | +2 / −2 | 49,5 | normal, spécial |
| crouchHeavy | ↓ + H | Ratissage | 11/3/22 (36) | 75 | 12 | low | 10..48 / 2..14 | — | KD (trip) / −10 | 61,5 | — |
| jumpLight | en l'air, L | Coude plongeant | 5/6/8 | 32 | 8 | overhead | 4..30 / 6..24 | — | — | 43,5 | — |
| jumpHeavy | en l'air, H | Plaquage | 8/6/12 | 78 | 12 | overhead | 0..34 / −4..20 | — | — | 47,5 | — |
| special | S, ↓↘→ | **Coup de jus** | 10/3/22 (35) | 90 | 14 | mid | 10..44 / 30..60 | +16 px f2–9 | KD / −12 | 73,5 | — |
| specialForward | → + S | **Surcharge** | 14/4/20 (38) | 85 | 13 | mid | 8..38 / 20..70 | +56 px f3–17 | KD / −11 | **107,5** | — |
| specialAntiAir | ↓ + S, →↓↘ | **Plafonnier** | 6/6/26 (38) | 95 | 14 | mid | −4..34 / 50..110 | — | KD / −19 | 47,5 | — ; **invincible aux coups aériens f0–9** |

**Prise et déplacements** (au format de combat-v2 §10.3)

| Id | Watt |
|---|---|
| `grab` | **Prise** 6/3/22 (31), boîte 6..40 / 20..60 : attrape jusqu'à **53 px** sur Nayo, 54 sur Riff (mesuré dans le moteur) |
| `pummel` | **Serrage** 7/1/10 (18), 18 fixes, gel 6 |
| `throwForward` | **Déchargement** 12/1/24 (37), 120, gel 16, KD (3,5 ; vx 4) |
| `throwBack` | **Vissage** 14/1/26 (41), 110, gel 15, côté changé à f6, KD (3,5 ; vx 3) |
| `dashForward` | **Avancée**, 20 tics, 36 px de f1 à f14 |
| `dashBack` | **Recul**, 24 tics, 32 px de f1 à f16, sans protection contre la prise |

**Les bornes, vérifiées** :
- aucune frappe hors Boost au-dessus de 127 (les lancers : 120 et 110) ;
- le gel sur la loi `5 + ⌊dégâts/10⌋ ± 3` partout, et sous 23 tics de base ;
- aucun normal au-dessus de +3 en garde (son coup le plus rapide démarre en 4 tics, règle 8) ;
- `throwBack` à 14 tics, côté changé à f6 ;
- `knockdownFrames` à 40 ;
- pushbox debout de 28 px, le plafond (§4.3.4 du cahier) : sa masse passe par le dessin ;
- `crouching` sur les deux coups bas ;
- une prise rapporte moins d'une barre : `maxHoldGain` vaut 288 sur 1 000 (`boostProblems` vide).

---

## 6. Les enchaînements

**Son style** : « Lentement, puis dans les bras. » Des phrases courtes, de 3 ou 4 coups, qui finissent presque toujours au sol, près de lui : il a fait le travail, il attend le réveil. Ses dégâts sont dans ses lancers autant que dans ses combos.

**Ses cordes** (au format de combos-v3 §4)

| Coup | Suites |
|---|---|
| Paume (L) | L (neutre, →, ←) : Crochet court ; le reste par `cancelInto` (Paume basse, Pas lourd, spéciaux) |
| Crochet court (L, L) | L (toute direction) : Jeté ; H : Marteau ; → + H : **Coup de masse** ; ↓ + H : Ratissage ; ← + H : **Épaulé** |
| Marteau (H) | H (neutre, →) : **Double marteau** ; ↓ + H : Ratissage ; ← + H : Arraché ; coût de jongle 2 |
| Pas lourd (→ + L) | L (neutre, →, ←) : Crochet court |

Son prolongateur est le **Rebond**, sur le Coup de masse : le corps jonglé est écrasé au sol et rebondit.

**L, L, L passe sans trou partout où la Paume touche** : de 20 à 45 px sur Nayo, mesuré au pixel près (au-delà, la Paume ne touche pas). La Paume porte à 45,5 px : plus de 40, comme le demande `combos.test.ts`. La garantie accroupie se vérifie en 1b.

**Routes mesurées dans le moteur**, sur Nayo (1000 PV). La distance de départ est entre parenthèses. Les mêmes routes font les mêmes dégâts sur Riff.

- **Sans jauge** (11 à 20 % de la vie de Nayo, 12 à 22 % de celle de Riff), chacune finit au sol :
  - L, L, L (30 px) : 30 + 34 + 44 = **108** ;
  - L, H → S (30 px) : 30 + 76 + 72 = **178** ;
  - L, L, H, H (30 px) : 30 + 34 + 68 + 49 = **181** ;
  - L, L, H → S (30 px) : 30 + 34 + 68 + 63 = **195** ;
  - L, L, H → → + S (Surcharge) (30 px) : 30 + 34 + 68 + 59 = **191** ;
  - L, L, → + H (Coup de masse) → S (30 px) : 30 + 34 + 48 + 63 = **175** ;
  - L, L, ← + H (Épaulé) → ↓ + S (Plafonnier) (28 px) : 30 + 34 + 44 + 66 = **174** ;
  - L, L, ← + H ⇢ L, L, L (28 px) : 30 + 34 + 44 + 21 + 22 + 27 = **178** ;
  - ← + H (Arraché) → ↓ + S (24 px) : 65 + 85 = **150** ;
  - H → S (40 px) : 85 + 81 = **166**.
- **1 barre** :
  - L, L, H → DASH (Rallumage) → L, L, H → S (30 px) : 30 + 34 + 68 + 21 + 22 + 42 + 45 = **262** ;
  - L, L, H → BOOST (Coup de jus survolté) : 30 + 34 + 68 + 77 = **209** ;
  - L, L, H → → + BOOST (Surcharge survoltée) : 30 + 34 + 68 + 70 = **202**.
- **3 barres** :
  - L, L, H, H → ← + BOOST (Plein feu) (30 px) : 30 + 34 + 68 + 49 + 42 + 40 + 70 = **333** ;
  - L, L, H → ← + BOOST : 30 + 34 + 68 + 49 + 48 + 70 = **299** ;
  - Plein feu seul : 70 + 72 + 112 = **254**.
- **Les lancers**, hors combo : Déchargement **120**, Vissage **110**, et jusqu'à quelques Serrages de 18 avant (tant que l'adversaire ne s'est pas dégagé).

Le contraste : ses combos sans jauge (108 à 195) sont sous ceux de Nayo (163 et plus) et proches de ceux de Saphir (99 à 205), mais **sa prise en fait un de 120 d'un seul geste**, sans risque de rater un lien. Une route a été écartée : ↓ + L, H n'est pas un lien (+2 contre 12 tics de démarrage).

**Les 7 lignes de l'aide** (`src/data/texts/watt.ts`, porte 1b) :
1. L, L, L : Paume, Crochet court, puis le Jeté met au sol.
2. L, H, puis S : le Coup de jus met au sol.
3. L, L, H, puis avant + S : la Surcharge emporte l'adversaire.
4. L, L, arrière + H, puis bas + S : l'Épaulé soulève, le Plafonnier rabat.
5. L, L, arrière + H, puis L, L, L sur le corps en l'air.
6. L, L, H, H, puis arrière + BOOST (3 barres) : Plein feu.
7. La même, puis arrière + BOOST (FINISH allumé) : son Finisher, Couvre-feu.

---

## 7. Le Boost et la super

Son mot de Remix : **survolté** (accordé : « Surcharge survoltée »). Les Remix gardent le timing exact de leur spécial (D18), et leurs effets passent en blanc platine.

| Entrée | Nom | Ce qui change | Ce qu'il s'achète |
|---|---|---|---|
| BOOST | **Coup de jus survolté** | 110 dégâts, met au sol plus loin (4 ; 4), blockstun 22 (−2 en garde) | un Coup de jus **sûr en garde** : la pression continue |
| → + BOOST | **Surcharge survoltée** | 100 dégâts, **invincible de f4 à f17** | **traverser le Vinyle** sur toute la charge. Ce n'est pas un reversal : il est vulnérable de f0 à f3 |
| ↓ + BOOST | **Plafonnier survolté** | 115 dégâts, invincible aux coups aériens de f0 à f12, lance (6 ; 1 ; 2 points) | un anti-air qui jongle |
| DASH après le contact | **Rallumage** (son Rewind) | un pas de 24 px en 14 tics, annulable dès f4, 1 barre | reprendre la phrase ; l'ampoule clignote une fois, lentement |
| ← + BOOST | **Plein feu** (sa super) | voir ci-dessous | — |

**Plein feu**, un **reversal**, invincible dès f0 contre tout, comme la Mégabasse :
- 3/16/30 (49). Flash à f1, 20 tics : 2 tics avant la 1re frappe ;
- **trois frappes** :
  - un crochet gauche à f3 (70) ;
  - un crochet droit à f9 (80) ;
  - le double marteau au sol à f16 (140), qui met au sol (6 ; 2) ;
- chaque frappe tient le corps jusqu'à la suivante : hitstun 22, pour des écarts de 6 et 7 ;
- il **n'avance ni ne recule** : `everyBlowLands` reste dans son hypothèse ;
- **portée mesurée** : les trois frappes touchent jusqu'à **58 px** de centre à centre, sur Nayo comme sur Riff (la Mégabasse : 74, le Slam : 88, la Coda : 86). C'est un reversal **court**, celui d'un lutteur ;
- −29 en garde ;
- seule : 254 (Mégabasse 264, Slam 273, Coda 246). Sur Riff à 30 % (270 PV), Plein feu laisse 16 PV ; le Finisher tue sur la dernière frappe ;
- tampons : « RALLUMAGE ! » (11 signes) et « PLEIN FEU ! » (11), sous « DÉGAGEMENT ! » (12). La mesure en surface se fait à la porte 1b (`flash-areas.test.ts`).

**Au réveil**, le CPU difficile sort la super seulement si elle est invincible dès f0 contre tout (`isReversal`) : c'est le cas, comme pour Nayo.

---

## 8. Le Finisher : « Couvre-feu »

*Au format de `docs/finisher.md` §2 et §3. Il n'a aucune donnée à lui : c'est Plein feu lancé armé.*

### 8.1 Le fantasme
> Deux crochets. Le marteau. La salle s'éteint d'un coup, toute. Il ne reste que lui, l'ampoule pleine, au milieu du béton. Puis elle baisse, doucement. On éteint. Fin de service.

### 8.2 Pourquoi c'est lui
- **Ce qu'il veut** (histoire) : « Que le son tienne jusqu'à l'aube. » Et quand c'est fini, c'est lui qui éteint : le dernier à partir, toujours. Le Finisher le fait à la lettre.
- **La tête d'ampoule** : la seule lumière de la scène, puis plus rien.
- **Son rôle** : Plein feu reste un reversal court. Ses 3 barres sont visibles sur sa tête bien avant.

### 8.3 Storyboard (t0 = l'image du KO, sur la 3e frappe)

| t | Moment | Lui | La victime | Caméra et VFX | Son |
|---|---|---|---|---|---|
| verrou | les deux premières frappes | crochet, crochet [R : planche de la super] | encaisse [R] | ampoule pleine ; zoom qui part sur la charge (`zoomFrom: 'charge'`) | les frappes |
| t0 | le marteau | le double marteau au sol [R] | décolle [R] | aplat vert sombre derrière ; secousse verticale (`'y'`) | l'impact |
| t0 → R | le vol | tenu [R] | vole dans le silence [R] (`'flight'`, la trame de Nayo) | gros plan ×2,0 ; aucun flash | coupé (`hush`) |
| R | la retombée | se redresse [R] | au sol [R] | la seule lueur : son ampoule ; les jauges et la barre du perdant éclatent | la chute |
| R → R + 30 | — | retour en garde [R] | au sol [R] | caméra de ×2,0 à ×1,0 | — |
| R + 30 | la carte | pose de victoire [R] | — | carte « ON ÉTEINT. », en néon | — |
| fin de la carte − 1 | **le couvre-feu** | — | — | **la coupure de courant** (`powerCut`) : la scène tombe à 40 % en 4 images, une baisse seulement, tenue jusqu'à la fin | une basse qui tombe |

Toutes les poses sont réutilisées [R] : aucune pose neuve n'est demandée (la pose `finale` reste hors v1).

### 8.4 à 8.10, en bref
- **Caméra** : celle du contrat commun (`finisher.md` §1.14). **Watt doit rester sous 96 px au gros plan** : sa garde est estimée de 81 à 86 px, debout il atteint 94 sur la maquette (§10). La super, le retour en garde et la victoire seront mesurés à la porte 2 ; si une pose dépasse, l'ampoule se penche, l'échelle ne change pas.
- **Fond** : un aplat vert sombre par tenue, sous ΔL 0,06 contre le ciel et le sol. Proposition : `0x0b2a18` et `0x2a0e3a`, à mesurer par `finisher-flashes.test.ts`.
- **VFX et palette** : son vert VU, le platine du Boost ; aucun rouge saturé ; au plus 3 flashs comptés. La coupure de courant est une baisse, pas un flash.
- **Typographie** : pas de compte (`count: []`) ; carte « ON ÉTEINT. » (`'neon'`), sans carte propre à un rival (`rival: null`). Elle parle comme lui : « on », une consigne.
- **Couches sonores** : sons existants seulement en v1 (`src/audio/sfx.ts`). Plus tard : le claquement d'un interrupteur, le grésillement d'un filament, une sono qu'on coupe.
- **Note de sirène** : **fa, 349 Hz** (quinte : do, 523 Hz). Elle ne tombe ni sur 262, 294, 330, 392, 440 ou 494 Hz (Nayo, Saphir, Riff), ni sur leurs quintes.
- **Durées** : celles de la trame `'flight'` (la grille de Nayo), version courte comprise.
- **Coût** :
  - le `FinisherScript` en données : `name: 'COUVRE-FEU'`, `count: []`, `stretch: 0`, `silence: 'flight'`, `zoomFrom: 'charge'`, `flats: { main: 0x0b2a18, alt: 0x2a0e3a }`, `flatLeaves: 'cardEnd'`, `card: { text: 'ON ÉTEINT.', rival: null, style: 'neon' }`, `shake: 'y'`, `cone: false`, `crowd: false`, `needle: false`, `shards: false`, `powerCut: true` ;
  - **le seul souhait de rendu** : que son ampoule, elle, **reste allumée** pendant la coupure, puis s'éteigne en dernier. Aujourd'hui `powerCut` assombrit toute la scène, lui compris. C'est du code de rendu pour la session principale, **à couper sans regret** : sans lui, le Finisher tient.

---

## 9. Les couleurs

Mesurées avec la teinte HSL, la luminance relative et le rapport de rouge sur les canaux linéarisés (`src/render/luminance.ts`), et une simulation de Machado (2009, sévérité 1, RVB linéaire) qui redonne les chiffres du cahier (jaune de la vie : 0,64 en deutéranopie, 0,56 en protanopie).

| | Tenue 1 | Tenue 2 |
|---|---|---|
| Masse | blouson matelassé noir | blouson sable (proposition `#B8A27A`, à mesurer à la porte 2) |
| Énergie, filament, LED et HUD | vert VU `#1EC85A` | UV `#E070FF` |
| Teinte | 141° | 287° |
| Écart au cyan 187° / magentas 319°, 329° / or 43° / jaune 46° / oranges 28°, 35° | 46° / 178°, 172° / 98° / 95° / 113°, 106° | 100° / 32°, 42° / 116° / 119° / 101°, 108° |
| Luminance / rapport de rouge | 0,42 / 0,02 | 0,35 / 0,39 |
| Deutéranopie | `#B8A963`, 0,39 | `#77A3FB`, 0,37 |
| Protanopie | `#CAB650`, 0,46 | `#4F98FF`, 0,32 |

- **Le HUD** est à 95° (tenue 1) et 119° (tenue 2) du jaune de la vie : bien plus que 20°.
- **En simulation**, le vert tombe à 0,39 et 0,46, contre 0,64 et 0,56 pour le jaune simulé : séparé par la valeur. **À surveiller en protanopie**, où l'écart n'est que de 0,10 et la teinte simulée tire vers le jaune. Si c'est trop proche à l'œil, on prendra un `hud` plus sombre.
- **Le vert contre le saphir de Saphir** : 83° d'écart, aucun risque. **Contre le cyan de Nayo** : 46°, plus que le saphir (37°).
- **La tenue 2** :
  - l'UV est à 32° du magenta de la tenue 2 de Nayo : **à juger à l'œil** dans un miroir Watt contre Watt à côté de Nayo ;
  - elle se détache de la nuit violette par la valeur (0,35) ;
  - le blouson sable tranche sur le noir par la masse, comme le blouson rouge de Riff.
- **Les LED rouges du dessin source passent au vert** : le rouge saturé est interdit (`veils.test.ts`, rapport de rouge sous 0,8), et le cramoisi est à Riff.
- **Les matières** (palette par matériau, figée à la porte 2) :
  - le nylon matelassé du blouson (noir, tenue 2 sable) ;
  - le coton du sweat et du pantalon de travail (noir) ;
  - le cuir des rangers ;
  - le métal brossé de l'exosquelette ;
  - le caoutchouc des pinces et des genouillères ;
  - le verre de l'ampoule (sombre, à reflets froids) ;
  - le laiton du culot ;
  - puis le filament et les LED (son énergie), les détails d'effets et les 5 du platine.
- **Les effets** (`hit-styles.ts`, PR E) :
  - forme `claw`, énergie vert VU, couleur de frappe blanc-vert (`#D8FFE6`, à mesurer contre le platine à la porte 3) ;
  - le triplet est unique dans le roster ;
  - étincelles en croix (`'cross'`), comme Nayo, mais vertes : l'arc électrique.

---

## 10. La fiche de design

- **Silhouette** : la maquette (le corps du colosse, la tête remplacée par l'ampoule, à la densité de Riff) mesure **94 × 56 px** du monde debout. Sa garde est estimée de 81 à 86 px, mesurée au squelette à la porte 2. Il reste sous 96, la limite du gros plan.
- **La prise** (§4.8 du cahier) : debout, ses poings tomberaient vers 60 px, au-dessus de la fourchette de 45 à 58 px. **Il se penche** dans `hold` et `pummel` ; tenu par Nayo ou Riff, son cou doit tomber entre 49 et 58 px dans `held`, ce que sa carrure rend serré. À mesurer en premier à la porte 2.
- **Corps** (`Body`) :
  - de trois quarts, comme le dessin source (écarts d'épaules et de hanches négatifs, comme Riff) ;
  - épaules très larges, buste long, bras longs et lourds (l'exosquelette), jambes courtes et épaisses ;
  - chaque proportion sera justifiée dans `body.ts`.
- **La garde** (`GUARD`), sa pose signature : basse, les épaules en avant, les deux pinces ouvertes à hauteur de ceinture, prêtes à prendre ; le poids sur les deux jambes. Il respire du ventre, et l'ampoule monte et descend avec.
- **La tête** :
  - un dessin, pas un volume (`stamp.ts`), dessiné de zéro ;
  - un globe de verre sombre, cerclé d'un contour fin ; un reflet froid en haut à l'arrière, venu de l'enseigne de la rue ;
  - le filament au milieu, un peu vers l'avant : c'est par lui qu'on sait où il regarde ;
  - le culot de laiton vissé dans le col.
  - Elle ne tourne pas en garde. Au-delà de 20°, elle tourne par RotSprite.
- **Le visage**, 8 expressions par le filament :
  - `focus` : une spirale régulière, éclat moyen ;
  - `effort` : plus vif ;
  - `kiai` : le filament à blanc, au pic d'un spécial seulement ;
  - `smirk` : la spirale remonte d'un pixel vers l'avant ;
  - `cool` : la moitié avant éteinte ;
  - `hurt` : une spirale tordue et plus pâle (jamais un clignotement) ;
  - `out` : **éteint** ;
  - `tired` : faible.
  - Toujours sobre : aucun sourire dessiné.
- **Le détail signature** : l'ampoule, et son filament qui suit la jauge (§2). Rigide, elle n'a pas de ressort. Sa suite dans le Finisher : la dernière lumière qu'on éteint.
- **Son mouvement** :
  - la garde respire du ventre, sur le « un » de chaque mesure seulement (le demi-temps, toujours cosmétique, D17) ;
  - la marche est lourde, talon puis pointe ;
  - le saut avant est court, genoux rentrés, les pinces en avant.
- **Le son et le temps** :
  - le demi-temps, le poids du son (flight-cases, sangles, loquets), et le grésillement du filament ;
  - thème : « lourd, patient » ;
  - aucun son à lui en v1 : une proposition pour plus tard.
- **Les 3 coups signatures**, animés à la porte 2 et retouchés à la porte 4. Chacun a un membre actif clair : les deux pinces.
  - **la Prise** : les pinces s'ouvrent et se referment ;
  - **la Surcharge** : l'épaule de la pose source ;
  - **le Plafonnier** : les deux bras au-dessus de l'ampoule.
- **Les retours passés du propriétaire** (D25 à D27) : l'anatomie à 0 limite dure ; des bras lourds mais pas trop longs (environ 1,2 fois leur longueur en garde à la frappe) ; aucun coude à l'envers ; un contre-jour en touches, rien sous les hanches, pas de liseré tout autour.

---

## 11. La liste de coupes

Si le temps manque, dans cet ordre :
1. l'ampoule qui reste allumée pendant la coupure du Finisher (§8.4) : la coupure assombrit tout ;
2. la lumière vivante de l'ampoule sur l'adversaire tenu (§2, idée 4) : il garde la lumière de rue et sa présence ;
3. le Rebond du Coup de masse (il reste un overhead de corde) ;
4. le Pas lourd (`forwardLight` retombe sur la Paume) ;
5. la jauge sur la tête en 4 crans (§2, idée 1) : l'ampoule s'allume seulement à 3 barres.

---

## 12. Les risques et les décisions à prendre

- **Trop fort contre le CPU** : les CPU gardent au contact, et la prise bat la garde. À mesurer en boîte grise ; la réponse est dans les plans du CPU (session principale).
- **1 150 PV** : à 30 % de sa vie, le Finisher adverse lui prend 345 PV d'un coup (`finisher.md` §1.6). C'est de l'équilibrage, pour la session principale.
- **Les hauteurs de prise** : il doit se pencher pour tenir dans les fourchettes de `hold-pairs.test.ts`. C'est la première mesure de la porte 2.
- **Les références voisines** :
  - **Jax** (Mortal Kombat) : bras bioniques, prises. Watt porte un exosquelette de manutention par-dessus ses manches et une ampoule à la place de la tête, il ne tire rien ;
  - **Bulb Boy** (aventure en point-and-click, 2015) : un héros à tête d'ampoule fragile. Watt est un colosse dans un jeu de combat, et son ampoule ne se dévisse pas ;
  - **Watt** de *Paper Mario* : un petit esprit électrique, lumineux, hors du genre. Le nom reste, le rapprochement est à savoir ;
  - Zangief, Hugo, Alex, Potemkin, King : pas de slip, de barbe, de mohawk, de masque ni de piledriver, et pas d'armure.
- **Kaï** (promis : « le plus lent, armure ») : Watt n'a pas d'armure. Mais sa marche (1,2) est la plus lente du casting actuel : **Kaï devra être plus lent encore**, ou ne plus être « le plus lent ». À écrire dans combat-v2 §6.5 (session principale).
- **La dissolution** : `claw` donne `scatter` (`dissolution.md`). Pour Watt, `rise` est demandé (une ampoule éparpillée est une tête qui éclate). **Décision du propriétaire et de la session principale**, au moment de la PR E ; sinon il passe en `slash`.
- **La tête d'ampoule dans un monde « réel d'allure »** : on ne l'explique jamais, comme le masque de Saphir. Si le propriétaire la veut un casque, l'histoire change d'une phrase.
- **2 poses sources seulement** (l'attente, la charge) : le reste est inventé au squelette, avec plus de risque d'anatomie qu'avec le batteur.

**Estimation** : 8 à 11 jours-agent pour les portes 1a à 4. Côté session principale, environ 1,5 à 2 jours :
- les plans du CPU d'un lutteur ;
- l'équilibrage (anti-infini des lancers, Finisher contre 1 150 PV) ;
- le Finisher branché en données ;
- au plus, l'ampoule allumée pendant la coupure.

Ni cœur, ni planche de victime : ses lancers suivent l'arc de la projection d'épaule existante.

---

## 13. Les entrées du branchement (brouillon pour la PR E)

Passation §4.2, perso-3 §7.2 :
- `FighterId` : `'watt'` ;
- `ROSTER` : `{ template: WATT, description: 'Roadie à tête d'ampoule · prise longue · Surcharge · Plein feu', finisher: … }` ;
- `STYLES` : `claw`, énergie `#1EC85A` (tenue 2 `#E070FF`), frappe `#D8FFE6` ;
- `SCRIPTS` : le `FinisherScript` du §8.4 ;
- `SIREN_ROOTS` : 349 Hz ;
- `MOVE_TEXTS`, `ART_BY_FIGHTER`, `ARTS`, `CELLS` : aux portes 1b, 2 et 3.

---

## 14. Décision proposée pour le journal

D36 (à confirmer, au prochain numéro libre au moment de la PR) : le 4e combattant de Sound Clash est **Watt**, un lutteur sans armure, tiré du colosse de Zen-Tazzer, avec une tête d'ampoule voulue par le propriétaire.
- **Ce qu'il est** : en données seules ; la prise la plus longue (53 px), le plus de vie (1 150) et les lancers les plus lourds du casting ; un seul reversal (sa super, Plein feu).
- **Son ampoule** : elle montre sa jauge, sans jamais trahir un coup.
- **Origine** : porte 0 de la passation (`docs/art/passation-personnages.md`), concept A, choix du propriétaire.
- **Pourquoi** : contre lui, garder ne suffit plus ; c'est la décision qui manquait au casting. Écartés : B (Grave, zoner au sol) et C (Fla, pression au mur), gardés pour plus tard.
