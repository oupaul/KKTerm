// kkterm-cli: stdio MCP server binary.
//
// Acts as a thin forwarder between an external MCP client (Claude Desktop,
// Codex, etc.) and the live KKTerm app over a Windows named pipe. The real
// JSON-RPC routing and tool handlers live inside kkterm.exe — see
// `src-tauri/src/mcp_bridge.rs`. This binary intentionally has no business
// logic of its own; when the app is not running it returns a structured
// JSON-RPC error so MCP clients render it readably.

use std::path::PathBuf;
use std::process::ExitCode;

use serde_json::{json, Value};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::time::{timeout, Duration};

const BRIDGE_INFO_FILENAME: &str = "mcp-bridge.json";
const BUNDLE_IDENTIFIER: &str = "com.kkterm.app";
const PROTOCOL_VERSION: &str = "2025-03-26";
const SERVER_NAME: &str = "kkterm-cli";
const SERVER_VERSION: &str = env!("CARGO_PKG_VERSION");
const CONNECT_TIMEOUT: Duration = Duration::from_secs(3);
const CALL_TIMEOUT: Duration = Duration::from_secs(60);

#[tokio::main]
async fn main() -> ExitCode {
    if let Err(error) = run().await {
        let _ = writeln_stderr(&format!("kkterm-cli MCP error: {error}"));
        return ExitCode::from(1);
    }
    ExitCode::SUCCESS
}

async fn run() -> std::io::Result<()> {
    let stdin = tokio::io::stdin();
    let mut stdout = tokio::io::stdout();
    let mut reader = BufReader::new(stdin);
    let mut line = String::new();

    loop {
        line.clear();
        let bytes = reader.read_line(&mut line).await?;
        if bytes == 0 {
            return Ok(());
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let request: Value = match serde_json::from_str(trimmed) {
            Ok(value) => value,
            Err(error) => {
                write_line(
                    &mut stdout,
                    &json!({
                        "jsonrpc": "2.0",
                        "id": Value::Null,
                        "error": {"code": -32700, "message": format!("parse error: {error}")},
                    }),
                )
                .await?;
                continue;
            }
        };
        if let Some(response) = handle_request(request).await {
            write_line(&mut stdout, &response).await?;
        }
    }
}

async fn handle_request(request: Value) -> Option<Value> {
    let id = request.get("id").cloned().unwrap_or(Value::Null);
    let method = request
        .get("method")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();

    match method.as_str() {
        "initialize" => Some(json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": {
                "protocolVersion": PROTOCOL_VERSION,
                "serverInfo": {"name": SERVER_NAME, "version": SERVER_VERSION},
                "capabilities": {"tools": {}},
            },
        })),
        "notifications/initialized" => None,
        "ping" => Some(json!({"jsonrpc": "2.0", "id": id, "result": {}})),
        // Static tools/list so MCP clients can discover the surface even
        // when KKTerm.exe isn't running. tools/call still requires a live
        // bridge so dispatch falls through to forward().
        "tools/list" => Some(json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": {"tools": static_tool_descriptors()},
        })),
        _ => Some(forward(id, request).await),
    }
}

fn static_tool_descriptors() -> Vec<Value> {
    vec![
        json!({
            "name": "kkterm.workspace.connections.list",
            "description": "List saved Connections (folders + connections) from KKTerm storage.",
            "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
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
                "properties": {"paneId": {"type": "string"}},
                "required": ["paneId"],
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
        // -- Dashboard: views, instances, layout (mirrors mcp_bridge.rs) --
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
            "description": "Add a new Dashboard view (tab).",
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
            "description": "Edit an existing Dashboard view.",
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
            "description": "Place a new widget instance on a view. For built-in widgets, set kind to e.g. 'connection', 'app_launcher'. For AI-Created Widgets, set kind = 'script' and sourceId to the widget's id.",
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
            "description": "Change a widget instance's size, position, preset, accent, or icon.",
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
            "description": "Bulk update of multiple instance positions on a single view.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "viewId": {"type": "string"},
                    "layout": {"type": "array"},
                },
                "required": ["viewId", "layout"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.dangerous.create_widget",
            "description": "DANGEROUS: create an AI-Created (script) Widget AND place it on a view in one call. Requires built_in_mcp_allow_all_dangerous = true.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "viewId": {"type": "string"},
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
                "required": ["viewId", "title", "body"],
                "additionalProperties": false,
            },
        }),
        json!({
            "name": "kkterm.dashboard.dangerous.create_custom_widget",
            "description": "DANGEROUS: create a reusable AI-Created Widget definition (no placement). Requires Allow-all.",
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
            "description": "DANGEROUS: edit an existing AI-Created Widget. Requires Allow-all.",
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
            "description": "DANGEROUS: delete an AI-Created Widget definition.",
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
            "description": "DANGEROUS: wipe the entire Dashboard. Irreversible.",
            "inputSchema": {"type": "object", "properties": {}, "additionalProperties": false},
        }),
    ]
}

async fn forward(id: Value, request: Value) -> Value {
    match forward_inner(&request).await {
        Ok(mut response) => {
            if let Some(map) = response.as_object_mut() {
                map.entry("id".to_string()).or_insert(id);
            }
            response
        }
        Err(error) => app_not_running_error(id, &error),
    }
}

fn app_not_running_error(id: Value, detail: &str) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "error": {
            "code": -32002,
            "message": "KKTerm built-in MCP server is unavailable",
            "data": {
                "reason": "app_not_running",
                "detail": detail,
                "hint": "Start KKTerm.exe and ensure Settings > AI Assistant > Built-in MCP Server is enabled.",
            },
        },
    })
}

