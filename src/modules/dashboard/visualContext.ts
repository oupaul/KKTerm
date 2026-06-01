import type { DashboardBackground, DashboardView } from "./types";

export type DashboardBackgroundTone = "light" | "dark" | "mixed";
export type DashboardVisualColorScheme = "light" | "dark";

export interface DashboardVisualContext {
  colorScheme: DashboardVisualColorScheme;
  backgroundKind: DashboardBackground["kind"] | "app";
  backgroundTone: DashboardBackgroundTone;
  backgroundId?: string;
  requiresOpaqueTextSurface: boolean;
}

const DARK_DYNAMIC_BACKGROUND_IDS = new Set(["starfield", "nebula", "matrix", "synthwave", "particleCursor"]);
const DARK_BACKGROUND_PRESET_IDS = new Set([
  "graphite",
  "midnight",
  "pine",
  "aubergine",
  "ember",
  "harbor",
  "moss",
  "wine",
  "steel",
  "g-twilight",
  "g-midnight",
  "g-harbor",
  "g-ember",
  "g-orchid",
  "g-forest",
  "g-eclipse",
  "g-cobalt",
  "g-nocturne",
]);

export function dashboardVisualContextForView(
  view: Pick<DashboardView, "background">,
): DashboardVisualContext {
  const background = view.background;
  if (!background) {
    return {
      colorScheme: "light",
      backgroundKind: "app",
      backgroundTone: "light",
      requiresOpaqueTextSurface: false,
    };
  }

  if (background.kind === "preset") {
    const tone = DARK_BACKGROUND_PRESET_IDS.has(background.preset) ? "dark" : "light";
    return {
      colorScheme: tone === "dark" ? "dark" : "light",
      backgroundKind: "preset",
      backgroundTone: tone,
      backgroundId: background.preset,
      requiresOpaqueTextSurface: false,
    };
  }

  if (background.kind === "dynamic") {
    const tone = DARK_DYNAMIC_BACKGROUND_IDS.has(background.dynamic) ? "dark" : "mixed";
    return {
      colorScheme: tone === "dark" ? "dark" : "light",
      backgroundKind: "dynamic",
      backgroundTone: tone,
      backgroundId: background.dynamic,
      requiresOpaqueTextSurface: tone === "mixed",
    };
  }

  return {
    colorScheme: "light",
    backgroundKind: background.kind,
    backgroundTone: "mixed",
    backgroundId: background.file,
    requiresOpaqueTextSurface: true,
  };
}
