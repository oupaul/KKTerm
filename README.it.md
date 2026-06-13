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
  <strong><a href="https://github.com/ryantsai/KKTerm/releases/latest">Scarica l'ultimo installer per Windows (.exe)</a></strong>
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
- Una sessione `claude` / `codex` su una macchina remota che cade ogni volta che il Wi-Fi starnutisce
- Un post-it con le password *(tranquillo, non lo diciamo)*

**KKTerm è un'unica finestra per tutto questo.** Nativa su Windows — *di proposito, mentre il resto del mondo dei tool per dev esce prima su mac e tratta il tuo OS come una nota a piè di pagina* — in un unico installer che si rifiuta di telefonare a casa.

Più un paio di cose che non sapevi di volere:

- Una **Dashboard** dove dici a un'IA *«costruiscimi un widget che fa il ping al mio router ogni 30 secondi»* e appare, nella sua sandbox, sulla tua griglia.
- **Pannelli SSH che si riagganciano alla tua sessione remota `claude` / `codex`** dopo ogni capriccio del Wi-Fi, così un lavoro di sei ore sopravvive a una caduta.
- Un **misuratore d'uso dell'IA** così smetti di sbattere a sorpresa contro il muro del rate limit alle 3 di notte.
- Un **Installer Helper** che trova, installa, aggiorna e avvia i tool da dev per Windows che di solito insegui per dieci schede del browser.
- **Venticinque sfondi animati** per la dashboard (sì, incluso `matrix`), perché non siamo troppo seri per farlo.

E la parte migliore: l'assistente IA può trasformare una sola frase in un piccolo strumento da dashboard che davvero continui a usare.

> ⭐ **Se ti suona come l'app che volevi costruire da sei anni — metti una stella al repo così sappiamo che qualcuno sta guardando. Aiuta davvero.**

