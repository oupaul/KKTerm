import { useTranslation } from "react-i18next";
import {
  invokeCommand,
  isTauriRuntime,
  selectInstallerGuiLauncherFile,
} from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import {
  launchKindForRecipe,
  readGuiLauncherPath,
  removeGuiLauncherPath,
  writeGuiLauncherPath,
} from "./launch";
import { useInstallerStore } from "./state";
import type { Recipe } from "./types";

/** Shared Run routing for Gallery tiles, List rows, and installed details. */
export function useInstallerRunAction(recipe: Recipe) {
  const { t } = useTranslation();
  const openLauncherDialog = useInstallerStore((s) => s.openLauncherDialog);
  const showStatusBarNotice = useWorkspaceStore(
    (state) => state.showStatusBarNotice,
  );
  const launchKind = launchKindForRecipe(recipe.id);

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

  function run() {
    if (launchKind === "gui") {
      void launchGuiApp();
    } else if (
      launchKind === "cli" ||
      launchKind === "suite" ||
      launchKind === "webUi"
    ) {
      openLauncherDialog(recipe.id);
    }
  }

  return { launchKind, run };
}
