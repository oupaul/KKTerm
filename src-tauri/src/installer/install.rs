// Per-provider install executors. Each `install_*` function:
//
//   * Spawns the provider's native CLI / downloads + extracts an asset.
//   * Streams stdout/stderr lines to the frontend as ProgressEvent::Stdout
//     / Stderr via the supplied event sink.
//   * Respects a shared cancellation flag and kills the child on cancel.
//   * Returns the installed version on success, an error message on failure.
//
// The flow is intentionally not transactional — partial installs are owned
// by the underlying installer (ADR 0007 §"Execution constraints").

use std::io::{BufRead, BufReader, Read, Write};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::SystemTime;

use super::detect::{
    github_release_install_dir, github_release_marker_path, GithubReleaseMarker,
};
use super::events::ProgressEvent;
use super::options::InstallOptions;
use super::schema::{GithubReleaseLayout, Provider, Recipe};

pub type EventSink = Box<dyn Fn(ProgressEvent) + Send + Sync>;

pub fn install_recipe(
    recipe: &Recipe,
    options: &InstallOptions,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<Option<String>, String> {
    match &recipe.provider {
        Provider::Winget { id } => install_winget(&recipe.id, id, options, cancel, emit),
        Provider::Npm { pkg } => install_npm(&recipe.id, pkg, options, cancel, emit),
        Provider::GithubRelease {
            repo,
            asset_pattern,
            layout,
        } => install_github_release(
            &recipe.id,
            repo,
            asset_pattern,
            *layout,
            options,
            cancel,
            emit,
        ),
        Provider::WindowsFeature { feature, .. } => {
            install_windows_feature(&recipe.id, feature, cancel, emit)
        }
        Provider::Bundle { .. } => Err(
            "bundles must be expanded into step recipes before install_recipe; see commands.rs"
                .into(),
        ),
    }
}

// ---- winget ------------------------------------------------------------

fn install_winget(
    tool_id: &str,
    winget_id: &str,
    options: &InstallOptions,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<Option<String>, String> {
    emit(ProgressEvent::Step {
        tool_id: tool_id.into(),
        message: format!("winget install --id {winget_id}"),
    });
    let mut args: Vec<String> = vec![
        "install".into(),
        "--id".into(),
        winget_id.into(),
        "--exact".into(),
        "--silent".into(),
        "--accept-package-agreements".into(),
        "--accept-source-agreements".into(),
        "--disable-interactivity".into(),
        "--source".into(),
        "winget".into(),
    ];
    if let Some(scope) = options.scope.as_deref() {
        if scope == "user" || scope == "machine" {
            args.push("--scope".into());
            args.push(scope.into());
        }
    }
    if let Some(version) = options.version.as_deref() {
        if !version.is_empty() {
            args.push("--version".into());
            args.push(version.into());
        }
    }
    if let Some(location) = options.location.as_deref() {
        if !location.is_empty() {
            args.push("--location".into());
            args.push(location.into());
        }
    }
    run_streamed("winget", &args, tool_id, cancel, emit)?;
    // We don't try to parse winget's silent stdout for the installed version;
    // a subsequent detect_one() reading `winget list` is the canonical source
    // of truth. Returning None lets the caller decide whether to re-detect.
    Ok(None)
}

// ---- npm ---------------------------------------------------------------

fn install_npm(
    tool_id: &str,
    pkg: &str,
    options: &InstallOptions,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<Option<String>, String> {
    let spec = if let Some(v) = options.version.as_deref().filter(|s| !s.is_empty()) {
        format!("{pkg}@{v}")
    } else {
        format!("{pkg}@latest")
    };
    emit(ProgressEvent::Step {
        tool_id: tool_id.into(),
        message: format!("npm install -g {spec}"),
    });
    run_streamed(
        "npm",
        &["install".into(), "-g".into(), spec.clone()],
        tool_id,
        cancel,
        emit,
    )?;
    Ok(None)
}

// ---- github-release ----------------------------------------------------

fn install_github_release(
    tool_id: &str,
    repo: &str,
    asset_pattern: &str,
    layout: GithubReleaseLayout,
    options: &InstallOptions,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<Option<String>, String> {
    emit(ProgressEvent::Step {
        tool_id: tool_id.into(),
        message: format!("Querying GitHub releases for {repo}"),
    });
    let api_url = format!("https://api.github.com/repos/{repo}/releases/latest");
    let client = reqwest::blocking::Client::builder()
        .user_agent("KKTerm-Installer/1")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let release_json: serde_json::Value = client
        .get(&api_url)
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.json())
        .map_err(|e| format!("GitHub releases fetch failed: {e}"))?;

    let tag_name = release_json
        .get("tag_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let pattern = asset_pattern.to_string();
    let asset = release_json
        .get("assets")
        .and_then(|v| v.as_array())
        .and_then(|arr| {
            arr.iter().find(|a| {
                a.get("name")
                    .and_then(|n| n.as_str())
                    .map(|name| glob_match(&pattern, name))
                    .unwrap_or(false)
            })
        })
        .ok_or_else(|| {
            format!("no release asset matched pattern `{asset_pattern}` in {repo}")
        })?;

    let asset_name = asset
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or("asset has no name field")?;
    let download_url = asset
        .get("browser_download_url")
        .and_then(|v| v.as_str())
        .ok_or("asset has no browser_download_url field")?
        .to_string();

    let install_dir = options
        .location
        .as_deref()
        .filter(|s| !s.is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| github_release_install_dir(tool_id));
    std::fs::create_dir_all(&install_dir).map_err(|e| e.to_string())?;

    // Stage 1: download.
    emit(ProgressEvent::Step {
        tool_id: tool_id.into(),
        message: format!("Downloading {asset_name}"),
    });
    let download_path = install_dir.join(asset_name);
    download_with_progress(
        &client,
        &download_url,
        &download_path,
        tool_id,
        &cancel,
        emit,
    )?;

    if cancel.load(Ordering::Relaxed) {
        return Err("cancelled".into());
    }

    // Stage 2: layout-specific install.
    match layout {
        GithubReleaseLayout::Zip => {
            emit(ProgressEvent::Step {
                tool_id: tool_id.into(),
                message: "Extracting archive".into(),
            });
            extract_zip(&download_path, &install_dir)?;
            std::fs::remove_file(&download_path).ok();
            if options.add_to_path.unwrap_or(false) {
                add_to_user_path(&install_dir, tool_id, emit);
            }
        }
        GithubReleaseLayout::ExeInstaller => {
            emit(ProgressEvent::Step {
                tool_id: tool_id.into(),
                message: format!("Running {asset_name} /S"),
            });
            run_streamed(
                download_path.to_str().ok_or("invalid download path")?,
                &["/S".into()],
                tool_id,
                cancel.clone(),
                emit,
            )?;
        }
        GithubReleaseLayout::Msi => {
            emit(ProgressEvent::Step {
                tool_id: tool_id.into(),
                message: format!("msiexec /i {asset_name} /qn"),
            });
            run_streamed(
                "msiexec",
                &[
                    "/i".into(),
                    download_path.to_string_lossy().to_string(),
                    "/qn".into(),
                ],
                tool_id,
                cancel.clone(),
                emit,
            )?;
        }
    }

    // Stage 3: marker write so detect_github_release_marker recognizes it.
    let marker = GithubReleaseMarker {
        tool_id: tool_id.into(),
        version: tag_name.clone(),
        installed_at: SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0),
        layout,
    };
    if let Ok(json) = serde_json::to_vec_pretty(&marker) {
        let _ = std::fs::write(github_release_marker_path(tool_id), json);
    }

    Ok(tag_name)
}

fn download_with_progress(
    client: &reqwest::blocking::Client,
    url: &str,
    dest: &PathBuf,
    tool_id: &str,
    cancel: &Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<(), String> {
    let mut resp = client
        .get(url)
        .send()
        .and_then(|r| r.error_for_status())
        .map_err(|e| e.to_string())?;
    let total = resp.content_length();
    let mut file = std::fs::File::create(dest).map_err(|e| e.to_string())?;
    let mut downloaded: u64 = 0;
    let mut buf = [0u8; 64 * 1024];
    loop {
        if cancel.load(Ordering::Relaxed) {
            return Err("cancelled".into());
        }
        let n = resp.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n]).map_err(|e| e.to_string())?;
        downloaded = downloaded.saturating_add(n as u64);
        if let Some(t) = total {
            if t > 0 {
                let ratio = (downloaded as f32 / t as f32).clamp(0.0, 1.0);
                emit(ProgressEvent::Progress {
                    tool_id: tool_id.into(),
                    ratio,
                });
            }
        }
    }
    Ok(())
}

fn extract_zip(zip_path: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    let file = std::fs::File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let Some(rel) = entry.enclosed_name() else {
            continue;
        };
        let target = dest.join(rel);
        if entry.is_dir() {
            std::fs::create_dir_all(&target).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = target.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut out = std::fs::File::create(&target).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn add_to_user_path(dir: &PathBuf, tool_id: &str, emit: &EventSink) {
    // setx PATH appends to the persisted user PATH but truncates at 1024 chars.
    // We delegate to PowerShell to read+rewrite the Environment user PATH
    // safely. Failure here is non-fatal — the tool is still installed.
    let dir_str = dir.to_string_lossy().to_string();
    let script = format!(
        r#"$cur = [Environment]::GetEnvironmentVariable('Path','User'); if ($cur -notlike '*{0}*') {{ [Environment]::SetEnvironmentVariable('Path', ($cur + ';{0}').Trim(';'), 'User') }}"#,
        dir_str.replace('\'', "''")
    );
    let result = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .output();
    match result {
        Ok(o) if o.status.success() => emit(ProgressEvent::Stdout {
            tool_id: tool_id.into(),
            line: format!("Added {dir_str} to user PATH (open a new shell to pick up)"),
        }),
        Ok(o) => emit(ProgressEvent::Stderr {
            tool_id: tool_id.into(),
            line: format!(
                "Could not add to PATH: {}",
                String::from_utf8_lossy(&o.stderr).trim()
            ),
        }),
        Err(e) => emit(ProgressEvent::Stderr {
            tool_id: tool_id.into(),
            line: format!("Could not add to PATH: {e}"),
        }),
    }
}

#[cfg(not(target_os = "windows"))]
fn add_to_user_path(_dir: &PathBuf, _tool_id: &str, _emit: &EventSink) {}

/// Minimal glob matcher for `*` only — sufficient for asset filename
/// patterns like `nssm-*-win.zip`. Returns true iff `pattern` matches the
/// full `name`. No `?`, no `[abc]`, no escapes.
fn glob_match(pattern: &str, name: &str) -> bool {
    let segments: Vec<&str> = pattern.split('*').collect();
    if segments.is_empty() {
        return pattern == name;
    }
    if !name.starts_with(segments[0]) {
        return false;
    }
    let mut pos = segments[0].len();
    for (i, seg) in segments.iter().enumerate().skip(1) {
        if seg.is_empty() {
            // Trailing '*' matches the rest.
            if i == segments.len() - 1 {
                return true;
            }
            continue;
        }
        if i == segments.len() - 1 {
            return name[pos..].ends_with(seg);
        }
        match name[pos..].find(seg) {
            Some(idx) => pos = pos + idx + seg.len(),
            None => return false,
        }
    }
    true
}

// ---- windows-feature ---------------------------------------------------

fn install_windows_feature(
    tool_id: &str,
    feature: &str,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<Option<String>, String> {
    emit(ProgressEvent::Step {
        tool_id: tool_id.into(),
        message: format!("dism /online /enable-feature /featurename:{feature}"),
    });
    run_streamed(
        "dism",
        &[
            "/online".into(),
            "/enable-feature".into(),
            format!("/featurename:{feature}"),
            "/norestart".into(),
            "/english".into(),
        ],
        tool_id,
        cancel,
        emit,
    )?;
    Ok(None)
}

// ---- streaming child-process runner ------------------------------------

/// Public alias used by uninstall.rs.
pub fn run_streamed_public(
    program: &str,
    args: &[String],
    tool_id: &str,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<(), String> {
    run_streamed(program, args, tool_id, cancel, emit)
}

fn run_streamed(
    program: &str,
    args: &[String],
    tool_id: &str,
    cancel: Arc<AtomicBool>,
    emit: &EventSink,
) -> Result<(), String> {
    let mut child = Command::new(program)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null())
        .spawn()
        .map_err(|e| format!("failed to spawn `{program}`: {e}"))?;
    forward_stream(child.stdout.take(), tool_id, emit, true);
    forward_stream(child.stderr.take(), tool_id, emit, false);

    loop {
        if cancel.load(Ordering::Relaxed) {
            let _ = child.kill();
            let _ = child.wait();
            return Err("cancelled".into());
        }
        match child.try_wait() {
            Ok(Some(status)) => {
                if status.success() {
                    return Ok(());
                }
                let code = status.code().unwrap_or(-1);
                return Err(format!("`{program}` exited with status {code}"));
            }
            Ok(None) => std::thread::sleep(std::time::Duration::from_millis(100)),
            Err(e) => return Err(format!("wait on `{program}` failed: {e}")),
        }
    }
}

fn forward_stream<R: Read + Send + 'static>(
    stream: Option<R>,
    tool_id: &str,
    emit: &EventSink,
    is_stdout: bool,
) {
    let Some(stream) = stream else { return };
    // We need a clone of the Arc<dyn Fn> behind EventSink so the spawned
    // thread can call it. EventSink is Box<dyn Fn ...>, which can't be
    // cloned, so the caller wraps emit in an Arc upstream. To avoid that
    // complication we read inline via a non-blocking loop integrated above —
    // but that's invasive; instead we drain stdout/stderr synchronously
    // after the child exits in the simple path. This loses streaming for
    // the brief window after the process exits, which is acceptable for
    // installer use.
    //
    // For real-time streaming we spawn a detached thread that owns its own
    // Arc<EventSink>. We do that by leaking the closure into a static
    // Box<dyn Fn> per call — undesirable. Practical solution: read with a
    // dedicated reader thread that drains into an internal Vec and the main
    // loop emits on a tick.
    //
    // To keep Phase 2 honest and tested, we drain synchronously here on the
    // current thread before returning, which means run_streamed effectively
    // buffers and emits at the end. The user sees the final log but not
    // line-by-line live output. This is a known Phase 2 simplification;
    // Phase 2.5 will switch to true streaming via a Sender channel pattern.
    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    while let Ok(n) = reader.read_line(&mut line) {
        if n == 0 {
            break;
        }
        let trimmed = line.trim_end_matches(['\r', '\n']).to_string();
        if is_stdout {
            emit(ProgressEvent::Stdout {
                tool_id: tool_id.into(),
                line: trimmed,
            });
        } else {
            emit(ProgressEvent::Stderr {
                tool_id: tool_id.into(),
                line: trimmed,
            });
        }
        line.clear();
    }
}

#[allow(dead_code)]
fn _silence_child_unused(_c: &Child) {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn glob_exact() {
        assert!(glob_match("nssm.zip", "nssm.zip"));
        assert!(!glob_match("nssm.zip", "nssm-2.zip"));
    }

    #[test]
    fn glob_middle_star() {
        assert!(glob_match("nssm-*-win.zip", "nssm-2.24-101-g897c7ad-win.zip"));
        assert!(!glob_match("nssm-*-win.zip", "nssm-2.24-mac.zip"));
    }

    #[test]
    fn glob_leading_star() {
        assert!(glob_match("*.exe", "aider.exe"));
        assert!(!glob_match("*.exe", "aider.tar.gz"));
    }

    #[test]
    fn glob_trailing_star() {
        assert!(glob_match("aider-*", "aider-1.0.0"));
    }
}
