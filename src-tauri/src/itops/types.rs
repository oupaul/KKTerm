// IT Ops durable types (docs/ITOPS.md). Phase 1 covers Host Groups; the
// Automation/Batch types arrive with later phases.

use serde::{Deserialize, Serialize};

/// How a Batch Run reaches one host. Stored per Host Group as the default;
/// `Auto` means "derive from the Connection at run time" (resolved in Phase 2+).
#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum Transport {
    Ssh,
    Winrm,
    Psexec,
    #[default]
    Auto,
}

impl Transport {
    pub fn as_db_str(self) -> &'static str {
        match self {
            Transport::Ssh => "ssh",
            Transport::Winrm => "winrm",
            Transport::Psexec => "psexec",
            Transport::Auto => "auto",
        }
    }

    pub fn from_db_str(value: &str) -> Option<Self> {
        match value {
            "ssh" => Some(Transport::Ssh),
            "winrm" => Some(Transport::Winrm),
            "psexec" => Some(Transport::Psexec),
            "auto" => Some(Transport::Auto),
            _ => None,
        }
    }
}

/// Optional dynamic membership filter resolved at run time: a Host Group picks up
/// later-added Connections that match these criteria. An empty filter is treated
/// as "no filter" and stored as NULL.
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HostGroupFilter {
    /// Connection `connection_type` values to include (e.g. `["ssh"]`).
    #[serde(default)]
    pub types: Vec<String>,
    /// Restrict to Connections directly in this folder.
    #[serde(default)]
    pub folder_id: Option<String>,
}

impl HostGroupFilter {
    pub fn is_empty(&self) -> bool {
        self.types.is_empty() && self.folder_id.is_none()
    }
}

/// A durable, named selection of existing Connections used as a fleet target.
/// References Connection ids; owns no Session and no secret.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HostGroup {
    pub id: String,
    pub name: String,
    pub sort_order: i64,
    pub member_ids: Vec<String>,
    #[serde(default)]
    pub filter: Option<HostGroupFilter>,
    pub transport: Transport,
}

/// One concrete fleet target produced by resolving a Host Group at run time.
/// Lightweight and secret-free — the seam the Phase 2 Batch Run executor builds
/// on. Passwords/keys are never carried here; they stay in the keychain.
#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedHost {
    pub connection_id: String,
    pub name: String,
    pub host: String,
    pub username: String,
    pub port: Option<i64>,
    pub connection_type: String,
    pub transport: Transport,
}
