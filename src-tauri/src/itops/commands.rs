// IT Ops Tauri commands (docs/ITOPS.md). Phase 1: Fleet CRUD + the
// run-time resolver. Errors surface as plain strings the frontend store shows in
// the Status Bar; the storage layer carries the typed variants.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter, Manager, State};

use crate::secrets;
use crate::ssh;

use super::fleet_storage as topo;
use super::ids::new_itops_id;
use super::runner::{self, SshTransport, DEFAULT_CONCURRENCY, DEFAULT_TIMEOUT_SECONDS};
use super::run_storage;
use super::storage as ito;
use super::types::{
    BatchTask, Fleet, FleetFilter, Rack, RackItem, RackItemKind, RackItemMetadata, ResolvedHost,
    RunEvent, RunEventHost, RunHistoryEntry, Transport,
};

fn storage(app: &AppHandle) -> State<'_, crate::storage::Storage> {
    app.state::<crate::storage::Storage>()
}

#[tauri::command]
pub fn itops_list_fleets(app: AppHandle) -> Result<Vec<Fleet>, String> {
    storage(&app)
        .with_connection_infallible(|conn| ito::list_fleets(conn).map_err(|error| error.to_string()))
}

#[tauri::command]
pub fn itops_create_fleet(
    app: AppHandle,
    name: String,
    member_ids: Vec<String>,
    filter: Option<FleetFilter>,
    transport: Transport,
) -> Result<Fleet, String> {
    let id = new_itops_id("hg");
    storage(&app).with_connection_infallible(|conn| {
        ito::create_fleet(conn, &id, &name, member_ids, filter, transport)
            .map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_update_fleet(
    app: AppHandle,
    id: String,
    name: String,
    member_ids: Vec<String>,
    filter: Option<FleetFilter>,
    transport: Transport,
) -> Result<Fleet, String> {
    storage(&app).with_connection_infallible(|conn| {
        ito::update_fleet(conn, &id, &name, member_ids, filter, transport)
            .map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_remove_fleet(app: AppHandle, id: String) -> Result<(), String> {
    storage(&app).with_connection_infallible(|conn| {
        ito::remove_fleet(conn, &id).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_reorder_fleets(app: AppHandle, ordered_ids: Vec<String>) -> Result<(), String> {
    storage(&app).with_connection_infallible(|conn| {
        ito::reorder_fleets(conn, &ordered_ids).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_resolve_fleet(app: AppHandle, id: String) -> Result<Vec<ResolvedHost>, String> {
    storage(&app).with_connection_infallible(|conn| {
        let group = ito::list_fleets(conn)
            .map_err(|error| error.to_string())?
            .into_iter()
            .find(|group| group.id == id)
            .ok_or_else(|| "fleet not found".to_string())?;
        ito::resolve_fleet(conn, &group).map_err(|error| error.to_string())
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

/// Start a Batch Run of `task` against a Fleet. Resolves the group and each
/// SSH host's auth up front (DB + keychain), then fans out on a background
/// thread, streaming `itops://run` events and writing the consolidated report to
/// itops_run_history on completion. Returns the run id immediately.
#[tauri::command]
pub fn itops_start_batch_run(
    app: AppHandle,
    fleet_id: String,
    task: BatchTask,
) -> Result<String, String> {
    start_run(&app, fleet_id, task)
}

/// Start a Batch Run; reusable by the command above and the Automation
/// `runBatch` action. Returns the run id immediately; progress streams on
/// `itops://run` and the report lands in itops_run_history on completion.
pub fn start_run(
    app: &AppHandle,
    fleet_id: String,
    task: BatchTask,
) -> Result<String, String> {
    let secrets = app.state::<secrets::Secrets>();
    let known_hosts = ssh::app_known_hosts_path(app)?;
    let (hosts, specs) = storage(app).with_connection_infallible(|conn| {
        let group = ito::list_fleets(conn)
            .map_err(|error| error.to_string())?
            .into_iter()
            .find(|group| group.id == fleet_id)
            .ok_or_else(|| "fleet not found".to_string())?;
        let hosts = ito::resolve_fleet(conn, &group).map_err(|error| error.to_string())?;
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
        return Err("fleet resolves to no hosts".to_string());
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
            fleet_id: Some(fleet_id.clone()),
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
                    Some(&fleet_id),
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
        app_thread.state::<ItopsRunRegistry>().remove(&run_id_thread);
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

// ── Fleet topology: Racks + Rack Items (docs/FLEET.md Phase B) ───────────────

#[tauri::command]
pub fn itops_list_racks(app: AppHandle, fleet_id: String) -> Result<Vec<Rack>, String> {
    storage(&app).with_connection_infallible(|conn| {
        topo::list_racks(conn, &fleet_id).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_create_rack(
    app: AppHandle,
    fleet_id: String,
    name: String,
    region: String,
    area: String,
    height_u: u32,
) -> Result<Rack, String> {
    let id = new_itops_id("rack");
    storage(&app).with_connection_infallible(|conn| {
        topo::create_rack(conn, &id, &fleet_id, &name, &region, &area, height_u)
            .map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_update_rack(
    app: AppHandle,
    id: String,
    name: String,
    region: String,
    area: String,
    height_u: u32,
) -> Result<Rack, String> {
    storage(&app).with_connection_infallible(|conn| {
        topo::update_rack(conn, &id, &name, &region, &area, height_u)
            .map_err(|error| error.to_string())
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
    fleet_id: String,
    ordered_ids: Vec<String>,
) -> Result<(), String> {
    storage(&app).with_connection_infallible(|conn| {
        topo::reorder_racks(conn, &fleet_id, &ordered_ids).map_err(|error| error.to_string())
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
        topo::update_rack_item(conn, &id, kind, connection_id, &label, metadata.unwrap_or_default())
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
