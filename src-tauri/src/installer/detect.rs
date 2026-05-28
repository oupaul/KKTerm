// Per-provider detection of whether a tool is currently installed on the
// host and, if so, what version. Results are NEVER persisted — they are
// always re-derived (ADR 0007 §"Persistence"). The Module's in-memory
// session cache holds them until the user clicks Refresh.

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;

use serde::Serialize;

use super::schema::{Catalog, GithubReleaseLayout, Provider, Recipe};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedState {
    pub installed: bool,
    pub installed_version: Option<String>,
    /// Only populated for bundles where some-but-not-all children are
    /// installed. Renders as "Partially installed (N/M)".
    pub partial_count: Option<(u32, u32)>,
}

impl DetectedState {
    pub fn not_installed() -> Self {
        Self {
            installed: false,
            installed_version: None,
            partial_count: None,
        }
    }
    pub fn installed(version: Option<String>) -> Self {
        Self {
            installed: true,
            installed_version: version,
            partial_count: None,
        }
    }
}

/// Detect every recipe in the catalog. Sequential — a 25-tool scan typically
/// finishes in ~3–5 s on a warm host (winget is the slow leg). The frontend
/// only runs this on first Module entry per session; subsequent visits use
/// the in-memory cache.
pub fn detect_all(catalog: &Catalog) -> HashMap<String, DetectedState> {
    let mut out: HashMap<String, DetectedState> = HashMap::new();
    // Detect leaves first so bundles can compose their result.
    let mut bundles: Vec<&Recipe> = Vec::new();
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
        }
    }
}

// ---- winget ------------------------------------------------------------

fn detect_winget(id: &str) -> DetectedState {
    let output = match Command::new("winget")
        .args([
            "list",
            "--id",
            id,
            "--exact",
            "--source",
            "winget",
            "--disable-interactivity",
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
    // The data row contains the id; the version is the 3rd whitespace-separated
    // column on lines following the header. We look for a row containing the
    // exact id, then take the next whitespace token after it as the version.
    for line in stdout.lines() {
        if let Some(after_id) = line.split(id).nth(1) {
            let version = after_id
                .split_whitespace()
                .next()
                .map(|s| s.to_string())
                .filter(|s| !s.is_empty());
            return DetectedState::installed(version);
        }
    }
    // Exit code said success but we couldn't parse — treat as installed,
    // unknown version.
    DetectedState::installed(None)
}

// ---- npm ---------------------------------------------------------------

fn detect_npm(pkg: &str) -> DetectedState {
    let output = match Command::new("npm")
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
        Err(_) => return DetectedState::installed(None),
    };
    let version = parsed
        .get("version")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    DetectedState::installed(version)
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
    let output = match Command::new("dism")
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
