# 18 — Installer Helper

## AI grep hints

- Keys: `installer.title`, `installer.subtitle`, `installer.railLabel`, `installer.refresh`, `installer.lastChecked`, `installer.checkingDots`, `installer.updateAll`, `installer.section.installed`, `installer.section.available`, `installer.section.updates`, `installer.section.essentials`, `installer.section.aiAgents`, `installer.section.aiPlatforms`, `installer.section.development`, `installer.section.utilities`, `installer.tile.latest`, `installer.tile.installed`, `installer.actions.install`, `installer.actions.update`, `installer.actions.uninstall`, `installer.actions.cancel`, `installer.options.scope`, `installer.options.version`, `installer.options.location`, `installer.options.addToPath`, `installer.options.pinVersion`, `installer.status.installing`, `installer.status.uninstalling`, `installer.status.completed`, `installer.status.failed`, `installer.status.cancelled`, `installer.status.partial`, `installer.status.noVersion`, `installer.status.notInstalled`, `installer.status.neverChecked`, `installer.status.scanning`, `installer.empty.loading`, `installer.confirm.installTitle`, `installer.confirm.installWithPrereqsBody`, `installer.confirm.uacFooter`, `installer.confirm.uninstallTitle`, `installer.confirm.uninstallSimpleBody`, `installer.confirm.uninstallDependentsBody`, `installer.confirm.uninstallDependentsFooter`, `installer.confirm.updateAllTitle`, `installer.confirm.updateAllBody`, `installer.confirm.updateAllConfirm`, `installer.wslReboot`, `installer.dialog.installLocation`, `installer.dialog.provider`, `installer.dialog.installedVersion`, `installer.dialog.latestVersion`, `installer.dialog.lastChecked`, `installer.dialog.homepage`, `installer.dialog.releaseNotes`, `installer.dialog.prerequisites`, `installer.dialog.prereqInstalled`, `installer.dialog.prereqMissing`, `installer.dialog.checkNow`, `installer.dialog.checkingDots`, `installer.dialog.updateAvailable`, `installer.dialog.installingTitle`, `installer.dialog.uninstallingTitle`, `installer.dialog.installedTitle`, `installer.dialog.failedTitle`, `installer.dialog.cancelledTitle`, `installer.stepper.failedBadge`, `installer.steps.resolve`, `installer.steps.download`, `installer.steps.verifyChecksum`, `installer.steps.extract`, `installer.steps.placeFiles`, `installer.steps.updatePath`, `installer.steps.install`, `installer.steps.verify`, `installer.steps.enable`
- Topics: Installer Helper Module, bundled catalog (compile-time embedded), ADR 0008 supersedes ADR 0007, winget recipes, npm recipes, github-release recipes, Windows feature recipes (DISM), bundles (node-bundle, python-bundle), dependency resolution, UAC prompts, WSL reboot gating, pin version, in-flight cancellation, tutorial targets `app.activityRailInstaller`, `installer.updateAll`, `installer.toolOptions`
- Synonyms: "install nvm", "install Node", "install Python", "install Docker", "install Claude Code", "set up dev tools", "developer tools installer", "package manager"

## What it is

The **Installer Helper Module** is a built-in Activity Rail destination that installs, updates, and uninstalls a curated catalog of Windows AI tool stacks — git, node, python, docker, AI coding CLIs, local AI platforms, and supporting utilities. It is grouped with the other built-in Module buttons near the top of the rail, with its own icon (`Package`).

The catalog **ships with the KKTerm release**: the JSON list of supported tools is compiled into the binary at build time. Updates to the catalog ride with each release. See `docs/ADR/0008-installer-helper-bundled-catalog.md` for the rationale and what it supersedes.

## Module layout

The page has a header and categorized sections:

- **Header.** Title (`installer.title`), subtitle (`installer.subtitle`), a page-level last checked status (`installer.lastChecked`), and two buttons:
  - `installer.refresh` — re-runs detection for every catalog tool, then queries the latest available version for every detected installed tool and caches the result.
  - `installer.updateAll` — installs every available update sequentially. Tutorial target: `installer.updateAll`.
