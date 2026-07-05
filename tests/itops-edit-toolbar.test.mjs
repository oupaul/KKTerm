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

test("Server Room view switcher sits in the drill toolbar with Lucide icons", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");

  // The segmented control renders inside the toolbar row, only for rooms.
  assert.match(sites, /className="it-drill-toolbar">[\s\S]*?serverRoom && !rack \? \([\s\S]*?className="rm-segmented"/);
  assert.match(sites, /<ItIcon name="rows" size=\{13\} \/>[\s\S]*?viewElevation/);
  assert.match(sites, /<ItIcon name="grid" size=\{13\} \/>[\s\S]*?viewFloor/);
  assert.match(sites, /<ItIcon name="cube" size=\{13\} \/>[\s\S]*?view25d/);
  // The bound-connection room callouts under the switcher are gone.
  assert.doesNotMatch(sites, /rack-random-callouts room/);
  assert.doesNotMatch(sites, /selectRandomRackCallouts/);
});

test("Spatial room views pan with the left button, zoom on wheel, and expose the zoom ruler", async () => {
  const parts = await read("src/modules/itops/roomViewParts.tsx");
  const floorPlan = await read("src/modules/itops/ServerRoomFloorPlan.tsx");
  const isoView = await read("src/modules/itops/ServerRoomIsoView.tsx");

  assert.match(parts, /export function useWheelZoom/);
  assert.match(parts, /export function RoomZoomRuler/);
  assert.match(parts, /className="rm-zoomruler"/);
  // Left-button pan engages past a threshold and swallows the follow-up click.
  assert.match(parts, /event\.button === 0/);
  assert.match(parts, /squelchClick/);
  for (const view of [floorPlan, isoView]) {
    assert.match(view, /useWheelZoom\(scrollRef/);
    assert.match(view, /<RoomZoomRuler zoom=\{zoom\} onZoomChange=\{setZoom\} \/>/);
    assert.match(view, /loadRoomZoom\(/);
    assert.match(view, /saveRoomZoom\(/);
  }
});

test("Edit mode arms placement through the shared object picker column", async () => {
  const parts = await read("src/modules/itops/roomViewParts.tsx");
  const sites = await read("src/modules/itops/SitesTab.tsx");
  const floorPlan = await read("src/modules/itops/ServerRoomFloorPlan.tsx");
  const isoView = await read("src/modules/itops/ServerRoomIsoView.tsx");

  assert.match(parts, /export function RoomObjectPicker/);
  assert.match(parts, /className="rm-picker-search"/);
  assert.match(parts, /pickerSearchPlaceholder/);
  assert.match(parts, /className="rm-picker-card"/);
  assert.match(parts, /<RoomObjectPlanArtwork kind=\{kind\} \/>/);
  // SitesTab owns the armed tool and the created-rack placement flow.
  assert.match(sites, /<RoomObjectPicker/);
  assert.match(sites, /onAddRackForPlacement/);
  assert.match(sites, /setPlaceRackId\(saved\.id\)/);
  for (const view of [floorPlan, isoView]) {
    assert.match(view, /placeRackId/);
    assert.match(view, /moveIsoRack\(grid, placeRackId/);
    assert.match(view, /onRackPlaced/);
  }
});

test("Armed placement previews a cursor-snapped ghost and cancels on right-click", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");
  const floorPlan = await read("src/modules/itops/ServerRoomFloorPlan.tsx");
  const isoView = await read("src/modules/itops/ServerRoomIsoView.tsx");
  const css = await read("src/modules/itops/itops.css");

  // SitesTab disarms both the object tool and the pending rack on cancel.
  assert.match(sites, /onCancelPlacement=\{\(\) => \{\s*setRoomTool\(null\);\s*setPlaceRackId\(null\);/);
  for (const view of [floorPlan, isoView]) {
    assert.match(view, /onCancelPlacement\?: \(\) => void/);
    assert.match(view, /onContextMenu=\{/);
    assert.match(view, /resolveDropZ\(\s*footprintSpans\(hover, tool, 0/);
  }
  // The floor plan tracks the hovered cell and renders the plan-artwork ghost.
  assert.match(floorPlan, /className=\{`rm-bp-ghost\$\{blocked \? " blocked" : ""\}`\}/);
  assert.match(floorPlan, /onPointerMove=\{placing \? trackPlacement : undefined\}/);
  // The 2.5D view snaps the ghost to hovered tiles and cabinets.
  assert.match(isoView, /rm-iso-plane\$\{placing \? " placing" : ""\}/);
  assert.match(isoView, /onHoverCell/);
  assert.match(isoView, /className=\{`rm-iso-obj ghost/);
  assert.match(isoView, /className="rm-iso-cab ghost"/);
  assert.match(css, /\.rm-bp-ghost/);
  assert.match(css, /\.rm-iso-drop\.blocked/);
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

test("2.5D edit controls are selection-scoped and the room owns its appearance", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");
  const isoView = await read("src/modules/itops/ServerRoomIsoView.tsx");
  const css = await read("src/modules/itops/itops.css");

  assert.match(isoView, /selectedItem/);
  assert.match(isoView, /selected=\{selectedItem\?\.kind === "rack"/);
  assert.match(isoView, /selected=\{selectedItem\?\.kind === "object"/);
  assert.match(isoView, /objectDisplayRect/);
  assert.match(isoView, /objectDisplayAnchor/);
  assert.match(isoView, /rotateRectForView/);
  assert.match(isoView, /logUiDebug\("itops\.iso\.objectPlacement"/);
  assert.doesNotMatch(isoView, /corner=\{rotateFacingForView\(object\.corner, angle\)\}/);
  assert.match(isoView, /editMode && selected/);
  // Object kind chips no longer float above the artwork — the view stays clean.
  assert.doesNotMatch(isoView, /rm-iso-obj-badge/);
  assert.match(isoView, /className="rm-iso-nameplate"/);
  assert.match(isoView, /facing \* 90/);
  assert.doesNotMatch(isoView, /className="rm-iso-floors"/);
  assert.match(isoView, /showNativeContextMenu/);
  assert.match(isoView, /onOpenBackground/);
  assert.match(sites, /<SharedBackgroundPopover/);
  assert.match(sites, /setServerRoomBackground/);
  assert.match(css, /\.rm-iso-nameplate/);
});

test("IT Ops free placement is local UI state for Site cards and floor tiles", async () => {
  const sites = await read("src/modules/itops/SitesTab.tsx");
  const floorPlan = await read("src/modules/itops/ServerRoomFloorPlan.tsx");
  const treeState = await read("src/modules/itops/siteTreeState.ts");

  assert.match(treeState, /kkterm\.itopsFreePlacement/);
  assert.match(treeState, /export function loadFreePlacement/);
  assert.match(treeState, /export function saveFreePlacement/);
  assert.match(sites, /siteLayoutScope\(site\.id\)/);
  // The blueprint floor plan and the 2.5D room share one grid placement scope.
  assert.match(sites, /roomIsoLayoutScope\(site\.id, serverRoom\.key\)/);
  assert.match(sites, /<ServerRoomFloorPlan[\s\S]*placement=\{isoPlacements\}/);
  assert.match(sites, /<SiteRoomCards[\s\S]*placement=\{sitePlacements\}/);
  assert.match(floorPlan, /className=\{`rm-bp/);
  assert.match(floorPlan, /onPlacementChange/);
});

test("Rack device dialog includes a preview picker for every device type", async () => {
  const dialog = await read("src/modules/itops/RackItemDialog.tsx");

  assert.match(dialog, /className="rack-kind-preview-grid"/);
  assert.match(dialog, /ALL_KINDS\.map/);
  assert.match(dialog, /<RackDevice[\s\S]*kind=\{value\}/);
  assert.match(dialog, /aria-label=\{t\("itops\.racks\.kindPreviewLabel"\)\}/);
});
