# Dashboard Module Architecture

The Dashboard is a built-in Activity Rail Module that presents a dynamic widget grid. Users select from prebuilt widgets, customize them visually, and arrange them on a 12-column drag-and-drop canvas. The AI Assistant can read the current dashboard and create, customize, or remove widgets through atomic Tauri commands.

This document describes the durable architecture. The design decision record for the redesign that introduced this architecture is at `docs/superpowers/specs/2026-05-11-dashboard-redesign-design.md`. When this doc conflicts with `docs/ARCHITECTURE.md`, this doc wins for Dashboard-internal concerns.

## Scope

The Dashboard Module owns:

- The widget grid, drag/resize, and edit mode.
- The widget registry for built-in widget types.
- The persistence of views, widget instances, and AI Created Widget definitions.
- The widget customization surface (preset, accent, icon, title, kind-specific Advanced section).
- The Tauri commands the AI Assistant uses to manipulate the dashboard.
- The page-context payload supplied to the shared AI Assistant panel.

That page-context payload is an AI-facing projection, not a serialization of the Dashboard store. It must remain compact enough for every Assistant request and narrow enough for privacy: active View metadata, Widget Instance placement, AI Created Widget title/summary/category plus body/settings metadata, health errors, compact visual context, and compact library key/global hints. Do not put full `bodyJson`, `settingsSchemaJson`, per-instance `settings_values_json`, generated source code, full library descriptions, or other large catalog blobs in passive context.

It does not own:

- App-wide color schemes (handled by `src/styles/colorSchemes.css` + `AppearanceSettings`).
- Settings export/import shape (handled by `src-tauri/src/storage.rs` general settings flow).
- The App Launcher's entry management (kept inside `src/modules/dashboard/widgets/builtin/app-launcher/`; Dashboard renders App Launcher as a widget but does not own its data model).

## Domain Concepts

**Dashboard View** — a tab in the Dashboard topbar. A user may have many views; the first one is named "Default" and is created on first run. Each view carries its own `grid_density` (`compact` / `default` / `roomy`) and optional `tab_color` preset id, edited from the topbar's edit-mode controls.

**Dashboard Widget Instance** — one placed widget on a view. Carries display state (preset, accent, icon, custom title), layout state (`x`, `y`, `w`, `h` on the 12-column grid), per-instance custom settings values, a `kind` of `builtIn` / `script`, and a `source_id` that resolves either to a built-in registry entry or a `DashboardCustomWidget` row.

**Dashboard AI Created Widget** — a durable script-widget definition authored by the AI Assistant. Stored once; multiple instances can reference the same definition. An AI Created Widget may define a small app-rendered settings schema; each placed instance stores its own values. Secret settings are the exception: the instance stores only a reference and the actual password/API key/token lives in the OS keychain. Deleting an AI Created Widget cascades to its instances (enforced in Rust because SQLite cannot express conditional foreign keys).

AI Created Widget text is UTF-8 end to end. Titles, summaries, labels, placeholders, setting options, `htmlShim`, `bodyJson`, `settingsSchemaJson`, and JavaScript string literals must preserve non-English text as Unicode rather than Latin-1 / Windows-1252 mojibake, percent encoding, base64, HTML entities, or ASCII transliteration. The AI-facing tool descriptions repeat this because widget updates often round-trip existing source.

**Widget Kind** — two values, layered by ownership:

| Kind | Body source | Execution model |
| --- | --- | --- |
| `builtIn` | TypeScript component in `src/modules/dashboard/widgets/` registered in `builtInRegistry.ts` | Normal React render. Current built-ins are App Launcher, Connection, Notes, and AI Coding Usage. |
| `script` | JavaScript source string in `dashboard_custom_widgets.body_json` | Hosted inside an isolated `iframe srcdoc` via `ScriptWidgetHost.tsx`. Has `document`, `fetch`, `setInterval`, and a minimal `KK` postMessage bridge. Permissions (`network`, `pollSeconds`) declared per widget. Fault-isolation boundary — a bad script breaks one widget, not the dashboard. |

**Visual Preset** — one of three framing styles applied per widget instance: `panel`, `ambient`, `hero`. Implemented in `presetRegistry.tsx` as thin CSS-driven chrome wrappers. Each preset reads `--w-accent` and `--w-accent-soft` for the widget's accent color; presets do not encode their own palette. Ambient supports optional frosted-glass background and hides its title bar by default.

**Accent** — a palette name (not a hex), persisted on each instance. Resolved to color values from a shared palette table at render time so future palette tweaks affect all dashboards uniformly.

**Icon** — a lucide icon name from a curated whitelist of ~50 entries in `palette.ts`. The whitelist bounds the visual language and keeps the bundle predictable.

**Widget Archetype** — the AI-facing scaffold family selected before creating an AI Created Widget. The archetype defines the expected chrome, root layout, state handling, library bias, lifecycle, and first-pass grid size. It is not stored as durable Dashboard data; the persisted result remains a script widget plus normal Widget Instance presentation fields.

