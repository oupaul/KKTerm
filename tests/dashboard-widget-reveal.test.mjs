import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("agent-authored widgets play the space-warp reveal animation", async () => {
  const css = await readFile(new URL("../src/modules/dashboard/dashboard.css", import.meta.url), "utf8");
  const frame = await readFile(new URL("../src/modules/dashboard/view/WidgetFrame.tsx", import.meta.url), "utf8");

  // The reveal is gated to agent-created widgets and applied via a marker class.
  assert.match(frame, /const shouldSpaceWarp = agentCreatedRevealInstanceIds\.includes\(instance\.id\)/);
  assert.match(frame, /shouldSpaceWarp \? "dw-reveal-space-warp" : ""/);

  // The marker class drives a space-warp animation backed by matching keyframes.
  assert.match(css, /\.dw-custom-widget\.dw-reveal-space-warp\s*\{[\s\S]*?animation:\s*dw-widget-space-warp\s/);
  assert.match(css, /@keyframes dw-widget-space-warp\s*\{/);
  assert.match(css, /\.dw-custom-widget\.dw-reveal-space-warp::after/);
});
