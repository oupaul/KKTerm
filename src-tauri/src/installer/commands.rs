// Tauri command surface for the Installer Helper Module. Commands are kept
// thin — they look up the recipe in the cached catalog, dispatch to
// detect/install/uninstall, and emit ProgressEvents on
// `installer://progress`. Long-running work runs on a dedicated worker
// thread per call; cancellation is cooperative via a shared AtomicBool.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::SystemTime;

use tauri::{AppHandle, Emitter, State};

use super::cache::{load_detection_cache, write_cached_state};
use super::catalog::load_bundled_catalog;
use super::detect::{
    detect_all, detect_bundle_from_states, detect_one, detect_one_in_catalog,
    invalidate_installed_software_snapshot, refresh_installed_software_snapshot, DetectedState,
};
use super::events::{ProgressEvent, PROGRESS_EVENT};
use super::install::{install_recipe, EventSink};
use super::latest_version::latest_version_in_catalog;
use super::options::InstallOptions;
use super::schema::{Catalog, Provider, Recipe};
use super::state as st;
use super::uninstall::uninstall_recipe;
use crate::storage::Storage;

/// Tauri-managed runtime state: cached catalog + per-tool cancellation
/// flags + per-tool in-flight worker handles.
#[derive(Default)]
pub struct InstallerRuntime {
    catalog: Mutex<Option<Catalog>>,
    cancel_flags: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl InstallerRuntime {
    pub fn new() -> Self {
        Self::default()
    }

    fn cancel_flag_for(&self, tool_id: &str) -> Arc<AtomicBool> {
        let mut map = self.cancel_flags.lock().unwrap();
        map.entry(tool_id.to_string())
            .or_insert_with(|| Arc::new(AtomicBool::new(false)))
            .clone()
    }

    fn reset_cancel(&self, tool_id: &str) {
        let flag = self.cancel_flag_for(tool_id);
        flag.store(false, Ordering::Relaxed);
    }

    fn raise_cancel(&self, tool_id: &str) {
        let flag = self.cancel_flag_for(tool_id);
        flag.store(true, Ordering::Relaxed);
    }
}

fn find_recipe<'a>(catalog: &'a Catalog, id: &str) -> Option<&'a Recipe> {
    catalog.recipes.iter().find(|r| r.id == id)
}

/// Load the bundled catalog. The `_force_refresh` arg is retained for
/// frontend API compatibility but has no effect — the catalog is embedded
/// at compile time, so "refresh" is the same as "the build that's running".
#[tauri::command]
pub fn installer_load_catalog(
    runtime: State<'_, InstallerRuntime>,
    _force_refresh: Option<bool>,
) -> Result<Catalog, String> {
    let catalog = load_bundled_catalog().map_err(|e| e.to_string())?;
    *runtime.catalog.lock().unwrap() = Some(catalog.clone());
    Ok(catalog)
}

#[tauri::command]
pub fn installer_detect_all(
    runtime: State<'_, InstallerRuntime>,
) -> Result<HashMap<String, DetectedState>, String> {
    let catalog = runtime
        .catalog
        .lock()
        .unwrap()
        .clone()
        .ok_or("catalog not loaded yet — call installer_load_catalog first")?;
    let now = unix_now_secs();
    let detected: HashMap<String, DetectedState> = detect_all(&catalog)
        .into_iter()
        .map(|(tool_id, state)| {
            let state = state.with_last_checked_at(Some(now));
            write_cached_state(&tool_id, &state);
            (tool_id, state)
        })
        .collect();
    Ok(detected)
}

#[tauri::command]
pub fn installer_load_detection_cache(
    runtime: State<'_, InstallerRuntime>,
) -> Result<HashMap<String, DetectedState>, String> {
    let catalog = runtime
        .catalog
        .lock()
        .unwrap()
        .clone()
        .ok_or("catalog not loaded yet — call installer_load_catalog first")?;
    Ok(load_detection_cache(&catalog))
}

