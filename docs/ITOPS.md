# IT Ops Module Architecture

The IT Ops Module is a built-in Activity Rail destination for fleet
operations: running the same task across many hosts at once and watching
signals to react automatically. It absorbs and evolves the in-memory
Watchdog into durable, saveable Automations.

This document describes the durable architecture. The decision record and
its trade-offs live in `docs/ADR/0011-it-ops-module.md`. When this doc
conflicts with `docs/ARCHITECTURE.md`, this doc wins for IT-Ops-internal
concerns.

## Scope

The IT Ops Module owns:

- **Host Groups** — durable named selections of existing Connections used
  as fleet targets.
- **Batch Runs** — fan-out task execution across a Host Group with
  per-host live output and a consolidated, saved run report.
- **Automations** — durable trigger → condition → action rules (the
  evolved Watchdog), including the live run loop and Status Bar surface.
- The Tauri commands the AI Assistant uses to draft and manage Host
  Groups and Automations.
- The IT Ops page-context projection supplied to the shared AI Assistant
  panel.

It does not own:

- The durable **Connection** model or Connection Tree (it only references
  Connection ids; `src/modules/workspace/`).
- **Secret** storage (SMTP/webhook/WinRM credentials live in the OS
  keychain under existing secret owners).
- The **Install Helper** catalog (the PsExec recipe is a normal catalog
  entry; `src-tauri/installer/`).
- Selective export/import shape (extends the ADR-0010 flow; it does not
  fork it).

## Why this is one Module, not three features

Batch Runs and Automations are the same primitive seen from two
directions. A Batch Run is a task executed **now** against a Host Group.
An Automation is a saved rule that may **run a Batch Run later** when a
trigger fires. They share the host-targeting model (Host Groups), the
fan-out executor, the transport adapters, and the run-history store.
Keeping them in one Module lets an Automation's `runBatch` action reuse
the exact executor a manual run uses.

## Domain Concepts

**Host Group** — a durable, named selection of fleet targets, stored in
`itops_host_groups`. It carries an ordered set of Connection ids plus an
optional dynamic filter (by Connection type and/or folder) resolved at
run time. A Host Group is **not** a Connection and owns no Session and no
secret. Resolving a Host Group yields a concrete list of Connections at
the moment a run starts; dynamic filters mean later-added Connections are
picked up automatically.
_Avoid_: host list, inventory, connection group (as a Connection type)

**Transport** — how a Batch Run reaches one host. Per host (derived from
the Connection, overridable per Host Group/run):

| Transport | Reaches | Backend |
| --- | --- | --- |
| `ssh` | SSH/Linux hosts and Windows hosts running OpenSSH | existing `russh` exec channel — no new transport code |
| `winrm` | Windows hosts over WS-Man/HTTP(S) | pure-Rust WinRM client; standard path for Windows Update playbooks |
| `psexec` | Windows hosts over SMB/named pipes | Sysinternals `PsExec` shipped via an Install Helper recipe |

**Batch Task** — what a run executes on every targeted host. Two kinds:

- `script` — a free-form command/script body the user supplies, sent to
  each host's transport.
- `playbook` — a curated, parameterized update sequence (`apt`, `dnf`,
  `yum`, Windows Update) with a **dry-run preview** and **explicit
  per-run approval** before any mutating step. Playbooks are pure data,
  like Install Helper recipes — no arbitrary script strings baked in.

**Batch Run** — one execution of a Batch Task against a resolved Host
Group. Live run state (per-host status, streamed stdout/stderr, exit
codes, cancellation) is **in-memory**; on completion a consolidated
report is written to `itops_run_history`. Concurrency is bounded
(mirroring the Connection Batch Importer's network-scan fan-out in
`src-tauri/src/import.rs`); a single slow or black-holed host must not
stall the others or the UI thread.

**Automation** — a durable rule stored in `itops_automations`: one
**trigger**, an optional **condition**, and an ordered list of
**actions**. It is the durable generalization of today's
`WatchdogConfig`. Definitions persist and **re-arm on app launch**;
their live poll/run state stays in-memory in the Automation runtime.

