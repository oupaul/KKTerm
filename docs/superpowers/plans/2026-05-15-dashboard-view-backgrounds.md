# Dashboard View Backgrounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users set a durable per-Dashboard-View background (theme default, a predefined color/gradient, or a custom image with fit + dim) via a right-click "Change Background…" command.

**Architecture:** A nullable `background_json` column on `dashboard_views` stores a discriminated-union background (`NULL` = theme default). Rust owns serialization of a typed `DashboardBackground` enum and validates it. Custom images are copied into a `backgrounds/` folder next to the executable (mirroring the existing custom-fonts pattern) and referenced by filename; orphaned files are swept after view mutations. The frontend renders the background on a dedicated absolutely-positioned layer behind the widget grid, and a native context menu opens an app-owned DOM popover for editing.

**Tech Stack:** Rust (rusqlite, serde, Tauri v2 commands), React + TypeScript, Zustand, `react-grid-layout`, i18next.

---

## Reference Patterns (read before starting)

- **Custom fonts** in `src-tauri/src/lib.rs` (lines ~107–222): `custom_fonts_folder()`, `list_custom_fonts_sync`, `load_custom_font_data_sync` — the exact pattern for an exe-relative asset folder, the canonicalize + `starts_with` path guard, and base64-over-IPC. The new background commands mirror this.
- **`ensure_column`** in `src-tauri/src/storage.rs` (lines ~1501–1509): how additive schema columns are migrated for existing local databases.
- **`dashboard_storage.rs`**: `DashboardView`, `ViewPatch`, `update_view`, `load_state` — the structs and SQL the background field threads through. `InstancePatch.custom_title: Option<Option<String>>` is the precedent for a patch field that can be explicitly set to NULL.
- **`dashboard_validation.rs`**: `PRESETS` / `validate_preset` and the `ValidationError` enum — the pattern for a whitelist + validator + error variant.
- **`src/lib/nativeContextMenu.ts`** + usage in `src/workspace/ScreenshotMenu.tsx` (line ~108): `showNativeContextMenu(items, { x, y })`.
- **`src/dashboard/edit/CustomizePopover.tsx`**: the app-owned popover pattern (outside-click + Escape close, `anchorRect` positioning, live-apply through store actions).
- **`src/dashboard/registry/palette.ts`**: the registry-array + resolver + type-guard pattern that `backgroundPresets.ts` follows.
- **`src/lib/tauri.ts`** `selectAppLauncherFile` (line ~1606): the `openDialog` file-picker pattern. `CommandMap` (line ~666, dashboard entries ~1482–1553): the typed command registry.

---

## File Structure

**Rust (create):** none.
**Rust (modify):**
- `src-tauri/src/storage.rs` — `background_json` column in `CURRENT_SCHEMA` + `ensure_column` call.
- `src-tauri/src/dashboard_validation.rs` — `DashboardBackground` is *not* here; this file gets `BACKGROUND_PRESET_IDS`, `BACKGROUND_FITS`, `validate_background`, `ValidationError::InvalidBackground`.
- `src-tauri/src/dashboard_storage.rs` — `DashboardBackground` enum, `background` field on `DashboardView`, `background` on `ViewPatch`, SELECT/UPDATE wiring, `referenced_background_image_files`.
- `src-tauri/src/dashboard_commands.rs` — call `crate::prune_unreferenced_backgrounds` after `dashboard_update_view` / `dashboard_remove_view` / `dashboard_reset`.
- `src-tauri/src/lib.rs` — `backgrounds_folder()`, `background_image_entry()`, `dashboard_import_background_image`, `dashboard_load_background_image`, `prune_unreferenced_backgrounds`, command registration.

