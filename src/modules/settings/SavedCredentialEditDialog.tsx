import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Actions,
  Btn,
  DialogShell,
  Field,
  Sheet,
  TextInput,
} from "../../app/ui/dialog";
import { invokeCommand } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { ConnectionPasswordCredentialEntry } from "../../types";

export type SavedCredentialEditDraft = {
  label: string;
  username: string;
  password: string;
};

function draftFromCredential(credential: ConnectionPasswordCredentialEntry): SavedCredentialEditDraft {
  return {
    label: credential.label,
    username: credential.username,
    password: "",
  };
}

const EMPTY_DRAFT: SavedCredentialEditDraft = {
  label: "",
  username: "",
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
            secret: draft.password || undefined,
          },
        });
      } else {
        await invokeCommand("create_standalone_connection_password_credential", {
          request: {
            label: draft.label,
            username: draft.username,
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
            onChange={(event) => {
              const label = event.currentTarget.value;
              setDraft((current) => ({ ...current, label }));
            }}
            placeholder={t("settings.savedCredentialNamePlaceholder")}
          />
        </Field>
        <Field label={t("settings.savedCredentialUsername")}>
          <TextInput
            value={draft.username}
            onChange={(event) => {
              const username = event.currentTarget.value;
              setDraft((current) => ({ ...current, username }));
            }}
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
            onChange={(event) => {
              const password = event.currentTarget.value;
              setDraft((current) => ({ ...current, password }));
            }}
          />
        </Field>
      </Sheet>
    </DialogShell>
  );
}
