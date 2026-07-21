import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Actions,
  Btn,
  DialogShell,
  Field,
  Select,
  Sheet,
  TextInput,
} from "../../app/ui/dialog";
import { invokeCommand } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type {
  ConnectionPasswordCredentialEntry,
  StoredCredentialSummary,
} from "../../types";

export function SavedCredentialConvertDialog({
  legacy,
  credentials,
  onCancel,
  onConverted,
}: {
  /** Legacy per-Connection password row (ownerId is the Connection id). */
  legacy: StoredCredentialSummary;
  credentials: ConnectionPasswordCredentialEntry[];
  onCancel: () => void;
  onConverted: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const reusableCredentials = useMemo(
    () => credentials.filter((credential) => credential.secretExists),
    [credentials],
  );
  const [mode, setMode] = useState<"existing" | "new">(
    reusableCredentials.length > 0 ? "existing" : "new",
  );
  const [selectedCredentialId, setSelectedCredentialId] = useState(
    reusableCredentials[0]?.id ?? "",
  );
  const [label, setLabel] = useState(
    legacy.username?.trim()
      ? `${legacy.username.trim()} @ ${legacy.host ?? legacy.label}`
      : legacy.label,
  );
  const [busy, setBusy] = useState(false);

  const canSubmit =
    !busy &&
    (mode === "existing" ? Boolean(selectedCredentialId) : label.trim().length > 0);

  async function convert() {
    if (!canSubmit) {
      return;
    }
    setBusy(true);
    try {
      await invokeCommand("convert_connection_password_to_credential", {
        request: {
          connectionId: legacy.ownerId,
          credentialId: mode === "existing" ? selectedCredentialId : undefined,
          label: mode === "new" ? label : undefined,
        },
      });
      window.dispatchEvent(new CustomEvent("kkterm:connection-tree-invalidated"));
      showStatusBarNotice(t("settings.savedCredentialConverted"), { tone: "success" });
      await onConverted();
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
        title={t("settings.savedCredentialConvertTitle")}
        ariaLabel={t("settings.savedCredentialConvertTitle")}
        footer={
          <Actions
            cancel={<Btn onClick={onCancel}>{t("common.cancel")}</Btn>}
            primary={
              <Btn kind="primary" disabled={!canSubmit} onClick={() => void convert()}>
                {t("settings.savedCredentialConvert")}
              </Btn>
            }
          />
        }
      >
        <p className="kk-hint">{t("settings.savedCredentialConvertHint", { name: legacy.label })}</p>
        {reusableCredentials.length > 0 ? (
          <label className="settings-credential-usage-row">
            <input
              checked={mode === "existing"}
              disabled={busy}
              name="saved-credential-convert-mode"
              type="radio"
              onChange={() => setMode("existing")}
            />
            <div className="settings-credential-summary">
              <strong>{t("settings.savedCredentialConvertExisting")}</strong>
            </div>
          </label>
        ) : null}
        {mode === "existing" && reusableCredentials.length > 0 ? (
          <Field label={t("settings.savedCredentials")}>
            <Select
              value={selectedCredentialId}
              onChange={(event) => setSelectedCredentialId(event.currentTarget.value)}
              options={reusableCredentials.map((credential) => ({
                value: credential.id,
                label: credential.label,
              }))}
            />
          </Field>
        ) : null}
        <label className="settings-credential-usage-row">
          <input
            checked={mode === "new"}
            disabled={busy}
            name="saved-credential-convert-mode"
            type="radio"
            onChange={() => setMode("new")}
          />
          <div className="settings-credential-summary">
            <strong>{t("settings.savedCredentialConvertNew")}</strong>
          </div>
        </label>
        {mode === "new" ? (
          <Field label={t("settings.savedCredentialName")} req>
            <TextInput value={label} onChange={(event) => setLabel(event.currentTarget.value)} />
          </Field>
        ) : null}
      </Sheet>
    </DialogShell>
  );
}
