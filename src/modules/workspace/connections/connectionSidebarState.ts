import type { ConnectionType } from "../../../types";

const RECENT_CONNECTION_STORAGE_KEY = "kkterm.recentConnectionIds";
const COLLAPSED_FOLDER_IDS_KEY = "kkterm.collapsedFolderIds";
export const NEW_CONNECTION_REQUEST_EVENT = "kkterm:new-connection-request";

export type NewConnectionRequestDetail = {
  connectionType: ConnectionType;
};

export const RECENT_CONNECTION_LIMIT = 50;

export function createStoredSecretMask() {
  const maskLength = 12 + Math.floor(Math.random() * 5);
  return "*".repeat(maskLength);
}

export function loadRecentConnectionIds() {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const storedIds = JSON.parse(localStorage.getItem(RECENT_CONNECTION_STORAGE_KEY) ?? "[]");
    return Array.isArray(storedIds)
      ? storedIds.filter((connectionId): connectionId is string => typeof connectionId === "string")
      : [];
  } catch {
    return [];
  }
}

export function saveRecentConnectionIds(connectionIds: string[]) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(
    RECENT_CONNECTION_STORAGE_KEY,
    JSON.stringify(connectionIds.slice(0, RECENT_CONNECTION_LIMIT)),
  );
}

export function loadCollapsedFolderIds(): Set<string> {
  if (typeof localStorage === "undefined") {
    return new Set();
  }
  try {
    const stored = JSON.parse(localStorage.getItem(COLLAPSED_FOLDER_IDS_KEY) ?? "[]");
    return new Set(
      Array.isArray(stored)
        ? stored.filter((id): id is string => typeof id === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

export function saveCollapsedFolderIds(ids: Set<string>) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(COLLAPSED_FOLDER_IDS_KEY, JSON.stringify([...ids]));
}

export function notifyConnectionTreeInvalidated() {
  window.dispatchEvent(new CustomEvent("kkterm:connection-tree-invalidated"));
}

export function requestNewConnection(connectionType: ConnectionType) {
  window.dispatchEvent(
    new CustomEvent<NewConnectionRequestDetail>(NEW_CONNECTION_REQUEST_EVENT, {
      detail: { connectionType },
    }),
  );
}
