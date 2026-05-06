# Localization Backlog

This file tracks English source strings that still need translation. Product implementation is English first: add or update `src/i18n/locales/en.json` during feature work, then document any untranslated keys here with enough context for later localization.

When a key is translated into every supported locale, remove its entry from this file.

## Pending Strings

### `terminal.copySelection`

- English: "Copy terminal selection (Ctrl+Insert)"
- Namespace: `terminal`
- Appears in: `src/terminal/TerminalWorkspace.tsx`
- UI role: Button aria-label and tooltip
- Context: Terminal Pane toolbar copy button. The shortcut hint changed from `Ctrl+Shift+C` because WebView2 devtools can reserve that chord in development builds.
- Tone: Short action label with shortcut hint
- Placeholders: None
- Domain notes: Keep `Ctrl+Insert` as the literal keyboard shortcut. The button copies the current xterm selection to the OS clipboard.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `connections.telnet`

- English: "Telnet"
- Namespace: `connections`
- Appears in: `src/connections/ConnectionSidebar.tsx`
- UI role: Connection type label
- Context: Connection creation/type picker tile for password-based Telnet terminal Connections.
- Tone: Protocol name, concise
- Placeholders: None
- Domain notes: Keep `Telnet` in English unless the locale has a standard transliteration.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `connections.serial`

- English: "Serial"
- Namespace: `connections`
- Appears in: `src/connections/ConnectionSidebar.tsx`
- UI role: Connection type label
- Context: Connection creation/type picker tile for Serial terminal Connections over COM-style lines.
- Tone: Technical noun, concise
- Placeholders: None
- Domain notes: Refers to serial-port communication, not ordinal ordering.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `connections.telnetShell`

- English: "Password terminal"
- Namespace: `connections`
- Appears in: `src/connections/ConnectionSidebar.tsx`
- UI role: Connection type subtitle
- Context: Subtitle under the Telnet connection type tile, distinguishing it from SSH key/agent auth.
- Tone: Short descriptive phrase
- Placeholders: None
- Domain notes: Password is stored in the OS keychain when saved.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `connections.serialLine`

- English: "Serial line"
- Namespace: `connections`
- Appears in: `src/connections/ConnectionSidebar.tsx`
- UI role: Connection type subtitle
- Context: Subtitle under the Serial connection type tile, and nearby copy for COM-line setup.
- Tone: Technical, concise
- Placeholders: None
- Domain notes: `Line` maps to values such as `COM1`; do not translate examples like COM port names.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `connections.line`

- English: "Line"
- Namespace: `connections`
- Appears in: `src/connections/ConnectionSidebar.tsx`
- UI role: Form field label
- Context: Serial Connection field for the serial port line, defaulting to `COM1`.
- Tone: Compact field label
- Placeholders: None
- Domain notes: Means serial port line/device, not a text line.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `connections.speed`

- English: "Speed"
- Namespace: `connections`
- Appears in: `src/connections/ConnectionSidebar.tsx`
- UI role: Form field label
- Context: Serial Connection baud-rate/speed field, defaulting to `9600`.
- Tone: Compact field label
- Placeholders: None
- Domain notes: Numeric serial baud rate; nearby input placeholder is `9600`.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `connections.serialLinePlaceholder`

- English: "COM1"
- Namespace: `connections`
- Appears in: `src/connections/ConnectionSidebar.tsx`
- UI role: Input placeholder
- Context: Placeholder/default example for the Serial Connection line field on Windows.
- Tone: Literal device identifier example
- Placeholders: None
- Domain notes: Keep `COM1` untranslated.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `workspace.copyRegion`

- English: "Capture Region(Clipboard)"
- Namespace: `workspace`
- Appears in: `src/workspace/ScreenshotMenu.tsx`
- UI role: Menu item
- Context: Screenshot button submenu item. The user selects this item, then draws a rectangular region inside the active workspace surface; the selected pixels are copied to the OS clipboard.
- Tone: Concise command label
- Placeholders: None
- Domain notes: `Clipboard` refers to the operating system clipboard destination.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `workspace.sendRegionToAi`

- English: "Capture Region(AI Assistant)"
- Namespace: `workspace`
- Appears in: `src/workspace/ScreenshotMenu.tsx`
- UI role: Menu item
- Context: Screenshot button submenu item. The user selects this item, then draws a rectangular region inside the active workspace surface; the selected pixels are attached to AI Assistant context.
- Tone: Concise command label
- Placeholders: None
- Domain notes: Keep `AI Assistant` aligned with the product feature name.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `workspace.copyEntirePanel`

- English: "Capture Entire Window(Clipboard)"
- Namespace: `workspace`
- Appears in: `src/workspace/ScreenshotMenu.tsx`
- UI role: Menu item
- Context: Screenshot button submenu item. Captures the entire target workspace surface or pane immediately and copies it to the OS clipboard.
- Tone: Concise command label
- Placeholders: None
- Domain notes: `Window` refers to the visible target workspace area for the screenshot command, not necessarily the full desktop app window.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `workspace.sendEntirePanelToAi`

