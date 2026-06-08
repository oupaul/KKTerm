import { useEffect, useMemo } from "react";
import {
  Bot,
  Coffee,
  Info,
  KeyRound,
  LayoutDashboard,
  Monitor,
  Globe,
  Network,
  Package,
  Palette,
  Server,
  Settings as SettingsIcon,
  SquareStack,
  Terminal,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AI_PROVIDER_SECRET_OWNER_ID } from "../../lib/settings";
import { AboutSettings } from "./AboutSettings";
import { AiSettings } from "./AiSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { DashboardSettings } from "./DashboardSettings";
import { DontSleepSettings } from "./DontSleepSettings";
import { CredentialsSettings } from "./CredentialsSettings";
import { GeneralSettings } from "./GeneralSettings";
import { InstallerSettings } from "./InstallerSettings";
import { RdpSettings } from "./RdpSettings";
import { SshSettings } from "./SshSettings";
import { TerminalSettings as TerminalSettingsPage } from "./TerminalSettings";
import { UrlSettings } from "./UrlSettings";
import { VncSettings } from "./VncSettings";
import { WorkspaceSettings } from "./WorkspaceSettings";
import {
  buildSettingsAssistantContext,
  type SettingsAssistantContext,
  type SettingsSectionId,
} from "./settingsAssistantContext";

export { AI_PROVIDER_SECRET_OWNER_ID };