- **Updates available** (`installer.section.updates`) — installed tools whose cached latest version differs from the detected installed version.
- **Essentials** (`installer.section.essentials`) — recommended Windows setup patterns for Node, Python, and Git. The visible Node entry installs nvm-windows only; the visible Python entry installs uv only. Power users who want direct Node.js or CPython installer packages can install those outside Installer Helper.
- **AI Agents** (`installer.section.aiAgents`) — coding-agent CLIs such as Claude Code CLI, Codex CLI, Gemini CLI, and OpenClaw.
- **AI Platforms** (`installer.section.aiPlatforms`) — local or self-hosted AI platforms such as Ollama and n8n.
- **Development** (`installer.section.development`) — editors, containers, API tools, and WSL.
- **Utilities** (`installer.section.utilities`) — Notepad++, ripgrep, jq, and fzf.

Each tool surface is a **tile** in the section grid. Installed tools show an `installer.section.installed` badge. Tile version metadata is shown on separate `installer.tile.latest` and `installer.tile.installed` rows, rather than as provider kind text. The page-level header status carries the most recent check time. One-step recommended bundles inherit latest/detected version metadata from their child recipe. The tile action button switches between `installer.actions.install` and `installer.actions.uninstall` based on detected install state, and opens the app-owned popup dialog — `InstallerToolDialog` — that owns the detail surface (the previous inline expansion has been removed). Tutorial target on the options form inside the dialog: `installer.toolOptions`.

The dialog has three rendering modes:

- **Installed info** — version, install location (when known), provider summary, latest version + last checked timestamp, pin-version checkbox, and an Update banner when `latestVersionSeen` differs from `installedVersion`. Footer: `Uninstall` (danger) · `Update` (when available) · `Close`.
- **Not-installed info** — official website (`recipe.homepage`), release notes (`recipe.releaseNotesUrl`, with a provider-derived fallback for github/npm/winget when absent), latest version (with an inline `installer.dialog.checkNow` action when no latest has been queried yet), provider summary, prerequisites list with installed/missing badges, and the options form. Footer: `Install` (primary) · `Cancel`.
- **Stepper** — opened when the user presses Install/Update, or when reopening the dialog while an install/uninstall is in flight or has just terminated. The body renders the n8n-style step list with status dots (`pending`/`running`/`done`/`failed`), per-step duration / active-step ratio, and a click-to-expand per-step log panel. Terminal states swap the dialog title (`installer.dialog.installedTitle` / `installer.dialog.failedTitle` / `installer.dialog.cancelledTitle`).

## Tool detection

Detection renders in two phases on Module entry. First, KKTerm loads the local Windows Registry detection cache from `HKCU\Software\Ryan Tsai\KKTerm\InstallerDetectionCache` and paints any remembered states immediately. Then the backend starts a bounded streaming revalidation sweep in the background. Each completed tool emits a `detectResult` event over `installer://progress`, updates the tile, and writes the fresh state back to the registry cache. `installer.refresh` re-runs detection on demand, then queries latest versions for every detected installed tool.

Per-provider detection methods:

- **winget** — detection reads a local Add/Remove Programs registry snapshot once per fresh detection sweep and matches catalog aliases (`registryKeys`, `displayNames`, `displayNamePrefixes`) so existing installs can be recognized even when winget would report an `ARP\...` identifier. The snapshot is cached in memory until the next explicit detection call. Fresh results are persisted to the Installer Helper registry cache. Latest-version checks still call winget and use `CREATE_NO_WINDOW` so no `cmd.exe` window flashes on Module entry.
- **npm** — `npm ls -g --json --depth=0`. Looks up the package in the top-level `dependencies`.
- **github-release** — a marker file at `%LOCALAPPDATA%\KKTerm\installer\bin\<tool_id>\.kkterm-installer.json` written at install time. Only installs we performed count as "managed".
- **windows-feature** — `dism /online /get-featureinfo /featurename:<X>`. Parses the `State :` line.
- **bundle** — installed iff every step's detection is installed; otherwise the row shows `installer.status.partial` with an `installed/total` count. One-step bundles inherit the child version.

## Install flow

1. The user clicks `installer.actions.install` on a row.
2. The frontend resolves the install plan: transitive `needs` are walked, and prerequisites already detected as installed are skipped.
3. If the plan has unresolved prerequisites OR a non-zero UAC-prompt estimate, a confirm dialog (`installer.confirm.installTitle`) lists the prerequisites and a footer (`installer.confirm.uacFooter`) names the estimated prompt count.
4. On confirm, the backend dispatches the install in a worker thread. The dialog flips to stepper mode. Progress streams to the frontend on the `installer://progress` Tauri event channel as a discriminated union: `plan` (declared step list, emitted once before any work begins), `stepStarted` / `stepFinished` (per-step lifecycle), `stdout` / `stderr` / `progress` (each carrying an optional `stepId` so the UI can route lines and ratios to the active step row), `step` (legacy free-form label retained for unmigrated providers), `completed`, `failed`, `cancelled`.
5. After a `completed` event, the row re-runs detection automatically and moves to the Installed section.

