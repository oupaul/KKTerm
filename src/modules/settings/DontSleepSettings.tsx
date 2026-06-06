import { Coffee, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { GeneralSettings } from "../../types";
import { SettingsSectionHeader } from "./shared";
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
      const saved = isTauriRuntime()
        ? await invokeCommand("update_general_settings", { request: draft })
        : draft;
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
