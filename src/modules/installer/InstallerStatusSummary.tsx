// Install Helper roll-up rendered in the centre of the global app status
// bar. It mirrors the counts the page used to show in its own footer status
// line, and only renders while the Install Helper Module is the visible
// page so the global bar stays uncluttered everywhere else.

import { useTranslation } from "react-i18next";
import { useInstallerStore } from "./state";

export function InstallerStatusSummary({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const summary = useInstallerStore((s) => s.summary);

  if (!active || !summary) {
    return null;
  }

  const lastCheckedText = t("installer.lastChecked", {
    time: summary.lastCheckedAt
      ? new Date(summary.lastCheckedAt * 1000).toLocaleString()
      : t("installer.status.neverChecked"),
  });

  return (
    <div className="status-bar-installer" role="status">
      <span>{t("installer.footer.tools", { count: summary.all })}</span>
      <span className="status-bar-installer__dot" />
      <span>{t("installer.footer.installed", { count: summary.installed })}</span>
      {summary.updates > 0 ? (
        <>
          <span className="status-bar-installer__dot" />
          <span className="status-bar-installer__updates">
            {t("installer.footer.updates", { count: summary.updates })}
          </span>
        </>
      ) : null}
      <span className="status-bar-installer__dot" />
      <span>{lastCheckedText}</span>
    </div>
  );
}
