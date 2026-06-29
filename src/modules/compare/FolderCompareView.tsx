// Folder Compare overlay — a Beyond Compare-style two-pane directory diff.
// Recursively compares two local folders (via the `compare_folders` backend
// command), shows the aligned tree with same / different / orphan status, and
// lets the user mirror entries to the other side (copy →, ← copy), delete a
// side, refresh, and open a differing file pair in the File Compare overlay.
// Mounted as an app-window overlay portalled to document.body, reusing the
// `git-adv-*` frame for chrome and color variables.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  Folder as FolderIcon,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { invokeCommand, isTauriRuntime, type FolderCompareResult, type FolderCompareRow } from "../../lib/tauri";
import { useWorkspaceStore } from "../../store";
import { formatFileSize, formatRemoteTime, joinLocalPath } from "../workspace/connections/sftp/format";
import type { CompareView } from "./compareTypes";

type FolderCompareFilter = "all" | "diff" | "same";

// Build a full OS path for an entry from a root + its forward-slash relative
// path, letting joinLocalPath pick the right separator for the platform.
function joinComparePath(root: string, relativePath: string): string {
  return relativePath.split("/").reduce((acc, segment) => joinLocalPath(acc, segment), root);
}

function matchesFilter(row: FolderCompareRow, filter: FolderCompareFilter): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "diff") {
    return row.status !== "same";
  }
  return row.status === "same";
}

