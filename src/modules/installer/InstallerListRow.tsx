// One row in the Installer Helper List view: icon + name + description, the
// Installed and Latest version columns, a status pill, and a primary action.
// Clicking the row opens the same app-owned InstallerToolDialog the Gallery
// tiles use (info, or stepper while an install is in flight). Status/version
// derivation is shared with the tile via useToolStatus.

import { CircleArrowUp, CircleCheck, CircleX } from "lucide-react";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { isTauriRuntime, openExternalUrl } from "../../lib/tauri";
import { iconUrlForRecipe, FALLBACK_ICON_URL } from "./icons";
import { latestVersionWebUrlForRecipe } from "./latestSupport";
import { useInstallerStore } from "./state";
import { localizedDescription, type Recipe } from "./types";
import { useToolStatus, type StatusTone } from "./useToolStatus";

function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  const icon =
    tone === "installed" ? (
      <CircleCheck size={12} strokeWidth={2.2} aria-hidden="true" />
    ) : tone === "update" ? (
      <CircleArrowUp size={12} strokeWidth={2.2} aria-hidden="true" />
    ) : tone === "failed" ? (
      <CircleX size={12} strokeWidth={2.2} aria-hidden="true" />
    ) : tone === "busy" ? (
      <span className="installer-page__spinner" aria-hidden="true" />
    ) : null;
  return (
    <span className="installer-pill" data-tone={tone}>
      {icon}
      {label}
    </span>
  );
}

export function InstallerListRow({ recipe }: { recipe: Recipe }) {
  const { t, i18n } = useTranslation();
  const openInfoDialog = useInstallerStore((s) => s.openInfoDialog);
  const openStepperDialog = useInstallerStore((s) => s.openStepperDialog);

  const {
    isInstalled,
    installedVersion,
    partial,
    latestSeen,
    latestError,
    supportsLatestVersion,
    hasUpdate,
    busy,
    operation,
    retrieving,
    statusTone,
  } = useToolStatus(recipe);
  const latestWebUrl = latestVersionWebUrlForRecipe(recipe);

  function handleOpen() {
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

  function handleWebLatestClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!latestWebUrl) return;
    if (!isTauriRuntime()) {
      window.open(latestWebUrl, "_blank", "noopener,noreferrer");
      return;
    }
    void openExternalUrl(latestWebUrl).catch(() => {
      window.open(latestWebUrl, "_blank", "noopener,noreferrer");
    });
  }

  const description = localizedDescription(recipe, i18n.language);

  const installedText = retrieving
    ? t("installer.status.retrieving")
    : isInstalled
      ? (installedVersion ?? t("installer.status.noVersion"))
      : "—";

  const latestText = retrieving
    ? t("installer.status.retrieving")
    : (latestError ?? latestSeen ?? t("installer.status.noVersion"));

  const pillLabel = busy
    ? operation === "uninstall"
      ? t("installer.status.uninstalling")
      : t("installer.status.installing")
    : statusTone === "failed"
      ? t("installer.stepper.failedBadge")
      : statusTone === "update"
        ? t("installer.actions.update")
        : statusTone === "installed"
          ? t("installer.section.installed")
          : statusTone === "partial"
            ? t("installer.status.partial", {
                installed: partial?.[0] ?? 0,
                total: partial?.[1] ?? 0,
              })
            : t("installer.status.notInstalled");

  return (
    <div
      className="installer-listrow"
      data-status={statusTone}
      role="button"
      tabIndex={0}
      aria-label={recipe.name}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpen();
        }
      }}
    >
      <div className="installer-listrow__name">
        <img
          className="installer-listrow__icon"
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
        <div className="installer-listrow__text">
          <b title={recipe.name}>{recipe.name}</b>
          <span title={description}>{description}</span>
        </div>
      </div>
      <div className="installer-listrow__ver installer-listrow__ver--muted">
        {installedText}
      </div>
      <div
        className={`installer-listrow__ver${
          !retrieving && latestError
            ? " installer-listrow__ver--error"
            : !retrieving && hasUpdate
              ? " installer-listrow__ver--update"
              : ""
        }`}
      >
        {supportsLatestVersion || latestSeen ? (
          latestText
        ) : latestWebUrl ? (
          <a
            className="installer-tile__web-link"
            href={latestWebUrl}
            onClick={handleWebLatestClick}
            rel="noopener noreferrer"
          >
            {t("installer.status.web")}
          </a>
        ) : (
          "—"
        )}
      </div>
      <div className="installer-listrow__status">
        <StatusPill tone={statusTone} label={pillLabel} />
      </div>
      <div className="installer-listrow__action">
        {!isInstalled || hasUpdate ? (
          <button
            type="button"
            className="installer-act primary"
            onClick={handleActionClick}
            disabled={retrieving}
          >
            {hasUpdate
              ? t("installer.actions.update")
              : t("installer.actions.install")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