async fn forward_inner(request: &Value) -> Result<Value, String> {
    let info_path = bridge_info_path()
        .ok_or_else(|| "could not resolve app data directory".to_string())?;
    let info = read_bridge_info(&info_path)
        .map_err(|e| format!("bridge info unavailable at {}: {e}", info_path.display()))?;

    let stream = open_pipe(&info.pipe_name).await?;
    let (reader, mut writer) = tokio::io::split(stream.into_inner());
    let mut reader = BufReader::new(reader);

    writer
        .write_all(info.token.as_bytes())
        .await
        .map_err(|e| format!("pipe write: {e}"))?;
    writer
        .write_all(b"\n")
        .await
        .map_err(|e| format!("pipe write: {e}"))?;
    writer
        .flush()
        .await
        .map_err(|e| format!("pipe flush: {e}"))?;

    let mut ack = String::new();
    timeout(CONNECT_TIMEOUT, reader.read_line(&mut ack))
        .await
        .map_err(|_| "auth ack timed out".to_string())?
        .map_err(|e| format!("auth ack: {e}"))?;
    if !ack.contains("\"ok\":true") {
        return Err(format!("auth rejected: {}", ack.trim()));
    }

    let mut body = serde_json::to_vec(request).map_err(|e| format!("serialize: {e}"))?;
    body.push(b'\n');
    writer
        .write_all(&body)
        .await
        .map_err(|e| format!("forward write: {e}"))?;
    writer
        .flush()
        .await
        .map_err(|e| format!("flush: {e}"))?;

    let mut response = String::new();
    timeout(CALL_TIMEOUT, reader.read_line(&mut response))
        .await
        .map_err(|_| "tool call timed out".to_string())?
        .map_err(|e| format!("read response: {e}"))?;
    if response.trim().is_empty() {
        return Err("empty response from bridge".to_string());
    }
    serde_json::from_str(response.trim()).map_err(|e| format!("invalid bridge response: {e}"))
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgeInfo {
    #[allow(dead_code)]
    version: u32,
    pipe_name: String,
    token: String,
    #[allow(dead_code)]
    pid: u32,
}

fn bridge_info_path() -> Option<PathBuf> {
    let mut base = app_data_dir()?;
    base.push(BUNDLE_IDENTIFIER);
    base.push(BRIDGE_INFO_FILENAME);
    Some(base)
}

#[cfg(target_os = "windows")]
fn app_data_dir() -> Option<PathBuf> {
    std::env::var_os("APPDATA").map(PathBuf::from)
}

#[cfg(target_os = "linux")]
fn app_data_dir() -> Option<PathBuf> {
    if let Some(dir) = std::env::var_os("XDG_DATA_HOME") {
        return Some(PathBuf::from(dir));
    }
    let home = std::env::var_os("HOME")?;
    let mut path = PathBuf::from(home);
    path.push(".local");
    path.push("share");
    Some(path)
}

#[cfg(target_os = "macos")]
fn app_data_dir() -> Option<PathBuf> {
    let home = std::env::var_os("HOME")?;
    let mut path = PathBuf::from(home);
    path.push("Library");
    path.push("Application Support");
    Some(path)
}

fn read_bridge_info(path: &std::path::Path) -> std::io::Result<BridgeInfo> {
    let bytes = std::fs::read(path)?;
    serde_json::from_slice(&bytes)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))
}

#[cfg(target_os = "windows")]
async fn open_pipe(pipe_name: &str) -> Result<PipeStream, String> {
    use tokio::net::windows::named_pipe::ClientOptions;
    use tokio::time::sleep;

    let deadline = std::time::Instant::now() + Duration::from_secs(3);
    loop {
        match ClientOptions::new().open(pipe_name) {
            Ok(client) => return Ok(PipeStream(client)),
            Err(error) if error.raw_os_error() == Some(231) => {
                if std::time::Instant::now() >= deadline {
                    return Err("named pipe is busy".to_string());
                }
                sleep(Duration::from_millis(50)).await;
            }
            Err(error) => return Err(format!("named pipe open: {error}")),
        }
    }
}

#[cfg(not(target_os = "windows"))]
async fn open_pipe(_pipe_name: &str) -> Result<PipeStream, String> {
    Err("kkterm built-in MCP server is Windows-only at this time".to_string())
}

#[cfg(target_os = "windows")]
struct PipeStream(tokio::net::windows::named_pipe::NamedPipeClient);

#[cfg(target_os = "windows")]
impl PipeStream {
    fn into_inner(self) -> tokio::net::windows::named_pipe::NamedPipeClient {
        self.0
    }
}

#[cfg(not(target_os = "windows"))]
struct PipeStream;

#[cfg(not(target_os = "windows"))]
impl PipeStream {
    fn into_inner(self) -> tokio::io::Empty {
        tokio::io::empty()
    }
}

async fn write_line<W: AsyncWriteExt + Unpin>(writer: &mut W, value: &Value) -> std::io::Result<()> {
    let mut bytes = serde_json::to_vec(value).unwrap_or_else(|_| b"{}".to_vec());
    bytes.push(b'\n');
    writer.write_all(&bytes).await?;
    writer.flush().await
}

fn writeln_stderr(message: &str) -> std::io::Result<()> {
    use std::io::Write;
    let stderr = std::io::stderr();
    let mut handle = stderr.lock();
    writeln!(handle, "{message}")
}