export function FolderCompareView({ view, onClose }: { view: CompareView; onClose: () => void }) {
  const { t } = useTranslation();
  const openCompareView = useWorkspaceStore((state) => state.openCompareView);
  const showStatusBarNotice = useWorkspaceStore((state) => state.showStatusBarNotice);

  const [result, setResult] = useState<FolderCompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FolderCompareFilter>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ row: FolderCompareRow; side: "left" | "right" } | null>(null);

  const leftRoot = result?.leftRoot ?? view.left.localPath;
  const rightRoot = result?.rightRoot ?? view.right.localPath;

  const load = useCallback(async () => {
    if (!isTauriRuntime()) {
      setError(t("compare.folderDesktopOnly"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const next = await invokeCommand("compare_folders", {
        request: { left: view.left.localPath, right: view.right.localPath },
      });
      setResult(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [t, view.left.localPath, view.right.localPath]);

  useEffect(() => {
    void load();
  }, [load]);

  // Flat pre-order rows → the rows actually rendered, honoring collapsed
  // folders (whole subtree hidden) and the active status filter.
  const visibleRows = useMemo(() => {
    const rows = result?.rows ?? [];
    const out: FolderCompareRow[] = [];
    let hideDepth: number | null = null;
    for (const row of rows) {
      if (hideDepth !== null) {
        if (row.depth > hideDepth) {
          continue;
        }
        hideDepth = null;
      }
      if (row.isDir && collapsed.has(row.relativePath)) {
        hideDepth = row.depth;
      }
      if (matchesFilter(row, filter)) {
        out.push(row);
      }
    }
    return out;
  }, [result, collapsed, filter]);

  const toggleCollapse = (relativePath: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(relativePath)) {
        next.delete(relativePath);
      } else {
        next.add(relativePath);
      }
      return next;
    });
  };

  const runMutation = async (action: () => Promise<void>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await action();
      await load();
    } catch (caught) {
      showStatusBarNotice(caught instanceof Error ? caught.message : String(caught), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const copyToSide = (row: FolderCompareRow, target: "left" | "right") =>
    runMutation(async () => {
      const sourceRoot = target === "right" ? leftRoot : rightRoot;
      const destinationRoot = target === "right" ? rightRoot : leftRoot;
      await invokeCommand("copy_local_path_to", {
        request: {
          sourcePath: joinComparePath(sourceRoot, row.relativePath),
          destinationPath: joinComparePath(destinationRoot, row.relativePath),
        },
      });
      showStatusBarNotice(t("compare.folderCopied", { name: row.name }), { tone: "info" });
    });

  const deleteSide = (row: FolderCompareRow, side: "left" | "right") =>
    runMutation(async () => {
      const root = side === "left" ? leftRoot : rightRoot;
      await invokeCommand("delete_local_path", {
        request: { path: joinComparePath(root, row.relativePath) },
      });
      showStatusBarNotice(t("compare.folderDeleted", { name: row.name }), { tone: "info" });
    });

  // Double-click a folder toggles it; double-click a differing file pair opens
  // the side-by-side File Compare overlay for that pair.
  const onRowActivate = (row: FolderCompareRow) => {
    if (row.isDir) {
      toggleCollapse(row.relativePath);
      return;
    }
    if (!row.left || !row.right) {
      return;
    }
    openCompareView(
      {
        localPath: joinComparePath(leftRoot, row.relativePath),
        label: row.name,
        origin: view.left.label,
      },
      {
        localPath: joinComparePath(rightRoot, row.relativePath),
        label: row.name,
        origin: view.right.label,
      },
    );
  };

  const summary = result?.summary;
  const selectedRow = visibleRows.find((row) => row.relativePath === selected) ?? null;

  return (
    <div
      className="git-adv-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="git-adv folder-cmp" role="dialog" aria-modal="true" aria-label={t("compare.folderTitle")}>
        <div className="git-adv-head compare-head">
          <div className="compare-head-file" title={leftRoot}>
            <span className="compare-head-name">{view.left.label}</span>
            <span className="compare-head-origin">{leftRoot}</span>
          </div>
          <span className="compare-head-vs">{t("compare.versus")}</span>
          <div className="compare-head-file" title={rightRoot}>
            <span className="compare-head-name">{view.right.label}</span>
            <span className="compare-head-origin">{rightRoot}</span>
          </div>
          <div className="compare-head-spacer" />
          {summary ? (
            <div className="folder-cmp-summary" aria-label={t("compare.folderSummary")}>
              <span className="different">{t("compare.folderCountDifferent", { count: summary.different })}</span>
              <span className="left-only">{t("compare.folderCountLeftOnly", { count: summary.leftOnly })}</span>
              <span className="right-only">{t("compare.folderCountRightOnly", { count: summary.rightOnly })}</span>
              <span className="same">{t("compare.folderCountSame", { count: summary.same })}</span>
            </div>
          ) : null}
          <button type="button" className="git-icon-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={17} />
          </button>
        </div>

        <div className="diff-sbs-toolbar">
          <div className="git-adv-mode" role="group" aria-label={t("compare.folderFilter")}>
            {(["all", "diff", "same"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
              >
                {t(`git.diffMode.${value}`)}
              </button>
            ))}
          </div>
          <div className="diff-sbs-toolbar-spacer" />
          <button
            type="button"
            className="git-icon-btn"
            disabled={!selectedRow || !selectedRow.left || busy}
            onClick={() => selectedRow && copyToSide(selectedRow, "right")}
            aria-label={t("compare.folderCopyToRight")}
            title={t("compare.folderCopyToRight")}
          >
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            className="git-icon-btn"
            disabled={!selectedRow || !selectedRow.right || busy}
            onClick={() => selectedRow && copyToSide(selectedRow, "left")}
            aria-label={t("compare.folderCopyToLeft")}
            title={t("compare.folderCopyToLeft")}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            className="git-icon-btn danger"
            disabled={!selectedRow || busy}
            onClick={() => {
              if (!selectedRow) {
                return;
              }
              setConfirmDelete({ row: selectedRow, side: selectedRow.left ? "left" : "right" });
            }}
            aria-label={t("compare.folderDelete")}
            title={t("compare.folderDelete")}
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            className="git-icon-btn"
            disabled={busy || loading}
            onClick={() => void load()}
            aria-label={t("compare.folderRefresh")}
            title={t("compare.folderRefresh")}
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="git-adv-cols folder-cmp-cols">
          <div>{view.left.label}</div>
          <div>{view.right.label}</div>
        </div>

        {confirmDelete ? (
          <div className="folder-cmp-confirm" role="alertdialog" aria-label={t("compare.folderDelete")}>
            <span>
              {t("compare.folderDeleteConfirm", {
                name: confirmDelete.row.name,
                side: confirmDelete.side === "left" ? view.left.label : view.right.label,
              })}
            </span>
            <div className="folder-cmp-confirm-actions">
              <button type="button" onClick={() => setConfirmDelete(null)}>
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  const pending = confirmDelete;
                  setConfirmDelete(null);
                  void deleteSide(pending.row, pending.side);
                }}
              >
                {t("compare.folderDelete")}
              </button>
            </div>
          </div>
        ) : null}

        <div className="folder-cmp-body">
          {error ? (
            <div className="compare-status compare-status-error">{error}</div>
          ) : loading ? (
            <div className="compare-status">{t("compare.folderScanning")}</div>
          ) : visibleRows.length === 0 ? (
            <div className="compare-status">{t("compare.folderNoEntries")}</div>
          ) : (
            visibleRows.map((row) => {
              const isCollapsed = row.isDir && collapsed.has(row.relativePath);
              const Chevron = isCollapsed ? ChevronRight : ChevronDown;
              const Glyph = row.isDir ? FolderIcon : FileIcon;
              return (
                <div
                  key={row.relativePath}
                  className={`folder-cmp-row ${row.status}${selected === row.relativePath ? " selected" : ""}`}
                  data-row
                  onClick={() => setSelected(row.relativePath)}
                  onDoubleClick={() => onRowActivate(row)}
                >
                  <div className="folder-cmp-cell left">
                    <span className="indent" style={{ width: `${row.depth * 16}px` }} />
                    {row.isDir ? (
                      <button
                        type="button"
                        className="folder-cmp-twisty"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleCollapse(row.relativePath);
                        }}
                        aria-label={isCollapsed ? t("compare.folderExpand") : t("compare.folderCollapse")}
                      >
                        <Chevron size={13} />
                      </button>
                    ) : (
                      <span className="folder-cmp-twisty placeholder" />
                    )}
                    {row.left ? (
                      <>
                        <Glyph size={14} className="glyph" />
                        <span className="name">{row.name}</span>
                        <span className="meta size">{row.isDir ? "" : formatFileSize(row.left.size)}</span>
                        <span className="meta date">{formatRemoteTime(row.left.modified)}</span>
                      </>
                    ) : (
                      <span className="missing">—</span>
                    )}
                  </div>
                  <div className="folder-cmp-gutter">
                    {row.left ? (
                      <button
                        type="button"
                        className="folder-cmp-act"
                        disabled={busy}
                        title={t("compare.folderCopyToRight")}
                        aria-label={t("compare.folderCopyToRight")}
                        onClick={(event) => {
                          event.stopPropagation();
                          void copyToSide(row, "right");
                        }}
                      >
                        <ArrowRight size={13} />
                      </button>
                    ) : null}
                    {row.right ? (
                      <button
                        type="button"
                        className="folder-cmp-act"
                        disabled={busy}
                        title={t("compare.folderCopyToLeft")}
                        aria-label={t("compare.folderCopyToLeft")}
                        onClick={(event) => {
                          event.stopPropagation();
                          void copyToSide(row, "left");
                        }}
                      >
                        <ArrowLeft size={13} />
                      </button>
                    ) : null}
                  </div>
                  <div className="folder-cmp-cell right">
                    {row.right ? (
                      <>
                        <Glyph size={14} className="glyph" />
                        <span className="name">{row.name}</span>
                        <span className="meta size">{row.isDir ? "" : formatFileSize(row.right.size)}</span>
                        <span className="meta date">{formatRemoteTime(row.right.modified)}</span>
                      </>
                    ) : (
                      <span className="missing">—</span>
                    )}
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
