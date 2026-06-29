<p align="center">
  <img src="src-tauri/icons/logo.png" alt="KKTerm" width="128" />
</p>

<h1 align="center">KKTerm</h1>

<p align="center">
  <strong>Un'unica finestra nativa Windows per terminali, SSH, SFTP, RDP/VNC e una dashboard — più un'IA che ti costruisce i tuoi piccoli strumenti su richiesta.</strong>
</p>

<p align="center">
  <em>Perché la tua barra delle applicazioni non dovrebbe sembrare una slot machine di Las Vegas.</em>
</p>

<p align="center">
  <sub>Prende il nome da <strong>乖乖 (Kuāi Kuāi)</strong>, lo snack verde al cocco che i sysadmin taiwanesi posano sui server perché si comportino bene. Speriamo che questa app si guadagni il suo posto sul rack.</sub>
</p>

<p align="center">
  <strong><a href="https://github.com/ryantsai/KKTerm/releases/latest">Scarica l'ultima release di KKTerm</a></strong>
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
    <a href="README.fr.md">Français</a> ·
    <a href="README.de.md">Deutsch</a> ·
    <a href="README.es.md">Español</a> ·
    <a href="README.es-MX.md">Español (MX)</a> ·
    <strong>Italiano</strong> ·
    <a href="README.pt-BR.md">Português (BR)</a> ·
    <a href="README.th.md">ไทย</a> ·
    <a href="README.id.md">Bahasa Indonesia</a> ·
    <a href="README.vi.md">Tiếng Việt</a>
  </sub>
</p>

---

## Il pitch in 45 secondi

Sei sysadmin / DevOps / smanettone di homelab / vibe-coder. In questo momento hai:

- Un emulatore di terminale
- Un client SSH a parte (con una lista di profili che ti è costata un weekend per metterla insieme)
- Un client SFTP del 2007 che, chissà come, esiste ancora
- Il Desktop remoto in una finestra che perdi sempre sul monitor sbagliato
- Un viewer VNC solo per quella macchina Linux
- Una scheda del browser per l'interfaccia di amministrazione del router
- Un file manager per curiosare nel disco locale, e un editor di testo solo per quell'unico log che tieni sempre in `tail`
- Una sessione `claude` / `codex` su una macchina remota che cade ogni volta che il Wi-Fi starnutisce
- Un post-it con le password *(tranquillo, non lo diciamo)*

**KKTerm è un'unica finestra per tutto questo.** Nativa su Windows — *di proposito, mentre il resto del mondo dei tool per dev esce prima su mac e tratta il tuo OS come una nota a piè di pagina* — in un unico installer che si rifiuta di telefonare a casa.

Più un paio di cose che non sapevi di volere:

- Una **Dashboard** dove dici a un'IA *«costruiscimi un widget che fa il ping al mio router ogni 30 secondi»* e appare, nella sua sandbox, sulla tua griglia.
- **Pannelli SSH che si riagganciano alla tua sessione remota `claude` / `codex`** dopo ogni capriccio del Wi-Fi, così un lavoro di sei ore sopravvive a una caduta.
- **Workspace** che tengono il tuo homelab, il lavoro e i server di quel cliente in contenitori separati e commutabili.
- Un **Install Helper** che trova, installa, aggiorna e avvia i tool da dev per Windows che di solito insegui per dieci schede del browser.
- **Ventisei sfondi animati** per la dashboard *e i tuoi terminali* (sì, incluso `matrix`), perché non siamo troppo seri per farlo.

E la parte migliore: l'assistente IA può trasformare una sola frase in un piccolo strumento da dashboard che davvero continui a usare.

> ⭐ **Se ti suona come l'app che volevi costruire da sei anni — metti una stella al repo così sappiamo che qualcuno sta guardando. Aiuta davvero.**

