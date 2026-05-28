---
name: dashboard-widget-builder
description: Create, repair, redesign, and troubleshoot KKTerm Dashboard AI Created Widgets, script widgets, widget layout, visual polish, data fetching, secrets, and custom Dashboard views.
---

# Dashboard Widget Builder

Use this skill when the user asks the AI Assistant to create, modify, fix, or improve a Dashboard widget or view.

## Workflow

1. Treat the active Dashboard view as the target unless the user names a different view.
2. Use Dashboard tools instead of describing manual edits when tool access is available.
3. For new user-visible widgets, create a script widget directly with the dashboard widget creation workflow.
4. For broken widgets, load current Dashboard state first, inspect the existing AI Created Widget source, then patch the smallest necessary body fields.
5. Use real data when the user asks for live, current, or external information. Do not ship fake sample data unless the user explicitly asks for a mock.
6. If a widget needs an API key or token, define a secret settings field and request secret entry. Never ask for plaintext secrets in chat.
7. Keep widgets compact, readable, and object-like: meters, clocks, charts, maps, launchers, calculators, consoles, timelines, or focused tools.
8. Use KKTerm widget classes and runtime helpers before inventing a custom UI framework.
9. For canvases and visual libraries, size from the widget viewport and handle resize.

## Visual Defaults

- Prefer dense but calm desktop utility over marketing composition.
- Avoid text-only widgets unless the user asked for text output.
- Choose a non-default accent when it clarifies meaning.
- Avoid inner scrollbars in the initial layout.
- Use loading, error, empty, and refresh states when data can fail or change.

## KKTerm Boundaries

- All AI Created Widgets are script widgets.
- Runtime CDN scripts are blocked; use curated local libraries when available.
- Secret values are stored outside SQLite.
- Generated widgets must fit inside their assigned Dashboard grid bounds.

## File I/O

Use these KK bridge methods for any widget that reads or writes local files:

- **Drag-and-drop from Explorer**: `KK.onFileDrop(target, callback, options?)` — attach to a drop-zone element. Callback receives `(items, event)` where each item is `{ kind, name, path, bytes?, children? }`. Returns a cleanup function. Add a visual `hoverClass` via `options.hoverClass` (default `'is-drop-target'`).
- **File picker (read)**: `KK.readLocalFile({ filters? })` — opens a native open dialog; resolves to `{ name, bytes, path }` or `null` on cancel.
- **File picker (save)**: `KK.saveFile(filename, bytes, filters?)` — opens a native save dialog and writes bytes; resolves to the saved path or `null` on cancel.

Do not use raw `dragover`/`drop` DOM events for OS file drops — always go through `KK.onFileDrop` so the widget code follows the established bridge pattern.