- English: "Capture Entire Window(AI Assistant)"
- Namespace: `workspace`
- Appears in: `src/workspace/ScreenshotMenu.tsx`
- UI role: Menu item
- Context: Screenshot button submenu item. Captures the entire target workspace surface or pane immediately and attaches it to AI Assistant context.
- Tone: Concise command label
- Placeholders: None
- Domain notes: Keep `AI Assistant` aligned with the product feature name. `Window` refers to the visible target workspace area for the screenshot command.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `workspace.screenshotCaptureError`

- English: "Could not capture screenshot: {{message}}"
- Namespace: `workspace`
- Appears in: `src/workspace/ScreenshotMenu.tsx`
- UI role: Error
- Context: Alert shown when screenshot capture fails for either clipboard or AI Assistant destinations.
- Tone: Direct error
- Placeholders: `{{message}}` is the runtime error returned by the screenshot capture command.
- Domain notes: Screenshot capture may include native Windows surfaces such as RDP ActiveX and WebView2.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `workspace.workspaceSurface`

- English: "Workspace surface"
- Namespace: `workspace`
- Appears in: `src/workspace/ScreenshotMenu.tsx`
- UI role: Fallback label fragment
- Context: Fallback source label used for screenshots when a caller does not provide a more specific surface label such as terminal pane, SFTP view, URL view, or RDP view.
- Tone: Neutral noun phrase
- Placeholders: None
- Domain notes: Refers to the visible capture target, not a backend Session or durable Connection.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `ai.noMessages`

- English: "No messages"
- Namespace: `ai`
- Appears in: `src/ai/AssistantPanel.tsx`
- UI role: Chat history preview fallback
- Context: Fallback preview text for a saved AI Assistant chat row if no last message content is available after history normalization.
- Tone: Neutral, concise
- Placeholders: None
- Domain notes: Refers to chat messages inside the AI Assistant panel, not workspace Sessions or terminal output.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `ai.deleteChat`

- English: "Delete chat {{title}}"
- Namespace: `ai`
- Appears in: `src/ai/AssistantPanel.tsx`
- UI role: Button aria-label and tooltip
- Context: X button beside each saved chat title in the AI Assistant panel's View All chat history list. Activating it removes that saved chat from local history.
- Tone: Direct, concise
- Placeholders: `{{title}}` is the saved chat title, usually an AI-generated short summary of the first user request.
- Domain notes: The chat is AI Assistant history stored locally in browser/Tauri local storage; it is not a backend Session, Tab, or durable Connection.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.customModelId`

- English: "Custom model ID"
- Namespace: `settings`
- Appears in: `src/settings/AiSettings.tsx`
- UI role: Form field label
- Context: Text input under the AI provider model dropdown. The dropdown contains known provider model IDs, while this field lets the user type an exact custom model or deployment ID for OpenAI-compatible gateways and provider-specific deployments.
- Tone: Technical, concise
- Placeholders: None
- Domain notes: `model ID` means the literal API model identifier, such as `claude-sonnet-4-6`, `deepseek-v4-pro`, or an Azure deployment name. Technical model IDs should remain untranslated.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

## Entry Template

```markdown
### `namespace.key.path`

- English: "Text shown in the UI"
- Namespace: `namespace`
- Appears in: `src/path/Component.tsx`
- UI role: Button label | field label | aria-label | tooltip | status | error | dialog title | sentence fragment
- Context: Explain what the user is doing, what state causes this text to appear, and what surrounding labels or controls are nearby.
- Tone: Neutral | concise | warning | destructive | friendly
- Placeholders: Describe each placeholder, including example values and whether order may change in other languages.
- Domain notes: Explain product-specific meaning, and list technical terms that should remain in English.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id
```

### `settings.autoBackup`

- English: "Auto Backup"
- Namespace: `settings`
- Appears in: `src/settings/GeneralSettings.tsx`
- UI role: Checkbox label
- Context: General Settings toggle that enables or disables automatic SQLite database backup ZIP creation when the desktop app starts.
- Tone: Concise settings label
- Placeholders: None
- Domain notes: Backup refers to the local AdminDeck SQLite database, not remote Connection data outside the app.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.autoBackupHint`

- English: "Automatic backups older than 1 week are deleted after each startup backup."
- Namespace: `settings`
- Appears in: `src/settings/GeneralSettings.tsx`
- UI role: Help text
- Context: Explanatory text under the Auto Backup checkbox in General Settings.
- Tone: Informational and direct
- Placeholders: None
- Domain notes: SQLite and ZIP should remain technical terms; the backup file is compatible with Import Settings.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.autoBackupSaved`

- English: "Auto Backup setting saved."
- Namespace: `settings`
- Appears in: `src/settings/GeneralSettings.tsx`
- UI role: Success status
- Context: Shown after the user changes the Auto Backup setting and persistence succeeds.
- Tone: Brief confirmation
- Placeholders: None
- Domain notes: Auto Backup is the General Settings option for startup database backup ZIP creation.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.backupSettings`

