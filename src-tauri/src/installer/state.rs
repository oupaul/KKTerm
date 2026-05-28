// SQLite CRUD for installer_tool_state. Installed-version is intentionally
// NOT stored here — detection always re-derives from the OS. The table is
// only the user-pref + latest-version cache. See ADR 0007 §"Persistence".

use rusqlite::params;
use serde::Serialize;

use crate::storage::Storage;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolState {
    pub tool_id: String,
    pub pinned: bool,
    pub latest_version_seen: Option<String>,
    pub last_check_at: Option<i64>,
}

pub fn list_all(storage: &Storage) -> Result<Vec<ToolState>, String> {
    storage.with_connection(|conn| {
        let mut stmt = conn
            .prepare(
                "SELECT tool_id, pinned, latest_version_seen, last_check_at
                 FROM installer_tool_state",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(ToolState {
                    tool_id: row.get(0)?,
                    pinned: row.get::<_, i64>(1)? != 0,
                    latest_version_seen: row.get(2)?,
                    last_check_at: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row.map_err(|e| e.to_string())?);
        }
        Ok(out)
    })
}

pub fn set_pinned(storage: &Storage, tool_id: &str, pinned: bool) -> Result<(), String> {
    storage.with_connection(|conn| {
        conn.execute(
            "INSERT INTO installer_tool_state (tool_id, pinned)
             VALUES (?1, ?2)
             ON CONFLICT(tool_id) DO UPDATE SET pinned = excluded.pinned",
            params![tool_id, if pinned { 1 } else { 0 }],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
}

pub fn record_latest_version(
    storage: &Storage,
    tool_id: &str,
    version: Option<&str>,
    checked_at: i64,
) -> Result<(), String> {
    storage.with_connection(|conn| {
        conn.execute(
            "INSERT INTO installer_tool_state (tool_id, latest_version_seen, last_check_at)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(tool_id) DO UPDATE SET
                latest_version_seen = excluded.latest_version_seen,
                last_check_at = excluded.last_check_at",
            params![tool_id, version, checked_at],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
}

pub fn delete(storage: &Storage, tool_id: &str) -> Result<(), String> {
    storage.with_connection(|conn| {
        conn.execute(
            "DELETE FROM installer_tool_state WHERE tool_id = ?1",
            params![tool_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
}
