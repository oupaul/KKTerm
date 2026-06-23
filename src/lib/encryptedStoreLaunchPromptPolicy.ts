export type EncryptedStoreLaunchPromptPolicy =
  | "everyTime"
  | "oneHour"
  | "fourHours"
  | "twentyFourHours"
  | "never";

const LAST_UNLOCK_STORAGE_KEY = "kkterm:encrypted-store:last-unlock-at";

const policyIntervalsMs: Partial<Record<EncryptedStoreLaunchPromptPolicy, number>> = {
  oneHour: 60 * 60 * 1000,
  fourHours: 4 * 60 * 60 * 1000,
  twentyFourHours: 24 * 60 * 60 * 1000,
};

export function shouldPromptForEncryptedStoreOnLaunch({
  policy,
  lastUnlockAt,
  launchedAt,
}: {
  policy: EncryptedStoreLaunchPromptPolicy;
  lastUnlockAt?: number;
  launchedAt: number;
}) {
  if (policy === "never") {
    return false;
  }
  if (policy === "everyTime") {
    return true;
  }
  if (!lastUnlockAt) {
    return true;
  }
  const intervalMs = policyIntervalsMs[policy];
  return typeof intervalMs === "number" && launchedAt - lastUnlockAt >= intervalMs;
}

export function readLastEncryptedStoreUnlockAt() {
  if (typeof window === "undefined") {
    return undefined;
  }
  const value = window.localStorage.getItem(LAST_UNLOCK_STORAGE_KEY);
  if (!value) {
    return undefined;
  }
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : undefined;
}

export function recordEncryptedStoreUnlockAt(timestamp = Date.now()) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LAST_UNLOCK_STORAGE_KEY, String(timestamp));
}
