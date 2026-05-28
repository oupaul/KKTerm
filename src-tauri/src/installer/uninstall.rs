// Per-provider uninstall. Mirrors install.rs.
//
// Reverse-DAG safety (refusing to uninstall a tool that has installed
// dependents) is enforced at the command layer, not here.

use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use super::detect::github_release_install_dir;
use super::events::ProgressEvent;
use super::install::EventSink;
use super::schema::{Provider, Recipe};

pub fn uninstall_recipe(
    recipe: &Recipe,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<(), String> {
    match &recipe.provider {
        Provider::Winget { id } => uninstall_winget(&recipe.id, id, cancel, emit),
        Provider::Npm { pkg } => uninstall_npm(&recipe.id, pkg, cancel, emit),
        Provider::GithubRelease { .. } => uninstall_github_release(&recipe.id, emit),
        Provider::WindowsFeature { feature, .. } => {
            uninstall_windows_feature(&recipe.id, feature, cancel, emit)
        }
        Provider::Bundle { .. } => Err(
            "bundles must be expanded into step recipes before uninstall_recipe; see commands.rs"
                .into(),
        ),
    }
}

fn uninstall_winget(
    tool_id: &str,
    winget_id: &str,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<(), String> {
    emit(ProgressEvent::Step {
        tool_id: tool_id.into(),
        message: format!("winget uninstall --id {winget_id}"),
    });
    super::install::run_streamed_public(
        "winget",
        &[
            "uninstall".into(),
            "--id".into(),
            winget_id.into(),
            "--exact".into(),
            "--silent".into(),
            "--accept-source-agreements".into(),
            "--disable-interactivity".into(),
        ],
        tool_id,
        cancel,
        emit,
    )
}

fn uninstall_npm(
    tool_id: &str,
    pkg: &str,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<(), String> {
    emit(ProgressEvent::Step {
        tool_id: tool_id.into(),
        message: format!("npm uninstall -g {pkg}"),
    });
    super::install::run_streamed_public(
        "npm",
        &["uninstall".into(), "-g".into(), pkg.into()],
        tool_id,
        cancel,
        emit,
    )
}

fn uninstall_github_release(tool_id: &str, emit: &EventSink) -> Result<(), String> {
    let dir = github_release_install_dir(tool_id);
    emit(ProgressEvent::Step {
        tool_id: tool_id.into(),
        message: format!("Removing {}", dir.display()),
    });
    if dir.exists() {
        std::fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn uninstall_windows_feature(
    tool_id: &str,
    feature: &str,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<(), String> {
    emit(ProgressEvent::Step {
        tool_id: tool_id.into(),
        message: format!("dism /online /disable-feature /featurename:{feature}"),
    });
    super::install::run_streamed_public(
        "dism",
        &[
            "/online".into(),
            "/disable-feature".into(),
            format!("/featurename:{feature}"),
            "/norestart".into(),
            "/english".into(),
        ],
        tool_id,
        cancel,
        emit,
    )
}
