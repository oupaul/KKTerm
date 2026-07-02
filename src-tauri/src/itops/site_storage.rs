// Site topology storage (docs/SITE.md Phase B): CRUD for Racks and Rack Devices
// plus the pure U-span overlap/fit validator. Mirrors the conventions in
// `itops/storage.rs` (free functions over `&SqliteConnection`, JSON `TEXT` for
// non-relational fields, integer `sort_order`). Reuses `ItopsStorageError`.

use rusqlite::{Connection as SqliteConnection, OptionalExtension, params};

use super::inventory::normalize_metadata;
use super::storage::ItopsStorageError;
use super::types::{
    Rack, RackItem, RackItemKind, RackItemMetadata, RackPlacementEntry, ServerRoom,
};
use crate::dashboard_storage::DashboardBackground;

type Result<T> = std::result::Result<T, ItopsStorageError>;

/// Hard ceiling on rack height so a single rack can't claim an absurd U count.
const MAX_RACK_HEIGHT_U: u32 = 100;
const MAX_RACK_DEPTH_MM: u32 = 5000;
/// Generous ceiling on a rack's power capacity (1 MW) — a sanity bound, not a
/// physical model.
const MAX_RACK_POWER_W: u32 = 1_000_000;

// ── Pure placement validation ───────────────────────────────────────────────

/// A `[start_u, start_u + height_u)` half-open U span (1-based start).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Span {
    pub start_u: u32,
    pub height_u: u32,
}

impl Span {
    /// Exclusive top edge: the first U *above* this item.
    fn end_exclusive(&self) -> u32 {
        self.start_u + self.height_u
    }
}

/// Two spans overlap when each starts below the other's exclusive top.
pub fn spans_overlap(a: Span, b: Span) -> bool {
    a.start_u < b.end_exclusive() && b.start_u < a.end_exclusive()
}

/// Validate that `candidate` is a legal placement in a rack of `rack_height_u`:
/// positive, in-bounds, and not overlapping any of `existing` (each tagged with
/// its item id so an update/move can exclude itself via `ignore_id`).
pub fn validate_placement(
    rack_height_u: u32,
    existing: &[(String, Span)],
    ignore_id: Option<&str>,
    candidate: Span,
) -> Result<()> {
    if candidate.start_u < 1 || candidate.height_u < 1 {
        return Err(ItopsStorageError::Validation(
            "rack item must start at U1 or higher and be at least 1U tall".to_string(),
        ));
    }
    // Top occupied U = start + height - 1; must fit within the rack.
    if candidate.start_u + candidate.height_u - 1 > rack_height_u {
        return Err(ItopsStorageError::Validation(format!(
            "rack item does not fit: it would occupy up to U{} in a {}U rack",
            candidate.start_u + candidate.height_u - 1,
            rack_height_u
        )));
    }
    for (id, span) in existing {
        if ignore_id == Some(id.as_str()) {
            continue;
        }
        if spans_overlap(candidate, *span) {
            return Err(ItopsStorageError::Validation(format!(
                "rack item overlaps an existing device at U{}",
                span.start_u
            )));
        }
    }
    Ok(())
}

// ── Serialization helpers ───────────────────────────────────────────────────

fn validate_name(name: &str) -> Result<String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(ItopsStorageError::Validation(
            "rack name must not be empty".to_string(),
        ));
    }
    Ok(trimmed.to_string())
}

fn validate_height(height_u: u32) -> Result<u32> {
    if !(1..=MAX_RACK_HEIGHT_U).contains(&height_u) {
        return Err(ItopsStorageError::Validation(format!(
            "rack height must be between 1 and {MAX_RACK_HEIGHT_U}U"
        )));
    }
    Ok(height_u)
}

fn validate_depth(depth_mm: u32) -> Result<u32> {
    if !(1..=MAX_RACK_DEPTH_MM).contains(&depth_mm) {
        return Err(ItopsStorageError::Validation(format!(
            "rack depth must be between 1 and {MAX_RACK_DEPTH_MM} mm"
        )));
    }
    Ok(depth_mm)
}

/// 0/None mean "capacity unset"; anything else must be a sane wattage.
fn validate_power_capacity(power_capacity_w: Option<u32>) -> Result<Option<u32>> {
    match power_capacity_w {
        None | Some(0) => Ok(None),
        Some(watts) if watts <= MAX_RACK_POWER_W => Ok(Some(watts)),
        Some(_) => Err(ItopsStorageError::Validation(format!(
            "rack power capacity must be at most {MAX_RACK_POWER_W} W"
        ))),
    }
}

