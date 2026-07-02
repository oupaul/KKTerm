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
import type { Facing, IsoCell } from "./roomIsoLayout";

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
  /** Floor grid cell (shared with rack placement). */
  x: number;
  y: number;
  /** Bottom of the object in U above the floor. */
  z: number;
  /** Quarter-turn facing (same numbering as rack Facing). */
  rot: Facing;
}

export interface RoomObjectSpec {
  /** Vertical size in U. */
  heightU: number;
  /** Where an unplaced object wants its bottom: a fixed U, the floor, or
   *  stacked on top of whatever already occupies the cell. */
  defaultZ: number | "floor" | "stack";
  /** Footprint as fractions of a floor cell, before `rot` (wide = along x). */
  wide: number;
  deep: number;
}

const SPECS: Record<RoomObjectKind, RoomObjectSpec> = {
  camera: { heightU: 3, defaultZ: 52, wide: 0.34, deep: 0.34 },
  aircon: { heightU: 46, defaultZ: "floor", wide: 0.94, deep: 0.62 },
  fireExtinguisher: { heightU: 7, defaultZ: "floor", wide: 0.28, deep: 0.28 },
  cableTray: { heightU: 2, defaultZ: 50, wide: 1, deep: 0.3 },
  ups: { heightU: 12, defaultZ: "floor", wide: 0.6, deep: 0.6 },
  sensor: { heightU: 2, defaultZ: 40, wide: 0.24, deep: 0.24 },
  smokeDetector: { heightU: 1, defaultZ: ROOM_CEILING_U - 1, wide: 0.3, deep: 0.3 },
  crashCart: { heightU: 22, defaultZ: "floor", wide: 0.56, deep: 0.44 },
  kuaikuai: { heightU: 2, defaultZ: "stack", wide: 0.36, deep: 0.28 },
};

export function objectSpec(kind: RoomObjectKind): RoomObjectSpec {
  return SPECS[kind];
}

/** One occupied vertical span in a cell: [z0, z1) in U. */
export interface ZSpan {
  z0: number;
  z1: number;
}

// Everything already occupying one floor cell: the rack standing on it (racks
// always occupy from the floor up to their capacity) plus every object whose
// cell matches, except `excludeObjectId` (the object being moved).
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
    if (object.x !== cell.x || object.y !== cell.y) continue;
    spans.push({ z0: object.z, z1: object.z + objectSpec(object.kind).heightU });
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
    const { id, kind, x, y, z, rot } = entry as Record<string, unknown>;
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
    });
  }
  return objects;
}
