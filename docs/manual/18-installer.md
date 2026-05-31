# 18 — Installer Helper

## AI grep hints

- Keys: `installer.title`, `installer.subtitle`, `installer.railLabel`, `installer.refresh`, `installer.lastChecked`, `installer.checkingDots`, `installer.updateAll`, `installer.section.installed`, `installer.section.available`, `installer.section.essentials`, `installer.section.aiAgents`, `installer.section.aiPlatforms`, `installer.section.development`, `installer.section.windowsPowerUser`, `installer.section.remoteAccess`, `installer.section.utilities`, `installer.tile.latest`, `installer.tile.installed`, `installer.actions.install`, `installer.actions.update`, `installer.actions.uninstall`, `installer.actions.run`, `installer.actions.stop`, `installer.actions.openWebUi`, `installer.actions.installService`, `installer.actions.registerService`, `installer.actions.removeService`, `installer.actions.cancel`, `installer.options.scope`, `installer.options.scopeSelfElevatingHint`, `installer.options.version`, `installer.options.location`, `installer.options.addToPath`, `installer.options.pinVersion`, `installer.status.installing`, `installer.status.uninstalling`, `installer.status.completed`, `installer.status.failed`, `installer.status.cancelled`, `installer.status.running`, `installer.status.stopped`, `installer.status.unknown`, `installer.status.serviceInstalled`, `installer.status.serviceRemoved`, `installer.status.partial`, `installer.status.noVersion`, `installer.status.notInstalled`, `installer.status.neverChecked`, `installer.status.scanning`, `installer.empty.loading`, `installer.confirm.installTitle`, `installer.confirm.installWithPrereqsBody`, `installer.confirm.uacFooter`, `installer.confirm.uninstallTitle`, `installer.confirm.uninstallSimpleBody`, `installer.confirm.uninstallDependentsBody`, `installer.confirm.uninstallDependentsFooter`, `installer.confirm.updateAllTitle`, `installer.confirm.updateAllBody`, `installer.confirm.updateAllConfirm`, `installer.wslReboot`, `installer.dialog.installLocation`, `installer.dialog.provider`, `installer.dialog.installedVersion`, `installer.dialog.latestVersion`, `installer.dialog.lastChecked`, `installer.dialog.homepage`, `installer.dialog.releaseNotes`, `installer.dialog.webUi`, `installer.dialog.windowsService`, `installer.dialog.runtimeStatus`, `installer.dialog.serviceStartup`, `installer.dialog.prerequisites`, `installer.dialog.prereqInstalled`, `installer.dialog.prereqMissing`, `installer.dialog.checkNow`, `installer.dialog.checkingDots`, `installer.dialog.updateAvailable`, `installer.dialog.installingTitle`, `installer.dialog.uninstallingTitle`, `installer.dialog.installedTitle`, `installer.dialog.failedTitle`, `installer.dialog.cancelledTitle`, `installer.stepper.failedBadge`, `installer.steps.resolve`, `installer.steps.download`, `installer.steps.verifyChecksum`, `installer.steps.extract`, `installer.steps.placeFiles`, `installer.steps.updatePath`, `installer.steps.install`, `installer.steps.verify`, `installer.steps.enable`
- Topics: Installer Helper Module, bundled catalog (compile-time embedded), ADR 0008 supersedes ADR 0007, winget recipes, npm recipes, uv pip recipes, download-installer recipes, github-release recipes, Windows feature recipes (DISM), WSL distro recipes, bundles (node-bundle, python-bundle), dependency resolution, UAC prompts, WSL reboot gating, pin version, in-flight cancellation, tutorial targets `app.activityRailInstaller`, `installer.updateAll`, `installer.toolOptions`
- Synonyms: "install nvm", "install Node", "install Python", "install Docker", "install Claude Code", "set up dev tools", "developer tools installer", "package manager"

## What it is

The **Installer Helper Module** is a built-in Activity Rail destination that installs, updates, and uninstalls a curated catalog of Windows AI tool stacks — git, node, python, docker, AI coding CLIs, local AI platforms, and supporting utilities. It is grouped with the other built-in Module buttons near the top of the rail, with its own icon (`Package`).

The catalog **ships with the KKTerm release**: the JSON list of supported tools is compiled into the binary at build time. Updates to the catalog ride with each release. See `docs/ADR/0008-installer-helper-bundled-catalog.md` for the rationale and what it supersedes.

