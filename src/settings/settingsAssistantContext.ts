export type SettingsSectionId =
  | "general-settings"
  | "appearance-settings"
  | "dashboard-settings"
  | "credentials-settings"
  | "assistant-settings"
  | "ssh-settings"
  | "terminal-settings"
  | "url-settings"
  | "rdp-settings"
  | "vnc-settings"
  | "about-settings";

export type SettingsAssistantContext = {
  contextKind: "settings";
  contextLabel: string;
  connectionLabel: string;
  sourceLabel: string;
  text: string;
};

export type SettingsTutorialTarget = {
  targetId: string;
  titleKey: string;
  bodyKey: string;
};

type Translate = (key: string, fallback: string) => string;

type SettingsControlSummary = {
  key: string;
  description: string;
  tutorialTargetId?: string;
};

type SettingsSectionSummary = {
  labelKey: string;
  fallbackLabel: string;
  controls: SettingsControlSummary[];
};

const SETTINGS_SECTIONS: Record<SettingsSectionId, SettingsSectionSummary> = {
  "general-settings": {
    labelKey: "settings.sectionGeneral",
    fallbackLabel: "General",
    controls: [
      { key: "settings.language", description: "UI language selector." },
      { key: "settings.workspaceAccess", description: "Workspace access and runtime toggles." },
      { key: "settings.settingsData", description: "Backup, import, database folder, and reset actions." },
    ],
  },
  "appearance-settings": {
    labelKey: "settings.sectionAppearance",
    fallbackLabel: "Appearance",
    controls: [
      { key: "settings.appUiFontFamily", description: "App UI font family selector." },
      {
        key: "settings.colorScheme",
        description: "App color scheme selector and preview swatches.",
        tutorialTargetId: "settings.appearance.colorScheme",
      },
      { key: "settings.resetLayout", description: "Workspace chrome and pane layout reset action." },
    ],
  },
  "dashboard-settings": {
    labelKey: "settings.sectionDashboard",
    fallbackLabel: "Dashboard",
    controls: [
      { key: "settings.dashboardConfirmRemove", description: "Confirm before removing Dashboard widgets." },
      { key: "settings.dashboardDefaultLandingView", description: "Default landing view behavior." },
    ],
  },
  "credentials-settings": {
    labelKey: "settings.sectionCredentials",
    fallbackLabel: "Credentials",
    controls: [
      { key: "settings.credentialsStored", description: "Stored credential summaries and delete actions." },
    ],
  },
  "assistant-settings": {
    labelKey: "settings.sectionAiAssistant",
    fallbackLabel: "AI Assistant",
    controls: [
      { key: "settings.aiProvider", description: "AI provider and model selection." },
      { key: "settings.aiToolsTitle", description: "Assistant tool enablement toggles." },
      { key: "settings.aiCustomInstructions", description: "Assistant custom instruction text." },
    ],
  },
  "ssh-settings": {
    labelKey: "settings.sectionSsh",
    fallbackLabel: "SSH",
    controls: [
      { key: "settings.defaultUser", description: "Default SSH username." },
      { key: "settings.defaultPort", description: "Default SSH port." },
      { key: "settings.sshBufferLines", description: "SSH terminal buffer behavior." },
    ],
  },
  "terminal-settings": {
    labelKey: "settings.sectionTerminal",
    fallbackLabel: "Terminal",
    controls: [
      { key: "settings.terminalFontFamily", description: "Local terminal font." },
      { key: "settings.terminalFontSize", description: "Local terminal font size." },
      { key: "settings.defaultShell", description: "Default local shell." },
    ],
  },
  "url-settings": {
    labelKey: "settings.sectionUrl",
    fallbackLabel: "URL",
    controls: [
      { key: "settings.ignoreCertificateErrors", description: "URL Connection certificate handling." },
      { key: "settings.urlSavedPasswords", description: "Saved website password metadata." },
    ],
  },
  "rdp-settings": {
    labelKey: "settings.sectionRdp",
    fallbackLabel: "Remote Desktop",
    controls: [
      { key: "settings.rdpColorDepth", description: "RDP color depth default." },
      { key: "settings.rdpPerformanceProfile", description: "RDP performance profile default." },
    ],
  },
  "vnc-settings": {
    labelKey: "settings.sectionVnc",
    fallbackLabel: "VNC",
    controls: [
      { key: "settings.vncViewOnly", description: "VNC view-only default." },
      { key: "settings.vncColorLevel", description: "VNC color level default." },
    ],
  },
  "about-settings": {
    labelKey: "settings.sectionAbout",
    fallbackLabel: "About",
    controls: [
      { key: "settings.aboutVersion", description: "Product version and open-source component information." },
    ],
  },
};

export function buildSettingsAssistantContext(
  sectionId: SettingsSectionId,
  translate: Translate = (_key, fallback) => fallback,
): SettingsAssistantContext {
  const section = SETTINGS_SECTIONS[sectionId];
  const settingsLabel = translate("settings.title", "Settings");
  const sectionLabel = translate(section.labelKey, section.fallbackLabel);
  const controls = section.controls
    .map((control) => {
      const tutorial = control.tutorialTargetId
        ? ` Tutorial target: ${control.tutorialTargetId}.`
        : "";
      return `- ${control.key}: ${control.description}${tutorial}`;
    })
    .join("\n");

  return {
    contextKind: "settings",
    contextLabel: `${settingsLabel} - ${sectionLabel}`,
    connectionLabel: translate("ai.settingsContextLabel", "Current Settings page"),
    sourceLabel: `${settingsLabel} context`,
    text: [
      `Active Settings section: ${sectionLabel} (${sectionId}).`,
      "Visible controls and i18n keys:",
      controls,
      "Use the tutorial_highlight tool for guided help only when a matching tutorial target is listed and visible.",
    ].join("\n"),
  };
}

export function settingsTutorialTargetForPrompt(
  prompt: string,
  sectionId: SettingsSectionId,
): SettingsTutorialTarget | undefined {
  const normalized = prompt.toLowerCase();
  if (
    sectionId === "appearance-settings" &&
    /\b(colou?r|theme|scheme|appearance)\b/.test(normalized)
  ) {
    return {
      targetId: "settings.appearance.colorScheme",
      titleKey: "ai.tutorial.colorSchemeTitle",
      bodyKey: "ai.tutorial.colorSchemeBody",
    };
  }
  return undefined;
}
