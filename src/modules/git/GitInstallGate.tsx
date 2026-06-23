// Shown when no `git` binary is resolvable. Mirrors the file-viewer dependency
// gate: offers an on-demand Install Helper install on Windows, otherwise asks
// the user to provide git on PATH, then re-checks.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { invokeCommand } from "../../lib/tauri";
import { supportsInstallerHelper } from "../../lib/platform";
import { installRecipeAndWait } from "../installer/progress";
import { GitIcon } from "./GitIcon";

const GIT_TOOL_ID = "git";

export function GitInstallGate({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");
  const canInstall = supportsInstallerHelper();

  async function install() {
    setInstalling(true);
    setInstallError("");
    try {
      await invokeCommand("installer_load_catalog", {});
      const result = await installRecipeAndWait(GIT_TOOL_ID);
      if (result.kind === "failed") {
        setInstallError(result.message);
      } else if (result.kind === "completed") {
        onRetry();
      }
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : String(error));
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="git-gate">
      <div className="glyph"><GitIcon name="repo" size={40} /></div>
      <h3>{t("git.gitNeededTitle")}</h3>
      <p>{t("git.gitNeededBody")}</p>
      {installError ? <div className="git-gate-error">{installError}</div> : null}
      {canInstall ? (
        <button type="button" className="git-btn primary" disabled={installing} onClick={() => void install()}>
          <Download size={15} />
          {installing ? t("git.installing") : t("git.installGit")}
        </button>
      ) : (
        <button type="button" className="git-btn" onClick={onRetry}>
          {t("git.recheck")}
        </button>
      )}
    </div>
  );
}
