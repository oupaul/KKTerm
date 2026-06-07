import type { AiCliBackendKind, AiCliBackendStatus } from "../../lib/tauri";

export interface StoredAiCliBackendStatus {
  checkedAt: string;
  status: AiCliBackendStatus;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const AI_CLI_STATUS_STORAGE_PREFIX = "kkterm.settings.aiCliBackendStatus.v1";

function storageKey(provider: AiCliBackendKind) {
  return `${AI_CLI_STATUS_STORAGE_PREFIX}.${provider}`;
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function optionalString(value: unknown): string | null | undefined {
  return typeof value === "string" || value === null || value === undefined ? value : undefined;
}

function parseStoredStatus(
  provider: AiCliBackendKind,
  value: unknown,
): StoredAiCliBackendStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.checkedAt !== "string" || !record.status || typeof record.status !== "object") {
    return null;
  }
  const status = record.status as Record<string, unknown>;
  const version = optionalString(status.version);
  const error = optionalString(status.error);
  if (
    status.provider !== provider ||
    typeof status.command !== "string" ||
    typeof status.installed !== "boolean" ||
    typeof status.authenticated !== "boolean" ||
    version === undefined ||
    error === undefined
  ) {
    return null;
  }
  return {
    checkedAt: record.checkedAt,
    status: {
      provider,
      command: status.command,
      installed: status.installed,
      authenticated: status.authenticated,
      version,
      error,
    },
  };
}

export function readStoredAiCliBackendStatus(
  provider: AiCliBackendKind,
  storage: StorageLike | null = browserStorage(),
): StoredAiCliBackendStatus | null {
  if (!storage) return null;
  const raw = storage.getItem(storageKey(provider));
  if (!raw) return null;
  try {
    return parseStoredStatus(provider, JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStoredAiCliBackendStatus(
  provider: AiCliBackendKind,
  status: AiCliBackendStatus,
  checkedAt = new Date().toISOString(),
  storage: StorageLike | null = browserStorage(),
): StoredAiCliBackendStatus | null {
  if (!storage) return null;
  const stored: StoredAiCliBackendStatus = { checkedAt, status };
  storage.setItem(storageKey(provider), JSON.stringify(stored));
  return stored;
}
