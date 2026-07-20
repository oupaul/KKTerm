import { ExternalLink, FolderOpen, PackageOpen } from "../../lib/reicon";
import { useTranslation } from "react-i18next";
import { openFilesystemPath } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import { ABOUT_PRODUCT } from "./aboutData";
import { SettingsSectionHeader, SettingsSummary } from "./shared";

export function AboutSettings() {
  const { t } = useTranslation();
  const appModeInfo = useWorkspaceStore((state) => state.appModeInfo);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const portable = appModeInfo.mode === "portable";

  async function openPortableDataFolder() {
    try {
      await openFilesystemPath(appModeInfo.dataDir);
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
          <a
            className="toolbar-button"
            href={ABOUT_PRODUCT.repositoryUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink size={15} />
            {t("settings.github")}
          </a>
        }
        icon={<PackageOpen size={18} />}
        label={t("settings.sectionAbout")}
        title={ABOUT_PRODUCT.name}
      />

      <div className="about-hero">
        <div>
          <strong>
            {ABOUT_PRODUCT.name}
            {portable ? (
              <span className="settings-mode-badge">{t("settings.portableMode")}</span>
            ) : null}
          </strong>
          <span>{t("settings.appSlogan")}</span>
        </div>
        <PackageOpen size={34} />
      </div>

      <div
        className="settings-summary-grid"
        data-tutorial-id="settings.aboutVersion"
      >
        <SettingsSummary label={t("settings.developer")} value={ABOUT_PRODUCT.developer} />
        <SettingsSummary label={t("settings.version")} value={ABOUT_PRODUCT.version} />
        <SettingsSummary label={t("settings.license")} value={ABOUT_PRODUCT.license} />
        <SettingsSummary label={t("settings.repository")} value={ABOUT_PRODUCT.repositoryUrl} />
        {portable ? (
          <SettingsSummary label={t("settings.portableDataFolder")} value={appModeInfo.dataDir} />
        ) : null}
      </div>
      {portable ? (
        <div className="settings-inline-actions">
          <button
            className="secondary-button"
            onClick={() => void openPortableDataFolder()}
            type="button"
          >
            <FolderOpen size={15} />
            {t("settings.openPortableDataFolder")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
