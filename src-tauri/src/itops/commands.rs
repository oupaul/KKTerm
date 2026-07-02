// IT Ops Tauri commands (docs/ITOPS.md). Phase 1: Site CRUD + the
// run-time resolver. Errors surface as plain strings the frontend store shows in
// the Status Bar; the storage layer carries the typed variants.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter, Manager, State};

use crate::dashboard_storage::DashboardBackground;
use crate::secrets;
use crate::ssh;

use super::ids::new_itops_id;
use super::run_storage;
use super::runner::{self, DEFAULT_CONCURRENCY, DEFAULT_TIMEOUT_SECONDS, SshTransport};
use super::site_storage as topo;
use super::storage as ito;
use super::types::{
    BatchTask, Rack, RackItem, RackItemKind, RackItemMetadata, RackNetworkPort,
    RackPlacementEntry, ResolvedHost, RoomIcon, RunEvent, RunEventHost, RunHistoryEntry, RunScope,
    ServerRoom, Site, SiteFilter, Transport,
};

fn storage(app: &AppHandle) -> State<'_, crate::storage::Storage> {
    app.state::<crate::storage::Storage>()
}

#[tauri::command]
pub fn itops_list_sites(app: AppHandle) -> Result<Vec<Site>, String> {
    storage(&app)
        .with_connection_infallible(|conn| ito::list_sites(conn).map_err(|error| error.to_string()))
}

