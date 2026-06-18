import assert from "node:assert/strict";
import test from "node:test";

import { customShellPresetsForPlatform, findCustomShellPreset } from "../src/modules/settings/customShellPresets.ts";

test("custom shell presets include common Windows shells with editable default commands", () => {
  const presets = customShellPresetsForPlatform("windows");

  assert.deepEqual(
    presets.map((preset) => preset.name),
    ["Git Bash", "Cygwin", "MSYS2 UCRT64"],
  );
  assert.equal(
    findCustomShellPreset("git bash", "windows")?.commandLine,
    String.raw`C:\Program Files\Git\bin\bash.exe --login -i`,
  );
  assert.equal(
    findCustomShellPreset("Cygwin", "windows")?.commandLine,
    String.raw`C:\cygwin64\bin\bash.exe --login -i`,
  );
  assert.equal(findCustomShellPreset("PowerShell 7", "windows"), undefined);
});

test("custom shell presets include common macOS shells", () => {
  const presets = customShellPresetsForPlatform("macos");

  assert.ok(presets.some((preset) => preset.name === "Homebrew Bash"));
  assert.ok(presets.some((preset) => preset.name === "Fish"));
  assert.equal(findCustomShellPreset("Homebrew Bash", "macos")?.commandLine, "/opt/homebrew/bin/bash --login");
  assert.equal(findCustomShellPreset("Zsh", "macos")?.commandLine, "/bin/zsh");
});

test("custom shell presets include common Linux shells", () => {
  const presets = customShellPresetsForPlatform("linux");

  assert.ok(presets.some((preset) => preset.name === "Bash"));
  assert.ok(presets.some((preset) => preset.name === "Zsh"));
  assert.ok(presets.some((preset) => preset.name === "Fish"));
  assert.equal(findCustomShellPreset("bash", "linux")?.commandLine, "/bin/bash");
  assert.equal(findCustomShellPreset("Nushell", "linux")?.commandLine, "/usr/bin/nu");
});
