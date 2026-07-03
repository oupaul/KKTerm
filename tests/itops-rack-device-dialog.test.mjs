import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Rack Device editor uses type, appearance, and metadata columns", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");

  assert.match(dialog, /rack-item-dialog-grid/);
  assert.match(dialog, /rack-item-dialog-column type-column/);
  assert.match(dialog, /rack-item-dialog-column appearance-column/);
  assert.match(dialog, /rack-item-dialog-column metadata-column/);
  assert.match(dialog, /rack-item-preview-stage/);
  assert.match(dialog, /rack-item-shell-grid/);
  assert.match(dialog, /seed=\{`shell-\$\{value\}-\$\{kind\}`\}/);
  assert.match(dialog, /startULabel"\)} req/);
  assert.match(dialog, /itemHeightLabel"\)} req/);
  assert.match(dialog, /labelLabel[\s\S]*vendorLabel[\s\S]*statusLabel/);
  assert.doesNotMatch(dialog, /relationshipLabel|ipamLabel|auditLabel/);
  assert.doesNotMatch(dialog, /connection-binding-list/);
});

test("Rack Device editor follows the compact redesign layout", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");
  const styles = await read("src/modules/itops/itops.css");

  assert.match(dialog, /width=\{900\}/);
  assert.match(styles, /rack-item-dialog-grid[\s\S]*grid-template-columns: minmax\(0, 310px\) minmax\(0, 280px\) minmax\(0, 1fr\)/);
  assert.match(styles, /rack-kind-preview-grid[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(styles, /rack-item-dialog-column[\s\S]{0,180}border-right/);
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
