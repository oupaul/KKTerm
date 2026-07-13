// Server Room objects (docs/SITE.md Server Room View): non-rack room fixtures
// — security cameras, CRAC units, fire extinguishers, UPS cabinets,
// environment sensors, smoke detectors, crash carts, and the
// obligatory pack of 乖乖 — placed on the same floor grid as the racks in both
// the floor plan and the 2.5D view. Each object also has a vertical position:
// `z` is the bottom of the object in rack units above the floor, so two
// occupants may share one floor cell as long as their vertical spans don't
// intersect (a 乖乖 pack sits on top of a rack cabinet). Pure + testable: no
// DOM, no persistence — the localStorage store lives in siteTreeState.ts.

import type { Rack } from "../../types";
import {
  rackDepthFrac,
  rackFootprint,
  sanitizeCorner,
  sanitizeFacing,
  type CellRect,
  type Corner,
  type Facing,
  type IsoCell,
} from "./roomIsoLayout";

/** Room height in rack units (~2.6 m at 44.45 mm per U). */
export const ROOM_CEILING_U = 58;

export type RoomObjectKind =
  | "camera"
  | "aircon"
  | "fireExtinguisher"
  | "ups"
  | "sensor"
  | "smokeDetector"
  | "crashCart"
  | "kuaikuai";

export const ROOM_OBJECT_KINDS: RoomObjectKind[] = [
  "camera",
  "aircon",
  "fireExtinguisher",
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
  /** Where an unplaced object wants its bottom: a fixed/top-hung U, the floor,
   *  or gravity-settled on the lowest available support surface. */
  defaultZ: number | "floor" | "stack";
  /** Footprint as fractions of a floor cell (1200 mm), before `rot`
   *  (wide = along x). Values above 1 span into neighbouring cells. */
  wide: number;
  deep: number;
  /** Small fixture occupying one quarter of a cell, anchored to `corner`.
   *  Quarter kinds keep wide/deep ≤ 0.5 so they fit their quadrant. */
  quarter?: boolean;
}

