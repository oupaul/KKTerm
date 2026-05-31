// Tauri command surface for the Installer Helper Module. Commands are kept
// thin — they look up the recipe in the cached catalog, dispatch to
// detect/install/uninstall, and emit ProgressEvents on
// `installer://progress`. Long-running work runs on a dedicated worker
// thread per call; cancellation is cooperative via a shared AtomicBool.

use std::collections::HashMap;
use std::net::{SocketAddr, TcpStream};
use std::path::Path;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

use serde::Serialize;
use serde_json::json;
use tauri::{AppHandle, Emitter, State};

use super::cache::{load_detection_cache, write_cached_state};
use super::catalog::load_bundled_catalog;
use super::detect::{
    DetectedState, detect_all, detect_bundle_from_states, detect_one, detect_one_in_catalog,
    invalidate_installed_software_snapshot, refresh_installed_software_snapshot,
};
use super::events::{PROGRESS_EVENT, ProgressEvent};
use super::install::{EventSink, install_recipe};
use super::latest_version::latest_version_in_catalog;
use super::managed_app::{managed_app_data_dir, managed_app_install_dir};
use super::options::InstallOptions;
use super::proc::npm_program;
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

fn provider_kind(provider: &Provider) -> &'static str {
    match provider {
        Provider::Winget { .. } => "winget",
        Provider::Npm { .. } => "npm",
        Provider::UvPip { .. } => "uvPip",
        Provider::DownloadInstaller { .. } => "downloadInstaller",
        Provider::GithubRelease { .. } => "githubRelease",
        Provider::WindowsFeature { .. } => "windowsFeature",
        Provider::WslDistro { .. } => "wslDistro",
        Provider::Bundle { .. } => "bundle",
    }
}

/// Load the bundled catalog. The `_force_refresh` arg is retained for
/// frontend API compatibility but has no effect — the catalog is embedded
/// at compile time, so "refresh" is the same as "the build that's running".
#[tauri::command]
pub fn installer_load_catalog(
    runtime: State<'_, InstallerRuntime>,
    _force_refresh: Option<bool>,
) -> Result<Catalog, String> {
    crate::logging::installer_helper_debug(
        "command.installer_load_catalog.start",
        &json!({ "forceRefresh": _force_refresh }),
    );
    let catalog = load_bundled_catalog().map_err(|e| e.to_string())?;
    *runtime.catalog.lock().unwrap() = Some(catalog.clone());
    crate::logging::installer_helper_debug(
        "command.installer_load_catalog.ok",
        &json!({ "recipeCount": catalog.recipes.len() }),
    );
    Ok(catalog)
}

#[tauri::command]
pub fn installer_detect_all(
    runtime: State<'_, InstallerRuntime>,
) -> Result<HashMap<String, DetectedState>, String> {
    crate::logging::installer_helper_debug("command.installer_detect_all.start", &json!({}));
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
    crate::logging::installer_helper_debug(
        "command.installer_detect_all.ok",
        &json!({ "resultCount": detected.len() }),
    );
    Ok(detected)
}

#[tauri::command]
pub fn installer_load_detection_cache(
    runtime: State<'_, InstallerRuntime>,
) -> Result<HashMap<String, DetectedState>, String> {
    crate::logging::installer_helper_debug(
        "command.installer_load_detection_cache.start",
        &json!({}),
    );
    let catalog = runtime
        .catalog
        .lock()
        .unwrap()
        .clone()
        .ok_or("catalog not loaded yet — call installer_load_catalog first")?;
    let cache = load_detection_cache(&catalog);
    crate::logging::installer_helper_debug(
        "command.installer_load_detection_cache.ok",
        &json!({ "hitCount": cache.len() }),
    );
    Ok(cache)
}

#[tauri::command]
pub fn installer_detect_all_streaming(
    app: AppHandle,
    runtime: State<'_, InstallerRuntime>,
) -> Result<(), String> {
    crate::logging::installer_helper_debug(
        "command.installer_detect_all_streaming.start",
        &json!({}),
    );
    let catalog = runtime
        .catalog
        .lock()
        .unwrap()
        .clone()
        .ok_or("catalog not loaded yet — call installer_load_catalog first")?;
    std::thread::spawn(move || {
        crate::logging::installer_helper_debug(
            "detect.streaming.worker.start",
            &json!({ "recipeCount": catalog.recipes.len() }),
        );
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
                scope.spawn(move || {
                    loop {
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
                    }
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
        crate::logging::installer_helper_debug("detect.streaming.worker.ok", &json!({}));
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
    crate::logging::installer_helper_debug(
        "command.installer_check_latest_versions.start",
        &json!({ "toolIds": &tool_ids }),
    );
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
            scope.spawn(move || {
                loop {
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
                        Some(recipe) => match latest_version_in_catalog(recipe, catalog_ref) {
                            Ok(latest) => (latest, None),
                            Err(error) => (None, Some(error)),
                        },
                        None => (None, Some("unknown tool id".to_string())),
                    };
                    if error.is_none() {
                        let _ = st::record_latest_version(
                            storage_ref,
                            &tool_id,
                            latest.as_deref(),
                            now,
                        );
                    }
                    crate::logging::installer_helper_debug(
                        "latest.check.result",
                        &json!({ "toolId": &tool_id, "latestVersion": &latest, "error": &error }),
                    );
                    emit_ref(ProgressEvent::CheckResult {
                        tool_id,
                        latest_version: latest,
                        error,
                    });
                }
            });
        }
    });

    emit(ProgressEvent::CheckFinished);
    crate::logging::installer_helper_debug(
        "command.installer_check_latest_versions.ok",
        &json!({}),
    );
    Ok(())
}

