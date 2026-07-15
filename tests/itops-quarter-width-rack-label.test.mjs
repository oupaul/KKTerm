import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("quarter-width Rack Devices use 70% labels in the rack and properties preview", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");
  const elevation = await read("src/modules/itops/RackElevation.tsx");
  const styles = await read("src/modules/itops/itops.css");

  assert.match(dialog, /widthFraction === "quarter"[\s\S]*\? " quarter-width"/);
  assert.match(elevation, /const quarterWidth = xSpan\.xQuarters === 1/);
  assert.match(elevation, /quarterWidth \? " quarter-width" : ""/);
  assert.match(elevation, /placeQuarters === 1 \? " quarter-width" : ""/);
  assert.match(
    styles,
    /\.rk-item\.quarter-width \.rkd-name,[\s\S]*\.rack-item-preview-device\.quarter-width \.rkd-name\s*\{\s*font-size: 8\.05px;/,
  );
});
