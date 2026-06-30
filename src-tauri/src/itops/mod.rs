// IT Ops Module backend (docs/ITOPS.md). A built-in site-operations Module:
// durable Sites, Batch Runs, and Automations. Sites are stored in the
// `itops_sites` table (CRUD commands + run-time resolver); the Site topology
// layer (Racks / Rack Devices, docs/SITE.md Phase B) lives in `site_storage`.

pub mod actions;
pub mod automation_commands;
pub mod automation_storage;
pub mod commands;
pub mod site_storage;
mod ids;
pub mod inventory;
pub mod run_storage;
pub mod runner;
pub mod storage;
pub mod types;
