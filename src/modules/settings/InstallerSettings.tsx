import { useEffect, useState } from "react";
import { Package, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { GeneralSettings } from "../../types";
import {
  INSTALLER_CHECK_INTERVAL_OPTIONS,
  resolveInstallerCheckIntervalSeconds,
} from "../installer/checkInterval";
import { SettingsSectionHeader } from "./shared";
import { ToggleSwitch } from "./ToggleSwitch";

export function InstallerSettings() {
  const { t } = useTranslation();
  const generalSettings = useWorkspaceStore((state) => state.generalSettings);
  const setGeneralSettings = useWorkspaceStore((state) => state.setGeneralSettings);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [draft, setDraft] = useState<GeneralSettings>(generalSettings);
  const hasChanges =
    draft.showInstallerOnRail !== generalSettings.showInstallerOnRail ||
    draft.installerCheckIntervalSeconds !==
      generalSettings.installerCheckIntervalSeconds;

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
      showStatusBarNotice(t("settings.installerSaved"), { tone: "success" });
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
        icon={<Package size={18} />}
        label={t("settings.sectionInstaller")}
        title={t("settings.sectionInstaller")}
      />
      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.installerRail")}</legend>
        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={draft.showInstallerOnRail}
              onChange={(checked) =>
                setDraft((state) => ({ ...state, showInstallerOnRail: checked }))
              }
            />
            <span>
              <strong>{t("settings.installerShowOnRail")}</strong>
              <small>{t("settings.installerShowOnRailDesc")}</small>
            </span>
          </label>
        </div>
      </fieldset>
      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.installerUpdateChecks")}</legend>
        <div className="form-grid">
          <label>
            <span>{t("settings.installerCheckInterval")}</span>
            <select
              value={resolveInstallerCheckIntervalSeconds(
                draft.installerCheckIntervalSeconds,
              )}
              onChange={(event) =>
                setDraft((state) => ({
                  ...state,
                  installerCheckIntervalSeconds: Number(event.currentTarget.value),
                }))
              }
            >
              {INSTALLER_CHECK_INTERVAL_OPTIONS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {t(`settings.installerCheckInterval${seconds}`)}
                </option>
              ))}
            </select>
            <small className="field-hint">
              {t("settings.installerCheckIntervalDesc")}
            </small>
          </label>
        </div>
      </fieldset>
    </section>
  );
}
