// Persisted layout for the Git Browser overlay: the window size, the widths of
// the three resizable inline panes (sidebar, the History detail pane, and the
// Commit working-tree pane), and the History commit-pane column widths. State is
// stored under a single localStorage key so the chosen layout survives reopening,
// mirroring the prefixed-key convention in `src/store.ts`. Each setter clamps to
// sane bounds and re-persists.
import { useCallback, useState } from "react";

const STORAGE_KEY = "kkterm.git.layout";

export interface GitLayout {
  /** Overlay window size in px. */
  width: number;
  height: number;
  /** Sidebar pane width (shared by both views). */
  sidebarW: number;
  /** History view: right-hand detail pane width. */
  detailW: number;
  /** Commit view: working-tree pane width. */
  worktreeW: number;
  /** History commit pane: Author column width. */
  authorW: number;
  /** History commit pane: SHA column width. */
  shaW: number;
  /** History commit pane: When (date) column width. */
  dateW: number;
}

const DEFAULT_LAYOUT: GitLayout = {
  width: 1472,
  height: 880,
  sidebarW: 232,
  detailW: 430,
  worktreeW: 380,
  authorW: 150,
  shaW: 78,
  dateW: 96,
};

// Per-field bounds; the window is additionally clamped to the viewport at render.
const BOUNDS = {
  width: [720, 100000] as const,
  height: [480, 100000] as const,
  sidebarW: [180, 520] as const,
  detailW: [280, 820] as const,
  worktreeW: [240, 720] as const,
  authorW: [90, 320] as const,
  shaW: [56, 160] as const,
  dateW: [70, 220] as const,
};

function clampField(field: keyof GitLayout, value: number): number {
  const [min, max] = BOUNDS[field];
  return Math.round(Math.min(Math.max(value, min), max));
}

function load(): GitLayout {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_LAYOUT;
    }
    const parsed = JSON.parse(raw) as Partial<GitLayout>;
    return {
      width: clampField("width", parsed.width ?? DEFAULT_LAYOUT.width),
      height: clampField("height", parsed.height ?? DEFAULT_LAYOUT.height),
      sidebarW: clampField("sidebarW", parsed.sidebarW ?? DEFAULT_LAYOUT.sidebarW),
      detailW: clampField("detailW", parsed.detailW ?? DEFAULT_LAYOUT.detailW),
      worktreeW: clampField("worktreeW", parsed.worktreeW ?? DEFAULT_LAYOUT.worktreeW),
      authorW: clampField("authorW", parsed.authorW ?? DEFAULT_LAYOUT.authorW),
      shaW: clampField("shaW", parsed.shaW ?? DEFAULT_LAYOUT.shaW),
      dateW: clampField("dateW", parsed.dateW ?? DEFAULT_LAYOUT.dateW),
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function persist(layout: GitLayout) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Storage may be unavailable (private mode); layout just won't persist.
  }
}

export interface GitLayoutControls {
  layout: GitLayout;
  /** Apply a clamped delta to one field (used by drag handles). */
  nudge: (field: keyof GitLayout, delta: number) => void;
  /** Apply clamped deltas to width and height together (window corner grip). */
  nudgeWindow: (dx: number, dy: number) => void;
  /** Restore default layout. */
  reset: () => void;
}

export function useGitLayout(): GitLayoutControls {
  const [layout, setLayout] = useState<GitLayout>(load);

  const nudge = useCallback((field: keyof GitLayout, delta: number) => {
    setLayout((prev) => {
      const next = { ...prev, [field]: clampField(field, prev[field] + delta) };
      persist(next);
      return next;
    });
  }, []);

  const nudgeWindow = useCallback((dx: number, dy: number) => {
    setLayout((prev) => {
      const next = {
        ...prev,
        width: clampField("width", prev.width + dx),
        height: clampField("height", prev.height + dy),
      };
      persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    persist(DEFAULT_LAYOUT);
  }, []);

  return { layout, nudge, nudgeWindow, reset };
}
