import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appShellEffects = await readFile(
  new URL("../src/app/appShellEffects.ts", import.meta.url),
  "utf8",
);
const appCss = await readFile(new URL("../src/app/app.css", import.meta.url), "utf8");
const terminalCss = await readFile(
  new URL("../src/modules/workspace/connections/terminal/terminal.css", import.meta.url),
  "utf8",
);

test("collapsed Connection panel lets terminal workspaces fill to the Activity Rail", () => {
  assert.match(
    appShellEffects,
    /--connection-resize-width",\s*connectionPanelVisibleForLayout\s*\?\s*"3px"\s*:\s*"0px"/,
    "the hidden Connection panel must not leave a resize track between the rail and workspace",
  );
  assert.match(
    appCss,
    /\.connections-collapsed\s+\.connection-collapsed-separator\s*\{[\s\S]*display:\s*none;/,
    "the collapsed separator must not remain visible next to the Activity Rail",
  );
  assert.match(
    terminalCss,
    /\.connections-collapsed\s+\.terminal-workspace\s*\{[\s\S]*padding:\s*0;/,
    "terminal surfaces must remove their outer inset when the Connection panel is hidden",
  );
});
