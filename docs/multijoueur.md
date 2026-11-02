# Multi en ligne à deux

Le mode « Multi » : deux appareils, un téléphone ou un PC chacun, jouent l'un contre l'autre en ligne. Ils peuvent être sur le même Wi-Fi ou sur des réseaux différents. Le but premier : que le propriétaire joue avec sa femme, en test d'abord.

- **Statut : porte 0, la preuve de connexion.** Deux appareils se trouvent par la recherche automatique et s'échangent un ping affiché à l'écran. Il n'y a encore aucun combat.
- **Caché** derrière l'adresse `?multi` (par exemple `…/NayosBeat/?multi`) jusqu'à la porte 2. Sans `?multi`, le jeu en ligne ne change pas, hormis la CSP élargie au serveur de mise en relation (§6).
- **Choix du propriétaire (2 novembre 2026)**
  - Recherche automatique, sans code à taper.
  - L'hôte choisit la map.
  - Téléphones et ordinateurs mélangés, à la maison et à distance.
  - Un service gratuit de mise en relation est accepté.
- **Ce qui ne bouge pas** : `src/core` n'est pas touché, et les 31 replays dorés sont inchangés. D17 (le rendu ne touche jamais au cœur), D23 (rien n'est interpolé) et le budget de 3 flashs par seconde tiennent.

---

## 1. Les portes

On ne passe pas une porte sans le « oui » du propriétaire.

| Porte | Ce qu'elle livre | État |
|---|---|---|
| 0, la preuve | Recherche automatique, ping affiché, rapport, CSP, dépendance, questions | **livrée, en attente du « oui »** |
| 1, le salon | Pseudo, « Adversaire trouvé : … » à accepter ou refuser, l'hôte choisit la map, chacun son combattant ; une déconnexion ramène au menu | à faire |
| 2, le combat en lockstep | Un match complet et la revanche, synchrones (pause, fin de round, Finisher, KO), hash anti-désynchronisation, indicateur du ping et du délai | à faire |
| 3, le rollback | Délai ressenti de 0 ou 1 tic sur Wi-Fi, effets jamais doublés, tests de resimulation | à faire |
| 4, la finition | À distance, en 4G, reprise après une coupure courte, aide du mode, mesures sur un téléphone modeste | à faire |

---

## 2. L'architecture

Le cœur est pur, déterministe, en entiers, à 60 tics par seconde : deux appareils qui jouent les mêmes entrées dans le même ordre calculent le même combat. Le réseau vit donc en bordure (« cœur fonctionnel, coque impérative »). Il transporte des entrées, jamais des états.

| Fichier | Rôle | Dépend de |
|---|---|---|
| `src/net/protocol.ts` | Le format des messages, versionné, et sa validation à la frontière | rien |
| `src/net/lobby.ts` | La recherche par salles numérotées, écrite contre l'interface `Matchmaker` | `protocol` |
| `src/net/session.ts` | Le lien une fois appairé : ping, silence, message invalide | `protocol`, `lobby` (types) |
| `src/net/route.ts` | Le chemin du lien (direct, STUN, relais), lu dans les statistiques WebRTC | `lobby` (types) |
| `src/net/peer-matchmaker.ts` | `Matchmaker` avec PeerJS : **le seul fichier qui importe `peerjs`** | `peerjs`, `lobby`, `route`, `protocol` |
| `src/app/multi-screen.ts` | L'écran « Multi (test) » | `net`, `ui/menu` |

- **Le sens des dépendances est vérifié par le lint.** `net` rejoint les couches extérieures (`eslint.config.js`, `OUTER_LAYERS`) : `core`, `data` et `ai` ne peuvent pas l'importer.
- **PeerJS n'est chargé qu'à la première recherche** (`import()` dans `app.ts`). Il ne passe ni dans le code du jeu, ni dans ce que la page précharge. Le service worker le met en cache, comme tout fichier du build, pour le jeu installé.
- **Deux implémentations de `Matchmaker`** : PeerJS dans le jeu, un serveur en mémoire dans les tests (`tests/net/fake-net.ts`). C'est pour cela qu'une interface existe.

