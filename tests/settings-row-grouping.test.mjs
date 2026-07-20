import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("DirectX screenshot performance controls live in Screenshots, not General", async () => {
  const [generalSource, screenshotsSource] = await Promise.all([
    readFile(new URL("../src/modules/settings/GeneralSettings.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/settings/ScreenshotsSettings.tsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(generalSource, /settings\.useDirectxScreenCapture/);
  assert.match(
    screenshotsSource,
    /isWindowsPlatform\(\)[\s\S]*settings\.performance[\s\S]*settings\.useDirectxScreenCapture/,
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
  assert.match(settingsStyles, /padding-bottom:\s*0;/);
  assert.match(settingsStyles, /padding-top:\s*0;/);
  assert.equal(
    terminalSource.match(/className="toolbar-button settings-inline-add-button"/g)?.length,
    2,
  );
  assert.match(settingsStyles, /\.settings-inline-add-button\s*\{[\s\S]*width:\s*max-content;/);
  assert.match(
    architecture,
    /Related Settings rows should stay in the same grouped card whenever they share a subsection/i,
  );
  assert.match(
    manual,
    /Related Settings rows should stay grouped together inside the same subsection/i,
  );
});