| Widget Archetype | Use for | Default scaffold |
| --- | --- | --- |
| `dataMonitor` | Web/API/list/status data, freshness-sensitive feeds, health rows, local status snapshots | Ambient or panel surface with compact in-widget provenance, refresh/freshness state, loading, empty, stale, and error states. |
| `metricChart` | Numeric summaries, gauges, charts, meters, timelines, local performance counters | Ambient by default for glanceable metrics; keep a compact in-widget title when the number or chart is ambiguous. |
| `utilityInstrument` | QR, hash, converter, calculator, parser, generator, formatter, encoder/decoder tools | Panel by default. Labels, tabs, validation, units, results, and copy/export affordances are part of the tool surface. |
| `desktopObject` | Clock, dial, note, tuner, tray, scanner, calculator, or other tactile singleton object | Ambient by default. Hide host title chrome; avoid explanatory body text. Optional object state appears as hover/focus reveal or as part of the object. |
| `canvasToyGame` | Small games, physics toys, fidget tools, interactive canvas/SVG/WebGL scenes | Ambient by default. Hide host title chrome; status, score, pause/reset, and controls belong inside the scene as HUD affordances. |
| `generalWorkbench` | Last-resort mixed tools that genuinely do not fit the five primary archetypes | Panel by default with one primary work region. The assistant must prefer a primary archetype unless none fits. |

## AI Visual Selection Rules

The AI Assistant must choose `preset`, `accent_name`, `icon_name`, and grid size as part of widget design, not as arbitrary required fields. Generated widgets should feel like built-in KKTerm surfaces: quiet, dense, desktop-oriented, and consistent with the app's typography and control spacing.

Widget creation follows an OpenDesign-style structure before the assistant calls `dashboard_create_widget`: choose one Widget Archetype, pick a bounded visual direction, plan the artifact, then critique the plan before emitting source. The assistant chooses one internal direction from KKTerm's widget library:

- **Operator console** — dense technical surfaces, terminal-adjacent contrast, grids, meters, log-like rhythm, and restrained signal colors.
- **Data observatory** — charts, gauges, timelines, maps, and numeric hierarchy where the data is the main visual.
- **Desktop object** — a single tactile object such as a clock, dial, calculator, tray, note, scanner, or instrument.
- **Spatial canvas** — canvas/WebGL/SVG-first widgets such as 3D scenes, physics toys, diagrams, weather, maps, or animated monitors.
- **Branded vignette** — image-led or editorial widgets for user-supplied brands, references, places, or media.

Before creation, the assistant should silently preflight the selected Widget Archetype, selected direction, visual metaphor, data hierarchy, library/native rendering choice, preset/accent/icon/grid size, state handling, and motion budget. It should self-critique contrast, hierarchy, density, responsiveness, and motion cost, then revise before the first tool call if the plan would produce low contrast, too much prose, a generic form layout, inner scrollbars, unbounded animation, or a widget that does not look like a finished singleton object.

Preset guidance:

- `panel` — default for Utility Instrument and General Workbench widgets where labels, validation, and controls must be explicit.
- `ambient` — default for Desktop Object and Canvas Toy/Game widgets; also preferred for glanceable Metric/Chart and Data Monitor widgets that render their own compact in-body title/provenance.
- `hero` — rare high-priority summary widgets; avoid for normal utilities.

Accent guidance:

- `blue`, `teal`, `slate`, `emerald`, and `sky` are the normal utility palette.
- `amber` is for warnings, pending state, and attention-needed widgets.
- `red` and `rose` are reserved for destructive, failed, or error-oriented widgets.
- `purple`, `pink`, and `orange` should be used sparingly when the user asks for expressive styling or the widget domain clearly fits.

Script widget UI should use the provided root and compact app-style controls. Do not generate a full HTML document, global reset CSS, external fonts, large decorative headers, marketing copy, gradients, or random color systems. Prefer short labels, stable sizing, aligned inputs/buttons, and the same system font feel as the host app.

Generated widgets must be boundary-aware. The assistant should choose `grid_w` and `grid_h` from the expected content, not from a fixed default: simple timers and counters normally start at 4x3; forms, remote image widgets, and multi-row lists usually need 5x4 or larger. A successful generated widget should not show an inner vertical scrollbar for its intended initial state.

Generated widgets must also treat the widget root as the full allocated surface. Script widgets should make their outermost wrapper fill `100%` width and height, normally through `kk-shell`, `kk-stage`, `kk-panel`, or `kk-fill`, then align, center, or scale any naturally smaller object inside that full-size wrapper. Do not duplicate the host widget frame with a smaller centered app card. Script widgets should avoid `max-width`, fixed-height, or shrink-to-content outer wrappers unless the user explicitly asks for an inset miniature object.

