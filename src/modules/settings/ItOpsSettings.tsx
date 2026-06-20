import { useEffect, useState } from "react";
import { ServerCog } from "lucide-react";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { GeneralSettings } from "../../types";
import { SettingsSectionHeader, useSettingsSaveRegistration } from "./shared";
import { ToggleSwitch } from "./ToggleSwitch";

// IT Ops Module visibility. The Module is under active development, so it is
// hidden from the Activity Rail by default; this section lets the user opt in.
export function ItOpsSettings() {
  const { t } = useTranslation();
  const generalSettings = useWorkspaceStore((state) => state.generalSettings);
  const setGeneralSettings = useWorkspaceStore((state) => state.setGeneralSettings);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [draft, setDraft] = useState<GeneralSettings>(generalSettings);
  const hasChanges = draft.showItOps !== generalSettings.showItOps;

  useEffect(() => {
    setDraft(generalSettings);
  }, [generalSettings]);

  async function handleSave() {
    try {
      const currentSettings = useWorkspaceStore.getState().generalSettings;
      const request = { ...currentSettings, showItOps: draft.showItOps };
      const saved = isTauriRuntime()
        ? await invokeCommand("update_general_settings", { request })
        : request;
      setGeneralSettings(saved);
      setDraft(saved);
      showStatusBarNotice(t("settings.itOpsSaved"), { tone: "success" });
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
        icon={<ServerCog size={18} />}
        label={t("settings.sectionItOps")}
        title={t("settings.sectionItOps")}
      />
      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.itOpsRail")}</legend>
        <div className="settings-toggle-list">
          <label className="settings-toggle-row">
            <ToggleSwitch
              checked={draft.showItOps}
              onChange={(checked) => setDraft((state) => ({ ...state, showItOps: checked }))}
            />
            <span>
              <strong>{t("settings.itOpsShowModule")}</strong>
              <small>{t("settings.itOpsShowModuleDesc")}</small>
            </span>
          </label>
        </div>
      </fieldset>
    </section>
  );
}
