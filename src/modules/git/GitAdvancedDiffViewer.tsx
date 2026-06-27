import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import type { GitChangedFile, GitDiffLine } from "./gitTypes";
import { splitPath } from "./gitPath";
import { GitIcon } from "./GitIcon";

type DiffSideKind = "ctx" | "add" | "del" | "blank";

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

export function GitAdvancedDiffViewer({
  file,
  lines,
  loading,
  onClose,
}: {
  file: GitChangedFile;
  lines: GitDiffLine[];
  loading: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [activeChange, setActiveChange] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rows = useMemo(() => buildRows(lines), [lines]);
  const changeRows = useMemo(
    () =>
      rows
        .map((row, i) => ({ row, i }))
        .filter(({ row }) => row.kind === "line" && (row.oldKind !== "ctx" || row.newKind !== "ctx")),
    [rows],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const searchHits = useMemo(
    () => rows.map((row, i) => ({ i, hit: includesQuery(row, normalizedQuery) })).filter((entry) => entry.hit),
    [rows, normalizedQuery],
  );
  const activeRow = changeRows.length > 0 ? changeRows[activeChange % changeRows.length]?.i : null;
  const { dir, name } = splitPath(file.path);

  useEffect(() => {
    setActiveChange(0);
  }, [file.path, lines]);

  useEffect(() => {
    if (activeRow === null) {
      return;
    }
    const container = scrollRef.current;
    const row = container?.querySelector<HTMLElement>(`[data-row-index="${activeRow}"]`);
    row?.scrollIntoView({ block: "center" });
  }, [activeRow]);

  const goChange = (delta: number) => {
    if (changeRows.length === 0) {
      return;
    }
    setActiveChange((value) => (value + delta + changeRows.length) % changeRows.length);
  };

  return (
    <div className="git-adv-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}>
      <div className="git-adv" role="dialog" aria-modal="true" aria-label={t("git.advancedDiffTitle", { file: name })}>
        <div className="git-adv-head">
          <div className="git-adv-title">
            <GitIcon name="file" size={16} />
            <span className="name">{name}</span>
            <span className="dir">{dir}</span>
          </div>
          <div className="git-adv-search">
            <Search size={14} />
            <input
              value={query}
              placeholder={t("git.searchDiff")}
              onChange={(event) => setQuery(event.target.value)}
            />
            <span className="count">{normalizedQuery ? searchHits.length : changeRows.length}</span>
          </div>
          <button type="button" className="git-icon-btn" onClick={() => goChange(-1)} aria-label={t("git.previousDifference")}>
            <ChevronUp size={16} />
          </button>
          <button type="button" className="git-icon-btn" onClick={() => goChange(1)} aria-label={t("git.nextDifference")}>
            <ChevronDown size={16} />
          </button>
          <button type="button" className="git-icon-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={17} />
          </button>
        </div>
        <div className="git-adv-cols">
          <div>{t("git.diffOriginal")}</div>
          <div>{t("git.diffModified")}</div>
        </div>
        <div className="git-adv-body" ref={scrollRef}>
          {loading ? (
            <div className="git-diff-loading">{t("git.loadingDiff")}</div>
          ) : rows.length === 0 ? (
            <div className="git-diff-loading">{t("git.noDiff")}</div>
          ) : (
            rows.map((row, i) => {
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
  );
}
