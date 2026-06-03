import { readFileSync } from "node:fs";

const tray = readFileSync("src-tauri/src/app_tray.rs", "utf8");
const desktopWallpaper = readFileSync("src-tauri/src/desktop_wallpaper.rs", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
const main = readFileSync("src/main.tsx", "utf8");

const setHandler = tray.match(/if id == WALLPAPER_SET_ITEM_ID \{([\s\S]*?)\n    \}/)?.[1] ?? "";

if (!setHandler.includes("open_wallpaper_picker")) {
  throw new Error("Tray Wallpaper > Set should open the standalone wallpaper picker window.");
}

if (setHandler.includes("restore_main_window")) {
  throw new Error("Tray Wallpaper > Set must not restore or focus the main KKTerm window.");
}

if (setHandler.includes("WALLPAPER_PICKER_EVENT")) {
  throw new Error("Tray Wallpaper > Set must not emit the old inline picker event.");
}

if (app.includes("DesktopWallpaperPicker")) {
  throw new Error("The main app tree should not mount the desktop wallpaper picker.");
}

if (!main.includes("#/wallpaper-picker") || !main.includes("DesktopWallpaperPicker")) {
  throw new Error("The standalone wallpaper picker route should be registered in main.tsx.");
}

if (!desktopWallpaper.includes("WALLPAPER_PICKER_WINDOW_LABEL")) {
  throw new Error("The standalone wallpaper picker window label should live with desktop wallpaper hosting.");
}

if (!desktopWallpaper.includes(".focusable(false)") || !desktopWallpaper.includes(".focused(false)")) {
  throw new Error("The wallpaper host window should be non-focusable and non-focused.");
}

if (!desktopWallpaper.includes("WS_EX_NOACTIVATE") || !desktopWallpaper.includes("WS_EX_TOOLWINDOW")) {
  throw new Error("The wallpaper HWND should use no-activate tool-window extended styles.");
}

const setFunction = desktopWallpaper.match(/pub fn set<R: Runtime>[\s\S]*?\n    \}/)?.[0] ?? "";
if (setFunction.includes("window.show()")) {
  throw new Error("The wallpaper host should avoid Tauri's normal show path after WorkerW attachment.");
}
