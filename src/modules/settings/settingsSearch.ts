import type { SettingsSectionId } from "./settingsAssistantContext";

export type SettingsSearchSection = {
  id: SettingsSectionId;
  labelKey: string;
  searchKeys: readonly string[];
};

export type SettingsSearchResult = {
  id: SettingsSectionId;
  label: string;
  matches: readonly {
    key: string;
    label: string;
  }[];
};

type Translate = (key: string, language: string) => string;

export const SETTINGS_SEARCH_KEYS: Record<SettingsSectionId, readonly string[]> = {
  "general-settings": [
    "settings.generalDefaults", "settings.softwareUpdates", "settings.language",
    "settings.workspaceAccess", "settings.activityRail", "settings.performance",
    "settings.useDirectxScreenCapture", "settings.statusBar", "settings.statusBarVisible",
    "settings.statusBarMonitor", "settings.statusBarMonitorInterval", "settings.settingsData",
    "settings.exportSettings", "settings.importSettings", "settings.openDatabaseFolder",
    "settings.resetAllSettings", "settings.debug", "settings.advancedDebugging",
    "settings.openLogFolder", "settings.rdpWebviewStability",
  ],
  "appearance-settings": [
    "settings.typography", "settings.appUiFontFamily", "settings.customFonts",
    "settings.appearanceInterface", "settings.theme", "settings.colorScheme",
    "settings.layout", "settings.resetLayout",
  ],
  "workspace-settings": [
    "settings.activityRail", "settings.connectedConnectionsRail", "settings.workspaceTabs",
    "settings.hideTopTabButtons", "settings.doubleClickOpensConnection",
    "settings.sectionAiAssistant", "settings.submitAiAttachmentsDirectly",
    "settings.terminalBackgrounds", "settings.separateSplitTerminalBackgrounds",
  ],
  "file-explorer-settings": [
    "settings.fileExplorerOpenMode", "settings.fileExplorerOpenModeExternal",
    "settings.fileExplorerOpenModeInlineEditor", "settings.fileExplorerTerminal",
  ],
  "dashboard-settings": [
    "settings.dashboardGeneral", "settings.dashboardDefaultLanding",
    "settings.dashboardUseRandomDynamicBackground", "settings.dashboardLayoutEnforcement",
    "settings.dashboardPerformance", "settings.dashboardMaxActiveScriptWidgets",
    "settings.dashboardAllowWidgetNetworkTools",
  ],
  "installer-settings": [
    "settings.installerUpdateChecks", "settings.installerCheckInterval",
    "settings.installerDefaultProvider", "settings.installerDefaultProviderWinget",
    "settings.installerDefaultProviderChocolatey",
  ],
  "credentials-settings": [
    "settings.credentialStorage", "settings.credentialStorageBackend",
    "settings.credentialsStored", "settings.savedWebsitePasswords",
    "settings.widgetCredentialsStored",
  ],
  "assistant-settings": [
    "settings.aiProviderConnection", "settings.provider", "settings.model",
    "settings.customModelId", "settings.apiMode", "settings.endpoint",
    "settings.aiResponseDefaults", "settings.outputLanguage", "settings.reasoningEffort",
    "settings.aiCustomInstructions", "settings.aiToolsTitle", "settings.assistantSkillsTitle",
    "settings.mcpServersTitle", "settings.searchProvider", "settings.emailProvider",
    "settings.builtInMcpConfigTitle",
  ],
  "ssh-settings": [
    "settings.sshDefaults", "settings.sshConnectionDefaults", "settings.defaultUser",
    "settings.defaultPort", "settings.proxyJump", "settings.sshAuthentication",
    "settings.defaultKey", "settings.generateSshKey", "settings.sshTerminal",
    "settings.sshBufferLines", "settings.defaultTransparency",
    "settings.randomDynamicBackgroundOnCreate", "settings.sshCompression",
    "settings.sshOldProtocols", "settings.allowSshOsc52Clipboard", "settings.xServer",
  ],
  "terminal-settings": [
    "settings.terminalText", "settings.fontFamily", "settings.fontSize",
    "settings.lineHeight", "settings.cursorStyle", "settings.terminalColorScheme",
    "settings.terminalSession", "settings.defaultShell", "settings.customShells",
    "settings.scrollbackLines", "settings.defaultTransparency",
    "settings.randomDynamicBackgroundOnCreate", "settings.terminalBehavior",
    "settings.confirmMultilinePaste", "settings.autoRecordSessions",
    "settings.allowTerminalNotifications", "settings.terminalClipboard",
    "settings.copyOnSelect", "settings.rightClickPaste", "settings.allowLocalOsc52Clipboard",
    "settings.terminalIntegrations", "settings.enableInlineImages", "settings.hyperlinkRules",
  ],
  "url-settings": [
    "settings.urlSecurity", "settings.ignoreCertificateErrors", "settings.urlUserAgent",
    "settings.savedWebsitePasswords", "settings.urlDataShards",
  ],
  "rdp-settings": [
    "settings.qualityDefaults", "settings.colorDepth", "settings.networkPerformance",
    "settings.bitmapCache", "settings.display", "settings.remoteDesktopViewMode",
    "settings.rdpRemoteResolution", "settings.rdpRedirectClipboard",
  ],
  "vnc-settings": [
    "settings.encoding", "settings.preferredEncoding", "settings.colorLevel",
    "settings.display", "settings.remoteDesktopViewMode", "settings.vncSharedSession",
    "settings.vncViewOnly",
  ],
  "dont-sleep-settings": ["settings.dontSleepForegroundOnly"],
  "shortcuts-settings": [
    "settings.workspaceTabs", "settings.sectionTerminal", "settings.shortcutPressKeys",
    "settings.shortcutClear", "settings.shortcutReset", "settings.shortcutResetAll",
  ],
  "proxy-settings": [
    "settings.proxyMode", "settings.proxyModeSystem", "settings.proxyModeNone",
    "settings.proxyModeManual", "settings.proxyProtocol", "settings.proxyHttp",
    "settings.proxyHttps", "settings.proxySocks5", "settings.proxyHost", "settings.proxyPort",
  ],
  "about-settings": [
    "settings.version", "settings.developer", "settings.license", "settings.repository",
    "settings.github",
  ],
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .trim();
}

