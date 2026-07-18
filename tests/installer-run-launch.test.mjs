import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("installed tiles expose a Run button routed by launch kind", async () => {
  const toolRow = await read("../src/modules/installer/ToolRow.tsx");

  assert.match(
    toolRow,
    /launchKindForRecipe\(recipe\.id\)/,
    "ToolRow should classify installed recipes through launch.ts",
  );
  assert.match(
    toolRow,
    /isInstalled && !busy/,
    "Run should only show for installed tools with no operation in flight",
  );
  assert.match(
    toolRow,
    /installer_launch_app/,
    "GUI apps should launch through the dedicated backend command",
  );
  assert.match(
    toolRow,
    /openLauncherDialog\(recipe\.id\)/,
    "CLI tools should open the mini launcher dialog",
  );
  assert.match(
    toolRow,
    /installer\.actions\.run/,
    "Run label should be translated",
  );
});

test("mini launcher dialog shows samples and opens a terminal", async () => {
  const dialog = await read("../src/modules/installer/InstallerToolDialog.tsx");

  assert.match(dialog, /function LauncherBody/);
  assert.match(
    dialog,
    /installer\.launcher\.title/,
    "launcher dialog title should be translated",
  );
  assert.match(
    dialog,
    /cliLaunchSamplesForRecipe\(recipe\.id\)/,
    "launcher dialog should render the shared CLI samples",
  );
  assert.match(
    dialog,
    /installer\.launcher\.openTerminal/,
    "launcher dialog should offer the open-terminal action",
  );
  assert.match(
    dialog,
    /installer_open_terminal_launcher/,
    "open terminal should call the backend terminal launcher",
  );
});

test("frontend launch classification stays in sync with the Rust allow-lists", async () => {
  const launch = await read("../src/modules/installer/launch.ts");
  const commands = await read("../src-tauri/src/installer/commands.rs");

  // Every frontend GUI recipe has Rust launch candidates.
  const guiBlock = launch.match(
    /GUI_LAUNCH_RECIPES = new Set<string>\(\[([\s\S]*?)\]\)/,
  )?.[1];
  assert.ok(guiBlock, "launch.ts should declare the GUI recipe set");
  const guiIds = [...guiBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(guiIds.length > 20, "GUI launch set should cover the catalog's desktop apps");
  const guiAffordance = commands.match(
    /fn gui_launch_affordance[\s\S]*?\n\}\n/,
  )?.[0];
  assert.ok(guiAffordance, "commands.rs should declare gui_launch_affordance");
  for (const id of guiIds) {
    assert.match(
      guiAffordance,
      new RegExp(`"${id.replace(/[+*?.]/g, "\\$&")}" =>`),
      `${id} should have Rust GUI launch candidates`,
    );
  }

  // Every frontend CLI sample entry has a Rust terminal launcher.
  const cliBlock = launch.match(
    /CLI_LAUNCH_SAMPLES: Record<string, string\[\]> = \{([\s\S]*?)\n\};/,
  )?.[1];
  assert.ok(cliBlock, "launch.ts should declare the CLI sample map");
  const cliIds = [...cliBlock.matchAll(/^  (?:"([^"]+)"|([\w-]+)): \[/gm)].map(
    (match) => match[1] ?? match[2],
  );
  assert.ok(cliIds.length > 15, "CLI sample map should cover the catalog's command-line tools");
  const terminalAffordance = commands.match(
    /fn terminal_launch_affordance[\s\S]*?\n\}\n/,
  )?.[0];
  assert.ok(terminalAffordance, "commands.rs should declare terminal_launch_affordance");
  for (const id of cliIds) {
    assert.match(
      terminalAffordance,
      new RegExp(`"${id}" =>`),
      `${id} should have a Rust terminal launcher`,
    );
  }

  // Suites match the Rust quick-launch allow-list.
  assert.match(launch, /"sysinternals-suite", "coreutils"/);
  assert.match(commands, /"coreutils" => vec!\[/);
});

test("GUI launch runs through a closed backend allow-list", async () => {
  const commands = await read("../src-tauri/src/installer/commands.rs");

  assert.match(
    commands,
    /pub async fn installer_launch_app\(/,
    "installer_launch_app should be async so blocking work can leave the command path",
  );
  assert.match(
    commands,
    /does not have an app launcher/,
    "unknown tools should be refused instead of spawning arbitrary programs",
  );
  assert.match(
    commands,
    /App Paths/,
    "bare-name candidates should consult the Windows App Paths registry",
  );
  assert.match(
    commands,
    /shell:AppsFolder/,
    "Store apps should launch through shell:AppsFolder",
  );
});

test("Coreutils quick launch opens a plain terminal, Sysinternals stays elevated", async () => {
  const commands = await read("../src-tauri/src/installer/commands.rs");
  const dialog = await read("../src/modules/installer/InstallerToolDialog.tsx");

  assert.match(
    commands,
    /"sysinternals-suite" => spawn_elevated_powershell\(\)/,
    "Sysinternals terminal should stay elevated",
  );
  assert.match(
    commands,
    /"coreutils" => spawn_terminal_launcher\(/,
    "Coreutils terminal should open non-elevated with hints",
  );
  assert.match(
    dialog,
    /suiteTerminalIsElevated\(recipe\.id\)/,
    "quick-launch terminal button label should reflect elevation",
  );
});