pub fn list_server_rooms(conn: &SqliteConnection, site_id: &str) -> Result<Vec<ServerRoom>> {
    let mut statement = conn.prepare(
        "SELECT id, site_id, name, sort_order FROM itops_server_rooms WHERE site_id = ? ORDER BY sort_order",
    )?;
    Ok(statement
        .query_map(params![site_id], |row| {
            Ok(ServerRoom {
                id: row.get(0)?,
                site_id: row.get(1)?,
                name: row.get(2)?,
                sort_order: row.get(3)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn create_server_room(
    conn: &SqliteConnection,
    id: &str,
    site_id: &str,
    name: &str,
) -> Result<ServerRoom> {
    let name = name.trim();
    if name.is_empty() {
        return Err(ItopsStorageError::Validation(
            "server room name must not be empty".to_string(),
        ));
    }
    let next_sort: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM itops_server_rooms WHERE site_id = ?",
        params![site_id],
        |row| row.get(0),
    )?;
    conn.execute(
        "INSERT INTO itops_server_rooms (id, site_id, name, sort_order) VALUES (?, ?, ?, ?)",
        params![id, site_id, name, next_sort],
    )?;
    Ok(ServerRoom {
        id: id.to_string(),
        site_id: site_id.to_string(),
        name: name.to_string(),
        sort_order: next_sort,
    })
}

pub fn delete_server_room(conn: &SqliteConnection, id: &str) -> Result<()> {
    if conn.execute("DELETE FROM itops_server_rooms WHERE id = ?", params![id])? == 0 {
        return Err(ItopsStorageError::NotFound);
    }
    Ok(())
}

fn validate_server_room(conn: &SqliteConnection, site_id: &str, name: &str) -> Result<String> {
    let name = name.trim();
    if name.is_empty() {
        return Err(ItopsStorageError::Validation(
            "rack must belong to a server room".to_string(),
        ));
    }
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM itops_server_rooms WHERE site_id = ? AND name = ? COLLATE NOCASE)",
        params![site_id, name], |row| row.get(0),
    )?;
    if !exists {
        return Err(ItopsStorageError::Validation(
            "server room does not belong to this site".to_string(),
        ));
    }
    Ok(name.to_string())
}

fn metadata_to_json(metadata: &RackItemMetadata) -> Result<String> {
    serde_json::to_string(&normalize_metadata(metadata.clone()))
        .map_err(|error| ItopsStorageError::Validation(error.to_string()))
}

fn parse_metadata(raw: &str) -> RackItemMetadata {
    serde_json::from_str(raw)
        .map(normalize_metadata)
        .unwrap_or_default()
}

// ── Item reads ──────────────────────────────────────────────────────────────

fn row_to_item(row: &rusqlite::Row<'_>) -> rusqlite::Result<RackItem> {
    let kind: String = row.get(3)?;
    let metadata_json: String = row.get(7)?;
    Ok(RackItem {
        id: row.get(0)?,
        rack_id: row.get(1)?,
        connection_id: row.get(2)?,
        kind: RackItemKind::from_db_str(&kind).unwrap_or(RackItemKind::Blank),
        label: row.get(4)?,
        start_u: row.get(5)?,
        height_u: row.get(6)?,
        metadata: parse_metadata(&metadata_json),
    })
}

const SELECT_ITEM_COLUMNS: &str = "id, rack_id, connection_id, kind, label, start_u, height_u, metadata_json \
     FROM itops_site_rack_items";

fn list_items_for_rack(conn: &SqliteConnection, rack_id: &str) -> Result<Vec<RackItem>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {SELECT_ITEM_COLUMNS} WHERE rack_id = ? ORDER BY start_u"
    ))?;
    let items = stmt
        .query_map(params![rack_id], row_to_item)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

/// Existing spans in a rack, paired with their item ids (for overlap checks).
fn existing_spans(conn: &SqliteConnection, rack_id: &str) -> Result<Vec<(String, Span)>> {
    Ok(list_items_for_rack(conn, rack_id)?
        .into_iter()
        .map(|item| {
            (
                item.id,
                Span {
                    start_u: item.start_u,
                    height_u: item.height_u,
                },
            )
        })
        .collect())
}

fn fetch_rack_height(conn: &SqliteConnection, rack_id: &str) -> Result<u32> {
    conn.query_row(
        "SELECT height_u FROM itops_site_racks WHERE id = ?",
        params![rack_id],
        |row| row.get(0),
    )
    .optional()?
    .ok_or(ItopsStorageError::NotFound)
}

// ── Rack CRUD ───────────────────────────────────────────────────────────────

fn row_to_rack(row: &rusqlite::Row<'_>) -> rusqlite::Result<Rack> {
    let background: Option<String> = row.get(6)?;
    Ok(Rack {
        id: row.get(0)?,
        site_id: row.get(1)?,
        name: row.get(2)?,
        server_room: row.get(3)?,
        rack_group: row.get(4)?,
        shell: row.get(5)?,
        background: background.and_then(|json| serde_json::from_str(&json).ok()),
        height_u: row.get(7)?,
        depth_mm: row.get(8)?,
        sort_order: row.get(9)?,
        power_capacity_w: row.get(10)?,
        floor_x: row.get(11)?,
        floor_y: row.get(12)?,
        grid_x: row.get(13)?,
        grid_y: row.get(14)?,
        items: Vec::new(),
    })
}

const SELECT_RACK_COLUMNS: &str = "id, site_id, name, server_room, rack_group, shell, \
     background_json, height_u, depth_mm, sort_order, power_capacity_w, \
     floor_x, floor_y, grid_x, grid_y FROM itops_site_racks";

/// Normalize a shell choice to a stored value: blank/"black"/None → NULL (the
/// default), otherwise the trimmed colour name.
fn normalize_shell(shell: Option<&str>) -> Option<String> {
    match shell.map(str::trim) {
        Some(value) if !value.is_empty() && value != "black" => Some(value.to_string()),
        _ => None,
    }
}

/// Serialize a rack background for storage, validating first.
fn rack_background_to_json(background: &Option<DashboardBackground>) -> Result<Option<String>> {
    match background {
        None => Ok(None),
        Some(bg) => {
            bg.validate()
                .map_err(|error| ItopsStorageError::Validation(format!("{error:?}")))?;
            serde_json::to_string(bg)
                .map(Some)
                .map_err(|error| ItopsStorageError::Validation(error.to_string()))
        }
    }
}

/// All Racks in a Site, ordered by `sort_order`, each with its items hydrated.
pub fn list_racks(conn: &SqliteConnection, site_id: &str) -> Result<Vec<Rack>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {SELECT_RACK_COLUMNS} WHERE site_id = ? ORDER BY sort_order"
    ))?;
    let mut racks = stmt
        .query_map(params![site_id], row_to_rack)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    for rack in &mut racks {
        rack.items = list_items_for_rack(conn, &rack.id)?;
    }
    Ok(racks)
}

