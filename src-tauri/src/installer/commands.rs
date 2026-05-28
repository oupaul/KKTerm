// Tauri command surface for the Installer Helper Module. Commands are kept
// thin — they look up the recipe in the cached catalog, dispatch to
// detect/install/uninstall, and emit ProgressEvents on
// `installer://progress`. Long-running work runs on a dedicated worker
// thread per call; cancellation is cooperative via a shared AtomicBool.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::SystemTime;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use super::catalog::{load_catalog, CatalogSource};
use super::detect::{detect_all, detect_one, DetectedState};
use super::events::{ProgressEvent, PROGRESS_EVENT};
use super::install::{install_recipe, EventSink};
use super::latest_version::latest_version;
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

fn cache_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir())
        .join("installer")
}

fn find_recipe<'a>(catalog: &'a Catalog, id: &str) -> Option<&'a Recipe> {
    catalog.recipes.iter().find(|r| r.id == id)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogLoadResponse {
    pub catalog: Catalog,
    pub source: String,
    pub source_detail: Option<String>,
}

#[tauri::command]
pub fn installer_load_catalog(
    app: AppHandle,
    runtime: State<'_, InstallerRuntime>,
    force_refresh: Option<bool>,
) -> Result<CatalogLoadResponse, String> {
    let load = load_catalog(&cache_dir(&app), force_refresh.unwrap_or(false))
        .map_err(|e| e.to_string())?;
    let (source, detail) = match &load.source {
        CatalogSource::Fresh => ("fresh".to_string(), None),
        CatalogSource::CacheWithinTtl => ("cacheWithinTtl".to_string(), None),
        CatalogSource::CacheFallback { reason } => (
            "cacheFallback".to_string(),
            Some(reason.clone()),
        ),
    };
    *runtime.catalog.lock().unwrap() = Some(load.catalog.clone());
    Ok(CatalogLoadResponse {
        catalog: load.catalog,
        source,
        source_detail: detail,
    })
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
    Ok(detect_all(&catalog))
}

#[tauri::command]
pub fn installer_check_latest_versions(
    storage: State<'_, Storage>,
    runtime: State<'_, InstallerRuntime>,
    tool_ids: Vec<String>,
) -> Result<HashMap<String, Option<String>>, String> {
    let catalog = runtime
        .catalog
        .lock()
        .unwrap()
        .clone()
        .ok_or("catalog not loaded yet")?;
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let mut out = HashMap::new();
    for tool_id in tool_ids {
        if let Some(recipe) = find_recipe(&catalog, &tool_id) {
            let v = latest_version(recipe);
            st::record_latest_version(&storage, &tool_id, v.as_deref(), now)?;
            out.insert(tool_id, v);
        } else {
            out.insert(tool_id, None);
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn installer_get_state(
    storage: State<'_, Storage>,
) -> Result<Vec<st::ToolState>, String> {
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
            run_bundle_install(&app_clone, &catalog, &recipe.id, steps, &options, cancel.clone(), &emit)
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
            run_bundle_uninstall(&catalog_or_empty(&app), &recipe.id, steps, cancel.clone(), &emit)
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
    let recipe = find_recipe(&catalog, &tool_id)
        .ok_or_else(|| format!("unknown tool id `{tool_id}`"))?;
    Ok(detect_one(recipe))
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

fn catalog_or_empty(app: &AppHandle) -> Catalog {
    app.state::<InstallerRuntime>()
        .catalog
        .lock()
        .unwrap()
        .clone()
        .unwrap_or(Catalog {
            schema_version: 1,
            generated_at: None,
            recipes: vec![],
        })
}
