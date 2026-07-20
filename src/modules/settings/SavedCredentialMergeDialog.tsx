import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Actions,
  Btn,
  DialogShell,
  Sheet,
} from "../../app/ui/dialog";
import { invokeCommand } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { ConnectionPasswordCredentialEntry } from "../../types";
import { defaultMergeTargetId, mergeTargetMustHaveSecret } from "./savedCredentialsModel";

export function SavedCredentialMergeDialog({
  selected,
  onCancel,
  onMerged,
}: {
  selected: ConnectionPasswordCredentialEntry[];
  onCancel: () => void;
  onMerged: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [targetId, setTargetId] = useState(() => defaultMergeTargetId(selected));
  const [busy, setBusy] = useState(false);
  const targetMustHaveSecret = mergeTargetMustHaveSecret(selected);

  async function merge() {
    const sources = selected
      .map((credential) => credential.id)
      .filter((id) => id !== targetId);
    if (!targetId || sources.length === 0) {
      return;
    }
    setBusy(true);
    try {
      await invokeCommand("merge_connection_password_credentials", {
        request: { targetCredentialId: targetId, sourceCredentialIds: sources },
      });
      window.dispatchEvent(new CustomEvent("kkterm:connection-tree-invalidated"));
      showStatusBarNotice(t("settings.savedCredentialMerged"), { tone: "success" });
      await onMerged();
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell onBackdrop={onCancel}>
      <Sheet
        width={480}
        title={t("settings.savedCredentialMergeTitle")}
        ariaLabel={t("settings.savedCredentialMergeTitle")}
        footer={
          <Actions
            cancel={<Btn onClick={onCancel}>{t("common.cancel")}</Btn>}
            primary={
              <Btn kind="primary" disabled={busy || !targetId} onClick={() => void merge()}>
                {t("settings.savedCredentialMerge")}
              </Btn>
            }
          />
        }
      >
        <p className="kk-hint">{t("settings.savedCredentialMergeHint")}</p>
        <div className="settings-credential-usage-list">
          {selected.map((credential) => (
            <label className="settings-credential-usage-row" key={credential.id}>
              <input
                checked={targetId === credential.id}
                disabled={busy || (targetMustHaveSecret && !credential.secretExists)}
                name="saved-credential-merge-target"
                type="radio"
                onChange={() => setTargetId(credential.id)}
              />
              <div className="settings-credential-summary">
                <strong>{credential.label}</strong>
                <span>
                  {credential.username}
                  {credential.host ? ` @ ${credential.host}` : ""}
                  {" · "}
                  {t("settings.savedCredentialUsedBy", { count: credential.usageCount })}
                  {credential.secretExists ? "" : ` · ${t("settings.credentialMissingSecret")}`}
                </span>
              </div>
            </label>
          ))}
        </div>
      </Sheet>
    </DialogShell>
  );
}
