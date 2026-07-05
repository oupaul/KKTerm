import { Cable, FileText, FolderInput, FolderOpen, Globe2, Laptop, Monitor, Mouse, Network, Server } from "../../../lib/reicon";
import { confirmNativeDialog, invokeCommand, type SshHostKeyPreview } from "../../../lib/tauri";
import i18next from "../../../i18n/config";
import type { Connection, ConnectionType, SshSettings, TerminalCustomShell, WorkspaceTab } from "../../../types";
import { defaultLocalShell, isWindowsPlatform } from "../../../lib/platform";
import { isWslShell, wslShellSelectorValue } from "./connection-dialog/wslLocalShell";

const WINDOWS_LOCAL_SHELL_OPTIONS = [
  { labelKey: "settings.powerShell", value: "powershell.exe" },
  { labelKey: "settings.powerShell7", value: "pwsh.exe" },
  { labelKey: "settings.commandPrompt", value: "cmd.exe" },
  { labelKey: "settings.wsl", value: "wsl.exe" },
];

export type LocalShellOption = {
  canElevate?: boolean;
  label: string;
  value?: string;
};

export function localShellOptionsForPlatform(customShells?: TerminalCustomShell[]): LocalShellOption[] {
  const customOptions =
    customShells
      ?.filter((shell) => shell.name.trim() && shell.commandLine.trim())
      .map((shell) => ({
        label: shell.name.trim(),
        value: shell.commandLine.trim(),
      })) ?? [];

  if (!isWindowsPlatform()) {
    return [{ label: i18next.t("workspace.terminal"), value: defaultLocalShell() }, ...customOptions];
  }

  return [
    { canElevate: true, label: i18next.t("settings.commandPrompt"), value: "cmd.exe" },
    ...WINDOWS_LOCAL_SHELL_OPTIONS.filter((option) => option.value !== "cmd.exe").map((option) => ({
      label: i18next.t(option.labelKey),
      value: option.value,
      canElevate: option.value === "powershell.exe" || option.value === "pwsh.exe",
    })),
    ...customOptions,
  ];
}

export function resolveAvailableLocalShell(shell: string | undefined, options: LocalShellOption[]) {
  const fallback = options[0]?.value ?? defaultLocalShell();
  const requested = shell?.trim();
  if (!requested) {
    return fallback;
  }
  if (
    isWslShell(requested) &&
    options.some((option) => (option.value ?? "") === wslShellSelectorValue(requested))
  ) {
    return requested;
  }
  return options.some((option) => (option.value ?? "") === requested) ? requested : fallback;
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
  if (type === "ftp") {
    return 21;
  }
  return sshSettings.defaultPort;
}

export function ftpPortForProtocolSelection(
  protocol: string,
  currentPort: string,
  tlsMode = "explicit",
) {
  const trimmedPort = currentPort.trim();
  if (trimmedPort && trimmedPort !== "21") {
    return Number(trimmedPort);
  }
  if (protocol === "sftp") {
    return 22;
  }
  if (protocol === "ftps" && tlsMode === "implicit") {
    return 990;
  }
  return 21;
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
    case "ftp":
      return i18next.t("connections.ftp");
    case "localFiles":
      return i18next.t("connections.localFiles");
    case "fileView":
      return i18next.t("connections.fileView");
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

export function connectionToolbarTitle(connection: Connection) {
  if (connection.type === "url") {
    return connection.name;
  }
  if (connection.type === "serial") {
    return connection.serialLine?.trim() || connection.host || connection.name;
  }
  if (connection.type === "local") {
    return localTerminalToolbarTitle(connection);
  }
  if (connection.type === "localFiles") {
    return connection.name;
  }
  if (connection.type === "fileView") {
    return connection.name;
  }
  return connection.port ? `${connection.host}:${connection.port}` : connection.host;
}

function localTerminalToolbarTitle(connection: Connection) {
  return connection.name;
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
    case "ftp":
      return FolderInput;
    case "localFiles":
      return FolderOpen;
    case "fileView":
      return FileText;
  }
}