---

## 3. Se trouver sans serveur à nous

Le serveur public de PeerJS (`0.peerjs.com`) **ne liste pas les pairs**. `listAllPeers` est fermé sur ce serveur, qui renvoie vers une demande par e-mail à l'équipe de PeerJS (source de PeerJS 1.5.5). On se trouve donc par des **identifiants connus d'avance**.

- **Les salles** : `nayosbeat-<version du protocole>-lobby-<n>`, avec n de 0 à 3 (`ROOM_COUNT` = 4). La version dans l'identifiant fait que deux versions du protocole ne se rencontrent jamais.
- **L'algorithme**, salle par salle, en partant de la salle 0 :
  1. Réserver l'identifiant de la salle.
     - Accepté : j'**héberge** et j'attends.
     - Refusé (« identifiant pris », erreur `unavailable-id` de PeerJS) : quelqu'un attend déjà, je m'y connecte comme **invité**.
  2. L'invité dit `hello`. L'hôte libre répond `hello` : les deux sont appairés. L'hôte déjà appairé répond `busy` : l'invité passe à la salle suivante.
  3. Une fois appairés, les deux appareils **quittent le serveur** (`peer.disconnect()`, qui garde les liens ouverts). La salle 0 est libre aussitôt pour la paire suivante.
- **Les cas limites**

| Cas | Réponse |
|---|---|
| Un hôte parti sans que le serveur le sache (téléphone en veille) | Personne ne répond (`peer-unavailable`, ou rien dans le délai) : salle suivante |
| Un hôte qui ne dit rien en 10 s, ou dit n'importe quoi | Salle suivante |
| L'hôte répond, mais le lien direct échoue (ICE) | **On s'arrête** avec un message clair, au lieu de devenir hôte d'une autre salle et d'attendre pour rien : « il faudrait un relais » (§5) |
| Le serveur ne répond pas | « Le serveur de mise en relation ne répond pas » |
| Les 4 salles ont leur paire | « Toutes les salles sont occupées » |
| Annuler, ou quitter l'écran, à tout moment | Tout ce qui a été ouvert est fermé : identifiants, liens, minuteries (testé) |

- **Ne pas tomber sur un inconnu.** La recherche est automatique : quelqu'un qui cherche en même temps peut tomber sur nous. La porte 1 ajoute le pseudo de l'autre, à accepter ; refuser relance la recherche. À la porte 0, l'écran est caché et ne fait que pinguer.

---

## 4. Le protocole, version 1

### 4.1 Le format

- Des textes JSON courts, chacun avec sa version : `{"v":1,"t":"ping","n":12}`.
- Ils passent par un canal WebRTC fiable et ordonné, en sérialisation `raw` de PeerJS : le texte arrive tel qu'envoyé.

| Message | Champs | Sens |
|---|---|---|
| `hello` | `v`, `t` | « Je parle ce protocole, je suis libre. » Dit par les deux à l'appairage |
| `busy` | `v`, `t` | L'hôte a déjà son adversaire |
| `ping` | `v`, `t`, `n` | Mesure l'aller-retour ; `n` va de 0 à 2³¹ − 1 |
| `pong` | `v`, `t`, `n` | La réponse immédiate au ping `n` |

### 4.2 La validation (« parse, don't validate »)

`parseMessage` est le seul endroit qui lit ce qui arrive. Il refuse :

- tout ce qui n'est pas un texte ;
- tout texte de plus de 128 caractères, **avant** de le lire ;
- un JSON invalide, un tableau, `null` ;
- une autre version ;
- un type inconnu ;
- une clé en trop ou en moins ;
- un `n` qui n'est pas un entier entre 0 et 2³¹ − 1.

Rien n'est interprété (aucun `eval`), et l'heure d'envoi ne traverse jamais le réseau : l'aller-retour se mesure sur l'horloge locale, au numéro du ping.

