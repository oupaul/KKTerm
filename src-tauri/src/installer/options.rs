// Closed shared option set for installs. The set is defined once here and
// in `src/modules/installer/types.ts`; adding a new option requires a
// matching change in both files plus an i18n key (ADR 0007).
//
// Recipes declare which subset of these options apply via the
// `Recipe.options` field. The frontend renders only those.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallOptions {
    /// "user" (default) | "machine". Winget recipes only. Ignored elsewhere.
    pub scope: Option<String>,
    /// Specific version string, or None for latest.
    pub version: Option<String>,
    /// Override install location. Winget: --location. Github-release:
    /// extraction target.
    pub location: Option<String>,
    /// Github-release recipes only: add the executable directory to user PATH.
    pub add_to_path: Option<bool>,
    /// Optional provider override for recipes that declare a supported fallback.
    /// Accepted values are "download", "chocolatey", and "npm".
    pub provider: Option<String>,
}