#[tauri::command]
pub fn itops_create_site(
    app: AppHandle,
    name: String,
    member_ids: Vec<String>,
    filter: Option<SiteFilter>,
    transport: Transport,
    icon_color: Option<String>,
    icon_data_url: Option<String>,
    icon_background_color: Option<String>,
) -> Result<Site, String> {
    let id = new_itops_id("hg");
    storage(&app).with_connection_infallible(|conn| {
        ito::create_site(
            conn,
            &id,
            &name,
            member_ids,
            filter,
            transport,
            icon_color.as_deref(),
            icon_data_url.as_deref(),
            icon_background_color.as_deref(),
        )
        .map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_update_site(
    app: AppHandle,
    id: String,
    name: String,
    member_ids: Vec<String>,
    filter: Option<SiteFilter>,
    transport: Transport,
    icon_color: Option<String>,
    icon_data_url: Option<String>,
    icon_background_color: Option<String>,
) -> Result<Site, String> {
    storage(&app).with_connection_infallible(|conn| {
        ito::update_site(
            conn,
            &id,
            &name,
            member_ids,
            filter,
            transport,
            icon_color.as_deref(),
            icon_data_url.as_deref(),
            icon_background_color.as_deref(),
        )
        .map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_remove_site(app: AppHandle, id: String) -> Result<(), String> {
    storage(&app).with_connection_infallible(|conn| {
        ito::remove_site(conn, &id).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_reorder_sites(app: AppHandle, ordered_ids: Vec<String>) -> Result<(), String> {
    storage(&app).with_connection_infallible(|conn| {
        ito::reorder_sites(conn, &ordered_ids).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_resolve_site(app: AppHandle, id: String) -> Result<Vec<ResolvedHost>, String> {
    storage(&app).with_connection_infallible(|conn| {
        let group = ito::list_sites(conn)
            .map_err(|error| error.to_string())?
            .into_iter()
            .find(|group| group.id == id)
            .ok_or_else(|| "site not found".to_string())?;
        ito::resolve_site(conn, &group).map_err(|error| error.to_string())
    })
}

/// In-memory registry of live Batch Runs (docs/ITOPS.md: live state never
/// persists). Maps a run id to its cancel flag so `itops_cancel_batch_run` can
/// stop a run that is still picking up hosts.
#[derive(Default)]
pub struct ItopsRunRegistry {
    runs: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl ItopsRunRegistry {
    fn register(&self, run_id: &str) -> Arc<AtomicBool> {
        let cancel = Arc::new(AtomicBool::new(false));
        self.runs
            .lock()
            .unwrap()
            .insert(run_id.to_string(), Arc::clone(&cancel));
        cancel
    }

    fn cancel(&self, run_id: &str) -> bool {
        match self.runs.lock().unwrap().get(run_id) {
            Some(flag) => {
                flag.store(true, Ordering::Relaxed);
                true
            }
            None => false,
        }
    }

    fn remove(&self, run_id: &str) {
        self.runs.lock().unwrap().remove(run_id);
    }
}

fn now_millis() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
        .to_string()
}

/// Start a Batch Run of `task` against a Site. Resolves the group and each
/// SSH host's auth up front (DB + keychain), then fans out on a background
/// thread, streaming `itops://run` events and writing the consolidated report to
/// itops_run_history on completion. Returns the run id immediately.
#[tauri::command]
pub fn itops_start_batch_run(
    app: AppHandle,
    site_id: String,
    task: BatchTask,
    scope: Option<RunScope>,
) -> Result<String, String> {
    start_run(&app, site_id, task, scope)
}

/// Start a Batch Run; reusable by the command above and the Automation
/// `runBatch` action. Returns the run id immediately; progress streams on
/// `itops://run` and the report lands in itops_run_history on completion.
/// A non-empty `scope` narrows the run to the placed hosts in matching racks.
pub fn start_run(
    app: &AppHandle,
    site_id: String,
    task: BatchTask,
    scope: Option<RunScope>,
) -> Result<String, String> {
    let secrets = app.state::<secrets::Secrets>();
    let known_hosts = ssh::app_known_hosts_path(app)?;
    let scoped = scope.filter(|scope| !scope.is_empty());
    let (hosts, specs) = storage(app).with_connection_infallible(|conn| {
        let group = ito::list_sites(conn)
            .map_err(|error| error.to_string())?
            .into_iter()
            .find(|group| group.id == site_id)
            .ok_or_else(|| "site not found".to_string())?;
        let hosts = match &scoped {
            Some(scope) => {
                ito::resolve_site_scoped(conn, &group, scope).map_err(|error| error.to_string())?
            }
            None => ito::resolve_site(conn, &group).map_err(|error| error.to_string())?,
        };
        let specs = runner::resolve_ssh_specs(
            conn,
            &secrets,
            known_hosts.clone(),
            &hosts,
            DEFAULT_TIMEOUT_SECONDS,
        );
        Ok::<_, String>((hosts, specs))
    })?;

    if hosts.is_empty() {
        return Err("site resolves to no hosts".to_string());
    }

    let run_id = new_itops_id("run");
    let task_summary = task.summary();
    let started_at = now_millis();
    let event_hosts: Vec<RunEventHost> = hosts
        .iter()
        .map(|host| RunEventHost {
            connection_id: host.connection_id.clone(),
            name: host.name.clone(),
            host: host.host.clone(),
            transport: host.transport,
        })
        .collect();

    let cancel = app.state::<ItopsRunRegistry>().register(&run_id);

    let transport = SshTransport::new(specs);
    let app_thread = app.clone();
    let run_id_thread = run_id.clone();
    std::thread::spawn(move || {
        let emit_app = app_thread.clone();
        let emit = move |event: RunEvent| {
            let _ = emit_app.emit("itops://run", event);
        };
        // Emit `Started` from this worker thread, ahead of the per-host events,
        // so every event for the run is ordered on a single thread. Emitting it
        // on the command thread instead raced the worker's first events: on a
        // fast run the webview could receive `hostFinished` before `started`,
        // drop it (no active run yet), then reset hosts to "pending" — leaving
        // the tally reading 0 until a relaunch reloaded the persisted report.
        emit(RunEvent::Started {
            run_id: run_id_thread.clone(),
            site_id: Some(site_id.clone()),
            task_summary: task_summary.clone(),
            hosts: event_hosts,
        });
        let report = runner::run_batch(
            &run_id_thread,
            &hosts,
            &task,
            &transport,
            DEFAULT_CONCURRENCY,
            &cancel,
            &emit,
        );
        let finished_at = now_millis();
        let canceled = cancel.load(Ordering::Relaxed);

        let _ = app_thread
            .state::<crate::storage::Storage>()
            .with_connection_infallible(|conn| {
                run_storage::insert_run_report(
                    conn,
                    &run_id_thread,
                    "manual",
                    Some(&site_id),
                    &task_summary,
                    &started_at,
                    Some(&finished_at),
                    &report,
                )
            });

        if canceled {
            let _ = app_thread.emit(
                "itops://run",
                RunEvent::Canceled {
                    run_id: run_id_thread.clone(),
                },
            );
        } else {
            let _ = app_thread.emit(
                "itops://run",
                RunEvent::Finished {
                    run_id: run_id_thread.clone(),
                    report,
                },
            );
        }
        app_thread
            .state::<ItopsRunRegistry>()
            .remove(&run_id_thread);
    });

    Ok(run_id)
}

#[tauri::command]
pub fn itops_cancel_batch_run(app: AppHandle, run_id: String) -> Result<(), String> {
    app.state::<ItopsRunRegistry>().cancel(&run_id);
    Ok(())
}

#[tauri::command]
pub fn itops_list_run_history(
    app: AppHandle,
    limit: Option<i64>,
) -> Result<Vec<RunHistoryEntry>, String> {
    let limit = limit.unwrap_or(50).clamp(1, 500);
    storage(&app).with_connection_infallible(|conn| {
        run_storage::list_run_history(conn, limit).map_err(|error| error.to_string())
    })
}

// ── Site topology: Racks + Rack Devices (docs/SITE.md Phase B) ─────────────

#[tauri::command]
pub fn itops_list_racks(app: AppHandle, site_id: String) -> Result<Vec<Rack>, String> {
    storage(&app).with_connection_infallible(|conn| {
        topo::list_racks(conn, &site_id).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_list_server_rooms(app: AppHandle, site_id: String) -> Result<Vec<ServerRoom>, String> {
    storage(&app).with_connection_infallible(|conn| {
        topo::list_server_rooms(conn, &site_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn itops_create_server_room(
    app: AppHandle,
    site_id: String,
    name: String,
) -> Result<ServerRoom, String> {
    let id = new_itops_id("room");
    storage(&app).with_connection_infallible(|conn| {
        topo::create_server_room(conn, &id, &site_id, &name).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn itops_delete_server_room(app: AppHandle, id: String) -> Result<(), String> {
    storage(&app).with_connection_infallible(|conn| {
        topo::delete_server_room(conn, &id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn itops_create_rack(
    app: AppHandle,
    site_id: String,
    name: String,
    server_room: String,
    rack_group: String,
    shell: Option<String>,
    height_u: u32,
    depth_mm: u32,
    power_capacity_w: Option<u32>,
) -> Result<Rack, String> {
    let id = new_itops_id("rack");
    storage(&app).with_connection_infallible(|conn| {
        topo::create_rack(
            conn,
            &id,
            &site_id,
            &name,
            &server_room,
            &rack_group,
            shell.as_deref(),
            height_u,
            depth_mm,
            power_capacity_w,
        )
        .map_err(|error| error.to_string())
    })
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn itops_update_rack(
    app: AppHandle,
    id: String,
    name: String,
    server_room: String,
    rack_group: String,
    shell: Option<String>,
    height_u: u32,
    depth_mm: u32,
    power_capacity_w: Option<u32>,
) -> Result<Rack, String> {
    storage(&app).with_connection_infallible(|conn| {
        topo::update_rack(
            conn,
            &id,
            &name,
            &server_room,
            &rack_group,
            shell.as_deref(),
            height_u,
            depth_mm,
            power_capacity_w,
        )
        .map_err(|error| error.to_string())
    })
}

/// Persist Server Room View placements (floor-plan px or 2.5D grid cells) for
/// a batch of racks in one write — a tile swap moves two cabinets at once.
#[tauri::command]
pub fn itops_set_rack_placements(
    app: AppHandle,
    kind: String,
    entries: Vec<RackPlacementEntry>,
) -> Result<(), String> {
    let kind = topo::RackPlacementKind::from_str(&kind).map_err(|error| error.to_string())?;
    storage(&app).with_connection_infallible(|conn| {
        topo::set_rack_placements(conn, kind, &entries).map_err(|error| error.to_string())
    })
}

/// Set (or clear) the Site-view background.
#[tauri::command]
pub fn itops_set_site_background(
    app: AppHandle,
    site_id: String,
    background: Option<DashboardBackground>,
) -> Result<Site, String> {
    storage(&app).with_connection_infallible(|conn| {
        ito::set_site_background(conn, &site_id, background).map_err(|error| error.to_string())
    })
}

/// Set (or clear) a server room's background within a Site.
#[tauri::command]
pub fn itops_set_server_room_background(
    app: AppHandle,
    site_id: String,
    server_room: String,
    background: Option<DashboardBackground>,
) -> Result<Site, String> {
    storage(&app).with_connection_infallible(|conn| {
        ito::set_server_room_background(conn, &site_id, &server_room, background)
            .map_err(|error| error.to_string())
    })
}

/// Set (or clear) a server room's icon within a Site.
#[tauri::command]
pub fn itops_set_room_icon(
    app: AppHandle,
    site_id: String,
    server_room: String,
    icon: Option<RoomIcon>,
) -> Result<Site, String> {
    storage(&app).with_connection_infallible(|conn| {
        ito::set_room_icon(conn, &site_id, &server_room, icon).map_err(|error| error.to_string())
    })
}

/// Set (or clear) a single rack's stage background.
#[tauri::command]
pub fn itops_set_rack_background(
    app: AppHandle,
    id: String,
    background: Option<DashboardBackground>,
) -> Result<Rack, String> {
    storage(&app).with_connection_infallible(|conn| {
        topo::set_rack_background(conn, &id, background).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_delete_rack(app: AppHandle, id: String) -> Result<(), String> {
    storage(&app).with_connection_infallible(|conn| {
        topo::delete_rack(conn, &id).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_reorder_racks(
    app: AppHandle,
    site_id: String,
    ordered_ids: Vec<String>,
) -> Result<(), String> {
    storage(&app).with_connection_infallible(|conn| {
        topo::reorder_racks(conn, &site_id, &ordered_ids).map_err(|error| error.to_string())
    })
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn itops_place_rack_item(
    app: AppHandle,
    rack_id: String,
    connection_id: Option<String>,
    kind: RackItemKind,
    label: String,
    start_u: u32,
    height_u: u32,
    metadata: Option<RackItemMetadata>,
) -> Result<RackItem, String> {
    let id = new_itops_id("ri");
    storage(&app).with_connection_infallible(|conn| {
        topo::place_rack_item(
            conn,
            &id,
            &rack_id,
            connection_id,
            kind,
            &label,
            start_u,
            height_u,
            metadata.unwrap_or_default(),
        )
        .map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_update_rack_item(
    app: AppHandle,
    id: String,
    kind: RackItemKind,
    connection_id: Option<String>,
    label: String,
    metadata: Option<RackItemMetadata>,
) -> Result<RackItem, String> {
    storage(&app).with_connection_infallible(|conn| {
        topo::update_rack_item(
            conn,
            &id,
            kind,
            connection_id,
            &label,
            metadata.unwrap_or_default(),
        )
        .map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_move_rack_item(
    app: AppHandle,
    id: String,
    rack_id: String,
    start_u: u32,
    height_u: u32,
) -> Result<RackItem, String> {
    storage(&app).with_connection_infallible(|conn| {
        topo::move_rack_item(conn, &id, &rack_id, start_u, height_u)
            .map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_remove_rack_item(app: AppHandle, id: String) -> Result<(), String> {
    storage(&app).with_connection_infallible(|conn| {
        topo::remove_rack_item(conn, &id).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub async fn itops_refresh_rack_item_snmp(app: AppHandle, id: String) -> Result<RackItem, String> {
    let item = storage(&app).with_connection_infallible(|conn| {
        topo::get_rack_item(conn, &id).map_err(|error| error.to_string())
    })?;
    let Some(snmp) = item.metadata.snmp.clone() else {
        return Err("rack device has no SNMP target".to_string());
    };
    let samples = crate::net::snmp::refresh_ports(crate::net::snmp::SnmpRefreshRequest {
        target: snmp.target,
        oid: snmp.oid,
    })
    .await?;
    storage(&app).with_connection_infallible(|conn| {
        let mut metadata = item.metadata.clone();
        metadata.network_ports = Some(
            samples
                .into_iter()
                .map(|sample| RackNetworkPort {
                    name: sample.name,
                    speed: sample.speed,
                    state: Some(sample.state),
                    oid: sample.oid,
                    note: None,
                })
                .collect(),
        );
        topo::update_rack_item(
            conn,
            &id,
            item.kind,
            item.connection_id,
            &item.label,
            metadata,
        )
        .map_err(|error| error.to_string())
    })
}

/// Fetch a single Connection by id so the Rack View can open a placed host's
/// Session (docs/SITE.md Phase D). Returns the full Connection across any
/// Workspace; the frontend hands it to the existing open path.
#[tauri::command]
pub fn itops_get_connection(
    app: AppHandle,
    id: String,
) -> Result<crate::storage::SavedConnection, String> {
    storage(&app).get_connection(&id)
}
