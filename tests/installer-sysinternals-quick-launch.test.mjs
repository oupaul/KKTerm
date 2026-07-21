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

test("suite Run dialog renders a searchable launcher outside installation details", () => {
  const installedInfo = dialogSource.match(
    /function InstalledInfoBody[\s\S]*?function NotInstalledInfoBody/,
  )?.[0];
  const suiteLauncher = dialogSource.match(
    /function SuiteLauncherBody[\s\S]*?Small shared helpers/,
  )?.[0];
  assert.ok(installedInfo, "installed details should exist");
  assert.ok(suiteLauncher, "suite Run dialog should exist");
  assert.doesNotMatch(
    installedInfo,
    /installer_list_quick_launch|installer-suite-launcher__list/,
    "installation details should not mix in suite launch controls",
  );
  assert.match(
    suiteLauncher,
    /invokeCommand\("installer_list_quick_launch", \{ toolId: recipe\.id \}\)/,
    "SuiteLauncherBody should list quick-launch entries for the tool",
  );
  // A search box filters the entries by name/command/description.
  assert.match(
    dialogSource,
    /filteredEntries = normalizedQuery[\s\S]*\.includes\(normalizedQuery\)/,
    "The launcher should filter entries by the search query",
  );
  assert.match(
    dialogSource,
    /installer-suite-launcher__search/,
    "The launcher should render a search input",
  );
  // Each entry shows its description; the list maps the filtered entries.
  assert.match(
    dialogSource,
    /filteredEntries\.map\(\(entry\)[\s\S]*entry\.description/,
    "Each launcher row should render the entry description",
  );
});

test("GUI tools launch directly; CLI tools are list-only with a terminal button", () => {
  // GUI tools get a Launch button wired to the launch command.
  assert.match(
    dialogSource,
    /entry\.cli \?[\s\S]*installer-suite-launcher__badge[\s\S]*handleLaunch\(entry\.command\)/,
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
    /hasCli \?[\s\S]*handleOpenTerminal\(\)/,
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
    /gui\(\s*"procexp\.exe",\s*"Process Explorer"/,
    "Process Explorer should be a GUI tool",
  );
  assert.match(
    commandsSource,
    /cli\(\s*"psexec\.exe",\s*"PsExec"/,
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
