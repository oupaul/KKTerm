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
  objectSurfaceAnchor,
  objectSpec,
  resolveDropZ,
  sanitizeRoomObjects,
  settleRoomObjects,
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

test("rack-top stacking only counts the drawn cabinet footprint", () => {
  const shallow = rack("a");
  shallow.depthMm = 600;
  const cells = { a: { x: 0, y: 0 } };
  const racks = [shallow];
  const supportedCorners = {
    0: [2, 3],
    1: [0, 3],
    2: [0, 1],
    3: [1, 2],
  } as const;

  for (const facing of [0, 1, 2, 3] as const) {
    for (const corner of [0, 1, 2, 3] as const) {
      const spans = footprintSpans(
        { x: 0, y: 0 },
        "kuaikuai",
        0,
        racks,
        cells,
        [],
        undefined,
        corner,
        { a: facing },
      );
      const expected = supportedCorners[facing].includes(corner) ? 42 : 0;
      assert.equal(resolveDropZ(spans, "kuaikuai"), expected, `facing ${facing} corner ${corner}`);
    }
  }
});

test("quarter objects in different rack corners share the same rack top", () => {
  const racks = [rack("a")];
  const cells = { a: { x: 0, y: 0 } };
  const existing = [{ ...obj("left", "kuaikuai", 0, 0, 42), corner: 3 as const }];

  const otherCorner = footprintSpans(
    { x: 0, y: 0 },
    "kuaikuai",
    0,
    racks,
    cells,
    existing,
    undefined,
    2,
    { a: 0 },
  );
  assert.equal(resolveDropZ(otherCorner, "kuaikuai"), 42);

  const sameCorner = footprintSpans(
    { x: 0, y: 0 },
    "kuaikuai",
    0,
    racks,
    cells,
    existing,
    undefined,
    3,
    { a: 0 },
  );
  assert.equal(resolveDropZ(sameCorner, "kuaikuai"), 44);
});

test("settleRoomObjects repairs stale raised rack-top corner placements", () => {
  const racks = [rack("a")];
  const cells = { a: { x: 0, y: 0 } };
  const objects: RoomObject[] = [
    { ...obj("left", "kuaikuai", 0, 0, 42), corner: 3 },
    { ...obj("right", "kuaikuai", 0, 0, 44), corner: 2 },
  ];

  assert.deepEqual(
    settleRoomObjects(objects, racks, cells, { a: 0 }).map((object) => ({
      id: object.id,
      z: object.z,
      corner: object.corner,
    })),
    [
      { id: "left", z: 42, corner: 3 },
      { id: "right", z: 42, corner: 2 },
    ],
  );
});

test("settleRoomObjects preserves intentional same-corner stacks", () => {
  const racks = [rack("a")];
  const cells = { a: { x: 0, y: 0 } };
  const objects: RoomObject[] = [
    { ...obj("bottom", "kuaikuai", 0, 0, 42), corner: 3 },
    { ...obj("top", "kuaikuai", 0, 0, 44), corner: 3 },
  ];

  assert.deepEqual(
    settleRoomObjects(objects, racks, cells, { a: 0 }).map((object) => ({
      id: object.id,
      z: object.z,
      corner: object.corner,
    })),
    [
      { id: "bottom", z: 42, corner: 3 },
      { id: "top", z: 44, corner: 3 },
    ],
  );
});

test("gravity objects land on the lowest fitting surface", () => {
  const spans = cellSpans(
    { x: 0, y: 0 },
    [rack("a")],
    { a: { x: 0, y: 0 } },
    [obj("cam", "camera", 0, 0, 52)],
  );
  assert.equal(resolveDropZ(spans, "kuaikuai"), 42);
  assert.equal(resolveDropZ(spans, "kuaikuai", 52), 42);
});

test("floor objects do not keep a stale raised level when moved", () => {
  assert.equal(resolveDropZ([], "ups", 42), 0);
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

test("quarter-block billboard anchors use the chosen footprint center", () => {
  const sw = objectFootprint("kuaikuai", 0, 3);
  const se = objectFootprint("kuaikuai", 0, 2);
  const nw = objectFootprint("kuaikuai", 0, 0);
  const ne = objectFootprint("kuaikuai", 0, 1);

  assert.deepEqual(objectSurfaceAnchor("kuaikuai", 0, 3), { x: sw.x + sw.w / 2, y: sw.y + sw.d / 2 });
  assert.deepEqual(objectSurfaceAnchor("kuaikuai", 0, 2), { x: se.x + se.w / 2, y: se.y + se.d / 2 });
  assert.deepEqual(objectSurfaceAnchor("kuaikuai", 0, 0), { x: nw.x + nw.w / 2, y: nw.y + nw.d / 2 });
  assert.deepEqual(objectSurfaceAnchor("kuaikuai", 0, 1), { x: ne.x + ne.w / 2, y: ne.y + ne.d / 2 });
});

test("large fixtures span whole cells and rotate their span", () => {
  // Reference fixture footprints fit one floor cell and rotate in place.
  assert.deepEqual(objectCellSpan("aircon", 0), { w: 1, h: 1 });
  assert.deepEqual(objectCellSpan("aircon", 1), { w: 1, h: 1 });
  const fp = objectFootprint("aircon", 0, 0);
  assert.equal(fp.w, objectSpec("aircon").wide);
  assert.equal(fp.x, (1 - fp.w) / 2);
  assert.deepEqual(objectCellSpan("cableTray", 0), { w: 1, h: 1 });
});

test("fixture footprints match Server Room Objects.dc.html", () => {
  assert.deepEqual(
    Object.fromEntries(
      (["aircon", "ups", "crashCart", "camera", "sensor", "smokeDetector", "fireExtinguisher", "cableTray", "kuaikuai"] as const)
        .map((kind) => [kind, [objectSpec(kind).wide, objectSpec(kind).deep]]),
    ),
    {
      aircon: [0.94, 0.62],
      ups: [0.6, 0.6],
      crashCart: [0.56, 0.44],
      camera: [0.34, 0.34],
      sensor: [0.24, 0.24],
      smokeDetector: [0.3, 0.3],
      fireExtinguisher: [0.28, 0.28],
      cableTray: [1, 0.3],
      kuaikuai: [0.36, 0.28],
    },
  );
});

test("cellSpans blocks the snapped cell covered by a reference fixture", () => {
  const crac = obj("crac", "aircon", 1, 0, 0);
  // The reference CRAC is 0.94 cells wide, so only its snapped cell is occupied.
  assert.equal(cellSpans({ x: 1, y: 0 }, [], {}, [crac]).length, 1);
  assert.equal(cellSpans({ x: 2, y: 0 }, [], {}, [crac]).length, 0);
  assert.equal(cellSpans({ x: 3, y: 0 }, [], {}, [crac]).length, 0);
});

test("footprintSpans collision-checks the fixture's snapped cell", () => {
  const spans = footprintSpans({ x: 0, y: 0 }, "aircon", 0, [rack("a")], { a: { x: 0, y: 0 } }, []);
  assert.equal(resolveDropZ(spans, "aircon"), null);
  const clear = footprintSpans({ x: 0, y: 0 }, "aircon", 0, [rack("a")], { a: { x: 1, y: 0 } }, []);
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
