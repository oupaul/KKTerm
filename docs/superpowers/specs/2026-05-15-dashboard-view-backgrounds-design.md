# Dashboard View Backgrounds — Design

Date: 2026-05-15
Status: Approved for planning

## Summary

Let users set a custom background per Dashboard View. Right-clicking empty space on the
Dashboard canvas opens a native context menu with a single "Change Background…" command,
which opens an app-owned popover offering three modes:

1. **Theme Default** — use the active color scheme's background (current behavior).
2. **Color & Gradient** — a fixed set of 16 subtle predefined backgrounds (8 solid colors,
   8 gradients).
3. **Image** — a user-chosen image file with a Fit mode (Fill / Fit / Stretch / Tile /
   Center) and a two-way Dim/Lighten slider.

The background is durable and saved with each View; it overrides the color-scheme default
for that View's canvas only.

## Goals

- Per-View, durable custom background stored in SQLite.
- Three background modes: theme default, predefined preset, custom image.
- Predefined set is a fixed list (does not adapt to the active color scheme).
- Custom images stored as files on disk, referenced by filename.
- Two-way Dim/Lighten slider for custom images.
- Live-apply: the canvas updates as the user changes options.

## Non-Goals (YAGNI)

- Including background image files in the settings export ZIP.
- Per-widget backgrounds.
- Blur, opacity, or effects beyond the Dim/Lighten slider.
- Animated or video backgrounds.
- AI Assistant control of View backgrounds (it is a personalization preference, not
  dashboard content, so it stays out of the `dashboard_*` tool surface).
- Background covering the topbar — scope is the canvas area only.

## Data Model

A View's background is stored in one new nullable `background_json` TEXT column on the
`dashboard_views` table, added via the existing `ensure_column` startup migration pattern.
`NULL` means **Theme Default**, so existing View rows need no backfill.

The JSON value is a discriminated union, mirrored in TypeScript (`src/dashboard/types.ts`)
and Rust:

```ts
type DashboardBackground =
  | { kind: "preset"; preset: string }              // preset id, e.g. "mist" or "g-dawn"
  | { kind: "image"; file: string; fit: BackgroundFit; dim: number };
// a NULL column => Theme Default (no explicit variant)

type BackgroundFit = "fill" | "fit" | "stretch" | "tile" | "center";
// dim: integer in -100..100. 0 = none, < 0 = darken, > 0 = lighten.
```

`NULL` is used for Theme Default (instead of an explicit `{ kind: "themeDefault" }`)
so the migration is zero-cost and "reset to default" is a simple `NULL` write.

## Storage Layer (Rust)

### Backgrounds folder

A `backgrounds/` folder located next to the app executable, mirroring
`custom_fonts_folder()` in `src-tauri/src/lib.rs`.

### New Tauri commands

- `dashboard_pick_background_image()` — opens the native file dialog filtered to image
  types (`png`, `jpg`, `jpeg`, `webp`, `gif`, `bmp`), copies the chosen file into
  `backgrounds/` under a content-hashed filename (so re-picking the same image dedupes),
  and returns the stored filename. Only the filename is persisted in `background_json`.
- `dashboard_load_background_image(file)` — validates `file` resolves inside `backgrounds/`
  using the same `canonicalize` + `starts_with` guard as `load_custom_font_data_sync`,
  then returns the image as a base64 data URL for use in CSS.

### View column wiring

`background_json` is added to:

- The `DashboardView` struct in `dashboard_storage.rs` and its `SELECT` / `UPDATE`
  statements.
- The `ViewPatch` type, so `dashboard_update_view` can set or clear it.
- Rust-side validation in `dashboard_validation.rs`: known `kind`; `fit` in the
  five-value enum; `dim` an integer in `-100..=100`; `preset` in the known-preset id
  whitelist; `file` a bare filename with no path separators.

### Orphan cleanup

- When a View's background image is replaced or the View switches away from an image
  background, the previous file is removed from `backgrounds/` if no other View row
  references it.
- When a View is deleted, its background image is removed if unreferenced.
- `dashboard_reset` clears the `backgrounds/` folder along with wiping View rows.

## Frontend

### Preset registry

New `src/dashboard/registry/backgroundPresets.ts`: a frozen list of 16 entries shaped
`{ id, labelKey, css }`, where `css` is the literal CSS `background` value (a solid hex
or a `linear-gradient(...)`). This is the single source of truth shared by the dialog
swatch grid and the canvas renderer; the id list is also mirrored into the Rust
preset whitelist.

The 16 presets are subtle by design so widget chrome stays legible on top — 8 solids
and 8 gradients, including one dark solid and one dark gradient so the set is not
light-only. The fixed list (approved from the companion `palettes.html` mockup):

