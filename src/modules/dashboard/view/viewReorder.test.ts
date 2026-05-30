import type { DashboardView } from "../types";
import { reorderDashboardViews } from "./viewReorder";

const views: DashboardView[] = ["alpha", "bravo", "charlie"].map((title, index) => ({
  id: title,
  title,
  sortOrder: index,
  gridDensity: "default",
  background: null,
  tabColor: null,
}));

const reordered = reorderDashboardViews(views, "charlie", "alpha");

if (reordered?.join(",") !== "charlie,alpha,bravo") {
  throw new Error("Dashboard Views should move before the hovered View.");
}

const movedToEnd = reorderDashboardViews(views, "alpha", "charlie", "after");

if (movedToEnd?.join(",") !== "bravo,charlie,alpha") {
  throw new Error("Dashboard Views should move after the hovered View.");
}

if (reorderDashboardViews(views, "alpha", "alpha") !== null) {
  throw new Error("Dropping a Dashboard View onto itself should not request persistence.");
}

if (reorderDashboardViews(views, "alpha", "missing") !== null) {
  throw new Error("Dropping onto an unknown Dashboard View should not request persistence.");
}
