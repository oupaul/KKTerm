import {
  normalizeTutorialNavigationTarget,
  tutorialNavigationForTarget,
} from "./tutorialNavigationModel.ts";

const appearanceNavigation = tutorialNavigationForTarget("settings.appearance.colorScheme");

if (appearanceNavigation?.page !== "settings") {
  throw new Error("Color scheme tutorial target should navigate to Settings.");
}

if (appearanceNavigation.settingsSectionId !== "appearance-settings") {
  throw new Error("Color scheme tutorial target should navigate to Appearance settings.");
}

const parsedNavigation = normalizeTutorialNavigationTarget({
  page: "settings",
  settingsSectionId: "appearance-settings",
});

if (parsedNavigation?.page !== "settings") {
  throw new Error("Explicit Settings navigation should be accepted.");
}

if (parsedNavigation.settingsSectionId !== "appearance-settings") {
  throw new Error("Explicit Settings section navigation should be preserved.");
}

const invalidSectionNavigation = normalizeTutorialNavigationTarget({
  page: "settings",
  settingsSectionId: "definitely-not-settings",
});

if (invalidSectionNavigation) {
  throw new Error("Unknown Settings section navigation should be rejected.");
}

const missingTargetNavigation = tutorialNavigationForTarget("settings.missing.target");

if (missingTargetNavigation) {
  throw new Error("Unknown tutorial targets should not infer navigation.");
}
