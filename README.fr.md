<p align="center">
  <img src="src-tauri/icons/logo.png" alt="KKTerm" width="128" />
</p>

<h1 align="center">KKTerm</h1>

<p align="center">
  <strong>Une seule fenêtre native Windows pour les terminaux, le SSH, le SFTP, le RDP/VNC et un tableau de bord — plus une IA qui fabrique vos petits outils sur demande.</strong>
</p>

<p align="center">
  <em>Parce que votre barre des tâches ne devrait pas ressembler à une machine à sous de Las Vegas.</em>
</p>

<p align="center">
  <sub>Nommé d'après <strong>乖乖 (Kuāi Kuāi)</strong>, l'en-cas vert à la noix de coco que les administrateurs taïwanais posent sur leurs serveurs pour qu'ils se tiennent bien. On espère que cette appli gagnera sa place sur le rack.</sub>
</p>

<p align="center">
  <strong><a href="https://github.com/ryantsai/KKTerm/releases/latest">Télécharger le dernier installateur Windows (.exe)</a></strong>
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
  <img src="https://img.shields.io/badge/Windows%E2%80%91first-by%20design-0078D6?style=flat-square&logo=windows" alt="Windows-first by design" />
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
- Une session `claude` / `codex` sur une machine distante qui tombe dès que votre Wi-Fi éternue
- Un post-it avec des mots de passe *(t'inquiète, on dira rien)*

**KKTerm, c'est une seule fenêtre pour tout ça.** Native sous Windows — *volontairement, alors que le reste du monde des outils dev sort d'abord pour mac et traite votre OS comme une note de bas de page* — dans un seul installateur qui refuse de téléphoner à la maison.

Plus quelques trucs que vous ne saviez pas vouloir :

- Un **Dashboard** où vous dites à une IA *« construis-moi un widget qui ping mon routeur toutes les 30 secondes »* et il apparaît, dans son propre bac à sable, sur votre grille.
- **Des panneaux SSH qui se rattachent à votre session distante `claude` / `codex`** après chaque caprice du Wi-Fi, pour qu'un travail de six heures survive à une coupure.
- Une **jauge d'utilisation IA** pour ne plus heurter le mur des quotas par surprise à 3 h du matin.
- Un **Installer Helper** qui trouve, installe, met à jour et lance les outils dev Windows que vous traquez d'habitude à travers dix onglets de navigateur.
- **Vingt-cinq fonds animés** pour le tableau de bord (oui, dont `matrix`), parce qu'on n'est pas au-dessus de ça.

Et le meilleur : l'assistant IA peut transformer une seule phrase en un petit outil de tableau de bord que vous gardez vraiment.

> ⭐ **Si ça ressemble à l'appli que vous comptiez construire depuis six ans — mettez une étoile au dépôt pour qu'on sache que quelqu'un regarde. Ça aide vraiment.**

Un avis sur la suite ? Rejoignez le fil de retours public :
**[Que devrait prioriser KKTerm pour les workflows admin Windows-first ?](https://github.com/ryantsai/KKTerm/discussions/141)**

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

<p align="center"><sub><em>(Le GIF de démo va ici. Une image vaut mille puces, et on est à court de puces.)</em></sub></p>

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
| Surveiller le CPU de l'hôte | Une barre d'état en direct et un tableau de bord à bâtir vous-même |

La même appli. La même fenêtre. Les mêmes raccourcis. Le même thème, qu'on espère non agressif pour les yeux.

---

## Pourquoi les gens le laissent ouvert toute la journée

### Windows d'abord, volontairement

Regardez le paysage des outils dev. Claude Code : mac/linux d'abord, Windows c'est « utilise WSL ». Codex CLI : pareil. La moitié des nouveaux outils brillants sortent d'abord pour mac et laissent aux utilisateurs Windows un commentaire `# contributions welcome` et un script d'autocomplétion qui ne tourne pas.

Pendant ce temps, les gens qui gardent vraiment les entreprises en ligne — l'IT d'entreprise, les MSP, ceux qui administrent un contrôleur de domaine plus vieux que certains stagiaires — sont devant des machines Windows à se demander pourquoi chaque nouvel outil traite leur OS comme un désagrément.

**KKTerm fait le pari inverse.** On construit natif Windows d'abord, donc ce qui compte pour les gens de Windows fonctionne, point : le *vrai* Bureau à distance Microsoft (le même que `mstsc.exe`, pas un clone), de vrais shells PowerShell / cmd / WSL, des secrets gardés dans le Gestionnaire d'identification Windows, une vraie icône dans la barre d'état, des menus et boîtes de dialogue natifs. Les builds macOS et Linux sont sur la feuille de route et recevront le même soin. Mais si vous attendiez que quelqu'un construise le *bon* outil d'admin Windows en premier au lieu d'en dernier — c'est le marché.

### Local d'abord, c'est vraiment local

Vos connexions enregistrées vivent dans un fichier sur votre machine. Les mots de passe vivent dans le Gestionnaire d'identification Windows, pas dans un fichier texte à côté de l'appli. KKTerm n'envoie aucune analytique, ne téléphone pas à la maison au démarrage et n'a besoin d'aucun compte cloud pour se lancer. Il n'y a pas de « connectez-vous pour synchroniser » parce qu'il n'y a pas de synchro.

Si votre câble réseau prend feu, KKTerm s'ouvre quand même.

### Des terminaux qui ne perdent pas la tête

- Volets divisés dans un Tab.
- Un rendu rapide et fluide, avec scrollback consultable.
- Se reconnecter veut vraiment dire *se reconnecter* — votre session distante reprend là où elle en était, pas « on recommence à zéro et on fait comme si la dernière heure n'avait pas eu lieu ».
- Changer de Tab ne tue **pas** la Session. Fermer le Tab, oui. Cette distinction a été une guerre de religion en interne ; on a gagné.

### Un assistant IA qui fabrique vos outils

La plupart des démos d'« IA dans le terminal » s'arrêtent au chat. L'assistant de KKTerm peut aussi fabriquer de petits widgets de tableau de bord durables, taillés pour votre façon de travailler — et il garde le dangereux derrière un interrupteur :

- **Choisissez ce qu'il peut toucher** — activez/désactivez des familles d'outils entières (Dashboard / Connections / Live Sessions).
- **Choisissez comment il demande** — `Prompt` (par défaut, demande à chaque fois) ou `Allow All` (vous êtes adulte, vous avez signé la décharge).

Tout ce qui ressemble à `rm -rf` est marqué comme dangereux et attend un oui humain explicite. L'IA ne peut pas exécuter discrètement une commande destructrice parce que quelqu'un a glissé une injection de prompt dans une page de man.

Il parle à OpenAI, Anthropic, OpenRouter, DeepSeek, Grok, Azure OpenAI, LiteLLM, GitHub Copilot, Ollama, NVIDIA, ou n'importe quel endpoint compatible OpenAI. Vos clés API vont dans le trousseau de l'OS.

### Un tableau de bord qui ne se prend pas pour Grafana

Le Dashboard est une grille de widgets que l'on glisse et redimensionne. Ce n'est pas pour l'observabilité à l'échelle du pétaoctet — c'est pour « je veux un bouton pour lancer mes cinq applis préférées et un panneau montrant la disponibilité de mon hôte SSH, *à côté* de mon chat ».

#### Widgets créés par l'IA — décrivez-le, obtenez-le

C'est la partie qui nous emballe vraiment. Vous ne choisissez pas dans un marketplace et vous n'écrivez pas de JavaScript. Vous **dites à l'assistant IA ce que vous voulez**, et il construit le widget là, sur votre tableau de bord :

> *« Ajoute un widget qui montre les 5 derniers commits de mon repo principal en liste. »*
> *« Fais-moi un widget pense-bête pour ma fiche d'astreinte. »*
> *« Construis un widget qui ping mon routeur domestique toutes les 30 secondes et affiche vert/rouge. »*
> *« Il me faut un chronomètre. Surprends-moi sur le style. »*

Certains sont de simples panneaux d'affichage (markdown, listes à cocher, un gros chiffre) ; d'autres exécutent du code en direct dans un bac à sable isolé que vous approuvez. Chaque widget que vous gardez est à vous — il persiste avec sa couleur, son icône et son titre, et vous pouvez en avoir plusieurs copies de tailles différentes. Supprimez-en un d'un clic droit quand la magie s'estompe.

#### Fonds animés du tableau de bord (parce qu'on en avait envie)

Choisissez une ambiance par vue de tableau de bord parmi **vingt-cinq** fonds animés sur canvas :

| Ambiance | Fonds |
| --- | --- |
| Calme | `aurora`, `clouds`, `ocean`, `raindrops`, `rainywindow`, `frostedWindow`, `snow`, `sakura`, `fireflies`, `bubbles`, `aquarium`, `ricefield`, `lanterns` |
| Spatial | `starfield`, `nebula` |
| Chaud | `embers`, `lava` |
| Geek | `matrix`, `topo`, `synthwave` |
| Agité | `cyberpunk`, `taipei101`, `thunderstorm`, `confetti`, `particleCursor` |

Ils se mettent en pause quand vous êtes ailleurs, donc ils ne coûtent quasi rien. Associez `matrix` à votre assistant IA pour une ambiance qui dit « je suis extrêmement productif et probablement dans un film des Wachowski ». Ou choisissez `ocean` pour avoir l'air d'une personne sérieuse. On ne juge ni l'un ni l'autre.

### Garder vos agents IA distants en vie

C'est la deuxième fonction dont les gens tombent amoureux. Les terminaux SSH de KKTerm peuvent vous déposer directement dans une **session tmux nommée** sur l'hôte distant, qui survit à la reconnexion :

- Ouvrez une connexion SSH avec tmux activé et lancez `claude`, `codex`, `gemini-cli`, `cursor-agent`, ou tout agent au long cours que vous préférez.
- Fermez le portable. Rouvrez-le. Le panneau se rattache en silence — l'agent tourne encore, garde son scrollback, en plein milieu de ce qu'il faisait.
- Une coupure réseau ? KKTerm se reconnecte discrètement à la même session sans vous embêter.
- Besoin de l'aide de l'assistant ? « Ajouter le tampon du terminal au contexte » aspire toute la session distante dans la conversation, pour que votre IA locale raisonne sur ce que fait votre agent distant.

Si vous avez déjà perdu une session `claude` ou `codex` de six heures à cause du Wi-Fi capricieux d'un hôtel, cette seule fonction rentabilise l'appli. (L'appli est gratuite. La fonction en vaut quand même la peine.)

### Savoir combien d'IA il vous reste

Les agents de code facturent à la fenêtre de forfait, pas au mois, et ils dévorent volontiers votre quota pendant que vous êtes en réunion. La **jauge d'utilisation IA** garde ça visible :

- Un widget de tableau de bord montrant **Claude Code** et **Codex** côte à côte : compte connecté, forfait, consommation de la fenêtre actuelle et de la semaine, heure de la prochaine réinitialisation.
- Un **indicateur compact dans la barre d'état** qui reflète les mêmes chiffres, pour que même tableau de bord fermé, vous voyiez d'un coup d'œil s'il vous reste de la marge avant le prochain gros refactoring.
- Il vous prévient en amont s'il faut vous reconnecter — *avant* une longue tâche, pas en plein milieu.

### Laisser d'autres IA piloter KKTerm

KKTerm embarque son propre serveur MCP, pour que des agents de code externes (Claude Code, Codex, Copilot, Antigravity, OpenCode) utilisent votre espace de travail comme vous le faites — lister les connexions, en ouvrir une, lire un tampon de terminal, placer des widgets sur le tableau de bord. D'IA à IA, sur votre machine, sans relais cloud. Les actions qui modifient, plus risquées, restent derrière un unique interrupteur de sécurité **désactivé** par défaut.

Réglages → AI Assistant → **Built-in MCP Server** propose une boîte « Afficher la config » en un clic, déjà remplie, plus des commandes `claude mcp add` / `codex mcp add` à copier.

---

## Ce que KKTerm n'est pas

Une courte liste, parce que l'honnêteté inspire confiance :

- **Pas un produit cloud.** Pas de synchro, pas de comptes d'équipe, pas d'offre SaaS. Si vous voyez un jour une boîte « Se connecter à KKTerm », c'est qu'un truc a catastrophiquement mal tourné.
- **Pas un faux multiplateforme.** On est Windows-first volontairement ; macOS et Linux sont sur la feuille de route. S'il vous faut un outil mac-first aujourd'hui, vous avez des centaines d'options. On construit celui que les admins Windows attendaient en silence.
- **Pas un agent IA autonome.** L'assistant propose ; l'humain dispose. `Allow All` est un choix que vous faites, pas un défaut.
- **Pas un remplaçant de Grafana / Datadog.** Le Dashboard est pour des surfaces de contrôle personnelles, pas pour l'observabilité de 10 000 hôtes.
- **Pas un IDE Kubernetes.** C'est un espace d'administration centré terminal. Ne lui demandez pas de rendre un chart Helm.

Si l'un de ces points *était* rédhibitoire — très bien, on se voit en v2.

---

## Obtenir KKTerm

**[Téléchargez le dernier installateur Windows (.exe)](https://github.com/ryantsai/KKTerm/releases/latest)** et lancez-le. L'installateur est pour l'instant **non signé** — la signature de version est sur la feuille de route, donc d'ici là votre antivirus pourrait vous jeter un regard sévère. C'est normal.

Envie de compiler depuis les sources ou de contribuer ? Tout ce qu'il vous faut est dans [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Feuille de route (version courte)

- Builds macOS + Linux
- Installateur signé + mise à jour automatique
- Transferts de fichiers plus puissants (reprise, synchro de dossiers, archive/extraction)
- Partage presse-papiers et périphériques plus riche pour le Bureau à distance
- Plus de widgets de tableau de bord intégrés

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
- [Feuille de route](docs/ROADMAP.md)
- [Architecture du Dashboard](docs/DASHBOARD.md)
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
