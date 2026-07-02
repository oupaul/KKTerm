// 2.5D Server Room View (docs/SITE.md Server Room View). Draws the room as an
// axonometric floor grid with every Rack extruded into a cabinet whose height
// tracks its U capacity, coloured by the same health/utilisation bands as the
// 2D floor plan. Hovering a cabinet raises it and shows a billboarded detail
// card; clicking drills into that Rack's elevation. In edit mode cabinets are
// pointer-dragged across the floor (snapping to tiles, swapping on collision),
// an empty tile click adds a rack, and a delete bubble removes one. Placement
// persists through the shared free-placement store; the grid math lives in
// roomIsoLayout.ts and the colours in the `.rm-iso*` rules of itops.css.

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Rack } from "../../types";
import { rackFloorMetrics, type FloorMetric } from "./roomFloorPlan";
import {
  ISO_ROT_DEG,
  ISO_TILT_COS,
  ISO_TILT_DEG,
  moveIsoRack,
  resolveIsoLayout,
  screenDeltaToPlane,
  type IsoCell,
  type IsoLayout,
} from "./roomIsoLayout";
import type { FreePlacementMap } from "./siteTreeState";
import { FloorLegend } from "./ServerRoomFloorPlan";
import { ItIcon } from "./icons";

// Floor tile size and cabinet footprint, in plane px. The cabinet is inset in
// its tile so aisle gaps read between rows.
const CELL = 58;
const CAB = 44;
const CAB_INSET = (CELL - CAB) / 2;

// Cabinet extrusion height from rack capacity: tall 42/47U cabinets read
// clearly taller than short wall racks without dwarfing the floor.
function cabHeight(heightU: number): number {
  return Math.round(Math.min(106, 24 + Math.max(1, heightU) * 1.85));
}

// Billboard a child of the tilted plane back to screen alignment: lift it to
// `z`, invert the plane's rotateX/rotateZ, then offset in screen space
// (`shift` is a CSS translate() argument list, e.g. "-50%, -100%").
function billboard(z: number, shift: string): string {
  return `translateZ(${z}px) rotateZ(-${ISO_ROT_DEG}deg) rotateX(-${ISO_TILT_DEG}deg) translate(${shift})`;
}

interface DragState {
  rackId: string;
  /** Live drag offset in plane px. */
  u: number;
  v: number;
  target: IsoCell;
}

