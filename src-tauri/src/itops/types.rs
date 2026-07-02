// IT Ops durable types (docs/ITOPS.md). Phase 1 covers Sites, Phase 2 the
// Batch Run report shapes, and Phase 3 the durable Automation.

use std::collections::HashMap;

use serde::{Deserialize, Deserializer, Serialize};

use crate::dashboard_storage::DashboardBackground;
use crate::watchdog::types::WatchdogConfig;

/// A durable Automation (docs/ITOPS.md Phase 3+): the persistent definition of a
/// Watchdog plus an ordered IT Ops action list. The live Watchdog runtime is the
/// sampler/trigger engine (its `config`); when it fires, the IT Ops action
/// executor runs `actions` in order (Phase 4). `enabled` rows re-arm on launch.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Automation {
    pub id: String,
    pub name: String,
    pub sort_order: i64,
    pub enabled: bool,
    /// Trigger/condition/poll/stop — the live Watchdog config. Its own
    /// `action` stays `Notify` for IT Ops Automations; the real work is the
    /// `actions` list below.
    pub config: WatchdogConfig,
    /// Ordered IT Ops actions run on each trigger fire by the action executor.
    #[serde(default)]
    pub actions: Vec<AutomationAction>,
}

/// How a `Notify` action surfaces.
#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum NotifyLevel {
    #[default]
    InApp,
    Toast,
    Sound,
}

/// The Phase 4 action catalog — a closed, typed set executed in order when an
/// Automation's trigger fires. Actions do not pass data between each other; each
/// reads the trigger snapshot. (AI intervention remains a Watchdog-native action
/// on `config`, not part of this list.)
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum AutomationAction {
    Notify {
        #[serde(default)]
        level: NotifyLevel,
    },
    Popup {
        title: String,
        body: String,
    },
    Email {
        to: Vec<String>,
        subject: String,
        body: String,
    },
    Webhook {
        url: String,
        #[serde(default = "default_webhook_method")]
        method: String,
        #[serde(default)]
        body: Option<String>,
    },
    RunBatch {
        // `hostGroupId` alias keeps Automation actions persisted before the
        // Site rename (docs/SITE.md Phase A) deserializable from actions_json.
        #[serde(alias = "hostGroupId")]
        site_id: String,
        task: BatchTask,
    },
}

fn default_webhook_method() -> String {
    "POST".to_string()
}

/// How a Batch Run reaches one host. Stored per Site as the default;
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

/// Optional dynamic membership filter resolved at run time: a Site picks up
/// later-added Connections that match these criteria. An empty filter is treated
/// as "no filter" and stored as NULL.
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SiteFilter {
    /// Connection `connection_type` values to include (e.g. `["ssh"]`).
    #[serde(default)]
    pub types: Vec<String>,
    /// Restrict to Connections directly in this folder.
    #[serde(default)]
    pub folder_id: Option<String>,
}

impl SiteFilter {
    pub fn is_empty(&self) -> bool {
        self.types.is_empty() && self.folder_id.is_none()
    }
}

/// Icon + background colour for a server room, stored on the owning Site.
#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoomIcon {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon_color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon_data_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon_background_color: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ServerRoom {
    pub id: String,
    pub site_id: String,
    pub name: String,
    pub sort_order: i64,
}

/// A durable, named selection of existing Connections used as a site target.
/// References Connection ids; owns no Session and no secret.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Site {
    pub id: String,
    pub name: String,
    pub sort_order: i64,
    pub member_ids: Vec<String>,
    #[serde(default)]
    pub filter: Option<SiteFilter>,
    pub transport: Transport,
    /// Custom background for the Site (server-room cards) view; reuses the
    /// Dashboard background machinery. None = theme default.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background: Option<DashboardBackground>,
    /// Per-server-room backgrounds, keyed by the room's string tag. Rooms are
    /// not entities, so their backgrounds live as a map on the owning Site.
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub room_backgrounds: HashMap<String, DashboardBackground>,
    /// Custom icon (data URL or lucide/material ref), foreground colour, and background colour.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon_color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon_data_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon_background_color: Option<String>,
    /// Per-server-room icons, keyed by the room's string tag.
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub room_icons: HashMap<String, RoomIcon>,
}

