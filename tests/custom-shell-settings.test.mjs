import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Terminal settings exposes custom shell profiles and feeds default shell choices", async () => {
  const source = await readFile(
    new URL("../src/modules/settings/TerminalSettings.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /settings\.customShells/);
  assert.match(source, /settings\.addCustomShell/);
  assert.match(source, /settings\.customShellName/);
  assert.match(source, /settings\.customShellCommandLine/);
  assert.match(source, /defaultShellSelectOptions\.map/);
});

test("Local terminal Connection shell selector receives custom shell profiles from Terminal settings", async () => {
  const [sidebarSource, utilsSource] = await Promise.all([
    readFile(new URL("../src/modules/workspace/connections/ConnectionSidebar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/workspace/connections/utils.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(sidebarSource, /terminalSettings\.customShells/);
  assert.match(sidebarSource, /localShellOptionsForPlatform\([^)]*terminalSettings\.customShells/);
  assert.match(utilsSource, /customShells\?\:/);
  assert.match(utilsSource, /customShells[\s\S]*\.filter[\s\S]*\.map/);
});

test("deleted custom shells fall back to the platform default anywhere they were selected", async () => {
  const [platformSource, utilsSource, localFieldsSource, terminalWorkspaceSource] = await Promise.all([
    readFile(new URL("../src/lib/platform.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/workspace/connections/utils.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/modules/workspace/connections/connection-dialog/LocalConnectionFields.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(platformSource, /currentPlatform\(\) === "macos" \? "\/bin\/zsh" : "\/bin\/bash"/);
  assert.match(utilsSource, /export function resolveAvailableLocalShell/);
  assert.match(
    localFieldsSource,
    /resolveAvailableLocalShell\(\s*wslShellSelectorValue\(initialConnection\?\.localShell\),\s*localShellOptions\s*\)/,
  );
  assert.match(terminalWorkspaceSource, /resolveAvailableLocalShell\(\s*connection\.localShell/);
});

test("custom shell settings rows use a dedicated editor layout", async () => {
  const [settingsSource, cssSource] = await Promise.all([
    readFile(new URL("../src/modules/settings/TerminalSettings.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/settings/settings.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(settingsSource, /settings-toggle-row settings-custom-shell-row/);
  assert.match(settingsSource, /customShellPresetsForPlatform\(currentPlatform\(\)\)/);
  assert.match(settingsSource, /list="terminal-custom-shell-presets"/);
  assert.match(settingsSource, /findCustomShellPreset/);
  assert.match(settingsSource, /className="settings-custom-shell-row"/);
  assert.match(cssSource, /\.settings-custom-shell-row\s*{[\s\S]*grid-template-columns:\s*auto minmax\(0, 1fr\) auto/);
  assert.match(cssSource, /\.settings-custom-shell-fields\s*{[\s\S]*grid-template-columns:\s*minmax\(140px, 0\.4fr\) minmax\(220px, 1fr\)/);
});

test("local connection validation allows custom shell command lines", async () => {
  const storageSource = await readFile(new URL("../src-tauri/src/storage.rs", import.meta.url), "utf8");

  assert.doesNotMatch(storageSource, /local terminal shell must be PowerShell/);
  assert.match(storageSource, /local shell cannot contain control characters/);
});
