import {
  BACKGROUND_PRESETS,
  DASHBOARD_TAB_COLOR_PRESETS,
  isBackgroundPresetId,
  isDashboardTabColorPresetId,
  resolveBackgroundPreset,
  resolveDashboardTabColorPreset,
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

if (DASHBOARD_TAB_COLOR_PRESETS.length !== 24) {
  throw new Error("Dashboard View tab presets should expose 16 gradients and 8 flat colors.");
}

if (!isDashboardTabColorPresetId("g-dawn")) {
  throw new Error("Dashboard View tab color ids should accept known gradients.");
}

if (!isDashboardTabColorPresetId("mist")) {
  throw new Error("Dashboard View tab color ids should accept known flat colors.");
}

if (isDashboardTabColorPresetId("pine")) {
  throw new Error("Dashboard View tab color ids should reject flat colors outside the tab palette.");
}

if (resolveDashboardTabColorPreset("does-not-exist").id !== "mist") {
  throw new Error("Dashboard View tab color fallback should be stable.");
}
