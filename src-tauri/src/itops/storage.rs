// IT Ops durable storage (docs/ITOPS.md). Phase 1: the `itops_fleets`
// repository plus the run-time resolver that turns a Fleet into a concrete
// ordered list of fleet targets. Mirrors the dashboard_storage.rs conventions
// (free functions over `&SqliteConnection`, JSON `TEXT` columns, `sort_order`).

use std::collections::{HashMap, HashSet};

use rusqlite::{Connection as SqliteConnection, OptionalExtension, params, params_from_iter};

use crate::dashboard_storage::DashboardBackground;
use super::types::{Fleet, FleetFilter, RackItemKind, ResolvedHost, RunScope, Transport};

#[derive(Debug)]
pub enum ItopsStorageError {
    Validation(String),
    NotFound,
    Sqlite(rusqlite::Error),
}

impl std::fmt::Display for ItopsStorageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Validation(reason) => write!(f, "{reason}"),
            Self::NotFound => write!(f, "fleet not found"),
            Self::Sqlite(error) => write!(f, "{error}"),
        }
    }
}

impl From<rusqlite::Error> for ItopsStorageError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Sqlite(value)
    }
}

type Result<T> = std::result::Result<T, ItopsStorageError>;

fn validate_name(name: &str) -> Result<String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(ItopsStorageError::Validation(
            "fleet name must not be empty".to_string(),
        ));
    }
    Ok(trimmed.to_string())
}

fn member_ids_to_json(member_ids: &[String]) -> Result<String> {
    serde_json::to_string(member_ids).map_err(|error| ItopsStorageError::Validation(error.to_string()))
}

fn parse_member_ids(raw: &str) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(raw).unwrap_or_default()
}

/// Serialize a filter to JSON, collapsing an empty filter to NULL so a Host
/// Group never claims dynamic membership it does not have.
fn filter_to_json(filter: &Option<FleetFilter>) -> Result<Option<String>> {
    match filter {
        Some(filter) if !filter.is_empty() => Ok(Some(
            serde_json::to_string(filter)
                .map_err(|error| ItopsStorageError::Validation(error.to_string()))?,
        )),
        _ => Ok(None),
    }
}

fn parse_filter(raw: Option<String>) -> Option<FleetFilter> {
    let raw = raw?;
    serde_json::from_str::<FleetFilter>(&raw)
        .ok()
        .filter(|filter| !filter.is_empty())
}

/// Parse a stored `DashboardBackground` JSON blob; unparseable/absent → None
/// (theme default), defensively, like the dashboard's own reader.
fn parse_background(raw: Option<String>) -> Option<DashboardBackground> {
    raw.and_then(|json| serde_json::from_str::<DashboardBackground>(&json).ok())
}

