import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DesktopWallpaperPicker } from "./app/DesktopWallpaperPicker";
import { WallpaperHost } from "./app/WallpaperHost";
import { ensureI18nReady } from "./i18n/config";

function rootComponent() {
  if (window.location.hash === "#/wallpaper") return WallpaperHost;
  if (window.location.hash === "#/wallpaper-picker") return DesktopWallpaperPicker;
  return App;
}

ensureI18nReady().then(() => {
  const Root = rootComponent();
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>,
  );
});
