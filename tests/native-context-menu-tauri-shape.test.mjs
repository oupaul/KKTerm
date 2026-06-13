import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("native context menu uses explicit Tauri icon menu items for icon entries", async () => {
  const source = await readFile(
    new URL("../src/lib/nativeContextMenu.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /IconMenuItem\.new/);
});

test("native context menu rasterizer passes PNG bytes to Tauri Image.fromBytes", async () => {
  const source = await readFile(
    new URL("../src/lib/nativeContextMenu.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /canvasToPngBytes/);
  assert.match(source, /imageFactory\.fromBytes\(pngBytes\)/);
});

test("native context menu uses macOS template icons for matching command glyphs", async () => {
  const source = await readFile(
    new URL("../src/lib/nativeContextMenu.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /macosTemplateIconForSvg/);
  assert.match(source, /\[nativeMenuIcons\.plus,\s*"Add"\]/);
  assert.match(source, /\[nativeMenuIcons\.squarePlus,\s*"Add"\]/);
});
