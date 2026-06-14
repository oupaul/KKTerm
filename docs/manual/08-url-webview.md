# 08 — URL Connections

## AI grep hints

- Keys: `webview.*` (full namespace), `connections.embeddedWebApp`
- Topics: URL Connection, embedded WebView2, address bar, back/forward/reload, auto-refresh, credential fill, password capture, external open, saved Pane layout, Shift-click link, downloads, tutorial targets `webview.toolbar`, `webview.address`, `webview.openExternally`, `webview.autoRefresh`, `webview.savePassword`, `webview.fillCredential`, `webview.sendToAi`, `webview.surface`
- Synonyms: "open a webpage", "embed a site", "browser tab", "internal web tool", "fill in saved password", "open link in browser", "external browser"

> **Term:** a **URL Connection** is a Connection of kind `url` storing one http(s) URL plus an optional `dataPartition` label. The `dataPartition` field is persisted but currently a no-op; embedded URL Sessions share the WebView2 process data store.

## Surface

In the desktop runtime, a URL Pane hosts a real WebView2 browser in a stable, borderless, owned `WebviewWindow`. The frontend computes the Pane's DOM rectangle, the Rust backend converts that to screen coordinates, and the overlay window is moved/sized over the Pane. The overlay is hidden when the Tab, Dashboard View, Dashboard Module, or URL Pane is inactive, and when a registered app-owned blocking overlay intersects it.

This deliberately does **not** use Tauri's `unstable` child-webview API. Enabling that feature changed the main KKTerm WebView2 host into a child HWND path, and Windows could restore focus to a native child/control instead of the terminal WebView2 content after Alt+Tab/app switch or minimize/restore. The visible terminal Pane could still look focused, but keyboard input did not reach xterm until the user clicked. The stable overlay-window path keeps URL browsing embedded while preserving the terminal's normal WebView2 focus forwarding.

If this surface changes, verify in the real Windows Tauri runtime that a focused terminal Pane accepts keyboard input immediately after Alt+Tab/app switch and minimize/restore. RDP remains the only workspace kind that uses screenshot-backed overlay parking.

Tutorial target: `webview.surface`.

## Toolbar

- Back: `webview.goBack` (`webview.back`)
- Forward: `webview.goForward` (`webview.forward`)
- Reload: `webview.reload`
- Address bar: `webview.address`, placeholder `webview.urlPlaceholder`. The bar accepts hosts without a scheme; the backend assumes `https://` when no scheme is present.
- The address bar disables OS autocorrect, autocapitalization, and spellcheck in the KKTerm WebView on Windows and macOS so URLs and hostnames are not rewritten while typing. Keyboard/IME suggestions outside the WebView may still appear.
- Auto-refresh: `webview.autoRefresh` / `webview.autoRefreshOff`. Interval label `webview.autoRefreshSeconds`.
- Open externally: toolbar button `webview.openExternally` (opens the current URL in the OS default browser).
- In-page links: normal http(s) link clicks navigate inside the URL Pane. Links that request a new browser window, such as `target="_blank"`, open a new KKTerm Workspace Tab for that URL. Shift-click an http(s) link in the embedded page opens it in the OS default browser instead of navigating the URL Pane.
- Fill saved credential: `webview.fill` / `webview.fillCredential` / `webview.fillSavedCredential`.
- Save password: `webview.savePassword`, dialog title `webview.savePasswordTitle`.
- Send current URL Pane screenshot to AI Assistant: `workspace.sendEntirePanelToAi` (tutorial target `webview.sendToAi`). Status Bar confirmation: `workspace.sentToAi`.
- Close the URL Pane/Tab: toolbar close button (tutorial target `webview.close`, label `workspace.closeTab`), shown only when a close handler is provided.
- Save/reset split Pane layout for a saved URL Connection from the Connection Tree right-click submenu `connections.layout` with `common.save` / `common.reset`.

Tutorial targets: `webview.toolbar`, `webview.address`, `webview.openExternally`, `webview.autoRefresh`, `webview.savePassword`, `webview.fillCredential`, `webview.sendToAi`, `webview.close`.

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
