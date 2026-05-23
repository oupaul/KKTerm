import { useEffect, useState } from "react";

export function readWidgetConfig<T>(
  storageKey: string,
  fallback: T,
  normalize: (value: unknown) => T,
) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? normalize(JSON.parse(raw)) : fallback;
  } catch {
    return fallback;
  }
}

export function useWidgetConfig<T>(
  storageKey: string,
  fallback: T,
  normalize: (value: unknown) => T,
) {
  const [config, setConfig] = useState(() => readWidgetConfig(storageKey, fallback, normalize));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(config));
    } catch {
      // Widget customization should keep working even if localStorage is unavailable.
    }
  }, [config, storageKey]);

  return [config, setConfig] as const;
}
