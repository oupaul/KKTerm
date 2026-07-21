// Bundle identifier (single source of truth for the installed app-data folder).
//
// This is the Tauri bundle identifier from `tauri.conf.json`. Tauri names the
// installed app-data directory after it (`%APPDATA%\com.kkterm.app`,
// `$XDG_DATA_HOME/com.kkterm.app`, ...), so any code that reconstructs that
// installed path by hand must use the exact same string:
//
//   * `bin/kkterm-cli.rs` (the stdio forwarder) builds the installed
//     `mcp-bridge.json` path when it is not running beside a portable marker.
//     It cannot ask Tauri to resolve the app-data dir, so it needs this value.
//   * `ssh.rs` tests pin the expected installed `ssh_known_hosts` path against
//     this identifier (production resolves the dir through Tauri).
//
// The app crate uses it via `crate::bundle_identifier`; the CLI binary includes
// this exact source file with `#[path = "../bundle_identifier.rs"]` so it
// shares the constant without linking the whole `kkterm_lib` crate (keeping the
// forwarder thin). It has no dependencies, so it builds on every platform.
//
// NOTE: this is intentionally NOT the OS keychain service name. That value
// lives separately in `secrets.rs` and must stay stable on its own — it happens
// to equal this identifier today, but pinning stored secrets to the app-data
// folder name would risk losing access if the identifier ever changed.

/// Tauri bundle identifier; the folder name of the installed app-data directory.
pub const BUNDLE_IDENTIFIER: &str = "com.kkterm.app";