**Trigger** — generalizes `WatchdogTarget`. Existing samplers
(performance counter, ping, TCP reachability, SSH output silence) carry
over unchanged; new samplers add scheduled probe (cron), output regex
match, SFTP path change, inbound webhook, and a structured/unstructured
datasource poller (HTTP-JSON, command output, log file).

**Condition** — the existing `PredicateOp` set
(`gt/lt/gte/lte/eq/ne/contains/silenceFor`), evaluated by the unchanged
pure `evaluate_predicate`. Optional: a trigger like cron or webhook may
fire unconditionally.

**Action** — generalizes `WatchdogAction` into a finite typed catalog
executed in order when the rule fires:

| Action | Effect |
| --- | --- |
| `notify` | Status Bar / toast / sound, the current `Notify` behavior |
| `popup` | App-owned desktop popup dialog |
| `email` | SMTP send (credentials from keychain) |
| `webhook` | Outbound HTTP request to a declared origin |
| `runBatch` | Start a Batch Run on a named Host Group + Task |
| `aiIntervene` | The existing approval-gated AI sub-turn |

The catalog is closed and typed on purpose: it is the "light n8n" payoff
without becoming an open agent. Actions do not pass arbitrary data
between each other (no DAG); each reads the trigger snapshot.

## Persistence

Three SQLite tables (new schema version):

- `itops_host_groups` — id, name, ordered Connection ids, optional
  dynamic filter, transport defaults.
- `itops_automations` — id, name, enabled flag, trigger config, optional
  condition, ordered actions, poll/stop/suppression settings (the durable
  superset of `WatchdogConfig`).
- `itops_run_history` — id, source (manual run or automation id), task
  summary, started/finished, per-host outcome summary, consolidated
  report blob. Local-first; no telemetry.

Durable definitions only. **Live state never persists**: in-flight Batch
Run progress, Automation poll ticks, tick ring buffers, and runtime state
machines stay in memory in the runtime layer, consistent with the
High-Risk Invariant against putting Session/runtime state in durable
models. On launch, the Automation runtime hydrates enabled rows from
`itops_automations` and arms them; disabled rows are loaded but not
polled.

Secrets (SMTP password, webhook bearer token, WinRM/PsExec credentials)
live in the OS keychain under existing secret-owner ids; SQLite stores
only non-secret metadata and credential references. IT Ops state is
included in the selective export/import shape (ADR-0010) as non-secret
metadata.

## Runtime

The existing Watchdog runtime (`src-tauri/src/watchdog/registry.rs`) is
the Automation runtime, extended rather than rewritten:

- The per-rule `tokio::time::interval` task, `CancellationToken`,
  sustained-window tracking, stop-condition arbitration, and single
  `watchdog://event` channel are preserved.
- `evaluate_predicate` and the predicate/state enums are reused as-is.
- The trigger sampler dispatcher (a free function today) gains the new
  trigger kinds; the action executor gains the new action kinds. Both
  extension points already exist for exactly this.
- A startup hook reads `itops_automations` and creates one runtime entry
  per enabled rule.

The Batch Run executor is a sibling worker pool: resolve the Host Group,
open one transport task per host under a concurrency cap, stream progress
events on a channel, and assemble the report. SSH reuses the existing
transport; WinRM and PsExec are new transport adapters behind a common
`exec(host, task) -> stream` shape.

All exec, WinRM/SMTP/webhook I/O, and probes run through
`spawn_blocking`/worker tasks and report by event — never blocking the
UI/native thread (`docs/ARCHITECTURE.md` command-runtime boundaries).

## Frontend

`src/modules/itops/` owns the Module shell with three tabs (Host Groups,
Batch Runs, Automations). The live Batch Run view renders a per-host grid
with status chips and **live streamed output** (each host auto-reveals its
output as it arrives over the `itops://run` `HostOutput` frames; the SSH
transport streams incrementally via `run_remote_command_capture_streaming`).
A finished run's per-host output is persisted in the report, so the recent-runs
list opens a read-only **Run Report viewer** (`RunReportView`) that replays the
per-host output later.