**Frontend (create):**
- `src/dashboard/registry/backgroundPresets.ts` — the 16-entry preset registry + resolver + type guard.
- `src/dashboard/registry/backgroundPresets.test.ts` — compile-time type-assertion test (this codebase's `.test.ts` files are checked by `tsc`, not a runtime runner).
- `src/dashboard/edit/BackgroundPopover.tsx` — the app-owned background-editing popover.

**Frontend (modify):**
- `src/dashboard/types.ts` — `BackgroundFit`, `DashboardBackground`, `background` on `DashboardView` and `ViewPatch`.
- `src/lib/tauri.ts` — `CommandMap` entries for the two new commands.
- `src/dashboard/state/persistence.ts` — typed wrappers + browser-preview fallbacks.
- `src/dashboard/state/dashboardStore.ts` — `setViewBackground` action, `backgroundImages` cache, `loadBackgroundImage` action.
- `src/dashboard/view/DashboardCanvas.tsx` — background layer rendering + context-menu trigger.
- `src/dashboard/DashboardPage.tsx` — background popover open state + mount.
- `src/dashboard/dashboard.css` — `.dw-canvas-bg` layer, dim `::after`, grid-line refactor onto `.dw-canvas::before`.
- `src/i18n/locales/en.json` — new `dashboard.*` keys.
- `docs/localization_todo/` — one file per new key.
- `docs/DASHBOARD.md` — document the per-View background feature.

---

## Task 1: SQLite `background_json` column + migration

**Files:**
- Modify: `src-tauri/src/storage.rs` (`CREATE TABLE dashboard_views` in `CURRENT_SCHEMA`, ~line 157; `ensure_column` block, ~line 1509)

- [ ] **Step 1: Add the column to the schema definition**

In `src-tauri/src/storage.rs`, change the `dashboard_views` table in `CURRENT_SCHEMA` from:

```sql
CREATE TABLE IF NOT EXISTS dashboard_views (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    grid_density TEXT NOT NULL DEFAULT 'default'
        CHECK (grid_density IN ('compact', 'default', 'roomy'))
);
```

to:

```sql
CREATE TABLE IF NOT EXISTS dashboard_views (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    grid_density TEXT NOT NULL DEFAULT 'default'
        CHECK (grid_density IN ('compact', 'default', 'roomy')),
    background_json TEXT
);
```

- [ ] **Step 2: Add the `ensure_column` migration for existing databases**

In the `ensure_column` block (right after the two existing `dashboard_*` lines, ~line 1509), add:

```rust
ensure_column(&connection, "dashboard_views", "background_json", "TEXT")?;
```

- [ ] **Step 3: Verify it compiles**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: compiles with no errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/storage.rs
git commit -m "feat: add background_json column to dashboard_views"
```

---

## Task 2: Rust `DashboardBackground` type + validation

**Files:**
- Modify: `src-tauri/src/dashboard_storage.rs` (add the `DashboardBackground` enum near the other structs, after `DashboardView` ~line 18)
- Modify: `src-tauri/src/dashboard_validation.rs` (whitelists, `validate_background`, `ValidationError::InvalidBackground`)

> The enum lives in `dashboard_storage.rs` (alongside the other serde row types); the validator lives in `dashboard_validation.rs` (alongside the other validators). `dashboard_validation.rs` already has no dependency on `dashboard_storage.rs`, so `validate_background` takes the parsed parts as primitives to avoid a new cross-module dependency.

- [ ] **Step 1: Write the failing validation tests**

In `src-tauri/src/dashboard_validation.rs`, inside the existing `#[cfg(test)] mod tests`, add:

```rust
#[test]
fn background_preset_known() {
    assert!(validate_background_preset("mist").is_ok());
    assert!(validate_background_preset("g-twilight").is_ok());
}

#[test]
fn background_preset_unknown() {
    assert_eq!(
        validate_background_preset("neon-explosion"),
        Err(ValidationError::InvalidBackground),
    );
}

#[test]
fn background_image_ok() {
    assert!(validate_background_image("bg-abc123.jpg", "fill", 0).is_ok());
    assert!(validate_background_image("bg-abc123.jpg", "center", -100).is_ok());
    assert!(validate_background_image("bg-abc123.jpg", "tile", 100).is_ok());
}

#[test]
fn background_image_rejects_path_separators() {
    assert_eq!(
        validate_background_image("../secret.jpg", "fill", 0),
        Err(ValidationError::InvalidBackground),
    );
    assert_eq!(
        validate_background_image("sub/dir.jpg", "fill", 0),
        Err(ValidationError::InvalidBackground),
    );
    assert_eq!(
        validate_background_image("a\\b.jpg", "fill", 0),
        Err(ValidationError::InvalidBackground),
    );
    assert_eq!(
        validate_background_image("", "fill", 0),
        Err(ValidationError::InvalidBackground),
    );
}

#[test]
fn background_image_rejects_bad_fit() {
    assert_eq!(
        validate_background_image("bg.jpg", "zoom", 0),
        Err(ValidationError::InvalidBackground),
    );
}

#[test]
fn background_image_rejects_dim_out_of_range() {
    assert_eq!(
        validate_background_image("bg.jpg", "fill", 101),
        Err(ValidationError::InvalidBackground),
    );
    assert_eq!(
        validate_background_image("bg.jpg", "fill", -101),
        Err(ValidationError::InvalidBackground),
    );
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cargo test --manifest-path src-tauri/Cargo.toml dashboard_validation::tests::background`
Expected: FAIL — `validate_background_preset` / `validate_background_image` not found, `InvalidBackground` not a variant.

- [ ] **Step 3: Implement the whitelists, error variant, and validators**

In `src-tauri/src/dashboard_validation.rs`, add the `InvalidBackground` variant to the `ValidationError` enum (after `InvalidSettingsValues`):

```rust
    InvalidSettingsValues,
    InvalidBackground,
}
```

Add these constants near the other `pub const` lists (after `ICONS`):

```rust
pub const BACKGROUND_PRESET_IDS: &[&str] = &[
    "mist", "sand", "sage", "sky", "blush", "lavender", "slate", "graphite",
    "g-dawn", "g-fog", "g-meadow", "g-dusk", "g-linen", "g-horizon", "g-petal", "g-twilight",
];

pub const BACKGROUND_FITS: &[&str] = &["fill", "fit", "stretch", "tile", "center"];
```

Add the validators near the other `validate_*` functions (after `validate_title`):

```rust
pub fn validate_background_preset(preset: &str) -> Result<(), ValidationError> {
    if BACKGROUND_PRESET_IDS.contains(&preset) {
        Ok(())
    } else {
        Err(ValidationError::InvalidBackground)
    }
}

pub fn validate_background_image(file: &str, fit: &str, dim: i64) -> Result<(), ValidationError> {
    let file_ok = !file.is_empty()
        && !file.contains('/')
        && !file.contains('\\')
        && !file.contains("..");
    if !file_ok {
        return Err(ValidationError::InvalidBackground);
    }
    if !BACKGROUND_FITS.contains(&fit) {
        return Err(ValidationError::InvalidBackground);
    }
    if !(-100..=100).contains(&dim) {
        return Err(ValidationError::InvalidBackground);
    }
    Ok(())
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cargo test --manifest-path src-tauri/Cargo.toml dashboard_validation::tests::background`
Expected: PASS (6 tests).

- [ ] **Step 5: Add the `DashboardBackground` enum to `dashboard_storage.rs`**

In `src-tauri/src/dashboard_storage.rs`, add after the `DashboardView` struct (~line 18):

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum DashboardBackground {
    Preset { preset: String },
    Image { file: String, fit: String, dim: i64 },
}

impl DashboardBackground {
    pub fn validate(&self) -> Result<(), ValidationError> {
        match self {
            DashboardBackground::Preset { preset } => {
                crate::dashboard_validation::validate_background_preset(preset)
            }
            DashboardBackground::Image { file, fit, dim } => {
                crate::dashboard_validation::validate_background_image(file, fit, *dim)
            }
        }
    }
}
```

- [ ] **Step 6: Verify it compiles**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: compiles (a few `dead_code` warnings for the not-yet-used enum are acceptable until Task 3).

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/dashboard_validation.rs src-tauri/src/dashboard_storage.rs
git commit -m "feat: add DashboardBackground type and validation"
```

---

## Task 3: Wire `background` through `DashboardView`, `ViewPatch`, and storage

**Files:**
- Modify: `src-tauri/src/dashboard_storage.rs` (`DashboardView` struct, `ViewPatch` struct, `load_state`, `create_view`, `update_view`, `seed_default`'s test DB schema, `referenced_background_image_files`)

- [ ] **Step 1: Write the failing storage tests**

In `src-tauri/src/dashboard_storage.rs`, inside `#[cfg(test)] mod tests`, first update `open_test_db` so its `dashboard_views` table matches the new schema — change its `CREATE TABLE dashboard_views` to:

```rust
            CREATE TABLE dashboard_views (
                id TEXT PRIMARY KEY, title TEXT NOT NULL, sort_order INTEGER NOT NULL,
                grid_density TEXT NOT NULL DEFAULT 'default'
                    CHECK (grid_density IN ('compact', 'default', 'roomy')),
                background_json TEXT
            );
```

Then add these tests at the end of the `tests` module:

```rust
#[test]
fn new_view_has_no_background() {
    let conn = open_test_db();
    let view = create_view(&conn, "v1", "First", None).unwrap();
    assert_eq!(view.background, None);
    let state = load_state(&conn).unwrap();
    assert_eq!(state.views[0].background, None);
}

#[test]
fn update_view_sets_and_clears_background() {
    let conn = open_test_db();
    create_view(&conn, "v1", "First", None).unwrap();

    let preset = DashboardBackground::Preset { preset: "mist".into() };
    let updated = update_view(&conn, "v1", &ViewPatch {
        title: None, grid_density: None, sort_order: None,
        background: Some(Some(preset.clone())),
    }).unwrap();
    assert_eq!(updated.background, Some(preset.clone()));
    assert_eq!(load_state(&conn).unwrap().views[0].background, Some(preset));

    let cleared = update_view(&conn, "v1", &ViewPatch {
        title: None, grid_density: None, sort_order: None,
        background: Some(None),
    }).unwrap();
    assert_eq!(cleared.background, None);
}

#[test]
fn update_view_rejects_invalid_background() {
    let conn = open_test_db();
    create_view(&conn, "v1", "First", None).unwrap();
    let err = update_view(&conn, "v1", &ViewPatch {
        title: None, grid_density: None, sort_order: None,
        background: Some(Some(DashboardBackground::Preset { preset: "not-real".into() })),
    });
    assert!(matches!(err, Err(DashboardStorageError::Validation(
        ValidationError::InvalidBackground
    ))));
}

#[test]
fn update_view_leaves_background_untouched_when_not_patched() {
    let conn = open_test_db();
    create_view(&conn, "v1", "First", None).unwrap();
    let preset = DashboardBackground::Preset { preset: "sky".into() };
    update_view(&conn, "v1", &ViewPatch {
        title: None, grid_density: None, sort_order: None,
        background: Some(Some(preset.clone())),
    }).unwrap();
    // Patch only the title; background must survive.
    let updated = update_view(&conn, "v1", &ViewPatch {
        title: Some("Renamed".into()), grid_density: None, sort_order: None,
        background: None,
    }).unwrap();
    assert_eq!(updated.background, Some(preset));
}

#[test]
fn referenced_background_image_files_collects_image_files_only() {
    let conn = open_test_db();
    create_view(&conn, "v1", "First", None).unwrap();
    create_view(&conn, "v2", "Second", None).unwrap();
    create_view(&conn, "v3", "Third", None).unwrap();
    update_view(&conn, "v1", &ViewPatch {
        title: None, grid_density: None, sort_order: None,
        background: Some(Some(DashboardBackground::Image {
            file: "bg-aaa.jpg".into(), fit: "fill".into(), dim: 0,
        })),
    }).unwrap();
    update_view(&conn, "v2", &ViewPatch {
        title: None, grid_density: None, sort_order: None,
        background: Some(Some(DashboardBackground::Preset { preset: "mist".into() })),
    }).unwrap();
    // v3 left as theme default (NULL).
    let files = referenced_background_image_files(&conn).unwrap();
    assert_eq!(files.len(), 1);
    assert!(files.contains("bg-aaa.jpg"));
}

#[test]
fn corrupt_background_json_loads_as_none() {
    let conn = open_test_db();
    create_view(&conn, "v1", "First", None).unwrap();
    conn.execute(
        "UPDATE dashboard_views SET background_json = ? WHERE id = ?",
        rusqlite::params!["{not valid json", "v1"],
    ).unwrap();
    let state = load_state(&conn).unwrap();
    assert_eq!(state.views[0].background, None);
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cargo test --manifest-path src-tauri/Cargo.toml dashboard_storage`
Expected: FAIL — `DashboardView` has no `background` field, `ViewPatch` has no `background` field, `referenced_background_image_files` not found.

- [ ] **Step 3: Add the `background` field to `DashboardView` and `ViewPatch`**

In `src-tauri/src/dashboard_storage.rs`, change the `DashboardView` struct to:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardView {
    pub id: String,
    pub title: String,
    pub sort_order: i64,
    pub grid_density: String,
    #[serde(default)]
    pub background: Option<DashboardBackground>,
}
```

Change the `ViewPatch` struct to:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewPatch {
    #[serde(default)] pub title: Option<String>,
    #[serde(default)] pub grid_density: Option<String>,
    #[serde(default)] pub sort_order: Option<i64>,
    #[serde(default)] pub background: Option<Option<DashboardBackground>>,
}
```

- [ ] **Step 4: Add a JSON <-> enum helper pair**

In `src-tauri/src/dashboard_storage.rs`, add near the top (after the `DashboardBackground` impl):

```rust
fn background_from_json(raw: Option<String>) -> Option<DashboardBackground> {
    // Defensive on reads: a database written by a different/older KKTerm build
    // may contain a shape we cannot parse. Treat anything unparseable as
    // "theme default" rather than failing the whole load.
    raw.and_then(|json| serde_json::from_str::<DashboardBackground>(&json).ok())
}

fn background_to_json(
    background: &Option<DashboardBackground>,
) -> Result<Option<String>, DashboardStorageError> {
    match background {
        None => Ok(None),
        Some(bg) => {
            bg.validate()?;
            serde_json::to_string(bg)
                .map(Some)
                .map_err(|_| DashboardStorageError::Validation(ValidationError::InvalidBackground))
        }
    }
}
```

- [ ] **Step 5: Update `load_state` to read the column**

In `load_state`, change the views statement and row mapping to:

```rust
    let mut views_stmt = conn.prepare(
        "SELECT id, title, sort_order, grid_density, background_json FROM dashboard_views ORDER BY sort_order"
    )?;
    let views = views_stmt
        .query_map([], |row| {
            Ok(DashboardView {
                id: row.get(0)?,
                title: row.get(1)?,
                sort_order: row.get(2)?,
                grid_density: row.get(3)?,
                background: background_from_json(row.get(4)?),
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
```

- [ ] **Step 6: Update `create_view` to set `background: None`**

In `create_view`, change the returned struct literal to include the new field:

```rust
    Ok(DashboardView {
        id: id.to_string(),
        title: title.to_string(),
        sort_order: next_sort,
        grid_density: density.to_string(),
        background: None,
    })
```

(The `INSERT` statement is unchanged — `background_json` defaults to `NULL`.)

- [ ] **Step 7: Update `update_view` to read, patch, validate, and write `background`**

Replace the body of `update_view` with:

```rust
pub fn update_view(
    conn: &SqliteConnection,
    id: &str,
    patch: &ViewPatch,
) -> Result<DashboardView, DashboardStorageError> {
    if let Some(ref title) = patch.title { validate_title(title)?; }
    if let Some(ref d) = patch.grid_density { validate_grid_density(d)?; }

    let current: Option<DashboardView> = conn.query_row(
        "SELECT id, title, sort_order, grid_density, background_json FROM dashboard_views WHERE id = ?",
        params![id],
        |row| Ok(DashboardView {
            id: row.get(0)?,
            title: row.get(1)?,
            sort_order: row.get(2)?,
            grid_density: row.get(3)?,
            background: background_from_json(row.get(4)?),
        }),
    ).optional()?;
    let mut current = current.ok_or(DashboardStorageError::NotFound)?;

    if let Some(t) = patch.title.clone()        { current.title = t; }
    if let Some(d) = patch.grid_density.clone() { current.grid_density = d; }
    if let Some(s) = patch.sort_order           { current.sort_order = s; }
    if let Some(bg) = patch.background.clone()   { current.background = bg; }

    let background_json = background_to_json(&current.background)?;

    conn.execute(
        "UPDATE dashboard_views SET title = ?, sort_order = ?, grid_density = ?, background_json = ? WHERE id = ?",
        params![current.title, current.sort_order, current.grid_density, background_json, current.id],
    )?;
    Ok(current)
}
```

- [ ] **Step 8: Add `referenced_background_image_files`**

In `src-tauri/src/dashboard_storage.rs`, add this `pub fn` (place it after `update_view`). Add `use std::collections::HashSet;` to the imports at the top of the file if not present:

```rust
pub fn referenced_background_image_files(
    conn: &SqliteConnection,
) -> Result<HashSet<String>, DashboardStorageError> {
    let mut stmt = conn.prepare(
        "SELECT background_json FROM dashboard_views WHERE background_json IS NOT NULL"
    )?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    let mut files = HashSet::new();
    for json in rows {
        let json = json?;
        if let Ok(DashboardBackground::Image { file, .. }) =
            serde_json::from_str::<DashboardBackground>(&json)
        {
            files.insert(file);
        }
    }
    Ok(files)
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `cargo test --manifest-path src-tauri/Cargo.toml dashboard_storage`
Expected: PASS — all existing tests plus the 6 new ones.

- [ ] **Step 10: Commit**

```bash
git add src-tauri/src/dashboard_storage.rs
git commit -m "feat: thread view background through dashboard storage"
```

---

## Task 4: Backgrounds folder + import/load Tauri commands

**Files:**
- Modify: `src-tauri/src/lib.rs` (new structs, `backgrounds_folder`, `background_image_entry`, two `#[tauri::command]`s, command registration)

> Frontend owns the file dialog (matching `selectAppLauncherFile`); `dashboard_import_background_image` receives an already-chosen absolute source path and copies it into the managed folder.

- [ ] **Step 1: Add the response struct and folder helper**

In `src-tauri/src/lib.rs`, add near `CustomFontData` (~line 62):

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardBackgroundImageData {
    data_url: String,
}
```

Add `backgrounds_folder` next to `custom_fonts_folder` (~line 215). It mirrors `custom_fonts_folder` exactly but with a `backgrounds` subfolder:

```rust
pub(crate) fn backgrounds_folder() -> Result<PathBuf, String> {
    let exe_path = std::env::current_exe()
        .map_err(|error| format!("failed to resolve app executable path: {error}"))?;
    let exe_folder = exe_path
        .parent()
        .ok_or_else(|| "failed to resolve app executable folder".to_string())?;
    Ok(exe_folder.join("backgrounds"))
}
```

- [ ] **Step 2: Add the extension/mime helper**

In `src-tauri/src/lib.rs`, add (near `custom_font_entry`, ~line 224):

```rust
/// Returns the lowercased extension if `path` is a supported background image.
fn background_image_extension(path: &std::path::Path) -> Option<String> {
    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_lowercase())?;
    if matches!(extension.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif" | "bmp") {
        Some(extension)
    } else {
        None
    }
}

fn background_image_mime(extension: &str) -> &'static str {
    match extension {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        _ => "application/octet-stream",
    }
}
```

- [ ] **Step 3: Add the `dashboard_import_background_image` command**

In `src-tauri/src/lib.rs`, add (near the custom-font commands, ~line 145). It copies a chosen file into `backgrounds/` under a content-hashed name and returns the stored filename:

```rust
#[tauri::command]
async fn dashboard_import_background_image(source_path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || dashboard_import_background_image_sync(source_path))
        .await
        .map_err(|error| format!("failed to import background image: {error}"))?
}