## Module layout

The page has a header and categorized sections:

- **Header.** Title (`installer.title`), subtitle (`installer.subtitle`), a page-level last checked status (`installer.lastChecked`), and two buttons:
  - `installer.refresh` — re-runs detection for every catalog tool, then queries the latest available version for every catalog tool whose provider can report one and caches the result.
  - `installer.updateAll` — installs every available update sequentially. Tutorial target: `installer.updateAll`.
- **Essentials** (`installer.section.essentials`) — recommended Windows setup patterns for Node, Python, and Git. The visible Node entry (`Node (nvm-windows)`) installs nvm-windows, then installs and activates the latest Node LTS release with nvm-windows. The visible Python entry (`Python (uv)`) installs uv, then installs the latest stable Python 3.13 patch release with `uv python install 3.13 --default` and pins Python 3.13 globally with `uv python pin --global 3.13`. Power users who want direct Node.js or CPython installer packages can install those outside Installer Helper.
- **AI Agents** (`installer.section.aiAgents`) — coding-agent CLIs and desktop agent apps such as Claude Code CLI, Codex CLI, Gemini CLI, OpenClaw, Codex Desktop, Claude Desktop, and Hermes AI Agent.
- **AI Platforms** (`installer.section.aiPlatforms`) — local or self-hosted AI platforms such as Ollama, n8n, Open WebUI, Flowise, and Langflow. Managed entries live under `%LOCALAPPDATA%\KKTerm\installer\apps\<tool_id>\` rather than ordinary global command-line tools.
- **Development** (`installer.section.development`) — editors, containers, API tools, base WSL, WSL distribution shortcuts, OpenCode, and Rustup.
- **Windows Power User** (`installer.section.windowsPowerUser`) — Windows-focused productivity and administration tools such as Microsoft PowerToys, Sysinternals Suite, Everything Search, and Ditto Clipboard Manager.
- **Remote Access** (`installer.section.remoteAccess`) — private-network and remote-desktop access tools such as Tailscale and RustDesk.
- **Utilities** (`installer.section.utilities`) — Notepad++, NSSM, ripgrep, jq, fzf, 7-Zip, ShareX, and Excalidraw. Winget-installed command-line utilities add the winget links directory (`%LOCALAPPDATA%\Microsoft\WinGet\Links`) to the user PATH so new shells can find their commands.

Each tool surface is a **tile** in the section grid. Installed tools show an `installer.section.installed` badge. Tile version metadata is shown on separate `installer.tile.latest` and `installer.tile.installed` rows, rather than as provider kind text. Runtime bundles add a third row: `installer.tile.node` for the Node runtime version, and `installer.tile.python` for the Python runtime version. Their `installer.tile.installed` row remains the manager version (nvm-windows or uv), so update checks compare like with like. When `latestVersionSeen` differs from `installedVersion`, the tool stays in its normal category section, the latest version value is highlighted, and the tile action uses `installer.actions.update`. If a latest-version lookup for a supported provider errors, the tile's `installer.tile.latest` row shows that error instead of the generic unknown-version fallback. The page-level header status carries the most recent check time. One-step bundles usually inherit latest/detected version metadata from their child recipe; Node and Python bundles additionally show the detected runtime version once nvm-windows/uv and the managed runtime are present. The tile action button switches between `installer.actions.install` and `installer.actions.update` based on detected install/update state, and opens the app-owned popup dialog — `InstallerToolDialog` — that owns the detail surface (the previous inline expansion has been removed). Tutorial target on the options form inside the dialog: `installer.toolOptions`.

The dialog has three rendering modes:

- **Installed info** — version, install location (when known), provider summary, latest version + last checked timestamp, pin-version switch, and an Update banner when `latestVersionSeen` differs from `installedVersion`. Installed tools that expose a local browser interface may also show `installer.dialog.webUi`, `installer.dialog.runtimeStatus`, and `installer.actions.run` / `installer.actions.stop` plus `installer.actions.openWebUi`; n8n, Flowise, Open WebUI, Langflow, Excalidraw, and Ollama use fixed app-local commands and localhost URLs. Run commands for managed web UI apps start from their `%LOCALAPPDATA%\KKTerm\installer\apps\<tool_id>\` directory so app-local config, secrets, and generated files stay with the managed app. After install/update completes, managed web UI apps are started automatically in normal run mode. Service registration is explicit: service-capable managed apps may show `installer.dialog.windowsService`, `installer.dialog.serviceStartup`, and `installer.actions.registerService`; this uses NSSM, sets startup to automatic for the next service start, and may show UAC. Registration does not start the service immediately because the normal run mode may already own the fixed localhost port. Footer: `Uninstall` (danger) · `Run`/`Stop` and `Open web UI` (when available) · `Register as service` or `Remove service` (when available) · `Update` (when available) · `Close`.
- **Not-installed info** — official website (`recipe.homepage`), release notes (`recipe.releaseNotesUrl`, with a provider-derived fallback for github/npm/winget when absent), latest version (with an inline `installer.dialog.checkNow` action when no latest has been queried yet), provider summary, prerequisites list with installed/missing badges, and the options form. Footer: `Install` (primary) · `Cancel`.
- **Stepper** — opened when the user presses Install/Update, or when reopening the dialog while an install/uninstall is in flight or has just terminated. The body renders the n8n-style step list with status dots (`pending`/`running`/`done`/`failed`), per-step duration / active-step ratio, and a click-to-expand per-step log panel. Winget progress is best-effort: KKTerm shows determinate progress when winget emits carriage-return percentage or downloaded/total frames, and falls back to elapsed-time heartbeats when the underlying installer is silent. Terminal states swap the dialog title (`installer.dialog.installedTitle` / `installer.dialog.failedTitle` / `installer.dialog.cancelledTitle`).

## Tool detection

Detection renders in two phases on Module entry. First, KKTerm loads the local Windows Registry detection cache from `HKCU\Software\Ryan Tsai\KKTerm\InstallerDetectionCache` and paints any remembered states immediately. Then the backend starts a bounded streaming revalidation sweep in the background. Each completed tool emits a `detectResult` event over `installer://progress`, updates the tile, and writes the fresh state back to the registry cache. `installer.refresh` re-runs detection on demand, then queries latest versions for every detected installed tool.