export function SettingsPage({
  activeSectionId,
  onActiveSectionChange,
  onAssistantContextChange,
  onBack,
  onResetLayout,
}: {
  activeSectionId: SettingsSectionId;
  onActiveSectionChange: (sectionId: SettingsSectionId) => void;
  onAssistantContextChange: (context: SettingsAssistantContext) => void;
  onBack: () => void;
  onResetLayout: () => void;
}) {
  const { t } = useTranslation();
  const assistantContext = useMemo(
    () => buildSettingsAssistantContext(activeSectionId, (key, fallback) => t(key, fallback)),
    [activeSectionId, t],
  );

  useEffect(() => {
    onAssistantContextChange(assistantContext);
  }, [assistantContext, onAssistantContextChange]);

  return (
    <div className="settings-backdrop" role="presentation">
      <main
        aria-label={t("settings.title")}
        aria-modal="true"
        className="settings-popup settings-page"
        role="dialog"
      >
        <header className="settings-page-header">
          <div>
            <p className="panel-label">{t("settings.title")}</p>
          </div>
          <button
            aria-label={t("common.close")}
            className="connection-dialog-close"
            type="button"
            onClick={onBack}
          >
            <X size={16} />
          </button>
        </header>

        <div className="settings-layout">
          <aside className="settings-nav" aria-label={t("settings.sectionsNav")}>
          <button
            className={settingsNavItemClass("general-settings", activeSectionId)}
            onClick={() => onActiveSectionChange("general-settings")}
            type="button"
          >
            <SettingsIcon size={16} />
            <span>{t("settings.sectionGeneral")}</span>
          </button>
          <button
            className={settingsNavItemClass("appearance-settings", activeSectionId)}
            onClick={() => onActiveSectionChange("appearance-settings")}
            type="button"
          >
            <Palette size={16} />
            <span>{t("settings.sectionAppearance")}</span>
          </button>
          <button
            className={settingsNavItemClass("workspace-settings", activeSectionId)}
            onClick={() => onActiveSectionChange("workspace-settings")}
            type="button"
          >
            <SquareStack size={16} />
            <span>{t("settings.sectionWorkspace")}</span>
          </button>
          <button
            className={settingsNavItemClass("dashboard-settings", activeSectionId)}
            onClick={() => onActiveSectionChange("dashboard-settings")}
            type="button"
          >
            <LayoutDashboard size={16} />
            <span>{t("settings.sectionDashboard")}</span>
          </button>
          <button
            className={settingsNavItemClass("installer-settings", activeSectionId)}
            onClick={() => onActiveSectionChange("installer-settings")}
            type="button"
          >
            <Package size={16} />
            <span>{t("settings.sectionInstaller")}</span>
          </button>
          <button
            className={settingsNavItemClass("credentials-settings", activeSectionId)}
            onClick={() => onActiveSectionChange("credentials-settings")}
            type="button"
          >
            <KeyRound size={16} />
            <span>{t("settings.sectionCredentials")}</span>
          </button>
          <button
            className={settingsNavItemClass("assistant-settings", activeSectionId)}
            onClick={() => onActiveSectionChange("assistant-settings")}
            type="button"
          >
            <Bot size={16} />
            <span>{t("settings.sectionAiAssistant")}</span>
          </button>
          <button
            className={settingsNavItemClass("ssh-settings", activeSectionId)}
            onClick={() => onActiveSectionChange("ssh-settings")}
            type="button"
          >
            <Server size={16} />
            <span>{t("settings.sectionSsh")}</span>
          </button>
          <button
            className={settingsNavItemClass("terminal-settings", activeSectionId)}
            onClick={() => onActiveSectionChange("terminal-settings")}
            type="button"
          >
            <Terminal size={16} />
            <span>{t("settings.sectionTerminal")}</span>
          </button>
          <button
            className={settingsNavItemClass("url-settings", activeSectionId)}
            onClick={() => onActiveSectionChange("url-settings")}
            type="button"
          >
            <Globe size={16} />
            <span>{t("settings.sectionUrl")}</span>
          </button>
          <button
            className={settingsNavItemClass("rdp-settings", activeSectionId)}
            onClick={() => onActiveSectionChange("rdp-settings")}
            type="button"
          >
            <Monitor size={16} />
            <span>{t("settings.sectionRdp")}</span>
          </button>
          <button
            className={settingsNavItemClass("vnc-settings", activeSectionId)}
            onClick={() => onActiveSectionChange("vnc-settings")}
            type="button"
          >
            <Network size={16} />
            <span>{t("settings.sectionVnc")}</span>
          </button>
          <button
            className={settingsNavItemClass("dont-sleep-settings", activeSectionId)}
            onClick={() => onActiveSectionChange("dont-sleep-settings")}
            type="button"
          >
            <Coffee size={16} />
            <span>{t("settings.sectionDontSleep")}</span>
          </button>
          <button
            className={settingsNavItemClass("about-settings", activeSectionId)}
            onClick={() => onActiveSectionChange("about-settings")}
            type="button"
          >
            <Info size={16} />
            <span>{t("settings.sectionAbout")}</span>
          </button>
          </aside>

          <section
            className="settings-content"
            aria-label={t("settings.settingsContent")}
          >
            {activeSectionId === "general-settings" && <GeneralSettings />}
            {activeSectionId === "appearance-settings" && (
              <AppearanceSettings onResetLayout={onResetLayout} />
            )}
            {activeSectionId === "dashboard-settings" && <DashboardSettings />}
            {activeSectionId === "workspace-settings" && <WorkspaceSettings />}
            {activeSectionId === "installer-settings" && <InstallerSettings />}
            {activeSectionId === "credentials-settings" && <CredentialsSettings />}
            {activeSectionId === "assistant-settings" && <AiSettings />}
            {activeSectionId === "ssh-settings" && <SshSettings />}
            {activeSectionId === "terminal-settings" && <TerminalSettingsPage />}
            {activeSectionId === "url-settings" && <UrlSettings />}
            {activeSectionId === "rdp-settings" && <RdpSettings />}
            {activeSectionId === "vnc-settings" && <VncSettings />}
            {activeSectionId === "dont-sleep-settings" && <DontSleepSettings />}
            {activeSectionId === "about-settings" && <AboutSettings />}
          </section>
        </div>
      </main>
    </div>
  );
}

function settingsNavItemClass(sectionId: SettingsSectionId, activeSectionId: SettingsSectionId) {
  return `settings-nav-item${sectionId === activeSectionId ? " active" : ""}`;
}
