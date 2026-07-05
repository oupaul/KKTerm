import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileText } from "../../../../../lib/reicon";
import { invokeCommand, type PdfViewStatus } from "../../../../../lib/tauri";
import { supportsInstallerHelper } from "../../../../../lib/platform";
import { installRecipeAndWait } from "../../../../installer/progress";
import type { DashboardBackground } from "../../../../dashboard/types";
import { dependencyForKind } from "../fileViewerDependencies";
import { PdfViewer } from "./PdfViewer";

/**
 * Phase 2 external-dependency gate for PDF. Resolves the Poppler renderer
 * (`file_view_pdf_status`); when present it mounts the viewer, otherwise it
 * prompts to install the dependency on demand through the Install Helper
 * (Windows) or to provide it via PATH (other platforms), then re-checks.
 */
export function PdfDependencyGate({
  background,
  filePath,
  isActive,
}: {
  background: DashboardBackground | null;
  filePath: string;
  isActive: boolean;
}) {
  const { t } = useTranslation();
  const dependency = dependencyForKind("pdf");
  const [status, setStatus] = useState<PdfViewStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");
  const canInstall = supportsInstallerHelper();

  const check = useCallback(async () => {
    setChecking(true);
    try {
      setStatus(await invokeCommand("file_view_pdf_status", undefined));
    } catch {
      setStatus({ available: false, source: null, toolId: dependency?.toolId ?? "poppler" });
    } finally {
      setChecking(false);
    }
  }, [dependency?.toolId]);

  useEffect(() => {
    void check();
  }, [check]);

  async function install() {
    if (!dependency) {
      return;
    }
    setInstalling(true);
    setInstallError("");
    try {
      await invokeCommand("installer_load_catalog", {});
      const result = await installRecipeAndWait(dependency.toolId);
      if (result.kind === "failed") {
        setInstallError(result.message);
      } else if (result.kind === "completed") {
        await check();
      }
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : String(error));
    } finally {
      setInstalling(false);
    }
  }

  if (checking) {
    return <div className="file-viewer-status">{t("workspace.fileViewer.loading")}</div>;
  }

  if (status?.available) {
    return <PdfViewer active={isActive} background={background} filePath={filePath} />;
  }

  const toolName = dependency ? t(dependency.toolNameKey) : "Poppler";

  return (
    <div className="fv-gate">
      <div className="glyph">
        <FileText size={40} strokeWidth={1.5} />
      </div>
      <h3>{t("workspace.fileViewer.dependencyNeededTitle")}</h3>
      <p>{t("workspace.fileViewer.dependencyNeededBody", { tool: toolName })}</p>
      {installError ? (
        <div className="file-viewer-status file-viewer-status-error">{installError}</div>
      ) : null}
      {canInstall ? (
        <div className="tool">
          <div className="ti">
            <Download size={20} />
          </div>
          <div>
            <div className="tt">{toolName}</div>
            <div className="ts">{t("workspace.fileViewer.dependencyToolNote")}</div>
          </div>
        </div>
      ) : null}
      <div className="actions">
        {canInstall ? (
          <button
            className="fv-btn primary"
            disabled={installing}
            onClick={() => void install()}
            type="button"
          >
            <Download size={15} />
            {installing
              ? t("workspace.fileViewer.dependencyInstalling", { tool: toolName })
              : t("workspace.fileViewer.dependencyInstall", { tool: toolName })}
          </button>
        ) : (
          <p>{t("workspace.fileViewer.dependencyManualHint", { tool: toolName })}</p>
        )}
        <button className="fv-btn" disabled={installing} onClick={() => void check()} type="button">
          {t("workspace.fileViewer.retry")}
        </button>
      </div>
    </div>
  );
}
