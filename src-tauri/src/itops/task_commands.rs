// Tauri commands for the global IT Ops Task Library.

use tauri::{AppHandle, Manager};

use super::ids::new_itops_id;
use super::task_storage;
use super::types::{BatchTask, ItopsTask};

#[tauri::command]
pub fn itops_list_tasks(app: AppHandle) -> Result<Vec<ItopsTask>, String> {
    app.state::<crate::storage::Storage>()
        .with_connection_infallible(|conn| {
            task_storage::list_tasks(conn).map_err(|error| error.to_string())
        })
}

#[tauri::command]
pub fn itops_create_task(
    app: AppHandle,
    name: String,
    description: String,
    task: BatchTask,
) -> Result<ItopsTask, String> {
    let id = new_itops_id("task");
    app.state::<crate::storage::Storage>()
        .with_connection_infallible(|conn| {
            task_storage::create_task(conn, &id, &name, &description, &task)
                .map_err(|error| error.to_string())
        })
}

#[tauri::command]
pub fn itops_update_task(
    app: AppHandle,
    id: String,
    name: String,
    description: String,
    task: BatchTask,
) -> Result<ItopsTask, String> {
    let (updated, removed_secret_ids) = app
        .state::<crate::storage::Storage>()
        .with_connection_infallible(|conn| {
            let existing = task_storage::get_task(conn, &id)
                .map_err(|error| error.to_string())?
                .ok_or_else(|| "task not found".to_string())?;
            let next_ids = task.secret_owner_ids();
            let removed = existing
                .task
                .secret_owner_ids()
                .into_iter()
                .filter(|owner_id| !next_ids.contains(owner_id))
                .collect::<Vec<_>>();
            let updated = task_storage::update_task(conn, &id, &name, &description, &task)
                .map_err(|error| error.to_string())?;
            Ok::<_, String>((updated, removed))
        })?;
    let secrets = app.state::<crate::secrets::Secrets>();
    for owner_id in removed_secret_ids {
        let _ = secrets.delete_itops_task_secret(owner_id);
    }
    Ok(updated)
}

#[tauri::command]
pub fn itops_remove_task(app: AppHandle, id: String) -> Result<(), String> {
    let secret_ids = app
        .state::<crate::storage::Storage>()
        .with_connection_infallible(|conn| {
            let existing = task_storage::get_task(conn, &id)
                .map_err(|error| error.to_string())?
                .ok_or_else(|| "task not found".to_string())?;
            task_storage::remove_task(conn, &id).map_err(|error| error.to_string())?;
            Ok::<_, String>(existing.task.secret_owner_ids())
        })?;
    let secrets = app.state::<crate::secrets::Secrets>();
    for owner_id in secret_ids {
        let _ = secrets.delete_itops_task_secret(owner_id);
    }
    Ok(())
}
