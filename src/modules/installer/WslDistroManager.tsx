// Dynamic WSL distro manager. Opened from the installed WSL feature dialog, it
// reflects live host state (`wsl --list`) rather than the static catalog: it
// lists every installed distro — including ones installed outside KKTerm — lets
// the user set the default or unregister any of them, and installs new distros
// from the live `wsl --list --online` set.

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, RefreshCw } from "../../lib/reicon";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import { useInstallerStore } from "./state";
import { InstallerConfirmDialog } from "./InstallerConfirmDialog";
import type { WslDistroInfo, WslOnlineDistro } from "./types";

export function WslDistroManager() {
  const open = useInstallerStore((s) => s.wslManagerOpen);
  const closeWslManager = useInstallerStore((s) => s.closeWslManager);
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore(
    (state) => state.showStatusBarNotice,
  );

  const [installed, setInstalled] = useState<WslDistroInfo[]>([]);
  const [online, setOnline] = useState<WslOnlineDistro[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [unregisterTarget, setUnregisterTarget] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isTauriRuntime()) return;
    setLoading(true);
    try {
      const [installedList, onlineList] = await Promise.all([
        invokeCommand("installer_wsl_list_distros"),
        invokeCommand("installer_wsl_list_online").catch(() => [] as WslOnlineDistro[]),
      ]);
      setInstalled(installedList);
      setOnline(onlineList);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(message, { tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [showStatusBarNotice]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) closeWslManager();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, closeWslManager]);

  if (!open) return null;

  const installedNames = new Set(installed.map((distro) => distro.name));
  const installable = online.filter((distro) => !installedNames.has(distro.name));

  async function runAction(
    label: string,
    action: () => Promise<void>,
    successKey: string,
    name: string,
  ) {
    if (!isTauriRuntime()) return;
    setBusy(label);
    try {
      await action();
      showStatusBarNotice(t(successKey, { name }), { tone: "success" });
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(message, { tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  function handleSetDefault(name: string) {
    void runAction(
      `default:${name}`,
      () => invokeCommand("installer_wsl_set_default", { distro: name }),
      "installer.wsl.setDefaultDone",
      name,
    );
  }

  function handleInstall() {
    if (!selected) return;
    const name = selected;
    void runAction(
      `install:${name}`,
      () => invokeCommand("installer_wsl_install", { distro: name }),
      "installer.wsl.installDone",
      name,
    ).then(() => setSelected(""));
  }

  function confirmUnregister() {
    const name = unregisterTarget;
    setUnregisterTarget(null);
    if (!name) return;
    void runAction(
      `unregister:${name}`,
      () => invokeCommand("installer_wsl_unregister", { distro: name }),
      "installer.wsl.unregisterDone",
      name,
    );
  }

  return (
    <div className="dialog-backdrop connection-dialog-backdrop" role="presentation">
      <div
        aria-label={t("installer.wsl.manageDistros")}
        aria-modal="true"
        className="connection-dialog installer-tool-dialog"
        role="dialog"
      >
        <header className="installer-tool-dialog__header">
          <h2>{t("installer.wsl.manageDistros")}</h2>
        </header>
        <div className="installer-tool-dialog__body">
          <section className="installer-wsl-section">
            <h3 className="installer-wsl-section__title">
              {t("installer.wsl.installedHeading")}
              <button
                type="button"
                className="installer-tool-dialog__inline-action"
                onClick={() => void refresh()}
                disabled={loading || busy !== null}
              >
                <RefreshCw size={13} strokeWidth={1.9} aria-hidden="true" />
                {t("installer.refresh")}
              </button>
            </h3>
            {installed.length === 0 ? (
              <p className="installer-tool-dialog__desc">
                {loading
                  ? t("installer.wsl.loading")
                  : t("installer.wsl.noInstalled")}
              </p>
            ) : (
              <ul className="installer-wsl-list">
                {installed.map((distro) => (
                  <li key={distro.name} className="installer-wsl-row">
                    <span className="installer-wsl-row__name">
                      {distro.name}
                      {distro.isDefault ? (
                        <span className="installer-wsl-badge">
                          <CheckCircle2 size={12} strokeWidth={2} aria-hidden="true" />
                          {t("installer.wsl.default")}
                        </span>
                      ) : null}
                    </span>
                    <span className="installer-wsl-row__meta">
                      {distro.version != null
                        ? t("installer.wsl.versionLabel", { version: distro.version })
                        : null}
                      {" · "}
                      {distro.running
                        ? t("installer.status.running")
                        : t("installer.status.stopped")}
                    </span>
                    <span className="installer-wsl-row__actions">
                      {!distro.isDefault ? (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleSetDefault(distro.name)}
                          disabled={busy !== null}
                        >
                          {t("installer.wsl.setDefault")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="secondary-button danger"
                        onClick={() => setUnregisterTarget(distro.name)}
                        disabled={busy !== null}
                      >
                        {t("installer.wsl.unregister")}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="installer-wsl-section">
            <h3 className="installer-wsl-section__title">
              {t("installer.wsl.installHeading")}
            </h3>
            {installable.length === 0 ? (
              <p className="installer-tool-dialog__desc">
                {loading
                  ? t("installer.wsl.loading")
                  : t("installer.wsl.noOnline")}
              </p>
            ) : (
              <div className="installer-wsl-install-row">
                <select
                  value={selected}
                  onChange={(event) => setSelected(event.target.value)}
                  disabled={busy !== null}
                >
                  <option value="">{t("installer.wsl.selectPlaceholder")}</option>
                  {installable.map((distro) => (
                    <option key={distro.name} value={distro.name}>
                      {distro.friendlyName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="installer-button primary"
                  onClick={handleInstall}
                  disabled={!selected || busy !== null}
                >
                  {t("installer.actions.install")}
                </button>
              </div>
            )}
            {busy?.startsWith("install:") ? (
              <p className="installer-tool-dialog__hint" role="status">
                {t("installer.wsl.installing", {
                  name: busy.slice("install:".length),
                })}
              </p>
            ) : null}
          </section>
        </div>
        <div className="dialog-actions installer-tool-dialog__actions">
          <button
            type="button"
            className="toolbar-button"
            onClick={closeWslManager}
            disabled={busy !== null}
          >
            {t("common.close")}
          </button>
        </div>
        {unregisterTarget ? (
          <InstallerConfirmDialog
            title={t("installer.wsl.unregisterTitle", { name: unregisterTarget })}
            body={t("installer.wsl.unregisterBody", { name: unregisterTarget })}
            confirmLabel={t("installer.wsl.unregister")}
            tone="danger"
            onConfirm={confirmUnregister}
            onCancel={() => setUnregisterTarget(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
