import assert from "node:assert/strict";
import test from "node:test";
import type { Rack } from "../src/types";
import {
  ROOM_CEILING_U,
  cellSpans,
  footprintSpans,
  nudgeZ,
  objectCellSpan,
  objectFootprint,
  objectSpec,
  resolveDropZ,
  sanitizeRoomObjects,
  type RoomObject,
} from "../src/modules/itops/roomObjects";
import {
  rotateCellForView,
  rotateFacingForView,
  sanitizeFacing,
  viewDeltaToGrid,
  viewGridSize,
  type IsoViewAngle,
} from "../src/modules/itops/roomIsoLayout";

function rack(id: string, heightU = 42): Rack {
  return {
    id,
    siteId: "site-1",
    name: id.toUpperCase(),
    serverRoom: "Room A",
    rackGroup: "",
    shell: null,
    background: null,
    heightU,
    depthMm: 1000,
    sortOrder: 0,
    items: [],
  };
}

function obj(id: string, kind: RoomObject["kind"], x: number, y: number, z: number): RoomObject {
  return { id, kind, x, y, z, rot: 0, corner: 0 };
}

test("cellSpans stacks the rack and every object sharing the cell", () => {
  const spans = cellSpans(
    { x: 1, y: 0 },
    [rack("a")],
    { a: { x: 1, y: 0 } },
    [obj("o1", "kuaikuai", 1, 0, 42), obj("o2", "camera", 0, 0, 52)],
  );
  // The camera sits in another cell; the rack (0..42) and the 乖乖 (42..44) count.
  assert.deepEqual(spans, [
    { z0: 0, z1: 42 },
    { z0: 42, z1: 44 },
  ]);
});

test("a 乖乖 pack dropped on an occupied cell stacks on the cabinet top", () => {
  const spans = cellSpans({ x: 0, y: 0 }, [rack("a")], { a: { x: 0, y: 0 } }, []);
  assert.equal(resolveDropZ(spans, "kuaikuai"), 42);
});

test("two objects share a cell only while their vertical spans do not intersect", () => {
  const existing = [obj("cam", "camera", 0, 0, 52)];
  const spans = cellSpans({ x: 0, y: 0 }, [], {}, existing);
  // A second camera prefers its default 52 but that overlaps → next fit above.
  assert.equal(resolveDropZ(spans, "camera"), 55);
  // A floor object is unaffected by the ceiling camera.
  assert.equal(resolveDropZ(spans, "fireExtinguisher"), 0);
});

test("resolveDropZ returns null when nothing fits below the ceiling", () => {
  // A CRAC unit (46U) on top of a 42U rack would poke through the ceiling.
  const spans = cellSpans({ x: 0, y: 0 }, [rack("a")], { a: { x: 0, y: 0 } }, []);
  assert.equal(resolveDropZ(spans, "aircon"), null);
  // Sanity: the spec really is too tall for the leftover headroom.
  assert.ok(42 + objectSpec("aircon").heightU > ROOM_CEILING_U);
});

test("nudgeZ moves to the next free level and clamps at floor/ceiling", () => {
  const spans = cellSpans({ x: 0, y: 0 }, [rack("a")], { a: { x: 0, y: 0 } }, []);
  // A 乖乖 on the rack top cannot go below (the rack blocks 0..42)…
  assert.equal(nudgeZ(spans, "kuaikuai", 42, -1), 42);
  // …but can move up one U, and never past the ceiling.
  assert.equal(nudgeZ(spans, "kuaikuai", 42, 1), 43);
  assert.equal(nudgeZ([], "kuaikuai", ROOM_CEILING_U - 2, 1), ROOM_CEILING_U - 2);
});

test("sanitizeRoomObjects drops malformed entries and rounds coordinates", () => {
  const parsed = sanitizeRoomObjects([
    { id: "ok", kind: "camera", x: 1.4, y: 2.6, z: 52.2, rot: 3, corner: 2 },
    { id: "legacy", kind: "sensor", x: 0, y: 0, z: 40, rot: 0 },
    { id: "bad-kind", kind: "sofa", x: 0, y: 0, z: 0, rot: 0 },
    { id: 42, kind: "camera", x: 0, y: 0, z: 0, rot: 0 },
    { id: "bad-x", kind: "camera", x: "left", y: 0, z: 0, rot: 0 },
    "not-an-object",
  ]);
  assert.deepEqual(parsed, [
    { id: "ok", kind: "camera", x: 1, y: 3, z: 52, rot: 3, corner: 2 },
    // Rows saved before corners existed default to the NW quadrant.
    { id: "legacy", kind: "sensor", x: 0, y: 0, z: 40, rot: 0, corner: 0 },
  ]);
});