/// A Rack in a Site's virtual datacenter (docs/SITE.md): a fixed-height cabinet
/// grouped by `server_room`, holding Rack Devices at U positions. `items` is
/// hydrated on read (storage joins the items in U order). The topology is
/// Site → Server Room → Rack; older region/datacenter/area fields are retired.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Rack {
    pub id: String,
    pub site_id: String,
    pub name: String,
    #[serde(default)]
    pub server_room: String,
    /// Optional group tag within the server room (blank = "Ungrouped").
    #[serde(default)]
    pub rack_group: String,
    /// Cabinet shell colour: "black" (default) | "white" | "grey".
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shell: Option<String>,
    /// Custom background for this rack's single-rack stage view.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background: Option<DashboardBackground>,
    pub height_u: u32,
    /// Physical cabinet depth in millimetres.
    pub depth_mm: u32,
    pub sort_order: i64,
    #[serde(default)]
    pub items: Vec<RackItem>,
}

/// What a Rack Device represents. `Connection` items are openable (carry a
/// `connection_id`); the rest are passive inventory/visual devices.
#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum RackItemKind {
    Connection,
    Switch,
    Pdu,
    PatchPanel,
    Blank,
    Label,
    Server,
    Storage,
    Router,
    Firewall,
    Ups,
    Kvm,
    Equipment,
    General,
    Kuaiguai,
}

impl RackItemKind {
    pub fn as_db_str(self) -> &'static str {
        match self {
            RackItemKind::Connection => "connection",
            RackItemKind::Switch => "switch",
            RackItemKind::Pdu => "pdu",
            RackItemKind::PatchPanel => "patchPanel",
            RackItemKind::Blank => "blank",
            RackItemKind::Label => "label",
            RackItemKind::Server => "server",
            RackItemKind::Storage => "storage",
            RackItemKind::Router => "router",
            RackItemKind::Firewall => "firewall",
            RackItemKind::Ups => "ups",
            RackItemKind::Kvm => "kvm",
            RackItemKind::Equipment => "equipment",
            RackItemKind::General => "general",
            RackItemKind::Kuaiguai => "kuaiguai",
        }
    }

    pub fn from_db_str(value: &str) -> Option<Self> {
        match value {
            "connection" => Some(RackItemKind::Connection),
            "switch" => Some(RackItemKind::Switch),
            "pdu" => Some(RackItemKind::Pdu),
            "patchPanel" => Some(RackItemKind::PatchPanel),
            "blank" => Some(RackItemKind::Blank),
            "label" => Some(RackItemKind::Label),
            "server" => Some(RackItemKind::Server),
            "storage" => Some(RackItemKind::Storage),
            "router" => Some(RackItemKind::Router),
            "firewall" => Some(RackItemKind::Firewall),
            "ups" => Some(RackItemKind::Ups),
            "kvm" => Some(RackItemKind::Kvm),
            "equipment" => Some(RackItemKind::Equipment),
            "general" => Some(RackItemKind::General),
            "kuaiguai" => Some(RackItemKind::Kuaiguai),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RackNetworkPort {
    pub name: String,
    pub speed: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub oid: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RackSnmpHint {
    pub target: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub oid: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub community_secret_ref: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_refreshed_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum NetworkPortCompat {
    Typed(RackNetworkPort),
    Legacy(String),
}

#[derive(Deserialize)]
#[serde(untagged)]
enum SnmpCompat {
    Typed(RackSnmpHint),
    Legacy(String),
}

fn deserialize_network_ports<'de, D>(
    deserializer: D,
) -> Result<Option<Vec<RackNetworkPort>>, D::Error>
where
    D: Deserializer<'de>,
{
    let values = Option::<Vec<NetworkPortCompat>>::deserialize(deserializer)?;
    Ok(values.map(|entries| {
        entries
            .into_iter()
            .enumerate()
            .filter_map(|(index, entry)| match entry {
                NetworkPortCompat::Typed(mut port) => {
                    port.name = port.name.trim().to_string();
                    (!port.name.is_empty()).then_some(port)
                }
                NetworkPortCompat::Legacy(value) => {
                    let mut parts = value.splitn(2, ':');
                    let name = parts
                        .next()
                        .map(str::trim)
                        .filter(|value| !value.is_empty())
                        .map(ToString::to_string)
                        .unwrap_or_else(|| (index + 1).to_string());
                    let speed = parts
                        .next()
                        .map(str::trim)
                        .filter(|value| !value.is_empty())
                        .unwrap_or("custom")
                        .to_ascii_lowercase();
                    Some(RackNetworkPort {
                        name,
                        speed,
                        state: None,
                        oid: None,
                        note: None,
                    })
                }
            })
            .collect()
    }))
}

fn deserialize_snmp<'de, D>(deserializer: D) -> Result<Option<RackSnmpHint>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Option::<SnmpCompat>::deserialize(deserializer)?;
    Ok(value.and_then(|entry| match entry {
        SnmpCompat::Typed(mut snmp) => {
            snmp.target = snmp.target.trim().to_string();
            (!snmp.target.is_empty()).then_some(snmp)
        }
        SnmpCompat::Legacy(raw) => {
            let raw = raw.trim();
            if raw.is_empty() {
                return None;
            }
            let target_and_oid = raw.split('@').nth(1).unwrap_or(raw);
            let mut parts = target_and_oid.splitn(2, ':');
            let target = parts.next().unwrap_or("").trim().to_string();
            (!target.is_empty()).then(|| RackSnmpHint {
                target,
                oid: parts
                    .next()
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .map(ToString::to_string),
                community_secret_ref: None,
                last_refreshed_at: None,
                last_error: None,
            })
        }
    }))
}

/// Presentation-only metadata for a Rack Device. No secrets ever land here.
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RackItemMetadata {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub accent: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    /// Presentation status driving the device faceplate LEDs and dimming
    /// ("online" | "warning" | "offline"). Stored, not live-polled.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    /// Faceplate spec counts: visible ports (switch/router/patch panel) and
    /// drive bays (server/storage); battery and load are 0–100 percentages.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ports: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub disks: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub battery: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub load: Option<u32>,
    /// Device shell colour: "black" (default) | "white" | "grey".
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shell: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expiry: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rotation: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub yaw: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub connection_ids: Option<Vec<String>>,
    #[serde(
        default,
        deserialize_with = "deserialize_network_ports",
        skip_serializing_if = "Option::is_none"
    )]
    pub network_ports: Option<Vec<RackNetworkPort>>,
    #[serde(
        default,
        deserialize_with = "deserialize_snmp",
        skip_serializing_if = "Option::is_none"
    )]
    pub snmp: Option<RackSnmpHint>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kuaiguai_size: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vendor: Option<String>,
}

