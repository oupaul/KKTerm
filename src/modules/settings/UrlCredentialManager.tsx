import { Eye, EyeOff, Lock, LockOpen, Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Actions,
  Btn,
  DialogShell,
  Sheet,
  TextInput,
} from "../../app/ui/dialog";
import { invokeCommand } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { UrlCredentialSummary } from "../../types";
import { CredentialDeleteConfirmDialog } from "./CredentialDeleteConfirmDialog";

type SavedInputField =
  | {
      selector: string;
      index: number;
      kind: "value";
      value: string;
      masked: boolean;
    }
  | {
      selector: string;
      index: number;
      kind: "checked";
      checked: boolean;
    };

interface UrlCredentialEditDraft {
  username: string;
  password: string;
  passwordDirty: boolean;
  fields: SavedInputField[];
}

function parseSavedInputFields(value?: string): SavedInputField[] {
  if (!value) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((field): SavedInputField[] => {
      if (!field || typeof field !== "object") {
        return [];
      }
      const candidate = field as Record<string, unknown>;
      if (typeof candidate.selector !== "string") {
        return [];
      }
      const index = typeof candidate.index === "number" ? candidate.index : 0;
      if (candidate.kind === "checked") {
        return [{ selector: candidate.selector, index, kind: "checked", checked: Boolean(candidate.checked) }];
      }
      if (candidate.kind === "value") {
        return [{
          selector: candidate.selector,
          index,
          kind: "value",
          value: String(candidate.value ?? ""),
          masked: Boolean(candidate.masked),
        }];
      }
      return [];
    });
  } catch {
    return [];
  }
}

function draftFromCredential(credential: UrlCredentialSummary): UrlCredentialEditDraft {
  return {
    username: credential.username,
    password: "",
    passwordDirty: false,
    fields: parseSavedInputFields(credential.fieldValues),
  };
}

function serializeSavedInputFields(draft: UrlCredentialEditDraft) {
  return draft.fields.length > 0 ? JSON.stringify(draft.fields) : undefined;
}

function savedInputKey(field: SavedInputField, fieldIndex: number) {
  return `${field.selector}:${field.index}:${fieldIndex}`;
}

function editedUsername(
  credential: UrlCredentialSummary,
  draft: UrlCredentialEditDraft,
) {
  const usernameField = draft.fields.find(
    (field) => field.kind === "value" && field.selector === credential.usernameSelector,
  );
  return usernameField?.kind === "value" && usernameField.value.trim()
    ? usernameField.value.trim()
    : draft.username.trim();
}

