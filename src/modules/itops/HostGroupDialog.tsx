// Create / edit a Host Group. Built from the shared dialog primitives
// (docs/DESIGN_LANGUAGE.md): a name field, the per-host transport default, and a
// multi-select of the active Workspace's Connections for static membership.
//
// Phase 1 edits static membership only; an existing group's dynamic filter is
// preserved on save but not editable here yet (a later refinement).

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DialogShell, Field, Sheet, TextInput } from "../../app/ui/dialog";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { flattenConnections } from "../workspace/connections/treeUtils";
import { useWorkspaceStore } from "../../store";
import type { Connection, HostGroup, ItopsTransport } from "../../types";
import { ItIcon } from "./icons";
import { useItOpsStore } from "./state";

const TRANSPORTS: ItopsTransport[] = ["auto", "ssh", "winrm", "psexec"];

export function HostGroupDialog({
  group,
  onClose,
  onSaved,
}: {
  group?: HostGroup | null;
  onClose: () => void;
  onSaved: (group: HostGroup) => void;
}) {
  const { t } = useTranslation();
  const isEdit = !!group;
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const createHostGroup = useItOpsStore((state) => state.createHostGroup);
  const updateHostGroup = useItOpsStore((state) => state.updateHostGroup);

  const [name, setName] = useState(group?.name ?? "");
  const [transport, setTransport] = useState<ItopsTransport>(group?.transport ?? "auto");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(group?.memberIds ?? []),
  );
  const [connections, setConnections] = useState<Connection[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let disposed = false;
    if (!isTauriRuntime()) {
      return;
    }
    void invokeCommand("list_connection_tree", { workspaceId: activeWorkspaceId })
      .then((tree) => {
        if (!disposed) {
          setConnections(flattenConnections(tree));
        }
      })
      .catch(() => {
        if (!disposed) {
          setConnections([]);
        }
      });
    return () => {
      disposed = true;
    };
  }, [activeWorkspaceId]);

  // Keep any since-deleted member ids selected so editing a group never silently
  // drops members whose Connection is missing from the current tree.
  const orderedConnections = useMemo(() => connections, [connections]);

  function toggle(connectionId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(connectionId)) {
        next.delete(connectionId);
      } else {
        next.add(connectionId);
      }
      return next;
    });
  }

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && !busy;

  async function handleSave() {
    if (!canSave) {
      return;
    }
    setBusy(true);
    const input = {
      name: trimmedName,
      // Preserve stored member order for existing members; append newly added.
      memberIds: orderedMemberIds(group?.memberIds ?? [], selected),
      filter: group?.filter ?? null,
      transport,
    };
    try {
      const saved = isEdit
        ? await updateHostGroup(group!.id, input)
        : await createHostGroup(input);
      showStatusBarNotice(t("itops.hostGroups.savedNotice", { name: saved.name }), {
        tone: "success",
      });
      onSaved(saved);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
      setBusy(false);
    }
  }

  return (
    <DialogShell onBackdrop={onClose}>
      <Sheet
        width={560}
        title={isEdit ? t("itops.hostGroups.editTitle") : t("itops.actions.newHostGroup")}
        ariaLabel={isEdit ? t("itops.hostGroups.editTitle") : t("itops.actions.newHostGroup")}
        footer={
          <Actions
            cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>}
            primary={
              <Btn kind="primary" onClick={() => void handleSave()} disabled={!canSave}>
                {isEdit ? t("itops.actions.save") : t("itops.actions.create")}
              </Btn>
            }
          />
        }
      >
        <Field label={t("itops.hostGroups.nameLabel")} req>
          <TextInput
            value={name}
            placeholder={t("itops.hostGroups.namePlaceholder")}
            onChange={(event) => setName(event.currentTarget.value)}
            autoFocus
          />
        </Field>

        <Field label={t("itops.hostGroups.perHostTransport")}>
          <div className="hg-dlg-seg">
            {TRANSPORTS.map((value) => (
              <button
                key={value}
                type="button"
                className={value === transport ? "on" : ""}
                onClick={() => setTransport(value)}
              >
                {value === "auto" ? t("itops.transport.auto") : value.toUpperCase()}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label={t("itops.hostGroups.connectionsLabel")}
          hint={t("itops.hostGroups.selectedCount", { count: selected.size })}
        >
          <div className="hg-dlg-list">
            {orderedConnections.length === 0 ? (
              <div className="hg-dlg-empty">{t("itops.hostGroups.noConnections")}</div>
            ) : (
              orderedConnections.map((connection) => {
                const checked = selected.has(connection.id);
                return (
                  <button
                    key={connection.id}
                    type="button"
                    className={`hg-dlg-row${checked ? " checked" : ""}`}
                    aria-pressed={checked}
                    onClick={() => toggle(connection.id)}
                  >
                    <span className="hg-dlg-check">
                      {checked ? <ItIcon name="check" size={13} sw={2.4} /> : null}
                    </span>
                    <span className="hg-dlg-row-txt">
                      <span className="nm">{connection.name}</span>
                      <span className="host">
                        {connection.user ? `${connection.user}@` : ""}
                        {connection.host}
                      </span>
                    </span>
                    <span className="hg-dlg-type">{connection.type}</span>
                  </button>
                );
              })
            )}
          </div>
        </Field>
      </Sheet>
    </DialogShell>
  );
}

/// Keep the stored member order stable, then append newly selected ids so a
/// resolved Batch Run preserves an operator's intended ordering.
function orderedMemberIds(stored: string[], selected: Set<string>): string[] {
  const kept = stored.filter((id) => selected.has(id));
  const keptSet = new Set(kept);
  const added = [...selected].filter((id) => !keptSet.has(id));
  return [...kept, ...added];
}
