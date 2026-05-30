// One tool tile in the Installer Helper catalog grid. Click opens the
// app-owned `InstallerToolDialog` — info mode for already-installed and
// not-installed tools, stepper mode while an install/uninstall is running
// or just finished. Inline expansion was removed; the dialog owns the
// detail surface.

import { useTranslation } from "react-i18next";
import type { MouseEvent } from "react";
import { iconUrlForRecipe, FALLBACK_ICON_URL } from "./icons";
import { useInstallerStore } from "./state";
import type { Recipe } from "./types";

export function ToolRow({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation();
  const detected = useInstallerStore((s) => s.detected[recipe.id]);
  const toolState = useInstallerStore((s) => s.toolState[recipe.id]);
  const inFlight = useInstallerStore((s) => s.inFlight[recipe.id]);
  const lastStatus = useInstallerStore((s) => s.lastStatus[recipe.id]);
  const openInfoDialog = useInstallerStore((s) => s.openInfoDialog);
  const openStepperDialog = useInstallerStore((s) => s.openStepperDialog);

  const isInstalled = detected?.installed ?? false;
  const installedVersion = detected?.installedVersion;
  const partial = detected?.partialCount;
  const latestSeen = toolState?.latestVersionSeen;
  const hasUpdate = Boolean(
    isInstalled &&
    latestSeen &&
    installedVersion &&
    latestSeen !== installedVersion,
  );
  const busy = !!inFlight;

  const statusTone:
    | "installed"
    | "update"
    | "busy"
    | "failed"
    | "partial"
    | "none" = busy
    ? "busy"
    : lastStatus?.kind === "failed"
      ? "failed"
      : hasUpdate
        ? "update"
        : isInstalled
          ? "installed"
          : partial
            ? "partial"
            : "none";

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

  const installedVersionText = isInstalled
    ? (installedVersion ?? t("installer.status.noVersion"))
    : t("installer.status.notInstalled");
  const latestVersionText = latestSeen ?? t("installer.status.noVersion");
  const runtimeVersionLabel =
    recipe.id === "node-bundle"
      ? t("installer.tile.node")
      : recipe.id === "python-bundle"
        ? t("installer.tile.python")
        : null;
  const runtimeVersionText = detected?.runtimeVersion ?? t("installer.status.noVersion");

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
          {busy ? (
            <span className="installer-tile__sub">
              {inFlight.operation === "install"
                ? t("installer.status.installing")
                : t("installer.status.uninstalling")}
            </span>
          ) : partial ? (
            <span className="installer-tile__sub">
              {t("installer.status.partial", {
                installed: partial[0],
                total: partial[1],
              })}
            </span>
          ) : (
            <dl className="installer-tile__versions">
              <div>
                <dt>{t("installer.tile.latest")}</dt>
                <dd className={hasUpdate ? "installer-tile__version--update" : undefined}>
                  {latestVersionText}
                </dd>
              </div>
              <div>
                <dt>{t("installer.tile.installed")}</dt>
                <dd>{installedVersionText}</dd>
              </div>
              {runtimeVersionLabel ? (
                <div>
                  <dt>{runtimeVersionLabel}</dt>
                  <dd>{runtimeVersionText}</dd>
                </div>
              ) : null}
            </dl>
          )}
          <div className="installer-tile__meta">
            <span
              className={`installer-tile__badge ${
                isInstalled ? "installer-tile__badge--installed" : "installer-tile__badge--missing"
              }`}
              data-alone={isInstalled && !hasUpdate ? "true" : "false"}
            >
              {isInstalled
                ? t("installer.section.installed")
                : t("installer.status.notInstalled")}
            </span>
          </div>
          {!isInstalled || hasUpdate ? (
            <button
              type="button"
              className="installer-tile__action primary"
              onClick={handleActionClick}
            >
              {hasUpdate
                ? t("installer.actions.update")
                : t("installer.actions.install")}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
