# Saphir — la spec du 3e combattant de Sound Clash

*Porte 1a (`docs/art/perso-3.md` §5), à valider par le propriétaire. Concept choisi à la porte 0 : B, la contreuse de mi-distance, dans Sound Clash, avec sa propre histoire et sans lien avec le passé de Nayo ni de Riff. Les chiffres de jeu ont été écrits en données hors du dépôt, passés à `validateTemplate`, `comboProblems` et `boostProblems` (aucun problème), à la loi du gel (`tests/data/hitstop.test.ts`), puis joués dans le moteur : portées, saut, L, L, L, routes, Coda. Ils entrent dans `src/data/fighters/saphir*.ts` à la porte 1b, où ils se figent. Les hurtbox sont provisoires jusqu'au dessin (portes 2 et 3). Ce qui est une estimation est marqué comme tel.*

*Porte 2 : refonte de l'allure, choix du propriétaire. La dame au chapeau ne l'inspirait pas : Saphir devient une légende masquée, la trentaine, au masque de Janus et en tenue de scène op-art. Ses coups, ses chiffres et ses tests ne changent pas ; son histoire est réécrite (`docs/art/histoire.md`).*

Id : `saphir`. Nom affiché : `Saphir` (aucune capitale accentuée).

---

## 1. Identité (au format de combat-v2 §6.2)

### Saphir, Contreuse : « un pas, une touche, dehors »

- **Look** : une femme d'une trentaine d'années, droite, de profil. Un **masque de Janus** plein, en laque saphir : un profil sculpté devant, un autre derrière, son détail signature ; une queue de cheval noire sort du sommet. Tenue de scène en op-art : veste courte ivoire à col montant, ceinture saphir, pantalon large de danse rayé d'ondes noires, gants noirs, chaussures bicolores de savate (les armes de la savate). Tenue 2 : la même, inversée, noire rayée d'ivoire.
- **Couleurs** : masse ivoire `#ECE8DE`, masque saphir `#2A4CB8`, énergie verte `#20B464`. Tenue 2 : masse noire `#121216`, énergie lilas `#C0A0FF`. Mesures au §8.
- **Effets** : arcs de coups de pied (`slash`, la forme de Nayo, en vert), étincelles en croix ; dissolution `rise` ; lettrage néon. Une forme neuve serait du code (§4.11 du cahier) : ce n'est pas demandé.
- **Personnalité** : polie, elle vouvoie tout le monde et parle peu. Elle invite, attend, puis punit. Elle salue après chaque combat, sans jamais ôter le masque. Personne ne sait qui est dessous, ni si c'est la même d'un soir à l'autre.
- **Plan de jeu** : tenir l'adversaire entre 60 et 100 px ; le Chassé (71,5 px) pour gagner les échanges de pieds ; la Syncope pour toucher de loin et ressortir ; le Rubato pour punir un coup raté de très loin ; l'Esquive (52 px) pour sortir du contact ; le Contre-ut contre les sauts.
- **Forces** (dans les données) :
  1. la plus longue portée sans bouger du jeu : Chassé 71,5 px, contre Crochet 65 et Coude 56 ;
  2. la marche arrière la plus rapide (1,6 contre 1,2 et 1,4) et le plus long backdash (52 px contre 44 et 48) ;
  3. la Syncope : 99,5 px avec son pas, puis elle recule de 28 px ; le Rubato porte à 103,5 px et met au sol.
- **Faiblesses** :
  1. le coup le plus rapide à 5 tics (Pointe, Coup de pied bas), contre 4 et 3 ;
  2. ni reversal (Rubato forte traverse dès f3, jamais dès f0), ni projectile, et un Contre-ut sans invincibilité ;
  3. des combos courts : sans jauge, 10 à 21 % de la vie de Nayo (Nayo : 18 à 31 %) ; un tabassage faible (Paume, 10 fixes).

**Le test d'identité** (`tests/data/fighters.test.ts`, porte 1b) : Saphir a la plus longue portée immobile de H, la marche arrière la plus rapide et le plus long backdash du casting ; son coup le plus rapide est le plus lent.

**Description du roster** (68 signes) : « Masquée en savate · mi-distance · Syncope · Rubato · sans reversal ».

**Titre de l'aide** : « La masquée : elle esquive, attend et punit ».

## 2. Statistiques comparées (au format de combat-v2 §6.3, mesurées dans le moteur)