#[allow(clippy::too_many_arguments)]
#[allow(clippy::too_many_arguments)]
pub fn create_rack(
    conn: &SqliteConnection,
    id: &str,
    site_id: &str,
    name: &str,
    server_room: &str,
    rack_group: &str,
    shell: Option<&str>,
    height_u: u32,
    depth_mm: u32,
    power_capacity_w: Option<u32>,
) -> Result<Rack> {
    let name = validate_name(name)?;
    let server_room = validate_server_room(conn, site_id, server_room)?;
    let height_u = validate_height(height_u)?;
    let depth_mm = validate_depth(depth_mm)?;
    let power_capacity_w = validate_power_capacity(power_capacity_w)?;
    let shell = normalize_shell(shell);
    let next_sort: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM itops_site_racks WHERE site_id = ?",
        params![site_id],
        |row| row.get(0),
    )?;
    conn.execute(
        "INSERT INTO itops_site_racks
            (id, site_id, name, server_room, rack_group, shell, height_u, depth_mm,
             power_capacity_w, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            id,
            site_id,
            name,
            server_room,
            rack_group.trim(),
            shell,
            height_u,
            depth_mm,
            power_capacity_w,
            next_sort
        ],
    )?;
    Ok(Rack {
        id: id.to_string(),
        site_id: site_id.to_string(),
        name,
        server_room,
        rack_group: rack_group.trim().to_string(),
        shell,
        background: None,
        height_u,
        depth_mm,
        power_capacity_w,
        floor_x: None,
        floor_y: None,
        grid_x: None,
        grid_y: None,
        sort_order: next_sort,
        items: Vec::new(),
    })
}

