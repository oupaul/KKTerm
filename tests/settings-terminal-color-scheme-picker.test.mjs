import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [source, css] = await Promise.all([
  readFile(new URL("../src/modules/settings/TerminalSettings.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/modules/settings/settings.css", import.meta.url), "utf8"),
]);

test("Terminal Settings uses a palette-preview listbox instead of a native scheme select", () => {
  assert.match(source, /function TerminalColorSchemePicker/);
  assert.match(source, /role="listbox"/);
  assert.match(source, /role="option"/);
  assert.match(
    source,
    /backgroundColor: scheme\.palette\.background,[\s\S]*?color: scheme\.palette\.foreground/,
  );
  assert.doesNotMatch(
    source,
    /<select[\s\S]{0,500}settings\.terminalColorScheme/,
  );
});

test("Terminal Settings scheme list is scrollable and keyboard navigable", () => {
  for (const key of ["ArrowDown", "ArrowUp", "Home", "End", "Escape"]) {
    assert.match(source, new RegExp(`event\\.key === "${key}"`));
  }
  assert.match(css, /\.terminal-scheme-picker-list\s*\{[^}]*max-height:[^;]+;[^}]*overflow-y:\s*auto;/s);
  assert.match(
    css,
    /\.terminal-scheme-picker-option:hover,[\s\S]*?box-shadow:\s*inset 0 0 0 2px currentColor;/,
  );
});
