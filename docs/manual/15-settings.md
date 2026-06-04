# 15 — Settings

## AI grep hints

- Keys: `settings.*` (full namespace — over 400 keys; section roots listed below), including General keys `settings.autoStartWithWindows`, `settings.minimizeToTray`, `settings.useDirectxScreenCapture`, `settings.statusBar`, `settings.statusBarVisible`, `settings.statusBarMonitor`, `settings.statusBarMonitorInterval`, `settings.debug`, `settings.advancedDebugging`, SSH X server keys `settings.xServer*`, Appearance keys for theme/font/layout, and AI provider keys `settings.apiMode`, `settings.apiModeChatCompletions`, `settings.apiModeResponses`, `settings.extraHeaders`, `settings.extraHeadersPlaceholder`, and `settings.assistantSkills*`
- Topics: General, Appearance, Dashboard, Workspace, Credentials & MCP, AI Assistant, assistant tool defaults, collapsible assistant tools, collapsible Assistant Skills, bundled skills, SKILL.md, SSH, managed VcXsrv X server launcher, Terminal, network troubleshooting, DNS, DHCP, firewall, TLS certificates, RDP, VNC, URL, About; settings draft/save/reset; backup ZIP; settings import; reset all; Windows startup; launch minimized; DirectX screenshot capture; Status Bar visibility; Status Bar CPU/RAM/Network monitor; custom title bar; RDP session stability (WebView2); Advanced Debugging; AI Assistant debug logs; MCP debug logs; built-in MCP config; random dynamic Dashboard backgrounds; terminal default transparency; random dynamic terminal backgrounds; hidden top Tab Strip; Child Connection Tabs in the Connection Tree
- Synonyms: "preferences", "options", "config", "theme", "dark mode", "color", "language", "API key", "import settings", "factory reset", "show me where", "start with Windows", "run at login", "launch minimized", "custom title bar", "titlebar", "window chrome", "DirectX", "DXGI", "screen capture", "screenshot acceleration", "status bar", "show status bar", "hide status bar", "CPU monitor", "RAM monitor", "network monitor", "host usage", "performance overhead", "debug", "diagnostics", "AI debug log", "MCP debug log", "Installer Helper debug log", "heartbeat debug log", "aiassistant.debug.log", "mcp.debug.log", "installer.helper.debug.log", "kkterm-heartbeat.debug.log", "MCP config", "mcpServers", "mcp_servers", "TOML", "kkterm-cli", "Codex MCP", "Claude MCP", "expand tools", "collapse skills", "random wallpaper", "dynamic wallpaper", "dashboard background", "terminal wallpaper", "terminal transparency", "terminal background", "top tabs", "tab buttons", "hide tabs", "connection tree tabs", "child tabs", "saved tabs", "X11", "X forwarding", "X server", "VcXsrv", "network-connectivity-troubleshooter", "dashboard-widget-designer", "dashboard-data-visualization", "desktop-accessibility-ui", "dns-dhcp-troubleshooter", "firewall-port-troubleshooter", "tls-certificate-troubleshooter"

> Settings page styling is consistent across sections. Related controls live inside the shared `settings-subsection settings-fieldset` group so the group title sits in the border. Editable controls look editable; disabled / readonly controls stay muted. Delete buttons inside Settings are icon-only red trash cans (no visible "Delete" text). Destructive Settings-wide actions live in **General → Settings data**, behind app-owned confirmation dialogs — not inside feature-specific sections.

Settings is owned by `src/modules/settings/SettingsPage.tsx`. Persisted bootstrap (`useBootstrapSettings`) lives in `src/lib/settings.ts`; add new persisted settings there, not via cloned effects in `src/App.tsx`.

The universal AI Assistant panel remains visible on Settings. `src/modules/settings/settingsAssistantContext.ts` publishes the active section, visible control keys, and tutorial targets to the assistant. The Tutorial tool can navigate to the owning Settings section before highlighting known targets after the user accepts a navigation offer.

Settings tutorial targets:

