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
  FolderOpen,
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
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LegacyDialogActions } from "../../app/ui/dialog";
import { AI_PROVIDER_SECRET_OWNER_ID } from "../../lib/settings";
import { supportsInstallerHelper, supportsRdp } from "../../lib/platform";
import { AboutSettings } from "./AboutSettings";
import { AiSettings } from "./AiSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { DashboardSettings } from "./DashboardSettings";
import { DontSleepSettings } from "./DontSleepSettings";
import { CredentialsSettings } from "./CredentialsSettings";
import { GeneralSettings } from "./GeneralSettings";
import { FileExplorerSettings } from "./FileExplorerSettings";
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
  "file-explorer-settings",
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

// Each section gets a colored icon chip, macOS System Settings style. Colors are
// the design language's vivid Apple-system palette; `requires` gates a section to
// platforms that support it.
const SETTINGS_NAV: readonly {
  id: SettingsSectionId;
  Icon: LucideIcon;
  color: string;
  labelKey: string;
  requires?: "installer" | "rdp";
}[] = [
  { id: "general-settings", Icon: SettingsIcon, color: "#8e8e93", labelKey: "settings.sectionGeneral" },
  { id: "appearance-settings", Icon: Palette, color: "#ff2d55", labelKey: "settings.sectionAppearance" },
  { id: "workspace-settings", Icon: SquareStack, color: "#5e5ce6", labelKey: "settings.sectionWorkspace" },
  { id: "file-explorer-settings", Icon: FolderOpen, color: "#14b8a6", labelKey: "settings.fileExplorer" },
  { id: "dashboard-settings", Icon: LayoutDashboard, color: "#0a84ff", labelKey: "settings.sectionDashboard" },
  { id: "installer-settings", Icon: Package, color: "#ff9f0a", labelKey: "settings.sectionInstaller", requires: "installer" },
  { id: "credentials-settings", Icon: KeyRound, color: "#34c759", labelKey: "settings.sectionCredentials" },
  { id: "assistant-settings", Icon: Bot, color: "#bf5af2", labelKey: "settings.sectionAiAssistant" },
  { id: "ssh-settings", Icon: Server, color: "#30b0c7", labelKey: "settings.sectionSsh" },
  { id: "terminal-settings", Icon: Terminal, color: "#1c1c1e", labelKey: "settings.sectionTerminal" },
  { id: "url-settings", Icon: Globe, color: "#32ade6", labelKey: "settings.sectionUrl" },
  { id: "rdp-settings", Icon: Monitor, color: "#5856d6", labelKey: "settings.sectionRdp", requires: "rdp" },
  { id: "vnc-settings", Icon: Network, color: "#5ac8fa", labelKey: "settings.sectionVnc" },
  { id: "dont-sleep-settings", Icon: Coffee, color: "#ac8e68", labelKey: "settings.sectionDontSleep" },
  { id: "about-settings", Icon: Info, color: "#64748b", labelKey: "settings.sectionAbout" },
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
  const installerSupported = supportsInstallerHelper();
  const rdpSupported = supportsRdp();
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
    if (
      (activeSectionId === "installer-settings" && !installerSupported) ||
      (activeSectionId === "rdp-settings" && !rdpSupported)
    ) {
      onActiveSectionChange("general-settings");
    }
  }, [activeSectionId, installerSupported, onActiveSectionChange, rdpSupported]);

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
            {SETTINGS_NAV.filter((item) =>
              item.requires === "installer"
                ? installerSupported
                : item.requires === "rdp"
                  ? rdpSupported
                  : true,
            ).map(({ id, Icon, color, labelKey }) => (
              <button
                key={id}
                className={settingsNavItemClass(id, activeSectionId)}
                onClick={() => onActiveSectionChange(id)}
                type="button"
              >
                <span className="settings-nav-icon" style={{ background: color }}>
                  <Icon size={14} />
                </span>
                <span>{t(labelKey)}</span>
              </button>
            ))}
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
            {renderSettingsSection("file-explorer-settings", <FileExplorerSettings />)}
            {installerSupported
              ? renderSettingsSection("installer-settings", <InstallerSettings />)
              : null}
            {renderSettingsSection("credentials-settings", <CredentialsSettings />)}
            {renderSettingsSection("assistant-settings", <AiSettings />)}
            {renderSettingsSection("ssh-settings", <SshSettings />)}
            {renderSettingsSection("terminal-settings", <TerminalSettingsPage />)}
            {renderSettingsSection("url-settings", <UrlSettings />)}
            {rdpSupported ? renderSettingsSection("rdp-settings", <RdpSettings />) : null}
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
            <LegacyDialogActions
              as="footer"
              extraLeft={<button
                className="secondary-button danger-button"
                onClick={handleQuitWithoutSaving}
                type="button"
              >
                {t("settings.quitWithoutSaving")}
              </button>}
              primary={<button
                className="primary-button"
                onClick={() => void handleSaveAllDirty({ quitAfter: true })}
                type="button"
              >
                <Save size={15} />
                {t("settings.saveAndQuit")}
              </button>}
              cancel={<button
                className="secondary-button"
                onClick={() => setUnsavedQuitDialogOpen(false)}
                type="button"
              >
                {t("common.cancel")}
              </button>}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}

function settingsNavItemClass(sectionId: SettingsSectionId, activeSectionId: SettingsSectionId) {
  return `settings-nav-item${sectionId === activeSectionId ? " active" : ""}`;
}
