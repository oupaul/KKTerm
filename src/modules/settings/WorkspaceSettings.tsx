import { useEffect, useState } from "react";
import { Save, SquareStack } from "lucide-react";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { GeneralSettings } from "../../types";
import { SettingsSectionHeader } from "./shared";
import { ToggleSwitch } from "./ToggleSwitch";

export function WorkspaceSettings() {
  const { t } = useTranslation();
  const generalSettings = useWorkspaceStore((state) => state.generalSettings);
  const setGeneralSettings = useWorkspaceStore((state) => state.setGeneralSettings);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [draft, setDraft] = useState<GeneralSettings>(generalSettings);
  const hasChanges =
    draft.hideTopTabButtons !== generalSettings.hideTopTabButtons ||
    draft.showConnectedConnectionsInRail !== generalSettings.showConnectedConnectionsInRail;

  useEffect(() => {
    setDraft(generalSettings);
  }, [generalSettings]);

  async function handleSave() {
    try {
      const saved = isTauriRuntime()
        ? await invokeCommand("update_general_settings", { request: draft })
        : draft;
      setGeneralSettings(saved);
      setDraft(saved);
      showStatusBarNotice(t("settings.workspaceSaved"), { tone: "success" });
    } catch (saveError) {
      showStatusBarNotice(
        saveError instanceof Error ? saveError.message : String(saveError),
        { tone: "error" },
      );
    }
  }

  return (
    <section className="settings-card settings-section">
      <SettingsSectionHeader
        actions={
          <button
            className="toolbar-button"
            disabled={!hasChanges}
            onClick={() => void handleSave()}
            type="button"
          >
            <Save size={15} />
            {t("settings.save")}
          </button>
        }
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
        </div>
      </fieldset>
    </section>
  );
}
