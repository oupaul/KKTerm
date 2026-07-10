import type { RackItem } from "../../types";

export interface ClientRectLike {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface RackPlacementSnap {
  startU: number;
  blocked: boolean;
  zone: "inside" | "top";
}

export function isRackTopItem(item: RackItem, rackHeightU: number): boolean {
  return item.kind === "kuaiguai" && item.startU === rackHeightU + 1;
}

/** Headroom (in U) the Rack View and Server Room elevation views always keep
 *  above the cabinet — a standing (`full`) 乖乖 package is 4U tall, so a
 *  rack-top placement fits without shifting the rack down. */
export const KUAIGUAI_TOP_CLEARANCE_U = 4;

function horizontalDistance(x: number, rect: ClientRectLike): number {
  return x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
}

function distanceToRect(x: number, y: number, rect: ClientRectLike): number {
  const dx = horizontalDistance(x, rect);
  const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
  return Math.hypot(dx, dy);
}

export function snapRackPlacement({
  x,
  y,
  bayRect,
  rackHeightU,
  placeHeightU,
  items,
  allowTop,
  snapDistance = 68,
}: {
  x: number;
  y: number;
  bayRect: ClientRectLike;
  rackHeightU: number;
  placeHeightU: number;
  items: RackItem[];
  allowTop: boolean;
  snapDistance?: number;
}): RackPlacementSnap | null {
  const heightU = Math.max(1, Math.min(placeHeightU, rackHeightU));
  const rowHeight = bayRect.height / Math.max(1, rackHeightU);

  // Kuai Kuai alone may settle on the cabinet top. Give that target the
  // package's visual height plus the normal magnetic approach distance.
  if (
    allowTop &&
    y < bayRect.top &&
    y >= bayRect.top - heightU * rowHeight - snapDistance &&
    horizontalDistance(x, bayRect) <= snapDistance
  ) {
    return {
      startU: rackHeightU + 1,
      blocked: items.some((item) => isRackTopItem(item, rackHeightU)),
      zone: "top",
    };
  }

  if (distanceToRect(x, y, bayRect) > snapDistance) return null;

  const relativeY = Math.max(0, Math.min(bayRect.height - 0.001, y - bayRect.top));
  const hoveredU = rackHeightU - Math.floor(relativeY / rowHeight);
  const startU = Math.max(1, Math.min(hoveredU, rackHeightU - heightU + 1));
  const blocked = items.some(
    (item) =>
      !isRackTopItem(item, rackHeightU) &&
      startU < item.startU + item.heightU &&
      item.startU < startU + heightU,
  );
  return { startU, blocked, zone: "inside" };
}
