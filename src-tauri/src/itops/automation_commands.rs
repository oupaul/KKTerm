// IT Ops Automation commands + runtime (docs/ITOPS.md Phase 3). An Automation is
// the durable definition; the live Watchdog is its runtime. Enabling an
// Automation arms a Watchdog in the existing WatchdogRegistry; disabling cancels
// it. Enabled Automations are re-armed at launch by `hydrate_automations`.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Manager, State};

use crate::watchdog::WatchdogRegistry;
use crate::watchdog::types::WatchdogConfig;

use super::automation_storage as auto_store;
use super::ids::new_itops_id;
use super::types::{Automation, AutomationAction};

/// In-memory map from a durable Automation to its live Watchdog id. Live state
/// only — never persisted (the durable definition is the Automation row).
#[derive(Default)]
pub struct ItopsAutomationRuntime {
    armed: Mutex<HashMap<String, String>>,
}

impl ItopsAutomationRuntime {
    /// Arm (or re-arm) an Automation: cancel any existing live Watchdog for it,
    /// then create a fresh one from its config.
    pub fn arm(
        &self,
        app: &AppHandle,
        registry: &Arc<WatchdogRegistry>,
        automation: &Automation,
    ) -> Result<(), String> {
        self.disarm(registry, &automation.id);
        let mut config = automation.config.clone();
        config.name = automation.name.clone(); // keep the Watchdog label in sync
        let summary =
            WatchdogRegistry::create(registry, app, config).map_err(|error| format!("{error:?}"))?;
        self.armed
            .lock()
            .unwrap()
            .insert(automation.id.clone(), summary.id);
        Ok(())
    }

    pub fn disarm(&self, registry: &Arc<WatchdogRegistry>, automation_id: &str) {
        if let Some(watchdog_id) = self.armed.lock().unwrap().remove(automation_id) {
            let _ = registry.cancel(&watchdog_id);
        }
    }

    /// Which Automation owns this live Watchdog (reverse of the armed map). Used
    /// by the action executor to find the action list when a Watchdog fires.
    pub fn automation_for_watchdog(&self, watchdog_id: &str) -> Option<String> {
        self.armed
            .lock()
            .unwrap()
            .iter()
            .find_map(|(automation_id, armed_watchdog)| {
                (armed_watchdog == watchdog_id).then(|| automation_id.clone())
            })
    }
}

/// Install the WatchdogRegistry trigger hook so a firing Watchdog runs its
/// Automation's action list. Called once at startup.
pub fn install_trigger_hook(app: &AppHandle) {
    let registry = app.state::<Arc<WatchdogRegistry>>();
    let hook_app = app.clone();
    registry.set_trigger_hook(Arc::new(
        move |watchdog_id: &str, value: &serde_json::Value| {
            super::actions::on_watchdog_trigger(&hook_app, watchdog_id, value);
        },
    ));
}

fn storage(app: &AppHandle) -> State<'_, crate::storage::Storage> {
    app.state::<crate::storage::Storage>()
}

/// Re-arm every enabled Automation into the live WatchdogRegistry at launch.
/// Runs on the async runtime so the Watchdog poll tasks spawn in a tokio context.
pub fn hydrate_automations(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let automations = app
            .state::<crate::storage::Storage>()
            .with_connection_infallible(|conn| {
                auto_store::list_automations(conn).unwrap_or_default()
            });
        let runtime = app.state::<ItopsAutomationRuntime>();
        let registry = app.state::<Arc<WatchdogRegistry>>();
        for automation in automations.into_iter().filter(|automation| automation.enabled) {
            if let Err(error) = runtime.arm(&app, &registry, &automation) {
                eprintln!("failed to arm IT Ops automation {}: {error}", automation.id);
            }
        }
    });
}

#[tauri::command]
pub fn itops_list_automations(app: AppHandle) -> Result<Vec<Automation>, String> {
    storage(&app).with_connection_infallible(|conn| {
        auto_store::list_automations(conn).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn itops_create_automation(
    app: AppHandle,
    registry: State<'_, Arc<WatchdogRegistry>>,
    runtime: State<'_, ItopsAutomationRuntime>,
    name: String,
    config: WatchdogConfig,
    actions: Vec<AutomationAction>,
    enabled: bool,
) -> Result<Automation, String> {
    let id = new_itops_id("auto");
    let automation = storage(&app).with_connection_infallible(|conn| {
        auto_store::create_automation(conn, &id, &name, &config, &actions, enabled)
            .map_err(|error| error.to_string())
    })?;
    if automation.enabled {
        runtime.arm(&app, &registry, &automation)?;
    }
    Ok(automation)
}

#[tauri::command]
pub fn itops_update_automation(
    app: AppHandle,
    registry: State<'_, Arc<WatchdogRegistry>>,
    runtime: State<'_, ItopsAutomationRuntime>,
    id: String,
    name: String,
    config: WatchdogConfig,
    actions: Vec<AutomationAction>,
) -> Result<Automation, String> {
    let automation = storage(&app).with_connection_infallible(|conn| {
        auto_store::update_automation(conn, &id, &name, &config, &actions)
            .map_err(|error| error.to_string())
    })?;
    if automation.enabled {
        runtime.arm(&app, &registry, &automation)?;
    } else {
        runtime.disarm(&registry, &automation.id);
    }
    Ok(automation)
}

#[tauri::command]
pub fn itops_set_automation_enabled(
    app: AppHandle,
    registry: State<'_, Arc<WatchdogRegistry>>,
    runtime: State<'_, ItopsAutomationRuntime>,
    id: String,
    enabled: bool,
) -> Result<Automation, String> {
    let automation = storage(&app).with_connection_infallible(|conn| {
        auto_store::set_automation_enabled(conn, &id, enabled).map_err(|error| error.to_string())
    })?;
    if automation.enabled {
        runtime.arm(&app, &registry, &automation)?;
    } else {
        runtime.disarm(&registry, &automation.id);
    }
    Ok(automation)
}

#[tauri::command]
pub fn itops_remove_automation(
    app: AppHandle,
    registry: State<'_, Arc<WatchdogRegistry>>,
    runtime: State<'_, ItopsAutomationRuntime>,
    id: String,
) -> Result<(), String> {
    runtime.disarm(&registry, &id);
    storage(&app).with_connection_infallible(|conn| {
        auto_store::remove_automation(conn, &id).map_err(|error| error.to_string())
    })
}
