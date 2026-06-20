// Built-in MCP tool catalog (single source of truth).
//
// Both sides of the MCP transport publish the *same* `tools/list` surface:
//
//   * `mcp_bridge.rs` (inside kkterm.exe) answers `tools/list` when the app is
//     running and dispatches `tools/call` into the in-process AI tools.
//   * `bin/kkterm-cli.rs` (the stdio forwarder launched by external MCP
//     clients) answers `initialize` / `tools/list` locally so clients can
//     introspect the surface even when kkterm.exe is not running.
//
// Historically each side hand-maintained its own copy of the descriptor list,
// which drifted: the CLI mirror fell behind the bridge's enriched schemas and
// descriptions. This module is the one place the catalog lives. The bridge
// uses it via `crate::mcp_tool_catalog`; the CLI binary includes this exact
// source file with `#[path = "../mcp_tool_catalog.rs"]` so it shares the
// catalog without linking the whole `kkterm_lib` crate (keeping the forwarder
// thin). It depends only on `serde_json`, so it builds on every platform.

use serde_json::{Value, json};

/// The complete published MCP tool surface, in stable order. Adding a tool
/// here updates both the live bridge and the offline CLI introspection at
/// once — see the feature-growth contract in `docs/MCP.md`.
pub fn tool_descriptors() -> Vec<Value> {
    vec![
        json!({
            "name": "kkterm.workspace.connections.list",
            "description": "List saved Connections (folders + connections) from KKTerm storage.",
            "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
        }),
        json!({
            "name": "kkterm.workspace.connections.create",
            "description": "Create a saved Connection in KKTerm storage. Does not accept or store passwords or other secrets.",
            "inputSchema": connection_create_input_schema(),
        }),
        json!({
            "name": "kkterm.workspace.connections.update",
            "description": "Update one saved Connection in KKTerm storage. Submit the full updated Connection fields. Does not accept or store passwords or other secrets.",
            "inputSchema": connection_update_input_schema(),
        }),
        json!({
            "name": "kkterm.workspace.connections.rename",
            "description": "Rename one saved Connection by id.",
            "inputSchema": id_name_input_schema("connectionId"),
        }),
        json!({
            "name": "kkterm.workspace.connections.delete",
            "description": "Delete one saved Connection by id.",
            "inputSchema": id_input_schema("connectionId"),
        }),
        json!({
            "name": "kkterm.workspace.connections.move",
            "description": "Move one saved Connection to a folder and position. Use folderId null for the root list.",
            "inputSchema": move_connection_input_schema(),
        }),
        json!({
            "name": "kkterm.workspace.connection_folders.create",
            "description": "Create a Connection folder. Use parentFolderId null for a root folder.",
            "inputSchema": folder_create_input_schema(),
        }),
        json!({
            "name": "kkterm.workspace.connection_folders.rename",
            "description": "Rename one Connection folder by id.",
            "inputSchema": id_name_input_schema("folderId"),
        }),
        json!({
            "name": "kkterm.workspace.connection_folders.delete",
            "description": "Delete one Connection folder by id, including contained saved Connections and nested folders.",
            "inputSchema": id_input_schema("folderId"),
        }),
        json!({
            "name": "kkterm.workspace.connection_folders.move",
            "description": "Move one Connection folder to a parent folder and position. Use parentFolderId null for the root list.",
            "inputSchema": move_folder_input_schema(),
        }),
        json!({
            "name": "kkterm.workspace.connections.open",
            "description": "Open a saved Connection by its id. Starts the appropriate session (terminal, SSH, URL, RDP, VNC) inside the running KKTerm app.",
            "inputSchema": {
                "type": "object",
                "properties": {"connectionId": {"type": "string"}},
                "required": ["connectionId"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.workspace.connections.screenshot",
            "description": "Capture the visible Workspace surface for an open Connection by id. The app activates the Connection tab before capturing and returns a JPEG data URL plus dimensions.",
            "inputSchema": {
                "type": "object",
                "properties": {"connectionId": {"type": "string"}},
                "required": ["connectionId"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.workspace.sessions.list",
            "description": "List live Sessions (terminal Panes, remote desktop targets, file browsers).",
            "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
        }),
        json!({
            "name": "kkterm.workspace.sessions.send_input",
            "description": "Send text/keystrokes to a live terminal Pane.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "paneId": {"type": "string"},
                    "text": {"type": "string"},
                    "submit": {"type": "boolean", "description": "Append a terminal Enter key (carriage return) after the text."},
                },
                "required": ["paneId", "text"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.workspace.sessions.read_buffer",
            "description": "Read a snapshot of the visible terminal buffer for a live Pane.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "paneId": {"type": "string"},
                },
                "required": ["paneId"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.workspace.quick_commands.list",
            "description": "List saved Quick Commands for one Connection's Quick Command Bar.",
            "inputSchema": {
                "type": "object",
                "properties": {"connectionId": {"type": "string"}},
                "required": ["connectionId"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.workspace.quick_commands.read",
            "description": "Read one saved Quick Command from a Connection's Quick Command Bar by id.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "connectionId": {"type": "string"},
                    "id": {"type": "string"},
                },
                "required": ["connectionId", "id"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.workspace.quick_commands.dangerous.create",
            "description": "DANGEROUS: create a saved Quick Command for one Connection's Quick Command Bar. This saves a runnable shortcut but does not execute it. Requires built_in_mcp_allow_all_dangerous = true.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "connectionId": {"type": "string"},
                    "label": {"type": "string"},
                    "command": {"type": "string"},
                    "iconName": {"type": "string"},
                    "accentName": {"type": "string"},
                    "sendEnter": {"type": "boolean"},
                    "confirm": {"type": "boolean"},
                },
                "required": ["connectionId", "label", "command"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.workspace.quick_commands.dangerous.edit",
            "description": "DANGEROUS: edit one saved Quick Command for a Connection's Quick Command Bar. This updates a runnable shortcut but does not execute it. Requires built_in_mcp_allow_all_dangerous = true.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "connectionId": {"type": "string"},
                    "id": {"type": "string"},
                    "label": {"type": "string"},
                    "command": {"type": "string"},
                    "iconName": {"type": "string"},
                    "accentName": {"type": "string"},
                    "sendEnter": {"type": "boolean"},
                    "confirm": {"type": "boolean"},
                },
                "required": ["connectionId", "id"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.workspace.dangerous.pointer_click",
            "description": "DANGEROUS: send a mouse click to a live RDP/VNC remote desktop surface. Requires built_in_mcp_allow_all_dangerous = true.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "paneId": {"type": "string"},
                    "x": {"type": "integer"},
                    "y": {"type": "integer"},
                    "button": {"type": "string", "enum": ["left", "right", "middle"]},
                },
                "required": ["paneId", "x", "y"],
                "additionalProperties": false,
            },
        }),
        // -- Workspace: SFTP/FTP file browser ------------------------------
        json!({
            "name": "kkterm.workspace.file_browser.list",
            "description": "List entries in an active SFTP/FTP file browser Session. Defaults to the browser's current remote path. Use sessions.list to discover the tabId.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "tabId": {"type": "string", "description": "File browser Tab id. Defaults to the active file browser when omitted."},
                    "path": {"type": "string", "description": "Remote directory to list. Defaults to the browser's current path when omitted."},
                },
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.workspace.file_browser.dangerous.create_folder",
            "description": "DANGEROUS: create a folder in an active SFTP/FTP file browser Session. Requires built_in_mcp_allow_all_dangerous = true.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "tabId": {"type": "string"},
                    "parentPath": {"type": "string"},
                    "name": {"type": "string"},
                },
                "required": ["parentPath", "name"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.workspace.file_browser.dangerous.rename",
            "description": "DANGEROUS: rename a path in an active SFTP/FTP file browser Session. Requires built_in_mcp_allow_all_dangerous = true.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "tabId": {"type": "string"},
                    "path": {"type": "string"},
                    "newName": {"type": "string"},
                },
                "required": ["path", "newName"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.workspace.file_browser.dangerous.delete",
            "description": "DANGEROUS: delete a path in an active SFTP/FTP file browser Session. Requires built_in_mcp_allow_all_dangerous = true.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "tabId": {"type": "string"},
                    "path": {"type": "string"},
                },
                "required": ["path"],
                "additionalProperties": false,
            },
        }),
        // -- Workspace: remote desktop (RDP/VNC) capture and input ----------
        json!({
            "name": "kkterm.workspace.sessions.remote_desktop_screenshot",
            "description": "Capture the active RDP/VNC remote desktop surface as a PNG data URL for visual inspection. Defaults to the active remote desktop Pane.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "paneId": {"type": "string", "description": "Remote desktop Pane id. Defaults to the active remote desktop when omitted."},
                },
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.workspace.dangerous.remote_desktop_send_text",
            "description": "DANGEROUS: type text into a live RDP/VNC remote desktop Session. Set pressEnter true to submit. Requires built_in_mcp_allow_all_dangerous = true.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "paneId": {"type": "string"},
                    "text": {"type": "string"},
                    "pressEnter": {"type": "boolean"},
                },
                "required": ["text"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.workspace.dangerous.remote_desktop_keypress",
            "description": "DANGEROUS: send a named key press to a live RDP/VNC remote desktop Session. Requires built_in_mcp_allow_all_dangerous = true.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "paneId": {"type": "string"},
                    "key": {"type": "string", "enum": ["enter", "tab", "escape", "backspace", "delete", "arrowUp", "arrowDown", "arrowLeft", "arrowRight", "home", "end", "pageUp", "pageDown", "space", "ctrlAltDelete"]},
                },
                "required": ["key"],
                "additionalProperties": false,
            },
        }),
        // -- Dashboard: views, instances, layout --------------------------
        json!({
            "name": "kkterm.dashboard.load_state",
            "description": "Load full Dashboard state: views, instances, and AI-Created Widget metadata. Widget bodies are returned as `bodyMeta` (size, library hints); call read_widget_source to fetch the actual script.",
            "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
        }),
        json!({
            "name": "kkterm.dashboard.screenshot_view",
            "description": "Capture an entire Dashboard View. If viewId is omitted, captures the active Dashboard View. Returns a JPEG data URL plus dimensions.",
            "inputSchema": {
                "type": "object",
                "properties": {"viewId": {"type": "string"}},
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.screenshot_widget",
            "description": "Capture a single Dashboard Widget Instance region by id. The app activates the owning Dashboard View before capturing and returns a JPEG data URL plus dimensions.",
            "inputSchema": {
                "type": "object",
                "properties": {"instanceId": {"type": "string"}},
                "required": ["instanceId"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.read_widget_source",
            "description": "Fetch the script body of a single AI-Created Widget by id.",
            "inputSchema": {
                "type": "object",
                "properties": {"id": {"type": "string"}},
                "required": ["id"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.create_view",
            "description": "Add a new Dashboard view (tab). `gridDensity` is optional ('cozy' | 'compact'); defaults to the app default.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "gridDensity": {"type": "string"},
                },
                "required": ["title"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.update_view",
            "description": "Edit an existing Dashboard view. `patch` supports the same fields as create_view (title, gridDensity).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "patch": {"type": "object"},
                },
                "required": ["id", "patch"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.remove_view",
            "description": "Delete a Dashboard view and all its instances.",
            "inputSchema": {
                "type": "object",
                "properties": {"id": {"type": "string"}},
                "required": ["id"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.reorder_views",
            "description": "Reorder Dashboard views by supplying their ids in the desired order.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "orderedIds": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["orderedIds"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.add_instance",
            "description": "Place a new widget instance on a view. For built-in widgets, set kind to e.g. 'connection', 'app_launcher', etc. For AI-Created Widgets, set kind = 'script' and sourceId to the widget's id. Grid coordinates are 0-11 columns wide.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "viewId": {"type": "string"},
                    "kind": {"type": "string"},
                    "sourceId": {"type": "string"},
                    "preset": {"type": "string"},
                    "accentName": {"type": "string"},
                    "iconName": {"type": "string"},
                    "gridX": {"type": "integer", "minimum": 0, "maximum": 11},
                    "gridY": {"type": "integer", "minimum": 0},
                    "gridW": {"type": "integer", "minimum": 1, "maximum": 12},
                    "gridH": {"type": "integer", "minimum": 1},
                },
                "required": ["viewId", "kind"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.update_instance",
            "description": "Change a widget instance's size, position, preset, accent, or icon. Use `patch` with any subset of: gridX, gridY, gridW, gridH, preset, accentName, iconName.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "patch": {"type": "object"},
                },
                "required": ["id", "patch"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.remove_instance",
            "description": "Remove a widget instance from its view.",
            "inputSchema": {
                "type": "object",
                "properties": {"id": {"type": "string"}},
                "required": ["id"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.apply_layout",
            "description": "Bulk update of multiple instance positions on a single view. `layout` is an array of {id, gridX, gridY, gridW, gridH} entries.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "viewId": {"type": "string"},
                    "layout": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "gridX": {"type": "integer"},
                                "gridY": {"type": "integer"},
                                "gridW": {"type": "integer"},
                                "gridH": {"type": "integer"},
                            },
                            "required": ["id"],
                        },
                    },
                },
                "required": ["viewId", "layout"],
                "additionalProperties": false,
            },
        }),
        // -- Dashboard: AI-Created Widget management (executes user scripts) --
        json!({
            "name": "kkterm.dashboard.dangerous.create_widget",
            "description": "DANGEROUS: create an AI-Created (script) Widget AND place it on a view in one call. `widgetArchetype` selects the generation scaffold (dataMonitor, metricChart, utilityInstrument, desktopObject, canvasToyGame, or generalWorkbench). `body` is the structured widget body (libraries, source, permissions, etc.). Requires built_in_mcp_allow_all_dangerous = true because the body runs as a sandboxed script widget.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "viewId": {"type": "string"},
                    "widgetArchetype": {"type": "string", "enum": ["dataMonitor", "metricChart", "utilityInstrument", "desktopObject", "canvasToyGame", "generalWorkbench"]},
                    "title": {"type": "string"},
                    "summary": {"type": "string"},
                    "category": {"type": "string"},
                    "body": {"type": "object"},
                    "settingsSchema": {"type": "object"},
                    "preset": {"type": "string"},
                    "accentName": {"type": "string"},
                    "iconName": {"type": "string"},
                    "gridX": {"type": "integer"},
                    "gridY": {"type": "integer"},
                    "gridW": {"type": "integer"},
                    "gridH": {"type": "integer"},
                },
                "required": ["viewId", "widgetArchetype", "title", "body"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.dangerous.create_custom_widget",
            "description": "DANGEROUS: create a reusable AI-Created Widget definition without placing it. Pass `bodyJson` as a UTF-8 JSON string matching the script body schema. Requires Allow-all.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "summary": {"type": "string"},
                    "category": {"type": "string"},
                    "bodyJson": {"type": "string"},
                    "settingsSchemaJson": {"type": "string"},
                    "createdBy": {"type": "string"},
                },
                "required": ["title", "bodyJson"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.dangerous.update_custom_widget",
            "description": "DANGEROUS: edit an existing AI-Created Widget. `patch` may include title, summary, category, and a structured `body` (preferred) or `bodyJson`. Requires Allow-all because changes alter executable widget code.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "patch": {"type": "object"},
                },
                "required": ["id", "patch"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.dangerous.remove_custom_widget",
            "description": "DANGEROUS: delete an AI-Created Widget definition. `forceDeleteInstances` removes existing instances too; otherwise the call fails if any instance still references it.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "forceDeleteInstances": {"type": "boolean"},
                },
                "required": ["id"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.dangerous.reset",
            "description": "DANGEROUS: wipe the entire Dashboard — all views, instances, and AI-Created Widgets. Irreversible. Requires Allow-all.",
            "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
        }),
        // -- Network: read-only diagnostics (kkterm.network.*) -------------
        json!({
            "name": "kkterm.network.ping",
            "description": "Ping a host (ICMP with TCP fallback). Returns per-packet RTT replies and availability.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "host": {"type": "string"},
                    "count": {"type": "integer", "minimum": 1, "maximum": 256},
                    "intervalMs": {"type": "integer", "minimum": 100},
                    "timeoutMs": {"type": "integer", "minimum": 100},
                    "fallbackTcpPort": {"type": "integer", "minimum": 1, "maximum": 65535},
                },
                "required": ["host"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.network.dns",
            "description": "Resolve a hostname via DNS. Returns records and resolver RTT.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "host": {"type": "string"},
                    "recordType": {"type": "string", "enum": ["A", "AAAA", "MX", "TXT", "CNAME", "NS", "SOA", "PTR"]},
                },
                "required": ["host"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.network.tcp_check",
            "description": "Check whether a TCP port is open on a host. Returns open/closed status and RTT.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "host": {"type": "string"},
                    "port": {"type": "integer", "minimum": 1, "maximum": 65535},
                    "timeoutMs": {"type": "integer", "minimum": 100},
                },
                "required": ["host", "port"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.network.port_scan",
            "description": "Scan a list of TCP ports on a host. Returns open/closed status per port.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "host": {"type": "string"},
                    "ports": {"type": "array", "items": {"type": "integer", "minimum": 1, "maximum": 65535}, "minItems": 1, "maxItems": 1024},
                    "concurrency": {"type": "integer", "minimum": 1, "maximum": 64},
                    "timeoutMs": {"type": "integer", "minimum": 100},
                    "jitterMs": {"type": "integer", "minimum": 0},
                },
                "required": ["host", "ports"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.network.interfaces",
            "description": "List all local network interfaces with their IP addresses and MAC addresses.",
            "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
        }),
        json!({
            "name": "kkterm.network.wol",
            "description": "Send a Wake-on-LAN magic packet to wake a sleeping machine by its MAC address.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "mac": {"type": "string"},
                    "broadcast": {"type": "string"},
                    "port": {"type": "integer", "minimum": 1, "maximum": 65535},
                },
                "required": ["mac"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.network.whois",
            "description": "Run a WHOIS lookup for a domain name or IP address.",
            "inputSchema": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
                "additionalProperties": false,
            },
        }),
        // -- Watchdog: background monitors (kkterm.watchdog.*) -------------
        json!({
            "name": "kkterm.watchdog.list",
            "description": "List all background watchdogs known to this app session: id, name, state, lastValue, triggerCount, pollCount.",
            "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
        }),
        json!({
            "name": "kkterm.watchdog.get_report",
            "description": "Fetch the full report for one watchdog by id: config, current state, recent tick history, and the trigger event log.",
            "inputSchema": {
                "type": "object",
                "properties": {"id": {"type": "string"}},
                "required": ["id"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.watchdog.cancel",
            "description": "Cancel a running watchdog by id. Stops polling and transitions it to a canceled state.",
            "inputSchema": {
                "type": "object",
                "properties": {"id": {"type": "string"}},
                "required": ["id"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.watchdog.dangerous.create",
            "description": "DANGEROUS: create a background watchdog that polls a target and fires when a predicate is met. `config` is the structured watchdog config (name, target, trigger, pollMs, stop, notification, action); the full target/predicate shape is validated server-side. An aiIntervene action additionally prompts for in-app approval at the KKTerm window before the watchdog is created. Requires built_in_mcp_allow_all_dangerous = true.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "config": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "target": {"type": "object"},
                            "trigger": {"type": "object"},
                            "pollMs": {"type": "integer", "minimum": 500, "maximum": 3600000},
                            "stop": {"type": "object"},
                            "notification": {"type": "string", "enum": ["inAppOnly", "inAppPlusToast", "inAppPlusSound"]},
                            "action": {"type": "object"},
                        },
                        "required": ["name", "target", "trigger"],
                    },
                },
                "required": ["config"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.app.list_windows",
            "description": "List KKTerm's own UI windows (the main window plus owned overlays such as the URL WebView2, RDP, and VNC surfaces). Returns each window's id (stable Tauri label), title, kind, bounds, and visibility. Safe (read-only). Use the returned id with kkterm.app.dangerous.capture_window.",
            "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
        }),
        json!({
            "name": "kkterm.app.dangerous.capture_window",
            "description": "DANGEROUS: capture any KKTerm UI window by `windowId` (a label from kkterm.app.list_windows) as a JPEG data URL plus dimensions. Captures whatever the window currently renders, which may include sensitive terminal, remote-desktop, URL, or file content. On macOS the app needs the Screen Recording permission. Requires built_in_mcp_allow_all_dangerous = true.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "windowId": {"type": "string", "description": "KKTerm window label from kkterm.app.list_windows (e.g. \"main\")."},
                },
                "required": ["windowId"],
                "additionalProperties": false,
            },
        }),
    ]
}

fn connection_create_input_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "name": {"type": "string", "minLength": 1},
            "type": {"type": "string", "enum": ["local", "ssh", "telnet", "serial", "url", "rdp", "vnc", "ftp"]},
            "folderId": {"type": ["string", "null"]},
            "host": {"type": "string"},
            "user": {"type": "string"},
            "port": {"type": ["integer", "null"], "minimum": 1, "maximum": 65535},
            "keyPath": {"type": ["string", "null"]},
            "proxyJump": {"type": ["string", "null"]},
            "authMethod": {"type": ["string", "null"], "enum": ["keyFile", "password", "agent", null]},
            "localShell": {"type": ["string", "null"]},
            "localStartupDirectory": {"type": ["string", "null"]},
            "localStartupScript": {"type": ["string", "null"]},
            "url": {"type": ["string", "null"]},
            "dataPartition": {"type": ["string", "null"]},
            "useTmuxSessions": {"type": ["boolean", "null"]},
            "serialLine": {"type": ["string", "null"]},
            "serialSpeed": {"type": ["integer", "null"], "minimum": 1},
        },
        "required": ["name", "type"],
        "additionalProperties": true,
    })
}

