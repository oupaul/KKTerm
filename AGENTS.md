# Agent Instructions

## Project Shape

AdminDeck is a Windows-first, local-first Tauri v2 desktop app with a Rust backend and React/TypeScript frontend. The product direction lives in `docs/PRD.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, and `docs/ADR/`.

Before changing product behavior or terminology, read `CONTEXT.md` and preserve its domain boundaries.

## Domain Language

- **Connection**: durable, stored in SQLite. Supported kinds are local terminal, SSH terminal, URL (embedded WebView2), RDP, and VNC. SFTP is opened from an SSH Connection.
- **Quick Connect**: creates an unsaved one-off connection draft, then starts a session.
- **Session**: live process/channel/SFTP browser/webview state, not the saved profile itself.
- **Tab**: frontend workspace container, not a backend domain object.

Avoid using "profile" as the canonical name for stored openable resources. Use **Connection**.

## Engineering Defaults

- Prefer existing repo patterns over new abstractions.
- Keep backend data boundaries explicit: SQLite stores non-secret durable data, OS keychain stores secrets, and terminal contents are not logged by default.
- Keep Tauri command calls behind typed frontend wrappers in `src/lib/tauri.ts`.
- Keep the Settings surface in `src/settings/SettingsPage.tsx`; `src/App.tsx` should route to it and bootstrap settings, not own settings form/control code.
- Keep `src/App.tsx` limited to app shell routing, global panel layout, and bootstrap. Put connection-tree work in `src/connections/`, workspace dispatch/status/screenshot work in `src/workspace/`, terminal work in `src/terminal/`, SFTP work in `src/sftp/`, URL WebView work in `src/webview/`, remote desktop work in `src/remote-desktop/`, and assistant UI work in `src/ai/`.
- Do not put live session state into the durable connection model.
- Keep UI state such as tabs and selected panes in the frontend workspace layer unless there is a clear persistence requirement.
- For TSX accessibility attributes, use the typed helpers in `src/lib/aria.ts` for dynamic ARIA values so React emits valid values and source analyzers do not read JSX expressions as literal strings. Match ARIA roles to real children: `role="menu"` should contain menu items, while mixed popovers with forms/inputs should use a dialog-style surface instead.
- Avoid JSX `style=` for UI layout and theming when classes, data attributes, CSS variables, or ref-applied geometry can carry the state. Keep CSS compatibility warnings in mind: add vendor fallbacks where needed and avoid `color-mix()` in shared app CSS unless the target support is intentional.

## Checks

Run the relevant checks before handing work back:

```bash
npm run check
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

If a check cannot be run, explain why in the final response.
