// Per-provider detection of whether a tool is currently installed on the
// host and, if so, what version. Results are NEVER persisted — they are
// always re-derived (ADR 0007 §"Persistence"). The Module's in-memory
// session cache holds them until the user clicks Refresh.

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use std::sync::OnceLock;

use serde::Serialize;

use super::proc::no_window;
use super::schema::{Catalog, GithubReleaseLayout, Provider, Recipe};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedState {
    pub installed: bool,
    pub installed_version: Option<String>,
    /// Only populated for bundles where some-but-not-all children are
    /// installed. Renders as "Partially installed (N/M)".
    pub partial_count: Option<(u32, u32)>,
    /// Best-effort install directory for installed tools, surfaced in the
    /// installed-tool info dialog. Currently populated for github-release
    /// recipes (we own the install dir under %LOCALAPPDATA%) and left as
    /// None elsewhere — winget/npm/dism install paths are not uniformly
    /// recoverable from their detection output, and the dialog hides the
    /// row when this is None.
    pub install_location: Option<String>,
}

impl DetectedState {
    pub fn not_installed() -> Self {
        Self {
            installed: false,
            installed_version: None,
            partial_count: None,
            install_location: None,
        }
    }
    pub fn installed(version: Option<String>) -> Self {
        Self {
            installed: true,
            installed_version: version,
            partial_count: None,
            install_location: None,
        }
    }
    pub fn with_install_location(mut self, location: Option<String>) -> Self {
        self.install_location = location;
        self
    }
}

/// Detect every recipe in the catalog. Sequential — a 25-tool scan typically
/// finishes in ~3–5 s on a warm host (winget is the slow leg). The frontend
/// only runs this on first Module entry per session; subsequent visits use
/// the in-memory cache. All winget recipes share a single `winget list` call;
/// detect_winget consults the resulting map instead of spawning per recipe.
pub fn detect_all(catalog: &Catalog) -> HashMap<String, DetectedState> {
    let mut out: HashMap<String, DetectedState> = HashMap::new();
    // Detect leaves first so bundles can compose their result.
    let mut bundles: Vec<&Recipe> = Vec::new();
    refresh_winget_snapshot();
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
            let state = bundle_detected_state(
                steps
                    .iter()
                    .filter(|step| out.get(step.as_str()).map(|s| s.installed).unwrap_or(false))
                    .count() as u32,
                steps.len() as u32,
            );
            out.insert(bundle.id.clone(), state);
        }
    }
    out
}

pub fn detect_one_in_catalog(recipe: &Recipe, catalog: &Catalog) -> DetectedState {
    if let Provider::Bundle { steps } = &recipe.provider {
        let recipes_by_id: HashMap<&str, &Recipe> =
            catalog.recipes.iter().map(|r| (r.id.as_str(), r)).collect();
        let installed_count = steps
            .iter()
            .filter(|step| {
                recipes_by_id
                    .get(step.as_str())
                    .map(|r| detect_one(r).installed)
                    .unwrap_or(false)
            })
            .count() as u32;
        return bundle_detected_state(installed_count, steps.len() as u32);
    }
    detect_one(recipe)
}

pub fn detect_one(recipe: &Recipe) -> DetectedState {
    match &recipe.provider {
        Provider::Winget { id } => detect_winget(id),
        Provider::Npm { pkg } => detect_npm(pkg),
        Provider::GithubRelease { .. } => detect_github_release_marker(&recipe.id),
        Provider::WindowsFeature { feature, .. } => detect_windows_feature(feature),
        Provider::Bundle { .. } => DetectedState::not_installed(),
    }
}

fn bundle_detected_state(installed_count: u32, total: u32) -> DetectedState {
    if installed_count == 0 {
        DetectedState::not_installed()
    } else if installed_count == total {
        DetectedState::installed(None)
    } else {
        DetectedState {
            installed: false,
            installed_version: None,
            partial_count: Some((installed_count, total)),
            install_location: None,
        }
    }
}

// ---- winget ------------------------------------------------------------
//
// Per-recipe winget spawns were the dominant cost of `detect_all` and the
// dominant cause of the Module-entry console-window flash storm. We now
// take one snapshot of `winget list --source winget` per detection sweep
// and look up each recipe's id in the parsed map.

#[derive(Default)]
struct WingetSnapshot {
    /// Lower-cased package id → installed version (None when winget did not
    /// surface a parseable version column).
    by_id: HashMap<String, Option<String>>,
}

static WINGET_SNAPSHOT: OnceLock<std::sync::Mutex<Option<WingetSnapshot>>> =
    OnceLock::new();

