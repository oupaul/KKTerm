import type { ActivityRailItemId } from "../types";

export const DEFAULT_ACTIVITY_RAIL_ORDER: ActivityRailItemId[] = [
  "workspace",
  "dashboard",
  "installer",
  "itops",
  "dontSleep",
];

const ACTIVITY_RAIL_ITEM_IDS = new Set<string>(DEFAULT_ACTIVITY_RAIL_ORDER);

export function normalizeActivityRailOrder(order: readonly string[] | undefined) {
  const known = (order ?? []).filter(
    (id, index, values): id is ActivityRailItemId =>
      ACTIVITY_RAIL_ITEM_IDS.has(id) && values.indexOf(id) === index,
  );
  return [...known, ...DEFAULT_ACTIVITY_RAIL_ORDER.filter((id) => !known.includes(id))];
}

export function reorderActivityRailItems(
  order: readonly string[] | undefined,
  draggedId: ActivityRailItemId,
  targetId: ActivityRailItemId,
) {
  const next = normalizeActivityRailOrder(order);
  const from = next.indexOf(draggedId);
  const to = next.indexOf(targetId);
  if (from === to) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
