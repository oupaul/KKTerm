// Shared side-by-side diff renderer used by both the Git Browser's advanced diff
// viewer and the File Compare overlay. It owns the search box, all/diff/same mode
// toggle, prev/next change navigation, a content-proportional minimap, and the
// two-column virtualized-by-mode body. Callers supply the parsed diff lines plus
// left/right column labels; the surrounding chrome (title bar, close) is the
// caller's responsibility. Reuses the `git-adv-*` classes from git.css.
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Search, WrapText } from "lucide-react";
import type { GitDiffLine } from "../git/gitTypes";

type DiffSideKind = "ctx" | "add" | "del" | "blank";
type DiffViewMode = "all" | "diff" | "same";

interface SideBySideRow {
  id: string;
  kind: "line" | "hunk";
  oldNo: number | null;
  newNo: number | null;
  oldText: string;
  newText: string;
  oldKind: DiffSideKind;
  newKind: DiffSideKind;
  hunkText?: string;
}

interface ChangeMarker {
  rowIndex: number;
  top: number;
  kind: "add" | "del" | "mod";
}

function buildRows(lines: GitDiffLine[]): SideBySideRow[] {
  const rows: SideBySideRow[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.t === "hunk") {
      rows.push({
        id: `h${index}`,
        kind: "hunk",
        oldNo: null,
        newNo: null,
        oldText: "",
        newText: "",
        oldKind: "blank",
        newKind: "blank",
        hunkText: line.c,
      });
      index += 1;
      continue;
    }
    if (line.t === "ctx") {
      rows.push({
        id: `c${index}`,
        kind: "line",
        oldNo: line.o,
        newNo: line.n,
        oldText: line.c,
        newText: line.c,
        oldKind: "ctx",
        newKind: "ctx",
      });
      index += 1;
      continue;
    }

    const deleted: GitDiffLine[] = [];
    const added: GitDiffLine[] = [];
    while (index < lines.length && (lines[index].t === "del" || lines[index].t === "add")) {
      const changed = lines[index];
      if (changed.t === "del") {
        deleted.push(changed);
      } else {
        added.push(changed);
      }
      index += 1;
    }

    const count = Math.max(deleted.length, added.length);
    for (let offset = 0; offset < count; offset += 1) {
      const oldLine = deleted[offset] ?? null;
      const newLine = added[offset] ?? null;
      rows.push({
        id: `d${index}-${offset}`,
        kind: "line",
        oldNo: oldLine?.o ?? null,
        newNo: newLine?.n ?? null,
        oldText: oldLine?.c ?? "",
        newText: newLine?.c ?? "",
        oldKind: oldLine ? "del" : "blank",
        newKind: newLine ? "add" : "blank",
      });
    }
  }
  return rows;
}

function includesQuery(row: SideBySideRow, query: string) {
  if (!query) {
    return false;
  }
  const haystack = `${row.oldText}\n${row.newText}\n${row.hunkText ?? ""}`.toLowerCase();
  return haystack.includes(query);
}

function cellClass(kind: DiffSideKind, activeSearch: boolean) {
  return `git-adv-cell ${kind}${activeSearch ? " search-hit" : ""}`;
}

function isChangedRow(row: SideBySideRow) {
  return row.kind === "line" && (row.oldKind !== "ctx" || row.newKind !== "ctx");
}

function isVisibleInMode(row: SideBySideRow, mode: DiffViewMode) {
  if (mode === "all") {
    return true;
  }
  if (mode === "diff") {
    return row.kind === "hunk" || isChangedRow(row);
  }
  return row.kind === "line" && row.oldKind === "ctx" && row.newKind === "ctx";
}

function markerKind(row: SideBySideRow): ChangeMarker["kind"] {
  if (row.oldKind === "del" && row.newKind === "add") {
    return "mod";
  }
  if (row.newKind === "add") {
    return "add";
  }
  return "del";
}

