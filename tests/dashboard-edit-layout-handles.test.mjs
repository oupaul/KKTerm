import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("dashboard edit mode exposes a stable non-button drag grip", async () => {
  const frameSource = await readFile(new URL("../src/modules/dashboard/view/WidgetFrame.tsx", import.meta.url), "utf8");
  const canvasSource = await readFile(new URL("../src/modules/dashboard/view/DashboardCanvas.tsx", import.meta.url), "utf8");

  assert.match(frameSource, /className="dw-layout-grip drag-handle"/);
  assert.match(canvasSource, /draggableHandle="\.drag-handle"/);
  assert.doesNotMatch(canvasSource, /draggableCancel="[^"]*drag-handle/);
});

test("dashboard edit mode makes resize handles visible", async () => {
  const css = await readFile(new URL("../src/modules/dashboard/dashboard.css", import.meta.url), "utf8");

  assert.match(css, /\.dw-canvas-scroll\.is-editing \.react-grid-item > \.react-resizable-handle\.react-resizable-handle-se/);
  assert.match(css, /cursor: nwse-resize;/);
});
