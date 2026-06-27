// IT Ops Module backend (docs/ITOPS.md). A built-in fleet-operations Module:
// durable Fleets, Batch Runs, and Automations. Fleets are stored in the
// `itops_fleets` table (CRUD commands + run-time resolver); the Fleet topology
// layer (Racks / Rack Items, docs/FLEET.md Phase B) lives in `fleet_storage`.

pub mod actions;
pub mod automation_commands;
pub mod automation_storage;
pub mod commands;
pub mod fleet_storage;
mod ids;
pub mod run_storage;
pub mod runner;
pub mod storage;
pub mod types;