#[tauri::command]
pub fn installer_detect_all_streaming(
    app: AppHandle,
    runtime: State<'_, InstallerRuntime>,
) -> Result<(), String> {
    let catalog = runtime
        .catalog
        .lock()
        .unwrap()
        .clone()
        .ok_or("catalog not loaded yet — call installer_load_catalog first")?;
    std::thread::spawn(move || {
        let emit = make_emit_sink(app);
        let tool_ids: Vec<String> = catalog.recipes.iter().map(|r| r.id.clone()).collect();
        emit(ProgressEvent::DetectStarted { tool_ids });

        let mut leaves = Vec::new();
        let mut bundles = Vec::new();
        for recipe in &catalog.recipes {
            if matches!(recipe.provider, Provider::Bundle { .. }) {
                bundles.push(recipe.clone());
            } else {
                leaves.push(recipe.clone());
            }
        }

        refresh_installed_software_snapshot();
        let detected = Mutex::new(HashMap::<String, DetectedState>::new());
        let work = Mutex::new(leaves);
        std::thread::scope(|scope| {
            for _ in 0..DETECT_PARALLELISM {
                let work = &work;
                let detected = &detected;
                let emit = &emit;
                scope.spawn(move || loop {
                    let recipe = {
                        let mut q = work.lock().unwrap();
                        match q.pop() {
                            Some(recipe) => recipe,
                            None => return,
                        }
                    };
                    let state = detect_one(&recipe).with_last_checked_at(Some(unix_now_secs()));
                    write_cached_state(&recipe.id, &state);
                    detected
                        .lock()
                        .unwrap()
                        .insert(recipe.id.clone(), state.clone());
                    emit(ProgressEvent::DetectResult {
                        tool_id: recipe.id,
                        state,
                    });
                });
            }
        });

        let mut detected_guard = detected.lock().unwrap();
        for bundle in bundles {
            if let Some(state) = detect_bundle_from_states(&bundle, &detected_guard)
                .map(|state| state.with_last_checked_at(Some(unix_now_secs())))
            {
                write_cached_state(&bundle.id, &state);
                detected_guard.insert(bundle.id.clone(), state.clone());
                emit(ProgressEvent::DetectResult {
                    tool_id: bundle.id,
                    state,
                });
            }
        }
        emit(ProgressEvent::DetectFinished);
    });
    Ok(())
}

/// Synthetic cancel-flag key used by the streaming check-for-updates sweep.
/// Routes through the same cancel-flag map as installs so `installer_cancel`
/// with this id aborts the sweep mid-list.
pub const CHECK_UPDATES_CANCEL_ID: &str = "__check_updates__";

/// Bounded parallelism for latest-version lookups. Most operations are
/// network or CLI-bound; 4 in flight saturates a typical home connection
/// without overwhelming winget's source backend.
const CHECK_UPDATES_PARALLELISM: usize = 4;
const DETECT_PARALLELISM: usize = 4;

/// Streaming check-for-updates. Runs on Tauri's worker thread (the UI is
/// never blocked), but emits one `CheckResult` per tool as its lookup
/// lands so the frontend can light rows up incrementally. Lookups run in
/// parallel via a scoped thread pool; the per-tool work is network/CLI
/// bound, so a small pool (`CHECK_UPDATES_PARALLELISM`) is enough to hide
/// the slow legs (winget) behind the fast ones (cached npm).
#[tauri::command]
pub fn installer_check_latest_versions(
    app: AppHandle,
    storage: State<'_, Storage>,
    runtime: State<'_, InstallerRuntime>,
    tool_ids: Vec<String>,
) -> Result<(), String> {
    let catalog = runtime
        .catalog
        .lock()
        .unwrap()
        .clone()
        .ok_or("catalog not loaded yet")?;
    let cancel = runtime.cancel_flag_for(CHECK_UPDATES_CANCEL_ID);
    runtime.reset_cancel(CHECK_UPDATES_CANCEL_ID);

    let emit: EventSink = make_emit_sink(app);
    emit(ProgressEvent::CheckStarted {
        tool_ids: tool_ids.clone(),
    });
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let storage_ref = &*storage;
    let catalog_ref = &catalog;
    let emit_ref = &emit;
    let work: Mutex<Vec<String>> = Mutex::new(tool_ids);

    std::thread::scope(|scope| {
        for _ in 0..CHECK_UPDATES_PARALLELISM {
            let cancel = cancel.clone();
            let work = &work;
            scope.spawn(move || loop {
                if cancel.load(Ordering::Relaxed) {
                    return;
                }
                let tool_id = {
                    let mut q = work.lock().unwrap();
                    match q.pop() {
                        Some(id) => id,
                        None => return,
                    }
                };
                let (latest, error) = match find_recipe(catalog_ref, &tool_id) {
                    Some(recipe) => (latest_version_in_catalog(recipe, catalog_ref), None),
                    None => (None, Some("unknown tool id".to_string())),
                };
                let _ = st::record_latest_version(storage_ref, &tool_id, latest.as_deref(), now);
                emit_ref(ProgressEvent::CheckResult {
                    tool_id,
                    latest_version: latest,
                    error,
                });
            });
        }
    });

    emit(ProgressEvent::CheckFinished);
    Ok(())
}

