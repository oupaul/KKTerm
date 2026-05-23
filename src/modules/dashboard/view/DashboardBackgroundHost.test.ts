import {
  getDashboardBackgroundHostClassName,
  getDashboardBackgroundVideoCacheKey,
} from "./DashboardBackgroundHost";

const firstKey = getDashboardBackgroundVideoCacheKey("view-a", "wallpaper.mp4");
const secondKey = getDashboardBackgroundVideoCacheKey("view-b", "wallpaper.mp4");

if (firstKey === secondKey) {
  throw new Error("Dashboard video wallpaper cache keys should be scoped to the view and file.");
}

if (firstKey !== "view-a\u0000wallpaper.mp4") {
  throw new Error("Dashboard video wallpaper cache key should be stable.");
}

if (getDashboardBackgroundHostClassName() !== "dw-dashboard-background-host dw-canvas-bg-video") {
  throw new Error("Dashboard video wallpaper host should use the stable scroll-level background placement class.");
}
