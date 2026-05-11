# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Dashboard module on a SQLite-backed, registry-driven widget system with nine visual presets, per-instance customization (preset/accent/icon/title), free-position drag-and-drop layout, and a three-kind widget model (`builtIn` / `content` / `script`) that the AI Assistant can manipulate through atomic Tauri commands.

**Architecture:** Three new SQLite tables (`dashboard_views`, `dashboard_widget_instances`, `dashboard_custom_widgets`) replace the current `localStorage` persistence. A Zustand store holds in-memory state and mirrors every change through typed Tauri command wrappers. Widget kinds resolve to one of three renderers: a built-in TypeScript registry (5 widgets), a declarative `content` renderer (4 shapes: markdown / kvList / checklist / stat), or an `iframe srcdoc` host for AI-authored `script` widgets with `network` and `pollSeconds` permissions. Layout uses `react-grid-layout` (12-col, vertical compact, debounced batched writes).

**Tech Stack:** Rust + `rusqlite` (existing schema layer), Tauri v2 command boundary, React 19 + TypeScript, Zustand store, `react-grid-layout` for drag/resize, `lucide-react` icons, `i18next` for i18n. Tests use `#[test]` in Rust modules and `.typecheck.ts` runtime-asserting files for pure TS logic (matching existing repo conventions — no vitest).

**Reference docs:** `docs/DASHBOARD.md` (durable architecture), `docs/superpowers/specs/2026-05-11-dashboard-redesign-design.md` (decision record).

**Working directory for all paths:** `C:\Users\ryan.RYAN5080\Desktop\KKTerm\.claude\worktrees\trusting-newton-16d541`. All relative paths in this plan are rooted there.

---

## Phase A — Backend foundation (Rust + SQLite)

### Task A1: Bump schema version and append three Dashboard tables

**Files:**
- Modify: `src-tauri/src/storage.rs` (around `SCHEMA_USER_VERSION` constant near line 15 and the `CURRENT_SCHEMA` const near line 17)

- [ ] **Step 1: Open `src-tauri/src/storage.rs` and locate `const SCHEMA_USER_VERSION: i32 = 8;`. Bump to 9.**

```rust
const SCHEMA_USER_VERSION: i32 = 9;
```

- [ ] **Step 2: At the end of the `CURRENT_SCHEMA` const string (just before the closing `"#;`), append the three Dashboard tables and one index.**

```sql

CREATE TABLE IF NOT EXISTS dashboard_views (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    grid_density TEXT NOT NULL DEFAULT 'default'
        CHECK (grid_density IN ('compact', 'default', 'roomy'))
);

CREATE TABLE IF NOT EXISTS dashboard_custom_widgets (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('content', 'script')),
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'custom',
    body_json TEXT NOT NULL,
    created_by TEXT NOT NULL CHECK (created_by IN ('user', 'agent')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dashboard_widget_instances (
    id TEXT PRIMARY KEY,
    view_id TEXT NOT NULL REFERENCES dashboard_views(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('builtIn', 'content', 'script')),
    source_id TEXT NOT NULL,
    preset TEXT NOT NULL,
    accent_name TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    custom_title TEXT,
    grid_x INTEGER NOT NULL,
    grid_y INTEGER NOT NULL,
    grid_w INTEGER NOT NULL,
    grid_h INTEGER NOT NULL,
    sort_order INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dashboard_widget_instances_view
    ON dashboard_widget_instances(view_id, sort_order);
```

