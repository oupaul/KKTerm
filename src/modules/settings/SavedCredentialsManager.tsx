import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Plus, Trash2 } from "../../lib/reicon";
import { ConfirmSheet } from "../../app/ui/dialog";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type {
  ConnectionPasswordCredentialEntry,
  StoredCredentialSummary,
} from "../../types";
import { SavedCredentialConvertDialog } from "./SavedCredentialConvertDialog";
import { SavedCredentialEditDialog } from "./SavedCredentialEditDialog";
import { SavedCredentialMergeDialog } from "./SavedCredentialMergeDialog";
import { SavedCredentialUsageDialog } from "./SavedCredentialUsageDialog";
import {
  filterSavedCredentials,
  mergeEligibility,
  sortSavedCredentials,
} from "./savedCredentialsModel";

export function SavedCredentialsManager({
  legacyCredentials,
  onDeleteLegacy,
  onChanged,
}: {
  /** Legacy per-Connection password rows from `list_stored_credentials`. */
  legacyCredentials: StoredCredentialSummary[];
  onDeleteLegacy: (credential: StoredCredentialSummary) => void;
  /** Reload the surrounding Settings data after any credential change. */
  onChanged: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [credentials, setCredentials] = useState<ConnectionPasswordCredentialEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [editTarget, setEditTarget] = useState<ConnectionPasswordCredentialEntry | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [usageTarget, setUsageTarget] = useState<ConnectionPasswordCredentialEntry | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConnectionPasswordCredentialEntry | null>(null);
  const [convertTarget, setConvertTarget] = useState<StoredCredentialSummary | null>(null);

  async function load() {
    if (!isTauriRuntime()) {
      setCredentials([]);
      return;
    }
    setLoading(true);
    try {
      const next = await invokeCommand("list_connection_password_credentials", undefined);
      setCredentials(next);
      setSelection((current) => {
        const ids = new Set(next.map((credential) => credential.id));
        return new Set([...current].filter((id) => ids.has(id)));
      });
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changed() {
    await load();
    await onChanged();
  }

  const visible = useMemo(
    () => filterSavedCredentials(sortSavedCredentials(credentials), query),
    [credentials, query],
  );
  const selectedCredentials = useMemo(
    () => credentials.filter((credential) => selection.has(credential.id)),
    [credentials, selection],
  );
  const merge = mergeEligibility(selectedCredentials);

  async function deleteCredential(credential: ConnectionPasswordCredentialEntry) {
    try {
      await invokeCommand("delete_stored_credential", {
        request: { kind: "connectionPassword", ownerId: credential.id },
      });
      window.dispatchEvent(new CustomEvent("kkterm:connection-tree-invalidated"));
      showStatusBarNotice(t("settings.credentialDeleted"), { tone: "success" });
      await changed();
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
    }
  }

  function toggleSelection(credentialId: string, checked: boolean) {
    setSelection((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(credentialId);
      } else {
        next.delete(credentialId);
      }
      return next;
    });
  }

  return (
    <div className="settings-credential-manager">
      <div className="settings-credential-group">
        <div className="settings-credential-manager-header">
          <h3>{t("settings.savedCredentials")}</h3>
          <div className="settings-credential-manager-actions">
            {selection.size > 0 ? (
              <button
                className="secondary-button"
                disabled={!merge.ok}
                title={merge.ok ? undefined : t("settings.savedCredentialMergeSelectionHint")}
                type="button"
                onClick={() => setMergeOpen(true)}
              >
                {t("settings.savedCredentialMergeSelected", { count: selection.size })}
              </button>
            ) : null}
            <button className="secondary-button" type="button" onClick={() => setCreateOpen(true)}>
              <Plus size={15} />
              {t("settings.savedCredentialNew")}
            </button>
          </div>
        </div>
        <p className="field-hint">{t("settings.savedCredentialsHint")}</p>
        {credentials.length > 1 ? (
          <input
            aria-label={t("settings.savedCredentialsSearch")}
            className="settings-credential-search"
            placeholder={t("settings.savedCredentialsSearch")}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        ) : null}
        {credentials.length === 0 ? (
          <p className="settings-empty-state">
            {loading ? t("common.loading") : t("settings.savedCredentialsEmpty")}
          </p>
        ) : visible.length === 0 ? (
          <p className="settings-empty-state">{t("settings.savedCredentialsEmpty")}</p>
        ) : (
          <div
            className="settings-saved-credential-grid"
            role="grid"
            aria-label={t("settings.savedCredentials")}
          >
            <div className="settings-saved-credential-grid-header" role="row">
              <span aria-hidden="true" />
              <span role="columnheader">{t("settings.savedCredentialName")}</span>
              <span role="columnheader">{t("settings.savedCredentialUsername")}</span>
              <span role="columnheader">{t("app.connections")}</span>
              <span aria-hidden="true" />
            </div>
            {visible.map((credential) => (
              <div className="settings-saved-credential-grid-row" key={credential.id} role="row">
                <div className="settings-saved-credential-grid-cell is-select" role="gridcell">
                  <input
                    aria-label={t("settings.savedCredentialMergeSelect", { label: credential.label })}
                    checked={selection.has(credential.id)}
                    type="checkbox"
                    onChange={(event) => toggleSelection(credential.id, event.currentTarget.checked)}
                  />
                </div>
                <div className="settings-saved-credential-grid-cell is-name" role="gridcell">
                  <button
                    className="settings-credential-name-button"
                    type="button"
                    onClick={() => setEditTarget(credential)}
                  >
                    {credential.label}
                  </button>
                  {!credential.secretExists ? (
                    <small>{t("settings.credentialMissingSecret")}</small>
                  ) : null}
                </div>
                <div className="settings-saved-credential-grid-cell" role="gridcell">
                  <span title={credential.username}>{credential.username || "—"}</span>
                </div>
                <div className="settings-saved-credential-grid-cell is-usage" role="gridcell">
                  <button
                    aria-label={t("settings.savedCredentialUsageTitle", { label: credential.label })}
                    className="settings-credential-count-button"
                    type="button"
                    onClick={() => setUsageTarget(credential)}
                  >
                    {credential.usageCount}
                  </button>
                </div>
                <div className="settings-saved-credential-grid-actions" role="gridcell">
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
            ))}
          </div>
        )}
      </div>

      {legacyCredentials.length > 0 ? (
        <div className="settings-credential-group">
          <h3>{t("settings.perConnectionPasswords")}</h3>
          <p className="field-hint">{t("settings.perConnectionPasswordsHint")}</p>
          <div className="settings-list" aria-label={t("settings.perConnectionPasswords")}>
            {legacyCredentials.map((credential) => (
              <div className="settings-list-row" key={credential.id}>
                <div className="settings-credential-summary">
                  <strong>{credential.label}</strong>
                  <span>
                    {credential.detail}
                    {credential.username ? ` · ${credential.username}` : ""}
                    {credential.exists ? "" : ` · ${t("settings.credentialMissingSecret")}`}
                  </span>
                </div>
                <div className="settings-list-actions">
                  <button
                    className="secondary-button"
                    disabled={!credential.exists}
                    type="button"
                    onClick={() => setConvertTarget(credential)}
                  >
                    <Link size={15} />
                    {t("settings.savedCredentialConvert")}
                  </button>
                  <button
                    aria-label={t("settings.deleteCredential")}
                    className="settings-icon-danger-button"
                    type="button"
                    onClick={() => onDeleteLegacy(credential)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <SavedCredentialEditDialog
          credential={null}
          onCancel={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            void changed();
          }}
        />
      ) : null}
      {editTarget ? (
        <SavedCredentialEditDialog
          credential={editTarget}
          onCancel={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            void changed();
          }}
        />
      ) : null}
      {usageTarget ? (
        <SavedCredentialUsageDialog
          credential={usageTarget}
          onChanged={changed}
          onClose={() => setUsageTarget(null)}
        />
      ) : null}
      {mergeOpen && merge.ok ? (
        <SavedCredentialMergeDialog
          selected={selectedCredentials}
          onCancel={() => setMergeOpen(false)}
          onMerged={() => {
            setMergeOpen(false);
            setSelection(new Set());
            void changed();
          }}
        />
      ) : null}
      {convertTarget ? (
        <SavedCredentialConvertDialog
          credentials={credentials}
          legacy={convertTarget}
          onCancel={() => setConvertTarget(null)}
          onConverted={() => {
            setConvertTarget(null);
            void changed();
          }}
        />
      ) : null}
      {deleteTarget ? (
        <ConfirmSheet
          tone="danger"
          title={t("settings.deleteCredential")}
          message={
            deleteTarget.usageCount > 0
              ? t("settings.savedCredentialDeleteUsed", { count: deleteTarget.usageCount })
              : t("settings.deleteCredentialConfirmBody")
          }
          confirmLabel={t("common.delete")}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            const credential = deleteTarget;
            setDeleteTarget(null);
            void deleteCredential(credential);
          }}
        />
      ) : null}
    </div>
  );
}
