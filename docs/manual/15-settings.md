# 15 — Settings

## AI grep hints

- Keys: `settings.*` (full namespace — over 400 keys; section roots listed below), including General keys `settings.autoStartWithWindows`, `settings.minimizeToTray`, `settings.useDirectxScreenCapture`, `settings.statusBar`, `settings.statusBarMonitor`, `settings.statusBarMonitorInterval`, `settings.debug`, `settings.advancedDebugging`, Appearance title-bar keys `settings.titleBar`, `settings.useCustomTitleBar`, `settings.useCustomTitleBarHint`, and AI provider keys `settings.apiMode`, `settings.apiModeChatCompletions`, `settings.apiModeResponses`, `settings.extraHeaders`, `settings.extraHeadersPlaceholder`, and `settings.assistantSkills*`
- Topics: General, Appearance, Dashboard, Credentials & MCP, AI Assistant, assistant tool defaults, collapsible assistant tools, collapsible Assistant Skills, bundled skills, SKILL.md, SSH, Terminal, network troubleshooting, DNS, DHCP, firewall, TLS certificates, Screenshots, RDP, VNC, URL, About; settings draft/save/reset; backup ZIP; settings import; reset all; Windows startup; launch minimized; DirectX screenshot capture; Status Bar CPU/RAM/Network monitor; custom title bar; native Windows title bar; Advanced Debugging; AI Assistant debug logs; random dynamic Dashboard backgrounds
- Synonyms: "preferences", "options", "config", "theme", "dark mode", "color", "language", "API key", "import settings", "factory reset", "show me where", "start with Windows", "run at login", "launch minimized", "custom title bar", "titlebar", "window chrome", "native title bar", "Windows title bar", "DirectX", "DXGI", "screen capture", "screenshot acceleration", "status bar", "CPU monitor", "RAM monitor", "network monitor", "host usage", "performance overhead", "debug", "diagnostics", "AI debug log", "aiassistant.debug.log", "expand tools", "collapse skills", "random wallpaper", "dynamic wallpaper", "dashboard background", "network-connectivity-troubleshooter", "dns-dhcp-troubleshooter", "firewall-port-troubleshooter", "tls-certificate-troubleshooter"

> Settings page styling is consistent across sections. Related controls live inside the shared `settings-subsection settings-fieldset` group so the group title sits in the border. Editable controls look editable; disabled / readonly controls stay muted. Delete buttons inside Settings are icon-only red trash cans (no visible "Delete" text). Destructive Settings-wide actions live in **General → Settings data**, behind app-owned confirmation dialogs — not inside feature-specific sections.

Settings is owned by `src/settings/SettingsPage.tsx`. Persisted bootstrap (`useBootstrapSettings`) lives in `src/lib/settings.ts`; add new persisted settings there, not via cloned effects in `src/App.tsx`.

The universal AI Assistant panel remains visible on Settings. `src/settings/settingsAssistantContext.ts` publishes the active section, visible control keys, and tutorial targets to the assistant. The Tutorial tool can navigate to the owning Settings section before highlighting known targets after the user accepts a navigation offer.

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
  - `settings.sectionCredentials`
  - `settings.sectionAiAssistant`
  - `settings.sectionSsh`
  - `settings.sectionTerminal`
  - `settings.sectionScreenshots`
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
- Status Bar subsection `settings.statusBar`: toggle `settings.statusBarMonitor` (hint `settings.statusBarMonitorHint`) controls whether the bottom Status Bar shows and polls CPU/RAM/Network host metrics. When off, KKTerm stops host usage polling completely. `settings.statusBarMonitorInterval` chooses the polling interval: `settings.statusBarMonitorInterval5`, `settings.statusBarMonitorInterval15`, `settings.statusBarMonitorInterval30`, `settings.statusBarMonitorInterval60`, or `settings.statusBarMonitorInterval300`.
- Settings data subsection (destructive actions live here):
  - Backup: `settings.backupSettings` → `settings.backupSettingsComplete`. Backup ZIP uses the same shape as importable KKTerm settings export.
  - Import: `settings.importSettings`, confirmation `settings.importSettingsConfirm`, success `settings.importSettingsComplete`.
  - Reset all: `settings.resetAllSettings`, confirmation `settings.resetAllSettingsConfirm`, success `settings.resetAllSettingsComplete`.
- Debug subsection `settings.debug`: toggle `settings.advancedDebugging` (hint `settings.advancedDebuggingHint`) enables full AI Assistant debug log writing even in release builds. These local logs may include prompts, tool arguments, screenshots, and generated Dashboard AI Created Widget source.

> Automatic database backups do **not** run from app-window close. The supported shape is startup or manual backup ZIP creation.

## Appearance

