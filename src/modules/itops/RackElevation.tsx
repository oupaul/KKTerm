// Rack front elevation (docs/FLEET.md Phase C). Renders one Rack as a fixed-
// height column of U slots with its items placed at their U positions. With the
// edit callbacks wired it becomes the dialogs-first editor: click an empty U to
// add a device, click an item to edit it, and edit/delete the rack from its
// header. Drag-to-place lands in a later slice.

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
  onItemClick,
  onEditRack,
  onDeleteRack,
}: {
  rack: Rack;
  onSlotClick?: (startU: number) => void;
  onItemClick?: (item: RackItem) => void;
  onEditRack?: (rack: Rack) => void;
  onDeleteRack?: (rack: Rack) => void;
}) {
  const { t } = useTranslation();
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
          const text = item.label || t(`itops.racks.kind.${item.kind}`);
          const body = (
            <>
              {icon ? (
                <span className="rk-item-ic">
                  <ItIcon name={icon} size={13} sw={1.6} />
                </span>
              ) : null}
              <span className="rk-item-label">{text}</span>
            </>
          );
          const style = {
            gridColumn: 2,
            gridRow: `${itemRowStart(rack.heightU, item)} / span ${item.heightU}`,
          } as const;
          return onItemClick ? (
            <button
              key={item.id}
              type="button"
              className={`rk-item rk-item-btn kind-${item.kind}`}
              style={style}
              title={text}
              onClick={() => onItemClick(item)}
            >
              {body}
            </button>
          ) : (
            <div key={item.id} className={`rk-item kind-${item.kind}`} style={style} title={text}>
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
