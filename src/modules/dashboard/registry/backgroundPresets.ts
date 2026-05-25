export interface BackgroundPresetDefinition {
  id: string;
  labelKey: string;       // i18n key under dashboard.backgroundPresets.*
  css: string;            // literal CSS `background` value
}

export const BACKGROUND_PRESETS: readonly BackgroundPresetDefinition[] = [
  { id: "mist",       labelKey: "dashboard.backgroundPresets.mist",     css: "#eceef1" },
  { id: "sand",       labelKey: "dashboard.backgroundPresets.sand",     css: "#f3efe7" },
  { id: "sage",       labelKey: "dashboard.backgroundPresets.sage",     css: "#e9efe9" },
  { id: "sky",        labelKey: "dashboard.backgroundPresets.sky",      css: "#e8eef3" },
  { id: "blush",      labelKey: "dashboard.backgroundPresets.blush",    css: "#f3ecef" },
  { id: "lavender",   labelKey: "dashboard.backgroundPresets.lavender", css: "#eceaf2" },
  { id: "slate",      labelKey: "dashboard.backgroundPresets.slate",    css: "#e5e8ee" },
  { id: "graphite",   labelKey: "dashboard.backgroundPresets.graphite", css: "#2a2e37" },
  { id: "midnight",   labelKey: "dashboard.backgroundPresets.midnight", css: "#111827" },
  { id: "pine",       labelKey: "dashboard.backgroundPresets.pine",     css: "#12362f" },
  { id: "aubergine",  labelKey: "dashboard.backgroundPresets.aubergine", css: "#2d1b3d" },
  { id: "ember",      labelKey: "dashboard.backgroundPresets.ember",    css: "#3b1f1f" },
  { id: "harbor",     labelKey: "dashboard.backgroundPresets.harbor",   css: "#102f3a" },
  { id: "moss",       labelKey: "dashboard.backgroundPresets.moss",     css: "#263b2f" },
  { id: "wine",       labelKey: "dashboard.backgroundPresets.wine",     css: "#3a1723" },
  { id: "steel",      labelKey: "dashboard.backgroundPresets.steel",    css: "#202936" },
  { id: "g-dawn",     labelKey: "dashboard.backgroundPresets.gDawn",    css: "linear-gradient(135deg, #f7d6b4 0%, #e9edf2 50%, #b7d1ea 100%)" },
  { id: "g-fog",      labelKey: "dashboard.backgroundPresets.gFog",     css: "linear-gradient(135deg, #f8fafc 0%, #d7dee8 48%, #aeb8c8 100%)" },
  { id: "g-meadow",   labelKey: "dashboard.backgroundPresets.gMeadow",  css: "linear-gradient(135deg, #f4efc8 0%, #d7ead7 48%, #98c7ad 100%)" },
  { id: "g-dusk",     labelKey: "dashboard.backgroundPresets.gDusk",    css: "linear-gradient(135deg, #f0d4df 0%, #d7d2ee 52%, #aeb8d3 100%)" },
  { id: "g-linen",    labelKey: "dashboard.backgroundPresets.gLinen",   css: "linear-gradient(135deg, #fff4da 0%, #eadfc8 48%, #cbb891 100%)" },
  { id: "g-horizon",  labelKey: "dashboard.backgroundPresets.gHorizon", css: "linear-gradient(135deg, #c6e4f5 0%, #eef2f5 45%, #f4d1a6 100%)" },
  { id: "g-petal",    labelKey: "dashboard.backgroundPresets.gPetal",   css: "linear-gradient(135deg, #f7ccd9 0%, #eee0f3 48%, #c8d7f0 100%)" },
  { id: "g-twilight", labelKey: "dashboard.backgroundPresets.gTwilight", css: "linear-gradient(135deg, #46506a 0%, #2c3040 48%, #171a22 100%)" },
  { id: "g-midnight", labelKey: "dashboard.backgroundPresets.gMidnight", css: "linear-gradient(135deg, #0b1020 0%, #172554 48%, #020617 100%)" },
  { id: "g-harbor",   labelKey: "dashboard.backgroundPresets.gHarbor",  css: "linear-gradient(135deg, #082f49 0%, #0f766e 52%, #111827 100%)" },
  { id: "g-ember",    labelKey: "dashboard.backgroundPresets.gEmber",   css: "linear-gradient(135deg, #431407 0%, #7f1d1d 48%, #111827 100%)" },
  { id: "g-orchid",   labelKey: "dashboard.backgroundPresets.gOrchid",  css: "linear-gradient(135deg, #2e1065 0%, #701a75 52%, #111827 100%)" },
  { id: "g-forest",   labelKey: "dashboard.backgroundPresets.gForest",  css: "linear-gradient(135deg, #052e16 0%, #14532d 50%, #0f172a 100%)" },
  { id: "g-eclipse",  labelKey: "dashboard.backgroundPresets.gEclipse", css: "linear-gradient(135deg, #18181b 0%, #3f3f46 48%, #713f12 100%)" },
  { id: "g-cobalt",   labelKey: "dashboard.backgroundPresets.gCobalt",  css: "linear-gradient(135deg, #0c4a6e 0%, #1d4ed8 48%, #020617 100%)" },
  { id: "g-nocturne", labelKey: "dashboard.backgroundPresets.gNocturne", css: "linear-gradient(135deg, #020617 0%, #312e81 52%, #0f172a 100%)" },
] as const;

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

export function resolveBackgroundPreset(id: string): BackgroundPresetDefinition {
  return BACKGROUND_PRESETS.find((preset) => preset.id === id) ?? BACKGROUND_PRESETS[0];
}

export function isBackgroundPresetId(value: string): value is (typeof BACKGROUND_PRESETS)[number]["id"] {
  return BACKGROUND_PRESETS.some((preset) => preset.id === value);
}

export function isDarkBackgroundPresetId(value: string): boolean {
  return DARK_BACKGROUND_PRESET_IDS.has(value);
}

const DASHBOARD_TAB_FLAT_COLOR_IDS = new Set([
  "mist",
  "sand",
  "sage",
  "sky",
  "blush",
  "lavender",
  "graphite",
  "midnight",
]);

export const DASHBOARD_TAB_COLOR_PRESETS = BACKGROUND_PRESETS.filter((preset) => (
  preset.id.startsWith("g-") || DASHBOARD_TAB_FLAT_COLOR_IDS.has(preset.id)
));

export function resolveDashboardTabColorPreset(id: string): BackgroundPresetDefinition {
  return DASHBOARD_TAB_COLOR_PRESETS.find((preset) => preset.id === id)
    ?? DASHBOARD_TAB_COLOR_PRESETS[0];
}

export function isDashboardTabColorPresetId(value: string): value is (typeof DASHBOARD_TAB_COLOR_PRESETS)[number]["id"] {
  return DASHBOARD_TAB_COLOR_PRESETS.some((preset) => preset.id === value);
}