/// Update a Rack's name/server-room/group/shell/height. Shrinking the height is
/// rejected if any existing item would no longer fit, so the layout never breaks.
#[allow(clippy::too_many_arguments)]
pub fn update_rack(
    conn: &SqliteConnection,
    id: &str,
    name: &str,
    server_room: &str,
    rack_group: &str,
    shell: Option<&str>,
    height_u: u32,
    depth_mm: u32,
    power_capacity_w: Option<u32>,
) -> Result<Rack> {
    let name = validate_name(name)?;
    let height_u = validate_height(height_u)?;
    let depth_mm = validate_depth(depth_mm)?;
    let power_capacity_w = validate_power_capacity(power_capacity_w)?;
    let shell = normalize_shell(shell);
    // Existence check (returns NotFound early before the height-shrink scan).
    let (site_id, _sort_order): (String, i64) = conn
        .query_row(
            "SELECT site_id, sort_order FROM itops_site_racks WHERE id = ?",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()?
        .ok_or(ItopsStorageError::NotFound)?;
    let server_room = validate_server_room(conn, &site_id, server_room)?;
    for item in list_items_for_rack(conn, id)? {
        if item.start_u + item.height_u - 1 > height_u {
            return Err(ItopsStorageError::Validation(format!(
                "cannot shrink to {height_u}U: an item occupies U{}",
                item.start_u + item.height_u - 1
            )));
        }
    }
    conn.execute(
        "UPDATE itops_site_racks
         SET name = ?, server_room = ?, rack_group = ?, shell = ?, height_u = ?, depth_mm = ?,
             power_capacity_w = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?",
        params![
            name,
            server_room,
            rack_group.trim(),
            shell,
            height_u,
            depth_mm,
            power_capacity_w,
            id
        ],
    )?;
    fetch_rack(conn, id)
}

/// Re-read one Rack by id (with items hydrated), preserving fields a partial
/// update does not touch (e.g. background).
fn fetch_rack(conn: &SqliteConnection, id: &str) -> Result<Rack> {
    let mut rack = conn
        .query_row(
            &format!("SELECT {SELECT_RACK_COLUMNS} WHERE id = ?"),
            params![id],
            row_to_rack,
        )
        .optional()?
        .ok_or(ItopsStorageError::NotFound)?;
    rack.items = list_items_for_rack(conn, id)?;
    Ok(rack)
}

/// Set (or clear) the single-rack stage background.
pub fn set_rack_background(
    conn: &SqliteConnection,
    id: &str,
    background: Option<DashboardBackground>,
) -> Result<Rack> {
    let json = rack_background_to_json(&background)?;
    let affected = conn.execute(
        "UPDATE itops_site_racks SET background_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![json, id],
    )?;
    if affected == 0 {
        return Err(ItopsStorageError::NotFound);
    }
    fetch_rack(conn, id)
}

pub fn delete_rack(conn: &SqliteConnection, id: &str) -> Result<()> {
    // Items cascade via the FK ON DELETE CASCADE.
    let affected = conn.execute("DELETE FROM itops_site_racks WHERE id = ?", params![id])?;
    if affected == 0 {
        return Err(ItopsStorageError::NotFound);
    }
    Ok(())
}

pub fn reorder_racks(conn: &SqliteConnection, site_id: &str, ordered_ids: &[String]) -> Result<()> {
    for (index, id) in ordered_ids.iter().enumerate() {
        conn.execute(
            "UPDATE itops_site_racks SET sort_order = ? WHERE id = ? AND site_id = ?",
            params![index as i64, id, site_id],
        )?;
    }
    Ok(())
}

/// Which Server Room View layout a placement update targets.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RackPlacementKind {
    /// Top-down floor plan free position, px.
    Floor,
    /// 2.5D view floor grid cell (col/row), rounded and clamped to >= 0.
    Grid,
}

impl RackPlacementKind {
    pub fn from_str(value: &str) -> Result<Self> {
        match value {
            "floor" => Ok(RackPlacementKind::Floor),
            "grid" => Ok(RackPlacementKind::Grid),
            other => Err(ItopsStorageError::Validation(format!(
                "unknown rack placement kind: {other}"
            ))),
        }
    }
}

/// Persist Server Room View placements for a batch of racks (a drag can move
/// two cabinets at once when they swap tiles). Ids that no longer exist are
/// skipped: a rack deleted mid-drag must not fail the rest of the batch.
pub fn set_rack_placements(
    conn: &SqliteConnection,
    kind: RackPlacementKind,
    entries: &[RackPlacementEntry],
) -> Result<()> {
    for entry in entries {
        if !entry.x.is_finite() || !entry.y.is_finite() {
            return Err(ItopsStorageError::Validation(
                "rack placement coordinates must be finite".to_string(),
            ));
        }
        match kind {
            RackPlacementKind::Floor => {
                conn.execute(
                    "UPDATE itops_site_racks
                     SET floor_x = ?, floor_y = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?",
                    params![entry.x.max(0.0), entry.y.max(0.0), entry.id],
                )?;
            }
            RackPlacementKind::Grid => {
                conn.execute(
                    "UPDATE itops_site_racks
                     SET grid_x = ?, grid_y = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?",
                    params![
                        entry.x.round().max(0.0) as i64,
                        entry.y.round().max(0.0) as i64,
                        entry.id
                    ],
                )?;
            }
        }
    }
    Ok(())
}