Per-provider detection methods:

- **winget** — detection reads a local Add/Remove Programs registry snapshot once per fresh detection sweep and matches catalog aliases (`registryKeys`, `displayNames`, `displayNamePrefixes`) so existing installs can be recognized even when winget would report an `ARP\...` identifier. The snapshot is cached in memory until the next explicit detection call. Fresh results are persisted to the Installer Helper registry cache. Latest-version checks prefer the structured Microsoft `winget-pkgs` manifest repository so they do not depend on localized `winget show` labels; KKTerm only treats version-shaped manifest directories as latest-version candidates and ignores sibling channel folders such as prerelease or alternate-edition branches. When that lookup is unavailable, KKTerm falls back to `winget show`, accepts winget source agreements for first-run Windows machines, and uses `CREATE_NO_WINDOW` so no `cmd.exe` window flashes on Module entry.
- **npm** — `npm ls -g --json --depth=0`. Looks up the package in the top-level `dependencies`. Managed server apps such as n8n and Flowise use an app-local marker instead.
- **uv pip** — app-local Python virtual environments created with uv. Open WebUI, Langflow, and Hermes AI Agent use this provider and are detected by their app-local marker after KKTerm installs them.
- **download-installer** — downloads a vendor-declared installer URL to a temp file and launches it with the normal Windows installer UI. Codex Desktop uses this path because its canonical install surface is a vendor download page rather than a package-manager recipe. Claude Desktop uses the winget package `Anthropic.Claude` so installs do not depend on the protected browser-only Claude download redirect.
- **github-release / managed app** — a marker file under `%LOCALAPPDATA%\KKTerm\installer\bin\<tool_id>\` or `%LOCALAPPDATA%\KKTerm\installer\apps\<tool_id>\` written at install time. Only installs we performed count as "managed".
- **windows-feature** — `dism /online /get-featureinfo /featurename:<X>`. Parses the `State :` line.
- **wsl-distro** — `wsl --list --quiet`. Matches the distro name declared in the catalog.
- **bundle** — installed iff every step's detection is installed; otherwise the row shows `installer.status.partial` with an `installed/total` count. One-step bundles inherit the child version.

Runtime command probes such as `node --version`, `uv python find 3.13`, global npm package detection, managed app version probes, and managed web UI launchers use or retry with the refreshed persisted Windows PATH when the current KKTerm process cannot resolve the command. This lets a fresh nvm-windows, uv, or npm install re-detect and launch related npm-backed tools correctly without requiring a KKTerm restart.

## Install flow

1. The user clicks `installer.actions.install` on a row.
2. The frontend resolves the install plan: transitive `needs` are walked, and prerequisites already detected as installed are skipped.
3. If the plan has unresolved prerequisites OR a non-zero UAC-prompt estimate, a confirm dialog (`installer.confirm.installTitle`) lists the prerequisites and a footer (`installer.confirm.uacFooter`) names the estimated prompt count.
4. On confirm, the backend dispatches the install in a worker thread. The dialog flips to stepper mode. Progress streams to the frontend on the `installer://progress` Tauri event channel as a discriminated union: `plan` (declared step list, emitted once before any work begins), `stepStarted` / `stepFinished` (per-step lifecycle), `stdout` / `stderr` / `progress` (each carrying an optional `stepId` so the UI can route lines and ratios to the active step row), `step` (legacy free-form label retained for unmigrated providers), `completed`, `failed`, `cancelled`.
   Runtime bundle follow-up commands and npm package installs refresh PATH plus relevant persisted Windows user and machine environment variables before spawning. This lets freshly installed managers such as nvm-windows and uv run their immediate `nvm install lts`, `uv python install ...`, or npm-based AI-agent install steps without restarting KKTerm or Windows. The refreshed child environment also includes existing Git for Windows command directories so later child installers can resolve `git` in the same KKTerm session. The base WSL recipe runs `wsl --install --no-distribution`, so Docker can depend on WSL without silently installing Ubuntu or launching Linux first-run setup. WSL distribution shortcuts are separate recipes that run `wsl --install --distribution <name> --no-launch`; if base WSL was installed as their prerequisite in the same queue, the queue stops at the reboot boundary and the distro install is retried after restart.