fn connection_update_input_schema() -> Value {
    let mut schema = connection_create_input_schema();
    if let Some(properties) = schema.get_mut("properties").and_then(Value::as_object_mut) {
        properties.insert(
            "connectionId".to_string(),
            json!({"type": "string", "description": "The id of the saved Connection to update."}),
        );
    }
    if let Some(required) = schema.get_mut("required").and_then(Value::as_array_mut) {
        required.insert(0, json!("connectionId"));
    }
    schema
}

fn id_input_schema(id_name: &str) -> Value {
    json!({
        "type": "object",
        "properties": {(id_name): {"type": "string"}},
        "required": [id_name],
        "additionalProperties": false,
    })
}

fn id_name_input_schema(id_name: &str) -> Value {
    json!({
        "type": "object",
        "properties": {
            (id_name): {"type": "string"},
            "name": {"type": "string", "minLength": 1},
        },
        "required": [id_name, "name"],
        "additionalProperties": false,
    })
}

fn move_connection_input_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "connectionId": {"type": "string"},
            "folderId": {"type": ["string", "null"]},
            "targetIndex": {"type": "integer", "minimum": 0},
        },
        "required": ["connectionId", "folderId", "targetIndex"],
        "additionalProperties": false,
    })
}

fn folder_create_input_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "name": {"type": "string", "minLength": 1},
            "parentFolderId": {"type": ["string", "null"]},
        },
        "required": ["name", "parentFolderId"],
        "additionalProperties": false,
    })
}

fn move_folder_input_schema() -> Value {
    json!({
        "type": "object",
        "properties": {
            "folderId": {"type": "string"},
            "parentFolderId": {"type": ["string", "null"]},
            "targetIndex": {"type": "integer", "minimum": 0},
        },
        "required": ["folderId", "parentFolderId", "targetIndex"],
        "additionalProperties": false,
    })
}
