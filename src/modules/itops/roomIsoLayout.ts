// 2.5D Server Room View layout model (docs/SITE.md Server Room View). The iso
// view draws the room as a fixed-angle axonometric floor grid and each Rack as
// an extruded cabinet standing on one grid cell. This module is the pure,
// testable part: default cell assignment (rack-group rows separated by aisles),
// grid sizing, move/swap placement edits, and the screen→floor-plane pointer
// math. No DOM, no theme lookups — pixel constants live in the component.

import type { Rack } from "../../types";
import { groupRacksByGroup } from "./rackTopology";
import type { FreePlacement, FreePlacementMap } from "./siteTreeState";

// Camera angles for the axonometric projection. The plane is transformed with
// `rotateX(ISO_TILT_DEG) rotateZ(ISO_ROT_DEG)`; the inverse math below and the
// CSS transform in ServerRoomIsoView must agree on these.
export const ISO_TILT_DEG = 55;
export const ISO_ROT_DEG = 45;

const TILT_RAD = (ISO_TILT_DEG * Math.PI) / 180;
const ROT_RAD = (ISO_ROT_DEG * Math.PI) / 180;

/** cos(tilt): how much the projection squashes the floor plane vertically. */
export const ISO_TILT_COS = Math.cos(TILT_RAD);

// Keep some empty floor around the outermost cabinets so there is always room
// to drag a cabinet (or add a new rack) past the current footprint.
const GRID_MARGIN = 2;
export const ISO_MIN_COLS = 6;
export const ISO_MIN_ROWS = 4;

/** One floor cell: `x` is the column, `y` is the row (both 0-based). */
export type IsoCell = FreePlacement;

export interface IsoLayout {
  /** Grid width/height in cells, always covering every placed cabinet. */
  cols: number;
  rows: number;
  /** Rack id → resolved floor cell (stored placement or the derived default). */
  cells: Record<string, IsoCell>;
}

export interface IsoFloorFrame {
  /** Drawn floor dimensions, including decorative cells added past the room. */
  floorCols: number;
  floorRows: number;
  /** Offset from durable room grid coordinates into the drawn floor. */
  offX: number;
  offY: number;
}

interface IsoSize {
  w: number;
  h: number;
}

function cellKey(cell: IsoCell): string {
  return `${cell.x},${cell.y}`;
}

function sanitizeCell(point: FreePlacement): IsoCell {
  return {
    x: Math.max(0, Math.round(point.x)),
    y: Math.max(0, Math.round(point.y)),
  };
}

// Resolve every rack to a floor cell. Stored placements win; unplaced racks
// fall back to physical-looking rows — each `rackGroup` becomes one rack row
// with an aisle row between groups — sliding right past any occupied or
// reserved cell so two cabinets never share a tile or a Wall block.
export function resolveIsoLayout(
  racks: Rack[],
  placement: FreePlacementMap,
  reservedCells: IsoCell[] = [],
): IsoLayout {
  const cells: Record<string, IsoCell> = {};
  const occupied = new Set(reservedCells.map(cellKey));

  for (const rack of racks) {
    const stored = placement[rack.id];
    if (!stored) continue;
    let cell = sanitizeCell(stored);
    while (occupied.has(cellKey(cell))) {
      cell = { x: cell.x + 1, y: cell.y };
    }
    cells[rack.id] = cell;
    occupied.add(cellKey(cell));
  }

  groupRacksByGroup(racks).forEach((group, groupIndex) => {
    let col = 0;
    for (const rack of group.racks) {
      if (cells[rack.id]) continue;
      let cell = { x: col, y: groupIndex * 2 };
      while (occupied.has(cellKey(cell))) {
        cell = { x: cell.x + 1, y: cell.y };
      }
      cells[rack.id] = cell;
      occupied.add(cellKey(cell));
      col = cell.x + 1;
    }
  });

  let maxX = 0;
  let maxY = 0;
  for (const cell of Object.values(cells)) {
    maxX = Math.max(maxX, cell.x);
    maxY = Math.max(maxY, cell.y);
  }
  const hasRacks = racks.length > 0;
  return {
    cols: Math.max(ISO_MIN_COLS, hasRacks ? maxX + 1 + GRID_MARGIN : 0),
    rows: Math.max(ISO_MIN_ROWS, hasRacks ? maxY + 1 + GRID_MARGIN : 0),
    cells,
  };
}

// Move one rack to a target cell, clamped to the grid. Dropping onto an
// occupied cell swaps the two cabinets, so a drag is never silently rejected.
// Returns the full resolved map (every rack explicit) ready to persist.
export function moveIsoRack(
  layout: IsoLayout,
  rackId: string,
  target: IsoCell,
): Record<string, IsoCell> {
  const from = layout.cells[rackId];
  if (!from) return { ...layout.cells };
  const to = {
    x: Math.min(layout.cols - 1, Math.max(0, Math.round(target.x))),
    y: Math.min(layout.rows - 1, Math.max(0, Math.round(target.y))),
  };
  const next: Record<string, IsoCell> = { ...layout.cells };
  const targetKey = cellKey(to);
  for (const [id, cell] of Object.entries(next)) {
    if (id !== rackId && cellKey(cell) === targetKey) {
      next[id] = from;
    }
  }
  next[rackId] = to;
  return next;
}

