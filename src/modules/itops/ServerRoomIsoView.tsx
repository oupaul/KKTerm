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

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Rack, RackItem, RackItemStatus } from "../../types";
import { rackFloorMetrics } from "./roomFloorPlan";
import { RoomObjectIsoArtwork } from "./RoomObjectArtwork";
import {
  ISO_ROT_DEG,
  ISO_TILT_COS,
  ISO_TILT_DEG,
  moveIsoRack,
  resolveIsoLayout,
  rotateCellForView,
  rotateFacingForView,
  sanitizeFacing,
  screenDeltaToPlane,
  viewDeltaToGrid,
  viewGridSize,
  type Facing,
  type IsoCell,
  type IsoLayout,
  type IsoViewAngle,
} from "./roomIsoLayout";
import {
  ROOM_CEILING_U,
  cellSpans,
  nudgeZ,
  objectSpec,
  resolveDropZ,
  type RoomObject,
} from "./roomObjects";
import type { FreePlacementMap, RackFacingMap } from "./siteTreeState";
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
  ObjectGlyph,
  RoomZoomRuler,
  useRoomPan,
  useRoomViewportSize,
  useWheelZoom,
  type RoomTool,
} from "./roomViewParts";

// Floor tile size and cabinet depth, in plane px. Cabinets span the full CELL
// along their side axis (adjacent racks touch); the front/back axis is inset
// so aisles read between rows.
const CELL = 58;
const CAB = 44;

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
  tool = null,
  placeRackId = null,
  onRackPlaced,
  placement,
  onPlacementChange,
  facing,
  onFacingChange,
  objects,
  onObjectsChange,
  onDeleteRack,
  onSelectRack,
  onAddRack,
  onObjectBlocked,
}: {
  racks: Rack[];
  editMode?: boolean;
  /** Armed object kind from the shared picker column (SitesTab owns it). */
  tool?: RoomTool;
  /** A just-created rack awaiting its placement click. */
  placeRackId?: string | null;
  onRackPlaced?: () => void;
  placement: FreePlacementMap;
  onPlacementChange?: (next: FreePlacementMap) => void;
  facing: RackFacingMap;
  onFacingChange?: (next: RackFacingMap) => void;
  objects: RoomObject[];
  onObjectsChange?: (next: RoomObject[]) => void;
  onDeleteRack?: (rack: Rack) => void;
  onSelectRack: (rackId: string) => void;
  onAddRack?: () => void;
  /** A placement click found no free vertical span in the cell. */
  onObjectBlocked?: () => void;
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
  const [drag, setDrag] = useState<DragState | null>(null);
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
  // floor-plan edit placed beyond the racks.
  const gridCols = Math.max(layout.cols, ...objects.map((object) => object.x + 1));
  const gridRows = Math.max(layout.rows, ...objects.map((object) => object.y + 1));
  const grid: IsoLayout = { cols: gridCols, rows: gridRows, cells: layout.cells };

  // Headroom for the tallest cabinet or elevated object.
  let maxTop = racks.reduce((max, rack) => Math.max(max, cabHeight(rack.heightU)), 0);
  for (const object of objects) {
    maxTop = Math.max(maxTop, zPx(object.z + objectSpec(object.kind).heightU));
  }

  // The canvas is the projected bounding box of the interactive grid plus
  // headroom, grown to fill the scroll viewport. The drawn floor then adds a
  // decorative ring of cells around the interactive block until the plane's
  // projection covers that canvas (the viewport clips the overhang).
  // cols+rows fixes the projected diagonal — a view rotation only swaps them
  // — so the ring size is angle-independent.
  const contentDiag = (gridCols + gridRows) * CELL * Math.SQRT1_2;
  const viewW = Math.max(Math.ceil(contentDiag) + 48, (viewport?.w ?? 0) / zoom);
  const viewH = Math.max(
    Math.ceil(contentDiag * ISO_TILT_COS) + Math.ceil(maxTop) + 84,
    (viewport?.h ?? 0) / zoom,
  );
  const floorDiag = Math.max(viewW - 48, (viewH - Math.ceil(maxTop) - 84) / ISO_TILT_COS);
  const ring = Math.max(0, Math.ceil(floorDiag / (CELL * Math.SQRT1_2)) - (gridCols + gridRows));
  const ringCols = Math.ceil(ring / 2);
  const floorCols = gridCols + ringCols;
  const floorRows = gridRows + (ring - ringCols);
  // Center the interactive block on the drawn floor.
  const offX = Math.floor((floorCols - gridCols) / 2);
  const offY = Math.floor((floorRows - gridRows) / 2);
  const dims = viewGridSize(floorCols, floorRows, angle);
  const toDisplay = (cell: IsoCell) =>
    rotateCellForView({ x: cell.x + offX, y: cell.y + offY }, angle, floorCols, floorRows);
  const planeW = dims.cols * CELL;
  const planeH = dims.rows * CELL;

  const clampCell = (cell: IsoCell): IsoCell => ({
    x: Math.min(gridCols - 1, Math.max(0, Math.round(cell.x))),
    y: Math.min(gridRows - 1, Math.max(0, Math.round(cell.y))),
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
          onPlacementChange?.(moveIsoRack(grid, state.id, state.target));
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
    const spans = cellSpans(target, racks, layout.cells, objects, id);
    const z = resolveDropZ(spans, object.kind, object.z);
    if (z == null) {
      onObjectBlocked?.();
      return;
    }
    onObjectsChange(
      objects.map((entry) => (entry.id === id ? { ...entry, x: target.x, y: target.y, z } : entry)),
    );
  }

  function placeObjectAt(cell: IsoCell) {
    if (tool == null || !onObjectsChange) return;
    const spans = cellSpans(cell, racks, layout.cells, objects);
    const z = resolveDropZ(spans, tool);
    if (z == null) {
      onObjectBlocked?.();
      return;
    }
    onObjectsChange([
      ...objects,
      { id: crypto.randomUUID(), kind: tool, x: cell.x, y: cell.y, z, rot: 0 },
    ]);
  }

  // Drop the picker's just-created rack on a cell (swapping with an occupant).
  function placeRackAt(cell: IsoCell) {
    if (placeRackId == null) return;
    if (layout.cells[placeRackId]) {
      onPlacementChange?.(moveIsoRack(grid, placeRackId, cell));
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
    onSelectRack(rack.id);
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

  function nudgeObject(object: RoomObject, dir: 1 | -1) {
    const spans = cellSpans(object, racks, layout.cells, objects, object.id);
    const z = nudgeZ(spans, object.kind, object.z, dir);
    if (z === object.z) return;
    onObjectsChange?.(objects.map((entry) => (entry.id === object.id ? { ...entry, z } : entry)));
  }

  // Edit-mode click targets: empty tiles add a rack (no tool) or take an
  // armed rack/object; cells holding only objects still get a tile while a
  // tool is armed so a second fixture can stack in the same cell.
  const rackCells = new Set(Object.values(layout.cells).map((cell) => `${cell.x},${cell.y}`));
  const editableTiles: IsoCell[] = [];
  if (editMode && (onAddRack || armed)) {
    for (let y = 0; y < gridRows; y += 1) {
      for (let x = 0; x < gridCols; x += 1) {
        if (!rackCells.has(`${x},${y}`)) editableTiles.push({ x, y });
      }
    }
  }

  return (
    <div className="rm-iso">
      <div className="rm-view-body">
        <div className="rm-iso-angles" role="group" aria-label={t("itops.floorPlan.viewAngleLabel")}>
          <button
            type="button"
            title={t("itops.floorPlan.rotateViewLeft")}
            aria-label={t("itops.floorPlan.rotateViewLeft")}
            onClick={() => setAngle(((angle + 3) % 4) as IsoViewAngle)}
          >
            <ItIcon name="chevL" size={13} />
          </button>
          <button
            type="button"
            title={t("itops.floorPlan.rotateViewRight")}
            aria-label={t("itops.floorPlan.rotateViewRight")}
            onClick={() => setAngle(((angle + 1) % 4) as IsoViewAngle)}
          >
            <ItIcon name="chevR" size={13} />
          </button>
        </div>
        {/* tabIndex: clicking the room focuses the viewport so arrow keys pan. */}
        <div className="rm-iso-scroll" ref={scrollRef} tabIndex={0}>
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
                className="rm-iso-plane"
                style={{
                  width: planeW,
                  height: planeH,
                  backgroundSize: `${CELL}px ${CELL}px, ${CELL}px ${CELL}px, auto`,
                  top: `calc(50% + ${Math.round(maxTop * 0.38)}px)`,
                }}
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
                    onPointerDown={(event) => startDrag(event, "rack", rack.id, layout.cells[rack.id])}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onSelect={() => selectRack(rack)}
                    onRotate={editMode && onFacingChange ? () => rotateRack(rack) : undefined}
                    onDelete={editMode && onDeleteRack ? () => onDeleteRack(rack) : undefined}
                  />
                ))}
                {objects.map((object) => (
                  <IsoObject
                    key={object.id}
                    object={object}
                    cell={toDisplay(object)}
                    rot={rotateFacingForView(object.rot, angle)}
                    drag={drag?.kind === "object" && drag.id === object.id ? drag : null}
                    editMode={!!editMode}
                    onPointerDown={(event) =>
                      startDrag(event, "object", object.id, { x: object.x, y: object.y })
                    }
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onRotate={() => rotateObject(object)}
                    onRaise={() => nudgeObject(object, 1)}
                    onLower={() => nudgeObject(object, -1)}
                    onDelete={
                      onObjectsChange
                        ? () => onObjectsChange(objects.filter((entry) => entry.id !== object.id))
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <RoomZoomRuler zoom={zoom} onZoomChange={setZoom} />
      </div>
      {editMode ? <div className="rm-iso-hint">{t("itops.floorPlan.isoEditHint")}</div> : null}
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
      {rack.items.map((item) => {
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
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
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
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSelect: () => void;
  onRotate?: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const m = rackFloorMetrics(rack);
  const h = cabHeight(rack.heightU);
  // Full cell along the side axis so adjacent cabinets connect; inset along
  // the front/back axis. Facing 0/2 = front toward ±y → sides run along x.
  const horizontal = facing === 0 || facing === 2;
  const w = horizontal ? CELL : CAB;
  const d = horizontal ? CAB : CELL;
  const left = cell.x * CELL + (CELL - w) / 2;
  const top = cell.y * CELL + (CELL - d) / 2;
  // Which visible face (south = +y, east = +x) carries the device skin; the
  // other reads as a plain side, or as the cable rear when the front is
  // turned away from the camera.
  const southRole = facing === 0 ? "front" : facing === 2 ? "rear" : "side";
  const eastRole = facing === 3 ? "front" : facing === 1 ? "rear" : "side";
  const health = t(`itops.floorPlan.health.${m.health}`);

  return (
    <div
      className={`rm-iso-cab${drag ? " dragging" : ""}${editMode ? " editing" : ""}`}
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
    >
      <button
        type="button"
        className="rm-iso-body"
        title={t("itops.floorPlan.tileTitle", { name: rack.name, detail: health })}
        onClick={onSelect}
      >
        <span className="rm-iso-face rm-iso-top" style={{ transform: `translateZ(${h}px)` }} />
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
      <span className="rm-iso-badge" style={{ transform: billboard(h + 6, "-50%, -100%") }}>
        {rack.name}
      </span>
      <span className="rm-iso-tip" style={{ transform: billboard(h + 10, "-50%, -112%") }}>
        <span className="rm-iso-tip-name">{rack.name}</span>
        <span className="rm-iso-tip-detail">
          {health} · {t("itops.floorPlan.utilizationValue", { percent: Math.round(m.utilization * 100) })}
          {m.powerW > 0
            ? ` · ${
                m.powerCapacityW != null
                  ? t("itops.floorPlan.powerValue", { used: m.powerW, capacity: m.powerCapacityW })
                  : t("itops.floorPlan.powerDrawOnly", { watts: m.powerW })
              }`
            : ""}
        </span>
        <span className="rm-iso-tip-cap">
          {t("itops.racks.unitCount", { count: m.usedU })} /{" "}
          {t("itops.racks.unitCount", { count: m.capacityU })} ·{" "}
          {t("itops.racks.deviceCount", { count: m.deviceCount })}
        </span>
        {m.deviceCount > 0 ? (
          <span className="rm-tile-dots">
            <span className="rm-dot on">
              <i />
              {m.online}
            </span>
            {m.warning > 0 ? (
              <span className="rm-dot warn">
                <i />
                {m.warning}
              </span>
            ) : null}
            {m.offline > 0 ? (
              <span className="rm-dot off">
                <i />
                {m.offline}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
      {editMode && (onRotate || onDelete) ? (
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
  cell,
  rot,
  drag,
  editMode,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onRotate,
  onRaise,
  onLower,
  onDelete,
}: {
  object: RoomObject;
  /** Display cell (already view-rotated). */
  cell: IsoCell;
  /** Display rotation (already view-rotated). */
  rot: Facing;
  drag: DragState | null;
  editMode: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onRotate: () => void;
  onRaise: () => void;
  onLower: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const spec = objectSpec(object.kind);
  const across = rot % 2 === 1;
  const w = Math.round((across ? spec.deep : spec.wide) * CELL);
  const d = Math.round((across ? spec.wide : spec.deep) * CELL);
  const left = cell.x * CELL + (CELL - w) / 2;
  const top = cell.y * CELL + (CELL - d) / 2;
  const h = Math.max(3, zPx(spec.heightU));
  const bottom = zPx(Math.min(object.z, ROOM_CEILING_U));
  const name = t(`itops.floorPlan.object.${object.kind}`);

  return (
    <div
      className={`rm-iso-obj${drag ? " dragging" : ""}${editMode ? " editing" : ""}${object.z === 0 ? " grounded" : ""}`}
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
    >
      <span
        className="rm-iso-obj-model"
        data-kind={object.kind}
        style={{ transform: billboard(bottom, "-50%, -100%") }}
      >
        <RoomObjectIsoArtwork kind={object.kind} />
      </span>
      <span
        className="rm-iso-obj-badge"
        style={{ transform: billboard(bottom + h + 5, "-50%, -100%") }}
      >
        <ObjectGlyph kind={object.kind} size={12} />
        {object.z > 0 ? <em>{object.z}U</em> : null}
      </span>
      {editMode ? (
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
