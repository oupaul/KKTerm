import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const loggingSource = readFileSync("src-tauri/src/logging.rs", "utf8");
const libSource = readFileSync("src-tauri/src/lib.rs", "utf8");
const tauriSource = readFileSync("src/lib/tauri.ts", "utf8");
const webviewSource = readFileSync("src-tauri/src/webview.rs", "utf8");
const workspaceSource = readFileSync("src/modules/workspace/connections/webview/WebViewWorkspace.tsx", "utf8");

test("URL Connection debug log has a dedicated runtime log target", () => {
  assert.match(loggingSource, /pub fn url_connection_debug\(event: &str, payload: &Value\)/);
  assert.match(loggingSource, /fn url_connection_debug_log_path_for\(runtime_log_path: &Path\) -> PathBuf/);
  assert.match(loggingSource, /join\("url\.connection\.debug\.log"\)/);
  assert.match(loggingSource, /url_connection_debug_log_path_for\(runtime_log_path\)/);
});

test("URL Connection debug logging is exposed through the typed Tauri surface", () => {
  assert.match(libSource, /fn url_connection_debug_log\(event: String, payload: serde_json::Value\)/);
  assert.match(libSource, /url_connection_debug_log,/);
  assert.match(tauriSource, /url_connection_debug_log: \{/);
  assert.match(tauriSource, /export function logUrlConnectionDebug\(event: string, payload: Record<string, unknown>\)/);
});

test("URL Connection WebView geometry emits frontend and backend debug events", () => {
  assert.match(workspaceSource, /logUrlConnectionDebug/);
  assert.match(workspaceSource, /frontend\.bounds\.update\.request/);
  assert.match(workspaceSource, /placeholderRect/);
  assert.match(workspaceSource, /visibleRect/);
  assert.match(webviewSource, /url_connection_debug/);
  assert.match(webviewSource, /backend\.overlay\.rect/);
  assert.match(webviewSource, /backend\.window\.positioned/);
});
