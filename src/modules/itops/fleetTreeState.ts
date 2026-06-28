// Persistence for the Fleets tree navigator (docs/FLEET.md Rack View): the panel
// width and the set of collapsed node ids, mirrored on localStorage like the
// Connection tree's `connectionSidebarState`. Node ids are stable path strings
// ("fleet:<id>", "region:<id>/<region>", …) so collapse survives reloads.

const WIDTH_KEY = "kkterm.itopsFleetTreeWidth";
const COLLAPSED_KEY = "kkterm.itopsFleetTreeCollapsed";

export const FLEET_TREE_MIN_WIDTH = 200;
export const FLEET_TREE_MAX_WIDTH = 460;
export const FLEET_TREE_DEFAULT_WIDTH = 268;

export function loadFleetTreeWidth(): number {
  if (typeof localStorage === "undefined") return FLEET_TREE_DEFAULT_WIDTH;
  const raw = Number(localStorage.getItem(WIDTH_KEY));
  if (!Number.isFinite(raw) || raw <= 0) return FLEET_TREE_DEFAULT_WIDTH;
  return Math.min(FLEET_TREE_MAX_WIDTH, Math.max(FLEET_TREE_MIN_WIDTH, raw));
}

export function saveFleetTreeWidth(width: number): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(WIDTH_KEY, String(Math.round(width)));
}

export function loadCollapsedNodeIds(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const stored = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]");
    return new Set(
      Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [],
    );
  } catch {
    return new Set();
  }
}

export function saveCollapsedNodeIds(ids: Set<string>): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...ids]));
}