Automations are created and edited in an n8n-style **node editor**
(`AutomationEditor.tsx`, built on `@xyflow/react`): the closed
trigger → condition → action[] pipeline is drawn as draggable nodes wired
left-to-right, with a side panel that edits the selected node. It stays a
fixed pipeline, not a free-form DAG (see "Action" above) — the canvas is a
visualization, not a new execution model. A **Test** button calls
`itops_test_automation` to sample the trigger once and report whether the
condition would fire, then renders a dry-run preview of the actions (no email,
webhook, or Batch Run is actually sent). The Status Bar indicator continues to
surface running Automations app-wide via the existing `WatchdogStatusBar`.

All user-visible strings use a new `itops` i18n namespace following the
i18n rules in `AGENTS.md`. New dialogs/sheets follow
`docs/DESIGN_LANGUAGE.md` and the dialog primitives in `src/app/ui/dialog`.

## AI Assistant integration

IT Ops commands are registered as approval-gated assistant tools, the
same model Dashboard uses. The assistant may draft a Host Group or an
Automation (trigger + condition + actions) from a typed schema; a
successful mutating tool emits an `itops-changed` backend event that
reloads the IT Ops store so the new rule appears without restart. The
page-context payload is a compact projection — Host Group names/counts,
Automation names/states, recent run summaries — never full run output,
streamed host buffers, secrets, or credential references. Mutating
actions (starting a Batch Run, enabling an Automation) go through the
existing approval flow; the assistant cannot run a fleet task silently.

## Migration from Watchdog

The Watchdog is not deleted — it is the seed of the Automation runtime.
Migration steps, at a design level:

1. Add the three SQLite tables and the schema version bump.
2. Add a durable `Automation` definition that is a superset of
   `WatchdogConfig`; load enabled rows at startup into the existing
   registry.
3. Extend the trigger dispatcher and action executor with the new kinds.
4. Build the Host Group resolver and the Batch Run executor (SSH first;
   WinRM and PsExec adapters next).
5. Add the `src/modules/itops/` Module shell and `itops` namespace;
   re-home the existing `WatchdogDetail`/`WatchdogStatusBar` views under
   the Automations tab while keeping the Status Bar indicator.

`CONTEXT.md`'s Watchdog entry is updated to note Automations are now
durable IT Ops rules while live run state remains in-memory.

## Concrete Data Model

This section grounds the durable shape in the existing storage conventions
(`src-tauri/src/storage.rs`). The schema is a single idempotent
`CURRENT_SCHEMA` string of `CREATE TABLE IF NOT EXISTS` statements applied
via `execute_batch` with `PRAGMA user_version`; adding tables is additive
and only requires bumping `SCHEMA_USER_VERSION` (currently 26 → 27).
Ordered lists use an integer `sort_order` column, matching
`dashboard_widget_instances`. Heavy/structured fields that are not queried
relationally are stored as JSON `TEXT` columns, matching
`dashboard_custom_widgets.body_json` and `settings_schema_json`.

### SQLite tables (appended to `CURRENT_SCHEMA`)