- [ ] **Step 3: Compile to verify the schema string parses and the table definitions match expected SQL.**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: success (no Rust compile errors; the SQL is a string literal so syntax errors won't surface here, only Rust-level errors).

- [ ] **Step 4: Commit.**

```bash
git add src-tauri/src/storage.rs
git commit -m "feat(dashboard): bump schema to v9, add dashboard_views/widget_instances/custom_widgets tables"
```

---

### Task A2: Add Rust validators module with full unit tests

**Files:**
- Create: `src-tauri/src/dashboard_validation.rs`
- Modify: `src-tauri/src/lib.rs` (add `mod dashboard_validation;` near the other module declarations)

- [ ] **Step 1: Create `src-tauri/src/dashboard_validation.rs` with the full validator code.**

```rust
use serde::{Deserialize, Serialize};

pub const PRESETS: &[&str] = &[
    "panel", "ambient", "glass", "tile", "hero",
    "mono", "stack", "action", "band",
];

pub const ACCENTS: &[&str] = &[
    "blue", "indigo", "teal", "green", "amber",
    "red", "purple", "pink", "slate", "cyan",
    "orange", "rose", "emerald", "sky",
];

pub const ICONS: &[&str] = &[
    "Hash", "Network", "Terminal", "Server", "Cpu", "Activity", "Bolt", "Sun",
    "Bell", "Bot", "Wrench", "Folder", "Clock", "Doc", "Cloud", "Calendar",
    "Database", "Globe", "Lock", "Key", "Mail", "Mic", "Monitor", "Music",
    "Package", "Phone", "Pin", "Power", "Printer", "Radio", "Search",
    "Settings", "Shield", "ShoppingCart", "Star", "Tag", "Tool", "Trash",
    "Truck", "User", "Users", "Video", "Volume", "Watch", "Wifi", "Wind",
    "Zap", "Layers", "List", "Grid",
];

pub const GRID_COLUMNS: i64 = 12;
pub const MAX_SCRIPT_SOURCE_BYTES: usize = 64 * 1024;
pub const MAX_CONTENT_BODY_BYTES: usize = 32 * 1024;
pub const MIN_POLL_SECONDS: u64 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ValidationError {
    InvalidPreset,
    InvalidAccent,
    InvalidIcon,
    InvalidGridBounds,
    InvalidKind,
    InvalidCustomWidgetKind,
    InvalidContentShape,
    InvalidContentData,
    ContentTooLarge,
    InvalidScriptBody,
    ScriptTooLarge,
    InvalidPermission,
    InvalidPollSeconds,
    InvalidTitle,
    InvalidGridDensity,
}

pub fn validate_preset(value: &str) -> Result<(), ValidationError> {
    if PRESETS.contains(&value) { Ok(()) } else { Err(ValidationError::InvalidPreset) }
}

pub fn validate_accent(value: &str) -> Result<(), ValidationError> {
    if ACCENTS.contains(&value) { Ok(()) } else { Err(ValidationError::InvalidAccent) }
}

pub fn validate_icon(value: &str) -> Result<(), ValidationError> {
    if ICONS.contains(&value) { Ok(()) } else { Err(ValidationError::InvalidIcon) }
}

pub fn validate_grid_bounds(x: i64, y: i64, w: i64, h: i64) -> Result<(), ValidationError> {
    if w < 1 || h < 1 || x < 0 || y < 0 || x + w > GRID_COLUMNS {
        Err(ValidationError::InvalidGridBounds)
    } else {
        Ok(())
    }
}

pub fn validate_kind(kind: &str) -> Result<(), ValidationError> {
    if matches!(kind, "builtIn" | "content" | "script") {
        Ok(())
    } else {
        Err(ValidationError::InvalidKind)
    }
}

pub fn validate_custom_widget_kind(kind: &str) -> Result<(), ValidationError> {
    if matches!(kind, "content" | "script") {
        Ok(())
    } else {
        Err(ValidationError::InvalidCustomWidgetKind)
    }
}

pub fn validate_grid_density(value: &str) -> Result<(), ValidationError> {
    if matches!(value, "compact" | "default" | "roomy") {
        Ok(())
    } else {
        Err(ValidationError::InvalidGridDensity)
    }
}

pub fn validate_title(value: &str) -> Result<(), ValidationError> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.len() > 120 {
        Err(ValidationError::InvalidTitle)
    } else {
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "shape", rename_all = "camelCase")]
pub enum ContentBody {
    Markdown { data: ContentMarkdown },
    KvList { data: ContentKvList },
    Checklist { data: ContentChecklist },
    Stat { data: ContentStat },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ContentMarkdown {
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ContentKvList {
    pub rows: Vec<ContentKvRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ContentKvRow {
    pub label: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ContentChecklist {
    pub items: Vec<ContentChecklistItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ContentChecklistItem {
    pub label: String,
    #[serde(default)]
    pub done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ContentStat {
    pub value: String,
    #[serde(default)]
    pub unit: Option<String>,
    #[serde(default)]
    pub delta: Option<String>,
    #[serde(default)]
    pub caption: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScriptBody {
    pub source: String,
    pub permissions: ScriptPermissions,
    #[serde(default)]
    pub html_shim: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScriptPermissions {
    #[serde(default)]
    pub network: bool,
    #[serde(default)]
    pub poll_seconds: Option<u64>,
}

pub fn validate_content_body_json(json: &str) -> Result<ContentBody, ValidationError> {
    if json.len() > MAX_CONTENT_BODY_BYTES {
        return Err(ValidationError::ContentTooLarge);
    }
    let parsed: ContentBody = serde_json::from_str(json)
        .map_err(|_| ValidationError::InvalidContentShape)?;
    match &parsed {
        ContentBody::Markdown { data } => {
            if data.source.trim().is_empty() {
                return Err(ValidationError::InvalidContentData);
            }
        }
        ContentBody::KvList { data } => {
            if data.rows.is_empty() {
                return Err(ValidationError::InvalidContentData);
            }
        }
        ContentBody::Checklist { data } => {
            if data.items.is_empty() {
                return Err(ValidationError::InvalidContentData);
            }
        }
        ContentBody::Stat { data } => {
            if data.value.trim().is_empty() {
                return Err(ValidationError::InvalidContentData);
            }
        }
    }
    Ok(parsed)
}

pub fn validate_script_body_json(json: &str) -> Result<ScriptBody, ValidationError> {
    if json.len() > MAX_SCRIPT_SOURCE_BYTES + 4096 {
        return Err(ValidationError::ScriptTooLarge);
    }
    let parsed: ScriptBody = serde_json::from_str(json)
        .map_err(|_| ValidationError::InvalidScriptBody)?;
    if parsed.source.len() > MAX_SCRIPT_SOURCE_BYTES {
        return Err(ValidationError::ScriptTooLarge);
    }
    if let Some(secs) = parsed.permissions.poll_seconds {
        if secs < MIN_POLL_SECONDS {
            return Err(ValidationError::InvalidPollSeconds);
        }
    }
    Ok(parsed)
}

pub fn validate_custom_body_for_kind(kind: &str, body_json: &str) -> Result<(), ValidationError> {
    match kind {
        "content" => { validate_content_body_json(body_json)?; Ok(()) }
        "script"  => { validate_script_body_json(body_json)?; Ok(()) }
        _ => Err(ValidationError::InvalidCustomWidgetKind),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preset_known() { assert!(validate_preset("panel").is_ok()); }

    #[test]
    fn preset_unknown() {
        assert_eq!(validate_preset("does-not-exist"), Err(ValidationError::InvalidPreset));
    }

    #[test]
    fn accent_unknown() {
        assert_eq!(validate_accent("neon"), Err(ValidationError::InvalidAccent));
    }

    #[test]
    fn icon_unknown() {
        assert_eq!(validate_icon("NotAnIcon"), Err(ValidationError::InvalidIcon));
    }

    #[test]
    fn grid_bounds_in_range() { assert!(validate_grid_bounds(0, 0, 4, 3).is_ok()); }

    #[test]
    fn grid_bounds_overflow() {
        assert_eq!(
            validate_grid_bounds(10, 0, 4, 1),
            Err(ValidationError::InvalidGridBounds),
        );
    }

    #[test]
    fn grid_bounds_zero_size() {
        assert_eq!(
            validate_grid_bounds(0, 0, 0, 1),
            Err(ValidationError::InvalidGridBounds),
        );
    }

    #[test]
    fn grid_density_known() { assert!(validate_grid_density("compact").is_ok()); }

    #[test]
    fn grid_density_unknown() {
        assert_eq!(validate_grid_density("huge"), Err(ValidationError::InvalidGridDensity));
    }

    #[test]
    fn title_empty_rejected() {
        assert_eq!(validate_title("   "), Err(ValidationError::InvalidTitle));
    }

    #[test]
    fn content_markdown_ok() {
        let json = r#"{"shape":"markdown","data":{"source":"# Hello"}}"#;
        assert!(validate_content_body_json(json).is_ok());
    }

    #[test]
    fn content_markdown_empty_rejected() {
        let json = r#"{"shape":"markdown","data":{"source":"   "}}"#;
        assert_eq!(
            validate_content_body_json(json),
            Err(ValidationError::InvalidContentData),
        );
    }

    #[test]
    fn content_kv_ok() {
        let json = r#"{"shape":"kvList","data":{"rows":[{"label":"a","value":"b"}]}}"#;
        assert!(validate_content_body_json(json).is_ok());
    }

    #[test]
    fn content_unknown_shape_rejected() {
        let json = r#"{"shape":"chart","data":{}}"#;
        assert_eq!(
            validate_content_body_json(json),
            Err(ValidationError::InvalidContentShape),
        );
    }

    #[test]
    fn script_ok() {
        let json = r#"{"source":"console.log(1)","permissions":{"network":false}}"#;
        assert!(validate_script_body_json(json).is_ok());
    }

    #[test]
    fn script_poll_zero_rejected() {
        let json = r#"{"source":"x","permissions":{"network":false,"pollSeconds":0}}"#;
        assert_eq!(
            validate_script_body_json(json),
            Err(ValidationError::InvalidPollSeconds),
        );
    }

    #[test]
    fn script_too_large_rejected() {
        let big = "x".repeat(MAX_SCRIPT_SOURCE_BYTES + 1);
        let json = format!(
            r#"{{"source":{:?},"permissions":{{"network":false}}}}"#,
            big
        );
        assert_eq!(
            validate_script_body_json(&json),
            Err(ValidationError::ScriptTooLarge),
        );
    }
}
```

- [ ] **Step 2: Register the module in `src-tauri/src/lib.rs`. Insert near the other `mod` declarations (around line 1-23, alphabetically reasonable place is between `mod app_tray;` and `mod diagnostics;`).**

```rust
mod dashboard_validation;
```

- [ ] **Step 3: Run the tests.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml dashboard_validation`
Expected: All 16 tests pass.

- [ ] **Step 4: Commit.**

```bash
git add src-tauri/src/dashboard_validation.rs src-tauri/src/lib.rs
git commit -m "feat(dashboard): add Rust validators for preset/accent/icon/grid/content/script with full unit tests"
```

---

### Task A3: Add Rust data structs and storage methods for views

**Files:**
- Create: `src-tauri/src/dashboard_storage.rs`
- Modify: `src-tauri/src/lib.rs` (add `mod dashboard_storage;`)
- Modify: `src-tauri/src/storage.rs` (add a method on `Storage` to expose a `&Mutex<SqliteConnection>` accessor if not present — see step 2)

- [ ] **Step 1: Inspect existing repository style.** Read `src-tauri/src/storage.rs` to see how existing read/write methods are written (the file uses `self.connection.lock()` patterns). Repository methods for the Dashboard tables will live in `dashboard_storage.rs` taking `&SqliteConnection` so they can be unit-tested independently.

- [ ] **Step 2: Create `src-tauri/src/dashboard_storage.rs` with view data structs and view repository functions.**

```rust
use rusqlite::{params, Connection as SqliteConnection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::dashboard_validation::{
    validate_accent, validate_custom_body_for_kind, validate_custom_widget_kind,
    validate_grid_bounds, validate_grid_density, validate_icon, validate_kind, validate_preset,
    validate_title, ValidationError,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardView {
    pub id: String,
    pub title: String,
    pub sort_order: i64,
    pub grid_density: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardWidgetInstance {
    pub id: String,
    pub view_id: String,
    pub kind: String,
    pub source_id: String,
    pub preset: String,
    pub accent_name: String,
    pub icon_name: String,
    pub custom_title: Option<String>,
    pub grid_x: i64,
    pub grid_y: i64,
    pub grid_w: i64,
    pub grid_h: i64,
    pub sort_order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardCustomWidget {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub summary: String,
    pub category: String,
    pub body_json: String,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardLoadState {
    pub views: Vec<DashboardView>,
    pub instances: Vec<DashboardWidgetInstance>,
    pub custom_widgets: Vec<DashboardCustomWidget>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstancePatch {
    #[serde(default)] pub preset: Option<String>,
    #[serde(default)] pub accent_name: Option<String>,
    #[serde(default)] pub icon_name: Option<String>,
    #[serde(default)] pub custom_title: Option<Option<String>>,
    #[serde(default)] pub grid_x: Option<i64>,
    #[serde(default)] pub grid_y: Option<i64>,
    #[serde(default)] pub grid_w: Option<i64>,
    #[serde(default)] pub grid_h: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewPatch {
    #[serde(default)] pub title: Option<String>,
    #[serde(default)] pub grid_density: Option<String>,
    #[serde(default)] pub sort_order: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomWidgetPatch {
    #[serde(default)] pub title: Option<String>,
    #[serde(default)] pub summary: Option<String>,
    #[serde(default)] pub category: Option<String>,
    #[serde(default)] pub body_json: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutEntry {
    pub id: String,
    pub grid_x: i64,
    pub grid_y: i64,
    pub grid_w: i64,
    pub grid_h: i64,
}

#[derive(Debug)]
pub enum DashboardStorageError {
    Validation(ValidationError),
    Sqlite(rusqlite::Error),
    NotFound,
    InstancesExist { instance_ids: Vec<String> },
}

impl From<rusqlite::Error> for DashboardStorageError {
    fn from(value: rusqlite::Error) -> Self { Self::Sqlite(value) }
}

impl From<ValidationError> for DashboardStorageError {
    fn from(value: ValidationError) -> Self { Self::Validation(value) }
}

pub fn load_state(conn: &SqliteConnection) -> Result<DashboardLoadState, DashboardStorageError> {
    let mut views_stmt = conn.prepare(
        "SELECT id, title, sort_order, grid_density FROM dashboard_views ORDER BY sort_order"
    )?;
    let views = views_stmt
        .query_map([], |row| {
            Ok(DashboardView {
                id: row.get(0)?,
                title: row.get(1)?,
                sort_order: row.get(2)?,
                grid_density: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut inst_stmt = conn.prepare(
        "SELECT id, view_id, kind, source_id, preset, accent_name, icon_name, custom_title,
                grid_x, grid_y, grid_w, grid_h, sort_order
         FROM dashboard_widget_instances
         ORDER BY view_id, sort_order"
    )?;
    let instances = inst_stmt
        .query_map([], |row| {
            Ok(DashboardWidgetInstance {
                id: row.get(0)?,
                view_id: row.get(1)?,
                kind: row.get(2)?,
                source_id: row.get(3)?,
                preset: row.get(4)?,
                accent_name: row.get(5)?,
                icon_name: row.get(6)?,
                custom_title: row.get(7)?,
                grid_x: row.get(8)?,
                grid_y: row.get(9)?,
                grid_w: row.get(10)?,
                grid_h: row.get(11)?,
                sort_order: row.get(12)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut custom_stmt = conn.prepare(
        "SELECT id, kind, title, summary, category, body_json, created_by FROM dashboard_custom_widgets"
    )?;
    let custom_widgets = custom_stmt
        .query_map([], |row| {
            Ok(DashboardCustomWidget {
                id: row.get(0)?,
                kind: row.get(1)?,
                title: row.get(2)?,
                summary: row.get(3)?,
                category: row.get(4)?,
                body_json: row.get(5)?,
                created_by: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(DashboardLoadState { views, instances, custom_widgets })
}

pub fn create_view(
    conn: &SqliteConnection,
    id: &str,
    title: &str,
    grid_density: Option<&str>,
) -> Result<DashboardView, DashboardStorageError> {
    validate_title(title)?;
    let density = grid_density.unwrap_or("default");
    validate_grid_density(density)?;

    let next_sort: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM dashboard_views",
        [],
        |row| row.get(0),
    )?;
    conn.execute(
        "INSERT INTO dashboard_views (id, title, sort_order, grid_density) VALUES (?, ?, ?, ?)",
        params![id, title, next_sort, density],
    )?;
    Ok(DashboardView {
        id: id.to_string(),
        title: title.to_string(),
        sort_order: next_sort,
        grid_density: density.to_string(),
    })
}

pub fn update_view(
    conn: &SqliteConnection,
    id: &str,
    patch: &ViewPatch,
) -> Result<DashboardView, DashboardStorageError> {
    if let Some(ref title) = patch.title { validate_title(title)?; }
    if let Some(ref d) = patch.grid_density { validate_grid_density(d)?; }

    let current: Option<DashboardView> = conn.query_row(
        "SELECT id, title, sort_order, grid_density FROM dashboard_views WHERE id = ?",
        params![id],
        |row| Ok(DashboardView {
            id: row.get(0)?,
            title: row.get(1)?,
            sort_order: row.get(2)?,
            grid_density: row.get(3)?,
        }),
    ).optional()?;
    let mut current = current.ok_or(DashboardStorageError::NotFound)?;

    if let Some(t) = patch.title.clone()        { current.title = t; }
    if let Some(d) = patch.grid_density.clone() { current.grid_density = d; }
    if let Some(s) = patch.sort_order           { current.sort_order = s; }

    conn.execute(
        "UPDATE dashboard_views SET title = ?, sort_order = ?, grid_density = ? WHERE id = ?",
        params![current.title, current.sort_order, current.grid_density, current.id],
    )?;
    Ok(current)
}

pub fn remove_view(conn: &SqliteConnection, id: &str) -> Result<(), DashboardStorageError> {
    let affected = conn.execute("DELETE FROM dashboard_views WHERE id = ?", params![id])?;
    if affected == 0 { return Err(DashboardStorageError::NotFound); }
    Ok(())
}

pub fn reorder_views(
    conn: &SqliteConnection,
    ordered_ids: &[String],
) -> Result<(), DashboardStorageError> {
    for (idx, id) in ordered_ids.iter().enumerate() {
        conn.execute(
            "UPDATE dashboard_views SET sort_order = ? WHERE id = ?",
            params![idx as i64, id],
        )?;
    }
    Ok(())
}

pub fn add_instance(
    conn: &SqliteConnection,
    id: &str,
    view_id: &str,
    kind: &str,
    source_id: &str,
    preset: &str,
    accent_name: &str,
    icon_name: &str,
    x: i64,
    y: i64,
    w: i64,
    h: i64,
) -> Result<DashboardWidgetInstance, DashboardStorageError> {
    validate_kind(kind)?;
    validate_preset(preset)?;
    validate_accent(accent_name)?;
    validate_icon(icon_name)?;
    validate_grid_bounds(x, y, w, h)?;

    let next_sort: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM dashboard_widget_instances WHERE view_id = ?",
        params![view_id],
        |row| row.get(0),
    )?;
    conn.execute(
        "INSERT INTO dashboard_widget_instances
            (id, view_id, kind, source_id, preset, accent_name, icon_name, custom_title,
             grid_x, grid_y, grid_w, grid_h, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)",
        params![id, view_id, kind, source_id, preset, accent_name, icon_name, x, y, w, h, next_sort],
    )?;
    Ok(DashboardWidgetInstance {
        id: id.to_string(),
        view_id: view_id.to_string(),
        kind: kind.to_string(),
        source_id: source_id.to_string(),
        preset: preset.to_string(),
        accent_name: accent_name.to_string(),
        icon_name: icon_name.to_string(),
        custom_title: None,
        grid_x: x,
        grid_y: y,
        grid_w: w,
        grid_h: h,
        sort_order: next_sort,
    })
}

pub fn update_instance(
    conn: &SqliteConnection,
    id: &str,
    patch: &InstancePatch,
) -> Result<DashboardWidgetInstance, DashboardStorageError> {
    if let Some(ref p) = patch.preset      { validate_preset(p)?; }
    if let Some(ref a) = patch.accent_name { validate_accent(a)?; }
    if let Some(ref i) = patch.icon_name   { validate_icon(i)?; }

    let mut current: DashboardWidgetInstance = conn.query_row(
        "SELECT id, view_id, kind, source_id, preset, accent_name, icon_name, custom_title,
                grid_x, grid_y, grid_w, grid_h, sort_order
         FROM dashboard_widget_instances WHERE id = ?",
        params![id],
        |row| Ok(DashboardWidgetInstance {
            id: row.get(0)?,
            view_id: row.get(1)?,
            kind: row.get(2)?,
            source_id: row.get(3)?,
            preset: row.get(4)?,
            accent_name: row.get(5)?,
            icon_name: row.get(6)?,
            custom_title: row.get(7)?,
            grid_x: row.get(8)?,
            grid_y: row.get(9)?,
            grid_w: row.get(10)?,
            grid_h: row.get(11)?,
            sort_order: row.get(12)?,
        }),
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => DashboardStorageError::NotFound,
        other => DashboardStorageError::Sqlite(other),
    })?;

    if let Some(p) = patch.preset.clone()         { current.preset = p; }
    if let Some(a) = patch.accent_name.clone()    { current.accent_name = a; }
    if let Some(i) = patch.icon_name.clone()      { current.icon_name = i; }
    if let Some(ct) = patch.custom_title.clone()  { current.custom_title = ct; }
    if let Some(x) = patch.grid_x                 { current.grid_x = x; }
    if let Some(y) = patch.grid_y                 { current.grid_y = y; }
    if let Some(w) = patch.grid_w                 { current.grid_w = w; }
    if let Some(h) = patch.grid_h                 { current.grid_h = h; }

    validate_grid_bounds(current.grid_x, current.grid_y, current.grid_w, current.grid_h)?;

    conn.execute(
        "UPDATE dashboard_widget_instances
            SET preset = ?, accent_name = ?, icon_name = ?, custom_title = ?,
                grid_x = ?, grid_y = ?, grid_w = ?, grid_h = ?
            WHERE id = ?",
        params![
            current.preset, current.accent_name, current.icon_name, current.custom_title,
            current.grid_x, current.grid_y, current.grid_w, current.grid_h, current.id,
        ],
    )?;
    Ok(current)
}

pub fn remove_instance(conn: &SqliteConnection, id: &str) -> Result<(), DashboardStorageError> {
    let affected = conn.execute(
        "DELETE FROM dashboard_widget_instances WHERE id = ?", params![id]
    )?;
    if affected == 0 { return Err(DashboardStorageError::NotFound); }
    Ok(())
}

pub fn apply_layout(
    conn: &SqliteConnection,
    view_id: &str,
    layout: &[LayoutEntry],
) -> Result<(), DashboardStorageError> {
    for entry in layout {
        validate_grid_bounds(entry.grid_x, entry.grid_y, entry.grid_w, entry.grid_h)?;
    }
    let tx_savepoint = conn.unchecked_transaction()?;
    for (idx, entry) in layout.iter().enumerate() {
        tx_savepoint.execute(
            "UPDATE dashboard_widget_instances
                SET grid_x = ?, grid_y = ?, grid_w = ?, grid_h = ?, sort_order = ?
                WHERE id = ? AND view_id = ?",
            params![entry.grid_x, entry.grid_y, entry.grid_w, entry.grid_h, idx as i64, entry.id, view_id],
        )?;
    }
    tx_savepoint.commit()?;
    Ok(())
}

pub fn create_custom_widget(
    conn: &SqliteConnection,
    id: &str,
    kind: &str,
    title: &str,
    summary: &str,
    category: &str,
    body_json: &str,
    created_by: &str,
) -> Result<DashboardCustomWidget, DashboardStorageError> {
    validate_custom_widget_kind(kind)?;
    validate_title(title)?;
    validate_custom_body_for_kind(kind, body_json)?;
    if !matches!(created_by, "user" | "agent") {
        return Err(DashboardStorageError::Validation(ValidationError::InvalidContentData));
    }
    conn.execute(
        "INSERT INTO dashboard_custom_widgets
            (id, kind, title, summary, category, body_json, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        params![id, kind, title, summary, category, body_json, created_by],
    )?;
    Ok(DashboardCustomWidget {
        id: id.to_string(),
        kind: kind.to_string(),
        title: title.to_string(),
        summary: summary.to_string(),
        category: category.to_string(),
        body_json: body_json.to_string(),
        created_by: created_by.to_string(),
    })
}

pub fn update_custom_widget(
    conn: &SqliteConnection,
    id: &str,
    patch: &CustomWidgetPatch,
) -> Result<DashboardCustomWidget, DashboardStorageError> {
    let mut current: DashboardCustomWidget = conn.query_row(
        "SELECT id, kind, title, summary, category, body_json, created_by
         FROM dashboard_custom_widgets WHERE id = ?",
        params![id],
        |row| Ok(DashboardCustomWidget {
            id: row.get(0)?,
            kind: row.get(1)?,
            title: row.get(2)?,
            summary: row.get(3)?,
            category: row.get(4)?,
            body_json: row.get(5)?,
            created_by: row.get(6)?,
        }),
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => DashboardStorageError::NotFound,
        other => DashboardStorageError::Sqlite(other),
    })?;

    if let Some(t) = patch.title.clone()    { validate_title(&t)?; current.title = t; }
    if let Some(s) = patch.summary.clone()  { current.summary = s; }
    if let Some(c) = patch.category.clone() { current.category = c; }
    if let Some(b) = patch.body_json.clone() {
        validate_custom_body_for_kind(&current.kind, &b)?;
        current.body_json = b;
    }

    conn.execute(
        "UPDATE dashboard_custom_widgets
            SET title = ?, summary = ?, category = ?, body_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?",
        params![current.title, current.summary, current.category, current.body_json, current.id],
    )?;
    Ok(current)
}

pub fn remove_custom_widget(
    conn: &SqliteConnection,
    id: &str,
    force_delete_instances: bool,
) -> Result<(), DashboardStorageError> {
    let mut stmt = conn.prepare(
        "SELECT id FROM dashboard_widget_instances WHERE source_id = ? AND kind IN ('content', 'script')"
    )?;
    let instance_ids: Vec<String> = stmt
        .query_map(params![id], |row| row.get::<_, String>(0))?
        .collect::<Result<Vec<_>, _>>()?;
    drop(stmt);

    if !instance_ids.is_empty() && !force_delete_instances {
        return Err(DashboardStorageError::InstancesExist { instance_ids });
    }
    let tx = conn.unchecked_transaction()?;
    if !instance_ids.is_empty() {
        for inst_id in &instance_ids {
            tx.execute("DELETE FROM dashboard_widget_instances WHERE id = ?", params![inst_id])?;
        }
    }
    tx.execute("DELETE FROM dashboard_custom_widgets WHERE id = ?", params![id])?;
    tx.commit()?;
    Ok(())
}

pub fn reset_dashboard(conn: &SqliteConnection) -> Result<(), DashboardStorageError> {
    let tx = conn.unchecked_transaction()?;
    tx.execute("DELETE FROM dashboard_widget_instances", [])?;
    tx.execute("DELETE FROM dashboard_custom_widgets", [])?;
    tx.execute("DELETE FROM dashboard_views", [])?;
    tx.commit()?;
    seed_default(conn)?;
    Ok(())
}

pub fn seed_default(conn: &SqliteConnection) -> Result<(), DashboardStorageError> {
    let view_exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM dashboard_views", [], |row| row.get(0)
    )?;
    if view_exists > 0 { return Ok(()); }
    create_view(conn, "default", "Default", Some("default"))?;
    add_instance(
        conn, "inst-app-launcher", "default",
        "builtIn", "appLauncher",
        "panel", "blue", "Wrench",
        0, 0, 4, 3,
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn open_test_db() -> SqliteConnection {
        let conn = SqliteConnection::open_in_memory().unwrap();
        // Apply the relevant subset of CURRENT_SCHEMA needed for these tests.
        conn.execute_batch(r#"
            CREATE TABLE dashboard_views (
                id TEXT PRIMARY KEY, title TEXT NOT NULL, sort_order INTEGER NOT NULL,
                grid_density TEXT NOT NULL DEFAULT 'default'
                    CHECK (grid_density IN ('compact', 'default', 'roomy'))
            );
            CREATE TABLE dashboard_custom_widgets (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL CHECK (kind IN ('content','script')),
                title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL DEFAULT 'custom',
                body_json TEXT NOT NULL,
                created_by TEXT NOT NULL CHECK (created_by IN ('user','agent')),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE dashboard_widget_instances (
                id TEXT PRIMARY KEY,
                view_id TEXT NOT NULL REFERENCES dashboard_views(id) ON DELETE CASCADE,
                kind TEXT NOT NULL CHECK (kind IN ('builtIn','content','script')),
                source_id TEXT NOT NULL, preset TEXT NOT NULL, accent_name TEXT NOT NULL,
                icon_name TEXT NOT NULL, custom_title TEXT,
                grid_x INTEGER NOT NULL, grid_y INTEGER NOT NULL,
                grid_w INTEGER NOT NULL, grid_h INTEGER NOT NULL,
                sort_order INTEGER NOT NULL
            );
        "#).unwrap();
        conn.execute("PRAGMA foreign_keys = ON", []).unwrap();
        conn
    }

    #[test]
    fn seed_creates_default_view_and_app_launcher() {
        let conn = open_test_db();
        seed_default(&conn).unwrap();
        let state = load_state(&conn).unwrap();
        assert_eq!(state.views.len(), 1);
        assert_eq!(state.views[0].id, "default");
        assert_eq!(state.instances.len(), 1);
        assert_eq!(state.instances[0].source_id, "appLauncher");
    }

    #[test]
    fn seed_is_idempotent() {
        let conn = open_test_db();
        seed_default(&conn).unwrap();
        seed_default(&conn).unwrap();
        let state = load_state(&conn).unwrap();
        assert_eq!(state.views.len(), 1);
    }

    #[test]
    fn add_and_update_instance_round_trip() {
        let conn = open_test_db();
        create_view(&conn, "v1", "First", None).unwrap();
        let inst = add_instance(
            &conn, "i1", "v1", "builtIn", "hashCalculator",
            "panel", "indigo", "Hash", 0, 0, 3, 2
        ).unwrap();
        assert_eq!(inst.grid_w, 3);
        let updated = update_instance(&conn, "i1", &InstancePatch {
            preset: Some("ambient".into()),
            accent_name: None, icon_name: None, custom_title: None,
            grid_x: None, grid_y: None, grid_w: None, grid_h: None,
        }).unwrap();
        assert_eq!(updated.preset, "ambient");
    }

    #[test]
    fn invalid_grid_rejected() {
        let conn = open_test_db();
        create_view(&conn, "v1", "First", None).unwrap();
        let err = add_instance(
            &conn, "i-bad", "v1", "builtIn", "x",
            "panel", "blue", "Hash", 10, 0, 5, 1
        );
        assert!(matches!(err, Err(DashboardStorageError::Validation(
            ValidationError::InvalidGridBounds
        ))));
    }

    #[test]
    fn cascade_on_view_delete() {
        let conn = open_test_db();
        create_view(&conn, "v1", "First", None).unwrap();
        add_instance(
            &conn, "i1", "v1", "builtIn", "x",
            "panel", "blue", "Hash", 0, 0, 3, 2
        ).unwrap();
        remove_view(&conn, "v1").unwrap();
        let state = load_state(&conn).unwrap();
        assert_eq!(state.instances.len(), 0);
    }

    #[test]
    fn remove_custom_widget_blocks_when_referenced() {
        let conn = open_test_db();
        create_view(&conn, "v1", "First", None).unwrap();
        create_custom_widget(
            &conn, "cw1", "content", "My Markdown", "", "custom",
            r#"{"shape":"markdown","data":{"source":"hi"}}"#, "agent",
        ).unwrap();
        add_instance(
            &conn, "inst", "v1", "content", "cw1",
            "panel", "blue", "Hash", 0, 0, 3, 2
        ).unwrap();
        let err = remove_custom_widget(&conn, "cw1", false);
        assert!(matches!(err, Err(DashboardStorageError::InstancesExist { .. })));
        remove_custom_widget(&conn, "cw1", true).unwrap();
        let state = load_state(&conn).unwrap();
        assert_eq!(state.instances.len(), 0);
        assert_eq!(state.custom_widgets.len(), 0);
    }

    #[test]
    fn apply_layout_updates_in_one_pass() {
        let conn = open_test_db();
        create_view(&conn, "v1", "First", None).unwrap();
        add_instance(&conn, "i1", "v1", "builtIn", "x", "panel", "blue", "Hash", 0, 0, 3, 2).unwrap();
        add_instance(&conn, "i2", "v1", "builtIn", "x", "panel", "blue", "Hash", 3, 0, 3, 2).unwrap();
        apply_layout(&conn, "v1", &[
            LayoutEntry { id: "i1".into(), grid_x: 4, grid_y: 1, grid_w: 4, grid_h: 2 },
            LayoutEntry { id: "i2".into(), grid_x: 0, grid_y: 0, grid_w: 4, grid_h: 1 },
        ]).unwrap();
        let state = load_state(&conn).unwrap();
        let i1 = state.instances.iter().find(|i| i.id == "i1").unwrap();
        assert_eq!((i1.grid_x, i1.grid_y, i1.grid_w, i1.grid_h), (4, 1, 4, 2));
    }
}
```

- [ ] **Step 3: Register the module in `src-tauri/src/lib.rs` (add `mod dashboard_storage;` next to `mod dashboard_validation;`).**

```rust
mod dashboard_storage;
```

- [ ] **Step 4: Run the new tests.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml dashboard_storage`
Expected: All 7 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add src-tauri/src/dashboard_storage.rs src-tauri/src/lib.rs
git commit -m "feat(dashboard): add dashboard_storage repository with full CRUD and unit tests"
```

---

### Task A4: Hook seeding into Storage::open and expose connection accessor

**Files:**
- Modify: `src-tauri/src/storage.rs`

- [ ] **Step 1: Locate the `Storage` struct's constructor / open method in `storage.rs`. There is a method that opens the SQLite DB, applies `CURRENT_SCHEMA`, sets `user_version`, and returns the `Storage`. Find it by searching for `fn open` or where `SCHEMA_USER_VERSION` is written.**

Run: `grep -n "SCHEMA_USER_VERSION\|fn open\|fn new" src-tauri/src/storage.rs | head -20`

Identify the call site that runs after `execute_batch(CURRENT_SCHEMA)`. Immediately after the batch execute (and after `user_version` is set), call the seed.

- [ ] **Step 2: Insert the seed call in the Storage open path.** Inside the open/new method, after the schema batch executes successfully and the user_version is updated, add:

```rust
crate::dashboard_storage::seed_default(&conn).map_err(|err| match err {
    crate::dashboard_storage::DashboardStorageError::Sqlite(e) => e,
    other => rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_ERROR),
        Some(format!("dashboard seed failed: {:?}", other)),
    ),
})?;
```

If the surrounding function returns a different error type, wrap accordingly — the exact mapping depends on the existing signature (which can be inspected one line above).

- [ ] **Step 3: Add a public accessor on `Storage` so other modules can call methods that need `&SqliteConnection`.** Find the impl block for `Storage` and add (if not present):

```rust
impl Storage {
    pub fn with_connection<R>(
        &self,
        f: impl FnOnce(&rusqlite::Connection) -> R,
    ) -> R {
        let conn = self.connection.lock().expect("dashboard storage mutex poisoned");
        f(&*conn)
    }
}
```

If an equivalent accessor already exists, use that one and skip this addition.

- [ ] **Step 4: Build to verify.**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: success.

- [ ] **Step 5: Commit.**

```bash
git add src-tauri/src/storage.rs
git commit -m "feat(dashboard): seed Default view on storage open and expose connection accessor"
```

---

### Task A5: Add Tauri command handlers — view + load_state commands

**Files:**
- Create: `src-tauri/src/dashboard_commands.rs`
- Modify: `src-tauri/src/lib.rs` (add `mod dashboard_commands;` and add command names to the `invoke_handler!` list)

- [ ] **Step 1: Create `src-tauri/src/dashboard_commands.rs` with view commands and `dashboard_load_state`.**

```rust
use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::dashboard_storage::{
    self as ds, CustomWidgetPatch, DashboardCustomWidget, DashboardLoadState, DashboardView,
    DashboardWidgetInstance, InstancePatch, LayoutEntry, ViewPatch,
};

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum DashboardCommandError {
    Validation { reason: String },
    NotFound,
    InstancesExist { instance_ids: Vec<String> },
    Internal { message: String },
}

impl From<ds::DashboardStorageError> for DashboardCommandError {
    fn from(value: ds::DashboardStorageError) -> Self {
        match value {
            ds::DashboardStorageError::Validation(v) => {
                DashboardCommandError::Validation { reason: format!("{:?}", v) }
            }
            ds::DashboardStorageError::NotFound => DashboardCommandError::NotFound,
            ds::DashboardStorageError::InstancesExist { instance_ids } => {
                DashboardCommandError::InstancesExist { instance_ids }
            }
            ds::DashboardStorageError::Sqlite(e) => {
                DashboardCommandError::Internal { message: e.to_string() }
            }
        }
    }
}

fn storage(app: &AppHandle) -> State<'_, crate::storage::Storage> {
    app.state::<crate::storage::Storage>()
}

fn new_id(prefix: &str) -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
    format!("{}-{}", prefix, ts)
}

#[tauri::command]
pub fn dashboard_load_state(app: AppHandle) -> Result<DashboardLoadState, DashboardCommandError> {
    storage(&app).with_connection(|conn| ds::load_state(conn).map_err(Into::into))
}

#[tauri::command]
pub fn dashboard_create_view(
    app: AppHandle,
    title: String,
    grid_density: Option<String>,
) -> Result<DashboardView, DashboardCommandError> {
    let id = new_id("view");
    storage(&app).with_connection(|conn| {
        ds::create_view(conn, &id, &title, grid_density.as_deref()).map_err(Into::into)
    })
}

#[tauri::command]
pub fn dashboard_update_view(
    app: AppHandle,
    id: String,
    patch: ViewPatch,
) -> Result<DashboardView, DashboardCommandError> {
    storage(&app).with_connection(|conn| ds::update_view(conn, &id, &patch).map_err(Into::into))
}

#[tauri::command]
pub fn dashboard_remove_view(
    app: AppHandle,
    id: String,
) -> Result<(), DashboardCommandError> {
    storage(&app).with_connection(|conn| ds::remove_view(conn, &id).map_err(Into::into))
}

#[tauri::command]
pub fn dashboard_reorder_views(
    app: AppHandle,
    ordered_ids: Vec<String>,
) -> Result<(), DashboardCommandError> {
    storage(&app).with_connection(|conn| ds::reorder_views(conn, &ordered_ids).map_err(Into::into))
}

#[tauri::command]
pub fn dashboard_add_instance(
    app: AppHandle,
    view_id: String,
    kind: String,
    source_id: String,
    preset: String,
    accent_name: String,
    icon_name: String,
    grid_x: i64,
    grid_y: i64,
    grid_w: i64,
    grid_h: i64,
) -> Result<DashboardWidgetInstance, DashboardCommandError> {
    let id = new_id("inst");
    storage(&app).with_connection(|conn| {
        ds::add_instance(
            conn, &id, &view_id, &kind, &source_id,
            &preset, &accent_name, &icon_name,
            grid_x, grid_y, grid_w, grid_h,
        ).map_err(Into::into)
    })
}

#[tauri::command]
pub fn dashboard_update_instance(
    app: AppHandle,
    id: String,
    patch: InstancePatch,
) -> Result<DashboardWidgetInstance, DashboardCommandError> {
    storage(&app).with_connection(|conn| ds::update_instance(conn, &id, &patch).map_err(Into::into))
}

#[tauri::command]
pub fn dashboard_remove_instance(
    app: AppHandle,
    id: String,
) -> Result<(), DashboardCommandError> {
    storage(&app).with_connection(|conn| ds::remove_instance(conn, &id).map_err(Into::into))
}

#[tauri::command]
pub fn dashboard_apply_layout(
    app: AppHandle,
    view_id: String,
    layout: Vec<LayoutEntry>,
) -> Result<(), DashboardCommandError> {
    storage(&app).with_connection(|conn| ds::apply_layout(conn, &view_id, &layout).map_err(Into::into))
}

#[tauri::command]
pub fn dashboard_create_custom_widget(
    app: AppHandle,
    kind: String,
    title: String,
    summary: String,
    category: String,
    body_json: String,
    created_by: String,
) -> Result<DashboardCustomWidget, DashboardCommandError> {
    let id = new_id("cw");
    storage(&app).with_connection(|conn| {
        ds::create_custom_widget(
            conn, &id, &kind, &title, &summary, &category, &body_json, &created_by,
        ).map_err(Into::into)
    })
}

#[tauri::command]
pub fn dashboard_update_custom_widget(
    app: AppHandle,
    id: String,
    patch: CustomWidgetPatch,
) -> Result<DashboardCustomWidget, DashboardCommandError> {
    storage(&app).with_connection(|conn| ds::update_custom_widget(conn, &id, &patch).map_err(Into::into))
}

#[tauri::command]
pub fn dashboard_remove_custom_widget(
    app: AppHandle,
    id: String,
    force_delete_instances: bool,
) -> Result<(), DashboardCommandError> {
    storage(&app).with_connection(|conn| {
        ds::remove_custom_widget(conn, &id, force_delete_instances).map_err(Into::into)
    })
}

#[tauri::command]
pub fn dashboard_reset(app: AppHandle) -> Result<(), DashboardCommandError> {
    storage(&app).with_connection(|conn| ds::reset_dashboard(conn).map_err(Into::into))
}
```

- [ ] **Step 2: Register the module in `src-tauri/src/lib.rs`.** Add `mod dashboard_commands;` next to the other dashboard modules.

```rust
mod dashboard_commands;
```

- [ ] **Step 3: Register every command in the `tauri::generate_handler![...]` macro inside `lib.rs`.** Locate the `invoke_handler` block (search for `tauri::generate_handler!`) and add the dashboard commands at the end of the list:

```rust
            dashboard_commands::dashboard_load_state,
            dashboard_commands::dashboard_create_view,
            dashboard_commands::dashboard_update_view,
            dashboard_commands::dashboard_remove_view,
            dashboard_commands::dashboard_reorder_views,
            dashboard_commands::dashboard_add_instance,
            dashboard_commands::dashboard_update_instance,
            dashboard_commands::dashboard_remove_instance,
            dashboard_commands::dashboard_apply_layout,
            dashboard_commands::dashboard_create_custom_widget,
            dashboard_commands::dashboard_update_custom_widget,
            dashboard_commands::dashboard_remove_custom_widget,
            dashboard_commands::dashboard_reset,
```

- [ ] **Step 4: Build.**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: success. If the build complains about `Storage::with_connection` not existing or having a different signature, revisit Task A4 step 3.

- [ ] **Step 5: Commit.**

```bash
git add src-tauri/src/dashboard_commands.rs src-tauri/src/lib.rs
git commit -m "feat(dashboard): add 13 Tauri commands for dashboard CRUD"
```

---

### Task A6: Drop legacy dashboard state on schema bump

**Files:**
- Modify: `src-tauri/src/storage.rs` (the schema-version migration path)

- [ ] **Step 1: Locate the version-check code in `storage.rs` (search for `SCHEMA_USER_VERSION` near where it's compared to the current `user_version`).** If the migration path is `if current < SCHEMA_USER_VERSION { ... }`, that's where we drop legacy dashboard data.

- [ ] **Step 2: Add a one-shot DROP of any stale dashboard data to keep the implementation clean during development (per spec: "no users yet").** Inside the upgrade branch (before applying the new schema), execute:

```rust
conn.execute_batch(r#"
    DROP TABLE IF EXISTS dashboard_widget_instances;
    DROP TABLE IF EXISTS dashboard_custom_widgets;
    DROP TABLE IF EXISTS dashboard_views;
"#)?;
```

(If `CURRENT_SCHEMA` already uses `CREATE TABLE IF NOT EXISTS`, the new tables will be recreated on the next `execute_batch(CURRENT_SCHEMA)`.)

- [ ] **Step 3: Build and run all tests.**

Run: `cargo check --manifest-path src-tauri/Cargo.toml && cargo test --manifest-path src-tauri/Cargo.toml dashboard_`
Expected: all dashboard tests pass; build succeeds.

- [ ] **Step 4: Commit.**

```bash
git add src-tauri/src/storage.rs
git commit -m "feat(dashboard): drop legacy dashboard tables during schema v9 upgrade"
```

---

### Task A7: Add `npm install react-grid-layout` and typings

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install `react-grid-layout` and its types.**

Run: `npm install react-grid-layout && npm install --save-dev @types/react-grid-layout`
Expected: package versions appended; lockfile updated.

- [ ] **Step 2: Verify the resulting `package.json` dependency block now contains `react-grid-layout` under `dependencies` and `@types/react-grid-layout` under `devDependencies`.**

- [ ] **Step 3: Run typecheck to confirm imports will resolve.**

Run: `npm run check`
Expected: success (no resolution errors).

- [ ] **Step 4: Commit.**

```bash
git add package.json package-lock.json
git commit -m "chore(dashboard): add react-grid-layout dependency"
```

---

### Task A8: Phase A backend sanity check

- [ ] **Step 1: Run all Rust tests.**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: all dashboard validation and storage tests pass. Other suites remain green.

- [ ] **Step 2: Run cargo check on the full backend.**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: success.

No commit; this is a verification checkpoint.

---

## Phase B — Frontend types and persistence

### Task B1: Mirror Rust types in TypeScript

**Files:**
- Create: `src/dashboard/types.ts`

- [ ] **Step 1: Create `src/dashboard/types.ts` with the TypeScript shapes that mirror the Rust structs (camelCase).**

```ts
export type WidgetKind = "builtIn" | "content" | "script";
export type WidgetCustomKind = "content" | "script";

export const WIDGET_PRESETS = [
  "panel", "ambient", "glass", "tile", "hero", "mono", "stack", "action", "band",
] as const;
export type WidgetPreset = (typeof WIDGET_PRESETS)[number];

export const ACCENT_NAMES = [
  "blue", "indigo", "teal", "green", "amber", "red", "purple", "pink",
  "slate", "cyan", "orange", "rose", "emerald", "sky",
] as const;
export type AccentName = (typeof ACCENT_NAMES)[number];

export const ICON_NAMES = [
  "Hash","Network","Terminal","Server","Cpu","Activity","Bolt","Sun",
  "Bell","Bot","Wrench","Folder","Clock","Doc","Cloud","Calendar",
  "Database","Globe","Lock","Key","Mail","Mic","Monitor","Music",
  "Package","Phone","Pin","Power","Printer","Radio","Search",
  "Settings","Shield","ShoppingCart","Star","Tag","Tool","Trash",
  "Truck","User","Users","Video","Volume","Watch","Wifi","Wind",
  "Zap","Layers","List","Grid",
] as const;
export type IconName = (typeof ICON_NAMES)[number];

export const GRID_DENSITIES = ["compact", "default", "roomy"] as const;
export type GridDensity = (typeof GRID_DENSITIES)[number];

export interface DashboardView {
  id: string;
  title: string;
  sortOrder: number;
  gridDensity: GridDensity;
}

export interface DashboardWidgetInstance {
  id: string;
  viewId: string;
  kind: WidgetKind;
  sourceId: string;
  preset: WidgetPreset;
  accentName: AccentName;
  iconName: IconName;
  customTitle: string | null;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  sortOrder: number;
}

export interface DashboardCustomWidget {
  id: string;
  kind: WidgetCustomKind;
  title: string;
  summary: string;
  category: string;
  bodyJson: string;
  createdBy: "user" | "agent";
}

export interface DashboardLoadState {
  views: DashboardView[];
  instances: DashboardWidgetInstance[];
  customWidgets: DashboardCustomWidget[];
}

export interface InstancePatch {
  preset?: WidgetPreset;
  accentName?: AccentName;
  iconName?: IconName;
  customTitle?: string | null;
  gridX?: number;
  gridY?: number;
  gridW?: number;
  gridH?: number;
}

export interface ViewPatch {
  title?: string;
  gridDensity?: GridDensity;
  sortOrder?: number;
}

export interface CustomWidgetPatch {
  title?: string;
  summary?: string;
  category?: string;
  bodyJson?: string;
}

export interface LayoutEntry {
  id: string;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
}

export type ContentShape = "markdown" | "kvList" | "checklist" | "stat";

export type ContentBody =
  | { shape: "markdown"; data: { source: string } }
  | { shape: "kvList"; data: { rows: { label: string; value: string }[] } }
  | { shape: "checklist"; data: { items: { label: string; done?: boolean }[] } }
  | { shape: "stat"; data: { value: string; unit?: string; delta?: string; caption?: string } };

export interface ScriptBody {
  source: string;
  permissions: { network: boolean; pollSeconds?: number };
  htmlShim?: string;
}
```

- [ ] **Step 2: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 3: Commit.**

```bash
git add src/dashboard/types.ts
git commit -m "feat(dashboard): add typescript domain types mirroring rust shapes"
```

---

### Task B2: Add typed Tauri command wrappers

**Files:**
- Create: `src/dashboard/state/persistence.ts`

- [ ] **Step 1: Inspect the existing Tauri invoke helper.**

Run: `grep -n "invokeCommand\|invoke as" src/lib/tauri.ts | head -5`
Identify the function name (typically `invokeCommand` or similar) used elsewhere in the app.

- [ ] **Step 2: Create `src/dashboard/state/persistence.ts` with one wrapper per Tauri command.**

```ts
import { invokeCommand } from "../../lib/tauri";
import type {
  DashboardCustomWidget, DashboardLoadState, DashboardView, DashboardWidgetInstance,
  CustomWidgetPatch, InstancePatch, LayoutEntry, ViewPatch,
  WidgetKind, WidgetCustomKind, WidgetPreset, AccentName, IconName, GridDensity,
} from "../types";

export async function loadDashboardState(): Promise<DashboardLoadState> {
  return invokeCommand("dashboard_load_state");
}

export async function createView(title: string, gridDensity?: GridDensity): Promise<DashboardView> {
  return invokeCommand("dashboard_create_view", { title, gridDensity });
}

export async function updateView(id: string, patch: ViewPatch): Promise<DashboardView> {
  return invokeCommand("dashboard_update_view", { id, patch });
}

export async function removeView(id: string): Promise<void> {
  await invokeCommand("dashboard_remove_view", { id });
}

export async function reorderViews(orderedIds: string[]): Promise<void> {
  await invokeCommand("dashboard_reorder_views", { orderedIds });
}

export async function addInstance(input: {
  viewId: string; kind: WidgetKind; sourceId: string;
  preset: WidgetPreset; accentName: AccentName; iconName: IconName;
  gridX: number; gridY: number; gridW: number; gridH: number;
}): Promise<DashboardWidgetInstance> {
  return invokeCommand("dashboard_add_instance", input);
}

export async function updateInstance(id: string, patch: InstancePatch): Promise<DashboardWidgetInstance> {
  return invokeCommand("dashboard_update_instance", { id, patch });
}

export async function removeInstance(id: string): Promise<void> {
  await invokeCommand("dashboard_remove_instance", { id });
}

export async function applyLayout(viewId: string, layout: LayoutEntry[]): Promise<void> {
  await invokeCommand("dashboard_apply_layout", { viewId, layout });
}

export async function createCustomWidget(input: {
  kind: WidgetCustomKind; title: string; summary: string;
  category: string; bodyJson: string; createdBy: "user" | "agent";
}): Promise<DashboardCustomWidget> {
  return invokeCommand("dashboard_create_custom_widget", input);
}

export async function updateCustomWidget(id: string, patch: CustomWidgetPatch): Promise<DashboardCustomWidget> {
  return invokeCommand("dashboard_update_custom_widget", { id, patch });
}

export async function removeCustomWidget(id: string, forceDeleteInstances: boolean): Promise<void> {
  await invokeCommand("dashboard_remove_custom_widget", { id, forceDeleteInstances });
}

export async function resetDashboard(): Promise<void> {
  await invokeCommand("dashboard_reset");
}
```

- [ ] **Step 3: Typecheck.**

Run: `npm run check`
Expected: success. If `invokeCommand` is named differently, adjust the import to match.

- [ ] **Step 4: Commit.**

```bash
git add src/dashboard/state/persistence.ts
git commit -m "feat(dashboard): typed Tauri command wrappers for all dashboard ops"
```

---

### Task B3: Zustand store with debounced layout writes

**Files:**
- Create: `src/dashboard/state/dashboardStore.ts`

- [ ] **Step 1: Create `src/dashboard/state/dashboardStore.ts`.**

```ts
import { create } from "zustand";
import * as persistence from "./persistence";
import type {
  DashboardCustomWidget, DashboardView, DashboardWidgetInstance,
  GridDensity, InstancePatch, LayoutEntry, ViewPatch, WidgetCustomKind,
  WidgetKind, WidgetPreset, AccentName, IconName, CustomWidgetPatch,
} from "../types";

interface DashboardStoreState {
  ready: boolean;
  loading: boolean;
  views: DashboardView[];
  instances: DashboardWidgetInstance[];
  customWidgets: DashboardCustomWidget[];
  activeViewId: string | null;
  editMode: boolean;
  lastError: string | null;
  load: () => Promise<void>;
  setActiveView: (id: string) => void;
  toggleEditMode: () => void;
  createView: (title: string) => Promise<DashboardView | null>;
  renameView: (id: string, title: string) => Promise<void>;
  setViewDensity: (id: string, density: GridDensity) => Promise<void>;
  removeView: (id: string) => Promise<void>;
  addInstance: (input: {
    viewId: string; kind: WidgetKind; sourceId: string;
    preset: WidgetPreset; accentName: AccentName; iconName: IconName;
    gridX: number; gridY: number; gridW: number; gridH: number;
  }) => Promise<DashboardWidgetInstance | null>;
  updateInstance: (id: string, patch: InstancePatch) => Promise<void>;
  removeInstance: (id: string) => Promise<void>;
  applyLayout: (viewId: string, layout: LayoutEntry[]) => void;
  createCustomWidget: (input: {
    kind: WidgetCustomKind; title: string; summary: string;
    category: string; bodyJson: string; createdBy: "user" | "agent";
  }) => Promise<DashboardCustomWidget | null>;
  updateCustomWidget: (id: string, patch: CustomWidgetPatch) => Promise<void>;
  removeCustomWidget: (id: string, forceDeleteInstances: boolean) => Promise<void>;
  resetDashboard: () => Promise<void>;
}

let layoutTimer: ReturnType<typeof setTimeout> | null = null;
let pendingLayout: { viewId: string; layout: LayoutEntry[] } | null = null;

function scheduleLayoutFlush(set: (fn: (s: DashboardStoreState) => Partial<DashboardStoreState>) => void) {
  if (layoutTimer) clearTimeout(layoutTimer);
  layoutTimer = setTimeout(async () => {
    if (!pendingLayout) return;
    const { viewId, layout } = pendingLayout;
    pendingLayout = null;
    try {
      await persistence.applyLayout(viewId, layout);
    } catch (e) {
      set((s) => ({ ...s, lastError: String(e) }));
    }
  }, 300);
}

export const useDashboardStore = create<DashboardStoreState>((set, get) => ({
  ready: false,
  loading: false,
  views: [],
  instances: [],
  customWidgets: [],
  activeViewId: null,
  editMode: false,
  lastError: null,

  load: async () => {
    set({ loading: true });
    try {
      const state = await persistence.loadDashboardState();
      const activeViewId = state.views[0]?.id ?? null;
      set({ ...state, activeViewId, ready: true, loading: false, lastError: null });
    } catch (e) {
      set({ lastError: String(e), loading: false });
    }
  },

  setActiveView: (id) => set({ activeViewId: id }),
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),

  createView: async (title) => {
    try {
      const view = await persistence.createView(title);
      set((s) => ({ views: [...s.views, view], activeViewId: view.id }));
      return view;
    } catch (e) { set({ lastError: String(e) }); return null; }
  },

  renameView: async (id, title) => {
    try {
      const updated = await persistence.updateView(id, { title });
      set((s) => ({ views: s.views.map((v) => (v.id === id ? updated : v)) }));
    } catch (e) { set({ lastError: String(e) }); }
  },

  setViewDensity: async (id, density) => {
    try {
      const updated = await persistence.updateView(id, { gridDensity: density });
      set((s) => ({ views: s.views.map((v) => (v.id === id ? updated : v)) }));
    } catch (e) { set({ lastError: String(e) }); }
  },

  removeView: async (id) => {
    try {
      await persistence.removeView(id);
      set((s) => {
        const views = s.views.filter((v) => v.id !== id);
        const instances = s.instances.filter((i) => i.viewId !== id);
        const activeViewId = s.activeViewId === id ? (views[0]?.id ?? null) : s.activeViewId;
        return { views, instances, activeViewId };
      });
    } catch (e) { set({ lastError: String(e) }); }
  },

  addInstance: async (input) => {
    try {
      const inst = await persistence.addInstance(input);
      set((s) => ({ instances: [...s.instances, inst] }));
      return inst;
    } catch (e) { set({ lastError: String(e) }); return null; }
  },

  updateInstance: async (id, patch) => {
    try {
      const updated = await persistence.updateInstance(id, patch);
      set((s) => ({ instances: s.instances.map((i) => (i.id === id ? updated : i)) }));
    } catch (e) { set({ lastError: String(e) }); }
  },

  removeInstance: async (id) => {
    try {
      await persistence.removeInstance(id);
      set((s) => ({ instances: s.instances.filter((i) => i.id !== id) }));
    } catch (e) { set({ lastError: String(e) }); }
  },

  applyLayout: (viewId, layout) => {
    set((s) => {
      const byId = new Map(layout.map((l) => [l.id, l]));
      const instances = s.instances.map((i) =>
        byId.has(i.id)
          ? { ...i, gridX: byId.get(i.id)!.gridX, gridY: byId.get(i.id)!.gridY,
                  gridW: byId.get(i.id)!.gridW, gridH: byId.get(i.id)!.gridH }
          : i,
      );
      return { instances };
    });
    pendingLayout = { viewId, layout };
    scheduleLayoutFlush(set);
  },

  createCustomWidget: async (input) => {
    try {
      const cw = await persistence.createCustomWidget(input);
      set((s) => ({ customWidgets: [...s.customWidgets, cw] }));
      return cw;
    } catch (e) { set({ lastError: String(e) }); return null; }
  },

  updateCustomWidget: async (id, patch) => {
    try {
      const updated = await persistence.updateCustomWidget(id, patch);
      set((s) => ({ customWidgets: s.customWidgets.map((c) => (c.id === id ? updated : c)) }));
    } catch (e) { set({ lastError: String(e) }); }
  },

  removeCustomWidget: async (id, force) => {
    try {
      await persistence.removeCustomWidget(id, force);
      set((s) => ({
        customWidgets: s.customWidgets.filter((c) => c.id !== id),
        instances: force ? s.instances.filter((i) => i.sourceId !== id) : s.instances,
      }));
    } catch (e) { set({ lastError: String(e) }); }
  },

  resetDashboard: async () => {
    try {
      await persistence.resetDashboard();
      await get().load();
    } catch (e) { set({ lastError: String(e) }); }
  },
}));
```

- [ ] **Step 2: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 3: Commit.**

```bash
git add src/dashboard/state/dashboardStore.ts
git commit -m "feat(dashboard): zustand store with debounced layout writes and error capture"
```

---

## Phase C — Registries

### Task C1: Palette + icon picker

**Files:**
- Create: `src/dashboard/registry/palette.ts`

- [ ] **Step 1: Create `src/dashboard/registry/palette.ts`.**

```ts
import type { AccentName, IconName } from "../types";
import { ACCENT_NAMES, ICON_NAMES } from "../types";

export interface AccentDefinition {
  name: AccentName;
  color: string;     // strong accent
  soft: string;      // soft accent (~12% alpha)
}

export const ACCENT_PALETTE: AccentDefinition[] = [
  { name: "blue",    color: "#2563eb", soft: "rgba(37,99,235,0.12)"  },
  { name: "indigo",  color: "#4f46e5", soft: "rgba(79,70,229,0.12)"  },
  { name: "teal",    color: "#0d9488", soft: "rgba(13,148,136,0.12)" },
  { name: "green",   color: "#15915f", soft: "rgba(21,145,95,0.12)"  },
  { name: "amber",   color: "#d97706", soft: "rgba(217,119,6,0.12)"  },
  { name: "red",     color: "#dc2626", soft: "rgba(220,38,38,0.12)"  },
  { name: "purple",  color: "#7c3aed", soft: "rgba(124,58,237,0.12)" },
  { name: "pink",    color: "#db2777", soft: "rgba(219,39,119,0.12)" },
  { name: "slate",   color: "#475569", soft: "rgba(71,85,105,0.12)"  },
  { name: "cyan",    color: "#0891b2", soft: "rgba(8,145,178,0.12)"  },
  { name: "orange",  color: "#ea580c", soft: "rgba(234,88,12,0.12)"  },
  { name: "rose",    color: "#e11d48", soft: "rgba(225,29,72,0.12)"  },
  { name: "emerald", color: "#059669", soft: "rgba(5,150,105,0.12)"  },
  { name: "sky",     color: "#0284c7", soft: "rgba(2,132,199,0.12)"  },
];

export function resolveAccent(name: AccentName): AccentDefinition {
  const found = ACCENT_PALETTE.find((p) => p.name === name);
  if (!found) return ACCENT_PALETTE[0];
  return found;
}

export const ACCENT_NAMES_ALL = ACCENT_NAMES;
export const ICON_NAMES_ALL = ICON_NAMES;

export function isAccentName(value: string): value is AccentName {
  return (ACCENT_NAMES as readonly string[]).includes(value);
}

export function isIconName(value: string): value is IconName {
  return (ICON_NAMES as readonly string[]).includes(value);
}
```

- [ ] **Step 2: Create a `.typecheck.ts` runtime assertion file at `src/dashboard/registry/palette.typecheck.ts`.**

```ts
import { ACCENT_PALETTE, resolveAccent, isAccentName, isIconName } from "./palette";

function assertEqual(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

assertEqual(ACCENT_PALETTE.length, 14);
assertEqual(resolveAccent("blue").color, "#2563eb");
assertEqual(isAccentName("blue"), true);
assertEqual(isAccentName("neon"), false);
assertEqual(isIconName("Hash"), true);
assertEqual(isIconName("NotAnIcon"), false);
```

- [ ] **Step 3: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 4: Commit.**

```bash
git add src/dashboard/registry/palette.ts src/dashboard/registry/palette.typecheck.ts
git commit -m "feat(dashboard): accent palette + icon whitelist helpers"
```

---

### Task C2: Preset registry (chrome wrappers) + CSS

**Files:**
- Create: `src/dashboard/registry/presetRegistry.tsx`
- Create: `src/dashboard/dashboard.css`

- [ ] **Step 1: Create `src/dashboard/registry/presetRegistry.tsx`.** Each preset is a thin component that renders header + body. The `.drag-handle` class on the header is what `react-grid-layout` uses for dragging in edit mode.

```tsx
import type { ReactNode } from "react";
import type { WidgetPreset } from "../types";

export interface PresetChromeProps {
  title: string;
  icon: ReactNode;
  body: ReactNode;
  controls?: ReactNode;
  editMode: boolean;
}

function PanelChrome({ title, icon, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className="dw-preset dw-preset-panel">
      <div className={`dw-head${editMode ? " drag-handle" : ""}`}>
        <span className="dw-icon">{icon}</span>
        <h3 className="dw-title">{title}</h3>
        {controls}
      </div>
      <div className="dw-body">{body}</div>
    </div>
  );
}

function AmbientChrome({ title, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className={`dw-preset dw-preset-ambient${editMode ? " drag-handle" : ""}`}>
      <div className="dw-ambient-label">
        <span className="dw-dot" />
        {title}
        {controls}
      </div>
      {body}
    </div>
  );
}

function GlassChrome({ title, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className={`dw-preset dw-preset-glass${editMode ? " drag-handle" : ""}`}>
      <div className="dw-ambient-label">
        <span className="dw-dot" />
        {title}
        {controls}
      </div>
      {body}
    </div>
  );
}

function TileChrome({ title, icon, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className={`dw-preset dw-preset-tile${editMode ? " drag-handle" : ""}`}>
      <div className="dw-tile-head">
        <span className="dw-tile-label">{title}</span>
        <span className="dw-tile-icon">{icon}</span>
        {controls}
      </div>
      <div className="dw-tile-body">{body}</div>
    </div>
  );
}

function HeroChrome({ title, icon, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className="dw-preset dw-preset-hero">
      <div className={`dw-hero-head${editMode ? " drag-handle" : ""}`}>
        <span className="dw-hero-icon">{icon}</span>
        <h3 className="dw-hero-title">{title}</h3>
        {controls}
      </div>
      <div className="dw-hero-body">{body}</div>
    </div>
  );
}

function MonoChrome({ title, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className="dw-preset dw-preset-mono">
      <div className={`dw-mono-head${editMode ? " drag-handle" : ""}`}>
        <span className="dw-mono-lights"><span/><span/><span/></span>
        <span className="dw-mono-title">{title}</span>
        {controls}
      </div>
      <div className="dw-mono-body">{body}</div>
    </div>
  );
}

function StackChrome({ title, icon, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className="dw-preset dw-preset-stack">
      <div className={`dw-stack-head${editMode ? " drag-handle" : ""}`}>
        <span className="dw-icon">{icon}</span>
        <h3 className="dw-title">{title}</h3>
        {controls}
      </div>
      <div className="dw-stack-body">{body}</div>
    </div>
  );
}

function ActionChrome({ title, icon, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className={`dw-preset dw-preset-action${editMode ? " drag-handle" : ""}`}>
      <span className="dw-action-icon">{icon}</span>
      <div className="dw-action-body">
        <h3 className="dw-action-title">{title}</h3>
        {body}
      </div>
      {controls}
    </div>
  );
}

function BandChrome({ title, icon, body, controls, editMode }: PresetChromeProps) {
  return (
    <div className={`dw-preset dw-preset-band${editMode ? " drag-handle" : ""}`}>
      <span className="dw-band-icon">{icon}</span>
      <div className="dw-band-body">
        <h3 className="dw-band-title">{title}</h3>
        {body}
      </div>
      {controls}
    </div>
  );
}

export const PRESET_RENDERERS: Record<WidgetPreset, (p: PresetChromeProps) => JSX.Element> = {
  panel: PanelChrome,
  ambient: AmbientChrome,
  glass: GlassChrome,
  tile: TileChrome,
  hero: HeroChrome,
  mono: MonoChrome,
  stack: StackChrome,
  action: ActionChrome,
  band: BandChrome,
};
```

- [ ] **Step 2: Create `src/dashboard/dashboard.css` with the preset styles.**

```css
.dw-instance {
  --w-accent: var(--accent);
  --w-accent-soft: var(--accent-soft);
  height: 100%;
  position: relative;
}

.dw-preset {
  width: 100%;
  height: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dw-preset-panel .dw-head,
.dw-preset-stack .dw-head,
.dw-preset-stack .dw-stack-head,
.dw-preset-panel .dw-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
}
.dw-preset .dw-body { padding: 12px; flex: 1; min-height: 0; overflow: auto; }
.dw-preset-stack .dw-stack-body { padding: 0; flex: 1; overflow: auto; }

.dw-icon {
  display: inline-flex;
  width: 24px; height: 24px;
  align-items: center; justify-content: center;
  background: var(--w-accent-soft);
  color: var(--w-accent);
  border-radius: 5px;
}
.dw-title { font-size: 13px; font-weight: 600; margin: 0; color: var(--text); flex: 1; }

.dw-preset-ambient,
.dw-preset-glass {
  background: transparent;
  border: none;
  padding: 12px 14px;
}
.dw-preset-glass {
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 12px;
}
.dw-ambient-label {
  font-size: 11px;
  color: var(--text-faint);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
  display: flex; align-items: center; gap: 6px;
}
.dw-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--w-accent); }

.dw-preset-tile { padding: 12px; }
.dw-tile-head {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11px; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
  margin-bottom: 6px;
}
.dw-tile-icon {
  width: 24px; height: 24px;
  background: var(--w-accent-soft); color: var(--w-accent);
  border-radius: 5px;
  display: inline-flex; align-items: center; justify-content: center;
}
.dw-tile-body { font-size: 14px; color: var(--text); }

.dw-preset-hero {
  background: linear-gradient(135deg, var(--w-accent), color-mix(in srgb, var(--w-accent) 70%, black));
  color: #fff;
  border: none;
}
.dw-hero-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; }
.dw-hero-icon { display: inline-flex; align-items: center; }
.dw-hero-title { font-size: 14px; font-weight: 600; margin: 0; color: #fff; }
.dw-hero-body { padding: 12px; flex: 1; color: rgba(255,255,255,0.92); font-size: 12.5px; }

.dw-preset-mono {
  background: #0f1419;
  color: #d8e1ef;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  border: 1px solid #1a2230;
}
.dw-mono-head {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  background: #131a23;
  border-bottom: 1px solid #1a2230;
  color: #8fa0bf;
  font-size: 11px;
}
.dw-mono-lights { display: inline-flex; gap: 4px; }
.dw-mono-lights > span {
  width: 8px; height: 8px; border-radius: 50%;
  background: #2b3344;
}
.dw-mono-body { padding: 10px 12px; flex: 1; overflow: auto; }

.dw-preset-action {
  padding: 12px;
  display: flex; align-items: center; gap: 12px;
  border: 1px dashed var(--border-strong);
}
.dw-action-icon {
  width: 36px; height: 36px;
  background: var(--w-accent-soft); color: var(--w-accent);
  border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
}
.dw-action-body { flex: 1; }
.dw-action-title { font-size: 14px; font-weight: 600; margin: 0 0 4px; color: var(--text); }

.dw-preset-band {
  padding: 8px 12px;
  display: flex; align-items: center; gap: 10px;
  background: var(--w-accent-soft);
  border: 1px solid color-mix(in srgb, var(--w-accent) 30%, transparent);
}
.dw-band-icon { color: var(--w-accent); display: inline-flex; }
.dw-band-body { flex: 1; }
.dw-band-title { font-size: 13px; font-weight: 600; margin: 0 0 2px; color: var(--text); }

.dw-controls {
  display: none;
  position: absolute;
  top: 6px;
  right: 6px;
  gap: 4px;
  z-index: 2;
}
.dw-instance:hover .dw-controls,
.dw-instance.dw-edit .dw-controls { display: inline-flex; }
.dw-ctrl {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 11px;
  color: var(--text-muted);
  cursor: pointer;
}
.dw-ctrl.danger { color: var(--red); }
</style>
```

Strip the trailing `</style>` line (artifact). The file should end with `.dw-ctrl.danger { color: var(--red); }` and the closing `}`.

- [ ] **Step 3: Import the CSS from `DashboardPage.tsx`'s eventual location.** For now, also add an import line in a known existing file so the typecheck step covers it. Add to the top of `src/dashboard/state/dashboardStore.ts` (no — keep CSS out of state files). Defer the import; we'll add it in Task F1 when we touch `DashboardPage.tsx`.

- [ ] **Step 4: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 5: Commit.**

```bash
git add src/dashboard/registry/presetRegistry.tsx src/dashboard/dashboard.css
git commit -m "feat(dashboard): nine preset chrome components and CSS"
```

---

### Task C3: Built-in widget registry

**Files:**
- Create: `src/dashboard/registry/builtInRegistry.ts`
- Create: `src/dashboard/widgets/AppLauncherBody.tsx`
- Create: `src/dashboard/widgets/HashBody.tsx`
- Create: `src/dashboard/widgets/SubnetBody.tsx`
- Create: `src/dashboard/widgets/QuickToolsBody.tsx`
- Create: `src/dashboard/widgets/ReportBody.tsx`

- [ ] **Step 1: Create stub body files.** Each body file is a thin React component that takes no props for now and either delegates to existing code (App Launcher) or wraps existing JSX from the legacy `DashboardPage.tsx`.

Create `src/dashboard/widgets/AppLauncherBody.tsx`:

```tsx
import { AppLauncherWidget } from "../../app-launcher/AppLauncherWidget";

export function AppLauncherBody() {
  return <AppLauncherWidget />;
}
```

If `AppLauncherWidget` requires props (check `src/app-launcher/AppLauncherWidget.tsx`), pass through sensible defaults — the existing call site in `DashboardPage.tsx` shows the shape.

- [ ] **Step 2: Create `src/dashboard/widgets/HashBody.tsx` with a minimal placeholder identical in behavior to the legacy hash widget block.**

```tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { calculateTextHashes } from "../widgets";

export function HashBody() {
  const { t } = useTranslation();
  const [text, setText] = useState("KKTerm");
  const [hashes, setHashes] = useState({ characters: "0", bytes: "0", sha1: "", sha256: "" });
  useEffect(() => { calculateTextHashes(text).then(setHashes); }, [text]);
  return (
    <div className="dw-stack-fields">
      <label className="dw-field">
        <span>{t("dashboard.hashInput")}</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} spellCheck={false} />
      </label>
      <div className="dw-kv">
        <span>{t("dashboard.characters")}</span><span>{hashes.characters}</span>
        <span>{t("dashboard.bytes")}</span><span>{hashes.bytes}</span>
        <span>SHA-1</span><code>{hashes.sha1}</code>
        <span>SHA-256</span><code>{hashes.sha256}</code>
      </div>
    </div>
  );
}
```

Note: `calculateTextHashes` already exists in `src/dashboard/widgets.ts`. We keep the import for now to avoid touching legacy code in this task.

- [ ] **Step 3: Create `src/dashboard/widgets/SubnetBody.tsx`.**

```tsx
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { calculateIpv4Subnet } from "../widgets";

export function SubnetBody() {
  const { t } = useTranslation();
  const [cidr, setCidr] = useState("192.168.10.44/27");
  const result = useMemo(() => calculateIpv4Subnet(cidr), [cidr]);
  return (
    <div className="dw-stack-fields">
      <label className="dw-field">
        <span>{t("dashboard.cidrInput")}</span>
        <input value={cidr} onChange={(e) => setCidr(e.target.value)} spellCheck={false} />
      </label>
      {result.ok ? (
        <div className="dw-kv">
          <span>{t("dashboard.network")}</span><code>{result.networkAddress}</code>
          <span>{t("dashboard.broadcast")}</span><code>{result.broadcastAddress}</code>
          <span>{t("dashboard.firstUsable")}</span><code>{result.firstUsableAddress}</code>
          <span>{t("dashboard.lastUsable")}</span><code>{result.lastUsableAddress}</code>
          <span>{t("dashboard.mask")}</span><code>{result.subnetMask}</code>
          <span>{t("dashboard.usable")}</span><code>{result.usableHosts}</code>
        </div>
      ) : (
        <p>{t("dashboard.subnetInvalid")}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/dashboard/widgets/QuickToolsBody.tsx`.**

```tsx
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { transformQuickTool } from "../widgets";
import type { QuickToolId } from "../widgets";

export function QuickToolsBody() {
  const { t } = useTranslation();
  const [tool, setTool] = useState<QuickToolId>("urlEncode");
  const [input, setInput] = useState("");
  const output = useMemo(() => transformQuickTool(tool, input), [tool, input]);
  return (
    <div className="dw-stack-fields">
      <label className="dw-field">
        <span>{t("dashboard.tool")}</span>
        <select value={tool} onChange={(e) => setTool(e.target.value as QuickToolId)}>
          <option value="urlEncode">URL encode</option>
          <option value="urlDecode">URL decode</option>
          <option value="base64Encode">Base64 encode</option>
          <option value="base64Decode">Base64 decode</option>
          <option value="unixToIso">Unix → ISO</option>
        </select>
      </label>
      <label className="dw-field">
        <span>{t("dashboard.input")}</span>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={2} spellCheck={false} />
      </label>
      <label className="dw-field">
        <span>{t("dashboard.output")}</span>
        <textarea value={output.output} readOnly rows={2} />
      </label>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/dashboard/widgets/ReportBody.tsx`.**

```tsx
import { useTranslation } from "react-i18next";

export function ReportBody() {
  const { t } = useTranslation();
  return (
    <ol className="dw-checklist">
      <li>{t("dashboard.reportStep1")}</li>
      <li>{t("dashboard.reportStep2")}</li>
      <li>{t("dashboard.reportStep3")}</li>
      <li>{t("dashboard.reportStep4")}</li>
    </ol>
  );
}
```

- [ ] **Step 6: Create `src/dashboard/registry/builtInRegistry.ts`.**

```ts
import type { ComponentType } from "react";
import type { AccentName, IconName, WidgetPreset } from "../types";
import { AppLauncherBody } from "../widgets/AppLauncherBody";
import { HashBody } from "../widgets/HashBody";
import { SubnetBody } from "../widgets/SubnetBody";
import { QuickToolsBody } from "../widgets/QuickToolsBody";
import { ReportBody } from "../widgets/ReportBody";

export interface BuiltInWidgetEntry {
  id: string;
  titleKey: string;
  summaryKey: string;
  category: string;
  defaultPreset: WidgetPreset;
  defaultAccent: AccentName;
  defaultIcon: IconName;
  defaultSize: { w: number; h: number };
  Body: ComponentType;
}

export const BUILT_IN_WIDGETS: BuiltInWidgetEntry[] = [
  {
    id: "appLauncher",
    titleKey: "appLauncher.title",
    summaryKey: "appLauncher.subtitle",
    category: "shortcut",
    defaultPreset: "panel",
    defaultAccent: "blue",
    defaultIcon: "Wrench",
    defaultSize: { w: 4, h: 3 },
    Body: AppLauncherBody,
  },
  {
    id: "hashCalculator",
    titleKey: "dashboard.hashTitle",
    summaryKey: "dashboard.hashSummary",
    category: "hash",
    defaultPreset: "panel",
    defaultAccent: "indigo",
    defaultIcon: "Hash",
    defaultSize: { w: 3, h: 3 },
    Body: HashBody,
  },
  {
    id: "subnetCalculator",
    titleKey: "dashboard.subnetTitle",
    summaryKey: "dashboard.subnetSummary",
    category: "network",
    defaultPreset: "panel",
    defaultAccent: "teal",
    defaultIcon: "Network",
    defaultSize: { w: 3, h: 3 },
    Body: SubnetBody,
  },
  {
    id: "quickTools",
    titleKey: "dashboard.quickToolsTitle",
    summaryKey: "dashboard.quickToolsSummary",
    category: "quick",
    defaultPreset: "panel",
    defaultAccent: "amber",
    defaultIcon: "Wrench",
    defaultSize: { w: 3, h: 3 },
    Body: QuickToolsBody,
  },
  {
    id: "maintenanceReport",
    titleKey: "dashboard.reportTitle",
    summaryKey: "dashboard.reportSummary",
    category: "report",
    defaultPreset: "panel",
    defaultAccent: "slate",
    defaultIcon: "Doc",
    defaultSize: { w: 3, h: 3 },
    Body: ReportBody,
  },
];

export function getBuiltInWidget(id: string): BuiltInWidgetEntry | undefined {
  return BUILT_IN_WIDGETS.find((w) => w.id === id);
}
```

- [ ] **Step 7: Typecheck.**

Run: `npm run check`
Expected: success. If `AppLauncherWidget` requires props, edit `AppLauncherBody.tsx` to pass through defaults.

- [ ] **Step 8: Commit.**

```bash
git add src/dashboard/registry/builtInRegistry.ts src/dashboard/widgets/AppLauncherBody.tsx src/dashboard/widgets/HashBody.tsx src/dashboard/widgets/SubnetBody.tsx src/dashboard/widgets/QuickToolsBody.tsx src/dashboard/widgets/ReportBody.tsx
git commit -m "feat(dashboard): built-in widget registry with five extracted widget bodies"
```

---

## Phase D — Widget rendering layer

### Task D1: Content widget renderer

**Files:**
- Create: `src/dashboard/content/ContentWidgetRenderer.tsx`

- [ ] **Step 1: Create `src/dashboard/content/ContentWidgetRenderer.tsx`.**

```tsx
import { useMemo } from "react";
import type { ContentBody } from "../types";

export function ContentWidgetRenderer({ bodyJson }: { bodyJson: string }) {
  const parsed = useMemo<ContentBody | null>(() => {
    try { return JSON.parse(bodyJson) as ContentBody; } catch { return null; }
  }, [bodyJson]);

  if (!parsed) return <div className="dw-content-error">Invalid content widget body.</div>;

  switch (parsed.shape) {
    case "markdown":
      return <div className="dw-content-md">{parsed.data.source}</div>;
    case "kvList":
      return (
        <div className="dw-kv">
          {parsed.data.rows.map((r, i) => (
            <span key={i} className="dw-kv-row">
              <span className="dw-kv-label">{r.label}</span>
              <span className="dw-kv-value">{r.value}</span>
            </span>
          ))}
        </div>
      );
    case "checklist":
      return (
        <ul className="dw-checklist">
          {parsed.data.items.map((item, i) => (
            <li key={i} className={item.done ? "dw-done" : ""}>{item.label}</li>
          ))}
        </ul>
      );
    case "stat":
      return (
        <div className="dw-stat">
          <span className="dw-stat-value">{parsed.data.value}</span>
          {parsed.data.unit  && <span className="dw-stat-unit">{parsed.data.unit}</span>}
          {parsed.data.delta && <span className="dw-stat-delta">{parsed.data.delta}</span>}
          {parsed.data.caption && <span className="dw-stat-caption">{parsed.data.caption}</span>}
        </div>
      );
  }
}
```

- [ ] **Step 2: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 3: Commit.**

```bash
git add src/dashboard/content/ContentWidgetRenderer.tsx
git commit -m "feat(dashboard): declarative content widget renderer (markdown/kvList/checklist/stat)"
```

---

### Task D2: Script widget host (iframe srcdoc)

**Files:**
- Create: `src/dashboard/script/ScriptWidgetHost.tsx`
- Create: `src/dashboard/script/permissions.ts`

- [ ] **Step 1: Create `src/dashboard/script/permissions.ts`.**

```ts
import type { ScriptBody } from "../types";

export function buildCsp(perm: ScriptBody["permissions"]): string {
  const connect = perm.network ? "*" : "'none'";
  return [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    `connect-src ${connect}`,
    "img-src data: blob:",
    "font-src data:",
  ].join("; ");
}

export function buildSrcdoc(body: ScriptBody): string {
  const csp = buildCsp(body.permissions);
  const shim = body.htmlShim?.trim().length ? body.htmlShim : '<div id="root"></div>';
  const safeSource = body.source;
  return `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp.replace(/"/g, "&quot;")}" />
  <style>
    html, body { margin: 0; padding: 8px; font-family: ui-sans-serif, system-ui, sans-serif; color: #222; font-size: 13px; }
    body { background: transparent; }
  </style>
</head><body>
  ${shim}
  <script>
    (function () {
      const KK = {
        postMessage: function (payload) { window.parent.postMessage({ kk: true, payload }, "*"); },
        requestPermission: function () { return Promise.resolve(false); },
      };
      window.KK = KK;
      try {
        ${safeSource}
      } catch (err) {
        document.body.innerHTML = '<pre style="color:#b00;font:12px/1.4 ui-monospace,monospace">'
          + String(err && err.stack || err) + '</pre>';
      }
    })();
  </script>
</body></html>`;
}
```

- [ ] **Step 2: Create `src/dashboard/script/ScriptWidgetHost.tsx`.**

```tsx
import { useMemo, useState } from "react";
import type { ScriptBody } from "../types";
import { buildSrcdoc } from "./permissions";

export function ScriptWidgetHost({ bodyJson }: { bodyJson: string }) {
  const [reloadKey, setReloadKey] = useState(0);
  const parsed = useMemo<ScriptBody | null>(() => {
    try { return JSON.parse(bodyJson) as ScriptBody; } catch { return null; }
  }, [bodyJson]);

  if (!parsed) {
    return <div className="dw-script-error">Invalid script widget body.</div>;
  }

  const srcdoc = useMemo(() => buildSrcdoc(parsed), [parsed]);

  return (
    <iframe
      key={reloadKey}
      title="dashboard-script"
      sandbox="allow-scripts"
      srcDoc={srcdoc}
      style={{ width: "100%", height: "100%", border: "none", background: "transparent" }}
      onLoad={() => { /* intentionally empty; postMessage listener attached at WidgetFrame level if needed */ }}
    />
  );
}

export function useScriptReloadHandle() {
  const [key, setKey] = useState(0);
  return { key, reload: () => setKey((k) => k + 1) };
}
```

- [ ] **Step 3: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 4: Commit.**

```bash
git add src/dashboard/script/ScriptWidgetHost.tsx src/dashboard/script/permissions.ts
git commit -m "feat(dashboard): iframe srcdoc script widget host with CSP-driven network permission"
```

---

### Task D3: Widget body dispatcher

**Files:**
- Create: `src/dashboard/view/WidgetBody.tsx`

- [ ] **Step 1: Create `src/dashboard/view/WidgetBody.tsx`.**

```tsx
import { useDashboardStore } from "../state/dashboardStore";
import { getBuiltInWidget } from "../registry/builtInRegistry";
import { ContentWidgetRenderer } from "../content/ContentWidgetRenderer";
import { ScriptWidgetHost } from "../script/ScriptWidgetHost";
import type { DashboardWidgetInstance } from "../types";

export function WidgetBody({ instance }: { instance: DashboardWidgetInstance }) {
  const customWidgets = useDashboardStore((s) => s.customWidgets);

  if (instance.kind === "builtIn") {
    const entry = getBuiltInWidget(instance.sourceId);
    if (!entry) return <div className="dw-missing">Missing built-in widget: {instance.sourceId}</div>;
    const { Body } = entry;
    return <Body />;
  }
  const cw = customWidgets.find((c) => c.id === instance.sourceId);
  if (!cw) return <div className="dw-missing">Missing custom widget: {instance.sourceId}</div>;

  if (cw.kind === "content") return <ContentWidgetRenderer bodyJson={cw.bodyJson} />;
  if (cw.kind === "script") return <ScriptWidgetHost bodyJson={cw.bodyJson} />;
  return null;
}
```

- [ ] **Step 2: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 3: Commit.**

```bash
git add src/dashboard/view/WidgetBody.tsx
git commit -m "feat(dashboard): widget body dispatcher (builtIn/content/script)"
```

---

### Task D4: WidgetFrame — preset chrome wrapper + edit controls

**Files:**
- Create: `src/dashboard/view/WidgetFrame.tsx`

- [ ] **Step 1: Create `src/dashboard/view/WidgetFrame.tsx`.**

```tsx
import { Settings as SettingsIcon, X as XIcon } from "lucide-react";
import * as Icons from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useDashboardStore } from "../state/dashboardStore";
import { getBuiltInWidget } from "../registry/builtInRegistry";
import { PRESET_RENDERERS } from "../registry/presetRegistry";
import { resolveAccent } from "../registry/palette";
import type { DashboardWidgetInstance } from "../types";
import { WidgetBody } from "./WidgetBody";

export interface WidgetFrameProps {
  instance: DashboardWidgetInstance;
  onCustomize: (instance: DashboardWidgetInstance, anchor: HTMLElement) => void;
}

export function WidgetFrame({ instance, onCustomize }: WidgetFrameProps) {
  const { t } = useTranslation();
  const editMode = useDashboardStore((s) => s.editMode);
  const removeInstance = useDashboardStore((s) => s.removeInstance);
  const customWidgets = useDashboardStore((s) => s.customWidgets);

  const accent = resolveAccent(instance.accentName);
  const Render = PRESET_RENDERERS[instance.preset];

  const builtIn = instance.kind === "builtIn" ? getBuiltInWidget(instance.sourceId) : undefined;
  const customSource =
    instance.kind !== "builtIn" ? customWidgets.find((c) => c.id === instance.sourceId) : undefined;

  const fallbackTitle =
    instance.customTitle
    ?? (builtIn ? t(builtIn.titleKey) : undefined)
    ?? customSource?.title
    ?? t("dashboard.untitledWidget");

  const IconCmp = (Icons as Record<string, React.ComponentType<{ width?: number; height?: number }>>)[instance.iconName] ?? Icons.Hash;

  const controls: ReactNode = (
    <span className="dw-controls">
      <button
        className="dw-ctrl"
        onClick={(e) => { e.stopPropagation(); onCustomize(instance, e.currentTarget); }}
        aria-label={t("dashboard.customize")}
        title={t("dashboard.customize")}
      >
        <SettingsIcon width={12} height={12} />
      </button>
      <button
        className="dw-ctrl danger"
        onClick={(e) => { e.stopPropagation(); void removeInstance(instance.id); }}
        aria-label={t("dashboard.removeWidget")}
        title={t("dashboard.removeWidget")}
      >
        <XIcon width={12} height={12} />
      </button>
    </span>
  );

  const style: CSSProperties = {
    // expose CSS variables consumed by preset chrome
    ["--w-accent" as unknown as string]: accent.color,
    ["--w-accent-soft" as unknown as string]: accent.soft,
  } as CSSProperties;

  return (
    <div className={`dw-instance${editMode ? " dw-edit" : ""}`} style={style}>
      <Render
        title={fallbackTitle}
        icon={<IconCmp width={14} height={14} />}
        body={<WidgetBody instance={instance} />}
        controls={controls}
        editMode={editMode}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 3: Commit.**

```bash
git add src/dashboard/view/WidgetFrame.tsx
git commit -m "feat(dashboard): WidgetFrame applies preset chrome, accent, edit-mode controls"
```

---

### Task D5: Dashboard canvas using react-grid-layout

**Files:**
- Create: `src/dashboard/view/DashboardCanvas.tsx`

- [ ] **Step 1: Create `src/dashboard/view/DashboardCanvas.tsx`.**

```tsx
import GridLayout, { type Layout, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useMemo } from "react";
import { useDashboardStore } from "../state/dashboardStore";
import type { DashboardView, DashboardWidgetInstance, GridDensity } from "../types";
import { WidgetFrame } from "./WidgetFrame";

const ResponsiveGrid = WidthProvider(GridLayout);

const DENSITY_SETTINGS: Record<GridDensity, { rowHeight: number; margin: [number, number] }> = {
  compact:  { rowHeight: 56, margin: [8, 8]   },
  default:  { rowHeight: 64, margin: [12, 12] },
  roomy:    { rowHeight: 80, margin: [16, 16] },
};

export interface DashboardCanvasProps {
  view: DashboardView;
  instances: DashboardWidgetInstance[];
  onCustomize: (instance: DashboardWidgetInstance, anchor: HTMLElement) => void;
}

export function DashboardCanvas({ view, instances, onCustomize }: DashboardCanvasProps) {
  const editMode = useDashboardStore((s) => s.editMode);
  const applyLayout = useDashboardStore((s) => s.applyLayout);

  const settings = DENSITY_SETTINGS[view.gridDensity];
  const layout: Layout[] = useMemo(
    () => instances.map((i) => ({
      i: i.id, x: i.gridX, y: i.gridY, w: i.gridW, h: i.gridH, minW: 1, minH: 1,
    })),
    [instances],
  );

  function onLayoutChange(next: Layout[]) {
    if (!editMode) return;
    applyLayout(view.id, next.map((l) => ({ id: l.i, gridX: l.x, gridY: l.y, gridW: l.w, gridH: l.h })));
  }

  return (
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
      onLayoutChange={onLayoutChange}
    >
      {instances.map((i) => (
        <div key={i.id}>
          <WidgetFrame instance={i} onCustomize={onCustomize} />
        </div>
      ))}
    </ResponsiveGrid>
  );
}
```

- [ ] **Step 2: Typecheck.**

Run: `npm run check`
Expected: success. If `WidthProvider` import path or `react-resizable` CSS path errors, adjust to whatever the installed version exports (consult `node_modules/react-grid-layout/package.json` for the actual entry points if needed).

- [ ] **Step 3: Commit.**

```bash
git add src/dashboard/view/DashboardCanvas.tsx
git commit -m "feat(dashboard): RGL canvas with density-driven row height/margin and edit-only drag"
```

---

### Task D6: Customize popover (per-instance editor)

**Files:**
- Create: `src/dashboard/edit/CustomizePopover.tsx`

- [ ] **Step 1: Create `src/dashboard/edit/CustomizePopover.tsx`.**

```tsx
import * as Icons from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDashboardStore } from "../state/dashboardStore";
import { ACCENT_PALETTE } from "../registry/palette";
import type { AccentName, DashboardWidgetInstance, IconName, WidgetPreset } from "../types";
import { ACCENT_NAMES, ICON_NAMES, WIDGET_PRESETS } from "../types";

export interface CustomizePopoverProps {
  instance: DashboardWidgetInstance;
  anchorRect: DOMRect;
  onClose: () => void;
}

export function CustomizePopover({ instance, anchorRect, onClose }: CustomizePopoverProps) {
  const { t } = useTranslation();
  const updateInstance = useDashboardStore((s) => s.updateInstance);
  const customWidgets = useDashboardStore((s) => s.customWidgets);
  const updateCustomWidget = useDashboardStore((s) => s.updateCustomWidget);
  const ref = useRef<HTMLDivElement | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const top = anchorRect.bottom + 6;
  const left = Math.min(anchorRect.left, window.innerWidth - 320);
  const customSource =
    instance.kind !== "builtIn" ? customWidgets.find((c) => c.id === instance.sourceId) : undefined;

  return (
    <div ref={ref} className="dw-customize" style={{ top, left }}>
      <section>
        <h4>{t("dashboard.preset")}</h4>
        <div className="dw-preset-picker">
          {WIDGET_PRESETS.map((p) => (
            <button
              key={p}
              className={instance.preset === p ? "active" : ""}
              onClick={() => updateInstance(instance.id, { preset: p as WidgetPreset })}
            >
              {t(`dashboard.preset.${p}`)}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h4>{t("dashboard.accent")}</h4>
        <div className="dw-accent-picker">
          {ACCENT_PALETTE.map((p) => (
            <button
              key={p.name}
              className={instance.accentName === p.name ? "active" : ""}
              style={{ background: p.color }}
              title={p.name}
              aria-label={p.name}
              onClick={() => updateInstance(instance.id, { accentName: p.name as AccentName })}
            />
          ))}
        </div>
      </section>

      <section>
        <h4>{t("dashboard.icon")}</h4>
        <div className="dw-icon-picker">
          {ICON_NAMES.map((name) => {
            const IconCmp = (Icons as Record<string, React.ComponentType<{ width?: number; height?: number }>>)[name];
            if (!IconCmp) return null;
            return (
              <button
                key={name}
                className={instance.iconName === name ? "active" : ""}
                title={name}
                aria-label={name}
                onClick={() => updateInstance(instance.id, { iconName: name as IconName })}
              >
                <IconCmp width={14} height={14} />
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h4>{t("dashboard.title")}</h4>
        <input
          defaultValue={instance.customTitle ?? ""}
          placeholder={t("dashboard.titlePlaceholder")}
          onBlur={(e) => {
            const value = e.target.value.trim();
            updateInstance(instance.id, { customTitle: value.length === 0 ? null : value });
          }}
        />
      </section>

      <section>
        <button className="dw-advanced-toggle" onClick={() => setShowAdvanced((v) => !v)}>
          {showAdvanced ? "▾ " : "▸ "}{t("dashboard.advanced")}
        </button>
        {showAdvanced && (
          <div className="dw-advanced">
            {instance.kind === "script" && customSource && (
              <ScriptAdvanced
                bodyJson={customSource.bodyJson}
                onUpdate={(next) => updateCustomWidget(customSource.id, { bodyJson: next })}
              />
            )}
            {instance.kind === "content" && customSource && (
              <pre className="dw-source-view">{customSource.bodyJson}</pre>
            )}
            {instance.kind === "builtIn" && (
              <p className="dw-muted">{t("dashboard.advancedNothing")}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function ScriptAdvanced({ bodyJson, onUpdate }: { bodyJson: string; onUpdate: (next: string) => void }) {
  const { t } = useTranslation();
  let parsed: { source: string; permissions: { network: boolean; pollSeconds?: number } };
  try {
    parsed = JSON.parse(bodyJson);
  } catch {
    return <p className="dw-muted">{t("dashboard.scriptInvalidBody")}</p>;
  }
  return (
    <div className="dw-stack-fields">
      <label className="dw-field">
        <input
          type="checkbox"
          checked={parsed.permissions.network}
          onChange={(e) => {
            const next = { ...parsed, permissions: { ...parsed.permissions, network: e.target.checked } };
            onUpdate(JSON.stringify(next));
          }}
        />
        <span>{t("dashboard.scriptNetwork")}</span>
      </label>
      <label className="dw-field">
        <span>{t("dashboard.scriptPollSeconds")}</span>
        <input
          type="number"
          min={1}
          value={parsed.permissions.pollSeconds ?? ""}
          onChange={(e) => {
            const value = e.target.value === "" ? undefined : Number(e.target.value);
            const next = { ...parsed, permissions: { ...parsed.permissions, pollSeconds: value } };
            onUpdate(JSON.stringify(next));
          }}
        />
      </label>
      <details>
        <summary>{t("dashboard.scriptViewSource")}</summary>
        <pre className="dw-source-view">{parsed.source}</pre>
      </details>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 3: Commit.**

```bash
git add src/dashboard/edit/CustomizePopover.tsx
git commit -m "feat(dashboard): customize popover with preset/accent/icon/title + advanced section"
```

---

### Task D7: Catalog overlay (Add widget modal)

**Files:**
- Create: `src/dashboard/edit/CatalogOverlay.tsx`

- [ ] **Step 1: Create `src/dashboard/edit/CatalogOverlay.tsx`.**

```tsx
import * as Icons from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDashboardStore } from "../state/dashboardStore";
import { BUILT_IN_WIDGETS } from "../registry/builtInRegistry";
import type { AccentName, IconName, WidgetKind, WidgetPreset } from "../types";

export interface CatalogOverlayProps { viewId: string; onClose: () => void; }

interface CatalogEntry {
  id: string;
  kind: WidgetKind;
  title: string;
  summary: string;
  category: string;
  defaultPreset: WidgetPreset;
  defaultAccent: AccentName;
  defaultIcon: IconName;
  defaultSize: { w: number; h: number };
  isCustom: boolean;
  createdBy?: "user" | "agent";
}

export function CatalogOverlay({ viewId, onClose }: CatalogOverlayProps) {
  const { t } = useTranslation();
  const customWidgets = useDashboardStore((s) => s.customWidgets);
  const instances = useDashboardStore((s) => s.instances);
  const addInstance = useDashboardStore((s) => s.addInstance);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const entries: CatalogEntry[] = useMemo(() => {
    const builtIns: CatalogEntry[] = BUILT_IN_WIDGETS.map((w) => ({
      id: w.id,
      kind: "builtIn",
      title: t(w.titleKey),
      summary: t(w.summaryKey),
      category: w.category,
      defaultPreset: w.defaultPreset,
      defaultAccent: w.defaultAccent,
      defaultIcon: w.defaultIcon,
      defaultSize: w.defaultSize,
      isCustom: false,
    }));
    const customs: CatalogEntry[] = customWidgets.map((c) => ({
      id: c.id,
      kind: c.kind,
      title: c.title,
      summary: c.summary,
      category: c.category,
      defaultPreset: "panel",
      defaultAccent: "blue",
      defaultIcon: "Bot",
      defaultSize: { w: 3, h: 3 },
      isCustom: true,
      createdBy: c.createdBy,
    }));
    return [...builtIns, ...customs];
  }, [customWidgets, t]);

  const categories = useMemo(() => {
    const set = new Set<string>(["all"]);
    entries.forEach((e) => set.add(e.category));
    return [...set];
  }, [entries]);

  const visible = useMemo(() => entries.filter((e) => {
    if (category !== "all" && e.category !== category) return false;
    if (!query) return true;
    const hay = `${e.title} ${e.summary}`.toLowerCase();
    return hay.includes(query.toLowerCase());
  }), [entries, category, query]);

  async function onAdd(entry: CatalogEntry) {
    await addInstance({
      viewId,
      kind: entry.kind,
      sourceId: entry.id,
      preset: entry.defaultPreset,
      accentName: entry.defaultAccent,
      iconName: entry.defaultIcon,
      gridX: 0,
      gridY: Number.MAX_SAFE_INTEGER, // RGL will pack to bottom
      gridW: entry.defaultSize.w,
      gridH: entry.defaultSize.h,
    });
    onClose();
  }

  return (
    <div className="dw-catalog-backdrop" onClick={onClose}>
      <div className="dw-catalog" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{t("dashboard.catalogTitle")}</h2>
          <input
            placeholder={t("dashboard.catalogSearch")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button onClick={onClose} aria-label={t("common.close")} title={t("common.close")}>
            <Icons.X width={14} height={14} />
          </button>
        </header>
        <nav className="dw-catalog-tabs">
          {categories.map((c) => (
            <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>
              {c === "all" ? t("dashboard.catalogAll") : c}
            </button>
          ))}
        </nav>
        <div className="dw-catalog-grid">
          {visible.map((entry) => {
            const alreadyOnView = instances.some(
              (i) => i.viewId === viewId && i.sourceId === entry.id && i.kind === entry.kind,
            );
            return (
              <button key={entry.id} className="dw-catalog-card" onClick={() => onAdd(entry)}>
                <span className="dw-catalog-thumb" data-preset={entry.defaultPreset} />
                <h4>{entry.title}</h4>
                <p>{entry.summary}</p>
                <div className="dw-catalog-meta">
                  <span>{entry.category}</span>
                  {entry.createdBy === "agent" && <span className="dw-badge">AI</span>}
                  {alreadyOnView && <span className="dw-badge">✓</span>}
                </div>
              </button>
            );
          })}
          {visible.length === 0 && <p className="dw-empty">{t("dashboard.catalogNoMatches")}</p>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 3: Commit.**

```bash
git add src/dashboard/edit/CatalogOverlay.tsx
git commit -m "feat(dashboard): catalog overlay listing built-in + AI-authored widgets with search and category tabs"
```

---

## Phase E — Dashboard shell

### Task E1: Rewrite `DashboardPage.tsx`

**Files:**
- Modify: `src/dashboard/DashboardPage.tsx` (full rewrite)

- [ ] **Step 1: Back up the legacy state references but discard the body.** Open `src/dashboard/DashboardPage.tsx` and replace its entire content with the new shell. Persistence keys (`CUSTOM_WIDGET_STORAGE_KEY` etc.) and localStorage helpers are removed because SQLite is now the source of truth.

```tsx
import { Edit3, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AssistantPageContext } from "../ai/AssistantPanel";
import { CatalogOverlay } from "./edit/CatalogOverlay";
import { CustomizePopover } from "./edit/CustomizePopover";
import "./dashboard.css";
import { useDashboardStore } from "./state/dashboardStore";
import type { DashboardWidgetInstance, GridDensity } from "./types";
import { DashboardCanvas } from "./view/DashboardCanvas";

export function DashboardPage({
  onAssistantContextChange,
}: {
  onAssistantContextChange: (context: AssistantPageContext) => void;
}) {
  const { t } = useTranslation();
  const ready = useDashboardStore((s) => s.ready);
  const load = useDashboardStore((s) => s.load);
  const views = useDashboardStore((s) => s.views);
  const instances = useDashboardStore((s) => s.instances);
  const customWidgets = useDashboardStore((s) => s.customWidgets);
  const activeViewId = useDashboardStore((s) => s.activeViewId);
  const setActiveView = useDashboardStore((s) => s.setActiveView);
  const editMode = useDashboardStore((s) => s.editMode);
  const toggleEditMode = useDashboardStore((s) => s.toggleEditMode);
  const setViewDensity = useDashboardStore((s) => s.setViewDensity);
  const createView = useDashboardStore((s) => s.createView);
  const renameView = useDashboardStore((s) => s.renameView);
  const removeView = useDashboardStore((s) => s.removeView);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [customize, setCustomize] = useState<{ instance: DashboardWidgetInstance; rect: DOMRect } | null>(null);

  useEffect(() => {
    if (!ready) void load();
  }, [ready, load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && editMode) toggleEditMode();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editMode, toggleEditMode]);

  const activeView = views.find((v) => v.id === activeViewId) ?? views[0];
  const viewInstances = activeView ? instances.filter((i) => i.viewId === activeView.id) : [];

  useEffect(() => {
    if (!activeView) return;
    onAssistantContextChange({
      page: "dashboard",
      summary: t("dashboard.assistantSummary", {
        view: activeView.title,
        count: viewInstances.length,
      }),
      details: JSON.stringify({
        page: "dashboard",
        activeView: { id: activeView.id, title: activeView.title, gridDensity: activeView.gridDensity },
        instances: viewInstances.map((i) => ({
          id: i.id, kind: i.kind, sourceId: i.sourceId, customTitle: i.customTitle,
          preset: i.preset, x: i.gridX, y: i.gridY, w: i.gridW, h: i.gridH,
        })),
        customWidgets: customWidgets.map((c) => ({ id: c.id, kind: c.kind, title: c.title })),
      }),
    });
  }, [activeView, viewInstances, customWidgets, onAssistantContextChange, t]);

  if (!ready || !activeView) return <div className="dashboard-loading">{t("common.loading")}</div>;

  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <span className="crumb">{t("dashboard.title")}</span>
          <h1>{activeView.title}</h1>
        </div>
        <div className="dashboard-view-pills">
          {views.map((v) => (
            <button
              key={v.id}
              className={`dashboard-pill${v.id === activeView.id ? " active" : ""}`}
              onClick={() => setActiveView(v.id)}
              onDoubleClick={() => {
                const next = window.prompt(t("dashboard.renameView"), v.title);
                if (next && next.trim()) void renameView(v.id, next.trim());
              }}
            >
              {v.title}
              {views.length > 1 && (
                <span
                  className="dashboard-pill-close"
                  onClick={(e) => { e.stopPropagation(); void removeView(v.id); }}
                  role="button"
                  aria-label={t("dashboard.removeView")}
                >×</span>
              )}
            </button>
          ))}
          <button
            className="dashboard-pill-add"
            onClick={async () => {
              const title = window.prompt(t("dashboard.newViewPrompt"), `View ${views.length + 1}`);
              if (title && title.trim()) await createView(title.trim());
            }}
          >
            <Plus size={12} /> {t("dashboard.addView")}
          </button>
        </div>
        <div className="dashboard-actions">
          {editMode && (
            <DensityControl
              value={activeView.gridDensity}
              onChange={(d) => void setViewDensity(activeView.id, d)}
            />
          )}
          <button className="btn-ghost" onClick={toggleEditMode}>
            <Edit3 size={13} /> {editMode ? t("dashboard.editDone") : t("dashboard.editLayout")}
          </button>
          <button className="btn-primary" onClick={() => setCatalogOpen(true)}>
            <Plus size={13} /> {t("dashboard.addWidget")}
          </button>
        </div>
      </header>

      <DashboardCanvas
        view={activeView}
        instances={viewInstances}
        onCustomize={(instance, anchor) => setCustomize({ instance, rect: anchor.getBoundingClientRect() })}
      />

      {catalogOpen && (
        <CatalogOverlay viewId={activeView.id} onClose={() => setCatalogOpen(false)} />
      )}
      {customize && (
        <CustomizePopover
          instance={customize.instance}
          anchorRect={customize.rect}
          onClose={() => setCustomize(null)}
        />
      )}
    </main>
  );
}

function DensityControl({ value, onChange }: { value: GridDensity; onChange: (v: GridDensity) => void }) {
  const { t } = useTranslation();
  return (
    <div className="dashboard-density">
      {(["compact", "default", "roomy"] as const).map((d) => (
        <button
          key={d}
          className={d === value ? "active" : ""}
          onClick={() => onChange(d)}
        >{t(`dashboard.density.${d}`)}</button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Append topbar styling to `src/dashboard/dashboard.css`.**

```css
.dashboard-page {
  display: flex; flex-direction: column;
  height: 100%; min-height: 0;
  background: var(--app-bg);
}
.dashboard-topbar {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, var(--surface), transparent);
}
.dashboard-brand { display: flex; align-items: baseline; gap: 8px; min-width: 160px; }
.dashboard-brand .crumb { font-size: 11px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.08em; }
.dashboard-brand h1 { margin: 0; font-size: 16px; color: var(--text); }
.dashboard-view-pills { display: flex; gap: 6px; flex: 1; align-items: center; }
.dashboard-pill {
  padding: 4px 10px; border-radius: 999px;
  background: var(--surface); border: 1px solid var(--border);
  color: var(--text-muted); font-size: 12px;
  display: inline-flex; align-items: center; gap: 4px;
}
.dashboard-pill.active { background: var(--accent-soft); color: var(--accent); border-color: var(--accent); }
.dashboard-pill-close { padding: 0 4px; cursor: pointer; }
.dashboard-pill-add {
  padding: 4px 8px; background: transparent; border: 1px dashed var(--border-strong);
  color: var(--text-muted); border-radius: 999px; font-size: 12px;
  display: inline-flex; align-items: center; gap: 4px;
}
.dashboard-actions { display: flex; gap: 8px; align-items: center; }
.dashboard-density { display: inline-flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
.dashboard-density button { padding: 4px 8px; background: var(--surface); color: var(--text-muted); border: none; font-size: 11px; }
.dashboard-density button.active { background: var(--accent-soft); color: var(--accent); }

.dw-canvas { padding: 8px 16px 24px; }
.dw-customize {
  position: fixed; z-index: 50; width: 280px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  padding: 10px 12px;
  box-shadow: var(--shadow);
  font-size: 12.5px;
}
.dw-customize h4 { margin: 8px 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
.dw-customize section + section { margin-top: 10px; }
.dw-preset-picker, .dw-accent-picker, .dw-icon-picker { display: flex; flex-wrap: wrap; gap: 4px; }
.dw-icon-picker { max-height: 120px; overflow: auto; }
.dw-preset-picker button, .dw-icon-picker button {
  background: var(--surface-muted); border: 1px solid var(--border); padding: 3px 7px;
  border-radius: 5px; font-size: 11.5px; color: var(--text);
}
.dw-preset-picker button.active, .dw-icon-picker button.active { background: var(--accent-soft); color: var(--accent); }
.dw-accent-picker button { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--surface); }
.dw-accent-picker button.active { border-color: var(--text); }

.dw-catalog-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 60;
}
.dw-catalog {
  width: min(720px, 90vw); max-height: 80vh; display: flex; flex-direction: column;
  background: var(--surface); border-radius: 12px; overflow: hidden;
}
.dw-catalog header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--border); }
.dw-catalog header h2 { margin: 0 8px 0 0; font-size: 14px; }
.dw-catalog header input { flex: 1; padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px; }
.dw-catalog-tabs { display: flex; gap: 4px; padding: 6px 12px; border-bottom: 1px solid var(--border); overflow-x: auto; }
.dw-catalog-tabs button { background: transparent; border: none; padding: 4px 10px; border-radius: 6px; color: var(--text-muted); font-size: 12px; }
.dw-catalog-tabs button.active { background: var(--accent-soft); color: var(--accent); }
.dw-catalog-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px; padding: 12px; overflow: auto;
}
.dw-catalog-card {
  text-align: left; padding: 10px; background: var(--surface-muted);
  border: 1px solid var(--border); border-radius: 8px;
  display: flex; flex-direction: column; gap: 4px;
}
.dw-catalog-card h4 { margin: 4px 0 0; font-size: 13px; }
.dw-catalog-card p { margin: 0; font-size: 11.5px; color: var(--text-muted); }
.dw-catalog-meta { display: flex; gap: 6px; font-size: 10.5px; color: var(--text-faint); }
.dw-badge { background: var(--accent-soft); color: var(--accent); padding: 0 5px; border-radius: 3px; }
.dw-catalog-thumb { display: block; height: 36px; background: var(--w-accent-soft, var(--accent-soft)); border-radius: 4px; }
```

- [ ] **Step 3: Typecheck and build.**

Run: `npm run check`
Expected: success. If `AssistantPageContext` shape doesn't include `page`/`summary`/`details` keys exactly, inspect `src/ai/AssistantPanel.tsx` and adjust the call to match the actual interface (some apps use `pageId` / `payload`).

- [ ] **Step 4: Delete the legacy `src/dashboard/widgets.typecheck.ts` file** since its imports (`normalizeAgentWidgetDefinition`) are no longer the dashboard's source of truth.

Run: `git rm src/dashboard/widgets.typecheck.ts`

- [ ] **Step 5: Commit.**

```bash
git add src/dashboard/DashboardPage.tsx src/dashboard/dashboard.css
git commit -m "feat(dashboard): rewrite DashboardPage shell to use SQLite store, RGL canvas, and new edit surfaces"
```

---

### Task E2: Wire onAssistantContextChange to ai context

**Files:**
- Modify (if needed): `src/ai/AssistantPanel.tsx` — only if the existing `AssistantPageContext` shape needs to grow

- [ ] **Step 1: Inspect the existing `AssistantPageContext` type.**

Run: `grep -n "AssistantPageContext" src/ai/AssistantPanel.tsx | head -10`

If the type already accepts an open `details` string, no change is needed. If not, add the missing fields. **Required:** the context must carry enough information for the AI to read the active dashboard. If the existing shape is minimal (`{ summary: string }`), extend it to `{ page: string; summary: string; details?: string }` and update call sites that emit it.

- [ ] **Step 2: If the type changes, update other callers** (search across the codebase):

Run: `grep -nr "onAssistantContextChange\s*\\?(" src/`
Expected callers: TerminalWorkspace, SftpWorkspace, others. Pass `page: "terminal" | "sftp" | ...` and omit `details` for non-dashboard pages.

- [ ] **Step 3: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 4: Commit (if any changes).**

```bash
git add src/ai/AssistantPanel.tsx <any other modified callers>
git commit -m "feat(ai): extend AssistantPageContext with optional details payload for dashboard"
```

---

## Phase F — Settings

### Task F1: Create DashboardSettings component

**Files:**
- Create: `src/settings/DashboardSettings.tsx`

- [ ] **Step 1: Inspect an existing simple settings section** to match conventions.

Run: `cat src/settings/AppearanceSettings.tsx | head -60`

Note the pattern: a `settings-card settings-section` container with `settings-subsection settings-fieldset` for grouped controls.

- [ ] **Step 2: Create `src/settings/DashboardSettings.tsx`.**

```tsx
import { useTranslation } from "react-i18next";
import { invokeCommand } from "../lib/tauri";
import { SettingsSectionHeader } from "./shared";
import { useDashboardStore } from "../dashboard/state/dashboardStore";

interface DashboardSettingsState {
  confirmRemove: boolean;
  defaultLandingView: string;
}

export function DashboardSettings({
  draft,
  onChange,
}: {
  draft: DashboardSettingsState;
  onChange: (next: DashboardSettingsState) => void;
}) {
  const { t } = useTranslation();
  const views = useDashboardStore((s) => s.views);

  return (
    <section className="settings-card settings-section">
      <SettingsSectionHeader
        title={t("settings.dashboardTitle")}
        description={t("settings.dashboardDescription")}
      />
      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.dashboardGeneral")}</legend>
        <label className="settings-toggle-row">
          <input
            type="checkbox"
            checked={draft.confirmRemove}
            onChange={(e) => onChange({ ...draft, confirmRemove: e.target.checked })}
          />
          <span>{t("settings.dashboardConfirmRemove")}</span>
        </label>
        <label className="settings-toggle-row">
          <span>{t("settings.dashboardDefaultLanding")}</span>
          <select
            value={draft.defaultLandingView}
            onChange={(e) => onChange({ ...draft, defaultLandingView: e.target.value })}
          >
            <option value="lastActive">{t("settings.dashboardLandingLast")}</option>
            {views.map((v) => (
              <option key={v.id} value={v.id}>{v.title}</option>
            ))}
          </select>
        </label>
      </fieldset>
    </section>
  );
}

export async function loadDashboardSettingsDraft(): Promise<DashboardSettingsState> {
  // Each setting persists in the existing settings key/value table.
  const confirmRemove = await invokeCommand<string | null>("get_setting", { key: "dashboard.confirmRemove" }) ?? "true";
  const defaultLandingView = await invokeCommand<string | null>("get_setting", { key: "dashboard.defaultLandingView" }) ?? "lastActive";
  return {
    confirmRemove: confirmRemove === "true",
    defaultLandingView,
  };
}

export async function saveDashboardSettingsDraft(draft: DashboardSettingsState): Promise<void> {
  await invokeCommand("set_setting", { key: "dashboard.confirmRemove", value: String(draft.confirmRemove) });
  await invokeCommand("set_setting", { key: "dashboard.defaultLandingView", value: draft.defaultLandingView });
}
```

If `get_setting` / `set_setting` Tauri commands don't already exist, replace with whatever the existing pattern is — most likely a typed `useBootstrapSettings()` plus a Tauri command set referenced from `src/lib/settings.ts`. Confirm by inspecting:

Run: `grep -n "get_setting\\|set_setting\\|setting(" src/lib/settings.ts | head -10`

Adjust the commands to match. The fundamental requirement is that `confirmRemove` and `defaultLandingView` persist across restarts via SQLite's `settings` table.

- [ ] **Step 3: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 4: Commit.**

```bash
git add src/settings/DashboardSettings.tsx
git commit -m "feat(settings): add DashboardSettings section with confirm-remove and default-landing-view"
```

---

### Task F2: Add Dashboard section to SettingsPage nav

**Files:**
- Modify: `src/settings/SettingsPage.tsx`

- [ ] **Step 1: Open `src/settings/SettingsPage.tsx`. Add `"dashboard-settings"` to the `SettingsSectionId` union.**

```ts
type SettingsSectionId =
  | "general-settings"
  | "appearance-settings"
  | "dashboard-settings"
  | "assistant-settings"
  | "ssh-settings"
  | "terminal-settings"
  | "url-settings"
  | "rdp-settings"
  | "vnc-settings"
  | "about-settings";
```

- [ ] **Step 2: Add a nav button next to the Appearance nav button.** Inside the `<aside className="settings-nav">`, between the Appearance button and the AI Assistant button:

```tsx
<button
  className={settingsNavItemClass("dashboard-settings", activeSectionId)}
  onClick={() => setActiveSectionId("dashboard-settings")}
  type="button"
>
  <LayoutDashboardIcon size={16} />
  <span>{t("settings.sectionDashboard")}</span>
</button>
```

Import `LayoutDashboard as LayoutDashboardIcon` from `lucide-react` at the top of the file.

- [ ] **Step 3: Add the section render block alongside the other section components.** Find where `<AppearanceSettings />` is rendered and add:

```tsx
{activeSectionId === "dashboard-settings" && (
  <DashboardSettings draft={dashboardDraft} onChange={setDashboardDraft} />
)}
```

Bring in the draft state with hooks at the top of the component:

```tsx
const [dashboardDraft, setDashboardDraft] = useState<DashboardSettingsState>({
  confirmRemove: true,
  defaultLandingView: "lastActive",
});
useEffect(() => { void loadDashboardSettingsDraft().then(setDashboardDraft); }, []);
useEffect(() => { void saveDashboardSettingsDraft(dashboardDraft); }, [dashboardDraft]);
```

Add the corresponding imports:

```tsx
import { DashboardSettings, loadDashboardSettingsDraft, saveDashboardSettingsDraft } from "./DashboardSettings";
import type { DashboardSettingsState } from "./DashboardSettings";
```

(Export `DashboardSettingsState` from `DashboardSettings.tsx` — add `export interface DashboardSettingsState` if not already.)

- [ ] **Step 4: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 5: Commit.**

```bash
git add src/settings/SettingsPage.tsx src/settings/DashboardSettings.tsx
git commit -m "feat(settings): wire Dashboard section into Settings nav and routing"
```

---

### Task F3: Add Reset Dashboard to General → Settings data

**Files:**
- Modify: `src/settings/GeneralSettings.tsx`

- [ ] **Step 1: Inspect `GeneralSettings.tsx`. Identify the existing reset buttons in the "Settings data" group.**

Run: `grep -n "Reset\\|settings-data\\|reset_layout\\|onResetLayout" src/settings/GeneralSettings.tsx | head -20`

- [ ] **Step 2: Add a new reset button next to existing reset actions.** Use an app-owned confirmation dialog (per AGENTS.md — no `window.confirm`). If a generic confirmation helper already exists in `src/settings/shared.tsx`, use it; otherwise use the simplest existing confirm pattern.

```tsx
<button
  className="settings-action danger"
  type="button"
  onClick={async () => {
    // open the existing app-owned confirm dialog with text:
    //   title:  t("settings.dashboardResetTitle")
    //   body:   t("settings.dashboardResetBody")
    //   confirm:t("settings.dashboardResetConfirm")
    const confirmed = await openConfirm({
      title: t("settings.dashboardResetTitle"),
      message: t("settings.dashboardResetBody"),
      confirmLabel: t("settings.dashboardResetConfirm"),
      destructive: true,
    });
    if (confirmed) {
      await useDashboardStore.getState().resetDashboard();
      showStatusBarNotice({ kind: "success", message: t("settings.dashboardResetDone") });
    }
  }}
>
  {t("settings.dashboardReset")}
</button>
```

Use whatever confirm-dialog helper the file already imports. If none exists, copy the pattern from one of the existing reset buttons in this file — they already use app-owned dialogs per AGENTS.md.

Add the imports near the top:

```tsx
import { useDashboardStore } from "../dashboard/state/dashboardStore";
```

- [ ] **Step 3: Typecheck and run.**

Run: `npm run check`
Expected: success.

- [ ] **Step 4: Commit.**

```bash
git add src/settings/GeneralSettings.tsx
git commit -m "feat(settings): add Reset Dashboard action to General → Settings data"
```

---

## Phase G — AI Assistant integration

### Task G1: Register dashboard tool definitions

**Files:**
- Modify: `src/ai/` (locate the tool registry — typically in `src/ai/providerRegistry/` or a tool-definitions file)

- [ ] **Step 1: Find the AI tool definitions / function registry.**

Run: `grep -nr "tool\\|function_call\\|toolSchema" src/ai/ | head -20`

The exact location depends on the assistant implementation. Look for a file that maps tool names to JSON schemas and handler functions.

- [ ] **Step 2: Register each `dashboard_*` Tauri command as an assistant tool.** Define the JSON schemas matching the Tauri command parameters from Task A5. Example pattern (adapt to the existing registry shape):

```ts
{
  name: "dashboard_add_instance",
  description: "Add a widget instance to a Dashboard view.",
  parameters: {
    type: "object",
    properties: {
      viewId: { type: "string" },
      kind: { type: "string", enum: ["builtIn", "content", "script"] },
      sourceId: { type: "string" },
      preset: { type: "string", enum: ["panel","ambient","glass","tile","hero","mono","stack","action","band"] },
      accentName: { type: "string" },
      iconName: { type: "string" },
      gridX: { type: "integer", minimum: 0, maximum: 11 },
      gridY: { type: "integer", minimum: 0 },
      gridW: { type: "integer", minimum: 1, maximum: 12 },
      gridH: { type: "integer", minimum: 1 },
    },
    required: ["viewId","kind","sourceId","preset","accentName","iconName","gridX","gridY","gridW","gridH"],
  },
  invoke: async (args: Record<string, unknown>) =>
    invokeCommand("dashboard_add_instance", args),
}
```

Repeat for: `dashboard_load_state`, `dashboard_create_view`, `dashboard_update_view`, `dashboard_remove_view`, `dashboard_reorder_views`, `dashboard_update_instance`, `dashboard_remove_instance`, `dashboard_apply_layout`, `dashboard_create_custom_widget`, `dashboard_update_custom_widget`, `dashboard_remove_custom_widget`, `dashboard_reset`. Mirror the parameter shapes exactly from the Tauri command signatures.

- [ ] **Step 3: Apply the approval-gating pattern already used by other tools.** Whatever wrapper currently enforces "command execution approval-based" (per CONTEXT.md) should wrap these tools too.

- [ ] **Step 4: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 5: Commit.**

```bash
git add src/ai/<changed files>
git commit -m "feat(ai): register dashboard_* Tauri commands as assistant tools with json schemas"
```

---

## Phase H — i18n, CSS polish, cleanup, verify

### Task H1: Add `dashboard.*` translation keys to en.json

**Files:**
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: Add the following keys to `src/i18n/locales/en.json` under the `dashboard` namespace.** Merge into the existing `dashboard` object; do not duplicate keys that are already there.

```jsonc
{
  "dashboard": {
    "title": "Dashboard",
    "editLayout": "Edit layout",
    "editDone": "Done",
    "addWidget": "Add widget",
    "addView": "View",
    "renameView": "Rename view",
    "removeView": "Remove view",
    "newViewPrompt": "Name for new view",
    "customize": "Customize",
    "removeWidget": "Remove widget",
    "untitledWidget": "Widget",
    "preset": "Style preset",
    "accent": "Accent",
    "icon": "Icon",
    "titlePlaceholder": "Override title",
    "advanced": "Advanced",
    "advancedNothing": "No advanced settings for built-in widgets.",
    "scriptInvalidBody": "Script body is malformed JSON.",
    "scriptNetwork": "Allow network",
    "scriptPollSeconds": "Poll interval (seconds)",
    "scriptViewSource": "View source",
    "catalogTitle": "Widget catalog",
    "catalogSearch": "Search widgets…",
    "catalogAll": "All",
    "catalogNoMatches": "No widgets match.",
    "density": {
      "compact": "Compact",
      "default": "Default",
      "roomy": "Roomy"
    },
    "preset.panel": "Panel",
    "preset.ambient": "Ambient",
    "preset.glass": "Glass",
    "preset.tile": "Tile",
    "preset.hero": "Hero",
    "preset.mono": "Mono",
    "preset.stack": "Stack",
    "preset.action": "Action",
    "preset.band": "Band",
    "assistantSummary": "Dashboard: {{view}} ({{count}} widgets)",
    "hashTitle": "Hash Calculator",
    "hashSummary": "SHA-1 and SHA-256 over pasted text, computed locally.",
    "hashInput": "Text to hash",
    "characters": "Characters",
    "bytes": "Bytes",
    "subnetTitle": "IPv4 Subnet",
    "subnetSummary": "Expand a CIDR into its network, broadcast, and usable range.",
    "subnetInvalid": "Enter a valid CIDR like 192.168.1.0/24",
    "cidrInput": "CIDR block",
    "network": "Network",
    "broadcast": "Broadcast",
    "firstUsable": "First usable",
    "lastUsable": "Last usable",
    "mask": "Mask",
    "usable": "Usable hosts",
    "quickToolsTitle": "Quick Tools",
    "quickToolsSummary": "Encode, decode, and convert common operational strings.",
    "tool": "Tool",
    "input": "Input",
    "output": "Output",
    "reportTitle": "Maintenance Report",
    "reportSummary": "A lightweight checklist for routine review.",
    "reportStep1": "Confirm current backup age.",
    "reportStep2": "Review changed Connections before maintenance.",
    "reportStep3": "Capture terminal evidence only when explicitly needed.",
    "reportStep4": "Keep command execution approval-based."
  }
}
```

Also add the new `settings` keys:

```jsonc
{
  "settings": {
    "sectionDashboard": "Dashboard",
    "dashboardTitle": "Dashboard",
    "dashboardDescription": "Cross-widget preferences for the Dashboard module.",
    "dashboardGeneral": "General",
    "dashboardConfirmRemove": "Confirm before removing a widget",
    "dashboardDefaultLanding": "Default landing view",
    "dashboardLandingLast": "Last active view",
    "dashboardReset": "Reset Dashboard",
    "dashboardResetTitle": "Reset Dashboard",
    "dashboardResetBody": "This deletes all Dashboard views, widget instances, and AI-authored custom widgets. The Default view will be restored with one App Launcher widget. This cannot be undone.",
    "dashboardResetConfirm": "Reset Dashboard",
    "dashboardResetDone": "Dashboard reset to defaults."
  }
}
```

- [ ] **Step 2: Typecheck.**

Run: `npm run check`
Expected: success. The `useT` hook will pick up the new keys automatically.

- [ ] **Step 3: Commit.**

```bash
git add src/i18n/locales/en.json
git commit -m "feat(i18n): add dashboard.* and settings.dashboard* English translation keys"
```

---

### Task H2: Record new i18n keys in `docs/LOCALIZATION.md`

**Files:**
- Modify: `docs/LOCALIZATION.md`

- [ ] **Step 1: Inspect existing entries to match the schema (key, English, namespace, file, role, flow, tone, placeholders).**

Run: `cat docs/LOCALIZATION.md`

- [ ] **Step 2: Append a `## Dashboard redesign 2026-05-11` section listing every key added in Task H1.** For brevity in this plan: one row per key with the eight required columns. Replicate the existing file's column shape. Example row:

```
- `dashboard.editLayout` — "Edit layout" — namespace `dashboard` — `src/dashboard/DashboardPage.tsx` — button — Dashboard topbar in normal mode — neutral imperative — no placeholders.
```

Add one such row per added key.

- [ ] **Step 3: Commit.**

```bash
git add docs/LOCALIZATION.md
git commit -m "docs(i18n): record dashboard redesign pending translation entries"
```

---

### Task H3: Remove obsolete legacy code

**Files:**
- Modify or remove: `src/dashboard/widgets.ts` (keep helpers used by new widget bodies; remove obsolete agent-widget normalizer if unused)
- Modify: `src/dashboard/motion.tsx` (keep — still used)

- [ ] **Step 1: Identify legacy exports that are no longer imported anywhere.**

Run: `grep -nr "normalizeAgentWidgetDefinition" src/`
Run: `grep -nr "DASHBOARD_BUILTIN_WIDGETS" src/`
Run: `grep -nr "DashboardWidgetDefinition" src/`

For each export that returns zero importers after the rewrite, remove it from `src/dashboard/widgets.ts`. Keep `calculateIpv4Subnet`, `calculateTextHashes`, and `transformQuickTool` because new widget bodies import them.

- [ ] **Step 2: Remove the unused exports and their types from `src/dashboard/widgets.ts`.** Trim the file to just the three pure-logic helpers and their associated types.

- [ ] **Step 3: Typecheck.**

Run: `npm run check`
Expected: success.

- [ ] **Step 4: Commit.**

```bash
git add src/dashboard/widgets.ts
git commit -m "chore(dashboard): drop legacy localStorage-era widget definitions, keep pure helpers"
```

---

### Task H4: Final verification and smoke test

- [ ] **Step 1: Run the full check suite.**

Run: `npm run check`
Expected: success.

- [ ] **Step 2: Build the frontend.**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Run backend checks.**

Run: `cargo check --manifest-path src-tauri/Cargo.toml && cargo test --manifest-path src-tauri/Cargo.toml`
Expected: success; all dashboard tests pass.

- [ ] **Step 4: Manual smoke test in `npm run tauri dev`.**

Run: `npm run tauri dev`
Then walk through:
- Open Dashboard from the activity rail. Default view appears with App Launcher pre-placed.
- Click "Edit layout". Drag App Launcher to a new grid position. Resize via the corner handle. Click "Done". Restart the app. Layout persists.
- Click "Add widget". Browse the catalog. Add Hash Calculator. Confirm it appears on the canvas.
- Click ⚙ on Hash Calculator. Change preset to Mono, change accent to green, change icon to Cpu, set title to "My Hash". Close popover. Changes visible immediately.
- Open Settings → Appearance, switch color scheme to Kuai-Kuai. Dashboard chrome (topbar, view-pill background) shifts; widget accent stays green.
- Open Settings → Dashboard, toggle "Confirm before removing a widget" off and back on; values persist.
- Open Settings → General → Settings data → Reset Dashboard. Confirm. Dashboard returns to one Default view + one App Launcher.

- [ ] **Step 5: If any step fails, fix and re-run quality gates before declaring done.** Do not mark "completed" with skipped checks (AGENTS.md Rule 12: fail loud).

- [ ] **Step 6: Final commit if smoke test surfaced minor fixes.**

```bash
git add <fixed files>
git commit -m "chore(dashboard): fixes from smoke verification"
```

---

## Self-Review Summary

**Spec coverage check:**
- Domain model (views/instances/customWidgets) — Tasks A1, A3, B1.
- 9 presets — Task C2.
- Per-widget customization (preset/accent/icon/title) — Tasks C1, D6.
- Drag-and-drop layout via react-grid-layout — Tasks A7, D5.
- SQLite tables (schema bump, three tables, FK cascade) — Tasks A1, A3, A4, A6.
- 13 Tauri commands — Task A5.
- Validation in Rust — Task A2.
- Built-in registry — Task C3.
- Content widget renderer (markdown/kvList/checklist/stat) — Task D1.
- Script widget host (iframe srcdoc + CSP) — Task D2.
- AI Assistant tool registration — Task G1.
- AI page-context payload — Task E1.
- Settings → Dashboard section — Tasks F1, F2.
- General → Reset Dashboard — Task F3.
- i18n — Tasks H1, H2.
- Quality gates — Task H4.

**Placeholder scan:** no TBD/TODO/XXX. Three tasks rely on inspection ("locate" / "if signature differs"): A4 step 1-2, F2 step 3 (settings draft hook style), G1 step 1-2 (tool registry location). These are unavoidable because the exact existing call shape is not codified — instructions tell the engineer how to detect and adapt.

**Type consistency:** Rust `snake_case` types ↔ TypeScript `camelCase` types are matched per Tauri serde rename. Tauri command parameter names match TS `persistence.ts` arg shapes. Zustand store method names (`addInstance`, `updateInstance`, `removeInstance`, `applyLayout`, `createCustomWidget`, `updateCustomWidget`, `removeCustomWidget`, `resetDashboard`) match `persistence.ts`.

**Scope:** Single PR. Phase A through H produce a working, testable Dashboard redesign. Follow-up backlog items from the spec are explicitly out of scope and not in this plan.

---

## Execution

**Plan complete and saved to `docs/superpowers/plans/2026-05-11-dashboard-redesign.md`.** Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
