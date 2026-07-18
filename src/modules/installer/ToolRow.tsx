// One tool tile in the Install Helper catalog grid. Click opens the
// app-owned `InstallerToolDialog` — info mode for already-installed and
// not-installed tools, stepper mode while an install/uninstall is running
// or just finished. Inline expansion was removed; the dialog owns the
// detail surface.

import { useTranslation } from "react-i18next";
import type { MouseEvent } from "react";
import {
  invokeCommand,
  isTauriRuntime,
  selectInstallerGuiLauncherFile,
} from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import { iconUrlForRecipe, FALLBACK_ICON_URL } from "./icons";
import {
  launchKindForRecipe,
  readGuiLauncherPath,
  removeGuiLauncherPath,
  writeGuiLauncherPath,
} from "./launch";
import { useInstallerStore } from "./state";
import { useToolStatus } from "./useToolStatus";
import {
  isOfficialScriptInstall,
  localizedDescription,
  type Recipe,
} from "./types";

export function ToolRow({ recipe }: { recipe: Recipe }) {
  const { t, i18n } = useTranslation();
  const openInfoDialog = useInstallerStore((s) => s.openInfoDialog);
  const openStepperDialog = useInstallerStore((s) => s.openStepperDialog);
  const openLauncherDialog = useInstallerStore((s) => s.openLauncherDialog);
  const showStatusBarNotice = useWorkspaceStore(
    (state) => state.showStatusBarNotice,
  );
  const detected = useInstallerStore((s) => s.detected[recipe.id]);
  const officialScript = isOfficialScriptInstall(detected);

  const {
    isInstalled,
    installedVersion,
    partial,
    latestSeen,
    latestError,
    hasUpdate,
    busy,
    operation,
    retrieving,
    statusTone,
  } = useToolStatus(recipe);

  function handleOpen() {
    // While an install/uninstall is in flight (or its terminal state is the
    // most recent thing the user saw), open into the stepper view so they
    // see live progress / the result. Otherwise show the info dialog.
    if (busy) {
      openStepperDialog(recipe.id);
    } else {
      openInfoDialog(recipe.id);
    }
  }

  function handleActionClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    handleOpen();
  }

  // Run button for installed tools. GUI apps start directly; command-line
  // tools open the mini launcher dialog; managed web apps and tool suites
  // open the info dialog that already hosts their launcher surface.
  const launchKind = isInstalled && !busy ? launchKindForRecipe(recipe.id) : null;

  async function launchGuiApp() {
    if (!isTauriRuntime()) return;
    const customPath = readGuiLauncherPath(recipe.id);
    let launched: boolean;
    try {
      try {
        launched = await invokeCommand("installer_launch_app", {
          toolId: recipe.id,
          ...(customPath ? { customPath } : {}),
        });
      } catch (error) {
        if (!customPath) throw error;
        removeGuiLauncherPath(recipe.id);
        launched = await invokeCommand("installer_launch_app", {
          toolId: recipe.id,
        });
      }
      if (launched) return;

      const selectedPath = await selectInstallerGuiLauncherFile({
        title: t("installer.launcher.selectAppTitle", { name: recipe.name }),
        filterName: t("installer.launcher.applicationFiles"),
      });
      if (!selectedPath) return;

      launched = await invokeCommand("installer_launch_app", {
        toolId: recipe.id,
        customPath: selectedPath,
      });
      if (!launched) {
        showStatusBarNotice(t("installer.launcher.selectedAppFailed"), {
          tone: "error",
        });
        return;
      }
      writeGuiLauncherPath(recipe.id, selectedPath);
    } catch {
      showStatusBarNotice(t("installer.launcher.selectedAppFailed"), {
        tone: "error",
      });
    }
  }

  function handleRunClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (launchKind === "gui") {
      void launchGuiApp();
    } else if (launchKind === "cli") {
      openLauncherDialog(recipe.id);
    } else {
      openInfoDialog(recipe.id);
    }
  }

  const installedVersionText = isInstalled
    ? (installedVersion ?? t("installer.status.noVersion"))
    : t("installer.status.notInstalled");
  const installedDisplayText = retrieving
    ? t("installer.status.retrieving")
    : installedVersionText;
  const versionDisplayText =
    busy
      ? operation === "install"
        ? t("installer.status.installing")
        : t("installer.status.uninstalling")
      : partial
        ? officialScript
          ? t("installer.status.partialOfficialScript", {
              installed: partial[0],
              total: partial[1],
            })
          : t("installer.status.partial", {
              installed: partial[0],
              total: partial[1],
            })
        : hasUpdate && installedVersion && latestSeen
          ? `${installedVersion} -> ${latestSeen}`
          : latestError ?? installedDisplayText;
  const versionDisplayClass =
    !busy && !partial && latestError
      ? "installer-tile__version--error"
      : !busy && !partial && hasUpdate
        ? "installer-tile__version--update"
        : undefined;
  const statusLabel = busy
    ? operation === "install"
      ? t("installer.status.installing")
      : t("installer.status.uninstalling")
    : partial
      ? officialScript
        ? t("installer.status.partialOfficialScript", {
            installed: partial[0],
            total: partial[1],
          })
        : t("installer.status.partial", {
            installed: partial[0],
            total: partial[1],
          })
      : hasUpdate
        ? t("installer.actions.update")
        : isInstalled
          ? officialScript
            ? t("installer.status.installedOfficialScript")
            : t("installer.section.installed")
          : t("installer.status.notInstalled");
  const description = localizedDescription(recipe, i18n.language);

  return (
    <article
      className={`installer-tile ${busy ? "busy" : ""}`}
      data-status={statusTone}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={recipe.name}
    >
      <div className="installer-tile__head">
        <div className="installer-tile__top">
          <div className="installer-tile__icon-wrap">
            <img
              className="installer-tile__icon"
              src={iconUrlForRecipe(recipe.id)}
              alt=""
              draggable={false}
              onError={(event) => {
                const img = event.currentTarget;
                if (img.src !== FALLBACK_ICON_URL) {
                  img.src = FALLBACK_ICON_URL;
                }
              }}
            />
            {statusTone !== "none" ? (
              <span
                className={`installer-tile__dot installer-tile__dot--${statusTone}`}
                aria-hidden="true"
              />
            ) : null}
          </div>
          <div className="installer-tile__label">
            <span className="installer-tile__name" title={recipe.name}>
              {recipe.name}
            </span>
            <span
              className={`installer-tile__sub${
                versionDisplayClass ? ` ${versionDisplayClass}` : ""
              }`}
              title={versionDisplayText}
            >
              {versionDisplayText}
            </span>
          </div>
        </div>
        <p className="installer-tile__desc">{description}</p>
        <div className="installer-tile__foot">
          <span
            className={`installer-tile__badge ${
              hasUpdate
                ? "installer-tile__badge--update"
                : isInstalled
                ? "installer-tile__badge--installed"
                : "installer-tile__badge--missing"
            }`}
          >
            {statusLabel}
          </span>
          {launchKind || !isInstalled || hasUpdate ? (
            <span className="installer-tile__action-group">
              {launchKind ? (
                <button
                  type="button"
                  className="installer-tile__action"
                  onClick={handleRunClick}
                >
                  {t("installer.actions.run")}
                </button>
              ) : null}
              {!isInstalled || hasUpdate ? (
                <button
                  type="button"
                  className="installer-tile__action primary"
                  onClick={handleActionClick}
                  disabled={retrieving}
                >
                  {hasUpdate
                    ? t("installer.actions.update")
                    : t("installer.actions.install")}
                </button>
              ) : null}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
