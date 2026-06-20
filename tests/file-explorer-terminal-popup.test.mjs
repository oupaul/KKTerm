import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Open Terminal Here uses a transient popup instead of a workspace Tab or Activity Rail session", async () => {
  const [storeSource, canvasSource, terminalSource] = await Promise.all([
    readFile(new URL("../src/store.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/workspace/WorkspaceCanvas.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/modules/workspace/connections/terminal/TerminalWorkspace.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  const opener = storeSource.match(
    /openLocalTerminalHere: \(cwd, options\) => \{([\s\S]*?)\r?\n  \},\r?\n  closeLocalTerminalPopup:/,
  )?.[1] ?? "";
  assert.match(opener, /localTerminalPopup:/);
  assert.doesNotMatch(opener, /openConnection|tabs:/);
  assert.match(storeSource, /closeLocalTerminalPopup: \(\) => void/);
  assert.match(canvasSource, /localTerminalPopup/);
  assert.match(
    canvasSource,
    /<TerminalWorkspace[\s\S]*trackConnectionSession=\{false\}[\s\S]*tab=\{localTerminalPopup\}/,
  );
  assert.match(terminalSource, /trackConnectionSession\?: boolean/);
  assert.match(
    terminalSource,
    /if \(trackConnectionSession\) \{\s*markConnectionSessionStarted\(connection\.id\);\s*\}/,
  );
});