export function UrlCredentialManager({
  credentials,
  onChanged,
}: {
  credentials: UrlCredentialSummary[];
  onChanged: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [editTarget, setEditTarget] = useState<UrlCredentialSummary | null>(null);
  const [editDraft, setEditDraft] = useState<UrlCredentialEditDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UrlCredentialSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [revealedFields, setRevealedFields] = useState<Set<string>>(() => new Set());
  const editOwnerRef = useRef<string | null>(null);

  function beginEdit(credential: UrlCredentialSummary) {
    setEditTarget(credential);
    setEditDraft(draftFromCredential(credential));
    setPasswordVisible(false);
    setRevealedFields(new Set());
    editOwnerRef.current = credential.secretOwnerId;
    if (credential.passwordSelector) {
      void invokeCommand("read_url_credential_password", {
        ownerId: credential.secretOwnerId,
      }).then((password) => {
        if (editOwnerRef.current !== credential.secretOwnerId || !password) {
          return;
        }
        setEditDraft((current) => current ? { ...current, password } : current);
      }).catch((error) => {
        if (editOwnerRef.current === credential.secretOwnerId) {
          showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
        }
      });
    }
  }

  function closeEditor() {
    if (saving) {
      return;
    }
    setEditTarget(null);
    setEditDraft(null);
    editOwnerRef.current = null;
  }

  async function saveEdit() {
    if (!editTarget || !editDraft) {
      return;
    }
    const username = editedUsername(editTarget, editDraft);
    if (!username) {
      return;
    }
    setSaving(true);
    try {
      if (editDraft.passwordDirty && editDraft.password) {
        await invokeCommand("store_secret", {
          request: {
            kind: "urlPassword",
            ownerId: editTarget.secretOwnerId,
            secret: editDraft.password,
          },
        });
      }
      await invokeCommand("upsert_url_credential", {
        request: {
          connectionId: editTarget.connectionId,
          username,
          pageUrl: editTarget.pageUrl,
          usernameSelector: editTarget.usernameSelector,
          passwordSelector: editTarget.passwordSelector,
          fieldValues: serializeSavedInputFields(editDraft),
        },
      });
      setEditTarget(null);
      setEditDraft(null);
      editOwnerRef.current = null;
      window.dispatchEvent(new CustomEvent("kkterm:connection-tree-invalidated"));
      await onChanged();
      showStatusBarNotice(t("settings.urlPasswordUpdated"), { tone: "success" });
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCredential(credential: UrlCredentialSummary) {
    try {
      await invokeCommand("delete_stored_credential", {
        request: {
          kind: "urlPassword",
          ownerId: credential.secretOwnerId,
        },
      });
      window.dispatchEvent(new CustomEvent("kkterm:connection-tree-invalidated"));
      await onChanged();
      showStatusBarNotice(t("settings.urlPasswordDeleted"), { tone: "success" });
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
    }
  }

  return (
    <>
      {credentials.length === 0 ? (
        <p className="settings-empty-state">{t("settings.noSavedWebsitePasswords")}</p>
      ) : (
        <div className="settings-list" aria-label={t("settings.savedWebsitePasswords")}>
          {credentials.map((credential) => {
            const address = credential.pageUrl ?? credential.url ?? t("settings.notSet");
            return (
              <div
                className="settings-url-credential-row"
                key={credential.secretOwnerId}
              >
                <strong title={credential.connectionName}>{credential.connectionName}</strong>
                <span className="settings-url-credential-address" title={address}>{address}</span>
                <div className="settings-url-credential-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => beginEdit(credential)}
                  >
                    <Pencil size={15} />
                    {t("common.edit")}
                  </button>
                  <button
                    aria-label={t("settings.deleteCredential")}
                    className="settings-icon-danger-button"
                    type="button"
                    onClick={() => setDeleteTarget(credential)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editTarget && editDraft ? (
        <DialogShell>
          <Sheet
            title={t("settings.savedWebsitePasswords")}
            width={500}
            footer={
              <Actions
                primary={
                  <Btn
                    disabled={saving || !editedUsername(editTarget, editDraft)}
                    icon="check"
                    kind="primary"
                    onClick={() => void saveEdit()}
                  >
                    {t("common.save")}
                  </Btn>
                }
                cancel={
                  <Btn disabled={saving} onClick={closeEditor}>
                    {t("common.cancel")}
                  </Btn>
                }
              />
            }
          >
            <div className="settings-url-credential-context">
              <strong>{editTarget.connectionName}</strong>
              <span title={editTarget.pageUrl ?? editTarget.url}>
                {editTarget.pageUrl ?? editTarget.url ?? t("settings.notSet")}
              </span>
            </div>
            {editDraft.fields.length > 0 || editTarget.passwordSelector ? (
              <div className="settings-url-saved-fields">
                {editDraft.fields
                  .map((field, fieldIndex) => ({ field, fieldIndex }))
                  .map(({ field, fieldIndex }) => (
                    <div
                      className="settings-url-saved-field"
                      key={savedInputKey(field, fieldIndex)}
                    >
                      <code title={field.selector}>
                        {field.selector}
                        <span>#{field.index + 1}</span>
                      </code>
                      {field.kind === "checked" ? (
                        <input
                          aria-label={field.selector}
                          checked={field.checked}
                          disabled={saving}
                          type="checkbox"
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            setEditDraft((current) => current ? {
                              ...current,
                              fields: current.fields.map((candidate, index) =>
                                index === fieldIndex && candidate.kind === "checked"
                                  ? { ...candidate, checked }
                                  : candidate,
                              ),
                            } : current);
                          }}
                        />
                      ) : (
                        <div className="settings-url-saved-field-control">
                          <TextInput
                            aria-label={field.selector}
                            autoFocus={fieldIndex === 0}
                            disabled={saving}
                            type={
                              !field.masked || revealedFields.has(savedInputKey(field, fieldIndex))
                                ? "text"
                                : "password"
                            }
                            value={field.value}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setEditDraft((current) => current ? {
                                ...current,
                                fields: current.fields.map((candidate, index) =>
                                  index === fieldIndex && candidate.kind === "value"
                                    ? { ...candidate, value }
                                    : candidate,
                                ),
                              } : current);
                            }}
                          />
                          {field.masked ? (
                            <button
                              aria-label={t(
                                revealedFields.has(savedInputKey(field, fieldIndex))
                                  ? "settings.urlCredentialHideValue"
                                  : "settings.urlCredentialShowValue",
                              )}
                              className="settings-url-field-icon-button"
                              disabled={saving}
                              type="button"
                              onClick={() => {
                                const key = savedInputKey(field, fieldIndex);
                                setRevealedFields((current) => {
                                  const next = new Set(current);
                                  if (next.has(key)) {
                                    next.delete(key);
                                  } else {
                                    next.add(key);
                                  }
                                  return next;
                                });
                              }}
                            >
                              {revealedFields.has(savedInputKey(field, fieldIndex))
                                ? <EyeOff size={15} />
                                : <Eye size={15} />}
                            </button>
                          ) : null}
                          <button
                            aria-label={t(
                              field.masked
                                ? "settings.urlCredentialUnmaskValue"
                                : "settings.urlCredentialMaskValue",
                            )}
                            className="settings-url-field-icon-button"
                            disabled={saving}
                            type="button"
                            onClick={() => {
                              const masked = !field.masked;
                              const key = savedInputKey(field, fieldIndex);
                              setEditDraft((current) => current ? {
                                ...current,
                                fields: current.fields.map((candidate, index) =>
                                  index === fieldIndex && candidate.kind === "value"
                                    ? { ...candidate, masked }
                                    : candidate,
                                ),
                              } : current);
                              setRevealedFields((current) => {
                                const next = new Set(current);
                                next.delete(key);
                                return next;
                              });
                            }}
                          >
                            {field.masked ? <LockOpen size={15} /> : <Lock size={15} />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                {editTarget.passwordSelector ? (
                  <div className="settings-url-saved-field">
                    <code title={editTarget.passwordSelector}>{editTarget.passwordSelector}</code>
                    <div className="settings-url-saved-field-control">
                      <TextInput
                        aria-label={editTarget.passwordSelector}
                        autoComplete="new-password"
                        disabled={saving}
                        placeholder={t("settings.urlCredentialPasswordPlaceholder")}
                        type={passwordVisible ? "text" : "password"}
                        value={editDraft.password}
                        onChange={(event) =>
                          setEditDraft((current) => current
                            ? {
                                ...current,
                                password: event.currentTarget.value,
                                passwordDirty: true,
                              }
                            : current)
                        }
                      />
                      <button
                        aria-label={t(
                          passwordVisible
                            ? "settings.urlCredentialHideValue"
                            : "settings.urlCredentialShowValue",
                        )}
                        className="settings-url-field-icon-button"
                        disabled={saving}
                        type="button"
                        onClick={() => setPasswordVisible((visible) => !visible)}
                      >
                        {passwordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Sheet>
        </DialogShell>
      ) : null}

      {deleteTarget ? (
        <CredentialDeleteConfirmDialog
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            const credential = deleteTarget;
            setDeleteTarget(null);
            void deleteCredential(credential);
          }}
        />
      ) : null}
    </>
  );
}
