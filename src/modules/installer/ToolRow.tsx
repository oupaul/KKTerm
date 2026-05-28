// One tool row — collapsed shows summary + primary action; expanded shows
// progress, log, options form, and uninstall. Per ADR 0007 / Q10:
// "Inline expanding detail panel per tool".

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import {
  findInstalledDependents,
  recipeNeedsWsl,
  resolveInstallPlan,
} from "./dag";
import { InstallerConfirmDialog } from "./InstallerConfirmDialog";
import { installRecipeAndWait } from "./progress";
import { useInstallerStore } from "./state";
import type { InstallOptions, Recipe } from "./types";

export function ToolRow({ recipe }: { recipe: Recipe }) {
  const { t, i18n } = useTranslation();
  const catalog = useInstallerStore((s) => s.catalog);
  const detected = useInstallerStore((s) => s.detected[recipe.id]);
  const allDetected = useInstallerStore((s) => s.detected);
  const toolState = useInstallerStore((s) => s.toolState[recipe.id]);
  const inFlight = useInstallerStore((s) => s.inFlight[recipe.id]);
  const lastStatus = useInstallerStore((s) => s.lastStatus[recipe.id]);
  const expanded = useInstallerStore((s) => s.expanded[recipe.id]);
  const wslJustEnabled = useInstallerStore((s) => s.wslJustEnabled);
  const toggleExpanded = useInstallerStore((s) => s.toggleExpanded);
  const beginInFlight = useInstallerStore((s) => s.beginInFlight);

  const [options, setOptions] = useState<InstallOptions>({});
  const [installConfirm, setInstallConfirm] = useState<null | {
    items: string[];
    recipes: Recipe[];
    uacEstimate: number;
  }>(null);
  const [uninstallConfirm, setUninstallConfirm] = useState<null | {
    dependents: string[];
  }>(null);

  const wslBlocked =
    !!catalog && wslJustEnabled && recipeNeedsWsl(recipe, catalog);

  const isInstalled = detected?.installed ?? false;
  const installedVersion = detected?.installedVersion;
  const partial = detected?.partialCount;
  const latestSeen = toolState?.latestVersionSeen;
  const hasUpdate =
    isInstalled &&
    latestSeen &&
    installedVersion &&
    latestSeen !== installedVersion;
  const busy = !!inFlight;

  const description =
    recipe.descriptionLocales?.[i18n.language] ?? recipe.descriptionEn;

  function applyOption<K extends keyof InstallOptions>(
    key: K,
    value: InstallOptions[K],
  ) {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }

  function attemptInstall() {
    if (!catalog || wslBlocked) return;
    const plan = resolveInstallPlan(recipe.id, catalog, allDetected, options);
    const prereqActionable = plan.actionable.filter((s) => s.isPrerequisite);
    if (prereqActionable.length > 0 || plan.uacPromptEstimate > 0) {
      setInstallConfirm({
        items: prereqActionable.map((s) => s.recipe.name),
        recipes: plan.actionable.map((s) => s.recipe),
        uacEstimate: plan.uacPromptEstimate,
      });
      return;
    }
    void doInstall(plan.actionable.map((s) => s.recipe));
  }

  async function doInstall(recipes: Recipe[]) {
    if (!isTauriRuntime()) return;
    setInstallConfirm(null);
    for (const queuedRecipe of recipes) {
      beginInFlight(queuedRecipe.id, "install");
      try {
        const terminalEvent = await installRecipeAndWait(
          queuedRecipe.id,
          queuedRecipe.id === recipe.id ? options : {},
        );
        if (terminalEvent.kind !== "completed") {
          break;
        }
      } catch {
        break;
      }
    }
  }

  function attemptUninstall() {
    if (!catalog) return;
    const dependents = findInstalledDependents(recipe.id, catalog, allDetected);
    if (dependents.length > 0) {
      setUninstallConfirm({ dependents: dependents.map((d) => d.name) });
      return;
    }
    setUninstallConfirm({ dependents: [] });
  }

  async function doUninstall() {
    if (!isTauriRuntime()) return;
    setUninstallConfirm(null);
    beginInFlight(recipe.id, "uninstall");
    try {
      await invokeCommand("installer_uninstall_recipe", { toolId: recipe.id });
    } catch {
      // Backend will emit Failed event.
    }
  }

  async function handleCancel() {
    if (!isTauriRuntime()) return;
    try {
      await invokeCommand("installer_cancel", { toolId: recipe.id });
    } catch {
      // Best-effort.
    }
  }

  async function handleTogglePin() {
    if (!isTauriRuntime()) return;
    const next = !(toolState?.pinned ?? false);
    try {
      await invokeCommand("installer_set_pinned", {
        toolId: recipe.id,
        pinned: next,
      });
      const states = await invokeCommand("installer_get_state");
      useInstallerStore.getState().setToolStates(states);
    } catch {
      // ignore
    }
  }

  return (
    <article
      className={`installer-row ${expanded ? "expanded" : ""} ${busy ? "busy" : ""}`}
    >
      <header
        className="installer-row__head"
        onClick={() => toggleExpanded(recipe.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleExpanded(recipe.id);
          }
        }}
      >
        <div className="installer-row__title">
          <span className="installer-row__name">{recipe.name}</span>
          <span className="installer-row__provider">{recipe.provider.kind}</span>
        </div>
        <div className="installer-row__meta">
          {isInstalled ? (
            <span className="installer-pill installed">
              {installedVersion ?? t("installer.status.noVersion")}
            </span>
          ) : partial ? (
            <span className="installer-pill partial">
              {t("installer.status.partial", {
                installed: partial[0],
                total: partial[1],
              })}
            </span>
          ) : null}
          {hasUpdate ? (
            <span className="installer-pill update">→ {latestSeen}</span>
          ) : null}
          {busy ? (
            <span className="installer-pill busy" aria-live="polite">
              {inFlight.operation === "install"
                ? t("installer.status.installing")
                : t("installer.status.uninstalling")}
            </span>
          ) : null}
          {lastStatus?.kind === "completed" ? (
            <span className="installer-pill done">
              {t("installer.status.completed")}
            </span>
          ) : null}
          {lastStatus?.kind === "failed" ? (
            <span className="installer-pill failed">
              {t("installer.status.failed", { message: lastStatus.message })}
            </span>
          ) : null}
          {lastStatus?.kind === "cancelled" ? (
            <span className="installer-pill cancelled">
              {t("installer.status.cancelled")}
            </span>
          ) : null}
        </div>
      </header>
      {expanded ? (
        <div className="installer-row__body">
          {description ? (
            <p className="installer-row__desc">{description}</p>
          ) : null}
          {wslBlocked ? (
            <p className="installer-row__hint" role="status">
              {t("installer.wslReboot")}
            </p>
          ) : null}
          {inFlight ? (
            <div className="installer-row__progress">
              {inFlight.currentStep ? (
                <div className="installer-row__step">{inFlight.currentStep}</div>
              ) : null}
              {inFlight.ratio != null ? (
                <progress
                  className="installer-row__bar"
                  value={inFlight.ratio}
                  max={1}
                />
              ) : null}
              {inFlight.log.length > 0 ? (
                <pre className="installer-row__log" aria-live="polite">
                  {inFlight.log.slice(-30).join("\n")}
                </pre>
              ) : null}
            </div>
          ) : null}
          <OptionsForm recipe={recipe} options={options} onChange={applyOption} />
          <div className="installer-row__actions">
            {busy ? (
              <button
                type="button"
                className="installer-button danger"
                onClick={() => void handleCancel()}
              >
                {t("installer.actions.cancel")}
              </button>
            ) : isInstalled ? (
              <>
                {hasUpdate ? (
                  <button
                    type="button"
                    className="installer-button primary"
                    onClick={attemptInstall}
                    disabled={wslBlocked}
                  >
                    {t("installer.actions.update")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="installer-button danger"
                  onClick={attemptUninstall}
                >
                  {t("installer.actions.uninstall")}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="installer-button primary"
                onClick={attemptInstall}
                disabled={wslBlocked}
              >
                {t("installer.actions.install")}
              </button>
            )}
            <label className="installer-row__pin">
              <input
                type="checkbox"
                checked={toolState?.pinned ?? false}
                onChange={() => void handleTogglePin()}
              />
              <span>{t("installer.options.pinVersion")}</span>
            </label>
          </div>
        </div>
      ) : null}
      {installConfirm ? (
        <InstallerConfirmDialog
          title={t("installer.confirm.installTitle", { name: recipe.name })}
          body={
            installConfirm.items.length > 0
              ? t("installer.confirm.installWithPrereqsBody")
              : undefined
          }
          items={
            installConfirm.items.length > 0 ? installConfirm.items : undefined
          }
          footer={
            installConfirm.uacEstimate > 0
              ? t("installer.confirm.uacFooter", {
                  count: installConfirm.uacEstimate,
                })
              : undefined
          }
          confirmLabel={t("installer.confirm.installConfirm")}
          onConfirm={() => void doInstall(installConfirm.recipes)}
          onCancel={() => setInstallConfirm(null)}
        />
      ) : null}
      {uninstallConfirm ? (
        <InstallerConfirmDialog
          title={t("installer.confirm.uninstallTitle", { name: recipe.name })}
          body={
            uninstallConfirm.dependents.length > 0
              ? t("installer.confirm.uninstallDependentsBody", {
                  name: recipe.name,
                })
              : t("installer.confirm.uninstallSimpleBody", {
                  name: recipe.name,
                })
          }
          items={
            uninstallConfirm.dependents.length > 0
              ? uninstallConfirm.dependents
              : undefined
          }
          footer={
            uninstallConfirm.dependents.length > 0
              ? t("installer.confirm.uninstallDependentsFooter")
              : undefined
          }
          confirmLabel={t("installer.confirm.uninstallConfirm")}
          tone="danger"
          onConfirm={() => void doUninstall()}
          onCancel={() => setUninstallConfirm(null)}
        />
      ) : null}
    </article>
  );
}

function OptionsForm({
  recipe,
  options,
  onChange,
}: {
  recipe: Recipe;
  options: InstallOptions;
  onChange: <K extends keyof InstallOptions>(
    key: K,
    value: InstallOptions[K],
  ) => void;
}) {
  const { t } = useTranslation();
  const supported = new Set(recipe.options ?? []);
  if (supported.size === 0) return null;
  return (
    <div className="installer-row__options" data-tutorial-id="installer.toolOptions">
      {supported.has("scope") ? (
        <label>
          <span>{t("installer.options.scope")}</span>
          <select
            value={options.scope ?? "user"}
            onChange={(event) =>
              onChange(
                "scope",
                event.target.value as "user" | "machine",
              )
            }
          >
            <option value="user">{t("installer.options.scopeUser")}</option>
            <option value="machine">
              {t("installer.options.scopeMachine")}
            </option>
          </select>
        </label>
      ) : null}
      {supported.has("version") ? (
        <label>
          <span>{t("installer.options.version")}</span>
          <input
            type="text"
            placeholder={t("installer.options.versionLatest")}
            value={options.version ?? ""}
            onChange={(event) => onChange("version", event.target.value)}
          />
        </label>
      ) : null}
      {supported.has("location") ? (
        <label>
          <span>{t("installer.options.location")}</span>
          <input
            type="text"
            value={options.location ?? ""}
            onChange={(event) => onChange("location", event.target.value)}
          />
        </label>
      ) : null}
      {supported.has("addToPath") ? (
        <label>
          <input
            type="checkbox"
            checked={options.addToPath ?? false}
            onChange={(event) => onChange("addToPath", event.target.checked)}
          />
          <span>{t("installer.options.addToPath")}</span>
        </label>
      ) : null}
    </div>
  );
}