export function ServerRoomIsoView({
  racks,
  metric,
  editMode,
  placement,
  onPlacementChange,
  onDeleteRack,
  onSelectRack,
  onAddRack,
}: {
  racks: Rack[];
  metric: FloorMetric;
  editMode?: boolean;
  placement?: FreePlacementMap;
  onPlacementChange?: (next: FreePlacementMap) => void;
  onDeleteRack?: (rack: Rack) => void;
  onSelectRack: (rackId: string) => void;
  onAddRack?: () => void;
}) {
  const { t } = useTranslation();
  const layout = resolveIsoLayout(racks, placement ?? {});
  const [drag, setDrag] = useState<DragState | null>(null);
  // Mutable drag bookkeeping: the live target must not lag behind React's
  // batched `drag` state when the pointer is released.
  const dragRef = useRef<{
    rackId: string;
    startX: number;
    startY: number;
    origin: IsoCell;
    target: IsoCell;
    moved: boolean;
  } | null>(null);
  // A completed drag is followed by a click on the cabinet button; swallow it
  // so dropping a cabinet doesn't also drill into the rack.
  const suppressClickRef = useRef(false);

  const planeW = layout.cols * CELL;
  const planeH = layout.rows * CELL;
  // Projected bounding box of the tilted plane plus headroom for cabinets.
  const diag = (planeW + planeH) * Math.SQRT1_2;
  const maxCab = racks.reduce((max, rack) => Math.max(max, cabHeight(rack.heightU)), 0);
  const viewW = Math.ceil(diag) + 48;
  const viewH = Math.ceil(diag * ISO_TILT_COS) + maxCab + 84;

  function startDrag(event: ReactPointerEvent<HTMLDivElement>, rack: Rack) {
    if (!editMode || !onPlacementChange) return;
    const target = event.target as HTMLElement;
    if (target.closest(".rm-iso-delete")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const origin = layout.cells[rack.id];
    dragRef.current = {
      rackId: rack.id,
      startX: event.clientX,
      startY: event.clientY,
      origin,
      target: origin,
      moved: false,
    };
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (!state) return;
    const { u, v } = screenDeltaToPlane(
      event.clientX - state.startX,
      event.clientY - state.startY,
    );
    if (Math.abs(u) > 3 || Math.abs(v) > 3) state.moved = true;
    if (!state.moved) return;
    state.target = {
      x: Math.min(layout.cols - 1, Math.max(0, Math.round(state.origin.x + u / CELL))),
      y: Math.min(layout.rows - 1, Math.max(0, Math.round(state.origin.y + v / CELL))),
    };
    setDrag({ rackId: state.rackId, u, v, target: state.target });
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
        onPlacementChange?.(moveIsoRack(layout, state.rackId, state.target));
      }
    }
    dragRef.current = null;
    setDrag(null);
  }

  function selectRack(rackId: string) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onSelectRack(rackId);
  }

  const occupied = new Set(
    Object.values(layout.cells).map((cell) => `${cell.x},${cell.y}`),
  );
  const editableTiles: IsoCell[] = [];
  if (editMode && onAddRack) {
    for (let y = 0; y < layout.rows; y += 1) {
      for (let x = 0; x < layout.cols; x += 1) {
        if (!occupied.has(`${x},${y}`)) editableTiles.push({ x, y });
      }
    }
  }

  return (
    <div className="rm-iso" data-metric={metric}>
      <div className="rm-iso-scroll">
        <div className="rm-iso-viewport" style={{ width: viewW, height: viewH }}>
          <div
            className="rm-iso-plane"
            style={{
              width: planeW,
              height: planeH,
              backgroundSize: `${CELL}px ${CELL}px, ${CELL}px ${CELL}px, auto`,
              top: `calc(50% + ${Math.round(maxCab * 0.38)}px)`,
            }}
          >
            {editableTiles.map((cell) => (
              <button
                key={`t-${cell.x}-${cell.y}`}
                type="button"
                className="rm-iso-tile"
                style={{ left: cell.x * CELL, top: cell.y * CELL, width: CELL, height: CELL }}
                title={t("itops.floorPlan.isoAddHere")}
                onClick={onAddRack}
              >
                <ItIcon name="plus" size={13} />
              </button>
            ))}
            {drag ? (
              <div
                className="rm-iso-drop"
                style={{
                  left: drag.target.x * CELL,
                  top: drag.target.y * CELL,
                  width: CELL,
                  height: CELL,
                }}
              />
            ) : null}
            {racks.map((rack) => (
              <IsoCabinet
                key={rack.id}
                rack={rack}
                metric={metric}
                layout={layout}
                drag={drag?.rackId === rack.id ? drag : null}
                editMode={!!editMode}
                onPointerDown={(event) => startDrag(event, rack)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onSelect={() => selectRack(rack.id)}
                onDelete={editMode && onDeleteRack ? () => onDeleteRack(rack) : undefined}
              />
            ))}
          </div>
        </div>
      </div>
      {editMode ? <div className="rm-iso-hint">{t("itops.floorPlan.isoEditHint")}</div> : null}
      <FloorLegend metric={metric} />
    </div>
  );
}

function IsoCabinet({
  rack,
  metric,
  layout,
  drag,
  editMode,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onSelect,
  onDelete,
}: {
  rack: Rack;
  metric: FloorMetric;
  layout: IsoLayout;
  drag: DragState | null;
  editMode: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const cell = layout.cells[rack.id];
  const m = rackFloorMetrics(rack);
  const h = cabHeight(rack.heightU);
  const percent = Math.round(m.utilization * 100);
  const detail =
    metric === "utilization"
      ? t("itops.floorPlan.utilizationValue", { percent })
      : t(`itops.floorPlan.health.${m.health}`);

  return (
    <div
      className={`rm-iso-cab${drag ? " dragging" : ""}${editMode ? " editing" : ""}`}
      data-health={m.health}
      data-util={m.utilBand}
      style={{
        left: cell.x * CELL + CAB_INSET,
        top: cell.y * CELL + CAB_INSET,
        width: CAB,
        height: CAB,
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
        title={t("itops.floorPlan.tileTitle", { name: rack.name, detail })}
        onClick={onSelect}
      >
        <span className="rm-iso-face rm-iso-top" style={{ transform: `translateZ(${h}px)` }} />
        <span className="rm-iso-face rm-iso-front" style={{ height: h, top: CAB - h }}>
          <i className="rm-iso-fill" style={{ height: `${percent}%` }} />
          <i className="rm-iso-led" />
        </span>
        <span className="rm-iso-face rm-iso-side" style={{ width: h, left: CAB - h }} />
      </button>
      <span className="rm-iso-badge" style={{ transform: billboard(h + 6, "-50%, -100%") }}>
        {rack.name}
      </span>
      <span className="rm-iso-tip" style={{ transform: billboard(h + 10, "-50%, -112%") }}>
        <span className="rm-iso-tip-name">{rack.name}</span>
        <span className="rm-iso-tip-detail">{detail}</span>
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
      {onDelete ? (
        <span className="rm-iso-del-wrap" style={{ transform: billboard(h + 6, "40%, -170%") }}>
          <button
            type="button"
            className="rm-iso-delete"
            title={t("itops.racks.deleteTitle")}
            aria-label={t("itops.racks.deleteTitle")}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <ItIcon name="xmark" size={11} />
          </button>
        </span>
      ) : null}
    </div>
  );
}
