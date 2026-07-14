import type { Rack, RackItem, RackItemMetadata, RackItemWidthFraction } from "../../types";

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
  /** Horizontal slot for a fractional-width device (0 for full width). */
  slot: number;
}

/** Quarter-units of rack width a face occupies: full 4, half 2, quarter 1. */
export function widthFractionQuarters(
  widthFraction: RackItemWidthFraction | null | undefined,
): number {
  return widthFraction === "half" ? 2 : widthFraction === "quarter" ? 1 : 4;
}

/** Horizontal quarter-unit strip `[xStart, xStart + xQuarters)` a device face
 *  occupies across the rack width; a full-width device spans `[0, 4)`. */
export function rackItemXSpan(metadata: RackItemMetadata | null | undefined): {
  xStart: number;
  xQuarters: number;
} {
  const xQuarters = widthFractionQuarters(metadata?.widthFraction);
  if (xQuarters === 4) return { xStart: 0, xQuarters };
  const slots = 4 / xQuarters;
  const slot = Math.max(0, Math.min(slots - 1, Math.trunc(metadata?.slot ?? 0)));
  return { xStart: slot * xQuarters, xQuarters };
}

/** True when two devices collide: their U spans and horizontal strips both
 *  intersect, so fractional-width devices may share a U row side by side. */
export function rackItemsCollide(
  a: { startU: number; heightU: number; xStart: number; xQuarters: number },
  b: { startU: number; heightU: number; xStart: number; xQuarters: number },
): boolean {
  return (
    a.startU < b.startU + b.heightU &&
    b.startU < a.startU + a.heightU &&
    a.xStart < b.xStart + b.xQuarters &&
    b.xStart < a.xStart + a.xQuarters
  );
}

/** First U row with at least the requested free horizontal capacity. Full-width
 *  devices require all four quarters; fractional-capable pickers need one. */
export function firstAvailableRackUnit(
  rack: Rack,
  minimumFreeQuarters = 4,
): number | null {
  const required = Math.max(1, Math.min(4, Math.trunc(minimumFreeQuarters)));
  for (let unit = 1; unit <= rack.heightU; unit += 1) {
    let coveredQuarters = 0;
    for (const item of rack.items) {
      if (unit < item.startU || unit >= item.startU + item.heightU) continue;
      coveredQuarters += rackItemXSpan(item.metadata).xQuarters;
    }
    if (4 - Math.min(4, coveredQuarters) >= required) return unit;
  }
  return null;
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

/** Horizontal slot under the pointer for a fractional-width device: the bay
 *  width divides into equal slots (half: 2, quarter: 4); full width slots 0. */
export function snapPlacementSlot(
  x: number,
  bayRect: Pick<ClientRectLike, "left" | "width">,
  widthFraction: RackItemWidthFraction | null | undefined,
): number {
  const slots = 4 / widthFractionQuarters(widthFraction);
  if (slots <= 1) return 0;
  const relativeX = Math.max(0, Math.min(0.999, (x - bayRect.left) / Math.max(1, bayRect.width)));
  return Math.min(slots - 1, Math.floor(relativeX * slots));
}

export function snapRackPlacement({
  x,
  y,
  bayRect,
  rackHeightU,
  placeHeightU,
  placeWidthFraction,
  items,
  allowTop,
  snapDistance = 68,
}: {
  x: number;
  y: number;
  bayRect: ClientRectLike;
  rackHeightU: number;
  placeHeightU: number;
  placeWidthFraction?: RackItemWidthFraction | null;
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
      slot: 0,
    };
  }

  if (distanceToRect(x, y, bayRect) > snapDistance) return null;

  const relativeY = Math.max(0, Math.min(bayRect.height - 0.001, y - bayRect.top));
  const hoveredU = rackHeightU - Math.floor(relativeY / rowHeight);
  const startU = Math.max(1, Math.min(hoveredU, rackHeightU - heightU + 1));
  const slot = snapPlacementSlot(x, bayRect, placeWidthFraction);
  const xQuarters = widthFractionQuarters(placeWidthFraction);
  const placeSpan = { startU, heightU, xStart: slot * xQuarters, xQuarters };
  const blocked = items.some(
    (item) =>
      !isRackTopItem(item, rackHeightU) &&
      rackItemsCollide(placeSpan, {
        startU: item.startU,
        heightU: item.heightU,
        ...rackItemXSpan(item.metadata),
      }),
  );
  return { startU, blocked, zone: "inside", slot };
}
