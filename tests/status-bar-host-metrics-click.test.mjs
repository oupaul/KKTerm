import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

test("host usage status metrics are single-click buttons and not selectable text", async () => {
  const statusBar = await readFile(
    new URL("../src/modules/workspace/StatusBar.tsx", import.meta.url),
    "utf8",
  );
  const css = await readFile(
    new URL("../src/modules/workspace/workspace.css", import.meta.url),
    "utf8",
  );

  assert.match(statusBar, /className="host-metrics"[\s\S]*onClick=\{openTaskManager\}/);
  assert.match(statusBar, /className="host-metrics"[\s\S]*type="button"/);
  assert.doesNotMatch(statusBar, /onDoubleClick=\{openTaskManager\}/);
  assert.match(css, /\.host-metrics\s*\{[\s\S]*cursor:\s*pointer;/);
  assert.match(css, /\.host-metrics\s*\{[\s\S]*user-select:\s*none;/);
});