fn dashboard_import_background_image_sync(source_path: String) -> Result<String, String> {
    use std::hash::{Hash, Hasher};

    let source = PathBuf::from(&source_path);
    let extension = background_image_extension(&source)
        .ok_or_else(|| "background image must be .png, .jpg, .jpeg, .webp, .gif, or .bmp".to_string())?;

    let bytes = fs::read(&source)
        .map_err(|error| format!("failed to read background image {source_path}: {error}"))?;

    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    bytes.hash(&mut hasher);
    let file_name = format!("bg-{:016x}.{extension}", hasher.finish());

    let folder = backgrounds_folder()?;
    fs::create_dir_all(&folder)
        .map_err(|error| format!("failed to create backgrounds folder {}: {error}", folder.display()))?;
    let destination = folder.join(&file_name);
    if !destination.exists() {
        fs::write(&destination, &bytes)
            .map_err(|error| format!("failed to write background image {}: {error}", destination.display()))?;
    }
    Ok(file_name)
}
```

- [ ] **Step 4: Add the `dashboard_load_background_image` command**

In `src-tauri/src/lib.rs`, add right after the import command. It mirrors `load_custom_font_data_sync`'s canonicalize + `starts_with` path guard:

```rust
#[tauri::command]
async fn dashboard_load_background_image(file: String) -> Result<DashboardBackgroundImageData, String> {
    tauri::async_runtime::spawn_blocking(move || dashboard_load_background_image_sync(file))
        .await
        .map_err(|error| format!("failed to load background image: {error}"))?
}

