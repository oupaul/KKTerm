// SFTP file pane — Apple/Finder symmetric dual-pane presentation.
// Breadcrumb navigation + List/Gallery views, sortable columns, inline rename,
// editable path with recent-paths history, drag-to-transfer. All data flows in
// through props; this file owns only local view/sort/edit UI state.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { DIcon } from "../../../../app/ui/dialog";
import type { FileEntry } from "../../../../types";
import { FileGlyph } from "./finderGlyphs";
import type { FilePaneSide } from "./types";

type SortKey = "name" | "size" | "date";
type SortState = { key: SortKey; dir: "asc" | "desc" };
type ViewMode = "list" | "gallery";

const LIST_GRID = "minmax(0,1fr) 88px 128px";

export function FilePane({
  side,
  title,
  path,
  files,
  isLoading = false,
  status = "",
  selectedNames,
  onRefresh,
  onGoUp,
  onCreateFolder,
  onRenameSelected,
  onDeleteSelected,
  onOpenFolder,
  onPathSubmit,
  recentPaths = [],
  onSelectionChange,
  onContextMenuRequest,
  onDropTransfer,
  forceDropTarget = false,
  renameRequest,
}: {
  side: FilePaneSide;
  title: string;
  path: string;
  files: FileEntry[];
  isLoading?: boolean;
  status?: string;
  selectedNames: string[];
  onRefresh?: () => void;
  onGoUp?: () => void;
  onCreateFolder?: () => void;
  onRenameSelected?: (currentName: string, newName: string) => void | Promise<void>;
  onDeleteSelected?: () => void;
  onOpenFolder?: (folderName: string) => void;
  onPathSubmit?: (path: string) => void | Promise<void>;
  recentPaths?: string[];
  onSelectionChange?: (fileNames: string[]) => void;
  onContextMenuRequest?: (side: FilePaneSide, fileNames: string[], event: ReactMouseEvent) => void;
  onDropTransfer?: (targetSide: FilePaneSide, fileNames: string[]) => void;
  forceDropTarget?: boolean;
  renameRequest?: { side: FilePaneSide; name: string; requestId: number };
}) {
  const { t } = useTranslation();
  const pathSuggestionsId = useId();
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const renameCanceledRef = useRef(false);
  const lastSelectedNameRef = useRef<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [pathDraft, setPathDraft] = useState(path);
  const [editingPath, setEditingPath] = useState(false);
  const [recentMenuOpen, setRecentMenuOpen] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: "name", dir: "asc" });
  const [view, setView] = useState<ViewMode>("list");
  const [isDropTarget, setIsDropTarget] = useState(false);

  const sortedFiles = useMemo(() => sortFileEntries(files, sort), [files, sort]);
  const crumbs = useMemo(() => buildCrumbs(side, path), [side, path]);
  const pathSuggestions = useMemo(
    () => buildFolderPathSuggestions({ side, currentPath: path, draft: pathDraft, files }),
    [files, path, pathDraft, side],
  );

  useEffect(() => {
    setPathDraft(path);
    setEditingPath(false);
  }, [path]);

  useEffect(() => {
    if (!editingName) {
      return;
    }
    window.requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, [editingName]);

  useEffect(() => {
    if (editingName && !files.some((file) => file.name === editingName)) {
      setEditingName(null);
      setRenameDraft("");
    }
  }, [editingName, files]);

  useEffect(() => {
    if (!renameRequest || renameRequest.side !== side || isLoading) {
      return;
    }
    const requestedFile = files.find((file) => file.name === renameRequest.name);
    if (!requestedFile || !onRenameSelected) {
      return;
    }
    onSelectionChange?.([requestedFile.name]);
    renameCanceledRef.current = false;
    setEditingName(requestedFile.name);
    setRenameDraft(requestedFile.name);
  }, [files, isLoading, onRenameSelected, onSelectionChange, renameRequest, side]);

  function selectFile(fileName: string, event?: ReactMouseEvent | KeyboardEvent<HTMLDivElement>) {
    if (isLoading) {
      return;
    }
    if (event?.shiftKey && lastSelectedNameRef.current) {
      const currentIndex = sortedFiles.findIndex((file) => file.name === fileName);
      const lastIndex = sortedFiles.findIndex((file) => file.name === lastSelectedNameRef.current);
      if (currentIndex >= 0 && lastIndex >= 0) {
        const [start, end] = currentIndex < lastIndex ? [currentIndex, lastIndex] : [lastIndex, currentIndex];
        onSelectionChange?.(sortedFiles.slice(start, end + 1).map((file) => file.name));
        return;
      }
    }
    if (event?.ctrlKey || event?.metaKey) {
      const nextNames = selectedNames.includes(fileName)
        ? selectedNames.filter((name) => name !== fileName)
        : [...selectedNames, fileName];
      lastSelectedNameRef.current = fileName;
      onSelectionChange?.(nextNames);
      return;
    }
    lastSelectedNameRef.current = fileName;
    onSelectionChange?.([fileName]);
  }

  async function commitRename() {
    if (!editingName) {
      return;
    }
    if (renameCanceledRef.current) {
      renameCanceledRef.current = false;
      return;
    }
    const nextName = renameDraft.trim();
    const currentName = editingName;
    if (!nextName || nextName === currentName) {
      setEditingName(null);
      setRenameDraft("");
      return;
    }
    await onRenameSelected?.(currentName, nextName);
    setEditingName(null);
    setRenameDraft("");
  }

  function cancelRename() {
    renameCanceledRef.current = true;
    setEditingName(null);
    setRenameDraft("");
  }

  async function commitPathDraft(value = pathDraft) {
    const nextPath = value.trim();
    setEditingPath(false);
    if (!nextPath || nextPath === path || isLoading) {
      setPathDraft(path);
      return;
    }
    setRecentMenuOpen(false);
    await onPathSubmit?.(nextPath);
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  function navigateToCrumb(crumbPath: string) {
    if (isLoading || !onPathSubmit || crumbPath === path) {
      return;
    }
    void onPathSubmit(crumbPath);
  }

  function handleDragStart(fileName: string, event: ReactDragEvent<HTMLDivElement>) {
    if (isLoading || editingName === fileName) {
      event.preventDefault();
      return;
    }
    const names = selectedNames.includes(fileName) ? selectedNames : [fileName];
    onSelectionChange?.(names);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-kkterm-sftp-items", JSON.stringify({ side, names }));
  }

  function handleDragOver(event: ReactDragEvent<HTMLDivElement>) {
    if (!Array.from(event.dataTransfer.types).includes("application/x-kkterm-sftp-items")) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDropTarget(true);
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDropTarget(false);
    try {
      const payload = JSON.parse(event.dataTransfer.getData("application/x-kkterm-sftp-items")) as {
        side?: FilePaneSide;
        names?: string[];
      };
      if (payload.side && payload.side !== side && payload.names?.length) {
        onDropTransfer?.(side, payload.names);
      }
    } catch {
      return;
    }
  }

  function renderRowName(file: FileEntry) {
    if (editingName === file.name) {
      return (
        <input
          aria-label={t("sftp.renameFileAria", { name: file.name })}
          className="sftp-rename-input"
          onBlur={() => void commitRename()}
          onChange={(event) => setRenameDraft(event.currentTarget.value)}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              cancelRename();
            }
          }}
          ref={renameInputRef}
          value={renameDraft}
        />
      );
    }
    return <span>{file.name}</span>;
  }

  function rowHandlers(file: FileEntry, isSelected: boolean) {
    return {
      draggable: !isLoading && editingName !== file.name,
      onClick: (event: ReactMouseEvent<HTMLDivElement>) => {
        if (!isLoading) {
          selectFile(file.name, event);
        }
      },
      onDoubleClick: () => {
        if (!isLoading && file.kind === "folder") {
          onOpenFolder?.(file.name);
        }
      },
      onContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => {
        if (isLoading) {
          return;
        }
        event.stopPropagation();
        const names = isSelected ? selectedNames : [file.name];
        onContextMenuRequest?.(side, names, event);
      },
      onDragStart: (event: ReactDragEvent<HTMLDivElement>) => handleDragStart(file.name, event),
      onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
        if ((event.key === "Enter" || event.key === " ") && !isLoading) {
          event.preventDefault();
          selectFile(file.name, event);
          if (event.key === "Enter" && file.kind === "folder") {
            onOpenFolder?.(file.name);
          }
        }
      },
    };
  }

  const isEmpty = !isLoading && !status && sortedFiles.length === 0;

  return (
    <section
      className="sftp-pane"
      data-sftp-pane-side={side}
      data-tutorial-id={side === "local" ? "sftp.localPane" : "sftp.remotePane"}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setRecentMenuOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (
          (event.key === "Delete" || event.key === "Backspace") &&
          onDeleteSelected &&
          !editingName &&
          !editingPath &&
          selectedNames.length > 0 &&
          !isLoading
        ) {
          event.preventDefault();
          onDeleteSelected();
        }
      }}
    >
      <div className="sftp-pane-head">
        <span className="sftp-pane-label">
          <DIcon name={side === "local" ? "drive" : "server"} size={13} />
          {title}
        </span>
        {editingPath ? (
          <div className="sftp-path-edit">
            <input
              aria-label={t("sftp.pathInputAria", { pane: title.toLowerCase() })}
              className="sftp-path-input"
              autoFocus
              disabled={!onPathSubmit || isLoading}
              list={pathSuggestions.length > 0 ? pathSuggestionsId : undefined}
              onBlur={() => commitPathDraft()}
              onChange={(event) => setPathDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void commitPathDraft(event.currentTarget.value);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setPathDraft(path);
                  setEditingPath(false);
                }
              }}
              spellCheck={false}
              value={pathDraft}
            />
            {pathSuggestions.length > 0 ? (
              <datalist id={pathSuggestionsId}>
                {pathSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            ) : null}
          </div>
        ) : (
          <div
            className="sftp-crumbs"
            onDoubleClick={() => {
              if (onPathSubmit && !isLoading) {
                setPathDraft(path);
                setEditingPath(true);
              }
            }}
            title={t("sftp.editPathTitle")}
          >
            <button
              className={`sftp-crumb${crumbs.items.length === 0 ? " current" : ""}`}
              onClick={() => navigateToCrumb(crumbs.rootPath)}
              title={crumbs.rootLabel}
              type="button"
            >
              <span className="gl">
                <DIcon name={side === "local" ? "home" : "server"} size={14} />
              </span>
              <span className="sftp-crumb-text">{crumbs.rootLabel}</span>
            </button>
            {crumbs.items.map((crumb, index) => (
              <span className="sftp-crumb-seg" key={crumb.path}>
                <span className="sftp-crumb-sep">
                  <DIcon name="chevright" size={13} />
                </span>
                <button
                  className={`sftp-crumb${index === crumbs.items.length - 1 ? " current" : ""}`}
                  onClick={() => navigateToCrumb(crumb.path)}
                  title={crumb.name}
                  type="button"
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="sftp-pane-head-actions">
          <button
            className="sftp-icon-btn"
            aria-label={t("sftp.openParentFolderAria", { pane: title.toLowerCase() })}
            disabled={!onGoUp || isLoading}
            onClick={onGoUp}
            title={t("sftp.openParentFolderAria", { pane: title.toLowerCase() })}
            type="button"
          >
            <DIcon name="up" size={16} />
          </button>
          {onCreateFolder ? (
            <button
              className="sftp-icon-btn"
              aria-label={t("sftp.createFolderAria", { pane: title.toLowerCase() })}
              disabled={isLoading}
              onClick={onCreateFolder}
              title={t("sftp.createFolderAria", { pane: title.toLowerCase() })}
              type="button"
            >
              <DIcon name="newfolder" size={16} />
            </button>
          ) : null}
          <div className="sftp-recent-wrap">
            <button
              aria-expanded={recentMenuOpen}
              aria-label={t("sftp.recentPathsAria", { pane: title.toLowerCase() })}
              className="sftp-icon-btn"
              disabled={recentPaths.length === 0 || isLoading || !onPathSubmit}
              onClick={() => setRecentMenuOpen((open) => !open)}
              title={t("sftp.recentPathsAria", { pane: title.toLowerCase() })}
              type="button"
            >
              <DIcon name="clock" size={15} />
            </button>
            {recentMenuOpen && recentPaths.length > 0 ? (
              <div className="sftp-recent-menu" role="menu">
                {recentPaths.map((recentPath) => (
                  <button
                    key={recentPath}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void commitPathDraft(recentPath)}
                    role="menuitem"
                    type="button"
                  >
                    {recentPath}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            className="sftp-icon-btn"
            aria-label={t("sftp.refreshFilesAria", { pane: title.toLowerCase() })}
            disabled={!onRefresh || isLoading}
            onClick={onRefresh}
            title={t("sftp.refreshFilesAria", { pane: title.toLowerCase() })}
            type="button"
          >
            <DIcon name="refresh" size={15} />
          </button>
          <ViewSeg value={view} onChange={setView} t={t} />
        </div>
      </div>

      {view === "list" ? (
        <ListColumnHeader sort={sort} onSort={toggleSort} t={t} />
      ) : null}

      <div
        className={`sftp-file-body sftp-view-${view}${isDropTarget || forceDropTarget ? " drop-target" : ""}`}
        onContextMenu={(event) => onContextMenuRequest?.(side, selectedNames, event)}
        onDragLeave={() => setIsDropTarget(false)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isLoading ? <div className="sftp-empty">{t("sftp.loading")}</div> : null}
        {!isLoading && status ? <div className="sftp-empty">{status}</div> : null}
        {isEmpty ? (
          <div className="sftp-empty">
            <DIcon name="info" size={22} />
            <span>{t("sftp.noFiles")}</span>
          </div>
        ) : null}

        {!isLoading && !status && view === "list"
          ? sortedFiles.map((file) => {
              const isSelected = selectedNames.includes(file.name);
              const handlers = rowHandlers(file, isSelected);
              return (
                <div
                  className={`sftp-row${isSelected ? " sel" : ""}`}
                  key={file.name}
                  role="button"
                  tabIndex={isLoading ? -1 : 0}
                  title={file.kind === "folder" ? t("sftp.doubleClickToOpenFile", { name: file.name }) : file.name}
                  style={{ gridTemplateColumns: LIST_GRID }}
                  {...handlers}
                >
                  <div className="nm">
                    <span className="sftp-row-glyph">
                      <FileGlyph entry={file} size={20} />
                    </span>
                    {renderRowName(file)}
                  </div>
                  <div className="num">{file.size}</div>
                  <div className="num">{file.modified}</div>
                </div>
              );
            })
          : null}

        {!isLoading && !status && view === "gallery" ? (
          <div className="sftp-gallery-grid">
            {sortedFiles.map((file) => {
              const isSelected = selectedNames.includes(file.name);
              const handlers = rowHandlers(file, isSelected);
              return (
                <div
                  className={`sftp-tile${isSelected ? " sel" : ""}`}
                  key={file.name}
                  role="button"
                  tabIndex={isLoading ? -1 : 0}
                  title={file.kind === "folder" ? t("sftp.doubleClickToOpenFile", { name: file.name }) : file.name}
                  {...handlers}
                >
                  <span className="sftp-tile-ico">
                    <FileGlyph entry={file} size={52} />
                  </span>
                  <span className="sftp-tile-cap">{renderRowName(file)}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ViewSeg({
  value,
  onChange,
  t,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="sftp-segmented" role="tablist" aria-label={t("sftp.viewMode")}>
      {(["list", "gallery"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={value === mode}
          className={value === mode ? "active" : ""}
          onClick={() => onChange(mode)}
          title={t(mode === "list" ? "sftp.listView" : "sftp.galleryView")}
        >
          <DIcon name={mode} size={15} />
        </button>
      ))}
    </div>
  );
}

function ListColumnHeader({
  sort,
  onSort,
  t,
}: {
  sort: SortState;
  onSort: (key: SortKey) => void;
  t: (key: string) => string;
}) {
  const Head = ({ k, label, cls }: { k: SortKey; label: string; cls?: string }) => (
    <button className={cls} onClick={() => onSort(k)} type="button">
      {label}
      {sort.key === k ? (
        <span className="sftp-sort-ind">
          <DIcon name={sort.dir === "asc" ? "arrowup" : "arrowdown"} size={12} />
        </span>
      ) : null}
    </button>
  );
  return (
    <div className="sftp-col-head" style={{ gridTemplateColumns: LIST_GRID }}>
      <Head k="name" label={t("sftp.name")} />
      <Head k="size" label={t("sftp.size")} cls="num" />
      <Head k="date" label={t("sftp.date")} cls="num" />
    </div>
  );
}

function sortFileEntries(files: FileEntry[], sort: SortState) {
  const sorted = [...files].sort((left, right) => {
    if (left.kind === "folder" && right.kind !== "folder") {
      return -1;
    }
    if (left.kind !== "folder" && right.kind === "folder") {
      return 1;
    }
    const byName = left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" });
    const primary =
      sort.key === "size"
        ? (left.sizeBytes ?? -1) - (right.sizeBytes ?? -1)
        : sort.key === "date"
          ? (left.modifiedTimestamp ?? 0) - (right.modifiedTimestamp ?? 0)
          : byName;
    if (primary === 0) {
      // Stable tiebreak by name ascending regardless of primary direction.
      return byName;
    }
    return sort.dir === "asc" ? primary : -primary;
  });
  return sorted;
}

type Crumb = { name: string; path: string };
function buildCrumbs(side: FilePaneSide, path: string): { rootLabel: string; rootPath: string; items: Crumb[] } {
  if (!path || path === ".") {
    return { rootLabel: side === "local" ? "/" : "/", rootPath: path || "/", items: [] };
  }
  const isWindows = side === "local" && (path.includes("\\") || /^[A-Za-z]:/.test(path));
  if (isWindows) {
    const normalized = path.replace(/\//g, "\\");
    const parts = normalized.split("\\").filter(Boolean);
    const drive = parts[0] ?? "";
    const rootPath = `${drive}\\`;
    let accumulator = rootPath;
    const items: Crumb[] = parts.slice(1).map((name) => {
      const current = accumulator.endsWith("\\") ? `${accumulator}${name}` : `${accumulator}\\${name}`;
      accumulator = `${current}\\`;
      return { name, path: current };
    });
    return { rootLabel: drive || "\\", rootPath, items };
  }
  const parts = path.split("/").filter(Boolean);
  let accumulator = "";
  const items: Crumb[] = parts.map((name) => {
    accumulator = `${accumulator}/${name}`;
    return { name, path: accumulator };
  });
  return { rootLabel: "/", rootPath: "/", items };
}

function buildFolderPathSuggestions({
  side,
  currentPath,
  draft,
  files,
}: {
  side: FilePaneSide;
  currentPath: string;
  draft: string;
  files: FileEntry[];
}) {
  const folders = files.filter((file) => file.kind === "folder");
  if (folders.length === 0 || (side === "local" && !/[\\/]/.test(currentPath))) {
    return [];
  }
  const separator = side === "local" && (currentPath || draft).includes("\\") ? "\\" : "/";
  const splitPattern = side === "local" ? /[\\/]/ : /\//;
  const parts = draft.split(splitPattern);
  const typedName = parts[parts.length - 1] ?? "";
  const typedParent = parts.length > 1 ? draft.slice(0, draft.length - typedName.length) : "";
  const parentPath = typedParent || appendSeparator(currentPath, separator);
  const normalizedTypedName = typedName.toLocaleLowerCase();
  return folders
    .filter((folder) => folder.name.toLocaleLowerCase().startsWith(normalizedTypedName))
    .slice(0, 8)
    .map((folder) => `${parentPath}${folder.name}${separator}`);
}

function appendSeparator(path: string, separator: string) {
  if (!path) {
    return "";
  }
  if (path.endsWith("/") || path.endsWith("\\")) {
    return path;
  }
  return `${path}${separator}`;
}
