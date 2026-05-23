# 10 — Dashboard

## AI grep hints

- Keys: `dashboard.*` (full namespace)
- Topics: Dashboard Views, Widget Instances, cached Views, instant View switching, embedded Connection pane, embedded SSH terminal, embedded tmux toolbar, hidden embedded SFTP shortcut, presets (panel / ambient / tile / hero / action), accents, icons, backgrounds, density, edit layout, empty-canvas context menu, catalog, custom script widgets, AI-authored widgets, widget design preflight, agent widget JSON, UTF-8 widget source, non-English widget text, widget visual context, compact AI context, duplicate widget detection, AI coding usage, Codex usage, Claude Code usage, adding AI coding tools, removing AI coding tools, reconnecting AI coding usage, missing CLI binaries, five-hour limit, weekly limit, quota, rate limits
- Synonyms: "homepage", "tiles", "cards", "widgets", "right click dashboard", "context menu", "shortcut menu", "report", "view reload", "connection widget reload", "connection pane tmux", "connection widget tmux", "embedded terminal tmux", "hide SFTP in widget", "switch views", "background image", "wallpaper", "translucent widget", "see-through widget", "canvas opacity", "low contrast widget", "hard to read widget", "garbled widget text", "mojibake", "encoding", "UTF8", "UTF-8", "Codex quota", "Claude quota", "5h usage", "7d usage", "AI coding meter", "add Codex", "add Claude Code", "remove Codex", "remove Claude Code", "reconnect Claude Code", "refresh Claude Code auth", "install Codex", "install Claude Code", "program not found"

> **Terms:** see `CONTEXT.md`. **Dashboard View** is a durable SQLite-backed tab; **Widget Instance** is a placed widget on a View with its own preset/accent/title/layout. **Dashboard Custom Widget** is an AI-authored script-widget definition. Architecture details live in `docs/DASHBOARD.md`.

## Module entry

Activity Rail icon → label `dashboard.moduleLabel`. Page header uses `dashboard.title`, optional `dashboard.subtitle`, status `dashboard.statusReady`.

## Views

A View is a Dashboard tab. The first View is named `dashboard.defaultView` and seeded on first run with one App Launcher Widget Instance.

- Switcher label: `dashboard.viewsLabel`.
- Add: `dashboard.addView`. New-View dialog `dashboard.newViewPrompt`, field `dashboard.newViewName`.
- Rename: `dashboard.renameView`.
- Remove: `dashboard.removeView`. Confirmation body `dashboard.deleteViewBody`.
- Tab gradient styling: `dashboard.viewTabGradient`, clear `dashboard.clearViewTabGradient`.

Each View has its own `grid_density` (`dashboard.density.compact`, `dashboard.density.default`, `dashboard.density.roomy`) and its own background.
Previously opened Views remain mounted while hidden so switching between View tabs preserves Widget Instance state and keeps embedded Connection panes responsive; hidden Connection panes are marked inactive instead of being closed.

## Edit layout mode

`dashboard.editLayout` toggles drag/drop + resize on the 12-column grid. Done editing: `dashboard.editDone`. Empty Views show `dashboard.emptyTitle` and `dashboard.emptyHint`.
Right-clicking empty Dashboard View canvas space opens a shortcut menu for `dashboard.addWidgetLabel`, `dashboard.editLayout`, and `dashboard.changeBackground`.

While editing:

- Drag a Widget Instance to move it.
- Drag the bottom-right corner to resize. Widgets snap to grid cells.
- `dashboard.addWidget` / `dashboard.addWidgetLabel` opens the **Widget Catalog**.

## Widget Catalog

A picker over built-in widgets and AI-authored Custom Widgets.

- Title: `dashboard.catalogTitle`, summary `dashboard.catalog`, `dashboard.widgetCount`.
- Search: `dashboard.catalogSearch`. Empty: `dashboard.catalogNoMatches`.
- Group labels: `dashboard.catalogGroupBuiltIn`, `dashboard.catalogGroupCustom`.
- Category filter: `dashboard.categoriesLabel`, all-category `dashboard.categoryAll`, plus `dashboard.categories.hash`, `dashboard.categories.network`, `dashboard.categories.quick`, `dashboard.categories.report`.
- Already-placed indicator: `dashboard.widgetAlreadySelected`.
- Playground area: `dashboard.playground`, hint `dashboard.playgroundHint`.

## Customize popover (per Widget Instance)

Opened from a Widget Instance's right-click or properties affordance (`dashboard.properties` / `dashboard.customize`). Implemented as an app-owned popover with a dismiss layer.

