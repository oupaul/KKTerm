// Rack front elevation (docs/SITE.md Rack View). Renders one Rack as a
// skeuomorphic metal frame — rail caps, a U-number gutter, and a slatted device
// column — with each Rack Device drawn as an animated <RackDevice> faceplate at
// its U position (ported from the "IT Ops Racks" design comp). With callbacks
// wired it is the editor: click an empty U to add a device; a placed host opens
// its Session on click with a pencil to edit; passive items open the edit
// dialog. A Connection-backed item whose Connection is gone renders as a dimmed
// "ghost". Items are drag-to-restacked onto any U slot (possibly across racks).

import { useTranslation } from "react-i18next";
import type { Rack, RackItem, RackItemStatus } from "../../types";
import { ItIcon } from "./icons";
import { summarizeRackDeviceMetadata } from "./rackInventory";
import { RackDevice } from "./RackDevice";

// Pixel height of one rack unit (U) row. Kept in sync with `--rk-u` in CSS.
export const U_PX = 26;

function itemStatus(item: RackItem): RackItemStatus {
  return item.metadata?.status ?? "online";
}

// Grid row for the top edge of an item: rows run top-down (row 1 = highest U),
// so an item's top U maps to `heightU - topU + 1`.
function itemRowStart(rackHeightU: number, item: RackItem): number {
  const topU = item.startU + item.heightU - 1;
  return rackHeightU - topU + 1;
}

