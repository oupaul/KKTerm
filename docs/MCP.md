# KKTerm Built-in MCP Server (`kkterm-cli`)

## Overview

KKTerm includes a Rust-native stdio MCP server binary, `kkterm-cli`, that
exposes a curated set of in-app capabilities to external MCP-capable tools
(Claude Desktop, Claude Code, Codex, GitHub Copilot, Antigravity, etc.).

The binary is a thin forwarder. The actual tool handlers live inside the
running KKTerm app and are reached over a Windows named pipe established
by `src-tauri/src/mcp_bridge.rs`.

Tool names are organised by **Module** (activity-rail destinations such as
Workspace and Dashboard). Each Module owns a top-level namespace, and any
sensitive tool lives under that Module's `dangerous` sub-namespace so the
safety gate applies uniformly:

- `kkterm.<module>.*` — curated allowlist tools for the named Module.
- `kkterm.<module>.dangerous.*` — sensitive tools (mutate UI, run script
  widget code, click into remote desktops); gated by
  `built_in_mcp_allow_all_dangerous`.

Module namespaces in this build:

- `kkterm.workspace.*` — Workspace Module: saved Connections, live
  Sessions, and remote-desktop interaction.
- `kkterm.dashboard.*` — Dashboard Module: views, widget instances,
  AI-Created Widgets.

## Architecture

```
+--------------------+   stdio JSON-RPC   +--------------+   named pipe    +-------------+
|  external MCP      | <----------------> |  kkterm-cli  | <-------------> |  kkterm.exe |
|  client (Claude…)  |                    |  (forwarder) |    JSON-RPC     |  (bridge)   |
+--------------------+                    +--------------+                 +-------------+
                                                                                  |
                                                                                  v
                                                                          SessionManager,
                                                                          Storage, frontend
                                                                          event bus
```

- `initialize`, `tools/list`, `ping`, and `notifications/initialized` are
  answered locally by `kkterm-cli` so MCP clients can introspect the
  surface even when KKTerm.exe is not running.
- `tools/call` always forwards to the live app over the named pipe. When
  KKTerm.exe is not running (or the user has disabled the built-in MCP
  server), the binary returns a structured JSON-RPC error with
  `code: -32002` and `data.reason: "app_not_running"`.

## Transport

- **External transport:** stdio (one JSON-RPC message per line over
  stdin/stdout). The MCP client launches `kkterm-cli` as a child process.
- **Bridge transport:** Windows named pipe at
  `\\.\pipe\kkterm-mcp-<token-prefix>`. The pipe name is published in the
  bridge descriptor file (see below) along with a per-launch bearer token.
- **Bridge descriptor file:** `%APPDATA%\com.kkterm.app\mcp-bridge.json`.
  Written in a background startup thread when KKTerm.exe starts with the bridge
  enabled, removed on the next start before a new descriptor is written. Stale
  files cause clients to fail with `app_not_running`. On Windows, KKTerm uses
  hidden `whoami` and `icacls` child processes to resolve the current user SID,
  remove inherited ACLs, and grant only that SID full control before publishing
  the descriptor; if that hardening fails, the bridge does not start.
- **Auth:** the first framed line `kkterm-cli` sends on the pipe is the
  bearer token from the descriptor file. KKTerm.exe responds with
  `{"ok":true}` on success and closes the connection on mismatch.

### Windows descriptor ACL implementation note

The current implementation intentionally uses Windows command-line tools for
the descriptor ACL step: `whoami /user /fo csv /nh` provides the current
process user SID, and `icacls <path> /inheritance:r /grant:r *<SID>:(F)`
replaces inherited grants with full control for that SID only. `icacls.exe`
and `whoami.exe` are present on supported Windows installations, this keeps
the Rust code small, and the hardening runs once in a background bridge startup
thread rather than blocking the app startup path or a hot path. Both child
processes are launched with `CREATE_NO_WINDOW` so they do not flash console
windows. The bridge fails closed and deletes the descriptor if these tools
cannot be run or return an error.

