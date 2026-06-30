// Persistence for the Sites tree navigator (docs/SITE.md Rack View): the panel
// width and the set of collapsed node ids, mirrored on localStorage like the
// Connection tree's `connectionSidebarState`. Node ids are stable path strings
// ("site:<id>", "region:<id>/<region>", …) so collapse survives reloads.

const WIDTH_KEY = "kkterm.itopsSiteTreeWidth";
const PANEL_COLLAPSED_KEY = "kkterm.itopsSiteTreePanelCollapsed";
const COLLAPSED_KEY = "kkterm.itopsSiteTreeCollapsed";
const ROOM_VIEW_KEY = "kkterm.itopsRoomViewMode";
const ROOM_METRIC_KEY = "kkterm.itopsRoomFloorMetric";
const FREE_LAYOUT_KEY = "kkterm.itopsFreePlacement";

export const SITE_TREE_MIN_WIDTH = 200;
export const SITE_TREE_MAX_WIDTH = 460;
export const SITE_TREE_DEFAULT_WIDTH = 268;
export const SITE_TREE_COLLAPSED_WIDTH = 0;

export function loadSiteTreeWidth(): number {
  if (typeof localStorage === "undefined") return SITE_TREE_DEFAULT_WIDTH;
  const raw = Number(localStorage.getItem(WIDTH_KEY));
  if (!Number.isFinite(raw) || raw <= 0) return SITE_TREE_DEFAULT_WIDTH;
  return Math.min(SITE_TREE_MAX_WIDTH, Math.max(SITE_TREE_MIN_WIDTH, raw));
}

export function saveSiteTreeWidth(width: number): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(WIDTH_KEY, String(Math.round(width)));
}

export function loadSiteTreeCollapsed(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(PANEL_COLLAPSED_KEY) === "true";
}

export function saveSiteTreeCollapsed(collapsed: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PANEL_COLLAPSED_KEY, collapsed ? "true" : "false");
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

// Server Room View layout: rack elevations (default) or the top-down floor plan.
export type RoomViewMode = "elevation" | "floor";

export function loadRoomViewMode(): RoomViewMode {
  if (typeof localStorage === "undefined") return "elevation";
  return localStorage.getItem(ROOM_VIEW_KEY) === "floor" ? "floor" : "elevation";
}

export function saveRoomViewMode(mode: RoomViewMode): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(ROOM_VIEW_KEY, mode);
}

// Which dimension colours the floor-plan tiles.
export type RoomFloorMetric = "health" | "utilization";

export function loadRoomFloorMetric(): RoomFloorMetric {
  if (typeof localStorage === "undefined") return "health";
  return localStorage.getItem(ROOM_METRIC_KEY) === "utilization" ? "utilization" : "health";
}

export function saveRoomFloorMetric(metric: RoomFloorMetric): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(ROOM_METRIC_KEY, metric);
}

export interface FreePlacement {
  x: number;
  y: number;
}

export type FreePlacementMap = Record<string, FreePlacement>;

function readFreePlacementStore(): Record<string, FreePlacementMap> {
  if (typeof localStorage === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(FREE_LAYOUT_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const store: Record<string, FreePlacementMap> = {};
    for (const [scope, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const entries: FreePlacementMap = {};
      for (const [id, point] of Object.entries(value)) {
        if (!point || typeof point !== "object" || Array.isArray(point)) continue;
        const x = Number((point as FreePlacement).x);
        const y = Number((point as FreePlacement).y);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          entries[id] = { x, y };
        }
      }
      store[scope] = entries;
    }
    return store;
  } catch {
    return {};
  }
}

export function loadFreePlacement(scope: string): FreePlacementMap {
  return readFreePlacementStore()[scope] ?? {};
}

export function saveFreePlacement(scope: string, placement: FreePlacementMap): void {
  if (typeof localStorage === "undefined") return;
  const store = readFreePlacementStore();
  store[scope] = placement;
  localStorage.setItem(FREE_LAYOUT_KEY, JSON.stringify(store));
}
