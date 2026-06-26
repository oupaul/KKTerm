import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dialogSource = await readFile(
  new URL("../src/modules/installer/InstallerToolDialog.tsx", import.meta.url),
  "utf8",
);
const commandsSource = await readFile(
  new URL("../src-tauri/src/installer/commands.rs", import.meta.url),
  "utf8",
);
const libSource = await readFile(
  new URL("../src-tauri/src/lib.rs", import.meta.url),
  "utf8",
);

test("installed-tool dialog fetches and renders quick-launch buttons", () => {
  assert.match(
    dialogSource,
    /invokeCommand\("installer_list_quick_launch", \{ toolId: recipe\.id \}\)/,
    "InstalledInfoBody should list quick-launch entries for the tool",
  );
  assert.match(
    dialogSource,
    /installer-tool-dialog__quick-launch[\s\S]*quickLaunch\.map\(\(entry\)/,
    "The dialog should render a button per quick-launch entry",
  );
  assert.match(
    dialogSource,
    /invokeCommand\("installer_launch_quick_command", \{[\s\S]*command,/,
    "Clicking a quick-launch button should invoke the launch command",
  );
});

test("Sysinternals quick-launch backend allow-lists Process Explorer", () => {
  assert.match(
    commandsSource,
    /"sysinternals-suite" => vec!\[[\s\S]*procexp\.exe/,
    "Sysinternals quick launch should offer procexp.exe",
  );
  // The launch command validates against the per-tool allow-list before spawning.
  assert.match(
    commandsSource,
    /installer_launch_quick_command[\s\S]*quick_launch_affordance\(&tool_id\)[\s\S]*is not a known quick-launch command/,
    "installer_launch_quick_command should reject commands outside the allow-list",
  );
});

test("quick-launch Tauri commands are registered in the invoke handler", () => {
  assert.match(libSource, /installer::commands::installer_list_quick_launch/);
  assert.match(libSource, /installer::commands::installer_launch_quick_command/);
});