test("quarter-block fixtures anchor to their cell corner", () => {
  // 乖乖 packs and other small fixtures cover one cell quadrant.
  assert.deepEqual(objectCellSpan("kuaikuai", 0), { w: 1, h: 1 });
  const spec = objectSpec("kuaikuai");
  assert.ok(spec.quarter);
  // NW quadrant: centred within [0, 0.5); SE quadrant shifts by half a cell.
  const nw = objectFootprint("kuaikuai", 0, 0);
  const se = objectFootprint("kuaikuai", 0, 2);
  assert.ok(nw.x >= 0 && nw.x + nw.w <= 0.5 && nw.y + nw.d <= 0.5);
  assert.equal(se.x, nw.x + 0.5);
  assert.equal(se.y, nw.y + 0.5);
  // Every quarter kind fits inside its quadrant.
  for (const kind of ["camera", "fireExtinguisher", "sensor", "smokeDetector"] as const) {
    const q = objectSpec(kind);
    assert.ok(q.quarter && q.wide <= 0.5 && q.deep <= 0.5, kind);
  }
});

test("large fixtures span whole cells and rotate their span", () => {
  // A CRAC unit is one and a half cells wide → it occupies a 2×1 cell span
  // and draws centred over it; rotating a quarter turn swaps the span.
  assert.deepEqual(objectCellSpan("aircon", 0), { w: 2, h: 1 });
  assert.deepEqual(objectCellSpan("aircon", 1), { w: 1, h: 2 });
  const fp = objectFootprint("aircon", 0, 0);
  assert.equal(fp.w, objectSpec("aircon").wide);
  assert.equal(fp.x, (2 - fp.w) / 2);
  // A cable tray section runs two cells long.
  assert.deepEqual(objectCellSpan("cableTray", 0), { w: 2, h: 1 });
});

test("cellSpans blocks every cell a multi-cell fixture covers", () => {
  const crac = obj("crac", "aircon", 1, 0, 0);
  // Both the anchor cell and the spanned neighbour are occupied…
  assert.equal(cellSpans({ x: 1, y: 0 }, [], {}, [crac]).length, 1);
  assert.equal(cellSpans({ x: 2, y: 0 }, [], {}, [crac]).length, 1);
  // …but the next cell over is free.
  assert.equal(cellSpans({ x: 3, y: 0 }, [], {}, [crac]).length, 0);
});

test("footprintSpans collision-checks a multi-cell fixture's whole span", () => {
  // A rack on the CRAC's second cell blocks the placement even though the
  // anchor cell itself is empty.
  const spans = footprintSpans({ x: 0, y: 0 }, "aircon", 0, [rack("a")], { a: { x: 1, y: 0 } }, []);
  assert.equal(resolveDropZ(spans, "aircon"), null);
  // With the neighbour clear, the CRAC lands on the floor.
  const clear = footprintSpans({ x: 0, y: 0 }, "aircon", 0, [rack("a")], { a: { x: 3, y: 0 } }, []);
  assert.equal(resolveDropZ(clear, "aircon"), 0);
});

test("view rotation maps cells, facings, and grid size consistently", () => {
  const cols = 6;
  const rows = 4;
  // A full turn returns home.
  let cell = { x: 2, y: 1 };
  let c = cols;
  let r = rows;
  for (let step = 0; step < 4; step += 1) {
    cell = rotateCellForView(cell, 1, c, r);
    ({ cols: c, rows: r } = viewGridSize(c, r, 1));
  }
  assert.deepEqual(cell, { x: 2, y: 1 });
  assert.deepEqual({ c, r }, { c: cols, r: rows });

  // Neighbouring cells along +x stay neighbours after rotation, and the
  // facing turns with them: a south-facing rack seen from angle 1 faces west.
  const a = rotateCellForView({ x: 2, y: 1 }, 1, cols, rows);
  const b = rotateCellForView({ x: 3, y: 1 }, 1, cols, rows);
  assert.deepEqual({ dx: b.x - a.x, dy: b.y - a.y }, { dx: 0, dy: 1 });
  assert.equal(rotateFacingForView(0, 1), 1);
  assert.equal(rotateFacingForView(3, 1), 0);
});

test("viewDeltaToGrid inverts the display-space drag for every angle", () => {
  for (const angle of [0, 1, 2, 3] as IsoViewAngle[]) {
    // Forward-map a grid displacement into display space the same way
    // rotateCellForView does, then invert it.
    const from = rotateCellForView({ x: 5, y: 5 }, angle, 12, 12);
    const to = rotateCellForView({ x: 7, y: 6 }, angle, 12, 12);
    const { dx, dy } = viewDeltaToGrid(to.x - from.x, to.y - from.y, angle);
    assert.deepEqual({ dx, dy }, { dx: 2, dy: 1 }, `angle ${angle}`);
  }
});

test("sanitizeFacing coerces unknown values to the default facing", () => {
  assert.equal(sanitizeFacing(2), 2);
  assert.equal(sanitizeFacing("2"), 0);
  assert.equal(sanitizeFacing(7), 0);
  assert.equal(sanitizeFacing(undefined), 0);
});
