import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { invokeCommand } from "../../lib/tauri";
import type { Workspace } from "../../types";

/** Rename an existing Workspace. */
export function RenameWorkspaceDialog({
  workspace,
  onClose,
  onRenamed,
}: {
  workspace: Workspace;
  onClose: () => void;
  onRenamed: (workspace: Workspace) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(workspace.name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRename() {
    if (name.trim().length === 0 || submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await invokeCommand("rename_workspace", {
        request: { id: workspace.id, name: name.trim() },
      });
      onRenamed(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="dialog-backdrop connection-dialog-backdrop" role="presentation">
      <div
        aria-label={t("workspace.renameWorkspace")}
        aria-modal="true"
        className="connection-dialog new-workspace-dialog"
        role="dialog"
      >
        <header className="connection-dialog-header compact">
          <h2>{t("workspace.renameWorkspace")}</h2>
        </header>
        <div className="new-workspace-body">
          <label className="new-workspace-field">
            <span>{t("workspace.workspaceName")}</span>
            <input
              autoFocus
              className="connection-dialog-input"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleRename();
                }
              }}
              type="text"
              value={name}
            />
          </label>
          {error ? <div className="settings-error">{error}</div> : null}
        </div>
        <footer className="connection-dialog-footer">
          <button
            className="toolbar-button primary"
            disabled={name.trim().length === 0 || submitting}
            onClick={() => void handleRename()}
            type="button"
          >
            {t("common.save")}
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
