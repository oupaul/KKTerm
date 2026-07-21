import { useEffect, useState } from "react";
import { Package } from "../../lib/reicon";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { GeneralSettings } from "../../types";
import {
  INSTALLER_CHECK_INTERVAL_OPTIONS,
  resolveInstallerCheckIntervalSeconds,
} from "../installer/checkInterval";
import { SettingsSectionHeader, useSettingsSaveRegistration } from "./shared";

export function InstallerSettings() {
  const { t } = useTranslation();
  const generalSettings = useWorkspaceStore((state) => state.generalSettings);
  const setGeneralSettings = useWorkspaceStore((state) => state.setGeneralSettings);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [draft, setDraft] = useState<GeneralSettings>(generalSettings);
  const hasChanges =
    draft.installerCheckIntervalSeconds !==
      generalSettings.installerCheckIntervalSeconds ||
    draft.installerDefaultProvider !== generalSettings.installerDefaultProvider;

  useEffect(() => {
    setDraft(generalSettings);
  }, [generalSettings]);

  async function handleSave() {
    try {
      const currentSettings = useWorkspaceStore.getState().generalSettings;
      const request = {
        ...currentSettings,
        installerCheckIntervalSeconds: draft.installerCheckIntervalSeconds,
        installerDefaultProvider: draft.installerDefaultProvider,
      };
      const saved = isTauriRuntime()
        ? await invokeCommand("update_general_settings", { request })
        : request;
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

  useSettingsSaveRegistration({ hasChanges, onSave: handleSave });

  return (
    <section className="settings-card settings-section" data-tutorial-id="settings.installer">
      <SettingsSectionHeader
        icon={<Package size={18} />}
        label={t("settings.sectionInstaller")}
        title={t("settings.sectionInstaller")}
      />
      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.installerUpdateChecks")}</legend>
        <div className="form-grid">
          <label>
            <span>{t("settings.installerCheckInterval")}</span>
            <select
              value={resolveInstallerCheckIntervalSeconds(
                draft.installerCheckIntervalSeconds,
              )}
              onChange={(event) => {
                const installerCheckIntervalSeconds = Number(event.currentTarget.value);
                setDraft((state) => ({
                  ...state,
                  installerCheckIntervalSeconds,
                }));
              }}
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
        <div className="form-grid">
          <label>
            <span>{t("settings.installerDefaultProvider")}</span>
            <select
              value={draft.installerDefaultProvider}
              onChange={(event) => {
                const installerDefaultProvider = event.currentTarget.value as
                  | "winget"
                  | "chocolatey";
                setDraft((state) => ({
                  ...state,
                  installerDefaultProvider,
                }));
              }}
            >
              <option value="winget">
                {t("settings.installerDefaultProviderWinget")}
              </option>
              <option value="chocolatey">
                {t("settings.installerDefaultProviderChocolatey")}
              </option>
            </select>
            <small className="field-hint">
              {t("settings.installerDefaultProviderDesc")}
            </small>
          </label>
        </div>
      </fieldset>
    </section>
  );
}