Desktop Object and Canvas Toy/Game archetypes should not render explanatory subtitles inside the widget body. If an object or scene needs labels, they should be object-native or HUD-like: a clock face, a small hover/focus state chip, score/fuel/status chips, or a compact control overlay. Do not add prose that describes what the object or scene is.

Generated widgets must preserve readable contrast. Script widgets should prefer host CSS variables (`--kk-text`, `--kk-muted`, `--kk-surface`, `--kk-accent`) and only override backgrounds when text and control colors remain explicit and legible.

The Assistant page context includes a compact `activeView.visualContext` object so widget authors know whether the active Dashboard background is light, dark, or mixed without carrying a full CSS payload. Script widgets can read the exact runtime token values with `KK.getTheme()` and should use `--kk-readable-surface` / `--kk-readable-surface-text` for text-bearing areas when `requiresOpaqueTextSurface` is true, especially over image, video, or dynamic backgrounds.

If a script widget displays remote images, the assistant must set `permissions.network: true`; otherwise KKTerm's CSP blocks those image requests. Plain `<img src="https://...">` loads do not normally require CORS unless widget code tries to read the image data through canvas/fetch or the remote site blocks hotlinking. Fetching images with `fetch()` is subject to normal browser CORS and may fail even when CSP allows network access.

## Persistence

SQLite holds three Dashboard tables, defined in `src-tauri/src/storage.rs` under `CURRENT_SCHEMA`. Dashboard schema additions that are safe defaults use `ensure_column` during startup so existing local databases keep their saved views/widgets.

| Table | Purpose |
| --- | --- |
| `dashboard_views` | One row per view. Holds `title`, `sort_order`, `grid_density`, and optional `tab_color` preset id. |
| `dashboard_widget_instances` | One row per placed widget. Holds `kind`, `source_id`, presentation fields (`preset`, `accent_name`, `icon_name`, `custom_title`), per-instance `settings_values_json`, and layout (`grid_x`, `grid_y`, `grid_w`, `grid_h`). Secret fields store only `secretRef` metadata here. |
| `dashboard_custom_widgets` | One row per AI Created script-widget definition. Holds `body_json`, validated against the script body schema, plus optional app-rendered `settings_schema_json`. It does not carry a widget kind because all AI Created Widgets are script widgets. |

Indexes: `(view_id, sort_order)` on instances for fast per-view loads.

Cascade rules:

- View delete → instance delete (FK CASCADE).
- AI Created Widget delete → must remove referencing instances first, enforced in Rust. The remove command takes a `forceDeleteInstances` flag; without it, returns a structured error listing affected instances so the user (or AI) can confirm.

## Tauri Command Surface

Each command is a thin handler over the storage layer with up-front validation:

| Command | Notes |
| --- | --- |
| `dashboard_load_state` | AI-facing compact state read; returns Views, Widget Instances, AI Created Widget titles/summaries/categories/body metadata/settings metadata. Does not return script source, `bodyJson`, `settingsSchemaJson`, or per-instance settings values. |
| `dashboard_read_widget_source` | AI-facing scoped source read. Returns full `bodyJson` / `settingsSchemaJson` for one requested AI Created Widget id only, after the assistant has selected it from metadata for checking or editing. |
| `dashboard_create_view` | Returns the new view. |
| `dashboard_update_view` | Patch over `title`, `gridDensity`, `sortOrder`, `background`, and `tabColor`. |
| `dashboard_remove_view` | Cascade to instances. |
| `dashboard_reorder_views` | Single `Vec<String>` of ids. |
| `dashboard_add_instance` | Validates preset/accent/icon/grid bounds. |
| `dashboard_update_instance` | Patch over presentation, per-instance settings values, and layout fields. Secret fields are validated against the AI Created Widget schema so plaintext secrets cannot be persisted in SQLite. |
| `dashboard_read_widget_secret` | Script-widget bridge command. Validates that the requested key is a `secret` field on that exact widget instance and that the instance stores the expected `secretRef`, then reads the OS-keychain `widgetSecret` value. |
| `dashboard_remove_instance` | Hard delete. |
| `dashboard_apply_layout` | Batched layout commit used by the debounced drag/resize pipeline. |
| `dashboard_create_widget` | AI-facing atomic helper: accepts a required `widgetArchetype`, validates a structured `body` and optional `settingsSchema`, creates the AI Created Widget, and places an instance on the supplied selected view. Use this when the user expects a visible widget. Successful assistant tool results are redacted to metadata and instance id; they do not echo full source. |
| `dashboard_create_custom_widget` | Definition-only command; validates `bodyJson` against the script body schema and optional `settingsSchemaJson` but does not place an instance. Successful assistant tool results are redacted to metadata. |
| `dashboard_update_custom_widget` | Validates patched `bodyJson` per kind and patched `settingsSchemaJson`. Successful assistant tool results are redacted to metadata. |
| `dashboard_remove_custom_widget` | Requires `forceDeleteInstances` if instances reference the widget. |

