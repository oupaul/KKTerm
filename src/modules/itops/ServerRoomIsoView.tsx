// 2.5D Server Room View (docs/SITE.md Server Room View). Draws the room as an
// axonometric floor grid sharing the floor plan's cell placement: every Rack
// is an extruded cabinet whose height tracks its U capacity and whose visible
// front face renders a miniature of the 2D rack skin — shell finish plus each
// placed device as a faceplate strip with a status LED. Cabinets span their
// full cell along the side axis, so racks in adjacent cells touch like a real
// rack row; the rack's stored facing decides which face carries the devices.
// The camera is fixed but the room can be viewed from four corners (the grid
// is rotated under the camera in quarter turns, see roomIsoLayout.ts). Room
// objects (roomObjects.ts) stand on the same grid at their vertical position:
// a CRAC on the floor, a camera near the ceiling, a 乖乖 pack on a cabinet
// top. Edit mode drags cabinets/objects across the floor, rotates facings,
// nudges object levels, adds racks on empty tiles, and places racks/objects
// armed by the shared picker column (owned by SitesTab). Placement persists
// through the shared "grid" store.

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { showNativeContextMenu } from "../../lib/nativeContextMenu";
import type { Rack, RackItem, RackItemStatus } from "../../types";
import { rackFloorMetrics } from "./roomFloorPlan";
import { RoomObjectIsoArtwork } from "./RoomObjectIsoReference";
import { KuaiKuaiBag } from "./KuaiKuaiBag";
import { isRackTopItem } from "./rackPlacement";
import {
  ISO_ROT_DEG,
  ISO_TILT_COS,
  ISO_TILT_DEG,
  expandIsoFloorFrame,
  isoPlacementCells,
  moveIsoRack,
  rackDepthFrac,
  rackFootprint,
  resolveIsoLayout,
  rotateCellForView,
  rotatePointForView,
  rotateRectForView,
  rotateFacingForView,
  sanitizeFacing,
  screenDeltaToPlane,
  viewDeltaToGrid,
  viewGridSize,
  type CellRect,
  type Corner,
  type Facing,
  type IsoCell,
  type IsoLayout,
  type IsoViewAngle,
} from "./roomIsoLayout";
import {
  ROOM_CEILING_U,
  footprintSpans,
  nudgeZ,
  objectCellSpan,
  objectFootprint,
  objectSurfaceAnchor,
  objectSpec,
  rackTopSupport,
  resolveDropZ,
  type RoomObject,
} from "./roomObjects";
import type { FreePlacementMap, IsoFloorColor, RackFacingMap } from "./siteTreeState";
import {
  loadIsoViewAngle,
  loadRoomZoom,
  saveIsoViewAngle,
  saveRoomZoom,
  stepRoomZoom,
} from "./siteTreeState";
import { ItIcon } from "./icons";
import {
  OBJECT_ACCENTS,
  RackTipContent,
  RoomPlacementCursorGhost,
  RoomZoomRuler,
  useRoomPan,
  useRoomPlacementPointer,
  useRoomViewportSize,
  useWheelZoom,
  type RoomTool,
} from "./roomViewParts";

// Floor tile size in plane px. Cabinets span the full CELL along their side
// axis (adjacent racks touch); the depth axis tracks each rack's physical
// depth (rackDepthFrac), front face flush on its facing borderline.
const CELL = 58;

// Vertical scale: one rack unit in plane px. Linear so stacking is exact —
// an object with z = rack heightU sits flush on the cabinet top.
const PX_PER_U = 2.1;

function cabHeight(heightU: number): number {
  return Math.min(124, Math.max(20, Math.max(1, heightU) * PX_PER_U));
}

function zPx(u: number): number {
  return u * PX_PER_U;
}

// Billboard a child of the tilted plane back to screen alignment: lift it to
// `z`, invert the plane's rotateX/rotateZ, then offset in screen space
// (`shift` is a CSS translate() argument list, e.g. "-50%, -100%").
function billboard(z: number, shift: string): string {
  return `translateZ(${z}px) rotateZ(-${ISO_ROT_DEG}deg) rotateX(-${ISO_TILT_DEG}deg) translate(${shift})`;
}

// Room-object reference models are genuine CSS 3D constructions. Keep them in
// the floor plane's coordinate system so the plane supplies the one and only
// axonometric projection; only labels/controls need billboard cancellation.
function surfaceModel(z: number, shift: string): string {
  return `translateZ(${z}px) translate(${shift})`;
}

function itemStatus(item: RackItem): RackItemStatus {
  return item.metadata?.status ?? "online";
}

interface DragState {
  kind: "rack" | "object";
  id: string;
  /** Live drag offset in display-plane px. */
  u: number;
  v: number;
  /** Target grid cell (not display coords). */
  target: IsoCell;
}

