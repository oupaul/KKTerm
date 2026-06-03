import { listen } from "@tauri-apps/api/event";
import { useEffect, useState, type CSSProperties } from "react";
import "../App.css";
import { invokeCommand, isTauriRuntime } from "../lib/tauri";
import { resolveBackgroundPreset } from "../modules/dashboard/registry/backgroundPresets";
import { DashboardDynamicBackground } from "../modules/dashboard/registry/dynamicBackgrounds";
import { loadBackgroundImage } from "../modules/dashboard/state/persistence";
import type { BackgroundFit, DashboardBackground } from "../modules/dashboard/types";
import type { GeneralSettings } from "../types";

const WALLPAPER_SETTINGS_EVENT = "kkterm://desktop-wallpaper-settings";
const WALLPAPER_PAUSED_EVENT = "kkterm://desktop-wallpaper-paused";

export function WallpaperHost() {
  const [background, setBackground] = useState<DashboardBackground | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    void loadWallpaperSettings().then(setBackground);
    if (!isTauriRuntime()) return;
    const unlistenSettings = listen<GeneralSettings | null>(
      WALLPAPER_SETTINGS_EVENT,
      (event) => {
        if (event.payload && typeof event.payload === "object") {
          setBackground(event.payload.desktopWallpaperBackground ?? null);
        } else {
          void loadWallpaperSettings().then(setBackground);
        }
      },
    );
    const unlistenPaused = listen<boolean>(WALLPAPER_PAUSED_EVENT, (event) => {
      setPaused(Boolean(event.payload));
    });
    return () => {
      void unlistenSettings.then((unlisten) => unlisten());
      void unlistenPaused.then((unlisten) => unlisten());
    };
  }, []);

  return (
    <main className="kk-wallpaper-host" aria-hidden="true">
      <WallpaperBackgroundLayer active={!paused} background={background} />
    </main>
  );
}

function WallpaperBackgroundLayer({
  active,
  background,
}: {
  active: boolean;
  background: DashboardBackground | null;
}) {
  const [mediaDataUrl, setMediaDataUrl] = useState("");
  const mediaFile = background?.kind === "image" || background?.kind === "video" ? background.file : "";

  useEffect(() => {
    let cancelled = false;
    setMediaDataUrl("");
    if (!mediaFile) return;
    void loadBackgroundImage(mediaFile).then((dataUrl) => {
      if (!cancelled) setMediaDataUrl(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [mediaFile]);

  if (!background) return null;

  if (background.kind === "preset") {
    return (
      <div
        className="kk-wallpaper-layer"
        style={{ background: resolveBackgroundPreset(background.preset).css }}
      />
    );
  }

  if (background.kind === "dynamic") {
    return <DashboardDynamicBackground active={active} id={background.dynamic} />;
  }

  if (background.kind === "image" && mediaDataUrl) {
    const style: CSSProperties = {
      backgroundImage: `url("${mediaDataUrl}")`,
      ...backgroundFitStyle(background.fit),
    };
    const dim = dimColor(background.dim);
    if (dim) {
      (style as Record<string, string>)["--kk-wallpaper-dim-color"] = dim;
    }
    return <div className="kk-wallpaper-layer kk-wallpaper-media" style={style} />;
  }

  if (background.kind === "video" && mediaDataUrl && active) {
    const dim = dimColor(background.dim);
    const style = dim ? ({ "--kk-wallpaper-dim-color": dim } as CSSProperties) : undefined;
    return (
      <div className="kk-wallpaper-layer kk-wallpaper-media" style={style}>
        <video
          aria-hidden="true"
          autoPlay
          loop
          muted
          playsInline
          src={mediaDataUrl}
          style={videoFitStyle(background.fit)}
        />
      </div>
    );
  }

  return null;
}

async function loadWallpaperSettings() {
  if (!isTauriRuntime()) return null;
  const settings = await invokeCommand("get_general_settings", undefined);
  return settings.desktopWallpaperBackground ?? null;
}

function backgroundFitStyle(fit: BackgroundFit): CSSProperties {
  switch (fit) {
    case "fill":
      return { backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center" };
    case "fit":
      return { backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" };
    case "stretch":
      return { backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" };
    case "tile":
      return { backgroundSize: "auto", backgroundRepeat: "repeat" };
    case "center":
      return { backgroundSize: "auto", backgroundRepeat: "no-repeat", backgroundPosition: "center" };
  }
}

function videoFitStyle(fit: BackgroundFit): CSSProperties {
  switch (fit) {
    case "fill":
      return { objectFit: "cover" };
    case "fit":
      return { objectFit: "contain" };
    case "stretch":
      return { objectFit: "fill" };
    case "tile":
      return { objectFit: "cover" };
    case "center":
      return { objectFit: "none" };
  }
}

function dimColor(dim: number): string | undefined {
  if (dim === 0) return undefined;
  const alpha = Math.min(Math.abs(dim), 100) / 100;
  return dim < 0
    ? `rgba(0, 0, 0, ${alpha})`
    : `rgba(255, 255, 255, ${alpha})`;
}
