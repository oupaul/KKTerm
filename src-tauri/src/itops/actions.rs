// IT Ops Automation action executor (docs/ITOPS.md Phase 4). Installed as the
// WatchdogRegistry trigger hook: when an Automation's Watchdog fires, run the
// Automation's ordered action list. Runs on the Watchdog poll thread, so it
// spawns a worker and returns fast — action I/O never blocks the poll loop.
//
// Keeping the executor here (not in the watchdog module) keeps the dependency
// one-way (`itops` -> `watchdog`); the watchdog only holds a type-erased hook.

use serde_json::{Value, json};
use tauri::{AppHandle, Emitter, Manager};

use crate::secrets;

use super::automation_commands::ItopsAutomationRuntime;
use super::automation_storage as auto_store;
use super::types::{Automation, AutomationAction};

/// Entry point installed as the trigger hook. Correlates the firing Watchdog to
/// its Automation and runs the action list on a worker thread.
pub fn on_watchdog_trigger(app: &AppHandle, watchdog_id: &str, value: &Value) {
    let Some(automation_id) = app
        .state::<ItopsAutomationRuntime>()
        .automation_for_watchdog(watchdog_id)
    else {
        return;
    };
    let app = app.clone();
    let value = value.clone();
    std::thread::spawn(move || {
        let automation = app
            .state::<crate::storage::Storage>()
            .with_connection_infallible(|conn| {
                auto_store::get_automation(conn, &automation_id).ok().flatten()
            });
        let Some(automation) = automation else {
            return;
        };
        if !automation.enabled {
            return;
        }
        for action in &automation.actions {
            run_action(&app, &automation, action, &value);
        }
    });
}

fn run_action(app: &AppHandle, automation: &Automation, action: &AutomationAction, value: &Value) {
    match action {
        AutomationAction::Notify { level } => {
            emit_action(
                app,
                automation,
                json!({ "kind": "notify", "level": level, "value": value }),
            );
        }
        AutomationAction::Popup { title, body } => {
            emit_action(
                app,
                automation,
                json!({ "kind": "popup", "title": title, "body": body, "value": value }),
            );
        }
        AutomationAction::Email { to, subject, body } => {
            run_email(app, automation, to, subject, body);
        }
        AutomationAction::Webhook { url, method, body } => {
            run_webhook(url, method, body.as_deref());
        }
        AutomationAction::RunBatch {
            site_id,
            task,
        } => {
            if let Err(error) =
                super::commands::start_run(app, site_id.clone(), task.clone(), None)
            {
                eprintln!(
                    "IT Ops automation {} runBatch failed: {error}",
                    automation.id
                );
            }
        }
    }
}

/// Surface a notify/popup action to the frontend on `itops://automation`. The
/// module shows a status-bar notice for notify and an app-owned dialog for popup.
fn emit_action(app: &AppHandle, automation: &Automation, mut payload: Value) {
    if let Value::Object(map) = &mut payload {
        map.insert("automationId".into(), json!(automation.id));
        map.insert("automationName".into(), json!(automation.name));
    }
    let _ = app.emit("itops://automation", payload);
}

fn run_email(app: &AppHandle, automation: &Automation, to: &[String], subject: &str, body: &str) {
    let mut settings = match app.state::<crate::storage::Storage>().ai_provider_settings() {
        Ok(settings) => settings,
        Err(error) => {
            eprintln!(
                "IT Ops automation {} email: settings load failed: {error}",
                automation.id
            );
            return;
        }
    };
    if let Ok(password) = app
        .state::<secrets::Secrets>()
        .read_email_smtp_password(crate::storage::EMAIL_SMTP_SECRET_OWNER_ID.to_string())
    {
        settings.set_email_secret(password);
    }
    let result = crate::ai::email::send_plain_email(&settings, to, subject, body);
    if result.contains("\"ok\":false") {
        eprintln!("IT Ops automation {} email failed: {result}", automation.id);
    }
}

fn run_webhook(url: &str, method: &str, body: Option<&str>) {
    let runtime = match tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
    {
        Ok(runtime) => runtime,
        Err(_) => return,
    };
    let url = url.to_string();
    let method = method.to_string();
    let body = body.map(str::to_string);
    runtime.block_on(async move {
        let client = crate::net::proxy::apply_async(reqwest::Client::builder())
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        let method = reqwest::Method::from_bytes(method.as_bytes()).unwrap_or(reqwest::Method::POST);
        let mut request = client.request(method, &url);
        if let Some(body) = body {
            request = request.header("content-type", "application/json").body(body);
        }
        if let Err(error) = request.send().await {
            eprintln!("IT Ops automation webhook to {url} failed: {error}");
        }
    });
}