```sql
-- A named selection of existing Connections used as a fleet target.
CREATE TABLE IF NOT EXISTS itops_host_groups (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    sort_order      INTEGER NOT NULL,
    -- Ordered Connection ids: JSON array of strings, e.g. ["conn-1","conn-2"].
    member_ids_json TEXT NOT NULL DEFAULT '[]',
    -- Optional dynamic filter resolved at run time: {"types":["ssh"],"folderId":"..."}.
    filter_json     TEXT,
    -- Per-host-group transport default: 'ssh' | 'winrm' | 'psexec' | 'auto'.
    transport       TEXT NOT NULL DEFAULT 'auto'
        CHECK (transport IN ('ssh', 'winrm', 'psexec', 'auto')),
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- A durable trigger -> condition -> actions rule (the evolved Watchdog).
CREATE TABLE IF NOT EXISTS itops_automations (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    sort_order    INTEGER NOT NULL,
    enabled       INTEGER NOT NULL DEFAULT 1,
    -- Tagged-enum JSON. Superset of WatchdogTarget (see Rust types below).
    trigger_json  TEXT NOT NULL,
    -- Tagged-enum JSON of PredicateOp, or NULL for unconditional triggers.
    condition_json TEXT,
    -- JSON array of typed actions, executed in order.
    actions_json  TEXT NOT NULL DEFAULT '[]',
    -- Loop settings (poll_ms, stop, sustained_for_ms, suppression_ms): JSON object.
    runtime_json  TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One completed Batch Run (manual or fired by an automation). Append-only.
CREATE TABLE IF NOT EXISTS itops_run_history (
    id             TEXT PRIMARY KEY,
    -- 'manual' or 'automation:<automation_id>'.
    source         TEXT NOT NULL,
    host_group_id  TEXT,            -- soft reference; runs survive group deletion
    task_summary   TEXT NOT NULL,   -- redacted one-line task label, never the script body of secrets
    started_at     TEXT NOT NULL,
    finished_at    TEXT,
    -- Consolidated report: per-host {connectionId,host,transport,exitCode,ok,
    -- bytesOut,output} rows. `output` is the captured combined stdout/stderr,
    -- capped per host (runner::cap_output) so the Run Report viewer can replay it.
    report_json    TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_itops_run_history_source
    ON itops_run_history(source, started_at);
```

`itops_run_history` uses a **soft** `host_group_id` (no `REFERENCES`) so
deleting a Host Group does not erase its run history; the Dashboard tables
use hard `ON DELETE CASCADE` where cascade is desired, and this is the
deliberate opposite choice for an audit log.

### Rust types (`src-tauri/src/itops/types.rs`)

The durable `Automation` is a superset of `WatchdogConfig`. The existing
`PerformanceMetric`, `PredicateOp`, `WatchdogStop`, and the runtime state
machine are reused unchanged; only the target/action enums grow.

```rust
/// Durable rule. Mirrors WatchdogConfig + persistence/identity fields.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Automation {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub trigger: AutomationTrigger,
    #[serde(default)]
    pub condition: Option<PredicateOp>, // reused from watchdog::types
    pub actions: Vec<AutomationAction>,
    pub runtime: AutomationRuntime,     // poll_ms, stop, sustained_for_ms, suppression_ms
}

/// Superset of WatchdogTarget. Existing variants carry over verbatim.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum AutomationTrigger {
    // --- carried over from WatchdogTarget ---
    PerformanceCounter { metric: PerformanceMetric },
    SshSessionOutputSilence { session_id: String },
    Ping { host: String, #[serde(default)] port: Option<u16> },
    TcpReachable { host: String, port: u16 },
    // --- new in IT Ops ---
    /// Fires on a cron schedule; pairs with no condition or a probe condition.
    Schedule { cron: String },
    /// Regex match against streamed session/SSH output.
    OutputMatch { session_id: String, pattern: String },
    /// SFTP path mtime/size change under an SSH Connection.
    SftpChange { connection_id: String, remote_path: String },
    /// Inbound webhook hit (local listener path token); value = parsed body.
    WebhookIn { token: String },
    /// Polls a structured/unstructured datasource; value = extracted field.
    Datasource(DatasourceProbe),
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum DatasourceProbe {
    HttpJson { url: String, json_pointer: String }, // RFC 6901 pointer into the body
    CommandOutput { connection_id: String, command: String },
    LogFile { path: String },
}

/// Superset of WatchdogAction. `Notify` and `AiIntervene` are verbatim.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum AutomationAction {
    Notify { level: NotifyLevel },        // inApp | toast | sound
    Popup { title: String, body: String },
    Email { to: String, subject: String, body: String }, // SMTP creds via keychain
    Webhook { url: String, method: String, body: Option<String> },
    RunBatch { host_group_id: String, task: BatchTask },
    AiIntervene {                          // unchanged from watchdog::types
        goal: String,
        allowed_tools: Vec<String>,
        max_interventions: u32,
        suppression_ms: u64,
    },
}

/// What a Batch Run executes on each targeted host.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum BatchTask {
    Script { body: String, shell: Option<String> },
    Playbook { id: PlaybookId, params: serde_json::Value, dry_run: bool },
}

/// Curated, pure-data update sequences (no arbitrary script strings).
#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum PlaybookId { AptUpgrade, DnfUpgrade, YumUpgrade, WindowsUpdate }

/// Common transport interface; SSH/WinRM/PsExec each implement it.
pub trait Transport {
    /// Bounded, non-blocking; streams output frames on the returned channel.
    fn exec(&self, host: &ResolvedHost, task: &BatchTask) -> ExecStream;
}
```

