import { Cable, Mouse, Columns2, Globe2, Laptop, Monitor, Network, Server, Terminal } from "lucide-react";
import { invokeCommand, type SshHostKeyPreview } from "../lib/tauri";
import i18next from "../i18n/config";
import type { Connection, ConnectionType, SshSettings, WorkspaceTab } from "../types";

const WINDOWS_LOCAL_SHELL_OPTIONS = [
  { label: "PowerShell", value: "powershell.exe" },
  { label: "Command Prompt", value: "cmd.exe" },
  { label: "WSL", value: "wsl.exe" },
];

export type LocalShellOption = {
  canElevate?: boolean;
  label: string;
  value?: string;
};

function isWindowsPlatform() {
  if (typeof navigator === "undefined") {
    return true;
  }

  return /windows/i.test(`${navigator.userAgent} ${navigator.platform}`);
}

export function localShellOptionsForPlatform(): LocalShellOption[] {
  if (!isWindowsPlatform()) {
    return [{ label: "Terminal" }];
  }

  return [
    { canElevate: true, label: "Command Prompt", value: "cmd.exe" },
    ...WINDOWS_LOCAL_SHELL_OPTIONS.filter((option) => option.value !== "cmd.exe").map((option) => ({
      ...option,
      canElevate: option.value === "powershell.exe",
    })),
  ];
}

export function uniqueRuntimeId(prefix: string) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomId}`;
}

export function isRemoteDesktopConnectionType(type: ConnectionType) {
  return type === "rdp" || type === "vnc";
}

export function defaultPortForConnectionType(type: ConnectionType, sshSettings: SshSettings) {
  if (type === "rdp") {
    return 3389;
  }
  if (type === "vnc") {
    return 5900;
  }
  if (type === "telnet") {
    return 23;
  }
  return sshSettings.defaultPort;
}

export function connectionTypeLabel(type: ConnectionType) {
  switch (type) {
    case "local":
      return i18next.t("connections.localTerminal");
    case "ssh":
      return i18next.t("connections.sshTerminal");
    case "telnet":
      return i18next.t("connections.telnet");
    case "serial":
      return i18next.t("connections.serial");
    case "url":
      return i18next.t("connections.url");
    case "rdp":
      return i18next.t("connections.rdp");
    case "vnc":
      return i18next.t("connections.vnc");
  }
}

export function connectionSubtitle(connection: Connection) {
  if (connection.type === "local") {
    return connection.host;
  }
  if (connection.type === "url") {
    return connection.url ?? connection.host;
  }
  if (connection.type === "serial") {
    return `${connection.serialLine ?? connection.host} @ ${connection.serialSpeed ?? 9600}`;
  }
  const address = connection.port ? `${connection.host}:${connection.port}` : connection.host;
  if (connection.user) {
    return `${connection.user}@${address}`;
  }
  return address;
}

export function connectionIconForType(type: ConnectionType) {
  switch (type) {
    case "local":
      return Laptop;
    case "url":
      return Globe2;
    case "rdp":
      return Monitor;
    case "vnc":
      return Mouse;
    case "telnet":
      return Network;
    case "serial":
      return Cable;
    case "ssh":
      return Server;
  }
}

export function tabIconFor(tab: WorkspaceTab) {
  if (tab.kind === "sftp") {
    return Columns2;
  }
  if (tab.kind === "terminal") {
    const firstPane = tab.panes[0];
    if (firstPane?.kind === "webview") {
      return Globe2;
    }
    if (firstPane?.kind === "remoteDesktop") {
      return connectionIconForType(firstPane.connection.type);
    }
  }
  if (tab.kind === "webview") {
    return Globe2;
  }
  if (tab.kind === "remoteDesktop") {
    return connectionIconForType(tab.connection?.type ?? "rdp");
  }
  return Terminal;
}

export function workspaceKindLabel(tab: WorkspaceTab) {
  switch (tab.kind) {
    case "sftp":
      return i18next.t("workspace.sftpBrowser");
    case "webview":
      return i18next.t("workspace.webview");
    case "remoteDesktop":
      return i18next.t("workspace.connectionKind", {
        type: connectionTypeLabel(tab.connection?.type ?? "rdp"),
      });
    case "terminal":
      if (tab.panes.length > 1) {
        return i18next.t("workspace.workspace");
      }
      if (tab.panes[0]?.kind === "webview") {
        return i18next.t("workspace.webview");
      }
      if (tab.panes[0]?.kind === "remoteDesktop") {
        return i18next.t("workspace.connectionKind", {
          type: connectionTypeLabel(tab.panes[0].connection.type),
        });
      }
      return i18next.t("workspace.terminal");
  }
}

export function usesNativeSshHostKeyVerification(connection: Connection) {
  return (
    connection.type === "ssh" &&
    (Boolean(connection.keyPath?.trim()) ||
      Boolean(connection.hasPassword) ||
      connection.authMethod === "password" ||
      connection.authMethod === "agent") &&
    !connection.proxyJump?.trim()
  );
}

export async function confirmTrustedSshHostKey(preview: SshHostKeyPreview) {
  if (preview.status === "trusted") {
    return;
  }

  if (preview.status === "changed") {
    throw new Error(
      `SSH host key for ${preview.host}:${preview.port} changed. Presented ${preview.algorithm} ${preview.fingerprint}.`,
    );
  }

  const shouldTrust = window.confirm(
    [
      `Trust SSH host key for ${preview.host}:${preview.port}?`,
      "",
      `${preview.algorithm} ${preview.fingerprint}`,
    ].join("\n"),
  );
  if (!shouldTrust) {
    throw new Error("SSH host key was not trusted");
  }

  await invokeCommand("trust_ssh_host_key", {
    request: {
      host: preview.host,
      port: preview.port,
      publicKey: preview.publicKey,
    },
  });
}
