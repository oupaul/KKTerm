// IT Ops durable types (docs/ITOPS.md). Phase 1 covers Host Groups, Phase 2 the
// Batch Run report shapes, and Phase 3 the durable Automation.

use serde::{Deserialize, Serialize};

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
        host_group_id: String,
        task: BatchTask,
    },
}

fn default_webhook_method() -> String {
    "POST".to_string()
}

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

/// What a Batch Run executes on each targeted host (docs/ITOPS.md). Phase 2
/// implements `Script`; `Playbook` arrives in Phase 7.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum BatchTask {
    Script {
        body: String,
        #[serde(default)]
        shell: Option<String>,
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
        }
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
    pub host_group_id: Option<String>,
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
        host_group_id: Option<String>,
        task_summary: String,
        hosts: Vec<RunEventHost>,
    },
    HostStarted {
        run_id: String,
        connection_id: String,
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
