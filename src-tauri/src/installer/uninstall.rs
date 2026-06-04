// Per-provider uninstall. Mirrors install.rs.
//
// Reverse-DAG safety (refusing to uninstall a tool that has installed
// dependents) is enforced at the command layer, not here.

use std::sync::Arc;
use std::sync::atomic::AtomicBool;

use serde_json::json;

use super::detect::github_release_install_dir;
use super::events::ProgressEvent;
use super::install::EventSink;
use super::managed_app::{is_managed_app, managed_app_install_dir};
use super::proc::npm_program;
use super::schema::{Provider, Recipe};

pub fn uninstall_recipe(
    recipe: &Recipe,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<(), String> {
    crate::logging::installer_helper_debug(
        "uninstall.recipe.start",
        &json!({ "toolId": recipe.id, "provider": provider_kind(&recipe.provider) }),
    );
    let result = if recipe.id == "n8n" {
        uninstall_managed_app(&recipe.id, emit)
    } else if recipe.id == "ollama" {
        if let Provider::Winget { id } = &recipe.provider {
            uninstall_winget(&recipe.id, id, cancel, emit)
                .and_then(|_| uninstall_managed_app(&recipe.id, emit))
        } else {
            uninstall_recipe_by_provider(recipe, cancel, emit)
        }
    } else if is_managed_app(&recipe.id) {
        uninstall_managed_app(&recipe.id, emit)
    } else {
        uninstall_recipe_by_provider(recipe, cancel, emit)
    };
    match &result {
        Ok(()) => crate::logging::installer_helper_debug(
            "uninstall.recipe.ok",
            &json!({ "toolId": recipe.id }),
        ),
        Err(error) => crate::logging::installer_helper_debug(
            "uninstall.recipe.error",
            &json!({ "toolId": recipe.id, "error": error }),
        ),
    }
    result
}

fn uninstall_recipe_by_provider(
    recipe: &Recipe,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<(), String> {
    match &recipe.provider {
        Provider::Winget { id } => uninstall_winget(&recipe.id, id, cancel, emit),
        Provider::Npm { pkg } => uninstall_npm(&recipe.id, pkg, cancel, emit),
        Provider::UvPip { package } => uninstall_uv_pip(&recipe.id, package, cancel, emit),
        Provider::DownloadInstaller { .. } => Err(
            "this tool uses its vendor desktop installer; uninstall it from Windows Settings"
                .into(),
        ),
        Provider::GithubRelease { .. } => uninstall_github_release(&recipe.id, emit),
        Provider::WindowsFeature { feature, .. } => {
            uninstall_windows_feature(&recipe.id, feature, cancel, emit)
        }
        Provider::WslDistro { distro } => uninstall_wsl_distro(&recipe.id, distro, cancel, emit),
        Provider::Bundle { .. } => Err(
            "bundles must be expanded into step recipes before uninstall_recipe; see commands.rs"
                .into(),
        ),
    }
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

fn uninstall_uv_pip(
    tool_id: &str,
    package: &str,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<(), String> {
    emit(ProgressEvent::Step {
        tool_id: tool_id.into(),
        message: format!("uv pip uninstall {package}"),
    });
    super::install::run_streamed_with_refreshed_path_public(
        "uv",
        &[
            "pip".into(),
            "uninstall".into(),
            "--system".into(),
            package.into(),
            "-y".into(),
        ],
        tool_id,
        cancel,
        emit,
    )
}

fn uninstall_managed_app(tool_id: &str, emit: &EventSink) -> Result<(), String> {
    let dir = managed_app_install_dir(tool_id);
    emit(ProgressEvent::Step {
        tool_id: tool_id.into(),
        message: format!("Removing {}", dir.display()),
    });
    if dir.exists() {
        std::fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(())
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
            "--verbose-logs".into(),
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
    super::install::run_streamed_with_refreshed_path_public(
        npm_program(),
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

fn uninstall_wsl_distro(
    tool_id: &str,
    distro: &str,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<(), String> {
    emit(ProgressEvent::Step {
        tool_id: tool_id.into(),
        message: format!("wsl --unregister {distro}"),
    });
    super::install::run_streamed_public(
        "wsl",
        &["--unregister".into(), distro.into()],
        tool_id,
        cancel,
        emit,
    )
}
