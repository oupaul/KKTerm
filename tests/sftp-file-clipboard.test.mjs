import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspaceSource = readFileSync("src/modules/workspace/connections/sftp/SftpWorkspace.tsx", "utf8");
const overlaysSource = readFileSync("src/modules/workspace/connections/sftp/SftpOverlays.tsx", "utf8");
const typesSource = readFileSync("src/modules/workspace/connections/sftp/types.ts", "utf8");
const tauriSource = readFileSync("src/lib/tauri.ts", "utf8");
const libSource = readFileSync("src-tauri/src/lib.rs", "utf8");
const sftpSource = readFileSync("src-tauri/src/sftp.rs", "utf8");

test("SFTP context menu exposes cut, copy, and paste file actions", () => {
  for (const snippet of [
    "onCut",
    "onCopy",
    "onPaste",
    't("common.cut")',
    't("common.copy")',
    't("common.paste")',
    "canPaste",
  ]) {
    assert.ok(overlaysSource.includes(snippet), `missing ${snippet} in SftpOverlays`);
  }

  assert.match(typesSource, /canPaste:\s*boolean/);
});

test("SFTP workspace wires internal and native file clipboard operations", () => {
  for (const snippet of [
    "fileClipboard",
    "handleContextCut",
    "handleContextCopy",
    "handleContextPaste",
    "set_local_file_clipboard",
    "read_local_file_clipboard",
    "move_local_path",
    "deleteSourceWhenDone",
  ]) {
    assert.ok(workspaceSource.includes(snippet), `missing ${snippet} in SftpWorkspace`);
  }

  assert.match(workspaceSource, /onCut=\{handleContextCut\}/);
  assert.match(workspaceSource, /onCopy=\{handleContextCopy\}/);
  assert.match(workspaceSource, /onPaste=\{handleContextPaste\}/);
});

test("Tauri command boundary includes local file move and Windows file clipboard commands", () => {
  for (const commandName of [
    "move_local_path",
    "set_local_file_clipboard",
    "read_local_file_clipboard",
  ]) {
    assert.ok(tauriSource.includes(commandName), `missing ${commandName} in typed Tauri map`);
    assert.ok(libSource.includes(commandName), `missing ${commandName} in Tauri registry`);
  }

  assert.ok(sftpSource.includes("MoveLocalPathRequest"), "missing local move request");
  assert.ok(sftpSource.includes("LocalFileClipboard"), "missing file clipboard response");
  assert.ok(sftpSource.includes("Preferred DropEffect"), "missing shell Preferred DropEffect bridge");
});