export function RackElevation({
  rack,
  hostFor,
  onSlotClick,
  onOpenItem,
  onEditItem,
  onBindItem,
  onEditRack,
  onDeleteRack,
  onRunRack,
  onMoveItem,
  onDeleteItem,
  isGhost,
  detailed,
  editMode = false,
}: {
  rack: Rack;
  /** Resolve a placed Connection's host/ip for the faceplate sub-line. */
  hostFor?: (item: RackItem) => string | null;
  onSlotClick?: (startU: number) => void;
  onOpenItem?: (item: RackItem) => void;
  onEditItem?: (item: RackItem) => void;
  onBindItem?: (item: RackItem) => void;
  onEditRack?: (rack: Rack) => void;
  onDeleteRack?: (rack: Rack) => void;
  onRunRack?: (rack: Rack) => void;
  /** Drag-drop a device onto a U slot (move/restack, possibly across racks). */
  onMoveItem?: (itemId: string, targetRackId: string, startU: number) => void;
  onDeleteItem?: (item: RackItem) => void;
  isGhost?: (item: RackItem) => boolean;
  /** Single-rack detail view: wider cabinet + a placed-device summary list. */
  detailed?: boolean;
  editMode?: boolean;
}) {
  const { t } = useTranslation();
  const editable = !!onEditItem;
  const canMove = editMode && !!onMoveItem;
  // Top-to-bottom U numbers: heightU … 1.
  const unitNumbers = Array.from({ length: rack.heightU }, (_, i) => rack.heightU - i);

  // Status tallies for the header pills (passive items default to online).
  let online = 0;
  let warning = 0;
  let offline = 0;
  for (const item of rack.items) {
    const s = itemStatus(item);
    if (s === "warning") warning += 1;
    else if (s === "offline") offline += 1;
    else online += 1;
  }

  // Stagger the slide-in by visual order (top of rack first).
  const order = new Map(
    [...rack.items]
      .sort((a, b) => b.startU + b.heightU - (a.startU + a.heightU))
      .map((item, index) => [item.id, index] as const),
  );

  const cabShell = rack.shell && rack.shell !== "black" ? rack.shell : undefined;
  // Placed devices, top-of-rack first, for the detail summary list.
  const placed = [...rack.items].sort(
    (a, b) => b.startU + b.heightU - (a.startU + a.heightU),
  );

  return (
    <div className={`rk${detailed ? " rk-detailed" : ""}`} data-shell={cabShell}>
      <div className="rk-head">
        <div className="rk-head-txt">
          <span className="rk-name">{rack.name}</span>
          <span className="rk-meta">
            {t("itops.racks.unitCount", { count: rack.heightU })}
            {rack.items.length > 0
              ? `  ·  ${t("itops.racks.deviceCount", { count: rack.items.length })}`
              : ""}
          </span>
        </div>
        {rack.items.length > 0 ? (
          <div className="rk-pills">
            <span className="rk-pill on" title={t("itops.racks.status.online")}>
              <span className="dot" />
              {online}
            </span>
            {warning > 0 ? (
              <span className="rk-pill warn" title={t("itops.racks.status.warning")}>
                <span className="dot" />
                {warning}
              </span>
            ) : null}
            {offline > 0 ? (
              <span className="rk-pill off" title={t("itops.racks.status.offline")}>
                <span className="dot" />
                {offline}
              </span>
            ) : null}
          </div>
        ) : null}
        {onRunRack ? (
          <button
            type="button"
            className="it-icon-btn sm"
            title={t("itops.racks.runRack")}
            onClick={() => onRunRack(rack)}
          >
            <ItIcon name="run" size={12} />
          </button>
        ) : null}
        {onEditRack ? (
          <button
            type="button"
            className="it-icon-btn sm"
            title={t("itops.racks.editTitle")}
            onClick={() => onEditRack(rack)}
          >
            <ItIcon name="edit" size={13} />
          </button>
        ) : null}
        {onDeleteRack ? (
          <button
            type="button"
            className="it-icon-btn sm danger"
            title={t("itops.racks.deleteTitle")}
            onClick={() => onDeleteRack(rack)}
          >
            <ItIcon name="xmark" size={12} />
          </button>
        ) : null}
      </div>

      <div className="rk-frame">
        <div className="rk-rail" />
        <div className="rk-bay">
          <div
            className="rk-grid"
            style={{ gridTemplateRows: `repeat(${rack.heightU}, var(--rk-u, ${U_PX}px))` }}
          >
            {/* U-number gutter. */}
            {unitNumbers.map((u) => (
              <div className="rk-u" key={`u-${u}`} style={{ gridRow: rack.heightU - u + 1 }}>
                {u}
              </div>
            ))}
            {/* Empty slots — clickable to add a device when editing; drop targets. */}
            {unitNumbers.map((u) =>
              editMode && onSlotClick ? (
                <button
                  type="button"
                  className="rk-slot rk-slot-btn"
                  key={`s-${u}`}
                  style={{ gridColumn: 2, gridRow: rack.heightU - u + 1 }}
                  title={t("itops.racks.addAtUnit", { unit: u })}
                  onClick={() => onSlotClick(u)}
                  onDragOver={
                    canMove
                      ? (event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }
                      : undefined
                  }
                  onDrop={
                    canMove
                      ? (event) => {
                          event.preventDefault();
                          const itemId = event.dataTransfer.getData("application/x-itops-rack-item");
                          if (itemId) onMoveItem?.(itemId, rack.id, u);
                        }
                      : undefined
                  }
                />
              ) : (
                <div
                  className="rk-slot"
                  key={`s-${u}`}
                  style={{ gridColumn: 2, gridRow: rack.heightU - u + 1 }}
                />
              ),
            )}
            {/* Items paint over the empty slots they occupy. */}
            {rack.items.map((item) => {
              const ghost = item.kind === "connection" && !!isGhost?.(item);
              const text = item.label || t(`itops.racks.kind.${item.kind}`);
              // A live host opens on click; everything else (passive, ghost) edits.
              const opens = item.kind === "connection" && !ghost && !!onOpenItem;
              const primary = opens ? () => onOpenItem!(item) : () => onEditItem?.(item);
              const delay = `${(order.get(item.id) ?? 0) * 0.045}s`;
              const style = {
                gridColumn: 2,
                gridRow: `${itemRowStart(rack.heightU, item)} / span ${item.heightU}`,
                animationDelay: delay,
              } as const;
              const face = (
                <RackDevice
                  kind={item.kind}
                  label={text}
                  subLabel={hostFor?.(item) ?? null}
                  status={ghost ? "offline" : itemStatus(item)}
                  ports={item.metadata?.ports ?? null}
                  disks={item.metadata?.disks ?? null}
                  battery={item.metadata?.battery ?? null}
                  load={item.metadata?.load ?? null}
                  expiry={item.metadata?.expiry ?? null}
                  rotation={item.metadata?.rotation ?? null}
                  yaw={item.metadata?.yaw ?? null}
                  kuaiguaiSize={item.metadata?.kuaiguaiSize ?? null}
                  heightU={item.heightU}
                  accent={item.metadata?.accent ?? null}
                  shell={item.metadata?.shell ?? null}
                  seed={item.id}
                />
              );
              const className = `rk-item dev-in${ghost ? " ghost" : ""}`;
              if (!editable) {
                return (
                  <div key={item.id} className={className} style={style} title={text}>
                    {face}
                    {ghost ? (
                      <span className="rk-ghost-badge">{t("itops.racks.ghostBadge")}</span>
                    ) : null}
                  </div>
                );
              }
              return (
                <div
                  key={item.id}
                  className={`${className} rk-item-row${canMove ? " draggable" : ""}${editMode ? " editing" : ""}`}
                  style={style}
                  draggable={canMove}
                  onDragStart={
                    canMove
                      ? (event) => {
                          event.dataTransfer.setData("application/x-itops-rack-item", item.id);
                          event.dataTransfer.effectAllowed = "move";
                        }
                      : undefined
                  }
                >
                  <button
                    type="button"
                    className="rk-item-main"
                    title={opens ? t("itops.racks.openTitle", { name: text }) : text}
                    onClick={primary}
                  >
                    {face}
                  </button>
                  {ghost ? (
                    <span className="rk-ghost-badge">{t("itops.racks.ghostBadge")}</span>
                  ) : null}
                  {opens ? (
                    <button
                      type="button"
                      className="rk-item-edit"
                      title={t("itops.racks.editItemTitle")}
                      onClick={() => onEditItem?.(item)}
                    >
                      <ItIcon name="edit" size={11} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rk-item-bind"
                    title={t("itops.racks.bindingsAction")}
                    aria-label={t("itops.racks.bindingsAction")}
                    onClick={(event) => { event.stopPropagation(); onBindItem?.(item); }}
                  >
                    <ItIcon name="link" size={11} />
                  </button>
                  {editMode && onDeleteItem ? (
                    <button
                      type="button"
                      className="rk-item-delete"
                      title={t("itops.racks.deleteItemTitle")}
                      aria-label={t("itops.racks.deleteItemTitle")}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteItem(item);
                      }}
                    >
                      <ItIcon name="xmark" size={11} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <div className="rk-rail" />
      </div>
      {detailed ? (
        <div className="rk-detail-list">
          <div className="rk-detail-h">{t("itops.racks.placedDevices")}</div>
          {placed.length === 0 ? (
            <div className="rk-detail-empty">{t("itops.racks.empty")}</div>
          ) : (
            placed.map((item) => {
              const status = itemStatus(item);
              const summary = summarizeRackDeviceMetadata(item.metadata ?? {});
              return (
                <button
                  key={item.id}
                  type="button"
                  className="rk-detail-row"
                  onClick={() => onEditItem?.(item)}
                >
                  <span className={`rk-detail-dot ${status}`} />
                  <span className="rk-detail-nm">
                    {item.label || t(`itops.racks.kind.${item.kind}`)}
                  </span>
                  <span className="rk-detail-u">
                    {`U${item.startU}`}
                    {item.heightU > 1 ? `–${item.startU + item.heightU - 1}` : ""}
                  </span>
                  {summary[0] ? (
                    <span className="rk-detail-meta">{summary[0]}</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
