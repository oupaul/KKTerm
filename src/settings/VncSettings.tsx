import { Network } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PlannedSettingsGrid, SettingsSectionHeader, type PlannedSetting } from "./shared";

export function VncSettings() {
  const { t } = useTranslation();
  const encodingSettings: PlannedSetting[] = [
    {
      label: t("settings.quality"),
      value: t("settings.vncQualityValue"),
      hint: t("settings.vncQualityHint"),
    },
    {
      label: t("settings.preferredEncoding"),
      value: t("settings.vncPreferredEncodingValue"),
      hint: t("settings.vncPreferredEncodingHint"),
    },
    {
      label: t("settings.jpegQuality"),
      value: t("settings.vncJpegQualityValue"),
      hint: t("settings.vncJpegQualityHint"),
    },
    {
      label: t("settings.compression"),
      value: t("settings.vncCompressionValue"),
      hint: t("settings.vncCompressionHint"),
    },
  ];
  const displaySettings: PlannedSetting[] = [
    {
      label: t("settings.colorLevel"),
      value: t("settings.vncColorLevelValue"),
      hint: t("settings.vncColorLevelHint"),
    },
    {
      label: t("settings.remoteResize"),
      value: t("settings.vncRemoteResizeValue"),
      hint: t("settings.vncRemoteResizeHint"),
    },
  ];

  return (
    <section className="settings-card settings-section">
      <SettingsSectionHeader
        icon={<Network size={18} />}
        label={t("settings.sectionVnc")}
        title={t("settings.qualityDefaults")}
      />
      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.encoding")}</legend>
        <div>
          <p className="field-hint">{t("settings.vncEncodingHint")}</p>
        </div>
        <PlannedSettingsGrid settings={encodingSettings} />
      </fieldset>
      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.display")}</legend>
        <div>
          <p className="field-hint">{t("settings.vncDisplayHint")}</p>
        </div>
        <PlannedSettingsGrid settings={displaySettings} />
      </fieldset>
    </section>
  );
}