export function DiffSideBySide({
  lines,
  loading,
  leftLabel,
  rightLabel,
  resetKey,
}: {
  lines: GitDiffLine[];
  loading: boolean;
  leftLabel: string;
  rightLabel: string;
  /** Changing this (e.g. a new file) resets the active-change cursor to the top. */
  resetKey?: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<DiffViewMode>("all");
  const [wrap, setWrap] = useState(false);
  const [activeChange, setActiveChange] = useState(0);
  const [viewport, setViewport] = useState({ top: 0, height: 0, fill: 1, scrollable: false });
  const pendingScrollRow = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const rows = useMemo(() => buildRows(lines), [lines]);
  const visibleRows = useMemo(
    () => rows.map((row, i) => ({ row, i })).filter(({ row }) => isVisibleInMode(row, mode)),
    [rows, mode],
  );
  const changeRows = useMemo(
    () =>
      rows
        .map((row, i) => ({ row, i }))
        .filter(({ row }) => isChangedRow(row) && isVisibleInMode(row, mode)),
    [rows, mode],
  );
  const markers = useMemo<ChangeMarker[]>(
    () =>
      rows
        .map((row, rowIndex) => ({ row, rowIndex }))
        .filter(({ row }) => isChangedRow(row))
        .map(({ row, rowIndex }) => ({
          rowIndex,
          top: rows.length <= 1 ? 0 : (rowIndex / (rows.length - 1)) * 100,
          kind: markerKind(row),
        })),
    [rows],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const searchHits = useMemo(
    () =>
      visibleRows
        .map(({ row, i }) => ({ i, hit: includesQuery(row, normalizedQuery) }))
        .filter((entry) => entry.hit),
    [visibleRows, normalizedQuery],
  );
  const activeRow = changeRows.length > 0 ? changeRows[activeChange % changeRows.length]?.i : null;

  useEffect(() => {
    setActiveChange(0);
  }, [resetKey, lines, mode]);

  useEffect(() => {
    if (activeRow === null) {
      return;
    }
    const container = scrollRef.current;
    const row = container?.querySelector<HTMLElement>(`[data-row-index="${activeRow}"]`);
    row?.scrollIntoView({ block: "center" });
  }, [activeRow]);

  useEffect(() => {
    const rowIndex = pendingScrollRow.current;
    if (rowIndex === null) {
      return;
    }
    pendingScrollRow.current = null;
    window.requestAnimationFrame(() => {
      const container = scrollRef.current;
      const row = container?.querySelector<HTMLElement>(`[data-row-index="${rowIndex}"]`);
      row?.scrollIntoView({ block: "center" });
    });
  }, [mode]);

  const updateViewport = () => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    const viewPx = container.clientHeight;
    const railPx = mapRef.current?.clientHeight ?? viewPx;
    // True content height: scrollHeight is clamped to clientHeight when the
    // file fits, so measure the inner content element instead.
    const contentPx = contentRef.current?.offsetHeight ?? container.scrollHeight;
    // Track height is proportional to content: short files get a short map,
    // overflowing files compress to fill the rail (fill === 1).
    const fill = Math.min(1, contentPx / Math.max(railPx, 1));
    const scrollable = container.scrollHeight > viewPx + 1;
    if (!scrollable) {
      setViewport({ top: 0, height: 0, fill, scrollable: false });
      return;
    }
    setViewport({
      top: (container.scrollTop / contentPx) * 100,
      height: (viewPx / contentPx) * 100,
      fill,
      scrollable: true,
    });
  };

  useEffect(() => {
    window.requestAnimationFrame(updateViewport);
  }, [visibleRows.length, mode, loading]);

  // Drag the minimap like a scrollbar: map the pointer position within the
  // content-proportional track to a centered scroll offset.
  const scrollFromPointer = (clientY: number) => {
    const container = scrollRef.current;
    const rail = mapRef.current;
    if (!container || !rail) {
      return;
    }
    const max = container.scrollHeight - container.clientHeight;
    if (max <= 0) {
      return;
    }
    const rect = rail.getBoundingClientRect();
    const fill = Math.min(1, container.scrollHeight / Math.max(rect.height, 1));
    const trackPx = Math.max(rect.height * fill, 1);
    const y = Math.min(Math.max(clientY - rect.top, 0), trackPx);
    const frac = y / trackPx;
    container.scrollTop = Math.min(
      Math.max(frac * container.scrollHeight - container.clientHeight / 2, 0),
      max,
    );
  };

  const onMapPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!viewport.scrollable) {
      return;
    }
    event.preventDefault();
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    scrollFromPointer(event.clientY);
  };

  const onMapPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) {
      return;
    }
    scrollFromPointer(event.clientY);
  };

  const onMapPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const goChange = (delta: number) => {
    if (changeRows.length === 0) {
      return;
    }
    setActiveChange((value) => (value + delta + changeRows.length) % changeRows.length);
  };

  const scrollToRow = (rowIndex: number) => {
    if (!isVisibleInMode(rows[rowIndex], mode)) {
      pendingScrollRow.current = rowIndex;
      setMode("diff");
      return;
    }
    const container = scrollRef.current;
    const row = container?.querySelector<HTMLElement>(`[data-row-index="${rowIndex}"]`);
    row?.scrollIntoView({ block: "center" });
  };

  return (
    <div className={`diff-sbs${wrap ? " wrap" : ""}`}>
      <div className="diff-sbs-toolbar">
        <div className="git-adv-search">
          <Search size={14} />
          <input
            value={query}
            placeholder={t("git.searchDiff")}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="count">{normalizedQuery ? searchHits.length : changeRows.length}</span>
        </div>
        <div className="git-adv-mode" role="group" aria-label={t("git.diffDisplayMode")}>
          {(["all", "diff", "same"] as const).map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              className={mode === nextMode ? "active" : ""}
              onClick={() => setMode(nextMode)}
            >
              {t(`git.diffMode.${nextMode}`)}
            </button>
          ))}
        </div>
        <div className="diff-sbs-toolbar-spacer" />
        <button
          type="button"
          className={`git-icon-btn${wrap ? " is-active" : ""}`}
          onClick={() => setWrap((value) => !value)}
          aria-label={t("git.wordWrap")}
          aria-pressed={wrap}
          title={t("git.wordWrap")}
        >
          <WrapText size={16} />
        </button>
        <button type="button" className="git-icon-btn" onClick={() => goChange(-1)} aria-label={t("git.previousDifference")}>
          <ChevronUp size={16} />
        </button>
        <button type="button" className="git-icon-btn" onClick={() => goChange(1)} aria-label={t("git.nextDifference")}>
          <ChevronDown size={16} />
        </button>
      </div>
      <div className="git-adv-cols">
        <div>{leftLabel}</div>
        <div>{rightLabel}</div>
      </div>
      <div className="git-adv-main">
        <div
          className={`git-adv-map${viewport.scrollable ? " scrollable" : ""}`}
          ref={mapRef}
          aria-label={t("git.diffNavigationMap")}
          onPointerDown={onMapPointerDown}
          onPointerMove={onMapPointerMove}
          onPointerUp={onMapPointerUp}
          onPointerCancel={onMapPointerUp}
        >
          {viewport.scrollable ? (
            <div
              className="git-adv-map-window"
              style={{ top: `${viewport.top}%`, height: `${Math.max(viewport.height, 4)}%` }}
            />
          ) : null}
          {markers.map((marker, i) => (
            <button
              key={`${marker.rowIndex}-${i}`}
              type="button"
              className={`git-adv-map-marker ${marker.kind}`}
              style={{ top: `${marker.top * viewport.fill}%` }}
              onClick={() => scrollToRow(marker.rowIndex)}
              aria-label={t("git.jumpToDifference", { number: i + 1 })}
            />
          ))}
        </div>
        <div className="git-adv-body" ref={scrollRef} onScroll={updateViewport}>
          <div className="git-adv-content" ref={contentRef}>
            {loading ? (
              <div className="git-diff-loading">{t("git.loadingDiff")}</div>
            ) : visibleRows.length === 0 ? (
              <div className="git-diff-loading">{t("git.noDiff")}</div>
            ) : (
              visibleRows.map(({ row, i }) => {
                if (row.kind === "hunk") {
                  return (
                    <div key={row.id} className="git-adv-row git-adv-hunk" data-row-index={i}>
                      {row.hunkText}
                    </div>
                  );
                }
                const searchHit = includesQuery(row, normalizedQuery);
                return (
                  <div key={row.id} className={`git-adv-row${activeRow === i ? " active" : ""}`} data-row-index={i}>
                    <div className={cellClass(row.oldKind, searchHit)}>
                      <span className="no">{row.oldNo ?? ""}</span>
                      <span className="txt">{row.oldText}</span>
                    </div>
                    <div className={cellClass(row.newKind, searchHit)}>
                      <span className="no">{row.newNo ?? ""}</span>
                      <span className="txt">{row.newText}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
