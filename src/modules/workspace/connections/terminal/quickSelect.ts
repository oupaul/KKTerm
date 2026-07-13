// Quick Select mode (WezTerm-style): scan the visible terminal screen for
// copyable tokens — URLs, paths, IPs, git hashes, UUIDs — and overlay short
// hint labels so one can be copied entirely from the keyboard. Pure logic
// lives here so it stays testable outside the renderer.

export interface QuickSelectMatch {
  /** Viewport-relative row (0-based). */
  row: number;
  /** Column of the first character (0-based). */
  column: number;
  text: string;
}

export interface LabeledQuickSelectMatch extends QuickSelectMatch {
  label: string;
}

export type QuickSelectPointerAction =
  | { kind: "copy" }
  | { kind: "open"; url: string };

// Ordered by specificity: an earlier pattern claims its span before a more
// general one (e.g. a URL wins over the bare IP inside it).
const QUICK_SELECT_PATTERNS: readonly RegExp[] = [
  // URLs
  /https?:\/\/[^\s'"<>()[\]{}]+/g,
  // UUIDs
  /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
  // MAC addresses
  /\b[0-9a-fA-F]{2}(?::[0-9a-fA-F]{2}){5}\b/g,
  // IPv4, optionally with :port
  /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/g,
  // Email addresses
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
  // git SHAs (7-40 hex chars); requires at least one digit so ordinary words
  // like "deadbeef"-free English text rarely matches.
  /\b(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b/g,
  // Windows paths
  /\b[A-Za-z]:\\[^\s'"<>|:*?]+/g,
  // Unix absolute or home-relative paths with at least two segments
  /(?:~|\.{1,2})?\/[\w.@%+-]+(?:\/[\w.@%+-]+)+\/?/g,
];

const HINT_ALPHABET = "asdfghjklqwertyuiopzxcvbnm";

/** Two-character labels: aa, as, ad… stable and typeable from the home row. */
export function quickSelectLabels(count: number): string[] {
  const labels: string[] = [];
  outer: for (const first of HINT_ALPHABET) {
    for (const second of HINT_ALPHABET) {
      if (labels.length >= count) {
        break outer;
      }
      labels.push(`${first}${second}`);
    }
  }
  return labels;
}

export const MAX_QUICK_SELECT_MATCHES = HINT_ALPHABET.length * HINT_ALPHABET.length;

/**
 * Scan viewport lines for quick-select tokens. Overlapping matches on the same
 * line are resolved in pattern-priority order; matches are returned bottom-up
 * (most recent output first) which also decides label assignment order.
 */
export function findQuickSelectMatches(lines: readonly string[]): QuickSelectMatch[] {
  const matches: QuickSelectMatch[] = [];
  for (let row = 0; row < lines.length; row += 1) {
    const line = lines[row];
    if (!line) {
      continue;
    }
    const claimed: Array<{ start: number; end: number }> = [];
    for (const pattern of QUICK_SELECT_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of line.matchAll(pattern)) {
        const start = match.index ?? 0;
        const end = start + match[0].length;
        if (claimed.some((span) => start < span.end && end > span.start)) {
          continue;
        }
        claimed.push({ start, end });
        matches.push({ row, column: start, text: match[0] });
      }
    }
  }
  matches.sort((a, b) => (a.row === b.row ? a.column - b.column : b.row - a.row));
  return matches.slice(0, MAX_QUICK_SELECT_MATCHES);
}

export function labelQuickSelectMatches(matches: readonly QuickSelectMatch[]): LabeledQuickSelectMatch[] {
  const labels = quickSelectLabels(matches.length);
  return matches.map((match, index) => ({ ...match, label: labels[index] }));
}

export function quickSelectPointerAction(text: string, openModifier: boolean): QuickSelectPointerAction {
  if (!openModifier) {
    return { kind: "copy" };
  }
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:"
      ? { kind: "open", url: url.href }
      : { kind: "copy" };
  } catch {
    return { kind: "copy" };
  }
}