- General: `settings.language`, `settings.workspaceAccess`, `settings.useDirectxScreenCapture`, `settings.statusBar`, `settings.settingsData`, `settings.debug`.
- Appearance: `settings.appUiFontFamily`, `settings.appearance.colorScheme`, `settings.resetLayout`.
- Dashboard: `settings.dashboardDefaultLanding`, `settings.dashboardUseRandomDynamicBackground`, `settings.dashboardMaxActiveScriptWidgets`.
- Credentials: `settings.credentialsStored`, `settings.widgetCredentialsStored`.
- AI Assistant: `settings.aiProvider`, `settings.aiToolsTitle`, `settings.aiCustomInstructions`, `settings.assistantSkillsTitle`, `settings.mcpServersTitle`.
- SSH: `settings.defaultUser`, `settings.defaultPort`, `settings.defaultKey`, `settings.sshBufferLines`.
- Terminal: `settings.terminalFontFamily`, `settings.terminalFontSize`, `settings.defaultShell`, `settings.scrollbackLines`.
- URL: `settings.ignoreCertificateErrors`, `settings.urlSavedPasswords`, `settings.urlDataShards`.
- RDP: `settings.rdpColorDepth`, `settings.rdpPerformanceProfile`.
- VNC: `settings.vncViewOnly`, `settings.vncColorLevel`.
- About: `settings.aboutVersion`.

## Page chrome

- Page title `settings.title`.
- Left sidebar label `settings.sectionsNav`. Sections:
  - `settings.sectionGeneral`
  - `settings.sectionAppearance`
  - `settings.sectionDashboard`
  - `settings.sectionWorkspace`
  - `settings.sectionInstaller`
  - `settings.sectionCredentials`
  - `settings.sectionAiAssistant`
  - `settings.sectionSsh`
  - `settings.sectionTerminal`
  - `settings.sectionRdp`
  - `settings.sectionVnc`
  - `settings.sectionUrl`
  - `settings.sectionAbout`
- Save action: `settings.save`. Per-section status, e.g. `settings.appearanceSaved`, `settings.generalDefaultsSaved`.

## General

- Defaults group `settings.generalDefaults`.
- Language picker: label `settings.language`. Native names come from the `languages` namespace. See [16-localization.md](16-localization.md).
- Start with Windows minimized: toggle `settings.autoStartWithWindows` (hint `settings.autoStartWithWindowsHint`). When on, KKTerm registers itself for the current Windows user, launches after sign-in, and starts minimized; if `settings.minimizeToTray` is also on, the launch window hides to the system tray.
- Minimize to tray: toggle `settings.minimizeToTray` (hint `settings.minimizeToTrayHint`). When on, the title-bar close button hides the window; when off, it exits. Tray "Exit" (`app.trayExit`) always quits.
- Performance subsection `settings.performance`: toggle `settings.useDirectxScreenCapture` (hint `settings.useDirectxScreenCaptureHint`). When on, screenshot capture tries DXGI Desktop Duplication first and falls back to GDI when DirectX capture is unavailable or unsupported for the requested region.
- Status Bar subsection `settings.statusBar`: toggle `settings.statusBarVisible` (hint `settings.statusBarVisibleHint`) shows or hides the bottom Status Bar. Toggle `settings.statusBarMonitor` (hint `settings.statusBarMonitorHint`) controls whether the visible Status Bar shows and polls CPU/RAM/Network host metrics. When the Status Bar is hidden or the monitor toggle is off, KKTerm stops host usage polling completely. `settings.statusBarMonitorInterval` chooses the polling interval: `settings.statusBarMonitorInterval5`, `settings.statusBarMonitorInterval15`, `settings.statusBarMonitorInterval30`, `settings.statusBarMonitorInterval60`, or `settings.statusBarMonitorInterval300`.
- Settings data subsection (destructive actions live here):
  - Export: `settings.exportSettings` → `settings.exportSettingsComplete`. Export ZIP uses the same shape as importable KKTerm settings export.
  - Import: `settings.importSettings`, confirmation `settings.importSettingsConfirm`, success `settings.importSettingsComplete`.
  - Reset all: `settings.resetAllSettings`, confirmation `settings.resetAllSettingsConfirm`, success `settings.resetAllSettingsComplete`.