## Update flow

1. The user clicks `installer.refresh` (header), or `installer.dialog.checkNow` for one tool inside the detail dialog.
2. The backend launches a **streaming** sweep. It emits `checkStarted` with the id list, then per-tool `checkResult` events as each lookup lands (latest-version queries run in parallel — `winget show`, `npm view <pkg> version`, GitHub releases API — bounded to a small pool to hide slow legs behind fast ones), and finally `checkFinished`. The frontend writes each result into `toolState` as it arrives so rows light up incrementally instead of after one large blocking await. Results are persisted in the `installer_tool_state` SQLite table.
3. Rows whose `latestVersionSeen ≠ installedVersion` move to the Updates section and show their per-row `installer.actions.update` button.
4. Clicking `installer.updateAll` lists every pending update in a dialog (`installer.confirm.updateAllTitle`), warns about the likely UAC prompt count, and on confirm runs the queue sequentially. Pinned tools (see Pin version below) are skipped.

A real-time background check is opt-in only — not in v1.

## Uninstall flow

1. The user clicks `installer.actions.uninstall` on an installed row.
2. The frontend runs a reverse-dependency check: every catalog recipe whose `needs` includes this row's id AND whose detection says installed is collected.
3. If dependents exist, the confirm dialog (`installer.confirm.uninstallTitle`) lists them with the warning `installer.confirm.uninstallDependentsBody` and the footer `installer.confirm.uninstallDependentsFooter`. Otherwise the dialog shows the simple body `installer.confirm.uninstallSimpleBody`.
4. On confirm, the backend dispatches per-provider uninstall: `winget uninstall`, `npm uninstall -g`, `Remove-Item -Recurse` on the github-release install directory, `dism /online /disable-feature`.

There is intentionally no "Uninstall all" action.

## Cancellation

Per row, an in-flight install/uninstall surfaces an `installer.actions.cancel` button. Cancel raises an `AtomicBool` flag the worker thread polls; on the next check it kills the child process and emits `cancelled`. Partial installs are **not rolled back** — the underlying installer's transactionality is what it is.

For "Update all", cancel stops the **queue** (the next-up tools), not the in-flight install.

## Options

Each recipe declares a subset of these options (the set is closed):

- **`installer.options.scope`** — `user` (default) vs `machine`. Winget recipes only. Machine-scope always triggers UAC.
- **`installer.options.version`** — specific version string, or empty = `installer.options.versionLatest`.
- **`installer.options.location`** — install location override. Winget: `--location`. github-release: extraction directory.
- **`installer.options.addToPath`** — github-release recipes only. Appends the install directory to user PATH via PowerShell after extraction.
- **`installer.options.pinVersion`** — row-level checkbox. When checked, this tool is **excluded** from `installer.updateAll`. Pinning does not prevent a per-row update click.

## WSL reboot gating

When the user installs the WSL Windows feature in the current app session, the Installer Helper sets a session-only flag `wslJustEnabled`. While that flag is set, any recipe that transitively `needs` WSL (Docker Desktop in the v1 catalog) shows the hint `installer.wslReboot` and its install button is disabled. The flag resets only when KKTerm is restarted — which is what happens during a real Windows reboot.

## Persistence

- **SQLite** — table `installer_tool_state(tool_id PK, pinned, latest_version_seen, last_check_at)` (schema version 17). Pinning and the cached latest available version survive restarts.
- **Windows Registry** — per-tool detection cache under `HKCU\Software\Ryan Tsai\KKTerm\InstallerDetectionCache`. This cache is local Windows state, not portable settings data.
- **In-memory only** — the active detection sweep, the in-flight install queue, the WSL reboot flag, and the per-tool log buffer.
- **On-disk install dirs** — `%LOCALAPPDATA%\KKTerm\installer\bin\<tool_id>\` holds installed `githubRelease`-provider tools and their `.kkterm-installer.json` marker file. These are installed-tool state, not catalog cache.

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
- "Latest version" detection for multi-step `bundle` and `windowsFeature` recipes returns null — the rows do not surface update suggestions. One-step bundles inherit latest-version checks from their child recipe.
- The UAC prompt count shown in confirm dialogs is a best-effort estimate; some installers (Docker Desktop, system MSIs) self-escalate even when `--scope user` is passed.