### Secrets

Reuse the existing keychain owner model (`src-tauri/src/secrets.rs`). The
`SecretKind::EmailSmtpPassword` variant **already exists** — Email actions
reuse it. Two additions are needed:

- a `WebhookToken` secret kind for outbound webhook auth, and
- a `WinrmPassword` (and later `WinrmKerberos`) secret kind for the WinRM
  transport.

Owner ids follow the established pattern, e.g.
`itops-automation-secret:<automation_id>:<actionIndex>` for an action's
secret and `itops-host-group-secret:<group_id>:winrm` for a Host Group's
WinRM credential. SQLite stores only non-secret references.

## Implementation Phases

Sequenced so each phase ships something testable and the Watchdog keeps
working throughout. Each phase is one reviewable PR unless noted.

**Phase 0 — Module shell (no behavior change).** Add `ActivePage`
`"itops"`, the rail button + `itops.railLabel` i18n key, the `App.tsx`
mount/route arm (mirroring `installerMounted`), an empty
`src/modules/itops/` page with three placeholder tabs, and the `itops`
i18n namespace. No backend. Proves navigation and unblocks parallel work.

**Phase 1 — Host Groups (durable CRUD).** Schema bump to 27 with
`itops_host_groups`; `src-tauri/src/itops/storage.rs` repository
(add/list/update/remove/reorder) mirroring `dashboard_storage.rs`; typed
commands in `itops/commands.rs` registered in `generate_handler!`; the
Host Groups tab UI with a Connection multi-select + optional filter.
Resolver function turns a group into a concrete `Vec<Connection>` at run
time. Include Host Groups in selective export/import (ADR 0010).

**Phase 2 — Batch Run executor over SSH.** `itops/runner.rs` worker pool
reusing the `import.rs` `Semaphore`/atomic-progress/`app.emit` pattern;
the `Transport` trait with the SSH adapter built on the existing `russh`
exec path; live per-host run grid UI fed by an `itops://run` event
channel; write the consolidated report to `itops_run_history` on finish.
`BatchTask::Script` only. This delivers the headline "send a script to all
SSH hosts and get results back."

**Phase 3 — Automations: persist + re-arm the Watchdog.** Schema add
`itops_automations`; the durable `Automation` superset type; a startup
hook that hydrates enabled rows into the existing `WatchdogRegistry`;
extend `watchdog/commands.rs` (or new `itops/automation_commands.rs`) with
create/update/enable/disable/delete; re-home `WatchdogDetail` /
`WatchdogStatusBar` under the Automations tab while keeping the Status Bar
indicator. Existing trigger/action kinds only — pure migration of
behavior onto durable storage.

**Phase 4 — Action catalog.** Add `Popup`, `Email` (reusing
`EmailSmtpPassword`), `Webhook` (new `WebhookToken` secret), and
`RunBatch` (calls the Phase 2 runner) to the action executor. Each action
is independently testable against the pure rule evaluator.

**Phase 5 — New triggers.** Add `Schedule` (cron), `OutputMatch`,
`SftpChange`, `WebhookIn`, and `Datasource` samplers to the trigger
dispatcher. These are additive to the existing sampler free function.

**Phase 6 — WinRM + PsExec transports.** The thin WinRM/WS-Man client per
ADR 0012 (`reqwest` + `sspi` + `quick-xml`, new `WinrmPassword` secret);
the PsExec adapter with its Install Helper catalog recipe. Both implement
the same `Transport` trait, so the Phase 2 runner and UI are unchanged.