- Debug subsection `settings.debug`: toggle `settings.advancedDebugging` (hint `settings.advancedDebuggingHint`) enables full AI Assistant, MCP, Installer Helper, and heartbeat debug log writing even in release builds. Enabling it writes an `advanced_debugging.enabled` marker to the JSONL logs `aiassistant.debug.log`, `mcp.debug.log`, and `installer.helper.debug.log` beside `kkterm.log`, so the release logging path is visible before the next assistant, MCP, or Installer Helper event. It also starts `kkterm-heartbeat.debug.log`; turning the setting off stops release heartbeat writes. These local logs may include prompts, tool arguments, MCP arguments/results, Installer Helper command output, local paths, frontend/native liveness timing, screenshots, and generated Dashboard AI Created Widget source.
- RDP session stability (WebView2): toggle `settings.rdpWebviewStability` (hint `settings.rdpWebviewStabilityHint`) lives in the Debug subsection. When enabled, the next launch applies matching WebView2 stability browser arguments to the main app WebView and URL Connection child WebView2 surfaces so embedded URL panes keep rendering while KKTerm runs inside an RDP host.

> Automatic database backups do **not** run from app-window close. The supported shape is startup or manual backup ZIP creation.

## Appearance

- Group `settings.appearanceInterface`.
- Colour scheme: `settings.colorScheme`. Options: `settings.schemeDefault`, `settings.schemeDark`, `settings.schemeLight`, `settings.schemeMac`, `settings.schemeOrange`, `settings.schemePurple`, `settings.schemePink`, `settings.schemeGreenKuaiKuai`, `settings.schemeBlueSee`, `settings.schemeConfetti`, `settings.schemeBubbleTea`, `settings.schemeSemiconductor`. Preview `settings.colorSchemePreview`. App background `settings.appBg`. Theme grouping `settings.theme` (hint `settings.themeHint`).
- App UI font: `settings.appUiFontFamily` / `settings.activeUiFont`. Reset `settings.resetFont`. Validation `settings.appFontFamilyRequired`. Generic `settings.fontFamily` / `settings.fontSize` (range `settings.fontSizeRange`, blank check `settings.fontFamilyRequired`).
- KKTerm always uses app-painted custom title-bar chrome that follows the current KKTerm theme.
- Layout group `settings.layout`. Reset layout: `settings.resetLayout` (description `settings.resetLayoutDescription`) — resets Connections / AI panel widths.
- Save status: `settings.appearanceSaved`. Reset status `settings.appearanceReset`.

## Dashboard

- Section header `settings.sectionDashboard`. Title and description `settings.dashboardTitle` / `settings.dashboardDescription`.
- General group `settings.dashboardGeneral`:
  - Default landing view: `settings.dashboardDefaultLanding`. `settings.dashboardLandingLast` reopens the last active Dashboard View; other options are durable Dashboard View titles.
  - Random dynamic background: `settings.dashboardUseRandomDynamicBackground` (hint `settings.dashboardUseRandomDynamicBackgroundDesc`). When on, newly-created Dashboard Views automatically get one random dynamic background; existing Views are unchanged.
  - Widget network tools remain enabled for script widgets that declare `permissions.networkTools`. The underlying setting keys `settings.dashboardAllowWidgetNetworkTools` / `settings.dashboardAllowWidgetNetworkToolsDesc` are hidden from Settings for now.
- Performance group `settings.dashboardPerformance`:
  - Active script widgets cap: `settings.dashboardMaxActiveScriptWidgets` (hint `settings.dashboardMaxActiveScriptWidgetsHint`).

## Workspace

- Section header `settings.sectionWorkspace`.
- Activity Rail group `settings.activityRail`:
  - Toggle `settings.connectedConnectionsRail` (hint `settings.connectedConnectionsRailHint`). When on, connected Connection icons appear on the Activity Rail; when off, connected Connection shortcuts are hidden from the Activity Rail.
