<p align="center">
  <img src="src-tauri/icons/logo.png" alt="KKTerm" width="128" />
</p>

<h1 align="center">KKTerm</h1>

<p align="center">
  <strong>Une seule fenêtre native de bureau pour les terminaux, le SSH, le SFTP, le RDP/VNC et un tableau de bord — plus une IA qui fabrique vos petits outils sur demande.</strong>
</p>

<p align="center">
  <em>Parce que votre barre des tâches ne devrait pas ressembler à une machine à sous de Las Vegas.</em>
</p>

<p align="center">
  <sub>Nommé d'après <strong>乖乖 (Kuāi Kuāi)</strong>, l'en-cas vert à la noix de coco que les administrateurs taïwanais posent sur leurs serveurs pour qu'ils se tiennent bien. On espère que cette appli gagnera sa place sur le rack.</sub>
</p>

<p align="center">
  <strong><a href="https://github.com/ryantsai/KKTerm/releases/latest">Télécharger la dernière version de KKTerm</a></strong>
</p>

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm/stargazers">
    <img src="https://img.shields.io/github/stars/ryantsai/KKTerm?style=for-the-badge&logo=github&color=ffd33d" alt="GitHub stars" />
  </a>
  <a href="https://github.com/ryantsai/KKTerm/network/members">
    <img src="https://img.shields.io/github/forks/ryantsai/KKTerm?style=for-the-badge&logo=github&color=8a63d2" alt="GitHub forks" />
  </a>
  <a href="https://github.com/ryantsai/KKTerm/releases">
    <img src="https://img.shields.io/github/downloads/ryantsai/KKTerm/total?style=for-the-badge&logo=github&color=0969da" alt="GitHub downloads" />
  </a>
  <a href="https://github.com/ryantsai/KKTerm/issues">
    <img src="https://img.shields.io/github/issues/ryantsai/KKTerm?style=for-the-badge&logo=github&color=2ea043" alt="Open issues" />
  </a>
  <a href="https://github.com/ryantsai/KKTerm/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/ryantsai/KKTerm?style=for-the-badge&color=blue" alt="MIT License" />
  </a>
  <br />
  <img src="https://img.shields.io/badge/cross%E2%80%91platform-desktop-0078D6?style=flat-square" alt="Cross-platform desktop" />
  <img src="https://img.shields.io/badge/local--first-no%20telemetry-success?style=flat-square" alt="Local-first" />
  <br />
  <sub>
    <a href="README.md">English</a> ·
    <a href="README.zh-TW.md">繁體中文</a> ·
    <a href="README.zh-CN.md">简体中文</a> ·
    <a href="README.ja.md">日本語</a> ·
    <a href="README.ko.md">한국어</a> ·
    <strong>Français</strong> ·
    <a href="README.de.md">Deutsch</a> ·
    <a href="README.es.md">Español</a> ·
    <a href="README.es-MX.md">Español (MX)</a> ·
    <a href="README.it.md">Italiano</a> ·
    <a href="README.pt-BR.md">Português (BR)</a> ·
    <a href="README.th.md">ไทย</a> ·
    <a href="README.id.md">Bahasa Indonesia</a> ·
    <a href="README.vi.md">Tiếng Việt</a>
  </sub>
</p>

---

## L'argumentaire en 45 secondes

Vous êtes sysadmin / DevOps / bricoleur de homelab / vibe-codeur. En ce moment, vous avez :