#[tauri::command]
pub fn installer_get_state(storage: State<'_, Storage>) -> Result<Vec<st::ToolState>, String> {
    crate::logging::installer_helper_debug("command.installer_get_state.start", &json!({}));
    let state = st::list_all(&storage);
    if let Ok(rows) = &state {
        crate::logging::installer_helper_debug(
            "command.installer_get_state.ok",
            &json!({ "rowCount": rows.len() }),
        );
    }
    state
}

#[tauri::command]
pub fn installer_set_pinned(
    storage: State<'_, Storage>,
    tool_id: String,
    pinned: bool,
) -> Result<(), String> {
    crate::logging::installer_helper_debug(
        "command.installer_set_pinned.start",
        &json!({ "toolId": &tool_id, "pinned": pinned }),
    );
    st::set_pinned(&storage, &tool_id, pinned)
}

#[tauri::command]
pub fn installer_install_recipe(
    app: AppHandle,
    runtime: State<'_, InstallerRuntime>,
    tool_id: String,
    options: Option<InstallOptions>,
) -> Result<(), String> {
    crate::logging::installer_helper_debug(
        "command.installer_install_recipe.start",
        &json!({ "toolId": &tool_id, "options": &options }),
    );
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
        crate::logging::installer_helper_debug(
            "install.worker.start",
            &json!({ "toolId": &tool_id, "provider": provider_kind(&recipe.provider) }),
        );
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
        crate::logging::installer_helper_debug(
            "install.worker.finished",
            &json!({ "toolId": &tool_id, "result": &result }),
        );
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
    crate::logging::installer_helper_debug(
        "command.installer_uninstall_recipe.start",
        &json!({ "toolId": &tool_id }),
    );
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
        crate::logging::installer_helper_debug(
            "uninstall.worker.start",
            &json!({ "toolId": &tool_id, "provider": provider_kind(&recipe.provider) }),
        );
        let emit: EventSink = make_emit_sink(app.clone());
        let result = if let Provider::Bundle { steps } = &recipe.provider {
            run_bundle_uninstall(&catalog, &recipe.id, steps, cancel.clone(), &emit)
        } else {
            uninstall_recipe(&recipe, cancel.clone(), &emit).map(|_| None)
        };
        crate::logging::installer_helper_debug(
            "uninstall.worker.finished",
            &json!({ "toolId": &tool_id, "result": &result }),
        );
        emit_terminal(&emit, &tool_id, &result, cancel);
    });
    Ok(())
}

#[tauri::command]
pub fn installer_cancel(
    runtime: State<'_, InstallerRuntime>,
    tool_id: String,
) -> Result<(), String> {
    crate::logging::installer_helper_debug(
        "command.installer_cancel",
        &json!({ "toolId": &tool_id }),
    );
    runtime.raise_cancel(&tool_id);
    Ok(())
}

#[tauri::command]
pub fn installer_run_web_ui(tool_id: String) -> Result<(), String> {
    crate::logging::installer_helper_debug(
        "command.installer_run_web_ui.start",
        &json!({ "toolId": &tool_id }),
    );
    let affordance = web_ui_affordance(&tool_id)
        .ok_or_else(|| format!("tool `{tool_id}` does not expose a managed web UI"))?;
    spawn_web_ui_affordance(&affordance)
}

#[tauri::command]
pub fn installer_get_web_ui_status(tool_id: String) -> Result<ManagedWebUiStatus, String> {
    let affordance = web_ui_affordance(&tool_id)
        .ok_or_else(|| format!("tool `{tool_id}` does not expose a managed web UI"))?;
    Ok(web_ui_status(&tool_id, &affordance))
}

#[tauri::command]
pub fn installer_stop_web_ui(tool_id: String) -> Result<(), String> {
    let affordance = web_ui_affordance(&tool_id)
        .ok_or_else(|| format!("tool `{tool_id}` does not expose a managed web UI"))?;
    if let Some(service) = service_affordance(&tool_id).filter(|s| {
        matches!(query_service_state(&s.service_name).as_deref(), Some("RUNNING"))
    }) {
        return run_elevated_cmd_script(
            &service_control_script(&service.service_name, "stop"),
            &format!("stop service {}", service.service_name),
        );
    }
    stop_port_listener(affordance.port)
}

#[tauri::command]
pub fn installer_install_service(tool_id: String) -> Result<(), String> {
    crate::logging::installer_helper_debug(
        "command.installer_install_service.start",
        &json!({ "toolId": &tool_id }),
    );
    let service = service_affordance(&tool_id)
        .ok_or_else(|| format!("tool `{tool_id}` does not expose a managed service helper"))?;
    run_elevated_cmd_script(
        &service_install_script(&service),
        &format!("install service {}", service.service_name),
    )
}

#[tauri::command]
pub fn installer_remove_service(tool_id: String) -> Result<(), String> {
    crate::logging::installer_helper_debug(
        "command.installer_remove_service.start",
        &json!({ "toolId": &tool_id }),
    );
    let service = service_affordance(&tool_id)
        .ok_or_else(|| format!("tool `{tool_id}` does not expose a managed service helper"))?;
    run_elevated_cmd_script(
        &service_remove_script(&service.service_name),
        &format!("remove service {}", service.service_name),
    )
}

#[tauri::command]
pub fn installer_redetect(
    runtime: State<'_, InstallerRuntime>,
    tool_id: String,
) -> Result<DetectedState, String> {
    crate::logging::installer_helper_debug(
        "command.installer_redetect.start",
        &json!({ "toolId": &tool_id }),
    );
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
    crate::logging::installer_helper_debug(
        "command.installer_redetect.ok",
        &json!({ "toolId": &tool_id, "state": &state }),
    );
    Ok(state)
}

