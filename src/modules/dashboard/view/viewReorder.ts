import type { DashboardView } from "../types";

export type DashboardViewReorderPlacement = "before" | "after";

export function reorderDashboardViews(
  views: readonly Pick<DashboardView, "id">[],
  draggedId: string,
  targetId: string,
  placement: DashboardViewReorderPlacement = "before",
): string[] | null {
  if (draggedId === targetId) return null;

  const orderedIds = views.map((view) => view.id);
  const draggedIndex = orderedIds.indexOf(draggedId);
  const targetIndex = orderedIds.indexOf(targetId);
  if (draggedIndex === -1 || targetIndex === -1) return null;

  const next = [...orderedIds];
  const [dragged] = next.splice(draggedIndex, 1);
  const targetIndexAfterRemoval = next.indexOf(targetId);
  if (targetIndexAfterRemoval === -1) return null;

  next.splice(placement === "after" ? targetIndexAfterRemoval + 1 : targetIndexAfterRemoval, 0, dragged);
  return next.join("\0") === orderedIds.join("\0") ? null : next;
}
