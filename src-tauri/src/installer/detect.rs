// Per-provider detection of whether a tool is currently installed on the
// host and, if so, what version. Results are NEVER persisted — they are
// always re-derived (ADR 0007 §"Persistence"). The Module's in-memory
// session cache holds them until the user clicks Refresh.

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use std::sync::OnceLock;

use serde::{Deserialize, Serialize};
use serde_json::json;

use super::managed_app::{is_managed_app, managed_app_install_dir, managed_app_marker_path};
use super::proc::{no_window, npm_program};
use super::schema::{Catalog, Detection, GithubReleaseLayout, Provider, Recipe};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedState {
    pub installed: bool,
    pub installed_version: Option<String>,
    /// Only populated for bundles where some-but-not-all children are
    /// installed. Renders as "Partially installed (N/M)".
    pub partial_count: Option<(u32, u32)>,
    /// Best-effort install directory for installed tools, surfaced in the
    /// installed-tool info dialog. Populated for install types KKTerm owns
    /// under %LOCALAPPDATA%, such as github-release tools and managed apps.
    pub install_location: Option<String>,
    /// Extra runtime version for manager-backed bundles. For Node/Python
    /// bundles, `installed_version` remains the manager version used for
    /// update comparisons, while this carries the managed runtime version.
    #[serde(default)]
    pub runtime_version: Option<String>,
    /// Unix timestamp from the most recent detection pass. Cached registry
    /// results carry this so the UI can show how stale the snapshot is.
    pub last_checked_at: Option<i64>,
}

impl DetectedState {
    pub fn not_installed() -> Self {
        Self {
            installed: false,
            installed_version: None,
            partial_count: None,
            install_location: None,
            runtime_version: None,
            last_checked_at: None,
        }
    }
    pub fn installed(version: Option<String>) -> Self {
        Self {
            installed: true,
            installed_version: version,
            partial_count: None,
            install_location: None,
            runtime_version: None,
            last_checked_at: None,
        }
    }
    pub fn with_install_location(mut self, location: Option<String>) -> Self {
        self.install_location = location;
        self
    }
    pub fn with_last_checked_at(mut self, checked_at: Option<i64>) -> Self {
        self.last_checked_at = checked_at;
        self
    }
}

/// Detect every recipe in the catalog. The frontend only runs this on first
/// Module entry per session; subsequent visits use the in-memory cache.
/// Winget-provider recipes share one local Add/Remove Programs registry
/// snapshot instead of spawning `winget list`.
pub fn detect_all(catalog: &Catalog) -> HashMap<String, DetectedState> {
    crate::logging::installer_helper_debug(
        "detect.all.start",
        &json!({ "recipeCount": catalog.recipes.len() }),
    );
    let mut out: HashMap<String, DetectedState> = HashMap::new();
    // Detect leaves first so bundles can compose their result.
    let mut bundles: Vec<&Recipe> = Vec::new();
    refresh_installed_software_snapshot();
    for recipe in &catalog.recipes {
        if let Provider::Bundle { .. } = recipe.provider {
            bundles.push(recipe);
            continue;
        }
        out.insert(recipe.id.clone(), detect_one(recipe));
    }
    // Bundles consult already-detected leaves.
    for bundle in bundles {
        if let Provider::Bundle { steps } = &bundle.provider {
            let child_states: Vec<&DetectedState> = steps
                .iter()
                .filter_map(|step| out.get(step.as_str()))
                .collect();
            let state = bundle_detected_state(&bundle.id, &child_states, steps.len() as u32);
            out.insert(bundle.id.clone(), state);
        }
    }
    crate::logging::installer_helper_debug("detect.all.ok", &json!({ "resultCount": out.len() }));
    out
}

