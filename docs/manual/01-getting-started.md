# 01 — Getting Started

## AI grep hints

- Keys: `app.connections`, `app.settings`, `app.aiAssistant`, `app.dontSleep`, `app.trayExit`, `app.trayWallpaper`
- Topics: first launch, what KKTerm is, system tray, "Don't Sleep" mode, desktop wallpaper, primary navigation
- Synonyms users may type: "open the app", "left bar icons", "tray icon", "keep awake", "prevent sleep", "wallpaper", "live wallpaper"

## What KKTerm is

KKTerm is a local-first Windows desktop workspace for terminal, SSH, SFTP, URL (embedded WebView), RDP, and VNC work, with a built-in Dashboard and AI Assistant. Durable data lives in SQLite on the user's machine; secrets live in the Windows Credential Manager. There is no cloud account.

See `CONTEXT.md` for the canonical domain terms — **Connection**, **Quick Connect**, **Session**, **Tab**, **Pane**, **Dashboard View**, **Widget Instance**.

## First launch

On first launch KKTerm seeds:

- An empty Connection Tree (see [03-connections.md](03-connections.md)); when enabled, this same tree also hosts Child Connection Tabs under parent Connections.
- A single Dashboard View named `dashboard.defaultView` ("Default") with one App Launcher Widget Instance.
- Default Settings, persisted to SQLite.
- Locale defaulting to the user's OS language if a matching JSON exists under `src/i18n/locales/`, falling back to English.

No Sessions are open. The Workspace Canvas shows the **Default Launch State** — recent Connections and a brief overview. It is not a Module; it appears inside the Workspace Module whenever all Tabs are closed.

## App shell

The window is divided into four regions:

1. **Activity Rail** (48 px, left edge) — primary navigation. See [02-app-layout.md](02-app-layout.md).
2. **Connections Panel** (resizable, left) — visible inside the Workspace Module only. See [03-connections.md](03-connections.md).
3. **Workspace Canvas** (centre) — Tab Strip plus active Tab content for the current Module, or Child Connection Tabs in the Connection Tree when the top Tab Strip is hidden.
4. **AI Assistant Panel** (resizable, right) — `app.aiAssistant`. Collapsible. See [13-ai-assistant.md](13-ai-assistant.md).
5. **Status Bar** (bottom, full width) — host usage metrics and transient notifications.

Resize handles use the labels `app.resizeConnections` and `app.resizeAiAssistant`.

## Primary navigation (Activity Rail)

Top to bottom:

- Workspace (label `workspace.workspace`)
- Dashboard (label `dashboard.moduleLabel`)
- Connection Rail shortcuts (label `app.connectionRail`, group `app.connectedConnectionsRail`) — pinned and currently-connected Connections appear here as direct shortcuts.
- Settings (label `app.settings`, anchored to the bottom)

Hover tooltips on rail icons are rendered by the shared `RailTooltip` (`src/app/RailTooltip.tsx`), never the browser's native `title` tooltip. On Windows desktop builds, `RailTooltip` mirrors labels through a native topmost tooltip so they can show above RDP ActiveX and URL WebView2 surfaces.

## System tray

KKTerm registers a Windows tray icon with recent Connections plus app controls:

- Recent Connections — selecting a Connection restores the window, switches to the Workspace Module, and opens or focuses that Connection's Tab.
- `app.trayDontSleep` — toggles the same state as the in-app "Don't Sleep" mode (see below).
- `app.trayWallpaper` — `app.trayWallpaperSet` opens a small wallpaper picker above the tray icon without restoring the main window; `app.trayWallpaperClear` destroys the wallpaper window and returns wallpaper handling to Windows.
- `app.trayExit` — exits the app unconditionally. This path bypasses the close-to-tray diversion.

## Closing the window

The title-bar close button is the standard close path. KKTerm always uses its custom title bar. When "minimize to tray" is enabled in Settings, the close button hides the window to the tray instead of exiting; when disabled, it exits normally. There are no in-app close-confirmation dialogs.

## "Don't Sleep" mode

`app.dontSleep` keeps the OS awake while KKTerm is running. Toggled either from the Activity Rail menu, the tray (`app.trayDontSleep`), or Settings. Status messages: `app.dontSleepEnabled`, `app.dontSleepDisabled`. Errors surface as `app.dontSleepError`.

## Where to go next

- To open a saved Connection: [03-connections.md](03-connections.md).
- To start a one-off session without saving: Quick Connect — see [03-connections.md](03-connections.md) §Quick Connect.
- To set up the AI Assistant: [13-ai-assistant.md](13-ai-assistant.md) plus [15-settings.md](15-settings.md) §AI.