export function ServerRoomIsoView({
  racks,
  editMode,
  floorColor = "default",
  tool = null,
  placeRackId = null,
  onRackPlaced,
  onObjectPlaced,
  placement,
  onPlacementChange,
  facing,
  onFacingChange,
  objects,
  onObjectsChange,
  onPlaceKuaiguai,
  onDeleteRack,
  onSelectRack,
  onAddRack,
  onObjectBlocked,
  onCancelPlacement,
  onOpenBackground,
}: {
  racks: Rack[];
  editMode?: boolean;
  floorColor?: IsoFloorColor;
  /** Armed object kind from the shared picker column (SitesTab owns it). */
  tool?: RoomTool;
  /** A just-created rack awaiting its placement click. */
  placeRackId?: string | null;
  onRackPlaced?: () => void;
  /** A room fixture was successfully placed; consume the armed picker item. */
  onObjectPlaced?: () => void;
  placement: FreePlacementMap;
  onPlacementChange?: (next: FreePlacementMap) => void;
  facing: RackFacingMap;
  onFacingChange?: (next: RackFacingMap) => void;
  objects: RoomObject[];
  onObjectsChange?: (next: RoomObject[]) => void;
  /** A 乖乖 pack landed on a cabinet top: it becomes a rack-top Rack Device
   *  (shared with the Rack View) instead of a room object. Returns false when
   *  the rack top is already taken. */
  onPlaceKuaiguai?: (rack: Rack) => boolean;
  onDeleteRack?: (rack: Rack) => void;
  onSelectRack: (rackId: string) => void;
  onAddRack?: () => void;
  /** A placement click found no free vertical span in the cell. */
  onObjectBlocked?: () => void;
  /** Right-click while a picker card is armed disarms it. */
  onCancelPlacement?: () => void;
  /** Empty-space context-menu action owned by the Server Room view. */
  onOpenBackground?: () => void;
}) {
  const { t } = useTranslation();
  const layout = resolveIsoLayout(racks, placement);
  const [scrollRef, viewport] = useRoomViewportSize();
  const [angle, setAngle] = useState<IsoViewAngle>(loadIsoViewAngle);
  useEffect(() => saveIsoViewAngle(angle), [angle]);
  // Zoom scales the rendered room; the coverage math below works in unzoomed
  // (logical) px, so zooming out shows more floor in the same window.
  const [zoom, setZoom] = useState(() => loadRoomZoom("iso"));
  useEffect(() => saveRoomZoom("iso", zoom), [zoom]);
  useWheelZoom(scrollRef, (dir) => setZoom((current) => stepRoomZoom(current, dir)));
  useRoomPan(scrollRef);
  const armed = tool != null || placeRackId != null;
  const placing = !!editMode && armed;
  const placementPointer = useRoomPlacementPointer(placing, onCancelPlacement);
  // Cursor-tracked placement preview: hovering a tile (or a cabinet) while a
  // picker card is armed snaps the armed object's ghost to that grid cell.
  const [hover, setHover] = useState<IsoCell | null>(null);
  useEffect(() => {
    if (!placing) setHover(null);
  }, [placing]);
  const setHoverCell = (cell: IsoCell) =>
    setHover((prev) => (prev && prev.x === cell.x && prev.y === cell.y ? prev : cell));
  const clearHoverOutsideTarget = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.closest(".rm-iso-tile, .rm-iso-cab")) setHover(null);
  };
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selectedItem, setSelectedItem] = useState<{
    kind: "rack" | "object";
    id: string;
  } | null>(null);
  useEffect(() => {
    if (!editMode) setSelectedItem(null);
  }, [editMode]);
  useEffect(() => {
    if (!selectedItem) return;
    const exists = selectedItem.kind === "rack"
      ? racks.some((rack) => rack.id === selectedItem.id)
      : objects.some((object) => object.id === selectedItem.id);
    if (!exists) setSelectedItem(null);
  }, [objects, racks, selectedItem]);
  // Mutable drag bookkeeping: the live target must not lag behind React's
  // batched `drag` state when the pointer is released.
  const dragRef = useRef<{
    kind: "rack" | "object";
    id: string;
    startX: number;
    startY: number;
    origin: IsoCell;
    target: IsoCell;
    moved: boolean;
  } | null>(null);
  // A completed drag is followed by a click on the cabinet button; swallow it
  // so dropping a cabinet doesn't also drill into the rack.
  const suppressClickRef = useRef(false);

  // Interactive grid: the layout's own cells, widened to cover any object a
  // floor-plan edit placed beyond the racks (including multi-cell spans).
  const gridCols = Math.max(
    layout.cols,
    ...objects.map((object) => object.x + objectCellSpan(object.kind, object.rot).w),
  );
  const gridRows = Math.max(
    layout.rows,
    ...objects.map((object) => object.y + objectCellSpan(object.kind, object.rot).h),
  );
  // Headroom for the tallest cabinet or elevated object.
  let maxTop = racks.reduce((max, rack) => Math.max(max, cabHeight(rack.heightU)), 0);
  for (const object of objects) {
    maxTop = Math.max(maxTop, zPx(object.z + objectSpec(object.kind).heightU));
  }

  // The canvas is the projected bounding box of the interactive grid plus
  // headroom, grown to fill the scroll viewport. The drawn floor then adds
  // decorative cells beyond the room origin until the plane's projection
  // covers that canvas (the viewport clips the overhang).
  // cols+rows fixes the projected diagonal — a view rotation only swaps them
  // — so the ring size is angle-independent.
  const contentDiag = (gridCols + gridRows) * CELL * Math.SQRT1_2;
  const viewW = Math.max(Math.ceil(contentDiag) + 48, (viewport?.w ?? 0) / zoom);
  const viewH = Math.max(
    Math.ceil(contentDiag * ISO_TILT_COS) + Math.ceil(maxTop) + 84,
    (viewport?.h ?? 0) / zoom,
  );
  const floorDiag = Math.max(viewW - 48, (viewH - Math.ceil(maxTop) - 84) / ISO_TILT_COS);
  const { floorCols, floorRows, offX, offY } = expandIsoFloorFrame(
    gridCols,
    gridRows,
    floorDiag,
    CELL,
  );
  const placementGrid: IsoLayout = { cols: floorCols, rows: floorRows, cells: layout.cells };
  const dims = viewGridSize(floorCols, floorRows, angle);
  const toDisplay = (cell: IsoCell) =>
    rotateCellForView({ x: cell.x + offX, y: cell.y + offY }, angle, floorCols, floorRows);
  const objectDisplayRect = (object: RoomObject): CellRect => {
    const fp = objectFootprint(object.kind, object.rot, object.corner);
    return rotateRectForView(
      { x: object.x + offX + fp.x, y: object.y + offY + fp.y, w: fp.w, d: fp.d },
      angle,
      floorCols,
      floorRows,
    );
  };
  const objectDisplayAnchor = (object: RoomObject): { x: number; y: number } => {
    const anchor = objectSurfaceAnchor(object.kind, object.rot, object.corner);
    return rotatePointForView(
      { x: object.x + offX + anchor.x, y: object.y + offY + anchor.y },
      angle,
      floorCols,
      floorRows,
    );
  };
  const planeW = dims.cols * CELL;
  const planeH = dims.rows * CELL;

  const clampCell = (cell: IsoCell): IsoCell => ({
    x: Math.min(floorCols - 1, Math.max(0, Math.round(cell.x))),
    y: Math.min(floorRows - 1, Math.max(0, Math.round(cell.y))),
  });

  function startDrag(
    event: ReactPointerEvent<HTMLDivElement>,
    kind: "rack" | "object",
    id: string,
    origin: IsoCell,
  ) {
    if (!editMode || armed) return;
    // Left button only — the middle button pans the viewport (useRoomPan).
    if (event.button !== 0) return;
    if (kind === "rack" && !onPlacementChange) return;
    if (kind === "object" && !onObjectsChange) return;
    const target = event.target as HTMLElement;
    if (target.closest(".rm-iso-ctl")) return;
    setSelectedItem({ kind, id });
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { kind, id, startX: event.clientX, startY: event.clientY, origin, target: origin, moved: false };
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (!state) return;
    // Screen deltas divided by zoom: the dragged cabinet renders inside the
    // scaled viewport, so its translate scales back up to match the pointer.
    const { u, v } = screenDeltaToPlane(
      (event.clientX - state.startX) / zoom,
      (event.clientY - state.startY) / zoom,
    );
    if (Math.abs(u) > 3 || Math.abs(v) > 3) state.moved = true;
    if (!state.moved) return;
    const { dx, dy } = viewDeltaToGrid(u, v, angle);
    state.target = clampCell({ x: state.origin.x + dx / CELL, y: state.origin.y + dy / CELL });
    setDrag({ kind: state.kind, id: state.id, u, v, target: state.target });
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (state) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      if (state.moved) {
        // The follow-up click (if any) dispatches before timers run; the
        // timeout only clears a stale flag when no click follows (cancel).
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
        if (state.kind === "rack") {
          onPlacementChange?.(moveIsoRack(placementGrid, state.id, state.target));
        } else {
          dropObject(state.id, state.target);
        }
      }
    }
    dragRef.current = null;
    setDrag(null);
  }

  function dropObject(id: string, target: IsoCell) {
    const object = objects.find((entry) => entry.id === id);
    if (!object || !onObjectsChange) return;
    const spans = footprintSpans(
      target,
      object.kind,
      object.rot,
      racks,
      layout.cells,
      objects,
      id,
      object.corner,
      facing,
    );
    const z = resolveDropZ(spans, object.kind, object.z);
    if (z == null) {
      onObjectBlocked?.();
      return;
    }
    if (object.kind === "kuaikuai" && onPlaceKuaiguai) {
      const support = rackTopSupport(target, object.kind, object.rot, object.corner, z, racks, layout.cells, facing);
      if (support) {
        if (onPlaceKuaiguai(support)) {
          onObjectsChange(objects.filter((entry) => entry.id !== id));
        } else {
          onObjectBlocked?.();
        }
        return;
      }
    }
    onObjectsChange(
      objects.map((entry) => (entry.id === id ? { ...entry, x: target.x, y: target.y, z } : entry)),
    );
  }

  function placeObjectAt(cell: IsoCell) {
    if (tool == null || !onObjectsChange) return;
    const spans = footprintSpans(cell, tool, 0, racks, layout.cells, objects, undefined, 0, facing);
    const z = resolveDropZ(spans, tool);
    if (z == null) {
      onObjectBlocked?.();
      return;
    }
    if (tool === "kuaikuai" && onPlaceKuaiguai) {
      const support = rackTopSupport(cell, tool, 0, 0, z, racks, layout.cells, facing);
      if (support) {
        if (onPlaceKuaiguai(support)) onObjectPlaced?.();
        else onObjectBlocked?.();
        return;
      }
    }
    onObjectsChange([
      ...objects,
      { id: crypto.randomUUID(), kind: tool, x: cell.x, y: cell.y, z, rot: 0, corner: 0 },
    ]);
    onObjectPlaced?.();
  }

  // Drop the picker's just-created rack on a cell (swapping with an occupant).
  function placeRackAt(cell: IsoCell) {
    if (placeRackId == null) return;
    if (layout.cells[placeRackId]) {
      onPlacementChange?.(moveIsoRack(placementGrid, placeRackId, cell));
      onRackPlaced?.();
    }
  }

  function selectRack(rack: Rack) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (placeRackId != null) {
      placeRackAt(layout.cells[rack.id]);
      return;
    }
    if (tool != null) {
      placeObjectAt(layout.cells[rack.id]);
      return;
    }
    if (editMode) {
      setSelectedItem({ kind: "rack", id: rack.id });
      return;
    }
    onSelectRack(rack.id);
  }

  function selectObject(id: string) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (editMode && !armed) setSelectedItem({ kind: "object", id });
  }

  function handleRoomPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!editMode || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest(".rm-iso-cab, .rm-iso-obj, .rm-iso-corner")) return;
    setSelectedItem(null);
  }

  async function handleRoomContextMenu(event: ReactMouseEvent<HTMLDivElement>) {
    if (placing) {
      event.preventDefault();
      setHover(null);
      onCancelPlacement?.();
      return;
    }
    if (!onOpenBackground) return;
    const target = event.target as HTMLElement;
    if (target.closest(".rm-iso-cab, .rm-iso-obj, .rm-iso-corner")) return;
    event.preventDefault();
    await showNativeContextMenu(
      [
        {
          kind: "item",
          label: t("itops.racks.changeBackground"),
          action: onOpenBackground,
        },
      ],
      { x: event.clientX, y: event.clientY },
    );
  }

  function rotateRack(rack: Rack) {
    if (!onFacingChange) return;
    const current = sanitizeFacing(facing[rack.id]);
    onFacingChange({ ...facing, [rack.id]: ((current + 1) % 4) as Facing });
  }

  function rotateObject(object: RoomObject) {
    onObjectsChange?.(
      objects.map((entry) =>
        entry.id === object.id ? { ...entry, rot: ((entry.rot + 1) % 4) as Facing } : entry,
      ),
    );
  }

  // Walk a quarter-block fixture to the next cell corner (NW→NE→SE→SW).
  function cycleCorner(object: RoomObject) {
    onObjectsChange?.(
      objects.map((entry) =>
        entry.id === object.id ? { ...entry, corner: ((entry.corner + 1) % 4) as Corner } : entry,
      ),
    );
  }

  function nudgeObject(object: RoomObject, dir: 1 | -1) {
    const spans = footprintSpans(
      object,
      object.kind,
      object.rot,
      racks,
      layout.cells,
      objects,
      object.id,
      object.corner,
      facing,
    );
    const z = nudgeZ(spans, object.kind, object.z, dir);
    if (z === object.z) return;
    onObjectsChange?.(objects.map((entry) => (entry.id === object.id ? { ...entry, z } : entry)));
  }

  // Edit-mode click targets: empty tiles add a rack (no tool) or take an
  // armed rack/object; cells holding only objects still get a tile while a
  // tool is armed so a second fixture can stack in the same cell.
  const rackCells = new Set(Object.values(layout.cells).map((cell) => `${cell.x},${cell.y}`));
  const editableTiles = editMode && (onAddRack || armed)
    ? isoPlacementCells(floorCols, floorRows, rackCells)
    : [];

  return (
    <div className="rm-iso">
      <div className="rm-view-body">
        {/* tabIndex: clicking the room focuses the viewport so arrow keys pan. */}
        <div
          className="rm-iso-scroll"
          ref={scrollRef}
          tabIndex={0}
          onPointerDown={handleRoomPointerDown}
          onContextMenu={placing || onOpenBackground ? handleRoomContextMenu : undefined}
        >
          <div className="rm-iso-zoom" style={{ width: viewW * zoom, height: viewH * zoom }}>
            <div
              className="rm-iso-viewport"
              style={{
                width: viewW,
                height: viewH,
                transform: zoom !== 1 ? `scale(${zoom})` : undefined,
              }}
            >
              <div
                className={`rm-iso-plane${placing ? " placing" : ""}`}
                data-floor={floorColor !== "default" ? floorColor : undefined}
                style={{
                  width: planeW,
                  height: planeH,
                  backgroundSize: `${CELL}px ${CELL}px, ${CELL}px ${CELL}px, auto`,
                  top: `calc(50% + ${Math.round(maxTop * 0.38)}px)`,
                }}
                onPointerMove={placing ? clearHoverOutsideTarget : undefined}
                onPointerLeave={placing ? () => setHover(null) : undefined}
              >
                {editableTiles.map((cell) => {
                  const at = toDisplay(cell);
                  return (
                    <button
                      key={`t-${cell.x}-${cell.y}`}
                      type="button"
                      className="rm-iso-tile"
                      style={{ left: at.x * CELL, top: at.y * CELL, width: CELL, height: CELL }}
                      title={
                        placeRackId != null
                          ? t("itops.floorPlan.pickerRack")
                          : tool != null
                            ? t(`itops.floorPlan.object.${tool}`)
                            : t("itops.floorPlan.isoAddHere")
                      }
                      onPointerEnter={placing ? () => setHoverCell(cell) : undefined}
                      onClick={() =>
                        placeRackId != null
                          ? placeRackAt(cell)
                          : tool != null
                            ? placeObjectAt(cell)
                            : onAddRack?.()
                      }
                    >
                      <ItIcon name="plus" size={13} />
                    </button>
                  );
                })}
                {drag ? (
                  <div
                    className="rm-iso-drop"
                    style={{
                      left: toDisplay(drag.target).x * CELL,
                      top: toDisplay(drag.target).y * CELL,
                      width: CELL,
                      height: CELL,
                    }}
                  />
                ) : null}
                {racks.map((rack) => (
                  <IsoCabinet
                    key={rack.id}
                    rack={rack}
                    cell={toDisplay(layout.cells[rack.id])}
                    facing={rotateFacingForView(sanitizeFacing(facing[rack.id]), angle)}
                    drag={drag?.kind === "rack" && drag.id === rack.id ? drag : null}
                    editMode={!!editMode}
                    selected={selectedItem?.kind === "rack" && selectedItem.id === rack.id}
                    onPointerDown={(event) => startDrag(event, "rack", rack.id, layout.cells[rack.id])}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onHoverCell={placing ? () => setHoverCell(layout.cells[rack.id]) : undefined}
                    onSelect={() => selectRack(rack)}
                    onRotate={editMode && onFacingChange ? () => rotateRack(rack) : undefined}
                    onDelete={
                      editMode && onDeleteRack
                        ? () => {
                            setSelectedItem(null);
                            onDeleteRack(rack);
                          }
                        : undefined
                    }
                  />
                ))}
                {objects.map((object) => (
                  <IsoObject
                    key={object.id}
                    object={object}
                    rect={objectDisplayRect(object)}
                    anchor={objectDisplayAnchor(object)}
                    drag={drag?.kind === "object" && drag.id === object.id ? drag : null}
                    editMode={!!editMode}
                    selected={selectedItem?.kind === "object" && selectedItem.id === object.id}
                    onPointerDown={(event) =>
                      startDrag(event, "object", object.id, { x: object.x, y: object.y })
                    }
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onSelect={() => selectObject(object.id)}
                    onRotate={() => rotateObject(object)}
                    onCorner={
                      objectSpec(object.kind).quarter ? () => cycleCorner(object) : undefined
                    }
                    onRaise={() => nudgeObject(object, 1)}
                    onLower={() => nudgeObject(object, -1)}
                    onDelete={
                      onObjectsChange
                        ? () => {
                            setSelectedItem(null);
                            onObjectsChange(objects.filter((entry) => entry.id !== object.id));
                          }
                        : undefined
                    }
                  />
                ))}
                {placing && hover
                  ? (() => {
                      // Realtime placement preview on the hovered cell: the
                      // armed fixture's 2.5D artwork at its resolved level
                      // over its covered cell span (red tile when the cell
                      // has no free vertical span), or a translucent cabinet
                      // for the pending rack at its depth, front flush.
                      if (tool != null) {
                        const dropZ = resolveDropZ(
                          footprintSpans(hover, tool, 0, racks, layout.cells, objects, undefined, 0, facing),
                          tool,
                        );
                        // A rack-top 乖乖 drop becomes the rack's single top
                        // item, so an occupied cabinet top reads as blocked.
                        const topTaken = (() => {
                          if (dropZ == null || tool !== "kuaikuai") return false;
                          const support = rackTopSupport(hover, tool, 0, 0, dropZ, racks, layout.cells, facing);
                          return !!support && support.items.some((item) => isRackTopItem(item, support.heightU));
                        })();
                        const z = topTaken ? null : dropZ;
                        const span = objectCellSpan(tool, 0);
                        const tileRect = rotateRectForView(
                          { x: hover.x + offX, y: hover.y + offY, w: span.w, d: span.h },
                          angle,
                          floorCols,
                          floorRows,
                        );
                        const tile = {
                          left: tileRect.x * CELL,
                          top: tileRect.y * CELL,
                          width: tileRect.w * CELL,
                          height: tileRect.d * CELL,
                        };
                        // A fresh object drops with grid rot/corner 0. Rotate
                        // the exact fractional footprint so quarter fixtures
                        // keep their floor-plan corner in every view angle.
                        const fp = objectFootprint(tool, 0, 0);
                        const anchor = objectSurfaceAnchor(tool, 0, 0);
                        const displayRect = rotateRectForView(
                          { x: hover.x + offX + fp.x, y: hover.y + offY + fp.y, w: fp.w, d: fp.d },
                          angle,
                          floorCols,
                          floorRows,
                        );
                        const displayAnchor = rotatePointForView(
                          { x: hover.x + offX + anchor.x, y: hover.y + offY + anchor.y },
                          angle,
                          floorCols,
                          floorRows,
                        );
                        return (
                          <>
                            <div
                              className={`rm-iso-drop${z == null ? " blocked" : ""}`}
                              style={tile}
                            />
                            {z != null ? (
                              <div
                                className={`rm-iso-obj ghost${z === 0 ? " grounded" : ""}`}
                                data-kind={tool}
                                style={
                                  {
                                    left: displayRect.x * CELL,
                                    top: displayRect.y * CELL,
                                    width: displayRect.w * CELL,
                                    height: displayRect.d * CELL,
                                    "--obj": OBJECT_ACCENTS[tool],
                                    "--tile": OBJECT_ACCENTS[tool],
                                  } as React.CSSProperties
                                }
                              >
                                <span
                                  className="rm-iso-obj-model"
                                  data-kind={tool}
                                  style={{
                                    left: (displayAnchor.x - displayRect.x) * CELL,
                                    top: (displayAnchor.y - displayRect.y) * CELL,
                                    transform: surfaceModel(zPx(z), "-50%, -100%"),
                                  }}
                                >
                                  <RoomObjectIsoArtwork kind={tool} />
                                </span>
                              </div>
                            ) : null}
                          </>
                        );
                      }
                      const at = toDisplay(hover);
                      const pending = racks.find((entry) => entry.id === placeRackId);
                      const gh = cabHeight(pending?.heightU ?? 42);
                      // A fresh rack lands with grid facing 0.
                      const fp = rackFootprint(
                        rotateFacingForView(0, angle),
                        rackDepthFrac(pending?.depthMm ?? 1000),
                      );
                      const w = fp.w * CELL;
                      const d = fp.d * CELL;
                      return (
                        <>
                          <div
                            className="rm-iso-drop"
                            style={{ left: at.x * CELL, top: at.y * CELL, width: CELL, height: CELL }}
                          />
                          <div
                            className="rm-iso-cab ghost"
                            data-shell={
                              pending?.shell && pending.shell !== "black"
                                ? pending.shell
                                : undefined
                            }
                            style={{
                              left: (at.x + fp.x) * CELL,
                              top: (at.y + fp.y) * CELL,
                              width: w,
                              height: d,
                            }}
                          >
                            <span
                              className="rm-iso-face rm-iso-top"
                              style={{ transform: `translateZ(${gh}px)` }}
                            />
                            <span
                              className="rm-iso-face rm-iso-front side"
                              style={{ width: w, height: gh, top: d - gh }}
                            />
                            <span
                              className="rm-iso-face rm-iso-side side"
                              style={{ width: gh, height: d, left: w - gh }}
                            />
                          </div>
                        </>
                      );
                    })()
                  : null}
              </div>
            </div>
          </div>
        </div>
        {/* Floating control column over the room's top-right corner. Floor
            finish now belongs to Server Room Properties. */}
        <div className="rm-iso-corner">
          <RoomZoomRuler zoom={zoom} onZoomChange={setZoom} />
          <div
            className="rm-iso-angles"
            role="group"
            aria-label={t("itops.floorPlan.viewAngleLabel")}
          >
            <button
              type="button"
              title={t("itops.floorPlan.rotateViewLeft")}
              aria-label={t("itops.floorPlan.rotateViewLeft")}
              onClick={() => setAngle(((angle + 3) % 4) as IsoViewAngle)}
            >
              <ItIcon name="rotateL" size={13} />
            </button>
            <button
              type="button"
              title={t("itops.floorPlan.rotateViewRight")}
              aria-label={t("itops.floorPlan.rotateViewRight")}
              onClick={() => setAngle(((angle + 1) % 4) as IsoViewAngle)}
            >
              <ItIcon name="rotateR" size={13} />
            </button>
          </div>
        </div>
      </div>
      {editMode ? <div className="rm-iso-hint">{t("itops.floorPlan.isoEditHint")}</div> : null}
      <RoomPlacementCursorGhost
        pointer={placementPointer}
        tool={tool}
        rackArmed={placeRackId != null}
        variant="iso"
        snapped={hover != null}
      />
    </div>
  );
}

