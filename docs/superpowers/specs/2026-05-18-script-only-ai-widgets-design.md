# Script-Only AI Created Widgets Design

## Context

KKTerm is not publicly released, so Dashboard widget storage does not need a compatibility path for existing `content` AI Created Widgets. The current dual-kind AI widget model makes the assistant choose between static declarative content and script widgets. In practice, static content widgets are not useful enough to justify the schema branches, prompt text, renderer, and validation surface they add.

## Decision

AI Created Widgets become script-only. Built-in widgets remain app-owned React components and are not AI-creatable. The Dashboard domain model keeps two placed Widget Instance kinds: `builtIn` and `script`. The custom widget definition table no longer carries a custom kind because all custom definitions are script widgets.

The implementation removes the `content` renderer, content body validation, content branches in assistant tool schemas, and documentation that presents content widgets as an authoring option.

## Architecture

Frontend types change from `WidgetKind = "builtIn" | "content" | "script"` to `WidgetKind = "builtIn" | "script"`. The separate `WidgetCustomKind` type is removed because a Dashboard AI Created Widget no longer has a kind field.

`WidgetBody` dispatches only built-ins and script widgets. The content renderer source file is deleted. The customize popover no longer exposes a content-specific advanced section. Dashboard catalog and state projections continue to list AI Created Widgets, but all of them are script definitions and custom widget records do not expose a `kind` field.

Rust validation changes `validate_kind` to allow `builtIn` and `script`. Content body structs and validators are removed. Custom widget body validation directly validates the script body schema. Storage tests and schemas are updated to use script examples and remove `dashboard_custom_widgets.kind`. SQLite schema checks are updated because local compatibility is not required.

Assistant tool schemas remove content body branches. `dashboard_create_widget` and `dashboard_create_custom_widget` accept script bodies directly and do not ask the model for a custom widget kind.

## AI Contract

The assistant should always create a complete script widget for widget requests. Static requests still become script widgets, using simple DOM rendering inside `#root`, app CSS primitives, and optional settings schema fields when user customization is useful.

The prompt must stop saying to prefer content widgets. It should instead emphasize:

- Mount from `#root` with app-style classes.
- Use bundled local `body.libraries` for known domains.
- Use `permissions.network=true` only for remote data or images.
- Do not use runtime CDN scripts; CSP blocks external scripts.
- Include loading, error, empty, and refresh states for live data.
- Use `settingsSchema` plus `request_secret_entry` for secrets.

## Error Handling

Script validation remains the storage boundary. Existing script validation for size, permissions, library keys, unused libraries, DOM mount checks, and obvious infinite loops stays in place.

If a local database still contains `content` rows, this change may make Dashboard load or render fail. That is acceptable for the unreleased app. Manual reset via Settings or deleting local app data is the recovery path.

## Documentation

Update `CONTEXT.md`, `docs/DASHBOARD.md`, and `docs/manual/10-dashboard.md` so the product language says AI Created Widgets are script widgets only.

Remove dead i18n keys and locale entries for content-widget invalid-body UI if no code references them after deletion.

## Testing

Run focused frontend checks for Dashboard type/schema changes, then the repo checks required by `AGENTS.md`:

- `npm run check`
- `npm run build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo test --manifest-path src-tauri/Cargo.toml`

Targeted tests should cover the script-only assistant tool schema and Rust storage validation rejecting `content`.
