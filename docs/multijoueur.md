# Multi en ligne à deux

Le mode « Multi » : deux appareils, un téléphone ou un PC chacun, jouent l'un contre l'autre en ligne. Ils peuvent être sur le même Wi-Fi ou sur des réseaux différents. Le but premier : que le propriétaire joue avec sa femme, en test d'abord.

- **Statut : porte 1, le salon, livrée, en attente du « oui » du propriétaire.** La porte 0 (la preuve de connexion) a été validée le 2 novembre 2026, avec ses réponses du §10. Deux appareils se trouvent, se présentent par leur pseudo, s'acceptent ; l'hôte choisit le lieu, chacun son combattant, et les deux voient le même match. Il n'y a encore aucun combat.
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
| 0, la preuve | Recherche automatique, ping affiché, rapport, CSP, dépendance, questions | **validée le 2 novembre 2026** |
| 1, le salon | Pseudo, « Adversaire trouvé : … » à accepter ou refuser, l'hôte choisit la map, chacun son combattant ; une déconnexion ramène au menu | **livrée, en attente du « oui »** |
| 2, le combat en lockstep | Un match complet et la revanche, synchrones (pause, fin de round, Finisher, KO), hash anti-désynchronisation, indicateur du ping et du délai | en cours, en trois tranches (§9.5) : **2a et 2b livrées** |
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
| `src/app/salon.ts` | Le salon (porte 1) : un réducteur pur, un événement en entrée, le salon et les messages à envoyer en sortie | `net/protocol` (types), `data/roster` (types) |
| `src/app/multi-catalog.ts` | Ce que le salon offre et vérifie : les lieux et les combattants du jeu, le tirage de l'hôte | `art`, `data`, `render/stage-view` |
| `src/app/name-store.ts` | Le pseudo, gardé sur l'appareil | `net/protocol` |
| `src/ui/name-entry.ts` | L'écran du pseudo : un champ de texte, jamais interprété | `ui/menu` |
| `src/app/multi-screen.ts` | Les écrans « Multi (test) » : il branche le réseau sur le salon et l'affiche | `net`, `salon`, `ui` |

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

- **Ne pas tomber sur un inconnu.** La recherche est automatique : quelqu'un qui cherche en même temps peut tomber sur nous. Chacun voit donc le pseudo de l'autre et doit l'accepter (§7) ; refuser relance la recherche, et un pseudo refusé l'est d'office jusqu'à la fermeture de l'onglet.
- **Un canal appairé garde ce qui arrive** tant que personne ne l'écoute : l'autre peut parler avant que le salon soit ouvert. Il en garde au plus 16 (`HELD_MESSAGES`) ; au-delà, c'est un flot, et le lien est coupé.

---

## 4. Le protocole, version 3

La version 2 (porte 1) a ajouté le salon ; la version 3 (porte 2) ajoute les entrées du combat et le hash de l'état. Les salles deviennent `nayosbeat-3-lobby-<n>` : deux versions différentes ne se rencontrent jamais.

### 4.1 Le format

- Des textes JSON courts, chacun avec sa version : `{"v":3,"t":"ping","n":12}`.
- Ils passent par un canal WebRTC fiable et ordonné, en sérialisation `raw` de PeerJS : le texte arrive tel qu'envoyé.

