// IT Ops Module backend (docs/ITOPS.md). A built-in fleet-operations Module:
// durable Host Groups, Batch Runs, and Automations. Phase 1 lands durable Host
// Groups (the `itops_host_groups` table, CRUD commands, and the run-time
// resolver); Batch Runs and the Automation runtime arrive in later phases.

pub mod actions;
pub mod automation_commands;
pub mod automation_storage;
pub mod commands;
mod ids;
pub mod run_storage;
pub mod runner;
pub mod storage;
pub mod types;
