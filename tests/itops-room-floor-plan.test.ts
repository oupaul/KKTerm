import assert from "node:assert/strict";
import test from "node:test";
import type { Rack, RackItem, RackItemStatus } from "../src/types";
import { rackFloorMetrics } from "../src/modules/itops/roomFloorPlan";

function item(
  startU: number,
  heightU: number,
  status?: RackItemStatus,
  powerW?: number,
): RackItem {
  return {
    id: `i-${startU}`,
    rackId: "rack-1",
    connectionId: null,
    kind: "server",
    label: "",
    startU,
    heightU,
    depthMm: 1000,
    metadata: { ...(status ? { status } : {}), ...(powerW ? { powerW } : {}) },
  };
}

function rack(items: RackItem[], heightU = 42, powerCapacityW?: number): Rack {
  return {
    id: "rack-1",
    siteId: "site-1",
    name: "A12",
    serverRoom: "Room A",
    rackGroup: "",
    shell: null,
    background: null,
    heightU,
    powerCapacityW: powerCapacityW ?? null,
    sortOrder: 0,
    items,
  };
}

test("an empty rack reads as neutral in both metrics", () => {
  const m = rackFloorMetrics(rack([]));
  assert.equal(m.deviceCount, 0);
  assert.equal(m.usedU, 0);
  assert.equal(m.utilization, 0);
  assert.equal(m.health, "empty");
  assert.equal(m.utilBand, "empty");
});

test("health takes the worst placed-device status", () => {
  assert.equal(rackFloorMetrics(rack([item(1, 1)])).health, "ok");
  assert.equal(rackFloorMetrics(rack([item(1, 1, "warning"), item(2, 1)])).health, "warning");
  assert.equal(
    rackFloorMetrics(rack([item(1, 1, "warning"), item(2, 1, "offline")])).health,
    "critical",
  );
});

test("utilisation occupies bands as the rack fills toward capacity", () => {
  // 4U of 42U ≈ 9.5% → low.
  assert.equal(rackFloorMetrics(rack([item(1, 4)])).utilBand, "low");
  // 21U of 42U = 50% → med.
  assert.equal(rackFloorMetrics(rack([item(1, 21)])).utilBand, "med");
  // 34U of 42U ≈ 81% → high.
  assert.equal(rackFloorMetrics(rack([item(1, 34)])).utilBand, "high");
  // 40U of 42U ≈ 95% → full.
  assert.equal(rackFloorMetrics(rack([item(1, 40)])).utilBand, "full");
});

test("power sums device draw and bands against the rack's capacity", () => {
  // No capacity set on a populated rack → "unknown", draw still summed.
  const unknown = rackFloorMetrics(rack([item(1, 1, undefined, 350), item(2, 1, undefined, 450)]));
  assert.equal(unknown.powerW, 800);
  assert.equal(unknown.powerCapacityW, null);
  assert.equal(unknown.powerRatio, null);
  assert.equal(unknown.powerBand, "unknown");

  // 800 W of 4000 W = 20% → low; 3800 W of 4000 W = 95% → full.
  assert.equal(
    rackFloorMetrics(rack([item(1, 1, undefined, 800)], 42, 4000)).powerBand,
    "low",
  );
  assert.equal(
    rackFloorMetrics(rack([item(1, 1, undefined, 3800)], 42, 4000)).powerBand,
    "full",
  );

  // Overcommitted draw keeps the ratio above 1 but stays in the "full" band.
  const over = rackFloorMetrics(rack([item(1, 1, undefined, 6000)], 42, 4000));
  assert.equal(over.powerBand, "full");
  assert.ok((over.powerRatio ?? 0) > 1);

  // An empty rack is "empty" even with capacity configured.
  assert.equal(rackFloorMetrics(rack([], 42, 4000)).powerBand, "empty");
});

test("occupied U is clamped to capacity and capacity is never below 1", () => {
  const m = rackFloorMetrics(rack([item(1, 50)], 42));
  assert.equal(m.usedU, 42);
  assert.equal(m.utilization, 1);
  assert.equal(rackFloorMetrics(rack([], 0)).capacityU, 1);
});
