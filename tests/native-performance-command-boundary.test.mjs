import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [source, itOpsCommandsSource] = await Promise.all([
  readFile(new URL("../src-tauri/src/lib.rs", import.meta.url), "utf8"),
  readFile(new URL("../src-tauri/src/itops/commands.rs", import.meta.url), "utf8"),
]);

function commandSource(name, nextName) {
  const start = source.indexOf(`async fn ${name}(`);
  const end = source.indexOf(`async fn ${nextName}(`, start + 1);
  assert.notEqual(start, -1, `${name} should remain an async Tauri command`);
  assert.notEqual(end, -1, `${nextName} should delimit ${name}`);
  return source.slice(start, end);
}

test("host usage collection runs outside Tauri's native main thread", () => {
  const command = commandSource("get_host_usage_snapshot", "get_system_performance_counters");
  assert.match(command, /tauri::async_runtime::spawn_blocking/);
  assert.match(command, /host_usage_snapshot\(\)/);
});

test("system counter collection runs outside Tauri's native main thread", () => {
  const command = commandSource("get_system_performance_counters", "pc_info_get");
  assert.match(command, /tauri::async_runtime::spawn_blocking/);
  assert.match(command, /system_performance_counters_snapshot\(\)/);
});

test("IT Ops batch preparation runs outside Tauri's native main thread", () => {
  const batchStartCommand = itOpsCommandsSource.slice(
    itOpsCommandsSource.indexOf("pub async fn itops_start_batch_run"),
    itOpsCommandsSource.indexOf("pub fn start_run"),
  );
  assert.match(batchStartCommand, /tauri::async_runtime::spawn_blocking/);
  assert.match(batchStartCommand, /start_run\(&app, site_id, task, scope, task_id\)/);
});
