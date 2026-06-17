import { useEffect, useState } from "react";
import { SquareStack } from "lucide-react";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { GeneralSettings, SftpSettings } from "../../types";
import { SettingsSectionHeader, useSettingsSaveRegistration } from "./shared";
import { ToggleSwitch } from "./ToggleSwitch";

export function WorkspaceSettings() {
  const { t } = useTranslation();
  const generalSettings = useWorkspaceStore((state) => state.generalSettings);
  const sftpSettings = useWorkspaceStore((state) => state.sftpSettings);
  const setGeneralSettings = useWorkspaceStore((state) => state.setGeneralSettings);
  const setSftpSettings = useWorkspaceStore((state) => state.setSftpSettings);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [draft, setDraft] = useState<GeneralSettings>(generalSettings);
  const [sftpDraft, setSftpDraft] = useState<SftpSettings>(sftpSettings);
  const hasChanges =
    draft.hideTopTabButtons !== generalSettings.hideTopTabButtons ||
    draft.doubleClickOpensConnection !== generalSettings.doubleClickOpensConnection ||
    draft.submitAiAttachmentsDirectly !== generalSettings.submitAiAttachmentsDirectly ||
    draft.separateSplitTerminalBackgrounds !== generalSettings.separateSplitTerminalBackgrounds ||
    draft.showConnectedConnectionsInRail !== generalSettings.showConnectedConnectionsInRail ||
    sftpDraft.fileExplorerOpenMode !== sftpSettings.fileExplorerOpenMode;

  useEffect(() => {
    setDraft(generalSettings);
  }, [generalSettings]);

  useEffect(() => {
    setSftpDraft(sftpSettings);
  }, [sftpSettings]);

  async function handleSave() {
    try {
      const currentSettings = useWorkspaceStore.getState().generalSettings;
      const currentSftpSettings = useWorkspaceStore.getState().sftpSettings;
      const request = {
        ...currentSettings,
        hideTopTabButtons: draft.hideTopTabButtons,
        doubleClickOpensConnection: draft.doubleClickOpensConnection,
        separateSplitTerminalBackgrounds: draft.separateSplitTerminalBackgrounds,
        showConnectedConnectionsInRail: draft.showConnectedConnectionsInRail,
        submitAiAttachmentsDirectly: draft.submitAiAttachmentsDirectly,
      };
      const sftpRequest = {
        ...currentSftpSettings,
        fileExplorerOpenMode: sftpDraft.fileExplorerOpenMode,
      };
      const [saved, savedSftp] = isTauriRuntime()
        ? await Promise.all([
            invokeCommand("update_general_settings", { request }),
            invokeCommand("update_sftp_settings", { request: sftpRequest }),
          ])
        : [request, sftpRequest];
      setGeneralSettings(saved);
      setSftpSettings(savedSftp);
      setDraft(saved);
      setSftpDraft(savedSftp);
      showStatusBarNotice(t("settings.workspaceSaved"), { tone: "success" });
    } catch (saveError) {
      showStatusBarNotice(
        saveError instanceof Error ? saveError.message : String(saveError),
        { tone: "error" },
      );
    }
  }

  useSettingsSaveRegistration({ hasChanges, onSave: handleSave });

  return (
    <section className="settings-card settings-section">
      <SettingsSectionHeader
        icon={<SquareStack size={18} />}
        label={t("settings.sectionWorkspace")}
        title={t("settings.sectionWorkspace")}
      />
      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.activityRail")}</legend>
        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={draft.showConnectedConnectionsInRail}
              onChange={(checked) =>
                setDraft((state) => ({ ...state, showConnectedConnectionsInRail: checked }))
              }
            />
            <span>
              <strong>{t("settings.connectedConnectionsRail")}</strong>
              <small>{t("settings.connectedConnectionsRailHint")}</small>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.workspaceTabs")}</legend>
        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={draft.hideTopTabButtons}
              onChange={(checked) => setDraft((state) => ({ ...state, hideTopTabButtons: checked }))}
            />
            <span>
              <strong>{t("settings.hideTopTabButtons")}</strong>
              <small>{t("settings.hideTopTabButtonsDesc")}</small>
            </span>
          </label>
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={draft.doubleClickOpensConnection}
              onChange={(checked) =>
                setDraft((state) => ({ ...state, doubleClickOpensConnection: checked }))
              }
            />
            <span>
              <strong>{t("settings.doubleClickOpensConnection")}</strong>
              <small>{t("settings.doubleClickOpensConnectionDesc")}</small>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.fileExplorer")}</legend>
        <div className="form-grid">
          <label>
            <span>{t("settings.fileExplorerOpenMode")}</span>
            <select
              value={sftpDraft.fileExplorerOpenMode}
              onChange={(event) =>
                setSftpDraft((state) => ({
                  ...state,
                  fileExplorerOpenMode: event.target.value as SftpSettings["fileExplorerOpenMode"],
                }))
              }
            >
              <option value="external">{t("settings.fileExplorerOpenModeExternal")}</option>
              <option value="inlineEditor">{t("settings.fileExplorerOpenModeInlineEditor")}</option>
            </select>
            <small className="field-hint">{t("settings.fileExplorerOpenModeHint")}</small>
          </label>
        </div>
      </fieldset>

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.sectionAiAssistant")}</legend>
        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={draft.submitAiAttachmentsDirectly}
              onChange={(checked) =>
                setDraft((state) => ({ ...state, submitAiAttachmentsDirectly: checked }))
              }
            />
            <span>
              <strong>{t("settings.submitAiAttachmentsDirectly")}</strong>
              <small>{t("settings.submitAiAttachmentsDirectlyDesc")}</small>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.terminalBackgrounds")}</legend>
        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={draft.separateSplitTerminalBackgrounds}
              onChange={(checked) =>
                setDraft((state) => ({ ...state, separateSplitTerminalBackgrounds: checked }))
              }
            />
            <span>
              <strong>{t("settings.separateSplitTerminalBackgrounds")}</strong>
              <small>{t("settings.separateSplitTerminalBackgroundsDesc")}</small>
            </span>
          </label>
        </div>
      </fieldset>
    </section>
  );
}
