use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
#[cfg(target_os = "windows")]
use std::process::Command;
use std::sync::{
    Arc, LazyLock, Mutex,
    atomic::{AtomicBool, Ordering},
};
use std::time::Duration;
use tauri::{Emitter, Manager};
use url::Url;

const APP_UPDATE_PROGRESS_EVENT: &str = "app-update-download-progress";
static DOWNLOAD_CANCELLATIONS: LazyLock<Mutex<HashMap<String, Arc<AtomicBool>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadAndInstallAppUpdateRequest {
    version: String,
    asset_name: String,
    download_url: String,
    checksum_url: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppUpdateDownloadProgress {
    job_id: String,
    transferred_bytes: u64,
    total_bytes: u64,
    progress: u8,
}

#[tauri::command]
pub fn get_app_update_target_triple() -> String {
    app_update_target_triple().to_string()
}

#[tauri::command]
pub async fn download_app_update(
    app: tauri::AppHandle,
    job_id: String,
    request: DownloadAndInstallAppUpdateRequest,
) -> Result<(), String> {
    validate_job_id(&job_id)?;
    let cancellation = DOWNLOAD_CANCELLATIONS
        .lock()
        .map_err(|_| "update cancellation registry is unavailable".to_string())?
        .entry(job_id.clone())
        .or_insert_with(|| Arc::new(AtomicBool::new(false)))
        .clone();

    let task_job_id = job_id.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        download_app_update_sync(&app, &task_job_id, request, &cancellation)
    })
    .await
    .map_err(|error| format!("update download task failed: {error}"))?;
    if let Ok(mut downloads) = DOWNLOAD_CANCELLATIONS.lock() {
        downloads.remove(&job_id);
    }
    result
}

