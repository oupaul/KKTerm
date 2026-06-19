// IT Ops Tauri commands (docs/ITOPS.md). Phase 1: Host Group CRUD + the
// run-time resolver. Errors surface as plain strings the frontend store shows in
// the Status Bar; the storage layer carries the typed variants.

use tauri::{AppHandle, Manager, State};

use super::ids::new_itops_id;
use super::storage as ito;
use super::types::{HostGroup, HostGroupFilter, ResolvedHost, Transport};

fn storage(app: &AppHandle) -> State<'_, crate::storage::Storage> {
    app.state::<crate::storage::Storage>()
}

#[tauri::command]
pub fn itops_list_host_groups(app: AppHandle) -> Result<Vec<HostGroup>, String> {
    storage(&app)
        .with_connection_infallible(|conn| ito::list_host_groups(conn).map_err(|error| error.to_string()))
}

#[tauri::command]
pub fn itops_create_host_group(
    app: AppHandle,
    name: String,
    member_ids: Vec<String>,
    filter: Option<HostGroupFilter>,
    transport: Transport,
) -> Result<HostGroup, String> {
    let id = new_itops_id("hg");
    storage(&app).with_connection_infallible(|conn| {
        ito::create_host_group(conn, &id, &name, member_ids, filter, transport)
            .map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_update_host_group(
    app: AppHandle,
    id: String,
    name: String,
    member_ids: Vec<String>,
    filter: Option<HostGroupFilter>,
    transport: Transport,
) -> Result<HostGroup, String> {
    storage(&app).with_connection_infallible(|conn| {
        ito::update_host_group(conn, &id, &name, member_ids, filter, transport)
            .map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_remove_host_group(app: AppHandle, id: String) -> Result<(), String> {
    storage(&app).with_connection_infallible(|conn| {
        ito::remove_host_group(conn, &id).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_reorder_host_groups(app: AppHandle, ordered_ids: Vec<String>) -> Result<(), String> {
    storage(&app).with_connection_infallible(|conn| {
        ito::reorder_host_groups(conn, &ordered_ids).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_resolve_host_group(app: AppHandle, id: String) -> Result<Vec<ResolvedHost>, String> {
    storage(&app).with_connection_infallible(|conn| {
        let group = ito::list_host_groups(conn)
            .map_err(|error| error.to_string())?
            .into_iter()
            .find(|group| group.id == id)
            .ok_or_else(|| "host group not found".to_string())?;
        ito::resolve_host_group(conn, &group).map_err(|error| error.to_string())
    })
}
