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

test("installed-tool dialog renders a searchable mini launcher", () => {
  assert.match(
    dialogSource,
    /invokeCommand\("installer_list_quick_launch", \{ toolId: recipe\.id \}\)/,
    "InstalledInfoBody should list quick-launch entries for the tool",
  );
  // A search box filters the entries by name/command/description.
  assert.match(
    dialogSource,
    /quickLaunchFiltered = quickLaunchQueryNorm[\s\S]*\.includes\(quickLaunchQueryNorm\)/,
    "The launcher should filter entries by the search query",
  );
  assert.match(
    dialogSource,
    /installer-tool-dialog__quick-launch-search/,
    "The launcher should render a search input",
  );
  // Each entry shows its description; the list maps the filtered entries.
  assert.match(
    dialogSource,
    /quickLaunchFiltered\.map\(\(entry\)[\s\S]*entry\.description/,
    "Each launcher row should render the entry description",
  );
});

test("GUI tools launch directly; CLI tools are list-only with a terminal button", () => {
  // GUI tools get a Launch button wired to the launch command.
  assert.match(
    dialogSource,
    /entry\.cli \?[\s\S]*quick-launch-badge[\s\S]*handleQuickLaunch\(entry\.command\)/,
    "CLI tools render a badge while GUI tools render a launch action",
  );
  assert.match(
    dialogSource,
    /invokeCommand\("installer_launch_quick_command", \{[\s\S]*command,/,
    "handleQuickLaunch should invoke the launch command",
  );
  // A single command-prompt button appears when the suite has CLI tools.
  assert.match(
    dialogSource,
    /quickLaunchHasCli \?[\s\S]*handleOpenQuickLaunchTerminal\(\)/,
    "A command-prompt button should appear when the suite has CLI tools",
  );
  assert.match(
    dialogSource,
    /invokeCommand\("installer_open_quick_launch_terminal", \{/,
    "The command-prompt button should open a terminal via the backend",
  );
});

test("Sysinternals backend marks GUI vs CLI tools and gates launching", () => {
  assert.match(
    commandsSource,
    /gui\("procexp\.exe", "Process Explorer"/,
    "Process Explorer should be a GUI tool",
  );
  assert.match(
    commandsSource,
    /cli\("psexec\.exe", "PsExec"/,
    "PsExec should be a CLI (list-only) tool",
  );
  // The launch command refuses CLI tools — they need a terminal and arguments.
  assert.match(
    commandsSource,
    /if entry\.cli \{[\s\S]*is a command-line tool/,
    "installer_launch_quick_command should reject CLI tools",
  );
});

test("quick-launch Tauri commands are registered in the invoke handler", () => {
  assert.match(libSource, /installer::commands::installer_list_quick_launch/);
  assert.match(libSource, /installer::commands::installer_launch_quick_command/);
  assert.match(
    libSource,
    /installer::commands::installer_open_quick_launch_terminal/,
  );
});
