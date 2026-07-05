import { ChevronDown, Download, Server, Terminal } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { technicalInputProps } from "../../../lib/inputBehavior";
import { ConnectionGlyph, ConnectionTypeGlyph, connectionSubtitle } from "./ConnectionGlyph";
import { uniqueRuntimeId, type LocalShellOption } from "./utils";
import type { Connection, ConnectionType, SshSettings } from "../../../types";

const QUICK_CONNECT_RECENT_PAGE_SIZE = 5;

export function QuickConnectMenu({
  recentConnections,
  shellOptions,
  sshSettings,
  onOpenConnection,
  onOpenElevatedShell,
  onOpenLocalShell,
  onOpenSsh,
}: {
  recentConnections: Connection[];
  shellOptions: LocalShellOption[];
  sshSettings: SshSettings;
  onOpenConnection: (connection: Connection) => void;
  onOpenElevatedShell: (option: LocalShellOption) => void;
  onOpenLocalShell: (option: LocalShellOption) => void;
  onOpenSsh: (connection: Connection) => void;
}) {
  const [sshDialogOpen, setSshDialogOpen] = useState(false);
  const [sshHost, setSshHost] = useState("");
  const [sshPort, setSshPort] = useState(String(sshSettings.defaultPort));
  const [visibleRecentCount, setVisibleRecentCount] = useState(QUICK_CONNECT_RECENT_PAGE_SIZE);
  const { t } = useTranslation();
  const normalizedSshPort = Number(sshPort || sshSettings.defaultPort);
  const canSubmitSsh =
    Boolean(sshHost.trim()) &&
    Number.isInteger(normalizedSshPort) &&
    normalizedSshPort >= 1 &&
    normalizedSshPort <= 65535;
  const visibleRecentConnections = recentConnections.slice(0, visibleRecentCount);
  const hasMoreRecentConnections = visibleRecentCount < recentConnections.length;
  const normalLabel = t("connections.normal");
  const adminLabel = t("connections.admin");

  function handleSshSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const host = sshHost.trim();
    if (!canSubmitSsh) {
      return;
    }

    onOpenSsh({
      id: uniqueRuntimeId("quick"),
      name: host,
      host,
      user: sshSettings.defaultUser,
      port: normalizedSshPort,
      authMethod: "agent",
      type: "ssh",
      useTmuxSessions: false,
      status: "idle",
    });
  }

  return (
    <div className="quick-connect-menu" role="dialog" aria-label={t("connections.quickConnectDialog")}>
      {sshDialogOpen ? (
        <form className="quick-connect-mini-dialog" onSubmit={handleSshSubmit}>
          <label>
            <span>{t("connections.hostname")}</span>
            <input
              autoFocus
              {...technicalInputProps}
              onChange={(event) => setSshHost(event.currentTarget.value)}
              placeholder={t("connections.exampleHost")}
              required
              value={sshHost}
            />
          </label>
          <label>
            <span>{t("connections.port")}</span>
            <input
              inputMode="numeric"
              max="65535"
              min="1"
              onChange={(event) => setSshPort(event.currentTarget.value)}
              placeholder={String(sshSettings.defaultPort)}
              type="number"
              value={sshPort}
            />
          </label>
          <div className="quick-connect-mini-actions">
            <button disabled={!canSubmitSsh} type="submit">
              {t("connections.connect")}
            </button>
            <button onClick={() => setSshDialogOpen(false)} type="button">
              {t("connections.cancel")}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setSshDialogOpen(true)} type="button">
          <Server size={15} />
          <span>{t("connections.ssh")}</span>
        </button>
      )}
      {shellOptions.flatMap((option) => {
        const optionKey = option.value ?? option.label;
        if (!option.canElevate) {
          return [
            <button
              key={optionKey}
              onClick={() => onOpenLocalShell(option)}
              type="button"
            >
              <Terminal size={15} />
              <span>{option.label}</span>
            </button>,
          ];
        }

        return [
          <button key={`${optionKey}-normal`} onClick={() => onOpenLocalShell(option)} type="button">
            <Terminal size={15} />
            <span>{`${option.label} (${normalLabel})`}</span>
          </button>,
          <button key={`${optionKey}-admin`} onClick={() => onOpenElevatedShell(option)} type="button">
            <Terminal size={15} />
            <span>{`${option.label} (${adminLabel})`}</span>
          </button>,
        ];
      })}
      <div className="quick-connect-menu-separator" aria-hidden="true" />
      {recentConnections.length > 0 ? (
        <>
          {visibleRecentConnections.map((connection) => (
            <button
              key={connection.id}
              onClick={() => onOpenConnection(connection)}
              type="button"
            >
              <ConnectionGlyph
                iconBackgroundColor={connection.iconBackgroundColor}
                iconColor={connection.iconColor}
                iconDataUrl={connection.iconDataUrl}
                localShell={connection.localShell}
                size={15}
                type={connection.type}
              />
              <span className="connection-main">
                <strong>{connection.name}</strong>
                <small>{connectionSubtitle(connection)}</small>
              </span>
              <span className={`status-dot ${connection.status}`} />
            </button>
          ))}
          {hasMoreRecentConnections ? (
            <button
              className="quick-connect-load-more"
              onClick={() => setVisibleRecentCount((count) => count + QUICK_CONNECT_RECENT_PAGE_SIZE)}
              type="button"
            >
              <ChevronDown size={13} />
              <span>{t("connections.loadMore")}</span>
            </button>
          ) : null}
        </>
      ) : (
        <button disabled type="button">
          <Server size={15} />
          <span>{t("connections.noRecent")}</span>
        </button>
      )}
    </div>
  );
}

export function AddConnectionMenu({
  onImportRequested,
  onSelectType,
}: {
  onImportRequested: () => void;
  onSelectType: (connectionType: ConnectionType) => void;
}) {
  const { t } = useTranslation();
  const connectionTypeOptions: Array<{
    type: ConnectionType;
    title: string;
  }> = [
    {
      type: "local",
      title: t("connections.localTerminal"),
    },
    {
      type: "ssh",
      title: t("connections.ssh"),
    },
    {
      type: "telnet",
      title: t("connections.telnet"),
    },
    {
      type: "serial",
      title: t("connections.serial"),
    },
    {
      type: "url",
      title: t("connections.url"),
    },
    {
      type: "rdp",
      title: t("connections.rdp"),
    },
    {
      type: "vnc",
      title: t("connections.vnc"),
    },
    {
      type: "ftp",
      title: t("connections.ftp"),
    },
    {
      type: "localFiles",
      title: t("connections.localFiles"),
    },
    {
      type: "fileView",
      title: t("connections.fileView"),
    },
  ];

  return (
    <div className="add-connection-menu" role="menu" aria-label={t("connections.addConnection")}>
      {connectionTypeOptions.map((option) => (
        <button key={option.type} onClick={() => onSelectType(option.type)} role="menuitem" type="button">
          <ConnectionTypeGlyph className="menu-item-icon" size={15} type={option.type} />
          <span className="connection-main">
            <strong>{option.title}</strong>
          </span>
        </button>
      ))}
      <div className="quick-connect-menu-separator" aria-hidden="true" />
      <button onClick={onImportRequested} role="menuitem" type="button">
        <Download className="menu-item-icon" size={15} />
        <span className="connection-main">
          <strong>{t("connections.import.tileTitle")}</strong>
        </span>
      </button>
    </div>
  );
}