### 4.3 La session (`session.ts`)

- Un ping par seconde, auquel l'autre répond tout de suite. Le résumé porte sur les 30 derniers allers-retours : dernier, minimum, médiane, maximum, nombre de mesures, pings perdus.
- **5 s sans rien recevoir** : le lien est perdu (« Connexion perdue »).
- **Plus de 10 messages en une seconde**, même valides : le lien est coupé comme pour un message invalide. Le protocole n'en envoie que 2 (un ping, un pong), et chaque ping reçu appelle une réponse : sans plafond, un pair pourrait faire travailler l'autre appareil sans fin.
- **Un message invalide** : le lien est coupé (« L'autre appareil a envoyé un message invalide »). Un pair qui envoie n'importe quoi est donc déconnecté proprement.
- L'autre ferme le lien : « L'autre appareil a quitté ».

---

## 5. Le réseau : STUN, TURN, chemin

- **STUN** : le serveur public et gratuit de Google, `stun:stun.l.google.com:19302`. Il dit à chaque appareil son adresse publique. Il est sans compte, mais aussi sans garantie écrite.
- **TURN** (un relais) : il faut un relais quand deux réseaux ne se laissent pas joindre en direct, par exemple en 4G ou derrière un NAT strict. **Aucun relais pour l'instant : c'est la question au propriétaire (§10).**
  - **Trouvé dans la source de PeerJS 1.5.5** : sa configuration par défaut comprend, en plus du STUN de Google, **ses propres relais TURN publics**, sans compte (`turn:eu-0.turn.peerjs.com:3478` et `turn:us-0.turn.peerjs.com:3478`, identifiants publics). Le jeu les écarte pour l'instant : il donne sa propre liste de serveurs, le STUN seul.
- **Sur le même Wi-Fi, le lien est direct**, sans STUN ni TURN.
- **Le chemin est affiché** à l'écran, lu dans les statistiques WebRTC (`route.ts`) :
  - « direct, même réseau » (les deux candidats sont locaux) ;
  - « direct, par Internet » (passé par le STUN) ;
  - « par un relais ».

  C'est la mesure qui dira, à la porte 4, s'il faut un TURN.
- **L'adresse IP.** WebRTC révèle à l'autre joueur l'adresse IP de l'appareil (locale sur le même Wi-Fi, publique à distance). Le serveur de PeerJS et celui de Google la voient aussi.

---

## 6. La sécurité

### 6.1 La CSP (`vite.config.ts`)

`connect-src 'self'` devient **`connect-src 'self' wss://0.peerjs.com`**, et rien d'autre.

- **Pourquoi `wss://0.peerjs.com`** : PeerJS parle à son serveur par un WebSocket, `wss://0.peerjs.com:443/peerjs?key=peerjs&id=…`. Le port 443 est celui de `wss` par défaut, que la source sans port couvre.
- **Pourquoi pas `https://0.peerjs.com`** : PeerJS ne demande un identifiant en HTTPS que si on ne lui en donne pas. Le jeu nomme toujours ses pairs : les salles, et les invités `nayosbeat-1-guest-<16 hex>` tirés par `crypto.getRandomValues`.
- **Pourquoi rien pour le STUN** : `connect-src` couvre `fetch`, XHR, WebSocket et EventSource, pas WebRTC. La CSP 3 prévoit une directive `webrtc`, autorisée quand elle est absente.
- **Vérifié dans Chromium, sur le build de production** :
  - le WebSocket vers `0.peerjs.com` s'ouvre ;
  - avec l'ancienne CSP, il est bloqué (`securitypolicyviolation` sur `connect-src`) ;
  - un autre hôte (`wss://example.com`) reste bloqué ;
  - le lien WebRTC s'établit sous la nouvelle CSP.
- **Ce qui n'est pas vérifié** :
  - le STUN, injoignable depuis le conteneur de test ;
  - Safari et Firefox. **À vérifier sur les appareils du propriétaire.**

### 6.2 Les connexions entrantes

L'hôte n'accepte qu'une connexion faite comme le jeu la fait : sérialisation `raw`, fiable. Toute autre est fermée avant d'ouvrir. Ainsi, rien de ce qu'un inconnu envoie ne passe par un décodeur de PeerJS : le décodeur binaire par défaut réassemble des morceaux sous un identifiant choisi par l'envoyeur. Un canal qui ne s'ouvre pas en 10 s est fermé.

### 6.3 La dépendance

| Paquet | Version | Licence |
|---|---|---|
| `peerjs` | 1.5.5 | MIT |
| `@msgpack/msgpack` | 2.8.0 | ISC |
| `eventemitter3` | 5.0.4 | MIT |
| `peerjs-js-binarypack` | 2.1.0 | MIT |
| `webrtc-adapter` | 9.0.6 | BSD-3-Clause |
| `sdp` | 3.2.2 | MIT |

Toutes ces licences sont permissives et compatibles avec un jeu publié. `npm audit` n'ajoute aucune alerte : celles qui restent viennent de l'outillage de lint, déjà là avant.

**La taille, sur le build de production** :

| Morceau | Avant | Après |
|---|---|---|
| Code du jeu (`index-*.js`) | 493,27 ko (153,25 ko gzip) | 501,90 ko (156,46 ko gzip), soit **+8,6 ko** (+3,2 ko gzip) : l'écran, la recherche, la session, le protocole |
| PeerJS (`peer-matchmaker-*.js`) | — | **91,0 ko (24,6 ko gzip)**, chargé à la première recherche seulement |

`webrtc-adapter` retouche les objets WebRTC du navigateur au chargement. Comme PeerJS n'est chargé qu'à la recherche, le jeu n'est jamais touché par ces retouches tant qu'on ne cherche pas.

---

## 7. L'écran « Multi (test) »

Il apparaît au menu principal, après « Entraînement », avec `?multi` seulement.

1. « Rechercher » (sur les deux appareils), ou « Retour ».
2. « Recherche d'un adversaire… », avec « Annuler ».
3. « Connecté : tu accueilles (ou tu as rejoint) la salle 1. », puis :
   - « Ping : 12 ms (min 8, médiane 11, max 30) · 40 mesures, 0 perdues » ;
   - « Chemin : direct, même réseau ».

   Avec « Quitter ».
4. Chaque fin a sa phrase (§3, §4.3), puis « Rechercher » à nouveau.

Quitter l'écran, à tout moment, ferme tout. Un test le vérifie (`tests/app/multi-screen.test.ts`) : plus d'écouteur, d'image demandée, de minuterie, de salle ni de lien ouvert.

---

## 8. Les mesures de la porte 0

| Essai | Résultat |
|---|---|
| Deux onglets (deux contextes Chromium), build de production, CSP active, **serveur public `0.peerjs.com`** | Trouvés par la recherche (salle 0 : hôte, puis invité) ; ping de **1 à 6 ms**, médiane 2 ms, 14 mesures, 0 perdue ; chemin « direct, même réseau » ; « Quitter » d'un côté donne « L'autre appareil a quitté » de l'autre |
| Les mêmes, contre un PeerServer local (le même logiciel que `0.peerjs.com`, version 1.0.2) | 14 essais : 13 réussis (8 avec la correction ci-dessous, 5 sans), ping de 1 à 6 ms. Le 1er essai, sans la correction, a perdu le lien juste après l'appairage |
| Un 3e onglet qui cherche pendant que la paire joue | Il réserve la salle 0, libérée, et attend ; la paire continue de pinguer |
| Téléphone + PC sur le même Wi-Fi | **Pas encore fait : seul le propriétaire peut le faire** (procédure ci-dessous) |

**L'échec du 1er essai, et ce qui a été fait.**

- **Les symptômes** : juste après l'appairage, l'hôte a fini par « Connexion perdue » et l'invité par « L'autre appareil a quitté ».
- **Le mécanisme, lu dans les deux sources** :
  - un appareil qui a quitté le serveur reçoit encore des candidats ICE (les adresses possibles d'un lien) de l'autre, par ce serveur ;
  - si l'envoi échoue, le serveur répond `LEAVE` ;
  - PeerJS ferme alors le lien.
- **La correction** : une fois le canal ouvert, le jeu n'envoie plus ses candidats par le serveur (`onicecandidate = null`). C'est ce que PeerJS fait lui-même quand l'ICE se termine.
- **Ce qui n'est pas prouvé** : les 5 essais suivants sans la correction ont tous réussi. La correction n'est donc **pas prouvée** par ces essais. Elle est gardée parce que le mécanisme est réel. Sur un vrai Wi-Fi, les candidats STUN arrivent plus tard que dans le conteneur, où le STUN est injoignable : la course y est plus probable. **À surveiller sur les appareils.**

**Les mesures en local ne valent pas pour un Wi-Fi.** Sur un même ordinateur, le ping ne mesure presque que le navigateur.

**La procédure pour le propriétaire**, téléphone et PC sur le même Wi-Fi :

1. Ouvrir `…/NayosBeat/?multi` dans le navigateur, sur les deux (pas l'app installée, qui ouvre l'adresse sans `?multi`).
2. Toucher l'écran titre, puis « Multi (test) », puis « Rechercher » sur les deux.
3. Laisser tourner une minute, puis noter la ligne « Ping » et la ligne « Chemin » des deux appareils (une photo suffit).
4. Refaire en coupant le Wi-Fi du téléphone (4G) : si la connexion échoue avec « il faudrait un relais », c'est la réponse à la question du TURN.

---

## 9. Le plan du netcode (portes 2 et 3)

### 9.1 D'abord le lockstep à délai d'entrées (porte 2)

- Chaque appareil lit son joueur, envoie son entrée du tic t, et la joue au tic t + N, des deux côtés.
- N part de 2 à 3 tics sur Wi-Fi. Il est fixé au début du match à partir du ping mesuré (environ la moitié de la médiane, arrondie au tic supérieur, plus 1), puis gardé tout le match.
- Le combat attend l'entrée de l'autre si elle manque.
- Les entrées voyagent avec une petite fenêtre de redondance (les dernières non confirmées), pour qu'une perte se rattrape sans attendre.

### 9.2 Ensuite le rollback (porte 3)

- On prédit l'entrée de l'autre (la dernière connue), on garde les états et les entrées des derniers tics, et on resimule quand l'entrée réelle diffère.
- **`GameState` est immuable** (`step` rend un nouvel état) : garder un état coûte une référence, sans copie.
- **Les effets ne se rejouent jamais deux fois** : `detectEvents`, les sons, les flashs et les vibrations partent des tics confirmés seulement. Le budget de flashs ne voit donc qu'une fois chaque effet.

### 9.3 Les désynchronisations

- Un hash de l'état est échangé tous les N tics : `stateHash`, FNV-1a, celui des replays dorés (`tools/replays/replay.ts`, à rendre accessible depuis `src`).
- Une différence s'affiche en clair (« Désynchronisé au tic X »). Elle s'enregistre avec les deux suites d'entrées, au format des replays dorés, pour pouvoir la rejouer.

### 9.4 Ce que la lecture du code a déjà trouvé (à régler à la porte 2)

- **La scène du Finisher se règle en local.** Elle se passe en tenant un bouton (`inputs.held`), avance le match sans le montrer (`playUnseen`, `playToResults`) et cadence elle-même les tics. Ce sont des entrées locales qui changent la simulation : en ligne, il faut soit passer la scène d'un commun accord (une entrée transmise), soit ne pas la passer.
- **La pause arrête la simulation en local.** En ligne, il faudra une pause partagée (une demande transmise, que l'autre voit), ou pas de pause en match. C'est une question pour la porte 2.
- **« Lutte en prise : tenir »** (`HeldStruggle`) transforme les entrées avant `step`. En ligne, elle s'applique **chez celui qui joue**, avant l'envoi : les deux côtés reçoivent alors les mêmes bits.
- **Le ralenti du KO** (`feedback.ticksFor`) ne change que la cadence. Les tics restent les mêmes : pas de désynchronisation, seulement une attente.
- **L'ambiance du décor est tirée au hasard dans le rendu** (`stageVariantFor`, #96). L'hôte la tire et l'envoie avec la map ; la config du match (combattants, tenues, map, ambiance) part une seule fois, de l'hôte.

---

## 10. Les questions au propriétaire

Chacune a son hypothèse de départ.

1. **TURN pour la 4G et les réseaux stricts.**
   - **Hypothèse** : commencer par les relais publics de PeerJS (déjà dans PeerJS, sans compte, identifiants publics, sans garantie de service), et ne prendre un service à compte que si la mesure de la porte 4 les montre insuffisants. Exemples de services à compte : Cloudflare, Metered (un compte et une clé, qu'il faudrait garder hors du dépôt).
   - Ce que ça change : un relais voit passer les entrées du match (rien de sensible), et la CSP n'a pas à bouger (§6.1).
2. **Le pseudo (porte 1).**
   - **Hypothèse** : 2 à 12 caractères (lettres, chiffres, espace, tiret), demandé à la première recherche et retenu sur l'appareil.
   - Il est affiché tel quel, jamais interprété. Il passe par le protocole v2, validé comme le reste.
3. **L'acceptation avant le combat (porte 1).**
   - **Hypothèse** : les deux doivent accepter dans les 30 s. Refuser, ou laisser passer le délai, relance la recherche chez les deux.
   - Rien ne se joue tant que les deux n'ont pas dit oui.

---

## 11. Ce qui a été écarté

| Écarté | Pourquoi |
|---|---|
| Un serveur à nous (salon, relais) | Il faudrait l'héberger, le payer et le surveiller. Le propriétaire a accepté un service gratuit |
| Lister les pairs (`listAllPeers`) | Fermé sur le serveur public de PeerJS ; il faut écrire à l'équipe pour l'ouvrir |
| Un code de salle à taper | Le propriétaire veut une recherche automatique. Il reste un repli possible si un inconnu gêne |
| Les sérialisations `binary` et `json` de PeerJS | `raw` passe le texte tel quel, et la seule lecture est la nôtre, bornée en taille |
| Faire passer le jeu par le serveur (WebSocket) | Plus lent qu'un lien direct, et le serveur public n'est pas fait pour ça |
| Charger PeerJS avec le jeu | +24,6 ko gzip pour tout le monde, et `webrtc-adapter` qui retouche WebRTC même hors du Multi |

---

## 12. La décision proposée pour le journal

`docs/combat-v2.md` §0.2 : **D38**. D36 (Saphir) et D37 (Watt) sont déjà réservés par d'autres PR, au 2 novembre 2026 ; à revérifier juste avant la fusion.

| # | Décision | Origine | Pourquoi |
|---|---|---|---|
| D38 | Le **Multi en ligne** se trouve par une **recherche automatique** sur le serveur public de PeerJS : des salles aux identifiants connus (`nayosbeat-<version>-lobby-<n>`), la première libre est réservée, une prise est rejointe, et les deux appareils quittent le serveur une fois liés. Le jeu passe ensuite en direct, en WebRTC. Le réseau vit en bordure (`src/net`, interdit au cœur par le lint) et ne transporte que des entrées ; chaque message est versionné, borné et validé à la frontière. PeerJS n'est chargé qu'à la première recherche, et la CSP ne s'ouvre qu'à `wss://0.peerjs.com` (`docs/multijoueur.md`) | propriétaire (« Rechercher », service gratuit accepté) | Sans serveur à nous, le serveur public ne liste pas les pairs : des identifiants connus d'avance suffisent à se trouver. Écartés : un serveur à nous, un code à taper, faire passer le jeu par le serveur |