Sections:

- `dashboard.customizeSectionCommon` — preset, accent, icon, title.
- `dashboard.customizeSectionWidget` — `dashboard.widgetSettings`. Empty: `dashboard.widgetSettingsEmpty`. Invalid: `dashboard.widgetSettingsInvalid`.

Fields:

- **Preset**: `dashboard.presetLabel`. Options: `dashboard.preset.panel`, `dashboard.preset.ambient`, `dashboard.preset.tile`, `dashboard.preset.hero`, `dashboard.preset.action`. Ambient hides the title bar by default; `dashboard.hideTitle` is also offered for other presets. Action preset adds an `dashboard.actionDirection` axis with `dashboard.actionDirectionOptions.vertical` / `dashboard.actionDirectionOptions.horizontal`.
- **Glass background**: `dashboard.glassBackground`.
- **Canvas opacity**: `dashboard.canvasOpacity` — slider (0-100) that fades the Widget Instance body area only, leaving the title bar fully opaque. Default 70% for the built-in App Launcher and Connection widgets, 100% otherwise; visual effect is applied on the panel preset's `.dw-body`.
- **Accent**: `dashboard.accent`, default `dashboard.accentDefault`.
- **Icon**: `dashboard.icon`.
- **Title**: `dashboard.titleLabel`, placeholder `dashboard.titlePlaceholder`. Untitled widgets show `dashboard.untitledWidget`.
- **Advanced**: `dashboard.advanced`.

Presets are CSS wrappers that read the Instance's `--w-accent` / `--w-accent-soft` variables — presets do not encode their own palette.

## View background

`dashboard.changeBackground` opens the background picker. Modes:

- `dashboard.backgroundModeDefault` (`dashboard.backgroundDefaultHint`)
- `dashboard.backgroundModePreset` — colour/gradient presets `dashboard.backgroundPresets.*` (mist, sand, sage, sky, blush, lavender, slate, graphite, midnight, pine, aubergine, ember, harbor, moss, wine, steel, plus gradients gDawn / gFog / gMeadow / gDusk / gLinen / gHorizon / gPetal / gTwilight / gMidnight / gHarbor / gEmber / gOrchid / gForest / gEclipse / gCobalt / gNocturne).
- `dashboard.backgroundModeImage` — choose image via `dashboard.backgroundChooseImage`. Remove with `dashboard.backgroundRemoveImage`. File filter `dashboard.backgroundImageFilter`. Hint `dashboard.backgroundImageHint`. Fit options under `dashboard.backgroundFitLabel`: `fill`, `fit`, `stretch`, `tile`, `center`. Dim slider: `dashboard.backgroundDimLabel`.
- `dashboard.backgroundModeMedia` — video / animated source. Filter `dashboard.backgroundMediaFilter`. Hint `dashboard.backgroundMediaHint`. Source attribution `dashboard.backgroundMediaSourcePrefix` + link `dashboard.backgroundMediaSourceLink`.
- `dashboard.backgroundModeDynamic` (`dashboard.backgroundDynamicHint`) — script-rendered animated backgrounds: `aurora`, `clouds`, `ocean`, `raindrops`, `snow`, `sakura`, `fireflies`, `bubbles`, `ricefield`, `lanterns`, `starfield`, `nebula`, `embers`, `lava`, `matrix`, `topo`, `synthwave`, `cyberpunk`, `taipei101`, `thunderstorm`, `confetti` (keys under `dashboard.dynamicBackgrounds.*`).

## Built-in widgets

Each built-in widget lives in `src/dashboard/widgets/`. Common ones:

