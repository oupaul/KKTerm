import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmSheet } from "../../app/ui/dialog";
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

  return (
    <ConfirmSheet
      tone="danger"
      title={t("workspace.deleteWorkspace")}
      message={
        <>
          <p>{t("workspace.deleteWorkspaceConfirm", { name: workspace.name })}</p>
          {error ? <p className="settings-error">{error}</p> : null}
        </>
      }
      confirmLabel={t("common.delete")}
      confirmIcon="trash"
      onConfirm={() => void handleDelete()}
      onCancel={onClose}
    />
  );
}
