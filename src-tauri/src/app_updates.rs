use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;
#[cfg(target_os = "windows")]
use std::process::Command;
use std::time::Duration;
use tauri::Manager;
use url::Url;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadAndInstallAppUpdateRequest {
    version: String,
    asset_name: String,
    download_url: String,
    checksum_url: String,
}

#[tauri::command]
pub fn get_app_update_target_triple() -> String {
    app_update_target_triple().to_string()
}

#[tauri::command]
pub async fn download_and_install_app_update(
    app: tauri::AppHandle,
    request: DownloadAndInstallAppUpdateRequest,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        download_and_install_app_update_sync(&app, request)
    })
    .await
    .map_err(|error| format!("update install task failed: {error}"))?
}

fn download_and_install_app_update_sync(
    app: &tauri::AppHandle,
    request: DownloadAndInstallAppUpdateRequest,
) -> Result<(), String> {
    validate_update_request(&request)?;

    let update_dir = app
        .path()
        .app_cache_dir()
        .map_err(|error| format!("failed to resolve app cache directory: {error}"))?
        .join("updates");
    fs::create_dir_all(&update_dir).map_err(|error| {
        format!(
            "failed to create update download directory {}: {error}",
            update_dir.display()
        )
    })?;

    let installer_path = update_dir.join(&request.asset_name);
    let checksum = download_text(&request.checksum_url)?;
    let expected_sha256 = parse_sha256(&checksum)?;
    download_file(&request.download_url, &installer_path)?;

    let actual_sha256 = sha256_file(&installer_path)?;
    if !actual_sha256.eq_ignore_ascii_case(&expected_sha256) {
        let _ = fs::remove_file(&installer_path);
        return Err("downloaded installer checksum did not match release metadata".into());
    }

    spawn_installer_after_exit(&installer_path, std::process::id())?;
    app.exit(0);
    Ok(())
}

fn app_update_target_triple() -> &'static str {
    #[cfg(target_arch = "aarch64")]
    {
        "windows-arm64"
    }
    #[cfg(not(target_arch = "aarch64"))]
    {
        "windows-x64"
    }
}

fn validate_update_request(request: &DownloadAndInstallAppUpdateRequest) -> Result<(), String> {
    if !request
        .version
        .chars()
        .all(|ch| ch.is_ascii_digit() || ch == '.')
    {
        return Err("update version must contain only digits and dots".into());
    }

    let expected_name = format!(
        "kkterm-{}-{}-setup.exe",
        request.version,
        app_update_target_triple()
    );
    if request.asset_name != expected_name {
        return Err(format!(
            "update installer asset must be named {expected_name}"
        ));
    }

    validate_github_release_url(&request.download_url, &request.asset_name)?;
    validate_github_release_url(
        &request.checksum_url,
        &format!("{}.sha256", request.asset_name),
    )?;
    Ok(())
}

fn validate_github_release_url(url: &str, expected_file_name: &str) -> Result<(), String> {
    let parsed = Url::parse(url).map_err(|error| format!("invalid update URL: {error}"))?;
    if parsed.scheme() != "https" || parsed.host_str() != Some("github.com") {
        return Err("update assets must be downloaded from https://github.com".into());
    }

    let path = parsed.path();
    if !path.starts_with("/ryantsai/KKTerm/releases/download/") {
        return Err("update assets must come from KKTerm GitHub Releases".into());
    }
    if !path.ends_with(&format!("/{expected_file_name}")) {
        return Err(format!(
            "update asset URL must end with {expected_file_name}"
        ));
    }

    Ok(())
}

fn http_client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .user_agent("KKTerm-Updater/1")
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|error| format!("failed to build update HTTP client: {error}"))
}

fn download_text(url: &str) -> Result<String, String> {
    http_client()?
        .get(url)
        .send()
        .map_err(|error| format!("failed to download update checksum: {error}"))?
        .error_for_status()
        .map_err(|error| format!("failed to download update checksum: {error}"))?
        .text()
        .map_err(|error| format!("failed to read update checksum: {error}"))
}

fn download_file(url: &str, destination: &Path) -> Result<(), String> {
    let bytes = http_client()?
        .get(url)
        .send()
        .map_err(|error| format!("failed to download update installer: {error}"))?
        .error_for_status()
        .map_err(|error| format!("failed to download update installer: {error}"))?
        .bytes()
        .map_err(|error| format!("failed to read update installer: {error}"))?;

    fs::write(destination, bytes).map_err(|error| {
        format!(
            "failed to write update installer {}: {error}",
            destination.display()
        )
    })
}

fn parse_sha256(value: &str) -> Result<String, String> {
    let hash = value
        .split_whitespace()
        .find(|part| part.len() == 64 && part.chars().all(|ch| ch.is_ascii_hexdigit()))
        .ok_or_else(|| "release checksum file did not contain a SHA-256 hash".to_string())?;
    Ok(hash.to_ascii_lowercase())
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|error| {
        format!(
            "failed to read downloaded installer {}: {error}",
            path.display()
        )
    })?;
    let digest = Sha256::digest(&bytes);
    Ok(format!("{digest:x}"))
}

#[cfg(target_os = "windows")]
fn spawn_installer_after_exit(installer_path: &Path, parent_pid: u32) -> Result<(), String> {
    let installer = ps_single_quote(&installer_path.to_string_lossy());
    let command = format!(
        "Wait-Process -Id {parent_pid} -Timeout 30 -ErrorAction SilentlyContinue; Start-Process -FilePath {installer}"
    );
    let mut powershell = Command::new("powershell");
    powershell.args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-WindowStyle",
        "Hidden",
        "-Command",
        &command,
    ]);
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    powershell.creation_flags(CREATE_NO_WINDOW);
    powershell
        .spawn()
        .map_err(|error| format!("failed to start update installer handoff: {error}"))?;
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn spawn_installer_after_exit(_installer_path: &Path, _parent_pid: u32) -> Result<(), String> {
    Err("download and install is only available for Windows installers".into())
}

#[cfg(target_os = "windows")]
fn ps_single_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_sha256_accepts_release_checksum_format() {
        let hash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        assert_eq!(
            parse_sha256(&format!("{hash}  kkterm-0.1.54-windows-x64-setup.exe")).unwrap(),
            hash
        );
    }

    #[test]
    fn validate_update_request_rejects_non_github_url() {
        let request = DownloadAndInstallAppUpdateRequest {
            version: "0.1.54".into(),
            asset_name: format!("kkterm-0.1.54-{}-setup.exe", app_update_target_triple()),
            download_url: "https://example.com/installer.exe".into(),
            checksum_url: "https://example.com/installer.exe.sha256".into(),
        };
        assert!(validate_update_request(&request).is_err());
    }
}
