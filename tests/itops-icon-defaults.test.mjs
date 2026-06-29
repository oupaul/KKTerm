import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("IT Ops topology defaults use the requested Lucide icons", async () => {
  const icons = await read("src/modules/itops/icons.tsx");
  const fleets = await read("src/modules/itops/FleetsTab.tsx");
  const fleetDialog = await read("src/modules/itops/FleetDialog.tsx");
  const serverRoomDialog = await read("src/modules/itops/ServerRoomDialog.tsx");

  assert.match(icons, /import \{ Building2, Server, ShelvingUnit \} from "lucide-react"/);
  assert.match(icons, /fleet: \(p\) => LucideGlyph\(Building2, p\)/);
  assert.match(icons, /room: \(p\) => LucideGlyph\(Server, p\)/);
  assert.match(icons, /rack: \(p\) => LucideGlyph\(ShelvingUnit, p\)/);
  assert.match(fleets, /return group\.filter \? "filter" : "fleet"/);
  assert.match(fleets, /<ItIcon name="fleet" size=\{14\} \/>/);
  assert.match(fleets, /<ItIcon name="rack" size=\{14\} \/>/);
  assert.match(fleets, /icon="room"/);
  assert.match(fleets, /icon="rack"/);
  assert.match(fleetDialog, /DEFAULT_FLEET_ICON_REF = lucideIconRefForName\("Building2"\)/);
  assert.match(fleetDialog, /defaultIconDataUrl=\{DEFAULT_FLEET_ICON_REF\}/);
  assert.match(serverRoomDialog, /DEFAULT_SERVER_ROOM_ICON_REF = lucideIconRefForName\("Server"\)/);
  assert.match(serverRoomDialog, /defaultIconDataUrl=\{DEFAULT_SERVER_ROOM_ICON_REF\}/);
});

test("shared Lucide icon selectors expose Fleet, Server Room, and Rack icons", async () => {
  const dashboardTypes = await read("src/modules/dashboard/types.ts");
  const workspaceIcons = await read("src/modules/workspace/workspaceIcons.tsx");
  const dashboardValidation = await read("src-tauri/src/dashboard_validation.rs");

  for (const iconName of ["Building2", "Server", "ShelvingUnit"]) {
    assert.match(dashboardTypes, new RegExp(`"${iconName}"`), `${iconName} missing from dashboard selector`);
    assert.match(workspaceIcons, new RegExp(`"${iconName}"`), `${iconName} missing from workspace selector`);
    assert.match(dashboardValidation, new RegExp(`"${iconName}"`), `${iconName} missing from dashboard validator`);
  }
});

test("Connection icon picker keeps Lucide background and foreground separate", async () => {
  const picker = await read("src/modules/workspace/connections/ConnectionIconPicker.tsx");
  const icon = await read("src/modules/workspace/connections/ConnectionIcon.tsx");
  const css = await read("src/modules/workspace/connections/connections.css");

  assert.match(picker, /defaultIconDataUrl\?: string \| null/);
  assert.match(picker, /previewIconDataUrl = currentIconDataUrl \?\? defaultIconDataUrl \?\? null/);
  assert.match(picker, /iconDataUrl=\{previewIconDataUrl\}/);
  assert.match(icon, /"--connection-icon-fg": hasBackground/);
  assert.match(icon, /function iconForegroundForBackground/);
  assert.match(css, /color: var\(--connection-icon-fg\);[\s\S]*background: var\(--connection-icon-bg\);/);
});