- **Notes** — sticky-note style. Title `dashboard.notesTitle`, summary `dashboard.notesSummary`, placeholder `dashboard.notesPlaceholder`. Toolbar label `dashboard.notesToolbarLabel`. Background colour `dashboard.notesBackgroundColor` (`yellow`, `pink`, `blue`, `green`, `orange`, `purple`, `white`). Font picker `dashboard.notesFont` (`handwriting`, `marker`, `system`, `serif`, `mono`).
- **AI Coding Usage** — `dashboard.aiCodingUsageTitle` / `dashboard.aiCodingUsageSummary`. Starts empty with `dashboard.aiCodingUsageEmptyTitle` / `dashboard.aiCodingUsageEmptyHint`; use `dashboard.aiCodingUsageAddTool` to add Codex or Claude Code to that widget instance. Provider labels use `dashboard.aiCodingUsageProvider.codex` and `dashboard.aiCodingUsageProvider.claudeCode`; the provider row product names use `dashboard.aiCodingUsageProviderProduct.codex` and `dashboard.aiCodingUsageProviderProduct.claudeCode` before the subscription badge. Disconnected providers show `dashboard.aiCodingUsageNotConnected`, `dashboard.aiCodingUsageProviderHint`, and `dashboard.aiCodingUsageConnectProvider`; remove a provider from the widget with `dashboard.aiCodingUsageRemoveProvider`, which is only shown while Dashboard edit mode is enabled. If the CLI binary is missing, the provider row shows `dashboard.aiCodingUsageInstallHelp`. Connected providers show `dashboard.aiCodingUsageFiveHour`, `dashboard.aiCodingUsageWeekly`, `dashboard.aiCodingUsagePercent`, reset text `dashboard.aiCodingUsageResetsAt` / `dashboard.aiCodingUsageResetUnknown`, and refresh metadata `dashboard.aiCodingUsageLastRefresh` / `dashboard.aiCodingUsageNeverRefreshed`; last-refresh metadata displays the refresh time only. Automatic refresh is shared by the widget and status bar, refreshes in the background at app launch when the last provider refresh is more than 5 minutes old, keeps the last successful snapshot visible, and backs off Claude Code usage polling after HTTP 429 rate-limit responses before trying the endpoint again. The status bar display loads Dashboard widget settings at app launch, shows the reset countdown only when the five-hour meter is in warning or danger state, and opens the Dashboard view hosting that widget when clicked. The widget refresh action is `dashboard.aiCodingUsageRefreshNow`; provider refresh/re-auth action is `dashboard.aiCodingUsageReconnectProvider`. Errors use `dashboard.aiCodingUsageProviderError` and `dashboard.aiCodingUsageRefreshError`.
- **URL Viewer** — `dashboard.urlViewerTitle` / `dashboard.urlViewerSummary`. Settings: `dashboard.urlWidgetUrl`, `dashboard.urlWidgetReloadSeconds`. Empty state: `dashboard.urlWidgetEmptyTitle` / `dashboard.urlWidgetEmptyHint`.
- **Connection** — `dashboard.connectionPaneTitle` / `dashboard.connectionPaneSummary`. Adds one or more Connections through the built-in launcher (`common.add`, `common.search`). Errors: `dashboard.connectionWidgetLoadError`; no match: `dashboard.connectionWidgetNoResults`. Remove `dashboard.connectionWidgetRemove`. Embedded SSH terminals show tmux management through `terminal.showTmux` / `terminal.tmuxSessions` when the Connection uses tmux, but the SFTP shortcut (`terminal.openSftp` / `terminal.sftp`) is hidden inside the widget because the widget is already an embedded surface. The widget looks up the live Connection by id from the raw tree, never from `withLiveConnectionStatuses`, to avoid Session mount/unmount loops. Switching Dashboard Views hides inactive embedded panes without remounting the View, so returning to a View should feel instant.
- **Hash** — `dashboard.hashTitle`, sample `dashboard.hashSample`, input `dashboard.hashInput`. Outputs `dashboard.characters`, `dashboard.bytes`, `dashboard.sha1`, `dashboard.sha256`. Runtime-missing state: `dashboard.hashUnavailable`.
- **Subnet (CIDR) calculator** — `dashboard.subnetTitle`, sample `dashboard.subnetSample`, input `dashboard.subnetInput` (a `cidrInput`-style box `dashboard.cidrInput`). Outputs: `dashboard.networkAddress`, `dashboard.broadcastAddress`, `dashboard.firstUsable`, `dashboard.lastUsable`, `dashboard.subnetMask`, `dashboard.wildcardMask`, `dashboard.totalAddresses`, `dashboard.usableHosts`. Errors: `dashboard.subnetError.invalidFormat`, `…invalidAddress`, `…invalidPrefix`, or generic `dashboard.subnetInvalid`. Compact labels `dashboard.network`, `dashboard.broadcast`, `dashboard.mask`, `dashboard.usable`.
- **Quick tools** — `dashboard.quickToolsTitle`, summary `dashboard.quickToolsSummary`. Sample `dashboard.quickSample`. Input/output: `dashboard.quickInput` / `dashboard.quickOutput`. Tool picker label `dashboard.quickTool`. Options under `dashboard.quickToolOptions.*`: `urlEncode`, `urlDecode`, `base64Encode`, `base64Decode`, `unixToIso`. Errors `dashboard.quickToolErrors.invalidInput`, `…invalidNumber`.
- **Report** — multi-step report widget. Title `dashboard.reportTitle`, summary `dashboard.reportSummary`, body `dashboard.reportBody`. Step labels `dashboard.reportStep1`..`reportStep4`. Tool/IO labels `dashboard.tool`, `dashboard.input`, `dashboard.output`.