**Phase 7 — Update playbooks.** `BatchTask::Playbook` with the
`PlaybookId` set, dry-run preview, and explicit per-run approval. Windows
Update rides the Phase 6 WinRM transport; apt/dnf/yum ride SSH.

**Phase 8 — AI Assistant integration.** Register IT Ops mutating commands
as approval-gated assistant tools; emit `itops-changed` and add the
store-reload listener (mirroring `dashboard-changed`); add the compact,
metadata-only page-context projection.

Phases 0–3 are the minimum that delivers durable monitoring + SSH batch.
Phases 4–8 are independent and can be reordered by demand.

## Target `CONTEXT.md` Vocabulary (lands with Phase 3)

These entries are **not** yet true of the shipping code — Watchdogs are
in-memory-only today — so `CONTEXT.md` must not adopt them until the
Phase 3 persistence work lands. They are captured here as the drafted
target wording. The modeling principle is KKTerm's existing durable-vs-live
split: **Automation is to Watchdog as Connection is to Session** — the
Automation is the durable definition, the Watchdog is the live runtime
that executes it.

When Phase 3 lands, replace the current **Watchdog** entry in `CONTEXT.md`
with the following two entries and add the three new IT Ops terms:

> **Automation**:
> A durable IT Ops rule stored in SQLite (`itops_automations`): one
> trigger, an optional condition predicate, and an ordered list of typed
> actions (notify, popup, email, webhook, run a Batch Run, or AI
> intervention). Automations persist across app restart and re-arm on
> launch. An Automation is the durable definition; the live **Watchdog**
> runtime is what executes it, the same way a **Connection** is durable
> and a **Session** is its live runtime. Created and managed in the **IT
> Ops Module**. See `docs/ITOPS.md` and `src-tauri/src/itops/`.
> _Avoid_: watchdog (for the durable rule), workflow, job, saved alert
>
> **Watchdog**:
> The live runtime that executes an armed **Automation** (or an ad-hoc
> live monitor): it samples a target (performance counter, SSH Session
> output silence, ping, TCP reachability, schedule, output match, SFTP
> change, inbound webhook, or datasource probe) against a predicate and,
> on trigger, runs the Automation's actions. The running Watchdog state —
> ticks, trigger log, state machine, suppression window — is **in-memory
> only and does not persist across app restart**; its durable definition
> lives in the **Automation**. Surfaced through the **Watchdog Status Bar**
> indicator and a detail panel, not as a Connection or Session. See
> `src-tauri/src/watchdog/` and `src/watchdog/`.
> _Avoid_: monitor profile, durable watcher (the Automation is the durable part)
>
> **IT Ops Module**:
> A built-in Activity Rail Module for fleet operations: **Host Groups**,
> **Batch Runs**, and **Automations**. Lives with Dashboard and Install
> Helper above Settings. Not a Connection, Session, or Dashboard widget.
> See `docs/ITOPS.md` and `docs/ADR/0011-it-ops-module.md`.
> _Avoid_: operations center, fleet manager, orchestrator
>
> **Host Group**:
> A durable, named selection of existing Connections (plus an optional
> dynamic filter by type/folder) used as the fleet target for Batch Runs
> and Automation `runBatch` actions. Stored in `itops_host_groups`; it
> references Connection ids and owns no Session and no secret. It is not a
> Connection type.
> _Avoid_: inventory, host list, connection group (as a Connection type)
>
> **Batch Run**:
> One execution of a Batch Task (a script or a curated update playbook)
> across a resolved Host Group, fanned out with bounded concurrency over a
> per-host transport (SSH, WinRM, or PsExec). Live per-host progress and
> streamed output are in-memory; a consolidated report is written to
> `itops_run_history` on completion. The run is live runtime, not a
> durable definition.
> _Avoid_: broadcast, job, deployment

The matching `Namespace` entry in `CONTEXT.md` also gains an `itops`
namespace, and the **Activity Rail** entry lists IT Ops among the
built-in Modules.

