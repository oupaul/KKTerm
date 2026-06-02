// Typed deserialization of the Installer Helper remote catalog JSON.
//
// The schema is closed: every accepted recipe shape is one of five
// `Provider` variants. There is no `Custom`, no script string, and no URL
// the app evaluates as code. See ADR 0007 "Recipe shape — structured data
// only".

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

/// The catalog `schemaVersion` this build understands. A catalog with a
/// higher version is rejected and the app falls back to its cached copy.
pub const APP_SUPPORTED_CATALOG_SCHEMA: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Catalog {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    #[serde(rename = "generatedAt", default)]
    pub generated_at: Option<String>,
    pub recipes: Vec<Recipe>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Recipe {
    /// Stable catalog id, e.g. "vscode" or "node-bundle". Referenced from
    /// `needs` and bundle `steps`.
    pub id: String,
    /// Brand-untranslated display name, e.g. "VS Code".
    pub name: String,
    /// One-line English description shown in the Module page.
    pub description_en: String,
    /// Optional per-locale description overrides. Locale ids match the keys
    /// in `src/i18n/locales/`.
    #[serde(default)]
    pub description_locales: HashMap<String, String>,
    /// Recipe ids that must be installed first. May reference bundle ids.
    /// Detection short-circuits: if the dep is already present on the host,
    /// nothing is installed for it.
    #[serde(default)]
    pub needs: Vec<String>,
    /// Lucide icon name shown in the Module page, e.g. "Box" or "Terminal".
    /// Falls back to a generic icon if absent.
    #[serde(default)]
    pub icon: Option<String>,
    /// Catalog category tag, used only for UI grouping. Free-form string;
    /// unknown values bucket under "Other".
    #[serde(default)]
    pub category: Option<String>,
    pub provider: Provider,
    /// Optional direct-download installer fallback for winget recipes.
    #[serde(default, rename = "downloadProvider")]
    pub download_provider: Option<Provider>,
    /// Which options from the closed shared option set apply to this recipe.
    /// See `RecipeOptions` enum.
    #[serde(default)]
    pub options: Vec<RecipeOption>,
    /// Optional official project website, surfaced in the not-installed
    /// dialog. Free-form URL. Absent when the catalog entry has not yet
    /// been backfilled.
    #[serde(default)]
    pub homepage: Option<String>,
    /// Optional release-notes / changelog URL, surfaced in the
    /// not-installed dialog and as a "Latest release" link in the
    /// installed dialog. Frontend derives a fallback from the provider
    /// when this is None.
    #[serde(default)]
    pub release_notes_url: Option<String>,
    /// Optional fast local detection hints. These are intentionally separate
    /// from the provider: the provider says how KKTerm installs/updates a
    /// tool; detection says how an existing local install may appear.
    #[serde(default)]
    pub detection: Detection,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Detection {
    /// Exact subkey names under Windows Add/Remove Programs uninstall keys,
    /// e.g. `Git_is1`.
    #[serde(default)]
    pub registry_keys: Vec<String>,
    /// Exact Add/Remove Programs display names.
    #[serde(default)]
    pub display_names: Vec<String>,
    /// Case-insensitive display-name prefixes for installers that embed the
    /// version in the display name, e.g. `NVM for Windows 1.2.2`.
    #[serde(default)]
    pub display_name_prefixes: Vec<String>,
}

/// One declared step in an install plan, emitted via
/// `ProgressEvent::Plan` before any work begins. `id` is stable per
/// provider (`resolve`, `download`, `install`, …) and is echoed by
/// `StepStarted` / `StepFinished` / stdout-routing. `label_key` is an
/// i18n key under `installer.steps.*`; the frontend resolves it through
/// `t()`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanStep {
    pub id: String,
    pub label_key: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "camelCase")]
