import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rendererSource = await readFile(
  new URL("../src/modules/workspace/connections/terminal/renderer.ts", import.meta.url),
  "utf8",
);
const terminalCss = await readFile(
  new URL("../src/modules/workspace/connections/terminal/terminal.css", import.meta.url),
  "utf8",
);

test("terminal renderer allows connection background transparency", () => {
  assert.match(
    rendererSource,
    /allowTransparency:\s*true/,
    "xterm must opt in before Terminal.open so rgba theme backgrounds reveal pane backgrounds",
  );
  assert.match(
    rendererSource,
    /background:\s*terminalBackgroundColor\(backgroundOpacity\)/,
    "terminal opacity should continue to drive the xterm rgba theme background",
  );
});

test("terminal xterm viewport does not mask connection backgrounds", () => {
  assert.match(
    terminalCss,
    /\.xterm-host\s+\.xterm\s+\.xterm-viewport\s*\{[\s\S]*background-color:\s*transparent;/,
    "xterm's packaged black viewport background must stay transparent in KKTerm panes",
  );
});
