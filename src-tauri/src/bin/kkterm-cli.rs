use serde_json::{json, Value};
use std::io::{self, BufRead, Write};

fn main() {
    if let Err(error) = run() {
        let _ = writeln!(io::stderr(), "kkterm-cli MCP error: {error}");
        std::process::exit(1);
    }
}

fn run() -> anyhow::Result<()> {
    let stdin = io::stdin();
    let mut stdout = io::stdout().lock();
    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() { continue; }
        let request: Value = match serde_json::from_str(&line) { Ok(v) => v, Err(_) => continue };
        let id = request.get("id").cloned().unwrap_or(Value::Null);
        let method = request.get("method").and_then(Value::as_str).unwrap_or_default();
        let response = match method {
            "initialize" => json!({"jsonrpc":"2.0","id":id,"result":{"protocolVersion":"2025-03-26","serverInfo":{"name":"kkterm-cli","version":"0.1.0"},"capabilities":{"tools":{}}}}),
            "tools/list" => json!({"jsonrpc":"2.0","id":id,"result":{"tools":[{"name":"kkterm.connections.open","description":"Open saved Connection by id.","inputSchema":{"type":"object","properties":{"connectionId":{"type":"string"}},"required":["connectionId"],"additionalProperties":false}},{"name":"kkterm.sessions.send_input","description":"Send command/keystrokes to a live session.","inputSchema":{"type":"object","properties":{"sessionId":{"type":"string"},"text":{"type":"string"},"enter":{"type":"boolean"}},"required":["sessionId","text"],"additionalProperties":false}},{"name":"kkterm.sessions.read_buffer","description":"Read terminal/session buffer snapshot.","inputSchema":{"type":"object","properties":{"sessionId":{"type":"string"},"maxLines":{"type":"integer","minimum":1,"maximum":2000}},"required":["sessionId"],"additionalProperties":false}},{"name":"kkterm.dangerous.pointer_click","description":"Dangerous: click URL/RDP/VNC surface.","inputSchema":{"type":"object","properties":{"sessionId":{"type":"string"},"x":{"type":"integer"},"y":{"type":"integer"},"button":{"type":"string","enum":["left","right","middle"]}},"required":["sessionId","x","y"],"additionalProperties":false}}]}}),
            "tools/call" => json!({"jsonrpc":"2.0","id":id,"result":{"content":[{"type":"text","text":"kkterm-cli MCP scaffold active; app runtime bridge not yet wired."}],"isError":false}}),
            "notifications/initialized" => continue,
            _ => json!({"jsonrpc":"2.0","id":id,"error":{"code":-32601,"message":format!("Method not found: {method}")}}),
        };
        serde_json::to_writer(&mut stdout, &response)?;
        writeln!(&mut stdout)?;
        stdout.flush()?;
    }
    Ok(())
}
