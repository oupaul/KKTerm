import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
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
  Save,
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
import {
  SettingsSaveProvider,
  type SettingsSaveRegistration,
} from "./shared";

export { AI_PROVIDER_SECRET_OWNER_ID };

const SETTINGS_SECTION_IDS: readonly SettingsSectionId[] = [
  "general-settings",
  "appearance-settings",
  "dashboard-settings",
  "workspace-settings",
  "installer-settings",
  "credentials-settings",
  "assistant-settings",
  "ssh-settings",
  "terminal-settings",
  "url-settings",
  "rdp-settings",
  "vnc-settings",
  "dont-sleep-settings",
  "about-settings",
];

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
  const [saveRegistrations, setSaveRegistrations] = useState<
    Partial<Record<SettingsSectionId, SettingsSaveRegistration>>
  >({});
  const [visitedSectionIds, setVisitedSectionIds] = useState<Set<SettingsSectionId>>(
    () => new Set([activeSectionId]),
  );
  const [unsavedQuitDialogOpen, setUnsavedQuitDialogOpen] = useState(false);
  const assistantContext = useMemo(
    () => buildSettingsAssistantContext(activeSectionId, (key, fallback) => t(key, fallback)),
    [activeSectionId, t],
  );
  const registerSaveState = useCallback((sectionId: string, registration: SettingsSaveRegistration) => {
    setSaveRegistrations((current) => ({
      ...current,
      [sectionId as SettingsSectionId]: registration,
    }));
  }, []);
  const dirtyRegistrations = SETTINGS_SECTION_IDS
    .map((sectionId) => saveRegistrations[sectionId])
    .filter((registration): registration is SettingsSaveRegistration =>
      Boolean(registration?.hasChanges && registration.onSave),
    );
  const hasUnsavedChanges = dirtyRegistrations.length > 0;

  useEffect(() => {
    onAssistantContextChange(assistantContext);
  }, [assistantContext, onAssistantContextChange]);

  useEffect(() => {
    setVisitedSectionIds((current) => {
      if (current.has(activeSectionId)) {
        return current;
      }
      const next = new Set(current);
      next.add(activeSectionId);
      return next;
    });
  }, [activeSectionId]);

  async function handleSaveAllDirty({ quitAfter = false }: { quitAfter?: boolean } = {}) {
    const registrationsToSave = SETTINGS_SECTION_IDS
      .map((sectionId) => saveRegistrations[sectionId])
      .filter((registration): registration is SettingsSaveRegistration =>
        Boolean(registration?.hasChanges && registration.onSave),
      );

    for (const registration of registrationsToSave) {
      await registration.onSave?.();
    }

    if (quitAfter) {
      onBack();
    }
  }

  function requestCloseSettings() {
    if (hasUnsavedChanges) {
      setUnsavedQuitDialogOpen(true);
      return;
    }
    onBack();
  }

  function handleQuitWithoutSaving() {
    setUnsavedQuitDialogOpen(false);
    onBack();
  }

  function renderSettingsSection(sectionId: SettingsSectionId, children: ReactNode) {
    const shouldMount = visitedSectionIds.has(sectionId) || activeSectionId === sectionId;
    return (
      <SettingsSaveProvider
        key={sectionId}
        onRegister={registerSaveState}
        sectionId={sectionId}
      >
        <div
          className="settings-section-panel"
          hidden={activeSectionId !== sectionId}
        >
          {shouldMount ? children : null}
        </div>
      </SettingsSaveProvider>
    );
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      requestCloseSettings();
    }
  }

  return (
    <div
      className="settings-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
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
          <div className="settings-page-actions">
            {hasUnsavedChanges ? (
              <>
                <span className="settings-unsaved-label">
                  {t("settings.changesNotSaved")}
                </span>
                <button
                  className="toolbar-button settings-page-save-button"
                  onClick={() => void handleSaveAllDirty()}
                  type="button"
                >
                  <Save size={15} />
                  {t("settings.save")}
                </button>
              </>
            ) : null}
          </div>
          <button
            aria-label={t("common.close")}
            className="connection-dialog-close"
            type="button"
            onClick={requestCloseSettings}
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
            {renderSettingsSection("general-settings", <GeneralSettings />)}
            {renderSettingsSection(
              "appearance-settings",
              <AppearanceSettings onResetLayout={onResetLayout} />,
            )}
            {renderSettingsSection("dashboard-settings", <DashboardSettings />)}
            {renderSettingsSection("workspace-settings", <WorkspaceSettings />)}
            {renderSettingsSection("installer-settings", <InstallerSettings />)}
            {renderSettingsSection("credentials-settings", <CredentialsSettings />)}
            {renderSettingsSection("assistant-settings", <AiSettings />)}
            {renderSettingsSection("ssh-settings", <SshSettings />)}
            {renderSettingsSection("terminal-settings", <TerminalSettingsPage />)}
            {renderSettingsSection("url-settings", <UrlSettings />)}
            {renderSettingsSection("rdp-settings", <RdpSettings />)}
            {renderSettingsSection("vnc-settings", <VncSettings />)}
            {renderSettingsSection("dont-sleep-settings", <DontSleepSettings />)}
            {renderSettingsSection("about-settings", <AboutSettings />)}
          </section>
        </div>
      </main>
      {unsavedQuitDialogOpen ? (
        <div className="dialog-backdrop connection-dialog-backdrop" role="presentation">
          <section
            aria-labelledby="settings-unsaved-quit-title"
            aria-modal="true"
            className="connection-dialog settings-unsaved-dialog"
            role="dialog"
          >
            <header className="connection-dialog-header">
              <h2 id="settings-unsaved-quit-title">{t("settings.unsavedQuitTitle")}</h2>
            </header>
            <div className="connection-dialog-body">
              <p>{t("settings.unsavedQuitBody")}</p>
            </div>
            <footer className="dialog-actions">
              <button
                className="secondary-button danger-button"
                onClick={handleQuitWithoutSaving}
                type="button"
              >
                {t("settings.quitWithoutSaving")}
              </button>
              <button
                className="primary-button"
                onClick={() => void handleSaveAllDirty({ quitAfter: true })}
                type="button"
              >
                <Save size={15} />
                {t("settings.saveAndQuit")}
              </button>
              <button
                className="secondary-button"
                onClick={() => setUnsavedQuitDialogOpen(false)}
                type="button"
              >
                {t("common.cancel")}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function settingsNavItemClass(sectionId: SettingsSectionId, activeSectionId: SettingsSectionId) {
  return `settings-nav-item${sectionId === activeSectionId ? " active" : ""}`;
}