pub fn detect_one_in_catalog(recipe: &Recipe, catalog: &Catalog) -> DetectedState {
    crate::logging::installer_helper_debug(
        "detect.one_in_catalog.start",
        &json!({ "toolId": recipe.id, "provider": provider_kind(&recipe.provider) }),
    );
    if let Provider::Bundle { steps } = &recipe.provider {
        let recipes_by_id: HashMap<&str, &Recipe> =
            catalog.recipes.iter().map(|r| (r.id.as_str(), r)).collect();
        let child_states: Vec<DetectedState> = steps
            .iter()
            .filter_map(|step| recipes_by_id.get(step.as_str()).map(|r| detect_one(r)))
            .collect();
        let child_refs: Vec<&DetectedState> = child_states.iter().collect();
        let state = bundle_detected_state(&recipe.id, &child_refs, steps.len() as u32);
        crate::logging::installer_helper_debug(
            "detect.one_in_catalog.ok",
            &json!({ "toolId": recipe.id, "state": state }),
        );
        return state;
    }
    let state = detect_one(recipe);
    crate::logging::installer_helper_debug(
        "detect.one_in_catalog.ok",
        &json!({ "toolId": recipe.id, "state": state }),
    );
    state
}

pub fn detect_bundle_from_states(
    recipe: &Recipe,
    detected: &HashMap<String, DetectedState>,
) -> Option<DetectedState> {
    if let Provider::Bundle { steps } = &recipe.provider {
        let child_states: Vec<&DetectedState> = steps
            .iter()
            .filter_map(|step| detected.get(step.as_str()))
            .collect();
        return Some(bundle_detected_state(
            &recipe.id,
            &child_states,
            steps.len() as u32,
        ));
    }
    None
}