| id | kind | css |
|---|---|---|
| `mist` | solid | `#eceef1` |
| `sand` | solid | `#f3efe7` |
| `sage` | solid | `#e9efe9` |
| `sky` | solid | `#e8eef3` |
| `blush` | solid | `#f3ecef` |
| `lavender` | solid | `#eceaf2` |
| `slate` | solid | `#e5e8ee` |
| `graphite` | solid | `#2a2e37` |
| `g-dawn` | gradient | `linear-gradient(135deg,#f3efe7,#e8eef3)` |
| `g-fog` | gradient | `linear-gradient(135deg,#eceef1,#dfe3e9)` |
| `g-meadow` | gradient | `linear-gradient(135deg,#eef2ec,#e3ebe6)` |
| `g-dusk` | gradient | `linear-gradient(135deg,#eceaf2,#e5e8ee)` |
| `g-linen` | gradient | `linear-gradient(135deg,#f4f1ea,#ebe7de)` |
| `g-horizon` | gradient | `linear-gradient(135deg,#e8eef3,#f0f2f5)` |
| `g-petal` | gradient | `linear-gradient(135deg,#f3ecef,#ece9f1)` |
| `g-twilight` | gradient | `linear-gradient(135deg,#2c3040,#23262f)` |

The `kind` column above is descriptive only; the registry stores just `id`, `labelKey`,
and `css`.

### Context menu

`DashboardCanvas` adds an `onContextMenu` handler on the grid's empty space. It is
ignored when the event target is inside a widget, and suppressed while the Dashboard is
in edit mode (edit mode owns drag/resize gestures). It opens a native context menu via
`src/lib/nativeContextMenu.ts` with a single item, "Change Background…", which sets
dialog-open state on `DashboardPage`.

### Background popover

New `src/dashboard/edit/BackgroundPopover.tsx` — an app-owned DOM popover styled
consistently with `CustomizePopover`. A segmented three-mode control switches between
Theme Default, Color & Gradient, and Image. Changes live-apply through a new
`useDashboardStore` action `setViewBackground(viewId, background)` (which calls
`dashboard_update_view`), so the canvas updates immediately and "Done" simply closes
the popover. Image mode calls `dashboard_pick_background_image` and
`dashboard_load_background_image` for picking and preview.

### Rendering

`DashboardCanvas` resolves the active View's background into inline styles on
`.dw-canvas-scroll`:

- `preset` → `background: <css>` from the preset registry.
- `image` → `background-image: url(<dataUrl>)` plus `background-size` /
  `background-repeat` / `background-position` derived from the fit mode. The
  Dim/Lighten value renders as a `::before` overlay — black for negative values,
  white for positive — at `|dim|%` alpha.
- `NULL` or any load/resolve failure → no override; falls through to the existing
  `var(--app-bg)`.

Fit mode → CSS mapping:

| Fit | CSS |
|---|---|
| Fill | `background-size: cover` |
| Fit | `background-size: contain; background-repeat: no-repeat; background-position: center` |
| Stretch | `background-size: 100% 100%; background-repeat: no-repeat` |
| Tile | `background-repeat: repeat; background-size: auto` |
| Center | `background-size: auto; background-repeat: no-repeat; background-position: center` |

A loaded base64 image is cached in the store keyed by filename so view switches and
re-renders do not re-hit the IPC/disk path on every paint.

## i18n

New keys under the `dashboard.*` namespace in `src/i18n/locales/en.json`: the context
menu item, popover title, the three mode labels, "Choose Image…", "Remove", "Fit" plus
the five fit-mode labels, "Dim / Lighten" plus the slider end-labels, and the 16 preset
names. English is implemented first; every new key gets a
`docs/localization_todo/dashboard.<keyPath>.md` file per the AGENTS.md i18n rules.

## Edge Cases

- **Missing image file** (e.g. an imported database referencing a file not present in
  `backgrounds/`): the renderer silently falls back to Theme Default; it does not error
  the canvas. The renderer is defensive on reads because `background_json` can arrive
  from a database written by a different or older KKTerm build.
- **Right-click target**: ignored over widgets and while in edit mode.
- **Unknown preset id or malformed `background_json`**: treated as Theme Default. Rust
  validation rejects such writes; the renderer is defensive on reads.
- **View deletion / background change**: triggers orphan cleanup of unreferenced image
  files.
- **Reset Dashboard**: already wipes View rows; `dashboard_reset` additionally clears
  the `backgrounds/` folder.

## Affected Files

- `src-tauri/src/storage.rs` — `background_json` column + `ensure_column` migration.
- `src-tauri/src/dashboard_storage.rs` — `DashboardView` struct, SELECT/UPDATE, orphan
  cleanup on view delete.
- `src-tauri/src/dashboard_validation.rs` — background JSON validation.
- `src-tauri/src/dashboard_commands.rs` — `ViewPatch` wiring; `dashboard_pick_background_image`,
  `dashboard_load_background_image`.
- `src-tauri/src/lib.rs` — `backgrounds_folder()` helper; command registration.
- `src/dashboard/types.ts` — `DashboardBackground`, `BackgroundFit`, `ViewPatch` field.
- `src/dashboard/registry/backgroundPresets.ts` — new preset registry.
- `src/dashboard/state/dashboardStore.ts` — `setViewBackground` action, image cache.
- `src/dashboard/state/persistence.ts` — typed wrappers for the new commands +
  browser-preview fallbacks.
- `src/dashboard/view/DashboardCanvas.tsx` — context menu trigger, background rendering.
- `src/dashboard/DashboardPage.tsx` — popover open state + mount.
- `src/dashboard/edit/BackgroundPopover.tsx` — new popover component.
- `src/dashboard/dashboard.css` — canvas background + dim overlay styles.
- `src/i18n/locales/en.json` + `docs/localization_todo/` — new keys.
- `docs/DASHBOARD.md` — document the per-View background feature.
