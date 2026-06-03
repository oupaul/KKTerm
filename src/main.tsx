import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { WallpaperHost } from "./app/WallpaperHost";
import { ensureI18nReady } from "./i18n/config";

ensureI18nReady().then(() => {
  const Root = window.location.hash === "#/wallpaper" ? WallpaperHost : App;
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>,
  );
});
