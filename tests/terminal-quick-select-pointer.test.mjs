import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [source, css] = await Promise.all([
  readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/modules/workspace/connections/terminal/terminal.css", import.meta.url),
    "utf8",
  ),
]);

test("Quick Select hint buttons copy or open URLs without triggering overlay dismissal", () => {
  assert.match(source, /function handleQuickSelectClick[\s\S]*?quickSelectPointerAction\(match\.text, event\.shiftKey \|\| event\.ctrlKey\)/);
  assert.match(source, /action\.kind === "open"[\s\S]*?openExternalUrl\(action\.url\)/);
  assert.match(source, /onClick=\{\(event\) => handleQuickSelectClick\(event, match\)\}/);
  assert.match(source, /if \(event\.target === event\.currentTarget\) \{\s*closeQuickSelect\(\);/);
  assert.doesNotMatch(css, /\.terminal-quick-select-hint\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(css, /\.terminal-quick-select-hint:hover,[\s\S]*?\.terminal-quick-select-hint:focus-visible/);
});
