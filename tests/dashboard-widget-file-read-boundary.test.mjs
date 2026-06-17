import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("widget import preview reads selected files through a backend command", async () => {
  const tauri = await readFile(new URL("../src/lib/tauri.ts", import.meta.url), "utf8");
  const commands = await readFile(new URL("../src-tauri/src/dashboard_commands.rs", import.meta.url), "utf8");

  assert.doesNotMatch(tauri, /readTextFile/);
  assert.match(tauri, /read_dashboard_widget_import_file/);
  assert.match(commands, /pub fn read_dashboard_widget_import_file/);
});
