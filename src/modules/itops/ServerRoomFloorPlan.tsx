// Top-down Server Room View (docs/SITE.md Server Room View). A blueprint-style
// floor plan on the same grid the 2.5D view renders: each Rack is a footprint
// standing on a floor cell (shared "grid" placement, so arranging the room
// here rearranges the 2.5D room too), with compact always-on status tags
// instead of a metric toggle, a facing edge showing which way the front
// points, and non-rack room objects (roomObjects.ts) drawn at their cells.
// Edit mode drags footprints between cells (swapping on collision), rotates
// facings, and places/stacks/deletes room objects; the object palette arms a
// kind and a cell click drops it at the first free vertical span.

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Rack } from "../../types";
import {
  moveIsoRack,
  resolveIsoLayout,
  sanitizeFacing,
  type Facing,
  type IsoCell,
} from "./roomIsoLayout";
import {
  cellSpans,
  nudgeZ,
  objectSpec,
  resolveDropZ,
  type RoomObject,
} from "./roomObjects";
import type { FreePlacementMap, RackFacingMap } from "./siteTreeState";
import { rackFloorMetrics } from "./roomFloorPlan";
import { ItIcon } from "./icons";
import {
  OBJECT_ACCENTS,
  ObjectGlyph,
  RackTagChips,
  RoomObjectPalette,
  type RoomTool,
} from "./roomViewParts";

// Floor cell size in px; rack footprints span the full cell along their
// side-to-side axis so adjacent cabinets in a row touch like real racks.
const BP_CELL = 76;
// Rack depth as a fraction of a cell (front/back aisles read between rows).
const RACK_DEPTH = Math.round(BP_CELL * 0.72);

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
  placement,
  onPlacementChange,
  facing,
  onFacingChange,
  objects,
  onObjectsChange,
  onDeleteRack,
  onSelectRack,
  onObjectBlocked,
}: {
  racks: Rack[];
  editMode?: boolean;
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
}) {
  const { t } = useTranslation();
  const layout = resolveIsoLayout(racks, placement);
  const [tool, setTool] = useState<RoomTool>(null);
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
    x: Math.min(layout.cols - 1, Math.max(0, Math.round(cell.x))),
    y: Math.min(layout.rows - 1, Math.max(0, Math.round(cell.y))),
  });

  function startDrag(
    event: ReactPointerEvent<HTMLDivElement>,
    kind: "rack" | "object",
    id: string,
    origin: IsoCell,
  ) {
    if (!editMode || tool != null) return;
    const target = event.target as HTMLElement;
    if (target.closest(".rm-bp-ctl")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { kind, id, startX: event.clientX, startY: event.clientY, origin, target: origin, moved: false };
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (!state) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.moved = true;
    if (!state.moved) return;
    state.target = clampCell({
      x: state.origin.x + dx / BP_CELL,
      y: state.origin.y + dy / BP_CELL,
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
          onPlacementChange?.(moveIsoRack(layout, state.id, state.target));
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

  // An armed object tool places on any cell click (racks included — that is
  // how a 乖乖 pack lands on top of a cabinet).
  function placeAt(event: React.MouseEvent<HTMLDivElement>) {
    if (!editMode || tool == null || !onObjectsChange) return;
    const surface = event.currentTarget;
    const rect = surface.getBoundingClientRect();
    // Children (and the grid background) sit inside the wall border.
    const cell = clampCell({
      x: Math.floor((event.clientX - rect.left - surface.clientLeft) / BP_CELL),
      y: Math.floor((event.clientY - rect.top - surface.clientTop) / BP_CELL),
    });
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

  function selectRack(rackId: string) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (tool == null) onSelectRack(rackId);
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

  return (
    <div className="rm-bp-wrap">
      {editMode ? <RoomObjectPalette tool={tool} onToolChange={setTool} /> : null}
      <div className="rm-bp-scroll">
        <div
          className={`rm-bp${tool != null && editMode ? " placing" : ""}`}
          style={{
            width: layout.cols * BP_CELL,
            height: layout.rows * BP_CELL,
            backgroundSize: `${BP_CELL}px ${BP_CELL}px, ${BP_CELL}px ${BP_CELL}px, ${BP_CELL / 4}px ${BP_CELL / 4}px, ${BP_CELL / 4}px ${BP_CELL / 4}px, auto`,
          }}
          onClick={placeAt}
        >
          {drag ? (
            <div
              className="rm-bp-drop"
              style={{
                left: drag.target.x * BP_CELL,
                top: drag.target.y * BP_CELL,
                width: BP_CELL,
                height: BP_CELL,
              }}
            />
          ) : null}
          {racks.map((rack) => (
            <BlueprintRack
              key={rack.id}
              rack={rack}
              cell={layout.cells[rack.id]}
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
              editMode={!!editMode}
              drag={drag?.kind === "object" && drag.id === object.id ? drag : null}
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
      {editMode ? <div className="rm-iso-hint">{t("itops.floorPlan.blueprintEditHint")}</div> : null}
      <FloorLegend />
    </div>
  );
}

function BlueprintRack({
  rack,
  cell,
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
  // Side axis spans the full cell; the front/back axis is inset for aisles.
  const horizontal = facing === 0 || facing === 2;
  const w = horizontal ? BP_CELL : RACK_DEPTH;
  const h = horizontal ? RACK_DEPTH : BP_CELL;
  const left = cell.x * BP_CELL + (BP_CELL - w) / 2;
  const top = cell.y * BP_CELL + (BP_CELL - h) / 2;
  const front = (["s", "w", "n", "e"] as const)[facing];

  return (
    <div
      className={`rm-bp-rack${drag ? " dragging" : ""}${editMode ? " editing" : ""}`}
      data-health={m.health}
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
        <RackTagChips rack={rack} />
      </button>
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
  editMode,
  drag,
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
  editMode: boolean;
  drag: DragState | null;
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
  const across = object.rot % 2 === 1;
  const w = Math.round((across ? spec.deep : spec.wide) * BP_CELL);
  const h = Math.round((across ? spec.wide : spec.deep) * BP_CELL);
  const left = object.x * BP_CELL + (BP_CELL - w) / 2;
  const top = object.y * BP_CELL + (BP_CELL - h) / 2;
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
        <ObjectGlyph kind={object.kind} size={Math.min(16, Math.min(w, h) - 4)} />
      </span>
      {object.z > 0 ? <span className="rm-bp-obj-z">{object.z}U</span> : null}
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

// Health legend shared with the 2.5D view (the only coloured dimension now
// that utilisation and power read as numeric tags).
export function FloorLegend() {
  const { t } = useTranslation();
  const items = [
    ["ok", t("itops.floorPlan.health.ok")],
    ["warning", t("itops.floorPlan.health.warning")],
    ["critical", t("itops.floorPlan.health.critical")],
    ["empty", t("itops.floorPlan.health.empty")],
  ] as const;

  return (
    <div className="rm-legend">
      {items.map(([band, label]) => (
        <span className="rm-legend-item" key={band}>
          <span className={`rm-legend-sw ${band}`} />
          {label}
        </span>
      ))}
    </div>
  );
}