fn dashboard_load_background_image_sync(file: String) -> Result<DashboardBackgroundImageData, String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    if file.is_empty() || file.contains('/') || file.contains('\\') || file.contains("..") {
        return Err("invalid background image file name".to_string());
    }

    let folder = backgrounds_folder()?;
    fs::create_dir_all(&folder)
        .map_err(|error| format!("failed to create backgrounds folder {}: {error}", folder.display()))?;
    let folder = folder
        .canonicalize()
        .map_err(|error| format!("failed to resolve backgrounds folder: {error}"))?;

    let path = folder.join(&file);
    let canonical_path = path
        .canonicalize()
        .map_err(|error| format!("failed to resolve background image path: {error}"))?;
    if !canonical_path.starts_with(&folder) {
        return Err("background image path must stay inside the backgrounds folder".to_string());
    }

    let extension = background_image_extension(&canonical_path)
        .ok_or_else(|| "background image must be .png, .jpg, .jpeg, .webp, .gif, or .bmp".to_string())?;
    let bytes = fs::read(&canonical_path)
        .map_err(|error| format!("failed to read background image {}: {error}", canonical_path.display()))?;

    let data_url = format!(
        "data:{};base64,{}",
        background_image_mime(&extension),
        STANDARD.encode(bytes),
    );
    Ok(DashboardBackgroundImageData { data_url })
}
```

- [ ] **Step 5: Register the commands**

In `src-tauri/src/lib.rs`, in the `tauri::generate_handler![...]` list, add the two commands next to the dashboard commands block (~line 2069, after `dashboard_commands::dashboard_reset`):

```rust
            dashboard_commands::dashboard_reset,
            dashboard_import_background_image,
            dashboard_load_background_image
```

- [ ] **Step 6: Verify it compiles**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: compiles. (`base64` is already a dependency — it is used by `load_custom_font_data_sync`.)

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add dashboard background image import/load commands"
```

---

## Task 5: Orphan cleanup wiring

**Files:**
- Modify: `src-tauri/src/lib.rs` (`prune_unreferenced_backgrounds` helper)
- Modify: `src-tauri/src/dashboard_commands.rs` (call the helper after view-mutating commands)

> The sweep is deliberately a full-folder reconciliation (delete every file not referenced by any view) rather than ref-count diffing — it is simpler and self-healing. It is best-effort: failures are logged, never propagated, so a locked file never breaks a view update.

- [ ] **Step 1: Add the `prune_unreferenced_backgrounds` helper**

In `src-tauri/src/lib.rs`, add (near `backgrounds_folder`):

```rust
/// Best-effort: delete background image files no view references anymore.
/// Never returns an error — cleanup failures must not break view mutations.
pub(crate) fn prune_unreferenced_backgrounds(app: &tauri::AppHandle) {
    let storage = app.state::<storage::Storage>();
    let referenced = storage.with_connection_infallible(|conn| {
        dashboard_storage::referenced_background_image_files(conn)
            .map_err(|error| format!("{error:?}"))
    });
    let referenced = match referenced {
        Ok(set) => set,
        Err(error) => {
            log::warn!("background prune skipped: {error}");
            return;
        }
    };
    let folder = match backgrounds_folder() {
        Ok(folder) => folder,
        Err(error) => {
            log::warn!("background prune skipped: {error}");
            return;
        }
    };
    let entries = match fs::read_dir(&folder) {
        Ok(entries) => entries,
        Err(_) => return, // folder may not exist yet — nothing to prune.
    };
    for entry in entries.filter_map(Result::ok) {
        let path = entry.path();
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name.to_string(),
            None => continue,
        };
        if !referenced.contains(&name) {
            if let Err(error) = fs::remove_file(&path) {
                log::warn!("failed to prune background image {}: {error}", path.display());
            }
        }
    }
}
```

> Note: confirm `log::warn!` is the logging macro in use — `grep -rn "log::warn\|log::info" src-tauri/src/lib.rs`. If the crate uses a different logger facade, match it. If no logging facade is available in `lib.rs`, replace `log::warn!(...)` with `eprintln!(...)`.

- [ ] **Step 2: Call the helper from the three view-mutating commands**

In `src-tauri/src/dashboard_commands.rs`, update `dashboard_update_view`, `dashboard_remove_view`, and `dashboard_reset` to prune after a successful mutation. For `dashboard_update_view`:

```rust
#[tauri::command]
pub fn dashboard_update_view(
    app: AppHandle,
    id: String,
    patch: ViewPatch,
) -> Result<DashboardView, DashboardCommandError> {
    let result = storage(&app)
        .with_connection_infallible(|conn| ds::update_view(conn, &id, &patch).map_err(Into::into))?;
    crate::prune_unreferenced_backgrounds(&app);
    Ok(result)
}
```

For `dashboard_remove_view`:

```rust
#[tauri::command]
pub fn dashboard_remove_view(
    app: AppHandle,
    id: String,
) -> Result<(), DashboardCommandError> {
    storage(&app).with_connection_infallible(|conn| ds::remove_view(conn, &id).map_err(Into::into))?;
    crate::prune_unreferenced_backgrounds(&app);
    Ok(())
}
```

For `dashboard_reset`:

```rust
#[tauri::command]
pub fn dashboard_reset(app: AppHandle) -> Result<(), DashboardCommandError> {
    storage(&app).with_connection_infallible(|conn| ds::reset_dashboard(conn).map_err(Into::into))?;
    crate::prune_unreferenced_backgrounds(&app);
    Ok(())
}
```

- [ ] **Step 3: Verify it compiles and all Rust tests pass**

Run: `cargo check --manifest-path src-tauri/Cargo.toml && cargo test --manifest-path src-tauri/Cargo.toml`
Expected: compiles; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/src/dashboard_commands.rs
git commit -m "feat: prune unreferenced dashboard background images"
```

---

## Task 6: TypeScript types + CommandMap + persistence wrappers

**Files:**
- Modify: `src/dashboard/types.ts` (`BackgroundFit`, `DashboardBackground`, `background` on `DashboardView` + `ViewPatch`)
- Modify: `src/lib/tauri.ts` (`CommandMap` entries)
- Modify: `src/dashboard/state/persistence.ts` (wrappers + preview fallbacks)

- [ ] **Step 1: Add the background types to `types.ts`**

In `src/dashboard/types.ts`, add after the `GRID_DENSITIES` block (~line 27):

```ts
export const BACKGROUND_FITS = ["fill", "fit", "stretch", "tile", "center"] as const;
export type BackgroundFit = (typeof BACKGROUND_FITS)[number];

export type DashboardBackground =
  | { kind: "preset"; preset: string }
  | { kind: "image"; file: string; fit: BackgroundFit; dim: number };
```

Add `background` to `DashboardView`:

```ts
export interface DashboardView {
  id: string;
  title: string;
  sortOrder: number;
  gridDensity: GridDensity;
  background: DashboardBackground | null;
}
```

Add `background` to `ViewPatch`:

```ts
export interface ViewPatch {
  title?: string;
  gridDensity?: GridDensity;
  sortOrder?: number;
  background?: DashboardBackground | null;
}
```

- [ ] **Step 2: Add the `CommandMap` entries in `tauri.ts`**

In `src/lib/tauri.ts`, add to the `CommandMap` type, right after the `dashboard_reset` entry (~line 1553):

```ts
  dashboard_reset: {
    args: undefined;
    result: null;
  };
  dashboard_import_background_image: {
    args: { sourcePath: string };
    result: string;
  };
  dashboard_load_background_image: {
    args: { file: string };
    result: { dataUrl: string };
  };
};
```

- [ ] **Step 3: Add persistence wrappers with browser-preview fallbacks**

In `src/dashboard/state/persistence.ts`, add at the end of the file (after `resetDashboard`):

```ts
export async function importBackgroundImage(sourcePath: string): Promise<string> {
  if (!isTauriRuntime()) {
    // Browser preview cannot copy files — echo a deterministic fake filename.
    return `preview-bg-${sourcePath.replace(/[^a-z0-9]/gi, "").slice(-12)}.png`;
  }
  return invokeCommand("dashboard_import_background_image", { sourcePath });
}