- English: "Back Up Now"
- Namespace: `settings`
- Appears in: `src/settings/GeneralSettings.tsx`
- UI role: Button label
- Context: Button in General Settings that immediately creates an importable backup ZIP in the local database backup folder.
- Tone: Concise command label
- Placeholders: None
- Domain notes: Backup ZIPs use the AdminDeck importable database archive format.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.backupSettingsComplete`

- English: "Backup saved: {{filename}}."
- Namespace: `settings`
- Appears in: `src/settings/GeneralSettings.tsx`
- UI role: Success status
- Context: Shown after the Back Up Now action succeeds.
- Tone: Brief confirmation
- Placeholders: `{{filename}}` is the generated local backup ZIP filename, including a UTC date/time and serial number.
- Domain notes: The filename is generated by the Rust backend and should not be translated.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.lastBackup`

- English: "Last Backup: {{value}}"
- Namespace: `settings`
- Appears in: `src/settings/GeneralSettings.tsx`
- UI role: Status/help text
- Context: Line shown inside the Auto Backup options in General Settings, below the Auto Backup checkbox and hint.
- Tone: Informational and compact
- Placeholders: `{{value}}` is either a localized date/time string generated by the browser or the localized `settings.lastBackupNever` value.
- Domain notes: Backup refers to local AdminDeck database backup ZIP creation.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.lastBackupNever`

- English: "Never"
- Namespace: `settings`
- Appears in: `src/settings/GeneralSettings.tsx`
- UI role: Status fragment
- Context: Placeholder value inside `settings.lastBackup` when no successful backup timestamp has been recorded yet.
- Tone: Short status value
- Placeholders: None
- Domain notes: Standalone status value for Last Backup.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.importSettings`

- English: "Import"
- Namespace: `settings`
- Appears in: `src/settings/GeneralSettings.tsx`
- UI role: Button label
- Context: Button in General Settings that warns the user, opens a file picker for an AdminDeck backup zip, and replaces the current database with the imported database.
- Tone: Concise command label
- Placeholders: None
- Domain notes: Import replaces the local SQLite database and closes existing live Sessions/Connections in the workspace.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.importSettingsConfirm`

- English: "Importing settings will close all existing Connections and replace the current settings database. Continue?"
- Namespace: `settings`
- Appears in: `src/settings/GeneralSettings.tsx`
- UI role: Confirmation dialog text
- Context: Browser/OS confirmation shown before the import file picker is opened.
- Tone: Clear warning
- Placeholders: None
- Domain notes: `Connections` follows AdminDeck domain language for saved/opened resources.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.importSettingsComplete`

- English: "Settings imported. Previous database backup: {{filename}}."
- Namespace: `settings`
- Appears in: `src/settings/GeneralSettings.tsx`
- UI role: Success status
- Context: Shown after import succeeds and immediate settings state has been refreshed from the imported database.
- Tone: Brief confirmation with recovery detail
- Placeholders: `{{filename}}` is the backup ZIP filename created immediately before replacing the database.
- Domain notes: The backup filename is generated by the Rust backend and is not translated.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.openDatabaseFolder`

- English: "Open Database Folder"
- Namespace: `settings`
- Appears in: `src/settings/GeneralSettings.tsx`
- UI role: Button label
- Context: Button in General Settings that opens the local folder containing `admin-deck.sqlite3` and the backup ZIP directory.
- Tone: Concise command label
- Placeholders: None
- Domain notes: Database Folder refers to the local app data folder, not a remote Connection folder.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.settingsDataActions`

- English: "Settings backup and import actions"
- Namespace: `settings`
- Appears in: `src/settings/GeneralSettings.tsx`
- UI role: ARIA label
- Context: Accessible label for the group containing backup, Import, and Open Database Folder buttons in General Settings.
- Tone: Descriptive accessibility text
- Placeholders: None
- Domain notes: Refers to settings/database file actions, not app navigation.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

### `settings.settingsExportFilter`

- English: "AdminDeck backup"
- Namespace: `settings`
- Appears in: `src/settings/GeneralSettings.tsx`
- UI role: File dialog filter label
- Context: OS open dialog file type label for .zip archives produced by Back Up Now or automatic backups and consumed by Import.
- Tone: Short descriptive label
- Placeholders: None
- Domain notes: AdminDeck is the product name; backup refers to the zipped SQLite database file.
- Translation status: Pending for fr, it, de, es, es-MX, pt-BR, zh-TW, zh-CN, ja, ko, th, id

