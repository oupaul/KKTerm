import { useEffect, useState } from "react";

const STORAGE_KEY = "kkterm:lastUpdateCheckAt";
const CHANGE_EVENT = "kkterm:last-update-check-changed";

export function readLastUpdateCheckAt(): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function recordUpdateCheckedNow(): void {
  if (typeof window === "undefined") {
    return;
  }
  const timestamp = Date.now();
  try {
    window.localStorage.setItem(STORAGE_KEY, String(timestamp));
  } catch {
    // localStorage may be unavailable (private mode, quota); the in-memory
    // notification below still lets the current session reflect the check.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: timestamp }));
}

export function useLastUpdateCheckAt(): number | null {
  const [timestamp, setTimestamp] = useState<number | null>(() =>
    readLastUpdateCheckAt(),
  );

  useEffect(() => {
    const handleChange = () => setTimestamp(readLastUpdateCheckAt());
    window.addEventListener(CHANGE_EVENT, handleChange);
    // Sync across windows/tabs that share localStorage.
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  return timestamp;
}