// Miniature of the 2D rack skin, painted on a cabinet face: the rack shell as
// backdrop and each placed device as a faceplate strip at its U position with
// a status LED. Strip geometry mirrors RackElevation's U grid. On the south
// (+y) face the U axis runs down the element ("y"); on the east (+x) face the
// rotateY(90°) fold maps the cabinet's up direction onto the element's width,
// right edge = floor, so strips lay out horizontally ("x").
function IsoRackSkin({ rack, axis }: { rack: Rack; axis: "y" | "x" }) {
  const capacity = Math.max(1, rack.heightU);
  return (
    <span
      className={`rm-iso-skin axis-${axis}`}
      data-shell={rack.shell && rack.shell !== "black" ? rack.shell : undefined}
    >
      {rack.items.filter((item) => item.kind !== "kuaiguai").map((item) => {
        const topU = item.startU + item.heightU - 1;
        const offset = ((capacity - topU) / capacity) * 100;
        const size = (Math.max(1, item.heightU) / capacity) * 100;
        return (
          <i
            key={item.id}
            className="rm-iso-skin-item"
            data-kind={item.kind}
            data-status={itemStatus(item)}
            style={
              axis === "y"
                ? { top: `${offset}%`, height: `${size}%` }
                : { left: `${offset}%`, width: `${size}%` }
            }
          />
        );
      })}
    </span>
  );
}

