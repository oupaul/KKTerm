import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DialogShell, Sheet } from "../../app/ui/dialog";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { Connection, RackItem } from "../../types";
import { flattenConnections } from "../workspace/connections/treeUtils";
import { useItOpsStore } from "./state";

export function RackItemBindingsDialog({ siteId, item, onClose }: { siteId: string; item: RackItem; onClose: () => void }) {
  const { t } = useTranslation();
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const updateRackItem = useItOpsStore((state) => state.updateRackItem);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selected, setSelected] = useState(() => new Set(item.metadata.connectionIds ?? []));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    void invokeCommand("list_connection_tree", { workspaceId: activeWorkspaceId })
      .then((tree) => setConnections(flattenConnections(tree)))
      .catch(() => setConnections([]));
  }, [activeWorkspaceId]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    try {
      await updateRackItem(siteId, {
        id: item.id,
        kind: item.kind,
        connectionId: item.connectionId ?? null,
        label: item.label,
        metadata: { ...item.metadata, connectionIds: selected.size ? [...selected] : null },
      });
      onClose();
    } catch (error) {
      showStatusBarNotice(t("itops.errorNotice", { message: error instanceof Error ? error.message : String(error) }), { tone: "error" });
      setBusy(false);
    }
  }

  return (
    <DialogShell onBackdrop={onClose} zClassName="itops-page">
      <Sheet width={560} title={t("itops.racks.bindingsLabel")} ariaLabel={t("itops.racks.bindingsLabel")} footer={
        <Actions cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>} primary={<Btn kind="primary" disabled={busy} onClick={() => void save()}>{t("itops.actions.save")}</Btn>} />
      }>
        <p className="hg-dlg-help">{t("itops.racks.bindingsHint")}</p>
        <div className="connection-binding-list standalone">
          {connections.length === 0 ? <div className="hg-dlg-empty">{t("itops.sites.noConnections")}</div> : connections.map((connection) => (
            <label className="connection-binding-row" key={connection.id}>
              <input type="checkbox" checked={selected.has(connection.id)} onChange={() => toggle(connection.id)} />
              <span>{connection.name}</span>
              <small>{connection.host}</small>
            </label>
          ))}
        </div>
      </Sheet>
    </DialogShell>
  );
}
