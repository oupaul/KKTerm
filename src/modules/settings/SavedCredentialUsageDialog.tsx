import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Unlink } from "../../lib/reicon";
import {
  Actions,
  Btn,
  DialogShell,
  Sheet,
} from "../../app/ui/dialog";
import { invokeCommand } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type {
  Connection,
  ConnectionPasswordCredentialEntry,
  ConnectionPasswordCredentialUsage,
} from "../../types";
import { flattenConnections } from "../workspace/connections/treeUtils";

export function SavedCredentialUsageDialog({
  credential,
  onChanged,
  onClose,
}: {
  credential: ConnectionPasswordCredentialEntry;
  /** Reload the credential list after link state changed. */
  onChanged: () => void | Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const [usage, setUsage] = useState<ConnectionPasswordCredentialUsage[] | null>(null);
  const [candidates, setCandidates] = useState<Connection[]>([]);
  const [linkSelection, setLinkSelection] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [nextUsage, tree] = await Promise.all([
        invokeCommand("list_connection_password_credential_usage", {
          request: { credentialId: credential.id },
        }),
        invokeCommand("list_connection_tree", undefined),
      ]);
      setUsage(nextUsage);
      setCandidates(
        flattenConnections(tree).filter(
          (connection) =>
            connection.type === credential.connectionType &&
            connection.passwordCredentialId !== credential.id,
        ),
      );
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
    }
  }

  useEffect(() => {
    setLinkSelection(new Set());
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credential.id]);

  const linkableCandidates = useMemo(
    () =>
      [...candidates].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      ),
    [candidates],
  );

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      window.dispatchEvent(new CustomEvent("kkterm:connection-tree-invalidated"));
      await load();
      await onChanged();
      showStatusBarNotice(t("settings.savedCredentialUsageUpdated"), { tone: "success" });
    } catch (error) {
      showStatusBarNotice(error instanceof Error ? error.message : String(error), { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  function unlink(connectionId: string) {
    void run(() =>
      invokeCommand("unassign_connection_password_credential", {
        request: { connectionId },
      }),
    );
  }

  function linkSelected() {
    const selected = [...linkSelection];
    if (selected.length === 0) {
      return;
    }
    void run(async () => {
      for (const connectionId of selected) {
        await invokeCommand("assign_connection_password_credential", {
          request: { connectionId, credentialId: credential.id },
        });
      }
    });
  }

  return (
    <DialogShell onBackdrop={onClose}>
      <Sheet
        width={520}
        title={t("settings.savedCredentialUsageTitle", { label: credential.label })}
        ariaLabel={t("settings.savedCredentialUsageTitle", { label: credential.label })}
        footer={
          <Actions
            cancel={<Btn onClick={onClose}>{t("common.close")}</Btn>}
            primary={
              <Btn
                kind="primary"
                disabled={busy || linkSelection.size === 0}
                onClick={linkSelected}
              >
                {t("settings.savedCredentialLinkApply", { count: linkSelection.size })}
              </Btn>
            }
          />
        }
      >
        <div className="settings-credential-usage">
          {usage === null ? (
            <p className="settings-empty-state">{t("common.loading")}</p>
          ) : usage.length === 0 ? (
            <p className="settings-empty-state">{t("settings.savedCredentialUsageEmpty")}</p>
          ) : (
            <div className="settings-credential-usage-list">
              {usage.map((entry) => (
                <div className="settings-credential-usage-row" key={entry.connectionId}>
                  <div className="settings-credential-summary">
                    <strong>{entry.name}</strong>
                    <span>
                      {entry.username ? `${entry.username} @ ${entry.host}` : entry.host}
                    </span>
                  </div>
                  <button
                    aria-label={t("settings.savedCredentialUnlink")}
                    className="settings-icon-danger-button"
                    disabled={busy}
                    type="button"
                    onClick={() => unlink(entry.connectionId)}
                  >
                    <Unlink size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <h3>{t("settings.savedCredentialLinkTitle")}</h3>
          {linkableCandidates.length === 0 ? (
            <p className="settings-empty-state">{t("settings.savedCredentialLinkEmpty")}</p>
          ) : (
            <div className="settings-credential-usage-list">
              {linkableCandidates.map((connection) => (
                <label className="settings-credential-usage-row" key={connection.id}>
                  <input
                    checked={linkSelection.has(connection.id)}
                    disabled={busy}
                    type="checkbox"
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setLinkSelection((current) => {
                        const next = new Set(current);
                        if (checked) {
                          next.add(connection.id);
                        } else {
                          next.delete(connection.id);
                        }
                        return next;
                      });
                    }}
                  />
                  <div className="settings-credential-summary">
                    <strong>{connection.name}</strong>
                    <span>
                      {connection.user ? `${connection.user} @ ${connection.host}` : connection.host}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </Sheet>
    </DialogShell>
  );
}
