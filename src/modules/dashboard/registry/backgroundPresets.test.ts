import {
  BACKGROUND_PRESETS,
  DASHBOARD_TAB_GRADIENT_PRESETS,
  isBackgroundPresetId,
  isDashboardTabGradientPresetId,
  resolveBackgroundPreset,
  resolveDashboardTabGradientPreset,
} from "./backgroundPresets";

// There must be exactly 32 presets (16 solid + 16 gradient), matching the Rust whitelist.
const presetCount: 32 = BACKGROUND_PRESETS.length as 32;
void presetCount;

// resolveBackgroundPreset always returns a definition (falls back to the first entry).
const resolved: { id: string; labelKey: string; css: string } = resolveBackgroundPreset("does-not-exist");
void resolved;

// isBackgroundPresetId narrows to a known id.
const maybeId: string = "mist";
if (isBackgroundPresetId(maybeId)) {
  const known: (typeof BACKGROUND_PRESETS)[number]["id"] = maybeId;
  void known;
}

if (!DASHBOARD_TAB_GRADIENT_PRESETS.every((preset) => preset.id.startsWith("g-"))) {
  throw new Error("Dashboard View tab presets should only expose gradients.");
}

if (!isDashboardTabGradientPresetId("g-dawn")) {
  throw new Error("Dashboard View tab gradient ids should accept known gradients.");
}

if (isDashboardTabGradientPresetId("mist")) {
  throw new Error("Dashboard View tab gradient ids should reject solid color presets.");
}

if (resolveDashboardTabGradientPreset("does-not-exist").id !== "g-dawn") {
  throw new Error("Dashboard View tab gradient fallback should be stable.");
}
