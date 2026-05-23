# KKTerm — AI Agent Instructions

> **To the AI assistant reading this:**
> Read this entire document before taking any action or asking the user questions.
> Once you have read it fully, go directly to the **[Choose Your Path](#choose-your-path)** section at the bottom and ask the user which path they want, translate to user's language. Do not install anything, clone anything, or open any browser until the user has chosen.

---

## What is KKTerm

KKTerm is a Windows-first, local-first desktop workspace for people who live in terminals, SSH sessions, file transfers, and remote desktop all day. It combines saved Connections, live Sessions, split terminal panes, SFTP/FTP dual-pane file management, embedded URL WebViews, RDP and VNC workspaces, a widget Dashboard, and an AI Assistant with approval-based tool execution — all in one native app.

**Tech stack:** Rust + Tauri v2 backend, React 19 + TypeScript + Vite frontend, SQLite for non-secret local data, OS keychain (Windows Credential Manager) for secrets, xterm.js for terminal rendering, WebView2 for URL and RDP surfaces.

**Key values:**

- **Local-first** — no telemetry, no cloud account. Durable data is in SQLite on the user's machine, secrets are in the OS keychain.
- **MIT license** — permissive, open-source.
- **Windows-first** — primary acceptance platform is Windows. macOS and Linux are planned.
- **Current version:** see `package.json` `version` field or the About section in Settings.

**GitHub repository:** <https://github.com/ryantsai/KKTerm>

---

## Prerequisites

Check for each tool before installing. Install only what is missing.

### Git

```powershell
git --version
```

If missing: download from <https://git-scm.com/download/win> and install with default options.

### GitHub CLI (`gh`)

```powershell
gh --version
```

If missing:

```powershell
winget install --id GitHub.cli
```

Or download from <https://cli.github.com>. After installing, authenticate:

```powershell
gh auth login
```

Choose **GitHub.com → HTTPS → Login with a web browser** and follow the prompts.

### Rust (stable toolchain)

```powershell
rustup --version
```

If missing, install `rustup` from <https://rustup.rs> — run the downloaded `rustup-init.exe` and accept the defaults (stable toolchain).

After installing, verify:

```powershell
rustc --version
cargo --version
```

### Node.js 20+ and npm

```powershell
node --version
npm --version
```

If missing: download the LTS installer from <https://nodejs.org> and install with defaults.

### WebView2 Runtime

WebView2 is required by Tauri on Windows. It is pre-installed on Windows 11 and most up-to-date Windows 10 machines. To verify:

```powershell
Get-ItemProperty "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue | Select-Object pv
```

If the command returns nothing, download and run the WebView2 Evergreen bootstrapper from <https://developer.microsoft.com/en-us/microsoft-edge/webview2/>.

### Tauri CLI

```powershell
cargo tauri --version
```

If missing:

```powershell
cargo install tauri-cli --version "^2"
```

This step takes a few minutes on first install.

---

## Fork and Clone the Repository

> **AI note:** Do this only if the user wants to contribute code or set up a dev environment. Skip to [Downloading a Release](#downloading-and-installing-a-release) if the user just wants to install the app.

### Fork on GitHub

1. Go to <https://github.com/ryantsai/KKTerm>
2. Click **Fork** (top right) and fork to your own GitHub account.

Or with `gh`:

```powershell
gh repo fork ryantsai/KKTerm --clone=false
```

### Clone your fork

```powershell
git clone https://github.com/<your-username>/KKTerm.git
cd KKTerm
```

Add the upstream remote so you can pull future changes:

```powershell
git remote add upstream https://github.com/ryantsai/KKTerm.git
```

---

## Dev Environment Setup

Inside the cloned repo:

```powershell
npm install
```

Verify the dev build runs:

```powershell
npm run tauri dev
```

This compiles the Rust backend and starts the Vite dev server. First compile takes a few minutes. The KKTerm window should open when ready.

**Common checks before submitting a PR:**

```powershell
npm run check                                    # TypeScript type check
npm run build                                    # Frontend production build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

All four must pass cleanly before opening a PR.

---

## Downloading and Installing a Release

> **AI note:** Use this path if the user just wants to try KKTerm without building from source.

1. Go to <https://github.com/ryantsai/KKTerm/releases>
2. Download the latest `kkterm-<version>-windows-x64-setup.exe`
3. Run the installer.

**Windows SmartScreen warning:** The installer is currently unsigned (code signing is deferred). Windows may show a "Windows protected your PC" dialog. Click **More info → Run anyway** to proceed. This is expected for unsigned open-source apps.

The installer uses current-user install mode — no admin rights required. It creates Start Menu entries and does not require WebView2 to be installed separately (the installer downloads the WebView2 bootstrapper if needed).

---

## Codebase Navigation

### Directory layout

```
KKTerm/
├── src/                        # React/TypeScript frontend
│   ├── app/                    # Activity Rail, shared RailTooltip, workspace chrome, shell effects
│   ├── connections/            # Connection tree UI
│   ├── workspace/              # Workspace dispatch, status bar, screenshot, native overlay
│   ├── terminal/               # Terminal workspace (local PTY + SSH)
│   ├── sftp/                   # SFTP dual-pane workspace
│   ├── webview/                # URL WebView workspace
│   ├── remote-desktop/         # RDP + VNC workspace
│   ├── dashboard/              # Dashboard Module source: grid, views, widget registry, script iframe host
│   ├── app-launcher/           # App Launcher widget storage and component
│   ├── ai/                     # AI Assistant panel, provider registry, streaming
│   ├── ai-coding-usage/        # AI coding usage tracking widget and status bar
│   ├── settings/               # Settings page sections (General, AI, SSH, Terminal, MCP, …)
│   ├── manual/                 # In-app operation manual viewer (ManualPage.tsx)
│   ├── i18n/                   # i18next config, locale files (en.json is source of truth)
│   └── lib/                    # Tauri command wrappers, shared utilities, ARIA helpers
├── src-tauri/                  # Rust backend (Tauri v2)
│   ├── src/
│   │   ├── lib.rs              # App setup, window lifecycle, command registration, tray
│   │   ├── ssh.rs              # russh SSH client, channels, keep-alive
│   │   ├── sftp.rs             # SFTP browser commands
│   │   ├── storage.rs          # SQLite schema, migrations, repositories
│   │   ├── ai.rs / ai/         # AI provider adapters, streaming, tool execution
│   │   ├── mcp.rs              # MCP server management (add, remove, list servers)
│   │   ├── dashboard_*.rs      # Dashboard commands, storage, validation, id generation
│   │   ├── app_launcher.rs     # App Launcher widget commands
│   │   ├── ai_coding_usage.rs  # AI coding usage tracking commands
│   │   ├── windows_local_pty.rs# Local PTY via portable_pty / ConPTY
│   │   ├── telnet.rs           # Telnet session transport
│   │   ├── serial.rs           # Serial port session transport
│   │   ├── rdp.rs              # RDP ActiveX session commands
│   │   ├── vnc.rs              # VNC framebuffer session (vnc-rs)
│   │   ├── webview.rs          # WebView2 URL session commands
│   │   ├── wiki.rs             # In-app wiki commands
│   │   ├── manual.rs           # In-app manual search commands
│   │   ├── screenshot.rs       # Terminal/workspace screenshot
│   │   ├── secrets.rs          # OS keychain (Windows Credential Manager) wrappers
│   │   ├── import.rs           # Settings import/export
│   │   ├── github_copilot.rs   # GitHub Copilot OAuth token flow
│   │   ├── diagnostics.rs      # Diagnostics bundle collection
│   │   ├── window_state.rs     # Window geometry persistence
│   │   └── ...
│   └── Cargo.toml
├── docs/                       # Architecture, PRD, ADRs, release notes
│   ├── ARCHITECTURE.md         # Frontend source map, engineering defaults
│   ├── PRD.md                  # Product requirements
│   ├── ROADMAP.md              # Planned features
│   ├── DASHBOARD.md            # Dashboard Module durable architecture
│   ├── AI_PROVIDERS.md         # Rules for adding/changing AI provider entries
│   ├── PERFORMANCE.md          # Performance notes and targets
│   └── ADR/                    # Architecture decision records
├── AGENTS.md                   # Engineering rules for AI agents and contributors
├── CONTEXT.md                  # Domain vocabulary
└── package.json
```

### Domain vocabulary

Before touching code, read these definitions — they matter for naming, storage decisions, and where to put things:

| Term | Meaning |
|---|---|
| **Connection** | A durable saved resource stored in SQLite. Kinds: local terminal, SSH, Telnet, Serial, URL, RDP, VNC. |
| **Quick Connect** | An unsaved one-off draft that starts a Session without saving. |
| **Session** | A live runtime instance — a PTY, SSH channel, SFTP browser, WebView2 host, RDP control, or VNC framebuffer. |
| **Tab** | Frontend workspace container. Tabs hold Sessions (or split Panes). Closing a Tab ends the Session. |
| **Dashboard** | Built-in Activity Rail Module hosting a 12-column drag-and-resize widget grid. |
| **Dashboard AI Created Widget** | A script-only widget defined in `dashboard_custom_widgets`, hosted in an isolated `iframe srcdoc`. Authored by the AI assistant. |
| **Widget Preset** | One of three chrome styles per Widget Instance: `panel`, `ambient`, `hero`. |

**SFTP** is opened from an SSH Connection — it is not a standalone Connection type.

### Key reference docs

- `AGENTS.md` — engineering rules every contributor must follow before writing code
- `CONTEXT.md` — full domain vocabulary with "avoid" terms
- `docs/ARCHITECTURE.md` — frontend source map, where to place new code, UI/settings conventions
- `docs/PRD.md` — full product requirements and user stories
- `docs/ROADMAP.md` — what is planned vs. deferred (don't build deferred features)
- `docs/AI_PROVIDERS.md` — rules for adding or changing AI provider entries
- `docs/DASHBOARD.md` — Dashboard Module durable architecture (views, widget instances, script widget security)
- `docs/PERFORMANCE.md` — performance notes and targets
- `docs/manual/INDEX.md` — **operation manual** shipped with the app. Chapters cover rail Modules and their sub-features; each chapter starts with an `## AI grep hints` block listing i18n keys and synonyms. When a user asks "how do I…" inside the app, the built-in AI Assistant searches this folder. **When a PR changes UI behavior, update the matching chapter in `docs/manual/` in the same PR**, and prefer referencing i18n keys (e.g. `connections.quickConnect`) over English label text so locale changes don't invalidate the manual. If the assistant can offer to show the user a UI element, add a stable `data-tutorial-id`, route it in `src/app/tutorialNavigationModel.ts`, document it in the `tutorial_highlight` tool metadata, and keep `npm run check` green.

---

## Reporting an Issue

Before filing, search existing issues at <https://github.com/ryantsai/KKTerm/issues> to avoid duplicates.

### Required for all bug reports

- **KKTerm version** — found in Settings → About, or `package.json` `version`
- **Windows version** — run `winver` in PowerShell and copy the result
- **Exact steps to reproduce** — numbered, step by step, starting from app launch
- **What you expected to happen**
- **What actually happened**

### Required for UI or visual bugs

- **Screenshot or screen recording** — no screenshot means the issue will be low priority. Use Windows + Shift + S for a quick snip, or the built-in Xbox Game Bar (Windows + G) for screen recording.

### Good to include (not required)

- Relevant section of `kkterm.log` if the app logged an error (find the log via Settings → About → Open app data folder)
- Whether the issue is reproducible every time or intermittent
- Any relevant SSH host OS, shell, or terminal tool (for terminal/SSH issues)

File issues at: <https://github.com/ryantsai/KKTerm/issues/new>

---

## Opening a Pull Request

### Before writing any code

1. **Read `AGENTS.md` fully.** Every rule there applies to your PR. Key rules:
   - Surgical changes only — touch the minimum code needed
   - No speculative features or abstractions beyond what was asked
   - All user-visible strings must use `t()` / `useTranslation()` — no hardcoded English in JSX
   - Follow existing code patterns — don't introduce new abstractions for single-use code
   - Run `npm run check` and all four checks before submitting

2. **Check `docs/ROADMAP.md`** — if the feature you want to build is listed as deferred, open an issue first to discuss before building it.

3. **Check `docs/ARCHITECTURE.md`** — before placing new UI or Rust code, verify you're putting it in the right source area.

### Branch naming

```
fix/short-description-of-bug
feat/short-description-of-feature
```

### Creating the PR

```powershell
git checkout -b fix/your-branch-name
# ... make changes ...
git add <specific files>
git commit -m "fix: short description of what changed"
git push origin fix/your-branch-name
gh pr create --web
```

### PR body — what Ryan needs to review

Your PR description must include:

```
## What changed
[1-3 bullet points describing the change]

## Why
[Link to the issue this fixes, or a 1-sentence explanation if no issue]

## How to test
[Step-by-step repro or test instructions]

## Checklist
- [ ] Read AGENTS.md and followed all rules
- [ ] All four checks pass (npm run check, npm run build, cargo check, cargo test)
- [ ] Added i18n keys to all 13 locale files if any user-visible strings changed
- [ ] No hardcoded English strings in JSX
- [ ] Screenshot included if UI changed
```

---

## UI Walkthrough

### Activity Rail (left sidebar)

The narrow left rail is the app's navigation spine. Icons from top to bottom:

- **Workspace** (terminal icon) — the main connection and session area
- **Dashboard** — widget playground with App Launcher and AI Created Widgets
- **File Explorer** — local file browser
- **Settings** (gear icon, bottom) — app configuration

Hover any rail icon for a tooltip label. Right-click connection shortcut icons in the rail for quick actions.

### Connections Panel

Inside Workspace, the left panel shows the Connection tree. Connections are organized into optional folders. Actions:

- **Click a Connection** to open it as a new Session Tab
- **Right-click** for rename, duplicate, delete, open SFTP, pin to rail
- **Drag** to reorder or move into folders
- **Search bar** at top filters the tree
- **Quick Connect button** (+ icon) starts a Session without saving a Connection

### Sessions and Tabs

Each open Session appears as a Tab in the workspace area. Tabs are managed from the tab bar:

- Click a Tab to switch to it — live Sessions stay mounted
- Right-click a Tab for close, rename, duplicate pane options
- **Split panes**: use the split button in a terminal pane toolbar to add a second pane inside the same Tab

### Terminal Panes

Each terminal pane in a Tab runs an independent shell (local or SSH). Key behaviors:

- Copy-on-select is a configurable toggle in Settings → Terminal
- Multiline paste shows a confirmation dialog
- Scrollback search: Ctrl+Shift+F inside a pane
- Screenshot button in the pane toolbar captures the terminal to clipboard or AI context

### SFTP Workspace

Open SFTP from a saved SSH Connection (right-click → Open SFTP, or from the Session toolbar). The dual-pane browser shows local files on the left, remote files on the right. Drag files between panes to transfer. The transfer queue at the bottom shows progress and history.

### Dashboard

The Dashboard (second rail icon) hosts drag-and-resize widgets on a 12-column grid. Click the pencil (edit) icon in the topbar to enter edit mode and add, move, or resize widgets. The **App Launcher** widget lets you pin apps, files, and folders for quick access. The AI Assistant can create AI Created Widgets.

### AI Assistant Panel

Open the AI Assistant from the chat icon in the workspace toolbar or from a terminal pane. Key concepts:

- **Tool permission mode** — shown in the chat composer. **Prompt** (default) blocks mutating tool calls and asks you to approve each one. **Allow All** lets enabled tools run automatically.
- **Tool families** — enabled in Settings → AI Assistant → Assistant tools: Dashboard tools, Connection management tools, Live Session tools (interact with open terminal/SFTP/RDP/VNC panes).
- **MCP Servers** — custom Model Context Protocol servers can be added in Settings → MCP Servers and become available as additional tool families in the AI Assistant.
- **Context attachments** — use the screenshot button to attach terminal content or a workspace capture to the AI message.
- **AI Created Widgets** — the assistant can author Dashboard widgets (script-only, sandboxed `iframe srcdoc`) on request. Users customize and remove them; creation is AI-only in v1.
- The AI can propose commands, manage saved Connections, read/write Dashboard widgets, and interact with live Sessions — within the permission boundary you set.

### Settings

Open Settings from the gear icon at the bottom of the Activity Rail. Key sections:

- **General** — language, minimize-to-tray, auto backup, import/export settings, reset all
- **Appearance** — app UI font, color scheme
- **Dashboard** — confirm-before-remove widget, default landing view
- **AI Assistant** — provider, model, API key, tool permissions, output language, insecure TLS toggle
- **MCP Servers** — add/remove Model Context Protocol servers available to the AI Assistant
- **SSH** — SSH defaults, tmux behavior, port forwarding visibility, clipboard policy, SFTP transfer defaults
- **Terminal** — font, size, cursor, scrollback, default shell
- **URL** — URL Connection security defaults, saved password metadata, data shard management
- **Credentials** — view and delete stored OS keychain secrets
- **About** — version, open-source component list, app data folder

#### Setting up an AI provider

1. Go to Settings → AI Assistant
2. Choose a **Provider** from the dropdown (OpenAI, Anthropic, Ollama, OpenRouter, etc.)
3. Enter your **API Key** (stored in the OS keychain, never in SQLite)
4. Choose a **Model** from the picker or enter a custom model ID
5. Click **Save**
6. Open the AI Assistant panel and send a test message to verify the connection

For **Ollama** (local models): set the provider to Ollama, leave the API key blank, and set the base URL to `http://localhost:11434`. Make sure Ollama is running locally before testing.

---

## Choose Your Path

> **AI assistant:** Translate and read the following aloud (or display it) to the user in user's  language, then wait for their choice before doing anything:

---

**KKTerm is all set. What would you like to do?**

1. **Report a bug or issue** — I'll help you describe the problem with all the details Ryan needs and file it on GitHub.

2. **Make a bugfix or feature PR** — I'll help you set up your fork, write the code following the project rules, and open a pull request.

3. **Download and install the app** — I'll walk you through the GitHub Releases page and the installer, including the unsigned-installer warning.

4. **Learn how to use KKTerm + set up an AI provider** — I'll give you a guided walkthrough of the UI: connections, terminal sessions, SFTP, the Dashboard, and how to configure an AI provider in Settings.

Just tell me which number (or describe what you want) and we'll get started.