- Un émulateur de terminal
- Un client SSH à part (avec une liste de profils qu'il vous a fallu un week-end pour bâtir)
- Un client SFTP de 2007 qui, on ne sait comment, existe encore
- Le Bureau à distance dans une fenêtre que vous perdez toujours sur le mauvais écran
- Une visionneuse VNC pour cette seule machine Linux
- Un onglet de navigateur pour l'interface admin du routeur
- Un gestionnaire de fichiers pour fouiller le disque local, et un éditeur de texte pour ce seul log que vous laissez tourner en `tail`
- Une session `claude` / `codex` sur une machine distante qui tombe dès que votre Wi-Fi éternue
- Un post-it avec des mots de passe *(t'inquiète, on dira rien)*

**KKTerm, c'est une seule fenêtre pour tout ça.** Native sous Windows — *volontairement, alors que le reste du monde des outils dev sort d'abord pour mac et traite votre OS comme une note de bas de page* — dans un seul installateur qui refuse de téléphoner à la maison.

Plus quelques trucs que vous ne saviez pas vouloir :

- Un **Dashboard** où vous dites à une IA *« construis-moi un widget qui ping mon routeur toutes les 30 secondes »* et il apparaît, dans son propre bac à sable, sur votre grille.
- **Des panneaux SSH qui se rattachent à votre session distante `claude` / `codex`** après chaque caprice du Wi-Fi, pour qu'un travail de six heures survive à une coupure.
- Des **espaces de travail (Workspaces)** qui gardent votre homelab, le boulot et les serveurs de ce client-là dans des conteneurs séparés et commutables.
- Un **Install Helper** qui trouve, installe, met à jour et lance les outils dev Windows que vous traquez d'habitude à travers dix onglets de navigateur.
- **Vingt-six fonds animés** pour le tableau de bord *et vos terminaux* (oui, dont `matrix`), parce qu'on n'est pas au-dessus de ça.

Et le meilleur : l'assistant IA peut transformer une seule phrase en un petit outil de tableau de bord que vous gardez vraiment.

> ⭐ **Si ça ressemble à l'appli que vous comptiez construire depuis six ans — mettez une étoile au dépôt pour qu'on sache que quelqu'un regarde. Ça aide vraiment.**

Un avis sur la suite ? Rejoignez le fil de retours public :
**[Que devrait prioriser KKTerm pour les workflows admin multiplateformes ?](https://github.com/ryantsai/KKTerm/discussions/141)**

---

## Pourquoi « KKTerm » ?

Entrez dans n'importe quel data center taïwanais et regardez le haut des racks. Au-delà des fabs de TSMC, des salles de contrôle du métro de Taipei, des salles serveurs de la banque Cathay, des équipements de commutation de Chunghwa Telecom — vous repérerez un petit sachet vert de 乖乖 (Kuāi Kuāi), un en-cas au maïs parfumé à la noix de coco des années 1960.

Le nom signifie littéralement **« sois sage »**, **« tiens-toi bien »**. La tradition informatique est simple et tout à fait sérieuse :

- **Il doit être vert (noix de coco).** Le jaune (curry) veut dire *reste chez toi aujourd'hui* ; le rouge (épicé) met le serveur en colère. Vert seulement.
- **Il ne doit pas être périmé.** Un Kuai Kuai éventé joue contre vous. Les ingénieurs les remplacent avec diligence.
- **Il doit être visible.** Le serveur doit savoir qu'il est là.
- **Ne le mangez pas.** Ce sachet est en service.

Certains des systèmes les plus grands, les plus ennuyeux et les plus obsédés par la disponibilité en Asie tournent avec un sachet de soufflés de maïs scotché au châssis. Ça marche parce que les gens qui les maintiennent croient que ça marche, ce qui est une description remarquablement honnête de la plupart de la culture IT.

**KKTerm**, c'est **Kuai Kuai Term** — un espace d'administration qui vise le même rôle que l'en-cas : s'asseoir tranquillement à côté de vos machines importantes et les aider à bien se tenir. Local d'abord. Pas de télémétrie. IA sous validation. Le genre de logiciel ennuyeux et fiable.

On n'a pas encore réussi à livrer un vrai sachet de Kuai Kuai avec l'installateur. C'est un point pour la v2.

---

## Voir ça bouger

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm">
    <img
      src="docs/assets/demo.gif"
      alt="KKTerm demo"
      width="720"
    />
  </a>
</p>

<p align="center"><sub><em>(Le GIF de démo. Une image vaut mille puces, et on est à court de puces.)</em></sub></p>



---

## Une fenêtre, chaque connexion

| Ce que vous vouliez… | Ce que fait KKTerm |
| --- | --- |
| Ouvrir un shell local PowerShell / cmd / WSL | Des terminaux locaux, côte à côte |
| SSH vers un serveur | SSH avec clés, agent, mots de passe, hôtes de rebond et redirection de ports |
| Parcourir les fichiers de ce serveur | SFTP depuis la connexion SSH — double volet, glissez pour transférer |
| FTP vers un NAS de 2012 | FTP / FTPS dans le même explorateur de fichiers |
| Telnet vers du matériel antique | Oui, Telnet est là aussi |
| Parler à un port série | Connexions série — choisissez un port COM et un débit |
| Prendre la main sur une machine Windows | Le vrai Bureau à distance Microsoft, intégré |
| VNC vers un Pi | VNC, rendu directement dans l'espace de travail |
| Ouvrir l'interface web du routeur | Un onglet de navigateur intégré avec identifiants enregistrés |
| Parcourir votre propre disque | Un volet File Explorer local, le même double-volet que SFTP |
| Ouvrir un log, un CSV, une image ou un PDF | Une visionneuse Document intégrée avec un vrai mode log en suivi (tail) |
| Surveiller le CPU de l'hôte | Une barre d'état en direct et un tableau de bord à bâtir vous-même |

La même appli. La même fenêtre. Les mêmes raccourcis. Le même thème, qu'on espère non agressif pour les yeux.

<p align="center">
  <img src="docs/assets/screenshots/connections-grid.png" alt="Un seul Tab contenant SSH, SFTP et une interface web intégrée côte à côte" width="720" />
</p>


---

## Pourquoi les gens le laissent ouvert toute la journée

### Un petit téléchargement, un lancement éclair

KKTerm est conçu pour se comporter comme un utilitaire, pas comme une plateforme. Les builds desktop actuels pèsent moins de 20 Mo, s'installent vite et se lancent assez rapidement pour que l'ouverture de votre espace d'administration ne ressemble pas au démarrage d'un deuxième système d'exploitation.

Cette petite empreinte compte sur les jump boxes, les vieux portables et les VM, où chaque service d'arrière-plan supplémentaire est une chose de plus à ne pas vouloir faire confiance. KKTerm s'ouvre, restaure votre espace de travail et se fait oublier.

### Des grilles multi-volets, mélangées comme vous travaillez

Un Tab peut contenir une grille de Panes, et ces Panes n'ont pas besoin d'être du même type. Mettez SSH à côté de SFTP, un PowerShell local sous une RDP Session, VNC à côté de l'interface web du routeur, ou un navigateur de fichiers près du terminal qui déplace les fichiers.

C'est un seul espace de travail pour la forme réelle et désordonnée de l'administration : mélangez les types de Connection, redimensionnez la grille, gardez les live Sessions en vie et arrêtez de faire Alt-Tab dans une pile de fenêtres.

<p align="center">
  <img src="docs/assets/screenshots/multi-pane.png" alt="Un Tab divisé en quatre volets de types de connexion différents" width="720" />
</p>


### Un assistant IA qui pilote vos terminaux pour vous

La plupart des démos d'« IA dans le terminal » s'arrêtent au chat. L'assistant de KKTerm travaille *à l'intérieur* de votre session : vous lui donnez du contexte à partir de ce qui est déjà à l'écran, et il agit sur les machines auxquelles vous êtes connecté — avec un humain dans la boucle d'approbation.

**Donnez-lui le contexte, directement.** Sans relais copier-coller :

- **Ajouter le tampon du terminal au contexte** aspire le scrollback d'une session locale ou distante en cours directement dans la conversation, pour que « pourquoi ce build a-t-il échoué ? » devienne une question qu'il peut vraiment lire.
- Le **menu de capture d'écran** saisit une région ou un Pane entier et dépose l'image dans le chat, pour que « pourquoi cette boîte de dialogue est-elle bizarre ? » soit une question à laquelle il peut répondre.
- **Joignez des fichiers** et le **contexte de page Dashboard / IT Ops** courant, pour qu'il raisonne sur ce que vous regardez réellement et non sur une description vague.

**Laissez-le agir — derrière une approbation.** L'assistant peut exécuter des commandes dans vos terminaux, ouvrir des Connections et placer des widgets sur le tableau de bord, mais le risqué reste sous garde :

- **Choisissez ce qu'il peut toucher** — activez/désactivez des familles d'outils entières (Dashboard / Connections / Live Sessions).
- **Choisissez comment il demande** — `Prompt` (par défaut, demande à chaque fois) ou `Allow All` (vous êtes adulte, vous avez signé la décharge).
- Tout ce qui ressemble à `rm -rf` est marqué comme dangereux — avec la raison affichée sur la carte d'approbation — et attend un oui humain explicite. L'IA ne peut pas exécuter discrètement une commande destructrice parce que quelqu'un a glissé une injection de prompt dans une page de man.

**Apportez votre propre cerveau.** Il parle à OpenAI, Anthropic, OpenRouter, DeepSeek, Grok, Azure OpenAI, LiteLLM, GitHub Copilot, Ollama, NVIDIA, ou n'importe quel endpoint compatible OpenAI — et il peut tourner sur le **CLI Claude Code** ou le **CLI Codex** comme backend, en s'appuyant sur votre login et votre abonnement `claude` / `codex` existants plutôt que sur une clé API séparée. Vos clés API vont dans le trousseau de l'OS.

<p align="center">
  <img src="docs/assets/screenshots/ai-assistant.png" alt="Le panneau de l'assistant IA avec les bascules d'accès aux outils et de mode d'approbation" width="720" />
</p>


### Un tableau de bord qui ne se prend pas pour Grafana

Le Dashboard est une grille de widgets que l'on glisse et redimensionne. Ce n'est pas pour l'observabilité à l'échelle du pétaoctet — c'est pour « je veux un bouton pour lancer mes cinq applis préférées et un panneau montrant la disponibilité de mon hôte SSH, *à côté* de mon chat ».

#### Widgets créés par l'IA — décrivez-le, obtenez-le

C'est la partie qui nous emballe vraiment. Vous ne choisissez pas dans un marketplace et vous n'écrivez pas de JavaScript. Vous **dites à l'assistant IA ce que vous voulez**, et il construit le widget là, sur votre tableau de bord :

> *« Ajoute un widget qui montre les 5 derniers commits de mon repo principal en liste. »*
> *« Fais-moi un widget pense-bête pour ma fiche d'astreinte. »*
> *« Construis un widget qui ping mon routeur domestique toutes les 30 secondes et affiche vert/rouge. »*
> *« Il me faut un chronomètre. Surprends-moi sur le style. »*

Certains sont de simples panneaux d'affichage (markdown, listes à cocher, un gros chiffre) ; d'autres exécutent du code en direct dans un bac à sable isolé que vous approuvez. Chaque widget que vous gardez est à vous — il persiste avec sa couleur, son icône et son titre, et vous pouvez en avoir plusieurs copies de tailles différentes. Supprimez-en un d'un clic droit quand la magie s'estompe.

<p align="center">
  <img src="docs/assets/screenshots/ai-widgets.png" alt="Une grille de tableau de bord remplie de widgets créés par l'IA" width="720" />
</p>


#### Fonds animés du tableau de bord/terminal (parce qu'on en avait envie)

Choisissez une ambiance — par vue de tableau de bord, *ou derrière n'importe quel terminal* — parmi **vingt-six** fonds animés sur canvas :

| Ambiance | Fonds |
| --- | --- |
| Calme | `aurora`, `clouds`, `ocean`, `raindrops`, `rainywindow`, `frostedWindow`, `snow`, `sakura`, `fireflies`, `bubbles`, `aquarium`, `ricefield`, `lanterns` |
| Spatial | `starfield`, `nebula` |
| Chaud | `embers`, `lava` |
| Geek | `matrix`, `topo`, `synthwave` |
| Agité | `cyberpunk`, `taipei101`, `thunderstorm`, `confetti`, `particleCursor` |

Le même sélecteur alimente aussi vos panneaux de terminal, vous pouvez donc poser `matrix` derrière une session SSH active. Ils se mettent en pause quand vous êtes ailleurs, donc ils ne coûtent quasi rien. Associez `matrix` à votre assistant IA pour une ambiance qui dit « je suis extrêmement productif et probablement dans un film des Wachowski ». Ou choisissez `ocean` pour avoir l'air d'une personne sérieuse. On ne juge ni l'un ni l'autre.

<p align="center">
  <img src="docs/assets/screenshots/backgrounds.png" alt="Quelques-uns des fonds animés côte à côte" width="720" />
</p>


### Garder vos agents IA en vie

C'est la deuxième fonction dont les gens tombent amoureux. Les terminaux SSH de KKTerm peuvent vous déposer directement dans une **session tmux nommée** sur l'hôte distant, qui survit à la reconnexion :

- Ouvrez une connexion SSH avec tmux activé et lancez `claude`, `codex`, `gemini-cli`, `cursor-agent`, ou tout agent au long cours que vous préférez.
- Fermez le portable. Rouvrez-le. Le panneau se rattache en silence — l'agent tourne encore, garde son scrollback, en plein milieu de ce qu'il faisait.
- Une coupure réseau ? KKTerm se reconnecte discrètement à la même session sans vous embêter.
- Besoin de l'aide de l'assistant ? « Ajouter le tampon du terminal au contexte » aspire toute la session distante dans la conversation, pour que votre IA locale raisonne sur ce que fait votre agent distant.

Si vous avez déjà perdu une session `claude` ou `codex` de six heures à cause du Wi-Fi capricieux d'un hôtel, cette seule fonction rentabilise l'appli. (L'appli est gratuite. La fonction en vaut quand même la peine.)

Les shells locaux ont droit au même tour sous Windows : les panneaux PowerShell peuvent tourner dans **psmux**, le clone natif de tmux, pour que vos tâches locales au long cours survivent à un Pane fermé, comme les distantes.

<p align="center">
  <img src="docs/assets/screenshots/tmux-reattach.png" alt="Un panneau SSH se rattachant à une session tmux nommée après une reconnexion" width="720" />
</p>


### Séparer vos mondes avec les espaces de travail

Le homelab, le boulot et les serveurs de ce client-là n'ont pas leur place dans la même liste. Les **espaces de travail (Workspaces)** sont des conteneurs de Connections nommés et isolés que vous commutez depuis l'Activity Rail. Commuter ne re-cadre que l'arbre des connexions — vos Sessions ouvertes, le Dashboard et les réglages restent en place — donc changer de contexte coûte un clic, pas un redémarrage.

<p align="center">
  <img src="docs/assets/screenshots/workspaces.png" alt="Le sélecteur d'espace de travail dans l'activity rail" width="720" />
</p>


### Habillez-le : thèmes de couleurs

Les fonds, c'est le côté fun ; les **thèmes de couleurs**, c'est ce que vous fixez vraiment toute la journée. KKTerm propose **vingt-six** schémas de couleurs qui restylent tout l'habillage de l'appli — Activity Rail, arbre des connexions, onglets, boîtes de dialogue — avec un mini-aperçu en direct de chacun sous Réglages ▸ Apparence :

| Ambiance | Schémas |
| --- | --- |
| Neutre | `Default`, `Dark`, `Light`, `Match OS` (suit le clair/sombre du système), `Mac` |
| Coloré | `Orange`, `Purple`, `Pink`, `Confetti`, `Bubble Tea` |
| Saveur locale | `Green Kuai Kuai` (oui, la friandise), `Blue See`, `Blue, Green and White`, `Semiconductor` |

Le terminal garde sa propre palette sombre quel que soit le schéma choisi, pour que vos shells restent lisibles pendant que le reste de l'appli s'accorde à votre humeur.

<p align="center">
  <img src="docs/assets/screenshots/color-themes.png" alt="La grille des schémas de couleurs dans les Réglages avec aperçus en direct" width="720" />
</p>


### Install Helper (Windows uniquement)

Préparer une machine Windows neuve pour le dev, c'est d'habitude dix onglets de navigateur et beaucoup de « suivant, suivant, terminer ». L'**Install Helper** est un catalogue intégré qui trouve, installe, met à jour et désinstalle les outils que vous traqueriez sinon à la main — sans quitter KKTerm :

- **Essentials** — winget, Node (via nvm-windows), Python (via uv), Git.
- **AI Agents** — Claude Code, Codex, Antigravity, OpenCode, et d'autres CLI et applis de bureau d'agents de code.
- **AI Platforms** — des stacks locaux / auto-hébergés comme Ollama, n8n, Open WebUI, Flowise et Langflow, lancés et gérés pour vous.
- **Development** — éditeurs, conteneurs, outils d'API, WSL et ses distributions, Rustup.
- **Windows Power User** — PowerToys, PowerShell 7, psmux, Sysinternals, Everything, Ditto.
- **Remote Access** — Tailscale, RustDesk.
- **Utilities** — Notepad++, ripgrep, jq, fzf, 7-Zip, Oh My Posh, FFmpeg, et plus.

Il détecte ce qui est déjà installé, signale ce qui a une mise à jour, et **Tout mettre à jour** déroule la file pour vous. Les invites UAC restent explicites, rien ne s'installe en silence, et tout le catalogue est embarqué dans l'appli — aucun compte supplémentaire, aucune télémétrie en arrière-plan.

> macOS et Linux ont déjà des gestionnaires de paquets que vous adorez, donc l'Install Helper est un confort réservé à Windows et ne fait pas partie de ces builds.

<p align="center">
  <img src="docs/assets/screenshots/install-helper.png" alt="Le catalogue Install Helper avec les outils installés et disponibles" width="720" />
</p>


---

## Ce que KKTerm n'est pas

Une courte liste, parce que l'honnêteté inspire confiance :

- **Pas un produit cloud.** Pas de synchro, pas de comptes d'équipe, pas d'offre SaaS. Si vous voyez un jour une boîte « Se connecter à KKTerm », c'est qu'un truc a catastrophiquement mal tourné.
- **Ne prétend pas que tous les OS sont identiques.** KKTerm publie des builds Windows, macOS et Linux, tout en gardant les fonctions propres à chaque plateforme clairement indiquées.
- **Pas un agent IA autonome.** L'assistant propose ; l'humain dispose. `Allow All` est un choix que vous faites, pas un défaut.
- **Pas un remplaçant de Grafana / Datadog.** Le Dashboard est pour des surfaces de contrôle personnelles, pas pour l'observabilité de 10 000 hôtes.
- **Pas un IDE Kubernetes.** C'est un espace d'administration centré terminal. Ne lui demandez pas de rendre un chart Helm.

Si l'un de ces points *était* rédhibitoire — très bien, on se voit en v2.

---

## Obtenir KKTerm

**[Téléchargez la dernière version de KKTerm](https://github.com/ryantsai/KKTerm/releases/latest)**, choisissez le paquet correspondant à votre plateforme et ouvrez-le. Les installateurs Windows sont pour l'instant **non signés** — la signature de version est sur la feuille de route, donc d'ici là votre antivirus pourrait vous jeter un regard sévère. C'est normal.

Envie de compiler depuis les sources ou de contribuer ? Tout ce qu'il vous faut est dans [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Feuille de route (version courte)

- Finition des versions multiplateformes
- Finition de la signature des versions
- Transferts de fichiers plus puissants (reprise, synchro de dossiers, archive/extraction)
- Partage presse-papiers et périphériques plus riche pour le Bureau à distance
- Plus de widgets de tableau de bord intégrés
- Plus de fonctions d'automatisation IT Ops

Version complète et fréquemment mise à jour : [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Contribuer

On adorerait un coup de main. Vraiment. Même les petites choses comptent :

- **Essayez le build dev** et ouvrez une issue quand quelque chose cloche. « Ça paraissait bizarre » est un rapport de bug légitime ; on creusera avec vous.
- **Traduisez une langue.** L'anglais est la source de vérité ; treize autres langues vivent à côté.
- **Ajoutez un widget de tableau de bord.** Prenez une petite idée, livrez-la, apprenez le motif.
- **Améliorez le manuel.** Si vous avez utilisé une fonction et que la doc n'a pas aidé, une PR qui corrige ça vaut de l'or.

L'installation complète, la structure du projet et la checklist de PR sont dans [`CONTRIBUTING.md`](CONTRIBUTING.md). Vous cherchez un point d'entrée ? Filtrez les issues ouvertes par [`good first issue`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) ou [`help wanted`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).

---

## Docs du projet

- [Contexte produit](CONTEXT.md) — le langage métier à respecter
- [Architecture](docs/ARCHITECTURE.md) — carte des modules, où mettre le nouveau code
- [Manuel utilisateur](docs/manual/INDEX.md) — un tour fonctionnalité par fonctionnalité
- [Feuille de route](docs/ROADMAP.md)
- [Architecture du Dashboard](docs/DASHBOARD.md)
- [Serveur MCP intégré](docs/MCP.md)
- [Guide des fournisseurs IA](docs/AI_PROVIDERS.md)

---

## Historique des étoiles

<a href="https://www.star-history.com/#ryantsai/KKTerm&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
  </picture>
</a>

Si vous êtes arrivé jusqu'ici sans mettre d'étoile — qu'attendez-vous, une invitation personnelle ? Considérez ceci comme l'invitation personnelle.

⭐ **[Mettez une étoile à KKTerm sur GitHub](https://github.com/ryantsai/KKTerm)** — ça coûte un clic et ça illumine toute la semaine du mainteneur. Voyez-le comme un 乖乖 numérique sur le rack.

---

## Licence

MIT. Voir [LICENSE](LICENSE). Utilisez-le, forkez-le, livrez-le, mettez-le dans un homelab que personne d'autre ne trouvera — c'est le marché.
