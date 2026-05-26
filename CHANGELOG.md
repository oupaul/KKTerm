# Changelog

All notable changes to KKTerm are documented here.

## Highlights
- Dashboard: right-click menus should behave again when widgets overlap the canvas, and idle background animations now pause when the Dashboard isn’t actively visible (so your RTX workload can also take a nap).
- App Launcher: you can show file extensions via a new widget setting.
- RDP: Session display sync/disconnect handling was adjusted to avoid spurious “Remote desktop disconnected” states during resize/display sync.

## New
- App Launcher: added a **“Show file extensions”** setting, including the display logic (**@ryantsai** in **#159** — https://github.com/ryantsai/KKTerm/pull/159).

## Improved
- Dashboard: fixed widget right-click behavior so embedded Connection panes don’t eat right-click, and the widget frame menu actions remain reachable (**@ryantsai** in **#158** — https://github.com/ryantsai/KKTerm/pull/158).
- Dashboard: idle background animations now pause when the Dashboard is hidden, the window is minimized, or another app is in front, and resume without visual jumps.
- RDP Session: updated the resolution dropdown behavior to show **Automatic + fixed resolutions** (removed “Smart Sizing” and “DPI Zoom” from the dropdown), and normalized saved values so dead options don’t appear (**28c7b91**).

## Fixed
- Dashboard: fixed right-click and pause behavior for Dashboard background animations (**@ryantsai** in **#158** — https://github.com/ryantsai/KKTerm/pull/158).
- RDP: removed an “ActiveX reconnect fallback” during display sync failures that could turn a normal “resize not ready yet” into a disconnect state (**7752ccf**).
- RDP Tabs: tab auto-close behavior was moved toward event-driven Session disconnect handling (instead of the earlier polling/removed auto-close path) to prevent incorrect Tab closure timing (**8f932c2**, **ff17388**).

## Internal
- Docs & i18n alignment with the current Dashboard codebase (removed stale legacy widget/preset references; updated manuals and locale keys) (**@ryantsai** in **#157** — https://github.com/ryantsai/KKTerm/pull/157).
- RDP resolution options regression test added (**28c7b91**) and updated tests to validate event-driven Tab auto-close behavior (**8f932c2**).
- Terminal context menu rendering: routed through a portal so it escapes Dashboard widget transforms/overflow constraints (**be72504**).

## Highlights
- Quick Connect: embedded **elevated local terminals** are now available (because Windows UAC occasionally needs to be reminded who’s boss).
- Quick Command Bar: introduces a **Quick Command Library** with **tmux scroll handling** for faster command workflows.
- Dashboard: fixes the **tab color picker**.
- Localization: translates multiple UI areas (watchdog, settings, dashboard, and Quick Command UI) across **all 13 locales**.

## New
- Embed elevated **Quick Connect local terminals** for convenience when you need admin-level sessions. (codex, by @ryantsai in [#152](https://github.com/ryantsai/KKTerm/pull/152), [c0ccc9b])
- Quick Command Bar library + tmux scroll handling. (codex, by @ryantsai in [#155](https://github.com/ryantsai/KKTerm/pull/155), [8b7b48f])

## Improved
- Dashboard **tab color picker** fix for the right shade on the right Tab. (codex, by @ryantsai in [#154](https://github.com/ryantsai/KKTerm/pull/154), [0ad9f3f])
- Localization updates: translate watchdog, ai.watchdogApproval, settings, dashboard, and quickCommands UI strings across **all 13 locales**. (by @ryantsai in [#156](https://github.com/ryantsai/KKTerm/pull/156), [9ac23df])
- Remove wiki module and update settings export. (codex, by @ryantsai in [#153](https://github.com/ryantsai/KKTerm/pull/153), [86610f7])

## Fixed
- Fixed dashboard tab color picker. (by @ryantsai in [#154](https://github.com/ryantsai/KKTerm/pull/154), [0ad9f3f])

## Internal
- Quick Command Bar library implementation and documentation updates. (by @ryantsai in [#155](https://github.com/ryantsai/KKTerm/pull/155), [72b8f94], [tests/quick-command-library-taxonomy.test.mjs])
- Localization work includes translated Quick Command Library strings and completed localization_todo closures. (by @ryantsai, [01b64a3], [8af5ec1], [9ac23df])

## Highlights
- Workspace Tabs: double-click a Tab title for inline rename (Enter/blur saves, Escape cancels) and middle-click a Tab to close it. (If your fingers are fast, your Tabs will be, too.)

## New
- Implemented the Workspace Tab feature, including per-Tab `displayTitle` state so renaming a Tab doesn’t rename the underlying **Connection**.

## Improved
- Double-clicking a Tab title now opens inline rename; Enter/blur commits changes and Escape cancels.

## Fixed
- Renaming a Tab no longer affects the underlying **Connection** title.

## Internal
- Updated workspace manual and styling/i18n for Workspace Tabs (`workspace.css`, `04-workspace-tabs-panes.md`, and all locale files).

## Highlights
- Smarter Codex usage fallback for AI coding guidance: when the preferred refresh path doesn’t work, KKTerm can pull `/wham/usage` data from your local Codex auth (where available).
- Prevents “missing window” surprises on Windows: if the main window is restored off-screen, KKTerm relocates it so you can get back to your Tabs and Panes without the hunt.

## New
- Added a Codex `/wham/usage` fallback path for AI coding usage normalization (uses `~/.codex/auth.json` or `CODEX_HOME/auth.json`, with HTTPS/local-only filtering where applicable).  
  - Preserves the full `/wham/usage` payload as raw provider JSON when this fallback path is used (so quota/limit details remain available for future explicit UI expansion).

## Improved
- Improved Windows window restore behavior: KKTerm now detects when the main window rect doesn’t overlap the Windows virtual desktop and moves/resizes the window to `0,0` at `1440x940`.  
  - Runs during startup restore, tray restore, and second-instance focus.

## Fixed
- Removed the SSH/local Terminal Codex/Claude Code detection path entirely (and its UI/badge wiring), including:  
  - Deleted `agentDetection.ts` and its associated detection test wiring  
  - Removed terminal agent badge CSS/locale key and updated the terminal manual to stop documenting the badge  
  - Added a guard test (`no-terminal-agent-detection.test.mjs`) to prevent the detection file/wiring from creeping back in

- Installer smoke test cleanup: during normal cleanup it now removes `HKCU\Software\Ryan Tsai\KKTerm` in `scripts/smoke-installer.ps1`, while skipping this deletion when `-KeepInstall` is used—matching the existing “keep cleanup artifacts” behavior. (Yes, your registry should be clean—unless you asked it not to be.)

## Internal
- None

## Highlights
- **AI watchdog:** Structured monitors with intervention and a status-bar UI—no more silent “prompt prefix that fell through to chat.” (rebased from #120) ([#140](https://github.com/ryantsai/KKTerm/pull/140), @ryantsai) *(ab10c8b / 1935910)*
- **Dashboard widget scaffolds:** New **widget archetype** scaffolding to help set up Dashboard Widget Instance foundations for **[codex]** workflows. ([#147](https://github.com/ryantsai/KKTerm/pull/147), @ryantsai) *(5b0b6e8 / 5eaad64)*

## New
- **[codex] Widget archetype scaffolds** for Dashboard Widgets (templates/scaffolds). ([#147](https://github.com/ryantsai/KKTerm/pull/147), @ryantsai) *(5b0b6e8 / 5eaad64)*
- **AI watchdog monitors with intervention** (structured monitor/actor runtime + status-bar UI). ([#140](https://github.com/ryantsai/KKTerm/pull/140), @ryantsai) *(1935910)*

## Improved
- **Terminal external links:** Shift-click an `http/https` link in **any terminal Pane** and it opens in your OS default browser. This applies across local, SSH, Telnet, and Serial terminal Sessions (shared xterm renderer). *(af9767c)*
- **Script-widget timing hardening:** Script-widget `rAF` now honors `body.lifecycle.minTickMs`, clamped with a safe lower bound; widgets without a declared cadence keep the existing default. *(ab10c8b)*

## Fixed
- **Watchdog trigger refiring** issues addressed so interventions don’t keep waking up like a misconfigured alert daemon. *(16de505)*
- **(Support change) Widget callable-library surface guidance:** Mermaid is no longer advertised/auto-inferred in the AI “Created Widget” callable library surface; related validator/schema + prompt guidance + tests updated accordingly. *(55b526a)*

## Internal
- **Removed public promotion log** from `docs/PROMOTION.md`. *(d99a366)*
- **Promotion-related docs updates** (OpenSourceAlternative, outreach email, Tauri, landing pages, feedback kit, etc.). *(2113b98, 6e9835e, 02228f8, bd61780, c6d0404, 5ca106a, e363c13, 75d8323, 5036e49, a128ba2, a6df7a7)*  
- **Version bump / lockfile updates**. *(7949922)*

## Highlights

- No user-facing highlights were provided for this release. (Your terminal is still waiting for something exciting.)

## Internal

- Updated Cargo lockfiles (`.env.example`, `src-tauri/Cargo.lock`) as part of the v0.1.34 release.  
  - Commit: `e2f856e` — “updated cargo lock”

## Highlights
- Dashboard Connection widget Session/Tab/Pane creation now resolves tmux IDs in an effect (reducing render-time churn and avoiding brief ID reuse when switching Connections).  
- System tray/assistant “external-open” events now switch the app shell to the Workspace Module before opening/focusing the target Connection.

## New
- Added comments to `.env.example` (because even terminals like a little guidance).

## Improved
- Dashboard Connection widget: resolve tmux id in an effect using the reuse-first helper, then create the Tab/Pane from that id (instead of calling `appendTmuxSessionId()` during render). Also keyed by `connection.id` to avoid momentary reuse while switching widget Connections.  
  - PRs/changes include `tests/dashboard-connection-widget-tmux.test.mjs`, `src/modules/dashboard/widgets/builtin/connections/ConnectionWidget.tsx`, and `docs/manual/10-dashboard.md` (via the same update set as https://github.com/ryantsai/KKTerm/pull/139).
- System tray behavior note updated in the manual to match the updated external-open flow.  
  - Updated: `docs/manual/01-getting-started.md`

## Fixed
- Docs consistency updates:
  - Marked File Explorer as **planned** in architecture diagrams.
  - Corrected Dashboard animated canvas background count from 9 to 21 across all README locales (full list included in the PR).
  - Fixed contributing guide widget path from `src/dashboard/widgets/` to `src/modules/dashboard/widgets/builtin/`.
  - Replaced non-existent `mist` background reference with `ocean` in all locales.
- Updated tray/assistant external-open events so the app shell switches to the Workspace Module before opening or focusing the Connection (instead of racing ahead of the module switch).
  - Updated: `src/App.tsx`, `src/modules/workspace/connections/ConnectionSidebar.tsx`

## Internal
- Docs maintenance: pruned/reorganized `AGENTS.md` into a smaller “routing + guardrails” doc and moved the durable architectural/source-of-truth burden back to `CONTEXT.md`, `docs/ARCHITECTURE.md`, product docs, and manual docs.
- Docs/readme updates across all languages reflecting current codebase state (PR #139 by @ryantsai): https://github.com/ryantsai/KKTerm/pull/139

## Highlights
- App Launcher drop target now covers the full Dashboard Widget Instance body (no more “your file is hovering, but not landing”).
- URL Pane is contained to its nearest host panel (Dashboard Connection widget, embedded split Pane, or Workspace Canvas)—so it can’t spill into adjacent panes/panels.
- Custom titlebar work continues: the titlebar appearance is now theme-integrated and better aligned, with a fix to custom titlebar chrome.

## New
- **Built-in MCP server (kkterm-cli)** is now wired end-to-end and expanded (21 tools), with **Module** terminology defined. PR #135 by @ryantsai (see PR #135).
- AI Coding Usage documentation added for the **AI Coding Usage widget** and the built-in MCP server; **aider** mentions dropped. PR #137 by @ryantsai (see PR #137).

## Improved
- App Launcher icon grid row spacing adjusted so extra widget height doesn’t stretch the row tracks. (PR #132? see: “Make App Launcher drop target…” and “fixed the row spacing too.”)
- Terminal-pane containment fix for URL Pane rendering updated to document contained URL Pane behavior. (PR #136? see WebViewWorkspace containment fix details in commits; PR #136 is the src/ restructure, and the containment change is in the PR with SHA 71d9be9.)

## Fixed
- Fixed **custom titlebar chrome**. PR #134 by @ryantsai.
- Fixed **titlebar button position**. (Test referenced: `tests/titlebar-theme.test.mjs`.)
- Fixed **App Launcher drop target** to cover the full widget body. PR #132 by @ryantsai.
- Fixed **URL Pane containment** by clamping WebView2 native bounds to the nearest host panel/pane/canvas and adjusting URL webview layout behavior. (Regression coverage added via `tests/webview-toolbar-layout.test.mjs`.)
- Fixed **MCP tool input/Enter handling** for terminal sessions by mapping submit behavior to use carriage return (`\r`) with the expected “pressEnter” semantics. PR #? (commit SHA `6a9eabe`).
- Fixed **MCP config dialog** UI/behavior details (close button placement, config snippet path resolution, and opening real user config file). PR #? (commit SHA `1bd8d96`).

## Internal
- Restructured `src/` to mirror **Module** domain language. PR #136 by @ryantsai.
- Added/reworked built-in MCP server/config documentation and logging improvements (including debug JSONL logging to `mcp.debug.log`).
- Release-engineering script hardening and resilience (e.g., tolerate missing GitHub release), plus updated release tooling.
- Rendered the committed `demo.gif` in all READMEs to remove placeholder imagery. PR #138 by @ryantsai.
