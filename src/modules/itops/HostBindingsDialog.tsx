// Bind Connections to one IT Ops Host. A Host may bind several Connections at
// once — e.g. its SSH terminal plus an HTTPS URL Connection to its management
// interface. Mirrors RackItemBindingsDialog's multi-select pattern.

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Actions, Btn, DialogShell, Sheet } from "../../app/ui/dialog";
import { invokeCommand, isTauriRuntime } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import type { Connection, SiteHost } from "../../types";
import { flattenConnections } from "../workspace/connections/treeUtils";
import { useItOpsStore } from "./state";

export function HostBindingsDialog({
  siteId,
  host,
  onClose,
}: {
  siteId: string;
  host: SiteHost;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);
  const updateHost = useItOpsStore((state) => state.updateHost);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selected, setSelected] = useState(() => new Set(host.connectionIds));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    // A Site can reference Connections from any Workspace, so Host bindings
    // must use the full tree rather than the active Workspace's sidebar tree.
    void invokeCommand("list_connection_tree")
      .then((tree) => setConnections(flattenConnections(tree)))
      .catch(() => setConnections([]));
  }, []);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function save() {
    setBusy(true);
    try {
      await updateHost(siteId, host.id, {
        hostname: host.hostname,
        label: host.label,
        kind: host.kind,
        parentHostId: host.parentHostId ?? null,
        connectionIds: [...selected],
        notes: host.notes,
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatusBarNotice(t("itops.errorNotice", { message }), { tone: "error" });
      setBusy(false);
    }
  }

  return (
    <DialogShell onBackdrop={onClose} zClassName="itops-page">
      <Sheet
        width={560}
        title={t("itops.hosts.bindingsTitle")}
        ariaLabel={t("itops.hosts.bindingsTitle")}
        footer={
          <Actions
            cancel={<Btn onClick={onClose}>{t("itops.actions.cancel")}</Btn>}
            primary={
              <Btn kind="primary" disabled={busy} onClick={() => void save()}>
                {t("itops.actions.save")}
              </Btn>
            }
          />
        }
      >
        <p className="hg-dlg-help">{t("itops.hosts.bindingsHint")}</p>
        <div className="connection-binding-list standalone">
          {connections.length === 0 ? (
            <div className="hg-dlg-empty">{t("itops.sites.noConnections")}</div>
          ) : (
            connections.map((connection) => (
              <label className="connection-binding-row" key={connection.id}>
                <input
                  type="checkbox"
                  checked={selected.has(connection.id)}
                  onChange={() => toggle(connection.id)}
                />
                <span>{connection.name}</span>
                <small>{connection.host}</small>
              </label>
            ))
          )}
        </div>
      </Sheet>
    </DialogShell>
  );
}