// ---- helpers -----------------------------------------------------------

fn make_emit_sink(app: AppHandle) -> EventSink {
    Box::new(move |event: ProgressEvent| {
        crate::logging::installer_helper_debug("event.emit", &json!({ "event": &event }));
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

#[derive(Debug, Clone, PartialEq, Eq)]
struct WebUiAffordance {
    program: String,
    args: Vec<String>,
    env: Vec<(&'static str, String)>,
    working_dir: String,
    url: &'static str,
    port: u16,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ManagedServiceAffordance {
    service_name: String,
    display_name: String,
    program: String,
    args: Vec<String>,
    env: Vec<(&'static str, String)>,
    working_dir: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedWebUiStatus {
    running: bool,
    service_installed: bool,
    service_state: Option<String>,
    startup: Option<String>,
}

fn web_ui_affordance(tool_id: &str) -> Option<WebUiAffordance> {
    match tool_id {
        "n8n" => Some(WebUiAffordance {
            program: npm_program().into(),
            args: vec![
                "exec".into(),
                "--prefix".into(),
                managed_app_install_dir("n8n")
                    .to_string_lossy()
                    .into_owned(),
                "--".into(),
                "n8n".into(),
                "start".into(),
            ],
            env: vec![(
                "N8N_USER_FOLDER",
                managed_app_data_dir("n8n").to_string_lossy().into_owned(),
            )],
            working_dir: managed_app_install_dir("n8n")
                .to_string_lossy()
                .into_owned(),
            url: "http://localhost:5678",
            port: 5678,
        }),
        "ollama" => Some(WebUiAffordance {
            program: managed_ollama_program(),
            args: vec!["serve".into()],
            env: vec![(
                "OLLAMA_MODELS",
                managed_app_data_dir("ollama")
                    .join("models")
                    .to_string_lossy()
                    .into_owned(),
            )],
            working_dir: managed_app_install_dir("ollama")
                .to_string_lossy()
                .into_owned(),
            url: "http://localhost:11434",
            port: 11434,
        }),
        "flowise" => Some(WebUiAffordance {
            program: npm_program().into(),
            args: vec![
                "exec".into(),
                "--prefix".into(),
                managed_app_install_dir("flowise")
                    .to_string_lossy()
                    .into_owned(),
                "--".into(),
                "flowise".into(),
                "start".into(),
            ],
            env: vec![],
            working_dir: managed_app_install_dir("flowise")
                .to_string_lossy()
                .into_owned(),
            url: "http://localhost:3000",
            port: 3000,
        }),
        "open-webui" => Some(WebUiAffordance {
            program: managed_uv_pip_script("open-webui", "open-webui"),
            args: vec![
                "serve".into(),
                "--host".into(),
                "127.0.0.1".into(),
                "--port".into(),
                "8080".into(),
            ],
            env: vec![(
                "DATA_DIR",
                managed_app_data_dir("open-webui")
                    .to_string_lossy()
                    .into_owned(),
            )],
            working_dir: managed_app_install_dir("open-webui")
                .to_string_lossy()
                .into_owned(),
            url: "http://localhost:8080",
            port: 8080,
        }),
        "langflow" => Some(WebUiAffordance {
            program: managed_uv_pip_script("langflow", "langflow"),
            args: vec![
                "run".into(),
                "--host".into(),
                "127.0.0.1".into(),
                "--port".into(),
                "7860".into(),
            ],
            env: vec![(
                "LANGFLOW_CONFIG_DIR",
                managed_app_data_dir("langflow")
                    .to_string_lossy()
                    .into_owned(),
            )],
            working_dir: managed_app_install_dir("langflow")
                .to_string_lossy()
                .into_owned(),
            url: "http://localhost:7860",
            port: 7860,
        }),
        "excalidraw" => Some(WebUiAffordance {
            program: npm_program().into(),
            args: vec![
                "exec".into(),
                "--prefix".into(),
                managed_app_install_dir("excalidraw")
                    .to_string_lossy()
                    .into_owned(),
                "--".into(),
                "vite".into(),
                "--host".into(),
                "127.0.0.1".into(),
                "--port".into(),
                "3021".into(),
            ],
            env: vec![],
            working_dir: managed_app_install_dir("excalidraw")
                .to_string_lossy()
                .into_owned(),
            url: "http://localhost:3021",
            port: 3021,
        }),
        _ => None,
    }
}

struct TerminalLaunchAffordance {
    activate_ps1: Option<String>,
    /// Extra PowerShell lines run after activation and before hints (e.g. local function aliases).
    setup_lines: Vec<String>,
    prefill: String,
    hints: Vec<String>,
}

fn terminal_launch_affordance(tool_id: &str) -> Option<TerminalLaunchAffordance> {
    match tool_id {
        "hermes-agent" => {
            let activate = managed_app_install_dir("hermes-agent")
                .join(".venv")
                .join("Scripts")
                .join("Activate.ps1")
                .to_string_lossy()
                .into_owned();
            Some(TerminalLaunchAffordance {
                activate_ps1: Some(activate),
                setup_lines: vec![],
                prefill: "hermes".into(),
                hints: vec![
                    "hermes postinstall  —  initial setup".into(),
                    "hermes --tui  —  Terminal UI".into(),
                ],
            })
        }
        "openclaw" => {
            let prefix = managed_app_install_dir("openclaw")
                .to_string_lossy()
                .into_owned()
                .replace('\'', "''");
            Some(TerminalLaunchAffordance {
                activate_ps1: None,
                setup_lines: vec![format!(
                    "function openclaw {{ npm exec --prefix '{prefix}' -- openclaw @args }}"
                )],
                prefill: "openclaw".into(),
                hints: vec!["openclaw --help  —  list available commands".into()],
            })
        }
        _ => None,
    }
}

#[tauri::command]
pub fn installer_open_terminal_launcher(tool_id: String) -> Result<(), String> {
    let affordance = terminal_launch_affordance(&tool_id)
        .ok_or_else(|| format!("tool `{tool_id}` does not have a terminal launcher"))?;
    spawn_terminal_launcher(&affordance)
}

fn service_affordance(tool_id: &str) -> Option<ManagedServiceAffordance> {
    match tool_id {
        "n8n" => Some(ManagedServiceAffordance {
            service_name: "KKTerm-n8n".into(),
            display_name: "KKTerm n8n".into(),
            program: npm_program().into(),
            args: vec![
                "exec".into(),
                "--prefix".into(),
                managed_app_install_dir("n8n")
                    .to_string_lossy()
                    .into_owned(),
                "--".into(),
                "n8n".into(),
                "start".into(),
            ],
            env: vec![(
                "N8N_USER_FOLDER",
                managed_app_data_dir("n8n").to_string_lossy().into_owned(),
            )],
            working_dir: managed_app_install_dir("n8n")
                .to_string_lossy()
                .into_owned(),
        }),
        "flowise" => Some(ManagedServiceAffordance {
            service_name: "KKTerm-Flowise".into(),
            display_name: "KKTerm Flowise".into(),
            program: npm_program().into(),
            args: vec![
                "exec".into(),
                "--prefix".into(),
                managed_app_install_dir("flowise")
                    .to_string_lossy()
                    .into_owned(),
                "--".into(),
                "flowise".into(),
                "start".into(),
            ],
            env: vec![],
            working_dir: managed_app_install_dir("flowise")
                .to_string_lossy()
                .into_owned(),
        }),
        "open-webui" => Some(ManagedServiceAffordance {
            service_name: "KKTerm-OpenWebUI".into(),
            display_name: "KKTerm Open WebUI".into(),
            program: managed_uv_pip_script("open-webui", "open-webui"),
            args: vec![
                "serve".into(),
                "--host".into(),
                "127.0.0.1".into(),
                "--port".into(),
                "8080".into(),
            ],
            env: vec![(
                "DATA_DIR",
                managed_app_data_dir("open-webui")
                    .to_string_lossy()
                    .into_owned(),
            )],
            working_dir: managed_app_install_dir("open-webui")
                .to_string_lossy()
                .into_owned(),
        }),
        "langflow" => Some(ManagedServiceAffordance {
            service_name: "KKTerm-Langflow".into(),
            display_name: "KKTerm Langflow".into(),
            program: managed_uv_pip_script("langflow", "langflow"),
            args: vec![
                "run".into(),
                "--host".into(),
                "127.0.0.1".into(),
                "--port".into(),
                "7860".into(),
            ],
            env: vec![(
                "LANGFLOW_CONFIG_DIR",
                managed_app_data_dir("langflow")
                    .to_string_lossy()
                    .into_owned(),
            )],
            working_dir: managed_app_install_dir("langflow")
                .to_string_lossy()
                .into_owned(),
        }),
        "excalidraw" => Some(ManagedServiceAffordance {
            service_name: "KKTerm-Excalidraw".into(),
            display_name: "KKTerm Excalidraw".into(),
            program: npm_program().into(),
            args: vec![
                "exec".into(),
                "--prefix".into(),
                managed_app_install_dir("excalidraw")
                    .to_string_lossy()
                    .into_owned(),
                "--".into(),
                "vite".into(),
                "--host".into(),
                "127.0.0.1".into(),
                "--port".into(),
                "3021".into(),
            ],
            env: vec![],
            working_dir: managed_app_install_dir("excalidraw")
                .to_string_lossy()
                .into_owned(),
        }),
        "ollama" => Some(ManagedServiceAffordance {
            service_name: "KKTerm-Ollama".into(),
            display_name: "KKTerm Ollama".into(),
            program: managed_ollama_program(),
            args: vec!["serve".into()],
            env: vec![(
                "OLLAMA_MODELS",
                managed_app_data_dir("ollama")
                    .join("models")
                    .to_string_lossy()
                    .into_owned(),
            )],
            working_dir: managed_app_install_dir("ollama")
                .to_string_lossy()
                .into_owned(),
        }),
        _ => None,
    }
}

fn service_install_script(service: &ManagedServiceAffordance) -> String {
    let service_name = quote_cmd_always(&service.service_name);
    let (program_setup_lines, service_program) =
        service_program_for_install_script(&service.program);
    let log_dir = service_log_dir(service);
    let stdout_log = service_log_path(service, "stdout");
    let stderr_log = service_log_path(service, "stderr");
    let mut install_line = format!("nssm install {} {}", service_name, service_program);
    for arg in &service.args {
        install_line.push(' ');
        install_line.push_str(&quote_cmd_arg(arg));
    }

    let mut lines = vec![
        "@echo off".to_string(),
        "setlocal".to_string(),
        "where nssm >nul 2>nul".to_string(),
        "if errorlevel 1 (".to_string(),
        "  echo NSSM is required. Install NSSM from KKTerm Installer Helper first.".to_string(),
        "  exit /b 2".to_string(),
        ")".to_string(),
    ];
    lines.extend(program_setup_lines);
    lines.extend([
        format!(
            "if not exist {} mkdir {}",
            quote_cmd_arg(&log_dir),
            quote_cmd_arg(&log_dir)
        ),
        format!("nssm stop {} >nul 2>nul", service_name),
        format!("nssm remove {} confirm >nul 2>nul", service_name),
        install_line,
        format!(
            "nssm set {} DisplayName {}",
            service_name,
            quote_cmd_arg(&service.display_name)
        ),
        format!(
            "nssm set {} AppDirectory {}",
            service_name,
            quote_cmd_arg(&service.working_dir)
        ),
        format!(
            "nssm set {} AppStdout {}",
            service_name,
            quote_cmd_arg(&stdout_log)
        ),
        format!(
            "nssm set {} AppStderr {}",
            service_name,
            quote_cmd_arg(&stderr_log)
        ),
    ]);
    if !service.env.is_empty() {
        let env_values = service
            .env
            .iter()
            .map(|(key, value)| quote_cmd_arg(&format!("{key}={value}")))
            .collect::<Vec<_>>()
            .join(" ");
        lines.push(format!(
            "nssm set {} AppEnvironmentExtra {}",
            service_name, env_values
        ));
    }
    lines.push(format!(
        "nssm set {} Start SERVICE_AUTO_START",
        service_name
    ));
    lines.push(format!("nssm set {} AppExit Default Exit", service_name));
    lines.join("\r\n")
}

fn service_log_dir(service: &ManagedServiceAffordance) -> String {
    Path::new(&service.working_dir)
        .join("logs")
        .to_string_lossy()
        .into_owned()
}

fn service_log_path(service: &ManagedServiceAffordance, stream: &str) -> String {
    Path::new(&service_log_dir(service))
        .join(format!("{}.{}.log", service.service_name, stream))
        .to_string_lossy()
        .into_owned()
}

fn service_program_for_install_script(program: &str) -> (Vec<String>, String) {
    if cfg!(target_os = "windows") && program.eq_ignore_ascii_case(npm_program()) {
        return (
            vec![
                "set \"KKTERM_SERVICE_APP=\"".to_string(),
                format!(
                    "for %%I in ({}) do set \"KKTERM_SERVICE_APP=%%~$PATH:I\"",
                    npm_program()
                ),
                "if not defined KKTERM_SERVICE_APP (".to_string(),
                "  echo npm.cmd is required. Install Node.js from KKTerm Installer Helper first."
                    .to_string(),
                "  exit /b 2".to_string(),
                ")".to_string(),
            ],
            "\"%KKTERM_SERVICE_APP%\"".to_string(),
        );
    }
    (Vec::new(), quote_cmd_arg(program))
}

fn service_remove_script(service_name: &str) -> String {
    let service_name = quote_cmd_always(service_name);
    [
        "@echo off".to_string(),
        "setlocal".to_string(),
        "where nssm >nul 2>nul".to_string(),
        "if errorlevel 1 (".to_string(),
        "  echo NSSM is required. Install NSSM from KKTerm Installer Helper first.".to_string(),
        "  exit /b 2".to_string(),
        ")".to_string(),
        format!("nssm stop {} >nul 2>nul", service_name),
        format!("nssm remove {} confirm", service_name),
    ]
    .join("\r\n")
}

fn service_control_script(service_name: &str, action: &str) -> String {
    let service_name = quote_cmd_always(service_name);
    [
        "@echo off".to_string(),
        "setlocal".to_string(),
        "where nssm >nul 2>nul".to_string(),
        "if errorlevel 1 (".to_string(),
        "  echo NSSM is required. Install NSSM from KKTerm Installer Helper first.".to_string(),
        "  exit /b 2".to_string(),
        ")".to_string(),
        format!("nssm {action} {}", service_name),
    ]
    .join("\r\n")
}

fn web_ui_status(tool_id: &str, affordance: &WebUiAffordance) -> ManagedWebUiStatus {
    let service = service_affordance(tool_id);
    let service_state = service
        .as_ref()
        .and_then(|service| query_service_state(&service.service_name));
    let service_installed = service_state.is_some();
    let running = matches!(service_state.as_deref(), Some("RUNNING"))
        || is_local_port_listening(affordance.port);
    let startup = service
        .as_ref()
        .and_then(|service| query_service_startup(&service.service_name));
    ManagedWebUiStatus {
        running,
        service_installed,
        service_state,
        startup,
    }
}

fn is_local_port_listening(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, Duration::from_millis(250)).is_ok()
}

#[cfg(target_os = "windows")]
fn query_service_state(service_name: &str) -> Option<String> {
    let output = Command::new("sc")
        .args(["query", service_name])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let line = line.trim();
        if line.starts_with("STATE") {
            return line.split_whitespace().last().map(|s| s.to_string());
        }
    }
    None
}

#[cfg(not(target_os = "windows"))]
fn query_service_state(_service_name: &str) -> Option<String> {
    None
}

#[cfg(target_os = "windows")]
fn query_service_startup(service_name: &str) -> Option<String> {
    let output = Command::new("sc").args(["qc", service_name]).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let line = line.trim();
        if line.starts_with("START_TYPE") {
            return line
                .split_once(':')
                .map(|(_, value)| value.trim().to_string());
        }
    }
    None
}

#[cfg(not(target_os = "windows"))]
fn query_service_startup(_service_name: &str) -> Option<String> {
    None
}

#[cfg(target_os = "windows")]
fn stop_port_listener(port: u16) -> Result<(), String> {
    let command = format!(
        "$ids = @(Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort {port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); foreach ($id in $ids) {{ Stop-Process -Id $id -Force -ErrorAction Stop }}"
    );
    let mut powershell = Command::new("powershell");
    powershell.args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &command]);
    let status = powershell
        .status()
        .map_err(|error| format!("failed to stop localhost:{port}: {error}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("stop localhost:{port} exited with status {status}"))
    }
}

#[cfg(not(target_os = "windows"))]
fn stop_port_listener(_port: u16) -> Result<(), String> {
    Err("managed web UI stop is only available on Windows".into())
}

#[cfg(target_os = "windows")]
fn run_elevated_cmd_script(script: &str, label: &str) -> Result<(), String> {
    let script_path = std::env::temp_dir().join(format!(
        "kkterm-installer-service-{}-{}.cmd",
        sanitize_filename(label),
        unix_now_secs()
    ));
    std::fs::write(&script_path, script).map_err(|error| error.to_string())?;
    let script_arg = ps_single_quote(&script_path.to_string_lossy());
    let command = format!(
        "$p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/C', {script_arg}) -Verb RunAs -Wait -PassThru; exit $p.ExitCode"
    );
    let mut powershell = Command::new("powershell");
    powershell.args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        &command,
    ]);
    if let Some(path) = super::install::refreshed_path_public() {
        powershell.env("PATH", path);
    }
    let status = powershell
        .status()
        .map_err(|error| format!("failed to start elevated service helper: {error}"))?;
    let _ = std::fs::remove_file(&script_path);
    if status.success() {
        Ok(())
    } else {
        Err(format!("service helper exited with status {status}"))
    }
}

#[cfg(not(target_os = "windows"))]
fn run_elevated_cmd_script(_script: &str, _label: &str) -> Result<(), String> {
    Err("Windows service helpers are only available on Windows".into())
}

fn sanitize_filename(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_') {
                ch
            } else {
                '-'
            }
        })
        .collect()
}

