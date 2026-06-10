import type { Connection } from "../../../types";
import { connectionSubtitle, type LocalShellOption } from "./utils";

export const QUICK_CONNECT_RECENT_LABEL_MAX_LENGTH = 40;

export function truncateQuickConnectRecentLabel(label: string): string {
  if (label.length <= QUICK_CONNECT_RECENT_LABEL_MAX_LENGTH) {
    return label;
  }
  return `${label.slice(0, QUICK_CONNECT_RECENT_LABEL_MAX_LENGTH - 3)}...`;
}

export function quickConnectRecentLabel(connection: Connection): string {
  return truncateQuickConnectRecentLabel(`${connection.name} - ${connectionSubtitle(connection)}`);
}

const DEFAULT_SSH_PORT = 22;

// Decides whether a Quick Connect target should reuse an existing saved
// connection instead of creating a new one. SSH matches by host+user+port;
// local shells match by shell. All other types always create.
export function findMatchingConnection(
  connections: Connection[],
  candidate: Connection,
): Connection | undefined {
  if (candidate.type === "ssh") {
    const port = candidate.port ?? DEFAULT_SSH_PORT;
    return connections.find(
      (c) =>
        c.type === "ssh" &&
        c.host === candidate.host &&
        (c.user ?? "") === (candidate.user ?? "") &&
        (c.port ?? DEFAULT_SSH_PORT) === port,
    );
  }
  if (candidate.type === "local") {
    return connections.find(
      (c) => c.type === "local" && (c.localShell ?? "") === (candidate.localShell ?? ""),
    );
  }
  return undefined;
}

export type ElevatedLocalShellAction =
  | { mode: "embedded"; name: string; shell: string }
  | { mode: "external"; shell: string };

export function elevatedLocalShellAction({
  adminLabel,
  isAppElevated,
  option,
}: {
  adminLabel: string;
  isAppElevated: boolean;
  option: LocalShellOption;
}): ElevatedLocalShellAction {
  const shell = option.value ?? "powershell.exe";
  if (!isAppElevated) {
    return { mode: "external", shell };
  }

  return {
    mode: "embedded",
    name: `${option.label} (${adminLabel})`,
    shell,
  };
}
