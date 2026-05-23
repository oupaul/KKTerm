import type { Connection } from "../../../types";
import { connectionSubtitle } from "./ConnectionGlyph";

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
