// Per-provider "what's the latest available version of this tool" queries.
// Manual or opt-in-daily; never auto-installs.

use std::process::Command;

use serde::Deserialize;
use serde_json::json;

use super::proc::no_window;
use super::schema::{Catalog, Provider, Recipe};

pub type LatestVersionResult = Result<Option<String>, String>;

pub fn latest_version(recipe: &Recipe) -> LatestVersionResult {
    crate::logging::installer_helper_debug(
        "latest.one.start",
        &json!({ "toolId": recipe.id, "provider": provider_kind(&recipe.provider) }),
    );
    let result = match &recipe.provider {
        Provider::Winget { id } => winget_latest(id),
        Provider::Npm { pkg } => npm_latest_for_recipe(pkg, recipe.release_notes_url.as_deref()),
        Provider::UvPip { package } => pypi_latest(package),
        Provider::DownloadInstaller { .. } => Ok(None),
        Provider::GithubRelease { repo, .. } => github_latest(repo),
        Provider::WindowsFeature { .. } => Ok(None),
        Provider::WslDistro { .. } => Ok(None),
        Provider::Bundle { .. } => Ok(None),
    };
    match &result {
        Ok(latest) => crate::logging::installer_helper_debug(
            "latest.one.ok",
            &json!({ "toolId": recipe.id, "provider": provider_kind(&recipe.provider), "latestVersion": latest }),
        ),
        Err(error) => crate::logging::installer_helper_debug(
            "latest.one.error",
            &json!({ "toolId": recipe.id, "provider": provider_kind(&recipe.provider), "error": error }),
        ),
    }
    result
}

pub fn latest_version_in_catalog(recipe: &Recipe, catalog: &Catalog) -> LatestVersionResult {
    crate::logging::installer_helper_debug(
        "latest.catalog.start",
        &json!({ "toolId": recipe.id, "provider": provider_kind(&recipe.provider) }),
    );
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

fn winget_latest(id: &str) -> LatestVersionResult {
    let manifest_latest_error = match winget_manifest_latest(id) {
        Ok(Some(version)) => return Ok(Some(version)),
        Ok(None) => None,
        Err(error) => Some(error),
    };

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
    if let Some(version) = winget_show_version_from_output(&stdout) {
        return Ok(Some(version));
    }
    if let Some(error) = manifest_latest_error {
        return Err(format!(
            "winget-pkgs lookup for `{id}` failed ({error}); winget show did not report a parseable Version line"
        ));
    }
    Err(format!("winget show `{id}` did not report a Version line"))
}

#[derive(Deserialize)]
struct GithubContentEntry {
    name: String,
    #[serde(rename = "type")]
    kind: String,
}

fn winget_manifest_latest(id: &str) -> LatestVersionResult {
    let client = crate::net::proxy::apply_blocking(reqwest::blocking::Client::builder())
        .user_agent("KKTerm-Installer/1")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|error| format!("failed to create winget-pkgs client: {error}"))?;
    let entries: Vec<GithubContentEntry> = client
        .get(winget_manifest_versions_url(id)?)
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.json())
        .map_err(|error| format!("GitHub manifest lookup failed: {error}"))?;
    Ok(latest_winget_manifest_version_from_entries(&entries))
}

fn winget_manifest_versions_url(id: &str) -> Result<String, String> {
    let first = id
        .chars()
        .next()
        .ok_or_else(|| "winget id is empty".to_string())?
        .to_ascii_lowercase();
    let path = id
        .split('.')
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>()
        .join("/");
    if path.is_empty() {
        return Err("winget id has no path segments".into());
    }
    Ok(format!(
        "https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests/{first}/{path}?ref=master"
    ))
}

fn latest_winget_manifest_version_from_entries(entries: &[GithubContentEntry]) -> Option<String> {
    entries
        .iter()
        .filter(|entry| entry.kind == "dir")
        .map(|entry| entry.name.trim())
        .filter(|name| looks_like_winget_version_value(name))
        .max_by(|a, b| compare_winget_versions(a, b))
        .map(|version| version.to_string())
}

