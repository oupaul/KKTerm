import type { ActivePage } from "./ActivityRail";
import type { SettingsSectionId } from "../settings/settingsAssistantContext";

export type TutorialNavigationTarget = {
  page: ActivePage;
  settingsSectionId?: SettingsSectionId;
};

const SETTINGS_SECTION_IDS = new Set<SettingsSectionId>([
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
]);

const TUTORIAL_TARGET_NAVIGATION: Record<string, TutorialNavigationTarget> = {
  "settings.appearance.colorScheme": {
    page: "settings",
    settingsSectionId: "appearance-settings",
  },
};

export function tutorialNavigationForTarget(
  targetId: string,
): TutorialNavigationTarget | undefined {
  return TUTORIAL_TARGET_NAVIGATION[targetId.trim()];
}

export function normalizeTutorialNavigationTarget(
  value: unknown,
): TutorialNavigationTarget | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const page = normalizeTutorialPage(candidate.page);
  const settingsSectionId = normalizeSettingsSectionId(candidate.settingsSectionId);

  if (candidate.settingsSectionId !== undefined && !settingsSectionId) {
    return undefined;
  }

  if (page) {
    if (page !== "settings" && settingsSectionId) {
      return undefined;
    }
    return settingsSectionId ? { page, settingsSectionId } : { page };
  }

  return settingsSectionId ? { page: "settings", settingsSectionId } : undefined;
}

function normalizeTutorialPage(value: unknown): ActivePage | undefined {
  if (value === "workspace" || value === "dashboard" || value === "settings") {
    return value;
  }
  return undefined;
}

function normalizeSettingsSectionId(value: unknown): SettingsSectionId | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim() as SettingsSectionId;
  return SETTINGS_SECTION_IDS.has(trimmed) ? trimmed : undefined;
}
