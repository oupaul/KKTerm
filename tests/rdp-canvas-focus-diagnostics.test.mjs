import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/modules/workspace/connections/remote-desktop/RdpCanvasView.tsx", import.meta.url),
  "utf8",
);

test("IronRDP canvas records focus and first key diagnostics", () => {
  assert.match(source, /function RdpCanvasView/);
  assert.match(source, /const focusInput = \(reason: string\) => \{/);
  assert.match(source, /input\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /logUiDebug\("rdp\.canvas\.focus"/);
  assert.match(source, /inputFocused: document\.activeElement === input/);
  assert.match(source, /focusInput\("pointerdown"\)/);
  assert.match(source, /logUiDebug\("rdp\.canvas\.key"/);
});

test("IronRDP canvas keeps the hidden IME input focused after a pointer click", async () => {
  const styles = await readFile(
    new URL("../src/modules/workspace/connections/remote-desktop/remote-desktop.css", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /const onPointerDown = \(e: React\.PointerEvent<HTMLCanvasElement>\) => \{\s*\/\/[\s\S]*?e\.preventDefault\(\);\s*focusInput\("pointerdown"\);/,
  );
  assert.match(styles, /\.rdp-canvas-ime-input \{[\s\S]*?left: 0;[\s\S]*?pointer-events: none;/);
  assert.match(styles, /\.rdp-canvas-view \{[\s\S]*?-webkit-user-select: none;[\s\S]*?user-select: none;/);
  assert.match(source, /onContextMenu=\{preventLocalContextMenu\}/);
  assert.match(source, /draggable=\{false\}/);
  assert.match(source, /button === 0 && ctrlKey && isMacPlatform\(\)/);
  assert.doesNotMatch(source, /surface-pointerdown/);
});
