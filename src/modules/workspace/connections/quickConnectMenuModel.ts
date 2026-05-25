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
