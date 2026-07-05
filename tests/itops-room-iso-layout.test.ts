import assert from "node:assert/strict";
import test from "node:test";
import type { Rack } from "../src/types";
import {
  ISO_MIN_COLS,
  ISO_MIN_ROWS,
  ISO_TILT_COS,
  expandIsoFloorFrame,
  moveIsoRack,
  resolveIsoLayout,
  screenDeltaToPlane,
} from "../src/modules/itops/roomIsoLayout";

function rack(id: string, rackGroup = ""): Rack {
  return {
    id,
    siteId: "site-1",
    name: id.toUpperCase(),
    serverRoom: "Room A",
    rackGroup,
    shell: null,
    background: null,
    heightU: 42,
    depthMm: 1000,
    sortOrder: 0,
    items: [],
  };
}

test("unplaced racks default to one floor row per rack group with an aisle between", () => {
  const layout = resolveIsoLayout(
    [rack("a", "Row 1"), rack("b", "Row 1"), rack("c", "Row 2")],
    {},
  );
  assert.deepEqual(layout.cells.a, { x: 0, y: 0 });
  assert.deepEqual(layout.cells.b, { x: 1, y: 0 });
  // Second group skips a row so rows read as aisles.
  assert.deepEqual(layout.cells.c, { x: 0, y: 2 });
});

test("stored placements win and collisions slide right instead of stacking", () => {
  const layout = resolveIsoLayout([rack("a"), rack("b"), rack("c")], {
    a: { x: 3, y: 1 },
    b: { x: 3.2, y: 0.8 }, // rounds onto a's cell → slides to the next free one
  });
  assert.deepEqual(layout.cells.a, { x: 3, y: 1 });
  assert.deepEqual(layout.cells.b, { x: 4, y: 1 });
  // c has no stored cell and takes the default row origin.
  assert.deepEqual(layout.cells.c, { x: 0, y: 0 });
});

test("the grid always leaves free margin around the outermost cabinet", () => {
  const empty = resolveIsoLayout([], {});
  assert.equal(empty.cols, ISO_MIN_COLS);
  assert.equal(empty.rows, ISO_MIN_ROWS);

  const wide = resolveIsoLayout([rack("a")], { a: { x: 9, y: 7 } });
  assert.ok(wide.cols >= 12);
  assert.ok(wide.rows >= 10);
});

test("moveIsoRack clamps to the grid and swaps with an occupied target", () => {
  const layout = resolveIsoLayout([rack("a"), rack("b")], {
    a: { x: 0, y: 0 },
    b: { x: 2, y: 1 },
  });
  const swapped = moveIsoRack(layout, "a", { x: 2, y: 1 });
  assert.deepEqual(swapped.a, { x: 2, y: 1 });
  assert.deepEqual(swapped.b, { x: 0, y: 0 });

  const clamped = moveIsoRack(layout, "a", { x: -4, y: 999 });
  assert.deepEqual(clamped.a, { x: 0, y: layout.rows - 1 });
});

test("decorative 2.5D floor expansion keeps the room grid origin aligned", () => {
  const frame = expandIsoFloorFrame(6, 4, 18 * 58 * Math.SQRT1_2, 58);
  assert.ok(frame.floorCols > 6);
  assert.ok(frame.floorRows > 4);
  assert.equal(frame.offX, 0);
  assert.equal(frame.offY, 0);
});

test("screenDeltaToPlane inverts the axonometric projection", () => {
  // Forward-project a known plane vector and check the round trip.
  const u = 56;
  const v = -28;
  const rot = Math.PI / 4;
  const sx = u * Math.cos(rot) - v * Math.sin(rot);
  const sy = (u * Math.sin(rot) + v * Math.cos(rot)) * ISO_TILT_COS;
  const back = screenDeltaToPlane(sx, sy);
  assert.ok(Math.abs(back.u - u) < 1e-9);
  assert.ok(Math.abs(back.v - v) < 1e-9);
});
