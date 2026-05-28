// Per-provider "what's the latest available version of this tool" queries.
// Manual or opt-in-daily; never auto-installs.

use std::process::Command;

use super::schema::{Provider, Recipe};

pub fn latest_version(recipe: &Recipe) -> Option<String> {
    match &recipe.provider {
        Provider::Winget { id } => winget_latest(id),
        Provider::Npm { pkg } => npm_latest(pkg),
        Provider::GithubRelease { repo, .. } => github_latest(repo),
        Provider::WindowsFeature { .. } => None,
        Provider::Bundle { .. } => None,
    }
}

fn winget_latest(id: &str) -> Option<String> {
    let output = Command::new("winget")
        .args([
            "show",
            "--id",
            id,
            "--exact",
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
    for line in stdout.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("Version:") {
            let v = rest.trim();
            if !v.is_empty() {
                return Some(v.to_string());
            }
        }
    }
    None
}

fn npm_latest(pkg: &str) -> Option<String> {
    let output = Command::new("npm")
        .args(["view", pkg, "version"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let v = stdout.trim();
    if v.is_empty() {
        None
    } else {
        Some(v.to_string())
    }
}

fn github_latest(repo: &str) -> Option<String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent("KKTerm-Installer/1")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .ok()?;
    let url = format!("https://api.github.com/repos/{repo}/releases/latest");
    let json: serde_json::Value = client
        .get(&url)
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.json())
        .ok()?;
    json.get("tag_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}