// ── Rack Device CRUD ────────────────────────────────────────────────────────

/// Validate that a Connection-backed item carries a connection id, and passive
/// items do not masquerade as openable.
fn normalize_item_connection(
    kind: RackItemKind,
    connection_id: Option<String>,
) -> Result<Option<String>> {
    match (kind, connection_id) {
        (RackItemKind::Connection, Some(connection_id)) if !connection_id.trim().is_empty() => {
            Ok(Some(connection_id))
        }
        (RackItemKind::Connection, _) => Err(ItopsStorageError::Validation(
            "a connection rack item requires a connectionId".to_string(),
        )),
        _ => Ok(None),
    }
}

#[allow(clippy::too_many_arguments)]
pub fn place_rack_item(
    conn: &SqliteConnection,
    id: &str,
    rack_id: &str,
    connection_id: Option<String>,
    kind: RackItemKind,
    label: &str,
    start_u: u32,
    height_u: u32,
    metadata: RackItemMetadata,
) -> Result<RackItem> {
    let connection_id = normalize_item_connection(kind, connection_id)?;
    let rack_height = fetch_rack_height(conn, rack_id)?;
    let existing = existing_spans(conn, rack_id)?;
    validate_placement(rack_height, &existing, None, Span { start_u, height_u })?;
    let metadata_json = metadata_to_json(&metadata)?;
    conn.execute(
        "INSERT INTO itops_site_rack_items
            (id, rack_id, connection_id, kind, label, start_u, height_u, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            id,
            rack_id,
            connection_id,
            kind.as_db_str(),
            label.trim(),
            start_u,
            height_u,
            metadata_json
        ],
    )?;
    Ok(RackItem {
        id: id.to_string(),
        rack_id: rack_id.to_string(),
        connection_id,
        kind,
        label: label.trim().to_string(),
        start_u,
        height_u,
        metadata,
    })
}

/// Update a Rack Device's non-position fields (label, kind, connection binding,
/// metadata). Position changes go through `move_rack_item`.
pub fn update_rack_item(
    conn: &SqliteConnection,
    id: &str,
    kind: RackItemKind,
    connection_id: Option<String>,
    label: &str,
    metadata: RackItemMetadata,
) -> Result<RackItem> {
    let connection_id = normalize_item_connection(kind, connection_id)?;
    let metadata_json = metadata_to_json(&metadata)?;
    let affected = conn.execute(
        "UPDATE itops_site_rack_items
         SET kind = ?, connection_id = ?, label = ?, metadata_json = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?",
        params![kind.as_db_str(), connection_id, label.trim(), metadata_json, id],
    )?;
    if affected == 0 {
        return Err(ItopsStorageError::NotFound);
    }
    fetch_item(conn, id)
}

/// Move and/or resize a Rack Device — possibly into a different Rack. Re-validates
/// the placement against the target rack (excluding this item).
pub fn move_rack_item(
    conn: &SqliteConnection,
    id: &str,
    rack_id: &str,
    start_u: u32,
    height_u: u32,
) -> Result<RackItem> {
    let rack_height = fetch_rack_height(conn, rack_id)?;
    let existing = existing_spans(conn, rack_id)?;
    validate_placement(rack_height, &existing, Some(id), Span { start_u, height_u })?;
    let affected = conn.execute(
        "UPDATE itops_site_rack_items
         SET rack_id = ?, start_u = ?, height_u = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?",
        params![rack_id, start_u, height_u, id],
    )?;
    if affected == 0 {
        return Err(ItopsStorageError::NotFound);
    }
    fetch_item(conn, id)
}

pub fn remove_rack_item(conn: &SqliteConnection, id: &str) -> Result<()> {
    let affected = conn.execute(
        "DELETE FROM itops_site_rack_items WHERE id = ?",
        params![id],
    )?;
    if affected == 0 {
        return Err(ItopsStorageError::NotFound);
    }
    Ok(())
}

