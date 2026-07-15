import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dialogSource = await readFile(
  new URL("../src/modules/workspace/connections/ImportDialog.tsx", import.meta.url),
  "utf8",
);

const tauriSource = await readFile(
  new URL("../src/lib/tauri.ts", import.meta.url),
  "utf8",
);

test("file import preserves OpenSSH key and jump-host fields", () => {
  assert.match(
    tauriSource,
    /export type ImportFileFormat = [^;]*"sshConfig"/,
    "the typed import preview should recognize OpenSSH config files",
  );
  assert.match(
    dialogSource,
    /keyPath: draft\.keyPath,[\s\S]*proxyJump: draft\.proxyJump/,
    "OpenSSH-only fields should survive conversion into editable import candidates",
  );
  assert.match(
    dialogSource,
    /keyPath: row\.type === "ssh" && !password \? row\.keyPath : undefined,[\s\S]*proxyJump: row\.type === "ssh" \? row\.proxyJump : undefined/,
    "batch creation should persist the selected SSH config's key and ProxyJump",
  );
  assert.match(
    dialogSource,
    /row\.keyPath[\s\S]*\? "keyFile"/,
    "an imported identity file should select key-file authentication when no password overrides it",
  );
});
