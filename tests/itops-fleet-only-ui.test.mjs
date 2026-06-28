import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("IT Ops visible shell is Fleet-only with the Module header in the Fleet sidebar", async () => {
  const module = await read("src/modules/itops/ItOpsModule.tsx");

  assert.match(module, /renderSidebarHeader=\{/);
  assert.match(module, /<ModuleHeader\b/);
  assert.match(module, /<ModuleIconTile\b/);
  assert.doesNotMatch(module, /it-side-collapse/);
  assert.doesNotMatch(module, /\bit-tabs\b/);
  assert.doesNotMatch(module, /TABS\.map/);
  assert.doesNotMatch(module, /PRIMARY\[tab\]/);
});

test("IT Ops Fleets navigator is toggled from the title bar beside AI Assistant", async () => {
  const app = await read("src/App.tsx");
  const titleBar = await read("src/app/TitleBar.tsx");

  assert.match(app, /itOpsFleetTreeCollapsed/);
  assert.match(app, /onToggleItOpsFleetTree=/);
  assert.match(app, /saveFleetTreeCollapsed\(itOpsFleetTreeCollapsed\)/);
  assert.match(titleBar, /activePage === "itops"/);
  assert.match(titleBar, /onToggleItOpsFleetTree/);
  assert.match(titleBar, /aria-label=\{t\("itops\.fleets\.heading"\)\}/);
});

test("Fleet detail opens directly to Rack View without the old top-level action bar", async () => {
  const fleets = await read("src/modules/itops/FleetsTab.tsx");

  assert.match(fleets, /data-tutorial-id="itops\.fleetsTree"/);
  assert.match(fleets, /data-tutorial-id="itops\.fleetView"/);
  assert.doesNotMatch(fleets, /type FleetView = "members" \| "racks"/);
  assert.doesNotMatch(fleets, /itops\.fleets\.viewMembers/);
  assert.doesNotMatch(fleets, /itops\.fleets\.viewRacks/);
  assert.doesNotMatch(fleets, /itops\.actions\.runTask/);
  assert.doesNotMatch(fleets, /setPendingDelete\(activeGroup\)/);
  assert.doesNotMatch(fleets, /setDialog\(\{ group: activeGroup \}\)/);
});

test("Fleet tree state persists width, collapse state, and clamps like a panel", async () => {
  const state = await read("src/modules/itops/fleetTreeState.ts");

  assert.match(state, /FLEET_TREE_COLLAPSED_WIDTH = 0/);
  assert.match(state, /loadFleetTreeCollapsed/);
  assert.match(state, /saveFleetTreeCollapsed/);
  assert.match(state, /FLEET_TREE_MIN_WIDTH/);
  assert.match(state, /FLEET_TREE_MAX_WIDTH/);
});

test("Fleet tree add menu opens distinct Fleet, Server Room, and Rack dialogs", async () => {
  const fleets = await read("src/modules/itops/FleetsTab.tsx");
  const fleetDialog = await read("src/modules/itops/FleetDialog.tsx");
  const rackDialog = await read("src/modules/itops/RackDialog.tsx");
  const serverRoomDialog = await read("src/modules/itops/ServerRoomDialog.tsx");

  assert.match(fleets, /<ServerRoomDialog\b/);
  assert.match(fleets, /selectedFleetIdForDialog/);
  assert.match(fleets, /selectedServerRoomForDialog/);
  assert.match(fleets, /setServerRoomDialogOpen\(true\)/);
  assert.match(fleets, /setRackDialog\(\{[\s\S]*fleetId: selectedFleetIdForDialog[\s\S]*rack: null/);
  assert.match(fleetDialog, /itops\.fleets\.createHelp/);
  assert.match(serverRoomDialog, /itops\.racks\.serverRoomFleetLabel/);
  assert.match(serverRoomDialog, /createRack\(/);
  assert.match(rackDialog, /itops\.racks\.fleetLabel/);
  assert.match(rackDialog, /itops\.racks\.serverRoomSelectLabel/);
});
