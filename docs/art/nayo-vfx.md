# L'essence de Nayo : lumières et effets de ses coups

Casquette : direction artistique technique. Tranche « Nayo vivant », volet effets en jeu (`src/render/`). Les sprites (lumières figées, smears, poses) sont refaits à part, sur `feat/nayo-essence-art` ; ce volet ne touche ni `tools/sprites/` ni `src/art/nayo/`.

La demande du propriétaire, mot pour mot : « Jeux de lumières = ajout de lumières en ombres pour des moves ou combos... Là y a aucun shadow, aucune magie... c'est très léché oui, mais faut une essence maintenant. Vas-y, ajoute de l'anim et du VFX hyper stylés aux moves de Nayo. » Plus tôt, il trouvait les spéciaux, le Super et le Boost « trop plats ».

## 1. Le principe

Nayo est un boxeur-DJ : ses coups sont de la musique qui frappe. Chaque effet emprunte à la platine et à la sono :
- le **Vinyle** sort d'un anneau de haut-parleur et laisse derrière lui des **ondes sonores**, comme les sillons qui défilent ;
- la **Mégabasse** est un **drop** : une montée qui se resserre, puis trois coups de basse au sol, l'**égaliseur** qui saute derrière les combattants ;
- les coups lumineux **éclairent la rue** : une flaque de lumière au sol, l'ombre des deux combattants qui s'étire à l'opposé, une lueur sur l'adversaire proche ;
- le **Boost** est en platine : tout ce qui est bleu néon passe au blanc platine, en plus gros et en plus nombreux.

Tout est piloté par l'état du combat et ses événements, sans rien écrire dans le cœur (D17). Rien n'est interpolé entre deux tics (D23) : les sources de lumière se lisent dans l'état à chaque tic, les pièces des effets vivent ensuite sur l'horloge visuelle, comme les étincelles.

## 2. Les lumières dynamiques

> **Depuis le prototype « Nayo vivant »** ([nayo-vivante.md](nayo-vivante.md)) : quand la qualité adaptative allume les lumières vivantes (paliers `full` et `lean`), les sources ci-dessous éclairent la rue et les combattants avec les lumières de Phaser. Les flaques (§2.2) et la lueur (§2.4) s'effacent alors ; l'ombre (§2.3) s'étire toujours. Au palier `off`, et en Canvas, tout est comme décrit ici.