5. After a `completed` event, the row re-runs detection automatically and moves to the Installed section.

## Update flow

1. The user clicks `installer.refresh` (header), or `installer.dialog.checkNow` for one tool inside the detail dialog.
2. The backend launches a **streaming** sweep. It emits `checkStarted` with the id list, then per-tool `checkResult` events as each lookup lands (latest-version queries run in parallel — `winget show`, npm registry, PyPI, GitHub releases API — bounded to a small pool to hide slow legs behind fast ones), and finally `checkFinished`. The frontend writes each successful result into `toolState` as it arrives so rows light up incrementally instead of after one large blocking await. Per-tool lookup errors stay in frontend session state and render in the `installer.tile.latest` / `installer.dialog.latestVersion` row; they do not overwrite the persisted latest-version cache. Results are persisted in the `installer_tool_state` SQLite table.
3. Rows whose `latestVersionSeen ≠ installedVersion` stay in their normal category section, highlight the latest version value, and show their per-row `installer.actions.update` button.
4. Clicking `installer.updateAll` lists every pending update in a dialog (`installer.confirm.updateAllTitle`), warns about the likely UAC prompt count, and on confirm runs the queue sequentially. Pinned tools (see Pin version below) are skipped.

A real-time background check is opt-in only — not in v1.

## Uninstall flow

1. The user clicks `installer.actions.uninstall` on an installed row.
2. The frontend runs a reverse-dependency check: every catalog recipe whose `needs` includes this row's id AND whose detection says installed is collected.
3. If dependents exist, the confirm dialog (`installer.confirm.uninstallTitle`) lists them with the warning `installer.confirm.uninstallDependentsBody` and the footer `installer.confirm.uninstallDependentsFooter`. Otherwise the dialog shows the simple body `installer.confirm.uninstallSimpleBody`.
4. On confirm, the backend dispatches per-provider uninstall: `winget uninstall`, `npm uninstall -g`, `uv pip uninstall`, `Remove-Item -Recurse` on the github-release or managed-app install directory, `dism /online /disable-feature`, or `wsl --unregister <distro>` for WSL distro shortcuts. Download-installer desktop apps that do not expose a safe structured uninstall path tell the user to uninstall from Windows Settings.

There is intentionally no "Uninstall all" action.

## Cancellation

Per row, an in-flight install/uninstall surfaces an `installer.actions.cancel` button. Cancel raises an `AtomicBool` flag the worker thread polls; on the next check it kills the child process and emits `cancelled`. Partial installs are **not rolled back** — the underlying installer's transactionality is what it is.

