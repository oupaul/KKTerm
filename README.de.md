<p align="center">
  <img src="src-tauri/icons/logo.png" alt="KKTerm" width="128" />
</p>

<h1 align="center">KKTerm</h1>

<p align="center">
  <strong>Ein einziges natives Windows-Fenster für Terminals, SSH, SFTP, RDP/VNC und ein Dashboard — plus eine KI, die dir auf Zuruf deine eigenen kleinen Tools baut.</strong>
</p>

<p align="center">
  <em>Weil deine Taskleiste nicht wie ein Spielautomat in Las Vegas aussehen sollte.</em>
</p>

<p align="center">
  <sub>Benannt nach <strong>乖乖 (Kuāi Kuāi)</strong>, dem grünen Kokos-Snack, den taiwanische Sysadmins auf Server legen, damit sie sich benehmen. Wir hoffen, diese App verdient sich ihren Platz im Rack.</sub>
</p>

<p align="center">
  <strong><a href="https://github.com/ryantsai/KKTerm/releases/latest">Neuesten Windows-Installer (.exe) herunterladen</a></strong>
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
    <strong>Deutsch</strong> ·
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

## Der Pitch in 45 Sekunden

Du bist Sysadmin / DevOps / Homelab-Bastler / Vibe-Coder. Gerade hast du:

- Einen Terminal-Emulator
- Einen separaten SSH-Client (mit einer Profilliste, an der du ein Wochenende gebaut hast)
- Einen SFTP-Client von 2007, den es irgendwie noch gibt
- Remotedesktop in einem Fenster, das du ständig auf dem falschen Monitor verlierst
- Einen VNC-Viewer für diese eine Linux-Kiste
- Einen Browser-Tab für die Admin-Oberfläche des Routers
- Eine `claude` / `codex`-Session auf einer entfernten Maschine, die abbricht, sobald dein WLAN niest
- Einen Klebezettel mit Passwörtern *(keine Sorge, wir sagen nichts)*

**KKTerm ist ein Fenster für all das.** Nativ unter Windows — *mit Absicht, während der Rest der Dev-Tool-Welt mac-first ausliefert und dein OS als Fußnote behandelt* — in einem einzigen Installer, der sich weigert, nach Hause zu telefonieren.

Dazu ein paar Dinge, von denen du nicht wusstest, dass du sie wolltest:

- Ein **Dashboard**, in dem du einer KI sagst *„bau mir ein Widget, das meinen Router alle 30 Sekunden anpingt"*, und es erscheint, in seiner eigenen Sandbox, auf deinem Raster.
- **SSH-Panes, die sich nach jedem WLAN-Anfall wieder an deine entfernte `claude` / `codex`-Session anhängen**, damit ein Sechs-Stunden-Job eine Verbindungsunterbrechung überlebt.
- Eine **KI-Nutzungsanzeige**, damit du nicht um 3 Uhr morgens überraschend gegen die Rate-Limit-Wand fährst.
- Ein **Install Helper**, der die Windows-Dev-Tools, die du sonst durch zehn Browser-Tabs jagst, findet, installiert, aktualisiert und startet.
- **Fünfundzwanzig animierte Hintergründe** fürs Dashboard (ja, inklusive `matrix`), weil wir nicht zu erhaben dafür sind.

Und das Beste: Der KI-Assistent kann aus einem einzigen Satz ein winziges Dashboard-Tool machen, das du tatsächlich behältst.

> ⭐ **Wenn das nach der App klingt, die du seit sechs Jahren bauen wolltest — gib dem Repo einen Stern, damit wir wissen, dass jemand zuschaut. Das hilft wirklich.**

