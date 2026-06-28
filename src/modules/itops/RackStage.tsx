// Single-rack stage (docs/FLEET.md Rack View). Centers a <RackElevation> and
// overlays per-device "balloon" callouts that point to each device's U slot,
// alternating left and right with a leader line to the rack edge. Balloon Y is
// measured from the live device grid so it tracks the rack's variable header
// height; same-side balloons are nudged apart so they don't overlap.

import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Rack, RackItem, RackItemStatus } from "../../types";
import { RackElevation } from "./RackElevation";

const BALLOON_MIN_GAP = 44; // px between same-side balloon centers

function itemStatus(item: RackItem): RackItemStatus {
  return item.metadata?.status ?? "online";
}

// One concise spec line per device kind.
function specOf(item: RackItem, t: (k: string, o?: Record<string, unknown>) => string): string {
  const m = item.metadata ?? {};
  switch (item.kind) {
    case "switch":
    case "router":
    case "patchPanel":
      return m.ports != null ? t("itops.racks.portsSpec", { count: m.ports }) : "";
    case "server":
    case "storage":
    case "connection":
      return m.disks != null ? t("itops.racks.disksSpec", { count: m.disks }) : "";
    case "ups":
      return m.battery != null ? `${m.battery}%` : "";
    case "pdu":
      return m.load != null ? `${m.load}%` : "";
    default:
      return "";
  }
}

interface Balloon {
  item: RackItem;
  side: "left" | "right";
  y: number; // px from stage top
}

export function RackStage({
  rack,
  hostFor,
  isGhost,
  onSlotClick,
  onOpenItem,
  onEditItem,
  onEditRack,
  onDeleteRack,
  onRunRack,
  onMoveItem,
}: {
  rack: Rack;
  hostFor?: (item: RackItem) => string | null;
  isGhost?: (item: RackItem) => boolean;
  onSlotClick?: (startU: number) => void;
  onOpenItem?: (item: RackItem) => void;
  onEditItem?: (item: RackItem) => void;
  onEditRack?: (rack: Rack) => void;
  onDeleteRack?: (rack: Rack) => void;
  onRunRack?: (rack: Rack) => void;
  onMoveItem?: (itemId: string, targetRackId: string, startU: number) => void;
}) {
  const { t } = useTranslation();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [geom, setGeom] = useState<{ top: number; height: number; left: number; right: number } | null>(
    null,
  );

  // Measure the device grid relative to the stage so balloons anchor to the
  // right U rows regardless of the rack header's height.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const grid = stage.querySelector(".rk-grid") as HTMLElement | null;
      if (!grid) return;
      const s = stage.getBoundingClientRect();
      const g = grid.getBoundingClientRect();
      setGeom({ top: g.top - s.top, height: g.height, left: g.left - s.left, right: g.right - s.left });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [rack.id, rack.heightU, rack.items.length]);

  // Build balloons: alternate sides by top-of-rack order, then enforce a
  // minimum vertical gap within each side so callouts don't collide.
  let balloons: Balloon[] = [];
  if (geom && rack.items.length > 0) {
    const rowPx = geom.height / rack.heightU;
    const ordered = [...rack.items].sort(
      (a, b) => b.startU + b.heightU - (a.startU + a.heightU),
    );
    balloons = ordered.map((item, index) => {
      const topRow0 = rack.heightU - (item.startU + item.heightU - 1);
      const y = geom.top + (topRow0 + item.heightU / 2) * rowPx;
      return { item, side: index % 2 === 0 ? "left" : ("right" as const), y };
    });
    for (const side of ["left", "right"] as const) {
      let prev = -Infinity;
      for (const b of balloons.filter((x) => x.side === side)) {
        if (b.y - prev < BALLOON_MIN_GAP) b.y = prev + BALLOON_MIN_GAP;
        prev = b.y;
      }
    }
  }

  return (
    <div className="rk-stage" ref={stageRef}>
      <div className="rk-stage-rack">
        <RackElevation
          rack={rack}
          hostFor={hostFor}
          isGhost={isGhost}
          onSlotClick={onSlotClick}
          onOpenItem={onOpenItem}
          onEditItem={onEditItem}
          onEditRack={onEditRack}
          onDeleteRack={onDeleteRack}
          onRunRack={onRunRack}
          onMoveItem={onMoveItem}
        />
      </div>
      {geom
        ? balloons.map((b) => {
            const status = isGhost?.(b.item) ? "offline" : itemStatus(b.item);
            const spec = specOf(b.item, t);
            const sub = hostFor?.(b.item);
            // Left balloons fill from the stage's left edge to the rack's left
            // edge; right balloons from the rack's right edge to the stage's end.
            const style =
              b.side === "left"
                ? { top: b.y, left: 0, width: geom.left }
                : { top: b.y, left: geom.right, right: 0 };
            const box = (
              <span className="rk-balloon-box">
                <span className={`rk-balloon-dot ${status}`} />
                <span className="rk-balloon-txt">
                  <span className="rk-balloon-nm">
                    {b.item.label || t(`itops.racks.kind.${b.item.kind}`)}
                  </span>
                  {sub || spec ? (
                    <span className="rk-balloon-meta">
                      {sub ? <span className="host">{sub}</span> : null}
                      {spec ? <span className="spec">{spec}</span> : null}
                    </span>
                  ) : null}
                </span>
              </span>
            );
            return (
              <div
                key={b.item.id}
                className={`rk-balloon ${b.side}`}
                style={style}
                onClick={() => onEditItem?.(b.item)}
              >
                {b.side === "right" ? <span className="rk-balloon-leader" /> : null}
                {box}
                {b.side === "left" ? <span className="rk-balloon-leader" /> : null}
              </div>
            );
          })
        : null}
    </div>
  );
}
