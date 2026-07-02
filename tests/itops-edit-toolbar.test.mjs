import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("IT Ops drill views expose icon-only edit add export actions", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");

  assert.match(sites, /className="it-drill-toolbar"/);
  assert.match(sites, /aria-label=\{t\("itops\.actions\.viewActions"\)\}/);
  assert.match(sites, /title=\{editMode \? t\("itops\.actions\.editDone"\) : t\("itops\.actions\.edit"\)\}/);
  assert.match(sites, /<ItIcon name=\{editMode \? "check" : "edit"\}/);
  assert.match(sites, /<ItIcon name="plus"/);
  assert.match(sites, /<ItIcon name="download"/);
  assert.match(sites, /handleExport\("pdf"\)/);
  assert.match(sites, /rack \? \([\s\S]*handleExport\("excel"\)/);
});

test("Rack drag/drop and direct delete are gated behind edit mode", async () => {
  const rackElevation = await read("src/modules/itops/RackElevation.tsx");
  const sites = await read("src/modules/itops/SitesTab.tsx");

  assert.match(rackElevation, /const canMove = editMode && !!onMoveItem/);
  assert.match(rackElevation, /editMode && onSlotClick/);
  assert.match(rackElevation, /draggable=\{canMove\}/);
  assert.match(rackElevation, /editMode && onDeleteItem/);
  assert.match(rackElevation, /className="rk-item-delete"/);
  assert.match(sites, /onMoveItem=\{editMode \? onMoveItem : undefined\}/);
  assert.match(sites, /onDeleteRack=\{editMode \? onDeleteRack : undefined\}/);
});

test("IT Ops free placement is local UI state for Site cards and floor tiles", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");
  const floorPlan = await read("src/modules/itops/ServerRoomFloorPlan.tsx");
  const treeState = await read("src/modules/itops/siteTreeState.ts");

  assert.match(treeState, /kkterm\.itopsFreePlacement/);
  assert.match(treeState, /export function loadFreePlacement/);
  assert.match(treeState, /export function saveFreePlacement/);
  assert.match(sites, /siteLayoutScope\(site\.id\)/);
  assert.match(sites, /roomLayoutScope\(site\.id, serverRoom\.key\)/);
  assert.match(sites, /<SiteRoomCards[\s\S]*placement=\{sitePlacements\}/);
  assert.match(floorPlan, /className="rm-floor free"/);
  assert.match(floorPlan, /onPlacementChange/);
});

test("Rack device dialog includes a preview picker for every device type", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");

  assert.match(dialog, /className="rack-kind-preview-grid"/);
  assert.match(dialog, /ALL_KINDS\.map/);
  assert.match(dialog, /<RackDevice[\s\S]*kind=\{value\}/);
  assert.match(dialog, /aria-label=\{t\("itops\.racks\.kindPreviewLabel"\)\}/);
});

