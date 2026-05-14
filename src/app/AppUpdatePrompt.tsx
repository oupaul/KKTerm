import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  checkForAppUpdate,
  installAppUpdate,
  type AppUpdate,
  type AppUpdateInstallProgress,
} from "../lib/appUpdates";
import { shouldRunStartupUpdateCheck } from "../lib/appUpdatesModel";
import { isTauriRuntime } from "../lib/tauri";
import { useWorkspaceStore } from "../store";

export const CHECK_FOR_APP_UPDATES_EVENT = "kkterm:check-for-updates";

function formatProgress(progress?: AppUpdateInstallProgress) {
  if (!progress || progress.phase === "installing") {
    return null;
  }

  if (!progress.contentLength) {
    return null;
  }

  return Math.round((progress.downloadedBytes / progress.contentLength) * 100);
}

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
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<AppUpdateInstallProgress>();
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

    if (checking || installing) {
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
      showStatusBarNotice(t("settings.updateCheckFailed", { message }), {
        tone: "error",
      });
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
    void runUpdateCheck("startup");
  }, [autoUpdateChecksEnabled, settingsReady]);

  useEffect(() => {
    const handleManualCheck = () => void runUpdateCheck("manual");
    window.addEventListener(CHECK_FOR_APP_UPDATES_EVENT, handleManualCheck);
    return () => {
      window.removeEventListener(CHECK_FOR_APP_UPDATES_EVENT, handleManualCheck);
    };
  });

  async function handleInstall() {
    if (!update || installing) {
      return;
    }

    setInstalling(true);
    setInstallProgress(undefined);
    try {
      await installAppUpdate(update, setInstallProgress);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("settings.updateInstallFailed", { message }), {
        tone: "error",
      });
      setInstalling(false);
    }
  }

  if (!update) {
    return null;
  }

  const progressPercent = formatProgress(installProgress);

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
          {!installing ? (
            <button
              aria-label={t("settings.updateLater")}
              className="icon-button"
              onClick={() => setUpdate(null)}
              type="button"
            >
              <X size={15} />
            </button>
          ) : null}
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
        {installing ? (
          <p className="field-hint">
            {progressPercent === null
              ? t("settings.updateInstalling")
              : t("settings.updateInstallingWithProgress", {
                  progress: progressPercent,
                })}
          </p>
        ) : null}
        <div className="dialog-actions">
          <button
            className="approve-button"
            disabled={installing}
            onClick={() => void handleInstall()}
            type="button"
          >
            {installing ? <RefreshCw size={15} /> : <Download size={15} />}
            {t("settings.updateInstall")}
          </button>
          <button
            className="toolbar-button"
            disabled={installing}
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

