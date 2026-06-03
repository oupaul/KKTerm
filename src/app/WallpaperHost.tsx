import "../App.css";
import { DashboardDynamicBackground, DYNAMIC_BACKGROUNDS } from "../modules/dashboard/registry/dynamicBackgrounds";

const DEFAULT_WALLPAPER_DYNAMIC_ID = DYNAMIC_BACKGROUNDS[0]?.id ?? "";

export function WallpaperHost() {
  return (
    <main className="kk-wallpaper-host" aria-hidden="true">
      {DEFAULT_WALLPAPER_DYNAMIC_ID ? (
        <DashboardDynamicBackground active={true} id={DEFAULT_WALLPAPER_DYNAMIC_ID} />
      ) : null}
    </main>
  );
}
