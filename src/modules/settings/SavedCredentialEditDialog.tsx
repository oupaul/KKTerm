import { useEffect, useState } from "react";
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
import { connectionTypeLabel } from "../workspace/connections/utils";
import type {
  ConnectionPasswordCredentialEntry,
  ConnectionType,
} from "../../types";

const SAVED_CREDENTIAL_TYPES: readonly ConnectionType[] = ["ssh", "telnet", "rdp", "vnc", "ftp"];

export type SavedCredentialEditDraft = {
  label: string;
  connectionType: ConnectionType;
  username: string;
  host: string;
  password: string;
};

function draftFromCredential(credential: ConnectionPasswordCredentialEntry): SavedCredentialEditDraft {
  return {
    label: credential.label,
    connectionType: credential.connectionType,
    username: credential.username,
    host: credential.host,
    password: "",
  };
}

const EMPTY_DRAFT: SavedCredentialEditDraft = {
  label: "",
  connectionType: "ssh",
  username: "",
  host: "",
  password: "",
};

export function SavedCredentialEditDialog({
  credential,
  onCancel,
  onSaved,
}: {
  /** When set the dialog edits that credential; otherwise it creates a new one. */
  credential: ConnectionPasswordCredentialEntry | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [draft, setDraft] = useState<SavedCredentialEditDraft>(
    credential ? draftFromCredential(credential) : EMPTY_DRAFT,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(credential ? draftFromCredential(credential) : EMPTY_DRAFT);
  }, [credential]);

  const isEdit = Boolean(credential);
  const canSave =
    draft.label.trim().length > 0 &&
    (isEdit || draft.password.length > 0) &&
    !saving;

  async function save() {
    if (!canSave) {
      return;
    }
    setSaving(true);
    try {
      if (credential) {
        await invokeCommand("update_connection_password_credential", {
          request: {
            credentialId: credential.id,
            label: draft.label,
            username: draft.username,
            host: draft.host,
            secret: draft.password || undefined,
          },
        });
      } else {
        await invokeCommand("create_standalone_connection_password_credential", {
          request: {
            connectionType: draft.connectionType,
            label: draft.label,
            username: draft.username,
            host: draft.host || undefined,
            secret: draft.password,
          },
        });
      }
      showStatusBarNotice(t("settings.savedCredentialSaved"), { tone: "success" });
      await onSaved();
    } catch (saveError) {
      showStatusBarNotice(saveError instanceof Error ? saveError.message : String(saveError), {
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  const title = isEdit ? t("settings.savedCredentialEditTitle") : t("settings.savedCredentialNew");

  return (
    <DialogShell onBackdrop={onCancel}>
      <Sheet
        width={480}
        title={title}
        ariaLabel={title}
        footer={
          <Actions
            cancel={<Btn onClick={onCancel}>{t("common.cancel")}</Btn>}
            primary={
              <Btn kind="primary" icon="check" disabled={!canSave} onClick={() => void save()}>
                {t("common.save")}
              </Btn>
            }
          />
        }
      >
        <Field label={t("settings.savedCredentialName")} req hint={t("settings.savedCredentialNameHint")}>
          <TextInput
            autoFocus
            value={draft.label}
            onChange={(event) => setDraft((current) => ({ ...current, label: event.currentTarget.value }))}
            placeholder={t("settings.savedCredentialNamePlaceholder")}
          />
        </Field>
        {isEdit && credential ? (
          <Field label={t("connections.type")}>
            <TextInput value={connectionTypeLabel(credential.connectionType)} disabled />
          </Field>
        ) : (
          <Field label={t("connections.type")}>
            <Select
              value={draft.connectionType}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  connectionType: event.currentTarget.value as ConnectionType,
                }))
              }
              options={SAVED_CREDENTIAL_TYPES.map((type) => ({
                value: type,
                label: connectionTypeLabel(type),
              }))}
            />
          </Field>
        )}
        <Field label={t("settings.savedCredentialUsername")}>
          <TextInput
            value={draft.username}
            onChange={(event) => setDraft((current) => ({ ...current, username: event.currentTarget.value }))}
          />
        </Field>
        <Field label={t("connections.host")} hint={t("settings.savedCredentialHostHint")}>
          <TextInput
            value={draft.host}
            onChange={(event) => setDraft((current) => ({ ...current, host: event.currentTarget.value }))}
          />
        </Field>
        <Field
          label={isEdit ? t("settings.savedCredentialPasswordEdit") : t("connections.password")}
          req={!isEdit}
          hint={isEdit ? t("connections.leaveBlankPassword") : undefined}
        >
          <TextInput
            type="password"
            autoComplete="new-password"
            value={draft.password}
            onChange={(event) => setDraft((current) => ({ ...current, password: event.currentTarget.value }))}
          />
        </Field>
      </Sheet>
    </DialogShell>
  );
}
