# Changelog

All notable changes to KKTerm are documented here.

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