Eine Meinung, was als Nächstes kommen sollte? Mach im öffentlichen Feedback-Thread mit:
**[Was sollte KKTerm für plattformübergreifende Admin-Workflows priorisieren?](https://github.com/ryantsai/KKTerm/discussions/141)**

---

## Warum „KKTerm"?

Geh in irgendein taiwanisches Rechenzentrum und schau oben auf die Racks. Vorbei an TSMC-Fabs, Leitständen der Taipei-Metro, Serverhallen der Cathay-Bank, Vermittlungstechnik von Chunghwa Telecom — du wirst ein kleines grünes Tütchen 乖乖 (Kuāi Kuāi) entdecken, einen Mais-Snack mit Kokosgeschmack aus den 1960ern.

Der Name bedeutet wörtlich **„sei brav"**, **„benimm dich"**. Die IT-Tradition ist schlicht und absolut ernst gemeint:

- **Muss grün sein (Kokos).** Gelb (Curry) heißt *bleib heute zu Hause*; Rot (scharf) macht den Server wütend. Nur Grün.
- **Darf nicht abgelaufen sein.** Ein altes Kuai Kuai arbeitet gegen dich. Ingenieure tauschen sie gewissenhaft aus.
- **Muss sichtbar sein.** Der Server muss wissen, dass es da ist.
- **Iss es nicht.** Das Tütchen ist im Dienst.

Einige der größten, langweiligsten, am stärksten auf Uptime versessenen Systeme Asiens laufen mit einem Tütchen Maisflips am Gehäuse. Es funktioniert, weil die Leute, die sie warten, glauben, dass es funktioniert — was eine bemerkenswert ehrliche Beschreibung der meisten IT-Kultur ist.

**KKTerm** ist **Kuai Kuai Term** — ein Admin-Workspace, der dasselbe anstrebt wie der Snack: still neben deinen wichtigen Maschinen zu sitzen und ihnen zu helfen, sich zu benehmen. Local-first. Keine Telemetrie. KI mit Freigabe. Die langweilige, verlässliche Sorte Software.

Ein echtes Tütchen Kuai Kuai mit dem Installer auszuliefern, haben wir noch nicht geschafft. Das ist ein Punkt für v2.

---

## In Bewegung sehen

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm">
    <img
      src="docs/assets/demo.gif"
      alt="KKTerm demo"
      width="720"
    />
  </a>
</p>

<p align="center"><sub><em>(Hier kommt das Demo-GIF hin. Ein Bild sagt mehr als tausend Aufzählungspunkte, und uns gehen die Aufzählungspunkte aus.)</em></sub></p>

---

## Ein Fenster, jede Verbindung

| Du wolltest… | KKTerm macht's |
| --- | --- |
| Eine lokale PowerShell / cmd / WSL-Shell öffnen | Lokale Terminals, nebeneinander |
| Per SSH auf einen Server | SSH mit Schlüsseln, Agent, Passwörtern, Jump-Hosts und Port-Forwarding |
| Dateien auf diesem Server durchsehen | SFTP aus der SSH-Verbindung — Zweispalten-Ansicht, zum Übertragen ziehen |
| FTP zu einem NAS von 2012 | FTP / FTPS im selben Datei-Browser |
| Telnet zu uralter Technik | Ja, Telnet ist auch drin |
| Mit einem seriellen Port reden | Serielle Verbindungen — COM-Port und Baudrate wählen |
| Per Remote auf eine Windows-Kiste | Das echte Microsoft-Remotedesktop, gleich eingebaut |
| VNC auf einen Pi | VNC, direkt in den Workspace gerendert |
| Die Weboberfläche des Routers öffnen | Ein eingebetteter Browser-Tab mit gespeicherten Logins |
| Die CPU des Hosts beobachten | Eine Live-Statusleiste und ein Dashboard, das du selbst baust |

Dieselbe App. Dasselbe Fenster. Dieselben Hotkeys. Dasselbe, hoffentlich nicht augenfeindliche, Theme.

---

## Warum Leute es den ganzen Tag offen lassen

### Kleiner Download, Blitzstart

KKTerm soll sich wie ein Werkzeug anfühlen, nicht wie eine Plattform. Aktuelle Desktop-Builds liegen ungefähr bei 10-13 MB, installieren schnell und starten so flott, dass sich das Öffnen deines Admin-Workspace nicht wie das Starten eines zweiten Betriebssystems anfühlt.

Der kleine Footprint zählt auf Jump-Hosts, alten Laptops und VMs, wo jeder zusätzliche Hintergrunddienst eine weitere Sache ist, der man misstraut. KKTerm öffnet sich, stellt deinen Workspace wieder her und bleibt aus dem Weg.

### Multi-Pane-Grids, gemischt wie du arbeitest

Ein Tab kann ein Grid aus Panes enthalten, und diese Panes müssen nicht dieselbe Art haben. Lege SSH neben SFTP, eine lokale PowerShell unter eine RDP Session, VNC neben das Web-UI des Routers oder einen Dateibrowser neben das Terminal, das gerade Dateien verschiebt.

Es ist ein Workspace für die unordentliche echte Form von Admin-Arbeit: Connection-Typen mischen, das Grid vergrößern oder verkleinern, live Sessions am Leben halten und nicht mehr durch einen Stapel Fenster alt-tabben.

### Ein KI-Assistent, der deine Tools baut

Die meisten „KI im Terminal"-Demos hören beim Chat auf. Der Assistent von KKTerm kann auch kleine, dauerhafte Dashboard-Widgets bauen, zugeschnitten auf deine echte Arbeitsweise — und das Gefährliche bleibt hinter einem Schalter:

- **Bestimme, was er anfassen darf** — ganze Tool-Familien (Dashboard / Connections / Live Sessions) an- oder ausschalten.
- **Bestimme, wie er fragt** — `Prompt` (Standard, fragt jedes Mal) oder `Allow All` (du bist erwachsen, du hast den Haftungsausschluss unterschrieben).

Alles, was nach `rm -rf` aussieht, wird als gefährlich markiert und wartet auf ein ausdrückliches menschliches Ja. Die KI kann keinen zerstörerischen Befehl heimlich ausführen, nur weil jemand eine Prompt-Injection in einer Man-Page schlau platziert hat.

Sie spricht mit OpenAI, Anthropic, OpenRouter, DeepSeek, Grok, Azure OpenAI, LiteLLM, GitHub Copilot, Ollama, NVIDIA oder allem OpenAI-Kompatiblen. Deine API-Schlüssel landen im OS-Schlüsselbund.

### Ein Dashboard, das nicht so tut, als wäre es Grafana

Das Dashboard ist ein Raster aus Widgets, die man zieht und in der Größe ändert. Es ist nicht für Petabyte-Observability — es ist für „ich will einen Knopf, der meine fünf Lieblings-Apps startet, und ein Panel, das die Uptime meines SSH-Hosts zeigt, *neben* meinem Chat".

#### KI-erstellte Widgets — beschreib es, krieg es

Das ist der Teil, der uns wirklich begeistert. Du wählst nichts aus einem Marktplatz und schreibst kein JavaScript. Du **sagst dem KI-Assistenten, was du willst**, und er baut das Widget direkt auf deinem Dashboard:

> *„Füg ein Widget hinzu, das die letzten 5 Commits meines Haupt-Repos als Liste zeigt."*
> *„Bau mir ein Notizzettel-Widget für meinen Bereitschafts-Spickzettel."*
> *„Bau ein Widget, das meinen Heimrouter alle 30 Sekunden anpingt und grün/rot zeigt."*
> *„Ich brauche eine Stoppuhr. Überrasch mich beim Stil."*

Manche sind schlichte Anzeige-Panels (Markdown, Checklisten, eine große Zahl); andere führen Live-Code in einer isolierten Sandbox aus, die du freigibst. Jedes Widget, das du behältst, gehört dir — es bleibt erhalten, mit eigener Farbe, eigenem Icon und Titel, und du kannst mehrere Kopien in verschiedenen Größen haben. Lösch eins per Rechtsklick, wenn der Zauber vergeht.

#### Animierte Dashboard-Hintergründe (weil wir wollten)

Wähl pro Dashboard-Ansicht eine Stimmung aus **fünfundzwanzig** Canvas-animierten Hintergründen:

| Stimmung | Hintergründe |
| --- | --- |
| Ruhig | `aurora`, `clouds`, `ocean`, `raindrops`, `rainywindow`, `frostedWindow`, `snow`, `sakura`, `fireflies`, `bubbles`, `aquarium`, `ricefield`, `lanterns` |
| Weltraum | `starfield`, `nebula` |
| Warm | `embers`, `lava` |
| Geeky | `matrix`, `topo`, `synthwave` |
| Unruhig | `cyberpunk`, `taipei101`, `thunderstorm`, `confetti`, `particleCursor` |

Sie pausieren, wenn du woanders bist, kosten also so gut wie nichts. Kombiniere `matrix` mit deinem KI-Assistenten für eine Stimmung, die sagt „ich bin extrem produktiv und vermutlich in einem Wachowski-Film". Oder nimm `ocean` und wirk wie ein seriöser Mensch. Wir urteilen über keine der beiden Entscheidungen.

### Deine entfernten KI-Agenten am Leben halten

Das ist die zweite Funktion, in die sich Leute verlieben. KKTerms SSH-Terminals können dich direkt in eine **benannte tmux-Session** auf dem entfernten Host setzen, die ein Wiederverbinden übersteht:

- Öffne eine SSH-Verbindung mit aktiviertem tmux und starte `claude`, `codex`, `gemini-cli`, `cursor-agent` oder welchen Langläufer-Agenten du magst.
- Klapp das Notebook zu. Klapp es wieder auf. Das Pane hängt sich still wieder an — der Agent läuft noch, hat sein Scrollback, steckt mittendrin in dem, was er gerade tat.
- Netzwerk-Aussetzer? KKTerm verbindet sich leise wieder mit derselben Session, ohne dich zu stören.
- Soll der Assistent helfen? „Terminal-Puffer zum Kontext hinzufügen" zieht die ganze entfernte Session in die Konversation, damit deine lokale KI nachvollziehen kann, was dein entfernter Agent tut.

Wer je eine sechsstündige `claude`- oder `codex`-Session an das wacklige Hotel-WLAN verloren hat, für den rechtfertigt diese eine Funktion die App. (Die App ist gratis. Die Funktion ist sie trotzdem wert.)

### Wissen, wie viel KI dir bleibt

Coding-Agenten rechnen nach Plan-Fenster ab, nicht pro Monat, und sie fressen dein Kontingent gern auf, während du in einem Meeting sitzt. Die **KI-Nutzungsanzeige** hält das sichtbar:

- Ein Dashboard-Widget, das **Claude Code** und **Codex** nebeneinander zeigt: verbundenes Konto, Plan, Verbrauch im aktuellen Fenster und diese Woche, nächste Reset-Zeit.
- Eine kompakte **Statusleisten-Anzeige**, die dieselben Zahlen spiegelt, damit du auch bei geschlossenem Dashboard auf einen Blick siehst, ob noch Luft bis zum nächsten großen Refactoring ist.
- Sie sagt dir vorab, ob du dich neu anmelden musst — *vor* einer langen Aufgabe, nicht mittendrin.

### Andere KIs KKTerm steuern lassen

KKTerm bringt seinen eigenen MCP-Server mit, damit externe Coding-Agenten (Claude Code, Codex, Copilot, Antigravity, OpenCode) deinen Workspace so nutzen, wie du es tust — Verbindungen auflisten, eine öffnen, einen Terminal-Puffer lesen, Widgets aufs Dashboard setzen. KI zu KI, auf deiner Maschine, ohne Cloud-Relay. Die verändernden, riskanteren Aktionen bleiben hinter einem einzigen Sicherheitsschalter, der standardmäßig **aus** ist.

Einstellungen → AI Assistant → **Built-in MCP Server** hat einen Ein-Klick-Dialog „Konfiguration anzeigen", schon ausgefüllt, plus kopierbare Befehle `claude mcp add` / `codex mcp add`.

---

## Was KKTerm nicht ist

Eine kurze Liste, denn Ehrlichkeit verdient Vertrauen:

- **Kein Cloud-Produkt.** Keine Synchronisierung, keine Team-Konten, keine SaaS-Stufe. Wenn du je einen Dialog „Bei KKTerm anmelden" siehst, ist etwas katastrophal schiefgelaufen.
- **Tut nicht so, als wären alle Betriebssysteme identisch.** KKTerm veröffentlicht Builds für Windows, macOS und Linux, hält plattformspezifische Funktionen aber klar und ehrlich gekennzeichnet.
- **Kein autonomer KI-Agent.** Der Assistent schlägt vor; der Mensch entscheidet. `Allow All` ist eine Wahl, die du triffst, kein Standard.
- **Kein Grafana-/Datadog-Ersatz.** Das Dashboard ist für persönliche Kontroll-Oberflächen, nicht für Observability über 10.000 Hosts.
- **Keine Kubernetes-IDE.** Es ist ein Terminal-zentrierter Admin-Workspace. Bitte verlang nicht, dass es ein Helm-Chart rendert.

Falls einer dieser Punkte *früher* ein K.-o.-Kriterium war — fair genug, dann sehen wir uns in v2.

---

## KKTerm holen

**[Lad den neuesten Windows-Installer (.exe) herunter](https://github.com/ryantsai/KKTerm/releases/latest)** und führ ihn aus. Der Installer ist derzeit **unsigniert** — Release-Signierung steht auf der Roadmap, also kann dich dein Virenscanner bis dahin streng anschauen. Das ist normal.

Aus dem Quellcode bauen oder mitmachen? Alles, was du brauchst, steht in [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Roadmap (Kurzfassung)

- macOS- + Linux-Builds
- Signierter Installer + Auto-Update
- Mehr Dateiübertragungs-Power (Fortsetzen, Ordner-Sync, Archivieren/Entpacken)
- Reichere Zwischenablage- und Geräte-Freigabe fürs Remotedesktop
- Mehr eingebaute Dashboard-Widgets

Vollständige, häufig aktualisierte Version: [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Mitwirken

Über eine helfende Hand würden wir uns sehr freuen. Ehrlich. Auch Kleinigkeiten zählen:

- **Probier den Dev-Build** und mach eine Issue auf, wenn sich etwas falsch anfühlt. „Fühlte sich falsch an" ist ein legitimer Bug-Report; wir graben mit dir.
- **Übersetz eine Sprache.** Englisch ist die Quelle der Wahrheit; dreizehn weitere Sprachen wohnen daneben.
- **Füg ein Dashboard-Widget hinzu.** Nimm eine kleine Idee, liefere sie, lern das Muster.
- **Verbessere das Handbuch.** Wenn du eine Funktion genutzt hast und die Doku nicht half, ist eine PR, die das behebt, Gold wert.

Komplettes Setup, Projektstruktur und PR-Checkliste stehen in [`CONTRIBUTING.md`](CONTRIBUTING.md). Auf der Suche nach einem Einstieg? Filtere offene Issues nach [`good first issue`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) oder [`help wanted`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).

---

## Projektdokumente

- [Produktkontext](CONTEXT.md) — die Fachsprache, an die du dich halten solltest
- [Architektur](docs/ARCHITECTURE.md) — Modul-Karte, wohin mit neuem Code
- [Roadmap](docs/ROADMAP.md)
- [Dashboard-Architektur](docs/DASHBOARD.md)
- [KI-Provider-Leitfaden](docs/AI_PROVIDERS.md)

---

## Stern-Verlauf

<a href="https://www.star-history.com/#ryantsai/KKTerm&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
  </picture>
</a>

Wenn du es bis hierher geschafft und noch keinen Stern vergeben hast — worauf wartest du, eine persönliche Einladung? Betrachte dies als die persönliche Einladung.

⭐ **[Gib KKTerm auf GitHub einen Stern](https://github.com/ryantsai/KKTerm)** — kostet einen Klick und macht dem Maintainer die ganze Woche schön. Sieh es als ein digitales 乖乖 im Rack.

---

## Lizenz

MIT. Siehe [LICENSE](LICENSE). Nutz es, fork es, liefer es aus, pack es in ein Homelab, das sonst niemand findet — das ist der Deal.
