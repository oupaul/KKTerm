import { useEffect, useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  checkForAppUpdate,
  isDebugBuild,
  openReleaseDownloadPage,
  type AppUpdate,
} from "../lib/appUpdates";
import { shouldRunStartupUpdateCheck } from "../lib/appUpdatesModel";
import { isTauriRuntime } from "../lib/tauri";
import { useWorkspaceStore } from "../store";

export const CHECK_FOR_APP_UPDATES_EVENT = "kkterm:check-for-updates";

export function AppUpdatePrompt({
  settingsReady,
}: {
  settingsReady: boolean;
}) {
  const { t } = useTranslation();
  const autoUpdateChecksEnabled = useWorkspaceStore(
    (state) => state.generalSettings.autoUpdateChecksEnabled,
  );
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [checking, setChecking] = useState(false);
  const startupCheckedRef = useRef(false);

  async function runUpdateCheck(source: "startup" | "manual") {
    if (!isTauriRuntime()) {
      if (source === "manual") {
        showStatusBarNotice(t("settings.updateChecksRequireRuntime"), {
          tone: "warning",
        });
      }
      return;
    }

    if (checking) {
      return;
    }

    setChecking(true);
    if (source === "manual") {
      showStatusBarNotice(t("settings.checkingForUpdates"));
    }

    try {
      const availableUpdate = await checkForAppUpdate();
      if (availableUpdate) {
        setUpdate(availableUpdate);
        return;
      }

      if (source === "manual") {
        showStatusBarNotice(t("settings.updateNoUpdates"), { tone: "success" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Startup checks fail silently to avoid alarming users with transient
      // network errors; the manual check shows the error in the status bar.
      if (source === "manual") {
        showStatusBarNotice(t("settings.updateCheckFailed", { message }), {
          tone: "error",
        });
      }
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!settingsReady) {
      return;
    }

    if (
      !shouldRunStartupUpdateCheck({
        autoUpdateChecksEnabled,
        hasCheckedThisLaunch: startupCheckedRef.current,
        isTauriRuntime: isTauriRuntime(),
      })
    ) {
      return;
    }

    startupCheckedRef.current = true;
    void (async () => {
      // Skip startup checks in debug builds so dev launches don't surface the
      // update prompt. Manual checks from Settings → About still run.
      if (await isDebugBuild()) {
        return;
      }
      await runUpdateCheck("startup");
    })();
  }, [autoUpdateChecksEnabled, settingsReady]);

  useEffect(() => {
    const handleManualCheck = () => void runUpdateCheck("manual");
    window.addEventListener(CHECK_FOR_APP_UPDATES_EVENT, handleManualCheck);
    return () => {
      window.removeEventListener(CHECK_FOR_APP_UPDATES_EVENT, handleManualCheck);
    };
  });

  if (!update) {
    return null;
  }

  return (
    <div className="dialog-backdrop connection-dialog-backdrop" role="presentation">
      <div
        aria-label={t("settings.updatePromptLabel")}
        aria-modal="true"
        className="connection-dialog settings-reset-dialog app-update-dialog"
        role="dialog"
      >
        <header className="connection-dialog-header compact">
          <div>
            <p className="panel-label">{t("settings.softwareUpdates")}</p>
            <h2>{t("settings.updateAvailableTitle")}</h2>
          </div>
          <button
            aria-label={t("settings.updateLater")}
            className="icon-button"
            onClick={() => setUpdate(null)}
            type="button"
          >
            <X size={15} />
          </button>
        </header>
        <p className="field-hint">
          {t("settings.updateAvailableBody", {
            currentVersion: update.currentVersion,
            version: update.version,
          })}
        </p>
        {update.body ? (
          <div className="app-update-notes" aria-label={t("settings.updateNotes")}>
            {update.body}
          </div>
        ) : null}
        <div className="dialog-actions">
          <button
            className="approve-button"
            onClick={() => {
              void openReleaseDownloadPage(update);
              setUpdate(null);
            }}
            type="button"
          >
            <ExternalLink size={15} />
            {t("settings.updateOpenDownloadPage")}
          </button>
          <button
            className="toolbar-button"
            onClick={() => setUpdate(null)}
            type="button"
          >
            {t("settings.updateLater")}
          </button>
        </div>
      </div>
    </div>
  );
}