export function connectionTypeForTab(tab: WorkspaceTab): {
  type: ConnectionType;
  iconColor?: string | null;
  iconDataUrl?: string | null;
  iconBackgroundColor?: string | null;
  localShell?: string;
} {
  if (tab.kind === "sftp") {
    return { type: "ftp" };
  }
  if (tab.connection) {
    return {
      type: tab.connection.type,
      iconColor: tab.connection.iconColor,
      iconDataUrl: tab.connection.iconDataUrl,
      iconBackgroundColor: tab.connection.iconBackgroundColor,
      localShell: tab.connection.localShell,
    };
  }
  return { type: "local" };
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
      Boolean(connection.passwordCredentialId) ||
      connection.authMethod === "password" ||
      connection.authMethod === "agent") &&
    !connection.proxyJump?.trim()
  );
}

export function connectionPasswordOwnerId(connection: Connection) {
  return connection.passwordCredentialId || connection.id;
}

export function connectionSshSocksProxyPasswordOwnerId(connection: Pick<Connection, "id">) {
  return connection.id;
}

export type SshSocksProxyRequestFields = {
  sshSocksProxy?: string;
  sshSocksProxyUsername?: string;
  sshSocksProxySecretOwnerId?: string;
};

/**
 * Resolve the per-Connection SOCKS proxy override for an SSH Connection launch.
 * A Connection that opted out of inheriting defaults provides its own endpoint;
 * otherwise this returns `undefined` and the backend applies the global app
 * proxy (Settings → Proxy) as the fallback.
 */
export function resolveSshSocksProxy(
  connection: Pick<Connection, "sshSocksProxy" | "sshSocksProxyInheritDefaults">,
): string | undefined {
  if (connection.sshSocksProxyInheritDefaults === false) {
    const trimmed = connection.sshSocksProxy?.trim();
    return trimmed ? trimmed : undefined;
  }
  return undefined;
}

/**
 * Resolve the effective SSH transport compression for a launch: the
 * per-Connection override when set, otherwise the global SSH default. Returns
 * `true` when zlib compression (russh's fast level, i.e. `ssh -XC`) should be
 * negotiated.
 */
export function resolveSshCompression(
  connection: Pick<Connection, "sshCompression">,
  sshSettings: Pick<SshSettings, "defaultSshCompression">,
): boolean {
  const mode = connection.sshCompression ?? sshSettings.defaultSshCompression ?? "fast";
  return mode === "fast";
}

export function resolveSshSocksProxyRequest(
  connection: Pick<Connection, "id" | "sshSocksProxy" | "sshSocksProxyUsername" | "sshSocksProxyInheritDefaults">,
): SshSocksProxyRequestFields {
  const proxy = resolveSshSocksProxy(connection);
  if (!proxy) {
    // No per-Connection override: the backend applies the global app proxy.
    return {};
  }

  const username = connection.sshSocksProxyUsername?.trim();
  if (!username) {
    return { sshSocksProxy: proxy };
  }

  return {
    sshSocksProxy: proxy,
    sshSocksProxyUsername: username,
    sshSocksProxySecretOwnerId: connectionSshSocksProxyPasswordOwnerId(connection),
  };
}

export async function confirmTrustedSshHostKey(preview: SshHostKeyPreview) {
  if (preview.status === "trusted") {
    return;
  }

  if (preview.status === "changed") {
    const shouldReplace = await confirmNativeDialog(
      i18next.t("terminal.replaceChangedHostKeyWarning", {
        host: `${preview.host}:${preview.port}`,
        algorithm: preview.algorithm,
        fingerprint: preview.fingerprint,
      }),
      {
        kind: "warning",
        title: i18next.t("terminal.replaceChangedHostKeyTitle"),
      },
    );
    if (shouldReplace !== true) {
      throw new Error(i18next.t("terminal.hostKeyNotTrusted"));
    }

    await invokeCommand("trust_ssh_host_key", {
      request: {
        host: preview.host,
        port: preview.port,
        publicKey: preview.publicKey,
        replace: true,
      },
    });
    return;
  }

  const shouldTrust = await confirmNativeDialog(
    `${preview.host}:${preview.port}\n\n${preview.algorithm} ${preview.fingerprint}`,
    {
      kind: "warning",
      title: i18next.t("terminal.trustHostKey"),
    },
  );
  if (shouldTrust !== true) {
    throw new Error(i18next.t("terminal.hostKeyNotTrusted"));
  }

  await invokeCommand("trust_ssh_host_key", {
    request: {
      host: preview.host,
      port: preview.port,
      publicKey: preview.publicKey,
    },
  });
}
