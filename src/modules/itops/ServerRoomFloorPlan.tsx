// Top-down Server Room View (docs/SITE.md Server Room View). A 2D room
// footprint: each Rack is drawn as a tile laid out by its `rackGroup` row
// (the physical rack rows in the room), coloured by health or utilisation —
// the DCIM floor-plan pattern. Clicking a tile drills into that Rack's
// elevation. Pure presentation over the `racksBySite` store; the colour bands
// come from `rackFloorMetrics` and are painted by `.rm-*` rules in itops.css.

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Rack } from "../../types";
import { groupRacksByGroup } from "./rackTopology";
import { rackFloorMetrics, type FloorMetric } from "./roomFloorPlan";
import type { FreePlacementMap } from "./siteTreeState";
import { ItIcon } from "./icons";

const FLOOR_TILE_WIDTH = 124;
const FLOOR_TILE_HEIGHT = 102;

export function ServerRoomFloorPlan({
  racks,
  metric,
  editMode,
  placement,
  onPlacementChange,
  onDeleteRack,
  onSelectRack,
}: {
  racks: Rack[];
  metric: FloorMetric;
  editMode?: boolean;
  placement?: FreePlacementMap;
  onPlacementChange?: (next: FreePlacementMap) => void;
  onDeleteRack?: (rack: Rack) => void;
  onSelectRack: (rackId: string) => void;
}) {
  const { t } = useTranslation();
  const ungrouped = t("itops.racks.ungrouped");
  const rows = groupRacksByGroup(racks);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  function defaultPosition(index: number) {
    const col = index % 4;
    const row = Math.floor(index / 4);
    return { x: 16 + col * (FLOOR_TILE_WIDTH + 14), y: 16 + row * (FLOOR_TILE_HEIGHT + 14) };
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>, rack: Rack, fallback: { x: number; y: number }) {
    const target = event.target as HTMLElement;
    if (target.closest(".it-free-delete")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const origin = placement?.[rack.id] ?? fallback;
    dragRef.current = {
      id: rack.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
      moved: false,
    };
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || !placement || !onPlacementChange) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      drag.moved = true;
    }
    onPlacementChange({
      ...placement,
      [drag.id]: {
        x: Math.max(4, Math.round(drag.originX + dx)),
        y: Math.max(4, Math.round(drag.originY + dy)),
      },
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  if (editMode) {
    const activePlacement = placement ?? {};
    const canvasHeight =
      racks.length === 0
        ? FLOOR_TILE_HEIGHT + 32
        : defaultPosition(racks.length - 1).y + FLOOR_TILE_HEIGHT + 20;
    return (
      <div className="rm-floor free" data-metric={metric}>
        <div className="rm-floor-canvas" style={{ minHeight: canvasHeight }}>
          {racks.map((rack, index) => {
            const fallback = defaultPosition(index);
            const point = activePlacement[rack.id] ?? fallback;
            return (
              <div
                key={rack.id}
                className="rm-free-tile"
                style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
                onPointerDown={(event) => startDrag(event, rack, fallback)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <FloorTile rack={rack} metric={metric} onSelect={onSelectRack} />
                {onDeleteRack ? (
                  <button
                    type="button"
                    className="it-free-delete"
                    title={t("itops.racks.deleteTitle")}
                    aria-label={t("itops.racks.deleteTitle")}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteRack(rack);
                    }}
                  >
                    <ItIcon name="xmark" size={11} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        <FloorLegend metric={metric} />
      </div>
    );
  }

  return (
    <div className="rm-floor" data-metric={metric}>
      {rows.map((row) => (
        <div className="rm-floor-row" key={row.key}>
          {rows.length > 1 || row.key ? (
            <div className="rm-floor-row-h">{row.key || ungrouped}</div>
          ) : null}
          <div className="rm-floor-strip">
            {row.racks.map((rack) => (
              <FloorTile key={rack.id} rack={rack} metric={metric} onSelect={onSelectRack} />
            ))}
          </div>
        </div>
      ))}
      <FloorLegend metric={metric} />
    </div>
  );
}

function FloorTile({
  rack,
  metric,
  onSelect,
}: {
  rack: Rack;
  metric: FloorMetric;
  onSelect: (rackId: string) => void;
}) {
  const { t } = useTranslation();
  const m = rackFloorMetrics(rack);
  const percent = Math.round(m.utilization * 100);
  const detail =
    metric === "utilization"
      ? t("itops.floorPlan.utilizationValue", { percent })
      : t(`itops.floorPlan.health.${m.health}`);

  return (
    <button
      type="button"
      className="rm-tile"
      data-health={m.health}
      data-util={m.utilBand}
      title={t("itops.floorPlan.tileTitle", { name: rack.name, detail })}
      onClick={() => onSelect(rack.id)}
    >
      <span className="rm-tile-name">{rack.name}</span>
      <span className="rm-tile-fill">
        {metric === "utilization" ? (
          <span className="rm-tile-bar">
            <span style={{ width: `${percent}%` }} />
          </span>
        ) : (
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
        )}
      </span>
      <span className="rm-tile-meta">
        <span className="rm-tile-val">{detail}</span>
        <span className="rm-tile-cap">
          {t("itops.racks.deviceCount", { count: m.deviceCount })}
        </span>
      </span>
    </button>
  );
}

function FloorLegend({ metric }: { metric: FloorMetric }) {
  const { t } = useTranslation();
  const items =
    metric === "utilization"
      ? ([
          ["low", t("itops.floorPlan.util.low")],
          ["med", t("itops.floorPlan.util.med")],
          ["high", t("itops.floorPlan.util.high")],
          ["full", t("itops.floorPlan.util.full")],
          ["empty", t("itops.floorPlan.util.empty")],
        ] as const)
      : ([
          ["ok", t("itops.floorPlan.health.ok")],
          ["warning", t("itops.floorPlan.health.warning")],
          ["critical", t("itops.floorPlan.health.critical")],
          ["empty", t("itops.floorPlan.health.empty")],
        ] as const);

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