/// One device occupying a contiguous `start_u..start_u + height_u` span in a
/// Rack. `connection_id` is a soft reference to `connections.id` (None = passive).
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RackItem {
    pub id: String,
    pub rack_id: String,
    #[serde(default)]
    pub connection_id: Option<String>,
    pub kind: RackItemKind,
    #[serde(default)]
    pub label: String,
    pub start_u: u32,
    pub height_u: u32,
    #[serde(default)]
    pub metadata: RackItemMetadata,
}

/// Optional narrowing of a Batch Run to part of a Site's rack topology
/// (docs/SITE.md Phase D). When set, only the placed Connection items in the
/// matching racks are targeted. All provided (non-empty) fields must match.
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RunScope {
    #[serde(default)]
    pub rack_id: Option<String>,
    #[serde(default)]
    pub server_room: Option<String>,
}

impl RunScope {
    pub fn is_empty(&self) -> bool {
        self.rack_id.as_deref().unwrap_or("").is_empty()
            && self.server_room.as_deref().unwrap_or("").is_empty()
    }
}

/// One concrete site target produced by resolving a Site at run time.
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

/// One step of an interactive Playbook. The runner types `send` into the host's
/// PTY shell, then — when `expect` is set — waits until the streamed output
/// contains that literal substring before moving on (the "wait for a prompt,
/// then answer it" pattern). A step whose `expect` never appears within
/// `timeout_seconds` fails, which stops the Playbook on that host.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PlaybookStep {
    /// Short label shown in the run report (e.g. "update apt cache").
    pub name: String,
    /// Text sent to the interactive shell — a command, or an answer to a prompt
    /// (e.g. `y`, a path). A carriage return is appended by the runner.
    pub send: String,
    /// Literal substring to wait for in the output before the step is done.
    /// `None` (or empty) sends `send` and immediately advances.
    #[serde(default)]
    pub expect: Option<String>,
    /// Per-step wait budget for `expect`. Falls back to the run default when unset.
    #[serde(default)]
    pub timeout_seconds: Option<u64>,
}

