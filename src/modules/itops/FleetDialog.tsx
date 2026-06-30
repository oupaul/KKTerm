// Create / edit a Fleet. Built from the shared dialog primitives
// (docs/DESIGN_LANGUAGE.md): a name field, an icon picker, the per-host
// transport default (edit only), and a multi-select of the active Workspace's
// Connections for static membership.

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DialogShell, Field, Sheet, TextInput } from "../../app/ui/dialog";
import { lucideIconRefForName } from "../../lib/iconCatalog";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { flattenConnections } from "../workspace/connections/treeUtils";
import { ConnectionIconBackgroundPicker } from "../workspace/connections/ConnectionIconBackgroundPicker";
import { ConnectionIconPicker } from "../workspace/connections/ConnectionIconPicker";
import { useWorkspaceStore } from "../../store";
import type { Connection, Fleet, ItopsTransport } from "../../types";
import { ItIcon } from "./icons";
import { useItOpsStore } from "./state";

const TRANSPORTS: ItopsTransport[] = ["auto", "ssh", "winrm", "psexec"];
const DEFAULT_FLEET_ICON_REF = lucideIconRefForName("Building2");

export function FleetDialog({
  group,
  onClose,
  onSaved,
}: {
  group?: Fleet | null;
  onClose: () => void;
  onSaved: (group: Fleet) => void;
}) {
  const { t } = useTranslation();
  const isEdit = !!group;
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const createFleet = useItOpsStore((state) => state.createFleet);
  const updateFleet = useItOpsStore((state) => state.updateFleet);

  const [name, setName] = useState(group?.name ?? "");
  const [transport, setTransport] = useState<ItopsTransport>(group?.transport ?? "auto");
  const [iconColor, setIconColor] = useState<string | null>(group?.iconColor ?? null);
  const [iconDataUrl, setIconDataUrl] = useState<string | null>(group?.iconDataUrl ?? null);
  const [iconBackgroundColor, setIconBackgroundColor] = useState<string | null>(
    group?.iconBackgroundColor ?? null,
  );
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
      iconColor,
      iconDataUrl,
      iconBackgroundColor,
    };
    try {
      const saved = isEdit
        ? await updateFleet(group!.id, input)
        : await createFleet(input);
      showStatusBarNotice(t("itops.fleets.savedNotice", { name: saved.name }), {
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
        title={isEdit ? t("itops.fleets.editTitle") : t("itops.actions.newFleet")}
        ariaLabel={isEdit ? t("itops.fleets.editTitle") : t("itops.actions.newFleet")}
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
        {isEdit ? null : <p className="hg-dlg-help">{t("itops.fleets.createHelp")}</p>}
        <div className="connection-type-summary">
          <ConnectionIconPicker
            customIconDataUrls={[]}
            defaultIconDataUrl={DEFAULT_FLEET_ICON_REF}
            defaultIconKeywords={["fleet", "building", "default"]}
            defaultIconLabel={t("itops.fleets.heading")}
            iconBackgroundColor={iconBackgroundColor}
            iconColor={iconColor}
            iconDataUrl={iconDataUrl}
            onChange={setIconDataUrl}
            onIconColorChange={setIconColor}
            type="localFiles"
          />
          <div className="connection-icon-palettes">
            <ConnectionIconBackgroundPicker
              color={iconBackgroundColor}
              onChange={setIconBackgroundColor}
            />
          </div>
        </div>
        <Field label={t("itops.fleets.nameLabel")} req>
          <TextInput
            value={name}
            placeholder={t("itops.fleets.namePlaceholder")}
            onChange={(event) => setName(event.currentTarget.value)}
            autoFocus
          />
        </Field>

        {isEdit ? (
          <Field label={t("itops.fleets.perHostTransport")}>
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
        ) : null}

        <Field
          label={t("itops.fleets.connectionsLabel")}
          hint={t("itops.fleets.selectedCount", { count: selected.size })}
        >
          <div className="hg-dlg-list">
            {orderedConnections.length === 0 ? (
              <div className="hg-dlg-empty">{t("itops.fleets.noConnections")}</div>
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
