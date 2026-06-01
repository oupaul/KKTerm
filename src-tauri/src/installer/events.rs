// Tauri event payloads streamed during install/uninstall/check operations.
// The frontend subscribes once on Module mount and routes events to per-tool
// dialog/stepper state by `tool_id`.
//
// Stepper protocol: a provider runner that supports the n8n-style stepper
// emits `Plan` once before any work, then brackets each step with
// `StepStarted` / `StepFinished`. `Stdout` / `Stderr` / `Progress` carry an
// optional `step_id` so the frontend can route the line / ratio to the
// active step row. The legacy `Step { message }` variant remains for
// providers that have not been migrated to the structured plan yet and
// is rendered as a generic log line.
//
// Check-for-updates protocol: a fire-and-forget check emits one
// `CheckStarted` with the full id list, then one `CheckResult` per tool
// as its lookup lands, then one `CheckFinished`. Errors are surfaced
// per-tool — a single failed lookup does not abort the sweep.
//
// Detection protocol: Module entry can render cached registry state
// immediately, then run a streaming revalidation sweep. The sweep emits
// one `DetectResult` per tool as it lands so the grid updates tile-by-tile.

use serde::Serialize;

use super::schema::PlanStep;

pub const PROGRESS_EVENT: &str = "installer://progress";

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum ProgressEvent {
    /// Declared step list for the upcoming install/uninstall. Emitted once
    /// before any `StepStarted`. UI renders all steps as `pending`.
    #[allow(dead_code)]
    Plan {
        tool_id: String,
        steps: Vec<PlanStep>,
    },
    /// Stepper transitions. The active step is the most recent
    /// `StepStarted` that has not been matched by a `StepFinished`.
    #[allow(dead_code)]
    StepStarted {
        tool_id: String,
        step_id: String,
    },
    #[allow(dead_code)]
    StepFinished {
        tool_id: String,
        step_id: String,
        ok: bool,
        error: Option<String>,
    },
    /// Legacy free-form step label. Kept for providers that have not been
    /// migrated to the `Plan`/`StepStarted`/`StepFinished` protocol; the
    /// frontend renders these as generic log lines when a `Plan` is in
    /// effect, or as today's current-step label otherwise.
    Step {
        tool_id: String,
        message: String,
    },
    /// Captured stdout line from a child process.
    Stdout {
        tool_id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        step_id: Option<String>,
        line: String,
    },
    /// Captured stderr line from a child process.
    Stderr {
        tool_id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        step_id: Option<String>,
        line: String,
    },
    /// Determinate progress, 0.0..=1.0. Emitted by downloaders that know
    /// the content length. Not all providers can emit this.
    Progress {
        tool_id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        step_id: Option<String>,
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

    // ---- Check-for-updates streaming protocol -------------------------
    /// A check-for-updates sweep just started. UI shows a spinner and
    /// disables the Check button. `tool_ids` are the ids about to be
    /// queried, in submission order.
    CheckStarted {
        tool_ids: Vec<String>,
    },
    /// One tool's latest-version lookup landed. `latest_version` is None
    /// when the provider could not produce a version; `error` is set when
    /// the lookup itself failed (e.g. network/CLI error).
    CheckResult {
        tool_id: String,
        latest_version: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        error: Option<String>,
    },
    /// All queued tools have produced a `CheckResult` (or were cancelled).
    CheckFinished,

    // ---- Installed-tool detection streaming protocol -----------------
    DetectStarted {
        tool_ids: Vec<String>,
    },
    DetectResult {
        tool_id: String,
        state: super::detect::DetectedState,
    },
    DetectFinished,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::installer::detect::DetectedState;

    #[test]
    fn progress_event_fields_are_camel_case_for_frontend() {
        let event = ProgressEvent::DetectResult {
            tool_id: "nvm-windows".into(),
            state: DetectedState::installed(Some("1.2.2".into())),
        };

        let serialized = serde_json::to_value(event).unwrap();

        assert_eq!(serialized["kind"], "detectResult");
        assert_eq!(serialized["toolId"], "nvm-windows");
        assert!(serialized.get("tool_id").is_none());
        assert_eq!(serialized["state"]["installedVersion"], "1.2.2");
    }

    #[test]
    fn progress_event_list_fields_are_camel_case_for_frontend() {
        let event = ProgressEvent::DetectStarted {
            tool_ids: vec!["uv".into()],
        };

        let serialized = serde_json::to_value(event).unwrap();

        assert_eq!(serialized["kind"], "detectStarted");
        assert_eq!(serialized["toolIds"][0], "uv");
        assert!(serialized.get("tool_ids").is_none());
    }

    #[test]
    fn check_result_fields_are_camel_case_for_frontend() {
        let event = ProgressEvent::CheckResult {
            tool_id: "codex-cli".into(),
            latest_version: Some("0.135.0".into()),
            error: None,
        };

        let serialized = serde_json::to_value(event).unwrap();

        assert_eq!(serialized["kind"], "checkResult");
        assert_eq!(serialized["toolId"], "codex-cli");
        assert_eq!(serialized["latestVersion"], "0.135.0");
        assert!(serialized.get("tool_id").is_none());
        assert!(serialized.get("latest_version").is_none());
    }
}