A direct Win32 API implementation was considered for this hardening. It would
avoid spawning `whoami` and `icacls`, but it requires enabling additional
Windows security bindings such as `Win32_Security` and
`Win32_Security_Authorization` and writing careful `unsafe` code around APIs
such as `OpenProcessToken`, `GetTokenInformation`, `ConvertSidToStringSidW`,
`ConvertStringSecurityDescriptorToSecurityDescriptorW`, `SetFileSecurityW`,
`CloseHandle`, and `LocalFree`. If the command-line approach proves unreliable
in a supported Windows environment, revisit the direct Win32 path with focused
Windows runtime testing for handle cleanup, DACL protection, non-ASCII paths,
and domain/local account SID behavior.

## Tool safety model

Two settings live in `AiProviderSettings` and are surfaced under
**Settings → AI Assistant → Built-in MCP Server**:

| Setting key | Default | Effect |
|---|---|---|
| `built_in_mcp_server_enabled` | `true` | KKTerm.exe starts the named-pipe bridge on launch. When `false`, the descriptor file is deleted and no bridge is created. |
| `built_in_mcp_allow_all_dangerous` | `false` | When `true`, tools in any `kkterm.<module>.dangerous.*` namespace execute through the bridge. When `false`, the bridge returns a `permissionRequired` tool error for any dangerous call. The gate matches the literal segment `dangerous` anywhere in the dotted tool name, so new Modules can adopt the same convention without touching the gate. |

Remote MCP HTTP servers use HTTPS by default. Plain `http://` is accepted for
loopback hosts (`localhost`, `127.0.0.1`, and `::1`); other local/network HTTP
servers require the separate Settings → AI Assistant insecure Remote MCP HTTP
toggle.

The bridge reads both settings at startup. Toggling either takes effect on
the next KKTerm.exe launch.

## Tool list

### Workspace Module (`kkterm.workspace.*`)

The Workspace Module owns saved Connections and live Sessions
(terminals, SFTP browsers, RDP/VNC surfaces, WebView2 panes).

| Name | Description |
|---|---|
| `kkterm.workspace.connections.list` | List saved Connections (folders + connections) from KKTerm storage. |
| `kkterm.workspace.connections.open` | Open a saved Connection by `connectionId`. Routes through the existing AI assistant `connection_open` path and emits `assistant-open-connection` for the frontend to start the appropriate session (terminal, SSH, URL, RDP, VNC). |
| `kkterm.workspace.connections.screenshot` | Capture the visible Workspace Canvas for an open Connection by `connectionId`. The app activates the matching Tab before capture and returns a JPEG data URL plus dimensions. |
| `kkterm.workspace.sessions.list` | List live Sessions (terminal Panes, remote desktop targets, file browsers). Backed by `session_state`. |
| `kkterm.workspace.sessions.send_input` | Send text/keystrokes to a live terminal Pane. `submit: true` appends a terminal Enter key as carriage return (`\r`) after the text. Backed by `session_terminal_send_text`. |
| `kkterm.workspace.sessions.read_buffer` | Read a snapshot of the visible terminal buffer for a live Pane. Backed by `session_terminal_read_buffer`. |
| `kkterm.workspace.quick_commands.list` | List saved Quick Commands for a Connection's Quick Command Bar. Backed by `quick_command_list` through the frontend live-tool bridge because Quick Commands live in workspace storage. |
| `kkterm.workspace.quick_commands.read` | Read one saved Quick Command for a Connection by Quick Command id. Backed by `quick_command_read`. |

### Workspace Module — dangerous (`kkterm.workspace.dangerous.*`)

| Name | Description |
|---|---|
| `kkterm.workspace.dangerous.pointer_click` | Send a mouse click to a live RDP/VNC remote desktop surface. Requires `built_in_mcp_allow_all_dangerous = true`. Backed by `session_remote_desktop_mouse_click`. |

### Workspace Module — Quick Commands dangerous (`kkterm.workspace.quick_commands.dangerous.*`)