fn background_to_json(background: &Option<DashboardBackground>) -> Result<Option<String>> {
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

fn parse_room_backgrounds(raw: Option<String>) -> HashMap<String, DashboardBackground> {
    raw.and_then(|json| serde_json::from_str(&json).ok())
        .unwrap_or_default()
}

fn room_backgrounds_to_json(map: &HashMap<String, DashboardBackground>) -> Result<String> {
    serde_json::to_string(map).map_err(|error| ItopsStorageError::Validation(error.to_string()))
}

fn row_to_group(row: &rusqlite::Row<'_>) -> rusqlite::Result<Fleet> {
    let member_ids: String = row.get(3)?;
    let filter_json: Option<String> = row.get(4)?;
    let transport: String = row.get(5)?;
    Ok(Fleet {
        id: row.get(0)?,
        name: row.get(1)?,
        sort_order: row.get(2)?,
        member_ids: parse_member_ids(&member_ids),
        filter: parse_filter(filter_json),
        transport: Transport::from_db_str(&transport).unwrap_or(Transport::Auto),
        background: parse_background(row.get(6)?),
        room_backgrounds: parse_room_backgrounds(row.get(7)?),
    })
}

const SELECT_GROUP_COLUMNS: &str = "id, name, sort_order, member_ids_json, filter_json, transport, \
     background_json, room_backgrounds_json FROM itops_fleets";

/// Re-read one Fleet by id (used after a mutation to return preserved fields
/// such as backgrounds that the mutation does not touch).
fn load_fleet(conn: &SqliteConnection, id: &str) -> Result<Fleet> {
    conn.query_row(
        &format!("SELECT {SELECT_GROUP_COLUMNS} WHERE id = ?"),
        params![id],
        row_to_group,
    )
    .optional()?
    .ok_or(ItopsStorageError::NotFound)
}

pub fn list_fleets(conn: &SqliteConnection) -> Result<Vec<Fleet>> {
    let mut stmt = conn.prepare(&format!("SELECT {SELECT_GROUP_COLUMNS} ORDER BY sort_order"))?;
    let groups = stmt
        .query_map([], row_to_group)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(groups)
}

pub fn create_fleet(
    conn: &SqliteConnection,
    id: &str,
    name: &str,
    member_ids: Vec<String>,
    filter: Option<FleetFilter>,
    transport: Transport,
) -> Result<Fleet> {
    let name = validate_name(name)?;
    let next_sort: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM itops_fleets",
        [],
        |row| row.get(0),
    )?;
    let member_json = member_ids_to_json(&member_ids)?;
    let filter_json = filter_to_json(&filter)?;
    conn.execute(
        "INSERT INTO itops_fleets (id, name, sort_order, member_ids_json, filter_json, transport)
         VALUES (?, ?, ?, ?, ?, ?)",
        params![id, name, next_sort, member_json, filter_json, transport.as_db_str()],
    )?;
    Ok(Fleet {
        id: id.to_string(),
        name,
        sort_order: next_sort,
        member_ids,
        filter: filter.filter(|filter| !filter.is_empty()),
        transport,
        background: None,
        room_backgrounds: HashMap::new(),
    })
}

pub fn update_fleet(
    conn: &SqliteConnection,
    id: &str,
    name: &str,
    member_ids: Vec<String>,
    filter: Option<FleetFilter>,
    transport: Transport,
) -> Result<Fleet> {
    let name = validate_name(name)?;
    // Existence check (returns NotFound before the UPDATE).
    let _sort_order: i64 = conn
        .query_row(
            "SELECT sort_order FROM itops_fleets WHERE id = ?",
            params![id],
            |row| row.get(0),
        )
        .optional()?
        .ok_or(ItopsStorageError::NotFound)?;
    let member_json = member_ids_to_json(&member_ids)?;
    let filter_json = filter_to_json(&filter)?;
    conn.execute(
        "UPDATE itops_fleets
         SET name = ?, member_ids_json = ?, filter_json = ?, transport = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?",
        params![name, member_json, filter_json, transport.as_db_str(), id],
    )?;
    // Re-read so preserved fields (backgrounds) round-trip into the response.
    load_fleet(conn, id)
}

/// Set (or clear with `None`) the Fleet-view background. Returns the saved Fleet.
pub fn set_fleet_background(
    conn: &SqliteConnection,
    id: &str,
    background: Option<DashboardBackground>,
) -> Result<Fleet> {
    let json = background_to_json(&background)?;
    let affected = conn.execute(
        "UPDATE itops_fleets SET background_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![json, id],
    )?;
    if affected == 0 {
        return Err(ItopsStorageError::NotFound);
    }
    load_fleet(conn, id)
}

/// Set (or clear) one server room's background in the Fleet's room map.
pub fn set_server_room_background(
    conn: &SqliteConnection,
    fleet_id: &str,
    server_room: &str,
    background: Option<DashboardBackground>,
) -> Result<Fleet> {
    let mut fleet = load_fleet(conn, fleet_id)?;
    match background {
        Some(bg) => {
            bg.validate()
                .map_err(|error| ItopsStorageError::Validation(format!("{error:?}")))?;
            fleet.room_backgrounds.insert(server_room.to_string(), bg);
        }
        None => {
            fleet.room_backgrounds.remove(server_room);
        }
    }
    let json = room_backgrounds_to_json(&fleet.room_backgrounds)?;
    conn.execute(
        "UPDATE itops_fleets SET room_backgrounds_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![json, fleet_id],
    )?;
    load_fleet(conn, fleet_id)
}

