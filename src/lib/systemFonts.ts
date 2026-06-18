// System font enumeration + cache.
//
// The font picker in Settings can pull the OS-installed font families through
// the Chromium Local Font Access API (`window.queryLocalFonts`), which is
// available inside the WebView2 runtime after a user gesture. The result is
// cached in localStorage so the long list survives an app relaunch without
// re-prompting; a refresh action re-queries and overwrites the cache.

const SYSTEM_FONTS_STORAGE_KEY = "kkterm.systemFonts";

interface LocalFontData {
  family?: string;
}

interface QueryLocalFontsWindow {
  queryLocalFonts?: () => Promise<LocalFontData[]>;
}

/** Whether the running WebView can enumerate OS fonts. */
export function isSystemFontAccessSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as QueryLocalFontsWindow).queryLocalFonts === "function"
  );
}

/** Read the previously cached system font families (empty when never refreshed). */
export function loadCachedSystemFonts(): string[] {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(SYSTEM_FONTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

/**
 * Query the OS for installed font families, cache them, and return the sorted
 * unique list. Throws when the runtime cannot enumerate fonts so callers can
 * surface a localized notice.
 */
export async function refreshSystemFonts(): Promise<string[]> {
  const queryLocalFonts = (window as QueryLocalFontsWindow).queryLocalFonts;
  if (typeof queryLocalFonts !== "function") {
    throw new Error("System font access is not supported in this runtime.");
  }

  const fonts = await queryLocalFonts();
  const families = new Set<string>();
  for (const font of fonts) {
    const family = font.family?.trim();
    if (family) {
      families.add(family);
    }
  }

  const list = [...families].sort((a, b) => a.localeCompare(b));
  try {
    localStorage.setItem(SYSTEM_FONTS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore quota/serialization failures: the in-memory list is still usable.
  }
  return list;
}

/**
 * Filter detected system fonts down to families not already represented by the
 * curated list or the user's dropped-in custom fonts. Matching is
 * case-insensitive on the family name so a curated entry hides its system twin.
 */
export function systemFontsExcluding(systemFonts: string[], exclude: Iterable<string>): string[] {
  const excluded = new Set<string>();
  for (const name of exclude) {
    const normalized = name.trim().toLowerCase();
    if (normalized) {
      excluded.add(normalized);
    }
  }
  return systemFonts.filter((font) => !excluded.has(font.trim().toLowerCase()));
}
