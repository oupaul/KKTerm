import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("terminal app-owned paste uses xterm paste transformations before writing to the session", async () => {
  const rendererSource = await readFile(
    new URL("../src/modules/workspace/connections/terminal/renderer.ts", import.meta.url),
    "utf8",
  );
  const workspaceSource = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );

  assert.match(rendererSource, /paste: \(data: string\) => void/);
  assert.match(rendererSource, /paste\(data: string\) \{\s*this\.terminal\.paste\(data\);\s*\}/s);

  const pasteHandler =
    workspaceSource.match(/async function handlePasteIntoTerminal\(\) \{([\s\S]*?)\n  \}/)?.[1] ?? "";
  assert.match(pasteHandler, /terminalRendererRef\.current\?\.paste\(text\)/);
  assert.doesNotMatch(pasteHandler, /write_terminal_input/);
});

test("terminal copy-on-select uses the shared clipboard fallback", async () => {
  const workspaceSource = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );

  const selectionHandler =
    workspaceSource.match(/terminal\.onSelectionChange\(\(\) => \{([\s\S]*?)\n    \}\)/)?.[1] ?? "";
  assert.match(selectionHandler, /void writeToClipboard\(selection\)/);
  assert.doesNotMatch(selectionHandler, /navigator\.clipboard/);
});

test("terminal copy-on-select reads the live setting so toggling applies to open terminals", async () => {
  const workspaceSource = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );

  const selectionHandler =
    workspaceSource.match(/terminal\.onSelectionChange\(\(\) => \{([\s\S]*?)\n    \}\)/)?.[1] ?? "";
  assert.match(selectionHandler, /useWorkspaceStore\.getState\(\)\.terminalSettings\.copyOnSelect/);
});

test("multiline paste confirmation returns focus to the terminal after the dialog closes", async () => {
  const workspaceSource = await readFile(
    new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
    "utf8",
  );

  const resolver =
    workspaceSource.match(
      /function resolveMultilinePasteConfirmation\(confirmed: boolean\) \{([\s\S]*?)\n  \}/,
    )?.[1] ?? "";
  assert.match(resolver, /setMultilinePasteConfirmationOpen\(false\)/);
  assert.match(resolver, /terminalRendererRef\.current\?\.focus\(\)/);
  assert.match(resolver, /queueMicrotask\(focus\)/);
  assert.match(resolver, /window\.requestAnimationFrame\(focus\)/);
});

test("clipboard execCommand fallback restores focus after copying", async () => {
  const clipboardSource = await readFile(new URL("../src/lib/clipboard.ts", import.meta.url), "utf8");

  const fallback = clipboardSource.match(/const previouslyFocused([\s\S]*?)\n\}/)?.[0] ?? "";
  assert.match(fallback, /document\.activeElement/);
  assert.match(fallback, /previouslyFocused instanceof HTMLElement/);
  assert.match(fallback, /previouslyFocused\.focus\(\)/);
});
