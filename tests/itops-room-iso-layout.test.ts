import assert from "node:assert/strict";
import test from "node:test";
import type { Rack } from "../src/types";
import {
  ISO_MIN_COLS,
  ISO_MIN_ROWS,
  ISO_TILT_COS,
  expandIsoFloorFrame,
  moveIsoRack,
  rackDepthFrac,
  rackFootprint,
  resolveIsoLayout,
  rotateCellForView,
  rotateRectForView,
  screenDeltaToPlane,
  type Facing,
  type IsoViewAngle,
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

function approx(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} should be close to ${expected}`);
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

test("rackDepthFrac scales displayed depth by the 1200 mm cell", () => {
  // 600 mm = half a cell, 1200 mm = the whole cell, ratio in between.
  assert.equal(rackDepthFrac(600), 0.5);
  assert.equal(rackDepthFrac(1200), 1);
  assert.equal(rackDepthFrac(900), 0.75);
  // Custom depths past 1200 mm still draw as one full cell; very shallow
  // ones keep a readable minimum, and nonsense falls back to a full cell.
  assert.equal(rackDepthFrac(1800), 1);
  assert.equal(rackDepthFrac(120), 0.25);
  assert.equal(rackDepthFrac(Number.NaN), 1);
});

test("rackFootprint keeps the front face flush on the facing borderline", () => {
  // Facing 0 = front toward +y: flush on the south border of the cell.
  assert.deepEqual(rackFootprint(0, 0.5), { x: 0, y: 0.5, w: 1, d: 0.5 });
  // Facing 2 = front toward −y: flush on the north border.
  assert.deepEqual(rackFootprint(2, 0.5), { x: 0, y: 0, w: 1, d: 0.5 });
  // Facing 1/3 run the depth along x, flush west/east respectively.
  assert.deepEqual(rackFootprint(1, 0.75), { x: 0, y: 0, w: 0.75, d: 1 });
  assert.deepEqual(rackFootprint(3, 0.75), { x: 0.25, y: 0, w: 0.75, d: 1 });
  // A 1200 mm cabinet fills its whole cell whatever it faces.
  for (const facing of [0, 1, 2, 3] as Facing[]) {
    assert.deepEqual(rackFootprint(facing, 1), { x: 0, y: 0, w: 1, d: 1 });
  }
});

test("rotateRectForView matches cell rotation for whole cells", () => {
  const cols = 10;
  const rows = 8;
  for (const angle of [0, 1, 2, 3] as IsoViewAngle[]) {
    const cell = rotateCellForView({ x: 4, y: 3 }, angle, cols, rows);
    assert.deepEqual(rotateRectForView({ x: 4, y: 3, w: 1, d: 1 }, angle, cols, rows), {
      x: cell.x,
      y: cell.y,
      w: 1,
      d: 1,
    });
  }
});

test("rotateRectForView preserves sub-cell room-object placement", () => {
  const cols = 10;
  const rows = 8;
  const bottomLeft = { x: 4.07, y: 3.61, w: 0.36, d: 0.28 };
  const opposite = rotateRectForView(bottomLeft, 2, cols, rows);

  approx(opposite.x, cols - (bottomLeft.x + bottomLeft.w));
  approx(opposite.y, rows - (bottomLeft.y + bottomLeft.d));
  approx(opposite.w, bottomLeft.w);
  approx(opposite.d, bottomLeft.d);
});

test("screenDeltaToPlane inverts the axonometric projection", () => {
  // Forward-project a known plane vector and check the round trip.
  const u = 56;
  const v = -28;
  const rot = Math.PI / 4;
  const sx = u * Math.cos(rot) - v * Math.sin(rot);
  const sy = (u * Math.sin(rot) + v * Math.cos(rot)) * ISO_TILT_COS;
  const back = screenDeltaToPlane(sx, sy);
  approx(back.u, u);
  approx(back.v, v);
});