- Tabs group `settings.workspaceTabs`.
- Toggle `settings.hideTopTabButtons` (hint `settings.hideTopTabButtonsDesc`). When on, the top `workspace.tabStrip` buttons are hidden and new Tabs opened from saved Connections become **Child Connection Tabs**. Child Connection Tabs are shown as italic rows under their parent Connection in the Connection Tree, persist across launches, open lazily when selected, can be renamed, and expose `connections.childConnectionProperties` for child icon/color edits.
- Terminal backgrounds group `settings.terminalBackgrounds`.
- Toggle `settings.separateSplitTerminalBackgrounds` (hint `settings.separateSplitTerminalBackgroundsDesc`). The default is off: a Connection Tab paints one background behind the terminal workspace content area. When on, split terminal Panes can keep per-Pane terminal backgrounds; a single terminal Tab behaves the same as the default shared mode.
- Save status: `settings.workspaceSaved`.

## Installer Helper

- Section header `settings.sectionInstaller`. Owned by `src/modules/settings/InstallerSettings.tsx`.
- Activity Rail group `settings.installerRail`:
  - Toggle `settings.installerShowOnRail` (hint `settings.installerShowOnRailDesc`). When on (default), the Installer Helper icon appears on the Activity Rail; when off, the icon is hidden.
- Update checks group `settings.installerUpdateChecks`:
  - Interval dropdown `settings.installerCheckInterval` (hint `settings.installerCheckIntervalDesc`) with options `settings.installerCheckInterval3600` (hour), `settings.installerCheckInterval86400` (day, default), `settings.installerCheckInterval604800` (week), `settings.installerCheckInterval2592000` (month). Controls how often the Installer Helper auto-checks for the latest tool versions when you switch to the Module; the in-Module Refresh button always checks immediately.
- Save status: `settings.installerSaved`.

## Credentials & MCP

This is the central manager for OS-keychain-backed secrets.

- Section header `settings.sectionCredentials`. Stored credentials list `settings.credentialsTitle` / `settings.credentialsStored` (hint `settings.credentialsHint`, empty `settings.credentialsEmpty`).
- Per-credential fields: username `settings.credentialUsername`. Kinds (badges): `settings.credentialKindConnectionPassword`, `…UrlPassword`, `…AiApiKey`, `…EmailApiKey`, `…EmailSmtpPassword`, `…WidgetSecret`.
- Save status: `settings.credentialSavedPassword`, `…SavedApiKey`, `…SavedSecret`. Updated: `settings.credentialUpdated`. Missing secret error: `settings.credentialMissingSecret`. Stored marker: `settings.credentialStored`.
- Delete: red trash button `settings.deleteCredential`, confirmation body `settings.deleteCredentialConfirmBody`, status `settings.credentialDeleted`.
- Widget secrets subgroup: `settings.widgetCredentialsStored` (hint `…Hint`, empty `…Empty`).
- **MCP Servers** subgroup: title `settings.mcpServersTitle` (hint `…Hint`, empty `…Empty`). Actions:
  - Add: `settings.mcpAddServer` / `settings.mcpCreateServer`. Paste-JSON shortcut `settings.mcpPasteHint`, placeholder `…PastePlaceholder`, continue `…PasteContinue`, confirm hint `…ConfirmHint`.
  - Fields: `settings.mcpServerName`, `…ServerUrl`, `…HeadersLabel`. Detected secret hint `…DetectedSecretHint`. Per-secret header name / value template `…SecretHeaderName`, `…SecretValueTemplate`, `…SecretValue`.
  - Add-flow validation: `settings.mcpAddInvalidJson`, `…AddInvalidShape`, `…AddNoServers`, `…AddMissingUrl`, `…AddStdioUnsupported` (with stdio guidance `…StdioGuidance`).
  - Errors: `settings.mcpErrorNotFound`, `…ErrorDuplicateName`, `…ErrorKeychain`.
  - Status badges: `settings.mcpStatusOk`, `…Unreachable`, `…AuthError`, `…ProtocolError`, `…Unknown`. Tools count `settings.mcpToolsCount` / `…_one`. Auth badge `…AuthBadge`.
  - Refresh tools: `settings.mcpRefreshTools`. Delete: `settings.mcpDeleteServer`, body `…DeleteConfirmBody`.

