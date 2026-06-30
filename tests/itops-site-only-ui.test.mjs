import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("IT Ops visible shell is Site-only with the Module header in the Site sidebar", async () => {
  const module = await read("src/modules/itops/ItOpsModule.tsx");

  assert.match(module, /renderSidebarHeader=\{/);
  assert.match(module, /<ModuleHeader\b/);
  assert.match(module, /<ModuleIconTile\b/);
  assert.doesNotMatch(module, /it-side-collapse/);
  assert.doesNotMatch(module, /\bit-tabs\b/);
  assert.doesNotMatch(module, /TABS\.map/);
  assert.doesNotMatch(module, /PRIMARY\[tab\]/);
});

test("IT Ops Sites navigator is toggled from the title bar beside AI Assistant", async () => {
  const app = await read("src/App.tsx");
  const titleBar = await read("src/app/TitleBar.tsx");

  assert.match(app, /itOpsSiteTreeCollapsed/);
  assert.match(app, /onToggleItOpsSiteTree=/);
  assert.match(app, /saveSiteTreeCollapsed\(itOpsSiteTreeCollapsed\)/);
  assert.match(titleBar, /activePage === "itops"/);
  assert.match(titleBar, /onToggleItOpsSiteTree/);
  assert.match(titleBar, /aria-label=\{t\("itops\.sites\.heading"\)\}/);
});

test("Site detail opens directly to Rack View without the old top-level action bar", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");

  assert.match(sites, /data-tutorial-id="itops\.sitesTree"/);
  assert.match(sites, /data-tutorial-id="itops\.siteView"/);
  assert.doesNotMatch(sites, /type SiteView = "members" \| "racks"/);
  assert.doesNotMatch(sites, /itops\.sites\.viewMembers/);
  assert.doesNotMatch(sites, /itops\.sites\.viewRacks/);
  assert.doesNotMatch(sites, /itops\.actions\.runTask/);
  assert.doesNotMatch(sites, /setPendingDelete\(activeGroup\)/);
  assert.doesNotMatch(sites, /setDialog\(\{ group: activeGroup \}\)/);
});

test("Site tree state persists width, collapse state, and clamps like a panel", async () => {
  const state = await read("src/modules/itops/siteTreeState.ts");

  assert.match(state, /SITE_TREE_COLLAPSED_WIDTH = 0/);
  assert.match(state, /loadSiteTreeCollapsed/);
  assert.match(state, /saveSiteTreeCollapsed/);
  assert.match(state, /SITE_TREE_MIN_WIDTH/);
  assert.match(state, /SITE_TREE_MAX_WIDTH/);
});

test("Site tree add menu opens distinct Site, Server Room, and Rack dialogs", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");
  const siteDialog = await read("src/modules/itops/SiteDialog.tsx");
  const rackDialog = await read("src/modules/itops/RackDialog.tsx");
  const serverRoomDialog = await read("src/modules/itops/ServerRoomDialog.tsx");

  assert.match(sites, /<ServerRoomDialog\b/);
  assert.match(sites, /selectedSiteIdForDialog/);
  assert.match(sites, /selectedServerRoomForDialog/);
  assert.match(sites, /setServerRoomDialogOpen\(true\)/);
  assert.match(sites, /setRackDialog\(\{[\s\S]*siteId: selectedSiteIdForDialog[\s\S]*rack: null/);
  assert.match(sites, /customIcon=\{site\}/);
  assert.match(sites, /customIcon=\{site\.roomIcons\?\.\[room\.key\]\}/);
  assert.match(sites, /<ConnectionIcon\b/);
  assert.match(siteDialog, /itops\.sites\.createHelp/);
  assert.match(siteDialog, /\{isEdit \? \([\s\S]*itops\.sites\.perHostTransport/);
  assert.doesNotMatch(siteDialog, /\{isEdit \? \([\s\S]{0,120}<Field\s+label=\{t\("itops\.sites\.connectionsLabel"\)\}/);
  assert.match(serverRoomDialog, /itops\.racks\.serverRoomSiteLabel/);
  assert.match(serverRoomDialog, /createRack\(/);
  assert.match(rackDialog, /itops\.racks\.siteLabel/);
  assert.match(rackDialog, /itops\.racks\.serverRoomSelectLabel/);
});