fn winget_snapshot_cell() -> &'static std::sync::Mutex<Option<WingetSnapshot>> {
    WINGET_SNAPSHOT.get_or_init(|| std::sync::Mutex::new(None))
}

/// Take one batched `winget list` and cache its parsed map. Called by
/// `detect_all` before iterating recipes. Safe to call repeatedly; later
/// callers (e.g. `installer_redetect`) reuse the cached snapshot unless
/// they explicitly clear it.
pub fn refresh_winget_snapshot() {
    let parsed = run_winget_list().unwrap_or_default();
    *winget_snapshot_cell().lock().unwrap() = Some(parsed);
}

fn run_winget_list() -> Option<WingetSnapshot> {
    let output = no_window(&mut Command::new("winget"))
        .args([
            "list",
            "--source",
            "winget",
            "--disable-interactivity",
        ])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut by_id: HashMap<String, Option<String>> = HashMap::new();
    // `winget list` emits a header band ("Name Id Version …"), a separator
    // row of dashes, then one whitespace-separated data row per installed
    // package. The Id column may itself contain dots; we extract the id
    // and version using the column offsets discovered from the header row.
    let mut header_offsets: Option<(usize, usize, usize)> = None;
    for line in stdout.lines() {
        if header_offsets.is_none() {
            if let Some(o) = winget_header_offsets(line) {
                header_offsets = Some(o);
            }
            continue;
        }
        if line.trim_start().starts_with('-') {
            continue;
        }
        let (id_start, version_start, version_end) = header_offsets.unwrap();
        if line.len() < id_start {
            continue;
        }
        let id_slice = if line.len() >= version_start {
            &line[id_start..version_start]
        } else {
            &line[id_start..]
        };
        let id = id_slice.split_whitespace().next().unwrap_or("").to_string();
        if id.is_empty() {
            continue;
        }
        let version = if line.len() >= version_start {
            let end = version_end.min(line.len());
            let raw = &line[version_start..end];
            raw.split_whitespace().next().map(|s| s.to_string())
        } else {
            None
        };
        by_id.insert(id.to_ascii_lowercase(), version);
    }
    Some(WingetSnapshot { by_id })
}

fn winget_header_offsets(line: &str) -> Option<(usize, usize, usize)> {
    let id_idx = line.find("Id")?;
    let version_idx = line[id_idx..].find("Version").map(|o| id_idx + o)?;
    let after_version = &line[version_idx + "Version".len()..];
    let next_col = after_version
        .char_indices()
        .find(|(_, c)| !c.is_whitespace())
        .map(|(i, _)| version_idx + "Version".len() + i)
        .unwrap_or(line.len());
    Some((id_idx, version_idx, next_col))
}

fn detect_winget(id: &str) -> DetectedState {
    let cell = winget_snapshot_cell();
    let mut guard = cell.lock().unwrap();
    if guard.is_none() {
        // Single-recipe path (installer_redetect) hits this; take a snapshot
        // on demand so subsequent winget recipes in the same sweep are free.
        drop(guard);
        let parsed = run_winget_list().unwrap_or_default();
        *cell.lock().unwrap() = Some(parsed);
        guard = cell.lock().unwrap();
    }
    let snapshot = guard.as_ref().unwrap();
    match snapshot.by_id.get(&id.to_ascii_lowercase()) {
        Some(version) => DetectedState::installed(version.clone()),
        None => DetectedState::not_installed(),
    }
}

/// Discard the cached snapshot so the next `detect_winget`/`detect_all`
/// call re-queries `winget list`. Used by post-install/uninstall redetect
/// paths in commands.rs so an install that just landed is visible.
pub fn invalidate_winget_snapshot() {
    *winget_snapshot_cell().lock().unwrap() = None;
}

// ---- npm ---------------------------------------------------------------

fn detect_npm(pkg: &str) -> DetectedState {
    let output = match no_window(&mut Command::new("npm"))
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
                github_release_install_dir(tool_id).to_string_lossy().into_owned(),
            ));
        }
    };
    let version = parsed
        .get("version")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    DetectedState::installed(version).with_install_location(Some(
        github_release_install_dir(tool_id).to_string_lossy().into_owned(),
    ))
}

pub fn github_release_install_dir(tool_id: &str) -> PathBuf {
    let base = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    base.join("KKTerm").join("installer").join("bin").join(tool_id)
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

    #[test]
    fn bundle_state_reports_partial_counts() {
        let state = bundle_detected_state(1, 3);

        assert!(!state.installed);
        assert_eq!(state.partial_count, Some((1, 3)));
    }

    #[test]
    fn bundle_state_reports_installed_when_all_steps_are_installed() {
        let state = bundle_detected_state(2, 2);

        assert!(state.installed);
        assert_eq!(state.partial_count, None);
    }
}
