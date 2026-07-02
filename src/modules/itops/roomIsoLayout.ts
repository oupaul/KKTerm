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
// with an aisle row between groups — sliding right past any occupied cell so
// two cabinets never share a tile.
export function resolveIsoLayout(racks: Rack[], placement: FreePlacementMap): IsoLayout {
  const cells: Record<string, IsoCell> = {};
  const occupied = new Set<string>();

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
