import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("dashboard edit mode uses preset chrome as the move handle", async () => {
  const frameSource = await readFile(new URL("../src/modules/dashboard/view/WidgetFrame.tsx", import.meta.url), "utf8");
  const canvasSource = await readFile(new URL("../src/modules/dashboard/view/DashboardCanvas.tsx", import.meta.url), "utf8");
  const presetSource = await readFile(new URL("../src/modules/dashboard/registry/presetRegistry.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(frameSource, /dw-layout-grip/);
  assert.match(frameSource, /editMode \? "drag-handle" : ""/);
  assert.match(presetSource, /dw-head\$\{editMode \? " drag-handle" : ""\}/);
  assert.match(presetSource, /dw-preset-ambient[\s\S]*\$\{editMode \? " drag-handle" : ""\}/);
  assert.match(presetSource, /dw-hero-head\$\{editMode \? " drag-handle" : ""\}/);
  assert.match(canvasSource, /draggableHandle="\.drag-handle"/);
  assert.doesNotMatch(canvasSource, /draggableCancel="[^"]*drag-handle/);
});

test("dashboard edit mode keeps resize handles functional without decorative overlays", async () => {
  const canvasSource = await readFile(new URL("../src/modules/dashboard/view/DashboardCanvas.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/modules/dashboard/dashboard.css", import.meta.url), "utf8");

  assert.match(canvasSource, /draggableCancel="[^"]*\.react-resizable-handle/);
  assert.match(canvasSource, /resizeHandles=\{editMode \? \["n", "e", "s", "w", "nw", "ne", "sw", "se"\] : \[\]\}/);
  assert.doesNotMatch(css, /\.dw-canvas-scroll\.is-editing \.react-grid-item > \.react-resizable-handle/);
  assert.match(css, /\.dw-instance\.dw-edit\.drag-handle,/);
  assert.match(css, /cursor: nwse-resize;/);
});
