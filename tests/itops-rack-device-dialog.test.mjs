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
  assert.match(dialog, /kindLabel"\)} req/);
  assert.match(dialog, /startULabel"\)} req/);
  assert.match(dialog, /itemHeightLabel"\)} req/);
  assert.match(dialog, /labelLabel[\s\S]*vendorLabel[\s\S]*statusLabel/);
  assert.doesNotMatch(dialog, /relationshipLabel|ipamLabel|auditLabel/);
  assert.doesNotMatch(dialog, /connection-binding-list/);
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