export function buildSettingsSearchResults({
  activeLanguage,
  query,
  sections,
  translate,
}: {
  activeLanguage: string;
  query: string;
  sections: readonly SettingsSearchSection[];
  translate: Translate;
}): SettingsSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  return sections.flatMap((section) => {
    const sectionLabel = translate(section.labelKey, activeLanguage);
    const englishSectionLabel = translate(section.labelKey, "en");
    const sectionMatches = [sectionLabel, englishSectionLabel]
      .some((value) => normalizeSearchText(value).includes(normalizedQuery));
    const seenLabels = new Set<string>();
    const searchKeys = section.searchKeys.flatMap((key) => [
      key,
      `${key}Hint`,
      `${key}Desc`,
      `${key}Description`,
    ]).filter((key, index, keys) =>
      keys.indexOf(key) === index && translate(key, "en") !== key,
    );
    const matches = searchKeys.flatMap((key) => {
      const label = translate(key, activeLanguage);
      const englishLabel = translate(key, "en");
      const normalizedLabel = normalizeSearchText(label);
      if (
        seenLabels.has(normalizedLabel) ||
        ![label, englishLabel].some((value) =>
          normalizeSearchText(value).includes(normalizedQuery),
        )
      ) {
        return [];
      }
      seenLabels.add(normalizedLabel);
      return [{ key, label }];
    });

    if (!sectionMatches && matches.length === 0) {
      return [];
    }
    return [{ id: section.id, label: sectionLabel, matches }];
  });
}
