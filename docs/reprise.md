# Reprendre le développement sans Claude Code

Ce guide sert quand les sessions Claude Code ne sont plus disponibles. Tu continues alors seul, ou avec **OpenCode** et son propre service de modèles (**OpenCode Console**, aussi appelé Zen), depuis ton PC à la maison (via Tailscale et Termius) ou directement sur ton téléphone (Termux).

Rédigé par la session principale le 2 novembre 2026, sur `main` à `c0221be`.

- **Pour un agent (OpenCode ou autre)** : `opencode.json` charge ce fichier, et `CLAUDE.md` est lu comme règles du projet. Lis les deux en entier avant d'agir.
- **Pour toi** : les §1 à §4 disent où on en est et comment travailler ; les §5 à §8 expliquent l'installation, Free Claude Code et la sécurité.

---

## 1. Où en est le projet

**En ligne** (https://alex-lou.github.io/NayosBeat/) : chaque push sur `main` est publié par GitHub Pages en une ou deux minutes.

Ce qui est fait et publié :
- **Nayo et Riff** jouables, avec la lumière de rue et leurs lumières vivantes (#97, #102). Pour Nayo seulement : les effets signature et le Boost avec ses propres images.
- **Le plan polish**, hors son : lots 1, 3, 6, 8, 9, 11, 14 et 16 (#81 à #95).
- **Les décors** : la rue, ses ambiances tirées à chaque match, le Viaduct Gym et l'écran « Lieu » (#96, #98, #99, #103).
- **Le son est abandonné** (décision du propriétaire).

**En cours, hors du jeu en ligne :**

| Chantier | Où | Prochaine étape | Ce qu'il faut |
|---|---|---|---|
| **Saphir** (3e combattante) | `docs/saphir.md`, `src/art/saphir/`, `tools/sprites/saphir/` | ses hurtbox mesurées, puis la porte 4, puis la PR de branchement (E), puis la PR F (plans du CPU, aide, équilibrage, D36 au journal) | « Branche quand c'est parfait » : le go est donné, sous condition de la porte 4 |
| **Watt** (colosse à tête d'ampoule, tiré de Zen-Tazzer) | PR #106 (porte 1a, docs seules) | ton « oui » sur la spec, puis la porte 1b (données) | ta validation |
| **Les prochains combattants** | [art/passation-personnages.md](art/passation-personnages.md) | suivre ses portes | — |
| **Le multijoueur à deux** | [prompts/multijoueur.md](prompts/multijoueur.md) | la porte 0 : se trouver et afficher le ping | à lancer |
| **Les poses de Nayo** (tranche 3 : hanches et jambes qui bougent, images-clés dessinées à la main) | [art/nayo-essence.md](art/nayo-essence.md) | à démarrer | — |
| **L'identité de Riff** (ses lumières de coup, ses effets, ses griffes) | [art/riff-lumiere.md](art/riff-lumiere.md), [art/nayo-vivante.md](art/nayo-vivante.md) | à démarrer, sur le modèle de Nayo | — |

**Décisions qui attendent le propriétaire :**
- la fluidité F2, sur la branche `feat/anim-f2` ;
- les données de Riff (équilibrage, D33) ;
- la silhouette A ou B ;
- la PWA (#36) ;
- les poses du Finisher (PR 4) ;
- le test réel sur téléphone des lumières vivantes et du Viaduct Gym.

---

## 2. Les règles

- **[CLAUDE.md](../CLAUDE.md) fait foi** : c'est la charte du studio, valable pour tout agent.
- **Les invariants :**
  - `src/core` est pur, déterministe, en entiers, à 60 tics par seconde ;
  - les 31 replays dorés ne bougent pas sans raison écrite ;
  - D17 : le rendu ne touche jamais au cœur ;
  - D23 : rien n'est interpolé entre deux tics ;
  - au plus 3 flashs par seconde ;
  - mémoire vidéo d'un match sous 90 Mo, textures de 4 096 px au plus.
- **Le journal des décisions** : `docs/combat-v2.md` §0.2. Le dernier numéro est D35 ; D36 est réservé à Saphir et D37 à Watt.
- **Les retours du propriétaire sur l'art**, à relire avant de montrer quoi que ce soit : [art/passation-personnages.md](art/passation-personnages.md) §2.1.

---

## 3. Comment travailler, sans session principale

C'était le rôle de la session Claude « principale » ; c'est maintenant le tien, ou celui de ton agent :

1. **Une branche par chantier**, partie de `main` à jour :
   ```sh
   git fetch origin main
   git switch -c feat/mon-chantier origin/main
   ```
2. **Les contrôles de la CI, en local, avant chaque push** (c'est ce que fait `.github/workflows/ci.yml`) :
   ```sh
   npm run check            # format, lint, types, tests, aseprite, build
   npm run replays:update   # ne doit RIEN changer : git status propre
   ```
   Depuis le téléphone, `npm run nayos -- check` fait les deux et dit si les replays ont bougé.
   Après `npm run sprites`, vérifie `git status` : `public/icons` peut avoir été réécrit.
3. **Ajouter les fichiers un par un**, jamais `git add -A`. Les docs et les commits sont en français, les commentaires du code en anglais.
4. **Pousser et ouvrir une PR** :
   ```sh
   git push -u origin feat/mon-chantier
   gh pr create --draft
   ```
5. **Fusionner** quand la CI GitHub est verte. **Fusionner publie** : `main` part en ligne.
   - Avant de fusionner la PR d'un autre (agent ou session), vérifie-la **combinée avec `main`** :
     ```sh
     git merge origin/main
     ```
     puis toute la CI.
   - Fusionne en « squash » :
     ```sh
     gh pr merge --squash
     ```
6. **Montrer avant de publier l'art** : des planches avant/après en ×3 et des GIF à vitesse réelle. L'outil de capture image par image est décrit dans [art/nayo-vivante.md](art/nayo-vivante.md).

---

## 4. Lancer un agent OpenCode sur ce dépôt

Dans le dossier du dépôt :
```sh
opencode
```
Puis, au premier lancement, donne-lui ce message :

```text
Tu reprends NayosBeat. Lis d'abord CLAUDE.md et docs/reprise.md en entier : ils font foi. Puis dis-moi en 5 lignes où en est le projet et ce que tu proposes de faire en premier, avec ton hypothèse. N'écris rien avant mon « oui ». Tu travailles sur une branche, tu lances toute la CI avant chaque push, et tu ne fusionnes jamais sans mon accord. Termine chaque tâche par : Fichiers modifiés / Ce qui a été modifié / Fichiers intentionnellement non touchés / Suivi nécessaire.
```

Pour un chantier précis, colle plutôt le prompt qui lui correspond : [prompts/multijoueur.md](prompts/multijoueur.md), ou l'annexe de [art/passation-personnages.md](art/passation-personnages.md).

---

## 5. Installation A : ton PC à la maison, piloté depuis le téléphone

Le plus confortable quand le PC est allumé : il fait le travail lourd (tests, build, captures), et le téléphone sert d'écran et de clavier. **La voie principale du propriétaire est le téléphone seul : §6.**

**En bref** : `tools/remote/setup.sh --opencode` sur le PC vérifie tout, installe les dépendances et OpenCode. Ensuite, depuis le téléphone, une seule commande : `npm run nayos`. Le détail suit.

**Le cockpit `npm run nayos`** : un menu à gros boutons, dans une session `tmux` qui survit aux coupures. Il propose :
- l'agent : OpenCode, ou Claude Code via Free Claude Code ;
- les contrôles de la CI ;
- le serveur de dev, avec l'adresse à ouvrir sur le téléphone ;
- récupérer `main` ;
- l'état du dépôt ;
- les PR ouvertes.

Chaque action se lance aussi directement : `npm run nayos -- check`, `dev`, `status`… Il ne pousse et ne fusionne **jamais** : publier reste un geste volontaire.

### 5.1 Sur le PC (Linux, macOS, ou Windows avec WSL)

1. **Tailscale** : installe-le et connecte-le au même compte que ton téléphone. Note son adresse Tailscale (`100.x.y.z`) ou son nom MagicDNS.
2. **SSH** :
   - Linux : `sudo apt install openssh-server`.
   - macOS : Réglages, Partage, Session à distance.
   - Windows : utilise **WSL** (Ubuntu) et installe-y `openssh-server`, ou bien active le serveur OpenSSH de Windows.
   - Autre solution : `tailscale up --ssh` active Tailscale SSH, sans clé à gérer.
3. **Les outils** :
   - **Node 22**, la version de la CI (par exemple avec `nvm install 22`) ;
   - **git** ;
   - **gh**, la CLI GitHub (`gh auth login`) ;
   - **lua5.4**, pour `npm run aseprite:check` ;
   - **tmux**, pour que le travail survive à une déconnexion du téléphone.
4. **Le dépôt** :
   ```sh
   git clone https://github.com/Alex-Lou/NayosBeat.git
   cd NayosBeat
   tools/remote/setup.sh --opencode
   ```
   Le script vérifie git, Node 22 (version de `.nvmrc`), lua, tmux, gh et Tailscale. Il dit ce qui manque, lance `npm ci` et installe OpenCode depuis npm.
   Les outils de capture (Playwright) demandent un Chromium : `npx playwright install chromium`, seulement si tu veux faire des films.
5. **OpenCode** (déjà installé par `--opencode`) : son propre service de modèles s'appelle **OpenCode Console** (aussi appelé Zen).
   1. Crée ton compte sur la console d'OpenCode (https://opencode.ai/console), ajoute des crédits si tu veux des modèles payants, et copie ta clé d'API.
   2. Dans `opencode`, tape `/connect`, choisis le fournisseur **OpenCode** et colle ta clé.
   3. Tape `/models` pour choisir le modèle. Certains modèles sont **gratuits**, souvent pour une durée limitée ; les autres se paient à la requête, avec des frais à chaque achat de crédits.

   La clé est rangée dans `~/.local/share/opencode/auth.json`, **hors du dépôt** : ne la colle jamais dans un fichier du projet.

### 5.2 Depuis le téléphone

1. Tailscale est allumé sur le téléphone.
2. Dans **Termius**, crée un hôte avec l'adresse Tailscale du PC, ton utilisateur, et une clé SSH (Termius sait en générer une ; ajoute sa partie publique dans `~/.ssh/authorized_keys` sur le PC).
3. Connecte-toi, puis :
   ```sh
   cd NayosBeat
   npm run nayos
   ```
   Si la connexion coupe, reconnecte-toi et relance `npm run nayos` : tu retrouves la session `tmux` telle que tu l'as laissée.
4. **Tester le jeu sur le téléphone** : dans le cockpit, choisis « Serveur de dev ». Il affiche l'adresse à ouvrir, `http://100.x.y.z:5173`. Le nom MagicDNS du PC (`http://mon-pc.xxx.ts.net:5173`) marche aussi : `vite.config.ts` autorise les noms en `.ts.net`, pour le serveur de dev seulement.

---

## 6. Installation B : tout sur le téléphone (Android, Termux), la voie principale

Le propriétaire veut d'abord que tout marche **sur son téléphone, sans PC**. Tout tourne dans une **Debian à l'intérieur de Termux** (`proot-distro`) : le dépôt, Node 22, OpenCode, les tests, au même endroit. Le binaire officiel d'OpenCode ne tourne pas dans Termux nu, mais il tourne dans cette Debian, qui est un vrai Linux arm64. C'est plus lent qu'un PC : le build et les tests passent, mais les films (Chromium) ne marchent pas.

1. **Termux** : installe-le depuis **F-Droid** (la version du Play Store est ancienne). Dans les réglages Android, désactive l'**optimisation de batterie** pour Termux, sinon Android le coupe en arrière-plan.
2. **Debian dans Termux** :
   ```sh
   pkg update && pkg upgrade
   pkg install proot-distro
   proot-distro install debian
   proot-distro login debian     # pour y revenir plus tard : la même commande
   ```
3. **Dans Debian, les outils** :
   ```sh
   apt update && apt install -y curl git ca-certificates tmux lua5.4
   curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
   apt install -y nodejs
   ```
4. **Le jeu, et OpenCode** :
   ```sh
   git clone https://github.com/Alex-Lou/NayosBeat.git
   cd NayosBeat
   tools/remote/setup.sh --opencode
   ```
   Dans Debian, le script se comporte comme sur un PC Linux : il vérifie les outils, lance `npm ci` et installe OpenCode depuis npm. L'absence de Tailscale y est normale.
5. **La clé** : `opencode`, puis `/connect`, puis **OpenCode** ; colle ta clé, puis `/models`. Une clé créée en **Restricted**, avec **Models : Request** et tout le reste sur **None**, suffit.
6. **Au quotidien** : `npm run nayos`, le cockpit dans `tmux`. « Serveur de dev » donne `http://localhost:5173`, à ouvrir dans Chrome sur le téléphone : Debian et Android partagent le même réseau.
7. **Pousser sur GitHub** : un **jeton à grain fin** limité au dépôt NayosBeat (« Contents » et « Pull requests » en lecture et écriture), donné à git ou à `gh auth login`. Jamais dans un fichier du dépôt.

**Incertitudes** :
- je n'ai pas pu essayer OpenCode dans cette Debian sur un vrai téléphone ;
- un portage communautaire d'OpenCode pour Termux nu existe, plus rapide mais non officiel : à éviter tant que la voie Debian marche.

---

## 7. Claude Code sur d'autres modèles : Free Claude Code (FCC)

[Free Claude Code](https://github.com/Alishahryar1/free-claude-code) (licence AGPL-3.0) fait tourner **Claude Code** sur d'autres fournisseurs, dont **OpenCode Zen** (les modèles d'OpenCode, avec la même clé). C'est un petit serveur local qui traduit les requêtes. On garde ainsi les habitudes de Claude Code (`CLAUDE.md`, ses outils) avec ta clé OpenCode.

**L'installation sûre, sur le PC seulement** : `tools/remote/setup.sh --fcc`.
- Elle installe **FCC seul, à une version figée** (`free-claude-code==6.18.5`, depuis PyPI, avec `uv`), et Claude Code depuis npm s'il manque.
- **Elle n'utilise pas l'installateur officiel de FCC** : lancé sans choix, il installe aussi une dizaine d'autres agents (Aider, Muse et d'autres) à leur toute dernière version, dont un par un script téléchargé depuis un autre site. Je l'ai lu et lancé à blanc avant de l'écarter.
- FCC demande exactement Python 3.14.10 : avec un `uv` ancien, `uv self update` d'abord.

**Ensuite** :
1. Lance `fcc-server`, puis ouvre son **Admin UI sur le PC lui-même** choisis le fournisseur **OpenCode Zen**, et colle ta clé OpenCode (son réglage `OPENCODE_API_KEY`). Les modèles s'y écrivent `opencode_zen/<modèle>`. Le serveur ne doit écouter que la machine locale ; ne l'expose ni sur Internet ni sur le réseau.
2. Depuis le téléphone, dans le cockpit, choisis « Claude Code via Free Claude Code » (ou lance `fcc-claude`).

**Ses robots Telegram et Discord** (piloter l'agent par messages, même vocaux) : je les laisse **éteints**. Un message reçu par ce robot devient une commande exécutée sur ton PC, et tout passe par les serveurs de Telegram ou de Discord. Tailscale et Termius font la même chose sans intermédiaire. Si tu veux quand même les essayer :
- un utilisateur dédié sur le PC, qui ne voit que le clone de NayosBeat ;
- le dossier autorisé limité à ce clone ;
- l'identifiant Telegram numérique de toi seul en liste blanche ;
- aucune autre clé dans cet environnement que celles du jeu.

**Incertitudes** :
- je n'ai pas pu installer FCC jusqu'au bout ici, car le `uv` du conteneur ne connaît pas encore Python 3.14.10. Le script s'arrête avec ce message si ça t'arrive ;
- la façon exacte dont `fcc-claude` aiguille Claude Code vers FCC est décrite dans sa doc, pas vérifiée ici.

---

## 8. Sécurité

- **Les clés** (OpenCode, GitHub) restent dans les fichiers de configuration de chaque outil, jamais dans le dépôt, jamais dans un message de commit. Si une clé fuit, révoque-la tout de suite sur le site concerné.
- **GitHub** : pour `gh auth login`, préfère un **jeton à grain fin** limité au seul dépôt NayosBeat, avec les droits « Contents » et « Pull requests » en lecture et écriture, et rien d'autre. Un agent qui déraille ne peut alors toucher que ce dépôt.
- **Un environnement propre** : idéalement, un utilisateur dédié sur le PC pour le développement, sans tes autres clés, documents ni sessions de navigateur. L'agent exécute des commandes : il ne doit voir que ce qu'il lui faut.
- **Tailscale** : n'expose pas le serveur de développement sur Internet. Le réseau Tailscale suffit.
- **Un agent** propose et fait sur une branche. **Toi seul** décides ce qui est fusionné, donc publié.

---

## 9. Les sessions Claude encore ouvertes

Tant qu'elles existent, elles se répondent avec `send_message` :
- **la session principale** : `session_01KAcVVTMwJQUKKCQ1pvSMFk` (revue, fusion, publication) ;
- **Saphir** : `session_01JBLzLLWNQ2uwtPEZf6UUhQ` ;
- **Watt / agent design Zen-Tazzer** : `session_01JBLzLMFWxsfSiqQ41agPVG` ;
- **polish** (son plan est fini) : `session_01JBLzLKLsdBNRQhN4wH6Nka`.

Quand elles ne sont plus là, ce guide et les docs du dépôt suffisent : tout l'état du projet est dans `main`, les PR et ces fichiers.