## AI Assistant

Section header `settings.sectionAiAssistant`. Owned by `src/modules/settings/AiSettings.tsx`. Per-provider configuration lives in `src/ai/providerRegistry/`.

- Provider picker; known-model picker is a real `<select>` showing every model — not an `<input list>`/`datalist` (Chromium hides non-matching options behind a `datalist`).
- Custom model ID is a separate text input.
- OpenAI Compatible providers can choose API request mode with `settings.apiMode`: `settings.apiModeChatCompletions` uses `/chat/completions`, and `settings.apiModeResponses` uses `/responses`.
- OpenAI Compatible providers can set `settings.extraHeaders` as comma-separated `key=value` pairs; example placeholder `settings.extraHeadersPlaceholder`. These headers are provider request metadata, not OS-keychain secrets.
- API keys go into the OS keychain under `AI_PROVIDER_SECRET_OWNER_ID`; never written to SQLite or settings JSON.
- Tool permission default (`ai.toolPermissionMode`) is set here as well.
- Assistant tools group: title `settings.aiToolsTitle`. It is collapsed by default; expand/collapse uses `common.expand` / `common.collapse`. Assistant tools default enabled, including `settings.aiTools.network.label`, except `settings.aiTools.email.label`, which stays off until the user enables and configures delivery. The Tutorial tool is `settings.aiTools.tutorial.label` / `settings.aiTools.tutorial.description`.
- Assistant Skills subgroup: title `settings.assistantSkillsTitle` (hint `settings.assistantSkillsHint`, empty `settings.assistantSkillsEmpty`). It is collapsed by default; expand/collapse uses `common.expand` / `common.collapse`. KKTerm copies missing bundled starter skills into the local app-data skills folder: `dashboard-widget-builder`, `dashboard-widget-designer`, `dashboard-data-visualization`, `desktop-accessibility-ui`, `dns-dhcp-troubleshooter`, `firewall-port-troubleshooter`, `network-connectivity-troubleshooter`, `remote-desktop-helper`, `sftp-transfer-helper`, `ssh-troubleshooter`, `terminal-command-planner`, and `tls-certificate-troubleshooter`. `settings.assistantSkillsOpenFolder` opens that folder where users add or edit one SKILL.md-compatible directory per skill. The Custom Skills row (`settings.assistantCustomSkillsTitle`, hint `settings.assistantCustomSkillsHint`) controls whether extra skill directories under `assistant-skills\custom` are included when the Assistant Skill list is refreshed and when the AI Assistant starts a request; `settings.assistantCustomSkillsOpenFolder` opens that folder. Per-row actions open that skill directory (`settings.assistantSkillsOpen`) and toggle whether the assistant can invoke it (`settings.assistantSkillsEnabled` / `settings.assistantSkillsDisabled`). Skill selection is model-driven through `assistant_use_skill`, not app keyword matching. v1 does not execute skill scripts.

## SSH

Section header `settings.sectionSsh`. Default username, default identity file, agent forwarding, tmux defaults, etc. (Keep this section keyed under `settings.*` — exact field keys live in `en.json`.) `settings.defaultTransparency` sets the starting SSH terminal transparency for new SSH Connections and Child Connection Tabs; the default is 50. `settings.randomDynamicBackgroundOnCreate` assigns a random dynamic terminal background only when creating new SSH Connections, new top-strip Tabs from SSH Connections, or new SSH Child Connection Tabs.

