# 08 — URL Connections (Embedded WebView)

## AI grep hints

- Keys: `webview.*` (full namespace), `connections.embeddedWebApp`
- Topics: URL Connection, address bar, back/forward/reload, auto-refresh, credential fill, password capture, external open, saved Pane layout, Shift-click link, downloads, tutorial targets `webview.toolbar`, `webview.address`, `webview.openExternally`, `webview.autoRefresh`, `webview.savePassword`, `webview.fillCredential`, `webview.sendToAi`, `webview.surface`
- Synonyms: "open a webpage", "embed a site", "browser tab", "internal web tool", "fill in saved password", "open link in browser", "external browser"

> **Term:** a **URL Connection** is a Connection of kind `url` storing one http(s) URL plus an optional `dataPartition` label. The `dataPartition` field is persisted but currently a no-op — Phase 1 WebView2 shares one user-data folder across all URL Connections. Real per-Connection isolation is deferred to Phase 2.

## Surface

A URL Pane hosts a child WebView2 surface positioned over its Tab. The surface is not a Tab — it follows the Tab's geometry and is hidden when the Tab is inactive. In split Panes and Dashboard Connection widgets, the WebView2 bounds are clipped to the host panel so page content stays contained and scrolls inside the URL Pane. App-owned modal overlays that must appear above native browser content, such as Connection dialogs and the Dashboard catalog, temporarily park intersecting WebView2 surfaces offscreen. Menu overlays do **not** suppress WebView2 (RDP remains the only kind that uses screenshot-backed overlay parking).

Tutorial target: `webview.surface`.

## Toolbar

- Back: `webview.goBack` (`webview.back`)
- Forward: `webview.goForward` (`webview.forward`)
- Reload: `webview.reload`
- Address bar: `webview.address`, placeholder `webview.urlPlaceholder`. The bar accepts hosts without a scheme; the backend assumes `https://` when no scheme is present.
- Auto-refresh: `webview.autoRefresh` / `webview.autoRefreshOff`. Interval label `webview.autoRefreshSeconds`.
- Open externally: toolbar button `webview.openExternally` (opens the current URL in the OS default browser).
- In-page links: normal http(s) link clicks navigate inside the URL Pane, including links that ask for a new browser window. Shift-click an http(s) link in the embedded page to open it in the OS default browser instead of navigating the URL Pane.
- Fill saved credential: `webview.fill` / `webview.fillCredential` / `webview.fillSavedCredential`.
- Save password: `webview.savePassword`, dialog title `webview.savePasswordTitle`.
- Send current URL Pane screenshot to AI Assistant: `workspace.sendEntirePanelToAi` (tutorial target `webview.sendToAi`). Status Bar confirmation: `workspace.sentToAi`.
- Save/reset split Pane layout for a saved URL Connection from the Connection Tree right-click submenu `connections.layout` with `common.save` / `common.reset`.

Tutorial targets: `webview.toolbar`, `webview.address`, `webview.openExternally`, `webview.autoRefresh`, `webview.savePassword`, `webview.fillCredential`, `webview.sendToAi`.

## Credential fill

KKTerm can fill a saved username/password into the active form. Status lifecycle:

- `webview.fillingCredential` (in flight)
- `webview.credentialFilled` (success)
- `webview.noSavedCredential` (nothing stored for this Connection)

Saving a password from an in-page login form:

- `webview.capturingPassword` → `webview.savingPassword` → `webview.passwordSaved`.
- Validation failures: `webview.savePasswordInvalidCapture`, `webview.savePasswordNoPasswordField`, `webview.savePasswordEmptyUsername`, `webview.savePasswordEmptyPassword`. Generic failure: `webview.savePasswordFailed`.

Saved credentials live in the OS keychain, never in SQLite. Manage stored credentials from Settings → Credentials ([15-settings.md](15-settings.md)).

## Downloads

The host WebView2 emits download events. KKTerm shows transient status messages on the Status Bar:

- Started: `webview.downloadStarted`
- Complete: `webview.downloadComplete`
- Failed: `webview.downloadFailed`

## Empty / runtime states

- `webview.noUrlConfigured` — Connection has no URL set.
- `webview.onlyDesktopRuntime`, `webview.desktopRuntimeOnly` — shown in a non-Tauri runtime (Vite preview); the WebView2 surface is unavailable.

## Screenshot target label

For [14-screenshots.md](14-screenshots.md): `webview.screenshotTarget`.