// Footprints are the exact cell proportions specified by
// `Server Room Objects.dc.html`. Small fixtures take a cell quadrant; the
// larger floor/overhead fixtures remain centred within one snapped cell.
const SPECS: Record<RoomObjectKind, RoomObjectSpec> = {
  camera: { heightU: 3, defaultZ: 52, wide: 0.34, deep: 0.34, quarter: true },
  aircon: { heightU: 46, defaultZ: "floor", wide: 0.94, deep: 0.62 },
  fireExtinguisher: { heightU: 7, defaultZ: "floor", wide: 0.28, deep: 0.28, quarter: true },
  ups: { heightU: 12, defaultZ: "floor", wide: 0.6, deep: 0.6 },
  sensor: { heightU: 2, defaultZ: 40, wide: 0.24, deep: 0.24, quarter: true },
  smokeDetector: { heightU: 1, defaultZ: ROOM_CEILING_U - 1, wide: 0.3, deep: 0.3, quarter: true },
  crashCart: { heightU: 22, defaultZ: "floor", wide: 0.56, deep: 0.44 },
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

/** Point where a billboarded 2.5D sprite touches the floor/rack surface. */
export function objectSurfaceAnchor(
  kind: RoomObjectKind,
  rot: Facing,
  corner: Corner,
): { x: number; y: number } {
  const fp = objectFootprint(kind, rot, corner);
  return { x: fp.x + fp.w / 2, y: fp.y + fp.d / 2 };
}

/** One occupied vertical span in a cell: [z0, z1) in U. */
export interface ZSpan {
  z0: number;
  z1: number;
}

function rectsOverlap(a: CellRect, b: CellRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.d && a.y + a.d > b.y;
}

interface CellSpanOptions {
  /** Object footprint relative to this cell; used so rack-top support follows
   *  the rack's drawn physical footprint instead of the whole floor cell. */
  objectRect?: CellRect;
  rackFacing?: Record<string, Facing | undefined>;
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
  options: CellSpanOptions = {},
): ZSpan[] {
  const spans: ZSpan[] = [];
  for (const rack of racks) {
    const at = rackCells[rack.id];
    if (at && at.x === cell.x && at.y === cell.y) {
      const facing = sanitizeFacing(options.rackFacing?.[rack.id]);
      const rackRect = rackFootprint(facing, rackDepthFrac(rack.depthMm));
      if (options.objectRect && !rectsOverlap(options.objectRect, rackRect)) continue;
      spans.push({ z0: 0, z1: Math.min(ROOM_CEILING_U, Math.max(1, rack.heightU)) });
    }
  }
  for (const object of objects) {
    if (object.id === excludeObjectId) continue;
    const span = objectCellSpan(object.kind, object.rot);
    if (cell.x < object.x || cell.x >= object.x + span.w) continue;
    if (cell.y < object.y || cell.y >= object.y + span.h) continue;
    if (options.objectRect) {
      const rect = objectFootprint(object.kind, object.rot, object.corner);
      const localRect = { ...rect, x: rect.x - (cell.x - object.x), y: rect.y - (cell.y - object.y) };
      if (!rectsOverlap(options.objectRect, localRect)) continue;
    }
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
  corner: Corner = 0,
  rackFacing: Record<string, Facing | undefined> = {},
): ZSpan[] {
  const span = objectCellSpan(kind, rot);
  const rect = objectFootprint(kind, rot, corner);
  const spans: ZSpan[] = [];
  for (let dy = 0; dy < span.h; dy += 1) {
    for (let dx = 0; dx < span.w; dx += 1) {
      const objectRect = { ...rect, x: rect.x - dx, y: rect.y - dy };
      spans.push(
        ...cellSpans(
          { x: cell.x + dx, y: cell.y + dy },
          racks,
          rackCells,
          objects,
          excludeObjectId,
          { objectRect, rackFacing },
        ),
      );
    }
  }
  return spans;
}

/** The rack whose cabinet top an object with bottom `z` would rest on: its
 *  drawn footprint overlaps the object's and its top surface is exactly `z`.
 *  Rack-top 乖乖 drops use this to become rack items (the object the Rack View
 *  shows center-top) instead of separate room objects. */
export function rackTopSupport(
  cell: IsoCell,
  kind: RoomObjectKind,
  rot: Facing,
  corner: Corner,
  z: number,
  racks: Rack[],
  rackCells: Record<string, IsoCell>,
  rackFacing: Record<string, Facing | undefined> = {},
): Rack | null {
  if (z <= 0) return null;
  const span = objectCellSpan(kind, rot);
  const rect = objectFootprint(kind, rot, corner);
  for (let dy = 0; dy < span.h; dy += 1) {
    for (let dx = 0; dx < span.w; dx += 1) {
      const objectRect = { ...rect, x: rect.x - dx, y: rect.y - dy };
      for (const rack of racks) {
        const at = rackCells[rack.id];
        if (!at || at.x !== cell.x + dx || at.y !== cell.y + dy) continue;
        if (Math.min(ROOM_CEILING_U, Math.max(1, rack.heightU)) !== z) continue;
        const facing = sanitizeFacing(rackFacing[rack.id]);
        if (rectsOverlap(objectRect, rackFootprint(facing, rackDepthFrac(rack.depthMm)))) {
          return rack;
        }
      }
    }
  }
  return null;
}

function fits(spans: ZSpan[], z: number, heightU: number): boolean {
  if (z < 0 || z + heightU > ROOM_CEILING_U) return false;
  return spans.every((span) => z + heightU <= span.z0 || z >= span.z1);
}

// Pick a bottom-U for an object dropped into a cell. Resting objects use
// gravity: try the floor, then each occupied top surface from the lowest up
// (this is what places a 乖乖 pack on the cabinet top instead of a high camera).
// Fixed/top-hung fixtures keep the caller's preferred level and their default
// overhead level before falling back through other support surfaces. Returns
// null when no candidate fits below the ceiling — the cell is vertically full.
export function resolveDropZ(
  spans: ZSpan[],
  kind: RoomObjectKind,
  preferred?: number | null,
): number | null {
  const spec = objectSpec(kind);
  const candidates: number[] = [];
  const wanted = spec.defaultZ;
  const supports = [...spans].map((span) => span.z1).sort((a, b) => a - b);
  if (wanted === "floor" || wanted === "stack") {
    candidates.push(0, ...supports);
  } else {
    if (preferred != null) candidates.push(Math.round(preferred));
    candidates.push(wanted, ...supports, 0);
  }
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

/** Re-apply the current footprint/gravity rules to persisted room objects.
 *  Older saves may carry a stale raised `z` from less precise collision math;
 *  settling bottom-up keeps deliberate same-corner stacks while letting
 *  independent rack-top corners land on the same cabinet surface. */
export function settleRoomObjects(
  objects: RoomObject[],
  racks: Rack[],
  rackCells: Record<string, IsoCell>,
  rackFacing: Record<string, Facing | undefined> = {},
): RoomObject[] {
  const settledById = new Map<string, RoomObject>();
  const order = objects
    .map((object, index) => ({ object, index }))
    .sort((a, b) => a.object.z - b.object.z || a.index - b.index);

  for (const entry of order) {
    const object = entry.object;
    const settled = Array.from(settledById.values());
    const spans = footprintSpans(
      { x: object.x, y: object.y },
      object.kind,
      object.rot,
      racks,
      rackCells,
      settled,
      object.id,
      object.corner,
      rackFacing,
    );
    const z = resolveDropZ(spans, object.kind, object.z);
    settledById.set(object.id, z == null || z === object.z ? object : { ...object, z });
  }

  return objects.map((object) => settledById.get(object.id) ?? object);
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
