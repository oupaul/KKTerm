// Installer Helper Module page. Shell + section grouping + lifecycle.
//
// Lifecycle:
//   * Mount: load catalog (uses 1h disk cache), subscribe to progress events,
//     load toolState. If hasInitialScanned is false, kick off detect_all in
//     the background. Subsequent visits use the in-memory cache.
//   * Activation (switching to the Module from another Module): run an
//     interval-gated latest-version check. The check only fetches when the
//     configured interval (General Settings → Installer Helper, default once
//     per day) has elapsed since the last successful check; the last-check
//     timestamp is persisted per tool in SQLite and survives app launches.
//     Otherwise the persisted check state is reused without a network fetch.
//   * "Refresh" button (manual check): re-run detection, then check latest
//     versions for every catalog tool regardless of the interval, updating the
//     last-check timestamp.
//   * Unmount: keep the in-memory store; do NOT reset detected state (so
//     visiting the Module again is instant).

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import { useInstallerStore } from "./state";
import { isKnownSelfElevatingWingetRecipe, isWslFeature } from "./dag";
import { InstallerConfirmDialog } from "./InstallerConfirmDialog";
import { InstallerToolDialog } from "./InstallerToolDialog";
import {
  PROGRESS_EVENT_NAME,
  type DetectedState,
  type ProgressEvent,
  type Recipe,
  type ToolState,
} from "./types";
import { installRecipeAndWait } from "./progress";
import { ToolRow } from "./ToolRow";
import { isInstallerUpdateAvailable } from "./versionCompare";
import { recipeSupportsLatestVersion } from "./latestSupport";
import { resolveInstallerCheckIntervalSeconds } from "./checkInterval";
import "./installer.css";