| Name | Description |
|---|---|
| `kkterm.workspace.quick_commands.dangerous.create` | Create a saved Quick Command for a Connection's Quick Command Bar. Requires `built_in_mcp_allow_all_dangerous = true`. Backed by `quick_command_create`; it saves a runnable shortcut but does not execute the command. |
| `kkterm.workspace.quick_commands.dangerous.edit` | Edit one saved Quick Command for a Connection's Quick Command Bar. Requires `built_in_mcp_allow_all_dangerous = true`. Backed by `quick_command_edit`; it updates a runnable shortcut but does not execute the command. |

### Dashboard Module (`kkterm.dashboard.*`)

Safe view/instance/layout operations. Backed by the same `dashboard_*` AI
tools in `src-tauri/src/ai.rs`, so MCP and the in-app assistant share one
storage and event path (`dashboard-changed` is emitted on mutations).

| Name | Description |
|---|---|
| `kkterm.dashboard.load_state` | Read the redacted Dashboard state (views + instances + AI widget metadata). |
| `kkterm.dashboard.screenshot_view` | Capture an entire Dashboard View by optional `viewId` (defaults to the active View). The app activates the Dashboard View before capture and returns a JPEG data URL plus dimensions. |
| `kkterm.dashboard.screenshot_widget` | Capture a single Dashboard Widget Instance region by `instanceId`. The app activates the owning Dashboard View before capture and returns a JPEG data URL plus dimensions. |
| `kkterm.dashboard.read_widget_source` | Fetch the script body of a single AI-Created Widget by id. |
| `kkterm.dashboard.create_view` | Add a new Dashboard view. |
| `kkterm.dashboard.update_view` | Edit a view (title, gridDensity). |
| `kkterm.dashboard.remove_view` | Delete a view and its instances. |
| `kkterm.dashboard.reorder_views` | Reorder views by id list. |
| `kkterm.dashboard.add_instance` | Place a widget instance on a view (built-in widget or AI widget by `sourceId`). |
| `kkterm.dashboard.update_instance` | Change a widget instance's size, position, preset, accent, or icon. |
| `kkterm.dashboard.remove_instance` | Remove a widget instance. |
| `kkterm.dashboard.apply_layout` | Bulk-update many instance positions on a single view. |

### Dashboard Module — dangerous (`kkterm.dashboard.dangerous.*`)

These tools touch executable widget code or wipe Dashboard data, so they
go through the `built_in_mcp_allow_all_dangerous` gate. The bridge looks
for the literal segment `dangerous` anywhere in the dotted tool name when
applying the gate, so every Module's `dangerous` sub-namespace gets the
same protection without any per-Module gate code.

| Name | Description |
|---|---|
| `kkterm.dashboard.dangerous.create_widget` | Create an AI-Created (script) Widget AND place it on a view. Requires `widgetArchetype` (`dataMonitor`, `metricChart`, `utilityInstrument`, `desktopObject`, `canvasToyGame`, or last-resort `generalWorkbench`) so callers choose the scaffold before providing script source. |
| `kkterm.dashboard.dangerous.create_custom_widget` | Create a reusable AI-Created Widget definition without placement. |
| `kkterm.dashboard.dangerous.update_custom_widget` | Edit an existing AI-Created Widget body/title/etc. |
| `kkterm.dashboard.dangerous.remove_custom_widget` | Delete an AI-Created Widget definition (use `forceDeleteInstances` to also remove placements). |
| `kkterm.dashboard.dangerous.reset` | Wipe the entire Dashboard. Irreversible. |

All tool inputs use JSON schemas published in `tools/list`. The handler in
the bridge translates the curated `kkterm.<module>.*` names into the
existing AI assistant tool functions in `src-tauri/src/ai.rs`, so MCP and
the in-app assistant share one implementation. Screenshot tools are safe
tools because they only read the currently rendered KKTerm UI, but they do
return image data that may include visible terminal, remote desktop, URL,
file, or widget content. They do not bypass the normal desktop rendering
path and cannot capture hidden/unmounted content.

