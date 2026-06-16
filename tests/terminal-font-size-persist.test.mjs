import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", "utf8");

test("toolbar font change persists the new size to the durable terminal settings", () => {
  // The toolbar handler must both apply the live size and persist it so the
  // change survives app launches.
  assert.match(source, /applyFontSizeToPanes\(clamped\);\s*\n\s*void persistTerminalFontSize\(clamped\);/);
  assert.match(source, /async function persistTerminalFontSize/);
  assert.match(source, /invokeCommand\("update_terminal_settings", \{ request: nextSettings \}\)/);
  assert.match(source, /setTerminalSettings\(saved\)/);
});

test("persisted toolbar font size is clamped to the Settings-valid range", () => {
  // The backend rejects font sizes outside 8..=32, so the durable value must be
  // clamped even though the live zoom range is wider.
  assert.match(source, /Math\.min\(Math\.max\(fontSize, 8\), 32\)/);
});
