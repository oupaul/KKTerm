# 02 — App Layout

## AI grep hints

- Keys: `app.primaryNav`, `app.connectionRail`, `app.connectedConnectionsRail`, `app.resizeConnections`, `app.resizeAiAssistant`, `app.openConnectedConnection`, `app.openPinnedConnection`, `app.dontSleepStatusEnabled`, `workspace.workspaceSurface`, `workspace.hostUsage`
- Topics: Activity Rail, panel resize, pinned Connections on the rail, Connections panel collapse, universal AI Assistant panel, universal host usage status bar, Don't Sleep Status Bar indicator, tutorial targets `app.activityRailWorkspace`, `app.activityRailDashboard`, `app.connectionRail`, `app.activityRailDontSleep`, `app.activityRailSettings`, `app.connectionsResize`, `app.aiAssistantResize`, `workspace.statusBar`, `workspace.hostUsage`
- Synonyms: "left bar", "sidebar", "right panel", "AI sidebar", "make panel wider", "hide the AI panel", "bottom bar", "coffee icon", "don't sleep indicator"

## Activity Rail (48 px, left edge)

Vertical icon bar. Owned by `src/app/`. Always visible. Sections, top to bottom:

1. **Built-in Modules** — Workspace, Dashboard, File Explorer, Wiki.
2. **Connection Rail** (`app.connectionRail`) — a divider group `app.connectedConnectionsRail` that shows:
   - Pinned Connections (kept across launches; pin from the Connection Tree right-click menu, `connections.pinToRail`).
   - Connections that currently have at least one live Session.
   Each icon's tooltip uses `app.openPinnedConnection` or `app.openConnectedConnection` with the Connection name interpolated as `{{name}}`.
3. **Settings** — anchored to the bottom of the rail.

The whole rail uses `app.primaryNav` as its accessible label. Tooltips come from `RailTooltip` (delayed hover/focus). Native `title` tooltips are forbidden here.

Tutorial targets: `app.activityRailWorkspace`, `app.activityRailDashboard`, `app.connectionRail`, `app.activityRailDontSleep`, `app.activityRailSettings`.

Non-Workspace pages (Dashboard, App Launcher, File Explorer, Settings, Wiki) stay inset from the 48 px rail so its hover tooltips keep working while those pages are active.

## Connections Panel (left, inside Workspace Module)

Resizable. Collapsed/expanded state persists across launches. See [03-connections.md](03-connections.md) for the tree itself.

- Collapse: `connections.collapseColumn`
- Resize handle: `app.resizeConnections`

Tutorial target: `app.connectionsResize`.

The panel only appears inside the Workspace Module. Switching to Dashboard, File Explorer, Wiki, or Settings replaces this region with that Module's own content.

## Workspace Canvas (centre)

The active Module owns this area. Each Module renders its own layout inside it. For the Workspace Module specifically, the Canvas contains the Tab Strip and active Tab content (terminal, SFTP, WebView, RDP, VNC, Pane splits). See [04-workspace-tabs-panes.md](04-workspace-tabs-panes.md).

Accessibility label: `workspace.workspaceSurface`. Per-Connection-kind labels use `workspace.connectionKind` with the kind interpolated.

## AI Assistant Panel (right)

Resizable, collapsible. State is app-wide — the same width and collapsed state apply across Workspace, Dashboard, Settings, and all Tabs.

- Title: `ai.title`
- Collapse: `ai.collapsePanel`
- Resize handle: `app.resizeAiAssistant`

Tutorial target: `app.aiAssistantResize`.

The panel remains available on Settings and receives a Settings page context so how-to answers can refer to the active Settings section. Panel internals are covered in [13-ai-assistant.md](13-ai-assistant.md).

## Status Bar (bottom)

Owned by `src/workspace/StatusBar.tsx`. Three roles:

1. **Host usage metrics** (left side, visible in every Module and page):
   - `workspace.cpu` / `workspace.cpuUsage`
   - `workspace.ram` / `workspace.ramUsage` / `workspace.memory`
   - `workspace.network` / `workspace.networkUsage`, broken into `workspace.networkDownstream` and `workspace.networkUpstream`
   General Settings → `settings.statusBar` can disable this monitor completely with `settings.statusBarMonitor`; when disabled, host usage polling stops instead of only hiding the metrics. `settings.statusBarMonitorInterval` controls the polling interval while enabled.
2. **Transient notifications** — driven by the shared `showStatusBarNotice` store action. Success messages default to 5 seconds, then fade. Do not implement one-off toast surfaces; route through `showStatusBarNotice`.
3. **Don't Sleep state** — when Don't Sleep mode is enabled, the right side shows a coffee icon with tooltip `app.dontSleepStatusEnabled`.

Tutorial targets: `workspace.statusBar`, `workspace.hostUsage`.

## Workspace chrome resize behaviour

Both side panels can be dragged to any width within their minimum/maximum. The drag divider shows a thin blue full-height indicator after the pointer rests on it briefly, using resize handles `app.resizeConnections` and `app.resizeAiAssistant`. Widths persist immediately to settings. There is no "reset layout" affordance inside the chrome itself; resetting layout is a Settings action (`settings.resetLayout`, see [15-settings.md](15-settings.md) §Appearance).
