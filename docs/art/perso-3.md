# Le 3e combattant de Sound Clash — cahier des charges

*Pour l'agent design, la session qui a construit le créateur de sprites et l'extension Aseprite (`tools/sprites/drawn.ts`, `tools/sprites/templates.ts`, `tools/aseprite/`, `docs/art/aseprite.md`). Aussi pour la session principale, qui intègre. Base : `origin/main` à `ed9e1d4` (F1 #67, lot 13 #68 et la PR 5 du Finisher #70 compris), ou plus récent. Ce cahier est fusionné sur `main` avant que l'agent commence : il le lit sur `origin/main`, jamais sur une copie locale. Chaque règle donne son fichier et le test qui la tient. Ce qui est une estimation est marqué comme tel.*

Légende :
- **compile** : `npm run typecheck` casse ;
- **test** : un test Vitest rougit ;
- **silencieux** : rien ne casse, mais le 3e n'est ni dessiné, ni testé, ni joué comme il faut.

Mots du dépôt :
- un **tic** dure 1/60 s : le cœur tourne à 60 tics par seconde ;
- la **frame data** d'un coup donne démarrage / actif / récupération, en tics ;
- la **hitbox** est la zone où le coup frappe, la **hurtbox** celle où le corps se fait toucher, la **pushbox** la place que le corps prend ;
- un **px du monde** est un pixel de la vue 480 × 270. Une planche dessine 2 px par px du monde ;
- une **planche** est une rangée d'images. Un **clip** dit comment la jouer : quelles images, combien de tics chacune, où elle boucle ;
- `<perso>` est l'id du 3e, en minuscules ASCII. Il nomme les dossiers, les textures et la constante générée `<PERSO>_CELLS`.

---

## 0. En bref

1. Le propriétaire veut un 3e combattant de Sound Clash, complet, sur L'Entrepôt, avec un **archétype neuf**.
2. **On commence par 3 concepts sur papier, la porte 0**, avec une planche de silhouettes à l'échelle à côté de Nayo et de Riff. Le propriétaire choisit. **Rien n'est produit avant.**
3. Un combattant est **une donnée** : un `FighterTemplate` (`src/core/config.ts`), validé au début de chaque match. Le cœur (`src/core`) ne connaît aucun nom de perso, et n'a pas à changer. Un concept qui demande du cœur coûte une décision et une PR de la session principale (§4.3.5).
4. **29 ids de coups, ni plus ni moins** : 15 obligatoires et 14 optionnels (`src/core/move-data.ts`). L'archétype s'exprime dans ces ids.
5. **La boîte grise avant l'art.** Les données se jouent et se valident en boîtes, avant la première pose, parce que les planches suivent leurs durées (charte, priorité 1).
6. L'art se construit **dans le générateur**, comme Riff : squelette, cinématique inverse, poses en code, deux tenues, anatomie mesurée, boîtes mesurées. Puis la garde, le portrait et les coups signatures sont **retouchés à la main**, en dernier.
7. **Le vert, d'environ 95° à 150° de teinte, est la seule grande teinte libre** pour l'énergie (§4.7).
8. **Cinq portes**, de 0 à 4. On n'en passe aucune sans le « oui » du propriétaire (§5).
9. L'agent livre en **PR brouillon**, rebasées et vertes. Il ne fusionne jamais. La session principale relit, intègre, fusionne et publie (D30, §6).
10. **Le piège principal est silencieux.** Une trentaine de listes, dans les tests et les outils, écrivent « Nayo, Riff » en dur. Si on en oublie une, rien ne casse, et le 3e n'est simplement pas testé (§7). Deux outils font pire : nommé, le 3e inconnu y sort en vert sans rien lire (`sprites:anatomy`, `measure-boxes`, §4.9).

---

## 1. La demande et les choix du propriétaire

**La demande** : un document d'information et un prompt pour l'agent design, pour qu'il commence le prochain personnage. Il la résume ainsi : « Histoire. Coups, couleurs, design, enchaînements, animations etc. etc., tout parfait. »

**Ses choix, déjà pris** :
1. **Un 3e combattant de Sound Clash**, sur le stage existant, avec un **archétype nouveau**. Ce n'est ni un boxeur polyvalent comme Nayo, ni un rushdown comme Riff : par exemple un lutteur-colosse, un zoner ou un piégeur. L'agent propose d'abord **3 concepts**, et le propriétaire choisit avant toute production.
2. **Construit dans le générateur de sprites**, comme Nayo et Riff : squelette, cinématique inverse, poses, deux tenues, test d'anatomie, boîtes mesurées. Puis **les images clés** (garde, portrait, coups signatures) **retouchées à la main dans Aseprite**.
3. **L'agent fait le design, l'art et les données du perso** (`src/data/fighters/<perso>.ts`, le roster, les palettes, les effets), en **PR brouillon**. **La session principale fait l'intégration** : IA, aide, tests d'équilibrage, revue, mise en ligne (D30).

**Qui fait quoi**

| Qui | Fait | Ne fait pas |
|---|---|---|
| **Agent design** | concepts, histoire, identité, coups et frame data, enchaînements, Boost, super, Finisher sur papier, palettes, look, toutes les planches, boîtes mesurées, retouches à la main, entrée du roster ; ses PR brouillon, rebasées, vertes, avec le rapport | toucher au cœur ; fusionner ; pousser sur `main` ; lancer `npm run replays:update` ; passer une PR en « prête » ; écrire les plans du CPU, un son neuf ou une pièce de scène neuve |
| **Session principale** | revue adverse ; plans du CPU, aide relue, équilibrage (anti-infini, garantie du Finisher), scène du Finisher, sons ; fusion et publication (D30) ; journal des décisions ; `CLAUDE.md` | réécrire l'art sans le dire |
| **Propriétaire** | choisit le concept ; valide chaque porte ; tranche les questions du §8 | — |

**Ce que « tout parfait » veut dire ici** : chaque volet a sa règle, son test ou sa porte, et rien ne passe sans le « oui » du propriétaire. La liste du §9 dit quand c'est fini.

---

## 2. Sound Clash

### 2.1 Ce qui le fait

Sources : `docs/art/histoire.md`, `docs/art/univers.md` §1, `docs/combat-v2.md` §1.1, §8 et §12.

- **Un tournoi sans adresse.** « Personne ne donne l'adresse : on suit les basses, jamais deux fois au même endroit. » Deux sets, et entre les deux, on se bat. « Le gagnant garde la cabine jusqu'à l'aube. Le perdant rentre à pied. » (`histoire.md`, « Le tournoi »)
- **Le son est une arme.** « On ne l'écoute pas : on le prend dans le ventre. »
- **La foule choisit** (combat-v2 §8.1). Le Crossfader penche vers celui qui avance, frappe ou force l'autre à garder. Curseur à fond, le DROP tombe sur le temps fort suivant.
  - Le Crossfader **n'est pas codé** : c'est la phase 5.
  - Chaque perso aura **un thème** : celui de Nayo est « froid, une basse qui pèse », celui de Riff « sale, qui griffe ».
  - Chacun aura aussi **une couleur de meneur** pour les projecteurs (« Cyan. Magenta. Cyan. »).
- **120 BPM, toujours cosmétique.** Pilier 5 : « le gameplay ne demande **jamais** de jouer en rythme ». D17 l'a tranché. Un musicien qui « frappe en rythme » le fait dans l'animation, le thème et le Finisher, jamais dans une fenêtre de timing.
- **La ville** : du béton et des infrastructures, la nuit. La salle du Viaduc, la cave d'un disquaire fermé, le parking des Anges au niveau -3, une porte de fer, un monte-charge. Le 3e apporte **son** lieu, du même tissu : réel d'allure, inventé, nocturne.
- **L'homme de la cabine** est « une silhouette sans visage » dans toutes les scènes. C'est le mystère du monde : **il est hors limites**.
- **Le ton** : noir urbain, sobre, drôle par la chute.
  - L'émotion passe par un détail physique (« Le coin de sa bouche bouge. ») et par le silence.
  - Ils sont rivaux, pas ennemis.
  - Rien de cruel : le sang reste léger (`univers.md`, règles communes), et le Finisher n'inflige rien après la victoire (D24).
- **Les mots du système** : Remix, Rewind, MAX, FINISH, CONTRE, PUNITION et DROP. Aucun coup ne les prend. « Le mot "drop" appartient au Crossfader » (combat-v2 §18.3.5).

### 2.2 Nayo et Riff, l'un pour l'autre

Ils tiennent deux pôles opposés sur chaque axe. Un 3e prend une **troisième** case dans chaque ligne.

| Axe | Nayo, polyvalent | Riff, rushdown |
|---|---|---|
| Distance | « Lui veut la distance. » | « Elle veut le contact. » |
| Temps | sur les temps : « Il compte. » | à contretemps (scène 6) |
| Couleur d'énergie | cyan `#30E8FF` (tenue 2 : magenta `#FF4FC8`) | magenta `#FF3CA0` et argent (tenue 2 : or `#FFC83A` et cramoisi `#E0283C`) |
| Son | platines, vinyle, grosse caisse, scratch ; le casque, jamais porté en combat | enceinte de chantier qui crache, accord saturé, larsen, la chaîne qui claque |
| Ce qu'il veut | la cabine : « Savoir si une ville entière se tait quand il le décide. » | le bruit : « Que tout L'Entrepôt saute sur son temps à elle, une fois » |
| Parole | « Il parle peu. Au temps. Jamais deux fois. » | « Elle parle vite, trop, et rit au milieu de ses phrases. […] Elle tutoie les vigiles. » |
| Corps | athlétique, garde de boxeur, presque de profil | petite et vive, ginga de b-girl, de trois quarts |
| Garde mesurée (`idle` image 0) | 79 px de haut | 73 px |
| Combat | projectile (Vinyle), reversal invincible (Uppercut), frappe en ligne droite, jamais de dos (D8) | dash annulable, seule à toucher de dos, deux overheads, pas de reversal gratuit |
| Combo | « Peu de coups, chacun lourd » | « Riff rafale » |
| Super | un reversal (Mégabasse) | une fin de combo (Slam) |
| Finisher | Le Quatre | Larsen |
| Effets de coup (`hit-styles.ts`) | `slash` : croissants néon, gerbe or | `claw` : griffes, losanges argent |
| Dissolution (`dissolution.md`) | `rise` : les morceaux montent | `scatter` : ils s'éparpillent au sol |
| Lettrage (`direction-hud.md`) | tube néon cyan | lettres découpées magenta |

**Leur lien est le clash de l'an dernier** : la ranger de Riff a fait sauter l'aiguille de Nayo. « Un temps de silence. Dans un clash, c'est une éternité. » Ce duel est bouclé. **Le 3e ne le réécrit pas : il s'y ajoute.**

**La règle de lisibilité** (pilier 1, combat-v2 §1.1) : « Silhouette, couleur, son et nom racontent la même chose. »

### 2.3 Les places libres pour un 3e

- **L'archétype**
  - Le gabarit « un Polyvalent, un Rushdown par univers » (`univers.md`, ligne 3) est cassé par ce choix. La règle et son tableau sont à mettre à jour (PR A).
  - **Déjà promis** aux persos futurs (combat-v2 §6.5, §18.2) : l'armure (Kaï, « Blindage »), le rebond mural (Vexa), la parade qui riposte (Sora, « Paume sereine »), la téléportation (Kitsune).
  - **Libres** : le **lutteur sans armure**, qui prend le contact par la menace quand Riff le prend par la vitesse ; le **piégeur**, qui contrôle le terrain avec **ses propres** objets ; le **perso de postures**, s'il ne devient pas une parade.
  - **Interdits par les règles**, quel que soit l'archétype : la charge, le 360°, le demi-cercle et le quart de cercle arrière (combat-v2 §2.7, « Aucune autre manip » ; D6 pour le quart de cercle arrière ; pilier 4, « Une action = un appui ») ; l'air dash, le double saut, la course et la roulade (D19) ; toute interaction avec le décor (§12.1 : « Interactions de décor : **aucune** »). Un piégeur ne prend donc pas les enceintes du stage.
- **Le temps** : le demi-temps (le « un » de chaque mesure seulement), l'écho (ce qui frappe revient, plus faible), la syncope, le roulement. Toujours cosmétiques (D17) : l'écho et le roulement sont une image et un son, jamais une 2e frappe ; des frappes multiples hors super relèvent du cœur (§4.3.5). À éviter : « le silence choisi » (Nayo), « la boucle » (trop proche du Rewind), « rater un temps » (la carte de Riff).
- **Le son** : la voix (micro, mégaphone, beatbox) ; le poids du son (flight-cases, câbles, l'ingé son et sa console : faders, compresseur) ; les percussions de métal (bidons, tôles) ; les cuivres. Déjà pris : la sirène dub, signal FINISH de tous (`finisher.md` §1.2), et le frein du vinyle au KO. En v1, aucun perso n'a de son à lui : `SoundName` (`src/audio/sfx.ts`) ne contient que des sons communs (`lightHit`, `heavyHit`, `projectile`…). L'identité sonore du 3e est une proposition, pour plus tard.
- **La couleur** : le vert (§4.7).
- **Le corps** : massif, trapu ou âgé. Pas « longiligne », promis à Vexa. Aucun mineur.
- **Le registre de parole** : chaleureux, cérémonieux, showman, méticuleux. Pris : taiseux (Nayo, Sora), moqueur (Riff, Kitsune), insolent (Vexa), mâchoire serrée (Kaï). Une piste : un 3e qui **vouvoie** tout le monde, contre Riff qui tutoie les vigiles.
- **Le désir** : ni la cabine ni le bruit. Par exemple garder la porte, qu'on entende sa voix, reprendre ce qu'on lui a pris, finir la nuit.
- **Les accroches déjà dans le texte** (`histoire.md`) :
  - les vigiles qui chassaient Riff, et la porte qui « n'a pas tenu » ;
  - le Viaduc, où Nayo était « sparring-partner payé à l'heure » ;
  - les deux platines de la cave qui « prenaient la poussière » : à qui étaient-elles ?
  - les « Mille personnes » qui ont entendu le clash ;
  - « Le reste du tournoi est déjà rentré à pied. »
- **Ce qu'il ne faut pas contredire** : « Deux noms en finale. » Le 3e est autour de la finale, pas dedans. Le clash appartient à Nayo et Riff.

### 2.4 Les pièges

**Les doublons**
- « Portée, projectile en ligne droite, reversal invincible » : c'est Nayo. « Vitesse, dash, cross-up, mélanges » : c'est Riff.
- Toucher de dos en l'air : seule Riff le fait (D8).
- Un 2e lanceur de disque : Nayo garde « le seul projectile du duo » (combat-v2 §6.1). La phrase parle de Nayo face à Riff : un projectile reste permis au 3e s'il n'est ni un disque, ni une onde droite à hauteur de poitrine, ni un cri (table ci-dessous).
- En données, **le zoner et le piégeur ont le même outil** : un seul projectile par joueur, toujours en mouvement, sans déclencheur (§4.3.5). Deux concepts sur trois ne peuvent donc pas reposer sur un projectile. Un zoner dit en quoi sa distance n'est pas celle de Nayo (plein écran contre 90 à 150 px, au sol contre à hauteur de poitrine).
- Un lutteur-colosse frôle **Kaï** (combat-v2 §6.5 : « Boxeur lourd », « Dégâts, armure », « Le plus lent, dash minuscule ») : il s'en distingue par la prise et l'emprise, pas par la frappe lourde et la lenteur. Un perso de postures frôle **Sora** (« Défensif zen », une posture de parade).
- Une ville en néon électrique : c'est Néon Underground. Un thème zen : c'est l'Archipel.

**La propriété intellectuelle** (`CLAUDE.md`, « ne jamais copier un jeu, un personnage ou un asset existant » ; `univers.md`, règles communes)

| Idée | Ce qu'elle frôle | Ce qu'il faut éviter |
|---|---|---|
| lutteur colosse | Zangief, Hugo, Alex, Potemkin, King | slip rouge, barbe et mohawk, torse velu, masque de catch, « Piledriver » |
| musicien jamaïcain, sound system | Dee Jay | maracas, « Max Out », la caricature. La culture sound system se cite avec respect, pas en costume |
| casque, bombe de peinture, ghetto-blaster | Kimberly, Jet Set Radio, Bomb Rush Cyberfunk | le tag et la radio pirate comme identité |
| DJ qui frappe avec le son | Lúcio | « Drop the Beat », un fusil sonique |
| cri sonique | Black Canary, Banshee | le cri comme projectile |
| onde sonore projetée | Guile, « Sonic Boom » | une onde en ligne droite |
| rappeur bagarreur en club | Def Jam: Fight for NY | MC, club et foule qui pousse |
| piège posé | Venom (Guilty Gear) | un objet qu'on frappe pour le relancer |
| micro au bout du câble | Bridget, Axl | l'objet qui tourne comme arme principale |
| nom de groupe ou de marque | Guilty Gear (Axl, Slayer, Testament…) | « 808 », Technics, Marshall, tout nom d'artiste |

- **Le nom** est court (Nayo, Riff), prononçable en français, un mot ou un surnom du monde du son, sans capitale accentuée (police Press Start 2P, §4.2). Ce n'est ni un mot du système (Remix, Rewind, MAX, FINISH, CONTRE, PUNITION, DROP), ni un nom d'artiste, de groupe ou de marque, ni Nayo, Riff, Kaï, Vexa, Sora, Kitsune ou Tazz. Il est cherché dans les listes de persos des jeux de combat avant d'être proposé : en ligne si la session a la recherche web, sources citées ; sinon de mémoire, marqué « non vérifié en ligne ». Même règle pour les références voisines.
- **Zen-Tazzer.** Les têtes de Nayo et de Riff viennent de ses sprites, au choix du propriétaire (`tools/sprites/riff/palette.ts`, commit `0c9f140`). Le dépôt ne documente pas ces droits, et il n'existe ni `CREDITS.md` ni `LICENSE`. Pour le 3e : **une tête dessinée de zéro**, sauf si le propriétaire fournit une source et confirme qu'il en a les droits.

**L'histoire**
- Donner un visage ou un nom à l'homme de la cabine.
- Mettre le 3e en finale, ou en acteur du clash de l'an dernier.
- Réécrire les sections de Nayo ou de Riff : **on ajoute, on ne touche pas**.
- Appeler un coup « drop ».
- Faire de la mort, du sang ou de l'humiliation un ressort.

---

## 3. Porte 0 : trois concepts

*Casquette : game design, et un peu d'univers. Rien n'entre dans le dépôt.*

### 3.1 Ce que contient chaque concept

Une page par concept, dans cet ordre :

1. **Le nom provisoire**, et une phrase de pitch. Les règles du nom et de sa recherche sont au §2.4.
2. **L'archétype de jeu**, avec :
   - une ligne par perso pour prouver qu'il n'est ni Nayo, ni Riff, ni Kaï (boxeur lourd, armure, le plus lent), ni Vexa (parkour, rebond mural), ni Sora (défensif, parade), ni Kitsune (filou, téléportation) (combat-v2 §6.5, et §2.4 pour le colosse) ;
   - **ce qu'il apporte au match contre Nayo, et contre Riff**, en deux lignes chacun. Son match est favorable contre l'un et défavorable contre l'autre : une pente visée, à 6-4 au plus (estimation), que la session principale vérifie en boîte grise, parce que c'est de l'équilibrage. Dans l'histoire, ce rapport se raconte sans qu'il ait battu l'un d'eux cette saison (« Deux noms en finale ») : une autre année, ailleurs, ou en marge du tournoi ;
   - sa phrase d'opposition avec chacun, au format de `histoire.md` : « Lui veut la distance. Elle veut le contact. Il lance, elle glisse. »
3. **Son outil signature**, un seul, et **son coût** : en données seules, ou avec du cœur. Dans ce cas, le champ qui manque et « le plus proche en données » (§4.3.5).
4. **3 forces et 3 faiblesses mesurables dans les données** : vie, vitesse de marche, portée de H, coup le plus rapide, taille du corps, etc. **La case borne l'allonge** (§4.8) : le membre reste à environ 60 px de l'ancre au plus, et il doit atteindre le bord de la hitbox (−3 à +4 px, §4.9). Une portée immobile au-delà d'environ 75 px de centre à centre (estimation : 60 px de membre, plus 13,5 px de demi-corps de Nayo) demande donc un pas (`motion.dx`) ou un projectile. Le Crochet de Nayo porte à 65,5 px. Le dire pour chaque force de portée.
5. **Son rapport au son et au temps** (§2.3), toujours cosmétique (D17), et son thème en deux mots. En v1, il n'a aucun son à lui (§2.3).
6. **Son histoire en quelques lignes** : son lieu d'origine, ce qu'il y a appris, sa place autour de la finale.
7. **Ce qu'il veut**, en une phrase.
8. **Sa silhouette** : hauteur de garde en px du monde, carrure, posture de garde. Puis **son détail signature**, un seul, lisible sur un téléphone, avec une histoire et une suite dans le Finisher, comme le casque et la chaîne. S'il pend, il passe par un ressort (`Fighter.springs`) : un élément long et flottant est cher à animer, à dire dans les risques. Au-delà de 85 px, dire comment il tient les fourchettes de la prise (§4.8).
9. **Son mouvement**, en une phrase : la garde qui respire, la marche, le saut avant (Riff : un salto).
10. **Sa couleur dominante et son énergie**, en hex, pour les deux tenues (§4.7) :
    - la teinte HSL de chacune (la fonction `hue` de `tests/render/hit-styles.test.ts`), et son écart au cyan (187°), aux magentas (319° et 329°), à l'or (43°), au jaune de la vie (46°) et aux oranges (28° et 35°) ;
    - la luminance et le rapport de rouge, par `relativeLuminance` et `redRatio` de `src/render/luminance.ts` (canaux linéarisés, seuil 0,8) ;
    - le contrôle des tests : HUD à plus de 20° du jaune ; tenue 2 différente de la tenue 1, ni cyan, ni magenta, ni platine, et qui se détache de la nuit violette ;
    - le daltonisme, simulé (§4.7).
11. **Ses enchaînements** : son style en une phrase, comme « Peu de coups, chacun lourd » ou « Riff rafale », et une route signature dans la notation de l'aide (par exemple « L, L, ← + H, puis S »), sans chiffres.
12. **3 coups signatures** parmi les 29 ids (§4.3.1), hors super, dont celui qui porte l'outil signature : nom, id, entrée, ce qu'on voit, à quoi ça sert. Ce sont eux qui sont animés à la porte 2 et retouchés à la porte 4 : lisibles, avec un membre actif clair.
13. **Sa super** (§4.5) : au moins 2 frappes avec une hitbox (sinon il n'a jamais de Finisher, §4.6) ; la dernière met au sol ; elle ne recule pas le lanceur (§4.6) ; c'est un reversal (invincible dès f0) ou une fin de combo, et la fiche dit lequel ; sa portée visée de centre à centre (Mégabasse : 74 px environ, Slam : 88). Puis **l'idée de son Finisher**, en une phrase, qui réalise une phrase de son histoire. Elle dit ce qu'elle prend parmi les pièces codées (§4.6 : `cone`, `crowd`, `needle`, `shards`, `powerCut` ; cartes `'neon'` et `'cutout'` ; `silence` `'flight'` ou `'hold'`), ou quel code de rendu elle demande à la session principale.
14. **2 répliques**, dans un registre que Nayo et Riff n'ont pas.
15. **Les références voisines vérifiées** (§2.4), et pourquoi ce n'est pas une copie.
16. **Les risques**, et **deux estimations** :
    - en jours-agent, des portes 1a à 4 (repère : 7 à 11 au total, §5) ;
    - le coût pour la session principale : PR de cœur, code de rendu, planches de victime (§4.8), plans du CPU.

    Pour un concept à plus de 1 000 PV : à 30 % de sa vie, le Finisher adverse lui prend d'un coup 330 PV (à 1 100) à 360 PV (à 1 200), contre 264 et 273 aujourd'hui (`finisher.md` §1.6). C'est de l'équilibrage, pour la session principale, mais à dire dès le concept.

Puis, après les trois :
- **un tableau comparatif** au format de combat-v2 §6.3 : PV, marche avant et arrière, dash, saut, coup le plus rapide, plus longue portée immobile, overheads, reversal, projectile, lancers. Colonnes Nayo | Riff | A | B | C ; les chiffres visés sont marqués « estimation » ;
- **la colonne de chaque concept dans le tableau du §2.2**, une case par ligne, 6 mots au plus : c'est là qu'on voit qu'il prend une troisième case ;
- **les trois concepts diffèrent sur l'axe Distance, et un seul repose sur un projectile** (§2.4) ;
- **au moins un concept tenable en données seules** ;
- **la recommandation de l'agent**, et ce qu'elle sacrifie (règle de décision de la charte) ;
- **les questions** pour le propriétaire, chacune avec son hypothèse (§8).

### 3.2 La planche de silhouettes

Deux images PNG, montrées avec les fiches. **Budget : 2 heures** (estimation). Un `Body` et une garde approximatifs suffisent, ou des formes à la main si la hauteur et la largeur sont exactes : tout est refait à la porte 2.

- **Deux rangées**, à la même échelle, les pieds sur la même ligne de sol, de gauche à droite Nayo, Riff, puis les concepts A, B et C :
  - en haut, les cinq en **silhouettes pleines d'une seule teinte neutre**, Nayo et Riff aplatis depuis l'alpha de leur image 0 : on compare les masses sans que la couleur ou le détail ne trompe ;
  - en bas, Nayo et Riff **dans leurs vraies couleurs**, puis les trois concepts **en deux tons** : la masse dans la couleur dominante de la tenue 1, éclaircie jusqu'à se détacher du fond si elle est trop sombre ; le détail signature dans la couleur d'énergie.
- **Nayo et Riff** viennent de **leur vraie garde**, `idle` image 0. Depuis F1, la planche est un atlas : la découpe de chaque image est dans `src/art/<perso>/main/idle.json`, l'ancre des pieds dans `src/art/<perso>/cells.ts` (`idle.anchor`, par exemple `{56, 159}` pour Nayo), et `cellReader` (`tools/sprites/atlas.ts`) lit les deux. Repères mesurés sur `idle.frames[0]` de `cells.ts` : Nayo 79 × 42 px du monde (158 × 84 px de sprite), Riff 73 × 44 (146 × 88). La découpe de `idle.json` garde 2 px vides autour de l'image (`atlas.md` §1) : mesurer sur les pixels opaques ou sur `cells.ts`, pas sur elle. `npm run sprites:preview -- idle` et `npm run sprites:preview -- --riff idle` donnent un aperçu agrandi ×2, sur le fond et avec les repères, dans `tools/sprites/preview/` (ignoré par git) : pour voir, pas pour découper.
- **Les concepts** sont posés en garde avec le squelette (`tools/sprites/skeleton.ts` : un `Body` et une pose), par un script **hors du dépôt**, dans le dossier de travail de l'agent. Il se lance avec `node --import <dépôt>/tools/sprites/ts-imports.js <script>`, qui permet d'importer `skeleton.ts` et les persos depuis l'extérieur.
- **L'échelle d'un téléphone** est un cadre du jeu : la vue de 480 × 270 px du monde, le fond `#1b1b2f` et le sol `#3a3a5c` de la boîte grise à `GROUND_Y` = 230 (`src/render/greybox-stage.ts`), les cinq en garde à leur taille réelle, et les deux barres de vie esquissées en haut pour l'échelle. Exporté ×2 au plus proche voisin (960 × 540), à regarder en plein écran, téléphone en paysage : dans une conversation, une image libre est redimensionnée à la largeur de l'écran et floutée. **L'échelle des planches** (2 px par px du monde) est la 2e image, pour le détail.
- **Des repères** :
  - une graduation tous les 10 px du monde ;
  - une ligne à **100 px** : au gros plan ×2,0 du Finisher, le cadre montre 115 px au-dessus du sol, dont le HUD couvre les 15 du haut (`finisher.md` §1.14). Une 2e ligne à 96 px garde 4 px de marge. Ce qui doit tenir, ce sont les poses jouées au gros plan (super, retour en garde, victoire), pas seulement la garde : les mesurer ;
  - une ligne à **122 px**, la limite de la case (§4.8).
- **Sous chaque silhouette** : sa hauteur, sa largeur, et ses pastilles de couleur, soit les deux tenues, l'énergie, la couleur du HUD, et leurs versions simulées en deutéranopie et en protanopie (§4.7). Sans rendu de texte, les chiffres et les noms vont dans la légende du message, pas dans l'image.

### 3.3 Ce que l'agent ne fait pas à la porte 0

Il ne crée aucune branche. Il ne modifie aucun fichier suivi du dépôt. Il n'écrit aucune donnée.
- Sont permis : `npm ci`, `npm run sprites:preview`, et toute sortie que `.gitignore` couvre.
- Sont interdits : `npm run sprites`, qui réécrit des fichiers suivis (`public/icons/`, `src/art/`), et toute écriture dans un fichier suivi. `npm run sprites:templates` n'écrit que dans `art-src/gabarits/` (ignoré par git), mais ne sert qu'à partir de la porte 2.
- À la fin de la porte 0, `git status --short` est vide.

**Le message de la porte 0** se lit sur un téléphone : la décision en tête (un tableau court, les images, la recommandation, une seule question), les questions du §8 en lignes numérotées avec leur hypothèse, et les fiches complètes en dernier (le prompt donne l'ordre). Les images se montrent dans la conversation, par l'outil d'envoi de fichiers de la session, ou dans une page Artifact privée, jamais partagée ; sans ces outils, l'agent le dit et donne les chemins. Les quatre rubriques de la charte tiennent en une ligne : « Aucun fichier du dépôt modifié. »

**Il s'arrête et attend le choix du propriétaire.** S'il choisit un mélange, ou demande un autre concept, l'agent refait la fiche et la planche, toujours à la porte 0. Quand il a choisi, l'agent passe à la porte 1a dans la même session. La PR 0 (§8, question 7) ne démarre qu'après ce choix.

---

## 4. Après le choix : ce qu'il faut produire

### 4.1 L'histoire

*Fichiers : `docs/art/histoire.md` et `docs/art/univers.md`, en ajouts seulement.*

**Sa section dans `histoire.md`**, `## <Nom>`, après celle de Riff, dans le même ordre :
1. **L'ouverture**, en 2 à 7 mots, au présent : « Il compte. » ; « Elle rit. C'est le premier avertissement. »
2. **Le lieu d'apprentissage**, avec un détail des sens qui devient sa façon de se battre. Par exemple : le métro toutes les quatre minutes, donc « Il a fini par boxer au rythme des trains. »
3. **Ce qu'il y a appris**, en une ou deux formules : « Elle y a appris deux choses. Tourner sur une main. Frapper la première. »
4. **La tenue**, en une phrase énumérée, puis **l'objet signature** et son histoire, avec une chute : « La porte n'a pas tenu. »
5. **Les coups racontés en scène**, leur nom en capitale comme un nom propre, avec l'onomatopée de la super (« BOUM. BOUM. BOUUUM. »).
6. « **Ce qu'il veut :** », en une ou deux phrases.
7. **Sa façon de parler**, en trois phrases très courtes.

**Les règles d'écriture** : au présent ; des phrases courtes, souvent nominales ; les chiffres en lettres dans le récit (« Mille personnes ») sauf les repères (« 120 BPM », « niveau -3 ») ; aucun jargon de jeu (ni « frame », ni « hitbox »).

**Ses scènes**, dans « Pour l'animation (plus tard) », numérotées après la scène 9. Chacune a un titre en gras, puis le plan en une ou deux phrases de caméra et d'action, puis « *Son* : », puis la réplique sous la forme `Nom : « … »`. Il faut au moins :
- son entrée, sur le modèle des scènes 2 et 3 ;
- un face-à-face avec Nayo et un avec Riff, sur le modèle de la scène 5, chacun avec une **paire de répliques** comme « T'as racheté une aiguille ? » / « J'ai gardé le disque. » ;
- sa victoire ;
- son temps écoulé, qui raconte quelque chose (scène 9 : « sans s'en rendre compte, elle retombe sur le temps »).

**Ses répliques**, dans « Répliques » : 2 d'entrée, 2 de provocation, 2 de victoire, de 1 à 8 mots environ. Le registre doit se reconnaître sans le nom. Celui de Nayo est déclaratif, sans familiarité ; celui de Riff est oral, sans le « ne », au tutoiement.

**Sa section dans `univers.md`**, `### <Nom> — <archétype>`, sur le modèle de celles de Nayo et Riff : tenue, tenue 2, palette, effets, table des coups, entrée, victoire, temps écoulé. Il faut aussi mettre à jour la règle des gabarits (ligne 3) et le tableau des univers.

### 4.2 L'identité de jeu

*Fichier : `docs/<perso>.md`, la spec du perso, sur le modèle de combat-v2 §6.2 et de combos-v3 §4.*

- **Look, couleurs, effets, personnalité, plan de jeu, forces, faiblesses**, au format de combat-v2 §6.2.
- **Au moins 3 forces et 3 faiblesses mesurables** (combat-v2 §6.3), chacune lue dans les données.
- **Le matchup** contre Nayo et contre Riff (combat-v2 §6.4).
- **Un test d'identité** dans `tests/data/fighters.test.ts`, qui vérifie l'archétype dans les données (par exemple : le plus de vie, la marche la plus lente, la plus longue portée de H). Il complète `play differently…`, qui ne compare aujourd'hui que Nayo et Riff.
- **La description du roster** (`src/data/roster.ts`, `description`) : une identité, puis 4 traits séparés par « · », en 71 signes au plus (Riff : 71, Nayo : 66 ; aucun test ne le borne). Modèles : « Boxeur-DJ posé · portée · Vinyle · Uppercut invincible · Mégabasse » ; « Punk de rue explosive · dash · Glissade · deux overheads · moins de vie ».
- **Le titre de l'aide** (`src/data/texts/<perso>.ts`, `title`) : « Le/La <identité> : <trois verbes> ». Modèles : « Le boxeur-DJ : il compte les temps, te fait décoller et lâche les basses » ; « La punk de rue : elle breake, cogne et te nargue ».
- **Le nom affiché** (`FighterTemplate.name`) sert de clé aux plans du CPU (`PLANS[name]`).
- **Ni `FighterTemplate.name` ni aucun `MoveData.name`** ne contient de capitale accentuée (É, À, Ç…) ni de glyphe absent de Press Start 2P (sous-ensemble latin). `tests/render/glyphs.test.ts` les lit tous par `ROSTER`, donc dès la PR E : « Echo », pas « Écho ». Les noms du Rewind et de la super passent aussi par Bangers, la police des tampons (même test, « of every comic word »), et leur largeur est bornée (§4.3.2).

### 4.3 Les coups

*Fichiers : `src/data/fighters/<perso>.ts`, `<perso>-strings.ts` et `<perso>-boost.ts`, écrits avec les aides de `src/data/fighters/shared.ts`, sur le patron de `riff.ts`.*

#### 4.3.1 Les 29 ids

Les entrées sont communes à tout le casting : seul le contenu change (combat-v2 §5.1, « les **mêmes directions** pour les mêmes rôles »). Un optionnel absent retombe sur le normal debout.

| Id | Entrée | Type (imposé par `validate.ts` pour la prise, les lancers, les mouvements et les 14 optionnels ; usage commun sinon, *en italique* les conventions) | Rôle commun | Nayo | Riff |
|---|---|---|---|---|---|
| `standLight` | L | normal | le coup rapide, qui ouvre L, L, L | Direct | Jab |
| `standHeavy` | H | normal | la punition, la portée | Crochet | Coup de coude |
| `crouchLight` | ↓ + L | normal, *bas* | le coup bas rapide | Coup bas | Coup bas |
| `crouchHeavy` | ↓ + H | normal, *bas*, *met au sol* | le balayage | Balayage | Windmill |
| `jumpLight` | en l'air, L | normal, sans projectile | | Genou sauté | Ciseau aérien |
| `jumpHeavy` | en l'air, H | normal, sans projectile | | Coup de pied sauté | Talon sauté |
| `special` | S, ou ↓↘→ + L/H/S | special | l'outil signature | Vinyle | Glissade |
| `specialForward` | → + S | special | | Pied fendu | Saut de l'ange |
| `specialAntiAir` | ↓ + S, ou →↓↘ + L/H/S | special | l'anti-air | Uppercut | Genou montant |
| `grab` | PRISE, ou L + H | **grab**, le seul | | Prise | Prise |
| `pummel` | en tenant, L | throw, sans mise au sol | le tabassage | Coup de genou | Coup de tête |
| `throwForward` | en tenant, H, S ou PRISE | throw, met au sol | | Renvoi | Ciseaux |
| `throwBack` | en tenant, ← + H, S ou PRISE | throw, met au sol, change de côté | | Projection d'épaule | Roulade |
| `dashForward` | DASH, ou deux fois avant | movement | | Pas chassé | Footwork |
| `dashBack` | ← + DASH, ou deux fois arrière | movement | | Retrait | Retrait |
| `forwardLight` | → + L | normal | | Jab chassé | Toprock |
| `forwardHeavy` | → + H | normal | l'overhead | Overhand | Talon |
| `backHeavy` | ← + H | normal | le lanceur | Remontant | Retourné |
| `chainLight` | L après L | normal | | Cross | Revers |
| `lightFinisher` | L après `chainLight` | normal | la fin de L, L, L, qui met au sol | Mise au tapis | Swipe |
| `jabRepeat` | L, ← + L | normal | | Double direct | — |
| `chainHeavy` | H, H | normal | | Crochet au foie | Coup de boule |
| `chainHigh` | L, L, → + H | normal | l'overhead de corde | Marteau | Hache |
| `chainLaunch` | L, L, ← + H | normal | le lanceur de corde | Remontant chassé | Retourné sauté |
| `boostCancel` | DASH après le contact (1 barre) | movement | le Rewind | Rewind | Pogo |
| `specialBoost` | BOOST (1 barre) | special, palier 2 | le Remix de `special` | Vinyle platine | Glissade à fond |
| `specialForwardBoost` | → + BOOST (1 barre) | special, palier 2 | | Pied fendu platine | Saut de l'ange à fond |
| `specialAntiAirBoost` | ↓ + BOOST (1 barre) | special, palier 2 | | Montée platine | Genou à fond |
| `super` | ← + BOOST (3 barres) | special, palier 3 | la super | Mégabasse | Slam |

- **Pas de 4e spécial, pas de spécial aérien, pas de prise spéciale.** Le Scratch de Nayo (combos-v3 §1.10) n'est pas codé.
- **Recommandé : les 29, ou tous sauf `jabRepeat`, comme Riff.** La garantie « L, L, L » exige `chainLight` et `lightFinisher` (`tests/core/combos.test.ts`), et l'aide attend un bloc de combos qui commence par `L, L, L` (§4.4).
- Les entrées et leurs priorités sont dans `src/core/commands.ts` et `src/core/moves.ts` (combat-v2 §2, combos-v3 §1.1). Le tampon d'entrée garde le dernier appui 6 tics (`INPUT_BUFFER_FRAMES`). Deux manips seulement, ↓↘→ et →↓↘ (combat-v2 §2.7, D6).

#### 4.3.2 Le nom et la mise en scène de chaque coup

- **Les noms** sont en français, ou dans le mot du métier tel que les Français le disent (Direct, Overhand, Toprock, Windmill, Scratch, Larsen).
- **La métaphore musicale** (Vinyle, Mégabasse, Larsen) est réservée aux spéciaux, à la super et au Finisher. Les normaux gardent des noms de gestes (Coup bas, Balayage, Talon).
- **Le Remix** se nomme `<spécial> <mot de la famille>` : « Vinyle platine », « Glissade à fond ». Le 3e choisit son mot.
- **Il nomme aussi son Rewind**, sa super et son Finisher.
  - Seuls le Rewind et la super deviennent un tampon `NOM !`, en capitales, en Bangers (`boostStamp`, `src/render/stamps.ts`). Un Remix affiche « REMIX ! » (`STAMP_TEXTS.remix`).
  - Ces deux noms ne doivent pas allumer plus que le plus large tampon actuel : `tests/render/flash-areas.test.ts`, « measures every stamp, the Boost moves named included », exige que le plus large, noms de `ROSTER` compris, reste sous `STAMP_AREA` = 700 et `CALM_STAMP_AREA` = 410 px² (`src/render/flash-areas.ts`), à 5 % près. Viser au plus la largeur de « DÉGAGEMENT ! », et la mesurer dès la porte 1a. Agrandir la table relève du budget de flashs, donc de la session principale.
- **Pour chaque coup**, la spec dit :
  - ce qu'on voit, image clé par image clé ;
  - où il frappe : haut, milieu, bas, overhead ;
  - à quoi il sert ;
  - comment on le contre, avec les vrais coups de Nayo et de Riff.

  « Le nom dit ce que c'est, l'image dit où ça frappe, le son dit quand » (combat-v2 §5.4).
- **La frame data** est écrite au format de combat-v2 §10.2, une ligne par coup : Id, Entrée, Nom, S/A/R (tot), Dg, HS/BS, Stop, Recul, Garde, Hitbox x / y, Mouvement, Av., Portée, Annule en.

#### 4.3.3 Les bornes de la frame data

Toutes sont vérifiées au chargement (`validateTemplate`, `src/core/validate.ts`, `validate-combos.ts`, `validate-boost.ts`) ou par un test, sauf trois : `knockdownFrames` = 40 (une convention), `throwBack` à 14 et f6 (tenus seulement par `hold-pairs.test.ts`, une fois le 3e dans `DRAWN_FIGHTERS`) et `crouching` (à tenir).

| Règle | Chiffre | Où |
|---|---|---|
| Frappe hors Boost la plus forte | **127 dégâts au plus**. À 128, un combo peut rapporter une barre de jauge (règle 13) | `validate-boost.ts` |
| Gel d'impact (hitstop) | `|gel − (5 + ⌊dégâts / 10⌋)| ≤ 3` pour toute frappe, hors projectile, Remix et super | `tests/data/hitstop.test.ts` |
| Plafond du gel | gel + 3 (CONTRE) + 4 (prolongateur) ≤ 30, soit **23 tics de base au plus** | idem |
| Projectile | gel sous la loi (le Vinyle : 8 pour 11) | idem |
| Normal gardé | `blockstun + 1 − actif − récupération ≤ q − 1`, où q est **le plus petit démarrage de ses normaux et de ses spéciaux simples** (palier 1 au plus : Remix et super exclus) | `validate-combos.ts`, règle 8 |
| Recul | > 0 pour toute frappe (`validate.ts` n'exige que ≥ 0) | `validate-combos.ts`, règle 8 |
| Hurtbox de posture | 1 ou 2, entières, empilées sans trou | `validate.ts` |
| `motion.dx` | une entrée par tic du coup ; `y` ≥ 0 et revenu à 0 au dernier tic | `validate.ts` |
| `throwBack` | **démarrage 14, côté changé à f6**, comme Nayo et Riff : la victime joue **sa** planche `thrownBack`, réglée sur ce timing | `src/render/animation.ts` ; tenu par `hold-pairs.test.ts` une fois le 3e dans `DRAWN_FIGHTERS` (`validateArt` ne compare `thrownBack` qu'au `throwBack` du perso lui-même) |
| `knockdownFrames` | **40** : les avantages de mise au sol de tout le casting sont calculés dessus | `src/core/config.ts` ; une convention, vérifiée nulle part (`validateArt` compare `knockdown` + `getup` à la valeur du perso lui-même) |
| Prise | gel de saisie 6 (`GRAB_HITSTOP`) ; une prise rapporte moins d'une barre | `src/core/rules.ts`, `validate-boost.ts` |
| Accroupi | `crouching: true` sur `crouchLight` et `crouchHeavy` (non validé, à tenir) | `move-data.ts` |

- **Les formules** (combat-v2, en tête) : avantage = `stun + 1 − (actif + récupération)` ; un coup se lie si `démarrage ≤ avantage − 1`.
- **Le levier du colosse.** Comme q se calcule par perso, un colosse dont l'attaque la plus rapide démarre en 5 tics peut laisser ses normaux à +4 en garde. C'est sûr (le trou reste), mais c'est de l'équilibrage, à dire dans la spec. combos-v3 dit « du casting » : l'écart est à signaler, pas à corriger.
- **Les repères** de Nayo (1000 PV) et de Riff (900 PV) sont dans combat-v2 §10.1 et §10.2 : coup le plus rapide 3 à 4 tics, portée immobile de H 56 à 65 px, combos sans jauge de 9 à 35 % de la vie adverse.

#### 4.3.4 Les boîtes du corps

- **Les hurtbox se calent sur le dessin, jamais l'inverse** (combat-v2 §9.2). En boîte grise, elles sont provisoires. Elles sont mesurées aux portes 2 et 3 par `npm run measure-boxes -- <perso>`, puis `-- <perso> --moves` pour les coups. Elles suivent le dessin à ±1,5 px (`tests/tools/hurtboxes.test.ts`).
  - **Attention, faux vert** : `measure-boxes.ts` ne mesure que les persos de sa liste `FIGHTERS`. Un nom inconnu ne mesure rien, n'affiche rien et sort en 0. Le 3e y entre d'abord (PR 0, ou sa ligne en PR B), et la sortie doit nommer ses postures et ses coups.
- **La table des cross-ups** (`tests/core/crossup.test.ts`, `CROSS_UPS`) est écrite joueur × cible × posture : le 3e y ajoute 15 lignes (5 paires × 3 postures), mesurées.
- **La pushbox debout fait 26 à 28 px de large**, tant que le test de prise ne change pas. La distance de prise vaut `trunc((largeur du teneur + largeur du tenu) / 2)` (`src/core/hold-pair.ts`), et `tests/tools/hold-pairs.test.ts` l'exige entre 26 et 28 px pour chaque paire, **miroir compris**. Contre lui-même, elle vaut donc sa propre largeur.
  - Un colosse plus large demande de changer ce test et de revoir les planches de prise de Nayo et de Riff : c'est une décision de la session principale, à dire dès la porte 0.
  - La masse d'un colosse se montre donc par la hauteur, la carrure dessinée, la vie et la portée, pas par la pushbox.
- **La pushbox aérienne** est le seul réglage des cross-ups (D7) ; `tests/core/crossup.test.ts` fige la table (ci-dessus).

#### 4.3.5 Ce que les données savent dire, et ce qui demande du cœur

**Faisable en données aujourd'hui**
- La vie, les vitesses, le saut, la taille du corps (dans la borne de la prise).
- La portée et la lenteur, les gels longs selon la loi, un CONTRE propre à un coup (`counter`).
- Les coups qui avancent ou reculent, les bonds (`motion.y`), les corps qui se baissent par frame (`hurtboxes`).
- L'invincibilité totale ou aux seules attaques aériennes, le backdash anti-prise.
- **Un projectile sur n'importe quel coup au sol** : lent (jusqu'à 1 sous-pixel par tic) ou rapide, au ras du sol (`guard: 'low'`), grand, qui lance ou met au sol. Mais **un seul par joueur à l'écran**, toujours en mouvement.
- Un prolongateur, Rebond ou Vrille, un seul type par perso.
- Un Remix qui achète un trait : un reversal, un projectile plus rapide, une levée.
- Une super à plusieurs frappes, invincible ou non, au sol ou en bond.

**Impossible sans code de cœur** : il faut alors chiffrer le coût, proposer une décision Dxx (à confirmer : le prochain numéro libre du journal au moment de la PR ; le journal s'arrête à D32, donc D33 ou plus), et attendre la PR de cœur de la session principale.

| Idée | Pourquoi | Le plus proche en données |
|---|---|---|
| Armure | aucun champ : un coup reçu interrompt toujours. Promise à Kaï | beaucoup de vie, un CONTRE propre, une invincibilité courte |
| Prise spéciale, 360 | une seule `grab`, aucune manip de 360 (D6) | une prise longue et de gros lancers sous la borne ; un spécial qui fauche ou lance |
| Frappes multiples sur un normal ou un spécial | `pulses` est réservé à la super | des cordes, ou la super |
| Piège posé, mine, plusieurs projectiles | un projectile par joueur, toujours en mouvement, sans déclencheur | un projectile **très lent**, « un piège qui avance », à juger en boîte grise |
| Téléportation | les pushbox empêchent de traverser au sol. Promise à Kitsune | un bond par-dessus un adversaire accroupi |
| Parade qui riposte | aucune action de garde active. Promise à Sora | un anti-air ou un Remix invincible |
| Super à projectile **avec** Finisher | le verrou exige une hitbox (`everyBlowLands`, `src/core/finisher.ts`) | une super-frappe longue, comme la Mégabasse (4..60 px) |
| Une forme d'impact, une pièce de scène, un son neufs | du rendu et de l'audio | reprendre `slash` ou `claw` et des sons existants, en couleurs neuves |
| Un lancer qui montre la victime autrement : suplex, piledriver, prise basse | pas du cœur, mais de l'art hors périmètre : la victime joue **ses** planches `held`, `thrownBack` et `thrownFall` (`src/render/animation.ts`), dessinées pour une projection d'épaule debout (§4.8) | un `throwBack` qui suit leur arc, un `throwForward` qui les couche par leurs réactions existantes |

**Pistes d'archétype tenables en données**, des pistes et pas des choix :
- **un colosse** : 1100 à 1200 PV, marche lente, dash court, normaux longs et lents, gros lancers, CONTRE qui plient, super invincible ; faible contre les cross-ups et les combos de tout le monde, sans coup à moins de 4 tics ;
- **un zoner bas et lent** : un projectile au ras du sol, à parer accroupi, un spécial avant qui recule, et une super qui frappe longue pour garder un Finisher ;
- **un piégeur** : un projectile lent qui roule, un overhead en bond, un Remix qui accélère le projectile. C'est le plus risqué : à jouer en boîte grise avant tout art.

### 4.4 Les enchaînements

*Grammaire : `docs/combos-v3.md` §1. Fichier : `src/data/fighters/<perso>-strings.ts`.*

- **La phrase** (§1.2) : une annulation n'entre jamais dans un normal déjà joué depuis le dernier départ du neutre. `standLight` et `crouchLight` y ont droit deux fois. Un lien et le Rewind la remettent à zéro.
- **Les paliers** (§1.3) : normal 0, spécial 1, Remix 2, super 3. Un spécial ou un Remix ne s'annule qu'en super, et seulement s'il a touché, sans être un projectile. Au plus un spécial par phrase.
- **Les cordes** (§1.4) : `branches: [{ button, dirs?, move }]`, lues après le contact, avant `cancelInto`.
  - Elles vont d'un normal vers un normal.
  - Le graphe est sans cycle, et un chemin compte **5 coups au plus** (`MAX_BRANCH_DEPTH`).
  - Sur un même normal, un seul coup par couple (bouton, direction) (`validate-combos.ts`, « two strings for ») ; un normal peut ouvrir plusieurs cordes (la Cross de Nayo et le Revers de Riff en ont 5).
  - **Le garde-fou du débutant** : sur `chainLight`, L dans **toutes** les directions donne `lightFinisher`.
  - Le patron de Nayo et de Riff : L → L → { L : coup final ; H : `standHeavy` ; → + H : `chainHigh` ; ↓ + H : `crouchHeavy` ; ← + H : `chainLaunch` }, puis H → H (neutre, →) : `chainHeavy`.
- **La jongle à points** (§1.5) : un lanceur pose de 1 à 5 points (`JUGGLE_POINTS_MAX`), et chaque coup sur un corps jonglé dépense son coût (`juggleCost` ≥ 1, 2 pour les lourds).
- **Le prolongateur** : Rebond ou Vrille, sur un normal, un seul type par perso, une fois par combo.
- **Le CONTRE propre** (§1.6) : un hitstun de 0 à 20 (`COUNTER_HITSTUN_MAX`).
- **Les limites** (§1.7) : décroissance du hitstun à partir du 8e coup ; au 12e coup (`COMBO_LIMIT`), le corps tombe et rien ne le touche plus.
- **Les garanties testées** :
  - `tests/core/combos.test.ts` vérifie que L, L, L passe sans trou, debout comme accroupi, partout où le premier L touche. **Le premier L doit porter à plus de 40 px.** Les paires y sont en dur, et le 3e y entre ;
  - `tests/core/infinite.test.ts` et ses voisins, avec la recherche de `tests/core/beam-search.ts` : jamais plus de 12 coups, au plus 45 % de la vie adverse sans jauge, au plus 49 % avec. Les paires (`PAIRS`) reviennent à la session principale.
- **Le style du 3e**, en une phrase comme combos-v3 §2.1 et §4 : « Peu de coups, chacun lourd » ; « Riff rafale ».
- **La spec donne ses cordes** (au format de la table de combos-v3 §4), puis **ses routes mesurées**, avec les dégâts coup par coup, la distance de départ et la jauge. Elles vont dans `tests/core/<perso>-combos.test.ts`, sur le modèle de `riff-combos.test.ts`.
- **L'aide** (`src/data/texts/<perso>.ts`), d'après `tests/app/controls-content.test.ts`, qui lit `ROSTER` dès la PR E :
  - `combos` a **exactement 7 lignes** depuis la PR 5 du Finisher : la 1re est `L, L, L` ; l'avant-dernière finit par `arrière + BOOST (3 barres)` (la super) ; la dernière, la ligne de démonstration du Finisher, par `arrière + BOOST (FINISH allumé)` ; aucun BOOST dans les 5 premières ;
  - chaque texte de coup et de combo fait plus de 20 caractères, et aucun texte affiché n'a de capitale accentuée ;
  - par section de l'aide, la plus longue entrée et le plus long mot font au plus 65 caractères à eux deux (« fits each fighter's lists on a phone » : (entrée + mot) × 8 + 16 ≤ 536 px) ;
  - le nom de chaque coup, tel que ses données l'écrivent, apparaît sur sa page (« lists every move… by the name in its data ») ;
  - le texte de la super dit son Finisher, sur le modèle de Riff : « Avec FINISH allumé, c'est son Finisher, Larsen : … ». Le test qui le vérifie (« tells the Finisher… ») ne nomme que Nayo et Riff : la session principale l'étend (PR F).

### 4.5 Le Boost et la super

*Fichier : `src/data/fighters/<perso>-boost.ts`, sur le modèle de `riff-boost.ts`. Règles : combos-v3 §1.8, `validate-boost.ts`.*

- **Les 3 Remix** (`specialBoost`, `specialForwardBoost`, `specialAntiAirBoost`) s'écrivent avec `remix(plain, changes)`. Chacun coûte 1 barre.
  - Ils gardent **le timing exact** de leur spécial (D18), et donc la même planche. Leurs effets passent en **blanc platine**, jamais en or.
  - Le Remix est l'endroit où le perso **achète** ce qui lui manque. Riff s'y paie son seul reversal au sol.
- **Le Rewind** (`boostCancel`) s'écrit avec `boostStep` : un pas sur la courbe du dash, annulable dès `freeCancelFrom`, avec un flash. Il coûte 1 barre. Nayo : 12 tics, 24 px ; Riff : 10 tics, 24 px.
- **La super** s'écrit avec `superMove(first, pulses, flash)`. Elle coûte 3 barres.
  1. Le flash tombe au plus 2 tics avant la 1re frappe : `startup − flash.frame ≤ 2`.
  2. Les frappes (`pulses`) se suivent dans les frames actives. Chacune fait des dégâts et repousse.
  3. **La dernière frappe met au sol.**
  4. Les frappes d'avant tiennent le corps jusqu'à la suivante : `hitstun − 6 ≥ écart`.
  5. Elle frappe **avec une hitbox**, pas un projectile (§4.6).
  6. **Au moins 2 frappes**, comme les deux autres. Une seule passe la validation, mais la mise en scène y perd son sens.
- **Reversal ou fin de combo ?** Le CPU difficile la sort au réveil seulement si elle est invincible dès f0 contre tout (`isReversal`, `src/ai/cpu.ts`). Nayo est un reversal, Riff une fin de combo : le 3e choisit et le dit, avec sa portée visée de centre à centre (instantané des portées : Mégabasse 73,5 à 75 px, Slam 87,5 à 89).

### 4.6 Le Finisher

*Sur papier, au format de `docs/finisher.md` §2 et §3. Il n'est pas codé par l'agent : sa mise en scène se branche sur les scripts existants.*

- **Le Finisher n'a aucune donnée à lui** : c'est la super lancée armée (balle de match, 3 barres, adversaire à 30 % ou moins, de la place). Test : `tests/core/finisher.test.ts`, « no data of its own ».
- **Le verrou** (D28) ne prend que si toutes les frappes de la super trouvent la victime (`everyBlowLands`). Une super à projectile **n'a jamais de Finisher**. Une super qui recule le lanceur sort de l'hypothèse du calcul : `everyBlowLands` (`src/core/finisher.ts`) tient l'attaquant sur place, ou le laisse avancer vers la victime (le Slam), jamais reculer.
- **Il réalise à la lettre une phrase de son histoire.** Le Quatre : « Je compte jusqu'à quatre. Tu tombes sur le quatre. » Larsen : « que tout L'Entrepôt saute sur son temps à elle ».
- **Les 10 rubriques**, comme §2 et §3 : fantasme ; pourquoi c'est lui ; storyboard (t, moment, lui, victime, caméra et VFX, son, chaque pose marquée [R] réutilisée ou [N] nouvelle) ; caméra ; fond et level design ; VFX et palette ; typographie ; couches sonores ; durées ; coût.
- **Le contrat commun** (§1.14) :
  - la même trame que les deux autres, à 15 images près ;
  - la retombée R, puis la carte à R + 30 (4 images d'entrée, 60 immobiles, 8 de sortie), puis 60 images de pose de victoire ;
  - une version courte ;
  - tout marche sans le son et en mouvement réduit.
- **Jamais plus de 0,8 s d'image figée** : au-delà, sur téléphone, elle se lit comme un plantage (§3.3).
- **Les flashs** (§4.1) :
  - au plus **3 flashs comptés** dans la scène, jamais plus de 2 par seconde, à 30 images d'écart au moins, jamais 2 climax dans la même seconde (`finisher.md` §0, §4.1, §4.3) ;
  - **630 px² du monde au gros plan ×2,0** ;
  - aucun voile blanc plein écran, aucun rouge saturé qui varie, aucun texte qui tremble, pas de sang au gros plan.
- **Un colosse** : au gros plan ×2,0, le cadre montre 115 px au-dessus du sol, dont le HUD couvre les 15 du haut (`finisher.md` §1.14). La tête passe donc sous le HUD au-delà de **100 px**, et sort du cadre à 115. Viser **96 px au plus**, 4 px de marge, sur les poses jouées au gros plan (super, retour en garde, victoire), pas seulement sur la garde, et les mesurer.
- **Les cases déjà prises**. Le 3e en prend une autre là où les données le permettent ; ailleurs, il reprend une pièce existante, ou demande du code de rendu :

| Élément | Le Quatre | Larsen |
|---|---|---|
| Temps | le compte, sur les noires ; retombée à t0 + 60 | l'image tenue, reprise sur le contretemps à t0 + 45 |
| Silence (`silence`) | `'flight'` : il le choisit | `'hold'` : l'aiguille saute |
| Secousse (`shake`) | `'x'` | `'y'` |
| Aplats (`flats`, par tenue) | `0x0e3a46` / `0x3a0e2e` | `0x4c0b44` / `0x6a420c` |
| Carte (`card`) | « QUATRE. », `'neon'` | « SUR MON TEMPS. » ; contre Nayo « T'AS RATÉ UN TEMPS. », `'cutout'` |
| Note de sirène (`SIREN_ROOTS`) | do, 262 Hz | mi, 330 Hz |

- **Le temps et le silence ne sont pas libres en données.** `silence` pilote le code : `timelineOf` cale la retombée sur la grille de Nayo (30 images) avec `'flight'`, ou la fixe à t0 + 45 (`OFFBEAT`) avec `'hold'` ; avec `'hold'`, `winnerPoseOf` joue aussi le rebond de Riff (28 px), par les clips `jump`, `jumpForward` et `landing` du gagnant. En données, le 3e reprend donc `'flight'` (la trame de Nayo) ou `'hold'` (la reprise à t0 + 45, et ce rebond joué par ses propres clips). Une 3e trame est du code de rendu (`timelineOf`, `winnerPoseOf`), pour la session principale, à chiffrer dès la porte 1a.
- **Le script en données** (`FinisherScript`, `src/render/finisher-scripts.ts`). L'agent le propose champ par champ, avec les pièces existantes :
  - **libres** : `name`, `nameTilt`, `count`, `stretch`, `flats`, `card.text`, `card.rival` (un seul rival), `shake` (`'x'`, `'y'` ou `'both'`), `hush`, `cues` (sons existants de `src/audio/sfx.ts`) ;
  - **à choisir parmi les valeurs codées** : `silence`, `zoomFrom`, `flatLeaves`, `card.style` ;
  - **à réutiliser, en `true` ou `false`** : `cone`, `crowd`, `needle`, `shards`, `powerCut`, les pièces existantes de `finisher-scene.ts` ;
  - **du code de rendu, donc pour la session principale** : un 3e style de carte, une 3e trame, une pièce de scène neuve, un son neuf.
- **Les aplats** restent sous ΔL 0,06 contre le ciel et le sol, sans rouge saturé (`tests/render/finisher-flashes.test.ts`).
- **La note de sirène** (`SIREN_ROOTS`, `src/render/finisher-signal.ts`) : la sirène monte de sa fondamentale à sa quinte (Nayo : do 262 → sol 392 ; Riff : mi 330 → si 494). Le 3e prend une fondamentale dont ni elle ni sa quinte ne tombe sur 262, 330, 392 ou 494 Hz, par exemple ré 294 Hz (quinte la 440) ou fa 349 Hz (quinte do 523).
- **La pose `finale`** est optionnelle, avec `victory` en repli (`OPTIONAL_POSE_IDS`, `src/art/types.ts`). Elle est hors de la v1 (§4.12).

### 4.7 Les couleurs

*Fichiers : `tools/sprites/<perso>/palette.ts` et `src/render/hit-styles.ts`. Tests : `tests/render/hit-styles.test.ts`, `tests/render/veils.test.ts`, `tests/render/flash-areas.test.ts`, `tests/tools/sprites.test.ts`.*

**Les teintes déjà prises**

| Couleur | Teinte | Qui |
|---|---|---|
| cyan `#30E8FF` | 187° | Nayo |
| magentas `#FF4FC8`, `#FF3CA0` | 319°, 329° | Nayo (tenue 2), Riff |
| or `#FFC83A` | 43° | Riff (tenue 2). Le Boost n'est **jamais** or |
| jaune de la vie `#F0C94A` | 46° | HUD, titres |
| oranges `#FFA526`, `#E07A22` | 35°, 28° | gerbe de Nayo, bord du HUD, néons du stage |
| violet | — | la « nuit violette » du stage |
| cramoisi `#E0283C` | 353° | Riff (tenue 2) |
| platine `#F2F6FF`, `#C9D6E8`, `#FFFFFF` | — | tous les Boost |

**Les règles testées pour l'énergie** (`HitStyle`, `hit-styles.ts`)
- Le triplet (forme, énergie, frappe) est **unique** dans le roster (`hit-styles.test.ts`, qui lit `ROSTER`).
- L'énergie de la tenue 2 est **différente** de celle de la tenue 1 (idem).
- La couleur du HUD (`hud`, ou l'énergie) est à **plus de 20°** de la teinte du jaune de la vie, dans les deux tenues : rien entre environ 26° et 66° (idem).
- **Aucun rouge saturé** : `R / (R + G + B) < 0,8` sur les canaux linéarisés (`veils.test.ts`, `redRatio`). La liste `ENERGIES` y est écrite en dur pour `nayo` et `riff` : il faut l'étendre.
- **Hors miroir, tout le monde joue en tenue 1.** L'énergie `main` se distingue donc d'un coup d'œil du cyan, des deux magentas, de l'or et du platine.

**Le vert** (environ 95° à 150°) est la seule grande teinte libre. C'est loin du cyan (40° à 90°), des magentas (plus de 170°) et du jaune (50° à 100°).
- Un vert vif est très lumineux, avec une luminance d'environ 0,74 contre 0,66 pour le cyan : ses lueurs prendront un alpha plus bas, ce que `alphaForDelta` gère déjà.
- **Le daltonisme** : le mode prévu vise « le trio cyan, magenta et orange » (`direction-hud.md`, idée 13). En deutéranopie, un vert se confond avec l'orange et le jaune : il faut le vérifier en simulation, et le séparer par la valeur, pas seulement par la teinte.
  - Simuler la deutéranopie et la protanopie (Machado 2009, sévérité 1, en RVB linéaire) sur l'énergie et le HUD, et comparer leur luminance simulée à celle du jaune de la vie simulé (0,63 en deutéranopie, 0,56 en protanopie).
  - Le piège, mesuré : `#5CF25A` devient `#E5D067` en deutéranopie, de luminance 0,63, celle du jaune de la vie simulé (`#E8D150`), et proche de l'or simulé (`#EED642`, 0,67). Le test des 20° passe, mais un daltonien voit le jaune du HUD.
  - Un vert vif de luminance 0,6 à 0,75 s'y confond : le séparer par la valeur (vers 0,35 à 0,45 : `#1EC85A` a 0,42, et 0,39 simulé) ou par un `hud` distinct.
- **La tenue 2** doit trancher sur la tenue 1 et ne ressembler à aucune autre. Rien n'est simple :
  - le violet UV `#9A5CFF` et l'outremer `#4C6CFF`, de luminance 0,22 et 0,19, se fondent dans la nuit violette du stage ;
  - l'ambre `#FF8A1E` a un rapport de rouge de 0,79 sur les canaux linéarisés (`redRatio` ; 0,60 sur les valeurs brutes, qui trompent), à un cheveu du seuil, et se lit comme le jaune et l'orange du HUD : il demanderait un `hud` de remplacement, comme le cramoisi de Riff ;
  - une tenue 2 en cyan ou en magenta est à éviter, parce qu'elle se confondrait avec un autre perso.

**La palette du perso** (`definePalette`, `tools/sprites/palette.ts`)
- Le 0 est transparent. Puis viennent **7 numéros par matière** (`outline, deep, shadow, base, light, gloss, rim`), puis **1 par détail**, puis les **5 du platine**, communs à tous. Nayo a 114 couleurs, Riff 111. Le plafond pratique est **252**.
- Les matières sont **nommées par matériau** : cuir, denim, peau, métal brossé, etc. Chaque matière a son `alt` pour la tenue 2. Sans `alt`, la couleur ne change pas.
- **La tenue 2 garde les mêmes pixels, avec une autre palette.** Elle tranche par sa masse principale, comme le blouson rouge sang de Riff.
- Les détails portent les noms des emplacements d'effets (`EffectSlot`, `tools/sprites/vfx.ts`) : `soundDeep, sound, soundLight, soundCore, soundGlow`, `strikeDeep, strike, strikeLight, strikeCore, strikeGlow, strikeSmoke`, `trail, trailFaint, dustLight, sandDeep, sand, sandLight, ink`. **Les couleurs d'effets des planches sont exactement celles de `hit-styles.ts`**, comme le vérifie le test de Riff, « drawn in her own effect colors only ».
- **Changer la palette décale les numéros** : ajouter une matière décale tous les détails, et ajouter un détail décale le platine. Les planches déjà dessinées sont alors refusées. **La palette se fige à la porte 2**, avant toute retouche (`aseprite.md`, « Quand les données du jeu changent »).

**Le stage**
- Le décor reste entre 10 et 40 % de valeur, et aucun aplat saturé « cyan ou magenta » n'entre dans la bande de 20 à 110 px derrière les combattants (combat-v2 §12.1). La couleur du 3e s'ajoute à cette liste.
- Les flashs se mesurent sur les grandes couleurs du stage (`FIGHT_STAGE_COLORS`, `src/render/stage-view.ts`), celles de la rue devant L'Entrepôt (`src/art/rue/colors.ts`), et sur la boîte grise sans elle.

### 4.8 Le design

*Fichiers : `tools/sprites/<perso>/body.ts`, `head.ts`, `face.ts`, `look.ts` et `index.ts`, sur le modèle de `tools/sprites/riff/`.*

**La case** (`src/art/types.ts`, `tools/sprites/cell.ts`), commune à tous, qu'on n'agrandit pas pour un colosse :
- 256 × 256 px de sprite par image (`CELL_SIZE`), à 2 px de sprite par px du monde (`ART_SCALE`) ;
- les pieds sur l'ancre (128, 248) (`ANCHOR`) ;
- au moins **4 px vides** à gauche, à droite et en haut, effets compris (`CELL_MARGIN`) ;
- rien sous la rangée 250 (`LOWEST_ROW`) ;
- les pieds entre les rangées 246 et 250 sur `idle`, les deux marches, `crouch` et `block` (`GROUNDED_STRIPS`).

Cela donne **122 px du monde de haut au plus**, bras levés compris, et ±62 px de large. La case borne donc aussi l'allonge dessinée (§3.1, point 4). Tests : `tests/tools/riff-sprites.test.ts` et `sprites.test.ts` (« stays inside its cell », « feet stand on the ground line »).

**La silhouette**
- Garde de Nayo : 79 px ; de Riff : 73 px, mesurés sur `idle` image 0.
- Un colosse reste vers 96 px au plus, sur les poses du gros plan du Finisher (§4.6). La prise impose aussi deux hauteurs, mesurées sur les poses résolues de toutes les images (le test, lui, juge chaque tic ; `hold-pairs.test.ts` tient les poings entre 14 px sous la base du cou et 8 au-dessus) :
  - pour être tenu par Nayo et Riff, son cou dans `held` doit tomber environ **entre 49 et 58 px**. Les poings de Nayo et de Riff, sur `hold` et `pummel`, vont de 44 px (Nayo, `pummel`) à 57 px ;
  - pour les tenir, ses poings dans `hold` et `pummel` doivent tomber environ **entre 45 et 58 px**. Le cou de Nayo dans `held` va de 57,3 à 58,8 px, celui de Riff de 50 à 51,5 (image 1, puis image 0).
- **Ses lancers se jouent sur les planches des victimes**, déjà dessinées pour une projection d'épaule debout : `held`, `thrownBack` et `thrownFall` de Nayo et de Riff (`src/render/animation.ts`). Son `throwBack` suit leur arc : `hold-pairs.test.ts` exige que les poings du teneur portent la nuque le long de cet arc (« every thrownBack strip is drawn for a standing thrower »), et le monkey flip de Riff y est déjà un échec connu (`it.fails`). Son `throwForward` les couche par leurs réactions existantes. Un suplex, un piledriver ou une prise basse demande une 2e planche de victime chez Nayo et Riff, dans des fichiers chauds (§6.6) : hors du périmètre de l'agent, à chiffrer pour la session principale, comme le cœur.
- **Le test de hauteur de garde** de son test de planche fixe sa fourchette, comme « 68 à 76 » pour Riff.

**Le corps** (`Body`, `tools/sprites/skeleton.ts`) : épaule, cou, tête, bras, cuisse, tibia, pied, en px du monde.
- Le squelette résout toutes les proportions.
- **Les écarts d'épaules et de hanches négatifs donnent le trois-quarts** (Riff), positifs le profil (Nayo). La règle `farArmBack` ne vaut qu'en trois-quarts.
- Chaque proportion est justifiée dans `body.ts`.

**La garde** est la pose la plus importante.
- `GUARD`, dans `tools/sprites/<perso>/poses/common.ts`, raconte l'archétype à elle seule.
- **L'idle commence exactement sur elle** (« the idle loop starts exactly »).
- Les planches qui en partent et y reviennent restent à 3,5 px d'elle sur chaque articulation (`FROM_GUARD`, `TO_GUARD`, `NEAR = 3,5`).

**La tête** est un dessin, pas un volume (`tools/sprites/stamp.ts`).
- Elle tient dans une grille de caractères, avec sa légende. Celle de Riff fait 33 rangées sur 38.
- Elle est **dessinée de zéro** (§2.4).
- Elle ne tourne pas en garde. Sous 20° d'inclinaison à l'écran, la grille est posée telle quelle ; au-delà, elle tourne par RotSprite.

**Le visage** a **8 expressions** en retouches (`face.ts`) : `focus`, `effort`, `kiai` (au pic d'un spécial seulement), `smirk`, `cool`, `hurt`, `out`, `tired`. Elles restent sobres, sans grand sourire.

**Le détail signature** : un seul, lisible sur un téléphone.
- Ce qui pend passe par un ressort amorti (`Fighter.springs`), comme la frange et la chaîne de Riff. Les éléments longs et flottants sont durs à animer.
- Le détail a une histoire et une suite dans le Finisher.

**Le dessin par volumes** (`tools/sprites/raster.ts`) :
- 5 tons, éclairés du haut et de l'avant ;
- un contour de 1 px, plus doux côté lumière ;
- les membres lointains un ton plus sombre ;
- les petites pièces mates.

Comme Riff, il garde un ordre de dessin fixe (`look.ts`).

**Les effets de coup et l'énergie** :
- la forme de gerbe, `slash` ou `claw`, avec ses couleurs ;
- la forme des étincelles des planches (`EffectStyle.sparkle` : `'cross'` pour Nayo, `'diamond'` pour Riff) ;
- les effets platine des Remix.

Une forme neuve est du code (§4.11).

### 4.9 Les animations

*Fichiers : `tools/sprites/<perso>/poses/` (un fichier par planche, avec `ANIMATED` et `POSES`), `src/art/<perso>/sheets.ts` et `clips.ts`. Tests : `src/art/validate.ts` (`validateArt`, au début de chaque match), `tests/art/<perso>.test.ts`, `tests/tools/<perso>-sprites.test.ts`.*

**Ce que le jeu attend** :
- **32 clips d'état** (`STATE_CLIP_IDS`) ;
- **un clip par coup que le perso a** : les 15 obligatoires, et chaque optionnel défini ;
- **un clip de vol** par coup à projectile (`FighterArt.projectiles`), et aucun pour un coup qui n'en tire pas.

L'échelle de référence est **Riff : 46 planches, 286 images**. Nayo en a 48 et 321, dont ses 2 planches de projectile.

**Les égalités exactes de `validateArt`** :
- le clip de chaque coup dure démarrage + actif + récupération ;
- `preJump` = `preJumpFrames` et `landing` = `landingFrames` ;
- `knockdown` + `getup` = `knockdownFrames`, soit **40** ;
- `tech` = **14** (`THROW_TECH_STUN`) ;
- `thrownBack` = le démarrage de son `throwBack`, soit **14**.

`intro` dure 90 tics (`INTRO_FRAMES`) par convention, comme Riff (`[10, 8, 8, 8, 10, 8, 8, 10, 10, 10]`, `src/art/riff/clips.ts`), mais `validateArt` ne le vérifie pas : l'écrire dans `tests/art/<perso>.test.ts`, `clipDuration(clips.intro) === INTRO_FRAMES`.

Le générateur lit **les tics des clips** pour les ressorts : un clip faux donne une frange fausse.

**Les planches**, sur le modèle de Riff (`src/art/riff/sheets.ts`, `clips.ts`). Les images de Riff sont un repère. Les durées du 3e suivent **ses** données.

| Planche | Images (Riff) | Clips | Ce qu'elle montre |
|---|---|---|---|
| `idle` | 8 | idle, en boucle | la garde qui respire ; image 0 = `GUARD` exactement ; sert au portrait découpé et à l'écran de sélection |
| `walkForward`, `walkBack` | 10, 10 | en boucle | la marche, pieds plantés ; la foulée couvre `vitesse × durée de la boucle` |
| `crouch` | 6 | descente, puis boucle | se baisser, puis tenir accroupi |
| `jump` | 6 | preJump [0], jump [1-4], landing [5] | pré-saut, montée, sommet, descente, réception |
| `jumpForward` | 7 | preJumpForward [0], jumpForward [1-6] | le saut avant, avec son identité (Riff : un salto) |
| `dashForward` | 6 | dashForward ; boostCancel (le Rewind) reprend des images | le dash |
| `dashBack` | 6 | dashBack | le retrait |
| `block` | 6 | blockStand [0-2], blockCrouch [3-5] | la garde haute et basse ; la dernière image est la garde de proximité |
| `hitHigh`, `hitMid`, `hitLow` | 5 chacune | la réaction entière ; la version courte `…Light` [0,1,4] | encaisser en haut, au milieu, en bas |
| `hitCrouch` | 3 | | encaisser accroupi |
| `trip` | 4 | dernière image tenue pendant le vol | fauché, sur le dos |
| `airHit` | 4 | airHit ; thrownFall [2,3] | frappé en l'air |
| `knockdown`, `getup` | 6, 5 | 40 tics à eux deux | au sol, puis relevé |
| `ko` | 8 | ko ; koLanding depuis l'image où le corps touche le sol | le KO |
| `held` | 2 | boucle, rejouée à chaque coup de tabassage | tenu par l'autre |
| `thrownBack` | 4 | 14 tics | projeté par-dessus l'épaule adverse |
| `tech` | 4 | 14 tics | le dégagement |
| `standLight`, `chainLight`, `lightFinisher`, `forwardLight` | 5, 6, 7, 6 | un clip chacun | la chaîne légère et le coup avant |
| `standHeavy`, `chainHeavy`, `forwardHeavy`, `backHeavy`, `chainLaunch` | 7, 6, 8, 7, 7 | `chainHigh` reprend des images de `forwardHeavy` | les lourds, l'overhead, les lanceurs |
| `crouchLight`, `crouchHeavy` | 5, 8 | | coup bas, balayage |
| `jumpLight`, `jumpHeavy` | 5, 6 | | les coups sautés |
| `special`, `specialForward`, `specialAntiAir` | 8, 9, 8 | chaque Remix rejoue la planche de son spécial, avec `fx: '<id>Boost'` | les spéciaux et leurs Remix |
| `grab`, `hold`, `pummel`, `throwForward`, `throwBack` | 6, 2, 4, 7, 8 | `throwBack` : côté changé au tic 6, lâcher au tic 14 | la prise |
| `intro` | 10 | 90 tics | l'entrée, qui raconte quelque chose |
| `victory` | 8 | boucle depuis 4 | la victoire, jouée en entier à chaque round (V1) |
| `timeOver` | 4 | boucle | le temps écoulé |
| `super` | 9 | | la super |
| *(projectile)* | 8 chez Nayo | effets seuls, sur l'horloge du match | si le 3e a un projectile, avec sa version platine |

**Les numéros d'images à garder** (`animation-plan.md` §0, « les clés gardent leur numéro dans leur bande ») :
- une réaction debout fait 5 images, et sa version courte se joue sur [0,1,4] pour un étourdissement de moins de 18 tics ;
- dans `block`, les images 0 à 2 sont debout et 3 à 5 accroupi ;
- la dernière image d'une réaction est la garde de proximité ;
- les images 2 et 3 d'`airHit` servent à `thrownFall` ;
- `koLanding` part de l'image du contact au sol ;
- les images 0 et 5 de `jump` sont le pré-saut et la réception ;
- un enchaînement et le Rewind **reprennent** des images, sans en dessiner.

**L'anatomie** (D25 à D27, `tools/sprites/anatomy.ts`, `npm run sprites:anatomy -- <perso>`, `tests/tools/anatomy.test.ts` avec `ALLOWED = []`, soit aucune exception).

**Attention, faux vert.** `tools/sprites/anatomy-report.ts` ne connaît que Nayo et Riff, et prend tout autre argument pour un nom de planche. Tant que le 3e n'y est pas inscrit (PR 0, ou sa ligne en PR B), `npm run sprites:anatomy -- <perso>` lit Nayo et Riff, ne trouve aucune planche nommée `<perso>` et affiche « 0 hors limites, 0 à juger » sans rien lire. Le critère « 0 limite dure » ne compte donc qu'avec une sortie qui nomme des planches du 3e, et avec `tests/tools/anatomy.test.ts` (`[NAYO, RIFF]`, « keeps every frame of every strip… ») qui boucle sur lui.

Les limites dures :

| Limite dure | Seuil |
|---|---|
| `kneeBackward` | genou plié à l'envers, au-delà de 8° |
| `kneeFolded` | tibia dans la cuisse, au-delà de −165° |
| `elbowFolded` | avant-bras dans le biceps, au-delà de 155° |
| `elbowReversed` | coude plié à l'envers **à l'écran**, même de trois quarts (D26), au-delà de −10° |
| `shoulderBehind` | bras levé derrière le dos, au-delà de −60° |
| `farArmBack` | en trois-quarts, bras lointain tiré en arrière (au-delà de −15°) et plié (D27) |
| `hipBehind`, `hipFolded` | au-delà du grand écart (−100°), cuisse dans le ventre (165°) |
| `ankleBentUp`, `ankleBentDown` | cheville écrasée (sous 45°), pied replié (au-delà de 185°) |
| `neck` | tête inclinée de plus de 50° |
| `inHead` | coude ou poignet dans la tête |

**Les règles qu'aucun test ne mesure** :
- pas d'« aile » : le bras arrière pend, coude sur les côtes (D26) ;
- pendant qu'un bras frappe, le lointain revient en garde ou pend souple (D27) ;
- le bras qui frappe n'est jamais verrouillé tout droit. Le coude reste souple, et l'allonge vient du buste et des hanches : environ **1,2 ×** la longueur du bras en garde à l'écran.

**Les tests de planche**, sur le modèle de `tests/tools/riff-sprites.test.ts` :
- **la portée** : aux images actives, le membre atteint le bord lointain de la hitbox, de −3 à +4 px, et de −2 à +3 au bout du pied pour un coup bas. Un anti-air se mesure aussi vers le haut (`reachCheck`) ;
- **chaque coup qui frappe a sa planche, animée** ;
- **pas de corps-à-corps au neutre**, à des seuils propres à chaque perso : Riff, corps à 14 px et pieds à 17 debout, 16 et 19 accroupie, au-dessus de ses tibias (12 px, `riff-sprites.test.ts`) ; Nayo, la demi-pushbox + 1 pour le corps et + 4 pour les pieds (`sprites.test.ts`). Le 3e fixe les siens sur ses boîtes ;
- **l'entrée et la sortie de garde** à 3,5 px près ;
- **la prise** dans les 9 sens à trois (`hold-pairs.test.ts`) : les poings sur le col, la nuque dans les mains pendant le lancer arrière ;
- **le contact visible** des coups bas à leur portée maximale, à 1 px près (`visible-contact.test.ts`) ;
- **les hurtbox contre le dessin** à ±1,5 px (`hurtboxes.test.ts`).

**L'interpolation à venir, F2** (`animation-plan.md` §3.3). Elle calculera des images intermédiaires en espace articulaire, dessinées d'avance : D23 interdit d'interpoler entre deux tics.
- Elle ajoutera `tools/sprites/<perso>/smoothing.ts` et `src/art/<perso>/played.ts`, généré, et `sheets.ts` gardera le nombre de **clés**.
- Restent figés : les images actives, celle d'avant, la fin d'étourdissement, et toute transition qui traverse un changement de boîte. Les paires de prise et les clips du Finisher en sont exclus.
- Ses planches pilotes sont les vols, les chutes, le KO, les réactions, les dashs et `standHeavy`.

Pour le 3e : des poses claires, qui s'interpolent bien. Si F2 arrive avant ses planches, il ajoute un `smoothing.ts` sans lissage. Le lissage de toutes les planches (F4) est coupé (D29).

**Ce qui vient plus tard, et n'est pas dans la v1** : les 2 morts par perso, le lot de réactions variées et la vie au repos (`animation-plan.md` §4 à §6). Ce sont des clips optionnels avec repli. Le 3e prépare seulement la forme de chaque coup (`straight`, `hook`, `overhead`, `uppercut`) dans sa spec, pour la future table `blows.ts`.

### 4.10 Le portrait

- **Par défaut**, le portrait est un carré découpé dans `idle` image 0 (`FighterArt.portrait {x, y, size}`, `src/art/<perso>/index.ts`), validé par `validateArt`. Nayo : `{30, 0, 56}` ; Riff : `{28, 4, 58}`.
- **Le portrait dessiné**, `art-src/<perso>/portrait.png`, fait **96 × 96 px**, en une image, dans les **numéros de la palette du perso**, sans marge et non vide (`PORTRAIT_SIZE`, `tools/sprites/drawn.ts` ; tests `tests/tools/aseprite.test.ts`, `tests/ui/fighter-select.test.ts`).
  - Le gabarit part d'un carré de 48 px autour de la tête d'`idle` image 0, agrandi ×2 (`portraitStart`, `tools/sprites/aseprite-template.ts`).
  - Le portrait n'est pas en atlas.
- **Ce qu'il montre** : l'expression qui dit le registre, et le détail signature. Le sang reste léger (une lèvre fendue au plus).

### 4.11 Les effets

- **Deux calques.** Les traînées (`smear`) sont dessinées derrière le corps, dans la planche du corps. Tout le reste va dans `fx/<planche>.png`, par-dessus les deux combattants. Une planche sans effet avant n'a pas de fichier `fx/`.
- **Les 10 sortes d'effets** (`Effect`, `tools/sprites/skeleton.ts`, dessinées par `vfx.ts`) : `smear`, `energy`, `disc`, `flash`, `ring`, `speed`, `column`, `shards`, `shield`, `dust`. Un projectile neuf demandera sans doute une sorte neuve : c'est du couloir pipeline, à signaler.
- **Le platine** (D18, combos-v3 §1.8.7). Un Remix joue la planche de son spécial, et ses effets s'appellent comme lui (`Clip.fx: 'specialBoost'`). Le code les redessine en blanc, sauf s'ils sont dessinés à part (`art-src/<perso>/fx/specialBoost.png`).
- **Le budget de flashs** (`docs/flashs.md`, D21) :
  - un flash, c'est ΔL ≥ 0,10 sur plus de 1 200 px² du monde ;
  - au plus 3 par seconde, dont 1 réservé au climax ;
  - aucun voile ne change la scène de plus de ΔL 0,08.
- **La règle d'art testée** : un effet de planche ne dépasse **300 px² du monde** à ΔL ≥ 0,1 que dans une liste fermée (`tests/render/flash-areas.test.ts`). Aujourd'hui, ce sont l'anti-air, son Remix et la super de Nayo, et la super de Riff. Toute planche du 3e qui dépasse s'ajoute **exprès** à la liste, ou reste dessous. Un zoner qui couvre l'écran d'effets est visé en premier.
- **La gerbe d'impact** reprend `slash` ou `claw`, avec ses couleurs. La table `SPARK_AREAS` (`src/render/flash-areas.ts`) est contrôlée à 10 % près : une énergie plus claire ou plus sombre que celle de la forme d'origine peut faire rougir le test.
  - **Une forme neuve est du code de rendu** : l'union `shape`, `HitFx.play` (`src/render/hit-fx.ts`), la dissolution (`dissolveStyleOf`, `src/render/dissolve.ts`) et une ligne mesurée de `SPARK_AREAS`. C'est pour la session principale.
- **La dissolution** (`docs/art/dissolution.md`) vient de la forme : `claw` donne `scatter`, les autres `rise`.

### 4.12 Hors périmètre

| Quoi | Pourquoi | À qui |
|---|---|---|
| **Les sons** : un son neuf, le thème du Crossfader | le propriétaire composera plus tard ; `src/audio/sfx.ts` est pris (PR 4 du Finisher, lot 2 du polish) | proposés dans la spec ; faits plus tard |
| **L'IA** : `PLANS`, `src/ai/plans.ts` | intégration | session principale (PR F) |
| **L'aide relue**, `BASICS` qui cite Nayo et Riff | intégration | session principale (PR F) ; l'agent écrit le brouillon de `texts/<perso>.ts` |
| **L'équilibrage** : anti-infini, garantie du Finisher, routes du CPU | intégration | session principale (PR F) |
| **La scène du Finisher**, une pièce neuve | code de rendu | session principale |
| **Une mécanique de cœur** | §4.3.5 | session principale, après sa décision Dxx |
| **Une 2e planche de victime** (suplex, piledriver, prise basse) | planches de Nayo et de Riff, fichiers chauds (§4.8) | session principale, chiffrée dès la porte 0 |
| **La pose `finale`** | `victory` sert de repli ; Nayo et Riff ne l'ont pas encore (PR 4) | plus tard |
| **Les morts, les réactions variées, la vie au repos** | chantiers M, R et P du plan d'animation | plus tard |
| **Un 2e stage, le Crossfader** | pas codés | plus tard |
| **`docs/combat-v2.md`** (journal, §6, §10, §17) et **`CLAUDE.md`** | fichiers de la session principale | l'agent propose les passages dans sa spec ; la session principale les reporte |

---

## 5. Les portes de validation

**La règle** (`animation-plan.md` §0, règle 1) : « on prouve avant de dessiner ». Chaque porte se montre :
- **à l'échelle d'un téléphone** : la vue de 480 × 270, zoom ×1,45 au plus ;
- dans **les deux tenues** ;
- à vitesse réelle et au ralenti, ½ et ¼ ;
- **à côté de Nayo et de Riff**, quand ils font le même rôle.

Si le propriétaire ne voit pas la différence, ou n'aime pas, on corrige dans la même porte, avec un nouvel avant/après.

| Porte | Casquette | L'agent livre | Le propriétaire voit, et comment | Il valide | PR | Estimation |
|---|---|---|---|---|---|---|
| **0. Les concepts** | game design | 3 fiches (§3.1), le tableau comparatif, la planche de silhouettes (§3.2), une recommandation, les questions | le message de la porte 0 et ses deux images, dans la conversation (§3.3) | **un concept**, ou un mélange ; données seules ou cœur | aucune | 0,5 jour |
| **1a. La bible** | game design | `docs/<perso>.md` : identité, histoire, scènes, répliques, tous les coups et leur frame data, cordes, routes calculées, Boost, super, Finisher en storyboard, couleurs des deux tenues, fiche de design ; la silhouette retenue | la spec, la table des coups avec « ce qu'on voit », les 3 forces et 3 faiblesses, la silhouette mise au propre à côté de Nayo et Riff | les **coups**, les **noms**, les **enchaînements**, l'**histoire**, le **Finisher** sur papier, les **couleurs** | A | 0,5 à 1 |
| **1b. La boîte grise** | game design, QA | les données validées et leurs tests ; le perso jouable en `npm run dev` sur la branche d'essai (§6.4). Pas de film : `anim:film` et `anim:compare` filment des planches, et un perso sans art n'a rien à filmer | le perso en boîtes contre Nayo et Riff, en jeu : l'entraînement avec les boîtes et l'avantage (depuis la pause), des captures d'écran, les chiffres des tests (vitesses, portées, l'outil signature, les combos de la spec) | « **il se joue comme promis** ». **Les données se figent ici.** | A | 1 à 1,5 |
| **2. La garde et 3 coups signatures, en jeu** | art et pipeline | le corps, la tête, le visage, le look, la palette des deux tenues ; toutes les planches en garde tenue ; `idle` et les 3 planches signatures animées ; l'anatomie à 0 limite dure | la garde animée, ×1 et ×2, à côté de celles de Nayo et Riff ; les 3 coups en jeu (films, branche d'essai) ; le portrait découpé | la **silhouette**, les **couleurs**, le **visage**, les **coups signatures**. **La palette se fige ici.** | B | 1 à 1,5 |
| **3. Toutes les planches** | art et pipeline, QA | en trois lots : **3a** bouger, garder, encaisser, tomber, gagner ; **3b** les normaux, les cordes, les sauts, la prise ; **3c** les spéciaux, les Remix, la super, les effets ; les boîtes mesurées et recalées ; les tests de flashs sur ses couleurs | les aperçus avec leurs boîtes (`npm run sprites:preview`) ; pour chaque lot, un film contre la même séquence jouée par Riff ; les combos de la spec en film, gerbes incrustées, au ralenti | le **mouvement**, le **poids**, la **lisibilité** de chaque coup, les **enchaînements** joués en phrase, les **effets** ; un « oui » par lot | C | 3 à 4,5 |
| **4. En jeu complet** | art et pipeline, puis production | la garde, le portrait de 96 px et les 2 ou 3 coups signatures retouchés à la main ; la mémoire vidéo mesurée ; le perso entier sur la branche d'essai | **avant/après** de chaque retouche, côte à côte ; le portrait sur l'écran de sélection ; des matchs complets contre Nayo et Riff, dans les deux tenues | « **c'est fini** ». Puis viennent l'allumage (PR E) et l'intégration (PR F), puis la publication par la session principale | D, puis E | 1 à 2 |

Toutes les durées sont des **estimations** en jours-agent, pas des mesures. Côté agent, l'ensemble tourne autour de 7 à 11 jours-agent.

**Entre les portes**
- **On ne passe pas une porte sans son « oui ».**
- **Les données se figent à la porte 1b, la palette à la porte 2.** Une frame data changée ensuite oblige à recaler les clips, et souvent les poses. Une palette changée décale les numéros de couleur. Les hurtbox font exception : elles sont recalées sur le dessin aux portes 2 et 3.
- **L'anatomie passe à zéro dès la garde**, une fois le 3e inscrit dans `anatomy-report.ts` (§4.9, le faux vert). Chez Riff, les reprises d'anatomie après les retours du propriétaire ont coûté plus cher que tout le reste.
- **Les retouches à la main viennent en dernier.** Une planche dessinée remplace **toute** la planche du code et fige ses poses. Les tests de `tests/tools/` et `npm run sprites:anatomy` ne jugent que les poses du code (`aseprite.md`, « Ce qui ne suit pas les dessins »). Le dessin reste donc sur la pose du code : même membre actif, même silhouette. Puis on relance `npm run measure-boxes`, qui juge le dessin.
- **Si le concept demande du cœur**, l'agent s'arrête après la porte 1a. La session principale fait d'abord la PR de cœur (sa décision Dxx, replays expliqués, preuve anti-infini), puis la boîte grise reprend dessus.
- **Chaque livraison** donne une courte liste « **Ce qu'il faut regarder** », de 3 à 5 points concrets, et **une seule question**, avec son hypothèse : « Valides-tu la garde ? Hypothèse : oui, je passe aux déplacements. »

**Les retours passés du propriétaire, à vérifier avant de montrer**

| Retour | Devenu | Contrôle |
|---|---|---|
| « tu ne respectes pas très bien l'anatomie » | D25 | `sprites:anatomy` à 0 limite dure, sur une sortie qui nomme ses planches (§4.9), et relu à l'œil, à taille réelle |
| « bras replié en angle droit avec coude bizarre en arrière » | D26 | aucun coude plié à l'envers à l'écran |
| « un bras qui frappe trop long » | D27 | coude souple, environ 1,2 × la longueur en garde |
| « je vois pas trop la différence » | `animation-plan.md` §0 | une amplitude visible à l'échelle du téléphone, et l'avant/après côte à côte |

---

## 6. Le découpage en PR et la méthode

### 6.1 Les PR

Le perso reste **hors du roster jusqu'à la PR E**. Le jeu en ligne ne change donc pas, les 31 replays dorés ne bougent pas, et chaque PR se fusionne seule.

| PR | Branche proposée | Contenu | Touche hors du perso | Ordre |
|---|---|---|---|---|
| **0** | `feat/<perso>-registre` | **Un refactor, sans changement de comportement** : une seule liste des combattants pour les outils, à la place des listes en dur de `generate.ts`, `templates.ts`, `preview.ts` (une option par perso à la place de `--riff`), `anatomy-report.ts`, `measure-boxes.ts` et `frame-data.ts`. Les tests d'outils la lisent (`tests/tools/fighters.ts`, `anatomy.test.ts`, `atlas.test.ts`, `sprites.test.ts`). Les sorties restent identiques, octet pour octet | le couloir pipeline | la première, petite, **avant F2** (même `generate.ts`). Qui la fait : §8, question 7 |
| **A** | `feat/<perso>-jeu` | portes 1a et 1b : `docs/<perso>.md`, ses sections dans `histoire.md` et `univers.md`, `src/data/fighters/<perso>*.ts`, `src/data/texts/<perso>.ts` ; les tests de données (§7.2) | des lignes de tests | en parallèle de la PR 0 |
| **B** | `feat/<perso>-art-1` | porte 2 : `tools/sprites/<perso>/`, `src/art/<perso>/` (dont les fichiers générés), `tests/art/<perso>.test.ts`, `tests/tools/<perso>-sprites.test.ts`, son entrée au registre des outils | une ligne du registre | après A et la PR 0 |
| **C** | `feat/<perso>-art-2` (C1, C2 au besoin) | porte 3 : les autres planches, les bandes `fx/`, les hurtbox de coups recalées, les tests de flashs étendus | des lignes de tests | après B : **une seule PR d'art ouverte à la fois** pour ce perso (`clips.ts` et `sheets.ts` sont communs) |
| **D** | `feat/<perso>-retouches` | porte 4 : `art-src/<perso>/*.png` (et les `.aseprite`), `portrait.png`, et ce que `npm run sprites -- <perso>` régénère | — | après C, palette figée |
| **E** | `feat/<perso>-allumage` | l'id dans `FighterId`, l'entrée de `ROSTER`, `ART_BY_FIGHTER`, `STYLES`, `MOVE_TEXTS`, `SCRIPTS` (en données, avec les pièces existantes), `SIREN_ROOTS`, `ARTS` et `CELLS` des outils d'animation ; les tests en dur qui reviennent à l'agent | une ligne dans 8 fichiers chauds | **après la PR 4 du Finisher** (la PR 5, #70, est fusionnée), rebasée juste avant |
| **F** | session principale, **empilée sur E** | `PLANS`, l'aide relue, l'équilibrage, les tests restants, la scène du Finisher, les docs, `CLAUDE.md`, la décision du journal | — | **fusionnée avec E** : un perso sans plans ne combote jamais contre le CPU |

### 6.2 La charte appliquée

- **Les priorités de `CLAUDE.md`** : le jeu fun et lisible, puis ce qui est livré marche, puis le périmètre tient, puis le code reste facile à reprendre. La boîte grise passe avant l'art, et une liste de coupes est tenue dans `docs/<perso>.md`.
- **La règle de décision** : la solution la plus sûre, puis la plus simple, la plus lisible, la plus testable, la plus facile à faire évoluer. On dit ce qu'on sacrifie, et pourquoi. Par exemple : les données seules plutôt que le cœur ; un registre factorisé à la 3e répétition, mais dans un refactor séparé.
- **Une casquette à la fois, et on la dit** : « Casquette : game design. » Game design aux portes 0 et 1, art et pipeline aux portes 2 à 4, QA et production à chaque fin de PR. La sortie n'appartient pas à l'agent.
- **Le protocole** :
  - demander plutôt que supposer, toujours avec une hypothèse de départ ;
  - établir la topologie avant du code non trivial : où vit l'état (données, clips, poses), où vit le retour d'info (aperçus, films, tests), ce qui casse si on retire, l'ordre (données, clips, poses, boîtes mesurées, données) ;
  - un diff minimal. Ce qui mérite une correction ailleurs est **signalé, pas modifié** ;
  - dire l'incertitude avant d'agir ; un test rouge est annoncé rouge.
- **La clôture de Chesterton** : avant de toucher une règle d'outil ou de test qui gêne (une limite d'anatomie, un seuil de flash), on comprend pourquoi elle existe. **On adapte le dessin, pas la règle.**
- **Un test qui n'échoue jamais ne teste rien** : pour chaque test ajouté, on casse exprès la donnée une fois, on le voit rougir, et on le dit dans la PR.
- **Les terriers de lapin à signaler** :
  - une mécanique de cœur qui n'est pas indispensable au concept ;
  - retoucher le squelette partagé ou la cinématique inverse pour un corps hors norme ;
  - une forme d'impact neuve, un moteur de son ;
  - refaire tous les tests pour qu'ils bouclent sur `ROSTER` : c'est utile, mais c'est une tâche séparée, à proposer.

### 6.3 Les conventions du dépôt

- Les docs et les messages de commit sont en français, les commentaires du code et les identifiants en anglais.
- **Les messages de commit** suivent la forme `type(portée) : phrase en français`, avec une espace avant le deux-points : `feat(art) : …`, `docs : …`, `test(…) : …`. Un corps dit **pourquoi**, en tirets courts, puis viennent les lignes d'attribution de **sa** session.
- **Pas de `git add -A`.** On ajoute fichier par fichier, ou dossier par dossier pour son perso, et on relit `git status` avant chaque commit.
- **Après `npm run sprites`, on vérifie `git status`.** On préfère `npm run sprites -- <perso>` : un passage complet réécrit aussi `public/icons/`, `src/ui/title-vinyl.png` et `src/art/rue/`. Deux passes de suite doivent donner les mêmes octets.
- **Les fichiers générés ne s'éditent pas** : `cells.ts`, les PNG, les JSON d'atlas, et plus tard `played.ts`. Après un rebase, on régénère au lieu de résoudre un conflit à la main.
- **Jamais commités** (`.gitignore`) : `art-src/gabarits/`, `tools/sprites/preview/`, `tools/aseprite/dist/`, `tools/anim/out/`.
- **Avant de pousser**, on lance ce que fait la CI (`.github/workflows/ci.yml`) :

  ```bash
  npm ci
  npm audit --audit-level=high
  npm run format:check
  npm run lint
  npm run typecheck
  npm test
  npm run aseprite:check   # demande lua5.4
  npm run build
  ```

- **Ouvrir une PR brouillon** se fait par l'API REST, parce que `gh pr create` passe par GraphQL, refusé dans les sessions :

  ```bash
  gh api repos/Alex-Lou/NayosBeat/pulls -X POST \
    -f title='feat(<perso>) : …' -f head='feat/<perso>-…' -f base=main \
    -F draft=true -F body=@/chemin/vers/corps.md
  ```

### 6.4 Montrer sans allumer : la branche d'essai

Pour filmer ou faire jouer le perso avant la PR E :
1. une branche **locale** `essai/<perso>`, jamais poussée sans accord, part de sa branche de travail ;
2. elle ajoute l'id dans `FighterId` et les entrées que la compilation exige, plus **l'entrée de `ROSTER`** (sans elle, le perso n'est pas sélectionnable, et la compilation ne l'exige pas), puis `ART_BY_FIGHTER`, `ARTS` et `CELLS` dès qu'il a de l'art ;
3. on joue (`npm run dev`, sur le réseau local), dès la porte 1b. On filme à partir de la porte 2 seulement, quand il a des planches (`anim:film` lit `ARTS`, `anim:compare` les PNG de `src/art/`). `npm run anim:film -- cpu:<graine>` joue toujours Nayo contre Riff (`cpuTake` a ces deux combattants par défaut, et `main()` n'a pas d'option de combattants) : sur la branche d'essai, passer les combattants à `cpuTake` (une option locale, jamais poussée), ou filmer un replay d'essai dont `fighters` nomme le 3e (`npm run anim:film -- chemin/essai.json`). Puis `npm run anim:compare -- avant.json apres.json --note "…"` en fait une page HTML autonome ;
4. la branche est jetée, et la PR dit ce qui a été essayé et comment.

### 6.5 Mise en ligne, journal et replays

- **D30** : « une PR est fusionnée et publiée dès que la CI est verte et que tout est vérifié, puis le résultat est montré au propriétaire ». Ce n'est pas l'agent qui le fait. L'agent :
  - pousse **sa** branche ;
  - ouvre la PR **en brouillon** ;
  - la garde **rebasée** sur `origin/main` (`git fetch origin && git rebase origin/main`, puis `git push --force-with-lease` sur sa branche seulement) et **verte** ;
  - dit « prête pour revue » dans la PR et dans son rapport.

  La session principale relit, fusionne, publie et montre le résultat. Une fois la revue commencée, l'agent ne réécrit plus l'historique sans le dire.
- **Le journal des décisions** (combat-v2 §0.2) : l'agent n'y écrit pas. Sa PR contient une section « **Décision proposée pour le journal** », avec une ligne prête à coller, numérotée « D<prochain numéro libre> (à confirmer) » : le journal s'arrête à D32 (la PR #69, fusionnée). Le numéro se vérifie dans `docs/combat-v2.md` §0.2 **et** dans les PR ouvertes, au moment de chaque PR. La session principale l'inscrit après la fusion, dans un commit `docs(journal) : …`, comme D31 (`9a40bca`).
- **Les replays dorés** (`tests/core/replays/`, 31 fichiers) : **aucun ne doit bouger**. S'il en rougit un, la PR a touché ce qu'elle ne devait pas : on revient en arrière, on cherche la cause, et on la signale. **L'agent ne lance jamais `npm run replays:update`.** Seul l'instantané des portées (`tests/data/__snapshots__/ranges.test.ts.snap`) se réenregistre exprès. Dans `tests/data/ranges.test.ts`, `FIGHTERS` sert aussi de liste des **défenseurs** de chaque tableau : l'étendre ajoute deux colonnes (contre <perso>, debout et accroupi) à chaque ligne des tableaux de Nayo et de Riff, l'en-tête codé en dur (`'against             Nayo  crouch  Riff  crouch'`) est à étendre, et un bloc `it("<Perso>'s")` s'ajoute. On réenregistre avec `npx vitest run -u tests/data/ranges.test.ts`. La PR dit : « les tableaux de Nayo et de Riff gagnent deux colonnes, aucune valeur existante ne change ; le bloc de <perso> s'ajoute », vérifié colonne par colonne dans le diff du `.snap`.
- **La mémoire vidéo** : chaque PR d'art annonce son coût mesuré (`docs/art/atlas.md` §3). Le plafond est de 90 Mo dans le pire appariement, miroir compris, avec des pages de 2 048 px au plus (`tests/build/vram-budget.test.ts`, qui lit `ROSTER`, donc dès la PR E). Avant, on mesure à part. Repère : Nayo contre Nayo, le pire aujourd'hui, fait 41,2 Mo.

### 6.6 Ce qui est en cours ailleurs, et les fichiers chauds

Avant chaque PR, on regarde ce qui a bougé :

```bash
git fetch origin && git log --oneline -30 origin/main
gh api "repos/Alex-Lou/NayosBeat/pulls?state=open" --jq '.[] | "\(.number) \(.draft) \(.head.ref) \(.title)"'
```

| Fichier ou dossier | Qui d'autre le touche | Règle |
|---|---|---|
| `src/core/**` | toute mécanique | **jamais** ; une décision Dxx et une PR de la session principale |
| `src/data/fighters/shared.ts`, `nayo*.ts`, `riff*.ts` | les replays | jamais un comportement changé ; une aide **ajoutée**, oui, si rien d'existant ne change |
| `tools/sprites/{generate,sheet,fighter,skeleton,anatomy,cell,drawn,atlas}.ts`, `src/art/types.ts`, `strip-urls.ts` | F2, F3, PR 4 du Finisher | seulement les lignes du registre (PR 0) ; tout autre besoin est signalé |
| `src/art/{nayo,riff}/**`, `tools/sprites/{nayo,riff}/**` | PR 4 du Finisher, morts, réactions | **jamais** |
| `src/render/{animation,sprite-fighter-view,fight-scene,fight-feedback,hit-fx}.ts` | V1, F2, Finisher, qualité adaptative (la cadence #71, la sûreté #73 et le contexte maigre #75 sont fusionnés) | **jamais** |
| `src/audio/sfx.ts` | PR 4 du Finisher, lot 2 du polish | **jamais** |
| `src/render/finisher-scripts.ts`, `finisher-signal.ts`, `src/data/move-texts.ts` | PR 4 du Finisher | une entrée chacun, en PR E |
| `src/render/hit-styles.ts`, `src/art/index.ts`, `src/data/roster.ts`, `tools/anim/{film,compare}.ts` | — | une entrée chacun, en PR E |
| `docs/combat-v2.md`, `CLAUDE.md` | session principale | **jamais dans ses PR** |

### 6.7 Le rapport et la description de PR

**À la fin de chaque tâche**, en français, viennent les quatre rubriques de la charte :
1. **Fichiers modifiés**, avec leurs chemins ;
2. **Ce qui a été modifié**, pour le joueur et pour le code ;
3. **Fichiers intentionnellement non touchés**, et pourquoi ;
4. **Suivi nécessaire** : ce qui reste, à qui, dans quel ordre.

S'y ajoutent :
- **la casquette** ;
- **les vérifications**, commande par commande, avec leurs chiffres (tests passés, exports relus, limites d'anatomie) ;
- **la mémoire vidéo** mesurée ;
- **la décision proposée** ;
- **ce que le propriétaire doit regarder**, et la question de la porte ;
- **les incertitudes**, dites comme telles.

**La description d'une PR** suit les modèles #59, #66 et #67 :

```
## Ce que le joueur voit        (ou « Rien ne change à l'écran : le perso n'est pas encore au roster »)
## Quoi
## Comment
## Mémoire vidéo d'un match     (PR d'art)
## Vérifications (sur main <sha>)
## Limites
## Signalé, non corrigé ici
## Décision proposée pour le journal
## Suivi nécessaire             (pour la session principale)
```

---

## 7. Les fichiers à créer et à modifier

### 7.1 À créer, par l'agent

| Fichier | Contenu | PR |
|---|---|---|
| `docs/<perso>.md` | la spec : identité, frame data, cordes, routes, Boost, super, Finisher, couleurs, design, liste de coupes, passages proposés pour combat-v2 | A |
| `src/data/fighters/<perso>.ts`, `<perso>-strings.ts`, `<perso>-boost.ts` | le `FighterTemplate` exporté `<PERSO>` | A |
| `src/data/texts/<perso>.ts` | `<PERSO>_TEXTS` : titre, chaque coup avec son entrée et son texte (plus de 20 caractères), 7 combos, dont la super puis le Finisher en dernier (§4.4) | A |
| `tests/core/<perso>-combos.test.ts` | ses routes mesurées | A |
| `tools/sprites/<perso>/` | `body`, `palette`, `head`, `face`, `look`, `index`, `poses/common`, `poses/index`, un fichier par planche | B, C |
| `src/art/<perso>/` | `sheets.ts`, `clips.ts`, `index.ts` (avec les atlas, comme Riff après F1), et les fichiers générés (`cells.ts`, PNG et JSON par tenue) | B, C |
| `tests/art/<perso>.test.ts` | `validateArt` sur ses deux tenues, sur le modèle de `riff.test.ts` | B |
| `tests/tools/<perso>-sprites.test.ts` | ses tests de planche, sur le modèle de `riff-sprites.test.ts` | B, C |
| `art-src/<perso>/` | ses planches retouchées, `fx/` au besoin, `portrait.png` (et les `.aseprite`) | D |

### 7.2 À modifier, et ce qui casse si on oublie

**Les listes que le compilateur réclame**, dès que l'id entre dans `FighterId` (PR E) :

| Fichier | Liste | Si on oublie | Qui |
|---|---|---|---|
| `src/data/roster.ts` | `FighterId`, puis une entrée de `ROSTER` (`template`, `description`, `finisher`) | sans entrée, pas jouable ; avec l'entrée mais sans l'art des deux tenues, **test** (`tests/app/select-fighters.test.ts`) | agent |
| `src/render/hit-styles.ts` | `STYLES` | **compile** | agent |
| `src/data/move-texts.ts` | `MOVE_TEXTS` | **compile** | agent (brouillon), relu par la session principale |
| `src/render/finisher-scripts.ts` | `SCRIPTS` | **compile** | agent (en données), pièces neuves par la session principale |
| `src/render/finisher-signal.ts` | `SIREN_ROOTS` | **compile** | agent |
| `tools/anim/film.ts` | `ARTS` | **compile** | agent |
| `tools/anim/compare.ts` | `CELLS` | **compile** | agent |

**Les listes muettes**, qui ne cassent rien si on les oublie :

| Fichier | Liste | Si on oublie | Qui |
|---|---|---|---|
| `src/art/index.ts` | `ART_BY_FIGHTER` (`Partial`) | le perso reste en boîte grise | agent, PR E |
| `src/ai/plans.ts` | `PLANS[<Nom>]` | le CPU ne combote jamais avec lui | session principale |
| `tools/sprites/generate.ts`, `templates.ts`, `frame-data.ts`, `measure-boxes.ts`, `anatomy-report.ts`, `preview.ts` | `FIGHTERS`, `FRAME_DATA`, le choix en dur, `--riff` | ni dessiné, ni gabarit, ni mesuré (`frame-data.ts` : « No frame data »). **Faux vert** : `measure-boxes -- <perso>` et `sprites:anatomy -- <perso>` sortent en 0 sans rien lire (§4.3.4, §4.9) | agent (PR 0, ou une ligne chacun en B) |
| `tests/tools/fighters.ts` | `DRAWN_FIGHTERS` (nourrit `hurtboxes`, `visible-contact`, `hold-pairs`) | ni boîtes, ni contact, ni prise testés | agent, B |
| `tests/tools/anatomy.test.ts`, `sprites.test.ts`, `atlas.test.ts` | `[NAYO, RIFF]`, `FIGHTERS` | anatomie, platine, atlas non testés | agent, B |
| `tests/tools/visible-contact.test.ts`, `hurtboxes.test.ts`, `hold-pairs.test.ts` | `lowHits`, `PENDING`, `DESCENDING`, le cas `lowArc` | ses cas propres non décrits ; chaque exception est une décision écrite, pas un contournement | agent, C |
| `tests/data/fighters.test.ts` | `are valid`, le test d'identité | ses erreurs n'apparaissent qu'au lancement d'un match | agent, A |
| `tests/data/ranges.test.ts` | `FIGHTERS` (attaquants **et** défenseurs), l'en-tête en dur, un `it` par perso ; l'instantané réenregistré exprès (§6.5) | portées non figées | agent, A |
| `tests/data/hitstop.test.ts` | `blows()` lit `MATCH.fighters`. Ne pas toucher `MATCH` de `tests/core/helpers.ts` : c'est un duel (`readonly [FighterTemplate, FighterTemplate]`, `src/core/config.ts`), qu'une cinquantaine de fichiers de tests utilisent par `fightState`. Faire boucler `blows()` sur `[NAYO, RIFF, <PERSO>]` | la loi du gel ne le couvre pas | agent, A |
| `tests/data/shared.test.ts` | `[NAYO, RIFF]` (« gives every moving move one step per frame ») | ses `motion.dx` non vérifiés | agent, A |
| `tests/core/combos.test.ts` | les paires de L, L, L | la garantie du débutant ne le couvre pas | agent, A |
| `tests/core/crossup.test.ts` | `CROSS_UPS` : 15 lignes de plus (5 paires × 3 postures, §4.3.4) | ses cross-ups non figés | agent, A |
| `tests/core/finisher.test.ts` | « the four lights » et « no data of its own » (`[NAYO, RIFF]`) | son Finisher sans les tests 1 et 10 | agent, A, ou session principale |
| `tests/core/moves.test.ts` (« BOOST → move »), `juggle.test.ts` (« the 12th hit floors… »), `jumps.test.ts` (« sends everyone flying with the same gravity… ») | `[NAYO, RIFF]` | ses Boost, sa jongle et ses chutes hors de ces tests | agent, A |
| `tests/render/sprite-loading.test.ts`, `anchor-origin.test.ts` (deux `it.each`), `fx-pixels.test.ts` (`FIGHTERS`), `animation.test.ts` (« starts every victory on its first frame… ») | `[NAYO, RIFF]` | ses atlas, son ancre et son rendu non testés | agent, B ou C |
| `tests/app/select-fighters.test.ts` (« shows %s's bust and each idle frame pixel for pixel… », un `it.each(['nayo', 'riff'])`) ; `tests/render/hit-styles.test.ts` (« in every pairing » ne compare que Nayo et Riff ; l'unicité du triplet ne lit que la tenue 1) | en dur, dans des tests qui lisent aussi `ROSTER` | son buste et ses énergies dans toutes les paires non vérifiés : à étendre à toutes les paires de `ROSTER`, en tenue 1 | agent, E |
| `tests/render/veils.test.ts`, `flash-areas.test.ts`, `fx-strips.ts`, `health-bar.test.ts` | `['nayo', 'riff']`, `ENERGIES`, la liste des planches de plus de 300 px² | pas de vérification photosensible de ses couleurs | agent, C (§8, question 8) |
| `tests/core/beam-search.ts` (`PAIRS`), `finisher-guarantee.test.ts` (`ROUTES`) | ses paires et ses routes | pas de preuve anti-infini, pas de garantie du Finisher | session principale |
| `tests/ai/plan-routes.test.ts`, `plans.test.ts` | `MATCHES`, `OPENINGS`, `MAX_DISTANCE = 90` (faux pour un zoner) | ses plans non testés | session principale |
| `tests/render/flash-cadence.test.ts`, `finisher-*.test.ts`, `finisher-harness.ts`, `tests/ai/finisher.test.ts` (PR 5) | `[NAYO, RIFF]` | sa scène de Finisher et son CPU en balle de match non testés | session principale |
| `docs/art/univers.md` (ligne 3, tableau), `docs/art/histoire.md` | la règle des gabarits ; ses sections | l'univers ne le connaît pas | agent, A |
| `docs/combat-v2.md` (§0.2, §6, §10, §17), `docs/combos-v3.md`, `docs/finisher.md`, `docs/PLAN.md` (le « 3e perso » classé en dérive), `CLAUDE.md` | ses passages | la doc saute un perso | session principale, PR F |

**Les tests qui lisent déjà `ROSTER`** couvrent le 3e d'office, dès la PR E : `tests/app/controls-content.test.ts` (sauf « tells the Finisher… », §4.4), `tests/render/glyphs.test.ts`, `tests/render/flash-areas.test.ts` (« measures every stamp »), `tests/render/finisher-halo.test.ts`, `tests/build/vram-budget.test.ts`. **En partie seulement** : `tests/render/hit-styles.test.ts` et `tests/app/select-fighters.test.ts` (ci-dessus).

**Les autres « Nayo, Riff » en dur** sont des duels fixes, une `MatchConfig` Nayo contre Riff (`counter`, `movement`, `reaction`, `strings`, `hud`, `move-caption`, `finisher-signal`, `training-finisher`, `exchange-helpers`, `replays`…) : à laisser. Pour s'en assurer avant chaque PR : `git grep -ln "NAYO, RIFF\|'nayo', 'riff'" -- tests` (36 fichiers sur `ed9e1d4`), et lire chaque occurrence.

### 7.3 Ce qui ne change pas

`src/core/**`, sauf une mécanique décidée au journal (Dxx). `src/data/fighters/shared.ts`, en comportement. Les données, les planches et les poses de Nayo et de Riff. `src/app/match-setup.ts`, le match par défaut restant Nayo contre Riff. `src/data/stages.ts`. Les 31 replays dorés.

---

## 8. Questions au propriétaire

Chacune vient avec son hypothèse de départ. L'agent les pose à la porte 0, avec ses concepts.

1. **Peut-on prendre une mécanique promise à Kaï, Vexa, Sora ou Kitsune ?** Hypothèse : non. Le 3e prend une mécanique libre (§2.3).
2. **Un concept qui demande du cœur est-il admis ?** Hypothèse : oui, s'il est le meilleur, mais au moins un des trois tient en données seules, et le coût du cœur est chiffré pour les autres.
3. **Le 3e reste-t-il en marge de la finale** (éliminé, gardien des lieux, ancien champion), sans réécrire Nayo contre Riff ? Hypothèse : oui.
4. **Le vert comme couleur dominante ?** Hypothèse : oui, avec une tenue 2 à mesurer (violet ou ambre, avec un `hud` de remplacement si besoin).
5. **Une source visuelle de Zen-Tazzer, comme pour Nayo et Riff ?** Hypothèse : non. Tête dessinée de zéro, sauf s'il en fournit une et confirme ses droits.
6. **Comment juge-t-il la boîte grise ?** Hypothèse : en jeu, sur des captures de l'entraînement (boîtes et avantage) et les chiffres des tests, et en jouant en local (`npm run dev`, le téléphone sur le même réseau) s'il le souhaite. Les films côte à côte commencent à la porte 2, quand il y a des planches (§6.4). Pour la jouer en ligne sans mettre le perso au roster, il faudrait un paramètre d'URL de développement, comme `?anim=avant` : c'est du code d'application, pour la session principale.
7. **Qui fait la PR 0**, le registre des outils ? Hypothèse : l'agent, dès le choix du concept (jamais à la porte 0), petite, avant F2. Sinon, l'agent ajoute une 3e entrée à chaque liste en PR B.
8. **Qui étend les tests de flashs et de rendu** (`veils`, `flash-areas`, `health-bar`) ? Hypothèse : l'agent, dès la PR C, parce que ce sont ses couleurs qui y sont mesurées.
9. **Qui retouche à la main, et avec quoi ?** Le propriétaire a demandé des retouches « dans Aseprite ». Or Aseprite n'est pas installé dans les conteneurs de session, et l'extension n'a jamais tourné dans un vrai Aseprite (PR #59, « Limites »). Trois options :
   - (a) l'agent retouche par le chemin « Sans Aseprite » (`aseprite.md`) : il décode le gabarit, retouche les pixels par script, écrit le PNG indexé avec `encodeIndexedPng`, et `npm run sprites` le vérifie. Il n'y a alors pas de `.aseprite` à commiter ;
   - (b) le propriétaire retouche lui-même dans Aseprite, avec l'extension et les gabarits de l'agent ;
   - (c) Aseprite dans la session de l'agent, si le propriétaire le fournit.

   Une retouche porte sur **la planche entière** (par exemple les 8 images de la garde), pas sur une image clé. Hypothèse : (a), et le propriétaire essaie l'extension **dès la porte 2** (l'installer, « Nouvelle planche… » sur la garde, puis « Exporter vers le jeu »), pas à la porte 4, pour que l'écart se voie tôt.
10. **Un colosse plus large que 28 px de pushbox ?** Hypothèse : non, la masse passe par le dessin et la vie (§4.3.4). Sinon, la session principale revoit le test de prise et les planches de prise.

---

## 9. Définition de « fini »

**Porte 0**
- [ ] 3 concepts au gabarit du §3.1, dont au moins un en données seules.
- [ ] La planche de silhouettes, à l'échelle, à côté de Nayo et de Riff, en deux rangées, avec le cadre du téléphone et les lignes de 100 (et 96) et 122 px.
- [ ] Le tableau comparatif (combat-v2 §6.3) et la colonne de chaque concept dans le tableau du §2.2.
- [ ] `git status --short` vide.
- [ ] Les références voisines vérifiées, et le nom cherché dans les listes de persos.
- [ ] Une recommandation, ce qu'elle sacrifie, les questions avec leurs hypothèses.
- [ ] Un concept choisi par le propriétaire.

**Histoire et identité**
- [ ] Sa section dans `histoire.md` (ouverture, lieu, apprentissage, tenue, objet, coups en scène, ce qu'il veut, sa parole), sans toucher aux autres.
- [ ] Ses scènes : entrée, face-à-face avec Nayo et avec Riff, victoire, temps écoulé.
- [ ] 6 répliques, dont une paire avec chacun, dans un registre neuf.
- [ ] Sa section dans `univers.md`, avec la règle des gabarits mise à jour.
- [ ] L'identité au format de combat-v2 §6.2, avec 3 forces et 3 faiblesses mesurables, et le test d'identité.
- [ ] La description du roster en 71 signes au plus, et le titre de l'aide « Le/La X : trois verbes ».

**Jeu**
- [ ] Les 15 obligatoires et ses optionnels, `chainLight` et `lightFinisher` compris ; noms en français ou dans le mot du métier ; aucun « drop » ; aucune capitale accentuée dans son nom ni dans ceux de ses coups ; les tampons du Rewind et de la super pas plus larges que « DÉGAGEMENT ! ».
- [ ] La frame data au format de combat-v2 §10.2, dans les bornes du §4.3.3 : `validateTemplate` vide, appelé dans `tests/data/fighters.test.ts`.
- [ ] Le gel sur la loi, à 23 tics de base au plus ; aucune frappe hors Boost au-dessus de 127 ; prise sous une barre.
- [ ] `throwBack` à 14 tics, côté changé à f6 ; `knockdownFrames` à 40 ; la pushbox debout de 26 à 28 px de large.
- [ ] Les cordes dans la grammaire de combos-v3, avec le garde-fou du débutant et un premier L à plus de 40 px.
- [ ] Les routes mesurées dans `tests/core/<perso>-combos.test.ts`, et les 7 lignes de combos de l'aide (la super, puis le Finisher, en dernier).
- [ ] 3 Remix au timing de leur spécial, un Rewind, une super d'au moins 2 frappes, avec une hitbox, dont la dernière met au sol.
- [ ] Le Finisher au format de `finisher.md` §2 et §3, son `FinisherScript` en données, sa note de sirène.
- [ ] La boîte grise validée par le propriétaire.

**Couleurs et design**
- [ ] Deux tenues, mêmes pixels, palettes nommées par matériau ; la palette figée à la porte 2.
- [ ] L'énergie et le HUD conformes au §4.7 (`hit-styles.test.ts`, `veils.test.ts` étendu) ; le daltonisme vérifié en simulation.
- [ ] Une tête dessinée de zéro, 8 expressions, un détail signature, une garde validée par le propriétaire.

**Animations**
- [ ] Les 32 clips d'état et un clip par coup ; `validateArt` vide dans les deux tenues (`tests/art/<perso>.test.ts`).
- [ ] Les égalités de durée du §4.9 ; les numéros d'images gardés.
- [ ] `npm run sprites:anatomy -- <perso>` à 0 limite dure, sans exception, sur une sortie qui nomme ses planches (le 3e inscrit dans `anatomy-report.ts`), et `tests/tools/anatomy.test.ts` qui boucle sur lui.
- [ ] L'intro à 90 tics, vérifiée dans `tests/art/<perso>.test.ts`.
- [ ] `tests/tools/<perso>-sprites.test.ts` vert (portée, entrée et sortie de garde, pas de corps-à-corps, cadre et sol) ; `hold-pairs`, `visible-contact` et `hurtboxes` étendus et verts.
- [ ] Les hurtbox recalées par `npm run measure-boxes -- <perso> --moves`, sur une sortie qui nomme ses postures et ses coups.
- [ ] Les effets dans ses couleurs ; les planches de plus de 300 px² listées exprès ou ramenées dessous (`flash-areas.test.ts`).
- [ ] Le portrait de 96 px et les retouches à la main de la garde et des coups signatures, vérifiés par `npm run sprites`, puis `measure-boxes` relancé.

**Livraison**
- [ ] Les PR A à E en brouillon, rebasées sur `origin/main`, avec les 8 commandes de la CI vertes en local et sur GitHub.
- [ ] `git status` propre hors du périmètre ; `public/icons/` inchangé ; deux passes de `npm run sprites -- <perso>` identiques.
- [ ] Aucun replay doré changé ; aucun `npm run replays:update`.
- [ ] La mémoire vidéo mesurée et écrite : le pire appariement sous 90 Mo, aucune page au-delà de 2 048 px.
- [ ] Une panne provoquée exprès par test ajouté, vue rouge, puis retirée.
- [ ] Chaque PR décrite au format du §6.7, avec la ligne de décision proposée, au prochain numéro libre (§6.5).
- [ ] Le rapport en quatre rubriques, avec la casquette, les chiffres et les incertitudes.
- [ ] La porte 4 validée par le propriétaire ; la PR F de la session principale fusionnée avec E ; le perso en ligne.