// Grow the decorative 2.5D floor until its projected diagonal covers the
// viewport, but keep durable cell (0,0) at the drawn floor origin. The top-down
// floor plan grows the room down/right from the same origin, so adding cells on
// both sides here would make identical placements look shifted between views.
export function expandIsoFloorFrame(
  gridCols: number,
  gridRows: number,
  projectedDiagPx: number,
  cellPx: number,
): IsoFloorFrame {
  const extra = Math.max(
    0,
    Math.ceil(projectedDiagPx / (cellPx * Math.SQRT1_2)) - (gridCols + gridRows),
  );
  const extraCols = Math.ceil(extra / 2);
  return {
    floorCols: gridCols + extraCols,
    floorRows: gridRows + (extra - extraCols),
    offX: 0,
    offY: 0,
  };
}

/** Treat 100% as the largest scale that keeps the room's natural bounds in
 * the current pane. User zoom remains relative to that baseline, so opening a
 * side pane fits the same room while 150%/200% can still intentionally pan. */
export function fitIsoRoomZoom(
  natural: IsoSize,
  viewport: IsoSize | null,
  requestedZoom: number,
): number {
  if (!viewport || natural.w <= 0 || natural.h <= 0) return requestedZoom;
  const fit = Math.min(1, viewport.w / natural.w, viewport.h / natural.h);
  return requestedZoom * Math.max(0.01, fit);
}

/** Build edit-mode targets for the whole rendered floor. The viewport expands
 * beyond the rack-derived minimum grid, and those extra cells are real room
 * space rather than decorative padding: users must be able to place fixtures
 * anywhere the floor grid is visible. Rack cells are handled by their cabinet
 * click targets, so they are omitted here. */
export function isoPlacementCells(
  floorCols: number,
  floorRows: number,
  rackCells: ReadonlySet<string>,
): IsoCell[] {
  const cells: IsoCell[] = [];
  for (let y = 0; y < floorRows; y += 1) {
    for (let x = 0; x < floorCols; x += 1) {
      if (!rackCells.has(`${x},${y}`)) cells.push({ x, y });
    }
  }
  return cells;
}

// Convert a pointer drag delta (screen px) into floor-plane px by inverting
// the axonometric projection: un-squash the vertical axis by cos(tilt), then
// rotate by −ISO_ROT_DEG back into plane axes.
export function screenDeltaToPlane(dx: number, dy: number): { u: number; v: number } {
  const dyPlane = dy / ISO_TILT_COS;
  return {
    u: dx * Math.cos(ROT_RAD) + dyPlane * Math.sin(ROT_RAD),
    v: -dx * Math.sin(ROT_RAD) + dyPlane * Math.cos(ROT_RAD),
  };
}

// ── Facing and fixed view angles ──
//
// Both room layouts share one grid; a Rack (or room object) also stores which
// way its front faces, and the 2.5D view can look at the room from four fixed
// corners. Directions and view angles are quarter turns with one numbering:
// 0 = +y ("south", toward the iso camera's front-left), 1 = −x, 2 = −y,
// 3 = +x. Rotating the room one view step maps direction d to (d + 1) % 4,
// so everything composes with modular arithmetic.

/** Quarter-turn direction a rack/object front points (see numbering above). */
export type Facing = 0 | 1 | 2 | 3;

/** Corner (quadrant) of one floor cell, clockwise: 0 = NW, 1 = NE, 2 = SE,
 *  3 = SW. Corners rotate under a view angle exactly like facings — one view
 *  step maps corner c to (c + 1) % 4 — so `rotateFacingForView` applies. */
export type Corner = 0 | 1 | 2 | 3;

/** Map a pointer position inside a displayed floor tile back to the durable
 * grid corner. The room rotates corners clockwise for each view step, so the
 * picked display quadrant must be rotated back before it is stored. */
export function cornerFromDisplayPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  angle: IsoViewAngle,
): Corner {
  const east = x >= width / 2;
  const south = y >= height / 2;
  const displayed: Corner = south ? (east ? 2 : 3) : east ? 1 : 0;
  return ((displayed - angle + 4) % 4) as Corner;
}

/** Position a rack-top item at a selected corner. Missing legacy metadata
 * remains centered; spatial views rotate stored room corners with the view. */
export function rackTopCornerPoint(
  value: unknown,
  angle: IsoViewAngle = 0,
): { x: number; y: number } {
  if (value !== 0 && value !== 1 && value !== 2 && value !== 3) {
    return { x: 0.5, y: 0.5 };
  }
  const corner = rotateFacingForView(value, angle);
  return {
    x: corner === 0 || corner === 3 ? 0.25 : 0.75,
    y: corner === 0 || corner === 1 ? 0.25 : 0.75,
  };
}