| Message | Champs | Sens |
|---|---|---|
| `hello` | `v`, `t` | « Je parle ce protocole, je suis libre. » Dit par les deux à l'appairage |
| `busy` | `v`, `t` | L'hôte a déjà son adversaire |
| `ping` | `v`, `t`, `n` | Mesure l'aller-retour ; `n` va de 0 à 2³¹ − 1 |
| `pong` | `v`, `t`, `n` | La réponse immédiate au ping `n` |
| `name` | `v`, `t`, `s` | Le pseudo de l'envoyeur, une fois, à l'ouverture du salon |
| `accept`, `refuse` | `v`, `t` | La réponse de l'envoyeur : il veut jouer contre l'autre, ou non |
| `stage` | `v`, `t`, `m`, `a` | Le lieu de l'hôte (`m`, la map) et son ambiance (`a`), déjà tirés au sort s'il a choisi « Aléatoire » |
| `fighter` | `v`, `t`, `f` | Le combattant de l'envoyeur |
| `inputs` | `v`, `t`, `k`, `b`, `a` | Les entrées de l'envoyeur à partir du tic `k`, une par tic (12 au plus, 11 bits chacune), et le dernier tic de l'autre qu'il a reçu avec tous les précédents (`a`, −1 pour aucun) |
| `hash` | `v`, `t`, `k`, `h` | Le hash de l'état de l'envoyeur après le tic `k` (8 chiffres hexadécimaux) |
| `start` | `v`, `t`, `d` | L'hôte lance le combat, avec ce délai d'entrées en tics (1 à 10) |
| `resume` | `v`, `t` | L'envoyeur quitte la pause partagée : les deux reprennent |
| `rematch` | `v`, `t` | L'envoyeur veut la revanche ; elle part quand les deux la veulent |

Une entrée de `inputs` porte les 11 boutons du cœur, plus le drapeau `FLAG_PAUSE` (bit 11) : son joueur a demandé la pause. Le drapeau n'atteint jamais le cœur.

### 4.2 La validation (« parse, don't validate »)

`parseMessage` est le seul endroit qui lit ce qui arrive. Il refuse :

- tout ce qui n'est pas un texte ;
- tout texte de plus de 128 caractères, **avant** de le lire ;
- un JSON invalide, un tableau, `null` ;
- une autre version ;
- un type inconnu ;
- une clé en trop ou en moins ;
- un `n` qui n'est pas un entier entre 0 et 2³¹ − 1 ;
- un pseudo qui n'a pas 2 à 12 lettres sans accent, chiffres, espaces ou tirets, une lettre ou un chiffre à chaque bout ;
- un lieu, une ambiance ou un combattant qui n'est pas un mot court en minuscules (`a-z`, `0-9`, tiret, 24 au plus).