fn winget_show_version_from_output(stdout: &str) -> Option<String> {
    for line in stdout.lines() {
        let trimmed = line.trim();
        let Some((label, value)) = trimmed.split_once(':') else {
            continue;
        };
        let value = value.trim();
        if value.is_empty() {
            continue;
        }
        if (label.trim().eq_ignore_ascii_case("version") || looks_like_winget_version_value(value))
            && looks_like_winget_version_value(value)
        {
            return Some(value.to_string());
        }
    }
    None
}

fn looks_like_winget_version_value(value: &str) -> bool {
    value
        .chars()
        .next()
        .is_some_and(|first| first.is_ascii_digit())
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_' | '+'))
}

fn compare_winget_versions(a: &str, b: &str) -> std::cmp::Ordering {
    let mut a_parts = a.split(['.', '-', '_', '+']);
    let mut b_parts = b.split(['.', '-', '_', '+']);
    loop {
        match (a_parts.next(), b_parts.next()) {
            (Some(a_part), Some(b_part)) => {
                let ordering = compare_winget_version_part(a_part, b_part);
                if !ordering.is_eq() {
                    return ordering;
                }
            }
            (Some(a_part), None) => {
                return if is_zero_version_remainder(a_part, a_parts) {
                    std::cmp::Ordering::Equal
                } else {
                    std::cmp::Ordering::Greater
                };
            }
            (None, Some(b_part)) => {
                return if is_zero_version_remainder(b_part, b_parts) {
                    std::cmp::Ordering::Equal
                } else {
                    std::cmp::Ordering::Less
                };
            }
            (None, None) => return std::cmp::Ordering::Equal,
        }
    }
}

pub(crate) fn installer_latest_is_newer(latest: &str, installed: &str) -> bool {
    compare_winget_versions(latest, installed).is_gt()
}

fn compare_winget_version_part(a: &str, b: &str) -> std::cmp::Ordering {
    match (a.parse::<u64>(), b.parse::<u64>()) {
        (Ok(a), Ok(b)) => a.cmp(&b),
        _ => a.to_ascii_lowercase().cmp(&b.to_ascii_lowercase()),
    }
}

