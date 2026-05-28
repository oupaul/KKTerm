// Tauri event payloads streamed during install/uninstall/check operations.
// The frontend subscribes once on Module mount and routes events to per-tool
// detail panels by `tool_id`.

use serde::Serialize;

pub const PROGRESS_EVENT: &str = "installer://progress";

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ProgressEvent {
    /// A new step started, e.g. "Downloading", "Extracting", "Running
    /// installer". UI replaces the current-step label.
    Step {
        tool_id: String,
        message: String,
    },
    /// Captured stdout line from a child process.
    Stdout {
        tool_id: String,
        line: String,
    },
    /// Captured stderr line from a child process.
    Stderr {
        tool_id: String,
        line: String,
    },
    /// Determinate progress, 0.0..=1.0. Emitted by downloaders that know
    /// the content length. Not all providers can emit this.
    Progress {
        tool_id: String,
        ratio: f32,
    },
    /// Terminal state. UI moves the row to "Installed" / "Available" /
    /// surfaces an error.
    Completed {
        tool_id: String,
        installed_version: Option<String>,
    },
    Failed {
        tool_id: String,
        message: String,
    },
    Cancelled {
        tool_id: String,
    },
}
