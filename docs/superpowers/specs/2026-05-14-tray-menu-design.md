# Tray Icon Menu & Minimize-to-Tray Default — Design

Date: 2026-05-14

## Goal

1. Make minimize-to-tray ON by default for new installs.
2. Give the tray icon a right-click menu: the 3 most recent connections, a "Don't Sleep" toggle (checked when enabled), and "Exit" (quits the app completely).

## Context

- Tray lives in `src-tauri/src/app_tray.rs`. It currently has **no menu** — left-click restores the window; that is all.
- `minimizeToTray` is a persisted `GeneralSettings` field, defaulting to `false` in `src/app-defaults.ts`.
- "Don't Sleep" already exists as a backend feature: `power::DontSleepManager` with the `get_dont_sleep_enabled` / `set_dont_sleep_enabled` commands. It is also toggled from the Status Bar (`src/workspace/StatusBar.tsx`).
- Recent connections live in **frontend localStorage** (`kkterm.recentConnectionIds`), resolved to names against the connection tree in `ConnectionSidebar.tsx`. The Rust tray has no access to connection names or recency.
- `store.ts openConnection()` already dedupes: if `tab-${connection.id}` exists it focuses that tab, otherwise it creates a new one.
- Tray menus are built in Rust, which has no i18n. All translated strings are owned by the frontend.

## Approach

**Frontend pushes a fully-localized menu snapshot to the backend.** A typed Tauri command receives everything the tray needs to render; the backend renders exactly what it is given. This respects the i18n rule (all user-visible strings go through `t()`), keeps recency as frontend workspace state (not the durable Connection model), and follows existing typed-wrapper + event patterns.

Rejected alternatives:
- Moving recency tracking into the backend/SQLite — recency is workspace UI state, and AGENTS.md says not to push UI state into the durable model.
- Lazy menu build on right-click — still needs the frontend push, so it collapses into the chosen approach.

## Components

### 1. Minimize-to-tray default

Flip `minimizeToTray` to `true` in `src/app-defaults.ts`. Scope: **new installs only** — existing users keep whatever they previously saved. No migration.

### 2. Tray menu (Rust, `app_tray.rs`)

- `TrayState` gains a `Mutex` holding the last pushed snapshot: recent connections (`Vec<{id, label}>`), localized labels for "Don't Sleep" and "Exit", and the current Don't Sleep flag.
- A `rebuild_menu` helper constructs the menu:
  - Up to 3 recent connection `MenuItem`s (omitted entirely when the list is empty).
  - Separator (only when recent items exist).
  - A `CheckMenuItem` for "Don't Sleep", checked when enabled.
  - Separator.
  - "Exit".
- Left-click still restores the window. Right-click shows this menu.
- The menu is applied via the tray icon's `set_menu`.

### 3. New Tauri command `update_tray_menu`

- Typed wrapper added in `src/lib/tauri.ts`.
- Payload: recent connections (`{id, label}` array, already sliced to 3), localized "Don't Sleep" and "Exit" strings, current Don't Sleep enabled flag.
- Backend stores the snapshot in `TrayState` and calls `rebuild_menu`.
- Called by the frontend on: app startup, language change, and whenever the recent-connection list changes.

### 4. Menu actions (Rust → frontend via Tauri events)

- **Recent connection item** → backend emits `kkterm://tray-open-connection` with the connection id. An app-shell effect in `src/app/` listens, resolves the id against the connection tree, calls `openConnection` (which focuses an existing tab or opens a new one), and restores the window.
- **"Don't Sleep"** → backend calls the existing `DontSleepManager`, rebuilds the menu with the new check state, and emits `kkterm://dont-sleep-changed`. `StatusBar.tsx`'s Don't Sleep button listens and updates its local state. The status-bar button's own toggle also emits `kkterm://dont-sleep-changed` so the tray menu stays in sync (the frontend re-pushes the snapshot via `update_tray_menu`).
- **"Exit"** → `app.exit(0)`. Quits immediately, no confirmation — consistent with KKTerm keeping the close path native and unhooked.

### 5. i18n

New keys under the `app` namespace in `src/i18n/locales/en.json`:
- `app.trayDontSleep` — "Don't Sleep"
- `app.trayExit` — "Exit"

Add matching `docs/localization_todo/app.trayDontSleep.md` and `docs/localization_todo/app.trayExit.md` stubs from `_TEMPLATE.md`. Recent-connection labels are connection names and are not translated.

## Data flow

```
recent list / language change (frontend)
   -> update_tray_menu command (typed wrapper)
   -> TrayState snapshot updated -> rebuild_menu -> set_menu

right-click tray -> menu
   recent item -> emit kkterm://tray-open-connection {id}
                  -> app-shell listener -> openConnection + restore window
   Don't Sleep  -> DontSleepManager toggle -> rebuild_menu
                  -> emit kkterm://dont-sleep-changed -> StatusBar syncs
   Exit         -> app.exit(0)

StatusBar Don't Sleep button toggle
   -> set_dont_sleep_enabled + emit kkterm://dont-sleep-changed
   -> frontend re-pushes update_tray_menu so tray check stays in sync
```

## Error handling

- `update_tray_menu` is best-effort: a failure to rebuild the menu logs to stderr (matching the existing `app_tray::install` error path) and does not surface to the user.
- The tray-open-connection listener silently no-ops if the id no longer resolves to a connection (it may have been deleted).
- Non-Windows: Don't Sleep already errors gracefully via `DontSleepManager`; the tray menu still renders and the toggle surfaces the existing error path.

## Testing

- `cargo test` for any pure Rust helpers (e.g. snapshot construction).
- Manual smoke test in the real Tauri runtime (`npm run tauri dev`), per AGENTS.md native-verification rule:
  - Right-click tray shows recent connections, Don't Sleep (with correct check state), Exit.
  - Clicking a recent connection restores the window and opens/focuses the session.
  - Toggling Don't Sleep from the tray updates the Status Bar button, and vice versa.
  - Exit quits the app completely.
  - Fresh install defaults minimize-to-tray ON; existing settings unchanged.