- Group `settings.appearanceInterface`.
- Colour scheme: `settings.colorScheme`. Options: `settings.schemeDefault`, `settings.schemeDark`, `settings.schemeLight`, `settings.schemeMac`, `settings.schemeOrange`, `settings.schemePurple`, `settings.schemePink`, `settings.schemeGreenKuaiKuai`, `settings.schemeBlueSee`, `settings.schemeConfetti`, `settings.schemeBubbleTea`. Preview `settings.colorSchemePreview`. App background `settings.appBg`. Theme grouping `settings.theme` (hint `settings.themeHint`).
- App UI font: `settings.appUiFontFamily` / `settings.activeUiFont`. Reset `settings.resetFont`. Validation `settings.appFontFamilyRequired`. Generic `settings.fontFamily` / `settings.fontSize` (range `settings.fontSizeRange`, blank check `settings.fontFamilyRequired`).
- Title bar group `settings.titleBar`: toggle `settings.useCustomTitleBar` (hint `settings.useCustomTitleBarHint`). When off, KKTerm uses the native Windows title bar. When on, KKTerm switches the main window to app-painted chrome that follows the current KKTerm theme.
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

Section header `settings.sectionAiAssistant`. Owned by `src/settings/AiSettings.tsx`. Per-provider configuration lives in `src/ai/providerRegistry/`.

- Provider picker; known-model picker is a real `<select>` showing every model — not an `<input list>`/`datalist` (Chromium hides non-matching options behind a `datalist`).
- Custom model ID is a separate text input.
- OpenAI Compatible providers can choose API request mode with `settings.apiMode`: `settings.apiModeChatCompletions` uses `/chat/completions`, and `settings.apiModeResponses` uses `/responses`.
- OpenAI Compatible providers can set `settings.extraHeaders` as comma-separated `key=value` pairs; example placeholder `settings.extraHeadersPlaceholder`. These headers are provider request metadata, not OS-keychain secrets.
- API keys go into the OS keychain under `AI_PROVIDER_SECRET_OWNER_ID`; never written to SQLite or settings JSON.
- Tool permission default (`ai.toolPermissionMode`) is set here as well.
- Assistant tools group: title `settings.aiToolsTitle`. It is collapsed by default; expand/collapse uses `common.expand` / `common.collapse`. Assistant tools default enabled except `settings.aiTools.email.label`, which stays off until the user enables and configures delivery. The Tutorial tool is `settings.aiTools.tutorial.label` / `settings.aiTools.tutorial.description`.
- Assistant Skills subgroup: title `settings.assistantSkillsTitle` (hint `settings.assistantSkillsHint`, empty `settings.assistantSkillsEmpty`). It is collapsed by default; expand/collapse uses `common.expand` / `common.collapse`. KKTerm copies missing bundled starter skills into the local app-data skills folder: `dashboard-widget-builder`, `dns-dhcp-troubleshooter`, `firewall-port-troubleshooter`, `network-connectivity-troubleshooter`, `remote-desktop-helper`, `sftp-transfer-helper`, `ssh-troubleshooter`, `terminal-command-planner`, and `tls-certificate-troubleshooter`. `settings.assistantSkillsOpenFolder` opens that folder where users add or edit one SKILL.md-compatible directory per skill. Per-row actions open that skill directory (`settings.assistantSkillsOpen`) and toggle whether the assistant can invoke it (`settings.assistantSkillsEnabled` / `settings.assistantSkillsDisabled`). Skill selection is model-driven through `assistant_use_skill`, not app keyword matching. v1 does not execute skill scripts.

## SSH

Section header `settings.sectionSsh`. Default username, default identity file, agent forwarding, tmux defaults, etc. (Keep this section keyed under `settings.*` — exact field keys live in `en.json`.)

## Terminal

Section header `settings.sectionTerminal`. Font family + size, line height, cursor style, scrollback length, bell behaviour, default shell on Local.

## Screenshots

Section header `settings.sectionScreenshots`.

- Folder picker: `settings.screenshotFolder` (path display `settings.screenshotFolderPath`, hint `settings.screenshotFolderHint`).
- Choose folder: `settings.chooseFolder`. Open the folder: `settings.openScreenshotFolder`.
- Save status: `settings.screenshotsSaved`.

## RDP and VNC

- `settings.sectionRdp` — RDP defaults: resolution, colour depth, redirection toggles.
- `settings.sectionVnc` — VNC defaults: colour depth, view-only, encoding preferences.

## URL

`settings.sectionUrl` — defaults for URL Connections (e.g. default auto-refresh).

## About

`settings.sectionAbout`. Shows version (`settings.version`) and slogan (`settings.appSlogan`). The version value should match `package.json`'s `version` field. License info, GitHub link, and acknowledgements live here.
