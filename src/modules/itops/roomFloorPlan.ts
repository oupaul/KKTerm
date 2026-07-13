// Top-down Server Room floor-plan metrics (docs/SITE.md Server Room View). The
// floor plan paints each Rack as a 2D footprint coloured by its health (worst
// placed-device status), its utilisation (occupied U / capacity), or its power
// load (summed device draw / rack feed capacity) — the DCIM floor-plan pattern.
// Pure + testable: no DOM, no theme lookups — the band strings drive the CSS
// colour mapping in itops.css.

import type { Rack, RackItem, RackItemStatus } from "../../types";

// Worst-case rack health, derived from placed-device statuses. "empty" is its
// own band so an unpopulated rack reads as neutral rather than healthy.
export type RackHealth = "empty" | "ok" | "warning" | "critical";

// Utilisation heat band (cool → hot as a rack fills toward capacity).
export type UtilBand = "empty" | "low" | "med" | "high" | "full";

// Power heat band: like utilisation but against the rack's feed capacity;
// "unknown" marks a populated rack with no capacity configured.
export type PowerBand = "empty" | "unknown" | "low" | "med" | "high" | "full";

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
  /** Summed device power draw in watts. */
  powerW: number;
  /** Rack feed/PDU capacity in watts; null when unset. */
  powerCapacityW: number | null;
  /** Draw / capacity, 0–1+ (may exceed 1 when overcommitted); null = no capacity. */
  powerRatio: number | null;
  powerBand: PowerBand;
}

function itemStatus(item: RackItem): RackItemStatus {
  return item.metadata?.status ?? "online";
}

function heatBand(ratio: number): "low" | "med" | "high" | "full" {
  return ratio < 0.4 ? "low" : ratio < 0.7 ? "med" : ratio < 0.9 ? "high" : "full";
}

export function rackFloorMetrics(rack: Rack): RackFloorMetrics {
  let used = 0;
  let online = 0;
  let warning = 0;
  let offline = 0;
  let powerW = 0;
  for (const item of rack.items) {
    if (item.startU <= rack.heightU) used += Math.max(0, item.heightU);
    powerW += Math.max(0, item.metadata?.powerW ?? 0);
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

  const utilBand: UtilBand = deviceCount === 0 ? "empty" : heatBand(utilization);

  const powerCapacityW =
    rack.powerCapacityW != null && rack.powerCapacityW > 0 ? rack.powerCapacityW : null;
  const powerRatio = powerCapacityW != null ? powerW / powerCapacityW : null;
  const powerBand: PowerBand =
    deviceCount === 0
      ? "empty"
      : powerRatio == null
        ? "unknown"
        : heatBand(Math.min(1, powerRatio));

  return {
    usedU,
    capacityU,
    utilization,
    online,
    warning,
    offline,
    deviceCount,
    health,
    utilBand,
    powerW,
    powerCapacityW,
    powerRatio,
    powerBand,
  };
}