Hai un'opinione su cosa dovrebbe arrivare dopo? Unisciti al thread pubblico di feedback:
**[Cosa dovrebbe dare priorità KKTerm per i workflow di amministrazione Windows-first?](https://github.com/ryantsai/KKTerm/discussions/141)**

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

<p align="center"><sub><em>(Qui va la GIF dimostrativa. Un'immagine vale più di mille punti elenco, e i punti elenco li abbiamo finiti.)</em></sub></p>

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
| Tenere d'occhio la CPU dell'host | Una barra di stato dal vivo e una dashboard che costruisci tu |

La stessa app. La stessa finestra. Le stesse scorciatoie. Lo stesso tema, si spera non sanguinoso per gli occhi.

---

## Perché la gente lo tiene aperto tutto il giorno

### Windows prima, di proposito

Guardati intorno nel panorama dei tool per dev. Claude Code: prima mac/linux, Windows è «usa WSL». Codex CLI: idem. Metà dei nuovi tool scintillanti esce prima su mac e lascia agli utenti Windows un commento `# contributions welcome` e uno script di completamento che non parte.

Intanto chi tiene davvero le aziende online — l'IT aziendale, gli MSP, chiunque gestisca un domain controller più vecchio di certi stagisti — è seduto a macchine Windows a chiedersi perché ogni nuovo tool tratti il suo OS come una scocciatura.

**KKTerm fa l'accordo opposto.** Costruiamo nativo Windows prima, così quello che conta per chi sta su Windows semplicemente funziona: il *vero* Desktop remoto Microsoft (lo stesso di `mstsc.exe`, non un clone), shell reali PowerShell / cmd / WSL, segreti custoditi in Gestione credenziali di Windows, una vera icona nella tray, menu e finestre di dialogo nativi. Le build macOS e Linux sono nella roadmap e riceveranno la stessa cura. Ma se aspettavi che qualcuno costruisse il *buon* tool di amministrazione Windows per primo invece che per ultimo — questo è l'accordo.

### Local-first vuol dire davvero locale

Le tue connessioni salvate vivono in un file sulla tua macchina. Le password vivono in Gestione credenziali di Windows, non in un file di testo accanto all'app. KKTerm non invia analytics, non telefona a casa all'avvio e non ha bisogno di un account cloud per partire. Non c'è alcun «accedi per sincronizzare» perché non c'è sincronizzazione.

Se il tuo cavo di rete prende fuoco, KKTerm si apre comunque.

### Terminali che non danno di matto

- Pannelli divisi dentro un Tab.
- Rendering veloce e fluido, con scrollback ricercabile.
- Riconnettersi significa davvero *riconnettersi* — la tua sessione remota riprende da dov'era, non «ricominciamo da capo e facciamo finta che l'ultima ora non sia successa».
- Cambiare Tab **non** uccide la Session. Chiudere il Tab sì. Questa distinzione è stata una guerra di religione interna; abbiamo vinto.

### Un assistente IA che costruisce i tuoi strumenti

Gran parte delle demo «IA nel terminale» si ferma alla chat. L'assistente di KKTerm può anche costruire piccoli widget da dashboard duraturi, su misura per come lavori davvero — e tiene la roba pericolosa dietro un interruttore:

- **Decidi cosa può toccare** — accendi o spegni intere famiglie di tool (Dashboard / Connections / Live Sessions).
- **Decidi come chiede** — `Prompt` (predefinito, chiede ogni volta) o `Allow All` (sei adulto, hai firmato la liberatoria).

Tutto ciò che assomiglia a `rm -rf` viene marcato come pericoloso e attende un sì umano esplicito. L'IA non può eseguire di nascosto un comando distruttivo solo perché qualcuno ha fatto il furbo con un prompt injection in una pagina di man.

Parla con OpenAI, Anthropic, OpenRouter, DeepSeek, Grok, Azure OpenAI, LiteLLM, GitHub Copilot, Ollama, NVIDIA o qualsiasi endpoint compatibile con OpenAI. Le tue chiavi API vanno nel portachiavi dell'OS.

### Una dashboard che non finge di essere Grafana

La Dashboard è una griglia di widget che trascini e ridimensioni. Non è per l'osservabilità su scala petabyte — è per «voglio un pulsante che lanci le mie cinque app preferite e un pannello che mostra l'uptime del mio host SSH, *accanto* alla mia chat».

#### Widget creati dall'IA — descrivilo, ce l'hai

Questa è la parte che ci entusiasma davvero. Non scegli da un marketplace e non scrivi JavaScript. **Dici all'assistente IA cosa vuoi**, e costruisce il widget lì, sulla tua dashboard:

> *«Aggiungi un widget che mostra gli ultimi 5 commit del mio repo principale come lista.»*
> *«Fammi un widget post-it per il mio cheat sheet di reperibilità.»*
> *«Costruisci un widget che fa il ping al router di casa ogni 30 secondi e mostra verde/rosso.»*
> *«Mi serve un cronometro. Sorprendimi con lo stile.»*

Alcuni sono semplici pannelli di visualizzazione (markdown, checklist, un numero grande); altri eseguono codice dal vivo in una sandbox isolata che approvi tu. Ogni widget che tieni è tuo — resta con il suo colore, la sua icona e il suo titolo, e puoi averne più copie di dimensioni diverse. Cancellane uno col tasto destro quando la magia svanisce.

#### Sfondi animati della dashboard (perché ne avevamo voglia)

Scegli un'atmosfera per ogni vista della dashboard tra **venticinque** sfondi animati su canvas:

| Atmosfera | Sfondi |
| --- | --- |
| Calmo | `aurora`, `clouds`, `ocean`, `raindrops`, `rainywindow`, `frostedWindow`, `snow`, `sakura`, `fireflies`, `bubbles`, `aquarium`, `ricefield`, `lanterns` |
| Spaziale | `starfield`, `nebula` |
| Caldo | `embers`, `lava` |
| Geek | `matrix`, `topo`, `synthwave` |
| Irrequieto | `cyberpunk`, `taipei101`, `thunderstorm`, `confetti`, `particleCursor` |

Si mettono in pausa quando sei altrove, quindi non costano praticamente nulla. Abbina `matrix` al tuo assistente IA per un'atmosfera che dice «sono estremamente produttivo e probabilmente dentro un film delle Wachowski». Oppure scegli `ocean` e sembra una persona seria. Non giudichiamo nessuna delle due scelte.

### Tieni vivi i tuoi agenti IA remoti

Questa è la seconda funzione di cui la gente s'innamora. I terminali SSH di KKTerm possono catapultarti direttamente in una **sessione tmux con nome** sull'host remoto che sopravvive alla riconnessione:

- Apri una connessione SSH con tmux attivo e avvia `claude`, `codex`, `gemini-cli`, `cursor-agent` o l'agente di lunga durata che preferisci.
- Chiudi il portatile. Riaprilo. Il pannello si riaggancia in silenzio — l'agente è ancora in esecuzione, ha il suo scrollback, nel mezzo di ciò che stava facendo.
- Un singhiozzo della rete? KKTerm si riconnette in silenzio alla stessa sessione senza disturbarti.
- Vuoi l'aiuto dell'assistente? «Aggiungi il buffer del terminale al contesto» risucchia l'intera sessione remota nella conversazione, così la tua IA locale può ragionare su cosa sta facendo il tuo agente remoto.

Se hai mai perso una sessione `claude` o `codex` di sei ore per il Wi-Fi ballerino di un hotel, questa singola funzione ripaga l'app. (L'app è gratis. La funzione vale comunque.)

### Sapere quanta IA ti resta

Gli agenti di coding fatturano per finestra di piano, non al mese, e si divorano volentieri la tua quota mentre sei in riunione. Il **misuratore d'uso dell'IA** lo tiene visibile:

- Un widget da dashboard che mostra **Claude Code** e **Codex** affiancati: account connesso, piano, consumo della finestra attuale e di questa settimana, ora del prossimo reset.
- Un **indicatore compatto nella barra di stato** che rispecchia gli stessi numeri, così anche a dashboard chiusa capisci a colpo d'occhio se hai margine prima del prossimo grande refactoring.
- Ti avvisa in anticipo se devi rifare il login — *prima* di un'attività lunga, non a metà.

### Lascia che altre IA pilotino KKTerm

KKTerm porta con sé il proprio server MCP, così agenti di coding esterni (Claude Code, Codex, Copilot, Antigravity, OpenCode) possono usare il tuo spazio di lavoro come fai tu — elencare connessioni, aprirne una, leggere un buffer di terminale, piazzare widget sulla dashboard. Da IA a IA, sulla tua macchina, senza relay cloud. Le azioni che modificano, le più rischiose, restano dietro un unico interruttore di sicurezza **disattivato** di default.

Impostazioni → AI Assistant → **Built-in MCP Server** ha una finestra «Mostra configurazione» con un clic, già compilata, più i comandi copiabili `claude mcp add` / `codex mcp add`.

---

## Cosa KKTerm non è

Una lista breve, perché l'onestà conquista fiducia:

- **Non è un prodotto cloud.** Niente sync, niente account di team, niente piano SaaS. Se mai vedi una finestra «Accedi a KKTerm», qualcosa è andato catastroficamente storto.
- **Non finge di essere multipiattaforma.** Siamo Windows-first di proposito; macOS e Linux sono nella roadmap. Se ti serve oggi un tool mac-first, hai centinaia di opzioni. Stiamo costruendo quello che gli admin Windows aspettavano in silenzio.
- **Non è un agente IA autonomo.** L'assistente propone; l'umano dispone. `Allow All` è una scelta che fai tu, non un default.
- **Non è un sostituto di Grafana / Datadog.** La Dashboard è per superfici di controllo personali, non per l'osservabilità di 10.000 host.
- **Non è un IDE per Kubernetes.** È uno spazio di amministrazione incentrato sul terminale. Per favore non chiedergli di renderizzare un chart Helm.

Se uno di questi punti *era* un dealbreaker — giusto così, ci vediamo in v2.

---

## Ottieni KKTerm

**[Scarica l'ultimo installer per Windows (.exe)](https://github.com/ryantsai/KKTerm/releases/latest)** ed eseguilo. L'installer al momento è **non firmato** — la firma delle release è nella roadmap, quindi fino ad allora il tuo antivirus potrebbe guardarti storto. È normale.

Vuoi compilare dai sorgenti o contribuire? Tutto ciò che serve è in [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Roadmap (versione breve)

- Build macOS + Linux
- Installer firmato + aggiornamento automatico
- Trasferimento file più potente (ripresa, sync di cartelle, archivia/estrai)
- Condivisione di appunti e dispositivi più ricca per il Desktop remoto
- Più widget da dashboard integrati

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
- [Roadmap](docs/ROADMAP.md)
- [Architettura della Dashboard](docs/DASHBOARD.md)
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