pub fn detect_one(recipe: &Recipe) -> DetectedState {
    crate::logging::installer_helper_debug(
        "detect.one.start",
        &json!({ "toolId": recipe.id, "provider": provider_kind(&recipe.provider) }),
    );
    let state = if is_managed_app(&recipe.id) {
        detect_managed_app_marker(&recipe.id)
    } else {
        match &recipe.provider {
            Provider::Winget { .. } => detect_winget(recipe),
            Provider::Npm { pkg } => detect_npm(pkg),
            Provider::UvPip { .. } => DetectedState::not_installed(),
            Provider::DownloadInstaller { .. } => detect_installed_software_aliases(recipe),
            Provider::GithubRelease { .. } => detect_github_release_marker(&recipe.id),
            Provider::WindowsFeature { feature, .. } => detect_windows_feature(feature),
            Provider::WslDistro { distro } => detect_wsl_distro(distro),
            Provider::Bundle { .. } => DetectedState::not_installed(),
        }
    };
    crate::logging::installer_helper_debug(
        "detect.one.ok",
        &json!({ "toolId": recipe.id, "provider": provider_kind(&recipe.provider), "state": state }),
    );
    state
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

fn detect_managed_app_marker(tool_id: &str) -> DetectedState {
    let marker = managed_app_marker_path(tool_id);
    let Ok(text) = std::fs::read_to_string(&marker) else {
        return DetectedState::not_installed();
    };
    let version = serde_json::from_str::<serde_json::Value>(&text)
        .ok()
        .and_then(|value| {
            value
                .get("version")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        });
    DetectedState::installed(version).with_install_location(Some(
        managed_app_install_dir(tool_id)
            .to_string_lossy()
            .into_owned(),
    ))
}

fn bundle_detected_state(
    bundle_id: &str,
    child_states: &[&DetectedState],
    total: u32,
) -> DetectedState {
    match bundle_id {
        "node-bundle" => return runtime_bundle_detected_state(child_states, detect_node_version),
        "python-bundle" => {
            return runtime_bundle_detected_state(child_states, detect_uv_python_313_version);
        }
        _ => {}
    }
    default_bundle_detected_state(child_states, total)
}

fn default_bundle_detected_state(child_states: &[&DetectedState], total: u32) -> DetectedState {
    let installed_count = child_states.iter().filter(|state| state.installed).count() as u32;
    if installed_count == 0 {
        DetectedState::not_installed()
    } else if installed_count == total {
        let version = if total == 1 {
            child_states
                .first()
                .and_then(|state| state.installed_version.clone())
        } else {
            None
        };
        DetectedState::installed(version)
    } else {
        DetectedState {
            installed: false,
            installed_version: None,
            partial_count: Some((installed_count, total)),
            install_location: None,
            runtime_version: None,
            last_checked_at: None,
        }
    }
}

fn runtime_bundle_detected_state(
    child_states: &[&DetectedState],
    detect_runtime_version: fn() -> Option<String>,
) -> DetectedState {
    let manager_installed = child_states.iter().all(|state| state.installed);
    if !manager_installed {
        return default_bundle_detected_state(child_states, child_states.len() as u32);
    }
    match detect_runtime_version() {
        Some(version) => {
            let manager_version = child_states
                .first()
                .and_then(|state| state.installed_version.clone());
            let mut state = DetectedState::installed(manager_version);
            state.runtime_version = Some(version);
            state
        }
        None => DetectedState {
            installed: false,
            installed_version: None,
            partial_count: Some((child_states.len() as u32, child_states.len() as u32 + 1)),
            install_location: None,
            runtime_version: None,
            last_checked_at: None,
        },
    }
}

fn detect_node_version() -> Option<String> {
    command_version("node", &["--version"])
}

fn detect_uv_python_313_version() -> Option<String> {
    let output = no_window(&mut Command::new("uv"))
        .args(["python", "find", "3.13"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() {
        return None;
    }
    command_version(&path, &["--version"])
}

fn command_version(program: &str, args: &[&str]) -> Option<String> {
    let output = no_window(&mut Command::new(program))
        .args(args)
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    parse_version_line(&stdout).or_else(|| parse_version_line(&stderr))
}

fn parse_version_line(text: &str) -> Option<String> {
    text.lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(|line| {
            line.trim_start_matches("Python ")
                .trim_start_matches('v')
                .to_string()
        })
}

// ---- Windows installed software / winget -------------------------------
//
// Detection is intentionally local-first and cheap: scan Windows Add/Remove
// Programs registry entries once per sweep, then match each winget recipe
// against catalog detection aliases. `winget` remains the install/update
// provider, but detection does not shell out to `winget list`.

#[derive(Default)]
struct InstalledSoftwareSnapshot {
    entries: Vec<InstalledSoftwareEntry>,
}

#[derive(Debug, Clone)]
struct InstalledSoftwareEntry {
    registry_key: String,
    display_name: Option<String>,
    display_version: Option<String>,
    install_location: Option<String>,
}

static INSTALLED_SOFTWARE_SNAPSHOT: OnceLock<std::sync::Mutex<Option<InstalledSoftwareSnapshot>>> =
    OnceLock::new();

fn installed_software_snapshot_cell() -> &'static std::sync::Mutex<Option<InstalledSoftwareSnapshot>>
{
    INSTALLED_SOFTWARE_SNAPSHOT.get_or_init(|| std::sync::Mutex::new(None))
}

/// Take one installed-software snapshot and cache it for the current sweep.
/// Called by `detect_all` before iterating recipes. Later callers reuse the
/// cached snapshot unless they explicitly clear it.
pub fn refresh_installed_software_snapshot() {
    crate::logging::installer_helper_debug(
        "detect.installed_software_snapshot.refresh.start",
        &json!({}),
    );
    let parsed = load_installed_software_snapshot();
    let entry_count = parsed.entries.len();
    *installed_software_snapshot_cell().lock().unwrap() = Some(parsed);
    crate::logging::installer_helper_debug(
        "detect.installed_software_snapshot.refresh.ok",
        &json!({ "entryCount": entry_count }),
    );
}

#[cfg(target_os = "windows")]
fn load_installed_software_snapshot() -> InstalledSoftwareSnapshot {
    windows_installed_software::load()
}

#[cfg(not(target_os = "windows"))]
fn load_installed_software_snapshot() -> InstalledSoftwareSnapshot {
    InstalledSoftwareSnapshot::default()
}

fn detect_winget(recipe: &Recipe) -> DetectedState {
    let cell = installed_software_snapshot_cell();
    let mut guard = cell.lock().unwrap();
    if guard.is_none() {
        drop(guard);
        let parsed = load_installed_software_snapshot();
        *cell.lock().unwrap() = Some(parsed);
        guard = cell.lock().unwrap();
    }
    let snapshot = guard.as_ref().unwrap();
    detect_installed_software(recipe, snapshot)
}

fn detect_installed_software_aliases(recipe: &Recipe) -> DetectedState {
    let cell = installed_software_snapshot_cell();
    let mut guard = cell.lock().unwrap();
    if guard.is_none() {
        drop(guard);
        let parsed = load_installed_software_snapshot();
        *cell.lock().unwrap() = Some(parsed);
        guard = cell.lock().unwrap();
    }
    let snapshot = guard.as_ref().unwrap();
    detect_installed_software_by_aliases(recipe, snapshot)
}

fn detect_installed_software(
    recipe: &Recipe,
    snapshot: &InstalledSoftwareSnapshot,
) -> DetectedState {
    let Provider::Winget { id } = &recipe.provider else {
        return DetectedState::not_installed();
    };
    for entry in &snapshot.entries {
        if installed_entry_matches(id, &recipe.detection, entry) {
            return DetectedState::installed(entry.display_version.clone())
                .with_install_location(entry.install_location.clone());
        }
    }
    DetectedState::not_installed()
}

fn detect_installed_software_by_aliases(
    recipe: &Recipe,
    snapshot: &InstalledSoftwareSnapshot,
) -> DetectedState {
    for entry in &snapshot.entries {
        if installed_entry_matches(&recipe.id, &recipe.detection, entry) {
            return DetectedState::installed(entry.display_version.clone())
                .with_install_location(entry.install_location.clone());
        }
    }
    DetectedState::not_installed()
}

fn installed_entry_matches(
    winget_id: &str,
    detection: &Detection,
    entry: &InstalledSoftwareEntry,
) -> bool {
    let registry_key = normalize_detection_value(&entry.registry_key);
    if registry_key == normalize_detection_value(winget_id) {
        return true;
    }
    if detection
        .registry_keys
        .iter()
        .any(|key| registry_key == normalize_detection_value(key))
    {
        return true;
    }
    let Some(display_name) = entry.display_name.as_deref() else {
        return false;
    };
    let display_name = normalize_detection_value(display_name);
    detection
        .display_names
        .iter()
        .any(|name| display_name == normalize_detection_value(name))
        || detection
            .display_name_prefixes
            .iter()
            .any(|prefix| display_name.starts_with(&normalize_detection_value(prefix)))
}

fn normalize_detection_value(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

/// Discard the cached snapshot so the next `detect_winget`/`detect_all`
/// call re-scans installed software. Used by post-install/uninstall redetect
/// paths in commands.rs so an install that just landed is visible.
pub fn invalidate_installed_software_snapshot() {
    *installed_software_snapshot_cell().lock().unwrap() = None;
    crate::logging::installer_helper_debug(
        "detect.installed_software_snapshot.invalidated",
        &json!({}),
    );
}

#[cfg(target_os = "windows")]
mod windows_installed_software {
    use std::ffi::{OsStr, OsString};
    use std::os::windows::ffi::{OsStrExt, OsStringExt};

    use windows_sys::Win32::Foundation::{ERROR_NO_MORE_ITEMS, ERROR_SUCCESS};
    use windows_sys::Win32::System::Registry::{
        RegCloseKey, RegEnumKeyExW, RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_CURRENT_USER,
        HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_32KEY, KEY_WOW64_64KEY, REG_EXPAND_SZ, REG_SZ,
    };

    use super::{InstalledSoftwareEntry, InstalledSoftwareSnapshot};

    const UNINSTALL_SUBKEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Uninstall";

    struct RegistryKey(HKEY);

    impl Drop for RegistryKey {
        fn drop(&mut self) {
            unsafe {
                let _ = RegCloseKey(self.0);
            }
        }
    }

    pub fn load() -> InstalledSoftwareSnapshot {
        let mut entries = Vec::new();
        scan_uninstall_key(
            HKEY_LOCAL_MACHINE,
            UNINSTALL_SUBKEY,
            "ARP\\Machine\\X64",
            KEY_WOW64_64KEY,
            &mut entries,
        );
        scan_uninstall_key(
            HKEY_LOCAL_MACHINE,
            UNINSTALL_SUBKEY,
            "ARP\\Machine\\X86",
            KEY_WOW64_32KEY,
            &mut entries,
        );
        scan_uninstall_key(
            HKEY_CURRENT_USER,
            UNINSTALL_SUBKEY,
            "ARP\\User\\X64",
            KEY_WOW64_64KEY,
            &mut entries,
        );
        scan_uninstall_key(
            HKEY_CURRENT_USER,
            UNINSTALL_SUBKEY,
            "ARP\\User\\X86",
            KEY_WOW64_32KEY,
            &mut entries,
        );
        InstalledSoftwareSnapshot { entries }
    }

    fn scan_uninstall_key(
        root: HKEY,
        subkey: &str,
        arp_prefix: &str,
        view_flag: u32,
        entries: &mut Vec<InstalledSoftwareEntry>,
    ) {
        let Ok(key) = open_key(root, subkey, view_flag) else {
            return;
        };
        let mut index = 0;
        loop {
            let mut name_buf = vec![0u16; 512];
            let mut name_len = name_buf.len() as u32;
            let status = unsafe {
                RegEnumKeyExW(
                    key.0,
                    index,
                    name_buf.as_mut_ptr(),
                    &mut name_len,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                )
            };
            if status == ERROR_NO_MORE_ITEMS {
                break;
            }
            index += 1;
            if status != ERROR_SUCCESS {
                continue;
            }
            let child = OsString::from_wide(&name_buf[..name_len as usize])
                .to_string_lossy()
                .into_owned();
            let child_path = format!("{subkey}\\{child}");
            let Ok(child_key) = open_key(root, &child_path, view_flag) else {
                continue;
            };
            let display_name = read_string_value(&child_key, "DisplayName");
            if display_name.as_deref().unwrap_or("").trim().is_empty() {
                continue;
            }
            let display_version = read_string_value(&child_key, "DisplayVersion");
            let install_location = read_string_value(&child_key, "InstallLocation")
                .filter(|value| !value.trim().is_empty());
            entries.push(InstalledSoftwareEntry {
                registry_key: child.clone(),
                display_name: display_name.clone(),
                display_version: display_version.clone(),
                install_location: install_location.clone(),
            });
            entries.push(InstalledSoftwareEntry {
                registry_key: format!("{arp_prefix}\\{child}"),
                display_name,
                display_version,
                install_location,
            });
        }
    }

    fn open_key(root: HKEY, subkey: &str, view_flag: u32) -> Result<RegistryKey, String> {
        let subkey = wide_null(subkey);
        let mut key: HKEY = std::ptr::null_mut();
        let status =
            unsafe { RegOpenKeyExW(root, subkey.as_ptr(), 0, KEY_READ | view_flag, &mut key) };
        if status != ERROR_SUCCESS {
            return Err(format!(
                "failed to open registry key: Windows error {status}"
            ));
        }
        Ok(RegistryKey(key))
    }

    fn read_string_value(key: &RegistryKey, name: &str) -> Option<String> {
        let value_name = wide_null(name);
        let mut value_type = 0;
        let mut byte_len = 0u32;
        let status = unsafe {
            RegQueryValueExW(
                key.0,
                value_name.as_ptr(),
                std::ptr::null_mut(),
                &mut value_type,
                std::ptr::null_mut(),
                &mut byte_len,
            )
        };
        if status != ERROR_SUCCESS || byte_len == 0 {
            return None;
        }
        if value_type != REG_SZ && value_type != REG_EXPAND_SZ {
            return None;
        }
        let mut data = vec![0u16; (byte_len as usize + 1) / 2];
        let status = unsafe {
            RegQueryValueExW(
                key.0,
                value_name.as_ptr(),
                std::ptr::null_mut(),
                &mut value_type,
                data.as_mut_ptr().cast::<u8>(),
                &mut byte_len,
            )
        };
        if status != ERROR_SUCCESS {
            return None;
        }
        let len = data.iter().position(|ch| *ch == 0).unwrap_or(data.len());
        Some(
            OsString::from_wide(&data[..len])
                .to_string_lossy()
                .into_owned(),
        )
    }

    fn wide_null(value: &str) -> Vec<u16> {
        OsStr::new(value).encode_wide().chain(Some(0)).collect()
    }
}

// ---- npm ---------------------------------------------------------------

fn detect_npm(pkg: &str) -> DetectedState {
    let output = match no_window(&mut Command::new(npm_program()))
        .args(["ls", "-g", "--json", "--depth=0"])
        .output()
    {
        Ok(o) => o,
        Err(_) => return DetectedState::not_installed(),
    };
    // npm ls returns non-zero on extraneous packages; trust stdout JSON.
    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = match serde_json::from_str(&stdout) {
        Ok(v) => v,
        Err(_) => return DetectedState::not_installed(),
    };
    if let Some(deps) = parsed.get("dependencies").and_then(|v| v.as_object()) {
        if let Some(entry) = deps.get(pkg) {
            let version = entry
                .get("version")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            return DetectedState::installed(version);
        }
    }
    DetectedState::not_installed()
}

// ---- github-release ----------------------------------------------------

/// Github-release tools are installed by us into `%LOCALAPPDATA%\KKTerm\
/// installer\bin\<tool_id>\` with a `.kkterm-installer.json` marker
/// containing the installed version. Detection reads the marker. We do not
/// scan PATH for github-release tools — only installs we made ourselves
/// count as "managed". (The user can install separately and we'll just show
/// the tool as Available — they're free to keep both.)
fn detect_github_release_marker(tool_id: &str) -> DetectedState {
    let marker = github_release_marker_path(tool_id);
    let Ok(text) = std::fs::read_to_string(&marker) else {
        return DetectedState::not_installed();
    };
    let parsed: serde_json::Value = match serde_json::from_str(&text) {
        Ok(v) => v,
        Err(_) => {
            return DetectedState::installed(None).with_install_location(Some(
                github_release_install_dir(tool_id)
                    .to_string_lossy()
                    .into_owned(),
            ));
        }
    };
    let version = parsed
        .get("version")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    DetectedState::installed(version).with_install_location(Some(
        github_release_install_dir(tool_id)
            .to_string_lossy()
            .into_owned(),
    ))
}

pub fn github_release_install_dir(tool_id: &str) -> PathBuf {
    let base = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    base.join("KKTerm")
        .join("installer")
        .join("bin")
        .join(tool_id)
}

pub fn github_release_marker_path(tool_id: &str) -> PathBuf {
    github_release_install_dir(tool_id).join(".kkterm-installer.json")
}

// ---- windows-feature ---------------------------------------------------

fn detect_windows_feature(feature: &str) -> DetectedState {
    let output = match no_window(&mut Command::new("dism"))
        .args([
            "/online",
            "/get-featureinfo",
            &format!("/featurename:{feature}"),
            "/english",
        ])
        .output()
    {
        Ok(o) => o,
        Err(_) => return DetectedState::not_installed(),
    };
    if !output.status.success() {
        return DetectedState::not_installed();
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let trimmed = line.trim();
        if let Some(value) = trimmed.strip_prefix("State :") {
            let state = value.trim().to_ascii_lowercase();
            return if state.contains("enabled") {
                DetectedState::installed(None)
            } else {
                DetectedState::not_installed()
            };
        }
    }
    DetectedState::not_installed()
}

fn detect_wsl_distro(distro: &str) -> DetectedState {
    let output = match no_window(&mut Command::new("wsl"))
        .args(["--list", "--quiet"])
        .output()
    {
        Ok(o) => o,
        Err(_) => return DetectedState::not_installed(),
    };
    if !output.status.success() {
        return DetectedState::not_installed();
    }
    if parse_wsl_distro_list(&output.stdout)
        .iter()
        .any(|name| name.eq_ignore_ascii_case(distro))
    {
        DetectedState::installed(None)
    } else {
        DetectedState::not_installed()
    }
}

fn parse_wsl_distro_list(bytes: &[u8]) -> Vec<String> {
    String::from_utf8_lossy(bytes)
        .replace('\0', "")
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

// Marker file shape used by install.rs.
#[derive(Debug, Clone, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GithubReleaseMarker {
    pub tool_id: String,
    pub version: Option<String>,
    pub installed_at: i64,
    pub layout: GithubReleaseLayout,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn winget_recipe_with_detection(
        winget_id: &str,
        registry_keys: &[&str],
        display_names: &[&str],
        display_name_prefixes: &[&str],
    ) -> Recipe {
        Recipe {
            id: "test".into(),
            name: "Test".into(),
            description_en: String::new(),
            description_locales: HashMap::new(),
            needs: vec![],
            icon: None,
            category: None,
            provider: Provider::Winget {
                id: winget_id.into(),
            },
            options: vec![],
            homepage: None,
            release_notes_url: None,
            detection: Detection {
                registry_keys: registry_keys.iter().map(|value| (*value).into()).collect(),
                display_names: display_names.iter().map(|value| (*value).into()).collect(),
                display_name_prefixes: display_name_prefixes
                    .iter()
                    .map(|value| (*value).into())
                    .collect(),
            },
        }
    }

    #[test]
    fn bundle_state_reports_partial_counts() {
        let installed = DetectedState::installed(Some("1.0.0".into()));
        let missing = DetectedState::not_installed();
        let state = bundle_detected_state("test-bundle", &[&installed, &missing], 3);

        assert!(!state.installed);
        assert_eq!(state.partial_count, Some((1, 3)));
    }

    #[test]
    fn bundle_state_reports_installed_when_all_steps_are_installed() {
        let first = DetectedState::installed(Some("1.0.0".into()));
        let second = DetectedState::installed(Some("2.0.0".into()));
        let state = bundle_detected_state("test-bundle", &[&first, &second], 2);

        assert!(state.installed);
        assert_eq!(state.installed_version, None);
        assert_eq!(state.partial_count, None);
    }

    #[test]
    fn bundle_state_inherits_single_step_version() {
        let child = DetectedState::installed(Some("1.0.0".into()));
        let state = bundle_detected_state("test-bundle", &[&child], 1);

        assert!(state.installed);
        assert_eq!(state.installed_version.as_deref(), Some("1.0.0"));
    }

    #[test]
    fn runtime_bundle_reports_partial_when_manager_exists_without_runtime() {
        let manager = DetectedState::installed(Some("1.0.0".into()));
        let state = runtime_bundle_detected_state(&[&manager], || None);

        assert!(!state.installed);
        assert_eq!(state.partial_count, Some((1, 2)));
    }

    #[test]
    fn runtime_bundle_reports_runtime_version() {
        let manager = DetectedState::installed(Some("1.0.0".into()));
        let state = runtime_bundle_detected_state(&[&manager], || Some("3.13.5".into()));

        assert!(state.installed);
        assert_eq!(state.installed_version.as_deref(), Some("1.0.0"));
        assert_eq!(state.runtime_version.as_deref(), Some("3.13.5"));
    }

    #[test]
    fn managed_app_marker_reports_app_local_install_location() {
        let location = managed_app_install_dir("n8n");

        assert!(location.ends_with(r"installer\apps\n8n"));
    }

    #[test]
    fn parse_version_line_trims_node_prefix() {
        assert_eq!(parse_version_line("v24.11.1\n").as_deref(), Some("24.11.1"));
        assert_eq!(
            parse_version_line("Python 3.13.5\n").as_deref(),
            Some("3.13.5")
        );
    }

    #[test]
    fn installed_software_match_uses_registry_key_alias() {
        let recipe = winget_recipe_with_detection("Git.Git", &["Git_is1"], &[], &[]);
        let snapshot = InstalledSoftwareSnapshot {
            entries: vec![InstalledSoftwareEntry {
                registry_key: "Git_is1".into(),
                display_name: Some("Git".into()),
                display_version: Some("2.53.0.2".into()),
                install_location: None,
            }],
        };

        let state = detect_installed_software(&recipe, &snapshot);

        assert!(state.installed);
        assert_eq!(state.installed_version.as_deref(), Some("2.53.0.2"));
    }

    #[test]
    fn installed_software_match_accepts_full_arp_registry_alias() {
        let recipe =
            winget_recipe_with_detection("Git.Git", &["ARP\\Machine\\X64\\Git_is1"], &[], &[]);
        let snapshot = InstalledSoftwareSnapshot {
            entries: vec![InstalledSoftwareEntry {
                registry_key: "ARP\\Machine\\X64\\Git_is1".into(),
                display_name: Some("Git".into()),
                display_version: Some("2.53.0.2".into()),
                install_location: None,
            }],
        };

        let state = detect_installed_software(&recipe, &snapshot);

        assert!(state.installed);
        assert_eq!(state.installed_version.as_deref(), Some("2.53.0.2"));
    }

    #[test]
    fn installed_software_match_uses_exact_display_name_alias() {
        let recipe = winget_recipe_with_detection(
            "Microsoft.VisualStudioCode",
            &[],
            &["Microsoft Visual Studio Code"],
            &[],
        );
        let snapshot = InstalledSoftwareSnapshot {
            entries: vec![InstalledSoftwareEntry {
                registry_key: "{ignored}".into(),
                display_name: Some("Microsoft Visual Studio Code".into()),
                display_version: Some("1.122.1".into()),
                install_location: Some(
                    "C:\\Users\\ryan\\AppData\\Local\\Programs\\Microsoft VS Code".into(),
                ),
            }],
        };

        let state = detect_installed_software(&recipe, &snapshot);

        assert!(state.installed);
        assert_eq!(state.installed_version.as_deref(), Some("1.122.1"));
        assert_eq!(
            state.install_location.as_deref(),
            Some("C:\\Users\\ryan\\AppData\\Local\\Programs\\Microsoft VS Code")
        );
    }

    #[test]
    fn installed_software_match_accepts_vscode_user_display_name() {
        let recipe = winget_recipe_with_detection(
            "Microsoft.VisualStudioCode",
            &["{EA457B21-F73E-494C-ACAB-524FDE069978}_is1"],
            &["Microsoft Visual Studio Code"],
            &["Microsoft Visual Studio Code"],
        );
        let snapshot = InstalledSoftwareSnapshot {
            entries: vec![InstalledSoftwareEntry {
                registry_key: "ARP\\User\\X64\\{EA457B21-F73E-494C-ACAB-524FDE069978}_is1".into(),
                display_name: Some("Microsoft Visual Studio Code (User)".into()),
                display_version: Some("1.122.1".into()),
                install_location: Some(
                    "C:\\Users\\ryan\\AppData\\Local\\Programs\\Microsoft VS Code".into(),
                ),
            }],
        };

        let state = detect_installed_software(&recipe, &snapshot);

        assert!(state.installed);
        assert_eq!(state.installed_version.as_deref(), Some("1.122.1"));
        assert_eq!(
            state.install_location.as_deref(),
            Some("C:\\Users\\ryan\\AppData\\Local\\Programs\\Microsoft VS Code")
        );
    }

    #[test]
    fn installed_software_match_uses_display_name_prefix_alias() {
        let recipe = winget_recipe_with_detection(
            "CoreyButler.NVMforWindows",
            &[],
            &[],
            &["NVM for Windows"],
        );
        let snapshot = InstalledSoftwareSnapshot {
            entries: vec![InstalledSoftwareEntry {
                registry_key: "nvm".into(),
                display_name: Some("NVM for Windows 1.2.2".into()),
                display_version: Some("1.2.2".into()),
                install_location: None,
            }],
        };

        let state = detect_installed_software(&recipe, &snapshot);

        assert!(state.installed);
        assert_eq!(state.installed_version.as_deref(), Some("1.2.2"));
    }
}
