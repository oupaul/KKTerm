# 17 — Data, Backup, and Secrets

## AI grep hints

- Keys: `settings.exportSettings`, `settings.importSettings`, `settings.importBackupFileHint`, `settings.fullBackupImport`, `settings.includeCredentials`, `settings.includeCredentialsWarning`, `settings.importActionAdd`, `settings.importActionReplace`, `settings.resetAllSettings`, `settings.resetAllSettingsConfirm`, `settings.resetAllSettingsComplete`, `settings.sectionCredentials`, `settings.credentialStorage`, `settings.credentialsStored`, `settings.deleteCredential`
- Topics: SQLite store, OS keychain, encrypted SQLite secret store, settings Import/Export `.kkbackup`, startup backup ZIP snapshots, import / restore, reset all, where my data lives
- Synonyms: "where is my data", "back up settings", "restore", "factory reset", "uninstall", "API key storage", "export connections without passwords", "share connections", "selective backup"

## Storage model

KKTerm is local-first. Two distinct store families:

1. **SQLite** — non-secret durable data. Lives on the user's machine, never sent off-device. Holds Connections, Dashboard Views and Widget Instances, Custom Widgets, Settings rows, and assistant chat history.
2. **Credential backend** — secrets. Holds Connection passwords, URL credentials, AI provider API keys, email API keys / SMTP passwords, widget secrets, MCP server secrets. Windows and macOS default to the OS keystore and may optionally use the encrypted SQLite store. Linux uses the encrypted SQLite store only.

Terminal contents are **not** logged by default. There is no telemetry and no cloud sync.

Do **not** put live session state (open Tabs, focused Pane, in-flight Sessions) into the SQLite Connection model. Live state belongs to the frontend workspace layer.

## Export `.kkbackup`

`settings.exportSettings` opens the category-aware export dialog and produces a `.kkbackup` bundle (a ZIP holding `manifest.json`, `data.json`, and an optional `secrets.enc`). The export dialog offers a switch per segment — `settings.segment_connections`, `settings.segment_workspaces`, `settings.segment_dashboards`, `settings.segment_settings`, `settings.segment_mcpServers`.

## Automatic backup snapshots

Full database snapshot backups may run at:

- App startup (configured).

Automatic backups must **not** run from app-window close.

## Import / restore

`settings.importSettings` opens the backup import dialog. A chosen `.kkbackup` is inspected before applying anything; a chosen full `.zip` backup restores the complete settings database and reloads the app.

## Selective export / import

The Settings data Export button is the selective `.kkbackup` flow; the Settings data Import button accepts both selective `.kkbackup` files and full KKTerm settings backup `.zip` snapshots. The old separate whole-database single-file import/export buttons are no longer shown.

By default the bundle carries **no passwords**, which is the safe way to share Connections with a colleague. Turning on `settings.includeCredentials` (only available when Connections is selected) requires a passphrase; Connection, URL, and SOCKS proxy passwords are then encrypted into `secrets.enc` (Argon2id + AES-256-GCM) and can only be imported by someone who knows the passphrase (`settings.includeCredentialsWarning`). Other secrets — widget secrets, AI/email/MCP keys — are **not** carried.

On import, KKTerm lets the user choose an action per segment present: `settings.importActionSkip`, `settings.importActionAdd` (keep existing items and add the imported ones with fresh ids), or `settings.importActionReplace` (clear that category first). A safety database backup runs before any change (`settings.selectiveImportWarning`); importing the Settings segment reloads the app to re-read preferences. See [docs/ADR/0010-selective-export-import.md](../ADR/0010-selective-export-import.md) for the merge and secret-handling decisions.

## Reset all settings

`settings.resetAllSettings` returns settings to defaults, closes open Sessions, resets saved layouts, clears the saved language override, and removes saved AI/email secrets from the active credential backend. Confirmation `settings.resetAllSettingsConfirm`. Status `settings.resetAllSettingsComplete`. Other stored credentials must be removed individually from Settings → Credentials, or by the user through the selected external backend where applicable.

## Managing credential entries from inside KKTerm

Settings → Credentials (`settings.sectionCredentials`) lists every credential KKTerm has stored, grouped by kind:

- `settings.credentialKindConnectionPassword` — SSH / RDP / VNC / Telnet / FTP passwords, including reusable saved-password credentials selected from Add/Edit Connection.
- `settings.credentialKindUrlPassword` — saved URL Connection credentials.
- `settings.credentialKindAiApiKey` — AI provider keys (stored under `AI_PROVIDER_SECRET_OWNER_ID`).
- `settings.credentialKindEmailApiKey` / `settings.credentialKindEmailSmtpPassword` — Email tool credentials.
- `settings.credentialKindWidgetSecret` — Dashboard Widget Instance secrets.

The secret storage selector (`settings.credentialStorage`) controls which backend KKTerm reads and writes from. Switching stores does not copy existing entries between backends; save a credential again if it should exist in the newly selected store. OS keystore storage relies on the operating system credential manager and signed-in account. The encrypted SQLite backend is cross-platform and unlocks with a master password or the `KKTERM_SECRET_STORE_PASSWORD` launch environment variable, but the user is responsible for protecting the database file, backups, and master password. After setup, KKTerm defers encrypted database unlock on later launches until a feature needs to read a saved secret or the user activates the Status Bar `app.credentialStoreUnlockAction`; `app.credentialStoreLockAction` locks it again for the current app run. If the master password cannot decrypt the existing store, creating a new master password clears the encrypted credential rows saved with the previous password. Each row shows the owner identifier and username (`settings.credentialUsername`), with a single red icon-only trash button (`settings.deleteCredential`, confirmation `settings.deleteCredentialConfirmBody`) and a stored marker `settings.credentialStored`.

## Uninstall behaviour

Uninstalling KKTerm removes the executable. The SQLite database and credential backend entries persist unless the user deletes them explicitly. Reinstalling reuses the same SQLite database file from the same user profile location.

## What is _not_ stored

- Live terminal scrollback (only in-memory until `terminal.saveBuffer` writes it to disk).
- WebView2 cookies and local storage are owned by the system WebView2 user-data folder, which is currently shared across all URL Connections (the `dataPartition` field is persisted but a no-op in Phase 1 — see [08-url-webview.md](08-url-webview.md)).
- Network traffic — KKTerm is a thin frontend on top of OS-level SSH, RDP, VNC, and HTTP stacks.
