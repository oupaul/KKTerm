// Rack front elevation (docs/FLEET.md Phase C/D). Renders one Rack as a fixed-
// height column of U slots with its items at their U positions. With callbacks
// wired it is the editor: click an empty U to add a device; a placed host opens
// its Session on click (Phase D) with a pencil to edit; passive items open the
// edit dialog. A Connection-backed item whose Connection is gone renders as a
// dimmed "ghost". Drag-to-place lands in a later slice.

import { useTranslation } from "react-i18next";
import type { Rack, RackItem, RackItemKind } from "../../types";
import { ItIcon, type ItIconName } from "./icons";

// Pixel height of one rack unit (U) row. Kept in sync with `--rk-u` in CSS.
const U_PX = 22;

const KIND_ICON: Record<RackItemKind, ItIconName | null> = {
  connection: "server",
  server: "server",
  switch: "link",
  pdu: "power",
  patchPanel: "link",
  blank: null,
  label: null,
};

// Grid row for the top edge of an item: rows run top-down (row 1 = highest U),
// so an item's top U maps to `heightU - topU + 1`.
function itemRowStart(rackHeightU: number, item: RackItem): number {
  const topU = item.startU + item.heightU - 1;
  return rackHeightU - topU + 1;
}

export function RackElevation({
  rack,
  onSlotClick,
  onOpenItem,
  onEditItem,
  onEditRack,
  onDeleteRack,
  onRunRack,
  onMoveItem,
  isGhost,
}: {
  rack: Rack;
  onSlotClick?: (startU: number) => void;
  onOpenItem?: (item: RackItem) => void;
  onEditItem?: (item: RackItem) => void;
  onEditRack?: (rack: Rack) => void;
  onDeleteRack?: (rack: Rack) => void;
  onRunRack?: (rack: Rack) => void;
  /** Drag-drop a device onto a U slot (move/restack, possibly across racks). */
  onMoveItem?: (itemId: string, targetRackId: string, startU: number) => void;
  isGhost?: (item: RackItem) => boolean;
}) {
  const { t } = useTranslation();
  const editable = !!onEditItem;
  // Top-to-bottom U numbers: heightU … 1.
  const unitNumbers = Array.from({ length: rack.heightU }, (_, i) => rack.heightU - i);

  return (
    <div className="rk">
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
            className="it-icon-btn sm"
            title={t("itops.racks.deleteTitle")}
            onClick={() => onDeleteRack(rack)}
          >
            <ItIcon name="trash" size={13} />
          </button>
        ) : null}
      </div>
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
        {/* Empty slots — clickable to add a device when editing. */}
        {unitNumbers.map((u) =>
          onSlotClick ? (
            <button
              type="button"
              className="rk-slot rk-slot-btn"
              key={`s-${u}`}
              style={{ gridColumn: 2, gridRow: rack.heightU - u + 1 }}
              title={t("itops.racks.addAtUnit", { unit: u })}
              onClick={() => onSlotClick(u)}
              onDragOver={
                onMoveItem
                  ? (event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }
                  : undefined
              }
              onDrop={
                onMoveItem
                  ? (event) => {
                      event.preventDefault();
                      const itemId = event.dataTransfer.getData("application/x-itops-rack-item");
                      if (itemId) onMoveItem(itemId, rack.id, u);
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
          const icon = KIND_ICON[item.kind];
          const ghost = item.kind === "connection" && !!isGhost?.(item);
          const text = item.label || t(`itops.racks.kind.${item.kind}`);
          // A live host opens on click; everything else (passive, ghost) edits.
          const opens = item.kind === "connection" && !ghost && !!onOpenItem;
          const primary = opens ? () => onOpenItem!(item) : () => onEditItem?.(item);
          const accent = item.metadata?.accent;
          const style = {
            gridColumn: 2,
            gridRow: `${itemRowStart(rack.heightU, item)} / span ${item.heightU}`,
            ...(accent ? { boxShadow: `inset 3px 0 0 0 ${accent}` } : {}),
          } as const;
          const inner = (
            <>
              {icon ? (
                <span className="rk-item-ic">
                  <ItIcon name={icon} size={13} sw={1.6} />
                </span>
              ) : null}
              <span className="rk-item-label">{text}</span>
              {ghost ? <span className="rk-ghost-badge">{t("itops.racks.ghostBadge")}</span> : null}
            </>
          );
          const className = `rk-item kind-${item.kind}${ghost ? " ghost" : ""}`;
          if (!editable) {
            return (
              <div key={item.id} className={className} style={style} title={text}>
                {inner}
              </div>
            );
          }
          return (
            <div
              key={item.id}
              className={`${className} rk-item-row${onMoveItem ? " draggable" : ""}`}
              style={style}
              draggable={!!onMoveItem}
              onDragStart={
                onMoveItem
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
                {inner}
              </button>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
