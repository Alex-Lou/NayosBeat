# Watt : un arsenal à lui

*Casquette : game design. Écrite le 3 novembre 2026, validée le jour même par le propriétaire avec les quatre hypothèses du §9 (« Envoie, commence »).*

---

## 0. La demande

Ses mots : « Watt est d'une pauvreté de coups et de style… il faut un vrai arsenal de combos, de coups, de dash et de S juste à lui. »

Ses choix :
- **les mécaniques** : la super-armure, une jauge de tension et un câble tiré ;
- **les nouveaux S** : S près (Branchement), ← + S (le câble), S en l'air (le plongeon) et ↓ + S (le Plafonnier saisi) ;
- **le dash** : le Pas blindé ;
- **la méthode** : cette fiche, puis un prototype jouable en boîte grise, puis le dessin.

## 1. Le constat

Les quatre combattants ont **la même grille**, imposée par le moteur : 15 coups, 3 spéciaux (S, → + S, ↓ + S), un dash avant, un dash arrière et environ 8 enchaînements. Seuls les chiffres changent.

Ce qui n'existe chez personne :
- une armure ;
- une prise de commande ;
- un S en l'air, un ← + S ;
- une ressource propre à un combattant ;
- un dash qui ait une propriété à lui.

Pour un lutteur, c'est là que vit le style. Watt aujourd'hui, c'est un Nayo lent avec une longue prise.

## 2. Le fantasme : « il ne recule pas »

Le roadie qui avance malgré les coups, qui tire le câble pour ramener ce qui s'éloigne, qui charge son exosquelette à chaque choc, puis qui **branche** : il soulève, fait un tour complet et plante.