The `settings.xServer` group controls the managed VcXsrv launcher. `settings.xServerManaged` starts VcXsrv before opening SSH Sessions when `vcxsrv.exe` is not already running. `settings.xServerPath` can override the executable path; blank uses standard VcXsrv install locations. `settings.xServerDisplay` chooses the local X display number, and `settings.xServerArgs` passes command-line flags. `settings.xServerLaunch` saves the current SSH Settings draft and starts VcXsrv immediately.

X11 forwarding is negotiated when a new native SSH Session starts. SSH Sessions that were already open before enabling or restarting VcXsrv need to be reconnected or opened again before remote X11 apps receive `DISPLAY`. Existing tmux panes can also keep an old shell environment; open a new tmux pane/window or export the new `DISPLAY` inside that shell.

## Terminal

Section header `settings.sectionTerminal`. Font family + size, line height, cursor style, scrollback length, bell behaviour, default shell on Local. `settings.defaultTransparency` sets the starting local/Telnet/Serial terminal transparency for new terminal Connections and Child Connection Tabs; the default is 50. `settings.randomDynamicBackgroundOnCreate` assigns a random dynamic terminal background only when creating new local/Telnet/Serial Connections, new top-strip Tabs, or new Child Connection Tabs.

## RDP and VNC

- `settings.sectionRdp` — RDP defaults: resolution, colour depth, redirection toggles.
- `settings.sectionVnc` — VNC defaults: colour depth, view-only, encoding preferences.

## URL

`settings.sectionUrl` — defaults for URL Connections (e.g. default auto-refresh).

## About

`settings.sectionAbout`. Shows version (`settings.version`) and slogan (`settings.appSlogan`). The version value should match `package.json`'s `version` field. License info, GitHub link, and acknowledgements live here.

`settings.autoUpdateChecks` controls startup update checks, and manual checks surface update state through `settings.checkingForUpdates`, `settings.updateNoUpdates`, and `settings.updateCheckFailed`. When an app update is available, the `settings.updatePromptLabel` dialog shows `settings.updateAvailableBody`, renders `settings.updateNotes` from the release markdown, and offers `settings.updateOpenDownloadPage`, `settings.updateDownloadAndInstall`, or `settings.updateLater` when the matching installer and checksum are available. `settings.updateDownloadAndInstall` downloads the installer, verifies the release checksum, closes KKTerm, and launches the installer after the app exits.


## Built-in MCP Server

- Location: Settings → AI Assistant section.
- Toggle keys: `settings.builtInMcpServerEnabled` (`settings.builtInMcpServerEnabledHint`) and `settings.builtInMcpAllowAllDangerous` (`settings.builtInMcpAllowAllDangerousHint`).
- Config dialog keys: `settings.builtInMcpShowConfig`, `settings.builtInMcpConfigTitle`, `settings.builtInMcpConfigIntro`, `settings.builtInMcpConfigFormatJson`, `settings.builtInMcpConfigFormatToml`, `settings.builtInMcpConfigCopy`, `settings.builtInMcpConfigCopied`, `settings.builtInMcpConfigLocationsTitle`, `settings.builtInMcpConfig*Header`, and `settings.builtInMcpConfigMethod*`.
- Config dialog behavior: shows copyable JSON (`mcpServers.kkterm`) and TOML (`[mcp_servers.kkterm]`) snippets for stdio MCP clients using the resolved `kkterm-cli.exe` path beside the running `KKTerm.exe`. The setup table shows localized Agent/Method/Project/Global headings. Codex and Claude Code rows include documented CLI commands where supported; VS Code/GitHub Copilot, Antigravity, and OpenCode rows use `settings.builtInMcpConfigMethodManualEdit` and list config locations.
- Purpose: enable/disable the local built-in MCP server surface and control whether built-in MCP tools with a `dangerous` namespace segment, such as `kkterm.workspace.quick_commands.dangerous.create`, require confirmation prompts or run in allow-all mode.
- Debug logging: debug builds write raw built-in and remote MCP request/response records to `mcp.debug.log` beside `kkterm.log`; release builds write the same MCP log when `settings.advancedDebugging` is enabled.
