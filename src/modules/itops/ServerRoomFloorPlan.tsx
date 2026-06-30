// Top-down Server Room View (docs/SITE.md Server Room View). A 2D room
// footprint: each Rack is drawn as a tile laid out by its `rackGroup` row
// (the physical rack rows in the room), coloured by health or utilisation —
// the DCIM floor-plan pattern. Clicking a tile drills into that Rack's
// elevation. Pure presentation over the `racksBySite` store; the colour bands
// come from `rackFloorMetrics` and are painted by `.rm-*` rules in itops.css.

import { useTranslation } from "react-i18next";
import type { Rack } from "../../types";
import { groupRacksByGroup } from "./rackTopology";
import { rackFloorMetrics, type FloorMetric } from "./roomFloorPlan";

export function ServerRoomFloorPlan({
  racks,
  metric,
  onSelectRack,
}: {
  racks: Rack[];
  metric: FloorMetric;
  onSelectRack: (rackId: string) => void;
}) {
  const { t } = useTranslation();
  const ungrouped = t("itops.racks.ungrouped");
  const rows = groupRacksByGroup(racks);

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
