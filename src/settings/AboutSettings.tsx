import { ExternalLink, PackageOpen, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CHECK_FOR_APP_UPDATES_EVENT } from "../app/AppUpdatePrompt";
import { useLastUpdateCheckAt } from "../lib/lastUpdateCheck";
import { ABOUT_PRODUCT } from "./aboutData";
import { SettingsSectionHeader, SettingsSummary } from "./shared";

export function AboutSettings() {
  const { t, i18n } = useTranslation();
  const lastCheckedAt = useLastUpdateCheckAt();
  const lastCheckedLabel = lastCheckedAt
    ? t("settings.lastCheckedAt", {
        time: new Date(lastCheckedAt).toLocaleString(i18n.language),
      })
    : t("settings.lastCheckedNever");

  return (
    <section className="settings-card settings-section">
      <SettingsSectionHeader
        actions={
          <>
            <span
              className="field-hint"
              title={
                lastCheckedAt ? new Date(lastCheckedAt).toISOString() : undefined
              }
            >
              {lastCheckedLabel}
            </span>
            <button
              className="toolbar-button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent(CHECK_FOR_APP_UPDATES_EVENT))
              }
              type="button"
            >
              <RefreshCw size={15} />
              {t("settings.checkForUpdates")}
            </button>
            <a
              className="toolbar-button"
              href={ABOUT_PRODUCT.repositoryUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={15} />
              {t("settings.github")}
            </a>
          </>
        }
        icon={<PackageOpen size={18} />}
        label={t("settings.sectionAbout")}
        title={ABOUT_PRODUCT.name}
      />

      <div className="about-hero">
        <div>
          <strong>{ABOUT_PRODUCT.name}</strong>
          <span>{t("settings.appSlogan")}</span>
        </div>
        <PackageOpen size={34} />
      </div>

      <div className="settings-summary-grid">
        <SettingsSummary label={t("settings.developer")} value={ABOUT_PRODUCT.developer} />
        <SettingsSummary label={t("settings.version")} value={ABOUT_PRODUCT.version} />
        <SettingsSummary label={t("settings.license")} value={ABOUT_PRODUCT.license} />
        <SettingsSummary label={t("settings.repository")} value={ABOUT_PRODUCT.repositoryUrl} />
      </div>
    </section>
  );
}
