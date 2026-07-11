import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("IT Ops visible shell is Site-only with the Module header in the Site sidebar", async () => {
  const module = await read("src/modules/itops/ItOpsModule.tsx");

  assert.match(module, /renderSidebarHeader=\{/);
  assert.match(module, /<ModuleHeader\b/);
  assert.match(module, /<ModuleIconTile\b/);
  assert.match(module, /renderSidebarHeader=\{\(\{ actions, collapsed \}\)/);
  assert.match(module, /<ModuleHeaderTitle>\{t\("itops\.title"\)\}<\/ModuleHeaderTitle>[\s\S]*it-head-actions/);
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
  const css = await read("src/modules/itops/itops.css");
  const siteDialog = await read("src/modules/itops/SiteDialog.tsx");
  const rackDialog = await read("src/modules/itops/RackDialog.tsx");
  const serverRoomDialog = await read("src/modules/itops/ServerRoomDialog.tsx");

  assert.match(sites, /<ServerRoomDialog\b/);
  assert.match(sites, /selectedSiteIdForDialog/);
  assert.match(sites, /selectedServerRoomForDialog/);
  assert.match(sites, /setServerRoomDialog\(\{[\s\S]*room: null/);
  assert.match(sites, /setRackDialog\(\{[\s\S]*siteId: selectedSiteIdForDialog[\s\S]*rack: null/);
  assert.match(sites, /renderSidebarHeader\?\.\(\{ actions: addTopologyMenu, collapsed: treeCollapsed \}\)/);
  assert.match(sites, /className="icon-button"[\s\S]*aria-label=\{t\("itops\.racks\.addNode"\)\}/);
  assert.match(sites, /ft-head-title[\s\S]*itops\.sites\.heading[\s\S]*connections\.collapseAll[\s\S]*connections\.expandAll/);
  assert.doesNotMatch(sites, /<span className="ft-head-title">\{t\("itops\.sites\.heading"\)\}<\/span>[\s\S]{0,120}ft-add-wrap/);
  assert.match(css, /\.itops-page \.it-side-head \{[\s\S]*overflow:\s*visible;/);
  assert.match(css, /\.itops-page \.ft-add-wrap \{[\s\S]*z-index:\s*45;/);
  assert.match(css, /\.itops-page \.ft-add-menu \{[\s\S]*position:\s*absolute;/);
  assert.match(sites, /customIcon=\{site\}/);
  assert.match(sites, /customIcon=\{site\.roomIcons\?\.\[room\.key\]\}/);
  assert.match(sites, /<ConnectionIcon\b/);
  assert.match(siteDialog, /itops\.sites\.createHelp/);
  assert.match(siteDialog, /\{isEdit \? \([\s\S]*itops\.sites\.perHostTransport/);
  assert.doesNotMatch(siteDialog, /\{isEdit \? \([\s\S]{0,120}<Field\s+label=\{t\("itops\.sites\.connectionsLabel"\)\}/);
  assert.match(serverRoomDialog, /itops\.racks\.serverRoomSiteLabel/);
  assert.match(serverRoomDialog, /createServerRoom\(/);
  assert.match(serverRoomDialog, /updateServerRoom\(/);
  assert.match(serverRoomDialog, /ISO_FLOOR_COLORS\.map/);
  assert.doesNotMatch(serverRoomDialog, /firstRackLabel/);
  assert.match(rackDialog, /itops\.racks\.siteLabel/);
  assert.match(rackDialog, /itops\.racks\.serverRoomSelectLabel/);
});

test("Sites load durable topology before the tree decides whether they have children", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");

  assert.match(
    sites,
    /for \(const site of sites\) \{[\s\S]*if \(!racksBySite\[site\.id\]\) void loadRacks\(site\.id\);[\s\S]*if \(!serverRoomsBySite\[site\.id\]\) void loadServerRooms\(site\.id\);/,
  );
  assert.doesNotMatch(sites, /if \(isExpanded\(nodeId\.site\(site\.id\)\)\)/);
  assert.match(sites, /topologyLoaded=\{topologyLoaded\}/);
});

test("empty Site and Server Room views expose their contextual create actions", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");
  const css = await read("src/modules/itops/itops.css");

  assert.match(sites, /topology\.length === 0[\s\S]*itops\.sites\.emptyServerRoomsHint/);
  assert.match(sites, /serverRoom\.racks\.length === 0[\s\S]*itops\.racks\.emptyServerRoomHint/);
  assert.match(sites, /<ItOpsEmptyHint>/);
  assert.match(css, /\.itops-page \.it-empty-hint \{/);
  assert.doesNotMatch(sites, /\) : racks\.length === 0 \? \(/);
  assert.match(sites, /hasChildren=\{siteTopo\.length > 0\}/);
});

test("Site View shows its placement dots only while editing", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");
  const css = await read("src/modules/itops/itops.css");

  assert.match(sites, /className=\{`it-free-surface site\$\{editMode \? " editing" : ""\}`\}/);
  assert.match(css, /\.itops-page \.it-free-surface\.site:not\(\.editing\) \{[\s\S]*background-image:\s*none;/);
});

test("Site topology rows open their existing dialogs from native Properties menus", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");
  const english = JSON.parse(await read("src/i18n/locales/en.json"));

  assert.match(sites, /showNativeContextMenu/);
  assert.match(sites, /label: t\("common\.properties"\)/);
  assert.equal(english.common.properties, "Properties");
  assert.match(sites, /setDialog\(\{ group: site \}\)/);
  assert.match(sites, /setServerRoomDialog\(\{ siteId: site\.id, room: room\.room! \}\)/);
  assert.match(sites, /setRackDialog\(\{ siteId: site\.id, rack \}\)/);
  assert.match(sites, /<TreeRow[\s\S]*onContextMenu=/);
});

test("Site dialog no longer loads or selects Connections", async () => {
  const siteDialog = await read("src/modules/itops/SiteDialog.tsx");

  assert.doesNotMatch(siteDialog, /list_connection_tree/);
  assert.doesNotMatch(siteDialog, /connectionsLabel/);
  assert.doesNotMatch(siteDialog, /hg-dlg-list/);
});

test("Add Rack dialog uses the rack graphic preview and persists physical depth", async () => {
  const dialog = await read("src/modules/itops/RackDialog.tsx");
  const state = await read("src/modules/itops/state.ts");
  const tauri = await read("src/lib/tauri.ts");

  assert.match(dialog, /width=\{700\}/);
  assert.match(dialog, /<RackElevation rack=\{livePreview\}/);
  assert.match(dialog, /rack-dialog-shell-grid/);
  assert.match(dialog, /DEPTH_PRESETS = \[600, 800, 900, 1000, 1070, 1200\]/);
  assert.match(dialog, /itops\.racks\.depthNetworkOption/);
  assert.match(dialog, /itops\.racks\.depthServerOption/);
  assert.match(dialog, /depthMm/);
  assert.match(dialog, /racksBySite\[siteId\]/);
  assert.match(dialog, /entry\.serverRoom === serverRoom/);
  assert.match(dialog, /<datalist id=\{groupListId\}>/);
  assert.match(dialog, /list=\{groupOptions\.length > 0 \? groupListId : undefined\}/);
  assert.match(state, /interface RackInput[\s\S]*depthMm: number/);
  assert.match(tauri, /itops_create_rack:[\s\S]*depthMm: number/);
});
