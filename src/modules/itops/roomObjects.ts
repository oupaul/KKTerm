// Server Room objects (docs/SITE.md Server Room View): non-rack room fixtures
// — security cameras, CRAC units, fire extinguishers, cable trays, UPS
// cabinets, environment sensors, smoke detectors, crash carts, and the
// obligatory pack of 乖乖 — placed on the same floor grid as the racks in both
// the floor plan and the 2.5D view. Each object also has a vertical position:
// `z` is the bottom of the object in rack units above the floor, so two
// occupants may share one floor cell as long as their vertical spans don't
// intersect (a 乖乖 pack sits on top of a rack cabinet). Pure + testable: no
// DOM, no persistence — the localStorage store lives in siteTreeState.ts.

import type { Rack } from "../../types";
import { sanitizeCorner, type Corner, type Facing, type IsoCell } from "./roomIsoLayout";

/** Room height in rack units (~2.6 m at 44.45 mm per U). */
export const ROOM_CEILING_U = 58;

export type RoomObjectKind =
  | "camera"
  | "aircon"
  | "fireExtinguisher"
  | "cableTray"
  | "ups"
  | "sensor"
  | "smokeDetector"
  | "crashCart"
  | "kuaikuai";

export const ROOM_OBJECT_KINDS: RoomObjectKind[] = [
  "camera",
  "aircon",
  "fireExtinguisher",
  "cableTray",
  "ups",
  "sensor",
  "smokeDetector",
  "crashCart",
  "kuaikuai",
];

export interface RoomObject {
  id: string;
  kind: RoomObjectKind;
  /** Floor grid cell (shared with rack placement); a multi-cell footprint
   *  extends toward +x/+y from this anchor. */
  x: number;
  y: number;
  /** Bottom of the object in U above the floor. */
  z: number;
  /** Quarter-turn facing (same numbering as rack Facing). */
  rot: Facing;
  /** Cell quadrant a quarter-block object sits in (ignored by larger kinds). */
  corner: Corner;
}

export interface RoomObjectSpec {
  /** Vertical size in U. */
  heightU: number;
  /** Where an unplaced object wants its bottom: a fixed U, the floor, or
   *  stacked on top of whatever already occupies the cell. */
  defaultZ: number | "floor" | "stack";
  /** Footprint as fractions of a floor cell (1200 mm), before `rot`
   *  (wide = along x). Values above 1 span into neighbouring cells. */
  wide: number;
  deep: number;
  /** Small fixture occupying one quarter of a cell, anchored to `corner`.
   *  Quarter kinds keep wide/deep ≤ 0.5 so they fit their quadrant. */
  quarter?: boolean;
}

// Footprints follow real-world sizes against the 1200 mm cell: a CRAC unit
// (~1800×850 mm) spans one and a half cells, a cable-tray section runs two
// cells long, a UPS cabinet is ~600×800 mm, and hand-sized fixtures (camera,
// extinguisher, sensor, smoke detector, 乖乖 pack) each take a cell quadrant.
const SPECS: Record<RoomObjectKind, RoomObjectSpec> = {
  camera: { heightU: 3, defaultZ: 52, wide: 0.34, deep: 0.34, quarter: true },
  aircon: { heightU: 46, defaultZ: "floor", wide: 1.5, deep: 0.72 },
  fireExtinguisher: { heightU: 7, defaultZ: "floor", wide: 0.28, deep: 0.28, quarter: true },
  cableTray: { heightU: 2, defaultZ: 50, wide: 2, deep: 0.26 },
  ups: { heightU: 12, defaultZ: "floor", wide: 0.5, deep: 0.66 },
  sensor: { heightU: 2, defaultZ: 40, wide: 0.24, deep: 0.24, quarter: true },
  smokeDetector: { heightU: 1, defaultZ: ROOM_CEILING_U - 1, wide: 0.3, deep: 0.3, quarter: true },
  crashCart: { heightU: 22, defaultZ: "floor", wide: 0.58, deep: 0.44 },
  kuaikuai: { heightU: 2, defaultZ: "stack", wide: 0.36, deep: 0.28, quarter: true },
};

export function objectSpec(kind: RoomObjectKind): RoomObjectSpec {
  return SPECS[kind];
}

/** Whole floor cells an object's footprint covers (≥ 1×1), after `rot`. */
export function objectCellSpan(kind: RoomObjectKind, rot: Facing): { w: number; h: number } {
  const spec = SPECS[kind];
  if (spec.quarter) return { w: 1, h: 1 };
  const across = rot % 2 === 1;
  return {
    w: Math.max(1, Math.ceil(across ? spec.deep : spec.wide)),
    h: Math.max(1, Math.ceil(across ? spec.wide : spec.deep)),
  };
}

/** Drawn footprint rect in cell fractions, relative to the anchor cell
 *  origin. `rot` and `corner` must already be in display space (the 2.5D
 *  view rotates both under its view angle before calling). Quarter kinds
 *  centre inside their corner quadrant; everything else centres over the
 *  whole cell span it covers. */
export function objectFootprint(
  kind: RoomObjectKind,
  rot: Facing,
  corner: Corner,
): { x: number; y: number; w: number; d: number } {
  const spec = SPECS[kind];
  const across = rot % 2 === 1;
  const w = across ? spec.deep : spec.wide;
  const d = across ? spec.wide : spec.deep;
  if (spec.quarter) {
    const qx = corner === 1 || corner === 2 ? 0.5 : 0;
    const qy = corner >= 2 ? 0.5 : 0;
    return { x: qx + (0.5 - w) / 2, y: qy + (0.5 - d) / 2, w, d };
  }
  const span = objectCellSpan(kind, rot);
  return { x: (span.w - w) / 2, y: (span.h - d) / 2, w, d };
}

