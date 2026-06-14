<p align="center">
  <img src="src-tauri/icons/logo.png" alt="KKTerm" width="128" />
</p>

<h1 align="center">KKTerm</h1>

<p align="center">
  <strong>One native desktop window for terminals, SSH, SFTP, RDP/VNC, and a dashboard — plus an AI that builds your own little tools on request.</strong>
</p>

<p align="center">
  <em>Because your taskbar shouldn't look like a Vegas slot machine.</em>
</p>

<p align="center">
  <sub>Named after <strong>乖乖 (Kuāi Kuāi)</strong>, the green coconut snack Taiwanese sysadmins place on servers to keep them well-behaved. We hope this app earns its place on the rack.</sub>
</p>

<p align="center">
  <strong><a href="https://github.com/ryantsai/KKTerm/releases/latest">Download the latest release</a></strong>
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
    <strong>English</strong> ·
    <a href="README.zh-TW.md">繁體中文</a> ·
    <a href="README.zh-CN.md">简体中文</a> ·
    <a href="README.ja.md">日本語</a> ·
    <a href="README.ko.md">한국어</a> ·
    <a href="README.fr.md">Français</a> ·
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

## The 45-Second Pitch

You're a sysadmin / DevOps / homelab tinkerer / vibe-coder. Right now you've got:

- A terminal emulator
- A separate SSH client (with a profile list it took you a weekend to build)
- An SFTP client from 2007 that somehow still ships
- Remote Desktop in a window you keep losing on the wrong monitor
- A VNC viewer for that one Linux box
- A browser tab for the router's admin page
- A `claude` / `codex` session on a remote box that dies every time your Wi-Fi sneezes
- A sticky note with passwords *(don't worry, we won't tell)*

**KKTerm is one window for all of that.** Native on Windows, macOS, and Linux, with a local-first design that refuses to phone home.

Plus a few things you didn't know you wanted:

- A **Dashboard** where you tell an AI *"build me a widget that pings my router every 30 seconds"* and it appears, in its own sandbox, on your grid.
- **SSH panes that reattach to your remote `claude` / `codex` session** after every Wi-Fi tantrum, so a six-hour job survives a dropped connection.
- An **AI usage meter** so you stop hitting the rate-limit wall at 3 AM by surprise.
- An **Installer Helper** that finds, installs, updates, and launches the Windows dev tools you usually chase through ten browser tabs.
- **Twenty-five animated backgrounds** for the dashboard (yes, including `matrix`), because we are not above it.

And the best part: the AI assistant can turn a single sentence into a tiny dashboard tool you actually keep using.

> ⭐ **If this sounds like the app you've been meaning to build for the last six years — star the repo so we know someone's watching. It genuinely helps.**

