# 08 — URL Connections

## AI grep hints

- Keys: `webview.*` (full namespace), `connections.embeddedWebApp`
- Topics: URL Connection, embedded WebView2, address bar, back/forward/reload, auto-refresh, save form data, restore form data, credential fill, password capture, external open, saved Pane layout, Shift-click link, downloads, tutorial targets `webview.toolbar`, `webview.address`, `webview.openExternally`, `webview.autoRefresh`, `webview.savePassword`, `webview.fillCredential`, `webview.sendToAi`, `webview.surface`
- Synonyms: "open a webpage", "embed a site", "browser tab", "internal web tool", "fill in saved password", "save form data", "restore form fields", "remember what I typed", "open link in browser", "external browser"

> **Term:** a **URL Connection** is a Connection of kind `url` storing one http(s) URL plus an optional `dataPartition` label. The `dataPartition` field is persisted but currently a no-op; embedded URL Sessions share the WebView2 process data store.

## Surface

In the desktop runtime, a URL Pane hosts a real WebView2 browser in a stable, borderless, owned `WebviewWindow`. The frontend computes the Pane's DOM rectangle, the Rust backend converts that to screen coordinates, and the overlay window is moved/sized over the Pane. The overlay is hidden when the Tab, Dashboard View, Dashboard Module, or URL Pane is inactive, and when a registered app-owned blocking overlay intersects it.

This deliberately does **not** use Tauri's `unstable` child-webview API. Enabling that feature changed the main KKTerm WebView2 host into a child HWND path, and Windows could restore focus to a native child/control instead of the terminal WebView2 content after Alt+Tab/app switch or minimize/restore. The visible terminal Pane could still look focused, but keyboard input did not reach xterm until the user clicked. The stable overlay-window path keeps URL browsing embedded while preserving the terminal's normal WebView2 focus forwarding.

If this surface changes, verify in the real Windows Tauri runtime that a focused terminal Pane accepts keyboard input immediately after Alt+Tab/app switch and minimize/restore. RDP remains the only workspace kind that uses screenshot-backed overlay parking.

Tutorial target: `webview.surface`.

## Toolbar

The URL Pane chrome follows the File Explorer (SFTP) Apple-esque design language: a token-driven light surface, hairline borders, and rounded translucent icon buttons. There is no sidebar.

- Connection identity: a connection icon badge leads the toolbar (in the slot the File Explorer uses for its sidebar toggle). It shows the URL Connection's saved favicon when present, otherwise a globe glyph; its tooltip is the Connection name (or the current host for an ad-hoc URL Tab).
- Back: `webview.goBack` (`webview.back`)
- Forward: `webview.goForward` (`webview.forward`)
- Reload: `webview.reload`
- Address bar: `webview.address`, placeholder `webview.urlPlaceholder`. The bar accepts hosts without a scheme; the backend assumes `https://` when no scheme is present. A leading lock/globe glyph reflects whether the current address is `https://` (secure) or not.
- The address bar disables OS autocorrect, autocapitalization, and spellcheck in the KKTerm WebView on Windows and macOS so URLs and hostnames are not rewritten while typing. Keyboard/IME suggestions outside the WebView may still appear.
- Auto-refresh: `webview.autoRefresh` / `webview.autoRefreshOff`. Interval label `webview.autoRefreshSeconds`.
- Open externally: toolbar button `webview.openExternally` (opens the current URL in the OS default browser).
- In-page links: normal http(s) link clicks navigate inside the URL Pane. Links that request a new browser window, such as `target="_blank"`, open a new KKTerm Workspace Tab for that URL. Shift-click an http(s) link in the embedded page opens it in the OS default browser instead of navigating the URL Pane.
- Restore saved form data: `webview.fillSavedCredential` (disabled tooltip `webview.noSavedCredential`).
- Save form data: `webview.savePassword`, button title `webview.savePasswordTitle`.
- Send current URL Pane screenshot to AI Assistant: `workspace.sendEntirePanelToAi` (tutorial target `webview.sendToAi`). Status Bar confirmation: `workspace.sentToAi`.
- Close the URL Pane/Tab: toolbar close button (tutorial target `webview.close`, label `workspace.closeTab`), shown only when a close handler is provided.
- Save/reset split Pane layout for a saved URL Connection from the Connection Tree right-click submenu `connections.layout` with `common.save` / `common.reset`.

Tutorial targets: `webview.toolbar`, `webview.address`, `webview.openExternally`, `webview.autoRefresh`, `webview.savePassword`, `webview.fillCredential`, `webview.sendToAi`, `webview.close`.

## Save & restore form data

KKTerm can remember everything typed into the embedded page and write it back on a
later visit — not just a login. Pressing **Save form data** captures every visible,
restorable field (text inputs, textareas, `select` dropdowns, and checkbox/radio
state) plus the primary password field, without submitting the form. There is no
need for the page to have a password field at all, so search forms, filters, and
configuration screens can be saved too.

Each saved field is identified by a stable selector and its position among matching
elements, so the values land back in the right inputs when the page is reopened.

Saving (toolbar **Save form data** button):

- `webview.capturingPassword` → `webview.savingPassword` → `webview.passwordSaved`.
- Nothing to save: `webview.savePasswordNoPasswordField` (no fillable fields with values were found). Malformed capture: `webview.savePasswordInvalidCapture`. Generic failure: `webview.savePasswordFailed`.

Restoring (toolbar **Restore saved form data** button, or automatically after a page
finishes loading):

- `webview.fillingCredential` (in flight)
- `webview.credentialFilled` (success)
- `webview.noSavedCredential` (nothing stored for this Connection)

Manual restore writes every saved field, including the password and any toggles.
The automatic post-load restore is conservative: it only fills fields that are still
empty and leaves checkbox/radio/`select` state untouched so it never clobbers what a
page (or the user) has already set.

The primary password is the only saved value kept in the OS keychain; all other
field values are stored alongside the URL Connection in SQLite and are never secrets.
Manage saved entries from Settings → Credentials ([15-settings.md](15-settings.md)).

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
