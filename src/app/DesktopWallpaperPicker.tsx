import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { SharedBackgroundPopover } from "../modules/dashboard/edit/SharedBackgroundPopover";
import { loadBackgroundImage } from "../modules/dashboard/state/persistence";
import type { DashboardBackground } from "../modules/dashboard/types";
import type { GeneralSettings } from "../types";
import "../App.css";

const WALLPAPER_SETTINGS_EVENT = "kkterm://desktop-wallpaper-settings";

export function DesktopWallpaperPicker() {
  const { t } = useTranslation();
  const [background, setBackground] = useState<DashboardBackground | null>(null);
  const [error, setError] = useState("");

  const refreshSettings = useCallback(async () => {
    if (!isTauriRuntime()) return;
    const settings = await invokeCommand("get_general_settings", undefined);
    setBackground(settings.desktopWallpaperBackground ?? null);
  }, []);

  const closePicker = useCallback(() => {
    if (isTauriRuntime()) {
      void getCurrentWindow().close();
    }
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    void refreshSettings();
    const unlistenSettings = listen<GeneralSettings | null>(
      WALLPAPER_SETTINGS_EVENT,
      (event) => {
        if (event.payload && typeof event.payload === "object") {
          setBackground(event.payload.desktopWallpaperBackground ?? null);
        } else {
          void refreshSettings();
        }
      },
    );
    return () => {
      void unlistenSettings.then((unlisten) => unlisten());
    };
  }, [refreshSettings]);

  async function applyBackground(nextBackground: DashboardBackground | null) {
    setError("");
    try {
      if (nextBackground) {
        await invokeCommand("set_desktop_wallpaper", { background: nextBackground });
      } else {
        await invokeCommand("clear_desktop_wallpaper", undefined);
      }
      setBackground(nextBackground);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : String(updateError));
    }
  }

  return (
    <main className="desktop-wallpaper-picker" role="dialog" aria-label={t("app.wallpaperPickerTitle")}>
      <div
        className="desktop-wallpaper-picker-panel"
      >
        <button
          className="desktop-wallpaper-picker-close"
          type="button"
          aria-label={t("app.titlebar.close")}
          onClick={closePicker}
        >
          &times;
        </button>
        <SharedBackgroundPopover
          background={background}
          titleKey="app.wallpaperPickerTitle"
          defaultHintKey="app.wallpaperPickerDefaultHint"
          className="desktop-wallpaper-picker-popover"
          onBackgroundChange={applyBackground}
          onLoadBackgroundImage={async (file) => {
            await loadBackgroundImage(file);
          }}
          onClose={closePicker}
        />
        {error ? <p className="desktop-wallpaper-picker-error">{error}</p> : null}
      </div>
    </main>
  );
}
