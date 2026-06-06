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