#[tauri::command]
pub fn installer_get_state(storage: State<'_, Storage>) -> Result<Vec<st::ToolState>, String> {
    st::list_all(&storage)
}

#[tauri::command]
pub fn installer_set_pinned(
    storage: State<'_, Storage>,
    tool_id: String,
    pinned: bool,
) -> Result<(), String> {
    st::set_pinned(&storage, &tool_id, pinned)
}

#[tauri::command]
pub fn installer_install_recipe(
    app: AppHandle,
    runtime: State<'_, InstallerRuntime>,
    tool_id: String,
    options: Option<InstallOptions>,
) -> Result<(), String> {
    let catalog = runtime
        .catalog
        .lock()
        .unwrap()
        .clone()
        .ok_or("catalog not loaded yet")?;
    let recipe = find_recipe(&catalog, &tool_id)
        .ok_or_else(|| format!("unknown tool id `{tool_id}`"))?
        .clone();
    let cancel = runtime.cancel_flag_for(&tool_id);
    runtime.reset_cancel(&tool_id);
    let app_clone = app.clone();
    let options = options.unwrap_or_default();

    std::thread::spawn(move || {
        let emit: EventSink = make_emit_sink(app_clone.clone());
        let result = if let Provider::Bundle { steps } = &recipe.provider {
            run_bundle_install(
                &app_clone,
                &catalog,
                &recipe.id,
                steps,
                &options,
                cancel.clone(),
                &emit,
            )
        } else {
            install_recipe(&recipe, &options, cancel.clone(), &emit)
        };
        emit_terminal(&emit, &tool_id, &result, cancel);
    });
    Ok(())
}

#[tauri::command]
pub fn installer_uninstall_recipe(
    app: AppHandle,
    runtime: State<'_, InstallerRuntime>,
    tool_id: String,
) -> Result<(), String> {
    let catalog = runtime
        .catalog
        .lock()
        .unwrap()
        .clone()
        .ok_or("catalog not loaded yet")?;
    let recipe = find_recipe(&catalog, &tool_id)
        .ok_or_else(|| format!("unknown tool id `{tool_id}`"))?
        .clone();
    let cancel = runtime.cancel_flag_for(&tool_id);
    runtime.reset_cancel(&tool_id);

    std::thread::spawn(move || {
        let emit: EventSink = make_emit_sink(app.clone());
        let result = if let Provider::Bundle { steps } = &recipe.provider {
            run_bundle_uninstall(&catalog, &recipe.id, steps, cancel.clone(), &emit)
        } else {
            uninstall_recipe(&recipe, cancel.clone(), &emit).map(|_| None)
        };
        emit_terminal(&emit, &tool_id, &result, cancel);
    });
    Ok(())
}

#[tauri::command]
pub fn installer_cancel(
    runtime: State<'_, InstallerRuntime>,
    tool_id: String,
) -> Result<(), String> {
    runtime.raise_cancel(&tool_id);
    Ok(())
}