For "Update all", cancel stops the **queue** (the next-up tools), not the in-flight install.

## Options

Each recipe declares a subset of these options (the set is closed):

- **`installer.options.scope`** — `user` (default) vs `machine`. Winget recipes only. KKTerm passes `--scope user` by default for scoped winget recipes, including prerequisite installs inside bundles. Per-user means KKTerm asks winget for a current-user install; it is no-UAC only when the package's own installer supports a non-elevating user install. Known self-elevating user-scope installers show `installer.options.scopeSelfElevatingHint`. Machine-scope always triggers UAC.
- **`installer.options.version`** — specific version string, or empty = `installer.options.versionLatest`.
- **`installer.options.location`** — install location override. Winget: `--location`. github-release: extraction directory.
- **`installer.options.addToPath`** — github-release recipes only. Appends the install directory to user PATH via PowerShell after extraction.
- **`installer.options.pinVersion`** — row-level switch. When enabled, this tool is **excluded** from `installer.updateAll`. Pinning does not prevent a per-row update click.

## WSL reboot gating

When the user installs base WSL in the current app session, the Installer Helper sets a session-only flag `wslJustEnabled`. While that flag is set, any recipe that transitively `needs` WSL (Docker Desktop and WSL distro shortcuts in the v1 catalog) shows the hint `installer.wslReboot` and its install button is disabled. The flag resets only when KKTerm is restarted — which is what happens during a real Windows reboot.

## Persistence

- **SQLite** — table `installer_tool_state(tool_id PK, pinned, latest_version_seen, last_check_at)` (schema version 17). Pinning and the cached latest available version survive restarts.
- **Windows Registry** — per-tool detection cache under `HKCU\Software\Ryan Tsai\KKTerm\InstallerDetectionCache`. This cache is local Windows state, not portable settings data.
- **Debug log** — debug builds write Installer Helper catalog, detection, latest-version, install, uninstall, cache, progress-event, and child-process output records to `installer.helper.debug.log` beside `kkterm.log`. Release builds write the same JSONL log only when `settings.advancedDebugging` is enabled. The same setting also enables `kkterm-heartbeat.debug.log` in release builds for frontend/native liveness timing while troubleshooting Installer Helper stalls.
- **In-memory only** — the active detection sweep, the in-flight install queue, the WSL reboot flag, and the per-tool log buffer.
- **On-disk install dirs** — `%LOCALAPPDATA%\KKTerm\installer\bin\<tool_id>\` holds installed `githubRelease`-provider tools and their `.kkterm-installer.json` marker file. `%LOCALAPPDATA%\KKTerm\installer\apps\<tool_id>\` holds managed server apps such as n8n and Ollama, plus their app-local marker and data folders. These are installed-tool state, not catalog cache.

## Catalog source

The catalog `installer/catalog.v1.json` is **embedded into the KKTerm binary at compile time** via `include_str!`. Updates to the catalog ship with the next KKTerm release — there is no network fetch, no on-disk cache, and no signature verification. The trust anchor is the app binary itself (eventually backed by Windows code-signing of the KKTerm installer).

Adding, editing, or removing a tool is a normal commit to `installer/catalog.v1.json` followed by a release. The `shipped_catalog_parses_and_validates` test embeds the same JSON via `include_str!` and runs `Catalog::validate()`, so malformed edits fail `cargo test` before they can ship.

See [`docs/ADR/0008-installer-helper-bundled-catalog.md`](../ADR/0008-installer-helper-bundled-catalog.md) for the design rationale and what it supersedes from [ADR 0007](../ADR/0007-installer-helper-remote-catalog.md).

## Tutorial

The Module is tutorial-capable in v1 via two targets:

- `app.activityRailInstaller` — the rail button (navigation: workspace).
- `installer.updateAll` — the header button (navigation: installer).
- `installer.toolOptions` — the per-row options form (navigation: installer).

## Limits

- AI Assistant integration is deferred. The AI does **not** have a Tauri command to trigger installs in v1.
- "Latest version" detection for multi-step `bundle`, `windowsFeature`, and `wslDistro` recipes returns null — the rows do not surface update suggestions. One-step bundles inherit latest-version checks from their child recipe.
- The UAC prompt count shown in confirm dialogs is a best-effort estimate; some installers (including Git for Windows, nvm-windows, Docker Desktop, and system MSIs) self-escalate even when `--scope user` is passed.