pub fn remove_fleet(conn: &SqliteConnection, id: &str) -> Result<()> {
    let affected = conn.execute("DELETE FROM itops_fleets WHERE id = ?", params![id])?;
    if affected == 0 {
        return Err(ItopsStorageError::NotFound);
    }
    Ok(())
}

pub fn reorder_fleets(conn: &SqliteConnection, ordered_ids: &[String]) -> Result<()> {
    for (index, id) in ordered_ids.iter().enumerate() {
        conn.execute(
            "UPDATE itops_fleets SET sort_order = ? WHERE id = ?",
            params![index as i64, id],
        )?;
    }
    Ok(())
}

fn fetch_resolved_host(
    conn: &SqliteConnection,
    connection_id: &str,
    transport: Transport,
) -> Result<Option<ResolvedHost>> {
    conn.query_row(
        "SELECT id, name, host, username, port, connection_type FROM connections WHERE id = ?",
        params![connection_id],
        |row| {
            Ok(ResolvedHost {
                connection_id: row.get(0)?,
                name: row.get(1)?,
                host: row.get(2)?,
                username: row.get(3)?,
                port: row.get(4)?,
                connection_type: row.get(5)?,
                transport,
            })
        },
    )
    .optional()
    .map_err(Into::into)
}

fn fetch_filtered_hosts(
    conn: &SqliteConnection,
    filter: &FleetFilter,
    transport: Transport,
) -> Result<Vec<ResolvedHost>> {
    let mut sql =
        String::from("SELECT id, name, host, username, port, connection_type FROM connections WHERE 1 = 1");
    let mut bind: Vec<String> = Vec::new();
    if !filter.types.is_empty() {
        let placeholders = vec!["?"; filter.types.len()].join(", ");
        sql.push_str(&format!(" AND connection_type IN ({placeholders})"));
        bind.extend(filter.types.iter().cloned());
    }
    if let Some(folder_id) = &filter.folder_id {
        sql.push_str(" AND folder_id = ?");
        bind.push(folder_id.clone());
    }
    sql.push_str(" ORDER BY sort_order");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt
        .query_map(params_from_iter(bind.iter()), |row| {
            Ok(ResolvedHost {
                connection_id: row.get(0)?,
                name: row.get(1)?,
                host: row.get(2)?,
                username: row.get(3)?,
                port: row.get(4)?,
                connection_type: row.get(5)?,
                transport,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

/// Resolve a Fleet into a concrete ordered list of fleet targets at call
/// time: explicit members first (in stored order, skipping any since-deleted
/// Connections), then dynamic-filter matches not already included. Deduplicated
/// by Connection id so a member that also matches the filter appears once.
pub fn resolve_fleet(conn: &SqliteConnection, group: &Fleet) -> Result<Vec<ResolvedHost>> {
    let mut seen: HashSet<String> = HashSet::new();
    let mut resolved: Vec<ResolvedHost> = Vec::new();

    for member_id in &group.member_ids {
        if let Some(host) = fetch_resolved_host(conn, member_id, group.transport)? {
            if seen.insert(host.connection_id.clone()) {
                resolved.push(host);
            }
        }
    }

    if let Some(filter) = &group.filter {
        if !filter.is_empty() {
            for host in fetch_filtered_hosts(conn, filter, group.transport)? {
                if seen.insert(host.connection_id.clone()) {
                    resolved.push(host);
                }
            }
        }
    }

    Ok(resolved)
}

/// Resolve only the placed Connection items in the racks matching `scope`
/// (docs/FLEET.md Phase D) — the seam for rack/area/region-scoped Batch Runs.
/// Uses the Fleet's transport default. Returns hosts in rack order, then U
/// order (top of rack first), deduplicated by Connection id.
pub fn resolve_fleet_scoped(
    conn: &SqliteConnection,
    fleet: &Fleet,
    scope: &RunScope,
) -> Result<Vec<ResolvedHost>> {
    let racks = super::fleet_storage::list_racks(conn, &fleet.id)?;
    let mut seen: HashSet<String> = HashSet::new();
    let mut resolved: Vec<ResolvedHost> = Vec::new();
    for rack in racks {
        if !rack_matches_scope(&rack, scope) {
            continue;
        }
        // Top of rack first: items come back ascending by start_u, so reverse.
        let mut items = rack.items;
        items.sort_by(|a, b| b.start_u.cmp(&a.start_u));
        for item in items {
            if item.kind != RackItemKind::Connection {
                continue;
            }
            let Some(connection_id) = item.connection_id else {
                continue;
            };
            if !seen.insert(connection_id.clone()) {
                continue;
            }
            if let Some(host) = fetch_resolved_host(conn, &connection_id, fleet.transport)? {
                resolved.push(host);
            }
        }
    }
    Ok(resolved)
}

/// A rack matches a scope when every provided (non-empty) scope field matches.
fn rack_matches_scope(rack: &super::types::Rack, scope: &RunScope) -> bool {
    let matches = |field: &Option<String>, value: &str| match field.as_deref() {
        Some(wanted) if !wanted.is_empty() => wanted == value,
        _ => true,
    };
    matches(&scope.rack_id, &rack.id) && matches(&scope.server_room, &rack.server_room)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::itops::types::Rack;

    fn test_rack(server_room: &str) -> Rack {
        Rack {
            id: "r1".into(),
            fleet_id: "f1".into(),
            name: "A12".into(),
            server_room: server_room.into(),
            rack_group: String::new(),
            shell: None,
            background: None,
            height_u: 42,
            sort_order: 0,
            items: Vec::new(),
        }
    }

    #[test]
    fn scope_matching_treats_empty_fields_as_wildcards() {
        let rack = test_rack("Room B");
        // Empty scope matches anything.
        assert!(rack_matches_scope(&rack, &RunScope::default()));
        // Exact rack id matches.
        assert!(rack_matches_scope(
            &rack,
            &RunScope { rack_id: Some("r1".into()), ..Default::default() }
        ));
        // Wrong rack id does not.
        assert!(!rack_matches_scope(
            &rack,
            &RunScope { rack_id: Some("other".into()), ..Default::default() }
        ));
        // Server room matches; a mismatched server room does not.
        assert!(rack_matches_scope(
            &rack,
            &RunScope { server_room: Some("Room B".into()), ..Default::default() }
        ));
        assert!(!rack_matches_scope(
            &rack,
            &RunScope { server_room: Some("Room C".into()), ..Default::default() }
        ));
    }

    fn open_test_db() -> SqliteConnection {
        let conn = SqliteConnection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE itops_fleets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                sort_order INTEGER NOT NULL,
                member_ids_json TEXT NOT NULL DEFAULT '[]',
                filter_json TEXT,
                transport TEXT NOT NULL DEFAULT 'auto'
                    CHECK (transport IN ('ssh', 'winrm', 'psexec', 'auto')),
                background_json TEXT,
                room_backgrounds_json TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE connections (
                id TEXT PRIMARY KEY,
                folder_id TEXT,
                name TEXT NOT NULL,
                host TEXT NOT NULL,
                username TEXT NOT NULL,
                port INTEGER,
                connection_type TEXT NOT NULL,
                sort_order INTEGER NOT NULL
            );
            "#,
        )
        .unwrap();
        conn
    }

    fn insert_connection(
        conn: &SqliteConnection,
        id: &str,
        kind: &str,
        folder_id: Option<&str>,
        sort_order: i64,
    ) {
        conn.execute(
            "INSERT INTO connections (id, folder_id, name, host, username, port, connection_type, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![id, folder_id, id, format!("{id}.example"), "deploy", 22, kind, sort_order],
        )
        .unwrap();
    }

    #[test]
    fn create_list_update_remove_roundtrip() {
        let conn = open_test_db();
        let created = create_fleet(
            &conn,
            "hg-1",
            "  Production Web  ",
            vec!["c1".into(), "c2".into()],
            None,
            Transport::Ssh,
        )
        .unwrap();
        assert_eq!(created.name, "Production Web"); // trimmed
        assert_eq!(created.sort_order, 0);
        assert_eq!(created.transport, Transport::Ssh);
        assert!(created.filter.is_none());

        let listed = list_fleets(&conn).unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].member_ids, vec!["c1", "c2"]);

        let updated = update_fleet(
            &conn,
            "hg-1",
            "Web",
            vec!["c2".into()],
            Some(FleetFilter {
                types: vec!["ssh".into()],
                folder_id: Some("f1".into()),
            }),
            Transport::Auto,
        )
        .unwrap();
        assert_eq!(updated.name, "Web");
        assert_eq!(updated.sort_order, 0); // preserved
        assert!(updated.filter.is_some());

        remove_fleet(&conn, "hg-1").unwrap();
        assert!(list_fleets(&conn).unwrap().is_empty());
        assert!(matches!(
            remove_fleet(&conn, "hg-1"),
            Err(ItopsStorageError::NotFound)
        ));
    }

    #[test]
    fn empty_name_is_rejected() {
        let conn = open_test_db();
        assert!(matches!(
            create_fleet(&conn, "hg-x", "   ", vec![], None, Transport::Auto),
            Err(ItopsStorageError::Validation(_))
        ));
    }

    #[test]
    fn empty_filter_is_stored_as_none() {
        let conn = open_test_db();
        let group = create_fleet(
            &conn,
            "hg-2",
            "Group",
            vec![],
            Some(FleetFilter::default()),
            Transport::Auto,
        )
        .unwrap();
        assert!(group.filter.is_none());
        assert!(list_fleets(&conn).unwrap()[0].filter.is_none());
    }

    #[test]
    fn resolve_orders_members_then_filter_and_dedupes() {
        let conn = open_test_db();
        insert_connection(&conn, "c1", "ssh", Some("prod"), 0);
        insert_connection(&conn, "c2", "ssh", Some("prod"), 1);
        insert_connection(&conn, "c3", "rdp", Some("prod"), 2);
        insert_connection(&conn, "gone", "ssh", None, 3);

        let group = create_fleet(
            &conn,
            "hg-3",
            "Mixed",
            // explicit members: c2 first, then a deleted-style id, then c1 also in filter
            vec!["c2".into(), "missing".into()],
            Some(FleetFilter {
                types: vec!["ssh".into()],
                folder_id: Some("prod".into()),
            }),
            Transport::Ssh,
        )
        .unwrap();

        let resolved = resolve_fleet(&conn, &group).unwrap();
        let ids: Vec<&str> = resolved.iter().map(|h| h.connection_id.as_str()).collect();
        // c2 explicit first; "missing" skipped; then filter adds c1 (ssh+prod);
        // c3 excluded (rdp); "gone" excluded (folder None); c2 not duplicated.
        assert_eq!(ids, vec!["c2", "c1"]);
        assert!(resolved.iter().all(|h| h.transport == Transport::Ssh));
    }

    #[test]
    fn reorder_rewrites_sort_order() {
        let conn = open_test_db();
        create_fleet(&conn, "a", "A", vec![], None, Transport::Auto).unwrap();
        create_fleet(&conn, "b", "B", vec![], None, Transport::Auto).unwrap();
        reorder_fleets(&conn, &["b".to_string(), "a".to_string()]).unwrap();
        let order: Vec<String> = list_fleets(&conn)
            .unwrap()
            .into_iter()
            .map(|g| g.id)
            .collect();
        assert_eq!(order, vec!["b", "a"]);
    }
}