#[tauri::command]
pub fn cancel_app_update_download(job_id: String) -> Result<(), String> {
    validate_job_id(&job_id)?;
    let cancellation = DOWNLOAD_CANCELLATIONS
        .lock()
        .map_err(|_| "update cancellation registry is unavailable".to_string())?
        .entry(job_id)
        .or_insert_with(|| Arc::new(AtomicBool::new(true)))
        .clone();
    cancellation.store(true, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub fn install_downloaded_app_update(
    app: tauri::AppHandle,
    request: DownloadAndInstallAppUpdateRequest,
) -> Result<(), String> {
    validate_update_request(&request)?;
    let installer_path = update_installer_path(&app, &request.asset_name)?;
    let checksum_urls = update_asset_urls(
        &request.checksum_url,
        &request.version,
        &format!("{}.sha256", request.asset_name),
    )?;
    let checksum = download_text_from_any(&checksum_urls)?;
    let expected_sha256 = parse_sha256(&checksum)?;
    let actual_sha256 = sha256_file(&installer_path)?;
    if !actual_sha256.eq_ignore_ascii_case(&expected_sha256) {
        let _ = fs::remove_file(&installer_path);
        return Err("downloaded installer checksum did not match release metadata".into());
    }

    spawn_installer_after_exit(&installer_path, std::process::id())?;
    app.exit(0);
    Ok(())
}

fn download_app_update_sync(
    app: &tauri::AppHandle,
    job_id: &str,
    request: DownloadAndInstallAppUpdateRequest,
    cancellation: &AtomicBool,
) -> Result<(), String> {
    validate_update_request(&request)?;
    let installer_path = update_installer_path(app, &request.asset_name)?;
    let checksum_urls = update_asset_urls(
        &request.checksum_url,
        &request.version,
        &format!("{}.sha256", request.asset_name),
    )?;
    let checksum = download_text_from_any(&checksum_urls)?;
    let expected_sha256 = parse_sha256(&checksum)?;
    let download_urls =
        update_asset_urls(&request.download_url, &request.version, &request.asset_name)?;

    let result = download_file_from_any(app, job_id, &download_urls, &installer_path, cancellation)
        .and_then(|_| {
            let actual_sha256 = sha256_file(&installer_path)?;
            if actual_sha256.eq_ignore_ascii_case(&expected_sha256) {
                Ok(())
            } else {
                Err("downloaded installer checksum did not match release metadata".into())
            }
        });

    if result.is_err() {
        let _ = fs::remove_file(&installer_path);
    }
    result
}

fn update_installer_path(app: &tauri::AppHandle, asset_name: &str) -> Result<PathBuf, String> {
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
    Ok(update_dir.join(asset_name))
}

fn validate_job_id(job_id: &str) -> Result<(), String> {
    if job_id.is_empty()
        || job_id.len() > 64
        || !job_id
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-')
    {
        return Err("update download job id is invalid".into());
    }
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

    validate_update_asset_url(&request.download_url, &request.version, &request.asset_name)?;
    validate_update_asset_url(
        &request.checksum_url,
        &request.version,
        &format!("{}.sha256", request.asset_name),
    )?;
    Ok(())
}

fn update_asset_urls(
    primary_url: &str,
    version: &str,
    expected_file_name: &str,
) -> Result<Vec<String>, String> {
    validate_update_asset_url(primary_url, version, expected_file_name)?;
    let parsed = Url::parse(primary_url).map_err(|error| format!("invalid update URL: {error}"))?;
    let fallback_url = match parsed.host_str() {
        Some("github.com") => Some(format!(
            "https://kkterm.ryantsai.com/releases/v{version}/{expected_file_name}"
        )),
        Some("kkterm.ryantsai.com") => Some(format!(
            "https://github.com/ryantsai/KKTerm/releases/download/v{version}/{expected_file_name}"
        )),
        _ => None,
    };
    let mut urls = vec![primary_url.to_string()];
    if let Some(fallback_url) = fallback_url {
        if fallback_url != primary_url {
            urls.push(fallback_url);
        }
    }
    Ok(urls)
}

fn validate_update_asset_url(
    url: &str,
    version: &str,
    expected_file_name: &str,
) -> Result<(), String> {
    let parsed = Url::parse(url).map_err(|error| format!("invalid update URL: {error}"))?;
    if parsed.scheme() != "https" {
        return Err("update assets must be downloaded over HTTPS".into());
    }

    let path = parsed.path();
    let trusted_source = match parsed.host_str() {
        Some("github.com") => {
            path.starts_with(&format!("/ryantsai/KKTerm/releases/download/v{version}/"))
        }
        Some("kkterm.ryantsai.com") => path.starts_with(&format!("/releases/v{version}/")),
        _ => false,
    };
    if !trusted_source {
        return Err(
            "update assets must come from KKTerm Releases or the KKTerm release mirror".into(),
        );
    }
    if !path.ends_with(&format!("/{expected_file_name}")) {
        return Err(format!(
            "update asset URL must end with {expected_file_name}"
        ));
    }

    Ok(())
}

fn http_client() -> Result<reqwest::blocking::Client, String> {
    crate::net::proxy::apply_blocking(reqwest::blocking::Client::builder())
        .user_agent("KKTerm-Updater/1")
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|error| format!("failed to build update HTTP client: {error}"))
}

fn download_text_from_any(urls: &[String]) -> Result<String, String> {
    let mut last_error = None;
    for url in urls {
        match download_text(url) {
            Ok(value) => return Ok(value),
            Err(error) => last_error = Some(error),
        }
    }
    Err(last_error.unwrap_or_else(|| "no update checksum URL was available".into()))
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

fn download_file_from_any(
    app: &tauri::AppHandle,
    job_id: &str,
    urls: &[String],
    destination: &Path,
    cancellation: &AtomicBool,
) -> Result<(), String> {
    let mut last_error = None;
    for url in urls {
        match download_file(app, job_id, url, destination, cancellation) {
            Ok(()) => return Ok(()),
            Err(error) if error.contains("app update download cancelled") => return Err(error),
            Err(error) => {
                let _ = fs::remove_file(destination);
                last_error = Some(error);
            }
        }
    }
    Err(last_error.unwrap_or_else(|| "no update installer URL was available".into()))
}

fn download_file(
    app: &tauri::AppHandle,
    job_id: &str,
    url: &str,
    destination: &Path,
    cancellation: &AtomicBool,
) -> Result<(), String> {
    if cancellation.load(Ordering::Relaxed) {
        return Err("app update download cancelled".into());
    }
    let mut response = http_client()?
        .get(url)
        .send()
        .map_err(|error| format!("failed to download update installer: {error}"))?
        .error_for_status()
        .map_err(|error| format!("failed to download update installer: {error}"))?;
    let total_bytes = response.content_length().unwrap_or(0);
    let mut file = fs::File::create(destination).map_err(|error| {
        format!(
            "failed to create update installer {}: {error}",
            destination.display()
        )
    })?;
    let mut transferred_bytes = 0_u64;
    let mut buffer = [0_u8; 64 * 1024];

    loop {
        if cancellation.load(Ordering::Relaxed) {
            return Err("app update download cancelled".into());
        }
        let count = response
            .read(&mut buffer)
            .map_err(|error| format!("failed to read update installer: {error}"))?;
        if count == 0 {
            break;
        }
        file.write_all(&buffer[..count]).map_err(|error| {
            format!(
                "failed to write update installer {}: {error}",
                destination.display()
            )
        })?;
        transferred_bytes += count as u64;
        let progress = if total_bytes > 0 {
            ((transferred_bytes.saturating_mul(100) / total_bytes).min(100)) as u8
        } else {
            0
        };
        let _ = app.emit(
            APP_UPDATE_PROGRESS_EVENT,
            AppUpdateDownloadProgress {
                job_id: job_id.to_string(),
                transferred_bytes,
                total_bytes,
                progress,
            },
        );
    }
    Ok(())
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
    let command = installer_handoff_command(installer_path, parent_pid);
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

#[cfg(target_os = "windows")]
fn installer_handoff_command(installer_path: &Path, parent_pid: u32) -> String {
    let installer = ps_single_quote(&installer_path.to_string_lossy());
    let update_dir = ps_single_quote(
        &installer_path
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .to_string_lossy(),
    );
    format!(
        "Wait-Process -Id {parent_pid} -Timeout 30 -ErrorAction SilentlyContinue; \
         $installerProcess = Start-Process -FilePath {installer} -PassThru; \
         Wait-Process -Id $installerProcess.Id; \
         if ($installerProcess.ExitCode -eq 0) {{ \
             Remove-Item -LiteralPath {installer} -Force; \
             Remove-Item -LiteralPath {update_dir} -Force -ErrorAction SilentlyContinue \
         }}"
    )
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

    #[test]
    fn validate_update_request_accepts_release_mirror_url() {
        let target = app_update_target_triple();
        let asset_name = format!("kkterm-0.1.94-{target}-setup.exe");
        let request = DownloadAndInstallAppUpdateRequest {
            version: "0.1.94".into(),
            asset_name: asset_name.clone(),
            download_url: format!("https://kkterm.ryantsai.com/releases/v0.1.94/{asset_name}"),
            checksum_url: format!(
                "https://kkterm.ryantsai.com/releases/v0.1.94/{asset_name}.sha256"
            ),
        };
        assert!(validate_update_request(&request).is_ok());
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn installer_handoff_cleans_download_only_after_success() {
        let command = installer_handoff_command(
            Path::new("C:\\Users\\Tester's PC\\updates\\kkterm-0.1.96-windows-x64-setup.exe"),
            42,
        );

        assert!(command.contains("Wait-Process -Id 42"));
        assert!(command.contains("Start-Process -FilePath 'C:\\Users\\Tester''s PC\\updates\\kkterm-0.1.96-windows-x64-setup.exe' -PassThru"));
        assert!(command.contains("Wait-Process -Id $installerProcess.Id"));
        assert!(command.contains("if ($installerProcess.ExitCode -eq 0)"));
        assert!(command.contains("Remove-Item -LiteralPath 'C:\\Users\\Tester''s PC\\updates\\kkterm-0.1.96-windows-x64-setup.exe' -Force"));
        assert!(command.contains("Remove-Item -LiteralPath 'C:\\Users\\Tester''s PC\\updates' -Force -ErrorAction SilentlyContinue"));
    }

    #[test]
    fn update_asset_urls_try_mirror_then_github() {
        let urls = update_asset_urls(
            "https://kkterm.ryantsai.com/releases/v0.1.94/kkterm-0.1.94-windows-x64-setup.exe",
            "0.1.94",
            "kkterm-0.1.94-windows-x64-setup.exe",
        )
        .unwrap();
        assert_eq!(
            urls,
            vec![
                "https://kkterm.ryantsai.com/releases/v0.1.94/kkterm-0.1.94-windows-x64-setup.exe",
                "https://github.com/ryantsai/KKTerm/releases/download/v0.1.94/kkterm-0.1.94-windows-x64-setup.exe",
            ]
        );
    }

    #[test]
    fn update_asset_urls_try_github_then_mirror() {
        let urls = update_asset_urls(
            "https://github.com/ryantsai/KKTerm/releases/download/v0.1.94/kkterm-0.1.94-windows-x64-setup.exe.sha256",
            "0.1.94",
            "kkterm-0.1.94-windows-x64-setup.exe.sha256",
        )
        .unwrap();
        assert_eq!(
            urls,
            vec![
                "https://github.com/ryantsai/KKTerm/releases/download/v0.1.94/kkterm-0.1.94-windows-x64-setup.exe.sha256",
                "https://kkterm.ryantsai.com/releases/v0.1.94/kkterm-0.1.94-windows-x64-setup.exe.sha256",
            ]
        );
    }
}