pub enum RecipeOption {
    /// `--scope user` vs `--scope machine`. Winget recipes only.
    Scope,
    /// Pin a specific version instead of "latest".
    Version,
    /// Override install location.
    Location,
    /// GitHub-release recipes only: add the extracted directory to PATH.
    AddToPath,
    /// Allow switching a winget recipe to its direct download installer.
    Provider,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Provider {
    Winget {
        /// e.g. "Microsoft.VisualStudioCode".
        id: String,
    },
    Npm {
        /// e.g. "@anthropic-ai/claude-code".
        pkg: String,
    },
    UvPip {
        /// e.g. "open-webui".
        package: String,
    },
    DownloadInstaller {
        /// Canonical vendor URL for a desktop installer (x64 by default).
        url: String,
        /// Stable local filename used for the temp download.
        #[serde(rename = "fileName")]
        file_name: String,
        /// Optional native ARM64 (`aarch64-pc-windows-msvc`) installer URL.
        /// When present and KKTerm is running on Windows on Arm, this is
        /// preferred over `url`, which otherwise installs an x64 build that runs
        /// under emulation. Requires `arm64FileName` to be set as well.
        #[serde(default, rename = "arm64Url", skip_serializing_if = "Option::is_none")]
        arm64_url: Option<String>,
        /// Local filename for the ARM64 download. Ignored unless `arm64Url` is
        /// also set.
        #[serde(
            default,
            rename = "arm64FileName",
            skip_serializing_if = "Option::is_none"
        )]
        arm64_file_name: Option<String>,
    },
    GithubRelease {
        /// "owner/repo".
        repo: String,
        /// Glob against asset filenames, e.g. "nssm-*-win.zip".
        #[serde(rename = "assetPattern")]
        asset_pattern: String,
        layout: GithubReleaseLayout,
        /// Optional PATH entry below the extracted install dir. Supports a
        /// `{tag}` placeholder for release tags such as `8.1.1`.
        #[serde(default, rename = "pathSubdir")]
        path_subdir: Option<String>,
    },
    WindowsFeature {
        /// DISM optional-feature name, e.g.
        /// "Microsoft-Windows-Subsystem-Linux".
        feature: String,
        /// Whether the feature requires a reboot to take effect. Dependents
        /// stay disabled until the reboot is acknowledged.
        #[serde(default)]
        reboot: bool,
    },
    WslDistro {
        /// Distribution name accepted by `wsl --install --distribution`.
        distro: String,
    },
    Bundle {
        /// Ordered recipe ids. Already-installed steps are skipped.
        steps: Vec<String>,
    },
}

impl Provider {
    /// For a [`Provider::DownloadInstaller`], return the architecture-appropriate
    /// `(url, file_name)`. When `prefer_arm64` is set and the recipe carries a
    /// native ARM64 asset, that asset wins; otherwise the default (x64) asset is
    /// used, which runs under emulation on Windows on Arm. Returns `None` for
    /// non-download providers.
    pub fn download_target(&self, prefer_arm64: bool) -> Option<(&str, &str)> {
        match self {
            Provider::DownloadInstaller {
                url,
                file_name,
                arm64_url,
                arm64_file_name,
            } => {
                if prefer_arm64 {
                    if let (Some(arm_url), Some(arm_file)) =
                        (arm64_url.as_deref(), arm64_file_name.as_deref())
                    {
                        return Some((arm_url, arm_file));
                    }
                }
                Some((url.as_str(), file_name.as_str()))
            }
            _ => None,
        }
    }
}

/// Whether the running build is native Windows on Arm (`aarch64`). Used to pick
/// ARM64 installer assets when the catalog offers them.
pub const fn prefer_native_arm64() -> bool {
    cfg!(target_arch = "aarch64")
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum GithubReleaseLayout {
    /// Asset is a .zip. Extract to install location.
    Zip,
    /// Asset is an .exe installer. Run silently.
    ExeInstaller,
    /// Asset is an .msi. Invoke msiexec /i /qn.
    Msi,
}

#[derive(Debug)]
pub enum SchemaError {
    UnsupportedVersion { found: u32, max_supported: u32 },
    DuplicateId(String),
    UnknownNeedsTarget { recipe: String, missing: String },
    UnknownBundleStep { bundle: String, missing: String },
    DependencyCycle(Vec<String>),
}

impl std::fmt::Display for SchemaError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::UnsupportedVersion {
                found,
                max_supported,
            } => write!(
                f,
                "catalog schemaVersion {found} is newer than this build supports (max {max_supported})",
            ),
            Self::DuplicateId(id) => write!(f, "duplicate recipe id `{id}`"),
            Self::UnknownNeedsTarget { recipe, missing } => write!(
                f,
                "recipe `{recipe}` declares needs `{missing}` which is not in the catalog",
            ),
            Self::UnknownBundleStep { bundle, missing } => write!(
                f,
                "bundle `{bundle}` declares step `{missing}` which is not in the catalog",
            ),
            Self::DependencyCycle(path) => {
                write!(f, "dependency cycle detected: {}", path.join(" -> "))
            }
        }
    }
}