Hai un'opinione su cosa dovrebbe arrivare dopo? Unisciti al thread pubblico di feedback:
**[A cosa dovrebbe dare priorità KKTerm per i workflow di amministrazione multipiattaforma?](https://github.com/ryantsai/KKTerm/discussions/141)**

---

## Perché «KKTerm»?

Entra in un qualunque data center taiwanese e guarda la cima dei rack. Oltre le fab di TSMC, le sale di controllo della metro di Taipei, le sale server della banca Cathay, gli apparati di commutazione di Chunghwa Telecom — scorgerai un sacchettino verde di 乖乖 (Kuāi Kuāi), uno snack di mais al gusto di cocco degli anni '60.

Il nome significa letteralmente **«fai il bravo»**, **«comportati bene»**. La tradizione informatica è semplice e del tutto seria:

- **Dev'essere verde (cocco).** Il giallo (curry) significa *oggi resta a casa*; il rosso (piccante) fa arrabbiare il server. Solo verde.
- **Non dev'essere scaduto.** Un Kuai Kuai andato a male gioca contro di te. Gli ingegneri li cambiano con diligenza.
- **Dev'essere visibile.** Il server deve sapere che è lì.
- **Non mangiarlo.** Quel sacchetto è in servizio.

Alcuni dei sistemi più grandi, più noiosi e più ossessionati dall'uptime in Asia funzionano con un sacchetto di soffiati di mais attaccato allo chassis. Funziona perché chi li mantiene crede che funzioni, il che è una descrizione notevolmente onesta di gran parte della cultura IT.

**KKTerm** è **Kuai Kuai Term** — uno spazio di amministrazione che aspira allo stesso lavoro dello snack: sedersi in silenzio accanto alle tue macchine importanti e aiutarle a comportarsi bene. Local-first. Niente telemetria. IA con approvazione. Quel genere di software noioso e affidabile.

Non siamo ancora riusciti a spedire un vero sacchetto di Kuai Kuai con l'installer. È roba da v2.

---

## Vederlo in movimento

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm">
    <img
      src="docs/assets/demo.gif"
      alt="KKTerm demo"
      width="720"
    />
  </a>
</p>

<p align="center"><sub><em>(La GIF dimostrativa. Un'immagine vale più di mille punti elenco, e i punti elenco li abbiamo finiti.)</em></sub></p>



---

## Una finestra, ogni connessione

| Volevi… | KKTerm lo fa |
| --- | --- |
| Aprire una shell locale PowerShell / cmd / WSL | Terminali locali, affiancati |
| SSH verso un server | SSH con chiavi, agent, password, jump host e port forwarding |
| Sfogliare i file su quel server | SFTP dalla connessione SSH — doppio pannello, trascina per trasferire |
| FTP verso un NAS del 2012 | FTP / FTPS nello stesso file browser |
| Telnet verso ferraglia antica | Sì, c'è anche Telnet |
| Parlare con una porta seriale | Connessioni seriali — scegli porta COM e baud |
| Entrare in remoto su una macchina Windows | Il vero Desktop remoto Microsoft, integrato |
| VNC su un Pi | VNC, renderizzato direttamente nello spazio di lavoro |
| Aprire l'interfaccia web del router | Una scheda di browser integrata con login salvati |
| Sfogliare il tuo disco | Un pannello File Explorer locale, lo stesso doppio pannello di SFTP |
| Aprire un log, CSV, immagine o PDF | Un visualizzatore Document integrato con una vera modalità log a inseguimento (tail) |
| Tenere d'occhio la CPU dell'host | Una barra di stato dal vivo e una dashboard che costruisci tu |

La stessa app. La stessa finestra. Le stesse scorciatoie. Lo stesso tema, si spera non sanguinoso per gli occhi.

<p align="center">
  <img src="docs/assets/screenshots/connections-grid.png" alt="Un singolo Tab con SSH, SFTP e una UI web integrata affiancati" width="720" />
</p>


---

## Perché la gente lo tiene aperto tutto il giorno

### Download piccolo, avvio fulmineo

KKTerm è costruito per sembrare un'utilità, non una piattaforma. Le build desktop attuali pesano meno di 20 MB, si installano in fretta e si avviano abbastanza rapidamente da non far sembrare l'apertura del tuo spazio di amministrazione l'avvio di un secondo sistema operativo.

L'impronta ridotta conta su jump box, portatili vecchi e VM, dove ogni servizio in background in più è un'altra cosa di cui diffidare. KKTerm si apre, ripristina il tuo workspace e si toglie di mezzo.

### Griglie multi-pannello, mescolate come lavori

Un Tab può contenere una griglia di Panes, e quei Panes non devono essere dello stesso tipo. Metti SSH accanto a SFTP, una PowerShell locale sotto una RDP Session, VNC accanto alla UI web del router, o un file browser vicino al terminale che sta spostando i file.

È un unico workspace per la forma reale e disordinata del lavoro di amministrazione: mescola tipi di Connection, ridimensiona la griglia, tieni vive le live Sessions e smetti di fare Alt-Tab tra una pila di finestre.

<p align="center">
  <img src="docs/assets/screenshots/multi-pane.png" alt="Un Tab diviso in quattro pannelli di tipi di connessione diversi" width="720" />
</p>


### Un assistente IA che comanda i tuoi terminali per te

Gran parte delle demo «IA nel terminale» si ferma alla chat. L'assistente di KKTerm lavora *dentro* la tua sessione: gli passi il contesto da ciò che è già a schermo, e agisce sulle macchine a cui sei connesso — con un umano nel ciclo di approvazione.

**Passagli il contesto, diretto.** Niente relay copia-incolla:

- **Aggiungi il buffer del terminale al contesto** risucchia lo scrollback di una sessione locale o remota in corso direttamente nella conversazione, così «perché questa build è fallita?» diventa qualcosa che può davvero leggere.
- Il **menu screenshot** cattura una regione o un intero Pane e lascia cadere l'immagine nella chat, così «perché questa finestra ha un aspetto sbagliato?» è una domanda a cui può rispondere.
- **Allega file** e il **contesto di pagina Dashboard / IT Ops** corrente, così ragiona su ciò che stai davvero guardando e non su una descrizione vaga.

**Lascialo agire — dietro approvazione.** L'assistente può eseguire comandi nei tuoi terminali, aprire Connections e piazzare widget sulla dashboard, ma la roba rischiosa resta sotto chiave:

- **Decidi cosa può toccare** — accendi o spegni intere famiglie di tool (Dashboard / Connections / Live Sessions).
- **Decidi come chiede** — `Prompt` (predefinito, chiede ogni volta) o `Allow All` (sei adulto, hai firmato la liberatoria).
- Tutto ciò che assomiglia a `rm -rf` viene marcato come pericoloso — con il motivo mostrato sulla scheda di approvazione — e attende un sì umano esplicito. L'IA non può eseguire di nascosto un comando distruttivo solo perché qualcuno ha fatto il furbo con un prompt injection in una pagina di man.

**Porta il tuo cervello.** Parla con OpenAI, Anthropic, OpenRouter, DeepSeek, Grok, Azure OpenAI, LiteLLM, GitHub Copilot, Ollama, NVIDIA o qualsiasi endpoint compatibile con OpenAI — e può girare sulla **CLI di Claude Code** o sulla **CLI di Codex** come backend, sfruttando il tuo login e abbonamento `claude` / `codex` esistenti invece di una chiave API separata. Le tue chiavi API vanno nel portachiavi dell'OS.

<p align="center">
  <img src="docs/assets/screenshots/ai-assistant.png" alt="Il pannello dell'assistente IA con gli interruttori di accesso ai tool e di modalità di approvazione" width="720" />
</p>


### Una dashboard che non finge di essere Grafana

La Dashboard è una griglia di widget che trascini e ridimensioni. Non è per l'osservabilità su scala petabyte — è per «voglio un pulsante che lanci le mie cinque app preferite e un pannello che mostra l'uptime del mio host SSH, *accanto* alla mia chat».

#### Widget creati dall'IA — descrivilo, ce l'hai

Questa è la parte che ci entusiasma davvero. Non scegli da un marketplace e non scrivi JavaScript. **Dici all'assistente IA cosa vuoi**, e costruisce il widget lì, sulla tua dashboard:

> *«Aggiungi un widget che mostra gli ultimi 5 commit del mio repo principale come lista.»*
> *«Fammi un widget post-it per il mio cheat sheet di reperibilità.»*
> *«Costruisci un widget che fa il ping al router di casa ogni 30 secondi e mostra verde/rosso.»*
> *«Mi serve un cronometro. Sorprendimi con lo stile.»*

Alcuni sono semplici pannelli di visualizzazione (markdown, checklist, un numero grande); altri eseguono codice dal vivo in una sandbox isolata che approvi tu. Ogni widget che tieni è tuo — resta con il suo colore, la sua icona e il suo titolo, e puoi averne più copie di dimensioni diverse. Cancellane uno col tasto destro quando la magia svanisce.

<p align="center">
  <img src="docs/assets/screenshots/ai-widgets.png" alt="Una griglia di dashboard piena di widget creati dall'IA" width="720" />
</p>


#### Sfondi animati di dashboard/terminale (perché ne avevamo voglia)

Scegli un'atmosfera — per ogni vista della dashboard, *o dietro qualsiasi terminale* — tra **ventisei** sfondi animati su canvas:

| Atmosfera | Sfondi |
| --- | --- |
| Calmo | `aurora`, `clouds`, `ocean`, `raindrops`, `rainywindow`, `frostedWindow`, `snow`, `sakura`, `fireflies`, `bubbles`, `aquarium`, `ricefield`, `lanterns` |
| Spaziale | `starfield`, `nebula` |
| Caldo | `embers`, `lava` |
| Geek | `matrix`, `topo`, `synthwave` |
| Irrequieto | `cyberpunk`, `taipei101`, `thunderstorm`, `confetti`, `particleCursor` |

Lo stesso selettore alimenta anche i tuoi pannelli di terminale, così puoi mettere `matrix` dietro una sessione SSH attiva. Si mettono in pausa quando sei altrove, quindi non costano praticamente nulla. Abbina `matrix` al tuo assistente IA per un'atmosfera che dice «sono estremamente produttivo e probabilmente dentro un film delle Wachowski». Oppure scegli `ocean` e sembra una persona seria. Non giudichiamo nessuna delle due scelte.

<p align="center">
  <img src="docs/assets/screenshots/backgrounds.png" alt="Alcuni degli sfondi animati affiancati" width="720" />
</p>


### Tieni vivi i tuoi agenti IA

Questa è la seconda funzione di cui la gente s'innamora. I terminali SSH di KKTerm possono catapultarti direttamente in una **sessione tmux con nome** sull'host remoto che sopravvive alla riconnessione:

- Apri una connessione SSH con tmux attivo e avvia `claude`, `codex`, `gemini-cli`, `cursor-agent` o l'agente di lunga durata che preferisci.
- Chiudi il portatile. Riaprilo. Il pannello si riaggancia in silenzio — l'agente è ancora in esecuzione, ha il suo scrollback, nel mezzo di ciò che stava facendo.
- Un singhiozzo della rete? KKTerm si riconnette in silenzio alla stessa sessione senza disturbarti.
- Vuoi l'aiuto dell'assistente? «Aggiungi il buffer del terminale al contesto» risucchia l'intera sessione remota nella conversazione, così la tua IA locale può ragionare su cosa sta facendo il tuo agente remoto.

Se hai mai perso una sessione `claude` o `codex` di sei ore per il Wi-Fi ballerino di un hotel, questa singola funzione ripaga l'app. (L'app è gratis. La funzione vale comunque.)

Le shell locali hanno lo stesso trucco su Windows: i pannelli PowerShell possono girare dentro **psmux**, il clone nativo di tmux, così i tuoi processi locali di lunga durata sopravvivono a un Pane chiuso proprio come quelli remoti.

<p align="center">
  <img src="docs/assets/screenshots/tmux-reattach.png" alt="Un pannello SSH che si riaggancia a una sessione tmux con nome dopo una riconnessione" width="720" />
</p>


### Tieni separati i tuoi mondi con i Workspace

L'homelab, il lavoro e i server di quel cliente non appartengono alla stessa lista. I **Workspace** sono contenitori di Connections con nome e isolati tra cui commuti dall'Activity Rail. Commutare riassegna l'ambito solo all'albero delle connessioni — le tue Sessions aperte, la Dashboard e le impostazioni restano dove sono — quindi cambiare contesto costa un clic, non un riavvio.

<p align="center">
  <img src="docs/assets/screenshots/workspaces.png" alt="Il selettore di workspace nell'activity rail" width="720" />
</p>


### Vestilo come vuoi: temi di colore

Gli sfondi sono la parte divertente; i **temi di colore** sono quello che fissi davvero tutto il giorno. KKTerm porta **ventisei** schemi di colore che ridisegnano tutta la cornice dell'app — Activity Rail, albero delle connessioni, schede, finestre — con una mini-anteprima dal vivo di ciascuno in Impostazioni ▸ Aspetto:

| Atmosfera | Schemi |
| --- | --- |
| Neutro | `Default`, `Dark`, `Light`, `Match OS` (segue il chiaro/scuro del sistema), `Mac` |
| Colorato | `Orange`, `Purple`, `Pink`, `Confetti`, `Bubble Tea` |
| Sapore locale | `Green Kuai Kuai` (sì, lo snack), `Blue See`, `Blue, Green and White`, `Semiconductor` |

Il terminale mantiene la propria palette scura qualunque schema tu scelga, così le tue shell restano leggibili mentre il resto dell'app si adatta al tuo umore.

<p align="center">
  <img src="docs/assets/screenshots/color-themes.png" alt="La griglia degli schemi di colore in Impostazioni con anteprime dal vivo" width="720" />
</p>


### Install Helper (solo Windows)

Preparare una macchina Windows nuova per lo sviluppo di solito significa dieci schede del browser e un sacco di «avanti, avanti, fine». L'**Install Helper** è un catalogo integrato che trova, installa, aggiorna e disinstalla i tool che altrimenti inseguiresti a mano — senza uscire da KKTerm:

- **Essentials** — winget, Node (tramite nvm-windows), Python (tramite uv), Git.
- **AI Agents** — Claude Code, Codex, Antigravity, OpenCode e altre CLI e app desktop di agenti di coding.
- **AI Platforms** — stack locali / self-hosted come Ollama, n8n, Open WebUI, Flowise e Langflow, avviati e gestiti per te.
- **Development** — editor, container, tool per API, WSL e le sue distribuzioni, Rustup.
- **Windows Power User** — PowerToys, PowerShell 7, psmux, Sysinternals, Everything, Ditto.
- **Remote Access** — Tailscale, RustDesk.
- **Utilities** — Notepad++, ripgrep, jq, fzf, 7-Zip, Oh My Posh, FFmpeg e altro.

Rileva cosa è già installato, segnala cosa ha un aggiornamento, e **Aggiorna tutto** percorre la coda per te. I prompt UAC restano espliciti, niente s'installa in silenzio, e l'intero catalogo è incluso nell'app — nessun account in più, nessuna telemetria in background.

> macOS e Linux hanno già gestori di pacchetti che adori, quindi l'Install Helper è una comodità solo per Windows e non fa parte di quelle build.

<p align="center">
  <img src="docs/assets/screenshots/install-helper.png" alt="Il catalogo Install Helper con i tool installati e disponibili" width="720" />
</p>


---

## Cosa KKTerm non è

Una lista breve, perché l'onestà conquista fiducia:

- **Non è un prodotto cloud.** Niente sync, niente account di team, niente piano SaaS. Se mai vedi una finestra «Accedi a KKTerm», qualcosa è andato catastroficamente storto.
- **Non finge che tutti i sistemi operativi siano identici.** KKTerm pubblica build per Windows, macOS e Linux, mantenendo chiare le funzioni specifiche di ogni piattaforma.
- **Non è un agente IA autonomo.** L'assistente propone; l'umano dispone. `Allow All` è una scelta che fai tu, non un default.
- **Non è un sostituto di Grafana / Datadog.** La Dashboard è per superfici di controllo personali, non per l'osservabilità di 10.000 host.
- **Non è un IDE per Kubernetes.** È uno spazio di amministrazione incentrato sul terminale. Per favore non chiedergli di renderizzare un chart Helm.

Se uno di questi punti *era* un dealbreaker — giusto così, ci vediamo in v2.

---

## Ottieni KKTerm

**[Scarica l'ultima release di KKTerm](https://github.com/ryantsai/KKTerm/releases/latest)**, scegli il pacchetto per la tua piattaforma e aprilo. Gli installer per Windows al momento sono **non firmati** — la firma delle release è nella roadmap, quindi fino ad allora il tuo antivirus potrebbe guardarti storto. È normale.

Vuoi compilare dai sorgenti o contribuire? Tutto ciò che serve è in [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Roadmap (versione breve)

- Rifinitura delle release multipiattaforma
- Rifinitura della firma delle release
- Trasferimento file più potente (ripresa, sync di cartelle, archivia/estrai)
- Condivisione di appunti e dispositivi più ricca per il Desktop remoto
- Più widget da dashboard integrati
- Più funzionalità di automazione IT Ops

Versione completa e aggiornata di frequente: [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Contribuire

Ci farebbe piacere una mano. Davvero. Anche le piccole cose contano:

- **Prova la build di sviluppo** e apri una issue quando qualcosa non torna. «Mi sembrava strano» è una segnalazione di bug legittima; scaviamo con te.
- **Traduci una lingua.** L'inglese è la fonte di verità; altre tredici lingue vivono accanto.
- **Aggiungi un widget da dashboard.** Prendi una piccola idea, rilasciala, impara il pattern.
- **Migliora il manuale.** Se hai usato una funzione e la documentazione non ha aiutato, una PR che la sistema vale oro.

Setup completo, struttura del progetto e checklist per le PR sono in [`CONTRIBUTING.md`](CONTRIBUTING.md). Cerchi un punto d'ingresso? Filtra le issue aperte per [`good first issue`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) o [`help wanted`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).

---

## Documenti del progetto

- [Contesto di prodotto](CONTEXT.md) — il linguaggio di dominio da rispettare
- [Architettura](docs/ARCHITECTURE.md) — mappa dei moduli, dove mettere il nuovo codice
- [Manuale utente](docs/manual/INDEX.md) — un giro funzione per funzione
- [Roadmap](docs/ROADMAP.md)
- [Architettura della Dashboard](docs/DASHBOARD.md)
- [Server MCP integrato](docs/MCP.md)
- [Guida ai provider IA](docs/AI_PROVIDERS.md)

---

## Cronologia delle stelle

<a href="https://www.star-history.com/#ryantsai/KKTerm&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
  </picture>
</a>

Se sei arrivato fin qui senza mettere una stella — cosa aspetti, un invito personale? Consideralo l'invito personale.

⭐ **[Metti una stella a KKTerm su GitHub](https://github.com/ryantsai/KKTerm)** — costa un clic e rende migliore l'intera settimana del manutentore. Pensalo come un 乖乖 digitale sul rack.

---

## Licenza

MIT. Vedi [LICENSE](LICENSE). Usalo, forkalo, spediscilo, mettilo in un homelab che nessun altro troverà — questo è l'accordo.
