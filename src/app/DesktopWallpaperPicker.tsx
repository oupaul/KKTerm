import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { SharedBackgroundPopover } from "../modules/dashboard/edit/SharedBackgroundPopover";
import { loadBackgroundImage } from "../modules/dashboard/state/persistence";
import type { DashboardBackground } from "../modules/dashboard/types";
import { useWorkspaceStore } from "../store";
import type { GeneralSettings } from "../types";

const WALLPAPER_PICKER_EVENT = "kkterm://desktop-wallpaper-pick";
const WALLPAPER_SETTINGS_EVENT = "kkterm://desktop-wallpaper-settings";

export function DesktopWallpaperPicker() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const generalSettings = useWorkspaceStore((state) => state.generalSettings);
  const setGeneralSettings = useWorkspaceStore((state) => state.setGeneralSettings);
  const background = generalSettings.desktopWallpaperBackground ?? null;

  const refreshSettings = useCallback(async () => {
    if (!isTauriRuntime()) return;
    const settings = await invokeCommand("get_general_settings", undefined);
    setGeneralSettings(settings);
  }, [setGeneralSettings]);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    const unlistenPicker = listen(WALLPAPER_PICKER_EVENT, () => {
      setError("");
      setOpen(true);
    });
    const unlistenSettings = listen<GeneralSettings | null>(
      WALLPAPER_SETTINGS_EVENT,
      (event) => {
        if (event.payload && typeof event.payload === "object") {
          setGeneralSettings(event.payload);
        } else {
          void refreshSettings();
        }
      },
    );
    return () => {
      void unlistenPicker.then((unlisten) => unlisten());
      void unlistenSettings.then((unlisten) => unlisten());
    };
  }, [refreshSettings, setGeneralSettings]);

  async function applyBackground(nextBackground: DashboardBackground | null) {
    setError("");
    try {
      const saved = nextBackground
        ? await invokeCommand("set_desktop_wallpaper", { background: nextBackground })
        : await invokeCommand("clear_desktop_wallpaper", undefined);
      setGeneralSettings(saved);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : String(updateError));
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="desktop-wallpaper-picker" role="presentation">
      <div
        className="desktop-wallpaper-picker-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t("app.wallpaperPickerTitle")}
      >
        <button
          className="desktop-wallpaper-picker-close"
          type="button"
          aria-label={t("app.titlebar.close")}
          onClick={() => setOpen(false)}
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
          onClose={() => setOpen(false)}
        />
        {error ? <p className="desktop-wallpaper-picker-error">{error}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
