import {
  buildSettingsAssistantContext,
  settingsTutorialTargetForPrompt,
  type SettingsSectionId,
} from "./settingsAssistantContext.ts";

const appearance = buildSettingsAssistantContext("appearance-settings");

if (appearance.contextKind !== "settings") {
  throw new Error("Settings context should identify itself as settings context.");
}

if (!appearance.contextLabel.includes("Appearance")) {
  throw new Error("Appearance context should name the active Settings section.");
}

if (!appearance.text.includes("settings.colorScheme")) {
  throw new Error("Appearance context should include the color scheme control key.");
}

if (!appearance.text.includes("settings.appUiFontFamily")) {
  throw new Error("Appearance context should include the UI font control key.");
}

const general = buildSettingsAssistantContext("general-settings");

if (!general.text.includes("settings.language")) {
  throw new Error("General context should include the language control key.");
}

if (!general.text.includes("Tutorial target: settings.language.")) {
  throw new Error("General context should include the language tutorial target.");
}

if (!general.text.includes("Tutorial target: settings.statusBar.")) {
  throw new Error("General context should include the Status Bar tutorial target.");
}

if (!general.text.includes("settings.advancedDebugging")) {
  throw new Error("General context should include the Advanced Debugging control key.");
}

if (!general.text.includes("Tutorial target: settings.debug.")) {
  throw new Error("General context should include the Debug tutorial target.");
}

const colorTarget = settingsTutorialTargetForPrompt(
  "How do I change color?",
  "appearance-settings",
);

if (colorTarget?.targetId !== "settings.appearance.colorScheme") {
  throw new Error("Color questions in Appearance should resolve to the color scheme target.");
}

const nonAppearanceTarget = settingsTutorialTargetForPrompt(
  "How do I change color?",
  "general-settings",
);

if (nonAppearanceTarget) {
  throw new Error("Color scheme tutorial target should only be returned for Appearance settings.");
}

const languageTarget = settingsTutorialTargetForPrompt(
  "How do I change language?",
  "general-settings",
);

if (languageTarget?.targetId !== "settings.language") {
  throw new Error("Language questions in General should resolve to the language target.");
}

const sectionIds: SettingsSectionId[] = [
  "general-settings",
  "appearance-settings",
  "dashboard-settings",
  "credentials-settings",
  "assistant-settings",
  "ssh-settings",
  "terminal-settings",
  "url-settings",
  "rdp-settings",
  "vnc-settings",
  "about-settings",
];

for (const sectionId of sectionIds) {
  const context = buildSettingsAssistantContext(sectionId);
  if (!context.text.includes("Active Settings section:")) {
    throw new Error(`Settings context for ${sectionId} should include a section summary.`);
  }
}
