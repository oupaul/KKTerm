import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("X server status renders before Don't Sleep in the status bar", async () => {
  const statusBarSource = await readFile(
    new URL("../src/modules/workspace/StatusBar.tsx", import.meta.url),
    "utf8",
  );
  const tauriSource = await readFile(new URL("../src/lib/tauri.ts", import.meta.url), "utf8");
  const rustSource = await readFile(new URL("../src-tauri/src/lib.rs", import.meta.url), "utf8");

  assert.match(statusBarSource, /function XServerStatusIcon\(\)/);
  assert.match(statusBarSource, /invokeCommand\("is_ssh_x_server_running"\)/);

  const actions = statusBarSource.match(/<div className="status-bar-actions">(?<body>[\s\S]*?)<\/div>/)
    ?.groups?.body;
  assert.ok(actions, "status bar actions cluster should exist");
  assert.ok(
    actions.indexOf("<XServerStatusIcon />") < actions.indexOf("<DontSleepStatusIcon />"),
    "X server status should render before Don't Sleep",
  );

  assert.match(tauriSource, /is_ssh_x_server_running: \{\s*args: undefined;\s*result: boolean;/);
  assert.match(rustSource, /async fn is_ssh_x_server_running\(\) -> Result<bool, String>/);
  assert.match(rustSource, /is_ssh_x_server_running,/);
});

test("VcXsrv is listed as an Installer Helper utility", async () => {
  const installerSource = await readFile(
    new URL("../src/modules/installer/InstallerPage.tsx", import.meta.url),
    "utf8",
  );
  const manualSource = await readFile(new URL("../docs/manual/18-installer.md", import.meta.url), "utf8");

  assert.match(
    installerSource,
    /titleKey: "installer\.section\.utilities",\s*ids: \[[^\]]*"vcxsrv"[^\]]*\]/,
  );
  assert.match(manualSource, /\*\*Utilities\*\* \(`installer\.section\.utilities`\).*VcXsrv/s);
});