export function sanitizeCorner(value: unknown): Corner {
  return value === 1 || value === 2 || value === 3 ? value : 0;
}

// ── Rack footprint depth ──
//
// A cabinet's displayed depth follows its physical depth: one floor cell is
// 1200 mm deep, so a 1200 mm rack fills the whole cell and a 600 mm network
// rack fills half of it, scaling by ratio in between. Deeper custom cabinets
// still draw as one full cell, and very shallow ones keep a readable minimum.
export const CELL_DEPTH_MM = 1200;
const MIN_RACK_DEPTH_FRAC = 0.25;

/** Displayed rack depth as a fraction of one floor cell. */
export function rackDepthFrac(depthMm: number): number {
  if (!Number.isFinite(depthMm) || depthMm <= 0) return 1;
  return Math.min(1, Math.max(MIN_RACK_DEPTH_FRAC, depthMm / CELL_DEPTH_MM));
}

export interface CellRect {
  /** Offset and size in cell fractions, relative to the anchor cell origin. */
  x: number;
  y: number;
  w: number;
  d: number;
}

export function rotatePointForView(
  point: { x: number; y: number },
  angle: IsoViewAngle,
  cols: number,
  rows: number,
): { x: number; y: number } {
  switch (angle) {
    case 1:
      return { x: rows - point.y, y: point.x };
    case 2:
      return { x: cols - point.x, y: rows - point.y };
    case 3:
      return { x: point.y, y: cols - point.x };
    default:
      return point;
  }
}

/** Map a fractional floor rectangle into display coordinates for a view angle.
 *  Use this for sub-cell footprints such as quarter-block Room Objects; a
 *  whole-cell rect maps to the same display cell as `rotateCellForView`. */
export function rotateRectForView(
  rect: CellRect,
  angle: IsoViewAngle,
  cols: number,
  rows: number,
): CellRect {
  const points = [
    rotatePointForView({ x: rect.x, y: rect.y }, angle, cols, rows),
    rotatePointForView({ x: rect.x + rect.w, y: rect.y }, angle, cols, rows),
    rotatePointForView({ x: rect.x, y: rect.y + rect.d }, angle, cols, rows),
    rotatePointForView({ x: rect.x + rect.w, y: rect.y + rect.d }, angle, cols, rows),
  ];
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  return { x: minX, y: minY, w: maxX - minX, d: maxY - minY };
}

/** A rack's footprint inside its cell: the side axis spans the full cell (so
 *  adjacent cabinets touch), the depth axis is `frac` of a cell, and the
 *  front face sits flush on the cell borderline the facing points at. */
export function rackFootprint(facing: Facing, frac: number): CellRect {
  switch (facing) {
    case 1: // front toward −x → flush on the west border
      return { x: 0, y: 0, w: frac, d: 1 };
    case 2: // front toward −y → flush on the north border
      return { x: 0, y: 0, w: 1, d: frac };
    case 3: // front toward +x → flush on the east border
      return { x: 1 - frac, y: 0, w: frac, d: 1 };
    default: // front toward +y → flush on the south border
      return { x: 0, y: 1 - frac, w: 1, d: frac };
  }
}

/** Fixed 2.5D camera corner, as quarter turns of the room under the camera. */
export type IsoViewAngle = 0 | 1 | 2 | 3;

export function sanitizeFacing(value: unknown): Facing {
  return value === 1 || value === 2 || value === 3 ? value : 0;
}

/** Grid size after rotating the room by `angle` quarter turns. */
export function viewGridSize(
  cols: number,
  rows: number,
  angle: IsoViewAngle,
): { cols: number; rows: number } {
  return angle % 2 === 0 ? { cols, rows } : { cols: rows, rows: cols };
}

/** Map a grid cell into display coordinates for the given view angle. */
export function rotateCellForView(
  cell: IsoCell,
  angle: IsoViewAngle,
  cols: number,
  rows: number,
): IsoCell {
  switch (angle) {
    case 1:
      return { x: rows - 1 - cell.y, y: cell.x };
    case 2:
      return { x: cols - 1 - cell.x, y: rows - 1 - cell.y };
    case 3:
      return { x: cell.y, y: cols - 1 - cell.x };
    default:
      return cell;
  }
}

/** A facing as seen from the given view angle. */
export function rotateFacingForView(facing: Facing, angle: IsoViewAngle): Facing {
  return ((facing + angle) % 4) as Facing;
}

/** Invert `rotateCellForView` for a displacement (drag delta) in cells/px. */
export function viewDeltaToGrid(
  du: number,
  dv: number,
  angle: IsoViewAngle,
): { dx: number; dy: number } {
  switch (angle) {
    case 1:
      return { dx: dv, dy: -du };
    case 2:
      return { dx: -du, dy: -dv };
    case 3:
      return { dx: -dv, dy: du };
    default:
      return { dx: du, dy: dv };
  }
}