/// What a Batch Run executes on each targeted host (docs/ITOPS.md).
/// - `Script` runs one free-form command on a fresh exec channel.
/// - `Playbook` runs an ordered, interactive expect-style step sequence over a
///   single PTY shell so a step can answer a prompt the previous step raised.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum BatchTask {
    Script {
        body: String,
        #[serde(default)]
        shell: Option<String>,
    },
    Playbook {
        name: String,
        steps: Vec<PlaybookStep>,
    },
}

impl BatchTask {
    /// A redacted, one-line label for the run-history audit log — never the full
    /// script body, which may embed secrets.
    pub fn summary(&self) -> String {
        match self {
            BatchTask::Script { body, .. } => {
                let first = body
                    .lines()
                    .map(str::trim)
                    .find(|line| !line.is_empty())
                    .unwrap_or("");
                let mut label = first.chars().take(80).collect::<String>();
                if first.chars().count() > 80 {
                    label.push('…');
                }
                if label.is_empty() {
                    "script".to_string()
                } else {
                    label
                }
            }
            // Playbooks carry a user-supplied name; the audit log shows it verbatim
            // (never the step bodies, which may embed secrets), falling back to a
            // neutral label when blank.
            BatchTask::Playbook { name, .. } => {
                let trimmed = name.trim();
                if trimmed.is_empty() {
                    "playbook".to_string()
                } else {
                    let mut label = trimmed.chars().take(80).collect::<String>();
                    if trimmed.chars().count() > 80 {
                        label.push('…');
                    }
                    label
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn playbook_summary_uses_name_or_falls_back() {
        let named = BatchTask::Playbook {
            name: "  Restart web tier  ".to_string(),
            steps: vec![],
        };
        assert_eq!(named.summary(), "Restart web tier");

        let blank = BatchTask::Playbook {
            name: "   ".to_string(),
            steps: vec![],
        };
        assert_eq!(blank.summary(), "playbook");
    }
}

/// The outcome of running a Batch Task on one host. `ok` means the transport
/// reached the host and the command exited 0.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ExecOutcome {
    pub ok: bool,
    pub exit_code: Option<i32>,
    pub output: String,
    /// Set when the transport itself failed (connect/auth/timeout).
    pub error: Option<String>,
}

/// One host's row in the consolidated, persisted run report.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HostReport {
    pub connection_id: String,
    pub name: String,
    pub host: String,
    pub transport: Transport,
    pub ok: bool,
    pub exit_code: Option<i32>,
    pub bytes_out: u64,
    pub duration_ms: u64,
    /// Full combined stdout/stderr for this host, so a saved Run Report can be
    /// reopened with output later. Capped (see `runner::cap_output`). Defaults to
    /// empty when deserializing older history rows written before output was
    /// persisted.
    #[serde(default)]
    pub output: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// The consolidated report blob stored in `itops_run_history.report_json`.
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RunReport {
    pub ok: usize,
    pub failed: usize,
    pub total: usize,
    pub hosts: Vec<HostReport>,
}

/// A persisted run-history entry (one finished Batch Run).
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunHistoryEntry {
    pub id: String,
    pub source: String,
    pub site_id: Option<String>,
    pub task_summary: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub report: RunReport,
}

/// A host as announced in the run's `Started` event (before execution).
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunEventHost {
    pub connection_id: String,
    pub name: String,
    pub host: String,
    pub transport: Transport,
}

/// Live Batch Run progress streamed to the frontend on the `itops://run`
/// channel. In-memory only; the durable record is the `RunReport`.
#[derive(Clone, Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum RunEvent {
    Started {
        run_id: String,
        site_id: Option<String>,
        task_summary: String,
        hosts: Vec<RunEventHost>,
    },
    HostStarted {
        run_id: String,
        connection_id: String,
    },
    /// An incremental stdout/stderr frame for a still-running host, streamed as
    /// it arrives. The frontend appends `chunk` to the host's live output; the
    /// authoritative full output still arrives in `HostFinished`.
    HostOutput {
        run_id: String,
        connection_id: String,
        chunk: String,
    },
    HostFinished {
        run_id: String,
        connection_id: String,
        ok: bool,
        exit_code: Option<i32>,
        output: String,
        duration_ms: u64,
        #[serde(skip_serializing_if = "Option::is_none")]
        error: Option<String>,
    },
    Finished {
        run_id: String,
        report: RunReport,
    },
    Canceled {
        run_id: String,
    },
}
