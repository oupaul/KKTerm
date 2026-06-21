import { Coffee } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { GeneralSettings } from "../../types";
import { SettingsSectionHeader, useSettingsSaveRegistration } from "./shared";
import { ToggleSwitch } from "./ToggleSwitch";

export function DontSleepSettings() {
  const { t } = useTranslation();
  const generalSettings = useWorkspaceStore((state) => state.generalSettings);
  const setGeneralSettings = useWorkspaceStore((state) => state.setGeneralSettings);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [draft, setDraft] = useState<GeneralSettings>(generalSettings);
  const hasChanges =
    draft.dontSleepForegroundOnly !== generalSettings.dontSleepForegroundOnly;

  useEffect(() => {
    setDraft(generalSettings);
  }, [generalSettings]);

  async function handleSave() {
    try {
      const currentSettings = useWorkspaceStore.getState().generalSettings;
      const request = {
        ...currentSettings,
        dontSleepForegroundOnly: draft.dontSleepForegroundOnly,
      };
      const saved = isTauriRuntime()
        ? await invokeCommand("update_general_settings", { request })
        : request;
      setGeneralSettings(saved);
      setDraft(saved);
      showStatusBarNotice(t("settings.dontSleepSettingsSaved"), {
        tone: "success",
      });
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), {
        tone: "error",
      });
    }
  }

  useSettingsSaveRegistration({ hasChanges, onSave: handleSave });

  return (
    <section className="settings-card settings-section" data-tutorial-id="settings.dontSleep">
      <SettingsSectionHeader
        icon={<Coffee size={18} />}
        label={t("settings.sectionDontSleep")}
        title={t("settings.sectionDontSleep")}
      />

      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.sectionDontSleep")}</legend>
        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={draft.dontSleepForegroundOnly}
              onChange={(checked) =>
                setDraft((settings) => ({
                  ...settings,
                  dontSleepForegroundOnly: checked,
                }))
              }
            />
            <span>
              <strong>{t("settings.dontSleepForegroundOnly")}</strong>
              <small>{t("settings.dontSleepForegroundOnlyHint")}</small>
            </span>
          </label>
        </div>
      </fieldset>
    </section>
  );
}
