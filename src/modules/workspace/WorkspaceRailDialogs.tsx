import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { invokeCommand } from "../../lib/tauri";
import type { Workspace } from "../../types";

/** Confirm and delete a Workspace (and its Connections). */
export function DeleteWorkspaceDialog({
  workspace,
  onClose,
  onDeleted,
}: {
  workspace: Workspace;
  onClose: () => void;
  onDeleted: (workspace: Workspace) => void;
}) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await invokeCommand("delete_workspace", { id: workspace.id });
      onDeleted(workspace);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="dialog-backdrop connection-dialog-backdrop" role="presentation">
      <div
        aria-label={t("workspace.deleteWorkspace")}
        aria-modal="true"
        className="connection-dialog new-workspace-dialog"
        role="dialog"
      >
        <header className="connection-dialog-header compact">
          <h2>{t("workspace.deleteWorkspace")}</h2>
        </header>
        <div className="new-workspace-body">
          <p>{t("workspace.deleteWorkspaceConfirm", { name: workspace.name })}</p>
          {error ? <div className="settings-error">{error}</div> : null}
        </div>
        <footer className="connection-dialog-footer">
          <button
            className="toolbar-button danger"
            disabled={submitting}
            onClick={() => void handleDelete()}
            type="button"
          >
            {t("common.delete")}
          </button>
          <button className="toolbar-button" onClick={onClose} type="button">
            {t("common.cancel")}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
