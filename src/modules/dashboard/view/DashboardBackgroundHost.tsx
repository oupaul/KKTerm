import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useDashboardStore } from "../state/dashboardStore";
import type { BackgroundFit, DashboardView } from "../types";
import { useElementOnScreen, useEnvironmentVisible } from "./animationGating";
import { syncBackgroundVideoPlayback } from "./backgroundVideo";

function videoFitStyle(fit: BackgroundFit): CSSProperties {
  switch (fit) {
    case "fill":    return { objectFit: "cover", objectPosition: "center" };
    case "fit":     return { objectFit: "contain", objectPosition: "center" };
    case "stretch": return { objectFit: "fill" };
    case "tile":    return { objectFit: "none", objectPosition: "center" };
    case "center":  return { objectFit: "none", objectPosition: "center" };
  }
}

function dimColor(dim: number): string | undefined {
  if (dim === 0) return undefined;
  const alpha = Math.min(Math.abs(dim), 100) / 100;
  return dim < 0
    ? `rgba(0, 0, 0, ${alpha})`
    : `rgba(255, 255, 255, ${alpha})`;
}

export function getDashboardBackgroundVideoCacheKey(viewId: string, file: string) {
  return `${viewId}\u0000${file}`;
}

export function getDashboardBackgroundHostClassName() {
  return "dw-dashboard-background-host dw-canvas-bg-video";
}

export function DashboardBackgroundHost({
  activeView,
  dashboardActive,
  views,
}: {
  activeView: DashboardView;
  dashboardActive: boolean;
  views: DashboardView[];
}) {
  const backgroundImages = useDashboardStore((s) => s.backgroundImages);
  const loadBackgroundImage = useDashboardStore((s) => s.loadBackgroundImage);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const hostRef = useRef<HTMLDivElement | null>(null);
  const environmentVisible = useEnvironmentVisible();
  const hostOnScreen = useElementOnScreen(hostRef);
  const playbackEnabled = dashboardActive && environmentVisible && hostOnScreen;
  const [cachedVideoKeys, setCachedVideoKeys] = useState<string[]>([]);

  const activeVideo =
    activeView.background?.kind === "video" ? activeView.background : null;
  const activeVideoKey = activeVideo
    ? getDashboardBackgroundVideoCacheKey(activeView.id, activeVideo.file)
    : null;

  useEffect(() => {
    if (!activeVideo) return;
    const key = getDashboardBackgroundVideoCacheKey(activeView.id, activeVideo.file);
    void loadBackgroundImage(activeVideo.file);
    setCachedVideoKeys((keys) => (
      keys.includes(key) ? keys : [...keys, key]
    ));
  }, [activeView.id, activeVideo, loadBackgroundImage]);

  const entries = useMemo(() => (
    cachedVideoKeys.flatMap((key) => {
      const view = views.find((candidate) => (
        candidate.background?.kind === "video"
        && getDashboardBackgroundVideoCacheKey(candidate.id, candidate.background.file) === key
      ));
      if (!view || view.background?.kind !== "video") return [];
      const dataUrl = backgroundImages[view.background.file];
      if (!dataUrl) return [];
      const dim = dimColor(view.background.dim);
      const style: CSSProperties = {};
      if (dim) {
        (style as Record<string, string>)["--dw-bg-dim-color"] = dim;
      }
      return [{
        dataUrl,
        fit: view.background.fit,
        key,
        style,
      }];
    })
  ), [backgroundImages, cachedVideoKeys, views]);

  useEffect(() => {
    for (const entry of entries) {
      syncBackgroundVideoPlayback(
        videoRefs.current[entry.key] ?? null,
        playbackEnabled && entry.key === activeVideoKey,
      );
    }
  }, [activeVideoKey, playbackEnabled, entries]);

  return (
    <div ref={hostRef} className={getDashboardBackgroundHostClassName()} aria-hidden="true">
      {entries.map((entry) => {
        const active = playbackEnabled && entry.key === activeVideoKey;
        return (
          <div
            key={entry.key}
            className={`dw-canvas-bg-video-layer${active ? " active" : ""}`}
            style={entry.style}
          >
            <video
              autoPlay={active}
              loop
              muted
              onLoadedMetadata={(event) => syncBackgroundVideoPlayback(event.currentTarget, active)}
              onPlay={(event) => syncBackgroundVideoPlayback(event.currentTarget, active)}
              onVolumeChange={(event) => syncBackgroundVideoPlayback(event.currentTarget, active)}
              playsInline
              preload="auto"
              ref={(video) => {
                videoRefs.current[entry.key] = video;
                syncBackgroundVideoPlayback(video, active);
              }}
              src={entry.dataUrl}
              style={videoFitStyle(entry.fit)}
            />
          </div>
        );
      })}
    </div>
  );
}
