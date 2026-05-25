# 17 — Data, Backup, and Secrets

## AI grep hints

- Keys: `settings.exportSettings`, `settings.exportSettingsComplete`, `settings.importSettings`, `settings.importSettingsConfirm`, `settings.importSettingsComplete`, `settings.resetAllSettings`, `settings.resetAllSettingsConfirm`, `settings.resetAllSettingsComplete`, `settings.sectionCredentials`, `settings.credentialsStored`, `settings.deleteCredential`
- Topics: SQLite store, OS keychain, settings export ZIP, startup backups, import / restore, reset all, where my data lives
- Synonyms: "where is my data", "back up settings", "restore", "factory reset", "uninstall", "API key storage"

## Storage model

KKTerm is local-first. Two distinct stores:

1. **SQLite** — non-secret durable data. Lives on the user's machine, never sent off-device. Holds Connections, Dashboard Views and Widget Instances, Custom Widgets, Settings rows, and assistant chat history.
2. **Windows Credential Manager (OS keychain)** — secrets. Holds Connection passwords, URL credentials, AI provider API keys, email API keys / SMTP passwords, widget secrets, MCP server secrets.

Terminal contents are **not** logged by default. There is no telemetry and no cloud sync.

Do **not** put live session state (open Tabs, focused Pane, in-flight Sessions) into the SQLite Connection model. Live state belongs to the frontend workspace layer.

## Export ZIP

`settings.exportSettings` opens a save-file dialog and produces an importable ZIP using the same shape consumed by `settings.importSettings`. The default filename follows the generated backup filename pattern. Status on success: `settings.exportSettingsComplete`.

Backups may run at:

- App startup (configured).

Backups must **not** run from app-window close.

## Import / restore

`settings.importSettings` opens a file picker. The confirmation prompt (`settings.importSettingsConfirm`) names the import as destructive — it replaces current settings and (where the ZIP includes them) Connections and Dashboard state. Status `settings.importSettingsComplete`.

## Reset all settings

`settings.resetAllSettings` returns settings to defaults, closes open Sessions, resets saved layouts, clears the saved language override, and removes saved AI/email secrets. Confirmation `settings.resetAllSettingsConfirm`. Status `settings.resetAllSettingsComplete`. Other OS keychain entries must be removed individually from Settings → Credentials, or by the user via Windows Credential Manager.

## Managing keychain entries from inside KKTerm

Settings → Credentials (`settings.sectionCredentials`) lists every credential KKTerm has stored, grouped by kind:

- `settings.credentialKindConnectionPassword` — SSH / RDP / VNC / Telnet passwords.
- `settings.credentialKindUrlPassword` — saved URL Connection credentials.
- `settings.credentialKindAiApiKey` — AI provider keys (stored under `AI_PROVIDER_SECRET_OWNER_ID`).
- `settings.credentialKindEmailApiKey` / `settings.credentialKindEmailSmtpPassword` — Email tool credentials.
- `settings.credentialKindWidgetSecret` — Dashboard Widget Instance secrets.

Each row shows the owner identifier and username (`settings.credentialUsername`), with a single red icon-only trash button (`settings.deleteCredential`, confirmation `settings.deleteCredentialConfirmBody`) and a stored marker `settings.credentialStored`.

## Uninstall behaviour

Uninstalling KKTerm removes the executable. The SQLite database and OS keychain entries persist unless the user deletes them explicitly. Reinstalling reuses the same SQLite database file from the same user profile location.

## What is _not_ stored

- Live terminal scrollback (only in-memory until `terminal.saveBuffer` writes it to disk).
- WebView2 cookies and local storage are owned by the system WebView2 user-data folder, which is currently shared across all URL Connections (the `dataPartition` field is persisted but a no-op in Phase 1 — see [08-url-webview.md](08-url-webview.md)).
- Network traffic — KKTerm is a thin frontend on top of OS-level SSH, RDP, VNC, and HTTP stacks.
