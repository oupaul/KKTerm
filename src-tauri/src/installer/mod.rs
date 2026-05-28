// Installer Helper Module — Windows dev-tool installer backed by a remote
// signed catalog. See docs/ADR/0007-installer-helper-remote-catalog.md for
// the trust model.

pub mod catalog;
pub mod commands;
pub mod detect;
pub mod events;
pub mod install;
pub mod latest_version;
pub mod options;
pub mod schema;
pub mod state;
pub mod trust;
pub mod uninstall;

pub use commands::InstallerRuntime;
