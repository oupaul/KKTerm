// Top-down Server Room View (docs/SITE.md Server Room View). A blueprint-style
// floor plan on the same grid the 2.5D view renders: each Rack is a footprint
// standing on a floor cell (shared "grid" placement, so arranging the room
// here rearranges the 2.5D room too), with compact always-on status tags
// instead of a metric toggle, a facing edge showing which way the front
// points, and non-rack room objects (roomObjects.ts) drawn at their cells.
// Edit mode drags footprints between cells (swapping on collision), rotates
// facings, and places/stacks/deletes room objects; the object picker column
// (owned by SitesTab, shared with the 2.5D view) arms a rack or object kind
// and a cell click drops it under the cursor.

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Rack } from "../../types";
import {
  moveIsoRack,
  rackDepthFrac,
  rackFootprint,
  resolveIsoLayout,
  sanitizeFacing,
  type Corner,
  type Facing,
  type IsoCell,
} from "./roomIsoLayout";
import {
  footprintSpans,
  nudgeZ,
  objectCellSpan,
  objectFootprint,
  objectSpec,
  resolveDropZ,
  type RoomObject,
} from "./roomObjects";
import {
  loadRoomZoom,
  saveRoomZoom,
  stepRoomZoom,
  type FreePlacementMap,
  type RackFacingMap,
} from "./siteTreeState";
import { rackFloorMetrics } from "./roomFloorPlan";
import { ItIcon } from "./icons";
import { RoomObjectPlanArtwork } from "./RoomObjectArtwork";
import { KuaiKuaiBag } from "./KuaiKuaiBag";
import { isRackTopItem } from "./rackPlacement";
import {
  OBJECT_ACCENTS,
  RackTagChips,
  RackTipContent,
  RoomZoomRuler,
  useRoomPan,
  useRoomViewportSize,
  useWheelZoom,
  type RoomTool,
} from "./roomViewParts";

// Base floor cell size in px; rack footprints span the full cell along their
// side-to-side axis so adjacent cabinets in a row touch like real racks. The
// grid always covers the scroll viewport: cells are appended (and every cell
// stretches a few px) until the room fills the window, and when a large room
// cannot fit, cells shrink no further than BP_MIN_CELL and the plan scrolls.
const BP_CELL = 76;
const BP_MIN_CELL = 56;
// Px eaten by the room's wall border (2.5px per side, content-box sizing).
const BP_WALL = 5;

interface DragState {
  kind: "rack" | "object";
  id: string;
  /** Live drag offset in px. */
  dx: number;
  dy: number;
  target: IsoCell;
}

