import { useSyncExternalStore } from "react";
import { defaultAppearanceSettings, defaultTerminalSettings } from "../app-defaults";
import { listCustomFontOptions, type CustomFontOption } from "./customFonts";
import type { RuntimePlatform } from "./platform";
import { currentPlatform } from "./platform";
import { loadCachedSystemFonts, refreshSystemFonts } from "./systemFonts";

export type FontPurpose = "app-ui" | "terminal";

export interface RecommendedFontOption {
  label?: string;
  labelKey?: string;
  value: string;
  family?: string;
  bundled?: boolean;
}

interface SystemFontCatalogSnapshot {
  customFonts: CustomFontOption[];
  customFontsLoaded: boolean;
  systemFonts: string[];
  refreshing: boolean;
  recommendationsSynced: boolean;
}

const APP_DEFAULT: RecommendedFontOption = {
  labelKey: "settings.uiFontDefault",
  value: defaultAppearanceSettings.appFontFamily,
};

const TERMINAL_DEFAULT: RecommendedFontOption = {
  labelKey: "settings.terminalFontDefault",
  value: defaultTerminalSettings.fontFamily,
};

const INTER: RecommendedFontOption = {
  label: "Inter",
  value: '"Inter", ui-sans-serif, system-ui, sans-serif',
  family: "Inter",
  bundled: true,
};

const APP_RECOMMENDATIONS: Record<RuntimePlatform, RecommendedFontOption[]> = {
  windows: [
    APP_DEFAULT,
    INTER,
    appFont("Segoe UI"),
    appFont("Arial"),
    appFont("Microsoft JhengHei UI"),
    appFont("Microsoft YaHei UI"),
    appFont("Yu Gothic UI"),
    appFont("Malgun Gothic"),
    appFont("Tahoma"),
    appFont("Consolas"),
  ],
  macos: [APP_DEFAULT, INTER, appFont("SF Pro Text"), appFont("Helvetica Neue")],
  linux: [
    APP_DEFAULT,
    INTER,
    appFont("Adwaita Sans"),
    appFont("Ubuntu Sans"),
    appFont("Cantarell"),
    appFont("Noto Sans"),
  ],
  unknown: [APP_DEFAULT, INTER],
};

const TERMINAL_RECOMMENDATIONS: Record<RuntimePlatform, RecommendedFontOption[]> = {
  windows: [
    TERMINAL_DEFAULT,
    terminalFont("Cascadia Mono"),
    terminalFont("Cascadia Code"),
    terminalFont("JetBrains Mono"),
    terminalFont("Consolas"),
    terminalFont("Courier New"),
    terminalFont("Fira Code"),
    terminalFont("Cascadia Code PL"),
  ],
  macos: [
    TERMINAL_DEFAULT,
    terminalFont("SF Mono"),
    terminalFont("Menlo"),
    terminalFont("JetBrains Mono"),
    terminalFont("Fira Code"),
  ],
  linux: [
    TERMINAL_DEFAULT,
    terminalFont("Adwaita Mono"),
    terminalFont("Ubuntu Mono"),
    terminalFont("JetBrains Mono"),
    terminalFont("Fira Code"),
    terminalFont("Source Code Pro"),
    terminalFont("DejaVu Sans Mono"),
  ],
  unknown: [TERMINAL_DEFAULT, terminalFont("JetBrains Mono"), terminalFont("Fira Code")],
};

let snapshot: SystemFontCatalogSnapshot = {
  customFonts: [],
  customFontsLoaded: false,
  systemFonts: loadCachedSystemFonts(),
  refreshing: false,
  recommendationsSynced: false,
};
const listeners = new Set<() => void>();

function appFont(family: string): RecommendedFontOption {
  return {
    label: family,
    value: `"${family}", ui-sans-serif, system-ui, sans-serif`,
    family,
  };
}

function terminalFont(family: string): RecommendedFontOption {
  return {
    label: family,
    value: `"${family}", monospace`,
    family,
  };
}

function publish(next: SystemFontCatalogSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function getRecommendedFontOptions(
  purpose: FontPurpose,
  platform = currentPlatform(),
  installedFonts?: string[],
): RecommendedFontOption[] {
  const options = purpose === "app-ui" ? APP_RECOMMENDATIONS[platform] : TERMINAL_RECOMMENDATIONS[platform];
  if (installedFonts === undefined || installedFonts.length === 0) return options;

  const installed = new Set(installedFonts.map((family) => family.trim().toLowerCase()));
  return options.filter((option) =>
    option.family === undefined || option.bundled || installed.has(option.family.toLowerCase()),
  );
}

export function systemFontCatalogSnapshot(): SystemFontCatalogSnapshot {
  return snapshot;
}

export function subscribeSystemFontCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSystemFontCatalog(): SystemFontCatalogSnapshot {
  return useSyncExternalStore(
    subscribeSystemFontCatalog,
    systemFontCatalogSnapshot,
    systemFontCatalogSnapshot,
  );
}

export async function loadSharedCustomFonts(
  scan: () => Promise<CustomFontOption[]> = listCustomFontOptions,
): Promise<CustomFontOption[]> {
  if (snapshot.customFontsLoaded) return snapshot.customFonts;

  const customFonts = await scan();
  publish({ ...snapshot, customFonts, customFontsLoaded: true });
  return customFonts;
}

export async function refreshSharedFontCatalog(
  systemScan: () => Promise<string[]> = refreshSystemFonts,
  customScan: () => Promise<CustomFontOption[]> = listCustomFontOptions,
): Promise<void> {
  if (snapshot.refreshing) return;

  publish({ ...snapshot, refreshing: true });
  try {
    const [systemFonts, customFonts] = await Promise.all([systemScan(), customScan()]);
    publish({
      systemFonts,
      customFonts,
      customFontsLoaded: true,
      refreshing: false,
      recommendationsSynced: true,
    });
  } catch (error) {
    publish({ ...snapshot, refreshing: false });
    throw error;
  }
}