### Adding a new Module

When a new activity-rail Module is added, give
it its own `kkterm.<module>.*` namespace and, if any of its tools touch
executable code or wipe data, a `kkterm.<module>.dangerous.*` sibling.
The gate, the `tools/list` discovery path, and the bridge dispatcher do
not need per-Module changes — only schema and dispatch arms.

## Feature growth contract (required for new MCP functions)

When adding a new built-in MCP function/tool, update all of the following
in the same PR:

1. `src-tauri/src/mcp_bridge.rs`
   - add an entry to `tool_descriptors()` (schema)
   - add a match arm in `dispatch_tool()` translating to the appropriate
     `crate::ai::connection_tool` / `crate::ai::live_session_tool` /
     `crate::ai::dashboard_tool` call
   - if the tool is sensitive, put it in a `*.dangerous.*` namespace so
     the existing `dangerous_tool()` gate catches it without changes
2. `src-tauri/src/bin/kkterm-cli.rs`
   - mirror the descriptor in `static_tool_descriptors()` so offline
     introspection still works
3. `docs/MCP.md`
   - add the tool to the namespace list above
   - document risk level and confirmation behavior
4. `docs/manual/15-settings.md`
   - update Built-in MCP Server setting behavior if safety toggles change
5. `AGENTS.md`
   - the update rule there references MCP docs; do not remove it

## Client setup examples

Use the `kkterm-cli` binary path in your MCP client settings. On Windows
the release build lives next to `kkterm.exe`.

- **Claude Code / Claude Desktop style config**
```json
{
  "mcpServers": {
    "kkterm": {
      "command": "<path-to-kkterm-cli>",
      "args": []
    }
  }
}
```

- **Codex-style local MCP command**
  - config location: `~/.codex/config.toml`
  - CLI command for user/global config: `codex mcp add kkterm -- <path-to-kkterm-cli>`
  - project-scoped config: manually add the same TOML shape to `.codex/config.toml`

```toml
[mcp_servers.kkterm]
command = "<path-to-kkterm-cli>"
args = []
```

- **GitHub Copilot agent/tooling that supports MCP stdio**
  - config location: `.vscode/mcp.json` in the workspace or the user MCP config
  - use the VS Code `MCP: Add Server` command or manually register `kkterm-cli`
    as an MCP stdio server command in the `servers` map

- **Antigravity / other MCP-capable clients**
  - config location: `~/.gemini/antigravity/mcp_config.json`
  - MCP settings use the common `mcpServers` JSON object
  - add a stdio server command pointing to `kkterm-cli`

- **OpenCode**
  - config location: `opencode.json`, commonly `~/.config/opencode/opencode.json`
  - manually add `kkterm` under the `mcp` object with local transport

After configuration, start KKTerm.exe (so the bridge is available),
reconnect the client, and run `tools/list` to verify connectivity. The
client should see the published tool list; `tools/call` requires KKTerm.exe
to be running.

Settings → AI Assistant → Built-in MCP Server includes a "Show config"
dialog with JSON and TOML snippets whose `command` is the resolved
`kkterm-cli` path beside the running `KKTerm.exe`. Its setup table shows
copyable command examples for clients that support CLI MCP registration and
config paths for clients that require manual editing.
Debug builds write built-in and remote MCP request/response records to
`mcp.debug.log` beside `kkterm.log`. Release builds write the same log only
when Settings → General → Debug → Advanced Debugging is enabled; enabling the
setting writes an `advanced_debugging.enabled` marker so the release logging
path is visible before the next MCP request. Built-in MCP debug records redact
terminal send input, terminal buffer reads, Dashboard widget source/body JSON,
and secret-looking argument fields before writing.

## Platform support

The bridge is Windows-only at this time. On macOS and Linux, `kkterm-cli`
builds and answers `initialize` / `tools/list` locally but every
`tools/call` returns `app_not_running` with a "Windows-only" detail.
Non-Windows transport is tracked as a follow-up.