**Code :** `move-lights.ts` (pur), `light-rig.ts` (le dessin), `sprite-fighter-view.ts` (l'ombre et la lueur).

### 2.1 Les sources

| Source | Quand | Ton |
|---|---|---|
| La main du Vinyle | frames 6 à 18 (lancer en 12) | énergie |
| Le disque en vol | tant qu'il vole, à la hauteur de sa boîte | énergie, ou platine pour le Remix |
| Le pied du Pied fendu | frames 8 à 18 | énergie |
| Le poing de l'Uppercut | frames 1 à 14, montant de 30 à 90 px | énergie |
| La Mégabasse | frames 0 à 22, au poing, au sol | platine |
| Le Rewind | frames 0 à 8 | platine |
| Un coup lourd de Nayo qui touche (CONTRE et KO compris) | 20 images d'affichage, à l'impact | énergie, platine au-dessus du palier 1 |

Chaque lumière monte sur 2 frames et s'éteint sur 4 (`moveLightStrength`) : pas de saut. Les données vivent dans `signatures.ts` (`NAYO_SIGNATURE`), à côté des effets.

### 2.2 La flaque au sol

Sous chaque source, une ellipse additive douce (la texture `fx:glow` des voiles, aplatie à 22 %), large de 56 px plus la moitié de la hauteur de la source, d'autant plus pâle que la source est haute. Elle se dessine au-dessus de la mise au noir de la super (`DEPTH.pools`) : pendant le gel, la flaque brille dans le noir.

**Jamais un flash.** Toutes les flaques ensemble élèvent le sol de **ΔL 0,08 au plus** (0,05 en effets calmes), sur toutes les couleurs du décor (`poolScale`) :
- une flaque pleine est tracée à l'alpha qui, seul, atteint exactement cette limite en son cœur ;
- là où des flaques se chevauchent, on additionne les cœurs de toutes celles qui chevauchent une même flaque, et on réduit toutes les flaques d'un même facteur jusqu'à rester sous la limite. C'est une borne : tout point est couvert par des flaques qui chevauchent toutes l'une d'elles ;
- la couleur de référence est le **fond le plus lumineux** du décor, canal par canal (`brightestBackdrop`) : une lumière ajoutée élève plus un canal déjà clair (la courbe sRGB est convexe), donc ce qui tient sur ce fond tient sur tous (test).

### 2.3 L'ombre qui s'étire

L'ombre au sol (deux ellipses, `nayo-lumiere.md` §4) s'élargit jusqu'à ×1,9 et glisse jusqu'à 16 px à l'opposé de la lumière, puis revient quand la lumière s'éteint (`castOn`). Une source proche et basse pousse plus qu'une source lointaine ou haute. **Elle s'applique aux deux combattants**, Riff comprise : c'est la lumière de Nayo qui pousse son ombre. C'est le seul changement commun, et il est voulu.

### 2.4 La lueur sur l'adversaire

Le corps de l'adversaire est redessiné une fois, rempli de la couleur de la lumière, en addition, à l'alpha qui l'élève de **ΔL 0,035 au plus** (0,02 en effets calmes) : une lueur légère, d'autant plus forte que la source est proche de son buste. Seules les lumières de l'autre combattant la donnent : Nayo ne se tinte pas lui-même, ses sprites portent déjà leur lumière. Riff ne la reçoit que sous la lumière de Nayo.

## 3. Les effets signature

**Code :** `signature-fx.ts`, `move-echo.ts`, données dans `signatures.ts`.

Les pièces viennent de l'atlas HD des étincelles (`hd:atlas` : anneau, arc, traînée, éclat, étoile, lueur), teintées et ajoutées ; l'égaliseur est un `Graphics` de rectangles pleins, au grain du pixel art. Tout est créé avec le combat, en réserves fixes (16 anneaux, 24 arcs, 48 traînées, 16 étoiles, 32 éclats, 6 lueurs, 3 égaliseurs) : rien n'est alloué pendant le combat, la plus ancienne pièce est recyclée.

| Coup | Déclencheur (frame d'action) | Effet |
|---|---|---|
| Vinyle | 12 | Anneau de haut-parleur vu de profil, un second qui le suit, trois traits vers l'avant |
| Vinyle (en vol) | tous les 3 tics hors gel | Ondes sonores en croissant, laissées derrière le disque, qui dérivent et s'éteignent |
| Vinyle platine | 2, puis 12 | Éclat du Boost, puis deux anneaux (platine ×1,3 et énergie) ; ondes doubles, platine et énergie |
| Pied fendu | 11 | Arc de vitesse le long du coup, une lueur au pied, quatre traînées au sol vers l'arrière |
| Pied fendu platine | 1, puis 11 | Éclat du Boost, arc platine ×1,25, anneau de choc au sol |
| Uppercut | 2, puis 3 | Anneau de choc à plat au sol sous les pieds, puis six traînées qui montent le long du corps et trois étoiles |
| Montée platine | 0, 2, 3, 5 | Éclat du Boost, deux anneaux au sol (platine ×1,3, énergie), traînées platine ×1,3 |
| Mégabasse | 0 | Montée : un anneau qui se resserre de 180 à 31 px, une aura qui respire derrière lui, douze éclats aspirés vers son corps |
| Mégabasse | 2, 8, 14 | Drop : anneau de choc au sol au poing, et l'égaliseur (9 barres, 14 segments, un capuchon platine qui retombe) qui saute derrière les combattants ; le dernier en platine ×1,3 |
| Rewind | 0 | Éclat du Boost |
| Dash | 1 | Trois traits de vitesse au sol, derrière (les rémanences restent celles de `dash-trail.ts`) |
| Coup lourd (normal, `isHeavy`) | sa 1re frame active | Arc du geste à l'endroit où il porte (taille tirée de sa boîte), tourné selon `aimOf`, deux traits le long |

**Les rémanences des spéciaux** (`MoveEcho`) : Vinyle (frames 9 à 13), Pied fendu (3 à 15), Uppercut (2 à 10), une silhouette ajoutée dans l'énergie tous les 2 ou 3 tics, qui s'éteint en 8 ou 9 tics. Toutes celles qui se voient ensemble élèvent le décor de **ΔL 0,08 au plus** (0,05 calmes), la plus récente la plus forte. Les moves du Boost gardent leurs échos blancs (`boost-echo.ts`), communs aux deux combattants.

**Le Boost et les Remix**, nettement plus forts que les versions normales : un éclat platine au départ (anneau, second anneau, huit éclats), des effets en platine et plus grands (×1,25 à ×1,3), doublés d'un accent dans l'énergie, une lumière plus forte (1 au lieu de 0,7 à 0,8) qui dure plus longtemps, des ondes doubles derrière le disque.

## 4. Les flashs

Chaque effet lumineux passe par le budget (`docs/flashs.md` §4) :
- **les effets signature** demandent une fois, à leur départ, ce qu'ils allument (`SIGNATURE_AREAS` × taille²), **après** les coups et les fx de planche de l'image (`flush`, appelé par `FightScene` après les vues des combattants). Accordés, ils jouent leur version vive ; refusés, ou les flashs calmes, leur version calme : chaque pièce à ΔL 0,03 au plus (`QUIET_DELTA`), mesurée à 0 px² ;
- **leurs lueurs** (l'aura, la flaque d'un anneau, l'anneau qui se resserre) sont toujours calmes : trop larges pour tenir dans un budget ;
- **l'égaliseur** : ses segments à ΔL 0,07 au plus (0,045 calmes), surélevés de 8 px × taille au-dessus de l'anneau du drop ; ses capuchons vifs seulement si le drop est accordé ;
- **les flaques, l'ombre, la lueur et les rémanences** ne flashent jamais (§2, §3) : 0 px².

Surfaces mesurées (px² monde à ΔL ≥ 0,1, à taille 1, sur le fond le plus lumineux du décor, dans les deux tons des deux tenues, aux tailles jouées) : voir `docs/flashs.md` §4.1. Aucun effet n'est demandé pendant la mise en scène du Finisher : elle éclaire sa propre scène.

Les options :
- **« Effets de flash » réduits ou aucun** : tous les effets signature joués calmes, sans rien demander ; flaques à ΔL 0,05, lueur à 0,02, rémanences à 0,05, égaliseur à 0,045 ;
- **« Tremblement » à aucun** : l'égaliseur ne rebondit plus (il monte, puis retombe), l'aura de la Mégabasse ne respire plus ;
- **mode simple** (Canvas, sans teinte) : aucune pièce de l'atlas (blanches, teintées), aucune flaque, aucune ombre poussée, aucune lueur, aucune rémanence. Il reste l'égaliseur, en aplats que Canvas dessine.

## 5. Les contrats et les tests

- `tests/render/flash-areas.test.ts` : chaque effet mesuré sous sa table, dans les deux tons des deux tenues et à chaque taille jouée, la table à 10 % de la mesure ; chaque version calme à 0 px² ; chaque effet, seul, sous la surface des effets normaux au gros plan poussé (sinon il ne serait jamais vif) ; rien de l'atlas en mode simple.
- `tests/render/flash-cadence.test.ts` et `finisher-flashes.test.ts` : les vraies routes et le registre du Finisher, effets signature compris, sans aucune limite desserrée. Les résultats sont les mêmes qu'avant : la Mégabasse qui tue fait toujours 3 flashs, l'Uppercut reste clair.
- `tests/render/signature-fx.test.ts` : chaque effet déclenché par le bon coup, à la bonne frame, dans le bon ton, joué une seule fois ; rien pour Riff ; une demande par effet, aucune en calme ; la réserve fixe ; l'égaliseur qui rebondit, sauf écran immobile ; le mode simple ; aucune texture créée.
- `tests/render/move-lights.test.ts` : les sources, le disque, rien pour Riff ; l'ombre et la lueur ; les flaques entassées sous ΔL 0,08 (0,05) sur 40 tirages, composées comme les dessine la texture ; le fond le plus lumineux comme pire cas ; l'éclat d'un coup lourd ; rien en mode simple ni pendant le Finisher ; plus pâle en calme ; la somme des rémanences.
- `tests/render/shadow-cast.test.ts` : l'ombre décalée et étirée à l'opposé, la lueur sur le corps, rien sans les lumières.
- Chaque test a été vérifié en cassant le code exprès (12 mutations, toutes rouges).

**Libération.** Les objets sont des objets de la scène, détruits avec elle. Aucune texture n'est créée : les effets tirent de l'atlas des étincelles et de la lueur des voiles, peints une fois pour le jeu (test). Aucun écouteur, aucune minuterie.

**Performances.** Réserves fixes, une demande au budget par effet, une borne des flaques en au plus 16 × 8² additions par image. La mémoire vidéo ne bouge pas (aucune texture).

## 6. Les références (technique seulement)

Aucun personnage, coup ni asset d'un autre jeu n'est repris : ce sont des techniques.
- **Superposer les retours dans les 100 ms d'un coup** (gel, secousse, particules, son) et garder les gros retours pour les vrais impacts : Jonasson et Purho, « Juice it or Lose it » (GDC 2012), et les synthèses qui en découlent ([rpgplayground](https://rpgplayground.com/research-making-a-juicy-game/), [eastondev](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/)).
- **Le smear et l'impact en images de jeu, pas en images d'art**, un seul smear par membre, un second pour les coups chargés : [GamineAI, pixel art combat FX](https://gamineai.com/blog/pixel-art-combat-fx-hitstop-smear-frames-impact-timing-2026). Ici, l'arc de vitesse joue ce rôle par-dessus les sprites ; les smears dessinés restent à l'autre branche.
- **L'anneau de choc qui grandit vite puis s'attarde avant de s'éteindre**, et l'ordre onde de choc, débris, poussière, secousse : [realtimevfx.com](https://realtimevfx.com/t/duranphysics-sketch-50/19474) ; un anneau tracé sans texture dédiée : [sbox ShockRing](https://sbox.game/cifosi2500/nzombies_sbox/source?file=Effects%2FShockRing.cs).
- **La lumière 2D en dégradés radiaux additifs**, et l'ombre comme une forme sombre tournée et étirée à l'opposé de la source : [fledge_lighting_2d](https://pub.dev/packages/fledge_lighting_2d/example), [Construct](https://construct.net/en/tutorials/making-advanced-lighting-2232/page-4), [Shawn Hargreaves](https://www.shawnhargreaves.com/blog/spritebatch-and-custom-blend-modes.html).
- **Un rendu 3D qui se lit comme du 2D**, lumières et effets réglés à la main plutôt que calculés : Motomura, « GuiltyGearXrd's Art Style » (GDC 2015, [GDC Vault](https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The)).
- Ce qui n'a rien donné : aucune analyse image par image publiée des étincelles de *Street Fighter III: 3rd Strike*, ni de tutoriel de saint11 sur les rémanences, n'est ressorti des recherches. L'égaliseur et les ondes de vinyle sont une idée maison, tirée de l'univers de Nayo ([univers.md](univers.md)).

## 7. Écartés et à faire

- **Des rémanences plus vives** (comme la traînée de dash, 0,45) : leur silhouette entière dépasse 1 000 px² ; elles flasheraient au gros plan. Elles restent sous ΔL 0,08, la plus récente devant.
- **Une ombre portée en vraie projection** (le corps aplati et cisaillé au sol) : c'est plus juste, mais cela coûte un sprite par combattant et par lumière, pour un gain faible à cette taille. L'ellipse qui s'étire suffit.
- **Une lueur seulement du côté de la lumière** : il faudrait les normales des sprites, que le pipeline n'exporte pas. La lueur est uniforme, et légère.
- **Le capuchon de l'égaliseur toujours vif** : il se déplace, et chaque position allume de neuf ; il ne l'est que si le drop est accordé.
- **À faire :**
  - régler les intensités sur un vrai téléphone, l'écran du développeur et en plein soleil ;
  - accorder les effets avec les nouveaux sprites de `feat/nayo-essence-art` (smears, lumières figées) une fois fusionnés : éviter qu'un arc de vitesse double un smear dessiné ;
  - compter les flaques des deux joueurs dans un miroir Nayo contre Nayo à l'écran (la borne les tient déjà, mais l'œil n'a pas jugé) ;
  - les effets signature de Riff, si le propriétaire les veut (tout est prêt : une entrée de plus dans `SIGNATURES`).
