import { Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PlannedSettingsGrid, SettingsSectionHeader, type PlannedSetting } from "./shared";

export function RdpSettings() {
  const { t } = useTranslation();
  const displaySettings: PlannedSetting[] = [
    {
      label: t("settings.resolution"),
      value: t("settings.rdpResolutionValue"),
      hint: t("settings.rdpResolutionHint"),
    },
    {
      label: t("settings.colorDepth"),
      value: t("settings.rdpColorDepthValue"),
      hint: t("settings.rdpColorDepthHint"),
    },
    {
      label: t("settings.enhancedGraphics"),
      value: t("settings.rdpEnhancedGraphicsValue"),
      hint: t("settings.rdpEnhancedGraphicsHint"),
    },
  ];
  const networkSettings: PlannedSetting[] = [
    {
      label: t("settings.bandwidthProfile"),
      value: t("settings.rdpBandwidthProfileValue"),
      hint: t("settings.rdpBandwidthProfileHint"),
    },
    {
      label: t("settings.bitmapCache"),
      value: t("settings.rdpBitmapCacheValue"),
      hint: t("settings.rdpBitmapCacheHint"),
    },
    {
      label: t("settings.performanceFlags"),
      value: t("settings.rdpPerformanceFlagsValue"),
      hint: t("settings.rdpPerformanceFlagsHint"),
    },
  ];

  return (
    <section className="settings-card settings-section">
      <SettingsSectionHeader
        icon={<Monitor size={18} />}
        label={t("settings.sectionRdp")}
        title={t("settings.qualityDefaults")}
      />
      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.display")}</legend>
        <div>
          <p className="field-hint">{t("settings.rdpDisplayHint")}</p>
        </div>
        <PlannedSettingsGrid settings={displaySettings} />
      </fieldset>
      <fieldset className="settings-subsection settings-fieldset">
        <legend>{t("settings.networkPerformance")}</legend>
        <div>
          <p className="field-hint">{t("settings.rdpNetworkHint")}</p>
        </div>
        <PlannedSettingsGrid settings={networkSettings} />
      </fieldset>
    </section>
  );
}