| | Nayo | Riff | Saphir |
|---|---|---|---|
| PV | 1000 | 900 | 950 |
| Marche avant / arrière | 1,5 / 1,2 | 1,9 / 1,4 | 1,6 / 1,6 |
| Dash / backdash | 18 tics, 56 px / 22 tics, 44 px | 16 tics, 64 px, annulable f8 / 20 tics, 48 px | 18 tics, 48 px / 18 tics, 52 px, anti-prise f0–10 |
| Saut (en l'air, sommet, distance) | 31 tics, 79,6 px, 70 px | 27 tics, 66,5 px, 73 px | 29 tics, 70,8 px, 66 px |
| Coup le plus rapide | 4 tics | 3 tics | 5 tics (Pointe, Coup de pied bas) |
| Plus longue portée sans bouger | Crochet 65 px | Coude 56 px | Chassé 71,5 px |
| Overheads | Overhand 19 tics | Talon 17, Saut de l'ange 16 | Fouetté plongeant 18 tics (Plongé en corde) |
| Reversal | Uppercut f0–6 | aucun au sol | aucun |
| Projectile | Vinyle 3,5 px/tic | aucun | aucun |
| Lancers (devant / derrière, tabassage) | 100 / 90, 2 × 15 | 85 / 80, 3 × 10 | 80 / 85, Paume 10 (2 visées, à mesurer en 1b) |
| Combo de base / lanceur | 163 / 164 | 143 / 140 | 99 (L, L, L) / 141 (←H → ↓S) |

## 3. Le matchup (au format de combat-v2 §6.4)

Pente visée : **favorable contre Nayo, défavorable contre Riff, à 6-4 au plus** (estimation, à vérifier en boîte grise par la session principale). Avec Saphir, le casting tourne en triangle : Saphir bat Nayo, Riff bat Saphir, Nayo bat Riff.

- Saphir veut 60 à 100 px ; Nayo 90 à 150 ; Riff moins de 60.
- **Contre Nayo**
  - Le Chassé (71,5) dépasse le Crochet (65) et le Coup bas : à mi-distance, Nayo perd l'échange de normaux, ce qui pèse le plus entre CPU (PR #79).
  - La Syncope touche à 99,5 px et ressort : le Crochet et le Pied fendu ne la punissent qu'au contact.
  - Le Vinyle reste sa réponse. Saphir le saute (elle passe 48 px de haut pendant une bonne partie de son saut, à mesurer en 1b), le garde, ou le traverse avec le Rubato forte (1 barre, invincible de f3 à f12). Le Rubato simple, lui, le prend en pleine course.
  - L'Uppercut l'attend si elle saute de près : elle saute de loin, ou pas du tout.
- **Contre Riff**
  - Sous 60 px, le Jab (3 tics) passe avant la Pointe (5) : Saphir doit garder ses distances.
  - La Glissade (corps de 28,5 px de haut) passe sous le Chassé et la Syncope (boîte de 34 à 48 px) : le Coup de pied bas et la Fauche, eux, la touchent.
  - Le dash annulable entre dans sa portée ; l'Esquive (52 px, anti-prise) et la Syncope qui ressort sont ses sorties.
  - Le Saut de l'ange passe au-dessus de ses coups bas ; le Contre-ut la cueille, sans invincibilité.

**Ce qu'elle donne à un CPU** : les CPU gardent peu et échangent (PR #79). Elle gagne les échanges à mi-distance. Un CPU ne punit qu'à sa portée : la Syncope qui ressort risque de le battre trop facilement. C'est la limite à surveiller en boîte grise, et peut-être un plan du CPU de la session principale.

## 4. Les coups

### 4.1 Ce qu'on voit (cahier §4.3.2)

Les noms des normaux sont des gestes de savate ; la métaphore musicale est réservée aux spéciaux, à la super et au Finisher. Riff a déjà un « Revers » : celui de Saphir s'appelle « Revers tournant ».

| Entrée | Nom | Ce qu'on voit | Où | À quoi ça sert | Comment le contrer |
|---|---|---|---|---|---|
| L | **Pointe** | Fouetté rapide de la pointe du pied avant, à hauteur de ventre ; le bras arrière garde | milieu | ouvrir L, L, L de loin (54,5 px) | le Jab de Riff passe avant (3 tics contre 5) |
| L, L | **Fouetté** | La jambe arrière fouette en arc, petit pas de 10 px | milieu | prolonge la Pointe ; s'annule en spécial | −2 en garde |
| L, L, L | **Revers tournant** | Elle tourne sur la jambe d'appui, le talon balaie à hauteur de côtes | milieu | finit la chaîne, met au sol | −8 en garde : le punir |
| → + L | **Pas glissé** | Pas glissé de 16 px, puis une pointe | milieu | s'approcher en frappant ; 0 en garde | un coup bas au démarrage |
| H | **Chassé** | Le chassé latéral, semelle en avant, jambe tendue à hauteur de hanche | milieu | **la portée du casting** (71,5 px) ; gagner les échanges de pieds | la Glissade passe dessous ; −4 en garde |
| H, H | **Chassé arrière** | Elle pivote et pousse du talon arrière, 12 px en avant | milieu | finir la corde lourde | −6 en garde |
| L, L, → + H | **Plongé** | Le fouetté plongeant dans la corde, le pied passe par-dessus la garde | **overhead** | ouvrir une garde basse en combo ; **Rebond** sur un corps jonglé | garder debout ; −6 |
| L, L, ← + H | **Chandelle glissée** | La Chandelle après un pas de 12 px | milieu | le lanceur de corde | rate l'accroupi |
| → + H | **Fouetté plongeant** | Le pied monte, puis plonge par-dessus la garde vers la tête | **overhead** | ouvrir un adversaire accroupi (18 tics, télégraphié) | garder debout ; −4 |
| ← + H | **Chandelle** | Coup de pied droit vers le ciel, buste en arrière | milieu | anti-air normal, **lanceur** (4 points) | rate l'accroupi ; −6 |
| ↓ + L | **Coup de pied bas** | Coup de pied au tibia, presque à plat | **bas** | le coup bas rapide ; attrape la Glissade | −2 en garde |
| ↓ + H | **Fauche** | Revers bas qui fauche les chevilles, une main au sol | **bas**, met au sol | le balayage | −8 en garde |
| en l'air, L | **Pointe sautée** | La pointe tendue vers le bas | overhead | sauter sur un adversaire | un anti-air |
| en l'air, H | **Chassé sauté** | Chassé en l'air, semelle en avant | overhead | le saut lourd | l'Uppercut, le Genou montant |
| S | **Syncope** | Un pas de swing sur le temps long (28 px), un fouetté qui claque sur le temps court, et elle repart en arrière (28 px). Un arc vert, très court | milieu | **l'outil signature** : toucher à 99,5 px et ressortir avant la riposte | la garder (−10 au contact) et la punir **si** elle ne ressort pas assez ; la Glissade passe dessous |
| → + S | **Rubato** | Elle retient son poids en arrière, puis fond de 36 px et fouette, en retard exprès | milieu, met au sol | punir un coup raté de très loin (103,5 px) | −9 en garde ; un projectile la prend en course |
| ↓ + S | **Contre-ut** | Elle bondit, la jambe tendue droit vers le ciel | milieu, met au sol | l'anti-air, **sans invincibilité** | sauter tard, ou la feinte ; −17 en garde |
| PRISE | **Prise** | Saisie au revers de la veste | — | la prise ordinaire (43,5 px) | dégager |
| en tenant, L | **Paume** | Petits coups de paume au plexus | — | le tabassage | se débattre |
| en tenant, H | **Croc-en-jambe** | Elle glisse un pied derrière la cheville, une poussée : l'adversaire tombe tout près | — | la pression au réveil | — |
| en tenant, ← + H | **Valse** | Elle le fait tourner au bras, un tour de valse, et le passe par-dessus son épaule | — | changer de côté (projection debout : planches des victimes existantes) | — |
| DASH | **Fente** | La fente avant de la savate, 48 px | — | entrer à mi-distance | un coup qui la cueille |
| ← + DASH | **Esquive** | Un pas en arrière, 52 px | — | sortir du contact ; anti-prise f0–10 | un coup long qui la rattrape |

`jabRepeat` n'est pas pris (comme chez Riff) : 28 ids sur 29.

### 4.2 Frame data (au format de combat-v2 §10.2)

Portée : de centre à centre contre Nayo debout, mesurée sur les boîtes (comme `tests/data/ranges.test.ts`).

| Id | Entrée | Nom | S/A/R (tot) | Dg | HS/BS | Stop | Recul | Garde | Hitbox x / y | Mouvement | Av. | Portée | Annule en |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| standLight | L | Pointe | 5/2/9 (16) | 28 | 14/10 | 7 | 2,5 | mid | 10..41 / 44..56 | — | +4/0 | 54,5 | normal, spécial ; corde L (neutre, →, ←) Fouetté |
| chainLight | L après Pointe | Fouetté | 6/3/12 (21) | 35 | 17/12 | 8 | 1,5 | mid | 10..44 / 46..60 | +10 px f0–5 | +3/−2 | 67,5 | spécial ; cordes : L (toute direction) Revers tournant, H Chassé, →H Plongé, ↓H Fauche, ←H Chandelle glissée |
| lightFinisher | L après Fouetté | Revers tournant | 8/3/18 (29) | 50 | KD (3)/12 | 10 | 4 | mid | 8..44 / 36..60 | +12 px f0–7 | KD/−8 | 69,5 | — |
| forwardLight | → + L | Pas glissé | 8/2/10 (20) | 30 | 15/11 | 8 | 2,5 | mid | 10..40 / 44..56 | +16 px f0–7 | +4/0 | 69,5 | spécial ; corde L (neutre, →, ←) Fouetté |
| standHeavy | H | Chassé | 10/3/16 (29) | 75 | 20/14 | 12 | 3 | mid | **14..58** / 34..48 | — | +2/−4 | **71,5** | spécial ; cordes : H (neutre, →) Chassé arrière, ↓H Fauche, ←H Chandelle ; jongle 2 |
| chainHeavy | H, H | Chassé arrière | 9/3/17 (29) | 55 | 19/13 | 10 | 2,5 | mid | 12..52 / 36..50 | +12 px f0–7 | 0/−6 | 77,5 | spécial |
| chainHigh | L, L, → + H | Plongé | 13/3/15 (31) | 55 | 18/11 | 10 | 3 | **overhead** | 12..42 / 36..70 | +12 px f0–7 | +1/−6 | 67,5 | spécial ; **Rebond** une fois par combo |
| chainLaunch | L, L, ← + H | Chandelle glissée | 7/4/17 (28) | 55 | lance (8, 4 points)/14 | 10 | 3 | mid | 4..32 / 58..104 | +12 px f0–5 | lance/−6 | 57,5 (rate l'accroupi) | spécial |
| forwardHeavy | → + H | Fouetté plongeant | 18/3/15 (36) | 65 | 18/13 | 11 | 3 | **overhead** | 12..44 / 36..70 | +10 px f6–13 | +1/−4 | 67,5 | — |
| backHeavy | ← + H | Chandelle | 7/4/17 (28) | 60 | lance (8, 4 points)/14 | 11 | 3 | mid | 4..32 / 58..104 | — | lance/−6 | 45,5 (rate l'accroupi) | spécial |
| crouchLight | ↓ + L | Coup de pied bas | 5/2/9 (16) | 24 | 12/8 | 7 | 2,5 | low | 10..40 / 2..14 | — | +2/−2 | 53,5 | normal, spécial |
| crouchHeavy | ↓ + H | Fauche | 9/3/20 (32) | 70 | KD trip (2)/14 | 12 | 3,5 | low | 12..52 / 2..14 | — | KD/−8 | 65,5 | — |
| jumpLight | air L | Pointe sautée | 4/6/6 | 28 | 14/10 | 7 | 2 | overhead | 4..32 / 8..24 | — | — | 45,5 | — |
| jumpHeavy | air H | Chassé sauté | 7/5/10 | 68 | 18/12 | 11 | 3 | overhead | 4..40 / −2..18 | — | — | 53,5 | — |
| special | S, ↓↘→ | **Syncope** | 12/3/22 (37) | 70 (10) | 24/14 | 12 | 3 | mid | 14..58 / 34..48 | **+28 px f2–9, puis −28 px f16–29** | 0/−10 au contact, puis elle recule | **99,5** | — |
| specialForward | → + S | **Rubato** | 16/4/18 (38) | 80 (12) | KD (3)/12 | 13 | 3,5 | mid | 12..54 / 36..52 | +36 px f4–15 | KD/−9 | **103,5** | — |
| specialAntiAir | ↓ + S, →↓↘ | **Contre-ut** | 5/6/24 (35) | 90 (13) | KD (3)/12 | 14 | 3 | mid | 2..28 / 36..106 | — | KD/−17 | 41,5 | — ; **sans invincibilité** |

**Prise et déplacements** (au format de combat-v2 §10.3)

| Id | Saphir |
|---|---|
| `grab` | 5/3/20 (28), 6..30 / 20..58, portée 43,5 |
| `pummel` | **Paume** 5/1/8 (14), 10 fixes, gel 5 |
| `throwForward` | **Croc-en-jambe** 10/1/22 (33), 80, KD (3 ; vx 2,5) : retombe tout près (≈ 58 px, estimation) |
| `throwBack` | **Valse** 14/1/26 (41), 85, côté changé f6, KD (3,5 ; vx 3) |
| `dashForward` | **Fente** 18 tics, 48 px f1–13 |
| `dashBack` | **Esquive** 18 tics, 52 px f1–14, anti-prise f0–10 |

**Les bornes, vérifiées** : aucune frappe hors Boost au-dessus de 127 ; le gel sur la loi `5 + ⌊dégâts/10⌋ ± 3` partout ; aucun normal au-dessus de +4 en garde (son coup le plus rapide démarre en 5, règle 8) ; `throwBack` à 14, côté changé à f6 ; `knockdownFrames` à 40 ; pushbox debout de 26 px ; `crouching` sur les deux coups bas ; prise sous une barre (`boostProblems` vide).

## 5. Les enchaînements

**Son style** : « Un pas, une touche, dehors. » Ses phrases sont courtes, de 3 à 5 coups, et finissent souvent debout et loin : la Syncope ressort au lieu de coucher l'adversaire. Elle préfère toucher deux fois et partir que tout miser sur un combo.

**Ses cordes** (au format de combos-v3 §4)

| Coup | Suites |
|---|---|
| Pointe (L) | L (neutre, →, ←) : Fouetté ; le reste par `cancelInto` (Coup de pied bas, Pas glissé, spéciaux) |
| Fouetté (L, L) | L (toute direction) : Revers tournant ; H : Chassé ; → + H : **Plongé** ; ↓ + H : Fauche ; ← + H : **Chandelle glissée** |
| Chassé (H) | H (neutre, →) : **Chassé arrière** ; ↓ + H : Fauche ; ← + H : Chandelle ; coût de jongle 2 |
| Pas glissé (→ + L) | L (neutre, →, ←) : Fouetté |

Son prolongateur est le **Rebond**, sur le Plongé. L, L, L passe sans trou partout où la Pointe touche : jusqu'à 54 px sur Nayo et 55,5 sur Riff, debout (mesuré par demi-pixel ; la garantie accroupie se vérifie en 1b).

**Routes mesurées dans le moteur**, sur Nayo (1000 PV) ; distance de départ entre parenthèses

- **Sans jauge** (10 à 21 %)
  - L, L, L (40 px) : 28 + 31 + 40 = **99**, au sol
  - L, H → S (40 px) : 28 + 67 + 56 = **151**, debout, elle ressort
  - ↓L, ↓L, H → S (36 px) : 24 + 21 + 60 + 49 = **154**
  - L, L, → + H (Plongé) → S (40 px) : 28 + 31 + 44 + 49 = **152**
  - ← + H → ↓S (30 px) : 60 + 81 = **141**, au sol
  - L, L, ← + H ⇢ L, L, L (36 px) : 28 + 31 + 44 + 19 + 21 + 25 = **168**, au sol
  - H (Chassé) → S, au bout du Chassé (70 px) : 75 + 63 = **138**
  - L, L, H, H → S (40 px) : 28 + 31 + 60 + 38 + 42 = **199**
  - L, L, H, H → → + S (Rubato) (40 px) : 28 + 31 + 60 + 38 + 48 = **205**, au sol
- **1 barre** : L, L, H → DASH (Reprise) → L, L, H, H → S (40 px) : 28 + 31 + 60 + 19 + 21 + 37 + 27 + 35 = **258**
- **3 barres** : L, L, H, H → ← + BOOST (Coda) (40 px) : 28 + 31 + 60 + 38 + 42 + 40 + 65 = **304** ; la Coda seule : 70 + 72 + 104 = **246**

Sur Riff (900 PV), les mêmes routes font les mêmes dégâts, de 11 à 23 % sans jauge. Le contraste avec Nayo (18 à 31 %) et Riff (9 à 22 %) : moins de dégâts par combo que Nayo, autant que Riff, mais en touchant de plus loin.

**Les 7 lignes de l'aide** (`src/data/texts/saphir.ts`, porte 1b)
1. L, L, L : Pointe, Fouetté, puis le Revers tournant met au sol.
2. L, H, puis S : la Syncope touche et ressort aussitôt.
3. L, L, H, H, puis avant + S : le Rubato met au sol.
4. Bas + L, bas + L, H, puis S : par le bas, puis dehors.
5. L, L, arrière + H, puis L, L, L sur le corps en l'air.
6. L, L, H, H, puis arrière + BOOST (3 barres) : la Coda.
7. La même, puis arrière + BOOST (FINISH allumé) : son Finisher, Face B.

## 6. Le Boost et la super

Son mot de Remix : **forte** (la nuance musicale). Les Remix gardent le timing exact de leur spécial (D18), leurs effets passent en blanc platine.

| Entrée | Nom | Ce qui change | Ce qu'elle s'achète |
|---|---|---|---|
| BOOST | **Syncope forte** | 85 dégâts, met au sol (2,5 ; 3), blockstun 18 (−6 au contact) | une Syncope qui couche |
| → + BOOST | **Rubato forte** | 95 dégâts, **invincible de f3 à f12** | **traverser le Vinyle** et un coup de loin ; pas un reversal (vulnérable de f0 à f2) |
| ↓ + BOOST | **Contre-ut forte** | 115 dégâts, invincible aux attaques aériennes de f0 à f8, lance (5 ; 1 ; 2 points) | un anti-air sûr |
| DASH après le contact | **Reprise** (son Rewind) | un pas de 24 px en 12 tics, annulable dès f3, 1 barre | reprendre la phrase |
| ← + BOOST | **Coda** (sa super) | voir ci-dessous | — |

**La Coda** : **une fin de combo**, sans invincibilité.
- 10/14/24 (48). Flash à f8, 20 tics (2 tics avant la 1re frappe).
- Trois frappes : un coup de pied bas à f10 (70), un fouetté à f16 (80), un revers tournant à f22 (130), qui met au sol (5 ; 2,5). Chaque frappe tient le corps jusqu'à la suivante (hitstun 22, écart 6).
- Elle avance de 24 px de f2 à f11, ne recule jamais : `everyBlowLands` reste dans son hypothèse.
- **Portée mesurée** : les trois frappes touchent jusqu'à 86 px de centre à centre, sur Nayo comme sur Riff (la Mégabasse : 74, le Slam : 88). −23 en garde.
- Seule : 246 (la Mégabasse fait 264, le Slam 273). Sur Riff à 30 % (270 PV), la Coda laisse 24 PV ; le Finisher tue sur la dernière frappe.
- Tampons : « REPRISE ! » (9 signes) et « CODA ! » (6), sous « DÉGAGEMENT ! » (12) ; la mesure en surface se fait à la porte 1b (`flash-areas.test.ts`).

## 7. Le Finisher : « Face B »

*Au format de `docs/finisher.md` §2 et §3. Il n'a aucune donnée à lui : c'est la Coda lancée armée.*

### 7.1 Le fantasme
> Trois pas de swing. DOU. BI. DOUM. Le disque s'arrête net. Un temps de silence. Puis elle le retourne, et toute la salle danse sur la face B.

### 7.2 Pourquoi c'est elle
- **Ce qu'elle veut** (histoire) : « Passer la face B. Que, pour une fois, toute une salle danse sur l'autre côté du disque. » Le Finisher le fait à la lettre.
- **Le swing** : la reprise tombe sur le temps court, à contretemps : la trame `'hold'`, celle de Riff, lui va sans code neuf.
- **Le masque** : deux profils, deux faces, comme le disque. Elle s'incline pendant la carte ; le profil du dos regarde la salle.
- **Son rôle** : la Coda reste une fin de combo, sans invincibilité. Saphir n'a toujours pas de reversal.

### 7.3 Storyboard (t0 = l'image du KO, sur la 3e frappe)

| t | Moment | Elle | La victime | Caméra et VFX | Son |
|---|---|---|---|---|---|
| verrou | les deux premières frappes | coup de pied bas, fouetté [R : planche de la super] | encaisse [R] | tampons « DOU », « BI » ; zoom qui part sur le KO (`zoomFrom: 'ko'`) | les frappes |
| t0 | DOUM | le revers tournant [R] | décolle [R] | tampon « DOUM » ; aplat vert sombre derrière | l'impact |
| t0 → t0 + 45 | le silence | **image tenue** (`'hold'`) | **image tenue** | gros plan ×2,0 ; aucun flash | coupé net (`hush`) : un disque qui s'arrête |
| t0 + 45 (R) | la reprise, sur le temps court | petit saut de swing [R : ses clips de saut et d'atterrissage, comme le rebond de Riff] | retombe [R] | le seul éclat, les jauges et la barre du perdant éclatent ; la foule danse (`crowd`) | la musique revient : face B |
| R → R + 30 | la suite | retour en garde [R] | au sol [R] | caméra de ×2,0 à ×1,0 | — |
| R + 30 | la carte | elle s'incline (pose de victoire) [R] | — | carte « FACE B. », en néon | — |
| après | la victoire | `victory` [R] | — | — | — |

Toutes les poses sont réutilisées [R] : aucune pose neuve n'est demandée pour le Finisher (la pose `finale` reste hors v1).

### 7.4 à 7.10, en bref
- **Caméra** : celle du contrat commun (`finisher.md` §1.14) ; Saphir reste sous 96 px au gros plan (la super et la victoire sont mesurées à la porte 2 ; sa garde fait 74 px, mesurée au squelette).
- **Fond** : un aplat vert sombre par tenue, sous ΔL 0,06 contre le ciel et le sol (proposition : `0x0f3a26` et `0x2a1e46`, à mesurer par `finisher-flashes.test.ts`).
- **VFX et palette** : son vert, le platine du Boost ; aucun rouge saturé ; au plus 3 flashs comptés.
- **Typographie** : tampons « DOU », « BI », « DOUM » (`count`) ; carte « FACE B. » (`'neon'`), aucune carte propre à un rival (`rival: null`).
- **Couches sonores** : sons existants seulement en v1 (`src/audio/sfx.ts`) ; plus tard, une contrebasse qui marche et le craquement d'un disque qu'on retourne.
- **Note de sirène** : **ré, 294 Hz** (quinte : la, 440 Hz), ni 262, 330, 392 ou 494.
- **Durées** : celles de la trame `'hold'` (reprise à t0 + 45, carte à R + 30, version courte comme celle de Riff).
- **Coût** : aucun code de rendu. Le `FinisherScript` en données : `silence: 'hold'`, `zoomFrom: 'ko'`, `count: ['DOU', 'BI', 'DOUM']`, `shake: 'x'`, `crowd: true`, `cone`, `needle`, `shards` et `powerCut` à `false`, `flatLeaves: 'release'`, `card: { text: 'FACE B.', rival: null, style: 'neon' }`. La session principale le relit et le branche (PR E et F).

## 8. Les couleurs

Mesurées avec `hue` (`tests/render/hit-styles.test.ts`), `relativeLuminance` et `redRatio` (`src/render/luminance.ts`), et une simulation de Machado (2009, sévérité 1, RVB linéaire) qui redonne les chiffres du cahier (jaune de la vie : 0,633 en deutéranopie, 0,562 en protanopie).

| | Tenue 1 | Tenue 2 |
|---|---|---|
| Masse | ivoire `#ECE8DE` (la tenue de scène) | noir `#121216` (la même, inversée) |
| Énergie, et HUD | vert `#20B464` | lilas `#C0A0FF` |
| Teinte | 148° | 260° |
| Écart au cyan 187° / magentas 319°, 329° / or 43° / jaune 46° / oranges 28°, 35° | 39° / 171°, 179° / 105° / 102° / 120°, 113° | 73° / 59°, 69° / 143° / 146° / 128°, 135° |
| Luminance / rapport de rouge | 0,339 / 0,024 | 0,436 / 0,281 |
| Deutéranopie | `#A4996A`, 0,317 | `#8DB0FC`, 0,437 |
| Protanopie | `#B4A45E`, 0,371 | `#88B0FF`, 0,435 |

- Le HUD est à 102° (tenue 1) et 146° (tenue 2) du jaune de la vie : bien plus que 20°.
- En simulation, le vert tombe à 0,32 et 0,37, loin du jaune simulé (0,63 et 0,56) : séparé par la valeur.
- La tenue 2 tranche sur la tenue 1 (masse noire contre ivoire, lilas contre vert), n'est ni cyan, ni magenta, ni platine, et se détache de la nuit violette par la valeur (0,44 contre 0,01). **À regarder en jeu** : le lilas sur les néons violets du stage.
- **Les matières** (palette par matériau, figée à la porte 2) : peau brun chaud (au cou seulement) ; cheveux noirs ; laque du masque (saphir, dans les deux tenues) ; drap de la tenue (ivoire, tenue 2 noir) ; ondes de l'op-art (noir, tenue 2 ivoire) ; cuir noir des gants et des chaussures ; cuir blanc des chaussures bicolores ; semelles. Puis la peinture du masque (la fente, les larmes), puis les détails d'effets, puis les 5 du platine.
- **Les effets** (`hit-styles.ts`, PR E) : forme `slash`, énergie verte, couleur de frappe crème (`#F0E2BC`, l'ivoire frappé, à mesurer contre le platine à la porte 3) ; le triplet est unique dans le roster. Étincelles en croix (`'cross'`).

## 9. La fiche de design

- **Silhouette** : 74 × 37 px en garde, mesurée au squelette à la porte 2 (82 × 43 avec le chapeau, sur la planche de la porte 0). Sous 85 px : la prise tombe dans les fourchettes sans rien plier.
- **Corps** (`Body`) : de profil (écarts d'épaules et de hanches positifs, comme Nayo) ; jambes longues pour sa taille ; buste droit ; épaules étroites.
- **La garde** (`GUARD`) : droite, de profil ; talon avant levé, le poids sur la jambe arrière ; poings hauts et souples, le bras avant plus loin ; le buste droit, la tête au-dessus du dos et non devant (le retour du propriétaire à la porte 2 : pas de dos voûté). Elle raconte l'archétype : prête à partir en arrière autant qu'en avant.
- **La tête** : dessinée de zéro (aucune source Zen-Tazzer) : le masque plein, un profil sculpté devant (arcade, fente de l'œil, nez, lèvres closes, une larme peinte), un autre derrière, éclairé à contre-jour ; une couture du sommet à la mâchoire ; la queue de cheval haute, qui dégage le profil du dos.
- **Le visage**, 8 expressions, sur un masque qui ne bouge pas : `effort` allume la fente de l'œil de son énergie, `kiai` l'embrase (au pic d'un spécial seulement) ; `focus`, `smirk`, `cool`, `hurt`, `out` et `tired` montrent le masque tel quel. On ne sait jamais ce qu'elle ressent.
- **Le détail signature** : le masque de Janus. Rigide, il suit la tête : aucun ressort. Sur les tours (Revers tournant, Valse), un profil passe, puis l'autre : on ne sait plus dans quel sens elle regarde.
- **Son mouvement** : la garde sautille à peine sur la pointe, en swing (le temps long, puis le court) ; la marche glisse ; le saut avant se fait jambes groupées, en ciseau ; les ondes du pantalon suivent ses jambes.
- **Le son et le temps** : la syncope, le swing ; thème « chaud, qui swingue ». Aucun son à elle en v1 : une proposition pour plus tard (contrebasse, cuivres, craquement de 78 tours).
- **Les 3 coups signatures**, animés à la porte 2 et retouchés à la porte 4 : **Syncope** (S), **Chassé** (H), **Contre-ut** (↓ + S). Chacun a un membre actif clair : une jambe tendue.
- **Les retours passés du propriétaire** (D25 à D27) : les coups de pied hauts restent dans les limites d'anatomie, sans exception ; aucun bras tiré en arrière et plié.

## 10. La liste de coupes

Si le temps manque, dans cet ordre :
1. le Rebond du Plongé (le Plongé reste un overhead de corde) ;
2. le Pas glissé (`forwardLight` retombe sur la Pointe) ;
3. le profil sculpté du dos (un masque simple, une seule face) ;
4. la Chandelle glissée (la Chandelle seule) ;
5. une 2e expression de `focus` en garde.

## 11. Les risques

- **La Syncope trop forte contre le CPU** : elle ressort hors de sa portée de punition. À mesurer en boîte grise ; la réponse est dans les plans du CPU (session principale), ou dans ses chiffres (plus de récupération), à la porte 1b.
- **La pente contre Nayo** repose sur l'échange de normaux, que le CPU joue beaucoup ; entre humains, le Vinyle pèse plus. Estimation.
- **Les hurtbox provisoires** : un coup de pied tendu expose la jambe. Mesurées sur le dessin aux portes 2 et 3, elles peuvent raccourcir sa portée utile.
- **L'op-art en mouvement** : des bandes contrastées qui bougent peuvent fatiguer l'œil. Elles restent larges et peu nombreuses ; à regarder en jeu, sur un téléphone.
- **Les coups de pied hauts** et l'anatomie (D25).
- **L'ivoire de la tenue 1** est clair : ses éclats de frappe crème sont à mesurer contre le platine (porte 3).
- **Le tailleur** : la première allure, en costume à débloquer plus tard. Une coupe à part redessine chaque coup : hors v1.

**Estimation** : 9 jours-agent pour les portes 1a à 4. Côté session principale, environ 1,5 jour : les plans du CPU (l'espacement, la Syncope), l'équilibrage, le Finisher branché en données ; ni cœur, ni planche de victime.

## 12. Décision proposée pour le journal

D34 (à confirmer) : le 3e combattant de Sound Clash est **Saphir**, une contreuse de mi-distance (savate), en données seules : la plus longue portée immobile et la meilleure marche arrière du casting, une Syncope qui touche et ressort, ni reversal ni projectile. Son histoire est indépendante de celles de Nayo et de Riff. Origine : porte 0 du cahier `docs/art/perso-3.md`, choix du propriétaire. Pourquoi : un archétype neuf, qui ferme le triangle des matchs (Saphir bat Nayo, Riff bat Saphir, Nayo bat Riff).