export function ServerRoomFloorPlan({
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
  onObjectBlocked,
  onCancelPlacement,
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
  /** A placement click found no free vertical span in the cell. */
  onObjectBlocked?: () => void;
  /** Right-click while a picker card is armed disarms it. */
  onCancelPlacement?: () => void;
}) {
  const { t } = useTranslation();
  const layout = resolveIsoLayout(racks, placement);
  const [scrollRef, viewport] = useRoomViewportSize();
  // Zoom scales the rendered plan; the fill math below works in unzoomed
  // (logical) px, so zooming out shows more floor cells in the same window.
  const [zoom, setZoom] = useState(() => loadRoomZoom("floor"));
  useEffect(() => saveRoomZoom("floor", zoom), [zoom]);
  useWheelZoom(scrollRef, (dir) => setZoom((current) => stepRoomZoom(current, dir)));
  useRoomPan(scrollRef);
  // Grid dimensions cover the racks, every placed object, and the visible
  // viewport; cell sizes stretch so the walls land on the viewport edge.
  const floorW = viewport ? Math.max(0, viewport.w / zoom - BP_WALL) : 0;
  const floorH = viewport ? Math.max(0, viewport.h / zoom - BP_WALL) : 0;
  const cols = Math.max(
    layout.cols,
    Math.floor(floorW / BP_CELL),
    ...objects.map((object) => object.x + objectCellSpan(object.kind, object.rot).w),
  );
  const rows = Math.max(
    layout.rows,
    Math.floor(floorH / BP_CELL),
    ...objects.map((object) => object.y + objectCellSpan(object.kind, object.rot).h),
  );
  const cellW = floorW > 0 ? Math.max(BP_MIN_CELL, floorW / cols) : BP_CELL;
  const cellH = floorH > 0 ? Math.max(BP_MIN_CELL, floorH / rows) : BP_CELL;
  const grid = { cols, rows, cells: layout.cells };
  const armed = tool != null || placeRackId != null;
  // Cursor-tracked placement preview: the armed object ghost snaps to the
  // hovered cell (and, for quarter-block fixtures, the cell quadrant under
  // the pointer) so the grid shows the drop before the click commits.
  const [hover, setHover] = useState<(IsoCell & { corner: Corner }) | null>(null);
  const placing = !!editMode && armed;
  useEffect(() => {
    if (!placing) setHover(null);
  }, [placing]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<{
    kind: "rack" | "object";
    id: string;
    startX: number;
    startY: number;
    origin: IsoCell;
    target: IsoCell;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const clampCell = (cell: IsoCell): IsoCell => ({
    x: Math.min(cols - 1, Math.max(0, Math.round(cell.x))),
    y: Math.min(rows - 1, Math.max(0, Math.round(cell.y))),
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
    const target = event.target as HTMLElement;
    if (target.closest(".rm-bp-ctl")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { kind, id, startX: event.clientX, startY: event.clientY, origin, target: origin, moved: false };
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (!state) return;
    // Logical (unzoomed) px: the dragged element renders inside the scaled
    // plan, so the translate offset scales back up to match the pointer.
    const dx = (event.clientX - state.startX) / zoom;
    const dy = (event.clientY - state.startY) / zoom;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.moved = true;
    if (!state.moved) return;
    state.target = clampCell({
      x: state.origin.x + dx / cellW,
      y: state.origin.y + dy / cellH,
    });
    setDrag({ kind: state.kind, id: state.id, dx, dy, target: state.target });
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (state) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      if (state.moved) {
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

  // Move an object to a cell, re-resolving its vertical position; if the cell
  // is vertically full the move is rejected and the object stays put.
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
    onObjectsChange(
      objects.map((entry) => (entry.id === id ? { ...entry, x: target.x, y: target.y, z } : entry)),
    );
  }

  // Pointer position → continuous floor coordinates on the plan surface.
  function pointFromEvent(event: React.MouseEvent<HTMLDivElement>): { x: number; y: number } {
    const surface = event.currentTarget;
    // The rect is the zoomed border box; clientLeft/Top are unzoomed CSS px.
    const rect = surface.getBoundingClientRect();
    // Children (and the grid background) sit inside the wall border.
    return {
      x: ((event.clientX - rect.left) / zoom - surface.clientLeft) / cellW,
      y: ((event.clientY - rect.top) / zoom - surface.clientTop) / cellH,
    };
  }

  function cellFromEvent(event: React.MouseEvent<HTMLDivElement>): IsoCell {
    const point = pointFromEvent(event);
    return clampCell({ x: Math.floor(point.x), y: Math.floor(point.y) });
  }

  // The cell quadrant under the pointer, anchoring a quarter-block fixture.
  function cornerFromEvent(event: React.MouseEvent<HTMLDivElement>, cell: IsoCell): Corner {
    const point = pointFromEvent(event);
    const qx = point.x - cell.x >= 0.5 ? 1 : 0;
    const qy = point.y - cell.y >= 0.5 ? 1 : 0;
    // Clockwise numbering: 0 = NW, 1 = NE, 2 = SE, 3 = SW.
    return qy === 0 ? (qx as Corner) : ((3 - qx) as Corner);
  }

  function trackPlacement(event: ReactPointerEvent<HTMLDivElement>) {
    const cell = cellFromEvent(event);
    const corner =
      tool != null && objectSpec(tool).quarter ? cornerFromEvent(event, cell) : (0 as Corner);
    setHover((prev) =>
      prev && prev.x === cell.x && prev.y === cell.y && prev.corner === corner
        ? prev
        : { ...cell, corner },
    );
  }

  function cancelPlacement(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    setHover(null);
    onCancelPlacement?.();
  }

  // An armed picker card places on any cell click: objects land on racks too
  // (that is how a 乖乖 pack lands on top of a cabinet), and a pending rack
  // moves to the clicked cell (swapping with any occupant).
  function placeAt(event: React.MouseEvent<HTMLDivElement>) {
    if (!editMode || !armed) return;
    const cell = cellFromEvent(event);
    if (placeRackId != null) {
      if (layout.cells[placeRackId]) {
        onPlacementChange?.(moveIsoRack(grid, placeRackId, cell));
        onRackPlaced?.();
      }
      return;
    }
    if (tool == null || !onObjectsChange) return;
    const corner = objectSpec(tool).quarter ? cornerFromEvent(event, cell) : (0 as Corner);
    const spans = footprintSpans(cell, tool, 0, racks, layout.cells, objects, undefined, corner, facing);
    const z = resolveDropZ(spans, tool);
    if (z == null) {
      onObjectBlocked?.();
      return;
    }
    onObjectsChange([
      ...objects,
      { id: crypto.randomUUID(), kind: tool, x: cell.x, y: cell.y, z, rot: 0, corner },
    ]);
  }

  function selectRack(rackId: string) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (!armed) onSelectRack(rackId);
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

  return (
    <div className="rm-bp-wrap">
      <div className="rm-view-body">
        {/* tabIndex: clicking the room focuses the viewport so arrow keys pan. */}
        <div className="rm-bp-scroll" ref={scrollRef} tabIndex={0}>
          <div
            className="rm-bp-zoom"
            style={{
              width: (cols * cellW + BP_WALL) * zoom,
              height: (rows * cellH + BP_WALL) * zoom,
            }}
          >
            <div
              className={`rm-bp${placing ? " placing" : ""}`}
              style={{
                width: cols * cellW,
                height: rows * cellH,
                transform: zoom !== 1 ? `scale(${zoom})` : undefined,
                backgroundSize: `${cellW}px ${cellH}px, ${cellW}px ${cellH}px, ${cellW / 4}px ${cellH / 4}px, ${cellW / 4}px ${cellH / 4}px, auto`,
              }}
              onClick={placeAt}
              onPointerMove={placing ? trackPlacement : undefined}
              onPointerLeave={placing ? () => setHover(null) : undefined}
              onContextMenu={placing ? cancelPlacement : undefined}
            >
              {drag ? (
                <div
                  className="rm-bp-drop"
                  style={{
                    left: drag.target.x * cellW,
                    top: drag.target.y * cellH,
                    width: cellW,
                    height: cellH,
                  }}
                />
              ) : null}
              {racks.map((rack) => (
                <BlueprintRack
                  key={rack.id}
                  rack={rack}
                  cell={layout.cells[rack.id]}
                  cellW={cellW}
                  cellH={cellH}
                  facing={sanitizeFacing(facing[rack.id])}
                  editMode={!!editMode}
                  drag={drag?.kind === "rack" && drag.id === rack.id ? drag : null}
                  onPointerDown={(event) => startDrag(event, "rack", rack.id, layout.cells[rack.id])}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onSelect={() => selectRack(rack.id)}
                  onRotate={editMode && onFacingChange ? () => rotateRack(rack) : undefined}
                  onDelete={editMode && onDeleteRack ? () => onDeleteRack(rack) : undefined}
                />
              ))}
              {objects.map((object) => (
                <BlueprintObject
                  key={object.id}
                  object={object}
                  cellW={cellW}
                  cellH={cellH}
                  editMode={!!editMode}
                  drag={drag?.kind === "object" && drag.id === object.id ? drag : null}
                  onPointerDown={(event) =>
                    startDrag(event, "object", object.id, { x: object.x, y: object.y })
                  }
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onRotate={() => rotateObject(object)}
                  onCorner={
                    objectSpec(object.kind).quarter ? () => cycleCorner(object) : undefined
                  }
                  onRaise={() => nudgeObject(object, 1)}
                  onLower={() => nudgeObject(object, -1)}
                  onDelete={
                    onObjectsChange
                      ? () => onObjectsChange(objects.filter((entry) => entry.id !== object.id))
                      : undefined
                  }
                />
              ))}
              {placing && hover
                ? (() => {
                    // Realtime placement preview under the cursor: the armed
                    // fixture's plan artwork on its slot — the hovered cell
                    // quadrant for a quarter-block fixture, the covered cell
                    // span otherwise — red when no vertical span is free.
                    // The pending rack previews at its depth, front flush.
                    const spec = tool != null ? objectSpec(tool) : null;
                    const blocked =
                      tool != null &&
                      resolveDropZ(
                        footprintSpans(hover, tool, 0, racks, layout.cells, objects, undefined, hover.corner, facing),
                        tool,
                      ) == null;
                    const span = tool != null ? objectCellSpan(tool, 0) : { w: 1, h: 1 };
                    const slot = spec?.quarter
                      ? {
                          left:
                            (hover.x + (hover.corner === 1 || hover.corner === 2 ? 0.5 : 0)) *
                            cellW,
                          top: (hover.y + (hover.corner >= 2 ? 0.5 : 0)) * cellH,
                          width: cellW / 2,
                          height: cellH / 2,
                        }
                      : {
                          left: hover.x * cellW,
                          top: hover.y * cellH,
                          width: span.w * cellW,
                          height: span.h * cellH,
                        };
                    const pending = racks.find((entry) => entry.id === placeRackId);
                    return (
                      <div
                        className={`rm-bp-ghost${blocked ? " blocked" : ""}`}
                        style={
                          {
                            ...slot,
                            "--obj": tool != null ? OBJECT_ACCENTS[tool] : undefined,
                          } as React.CSSProperties
                        }
                      >
                        {tool != null && spec ? (
                          <span
                            className="rm-bp-ghost-item"
                            style={{
                              width: Math.round(spec.wide * cellW),
                              height: Math.round(spec.deep * cellH),
                            }}
                          >
                            <RoomObjectPlanArtwork kind={tool} />
                          </span>
                        ) : (
                          <span
                            className="rm-bp-ghost-rack"
                            style={{
                              width: cellW,
                              height: Math.round(
                                cellH * rackDepthFrac(pending?.depthMm ?? 1000),
                              ),
                              alignSelf: "flex-end",
                            }}
                          />
                        )}
                      </div>
                    );
                  })()
                : null}
            </div>
          </div>
        </div>
        <RoomZoomRuler zoom={zoom} onZoomChange={setZoom} />
      </div>
      {editMode ? <div className="rm-iso-hint">{t("itops.floorPlan.blueprintEditHint")}</div> : null}
    </div>
  );
}

function BlueprintRack({
  rack,
  cell,
  cellW,
  cellH,
  facing,
  editMode,
  drag,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onSelect,
  onRotate,
  onDelete,
}: {
  rack: Rack;
  cell: IsoCell;
  cellW: number;
  cellH: number;
  facing: Facing;
  editMode: boolean;
  drag: DragState | null;
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
  // Side axis spans the full cell; the depth axis tracks the cabinet's
  // physical depth, front face flush on the borderline the facing points at.
  const fp = rackFootprint(facing, rackDepthFrac(rack.depthMm));
  const w = fp.w * cellW;
  const h = fp.d * cellH;
  const left = (cell.x + fp.x) * cellW;
  const top = (cell.y + fp.y) * cellH;
  const front = (["s", "w", "n", "e"] as const)[facing];
  const topKuaiguai = rack.items.find((item) => isRackTopItem(item, rack.heightU));

  return (
    <div
      className={`rm-bp-rack${drag ? " dragging" : ""}${editMode ? " editing" : ""}`}
      data-shell={rack.shell && rack.shell !== "black" ? rack.shell : undefined}
      data-front={front}
      style={{
        left,
        top,
        width: w,
        height: h,
        transform: drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
      }}
      onPointerDown={editMode ? onPointerDown : undefined}
      onPointerMove={editMode ? onPointerMove : undefined}
      onPointerUp={editMode ? onPointerUp : undefined}
      onPointerCancel={editMode ? onPointerCancel : undefined}
    >
      <button
        type="button"
        className="rm-bp-rack-body"
        title={t("itops.floorPlan.tileTitle", {
          name: rack.name,
          detail: t(`itops.floorPlan.health.${m.health}`),
        })}
        onClick={onSelect}
      >
        <span className="rm-bp-rack-name">{rack.name}</span>
        {topKuaiguai ? (
          <span className="rm-bp-top-kuaiguai">
            <KuaiKuaiBag style="laidDown" expiry={topKuaiguai.metadata?.expiry} />
          </span>
        ) : null}
        <RackTagChips rack={rack} />
      </button>
      <span className="rm-bp-tip">
        <RackTipContent rack={rack} />
      </span>
      {editMode && (onRotate || onDelete) ? (
        <span className="rm-bp-ctl">
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
      ) : null}
    </div>
  );
}

function BlueprintObject({
  object,
  cellW,
  cellH,
  editMode,
  drag,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onRotate,
  onCorner,
  onRaise,
  onLower,
  onDelete,
}: {
  object: RoomObject;
  cellW: number;
  cellH: number;
  editMode: boolean;
  drag: DragState | null;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onRotate: () => void;
  /** Quarter-block fixtures only: walk to the next cell corner. */
  onCorner?: () => void;
  onRaise: () => void;
  onLower: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const fp = objectFootprint(object.kind, object.rot, object.corner);
  const w = fp.w * cellW;
  const h = fp.d * cellH;
  const left = (object.x + fp.x) * cellW;
  const top = (object.y + fp.y) * cellH;
  const name = t(`itops.floorPlan.object.${object.kind}`);

  return (
    <div
      className={`rm-bp-obj${drag ? " dragging" : ""}${editMode ? " editing" : ""}`}
      data-kind={object.kind}
      style={
        {
          left,
          top,
          width: w,
          height: h,
          transform: drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
          "--obj": OBJECT_ACCENTS[object.kind],
        } as React.CSSProperties
      }
      title={`${name} — ${t("itops.floorPlan.objectLevel", { z: object.z })}`}
      onPointerDown={editMode ? onPointerDown : undefined}
      onPointerMove={editMode ? onPointerMove : undefined}
      onPointerUp={editMode ? onPointerUp : undefined}
      onPointerCancel={editMode ? onPointerCancel : undefined}
    >
      <span className="rm-bp-obj-glyph" style={{ transform: `rotate(${object.rot * 90}deg)` }}>
        <RoomObjectPlanArtwork kind={object.kind} />
      </span>
      {editMode ? (
        <span className="rm-bp-ctl">
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
      ) : null}
    </div>
  );
}
