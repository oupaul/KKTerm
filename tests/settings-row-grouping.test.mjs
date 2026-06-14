import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("General hides the Performance subsection when the platform has no options", async () => {
  const generalSource = await readFile(
    new URL("../src/modules/settings/GeneralSettings.tsx", import.meta.url),
    "utf8",
  );

  assert.match(generalSource, /const showPerformanceSettings = windowsPlatform;/);
  assert.match(
    generalSource,
    /\{showPerformanceSettings \? \([\s\S]*settings\.performance[\s\S]*settings\.useDirectxScreenCapture[\s\S]*\) : null\}/,
  );
});

test("Settings row blocks merge consecutive controls inside the same relevant group", async () => {
  const [settingsStyles, terminalSource, architecture, manual] = await Promise.all([
    readFile(new URL("../src/modules/settings/settings.css", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/settings/TerminalSettings.tsx", import.meta.url), "utf8"),
    readFile(new URL("../docs/ARCHITECTURE.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/manual/15-settings.md", import.meta.url), "utf8"),
  ]);

  assert.match(
    terminalSource,
    /settings\.terminalText[\s\S]*settings\.fontFamily[\s\S]*settings\.cursorStyle[\s\S]*<\/fieldset>/,
  );
  assert.match(settingsStyles, /\.settings-fieldset > :is\(\.form-grid,/);
  assert.match(settingsStyles, /\.settings-fieldset > :is\([\s\S]*\):has\(\+ :is\(/);
  assert.match(settingsStyles, /\.settings-fieldset > :is\([\s\S]*\) \+ :is\(/);
  assert.match(settingsStyles, /border-bottom-left-radius:\s*0;/);
  assert.match(settingsStyles, /margin-top:\s*-10px;/);
  assert.match(
    architecture,
    /Related Settings rows should stay in the same grouped card whenever they share a subsection/i,
  );
  assert.match(
    manual,
    /Related Settings rows should stay grouped together inside the same subsection/i,
  );
});