Le salon vérifie ensuite le sens : un lieu, une ambiance et un combattant que **ce jeu** a, et chaque message à son tour (un `stage` reçu par l'hôte, un deuxième `name`, un `fighter` avant le lieu… coupent le lien).

Rien n'est interprété (aucun `eval`), et l'heure d'envoi ne traverse jamais le réseau : l'aller-retour se mesure sur l'horloge locale, au numéro du ping.

### 4.3 La session (`session.ts`)

- Un ping par seconde, auquel l'autre répond tout de suite. Le résumé porte sur les 30 derniers allers-retours : dernier, minimum, médiane, maximum, nombre de mesures, pings perdus.
- **5 s sans rien recevoir** : le lien est perdu (« Connexion perdue »).
- **Plus de 120 messages en une seconde**, même valides : le lien est coupé comme pour un message invalide. En combat, le protocole en envoie environ 63 (les entrées à chaque tic, un hash, un ping, un pong), et chaque ping reçu appelle une réponse : sans plafond, un pair pourrait faire travailler l'autre appareil sans fin.
- **Un message invalide** : le lien est coupé (« L'autre appareil a envoyé un message invalide »). Un pair qui envoie n'importe quoi est donc déconnecté proprement.
- L'autre ferme le lien : « L'autre appareil a quitté ».

---

## 5. Le réseau : STUN, TURN, chemin

- **STUN** : le serveur public et gratuit de Google, `stun:stun.l.google.com:19302`. Il dit à chaque appareil son adresse publique. Il est sans compte, mais aussi sans garantie écrite.
- **TURN** (un relais) : il faut un relais quand deux réseaux ne se laissent pas joindre en direct, par exemple en 4G ou derrière un NAT strict. **Le jeu utilise les relais publics de PeerJS** (décision du propriétaire, §10) : `turn:eu-0.turn.peerjs.com:3478` et `turn:us-0.turn.peerjs.com:3478`, sans compte, avec les identifiants publics que PeerJS 1.5.5 met dans sa propre configuration par défaut. Ils sont sans garantie de service ; un service à compte ne viendra que si la porte 4 les montre insuffisants.
  - Ces relais ne servent qu'en dernier recours : le navigateur essaie d'abord le direct. Un relais voit passer les entrées du match, rien de sensible.
  - Ils n'ont pas pu être exercés depuis le conteneur de test (le port 3478 y est injoignable) : la 4G de la porte 4 le dira.
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

## 7. Les écrans « Multi (test) » (porte 1)

Ils apparaissent au menu principal, après « Entraînement », avec `?multi` seulement.

1. **Le menu** : « Rechercher » (sur les deux appareils), « Pseudo : … » et « Retour ».
2. **Le pseudo**, demandé à la première recherche et gardé sur l'appareil : 2 à 12 lettres sans accent, chiffres, espaces ou tirets. Le champ est en 16 px : en dessous, Safari sur iPhone zoome au toucher.
3. « Recherche d'un adversaire… », avec « Annuler ».
4. **« Adversaire trouvé : <pseudo> »**, avec « Accepter », « Refuser » et 30 s pour répondre.
   - Refuser : la recherche reprend chez les deux après 5 s (`RETRY_MS`), et ce pseudo est refusé d'office jusqu'à la fermeture de l'onglet. Sans cette pause, deux appareils qui se retrouvent et se refusent boucleraient sans fin.
   - Les 30 s passées : celui qui n'a pas répondu revient au menu (« Temps écoulé »), sans retenir le pseudo ; l'autre voit un refus, et sa recherche reprend.
   - Le lien qui se ferme pendant la présentation vaut un refus : PeerJS ferme toute la connexion d'un coup, et un `refuse` envoyé juste avant peut se perdre.
5. **Le lieu** : l'hôte a l'écran « Lieu » (« Aléatoire » compris : il tire la map et l'ambiance, et envoie le résultat exact) ; l'invité lit « <pseudo> choisit le lieu… ».
6. **Le combattant** : chacun a l'écran de choix, « Contre <pseudo>, à <lieu> ». Aucun ne voit le choix de l'autre avant d'avoir fait le sien. La tenue suit la règle locale : en miroir, l'invité (joueur 2) porte la deuxième.
7. **Le combat** : dès que les deux ont choisi, l'hôte le lance avec le délai mesuré à son ping (§9.6), et chacun joue son combattant avec ses commandes de joueur 1. L'hôte est le joueur 1.

Chaque écran du salon porte la ligne « Ping : 2 ms · chemin : direct, même réseau », et « Quitter ». Une déconnexion, à n'importe quel moment, ramène au menu avec sa phrase (§4.3).

Quitter les écrans, à tout moment, ferme tout. Un test le vérifie (`tests/app/multi-screen.test.ts`) : plus d'écouteur, d'image demandée, de minuterie, de salle ni de lien ouvert.

---

## 8. Les mesures

### 8.1 La porte 2, tranche 2b

| Essai | Résultat |
|---|---|
| Deux onglets Chromium, build de production, vrai PeerJS, PeerServer local : du salon au combat, Nayo contre Riff à Viaduct Gym | Les deux écrans montrent le même combat (même chrono, mêmes positions) ; « délai 2 » affiché ; la pause demandée par Alex s'ouvre chez les deux (« Demandée par Alex ») et la reprise de Lou relance les deux ; 20 s de combat sans désynchronisation (un hash comparé chaque seconde) ; « Quitter » d'un côté ramène l'autre au menu « Multi » (« L'autre joueur a quitté le match ») ; aucune erreur dans les pages |

Le ping affiché en combat (environ 110 ms) est bien plus haut qu'au salon (1 à 5 ms) : les deux onglets font tourner chacun un rendu WebGL sur le seul processeur du conteneur, et les messages attendent la fin de chaque image. Le délai, lui, se fixe au salon, et à 2 tics le combat n'a pas attendu. La mesure qui compte se fera sur de vrais appareils.

### 8.2 La porte 1

| Essai | Résultat |
|---|---|
| Deux onglets Chromium, build de production, vrai PeerJS, PeerServer local : pseudo, recherche, acceptation, « Viaduct Gym » choisi par l'hôte, Riff et Nayo | Les deux écrans montrent « Alex (Riff) contre Lou (Nayo). Lieu : Viaduct Gym. » ; ping de 1 à 2 ms ; « Quitter » d'un côté donne « L'autre appareil a quitté » de l'autre ; aucune erreur dans la page |

Une course trouvée en écrivant la porte 1, et corrigée : l'hôte envoie son pseudo dès l'appairage, avant que l'invité ait ouvert son salon. Le message était perdu ; le canal appairé le garde désormais (§3).

### 8.3 La porte 0

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
4. Refaire en coupant le Wi-Fi du téléphone (4G). La ligne « Chemin » dit alors si le lien passe en direct ou « par un relais » ; un échec avec « il faudrait un relais » voudrait dire que les relais de PeerJS ne suffisent pas.

---

## 9. Le plan du netcode (portes 2 et 3)

### 9.1 D'abord le lockstep à délai d'entrées (porte 2)

- Chaque appareil lit son joueur, envoie son entrée du tic t, et la joue au tic t + N, des deux côtés.
- N part de 2 à 3 tics sur Wi-Fi. Il est fixé au début du match à partir du ping mesuré (environ la moitié de la médiane, arrondie au tic supérieur, plus 1), puis gardé tout le match.
- Le combat attend l'entrée de l'autre si elle manque.
- Les entrées voyagent avec une petite fenêtre de redondance (les dernières non confirmées), pour qu'une perte se rattrape sans attendre.
- **Fait (tranche 2a, `src/net/lockstep.ts`)**, sans toucher à la scène du combat :
  - les `delay` premiers tics sont neutres des deux côtés ;
  - chaque message porte les entrées que l'autre n'a pas confirmées, les plus anciennes d'abord, 12 au plus ;
  - un message en retard ou en désordre n'ajoute que ce qu'il apporte ;
  - est refusé (et le lien coupé) : une entrée déjà reçue qui change, un tic neutre envoyé, un tic à plus de 240 tics devant (`MAX_AHEAD`), la confirmation d'une entrée jamais envoyée ;
  - **le test** (`tests/net/lockstep.test.ts`) relie deux moteurs par un faux réseau à graine fixe (latence de 1 à 9 images, 0 à 30 % de pertes, ordre mélangé). Il rejoue les 31 replays dorés comme suites d'entrées, avec 1, 3 et 5 tics de délai : les deux appareils ont le même hash à chaque tic, celui du même match joué sur un seul appareil avec le même délai.

### 9.2 Ensuite le rollback (porte 3)

- On prédit l'entrée de l'autre (la dernière connue), on garde les états et les entrées des derniers tics, et on resimule quand l'entrée réelle diffère.
- **`GameState` est immuable** (`step` rend un nouvel état) : garder un état coûte une référence, sans copie.
- **Les effets ne se rejouent jamais deux fois** : `detectEvents`, les sons, les flashs et les vibrations partent des tics confirmés seulement. Le budget de flashs ne voit donc qu'une fois chaque effet.

### 9.3 Les désynchronisations

- Un hash de l'état est échangé tous les 60 tics (`HASH_EVERY`, une fois par seconde) : `stateHash`, FNV-1a, celui des replays dorés. Il a été déplacé tel quel dans `src/net/state-hash.ts` (les replays gardent leur hash, la preuve que rien n'a changé). `src/net/desync.ts` garde le premier tic où les deux hashes diffèrent.
- Une différence s'affiche en clair (« Désynchronisé au tic X »). Elle s'enregistre avec les deux suites d'entrées, au format des replays dorés, pour pouvoir la rejouer.

### 9.4 Ce que la lecture du code a déjà trouvé (à régler à la porte 2)

- **La scène du Finisher se règle en local.** Elle se passe en tenant un bouton (`inputs.held`), avance le match sans le montrer (`playUnseen`, `playToResults`) et cadence elle-même les tics. Ce sont des entrées locales qui changent la simulation. **Décidé par le propriétaire (2 novembre 2026)** : en ligne, la scène se passe seulement quand **les deux** tiennent un bouton ; le « passer » devient une entrée transmise, la même des deux côtés.
- **La pause arrête la simulation en local.** **Décidé par le propriétaire (2 novembre 2026)** : une **pause partagée**. Une pause demandée arrête le combat chez les deux, au même tic, avec « Pause demandée par <pseudo> » ; chacun peut reprendre.
- **« Lutte en prise : tenir »** (`HeldStruggle`) transforme les entrées avant `step`. En ligne, elle s'applique **chez celui qui joue**, avant l'envoi : les deux côtés reçoivent alors les mêmes bits.
- **Le ralenti du KO** (`feedback.ticksFor`) ne change que la cadence. Les tics restent les mêmes : pas de désynchronisation, seulement une attente.
- **L'ambiance du décor est tirée au hasard dans le rendu** (`stageVariantFor`, #96). L'hôte la tire et l'envoie avec la map ; la config du match (combattants, tenues, map, ambiance) part une seule fois, de l'hôte.

### 9.5 La porte 2 en trois tranches

| Tranche | Ce qu'elle livre | État |
|---|---|---|
| 2a | Le lockstep et le contrôle de désynchronisation, purs, et leurs tests sur les replays dorés ; le hash d'état passé dans `src` | livrée |
| 2b | La scène du combat lit ses entrées d'une « source » (refactor sans changement de comportement, vérifié par les replays), puis le combat en ligne depuis le salon : pause partagée, coupure ramenée au menu sans vainqueur, délai mesuré au ping et affiché, revanche quand les deux la veulent | livrée (§9.6) |
| 2c | La scène du Finisher passée seulement quand les deux tiennent un bouton, et le replay d'une désynchronisation. D'ici là, en ligne, la scène se joue en entier : sans son « passer », elle ne fait que cadencer les tics, et rien ne se désynchronise | à faire |

**Les réponses du propriétaire pour la porte 2 (2 novembre 2026)**, chacune la recommandation : une coupure en plein match ramène au menu sans vainqueur ; le délai est mesuré au ping au début du match, puis gardé et affiché ; la revanche part quand les deux la veulent ; la scène lit ses entrées d'une « source », un seul combat pour le local et le Multi.

### 9.6 Le combat en ligne (tranche 2b)

- **La source des entrées.** La scène du combat demande ses entrées à une source (`src/render/tick-source.ts`) : en local, les joueurs de l'appareil et le CPU (`LocalTickSource`, ce que faisait la scène, à l'identique) ; en ligne, le match (`src/app/online-match.ts`). Une source dit combien de tics peuvent se jouer, peut s'arrêter en plein lot (la pause, la fin du match), et envoie une fois par image.
- **Le match en ligne** (`OnlineMatch`) reçoit la session du salon et le plan convenu. Il garde le lockstep et le contrôle de désynchronisation d'un combat, anew à chaque revanche.
  - **Chacun joue son combattant** avec ses commandes de joueur 1 (clavier, manette 1, tactile). La lutte en prise s'applique à son combattant avant l'envoi : les deux appareils reçoivent les mêmes entrées. La jauge BOOST et le Finisher de l'écran tactile, la vibration du téléphone et celle de la manette suivent ce combattant.
  - **Le délai** : l'hôte le choisit à son ping au moment de lancer (`delayFor` : la moitié de la médiane en tics, arrondie au supérieur, plus 1, de 2 à 10 ; 3 sans mesure), et l'envoie (`start`). Il est affiché sous le combat, avec le ping (« 12 ms · délai 2 »).
  - **La pause partagée** : la touche de pause demande la pause, qui part avec la prochaine entrée (`FLAG_PAUSE`). Les deux appareils la prennent après le même tic, et le menu dit qui l'a demandée. « Reprendre », d'un côté ou de l'autre, relance les deux ; « Quitter » arrête le match pour les deux.
  - **La fin du match** : le combat s'arrête sur le tic où le match est décidé (`resultsDue`, l'état seul), le même des deux côtés. Les résultats proposent « Revanche », qui part quand les deux l'ont choisie, chaque combat depuis son premier tic, et « Quitter ».
  - **Une coupure, un message invalide ou une désynchronisation** arrêtent le match sans vainqueur et ramènent au menu « Multi », avec leur phrase (« Désynchronisé au tic X » pour la dernière).