On doit le reconnaître à trois choses :
1. il **encaisse** sans broncher (l'armure) ;
2. il **ramène** au contact (le câble) ;
3. son **VU-mètre monte** jusqu'à la décharge (la tension).

## 3. Les mécaniques propres

### 3.1 La super-armure

- **Ce qu'elle fait** : pendant une fenêtre de certains coups, elle absorbe **un** coup.
  - Watt ne prend que la moitié des dégâts, sans être étourdi : son geste continue.
  - Le gel s'applique aux deux combattants, comme sur un contact.
- **Ce qu'elle absorbe** : les frappes et les projectiles. Le Vinyle de Nayo ne l'arrête plus.
- **Ce qui la bat** :
  - les **prises** et les lancers ;
  - un **deuxième coup** dans la même fenêtre ;
  - les coups du Boost à plusieurs frappes (Remix, super), qui comptent pour deux.
- **Les coups qui la portent** :

| Coup | Fenêtre d'armure |
|---|---|
| Pas blindé (dash avant) | f3 à f14 |
| Surcharge (→ + S) | f3 à f14 |
| Coup de pilon (→ + H) | f8 à f21 |

- **Le signal** : son exosquelette s'allume en vert VU pendant la fenêtre, et un « clang » métallique sonne à l'absorption. Le signal ne compte pas comme un flash : c'est une petite surface.

### 3.2 La jauge de tension (son VU-mètre)

- **Une ressource à lui**, de 0 à 100, à côté du Boost, qui reste commun à tous.
  - Elle est **lue sur son dessin** : les LED de VU-mètre de ses avant-bras montent.
  - Le HUD en montre un rappel discret, sous sa jauge de Boost.
- **Ce qui la remplit** :

| Événement | Tension |
|---|---|
| prise réussie (Prise ou Branchement) | +30 |
| coup absorbé par l'armure | +20 |
| coup reçu | +10 |
| Serrage | +5 |

- **Ce qui la vide** :
  - elle perd 1 point tous les 8 tics hors du contact ;
  - elle repart à 0 au début du round.
- **Pleine (100)** : son prochain spécial est **électrifié**, puis la tension retombe à 0.

| Spécial électrifié | Effet |
|---|---|
| Coup de jus | +25 % de dégâts, et il se pare à −4 au lieu de −12 |
| Surcharge | +25 % de dégâts, armure sur toute la course |
| Câble | l'adversaire ramené est étourdi assez longtemps pour une combo garantie |
| Branchement | +25 % de dégâts, et l'adversaire reste au sol plus longtemps |

### 3.3 Le câble tiré

Ses détails sont au §4.2. Il est sa **réponse aux zoneurs** : aujourd'hui, Watt ne gagne que 1 % de ses matchs contre Nayo (CPU contre CPU). Le câble ramène au contact, l'armure traverse le Vinyle.

## 4. Les nouveaux S

Les entrées restent **une direction et un bouton**, comme tout le jeu. Les mouvements classiques (↓↘→, →↓↘) gardent leur sens.

### 4.1 S près : **Branchement** (prise de commande)

- **L'entrée** : S quand l'adversaire est à **40 px ou moins**, de centre à centre. Plus loin, S reste le **Coup de jus**.
- **Le geste** : il saisit des deux pinces, soulève au-dessus de sa tête, fait un tour complet sur lui-même et plante l'adversaire au sol.
- **Les chiffres proposés** :
  - 5 tics de démarrage, 2 actifs ;
  - 40 tics de récupération s'il rate ;
  - **140 de dégâts**, le coup le plus lourd du jeu hors Boost (Déchargement : 120).
- **Ce qu'il ne fait pas** :
  - il **ne se dégage pas**, contrairement à la Prise ;
  - il ne prend ni un adversaire en l'air, ni un adversaire étourdi.
- **Sa réponse** :
  - sauter ;
  - un coup de 4 tics (Paume, jab) qui sort avant lui ;
  - ou le punir de 40 tics quand il rate.
- **La borne** : 140 dépasse celle des lancers (§5.2 de `watt.md`). C'est une exception écrite, pour le Branchement seul (§9).

### 4.2 ← + S : **le câble**

- **Le geste** : le câble de l'exosquelette part droit devant lui et accroche.
- **Les chiffres proposés** :
  - 14 tics de démarrage ;
  - une portée de 30 à 110 px ;
  - 28 tics de récupération (il se pare à −10, il rate à −20).
- **S'il touche** : l'adversaire est ramené à 34 px devant lui. Watt garde **+4** : l'adversaire doit deviner (Branchement, Prise ou Marteau). Électrifié, c'est une combo garantie.
- **Contre les projectiles** : le câble est coupé par un projectile, sans victoire gratuite. C'est l'armure du Pas blindé qui passe à travers.

### 4.3 S en l'air : **le plongeon**

- **Le geste** : il se laisse tomber de tout son poids sur l'adversaire au sol, l'attrape et l'écrase. C'est une prise aérienne.
- **Les chiffres proposés** :
  - il attrape un adversaire au sol jusqu'à 30 px de son point de chute ;
  - **100 de dégâts** ;
  - s'il rate, 18 tics de récupération à l'atterrissage.
- **Sa réponse** : un anti-air le bat, comme tout saut.

### 4.4 ↓ + S : **le Plafonnier saisi**

- **Ce qui change** : le coup devient une **prise en l'air**. Il cueille le sauteur, puis le plaque au sol. C'est une saisie, plus un simple coup.
- **Ce qui ne change pas** : l'invincibilité aux coups aériens de f0 à f9.
- **Les chiffres proposés** : 110 de dégâts (contre 95 aujourd'hui), la même boîte et les mêmes 26 tics de récupération.
- **Le Boost** : le Plafonnier survolté (↓ + BOOST) reste tel quel.

## 5. Le Pas blindé (son dash)

- **Le geste** : un pas lourd, épaules devant, qui **encaisse un coup** de f3 à f14 (§3.1).
- **Les chiffres** : 20 tics et 36 px, comme l'Avancée d'aujourd'hui.
- **Sa faiblesse** : une prise le bat.
- **Le dash arrière** : il ne change pas (Recul, 32 px), et il reste sa faiblesse.

## 6. Le style en combos (des routes à mesurer dans le moteur)

- **Le rôdeur de contact** : Pas blindé à travers le Vinyle, puis Prise ou Branchement.
- **Le câble** : ← + S, ramené à +4, puis Branchement (140), Prise, ou L, L, H si l'adversaire garde.
- **Électrifié** : ← + S, puis L, L, H, puis S. Une vraie combo, garantie.
- **Le plongeon** : saut, puis S sur un adversaire qui se relève ou qui garde bas.
- **Le contre** : Coup de pilon armé à travers un coup, puis H, H.
- Les routes actuelles restent : L, L, L ; L, L, H, puis S ; Soulevé puis Plafonnier ; Plein feu.

## 7. Le moteur : ce qui change, et où

Topologie : l'état vit dans `FighterState` (le cœur), le retour d'info passe par les événements (son, effets, HUD), et le timing reste tic par tic, déterministe.

| Où | Ce qui change |
|---|---|
| `src/core/move-data.ts` | de nouveaux coups optionnels : `specialClose` (Branchement), `specialBack` (le câble), `jumpSpecial` (le plongeon). De nouvelles propriétés : `armor`, et une prise de commande (`kind: 'commandThrow'`, ou une prise qui mène directement à un lancer) |
| `src/core/moves.ts` | S lit la distance (près ou loin), ← + S donne `specialBack`, S en l'air donne `jumpSpecial`. Seulement pour un combattant qui a ces coups |
| `src/core/combat.ts` | l'absorption de l'armure ; le câble, un projectile qui ramène |
| `src/core/state.ts` | `tension`, et les coups absorbés pendant le coup en cours |
| HUD et rendu | le rappel de la tension ; l'exosquelette allumé pendant l'armure ; les LED qui montent |
| `src/ai` | les plans du CPU de Watt, réécrits. Le CPU commun apprend l'armure, et à ne pas taper dans un Pas blindé |
| Les dessins | environ 10 nouvelles planches : le câble, le Branchement (tenant et tenu), le plongeon, le Plafonnier saisi (la paire), l'armure et la tension en effets |

**Ce qui ne change pas** :
- les données et le gameplay de Nayo, Riff et Saphir ;
- leurs boîtes ;
- le budget de flashs ;
- les entrées des autres.

**Les replays dorés** : ils ne bougent pas. L'armure dépensée est un bit de `flags`, et la tension, un nouveau champ, n'entre dans le hachage que lorsqu'elle n'est pas nulle. Un combat qui ne s'en sert pas garde donc exactement son hachage, et les 31 replays prouvent que rien n'a changé.

**La coordination** : `src/core` est partagé. La session principale sera prévenue à chaque étape.

## 8. Les phases (chacune finit sur quelque chose de jouable ou de vérifiable)

1. **Moteur, sans changement de jeu** : les nouveaux emplacements et propriétés existent, mais personne ne s'en sert. Les replays sont identiques, hors hachage.
2. **Watt en boîte grise, jouable** :
   - l'armure, la tension, le câble, le Branchement, le plongeon, le Plafonnier saisi et le Pas blindé ;
   - les chiffres mesurés, les combos testées, et une page d'essai privée pour que le propriétaire y joue.
3. **Son CPU et l'équilibrage**, mesurés contre les trois autres.
4. **Le dessin et les effets** des nouveaux coups, au niveau du polish validé sur Nayo.
5. **Le branchement en ligne.**

## 9. Les décisions (validées le 3 novembre 2026)

1. Le **Branchement à 140** : une exception à la borne des lancers, pour lui seul.
2. L'**armure absorbe aussi les projectiles** : c'est sa réponse aux zoneurs.
3. La **tension se vide hors du contact**, lentement, pour qu'il reste agressif.
4. Le **câble est coupé par un projectile**, pour que Nayo garde une réponse.

## 10. Les risques

- **Le temps** : c'est le plus gros chantier depuis le combat v2. La phase 2 seule est un vrai lot, et il faut couper si ça s'étire. Ma liste de coupes, dans l'ordre : d'abord le plongeon, puis la tension électrifiée, dont je garderais seulement la jauge visuelle.
- **L'équilibre** : l'armure est forte contre Riff (rushdown). La deuxième frappe qui la brise et la prise qui la bat doivent rester évidentes.
- **La lisibilité** : l'armure doit se voir avant d'être frappée (l'exosquelette qui s'allume), sinon elle paraît injuste.
- **La propriété intellectuelle** : des archétypes de lutteur (armure, prise de commande, grappin), sans aucun coup, nom ni pose repris d'un jeu existant.