fn fetch_item(conn: &SqliteConnection, id: &str) -> Result<RackItem> {
    conn.query_row(
        &format!("SELECT {SELECT_ITEM_COLUMNS} WHERE id = ?"),
        params![id],
        row_to_item,
    )
    .optional()?
    .ok_or(ItopsStorageError::NotFound)
}

pub fn get_rack_item(conn: &SqliteConnection, id: &str) -> Result<RackItem> {
    fetch_item(conn, id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn open_test_db() -> SqliteConnection {
        let conn = SqliteConnection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE itops_site_racks (
                id TEXT PRIMARY KEY,
                site_id TEXT NOT NULL,
                name TEXT NOT NULL,
                server_room TEXT NOT NULL DEFAULT '',
                rack_group TEXT NOT NULL DEFAULT '',
                shell TEXT,
                background_json TEXT,
                height_u INTEGER NOT NULL DEFAULT 42,
                depth_mm INTEGER NOT NULL DEFAULT 1000,
                power_capacity_w INTEGER,
                floor_x REAL,
                floor_y REAL,
                grid_x INTEGER,
                grid_y INTEGER,
                sort_order INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE itops_server_rooms (
                id TEXT PRIMARY KEY,
                site_id TEXT NOT NULL,
                name TEXT NOT NULL,
                sort_order INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(site_id, name)
            );
            INSERT INTO itops_server_rooms (id, site_id, name, sort_order)
            VALUES ('room-b', 'f1', 'Room B', 0), ('room-c', 'f1', 'Room C', 1);
            CREATE TABLE itops_site_rack_items (
                id TEXT PRIMARY KEY,
                rack_id TEXT NOT NULL,
                connection_id TEXT,
                kind TEXT NOT NULL,
                label TEXT NOT NULL DEFAULT '',
                start_u INTEGER NOT NULL,
                height_u INTEGER NOT NULL,
                metadata_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            "#,
        )
        .unwrap();
        conn
    }

    fn span(start_u: u32, height_u: u32) -> Span {
        Span { start_u, height_u }
    }

    #[test]
    fn overlap_detection_is_half_open() {
        // 1U at U10 and 1U at U11 are adjacent, not overlapping.
        assert!(!spans_overlap(span(10, 1), span(11, 1)));
        // A 2U device at U10 occupies U10-U11, colliding with a 1U at U11.
        assert!(spans_overlap(span(10, 2), span(11, 1)));
        assert!(spans_overlap(span(10, 2), span(10, 1)));
    }

    #[test]
    fn placement_rejects_out_of_bounds_and_overlap() {
        let existing = vec![("a".to_string(), span(10, 2))]; // U10-U11
        // Fits in the gap above.
        assert!(validate_placement(42, &existing, None, span(12, 1)).is_ok());
        // Overlaps the existing device.
        assert!(validate_placement(42, &existing, None, span(11, 1)).is_err());
        // Exceeds rack height.
        assert!(validate_placement(42, &existing, None, span(42, 2)).is_err());
        // Zero height / zero start are invalid.
        assert!(validate_placement(42, &[], None, span(1, 0)).is_err());
        assert!(validate_placement(42, &[], None, span(0, 1)).is_err());
        // A move can ignore its own current span.
        assert!(validate_placement(42, &existing, Some("a"), span(10, 2)).is_ok());
    }

    #[test]
    fn rack_create_list_update_delete_roundtrip() {
        let conn = open_test_db();
        let rack = create_rack(
            &conn,
            "r1",
            "f1",
            "  A12  ",
            " Room B ",
            " G1 ",
            Some("white"),
            42,
            1000,
            None,
        )
        .unwrap();
        assert_eq!(rack.name, "A12");
        assert_eq!(rack.server_room, "Room B");
        assert_eq!(rack.rack_group, "G1");
        assert_eq!(rack.shell.as_deref(), Some("white"));
        assert_eq!(rack.depth_mm, 1000);
        assert_eq!(rack.sort_order, 0);

        let listed = list_racks(&conn, "f1").unwrap();
        assert_eq!(listed.len(), 1);
        assert!(listed[0].items.is_empty());
        assert_eq!(listed[0].server_room, "Room B");
        assert_eq!(listed[0].rack_group, "G1");

        let updated = update_rack(&conn, "r1", "A13", "Room C", "G2", None, 24, 1200, Some(8000)).unwrap();
        assert_eq!(updated.rack_group, "G2");
        assert_eq!(updated.name, "A13");
        assert_eq!(updated.height_u, 24);
        assert_eq!(updated.depth_mm, 1200);
        assert_eq!(updated.power_capacity_w, Some(8000));
        assert_eq!(updated.sort_order, 0); // preserved

        delete_rack(&conn, "r1").unwrap();
        assert!(list_racks(&conn, "f1").unwrap().is_empty());
        assert!(matches!(
            delete_rack(&conn, "r1"),
            Err(ItopsStorageError::NotFound)
        ));
    }

    #[test]
    fn rack_power_capacity_normalizes_and_validates() {
        let conn = open_test_db();
        // 0 means "unset" and stores as NULL.
        let rack =
            create_rack(&conn, "r1", "f1", "A12", "Room B", "", None, 42, 1000, Some(0)).unwrap();
        assert_eq!(rack.power_capacity_w, None);
        let updated =
            update_rack(&conn, "r1", "A12", "Room B", "", None, 42, 1000, Some(12_000)).unwrap();
        assert_eq!(updated.power_capacity_w, Some(12_000));
        assert_eq!(
            list_racks(&conn, "f1").unwrap()[0].power_capacity_w,
            Some(12_000)
        );
        // Beyond the sanity ceiling is rejected.
        assert!(matches!(
            update_rack(&conn, "r1", "A12", "Room B", "", None, 42, 1000, Some(1_000_001)),
            Err(ItopsStorageError::Validation(_))
        ));
    }

    #[test]
    fn rack_placements_persist_per_layout_and_skip_missing_ids() {
        let conn = open_test_db();
        create_rack(&conn, "a", "f1", "A", "Room B", "", None, 42, 1000, None).unwrap();
        create_rack(&conn, "b", "f1", "B", "Room B", "", None, 42, 1000, None).unwrap();

        // Grid cells round to whole non-negative cells; floor keeps px floats.
        set_rack_placements(
            &conn,
            RackPlacementKind::Grid,
            &[
                RackPlacementEntry { id: "a".into(), x: 2.4, y: -1.0 },
                RackPlacementEntry { id: "gone".into(), x: 1.0, y: 1.0 },
            ],
        )
        .unwrap();
        set_rack_placements(
            &conn,
            RackPlacementKind::Floor,
            &[RackPlacementEntry { id: "b".into(), x: 118.5, y: 42.0 }],
        )
        .unwrap();

        let racks = list_racks(&conn, "f1").unwrap();
        let a = racks.iter().find(|rack| rack.id == "a").unwrap();
        let b = racks.iter().find(|rack| rack.id == "b").unwrap();
        assert_eq!((a.grid_x, a.grid_y), (Some(2), Some(0)));
        assert_eq!((a.floor_x, a.floor_y), (None, None));
        assert_eq!((b.floor_x, b.floor_y), (Some(118.5), Some(42.0)));
        assert_eq!((b.grid_x, b.grid_y), (None, None));

        // Non-finite coordinates are rejected outright.
        assert!(matches!(
            set_rack_placements(
                &conn,
                RackPlacementKind::Floor,
                &[RackPlacementEntry { id: "a".into(), x: f64::NAN, y: 0.0 }],
            ),
            Err(ItopsStorageError::Validation(_))
        ));
    }

    #[test]
    fn rack_depth_rejects_out_of_range_values() {
        let conn = open_test_db();
        assert!(matches!(
            create_rack(&conn, "r1", "f1", "A12", "Room B", "", None, 42, 0, None),
            Err(ItopsStorageError::Validation(_))
        ));
        assert!(matches!(
            create_rack(&conn, "r2", "f1", "A13", "Room B", "", None, 42, 5001, None),
            Err(ItopsStorageError::Validation(_))
        ));
    }

    #[test]
    fn place_move_and_remove_items() {
        let conn = open_test_db();
        create_rack(&conn, "r1", "f1", "A12", "Room B", "", None, 42, 1000, None).unwrap();

        let item = place_rack_item(
            &conn,
            "i1",
            "r1",
            Some("c1".into()),
            RackItemKind::Connection,
            "web-01",
            40,
            2,
            RackItemMetadata::default(),
        )
        .unwrap();
        assert_eq!(item.start_u, 40);

        // Overlapping placement is rejected.
        assert!(matches!(
            place_rack_item(
                &conn,
                "i2",
                "r1",
                None,
                RackItemKind::Switch,
                "sw",
                41,
                1,
                RackItemMetadata::default(),
            ),
            Err(ItopsStorageError::Validation(_))
        ));

        // A passive item below it fits.
        place_rack_item(
            &conn,
            "i2",
            "r1",
            None,
            RackItemKind::Pdu,
            "pdu",
            1,
            1,
            RackItemMetadata::default(),
        )
        .unwrap();

        // A connection item without a connection id is rejected.
        assert!(matches!(
            place_rack_item(
                &conn,
                "i3",
                "r1",
                None,
                RackItemKind::Connection,
                "bad",
                20,
                1,
                RackItemMetadata::default(),
            ),
            Err(ItopsStorageError::Validation(_))
        ));

        let passive = place_rack_item(
            &conn,
            "i4",
            "r1",
            Some("stale-connection".into()),
            RackItemKind::Switch,
            "sw2",
            20,
            1,
            RackItemMetadata::default(),
        )
        .unwrap();
        assert_eq!(passive.connection_id, None);

        // Move the web host down; it must clear the PDU at U1.
        let moved = move_rack_item(&conn, "i1", "r1", 10, 2).unwrap();
        assert_eq!(moved.start_u, 10);

        let racks = list_racks(&conn, "f1").unwrap();
        assert_eq!(racks[0].items.len(), 3);

        remove_rack_item(&conn, "i1").unwrap();
        assert_eq!(list_racks(&conn, "f1").unwrap()[0].items.len(), 2);
    }

    #[test]
    fn updating_to_passive_item_clears_connection_id() {
        let conn = open_test_db();
        create_rack(&conn, "r1", "f1", "A12", "Room B", "", None, 42, 1000, None).unwrap();
        place_rack_item(
            &conn,
            "i1",
            "r1",
            Some("c1".into()),
            RackItemKind::Connection,
            "web-01",
            10,
            1,
            RackItemMetadata::default(),
        )
        .unwrap();

        let updated = update_rack_item(
            &conn,
            "i1",
            RackItemKind::Switch,
            Some("c1".into()),
            "top switch",
            RackItemMetadata::default(),
        )
        .unwrap();

        assert_eq!(updated.kind, RackItemKind::Switch);
        assert_eq!(updated.connection_id, None);
        assert_eq!(
            list_racks(&conn, "f1").unwrap()[0].items[0].connection_id,
            None
        );
    }

    #[test]
    fn shrinking_rack_below_an_item_is_rejected() {
        let conn = open_test_db();
        create_rack(&conn, "r1", "f1", "A12", "Room B", "", None, 42, 1000, None).unwrap();
        place_rack_item(
            &conn,
            "i1",
            "r1",
            None,
            RackItemKind::Server,
            "srv",
            40,
            2,
            RackItemMetadata::default(),
        )
        .unwrap();
        // Item occupies U40-U41; shrinking to 24U must fail.
        assert!(matches!(
            update_rack(&conn, "r1", "A12", "Room B", "", None, 24, 1000, None),
            Err(ItopsStorageError::Validation(_))
        ));
    }

    #[test]
    fn reorder_scopes_to_site() {
        let conn = open_test_db();
        create_rack(&conn, "a", "f1", "A", "Room B", "", None, 42, 1000, None).unwrap();
        create_rack(&conn, "b", "f1", "B", "Room B", "", None, 42, 1000, None).unwrap();
        reorder_racks(&conn, "f1", &["b".to_string(), "a".to_string()]).unwrap();
        let order: Vec<String> = list_racks(&conn, "f1")
            .unwrap()
            .into_iter()
            .map(|rack| rack.id)
            .collect();
        assert_eq!(order, vec!["b", "a"]);
    }

    #[test]
    fn server_room_persists_without_a_rack() {
        let conn = open_test_db();
        let created = create_server_room(&conn, "room-empty", "f1", " Empty Room ").unwrap();
        assert_eq!(created.name, "Empty Room");
        assert!(
            list_server_rooms(&conn, "f1")
                .unwrap()
                .iter()
                .any(|room| room.id == "room-empty")
        );
        assert!(list_racks(&conn, "f1").unwrap().is_empty());
    }

    #[test]
    fn rack_requires_a_server_room_owned_by_its_site() {
        let conn = open_test_db();
        assert!(matches!(
            create_rack(&conn, "r-empty", "f1", "A", "", "", None, 42, 1000, None),
            Err(ItopsStorageError::Validation(_))
        ));
        assert!(matches!(
            create_rack(&conn, "r-missing", "f1", "A", "Unknown", "", None, 42, 1000, None),
            Err(ItopsStorageError::Validation(_))
        ));
        assert!(create_rack(&conn, "r-valid", "f1", "A", "Room B", "", None, 42, 1000, None).is_ok());
    }
}