impl std::error::Error for SchemaError {}

impl Catalog {
    /// Validate the catalog against the static rules in ADR 0007:
    /// supported schema, unique ids, all `needs` and bundle `steps` resolve,
    /// no dependency cycles.
    pub fn validate(&self) -> Result<(), SchemaError> {
        if self.schema_version > APP_SUPPORTED_CATALOG_SCHEMA {
            return Err(SchemaError::UnsupportedVersion {
                found: self.schema_version,
                max_supported: APP_SUPPORTED_CATALOG_SCHEMA,
            });
        }

        let mut ids = HashSet::new();
        for recipe in &self.recipes {
            if !ids.insert(recipe.id.clone()) {
                return Err(SchemaError::DuplicateId(recipe.id.clone()));
            }
        }

        for recipe in &self.recipes {
            for need in &recipe.needs {
                if !ids.contains(need) {
                    return Err(SchemaError::UnknownNeedsTarget {
                        recipe: recipe.id.clone(),
                        missing: need.clone(),
                    });
                }
            }
            if let Provider::Bundle { steps } = &recipe.provider {
                for step in steps {
                    if !ids.contains(step) {
                        return Err(SchemaError::UnknownBundleStep {
                            bundle: recipe.id.clone(),
                            missing: step.clone(),
                        });
                    }
                }
            }
        }

        self.check_cycles()
    }

    fn check_cycles(&self) -> Result<(), SchemaError> {
        // DFS with three colors. Edges: recipe.needs + bundle.steps.
        #[derive(Clone, Copy, PartialEq)]
        enum Color {
            White,
            Gray,
            Black,
        }
        let mut color: HashMap<&str, Color> = self
            .recipes
            .iter()
            .map(|r| (r.id.as_str(), Color::White))
            .collect();
        let recipes_by_id: HashMap<&str, &Recipe> =
            self.recipes.iter().map(|r| (r.id.as_str(), r)).collect();

        fn visit<'a>(
            node: &'a str,
            recipes_by_id: &HashMap<&'a str, &'a Recipe>,
            color: &mut HashMap<&'a str, Color>,
            stack: &mut Vec<&'a str>,
        ) -> Result<(), SchemaError> {
            match color.get(node).copied().unwrap_or(Color::White) {
                Color::Black => return Ok(()),
                Color::Gray => {
                    let cycle_start = stack.iter().position(|n| *n == node).unwrap_or(0);
                    let mut path: Vec<String> =
                        stack[cycle_start..].iter().map(|s| s.to_string()).collect();
                    path.push(node.to_string());
                    return Err(SchemaError::DependencyCycle(path));
                }
                Color::White => {}
            }
            color.insert(node, Color::Gray);
            stack.push(node);
            if let Some(recipe) = recipes_by_id.get(node) {
                for need in &recipe.needs {
                    visit(need.as_str(), recipes_by_id, color, stack)?;
                }
                if let Provider::Bundle { steps } = &recipe.provider {
                    for step in steps {
                        visit(step.as_str(), recipes_by_id, color, stack)?;
                    }
                }
            }
            stack.pop();
            color.insert(node, Color::Black);
            Ok(())
        }

