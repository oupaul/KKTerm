// Single-rack stage (docs/SITE.md Rack View). Centers a <RackElevation> and
// overlays per-device "balloon" callouts that point to each device's U slot,
// alternating left and right with a leader line to the rack edge. Balloon Y is
// measured from the live device grid so it tracks the rack's variable header
// height; same-side balloons are nudged apart so they don't overlap.

import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Rack, RackItem, RackItemStatus, SiteHost } from "../../types";
import { childHostsOf, hostDisplayName } from "./hostTree";
import { selectRandomRackCallouts, summarizeRackDeviceMetadata } from "./rackInventory";
import { RackElevation, U_PX } from "./RackElevation";
import { KUAIGUAI_TOP_CLEARANCE_U } from "./rackPlacement";
import type { RackItemDraft } from "./RackItemDialog";

/** Child-host names for a device balloon: first two, then a "+N" overflow. */
const BALLOON_CHILD_HOSTS = 2;

const BALLOON_MIN_GAP = 44; // px between same-side balloon centers

const MIN_RACK_U_PX = 12;
const RACK_VERTICAL_CHROME_PX = 48;

/** Fit the cabinet to the visible Rack View height without enlarging its
 *  normal 26 px rack units. Very short windows retain a legible 12 px floor
 *  and let the drill pane scroll only when it is genuinely unavoidable. */
export function fittedRackUnitPx(
  availableHeight: number,
  rackHeightU: number,
  topClearanceU: number,
): number {
  const totalU = Math.max(1, rackHeightU + topClearanceU);
  const fitted = Math.floor((Math.max(0, availableHeight) - RACK_VERTICAL_CHROME_PX) / totalU);
  return Math.max(MIN_RACK_U_PX, Math.min(U_PX, fitted));
}

function itemStatus(item: RackItem): RackItemStatus {
  return item.metadata?.status ?? "online";
}

// One concise spec line per device kind.
function specOf(item: RackItem, t: (k: string, o?: Record<string, unknown>) => string): string {
  const summary = summarizeRackDeviceMetadata(item.metadata ?? {});
  if (summary.length > 0) return summary[0];
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
  hosts,
  hostFor,
  isGhost,
  onOpenItem,
  onEditItem,
  onBindItem,
  onEditRack,
  onDeleteRack,
  onRunRack,
  onMoveItem,
  onDeleteItem,
  editMode = false,
  placeSpec,
  onPlaceAt,
  onCancelPlacement,
}: {
  rack: Rack;
  /** The Site's Host inventory; devices with a bound `metadata.hostId` list
   *  their Host and its child Hosts (VMs/containers) in the balloon callout. */
  hosts?: SiteHost[];
  hostFor?: (item: RackItem) => string | null;
  isGhost?: (item: RackItem) => boolean;
  onOpenItem?: (item: RackItem, anchor: HTMLElement) => void;
  onEditItem?: (item: RackItem) => void;
  onBindItem?: (item: RackItem) => void;
  onEditRack?: (rack: Rack) => void;
  onDeleteRack?: (rack: Rack) => void;
  onRunRack?: (rack: Rack) => void;
  onMoveItem?: (itemId: string, targetRackId: string, startU: number) => void;
  onDeleteItem?: (item: RackItem) => void;
  editMode?: boolean;
  /** Armed picker placement pass-through (see RackElevation). */
  placeSpec?: RackItemDraft | null;
  onPlaceAt?: (startU: number) => void;
  onCancelPlacement?: () => void;
}) {
  const { t } = useTranslation();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [unitPx, setUnitPx] = useState(U_PX);
  const [geom, setGeom] = useState<{ top: number; height: number; left: number; right: number } | null>(
    null,
  );
  const randomCallouts = selectRandomRackCallouts(rack.items, rack.id, 2);

  // Rack View is the only elevation that adapts its U height to the current
  // drill viewport. Other rack previews keep their normal fixed-size skin.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const drill = stage.closest(".ft-drill") as HTMLElement | null;
    const measure = () => {
      const stageTop = stage.getBoundingClientRect().top;
      const drillBottom = drill?.getBoundingClientRect().bottom ?? window.innerHeight;
      const visibleBottom = Math.min(window.innerHeight, drillBottom);
      const availableHeight = Math.max(0, visibleBottom - stageTop - 4);
      setUnitPx(fittedRackUnitPx(availableHeight, rack.heightU, KUAIGUAI_TOP_CLEARANCE_U));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(drill ?? stage);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [rack.heightU]);

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
          unitPx={unitPx}
          hideHeader
          reserveTopU={KUAIGUAI_TOP_CLEARANCE_U}
          hostFor={hostFor}
          isGhost={isGhost}
          editMode={editMode}
          onOpenItem={onOpenItem}
          onEditItem={onEditItem}
          onBindItem={onBindItem}
          onEditRack={onEditRack}
          onDeleteRack={onDeleteRack}
          onRunRack={onRunRack}
          onMoveItem={onMoveItem}
          onDeleteItem={onDeleteItem}
          placeSpec={placeSpec}
          onPlaceAt={onPlaceAt}
          onCancelPlacement={onCancelPlacement}
        />
      </div>
      {geom
        ? balloons.map((b) => {
            const status = isGhost?.(b.item) ? "offline" : itemStatus(b.item);
            const spec = specOf(b.item, t);
            const sub = hostFor?.(b.item);
            const boundHost = b.item.metadata?.hostId
              ? hosts?.find((entry) => entry.id === b.item.metadata?.hostId)
              : undefined;
            const childHosts = boundHost ? childHostsOf(hosts ?? [], boundHost.id) : [];
            const shownChildren = childHosts.slice(0, BALLOON_CHILD_HOSTS);
            const overflow = childHosts.length - shownChildren.length;
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
                  {boundHost ? (
                    <span className="rk-balloon-hosts">
                      <span className="hostname">{boundHost.hostname}</span>
                      {shownChildren.map((child) => (
                        <span key={child.id} className="child">
                          {hostDisplayName(child)}
                        </span>
                      ))}
                      {overflow > 0 ? (
                        <span className="more">
                          {t("itops.hosts.childOverflow", { count: overflow })}
                        </span>
                      ) : null}
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
      {randomCallouts.length > 0 ? (
        <div className="rack-random-callouts">
          {randomCallouts.map((callout) => {
            const item = rack.items.find((entry) => entry.id === callout.itemId);
            return (
              <button
                key={callout.itemId}
                type="button"
                onClick={() => item && onEditItem?.(item)}
              >
                <span>{callout.label}</span>
                {callout.text ? <small>{callout.text}</small> : null}
                {callout.connectionIds.length > 0 ? (
                  <small>{t("itops.racks.boundConnectionCount", { count: callout.connectionIds.length })}</small>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