Rust validation invariants:

- `preset` is one of the three known names (`panel`, `ambient`, `hero`).
- `accent_name` is in the palette whitelist.
- `icon_name` is in the lucide icon whitelist.
- Grid bounds: `w ≥ 1`, `h ≥ 1`, `x ≥ 0`, `y ≥ 0`, `x + w ≤ 12`.
- Script source is required and ≤ 64 KB; `pollSeconds ≥ 1`; only declared `permissions` values are accepted.
- Script bodies and settings schemas are UTF-8 JSON strings. Structured `dashboard_create_widget.body` and `dashboard_update_custom_widget.patch.body` are preferred because KKTerm serializes them directly; legacy `bodyJson` / `settingsSchemaJson` submissions must still be valid UTF-8 JSON.
- Settings schemas are bounded JSON objects with up to 20 fields. Supported field types are `text`, `number`, `boolean`, `select`, and `secret`; keys must be stable ASCII identifiers and select fields must declare bounded label/value options.
- Settings schemas use `secret` fields for passwords, API keys, tokens, and similar values. A secret field never has a default value.
- Settings values are per-instance JSON objects capped at 32 KB. For `secret` fields, Rust rejects plaintext values; the only valid stored shape is a `secretRef` whose owner id matches `dashboard-widget-secret:<instanceId>:<fieldKey>`.
- Frontend renderers use the matching TypeScript validator in `src/modules/dashboard/schema.ts` before rendering script widgets, so malformed stored JSON falls back to the existing invalid-body state instead of partially rendering.

Validation failures return structured error text to the AI Assistant so it can self-correct. Successful create/update results intentionally do not replay the widget source into the next model turn; the model already supplied the source as tool arguments, and future inspection should go through `dashboard_read_widget_source` for one selected widget. The Assistant page context tells the model to call `dashboard_create_widget` with the active view id for creation requests; after any dashboard mutating tool completes, the frontend reloads Dashboard state and the newly mounted widget frame runs the canvas fade-in animation.

Duplicate detection must work from metadata. Before creating a new AI Created Widget, the assistant should compare the user's request against existing AI Created Widget `title`, `summary`, `category`, active-on-view state, declared libraries, permissions, lifecycle, source byte count, and settings field metadata. If an existing widget substantially overlaps, it should offer to edit the existing widget, create a separate new one, or place the existing one on the current View. Full source is only read after the user chooses an edit/check path.

Dashboard mutating tools run from the Rust Assistant tool loop, outside the frontend Dashboard store. To keep the live Dashboard view in sync, every successful mutating dashboard tool emits a `dashboard-changed` event. `src/modules/dashboard/state/invalidation.ts` listens once at the app shell and reloads `useDashboardStore`. The streaming `toolCallEnd` refresh remains a useful fallback, but the backend event is the authoritative invalidation path for out-of-band mutations.

The `dashboard_create_widget` assistant tool schema is strict-compatible where possible. It uses a closed root object, a bounded `widgetArchetype` enum, required fields, and closed nested object shapes so capable providers produce structured widget arguments instead of free-form prose or partial JSON. Rust validation remains the final authority before anything is persisted.

The AI-facing widget contract requires the first created widget to be complete for the user's requested outcome. If a request implies live/realtime data, MCP-backed data, web-fetched data, local file/session data, or another changing input, the assistant should use the needed discovery/read/fetch tool rounds before creation and create a script widget wired to the actual data source with loading, error, empty, and refresh states. Explicitly static requests should still become small script widgets that render their content into `#root`; missing credentials should become `settingsSchema` secret/config fields plus a secret-entry request, not a placeholder scaffold.

## Frontend Source Map (Dashboard)

```text
src/modules/dashboard/
  dashboard.css                  ── Dashboard page, widget-grid, preset chrome, and Dashboard widget CSS (imported by src/App.css)
  DashboardPage.tsx              ── shell, topbar, view pills, edit-mode toggle
  motion.tsx                     ── existing centralized motion wrappers
  schema.ts                     ── TypeScript validator for AI Created Widget bodies and settings schemas
  state/
    dashboardStore.ts            ── Zustand store: views, instances, customWidgets, activeViewId, editMode
    persistence.ts               ── typed Tauri command wrappers
  registry/
    builtInRegistry.ts           ── one row per built-in widget; the only place to add new built-ins
    presetRegistry.tsx            ── three preset chrome components (panel, ambient, hero)
    palette.ts                   ── accent palette + ~50-icon whitelist
  view/
    DashboardCanvas.tsx          ── react-grid-layout host
    WidgetFrame.tsx              ── preset chrome + edit-mode controls
    WidgetBody.tsx               ── dispatch by kind (builtIn / script)
  widgets/                       ── built-in body components, one file each
    AppLauncherBody.tsx          ── delegates to src/app-launcher
  script/
    ScriptWidgetHost.tsx
    permissions.ts
  edit/
    CatalogOverlay.tsx
    CustomizePopover.tsx
```