export async function loadBackgroundImage(file: string): Promise<string> {
  if (!isTauriRuntime()) {
    // Browser preview: no managed folder. Return a tiny transparent PNG.
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
  const result = await invokeCommand("dashboard_load_background_image", { file });
  return result.dataUrl;
}
```

Also update the existing `browserPreviewState()` so the seeded preview view satisfies the new non-optional `background` field — change the seeded view object to:

```ts
      views: [{ id: viewId, title: "Default", sortOrder: 0, gridDensity: "default", background: null }],
```

And in `createView`'s preview branch, change the constructed `view` object to include `background: null`:

```ts
    const view = {
      id: createPreviewId("view"),
      title,
      sortOrder: state.views.length,
      gridDensity: gridDensity ?? "default",
      background: null,
    };
```

- [ ] **Step 4: Verify types compile**

Run: `npm run check`
Expected: no errors. (If `tsc` flags other call sites constructing `DashboardView` without `background`, add `background: null` there — but the two preview spots above are the only known ones.)

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/types.ts src/lib/tauri.ts src/dashboard/state/persistence.ts
git commit -m "feat: add background types and persistence wrappers"
```

---

## Task 7: Background preset registry

**Files:**
- Create: `src/dashboard/registry/backgroundPresets.ts`
- Create: `src/dashboard/registry/backgroundPresets.test.ts`

- [ ] **Step 1: Write the compile-time assertion test**

Create `src/dashboard/registry/backgroundPresets.test.ts`:

```ts
import { BACKGROUND_PRESETS, isBackgroundPresetId, resolveBackgroundPreset } from "./backgroundPresets";

// There must be exactly 16 presets (8 solid + 8 gradient), matching the Rust whitelist.
const presetCount: 16 = BACKGROUND_PRESETS.length as 16;
void presetCount;

// resolveBackgroundPreset always returns a definition (falls back to the first entry).
const resolved: { id: string; labelKey: string; css: string } = resolveBackgroundPreset("does-not-exist");
void resolved;

// isBackgroundPresetId narrows to a known id.
const maybeId: string = "mist";
if (isBackgroundPresetId(maybeId)) {
  const known: (typeof BACKGROUND_PRESETS)[number]["id"] = maybeId;
  void known;
}
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run: `npm run check`
Expected: FAIL — cannot find module `./backgroundPresets`.

- [ ] **Step 3: Create the registry**

Create `src/dashboard/registry/backgroundPresets.ts`. The 16 ids and CSS values must match `BACKGROUND_PRESET_IDS` in `dashboard_validation.rs` exactly:

```ts
export interface BackgroundPresetDefinition {
  id: string;
  labelKey: string;       // i18n key under dashboard.backgroundPresets.*
  css: string;            // literal CSS `background` value
}

export const BACKGROUND_PRESETS: readonly BackgroundPresetDefinition[] = [
  { id: "mist",       labelKey: "dashboard.backgroundPresets.mist",     css: "#eceef1" },
  { id: "sand",       labelKey: "dashboard.backgroundPresets.sand",     css: "#f3efe7" },
  { id: "sage",       labelKey: "dashboard.backgroundPresets.sage",     css: "#e9efe9" },
  { id: "sky",        labelKey: "dashboard.backgroundPresets.sky",      css: "#e8eef3" },
  { id: "blush",      labelKey: "dashboard.backgroundPresets.blush",    css: "#f3ecef" },
  { id: "lavender",   labelKey: "dashboard.backgroundPresets.lavender", css: "#eceaf2" },
  { id: "slate",      labelKey: "dashboard.backgroundPresets.slate",    css: "#e5e8ee" },
  { id: "graphite",   labelKey: "dashboard.backgroundPresets.graphite", css: "#2a2e37" },
  { id: "g-dawn",     labelKey: "dashboard.backgroundPresets.gDawn",    css: "linear-gradient(135deg, #f3efe7, #e8eef3)" },
  { id: "g-fog",      labelKey: "dashboard.backgroundPresets.gFog",     css: "linear-gradient(135deg, #eceef1, #dfe3e9)" },
  { id: "g-meadow",   labelKey: "dashboard.backgroundPresets.gMeadow",  css: "linear-gradient(135deg, #eef2ec, #e3ebe6)" },
  { id: "g-dusk",     labelKey: "dashboard.backgroundPresets.gDusk",    css: "linear-gradient(135deg, #eceaf2, #e5e8ee)" },
  { id: "g-linen",    labelKey: "dashboard.backgroundPresets.gLinen",   css: "linear-gradient(135deg, #f4f1ea, #ebe7de)" },
  { id: "g-horizon",  labelKey: "dashboard.backgroundPresets.gHorizon", css: "linear-gradient(135deg, #e8eef3, #f0f2f5)" },
  { id: "g-petal",    labelKey: "dashboard.backgroundPresets.gPetal",   css: "linear-gradient(135deg, #f3ecef, #ece9f1)" },
  { id: "g-twilight", labelKey: "dashboard.backgroundPresets.gTwilight",css: "linear-gradient(135deg, #2c3040, #23262f)" },
] as const;

export function resolveBackgroundPreset(id: string): BackgroundPresetDefinition {
  return BACKGROUND_PRESETS.find((preset) => preset.id === id) ?? BACKGROUND_PRESETS[0];
}

export function isBackgroundPresetId(value: string): boolean {
  return BACKGROUND_PRESETS.some((preset) => preset.id === value);
}
```

- [ ] **Step 4: Run typecheck to verify it passes**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/registry/backgroundPresets.ts src/dashboard/registry/backgroundPresets.test.ts
git commit -m "feat: add dashboard background preset registry"
```

---

## Task 8: Dashboard store — `setViewBackground` + image cache

**Files:**
- Modify: `src/dashboard/state/dashboardStore.ts`

- [ ] **Step 1: Extend the store interface**

In `src/dashboard/state/dashboardStore.ts`, add to the imports from `../types`: `DashboardBackground`. Add these to the `DashboardStoreState` interface (after `setViewDensity`):

```ts
  setViewBackground: (id: string, background: DashboardBackground | null) => Promise<void>;
  backgroundImages: Record<string, string>;   // filename -> data URL
  loadBackgroundImage: (file: string) => Promise<void>;
```

- [ ] **Step 2: Add `backgroundImages` to the initial state**

In the `create<DashboardStoreState>(...)` object, add next to the other initial values (after `lastError: null,`):

```ts
  lastError: null,
  backgroundImages: {},
```

- [ ] **Step 3: Implement `setViewBackground`**

Add this action right after `setViewDensity` in the store object:

```ts
  setViewBackground: async (id, background) => {
    try {
      const updated = await persistence.updateView(id, { background });
      set((s) => ({ views: s.views.map((v) => (v.id === id ? updated : v)) }));
    } catch (e) { set({ lastError: String(e) }); }
  },
```

- [ ] **Step 4: Implement `loadBackgroundImage`**

Add this action after `setViewBackground`. It is idempotent — it skips work if the file is already cached:

```ts
  loadBackgroundImage: async (file) => {
    if (!file || get().backgroundImages[file]) return;
    try {
      const dataUrl = await persistence.loadBackgroundImage(file);
      set((s) => ({ backgroundImages: { ...s.backgroundImages, [file]: dataUrl } }));
    } catch (e) {
      // Defensive: a missing/corrupt file must not error the canvas — it falls
      // back to theme default because no cache entry is ever written.
      set({ lastError: String(e) });
    }
  },
```

- [ ] **Step 5: Verify types compile**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/dashboard/state/dashboardStore.ts
git commit -m "feat: add view background store actions and image cache"
```

---

## Task 9: CSS — background layer, dim overlay, grid-line refactor

**Files:**
- Modify: `src/dashboard/dashboard.css` (`.dw-canvas-scroll` block ~line 243, `.dw-canvas-scroll.is-editing` block ~line 255, `.dw-canvas` block ~line 287)

> The custom background renders on a dedicated absolutely-positioned `.dw-canvas-bg` child of `.dw-canvas-scroll`. The edit-mode grid lines move from `.dw-canvas-scroll.is-editing` onto `.dw-canvas::before` so they paint *above* the custom background and below the widgets, and so they keep their content-box alignment naturally (`.dw-canvas` is already inside `.dw-canvas-scroll`'s padding and is `position: relative` via react-grid-layout).

- [ ] **Step 1: Make `.dw-canvas-scroll` a positioning context**

In `src/dashboard/dashboard.css`, change the `.dw-canvas-scroll` rule (~line 243) to add `position: relative;`:

```css
.dw-canvas-scroll {
  box-sizing: border-box;
  position: relative;
  --dw-grid-line: rgb(23 32 43 / 11%);
  --dw-grid-column-width: calc((100% - (var(--dw-grid-gap-x, 16px) * 13)) / 12);
  --dw-grid-step-x: calc(var(--dw-grid-column-width) + var(--dw-grid-gap-x, 16px));
  --dw-grid-step-y: calc(var(--dw-row-height, 68px) + var(--dw-grid-gap-y, 16px));
  min-height: 0;
  padding: 18px 20px 60px;
  overflow-x: hidden;
  overflow-y: auto;
}
```

- [ ] **Step 2: Move the edit-mode grid lines from `.dw-canvas-scroll.is-editing` to `.dw-canvas::before`**

Replace the entire `.dw-canvas-scroll.is-editing { ... }` rule (~lines 255–285) with a rule scoped to `.dw-canvas::before`:

```css
.dw-canvas-scroll.is-editing .dw-canvas::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(
      to right,
      transparent 0,
      transparent var(--dw-grid-gap-x, 16px),
      var(--dw-grid-line) var(--dw-grid-gap-x, 16px),
      var(--dw-grid-line) calc(var(--dw-grid-gap-x, 16px) + 1px),
      transparent calc(var(--dw-grid-gap-x, 16px) + 1px),
      transparent calc(var(--dw-grid-gap-x, 16px) + var(--dw-grid-column-width)),
      var(--dw-grid-line) calc(var(--dw-grid-gap-x, 16px) + var(--dw-grid-column-width)),
      var(--dw-grid-line) calc(var(--dw-grid-gap-x, 16px) + var(--dw-grid-column-width) + 1px),
      transparent calc(var(--dw-grid-gap-x, 16px) + var(--dw-grid-column-width) + 1px),
      transparent var(--dw-grid-step-x)
    ),
    repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent var(--dw-grid-gap-y, 16px),
      var(--dw-grid-line) var(--dw-grid-gap-y, 16px),
      var(--dw-grid-line) calc(var(--dw-grid-gap-y, 16px) + 1px),
      transparent calc(var(--dw-grid-gap-y, 16px) + 1px),
      transparent calc(var(--dw-grid-gap-y, 16px) + var(--dw-row-height, 68px)),
      var(--dw-grid-line) calc(var(--dw-grid-gap-y, 16px) + var(--dw-row-height, 68px)),
      var(--dw-grid-line) calc(var(--dw-grid-gap-y, 16px) + var(--dw-row-height, 68px) + 1px),
      transparent calc(var(--dw-grid-gap-y, 16px) + var(--dw-row-height, 68px) + 1px),
      transparent var(--dw-grid-step-y)
    );
}
```

- [ ] **Step 3: Add the `.dw-canvas-bg` layer and dim overlay rules**

In `src/dashboard/dashboard.css`, add immediately after the `.dw-canvas { min-height: 100%; }` rule (~line 289):

```css
.dw-canvas-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}

