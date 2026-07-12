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
  assert.doesNotMatch(dialog, /startULabel"\)} req/);
  assert.match(dialog, /itemHeightLabel"\)} req/);
  // Identity fields live under the preview, ahead of the form column.
  assert.match(dialog, /labelLabel[\s\S]*vendorLabel[\s\S]*form-column[\s\S]*statusLabel/);
  assert.doesNotMatch(dialog, /hostLabel[\s\S]*<Select/);
  assert.doesNotMatch(dialog, /relationshipLabel|ipamLabel|auditLabel/);
  assert.doesNotMatch(dialog, /connection-binding-list/);
});

test("Rack Device editor follows the compact redesign layout", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");
  const styles = await read("src/modules/itops/itops.css");

  assert.match(dialog, /width=\{760\}/);
  assert.match(styles, /rack-item-dialog-grid[\s\S]*grid-template-columns: minmax\(0, 310px\) minmax\(0, 1fr\)/);
  assert.match(styles, /rack-item-preview-rack[\s\S]*width: calc\(100% - 24px\)/);
  assert.match(dialog, /Math\.min\(5, Math\.max\(1, heightU\)\) \* 22/);
  assert.match(styles, /rack-item-preview-device[\s\S]*max-height: 110px/);
  assert.match(styles, /rack-kind-preview-grid[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(styles, /rack-item-dialog-column[\s\S]{0,180}border-right/);
});

test("Rack Device editor centers the current device type in its header", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");
  const styles = await read("src/modules/itops/itops.css");

  assert.match(dialog, /className="rack-item-dialog-device-type"[\s\S]*itops\.racks\.kind\.\$\{kind\}/);
  assert.match(styles, /rack-item-dialog-device-type[\s\S]*left: 50%[\s\S]*color: var\(--text-muted\)[\s\S]*translateX\(-50%\)/);
});

test("Rack Device editor keeps notes and tags in the model column and pairs capacity with height", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");

  const typeColumnStart = dialog.indexOf('className="rack-item-dialog-column type-column"');
  const formColumnStart = dialog.indexOf('className="rack-item-dialog-column form-column"');
  const typeColumn = dialog.slice(typeColumnStart, formColumnStart);
  const formColumn = dialog.slice(formColumnStart);

  assert.match(typeColumn, /vendorLabel[\s\S]*notesLabel[\s\S]*tagsLabel/);
  assert.doesNotMatch(typeColumn, /labelHint|vendorHint|notesHint|listHint/);
  assert.doesNotMatch(formColumn, /notesLabel|tagsLabel/);
  assert.match(formColumn, /className="rack-form-grid two rack-device-dimensions"[\s\S]*disksLabel[\s\S]*itemHeightLabel/);
  assert.match(typeColumn, /notesLabel[\s\S]*TextArea[^>]*rows=\{3\}/);
  assert.match(typeColumn, /tagsLabel[\s\S]*TextArea[^>]*rows=\{1\}/);
});

test("Rack-top Kuai Kuai can be dragged into the cabinet and back onto the rack top", async () => {
  const elevation = await read("src/modules/itops/RackElevation.tsx");

  assert.match(elevation, /rk-top-area[\s\S]*onDragOver[\s\S]*application\/x-itops-rack-kuaiguai/);
  assert.match(elevation, /onMoveItem\?\.\(itemId, rack\.id, rack\.heightU \+ 1\)/);
  assert.match(elevation, /rk-top-item\$\{canMove \? " draggable"[\s\S]*draggable=\{canMove\}/);
});

test("Rack Device capacity and height steppers center all three controls", async () => {
  const styles = await read("src/modules/itops/itops.css");

  assert.match(styles, /rack-device-dimensions \.kk-stepper[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)[\s\S]*border: 0\.5px solid var\(--border-strong\)[\s\S]*box-shadow: none/);
  assert.match(styles, /rack-device-dimensions \.kk-stepper input,[\s\S]*rack-device-dimensions \.kk-stepper button[\s\S]*width: 100%/);
});

test("Server editor exposes all three persisted front-panel styles", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");

  assert.match(dialog, /useState<RackServerPanelStyle>[\s\S]*serverPanelStyle \?\? "default"/);
  assert.match(dialog, /serverPanelStyle: kind === "server" \? serverPanelStyle : null/);
  assert.match(dialog, /serverPanelStyleLabel/);
  assert.match(dialog, /\["default", "style1", "style2"\]/);
});

test("Kuai Kuai properties expose only the two large poses with date and rotation controls", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");

  // Status/shell/accent/power-draw are hidden and not persisted for 乖乖.
  assert.match(dialog, /\{isKuaiguai \? null : \(\s*<>\s*<Field label=\{t\("itops\.racks\.statusLabel"\)\}>/);
  assert.match(dialog, /powerW: isKuaiguai \? null : parsedPowerDraw/);
  // The selector has two poses, both locked to large; yaw is gone.
  assert.match(dialog, /value=\{kuaiguaiStyle\}/);
  assert.match(dialog, /\["full", "laidDown"\]/);
  assert.match(dialog, /kuaiguaiSize\.large/);
  assert.match(dialog, /type="range"[\s\S]*min=\{-45\}[\s\S]*max=\{45\}/);
  assert.match(dialog, /TextInput type="date"/);
  assert.doesNotMatch(dialog, /kuaiguaiSizeLabel|yawLabel|\byaw\b/);
  // Editing an existing device hides the type switcher grid.
  assert.match(dialog, /placementMode \|\| isEdit \? null : \(/);
});

test("Server Room spatial placement creates the same large rack-top Kuai Kuai", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");
  const device = await read("src/modules/itops/RackDevice.tsx");
  const start = sites.indexOf("const placeKuaiguaiOnRack");
  const end = sites.indexOf("useEffect(() =>", start);
  const placement = sites.slice(start, end);

  assert.match(placement, /kuaiguaiSize: "large"/);
  assert.doesNotMatch(placement, /kuaiguaiSize: "regular"/);
  assert.match(device, /data-kuaiguai-size="large"/);
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

test("Rack Device Host binding uses a count link and dedicated editor", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");
  const bindings = await read("src/modules/itops/RackHostBindingDialog.tsx");
  const styles = await read("src/modules/itops/itops.css");

  assert.doesNotMatch(dialog, /Field label=\{t\("itops\.racks\.hostLabel"\)/);
  assert.match(dialog, /className="rack-host-bind-link"/);
  assert.match(dialog, /boundHostCount/);
  assert.match(dialog, /<RackHostBindingDialog/);
  assert.match(bindings, /role="radiogroup"/);
  assert.match(bindings, /<HostDialog[\s\S]*onSaved=\{\(host\) => setSelectedHostId\(host\.id\)\}/);
  assert.match(styles, /rack-host-bind-link[\s\S]*color: var\(--accent\)/);
});
