// Per-provider "what's the latest available version of this tool" queries.
// Manual or opt-in-daily; never auto-installs.

use std::process::Command;

use super::proc::no_window;
use super::schema::{Catalog, Provider, Recipe};

pub type LatestVersionResult = Result<Option<String>, String>;

pub fn latest_version(recipe: &Recipe) -> LatestVersionResult {
    match &recipe.provider {
        Provider::Winget { id } => winget_latest(id),
        Provider::Npm { pkg } => npm_latest(pkg),
        Provider::UvPip { package } => pypi_latest(package),
        Provider::DownloadInstaller { .. } => Ok(None),
        Provider::GithubRelease { repo, .. } => github_latest(repo),
        Provider::WindowsFeature { .. } => Ok(None),
        Provider::WslDistro { .. } => Ok(None),
        Provider::Bundle { .. } => Ok(None),
    }
}

pub fn latest_version_in_catalog(recipe: &Recipe, catalog: &Catalog) -> LatestVersionResult {
    if let Provider::Bundle { steps } = &recipe.provider {
        if steps.len() == 1 {
            let child = catalog
                .recipes
                .iter()
                .find(|r| r.id == steps[0])
                .ok_or_else(|| format!("bundle step `{}` not found", steps[0]))?;
            return latest_version(child);
        }
        return Ok(None);
    }
    latest_version(recipe)
}

fn winget_latest(id: &str) -> LatestVersionResult {
    let output = no_window(&mut Command::new("winget"))
        .args(winget_show_args(id))
        .output()
        .map_err(|error| format!("failed to run winget show for `{id}`: {error}"))?;
    if !output.status.success() {
        return Err(format!(
            "winget show `{id}` failed: {}",
            command_error_text(&output.stderr, &output.stdout)
        ));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("Version:") {
            let v = rest.trim();
            if !v.is_empty() {
                return Ok(Some(v.to_string()));
            }
        }
    }
    Err(format!("winget show `{id}` did not report a Version line"))
}

fn winget_show_args(id: &str) -> Vec<&str> {
    vec![
        "show",
        "--id",
        id,
        "--exact",
        "--source",
        "winget",
        "--locale",
        "en-US",
        "--accept-source-agreements",
        "--disable-interactivity",
    ]
}

fn npm_latest(pkg: &str) -> LatestVersionResult {
    let client = reqwest::blocking::Client::builder()
        .user_agent("KKTerm-Installer/1")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|error| format!("failed to create npm registry client: {error}"))?;
    let body = client
        .get(npm_registry_url(pkg))
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.text())
        .map_err(|error| format!("npm registry lookup for `{pkg}` failed: {error}"))?;
    npm_latest_from_registry_document(&body)
        .ok_or_else(|| {
            format!("npm registry response for `{pkg}` did not include dist-tags.latest")
        })
        .map(Some)
}

fn npm_latest_from_registry_document(json: &str) -> Option<String> {
    let json: serde_json::Value = serde_json::from_str(json).ok()?;
    json.get("dist-tags")
        .and_then(|tags| tags.get("latest"))
        .and_then(|v| v.as_str())
        .filter(|v| !v.trim().is_empty())
        .map(|s| s.to_string())
}

fn npm_registry_url(pkg: &str) -> String {
    format!(
        "https://registry.npmjs.org/{}",
        encode_npm_package_name(pkg)
    )
}

fn pypi_latest(package: &str) -> LatestVersionResult {
    let client = reqwest::blocking::Client::builder()
        .user_agent("KKTerm-Installer/1")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|error| format!("failed to create PyPI client: {error}"))?;
    let url = format!("https://pypi.org/pypi/{package}/json");
    let json: serde_json::Value = client
        .get(url)
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.json())
        .map_err(|error| format!("PyPI lookup for `{package}` failed: {error}"))?;
    json.get("info")
        .and_then(|info| info.get("version"))
        .and_then(|v| v.as_str())
        .filter(|v| !v.trim().is_empty())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("PyPI response for `{package}` did not include info.version"))
        .map(Some)
}

fn encode_npm_package_name(pkg: &str) -> String {
    let mut encoded = String::with_capacity(pkg.len());
    for byte in pkg.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' | b'@' => {
                encoded.push(byte as char)
            }
            _ => {
                encoded.push('%');
                encoded.push_str(&format!("{byte:02X}"));
            }
        }
    }
    encoded
}

fn github_latest(repo: &str) -> LatestVersionResult {
    let client = reqwest::blocking::Client::builder()
        .user_agent("KKTerm-Installer/1")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|error| format!("failed to create GitHub client: {error}"))?;
    let url = format!("https://api.github.com/repos/{repo}/releases/latest");
    let json: serde_json::Value = client
        .get(&url)
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.json())
        .map_err(|error| format!("GitHub release lookup for `{repo}` failed: {error}"))?;
    json.get("tag_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("GitHub response for `{repo}` did not include tag_name"))
        .map(Some)
}

fn command_error_text(stderr: &[u8], stdout: &[u8]) -> String {
    let stderr = String::from_utf8_lossy(stderr).trim().to_string();
    if !stderr.is_empty() {
        return stderr;
    }
    let stdout = String::from_utf8_lossy(stdout).trim().to_string();
    if !stdout.is_empty() {
        return stdout;
    }
    "no output".into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn npm_registry_document_returns_dist_tag_latest() {
        let json = r#"{
            "name": "@openai/codex",
            "dist-tags": {
                "latest": "0.42.0",
                "beta": "0.43.0-beta.1"
            }
        }"#;

        assert_eq!(
            npm_latest_from_registry_document(json),
            Some("0.42.0".to_string())
        );
    }

    #[test]
    fn npm_registry_document_without_latest_is_unknown() {
        let json = r#"{
            "name": "example",
            "dist-tags": {
                "beta": "1.0.0-beta.1"
            }
        }"#;

        assert_eq!(npm_latest_from_registry_document(json), None);
    }

    #[test]
    fn npm_registry_url_percent_encodes_scoped_package_slash() {
        assert_eq!(
            npm_registry_url("@anthropic-ai/claude-code"),
            "https://registry.npmjs.org/@anthropic-ai%2Fclaude-code"
        );
    }

    #[test]
    fn winget_latest_accepts_source_agreements_for_first_run() {
        assert!(
            winget_show_args("Git.Git").contains(&"--accept-source-agreements"),
            "fresh Windows installs can fail noninteractive winget show until source agreements are accepted"
        );
    }

    #[test]
    fn winget_latest_requests_english_output_for_version_parsing() {
        assert!(
            winget_show_args("Git.Git")
                .windows(2)
                .any(|args| args == ["--locale", "en-US"]),
            "Version parsing depends on the English winget label"
        );
    }
}