Adding a new built-in widget = drop a `Body` file in `widgets/` and add one entry to `builtInRegistry.ts`. There are no switch statements outside the registries. The registry shape (`BuiltInWidgetEntry`) carries default preset/accent/icon/size + the body component.

State management is Zustand to match the rest of the app (`useWorkspaceStore`). The store exposes a compact read-projection for the AI Assistant's page-context payload. Keep this projection metadata-only and review serialized output when adding fields; it should support duplicate detection and UI-aware answers without carrying full script source or bulky catalogs.

## Grid and Edit Mode

The canvas uses `react-grid-layout` with `WidthProvider`:

- 12 columns, `rowHeight` and `margin` derived from the active view's `grid_density`.
- `compactType: 'vertical'` (widgets fall up to fill gaps).
- `preventCollision: false` (RGL's normal push behavior).
- Drag handle restricted to a `.drag-handle` class on the preset header, so interactive body content remains clickable in edit mode.
- No responsive breakpoint switching — KKTerm is desktop-only.

Edit mode is a single `editMode` boolean on the store. It is toggled by the topbar's "Edit layout" button. In edit mode, the topbar shows a `Compact / Default / Roomy` segmented control bound to the active view's `grid_density`. `Esc` exits edit mode.

Drag and resize commit via a debounced pipeline: local state updates immediately for responsiveness; a single batched `dashboard_apply_layout` Tauri write fires ~300 ms later. Write failures roll back local state and surface in the workspace status bar with a manual retry button.

## Customization Surface

The customize popover is anchored to a widget's settings (⚙) button and contains shared display sections plus a collapsible Advanced section:

1. **Preset** — three chips (`panel`, `ambient`, `hero`), click to apply.
2. **Accent** — palette swatches.
3. **Icon** — scrollable grid of the curated lucide set.
4. **Title** — text input; empty clears the override.
5. **Widget settings** — for AI Created Widgets with `settings_schema_json`, KKTerm renders text, number, boolean, select, and secret fields. Non-secret values are stored on the instance. Secret values are written to the OS keychain under the `widgetSecret` kind and the instance stores only a reference.
6. **Advanced** — kind-specific:
   - `script`: network permission, poll seconds, view source (read-only), reload.
   - `builtIn`: nothing.

The shared display sections render identically regardless of widget kind.

The catalog overlay is a separate modal with search + two source-group tabs: Built-in and AI Created. Widget definitions still carry a `category` field for future category UI, but current browsing is grouped only by shipped built-ins versus AI Created Widgets. There is no user-facing "+ Create AI Created Widget" entry in v1 — AI Created Widget authorship is AI-only.

## Script Widget Host

`ScriptWidgetHost.tsx` renders an `<iframe srcdoc="...">` per script instance, with:

- A `<style>` block carrying compact KKTerm-like text, form-control, button, stack, row, and result defaults so simple generated DOM starts from the app's desktop UI grammar.
- An optional `htmlShim` body markup (default: a single `<div id="root">`). The shim is capped at 128 KB (`MAX_HTML_SHIM_BYTES`) and a token-boundary tag scan rejects `<script>`, `<iframe>`, `<object>`, `<embed>`, and document-shell tags (`<html>`, `<head>`, `<body>`, `<meta>`, `<title>`, `<link>`) at validation time. Runtime CSP remains the real defense; the storage check exists so the AI gets a clean structured error rather than a silent no-op at render time.
- A small host `<script>` that loads the stored source as data. The generated source is never pasted directly into the host script text, because generated snippets commonly contain HTML/script literals such as `</script>` that would prematurely close the host script and render broken JavaScript as widget body text.
- UTF-8 document and script loading metadata. The `srcdoc` document declares `<meta charset="utf-8">`, and injected script/library blobs use `text/javascript;charset=utf-8` so non-English widget text survives the render path unchanged.
- Renderer guardrails inside the iframe: `requestAnimationFrame` callbacks default to a 16 ms floor and honor `body.lifecycle.minTickMs` with the same 16 ms lower bound so animation widgets can target 60 fps on capable hardware. Tiny `setInterval` delays are clamped, and timer/animation work pauses while the host marks the widget invisible. Scripts can read the current state with `KK.isVisible()` and subscribe with `KK.onVisibilityChange(callback)` to restart paused animation when visibility returns. This protects the shared WebView2 renderer from a single AI-authored widget with an overly aggressive loop.
- A per-instance settings snapshot loaded through `KK.getSettings()`. Scripts can persist small non-secret user options with `KK.setSetting(key, value)` or replace the object with `KK.setSettings(nextSettings)`.
- A viewport helper for canvas/WebGL widgets: `KK.getViewport()` returns `{ width, height, dpr }` measured from the script root, and `KK.onViewportResize(callback)` calls back with the same shape when the widget body changes size.
- A small app-owned CSS primitive set for generated UI: `kk-shell`, `kk-toolbar`, `kk-cluster`, `kk-title`, `kk-subtitle`, `kk-muted`, `kk-panel`, `kk-card`, `kk-grid`, `kk-stat`, `kk-stat-value`, `kk-stat-label`, `kk-pill`, `kk-badge`, `kk-stage`, and `kk-fill`. These are the default building blocks for polished script widgets; they avoid pulling a third-party UI framework into every iframe.
- A secret bridge exposed as `await KK.getSecret(fieldKey)`. The parent frame validates the field against the AI Created Widget schema and instance `secretRef` before asking Rust to read the OS keychain.
- Parent-side bridge throttling for expensive widget messages such as settings writes, secret reads, local file dialogs, MCP calls, context menus, and local performance counter reads. Script authors should still poll modestly; the throttle is a renderer-protection backstop, not a scheduling API.

The iframe is a **fault-isolation** boundary, not a security boundary. KKTerm is MIT and single-user; the iframe exists so a typo in one script widget cannot crash the dashboard, and so future Tauri-command exposure (a postMessage bridge) is a deliberate per-handler decision rather than an accidental global.

When debugging script-widget rendering, verify the behavior in a rendered iframe, not only by inspecting source or string-based tests. Animation, transparency, sizing, and visibility bugs depend on browser/WebView2 scheduling and paint behavior; use the debug browser or real Tauri runtime with live `requestAnimationFrame`, timer, and visibility counters before calling the issue fixed. See `docs/ADR/0006-dashboard-script-widget-hardening.md` for the frozen-clock regression note.

Declared permissions:

- `permissions.network: false` → CSP blocks `connect-src`; `fetch`, XHR, and WebSocket all fail.
- `permissions.network: false` → external images are blocked; only `data:` and `blob:` images may load.
- `permissions.network: true` → `connect-src *` is permitted and `http:` / `https:` images may load.
- `permissions.network: true` does **not** permit external scripts. Script widgets may run their own source plus KKTerm's curated bundled libraries only; runtime CDN script injection stays blocked by CSP so generated widgets cannot bypass the local library catalog.
- `permissions.pollSeconds` → informational; the script self-schedules. The host may enforce a minimum floor in a follow-up.

External website links must leave the widget iframe. The host script intercepts absolute `http:` / `https:` anchor clicks and sends an `openExternalUrl` bridge message to the parent, where `ScriptWidgetHost.tsx` validates the URL and calls Tauri's opener plugin. Script widgets may also call `KK.openExternal(url)` directly. This avoids navigating third-party sites inside a sandboxed `srcdoc` iframe with an opaque origin, which can produce site errors such as unknown/null origin headers.

The bridge exposes `KK.openExternal(url)`, `KK.getSettings()`, `KK.setSetting(key, value)`, `KK.setSettings(nextSettings)`, `KK.getViewport()`, `KK.onViewportResize(callback)`, `KK.getSecret(key)`, `KK.requestPermission(name)`, `KK.postMessage(payload)`, `KK.readLocalFile(options?)`, `KK.saveFile(filename, bytes, filters?)`, and `KK.onFileDrop(target, callback, options?)` at the iframe globals. Future Tauri command access is added by extending this bridge with explicit handlers — not by widening the iframe surface.

File I/O bridge methods:

- `KK.readLocalFile({ filters? })` — opens a native file-picker dialog and resolves to `{ name, bytes: Uint8Array, path }`, or `null` if the user cancels. Rate-limited to one open dialog per second.
- `KK.saveFile(filename, bytes, filters?)` — opens a native save dialog and writes `bytes` (Uint8Array or ArrayBuffer) to the chosen path. Resolves to the chosen path string or `null` on cancel. Rate-limited to one save dialog per second.
- `KK.onFileDrop(target, callback, options?)` — registers HTML5 drag-and-drop listeners on `target` (a CSS selector string or DOM element inside the widget). When the user drops files or folders from Windows Explorer onto the target, `callback(items, event)` is called with an array of `{ kind: 'file'|'directory'|'unknown', name, path, bytes?, children? }` entries. Folders are walked recursively. Passes `options.hoverClass` (default `'is-drop-target'`) as the class toggled on the element during hover. Returns a cleanup function. Use this for widgets that accept file drag-and-drop from the OS.

### Script Widget Libraries

Curated local libraries are registered in `src/modules/dashboard/script/widgetLibraries.ts` and requested by AI Created scripts through `body.libraries`. The script host loads every requested library before running widget source, so generated code must declare libraries it uses instead of assuming globals already exist.

Matter.js is the default 2D physics building block for script widgets. It is registered under the `matter` library key, exposes the `Matter` global, and should be used for widget-sized games, physics toys, collision, gravity, rigid bodies, and constraints instead of custom per-widget physics loops. Matter.js widgets should size their canvas from `KK.getViewport()`, update renderer bounds and static wall/floor bodies on `KK.onViewportResize`, keep all bodies bounded to the widget arena, and stop runners or animation loops when gameplay is paused, finished, or otherwise inactive.

Unused library declarations are invalid at storage validation time: a key in `body.libraries` must correspond to a referenced documented global in the script source. The "referenced" check is an AST identifier scan (`oxc_parser` + `IdentifierCollector`), not a text match — so a library referenced only inside a template-literal `${...}` interpolation still counts as used, and a string or comment that names the global does not. The AI tool boundary may sanitize structured assistant submissions by dropping unused declarations before validation, because a model can over-declare helpers such as `dayjs` while using native APIs. Keep that sanitizer narrow to `dashboard_create_widget` / structured `dashboard_update_custom_widget.patch.body`; do not relax the Rust storage validator or paper over the failure with UI error boundaries.

Script bodies may also declare an optional `lifecycle: { kind, minTickMs? }` field, where `kind` is one of `static`, `periodic`, `animation`, `realtime`. Absent or null is treated as `static` so legacy widgets keep working. `minTickMs` controls the iframe rAF guardrail and is clamped to at least 16 ms at render time. Today only `animation` carries a host-side invariant: the iframe's rAF pump emits a throttled `kk.motionTick` heartbeat (~2 Hz), and `ScriptWidgetHost` flips the widget's runtime health to `stalled` if 8 s pass without a tick while the widget is visible. The other kinds are accepted but reserved for future invariants. See `docs/ADR/0006-dashboard-script-widget-hardening.md` §4 for the threshold rationale.

When adding or renaming a script-widget library:

- Add the npm package dependency if the library is not already present.
- Add the registry entry in `src/modules/dashboard/script/widgetLibraries.ts` with a stable key, global name, description, and loader.
- Add the same key to `dashboard_widget_library_keys()` in `src-tauri/src/ai.rs` so `dashboard_create_widget` and `dashboard_update_custom_widget` expose the key to the AI Assistant tool schema.
- If old generated widgets may already reference the global without `body.libraries`, add a narrow legacy inference pattern in `resolveWidgetLibraryKeys`.
- Run `node --test tests/dashboard-script-srcdoc.test.mjs`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml dashboard_widget_tool_schema_exposes_script_libraries`. `npm run build` is the check that proves the registered loader and package dependency can actually bundle.

### Finding: Broken Script HTML

The original script host pasted AI-generated `source` directly inside the host `<script>` block. That made generated snippets fragile: a common string such as `` `<script>...</script>` `` or a full HTML document could close the host script early, leaving the rest of the JavaScript visible as broken widget body text. The fix is to encode source as a JavaScript string literal, escape `<`, and load it through a blob-backed script element. Runtime and unhandled promise errors render into a small `<pre>` inside the iframe instead of replacing the Dashboard surface with raw host code.

## AI Widget Reliability Direction

AI Created Widgets use a single script body shape. The reliable path is bounded script generation:

- The assistant should create complete script widgets for both static and interactive requests. Static text, tables, and summaries should render DOM into `#root` rather than using a separate declarative content kind.
- Generated scripts should prefer KKTerm's iframe CSS primitives and small DOM helpers over full HTML documents, external fonts, global resets, or imported UI frameworks.
- Runtime CDN script injection is blocked by CSP. If a widget needs a curated local library, the assistant must declare it in `body.libraries`.
- Per-instance custom options should use `settingsSchema.fields` rather than model-authored settings UI. KKTerm owns the settings form and stores values in `dashboard_widget_instances.settings_values_json`.
- Sensitive per-instance options must use `settingsSchema.fields[].type = "secret"`. The model must not place passwords, API keys, tokens, or similar values in `defaultValue`, script source, or `settings_values_json`.
- Assistant-facing widget creation schemas should stay strict-compatible where possible: root object, required fields, `additionalProperties: false`, bounded enums, and Rust validation as the final authority.
- The assistant must choose a Widget Archetype before authoring source. `generalWorkbench` is a fallback only; it should not be used when Data Monitor, Metric/Chart, Utility Instrument, Desktop Object, or Canvas Toy/Game fits.

## AI Assistant Integration

Each `dashboard_*` Tauri command is registered as an assistant tool with a JSON schema in the assistant tool registry. Approval gating uses the existing assistant approval flow.

When the Dashboard page is active, `onAssistantContextChange` includes a compact snapshot:

```ts
{
  page: "dashboard",
  activeView: { id, title, gridDensity },
  instances: [{ id, kind, sourceId, customTitle, preset, x, y, w, h }],
  customWidgets: [{ id, title }],
  unhealthyInstances: [{ id, kind, sourceId, state, error? }],
}
```

The AI sees the current dashboard without an extra tool call. `unhealthyInstances` carries any script widget whose runtime `state` is `error`, `timeout`, or `stalled` — surfaced by `ScriptWidgetHost`'s smoke-test + motion-watchdog signals (`kk.ready`, `kk.runtimeError`, `kk.motionTick`). This closes the feedback loop: the assistant notices a widget it just authored has silently failed to mount, thrown at runtime, or stalled its animation, and can offer to fix it inside the same turn rather than waiting for the user to scroll over.

Validation errors from Rust come back as structured `{ ok: false, reason, details }` shapes so the AI can self-correct on retry. For script bodies, syntactic errors include the parser's line and column mapped back to widget-source coordinates (the synthetic `(function(){ ... })()` wrapper line is subtracted).

AI Assistant UX polish around widget authorship (prompt tuning, suggestion affordances, preview-before-commit, conversational diffs) is a follow-up and not part of this architecture.

## Theming

Dashboard chrome reads existing app CSS variables only (`var(--app-bg)`, `var(--surface)`, `var(--text)`, `var(--border)`, etc.) — no hardcoded colors. The topbar's bottom-fade tint comes from a `--scheme-tint-soft` style variable derived from the active scheme; widgets accent independently via inline `--w-accent` / `--w-accent-soft` set on the widget root.

A purple widget stays purple regardless of the active color scheme. A change of color scheme only repaints chrome, not widget bodies.

Secret widget settings are also visible from Settings → Credentials. That unified credentials page lists widget secret references alongside Connection passwords, website credentials, and AI provider keys. Deleting a widget secret there removes the OS-keychain value and clears the widget instance `secretRef`.

### Per-View Backgrounds

Each Dashboard View carries an optional background, stored as a nullable `background_json` column on `dashboard_views` (`NULL` = theme default). Right-clicking empty canvas space opens a native context menu with "Change Background…", which opens the app-owned `BackgroundPopover`. Four modes:

- **Theme Default** — `NULL`; the canvas uses the active color scheme's `--app-bg`.
- **Color & Gradient** — `{ kind: "preset", preset }` referencing one of the 16 fixed entries in `src/modules/dashboard/registry/backgroundPresets.ts` (whitelisted in Rust as `BACKGROUND_PRESET_IDS`).
- **Image** — `{ kind: "image", file, fit, dim }`. The image file is copied into a `backgrounds/` folder next to the executable (mirroring custom fonts) and referenced by filename. `fit` is one of fill/fit/stretch/tile/center; `dim` is a signed −100..100 value (negative darkens, positive lightens). Unreferenced image files are swept after view-mutating commands by `prune_unreferenced_backgrounds`.
- **Dynamic** — `{ kind: "dynamic", dynamic }` referencing one of the local HTML5 animation backgrounds in `src/modules/dashboard/registry/dynamicBackgrounds.tsx` (whitelisted in Rust as `DYNAMIC_BACKGROUND_IDS`). Dynamic backgrounds are app-owned React/canvas/CSS animations, not script widgets and not persisted code.

The background renders on a dedicated layer behind the widget grid and does not affect the topbar or widget chrome. A missing image file, unknown dynamic id, or unparseable `background_json` falls back to theme default rather than erroring.

Background image files are **not** included in the settings export ZIP — an imported database may reference a missing image, which is handled by the theme-default fallback.

## Settings → Dashboard

A `dashboard-settings` section under Settings holds cross-widget app preferences:

- Confirm before removing a widget (default on; persisted under `dashboard.confirmRemove`).
- Default landing view (default `lastActive`; persisted under `dashboard.defaultLandingView`).

Grid density and View tab gradient are **not** in Settings — they are per-view settings edited from the edit-mode topbar.

## i18n

All new strings route through `t()` in the `dashboard.*` namespace. English (`src/i18n/locales/en.json`) is the source of truth and the only locale updated alongside Dashboard changes; other locales are tracked per key under `docs/localization_todo/<namespace>.<keyPath>.md` per the i18n rules in `docs/ARCHITECTURE.md` and `docs/manual/16-localization.md`. Built-in widget titles use `titleKey`; AI Created Widget titles are not translated and are persisted in the language the AI used.

## Relationships to Other Modules and Source Areas

- **App Launcher** (`src/modules/dashboard/widgets/builtin/app-launcher/`) — rendered as a `builtIn` widget. Its data model and management UI stay inside `src/modules/dashboard/widgets/builtin/app-launcher/`; the Dashboard widget is a thin host.
- **AI Assistant** (`src/ai/`) — consumes the Dashboard page-context payload and issues Tauri commands via registered tools.
- **Settings** (`src/modules/settings/`) — adds a Dashboard section for cross-widget app preferences.
- **Activity Rail** (`src/app/ActivityRail.tsx`) — Dashboard is a peer top-level entry alongside Workspace. App Launcher is intentionally not a rail entry.
- **Status Bar** (`src/modules/workspace/StatusBar.tsx`) — receives transient dashboard status messages via `showStatusBarNotice` for layout-save failures and similar feedback.