- **Ce qui est différé à la tranche 2c** : la scène du Finisher n'est passée par personne en ligne (« passer » ferait avancer le match de ce que l'appareil seul tient) ; le replay d'une désynchronisation.

---

## 10. Les questions au propriétaire

Chacune avait son hypothèse de départ. **Le 2 novembre 2026, le propriétaire a dit oui aux trois.**

1. **TURN pour la 4G et les réseaux stricts.**
   - **Retenu** : commencer par les relais publics de PeerJS (déjà dans PeerJS, sans compte, identifiants publics, sans garantie de service), et ne prendre un service à compte que si la mesure de la porte 4 les montre insuffisants. Exemples de services à compte : Cloudflare, Metered (un compte et une clé, qu'il faudrait garder hors du dépôt).
   - Ce que ça change : un relais voit passer les entrées du match (rien de sensible), et la CSP n'a pas à bouger (§6.1). Activé dès la porte 0 (`peer-matchmaker.ts`).
2. **Le pseudo (porte 1).**
   - **Retenu** : 2 à 12 caractères (lettres, chiffres, espace, tiret), demandé à la première recherche et retenu sur l'appareil.
   - Il est affiché tel quel, jamais interprété. Il passe par le protocole v2, validé comme le reste.
3. **L'acceptation avant le combat (porte 1).**
   - **Retenu** : les deux doivent accepter dans les 30 s. Refuser, ou laisser passer le délai, relance la recherche chez les deux.
   - Rien ne se joue tant que les deux n'ont pas dit oui.
   - **Écart à signaler** : les 30 s passées, celui qui n'a pas répondu revient au menu au lieu de relancer sa recherche (§7). Sinon, un appareil laissé sans personne devant continuerait de trouver l'autre et de le faire attendre 30 s, sans fin.
4. **Les réponses de la porte 1 (2 novembre 2026)**, chacune la recommandation :
   - la tenue suit la règle locale (en miroir, le joueur 2 porte la deuxième) ;
   - le pseudo n'a pas d'accents (la police pixel n'a pas les capitales accentuées) ;
   - un pseudo refusé l'est d'office jusqu'à la fermeture de l'onglet ;
   - l'hôte peut choisir « Aléatoire » : il tire, puis envoie le résultat.
5. **Les réponses pour la porte 2 (2 novembre 2026)** : la pause partagée, et la scène du Finisher passée seulement quand les deux tiennent un bouton (§9.4).

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

## 12. La décision du journal

Inscrite au journal de `docs/combat-v2.md` §0.2 sous **D38**. D36 est celle de Saphir (#114), et D37 est attribuée à Watt (#112, en cours).

| # | Décision | Origine | Pourquoi |
|---|---|---|---|
| D38 | Le **Multi en ligne** se trouve par une **recherche automatique** sur le serveur public de PeerJS : des salles aux identifiants connus (`nayosbeat-<version>-lobby-<n>`), la première libre est réservée, une prise est rejointe, et les deux appareils quittent le serveur une fois liés. Le jeu passe ensuite en direct, en WebRTC. Le réseau vit en bordure (`src/net`, interdit au cœur par le lint) et ne transporte que des entrées ; chaque message est versionné, borné et validé à la frontière. PeerJS n'est chargé qu'à la première recherche, et la CSP ne s'ouvre qu'à `wss://0.peerjs.com` (`docs/multijoueur.md`) | propriétaire (« Rechercher », service gratuit accepté) | Sans serveur à nous, le serveur public ne liste pas les pairs : des identifiants connus d'avance suffisent à se trouver. Écartés : un serveur à nous, un code à taper, faire passer le jeu par le serveur |