/** One occupied vertical span in a cell: [z0, z1) in U. */
export interface ZSpan {
  z0: number;
  z1: number;
}

// Everything already occupying one floor cell: the rack standing on it (racks
// always occupy from the floor up to their capacity) plus every object whose
// footprint covers the cell (a multi-cell fixture like a CRAC blocks every
// cell it spans), except `excludeObjectId` (the object being moved).
export function cellSpans(
  cell: IsoCell,
  racks: Rack[],
  rackCells: Record<string, IsoCell>,
  objects: RoomObject[],
  excludeObjectId?: string,
): ZSpan[] {
  const spans: ZSpan[] = [];
  for (const rack of racks) {
    const at = rackCells[rack.id];
    if (at && at.x === cell.x && at.y === cell.y) {
      spans.push({ z0: 0, z1: Math.min(ROOM_CEILING_U, Math.max(1, rack.heightU)) });
    }
  }
  for (const object of objects) {
    if (object.id === excludeObjectId) continue;
    const span = objectCellSpan(object.kind, object.rot);
    if (cell.x < object.x || cell.x >= object.x + span.w) continue;
    if (cell.y < object.y || cell.y >= object.y + span.h) continue;
    spans.push({ z0: object.z, z1: object.z + objectSpec(object.kind).heightU });
  }
  return spans;
}

/** `cellSpans` over every cell a `kind` footprint anchored at `cell` would
 *  cover, so a multi-cell fixture collision-checks its whole span (duplicate
 *  spans from occupants covering several cells are harmless to `fits`). */
export function footprintSpans(
  cell: IsoCell,
  kind: RoomObjectKind,
  rot: Facing,
  racks: Rack[],
  rackCells: Record<string, IsoCell>,
  objects: RoomObject[],
  excludeObjectId?: string,
): ZSpan[] {
  const span = objectCellSpan(kind, rot);
  const spans: ZSpan[] = [];
  for (let dy = 0; dy < span.h; dy += 1) {
    for (let dx = 0; dx < span.w; dx += 1) {
      spans.push(
        ...cellSpans(
          { x: cell.x + dx, y: cell.y + dy },
          racks,
          rackCells,
          objects,
          excludeObjectId,
        ),
      );
    }
  }
  return spans;
}

function fits(spans: ZSpan[], z: number, heightU: number): boolean {
  if (z < 0 || z + heightU > ROOM_CEILING_U) return false;
  return spans.every((span) => z + heightU <= span.z0 || z >= span.z1);
}

// Pick a bottom-U for an object dropped into a cell. Candidates in preference
// order: the caller's preferred z (keep your level while dragging), the
// kind's default, the top of each existing occupant from the lowest up (this
// is what stacks a 乖乖 pack on a cabinet, and keeps a blocked ceiling mount
// near the top instead of dumping it on the floor), then the floor. Returns
// null when no candidate fits below the ceiling — the cell is vertically full.
export function resolveDropZ(
  spans: ZSpan[],
  kind: RoomObjectKind,
  preferred?: number | null,
): number | null {
  const spec = objectSpec(kind);
  const candidates: number[] = [];
  if (preferred != null) candidates.push(Math.round(preferred));
  const wanted = spec.defaultZ;
  if (typeof wanted === "number") candidates.push(wanted);
  else if (wanted === "stack" && spans.length > 0) {
    candidates.push(Math.max(...spans.map((span) => span.z1)));
  } else {
    candidates.push(0);
  }
  for (const span of [...spans].sort((a, b) => a.z1 - b.z1)) {
    candidates.push(span.z1);
  }
  candidates.push(0);
  for (const z of candidates) {
    if (fits(spans, z, spec.heightU)) return z;
  }
  return null;
}

/** Nudge an object's z up (+1) or down (−1) to the next position that fits;
 *  returns the unchanged z when it can't move further. */
export function nudgeZ(spans: ZSpan[], kind: RoomObjectKind, z: number, dir: 1 | -1): number {
  const heightU = objectSpec(kind).heightU;
  for (let next = z + dir; next >= 0 && next + heightU <= ROOM_CEILING_U; next += dir) {
    if (fits(spans, next, heightU)) return next;
  }
  return z;
}

// Validate a localStorage payload back into RoomObject[] (mirrors the
// defensive parsing in siteTreeState.ts).
export function sanitizeRoomObjects(raw: unknown): RoomObject[] {
  if (!Array.isArray(raw)) return [];
  const objects: RoomObject[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { id, kind, x, y, z, rot, corner } = entry as Record<string, unknown>;
    if (typeof id !== "string" || typeof kind !== "string") continue;
    if (!ROOM_OBJECT_KINDS.includes(kind as RoomObjectKind)) continue;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    objects.push({
      id,
      kind: kind as RoomObjectKind,
      x: Math.max(0, Math.round(x as number)),
      y: Math.max(0, Math.round(y as number)),
      z: Math.min(ROOM_CEILING_U - 1, Math.max(0, Math.round(z as number))),
      rot: rot === 1 || rot === 2 || rot === 3 ? rot : 0,
      corner: sanitizeCorner(corner),
    });
  }
  return objects;
}