Copy any output value with `dashboard.copyValue`.

## Removing widgets

`dashboard.removeWidget` removes a Widget Instance from the current View. Confirmation hint `dashboard.removeConfirmHint`, body `dashboard.deleteWidgetBody`. Status `dashboard.widgetDeleted`. Deleting the underlying Custom Widget definition uses `dashboard.deleteCustomWidget` (title `…Title`, body `…Body`, confirm `…Confirm`).

## Custom Widgets (AI-authored)

Custom Widgets are authored by the AI Assistant (`ai.createWidget`), not by users directly in v1. AI-authored widgets are script widgets:

- **`script`** — JavaScript hosted inside an isolated `iframe srcdoc` host with declared `dashboard.scriptNetwork` permissions and `dashboard.scriptPollSeconds`. Source viewable via `dashboard.scriptViewSource`. iframe accessible title: `dashboard.scriptWidgetFrameTitle`.

Widget source and settings schema payloads are UTF-8 JSON. When the assistant creates or updates a widget in a non-English output language, titles, summaries, labels, placeholders, setting options, `htmlShim`, and JavaScript string literals should stay as Unicode text; do not rewrite them as mojibake, percent-encoded strings, base64, HTML entities, or ASCII-only text.

When creating a Custom Widget, the assistant uses an OpenDesign-style preflight before calling the Dashboard tool. It picks an internal visual direction (operator console, data observatory, desktop object, spatial canvas, or branded vignette), chooses the rendering library or DOM/canvas approach, sizes the Widget Instance, then critiques contrast, hierarchy, density, responsiveness, and motion cost before saving the widget.

Validation errors surface as:

- `dashboard.scriptInvalidBody`, `dashboard.invalidScriptWidgetBody`.
- Library load failure: `dashboard.widgetLibraryLoadFailed`.
- Missing references: `dashboard.missingBuiltInWidget`, `dashboard.missingCustomWidget`.
- Resource cap: `dashboard.scriptWidgetCapped`.

Hardening details: `docs/ADR/0006-dashboard-script-widget-hardening.md`. Script widgets are isolated in iframes, capped by the active-script-widget limit, run animation/timer guardrails inside the iframe, and have parent bridge throttles for expensive host requests.

Visual context for AI-authored script widgets is supplied as `activeView.visualContext` in Dashboard Assistant context. The iframe exposes exact theme values through `KK.getTheme()` and CSS variables such as `--kk-readable-surface`; widgets should place text on readable surfaces when the View background is image, video, dynamic, or otherwise mixed.

The Dashboard context sent to the AI Assistant is metadata-only. It includes active View information, Widget Instance placement, AI Created Widget titles/summaries/categories, compact body/settings metadata, widget health errors, compact visual context, and compact library keys/globals. It does not include full script source, `bodyJson`, `settingsSchemaJson`, or per-instance settings values. The assistant uses this metadata to detect likely duplicate AI Created Widgets and offer to edit, place, or create a separate widget. Full source is read only through the scoped `dashboard_read_widget_source` tool after one widget id is selected for checking or editing.

### Agent widget dialog

Used when a tool call creates a widget. Title `dashboard.agentWidgetDialogTitle`, hint `dashboard.agentWidgetDialogHint`. Body field `dashboard.agentWidgetJson` with example `dashboard.agentWidgetExample`. Save button `dashboard.saveWidget` → status `dashboard.agentWidgetSaved`. Built-in id reference `dashboard.agentWidgetBuiltInId`. Validation errors under `dashboard.agentWidgetErrors.*` (`invalidJson`, `invalidTitle`, `invalidCategory`, `invalidSummary`, `invalidBody`).

The "Add agent widget" entry point on a View is `dashboard.addAgentWidget`.

## Widget Secrets

Widget Instances may declare a secret. KKTerm prompts via:

- `dashboard.secretStored` / `dashboard.secretPlaceholder` / `dashboard.secretClear`.

Secret values are stored in the OS keychain under the AI-provider secret owner namespace.

## Assistant context echo

When a tool call describes its output, the Widget Instance can show a small "assistant context" block:

- `dashboard.assistantContextLabel`, `dashboard.assistantContextSource`, `dashboard.assistantContextIntro`, `dashboard.assistantSummary`.
