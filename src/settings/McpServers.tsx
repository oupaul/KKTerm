import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  describeMcpError,
  invokeCommand,
  type McpServer,
} from "../lib/tauri";
import { AddMcpServerDialog } from "./AddMcpServerDialog";
import { McpDeleteConfirmDialog } from "./McpDeleteConfirmDialog";

export function McpServersControl() {
  const { t } = useTranslation();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<McpServer | null>(null);

  async function refresh() {
    try {
      const list = await invokeCommand("mcp_list_servers", undefined);
      setServers(list);
      setLoadError(null);
    } catch (error) {
      setLoadError(describeMcpError(error));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleRefreshTools(id: string) {
    setBusyId(id);
    try {
      const updated = await invokeCommand("mcp_refresh_tools", { id });
      setServers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (error) {
      setServers((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, lastStatus: s.lastStatus, lastError: describeMcpError(error) }
            : s,
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function performDelete(server: McpServer) {
    setBusyId(server.id);
    try {
      await invokeCommand("mcp_delete_server", { id: server.id });
      setServers((prev) => prev.filter((s) => s.id !== server.id));
    } catch (error) {
      setLoadError(describeMcpError(error));
    } finally {
      setBusyId(null);
      setPendingDelete(null);
    }
  }

  return (
    <fieldset className="settings-subsection settings-fieldset">
      <legend>{t("settings.mcpServersTitle")}</legend>
      <div>
        <p className="field-hint">{t("settings.mcpServersHint")}</p>
      </div>
      {loadError && <div className="settings-error">{loadError}</div>}
      <div className="mcp-servers-list">
        {servers.length === 0 ? (
          <p className="field-hint">{t("settings.mcpServersEmpty")}</p>
        ) : (
          servers.map((server) => (
            <McpServerRow
              busy={busyId === server.id}
              key={server.id}
              onDelete={() => setPendingDelete(server)}
              onRefresh={() => void handleRefreshTools(server.id)}
              server={server}
            />
          ))
        )}
      </div>
      <div className="settings-actions">
        <button
          className="toolbar-button"
          onClick={() => setAddOpen(true)}
          type="button"
        >
          <Plus size={15} />
          {t("settings.mcpAddServer")}
        </button>
      </div>
      {addOpen && (
        <AddMcpServerDialog
          onClose={() => setAddOpen(false)}
          onCreated={(server) => {
            setServers((prev) => [...prev, server]);
            setAddOpen(false);
            void handleRefreshTools(server.id);
          }}
        />
      )}
      {pendingDelete && (
        <McpDeleteConfirmDialog
          name={pendingDelete.name}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void performDelete(pendingDelete)}
        />
      )}
    </fieldset>
  );
}

function McpServerRow({
  busy,
  onDelete,
  onRefresh,
  server,
}: {
  busy: boolean;
  onDelete: () => void;
  onRefresh: () => void;
  server: McpServer;
}) {
  const { t } = useTranslation();
  const toolCount = extractToolCount(server.tools);
  return (
    <div className="mcp-server-row">
      <div className="mcp-server-row-main">
        <div className="mcp-server-row-name">{server.name}</div>
        <div className="mcp-server-row-url">{server.url}</div>
        <div className="mcp-server-row-meta">
          <StatusBadge status={server.lastStatus} />
          {toolCount !== null && (
            <span className="mcp-server-tools-count">
              {t("settings.mcpToolsCount", { count: toolCount })}
            </span>
          )}
          {server.hasSecret && (
            <span className="mcp-server-auth-badge">{t("settings.mcpAuthBadge")}</span>
          )}
        </div>
        {server.lastError && (
          <div className="mcp-server-row-error">{server.lastError}</div>
        )}
      </div>
      <div className="mcp-server-row-actions">
        <button
          aria-label={t("settings.mcpRefreshTools")}
          className="icon-button"
          disabled={busy}
          onClick={onRefresh}
          title={t("settings.mcpRefreshTools")}
          type="button"
        >
          <RefreshCw size={14} />
        </button>
        <button
          aria-label={t("settings.mcpDeleteServer")}
          className="icon-button icon-button-danger"
          disabled={busy}
          onClick={onDelete}
          title={t("settings.mcpDeleteServer")}
          type="button"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: McpServer["lastStatus"] }) {
  const { t } = useTranslation();
  const tone =
    status === "ok"
      ? "ok"
      : status === "unreachable"
      ? "warn"
      : status === "auth_error"
      ? "warn"
      : status === "protocol_error"
      ? "warn"
      : "neutral";
  const label =
    status === "ok"
      ? t("settings.mcpStatusOk")
      : status === "unreachable"
      ? t("settings.mcpStatusUnreachable")
      : status === "auth_error"
      ? t("settings.mcpStatusAuthError")
      : status === "protocol_error"
      ? t("settings.mcpStatusProtocolError")
      : t("settings.mcpStatusUnknown");
  return <span className={`mcp-status-badge mcp-status-badge-${tone}`}>{label}</span>;
}

function extractToolCount(tools: unknown): number | null {
  if (!tools || typeof tools !== "object") return null;
  const list = (tools as { tools?: unknown }).tools;
  return Array.isArray(list) ? list.length : null;
}