fn ps_single_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

#[cfg(target_os = "windows")]
fn spawn_terminal_launcher(affordance: &TerminalLaunchAffordance) -> Result<(), String> {
    let ps_command = build_terminal_launcher_ps_command(affordance);
    let mut command = Command::new("powershell");
    command.args(["-NoExit", "-NoLogo", "-Command", &ps_command]);
    use std::os::windows::process::CommandExt;
    const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;
    command.creation_flags(CREATE_NEW_CONSOLE);
    if let Some(path) = super::install::refreshed_path_public() {
        command.env("PATH", path);
    }
    command
        .spawn()
        .map_err(|e| format!("failed to spawn terminal: {e}"))?;
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn spawn_terminal_launcher(_affordance: &TerminalLaunchAffordance) -> Result<(), String> {
    Err("terminal launcher is only available on Windows".into())
}

fn build_terminal_launcher_ps_command(affordance: &TerminalLaunchAffordance) -> String {
    let mut parts: Vec<String> = vec![
        "$host.UI.RawUI.WindowTitle = 'KKTerm terminal'".into(),
    ];
    if let Some(activate) = &affordance.activate_ps1 {
        let escaped = activate.replace('\'', "''");
        parts.push(format!("& '{escaped}'"));
    }
    parts.extend(affordance.setup_lines.iter().cloned());
    parts.push("Write-Host ''".into());
    for hint in &affordance.hints {
        let escaped = hint.replace('\'', "''");
        parts.push(format!("Write-Host '  {escaped}' -ForegroundColor Cyan"));
    }
    parts.push("Write-Host ''".into());
    let prefill_escaped = affordance.prefill.replace('\'', "''");
    parts.push(format!(
        "function global:prompt {{ if (-not $global:__kkt_pf) {{ $global:__kkt_pf = $true; [Microsoft.PowerShell.PSReadLine.PSConsoleReadLine]::Insert('{prefill_escaped}') }}; 'PS ' + (Get-Location) + '> ' }}"
    ));
    parts.join("; ")
}

#[cfg(target_os = "windows")]
fn spawn_web_ui_affordance(affordance: &WebUiAffordance) -> Result<(), String> {
    let command_line = web_ui_command_line(affordance);
    let mut command = Command::new("cmd");
    command
        .args(["/K", &web_ui_console_script(&command_line)])
        .envs(affordance.env.iter().map(|(key, value)| (*key, value)))
        .current_dir(&affordance.working_dir);
    use std::os::windows::process::CommandExt;
    const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;
    command.creation_flags(CREATE_NEW_CONSOLE);
    if let Some(path) = super::install::refreshed_path_public() {
        command.env("PATH", path);
    }
    command
        .spawn()
        .map_err(|error| format!("failed to run `{command_line}`: {error}"))?;
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn spawn_web_ui_affordance(affordance: &WebUiAffordance) -> Result<(), String> {
    Command::new(&affordance.program)
        .args(&affordance.args)
        .envs(affordance.env.iter().map(|(key, value)| (*key, value)))
        .current_dir(&affordance.working_dir)
        .spawn()
        .map_err(|error| {
            format!(
                "failed to run `{}`: {error}",
                std::iter::once(affordance.program.clone())
                    .chain(affordance.args.iter().cloned())
                    .collect::<Vec<_>>()
                    .join(" ")
            )
        })?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn web_ui_console_script(command_line: &str) -> String {
    format!("title KKTerm web tool && {command_line}")
}

#[cfg(target_os = "windows")]
fn web_ui_command_line(affordance: &WebUiAffordance) -> String {
    std::iter::once(affordance.program.as_str())
        .chain(affordance.args.iter().map(String::as_str))
        .map(quote_cmd_arg)
        .collect::<Vec<_>>()
        .join(" ")
}

fn quote_cmd_arg(arg: &str) -> String {
    if arg.is_empty()
        || arg.chars().any(|ch| {
            ch.is_whitespace()
                || matches!(
                    ch,
                    '&' | '('
                        | ')'
                        | '['
                        | ']'
                        | '{'
                        | '}'
                        | '^'
                        | '='
                        | ';'
                        | '!'
                        | '\''
                        | '+'
                        | ','
                        | '`'
                        | '~'
                )
        })
    {
        format!("\"{}\"", arg.replace('"', "\"\""))
    } else {
        arg.to_string()
    }
}

fn quote_cmd_always(arg: &str) -> String {
    format!("\"{}\"", arg.replace('"', "\"\""))
}

fn managed_ollama_program() -> String {
    let local_exe = managed_app_install_dir("ollama")
        .join("app")
        .join("ollama.exe");
    if local_exe.exists() {
        return local_exe.to_string_lossy().into_owned();
    }
    "ollama".into()
}

fn managed_uv_pip_script(tool_id: &str, script: &str) -> String {
    let venv = managed_app_install_dir(tool_id).join(".venv");
    let local_exe = if cfg!(target_os = "windows") {
        venv.join("Scripts").join(format!("{script}.exe"))
    } else {
        venv.join("bin").join(script)
    };
    local_exe.to_string_lossy().into_owned()
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
    for (program, args) in bundle_followup_install_commands(bundle_id) {
        if cancel.load(Ordering::Relaxed) {
            return Err("cancelled".into());
        }
        emit(ProgressEvent::Step {
            tool_id: bundle_id.into(),
            message: format!("{program} {}", args.join(" ")),
        });
        let args: Vec<String> = args.iter().map(|arg| (*arg).into()).collect();
        super::install::run_streamed_with_refreshed_path_public(
            program,
            &args,
            bundle_id,
            cancel.clone(),
            emit,
        )?;
    }
    Ok(None)
}

fn bundle_followup_install_commands(bundle_id: &str) -> Vec<(&'static str, Vec<&'static str>)> {
    match bundle_id {
        "node-bundle" => vec![("nvm", vec!["install", "lts"]), ("nvm", vec!["use", "lts"])],
        "python-bundle" => vec![
            ("uv", vec!["python", "install", "3.13", "--default"]),
            ("uv", vec!["python", "pin", "--global", "3.13"]),
        ],
        _ => Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn node_bundle_followup_installs_and_uses_lts() {
        let commands = bundle_followup_install_commands("node-bundle");

        assert_eq!(
            commands,
            vec![("nvm", vec!["install", "lts"]), ("nvm", vec!["use", "lts"]),]
        );
    }

    #[test]
    fn python_bundle_followup_installs_default_python_313() {
        let commands = bundle_followup_install_commands("python-bundle");

        assert_eq!(
            commands,
            vec![
                ("uv", vec!["python", "install", "3.13", "--default"]),
                ("uv", vec!["python", "pin", "--global", "3.13"]),
            ]
        );
    }

    #[test]
    fn n8n_web_ui_affordance_runs_start_and_opens_localhost() {
        let affordance = web_ui_affordance("n8n").expect("n8n should expose a web UI");

        assert_eq!(affordance.url, "http://localhost:5678");
        assert_eq!(affordance.program, "npm.cmd");
        assert!(affordance.args.iter().any(|arg| arg == "--prefix"));
        assert!(affordance.args.iter().any(|arg| arg == "n8n"));
        assert!(affordance.env.iter().any(|(key, value)| {
            *key == "N8N_USER_FOLDER" && value.ends_with(r"installer\apps\n8n\data")
        }));
    }

    #[test]
    fn requested_managed_web_apps_expose_local_web_ui_affordances() {
        let cases = [
            ("flowise", "http://localhost:3000", "flowise"),
            ("open-webui", "http://localhost:8080", "open-webui"),
            ("langflow", "http://localhost:7860", "langflow"),
            ("excalidraw", "http://localhost:3021", "vite"),
        ];

        for (tool_id, url, command_name) in cases {
            let affordance =
                web_ui_affordance(tool_id).unwrap_or_else(|| panic!("{tool_id} should run"));
            assert_eq!(affordance.url, url);
            assert!(
                affordance.program.contains(command_name)
                    || affordance.args.iter().any(|arg| arg == command_name),
                "{tool_id} should run {command_name}"
            );
        }
    }

    #[test]
    fn ollama_web_ui_affordance_runs_server_with_app_local_models() {
        let affordance = web_ui_affordance("ollama").expect("Ollama should expose a local server");

        assert_eq!(affordance.url, "http://localhost:11434");
        assert_eq!(affordance.args, vec!["serve"]);
        assert!(affordance.env.iter().any(|(key, value)| {
            *key == "OLLAMA_MODELS" && value.ends_with(r"installer\apps\ollama\data\models")
        }));
    }

    #[test]
    fn web_ui_command_line_quotes_windows_paths_with_spaces() {
        let affordance = WebUiAffordance {
            program:
                r"C:\Users\Ryan User\AppData\Local\KKTerm\installer\apps\ollama\app\ollama.exe"
                    .into(),
            args: vec!["serve".into()],
            env: vec![],
            working_dir: r"C:\Users\Ryan User\AppData\Local\KKTerm\installer\apps\ollama".into(),
            url: "http://localhost:11434",
            port: 11434,
        };

        assert_eq!(
            web_ui_command_line(&affordance),
            r#""C:\Users\Ryan User\AppData\Local\KKTerm\installer\apps\ollama\app\ollama.exe" serve"#
        );
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn web_ui_console_script_sets_title_without_start_title_ambiguity() {
        let script = web_ui_console_script(r#""npm.cmd" exec -- "vite""#);

        assert_eq!(
            script,
            r#"title KKTerm web tool && "npm.cmd" exec -- "vite""#
        );
        assert!(
            !script.starts_with("start "),
            "Run should not depend on cmd start parsing a quoted title"
        );
    }

    #[test]
    fn managed_web_ui_affordances_run_from_app_local_working_dir() {
        for tool_id in ["open-webui", "langflow", "excalidraw", "n8n", "flowise"] {
            let affordance =
                web_ui_affordance(tool_id).unwrap_or_else(|| panic!("{tool_id} should run"));

            assert!(
                affordance
                    .working_dir
                    .ends_with(&format!(r"installer\apps\{tool_id}")),
                "{tool_id} should run from its managed app directory"
            );
        }
    }

    #[test]
    fn unknown_tools_do_not_get_web_ui_affordances() {
        assert!(web_ui_affordance("git").is_none());
    }

    #[test]
    fn n8n_service_affordance_uses_managed_app_command_and_data_dir() {
        let service =
            service_affordance("n8n").expect("n8n should expose a Windows service helper");

        assert_eq!(service.service_name, "KKTerm-n8n");
        assert_eq!(service.display_name, "KKTerm n8n");
        assert_eq!(service.program, "npm.cmd");
        assert!(service.args.iter().any(|arg| arg == "--prefix"));
        assert!(service.args.iter().any(|arg| arg == "n8n"));
        assert!(service.env.iter().any(|(key, value)| {
            *key == "N8N_USER_FOLDER" && value.ends_with(r"installer\apps\n8n\data")
        }));
    }

    #[test]
    fn ollama_service_affordance_uses_app_local_models_dir() {
        let service =
            service_affordance("ollama").expect("Ollama should expose a Windows service helper");

        assert_eq!(service.service_name, "KKTerm-Ollama");
        assert_eq!(service.args, vec!["serve"]);
        assert!(service.env.iter().any(|(key, value)| {
            *key == "OLLAMA_MODELS" && value.ends_with(r"installer\apps\ollama\data\models")
        }));
    }

    #[test]
    fn managed_web_ui_apps_expose_service_affordances() {
        for tool_id in [
            "ollama",
            "n8n",
            "open-webui",
            "flowise",
            "langflow",
            "excalidraw",
        ] {
            assert!(
                service_affordance(tool_id).is_some(),
                "{tool_id} should expose a Windows service helper"
            );
        }
    }

    #[test]
    fn service_install_script_uses_nssm_and_quoted_command() {
        let service = ManagedServiceAffordance {
            service_name: "KKTerm-Test".into(),
            display_name: "KKTerm Test".into(),
            program: r"C:\Program Files\Test App\app.exe".into(),
            args: vec!["serve".into()],
            env: vec![("TEST_HOME", r"C:\Users\Ryan User\AppData\Local\Test".into())],
            working_dir: r"C:\Users\Ryan User\AppData\Local\Test".into(),
        };
        let script = service_install_script(&service);

        assert!(
            script.contains(
                r#"nssm install "KKTerm-Test" "C:\Program Files\Test App\app.exe" serve"#
            )
        );
        assert!(script.contains(
            r#"nssm set "KKTerm-Test" AppDirectory "C:\Users\Ryan User\AppData\Local\Test""#
        ));
        assert!(script.contains(
            r#"if not exist "C:\Users\Ryan User\AppData\Local\Test\logs" mkdir "C:\Users\Ryan User\AppData\Local\Test\logs""#
        ));
        assert!(script.contains(
            r#"nssm set "KKTerm-Test" AppStdout "C:\Users\Ryan User\AppData\Local\Test\logs\KKTerm-Test.stdout.log""#
        ));
        assert!(script.contains(
            r#"nssm set "KKTerm-Test" AppStderr "C:\Users\Ryan User\AppData\Local\Test\logs\KKTerm-Test.stderr.log""#
        ));
        assert!(script.contains(r#"nssm set "KKTerm-Test" AppEnvironmentExtra "TEST_HOME=C:\Users\Ryan User\AppData\Local\Test""#));
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn service_install_script_resolves_npm_cmd_before_registering_service() {
        let service = ManagedServiceAffordance {
            service_name: "KKTerm-Test".into(),
            display_name: "KKTerm Test".into(),
            program: npm_program().into(),
            args: vec!["exec".into(), "--".into(), "vite".into()],
            env: vec![],
            working_dir: r"C:\Users\Ryan User\AppData\Local\Test".into(),
        };
        let script = service_install_script(&service);

        assert!(script.contains(r#"for %%I in (npm.cmd) do set "KKTERM_SERVICE_APP=%%~$PATH:I""#));
        assert!(
            script.contains(r#"nssm install "KKTerm-Test" "%KKTERM_SERVICE_APP%" exec -- vite"#)
        );
        assert!(!script.contains(r#"nssm install "KKTerm-Test" npm.cmd"#));
    }

    #[test]
    fn service_install_script_registers_auto_start_without_immediate_start() {
        let service = ManagedServiceAffordance {
            service_name: "KKTerm-Test".into(),
            display_name: "KKTerm Test".into(),
            program: "test.exe".into(),
            args: vec![],
            env: vec![],
            working_dir: r"C:\Test".into(),
        };
        let script = service_install_script(&service);

        assert!(script.contains(r#"nssm set "KKTerm-Test" Start SERVICE_AUTO_START"#));
        assert!(script.contains(r#"nssm set "KKTerm-Test" AppExit Default Exit"#));
        assert!(
            !script.contains(r#"nssm start "KKTerm-Test""#),
            "registration must not start the service while the normal run mode may already own the fixed localhost port"
        );
    }
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