Have an opinion on what should come next? Join the public feedback thread:
**[What should KKTerm prioritize for cross-platform admin workflows?](https://github.com/ryantsai/KKTerm/discussions/141)**

---

## Why "KKTerm"?

Walk into any Taiwanese data center and look at the top of the racks. Past TSMC fabs, Taipei Metro control rooms, Cathay Bank server halls, Chunghwa Telecom switching gear — you will spot a small green bag of 乖乖 (Kuāi Kuāi), a coconut-flavored corn snack from the 1960s.

The name literally means **"be good"**, **"behave"**. The IT tradition is straightforward and absolutely serious:

- **Must be green flavor (coconut).** Yellow (curry) means *stay home from work*; red (spicy) makes the server angry. Green only.
- **Must be unexpired.** A stale Kuai Kuai works against you. Engineers diligently swap them out.
- **Must be visible.** The server has to know it's there.
- **Do not eat it.** That bag is on duty.

Some of the largest, most boring, most uptime-obsessed systems in Asia run with a bag of corn puffs taped to the chassis. It works because the people who maintain them believe it works, which is a remarkably honest description of most IT culture.

**KKTerm** is **Kuai Kuai Term** — an admin workspace that aspires to the same job as the snack: to sit quietly next to your important machines and help them behave. Local-first. No telemetry. Approval-gated AI. The boring, dependable kind of software.

We have not yet been able to ship an actual bag of Kuai Kuai with the installer. That's a v2 item.

---

## See It Move

<p align="center">
  <a href="https://github.com/ryantsai/KKTerm">
    <img
      src="docs/assets/demo.gif"
      alt="KKTerm demo"
      width="720"
    />
  </a>
</p>

<p align="center"><sub><em>(Demo GIF goes here. A picture is worth a thousand bullet points, and we ran out of bullet points.)</em></sub></p>

---

## One Window, Every Connection

| You wanted to… | KKTerm does it |
| --- | --- |
| Open a local PowerShell / cmd / WSL shell | Local terminals, side by side |
| SSH into a server | SSH with keys, agent, passwords, jump hosts, and port forwarding |
| Browse files on that server | SFTP from the SSH connection — dual-pane, drag to transfer |
| FTP to a NAS from 2012 | FTP / FTPS in the same file browser |
| Telnet to ancient gear | Yes, Telnet's in there too |
| Talk to a serial port | Serial connections — pick a COM port and baud |
| Remote into a Windows box | The real Microsoft Remote Desktop, built right in |
| VNC into a Pi | VNC, rendered straight into the workspace |
| Open the router's web UI | An embedded browser tab with saved logins |
| Watch CPU on the host | A live status bar and a dashboard you can build on |

Same app. Same window. Same hotkeys. Same hopefully-not-eye-bleeding theme.

---

## Why People Keep It Open All Day

### Native where you work

Look around the dev-tooling landscape. Too many tools treat one desktop as the "real" platform and leave everyone else with caveats, half-working integrations, or a `# contributions welcome` comment.

Meanwhile the people who actually keep companies online — corporate IT, MSPs, homelab operators, and developers bouncing between laptops and servers — need the same workspace to behave well on the machine in front of them.

**KKTerm takes the native trade.** Windows builds keep the things Windows people care about: the *actual* Microsoft Remote Desktop (the same one as `mstsc.exe`, not a clone), real PowerShell / cmd / WSL shells, secrets kept in the Windows Credential Manager, a proper tray icon, native menus and dialogs. macOS and Linux builds use their own native paths where the OS differs, while keeping the same Connection, Session, Tab, Dashboard, and AI workflow model.

### Local-first means actually local

Your saved connections live in a file on your machine. Passwords live in the Windows Credential Manager, not in a text file next to the app. KKTerm ships no analytics, doesn't call home on startup, and needs no cloud account to launch. There is no "sign in to sync" because there is no sync.

If your network cable catches fire, KKTerm still opens.

### Terminals that don't lose their minds

- Split panes inside a tab.
- Fast, smooth rendering with searchable scrollback.
- Reconnecting actually means *reconnecting* — your remote session picks up where it was, not "start over and pretend the last hour didn't happen."
- Switching tabs does **not** kill the session. Closing the tab does. This distinction was a religious war internally; we won.

### An AI assistant that builds your tools

Most "AI in your terminal" demos stop at chat. KKTerm's assistant can also build small, durable dashboard widgets for the way you actually work — and it keeps the dangerous stuff behind a switch:

- **Pick what it can touch** — toggle whole tool families (Dashboard / Connections / Live Sessions) on or off.
- **Pick how it asks** — `Prompt` (default, asks every time) or `Allow All` (you're an adult, you signed the waiver).

Anything that looks like `rm -rf` gets flagged as dangerous and waits for an explicit human yes. The AI can't quietly run a destructive command because somebody got clever with a prompt injection in a man page.

It talks to OpenAI, Anthropic, OpenRouter, DeepSeek, Grok, Azure OpenAI, LiteLLM, GitHub Copilot, Ollama, NVIDIA, or anything OpenAI-compatible. Your API keys go to the OS keychain.

### A Dashboard that doesn't pretend to be Grafana

The Dashboard is a drag-and-resize grid of widgets. It's not for petabyte observability — it's for "I want a button to launch my five favorite apps and a panel showing my SSH host's uptime, *next to* my chat."

#### AI-Created Widgets — describe it, get it

This is the part we're genuinely excited about. You don't pick from a marketplace and you don't write JavaScript. You **tell the AI assistant what you want**, and it builds the widget right there on your dashboard:

> *"Add a widget showing the last 5 commits on my main repo as a list."*
> *"Make me a sticky-note widget that holds my on-call cheat sheet."*
> *"Build a widget that pings my home router every 30 seconds and shows green/red."*
> *"I need a stopwatch. Surprise me on the styling."*

Some are simple display panels (markdown, checklists, a single big stat); others run live code in an isolated sandbox you approve. Every widget you keep is yours — it persists with its own color, icon, and title, and you can have several copies at different sizes. Delete one with a right-click when the magic wears off.

#### Animated dashboard backgrounds (because we wanted to)

Pick a mood per dashboard view from **twenty-five** canvas-animated backgrounds:

| Mood | Backgrounds |
| --- | --- |
| Calm | `aurora`, `clouds`, `ocean`, `raindrops`, `rainywindow`, `frostedWindow`, `snow`, `sakura`, `fireflies`, `bubbles`, `aquarium`, `ricefield`, `lanterns` |
| Spacey | `starfield`, `nebula` |
| Warm | `embers`, `lava` |
| Geeky | `matrix`, `topo`, `synthwave` |
| Erratic | `cyberpunk`, `taipei101`, `thunderstorm`, `confetti`, `particleCursor` |

They pause when you're elsewhere, so they cost roughly nothing. Pair `matrix` with your AI assistant for a vibe that says "I am extremely productive and also possibly in a Wachowski film." Or pick `ocean` and look like a serious person. We do not judge either choice.

### Keep your remote AI agents alive

This is the second feature people fall in love with. KKTerm's SSH terminals can drop you straight into a **named tmux session** on the remote host that survives reconnect:

- Open an SSH connection with tmux enabled and start `claude`, `codex`, `gemini-cli`, `cursor-agent`, or whatever long-running agent you like.
- Close the laptop. Open it again. The pane silently re-attaches — the agent is still running, still has its scrollback, still in the middle of whatever it was doing.
- Network blip? KKTerm quietly reconnects to the same session without bothering you.
- Want the assistant to help? "Add terminal buffer to context" pulls the whole remote session into the conversation, so your local AI can reason about what your remote agent is doing.

If you've ever lost a six-hour `claude` or `codex` session to flaky hotel Wi-Fi, this one feature pays for the app. (The app is free. The feature is still worth it.)

### Know how much AI you have left

Coding agents charge by plan window, not by month, and they'll happily eat your quota while you're in a meeting. The **AI usage meter** keeps it visible:

- A Dashboard widget showing **Claude Code** and **Codex** side by side: connected account, plan, how much you've used in the current window and this week, and the next reset time.
- A compact **status-bar indicator** mirroring the same numbers, so even with the Dashboard closed you can tell at a glance whether you've got headroom before the next big refactor.
- It tells you up front if you need to re-login — *before* a long task, not in the middle of one.

### Let other AIs drive KKTerm

KKTerm ships its own built-in MCP server, so external coding agents (Claude Code, Codex, Copilot, Antigravity, OpenCode) can use your workspace the way you do — list connections, open one, read a terminal buffer, place widgets on the dashboard. AI-to-AI, on your machine, no cloud relay. The mutating, riskier actions stay behind a single safety toggle that's **off** by default.

Settings → AI Assistant → **Built-in MCP Server** has a one-click "Show config" dialog with everything pre-filled, plus copyable `claude mcp add` / `codex mcp add` commands.

---

## What KKTerm Is Not

A short list, because honesty earns trust:

- **Not a cloud product.** No sync, no team accounts, no SaaS tier. If you ever see a "Sign in to KKTerm" dialog, something has gone catastrophically wrong.
- **Not pretending every OS is identical.** KKTerm ships Windows, macOS, and Linux builds, but platform-specific features stay honest: Windows has the native RDP ActiveX path and Installer Helper catalog, while macOS and Linux use the portable paths available on those systems.
- **Not an autonomous AI agent.** The assistant proposes; the human disposes. `Allow All` is a choice you make, not a default.
- **Not a Grafana / Datadog replacement.** The Dashboard is for personal control surfaces, not 10k-host observability.
- **Not a Kubernetes IDE.** It is a terminal-first admin workspace. Please don't ask it to render a Helm chart.

If any of those *was* a dealbreaker — fair enough, we'll see you in v2.

---

## Get KKTerm

**[Download the latest release](https://github.com/ryantsai/KKTerm/releases/latest)** for your platform and run it. Windows installers are currently **unsigned** — release signing is on the roadmap, so until then your antivirus may give you a stern look. That's normal.

Want to build from source or contribute? Everything you need is in [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Roadmap (the short version)

- Cross-platform release polish
- Signed installer + auto-update
- More file-transfer power (resume, folder sync, archive/extract)
- Richer remote-desktop clipboard and device sharing
- More built-in dashboard widgets

Full and frequently-updated version: [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Contributing

We would love a hand. Genuinely. Even small things matter:

- **Try the dev build** and file an issue when something feels off. "It felt off" is a legitimate bug report; we'll dig with you.
- **Translate a locale.** English is the source of truth; thirteen other languages live next to it.
- **Add a Dashboard widget.** Pick a small idea, ship it, learn the pattern.
- **Improve the manual.** If you used a feature and the docs didn't help, a PR fixing that is gold.

Full setup, project layout, and the PR checklist live in [`CONTRIBUTING.md`](CONTRIBUTING.md). Looking for an entry point? Filter open issues by [`good first issue`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) or [`help wanted`](https://github.com/ryantsai/KKTerm/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).

---

## Project Docs

- [Product context](CONTEXT.md) — the domain language you should match
- [Architecture](docs/ARCHITECTURE.md) — module map, where to put new code
- [Roadmap](docs/ROADMAP.md)
- [Dashboard architecture](docs/DASHBOARD.md)
- [AI provider guide](docs/AI_PROVIDERS.md)

---

## Star History

<a href="https://www.star-history.com/#ryantsai/KKTerm&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ryantsai/KKTerm&type=Date" />
  </picture>
</a>

If you got this far and you haven't starred it yet — what are you waiting for, a personal invitation? Consider this the personal invitation.

⭐ **[Star KKTerm on GitHub](https://github.com/ryantsai/KKTerm)** — it costs one click and makes the maintainer's whole week. Think of it as a digital 乖乖 on the rack.

---

## License

MIT. See [LICENSE](LICENSE). Use it, fork it, ship it, put it in a homelab nobody else can find — that's the deal.