function IsoCabinet({
  rack,
  cell,
  facing,
  drag,
  editMode,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onHoverCell,
  onSelect,
  onRotate,
  onDelete,
}: {
  rack: Rack;
  /** Display cell (already view-rotated). */
  cell: IsoCell;
  /** Display facing (already view-rotated). */
  facing: Facing;
  drag: DragState | null;
  editMode: boolean;
  selected: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  /** Armed placement hover: previews the drop on this cabinet's cell. */
  onHoverCell?: () => void;
  onSelect: () => void;
  onRotate?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const m = rackFloorMetrics(rack);
  const h = cabHeight(rack.heightU);
  // Full cell along the side axis so adjacent cabinets connect; the depth
  // axis tracks the cabinet's physical depth, front face flush on the tile
  // borderline the facing points at.
  const fp = rackFootprint(facing, rackDepthFrac(rack.depthMm));
  const w = fp.w * CELL;
  const d = fp.d * CELL;
  const left = (cell.x + fp.x) * CELL;
  const top = (cell.y + fp.y) * CELL;
  // Which visible face (south = +y, east = +x) carries the device skin; the
  // other reads as a plain side, or as the cable rear when the front is
  // turned away from the camera.
  const southRole = facing === 0 ? "front" : facing === 2 ? "rear" : "side";
  const eastRole = facing === 3 ? "front" : facing === 1 ? "rear" : "side";
  const health = t(`itops.floorPlan.health.${m.health}`);
  const topKuaiguai = rack.items.find((item) => isRackTopItem(item, rack.heightU));

  return (
    <div
      className={`rm-iso-cab${drag ? " dragging" : ""}${editMode ? " editing" : ""}${selected ? " selected" : ""}`}
      data-shell={rack.shell && rack.shell !== "black" ? rack.shell : undefined}
      style={{
        left,
        top,
        width: w,
        height: d,
        transform: drag ? `translate3d(${drag.u}px, ${drag.v}px, 0)` : undefined,
      }}
      onPointerDown={editMode ? onPointerDown : undefined}
      onPointerMove={editMode ? onPointerMove : undefined}
      onPointerUp={editMode ? onPointerUp : undefined}
      onPointerCancel={editMode ? onPointerCancel : undefined}
      onPointerEnter={onHoverCell}
    >
      <button
        type="button"
        className="rm-iso-body"
        title={t("itops.floorPlan.tileTitle", { name: rack.name, detail: health })}
        onClick={onSelect}
      >
        <span className="rm-iso-face rm-iso-top" style={{ transform: `translateZ(${h}px)` }}>
          <span
            className="rm-iso-nameplate"
            style={{ transform: `translate(-50%, -50%) rotate(${facing * 90}deg)` }}
          >
            {rack.name}
          </span>
          {topKuaiguai ? (
            <span className="rm-iso-top-kuaiguai">
              <KuaiKuaiBag style="laidDown" expiry={topKuaiguai.metadata?.expiry} />
            </span>
          ) : null}
        </span>
        <span
          className={`rm-iso-face rm-iso-front ${southRole}`}
          style={{ width: w, height: h, top: d - h }}
        >
          {southRole === "front" ? <IsoRackSkin rack={rack} axis="y" /> : null}
        </span>
        <span
          className={`rm-iso-face rm-iso-side ${eastRole}`}
          style={{ width: h, height: d, left: w - h }}
        >
          {eastRole === "front" ? <IsoRackSkin rack={rack} axis="x" /> : null}
        </span>
      </button>
      <span className="rm-iso-tip" style={{ transform: billboard(h + 10, "-50%, -112%") }}>
        <RackTipContent rack={rack} />
      </span>
      {editMode && selected && (onRotate || onDelete) ? (
        <span className="rm-iso-ctl-wrap" style={{ transform: billboard(h + 6, "40%, -170%") }}>
          <span className="rm-iso-ctl">
            {onRotate ? (
              <button
                type="button"
                title={t("itops.floorPlan.rotateTitle")}
                aria-label={t("itops.floorPlan.rotateTitle")}
                onClick={(event) => {
                  event.stopPropagation();
                  onRotate();
                }}
              >
                <ItIcon name="rerun" size={11} />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                className="danger"
                title={t("itops.racks.deleteTitle")}
                aria-label={t("itops.racks.deleteTitle")}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
              >
                <ItIcon name="xmark" size={11} />
              </button>
            ) : null}
          </span>
        </span>
      ) : null}
    </div>
  );
}

function IsoObject({
  object,
  rect,
  anchor,
  drag,
  editMode,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onSelect,
  onRotate,
  onCorner,
  onRaise,
  onLower,
  onDelete,
}: {
  object: RoomObject;
  /** Display footprint rectangle, already view-rotated. */
  rect: CellRect;
  /** Display point where the sprite touches the surface, already view-rotated. */
  anchor: { x: number; y: number };
  drag: DragState | null;
  editMode: boolean;
  selected: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSelect: () => void;
  onRotate: () => void;
  /** Quarter-block fixtures only: walk to the next cell corner. */
  onCorner?: () => void;
  onRaise: () => void;
  onLower: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const spec = objectSpec(object.kind);
  const w = rect.w * CELL;
  const d = rect.d * CELL;
  const left = rect.x * CELL;
  const top = rect.y * CELL;
  const h = Math.max(3, zPx(spec.heightU));
  const bottom = zPx(Math.min(object.z, ROOM_CEILING_U));
  const name = t(`itops.floorPlan.object.${object.kind}`);

  return (
    <div
      className={`rm-iso-obj${drag ? " dragging" : ""}${editMode ? " editing" : ""}${selected ? " selected" : ""}${object.z === 0 ? " grounded" : ""}`}
      data-kind={object.kind}
      style={
        {
          left,
          top,
          width: w,
          height: d,
          transform: drag ? `translate3d(${drag.u}px, ${drag.v}px, 0)` : undefined,
          "--obj": OBJECT_ACCENTS[object.kind],
          "--tile": OBJECT_ACCENTS[object.kind],
        } as React.CSSProperties
      }
      title={`${name} — ${t("itops.floorPlan.objectLevel", { z: object.z })}`}
      onPointerDown={editMode ? onPointerDown : undefined}
      onPointerMove={editMode ? onPointerMove : undefined}
      onPointerUp={editMode ? onPointerUp : undefined}
      onPointerCancel={editMode ? onPointerCancel : undefined}
      onClick={editMode ? onSelect : undefined}
    >
      <span
        className="rm-iso-obj-model"
        data-kind={object.kind}
        style={{
          left: (anchor.x - rect.x) * CELL,
          top: (anchor.y - rect.y) * CELL,
          transform: surfaceModel(bottom, "-50%, -100%"),
        }}
      >
        <RoomObjectIsoArtwork kind={object.kind} />
      </span>
      {editMode && selected ? (
        <span
          className="rm-iso-ctl-wrap"
          style={{ transform: billboard(bottom + h + 5, "-50%, -240%") }}
        >
          <span className="rm-iso-ctl">
            <button
              type="button"
              title={t("itops.floorPlan.rotateTitle")}
              aria-label={t("itops.floorPlan.rotateTitle")}
              onClick={(event) => {
                event.stopPropagation();
                onRotate();
              }}
            >
              <ItIcon name="rerun" size={11} />
            </button>
            {onCorner ? (
              <button
                type="button"
                title={t("itops.floorPlan.cornerTitle")}
                aria-label={t("itops.floorPlan.cornerTitle")}
                onClick={(event) => {
                  event.stopPropagation();
                  onCorner();
                }}
              >
                <ItIcon name="grid" size={11} />
              </button>
            ) : null}
            <button
              type="button"
              title={t("itops.floorPlan.raiseTitle")}
              aria-label={t("itops.floorPlan.raiseTitle")}
              onClick={(event) => {
                event.stopPropagation();
                onRaise();
              }}
            >
              <span className="rm-flip">
                <ItIcon name="chevD" size={11} />
              </span>
            </button>
            <button
              type="button"
              title={t("itops.floorPlan.lowerTitle")}
              aria-label={t("itops.floorPlan.lowerTitle")}
              onClick={(event) => {
                event.stopPropagation();
                onLower();
              }}
            >
              <ItIcon name="chevD" size={11} />
            </button>
            {onDelete ? (
              <button
                type="button"
                className="danger"
                title={t("itops.floorPlan.deleteObjectTitle")}
                aria-label={t("itops.floorPlan.deleteObjectTitle")}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
              >
                <ItIcon name="xmark" size={11} />
              </button>
            ) : null}
          </span>
        </span>
      ) : null}
    </div>
  );
}
