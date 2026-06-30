// Top-down Server Room floor-plan metrics (docs/SITE.md Server Room View). The
// floor plan paints each Rack as a 2D footprint coloured by either its health
// (worst placed-device status) or its utilisation (occupied U / capacity),
// the DCIM floor-plan pattern. Pure + testable: no DOM, no theme lookups —
// the band strings drive the CSS colour mapping in itops.css.

import type { Rack, RackItem, RackItemStatus } from "../../types";

// Which dimension colours a rack footprint.
export type FloorMetric = "health" | "utilization";

// Worst-case rack health, derived from placed-device statuses. "empty" is its
// own band so an unpopulated rack reads as neutral rather than healthy.
export type RackHealth = "empty" | "ok" | "warning" | "critical";

// Utilisation heat band (cool → hot as a rack fills toward capacity).
export type UtilBand = "empty" | "low" | "med" | "high" | "full";

export interface RackFloorMetrics {
  /** Occupied rack units, clamped to capacity. */
  usedU: number;
  /** Rack capacity in U (never below 1). */
  capacityU: number;
  /** Occupied fraction, 0–1. */
  utilization: number;
  online: number;
  warning: number;
  offline: number;
  deviceCount: number;
  health: RackHealth;
  utilBand: UtilBand;
}

function itemStatus(item: RackItem): RackItemStatus {
  return item.metadata?.status ?? "online";
}

export function rackFloorMetrics(rack: Rack): RackFloorMetrics {
  let used = 0;
  let online = 0;
  let warning = 0;
  let offline = 0;
  for (const item of rack.items) {
    used += Math.max(0, item.heightU);
    const status = itemStatus(item);
    if (status === "warning") warning += 1;
    else if (status === "offline") offline += 1;
    else online += 1;
  }
  const capacityU = Math.max(1, rack.heightU);
  const usedU = Math.min(used, capacityU);
  const utilization = usedU / capacityU;
  const deviceCount = rack.items.length;

  const health: RackHealth =
    deviceCount === 0 ? "empty" : offline > 0 ? "critical" : warning > 0 ? "warning" : "ok";

  const utilBand: UtilBand =
    deviceCount === 0
      ? "empty"
      : utilization < 0.4
        ? "low"
        : utilization < 0.7
          ? "med"
          : utilization < 0.9
            ? "high"
            : "full";

  return { usedU, capacityU, utilization, online, warning, offline, deviceCount, health, utilBand };
}
