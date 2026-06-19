import assert from "node:assert/strict";
import test from "node:test";

import { refreshTerminalFontAtlases } from "../src/modules/workspace/connections/terminal/fontAtlasRefresh.ts";

test("shared terminal font atlases are all cleared before any terminal redraws", () => {
  const calls: string[] = [];
  const targets = ["powershell", "cmd"].map((name) => ({
    clearFontAtlas: () => calls.push(`clear:${name}`),
    redraw: () => calls.push(`redraw:${name}`),
  }));

  refreshTerminalFontAtlases(targets);

  assert.deepEqual(calls, [
    "clear:powershell",
    "clear:cmd",
    "redraw:powershell",
    "redraw:cmd",
  ]);
});
