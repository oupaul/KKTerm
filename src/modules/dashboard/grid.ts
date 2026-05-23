import type { DashboardWidgetInstance } from "./types";

export const MAX_DASHBOARD_GRID_ROWS = 1000;

export function clampDashboardGridY(gridY: number, gridH: number): number {
  const height = Number.isFinite(gridH) ? Math.max(1, Math.floor(gridH)) : 1;
  const maxY = Math.max(0, MAX_DASHBOARD_GRID_ROWS - height);
  if (!Number.isFinite(gridY) || gridY < 0) {
    return 0;
  }
  return Math.min(maxY, Math.floor(gridY));
}

export function nextDashboardAppendGridY(
  instances: readonly Pick<DashboardWidgetInstance, "viewId" | "gridY" | "gridH">[],
  viewId: string,
  gridH: number,
): number {
  const bottom = instances
    .filter((instance) => instance.viewId === viewId)
    .reduce((max, instance) => {
      const y = clampDashboardGridY(instance.gridY, instance.gridH);
      const height = Number.isFinite(instance.gridH) ? Math.max(1, Math.floor(instance.gridH)) : 1;
      return Math.max(max, y + height);
    }, 0);
  return clampDashboardGridY(bottom, gridH);
}