fn is_zero_version_remainder<'a>(first: &str, mut rest: impl Iterator<Item = &'a str>) -> bool {
    first == "0" && rest.all(|part| part == "0")
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
    let client = crate::net::proxy::apply_blocking(reqwest::blocking::Client::builder())
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

fn npm_latest_for_recipe(pkg: &str, release_notes_url: Option<&str>) -> LatestVersionResult {
    if pkg.starts_with("github:") {
        return release_notes_url
            .and_then(github_releases_repo_from_url)
            .map(|repo| github_latest(&repo))
            .unwrap_or(Ok(None));
    }
    npm_latest(pkg)
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

fn github_releases_repo_from_url(url: &str) -> Option<String> {
    let path = url.strip_prefix("https://github.com/")?;
    let mut parts = path.split('/');
    let owner = parts.next()?.trim();
    let repo = parts.next()?.trim();
    let releases = parts.next()?.trim();
    if owner.is_empty() || repo.is_empty() || releases != "releases" {
        return None;
    }
    Some(format!("{owner}/{repo}"))
}

fn pypi_latest(package: &str) -> LatestVersionResult {
    let client = crate::net::proxy::apply_blocking(reqwest::blocking::Client::builder())
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
    let client = crate::net::proxy::apply_blocking(reqwest::blocking::Client::builder())
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
        .map(normalize_github_release_tag)
        .ok_or_else(|| format!("GitHub response for `{repo}` did not include tag_name"))
        .map(Some)
}

fn normalize_github_release_tag(tag: &str) -> String {
    tag.strip_prefix(['v', 'V'])
        .filter(|rest| rest.chars().next().is_some_and(|c| c.is_ascii_digit()))
        .unwrap_or(tag)
        .to_string()
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
    fn github_releases_repo_from_url_extracts_release_metadata_repo() {
        assert_eq!(
            github_releases_repo_from_url("https://github.com/alam00000/bentopdf/releases"),
            Some("alam00000/bentopdf".to_string())
        );
        assert_eq!(
            github_releases_repo_from_url(
                "https://github.com/alam00000/bentopdf/releases/tag/v2.8.5"
            ),
            Some("alam00000/bentopdf".to_string())
        );
        assert_eq!(
            github_releases_repo_from_url("https://github.com/goodtab/bentopdf"),
            None
        );
    }

    #[test]
    fn github_release_tag_normalizes_common_v_prefix() {
        assert_eq!(normalize_github_release_tag("v2.8.5"), "2.8.5");
        assert_eq!(normalize_github_release_tag("V2.8.5"), "2.8.5");
        assert_eq!(
            normalize_github_release_tag("release-2.8.5"),
            "release-2.8.5"
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
            "English output keeps winget parsing stable when the host honors it"
        );
    }

    #[test]
    fn winget_manifest_versions_url_maps_id_to_repository_path() {
        assert_eq!(
            winget_manifest_versions_url("Notepad++.Notepad++").unwrap(),
            "https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests/n/Notepad++/Notepad++?ref=master"
        );
        assert_eq!(
            winget_manifest_versions_url("7zip.7zip").unwrap(),
            "https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests/7/7zip/7zip?ref=master"
        );
    }

    #[test]
    fn latest_winget_manifest_version_uses_numeric_ordering() {
        let entries = vec![
            GithubContentEntry {
                name: ".validation".into(),
                kind: "dir".into(),
            },
            GithubContentEntry {
                name: "1.9.0".into(),
                kind: "dir".into(),
            },
            GithubContentEntry {
                name: "1.10.0".into(),
                kind: "dir".into(),
            },
            GithubContentEntry {
                name: "2.0.0".into(),
                kind: "file".into(),
            },
        ];

        assert_eq!(
            latest_winget_manifest_version_from_entries(&entries),
            Some("1.10.0".into())
        );
    }

    #[test]
    fn latest_winget_manifest_version_ignores_channel_directories() {
        let entries = vec![
            GithubContentEntry {
                name: "2.54.0".into(),
                kind: "dir".into(),
            },
            GithubContentEntry {
                name: "PreRelease".into(),
                kind: "dir".into(),
            },
            GithubContentEntry {
                name: "Insiders".into(),
                kind: "dir".into(),
            },
            GithubContentEntry {
                name: "Lite".into(),
                kind: "dir".into(),
            },
            GithubContentEntry {
                name: "Portable".into(),
                kind: "dir".into(),
            },
        ];

        assert_eq!(
            latest_winget_manifest_version_from_entries(&entries),
            Some("2.54.0".into())
        );
    }

    #[test]
    fn winget_show_version_parses_english_output() {
        let stdout = r#"Found uv [astral-sh.uv]
Version: 0.11.17
Publisher: Astral Software Inc.
"#;

        assert_eq!(
            winget_show_version_from_output(stdout),
            Some("0.11.17".to_string())
        );
    }

    #[test]
    fn winget_show_version_parses_traditional_chinese_output() {
        let stdout = r#"`msstore` 來源要求您必須先檢視下列合約，再使用。
Terms of Transaction: https://aka.ms/microsoft-store-terms-of-transaction
是否同意所有來源合約條款？
[Y] 是  [N] 否： y
找到 uv [astral-sh.uv]
版本: 0.11.17
發行者: Astral Software Inc.
"#;

        assert_eq!(
            winget_show_version_from_output(stdout),
            Some("0.11.17".to_string())
        );
    }

    #[test]
    fn winget_show_version_skips_non_version_urls() {
        let stdout = r#"Terms of Transaction: https://aka.ms/microsoft-store-terms-of-transaction
Publisher Url: https://github.com/astral-sh/uv/issues
Homepage: https://github.com/astral-sh/uv
"#;

        assert_eq!(winget_show_version_from_output(stdout), None);
    }

    #[test]
    fn winget_show_version_ignores_unknown_store_version() {
        let stdout = r#"Found Codex [9PLM9XGG6VKS]
Version: Unknown
Publisher: OpenAI
Installer:
  Installer Type: msstore
"#;

        assert_eq!(winget_show_version_from_output(stdout), None);
    }
}
