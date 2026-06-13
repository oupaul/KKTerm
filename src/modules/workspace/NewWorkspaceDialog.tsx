import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { invokeCommand } from "../../lib/tauri";
import type { Connection, Workspace } from "../../types";
import { ConnectionIcon } from "./connections/ConnectionIcon";
import { flattenConnections } from "./connections/treeUtils";
import { WORKSPACE_ICON_NAMES, WorkspaceIcon } from "./workspaceIcons";

interface ImportGroup {
  workspaceId: string;
  workspaceName: string;
  connections: Connection[];
}

/**
 * New Workspace wizard: pick a name and icon, optionally copy-import Connections
 * from existing Workspaces. On success the caller receives the created Workspace
 * and is expected to refresh the Workspace list and activate it.
 */
export function NewWorkspaceDialog({
  workspaces,
  onClose,
  onCreated,
}: {
  workspaces: Workspace[];
  onClose: () => void;
  onCreated: (workspace: Workspace) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(WORKSPACE_ICON_NAMES[0]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importGroups, setImportGroups] = useState<ImportGroup[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    async function loadImportCandidates() {
      const groups: ImportGroup[] = [];
      for (const workspace of workspaces) {
        try {
          const tree = await invokeCommand("list_connection_tree", {
            workspaceId: workspace.id,
          });
          const connections = flattenConnections(tree);
          if (connections.length > 0) {
            groups.push({
              workspaceId: workspace.id,
              workspaceName: workspace.isDefault
                ? t("workspace.defaultWorkspace")
                : workspace.name,
              connections,
            });
          }
        } catch {
          // A failed tree read just omits that Workspace from the picker.
        }
      }
      if (!disposed) {
        setImportGroups(groups);
      }
    }
    void loadImportCandidates();
    return () => {
      disposed = true;
    };
  }, [workspaces, t]);

  const canCreate = useMemo(() => name.trim().length > 0 && !submitting, [name, submitting]);

  function toggleConnection(connectionId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(connectionId)) {
        next.delete(connectionId);
      } else {
        next.add(connectionId);
      }
      return next;
    });
  }

  async function handleCreate() {
    if (!canCreate) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const workspace = await invokeCommand("create_workspace", {
        request: {
          name: name.trim(),
          icon,
          importConnectionIds:
            selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
        },
      });
      onCreated(workspace);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="dialog-backdrop connection-dialog-backdrop" role="presentation">
      <div
        aria-label={t("workspace.newWorkspace")}
        aria-modal="true"
        className="connection-dialog new-workspace-dialog"
        role="dialog"
      >
        <header className="connection-dialog-header compact">
          <h2>{t("workspace.newWorkspace")}</h2>
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
                  void handleCreate();
                }
              }}
              placeholder={t("workspace.workspaceNamePlaceholder")}
              type="text"
              value={name}
            />
          </label>

          <div className="new-workspace-field">
            <span>{t("workspace.workspaceIcon")}</span>
            <div className="new-workspace-icon-picker">
              {WORKSPACE_ICON_NAMES.map((iconName) => (
                <button
                  aria-label={iconName}
                  className={icon === iconName ? "active" : ""}
                  key={iconName}
                  onClick={() => setIcon(iconName)}
                  title={iconName}
                  type="button"
                >
                  <WorkspaceIcon icon={iconName} name={name || iconName} size={16} />
                </button>
              ))}
            </div>
          </div>

          {importGroups.length > 0 ? (
            <div className="new-workspace-field">
              <span>{t("workspace.importConnections")}</span>
              <p className="field-hint">{t("workspace.importConnectionsHint")}</p>
              <div className="new-workspace-import-list">
                {importGroups.map((group) => (
                  <div className="new-workspace-import-group" key={group.workspaceId}>
                    <p className="new-workspace-import-group-name">
                      {group.workspaceName}
                    </p>
                    {group.connections.map((connection) => (
                      <label className="new-workspace-import-row" key={connection.id}>
                        <input
                          checked={selectedIds.has(connection.id)}
                          onChange={() => toggleConnection(connection.id)}
                          type="checkbox"
                        />
                        <ConnectionIcon
                          iconBackgroundColor={connection.iconBackgroundColor}
                          iconDataUrl={connection.iconDataUrl}
                          localShell={connection.localShell}
                          size={14}
                          type={connection.type}
                        />
                        <span>{connection.name}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <div className="settings-error">{error}</div> : null}
        </div>

        <footer className="connection-dialog-footer">
          <button
            className="toolbar-button primary"
            disabled={!canCreate}
            onClick={() => void handleCreate()}
            type="button"
          >
            {t("workspace.createWorkspace")}
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