export function InstallerPage({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore(
    (state) => state.showStatusBarNotice,
  );
  const generalSettings = useWorkspaceStore((state) => state.generalSettings);
  const catalog = useInstallerStore((s) => s.catalog);
  const detected = useInstallerStore((s) => s.detected);
  const toolState = useInstallerStore((s) => s.toolState);
  const scanning = useInstallerStore((s) => s.scanning);
  const checking = useInstallerStore((s) => s.checking);
  const setCatalog = useInstallerStore((s) => s.setCatalog);
  const setDetected = useInstallerStore((s) => s.setDetected);
  const setToolStates = useInstallerStore((s) => s.setToolStates);
  const setScanning = useInstallerStore((s) => s.setScanning);
  const markInitialScanned = useInstallerStore((s) => s.markInitialScanned);
  const markWslJustEnabled = useInstallerStore((s) => s.markWslJustEnabled);
  const applyProgress = useInstallerStore((s) => s.applyProgress);
  const beginInFlight = useInstallerStore((s) => s.beginInFlight);
  const openStepperDialog = useInstallerStore((s) => s.openStepperDialog);

  const [updateAllConfirm, setUpdateAllConfirm] = useState<null | {
    items: string[];
    uacEstimate: number;
  }>(null);

  // Subscribe to progress events once per app session.
  useEffect(() => {
    if (!isTauriRuntime()) return;
    let unsubscribed = false;
    let unlisten: (() => void) | undefined;
    listen<ProgressEvent>(PROGRESS_EVENT_NAME, (event) => {
      if (unsubscribed) return;
      applyProgress(event.payload);
      // After a terminal event, re-detect that tool so the row moves
      // between Installed / Available immediately.
      if (
        event.payload.kind === "completed" ||
        event.payload.kind === "failed" ||
        event.payload.kind === "cancelled"
      ) {
        const toolId = event.payload.toolId;
        // If the just-completed tool is the WSL feature, set the session
        // reboot-gating flag so Docker (and anything else needing WSL)
        // is disabled until KKTerm restarts.
        if (event.payload.kind === "completed") {
          const catalogSnapshot = useInstallerStore.getState().catalog;
          const completedRecipe = catalogSnapshot?.recipes.find(
            (r) => r.id === toolId,
          );
          if (completedRecipe && isWslFeature(completedRecipe)) {
            markWslJustEnabled();
          }
        }
        void invokeCommand("installer_redetect", { toolId })
          .then((next) => {
            useInstallerStore.getState().setOneDetected(toolId, next);
          })
          .catch(() => {
            // Re-detection failure is non-fatal; user can hit Refresh.
          });
      }
    }).then((u) => {
      if (unsubscribed) {
        u();
        return;
      }
      unlisten = u;
    });
    return () => {
      unsubscribed = true;
      unlisten?.();
    };
  }, [applyProgress, markWslJustEnabled]);

  // Load catalog + initial detect when the Module first becomes active.
  useEffect(() => {
    if (!active || !isTauriRuntime()) return;
    if (catalog) return; // already loaded
    void (async () => {
      try {
        const loaded = await invokeCommand("installer_load_catalog", {});
        setCatalog(loaded);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showStatusBarNotice(message, { tone: "error" });
      }
      try {
        const states = await invokeCommand("installer_get_state");
        setToolStates(states);
      } catch {
        // Empty toolState is fine on first run.
      }
    })();
  }, [active, catalog, setCatalog, setToolStates, showStatusBarNotice, t]);

  // Drive detection + interval-gated auto-check once per activation. The ref
  // resets whenever the Module goes inactive, so switching back to the Module
  // re-evaluates the interval (but the work itself is skipped when still
  // fresh). catalog is a trigger because it loads asynchronously after the
  // Module first becomes active.
  const activationHandled = useRef(false);
  useEffect(() => {
    if (!active) {
      activationHandled.current = false;
      return;
    }
    if (!catalog || !isTauriRuntime()) return;
    if (activationHandled.current) return;
    activationHandled.current = true;
    void (async () => {
      // Detection sweep runs once per app session.
      const store = useInstallerStore.getState();
      if (!store.hasInitialScanned && !store.scanning) {
        setScanning(true);
        try {
          const cached = await invokeCommand("installer_load_detection_cache");
          if (Object.keys(cached).length > 0) {
            setDetected(cached);
          }
          await invokeCommand("installer_detect_all_streaming");
          const states = await invokeCommand("installer_get_state");
          setToolStates(states);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          showStatusBarNotice(message, { tone: "error" });
          setScanning(false);
          markInitialScanned();
          return;
        }
      }

      // Interval-gated latest-version check: skip the network fetch when the
      // last successful check is still within the configured interval.
      const latest = useInstallerStore.getState();
      if (latest.checking) return;
      const lastCheck = latestTimestamp(
        Object.values(latest.toolState).map((s) => s.lastCheckAt),
      );
      const intervalSeconds = resolveInstallerCheckIntervalSeconds(
        generalSettings.installerCheckIntervalSeconds,
      );
      const nowSeconds = Date.now() / 1000;
      if (lastCheck !== null && nowSeconds - lastCheck < intervalSeconds) {
        return;
      }
      const toolIds = catalog.recipes
        .filter(recipeSupportsLatestVersion)
        .map((r) => r.id);
      if (toolIds.length === 0) return;
      try {
        await invokeCommand("installer_check_latest_versions", { toolIds });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showStatusBarNotice(message, { tone: "error" });
      }
    })();
  }, [
    active,
    catalog,
    generalSettings.installerCheckIntervalSeconds,
    markInitialScanned,
    setDetected,
    setScanning,
    setToolStates,
    showStatusBarNotice,
  ]);

  async function handleRefresh() {
    if (!isTauriRuntime() || !catalog) return;
    setScanning(true);
    try {
      const nextDetected = await invokeCommand("installer_detect_all");
      setDetected(nextDetected);
      const states = await invokeCommand("installer_get_state");
      setToolStates(states);
      const toolIds = catalog.recipes
        .filter(recipeSupportsLatestVersion)
        .map((r) => r.id);
      if (toolIds.length > 0) {
        await invokeCommand("installer_check_latest_versions", {
          toolIds,
        });
      }
      setScanning(false);
      markInitialScanned();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(message, { tone: "error" });
      setScanning(false);
    }
  }

  const sections = groupRecipes(catalog?.recipes ?? [], detected, toolState);
  const updateAllRecipes = sections.updates.filter(
    (recipe) => !(toolState[recipe.id]?.pinned ?? false),
  );
  const lastCheckedAt = latestTimestamp([
    ...Object.values(detected).map((state) => state.lastCheckedAt ?? null),
    ...Object.values(toolState).map((state) => state.lastCheckAt),
  ]);
  const lastCheckedText = t("installer.lastChecked", {
    time: lastCheckedAt
      ? formatHeaderTimestamp(lastCheckedAt)
      : t("installer.status.neverChecked"),
  });
  const checkInProgress = scanning || checking;

  function openUpdateAllConfirm() {
    if (!catalog || updateAllRecipes.length === 0) return;
    const items = updateAllRecipes.map((r) => r.name);
    // UAC heuristic for "Update all": each updateable recipe contributes
    // its own per-recipe UAC estimate (without pinned-version flags). We
    // import the heuristic from dag.ts indirectly by re-running the same
    // logic via resolveInstallPlan with no detected map — but here we
    // already know the recipes will all install fresh, so just count via
    // a small inline scan.
    const uacEstimate = updateAllRecipes.reduce((sum, r) => {
      if (r.provider.kind === "windowsFeature") return sum + 1;
      if (r.provider.kind === "wslDistro") return sum;
      if (r.provider.kind === "winget") {
        return isKnownSelfElevatingWingetRecipe(r) ? sum + 1 : sum;
      }
      if (r.provider.kind === "githubRelease") {
        return r.provider.layout === "zip" ? sum : sum + 1;
      }
      if (r.provider.kind === "downloadInstaller") {
        return r.id === "antigravity-cli" ? sum : sum + 1;
      }
      return sum;
    }, 0);
    setUpdateAllConfirm({ items, uacEstimate });
  }

  async function confirmUpdateAll() {
    if (!isTauriRuntime()) {
      setUpdateAllConfirm(null);
      return;
    }
    const queue = updateAllRecipes;
    setUpdateAllConfirm(null);
    for (const recipe of queue) {
      openStepperDialog(recipe.id);
      beginInFlight(recipe.id, "install");
      try {
        const terminalEvent = await installRecipeAndWait(recipe.id, {});
        if (terminalEvent.kind !== "completed") {
          openStepperDialog(recipe.id);
          break;
        }
      } catch (error) {
        openStepperDialog(recipe.id);
        const message = error instanceof Error ? error.message : String(error);
        showStatusBarNotice(message, { tone: "error" });
        break;
      }
    }
  }

  return (
    <section
      className="installer-page"
      aria-label={t("installer.title")}
      data-active={active ? "true" : "false"}
    >
      <header className="installer-page__header">
        <div>
          <h1>{t("installer.title")}</h1>
          <p className="installer-page__subtitle">{t("installer.subtitle")}</p>
        </div>
        <div className="installer-page__actions">
          <span
            className={`installer-page__last-checked ${
              checkInProgress ? "installer-page__last-checked--busy" : ""
            }`}
          >
            {checkInProgress ? (
              <>
                <span className="installer-page__spinner" aria-hidden="true" />
                {t("installer.checkingForUpdates")}
              </>
            ) : (
              lastCheckedText
            )}
          </span>
          <button
            type="button"
            className="installer-button"
            onClick={() => void handleRefresh()}
            disabled={scanning || checking || !catalog}
          >
            {checkInProgress
              ? t("installer.checkingDots")
              : t("installer.refresh")}
          </button>
          <button
            type="button"
            className="installer-button primary"
            data-tutorial-id="installer.updateAll"
            onClick={openUpdateAllConfirm}
            disabled={scanning || !catalog || updateAllRecipes.length === 0}
          >
            {t("installer.updateAll")}
          </button>
        </div>
      </header>

      {!catalog ? (
        <div className="installer-empty">{t("installer.empty.loading")}</div>
      ) : (
        <div className="installer-page__sections">
          {sections.categories.map((section) => (
            <RecipeSection
              key={section.titleKey}
              titleKey={section.titleKey}
              recipes={section.recipes}
            />
          ))}
        </div>
      )}
      <InstallerToolDialog />
      {updateAllConfirm ? (
        <InstallerConfirmDialog
          title={t("installer.confirm.updateAllTitle")}
          body={t("installer.confirm.updateAllBody", {
            count: updateAllConfirm.items.length,
          })}
          items={updateAllConfirm.items}
          footer={
            updateAllConfirm.uacEstimate > 0
              ? t("installer.confirm.uacFooter", {
                  count: updateAllConfirm.uacEstimate,
                })
              : undefined
          }
          confirmLabel={t("installer.confirm.updateAllConfirm")}
          onConfirm={() => void confirmUpdateAll()}
          onCancel={() => setUpdateAllConfirm(null)}
        />
      ) : null}
    </section>
  );
}

function RecipeSection({
  titleKey,
  recipes,
}: {
  titleKey: string;
  recipes: Recipe[];
}) {
  const { t } = useTranslation();
  if (recipes.length === 0) return null;
  return (
    <section className="installer-section">
      <h2 className="installer-section__title">{t(titleKey)}</h2>
      <div className="installer-section__grid">
        {recipes.map((recipe) => (
          <ToolRow key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </section>
  );
}

interface GroupedRecipes {
  updates: Recipe[];
  categories: Array<{ titleKey: string; recipes: Recipe[] }>;
}

const INSTALLER_CATEGORY_SECTIONS: Array<{
  titleKey: string;
  ids: string[];
}> = [
  {
    titleKey: "installer.section.essentials",
    ids: ["winget", "node-bundle", "python-bundle", "git"],
  },
  {
    titleKey: "installer.section.aiAgents",
    ids: [
      "claude-code-cli",
      "codex-cli",
      "antigravity-cli",
      "opencode",
      "openclaw",
      "codex-desktop",
      "claude-desktop",
      "hermes-agent",
    ],
  },
  {
    titleKey: "installer.section.aiPlatforms",
    ids: ["ollama", "n8n", "open-webui", "flowise", "langflow"],
  },
  {
    titleKey: "installer.section.development",
    ids: [
      "vscode",
      "cursor",
      "docker-desktop",
      "bruno",
      "wsl",
      "rustup",
    ],
  },
  {
    titleKey: "installer.section.windowsPowerUser",
    ids: ["powertoys", "sysinternals-suite", "everything", "ditto"],
  },
  {
    titleKey: "installer.section.remoteAccess",
    ids: ["tailscale", "rustdesk"],
  },
  {
    titleKey: "installer.section.utilities",
    ids: ["notepadpp", "nssm", "ripgrep", "jq", "fzf", "coreutils", "7zip", "sharex", "ffmpeg", "excalidraw"],
  },
];

function groupRecipes(
  recipes: Recipe[],
  detected: Record<string, DetectedState>,
  toolState: Record<string, ToolState>,
): GroupedRecipes {
  const updates: Recipe[] = [];
  const visibleIds = new Set(
    INSTALLER_CATEGORY_SECTIONS.flatMap((section) => section.ids),
  );
  for (const recipe of recipes) {
    if (!visibleIds.has(recipe.id)) continue;
    const det = detected[recipe.id];
    if (!det) {
      continue;
    }
    if (det.installed && recipeSupportsLatestVersion(recipe)) {
      const latest = toolState[recipe.id]?.latestVersionSeen;
      if (isInstallerUpdateAvailable(latest, det.installedVersion)) {
        updates.push(recipe);
      }
    }
  }
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const categories = INSTALLER_CATEGORY_SECTIONS.map((section) => ({
    titleKey: section.titleKey,
    recipes: section.ids
      .map((id) => byId.get(id))
      .filter((recipe): recipe is Recipe => !!recipe),
  })).filter((section) => section.recipes.length > 0);
  return { updates, categories };
}

function latestTimestamp(
  values: Array<number | null | undefined>,
): number | null {
  const numeric = values.filter(
    (value): value is number => typeof value === "number",
  );
  if (numeric.length === 0) return null;
  return Math.max(...numeric);
}

function formatHeaderTimestamp(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString();
}