#[tauri::command]
pub fn installer_redetect(
    runtime: State<'_, InstallerRuntime>,
    tool_id: String,
) -> Result<DetectedState, String> {
    let catalog = runtime
        .catalog
        .lock()
        .unwrap()
        .clone()
        .ok_or("catalog not loaded yet")?;
    let recipe =
        find_recipe(&catalog, &tool_id).ok_or_else(|| format!("unknown tool id `{tool_id}`"))?;
    // A redetect is the user's signal that the world may have changed
    // (install/uninstall just finished, or they hit Refresh on one row).
    // Drop the cached installed-software snapshot so the next winget recipe
    // re-scans the local uninstall registry.
    invalidate_installed_software_snapshot();
    let state = detect_one_in_catalog(recipe, &catalog).with_last_checked_at(Some(unix_now_secs()));
    write_cached_state(&tool_id, &state);
    Ok(state)
}

// ---- helpers -----------------------------------------------------------

fn make_emit_sink(app: AppHandle) -> EventSink {
    Box::new(move |event: ProgressEvent| {
        let _ = app.emit(PROGRESS_EVENT, event);
    })
}

fn emit_terminal(
    emit: &EventSink,
    tool_id: &str,
    result: &Result<Option<String>, String>,
    cancel: Arc<AtomicBool>,
) {
    match result {
        Ok(installed_version) => emit(ProgressEvent::Completed {
            tool_id: tool_id.into(),
            installed_version: installed_version.clone(),
        }),
        Err(msg) if cancel.load(Ordering::Relaxed) || msg == "cancelled" => {
            emit(ProgressEvent::Cancelled {
                tool_id: tool_id.into(),
            });
        }
        Err(msg) => emit(ProgressEvent::Failed {
            tool_id: tool_id.into(),
            message: msg.clone(),
        }),
    }
}

fn unix_now_secs() -> i64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn run_bundle_install(
    _app: &AppHandle,
    catalog: &Catalog,
    bundle_id: &str,
    steps: &[String],
    options: &InstallOptions,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<Option<String>, String> {
    emit(ProgressEvent::Step {
        tool_id: bundle_id.into(),
        message: format!("Installing bundle ({} step(s))", steps.len()),
    });
    for step_id in steps {
        if cancel.load(Ordering::Relaxed) {
            return Err("cancelled".into());
        }
        let step_recipe = find_recipe(catalog, step_id)
            .ok_or_else(|| format!("bundle step `{step_id}` not found"))?;
        let detected = detect_one(step_recipe);
        if detected.installed {
            emit(ProgressEvent::Stdout {
                tool_id: bundle_id.into(),
                step_id: None,
                line: format!("Step `{step_id}` already installed, skipping"),
            });
            continue;
        }
        emit(ProgressEvent::Step {
            tool_id: bundle_id.into(),
            message: format!("→ {step_id}"),
        });
        install_recipe(step_recipe, options, cancel.clone(), emit)?;
    }
    Ok(None)
}

fn run_bundle_uninstall(
    catalog: &Catalog,
    bundle_id: &str,
    steps: &[String],
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<Option<String>, String> {
    emit(ProgressEvent::Step {
        tool_id: bundle_id.into(),
        message: format!("Uninstalling bundle ({} step(s))", steps.len()),
    });
    // Reverse order: uninstall consumers before dependencies.
    for step_id in steps.iter().rev() {
        if cancel.load(Ordering::Relaxed) {
            return Err("cancelled".into());
        }
        let step_recipe = find_recipe(catalog, step_id)
            .ok_or_else(|| format!("bundle step `{step_id}` not found"))?;
        let detected = detect_one(step_recipe);
        if !detected.installed {
            continue;
        }
        emit(ProgressEvent::Step {
            tool_id: bundle_id.into(),
            message: format!("→ uninstall {step_id}"),
        });
        uninstall_recipe(step_recipe, cancel.clone(), emit)?;
    }
    Ok(None)
}