        for recipe in &self.recipes {
            let mut stack = Vec::new();
            visit(recipe.id.as_str(), &recipes_by_id, &mut color, &mut stack)?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mk_winget(id: &str, name: &str, winget_id: &str) -> Recipe {
        Recipe {
            id: id.into(),
            name: name.into(),
            description_en: "".into(),
            description_locales: HashMap::new(),
            needs: vec![],
            icon: None,
            category: None,
            provider: Provider::Winget {
                id: winget_id.into(),
            },
            download_provider: None,
            options: vec![],
            homepage: None,
            release_notes_url: None,
            detection: Detection::default(),
        }
    }

    #[test]
    fn accepts_simple_catalog() {
        let catalog = Catalog {
            schema_version: 1,
            generated_at: None,
            recipes: vec![mk_winget("vscode", "VS Code", "Microsoft.VisualStudioCode")],
        };
        assert!(catalog.validate().is_ok());
    }

    #[test]
    fn rejects_newer_schema() {
        let catalog = Catalog {
            schema_version: 99,
            generated_at: None,
            recipes: vec![],
        };
        assert!(matches!(
            catalog.validate(),
            Err(SchemaError::UnsupportedVersion { .. })
        ));
    }

    #[test]
    fn rejects_duplicate_id() {
        let catalog = Catalog {
            schema_version: 1,
            generated_at: None,
            recipes: vec![mk_winget("a", "A", "X"), mk_winget("a", "A2", "Y")],
        };
        assert!(matches!(
            catalog.validate(),
            Err(SchemaError::DuplicateId(_))
        ));
    }

    #[test]
    fn rejects_unknown_needs() {
        let mut r = mk_winget("a", "A", "X");
        r.needs = vec!["ghost".into()];
        let catalog = Catalog {
            schema_version: 1,
            generated_at: None,
            recipes: vec![r],
        };
        assert!(matches!(
            catalog.validate(),
            Err(SchemaError::UnknownNeedsTarget { .. })
        ));
    }

    #[test]
    fn rejects_unknown_bundle_step() {
        let bundle = Recipe {
            id: "b".into(),
            name: "B".into(),
            description_en: "".into(),
            description_locales: HashMap::new(),
            needs: vec![],
            icon: None,
            category: None,
            download_provider: None,
            provider: Provider::Bundle {
                steps: vec!["ghost".into()],
            },
            options: vec![],
            homepage: None,
            release_notes_url: None,
            detection: Detection::default(),
        };
        let catalog = Catalog {
            schema_version: 1,
            generated_at: None,
            recipes: vec![bundle],
        };
        assert!(matches!(
            catalog.validate(),
            Err(SchemaError::UnknownBundleStep { .. })
        ));
    }

    #[test]
    fn detects_dependency_cycle() {
        let mut a = mk_winget("a", "A", "X");
        a.needs = vec!["b".into()];
        let mut b = mk_winget("b", "B", "Y");
        b.needs = vec!["a".into()];
        let catalog = Catalog {
            schema_version: 1,
            generated_at: None,
            recipes: vec![a, b],
        };
        assert!(matches!(
            catalog.validate(),
            Err(SchemaError::DependencyCycle(_))
        ));
    }

    /// The shipped catalog JSON at `installer/catalog.v1.json` MUST parse
    /// and pass `validate()`. Any catalog edit that breaks this test will
    /// be rejected at the next signing pass on the maintainer's machine,
    /// but catching it earlier here saves a round-trip.
    #[test]
    fn shipped_catalog_parses_and_validates() {
        let json = include_str!("../../../installer/catalog.v1.json");
        let catalog: Catalog =
            serde_json::from_str(json).expect("shipped catalog JSON should parse");
        catalog
            .validate()
            .expect("shipped catalog should pass validate()");
        // Sanity: every bundle step id is present (already enforced by
        // validate(), but a more readable assertion if it ever fires).
        let ids: std::collections::HashSet<&str> =
            catalog.recipes.iter().map(|r| r.id.as_str()).collect();
        for recipe in &catalog.recipes {
            for need in &recipe.needs {
                assert!(ids.contains(need.as_str()), "needs `{need}` missing");
            }
            if let Provider::Bundle { steps } = &recipe.provider {
                for step in steps {
                    assert!(ids.contains(step.as_str()), "bundle step `{step}` missing");
                }
            }
        }
    }

    #[test]
    fn shipped_openclaw_entry_targets_ai_agent_package() {
        let json = include_str!("../../../installer/catalog.v1.json");
        let catalog: Catalog =
            serde_json::from_str(json).expect("shipped catalog JSON should parse");
        let recipe = catalog
            .recipes
            .iter()
            .find(|recipe| recipe.id == "openclaw")
            .expect("catalog should include OpenClaw");

        assert_eq!(recipe.name, "OpenClaw");
        assert_eq!(
            recipe.homepage.as_deref(),
            Some("https://github.com/openclaw/openclaw")
        );
        assert!(matches!(
            &recipe.provider,
            Provider::Npm { pkg } if pkg == "openclaw"
        ));
        assert!(
            recipe.needs.contains(&"node-bundle".to_string()),
            "app-local OpenClaw install needs Node before npm can run"
        );
    }

    #[test]
    fn shipped_ai_platforms_include_managed_uv_pip_apps() {
        let json = include_str!("../../../installer/catalog.v1.json");
        let catalog: Catalog =
            serde_json::from_str(json).expect("shipped catalog JSON should parse");

        for (id, package) in [
            ("open-webui", "open-webui"),
            ("langflow", "langflow"),
            ("hermes-agent", "hermes-agent"),
        ] {
            let recipe = catalog
                .recipes
                .iter()
                .find(|recipe| recipe.id == id)
                .unwrap_or_else(|| panic!("catalog should include {id}"));

            assert!(matches!(
                &recipe.provider,
                Provider::UvPip { package: pkg } if pkg == package
            ));
            assert!(recipe.needs.contains(&"uv".to_string()));
        }
    }

    #[test]
    fn shipped_catalog_includes_requested_new_sections() {
        let json = include_str!("../../../installer/catalog.v1.json");
        let catalog: Catalog =
            serde_json::from_str(json).expect("shipped catalog JSON should parse");
        let ids: HashSet<&str> = catalog
            .recipes
            .iter()
            .map(|recipe| recipe.id.as_str())
            .collect();

        for id in [
            "opencode",
            "rustup",
            "codex-desktop",
            "claude-desktop",
            "hermes-agent",
            "flowise",
            "powertoys",
            "sysinternals-suite",
            "everything",
            "ditto",
            "tailscale",
            "rustdesk",
            "7zip",
            "sharex",
            "ffmpeg",
            "excalidraw",
        ] {
            assert!(ids.contains(id), "catalog should include {id}");
        }
    }

    #[test]
    fn shipped_desktop_agent_apps_use_stable_install_sources() {
        let json = include_str!("../../../installer/catalog.v1.json");
        let catalog: Catalog =
            serde_json::from_str(json).expect("shipped catalog JSON should parse");

        let codex = catalog
            .recipes
            .iter()
            .find(|recipe| recipe.id == "codex-desktop")
            .expect("catalog should include Codex Desktop");
        assert!(matches!(
            &codex.provider,
            Provider::DownloadInstaller { url, .. } if url.starts_with("https://get.microsoft.com/installer/download/")
        ));

        let claude = catalog
            .recipes
            .iter()
            .find(|recipe| recipe.id == "claude-desktop")
            .expect("catalog should include Claude Desktop");
        assert!(matches!(
            &claude.provider,
            Provider::Winget { id } if id == "Anthropic.Claude"
        ));
    }

    #[test]
    fn shipped_cli_agent_entries_match_current_catalog_intent() {
        let json = include_str!("../../../installer/catalog.v1.json");
        let catalog: Catalog =
            serde_json::from_str(json).expect("shipped catalog JSON should parse");

        let antigravity = catalog
            .recipes
            .iter()
            .find(|recipe| recipe.id == "antigravity-cli")
            .expect("catalog should include Antigravity CLI");
        assert_eq!(antigravity.name, "Antigravity CLI");
        assert_eq!(antigravity.category.as_deref(), Some("ai-agent"));
        assert!(antigravity.needs.is_empty());
        assert!(matches!(
            &antigravity.provider,
            Provider::DownloadInstaller { url, file_name, .. }
                if url == "https://antigravity.google/cli/install.cmd"
                    && file_name == "antigravity-cli-install.cmd"
        ));

        let opencode = catalog
            .recipes
            .iter()
            .find(|recipe| recipe.id == "opencode")
            .expect("catalog should include OpenCode CLI");
        assert_eq!(opencode.name, "OpenCode CLI");
        assert_eq!(opencode.category.as_deref(), Some("ai-agent"));
    }

    #[test]
    fn shipped_runtime_bundle_names_explain_selected_managers() {
        let json = include_str!("../../../installer/catalog.v1.json");
        let catalog: Catalog =
            serde_json::from_str(json).expect("shipped catalog JSON should parse");
        let node = catalog
            .recipes
            .iter()
            .find(|recipe| recipe.id == "node-bundle")
            .expect("catalog should include Node bundle");
        let python = catalog
            .recipes
            .iter()
            .find(|recipe| recipe.id == "python-bundle")
            .expect("catalog should include Python bundle");

        assert_eq!(node.name, "Node (nvm-windows)");
        assert_eq!(python.name, "Python (uv)");
    }

    #[test]
    fn bundle_resolves_steps() {
        let leaf_a = mk_winget("nvm", "nvm", "X");
        let leaf_b = mk_winget("node", "Node", "Y");
        let bundle = Recipe {
            id: "node-bundle".into(),
            name: "Node bundle".into(),
            description_en: "".into(),
            description_locales: HashMap::new(),
            needs: vec![],
            icon: None,
            category: None,
            download_provider: None,
            provider: Provider::Bundle {
                steps: vec!["nvm".into(), "node".into()],
            },
            options: vec![],
            homepage: None,
            release_notes_url: None,
            detection: Detection::default(),
        };
        let catalog = Catalog {
            schema_version: 1,
            generated_at: None,
            recipes: vec![leaf_a, leaf_b, bundle],
        };
        assert!(catalog.validate().is_ok());
    }

    #[test]
    fn download_target_prefers_arm64_asset_when_offered() {
        let provider = Provider::DownloadInstaller {
            url: "https://example.com/app-x64.exe".into(),
            file_name: "app-x64.exe".into(),
            arm64_url: Some("https://example.com/app-arm64.exe".into()),
            arm64_file_name: Some("app-arm64.exe".into()),
        };

        assert_eq!(
            provider.download_target(true),
            Some(("https://example.com/app-arm64.exe", "app-arm64.exe"))
        );
        assert_eq!(
            provider.download_target(false),
            Some(("https://example.com/app-x64.exe", "app-x64.exe"))
        );
    }

    #[test]
    fn download_target_falls_back_to_default_without_arm64_asset() {
        let provider = Provider::DownloadInstaller {
            url: "https://example.com/app-x64.exe".into(),
            file_name: "app-x64.exe".into(),
            arm64_url: None,
            arm64_file_name: None,
        };

        assert_eq!(
            provider.download_target(true),
            Some(("https://example.com/app-x64.exe", "app-x64.exe"))
        );
        // A bare arm64Url without a matching file name is ignored.
        let provider = Provider::DownloadInstaller {
            url: "https://example.com/app-x64.exe".into(),
            file_name: "app-x64.exe".into(),
            arm64_url: Some("https://example.com/app-arm64.exe".into()),
            arm64_file_name: None,
        };
        assert_eq!(
            provider.download_target(true),
            Some(("https://example.com/app-x64.exe", "app-x64.exe"))
        );
    }

    #[test]
    fn download_target_is_none_for_non_download_providers() {
        assert_eq!(
            Provider::Winget { id: "X".into() }.download_target(true),
            None
        );
    }

    #[test]
    fn shipped_catalog_offers_native_arm64_downloads() {
        let json = include_str!("../../../installer/catalog.v1.json");
        let catalog: Catalog =
            serde_json::from_str(json).expect("shipped catalog JSON should parse");

        // Recipes whose download fallback has a deterministic native ARM64 asset.
        let arm64_ready = [
            ("github-cli", "gh_2.93.0_windows_arm64.msi"),
            ("vscode", "win32-arm64-user"),
            ("rustup", "aarch64"),
        ];
        for (id, marker) in arm64_ready {
            let recipe = catalog
                .recipes
                .iter()
                .find(|recipe| recipe.id == id)
                .unwrap_or_else(|| panic!("catalog should include {id}"));
            let provider = recipe
                .download_provider
                .as_ref()
                .unwrap_or_else(|| panic!("{id} should have a download provider"));
            let (url, _) = provider
                .download_target(true)
                .unwrap_or_else(|| panic!("{id} download provider should resolve"));
            assert!(
                url.contains(marker),
                "{id} ARM64 download URL should contain {marker}, got {url}"
            );
            // The x64 path must not regress to the ARM64 asset.
            let (x64_url, _) = provider.download_target(false).unwrap();
            assert!(
                !x64_url.contains(marker),
                "{id} x64 download URL should not contain {marker}, got {x64_url}"
            );
        }
    }
}
