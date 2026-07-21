// Portable-mode marker filename (single source of truth).
//
// An empty `kkterm-portable.marker` beside the executable is THE portable-mode
// switch (see `docs/PORTABLE.md`). Two independent code paths look for it and
// must never disagree on the name:
//
//   * `app_paths.rs` (inside kkterm.exe) reads it at launch to decide whether
//     the app runs in portable or installed mode.
//   * `bin/kkterm-cli.rs` (the stdio forwarder) reads it to bind a portable CLI
//     to its sibling `data/mcp-bridge.json` instead of the installed instance.
//
// The app crate uses it via `crate::portable_marker` (re-exported from
// `app_paths`); the CLI binary includes this exact source file with
// `#[path = "../portable_marker.rs"]` so it shares the constant without linking
// the whole `kkterm_lib` crate (keeping the forwarder thin). It has no
// dependencies, so it builds on every platform.

/// Empty marker file beside the executable that activates portable mode.
pub const PORTABLE_MARKER_FILENAME: &str = "kkterm-portable.marker";
