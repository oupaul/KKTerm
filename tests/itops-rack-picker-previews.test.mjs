import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Rack View picker uses compact faceplates without duplicate captions", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");
  const pickerStart = sites.indexOf("function RackObjectPicker");
  const pickerEnd = sites.indexOf("function SiteRoomCards", pickerStart);
  const picker = sites.slice(pickerStart, pickerEnd);

  assert.match(picker, /<RackDevice[\s\S]*compact/);
  assert.match(picker, /aria-label=\{label\}/);
  assert.doesNotMatch(picker, /rm-picker-name/);
});

test("Rack Device pickers no longer offer Blank or Label", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");
  const catalogStart = dialog.indexOf("export const RACK_ITEM_KINDS");
  const catalogEnd = dialog.indexOf("const STATUS_OPTIONS", catalogStart);
  const catalog = dialog.slice(catalogStart, catalogEnd);

  assert.doesNotMatch(catalog, /"blank"/);
  assert.doesNotMatch(catalog, /"label"/);
});

test("Rack Device pickers merge Equipment and General into Generic Device", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");
  const catalogStart = dialog.indexOf("export const RACK_ITEM_KINDS");
  const catalogEnd = dialog.indexOf("const STATUS_OPTIONS", catalogStart);
  const catalog = dialog.slice(catalogStart, catalogEnd);

  assert.match(catalog, /"genericDevice"/);
  assert.doesNotMatch(catalog, /"equipment"|"general"/);
});

test("Server Tower form factor is stored and rendered at half width", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");
  const device = await read("src/modules/itops/RackDevice.tsx");
  const styles = await read("src/modules/itops/itops.css");

  assert.match(dialog, /formFactorLabel/);
  assert.match(dialog, /\["rack", "tower"\]/);
  assert.match(dialog, /formFactor: kind === "server" \? formFactor : null/);
  assert.match(device, /data-form-factor=\{isServer \? formFactor \?\? "rack" : undefined\}/);
  assert.match(styles, /\.rkd\[data-form-factor="tower"\][\s\S]*width: 50%;[\s\S]*margin-inline: auto/);
});

test("Rack Device faceplates use one left status LED and no right LED", async () => {
  const device = await read("src/modules/itops/RackDevice.tsx");
  const styles = await read("src/modules/itops/itops.css");

  const ledColumn = device.slice(device.indexOf("{showLeds ? ("), device.indexOf("{hasName ? ("));
  assert.equal((ledColumn.match(/<span/g) ?? []).length, 1);
  assert.match(ledColumn, /background: statusLed/);
  assert.doesNotMatch(device, /rkd-meta|rkd-status-dot|ledPowerClass|powerColor/);
  assert.doesNotMatch(styles, /\.rkd-meta|\.rkd-status-dot/);
});

test("Server faceplates render default and two unbranded full-panel styles", async () => {
  const device = await read("src/modules/itops/RackDevice.tsx");
  const elevation = await read("src/modules/itops/RackElevation.tsx");
  const styles = await read("src/modules/itops/itops.css");

  assert.match(device, /panelStyle === "style1"/);
  assert.match(device, /rkd-server-style1-lattice/);
  assert.match(device, /rkd-server-style1-mark/);
  assert.match(device, /heightU >= 5 \? "chassis" : heightU >= 3 \? "dense" : "compact"/);
  assert.match(device, /serverTopRatio = Math\.min\(40, 200 \/ Math\.max\(1, heightU\)\)/);
  assert.match(device, /serverHeightBand === "compact" \? null : \(/);
  assert.match(device, /serverHeightBand === "chassis" \? \(/);
  assert.match(device, /rkd-server-style1-lower/);
  assert.match(device, /panelStyle === "style2"/);
  assert.match(device, /rkd-server-style2-rail upper/);
  assert.match(device, /rkd-server-style2-badge/);
  assert.ok(device.indexOf("rkd-server-style1") < device.indexOf("{showLeds ? ("));
  assert.doesNotMatch(device, /<text|rkd-server-style2-bezel right"><i/);
  assert.match(elevation, /serverPanelStyle=\{item\.metadata\?\.serverPanelStyle \?\? null\}/);
  assert.match(styles, /rkd-server-style1,[\s\S]*position: absolute;[\s\S]*inset: 0/);
  assert.match(styles, /data-server-panel-style="style1"[\s\S]*rkd-id[\s\S]*text-align: center/);
  assert.match(styles, /data-height-band="dense"[\s\S]*grid-template-rows: repeat\(2/);
  assert.match(styles, /data-height-band="chassis"[\s\S]*bottom: calc\(100% - var\(--rkd-server-top, 40%\)\)/);
  assert.match(styles, /rkd-server-style1-lower[\s\S]*grid-template-columns: repeat\(6/);
  assert.match(styles, /rkd-server-style2[\s\S]*converging grille rails/);
});