.dw-canvas-bg::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--dw-bg-dim-color, transparent);
}

.dw-canvas-scroll > .dw-canvas {
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 4: Verify the build still succeeds**

Run: `npm run build`
Expected: build succeeds (CSS is bundled by Vite; no compile errors).

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/dashboard.css
git commit -m "feat: add dashboard canvas background layer styles"
```

---

## Task 10: `DashboardCanvas` — background rendering + context-menu trigger

**Files:**
- Modify: `src/dashboard/view/DashboardCanvas.tsx`

- [ ] **Step 1: Add imports and the `onOpenBackground` prop**

In `src/dashboard/view/DashboardCanvas.tsx`, update the imports and the props interface:

```ts
import GridLayout, { type Layout, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useEffect, useMemo, type CSSProperties, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { showNativeContextMenu } from "../../lib/nativeContextMenu";
import { resolveBackgroundPreset } from "../registry/backgroundPresets";
import { useDashboardStore } from "../state/dashboardStore";
import type { BackgroundFit, DashboardView, DashboardWidgetInstance, GridDensity } from "../types";
import { WidgetFrame } from "./WidgetFrame";

const ResponsiveGrid = WidthProvider(GridLayout);

export const DENSITY_SETTINGS: Record<GridDensity, { rowHeight: number; margin: [number, number] }> = {
  compact:  { rowHeight: 52, margin: [6, 6]   },
  default:  { rowHeight: 68, margin: [16, 16] },
  roomy:    { rowHeight: 92, margin: [30, 30] },
};

export interface DashboardCanvasProps {
  view: DashboardView;
  instances: DashboardWidgetInstance[];
  onCustomize: (instance: DashboardWidgetInstance, anchor: HTMLElement) => void;
  onOpenBackground: () => void;
}
```

- [ ] **Step 2: Add the fit-mode -> CSS helper**

In `src/dashboard/view/DashboardCanvas.tsx`, add this module-level helper after `DENSITY_SETTINGS`:

```ts
function backgroundFitStyle(fit: BackgroundFit): CSSProperties {
  switch (fit) {
    case "fill":    return { backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center" };
    case "fit":     return { backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" };
    case "stretch": return { backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" };
    case "tile":    return { backgroundSize: "auto", backgroundRepeat: "repeat" };
    case "center":  return { backgroundSize: "auto", backgroundRepeat: "no-repeat", backgroundPosition: "center" };
  }
}

function dimColor(dim: number): string | undefined {
  if (dim === 0) return undefined;
  const alpha = Math.min(Math.abs(dim), 100) / 100;
  return dim < 0
    ? `rgba(0, 0, 0, ${alpha})`
    : `rgba(255, 255, 255, ${alpha})`;
}
```

- [ ] **Step 3: Resolve the background layer inside the component**

Replace the `DashboardCanvas` function body with:

```tsx
export function DashboardCanvas({ view, instances, onCustomize, onOpenBackground }: DashboardCanvasProps) {
  const { t } = useTranslation();
  const editMode = useDashboardStore((s) => s.editMode);
  const applyLayout = useDashboardStore((s) => s.applyLayout);
  const backgroundImages = useDashboardStore((s) => s.backgroundImages);
  const loadBackgroundImage = useDashboardStore((s) => s.loadBackgroundImage);

  const background = view.background;
  const imageFile = background?.kind === "image" ? background.file : null;

  useEffect(() => {
    if (imageFile) void loadBackgroundImage(imageFile);
  }, [imageFile, loadBackgroundImage]);

  const settings = DENSITY_SETTINGS[view.gridDensity];
  const layout: Layout = useMemo(
    () => instances.map((i) => ({
      i: i.id, x: i.gridX, y: i.gridY, w: i.gridW, h: i.gridH, minW: 1, minH: 1,
    })),
    [instances],
  );

  function onLayoutChange(next: Layout) {
    if (!editMode) return;
    applyLayout(view.id, next.map((l) => ({ id: l.i, gridX: l.x, gridY: l.y, gridW: l.w, gridH: l.h })));
  }

  async function onCanvasContextMenu(event: MouseEvent<HTMLDivElement>) {
    // Only react on empty canvas space, and never while editing layout.
    if (editMode) return;
    if ((event.target as HTMLElement).closest(".react-grid-item")) return;
    event.preventDefault();
    await showNativeContextMenu(
      [{ kind: "item", label: t("dashboard.changeBackground"), action: onOpenBackground }],
      { x: event.clientX, y: event.clientY },
    );
  }

  let backgroundLayer: JSX.Element | null = null;
  if (background?.kind === "preset") {
    backgroundLayer = (
      <div
        className="dw-canvas-bg"
        style={{ background: resolveBackgroundPreset(background.preset).css }}
      />
    );
  } else if (background?.kind === "image") {
    const dataUrl = backgroundImages[background.file];
    if (dataUrl) {
      const style: CSSProperties = {
        backgroundImage: `url("${dataUrl}")`,
        ...backgroundFitStyle(background.fit),
      };
      const dim = dimColor(background.dim);
      if (dim) {
        (style as Record<string, string>)["--dw-bg-dim-color"] = dim;
      }
      backgroundLayer = <div className="dw-canvas-bg" style={style} />;
    }
  }

  return (
    <div className="dw-canvas-host" onContextMenu={onCanvasContextMenu}>
      {backgroundLayer}
      <ResponsiveGrid
        className="dw-canvas"
        cols={12}
        rowHeight={settings.rowHeight}
        margin={settings.margin}
        layout={layout}
        isDraggable={editMode}
        isResizable={editMode}
        compactType="vertical"
        preventCollision={false}
        draggableHandle=".drag-handle"
        draggableCancel=".dw-controls, .dw-ctrl, button, input, textarea, select, a, [role='button']"
        resizeHandles={editMode ? ["n", "e", "s", "w"] : []}
        onLayoutChange={onLayoutChange}
      >
        {instances.map((i) => (
          <div key={i.id}>
            <WidgetFrame instance={i} onCustomize={onCustomize} />
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
}
```

- [ ] **Step 4: Update the CSS selector and add the host wrapper rule**

The Task 9 rule `.dw-canvas-scroll > .dw-canvas` no longer matches (the grid is now wrapped in `.dw-canvas-host`). In `src/dashboard/dashboard.css`, change that rule and add a host rule:

```css
.dw-canvas-host {
  position: relative;
  z-index: 0;
  min-height: 100%;
}

.dw-canvas-host > .dw-canvas {
  position: relative;
  z-index: 1;
}
```

Delete the now-obsolete `.dw-canvas-scroll > .dw-canvas { ... }` rule added in Task 9 Step 3.

- [ ] **Step 5: Verify typecheck and build**

Run: `npm run check && npm run build`
Expected: PASS. (`JSX.Element` is in scope via the existing React 19 types; if `tsc` flags it, import `type { JSX } from "react"`.)

- [ ] **Step 6: Commit**

```bash
git add src/dashboard/view/DashboardCanvas.tsx src/dashboard/dashboard.css
git commit -m "feat: render view background and add change-background context menu"
```

---

## Task 11: `BackgroundPopover` component + `DashboardPage` wiring

**Files:**
- Create: `src/dashboard/edit/BackgroundPopover.tsx`
- Modify: `src/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Create the `BackgroundPopover` component**

Create `src/dashboard/edit/BackgroundPopover.tsx`. It mirrors `CustomizePopover`'s outside-click/Escape close and live-applies through `setViewBackground`. Image picking uses `openDialog` (from `@tauri-apps/plugin-dialog`, re-exported nowhere — import directly, matching `src/lib/tauri.ts`'s own import) then `importBackgroundImage`:

```tsx
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isTauriRuntime } from "../../lib/tauri";
import { BACKGROUND_PRESETS } from "../registry/backgroundPresets";
import { importBackgroundImage } from "../state/persistence";
import { useDashboardStore } from "../state/dashboardStore";
import { BACKGROUND_FITS, type BackgroundFit, type DashboardBackground, type DashboardView } from "../types";

type Mode = "default" | "preset" | "image";

function modeOf(background: DashboardBackground | null): Mode {
  if (!background) return "default";
  return background.kind === "preset" ? "preset" : "image";
}

export interface BackgroundPopoverProps {
  view: DashboardView;
  onClose: () => void;
}

export function BackgroundPopover({ view, onClose }: BackgroundPopoverProps) {
  const { t } = useTranslation();
  const setViewBackground = useDashboardStore((s) => s.setViewBackground);
  const loadBackgroundImage = useDashboardStore((s) => s.loadBackgroundImage);
  const ref = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<Mode>(modeOf(view.background));
  const [importError, setImportError] = useState("");

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const background = view.background;
  const imageBackground = background?.kind === "image" ? background : null;

  function applyDefault() {
    setMode("default");
    void setViewBackground(view.id, null);
  }

  function applyPreset(presetId: string) {
    setMode("preset");
    void setViewBackground(view.id, { kind: "preset", preset: presetId });
  }

  type ImageBackground = Extract<DashboardBackground, { kind: "image" }>;
  function applyImagePatch(patch: Partial<Omit<ImageBackground, "kind">>) {
    const base: ImageBackground = imageBackground ?? { kind: "image", file: "", fit: "fill", dim: 0 };
    if (!base.file && !patch.file) return;
    void setViewBackground(view.id, { ...base, ...patch, kind: "image" });
  }

  async function chooseImage() {
    setImportError("");
    try {
      let sourcePath: string | null = null;
      if (isTauriRuntime()) {
        const selected = await openDialog({
          directory: false,
          multiple: false,
          title: t("dashboard.backgroundChooseImage"),
          filters: [{
            name: t("dashboard.backgroundImageFilter"),
            extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp"],
          }],
        });
        sourcePath = typeof selected === "string" ? selected : null;
      } else {
        sourcePath = "preview-image.png";
      }
      if (!sourcePath) return;
      const file = await importBackgroundImage(sourcePath);
      await loadBackgroundImage(file);
      setMode("image");
      const base = imageBackground ?? { fit: "fill" as BackgroundFit, dim: 0 };
      void setViewBackground(view.id, { kind: "image", file, fit: base.fit, dim: base.dim });
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    }
  }

  function removeImage() {
    applyDefault();
  }

  return (
    <div ref={ref} className="dw-bg-popover">
      <header className="dw-bg-popover-head">{t("dashboard.changeBackground")}</header>

      <div className="dw-bg-seg">
        <button className={mode === "default" ? "active" : ""} onClick={applyDefault}>
          {t("dashboard.backgroundModeDefault")}
        </button>
        <button className={mode === "preset" ? "active" : ""} onClick={() => setMode("preset")}>
          {t("dashboard.backgroundModePreset")}
        </button>
        <button className={mode === "image" ? "active" : ""} onClick={() => setMode("image")}>
          {t("dashboard.backgroundModeImage")}
        </button>
      </div>

      {mode === "default" && (
        <p className="dw-muted">{t("dashboard.backgroundDefaultHint")}</p>
      )}

      {mode === "preset" && (
        <div className="dw-bg-preset-grid">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className={background?.kind === "preset" && background.preset === preset.id ? "active" : ""}
              style={{ background: preset.css }}
              title={t(preset.labelKey)}
              aria-label={t(preset.labelKey)}
              onClick={() => applyPreset(preset.id)}
            />
          ))}
        </div>
      )}

      {mode === "image" && (
        <div className="dw-bg-image">
          <div className="dw-bg-image-actions">
            <button className="dw-secondary-button" onClick={() => { void chooseImage(); }}>
              {t("dashboard.backgroundChooseImage")}
            </button>
            {imageBackground && (
              <button className="dw-secondary-button" onClick={removeImage}>
                {t("dashboard.backgroundRemoveImage")}
              </button>
            )}
          </div>
          {importError && <small className="dw-muted">{importError}</small>}
          {imageBackground && (
            <>
              <label className="dw-field">
                <span>{t("dashboard.backgroundFitLabel")}</span>
                <select
                  value={imageBackground.fit}
                  onChange={(e) => applyImagePatch({ fit: e.target.value as BackgroundFit })}
                >
                  {BACKGROUND_FITS.map((fit) => (
                    <option key={fit} value={fit}>{t(`dashboard.backgroundFit.${fit}`)}</option>
                  ))}
                </select>
              </label>
              <label className="dw-field">
                <span>{t("dashboard.backgroundDimLabel")}</span>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={imageBackground.dim}
                  onChange={(e) => applyImagePatch({ dim: Number(e.target.value) })}
                />
                <small className="dw-muted">{imageBackground.dim}</small>
              </label>
            </>
          )}
          {!imageBackground && <p className="dw-muted">{t("dashboard.backgroundImageHint")}</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add popover styles to `dashboard.css`**

In `src/dashboard/dashboard.css`, append at the end of the file:

```css
.dw-bg-popover {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 200;
  width: 320px;
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--dashboard-radius-lg);
  box-shadow: var(--dashboard-shadow-ambient);
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
  color: var(--text);
}

.dw-bg-popover-head {
  font-weight: 650;
}

.dw-bg-seg {
  display: flex;
  gap: 3px;
  padding: 3px;
  background: var(--surface-muted);
  border-radius: 8px;
}

.dw-bg-seg button {
  flex: 1;
  padding: 5px 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted, var(--text));
  font-size: 12px;
  cursor: pointer;
}

.dw-bg-seg button.active {
  background: var(--surface);
  box-shadow: var(--dashboard-shadow-card);
  font-weight: 600;
}

.dw-bg-preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.dw-bg-preset-grid button {
  aspect-ratio: 1.4;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
}

.dw-bg-preset-grid button.active {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.dw-bg-image {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dw-bg-image-actions {
  display: flex;
  gap: 8px;
}
```

- [ ] **Step 3: Wire the popover into `DashboardPage`**

In `src/dashboard/DashboardPage.tsx`:

Add the import near the other edit imports:

```ts
import { BackgroundPopover } from "./edit/BackgroundPopover";
```

Add open-state next to the other `useState` hooks (~line 34):

```ts
  const [backgroundOpen, setBackgroundOpen] = useState(false);
```

Pass `onOpenBackground` to `DashboardCanvas` (~line 208):

```tsx
        <DashboardCanvas
          view={activeView}
          instances={viewInstances}
          onCustomize={(instance, anchor) => setCustomize({ instance, rect: anchor.getBoundingClientRect() })}
          onOpenBackground={() => setBackgroundOpen(true)}
        />
```

Mount the popover next to the `CustomizePopover` mount (~line 218), before the closing `</main>`:

```tsx
      {backgroundOpen && (
        <BackgroundPopover view={activeView} onClose={() => setBackgroundOpen(false)} />
      )}
```

- [ ] **Step 4: Verify typecheck and build**

Run: `npm run check && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/edit/BackgroundPopover.tsx src/dashboard/dashboard.css src/dashboard/DashboardPage.tsx
git commit -m "feat: add Change Background popover"
```

---

## Task 12: i18n keys, localization TODOs, docs, and full verification

**Files:**
- Modify: `src/i18n/locales/en.json` (new `dashboard.*` keys)
- Create: `docs/localization_todo/dashboard.<keyPath>.md` (one per new key)
- Modify: `docs/DASHBOARD.md`

- [ ] **Step 1: Add the English i18n keys**

In `src/i18n/locales/en.json`, inside the `"dashboard"` object (alongside the other keys, e.g. after `"advancedNothing"`), add:

```json
    "changeBackground": "Change Background…",
    "backgroundModeDefault": "Theme Default",
    "backgroundModePreset": "Color & Gradient",
    "backgroundModeImage": "Image",
    "backgroundDefaultHint": "Uses the active color scheme background.",
    "backgroundChooseImage": "Choose Image…",
    "backgroundRemoveImage": "Remove",
    "backgroundImageFilter": "Images",
    "backgroundImageHint": "Choose an image to use as this view's background.",
    "backgroundFitLabel": "Fit",
    "backgroundDimLabel": "Dim / Lighten",
    "backgroundFit": {
      "fill": "Fill",
      "fit": "Fit",
      "stretch": "Stretch",
      "tile": "Tile",
      "center": "Center"
    },
    "backgroundPresets": {
      "mist": "Mist",
      "sand": "Warm Sand",
      "sage": "Sage",
      "sky": "Sky",
      "blush": "Blush",
      "lavender": "Lavender",
      "slate": "Slate",
      "graphite": "Graphite",
      "gDawn": "Dawn",
      "gFog": "Fog",
      "gMeadow": "Meadow",
      "gDusk": "Dusk",
      "gLinen": "Linen",
      "gHorizon": "Horizon",
      "gPetal": "Petal",
      "gTwilight": "Twilight"
    },
```

- [ ] **Step 2: Create the localization TODO files**

For every new leaf key added in Step 1, copy `docs/localization_todo/_TEMPLATE.md` to `docs/localization_todo/dashboard.<keyPath>.md` and fill every field. The full list of files to create (one key per file, dotted path including nested objects):

```
dashboard.changeBackground.md
dashboard.backgroundModeDefault.md
dashboard.backgroundModePreset.md
dashboard.backgroundModeImage.md
dashboard.backgroundDefaultHint.md
dashboard.backgroundChooseImage.md
dashboard.backgroundRemoveImage.md
dashboard.backgroundImageFilter.md
dashboard.backgroundImageHint.md
dashboard.backgroundFitLabel.md
dashboard.backgroundDimLabel.md
dashboard.backgroundFit.fill.md
dashboard.backgroundFit.fit.md
dashboard.backgroundFit.stretch.md
dashboard.backgroundFit.tile.md
dashboard.backgroundFit.center.md
dashboard.backgroundPresets.mist.md
dashboard.backgroundPresets.sand.md
dashboard.backgroundPresets.sage.md
dashboard.backgroundPresets.sky.md
dashboard.backgroundPresets.blush.md
dashboard.backgroundPresets.lavender.md
dashboard.backgroundPresets.slate.md
dashboard.backgroundPresets.graphite.md
dashboard.backgroundPresets.gDawn.md
dashboard.backgroundPresets.gFog.md
dashboard.backgroundPresets.gMeadow.md
dashboard.backgroundPresets.gDusk.md
dashboard.backgroundPresets.gHorizon.md
dashboard.backgroundPresets.gLinen.md
dashboard.backgroundPresets.gPetal.md
dashboard.backgroundPresets.gTwilight.md
```

Each file follows `_TEMPLATE.md`. Example for `docs/localization_todo/dashboard.changeBackground.md`:

```markdown
# dashboard.changeBackground

- **English value**: `Change Background…`
- **Namespace**: `app`
- **File/component**: `src/dashboard/view/DashboardCanvas.tsx`
- **UI role**: `button`
- **User flow**: Shown as the single item in the native context menu that appears when the user right-clicks empty space on the Dashboard canvas; opens the background-editing popover.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Domain notes**: "Dashboard" is the widget-playground module. The background is per Dashboard View. Trailing ellipsis indicates it opens a further dialog — keep the ellipsis convention if the target language uses it.

<!--
Filename: dashboard.changeBackground.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
```

Use the matching `File/component` for each: keys used only in `BackgroundPopover.tsx` reference that file; `changeBackground` references `DashboardCanvas.tsx`. The `Namespace` field is `app` for all of them (the AGENTS.md namespace list groups dashboard strings under `app`; confirm against neighbouring existing `dashboard.*` TODO files if any exist, and match them).

- [ ] **Step 3: Document the feature in `docs/DASHBOARD.md`**

In `docs/DASHBOARD.md`, under the `## Theming` section, add a subsection:

```markdown
### Per-View Backgrounds

Each Dashboard View carries an optional background, stored as a nullable `background_json`
column on `dashboard_views` (`NULL` = theme default). Right-clicking empty canvas space
opens a native context menu with "Change Background…", which opens the app-owned
`BackgroundPopover`. Three modes:

- **Theme Default** — `NULL`; the canvas uses the active color scheme's `--app-bg`.
- **Color & Gradient** — `{ kind: "preset", preset }` referencing one of the 16 fixed
  entries in `src/dashboard/registry/backgroundPresets.ts` (whitelisted in Rust as
  `BACKGROUND_PRESET_IDS`).
- **Image** — `{ kind: "image", file, fit, dim }`. The image file is copied into a
  `backgrounds/` folder next to the executable (mirroring custom fonts) and referenced by
  filename. `fit` is one of fill/fit/stretch/tile/center; `dim` is a signed −100..100
  value (negative darkens, positive lightens). Unreferenced image files are swept after
  view-mutating commands by `prune_unreferenced_backgrounds`.

The background renders on a dedicated `.dw-canvas-bg` layer behind the widget grid; it is
canvas-only and does not affect the topbar or widget chrome. A missing image file or
unparseable `background_json` falls back to theme default rather than erroring.

Background image files are **not** included in the settings export ZIP — an imported
database may reference a missing image, which is handled by the theme-default fallback.
```

- [ ] **Step 4: Run all verification checks**

Run each and confirm the expected result:

- `npm run check` → no TypeScript errors.
- `npm run build` → build succeeds.
- `cargo check --manifest-path src-tauri/Cargo.toml` → compiles.
- `cargo test --manifest-path src-tauri/Cargo.toml` → all tests pass.

- [ ] **Step 5: Manual smoke test in the real Tauri runtime**

Per AGENTS.md "Native Debug Verification", run `npm run tauri dev` and verify:

1. Right-click empty Dashboard canvas space → native context menu shows "Change Background…".
2. Right-click *on a widget* → no "Change Background…" menu.
3. Enter Edit Layout mode → right-click empty space → no menu (suppressed); grid lines still visible.
4. Open the popover → "Color & Gradient" → click a swatch → canvas background updates live.
5. "Image" → "Choose Image…" → pick a photo → background appears; change Fit dropdown → layout updates; drag the Dim/Lighten slider left then right → canvas darkens then lightens live.
6. "Theme Default" → background clears back to the color scheme default.
7. Switch to another View → it has its own (default) background; switch back → the configured background persisted.
8. Restart the app → the background persisted across restart.
9. Settings → General → Settings data → Reset Dashboard → views reset and `backgrounds/` folder is emptied.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/locales/en.json docs/localization_todo docs/DASHBOARD.md
git commit -m "feat: add i18n keys and docs for dashboard view backgrounds"
```

---

## Self-Review Notes

**Spec coverage** — every spec section maps to tasks:
- Data model (`background_json`, discriminated union, `NULL` = default) → Tasks 1, 2, 3, 6.
- Storage layer (backgrounds folder, import/load commands, validation, orphan cleanup, reset) → Tasks 2, 4, 5.
- Frontend (preset registry, context menu, popover, rendering, fit mapping, image cache) → Tasks 7, 8, 9, 10, 11.
- i18n + edge cases (missing file fallback, edit-mode suppression, defensive reads, reset) → Tasks 3 (corrupt JSON test), 4/10 (missing file fallback), 10 (edit-mode + widget-target suppression), 5/12 (reset), 12 (i18n).
- Out-of-scope items (export ZIP, per-widget, AI tools) → correctly not implemented; export limitation is documented in Task 12 Step 3.

**Type consistency** — `DashboardBackground` variants (`preset` / `image`), `BackgroundFit` values (fill/fit/stretch/tile/center), and the 16 preset ids are defined identically in Rust (`dashboard_validation.rs` whitelists, `dashboard_storage.rs` enum) and TypeScript (`types.ts`, `backgroundPresets.ts`). The `dim` field is `i64` in Rust / `number` in TS, range −100..100 enforced on both sides. `ViewPatch.background` is `Option<Option<DashboardBackground>>` in Rust and `DashboardBackground | null` (optional) in TS — the outer optionality is the patch-presence, the inner null is the explicit clear.

**Known follow-up for the executor:** Task 5 Step 1 assumes a `log` facade in `lib.rs`; verify with the grep noted there and fall back to `eprintln!` if absent.
