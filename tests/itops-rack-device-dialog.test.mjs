import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Rack Device editor uses identity and form columns", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");

  assert.match(dialog, /rack-item-dialog-grid/);
  assert.match(dialog, /rack-item-dialog-column type-column/);
  assert.match(dialog, /rack-item-dialog-column form-column/);
  assert.doesNotMatch(dialog, /appearance-column|metadata-column/);
  assert.match(dialog, /rack-item-preview-stage/);
  assert.match(dialog, /rack-item-shell-grid/);
  assert.match(dialog, /seed=\{`shell-\$\{value\}-\$\{kind\}`\}/);
  assert.match(dialog, /startULabel"\)} req/);
  assert.match(dialog, /itemHeightLabel"\)} req/);
  // Identity fields live under the preview, ahead of the form column.
  assert.match(dialog, /labelLabel[\s\S]*vendorLabel[\s\S]*hostLabel[\s\S]*form-column[\s\S]*statusLabel/);
  assert.doesNotMatch(dialog, /relationshipLabel|ipamLabel|auditLabel/);
  assert.doesNotMatch(dialog, /connection-binding-list/);
});

test("Rack Device editor follows the compact redesign layout", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");
  const styles = await read("src/modules/itops/itops.css");

  assert.match(dialog, /width=\{760\}/);
  assert.match(styles, /rack-item-dialog-grid[\s\S]*grid-template-columns: minmax\(0, 310px\) minmax\(0, 1fr\)/);
  assert.match(styles, /rack-kind-preview-grid[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(styles, /rack-item-dialog-column[\s\S]{0,180}border-right/);
});

test("Kuai Kuai properties stay package-only with one combined style choice", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");

  // Status/shell/accent/power-draw are hidden and not persisted for 乖乖.
  assert.match(dialog, /\{isKuaiguai \? null : \(\s*<>\s*<Field label=\{t\("itops\.racks\.statusLabel"\)\}>/);
  assert.match(dialog, /powerW: isKuaiguai \? null : parsedPowerDraw/);
  // One select carries pose and size together; yaw is gone.
  assert.match(dialog, /value=\{`\$\{kuaiguaiStyle\}:\$\{kuaiguaiSize\}`\}/);
  assert.doesNotMatch(dialog, /kuaiguaiSizeLabel|yawLabel|\byaw\b/);
  // Editing an existing device hides the type switcher grid.
  assert.match(dialog, /placementMode \|\| isEdit \? null : \(/);
});

test("Rack Device Connection bindings use a separate dialog and device action", async () => {
  const bindings = await read("src/modules/itops/RackItemBindingsDialog.tsx");
  const elevation = await read("src/modules/itops/RackElevation.tsx");
  const sites = await read("src/modules/itops/SitesTab.tsx");

  assert.match(bindings, /connection-binding-list/);
  assert.match(bindings, /metadata:[\s\S]*connectionIds/);
  assert.match(elevation, /onBindItem/);
  assert.match(elevation, /ItIcon name="link"/);
  assert.match(sites, /<RackItemBindingsDialog/);
});
