import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src-tauri/src/lib.rs", import.meta.url),
  "utf8",
);

test("Terminal recording folders avoid the crashing Windows shell-select opener", () => {
  const helperStart = source.indexOf("fn open_folder_in_file_manager");
  const rootCommandStart = source.indexOf("fn open_terminal_recordings_root");
  const nextCommandStart = source.indexOf("fn open_terminal_recording(", rootCommandStart);

  assert.notEqual(helperStart, -1, "a shared folder-only opener should own this platform boundary");
  assert.notEqual(rootCommandStart, -1);
  assert.notEqual(nextCommandStart, -1);

  const helper = source.slice(helperStart, rootCommandStart);
  const commands = source.slice(rootCommandStart, nextCommandStart);
  assert.match(helper, /target_os = "windows"[\s\S]*Command::new\("explorer\.exe"\)/);
  assert.doesNotMatch(commands, /\.opener\(\)[\s\S]*\.open_path/);
  assert.match(commands, /open_folder_in_file_manager/);
});
