import { ArrowDown, ChevronDown, FolderPlus, History, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { useTranslation } from "react-i18next";
import i18next from "../../../../i18n/config";
import type { FileEntry } from "../../../../types";
import { FileTypeIcon } from "./fileIcons";
import type { FilePaneSide, FileSortKey } from "./types";

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
  onContextMenuRequest?: (
    side: FilePaneSide,
    fileNames: string[],
    event: ReactMouseEvent,
  ) => void;
  onDropTransfer?: (targetSide: FilePaneSide, fileNames: string[]) => void;
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
  const [recentMenuOpen, setRecentMenuOpen] = useState(false);
  const [sortKey, setSortKey] = useState<FileSortKey>("name");
  const [isDropTarget, setIsDropTarget] = useState(false);
  const hasMutationActions = Boolean(onCreateFolder || onRenameSelected || onDeleteSelected);
  const selectedFile = files.find((file) => file.name === selectedNames[0]);
  const canRenameSelected = Boolean(
    onRenameSelected && selectedFile && selectedNames.length === 1 && !isLoading,
  );
  const sortedFiles = useMemo(() => sortFileEntries(files, sortKey), [files, sortKey]);
  const nextSortKey: FileSortKey = sortKey === "name" ? "date" : "name";
  const pathSuggestions = useMemo(
    () => buildFolderPathSuggestions({ side, currentPath: path, draft: pathDraft, files }),
    [files, path, pathDraft, side],
  );

  useEffect(() => {
    setPathDraft(path);
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

  function beginRename(targetName = selectedFile?.name) {
    if (!targetName) {
      return;
    }

    renameCanceledRef.current = false;
    setEditingName(targetName);
    setRenameDraft(targetName);
  }

  function selectFile(fileName: string, event?: ReactMouseEvent | KeyboardEvent<HTMLDivElement>) {
    if (isLoading) {
      return;
    }

    if (event?.shiftKey && lastSelectedNameRef.current) {
      const currentIndex = sortedFiles.findIndex((file) => file.name === fileName);
      const lastIndex = sortedFiles.findIndex((file) => file.name === lastSelectedNameRef.current);
      if (currentIndex >= 0 && lastIndex >= 0) {
        const [start, end] =
          currentIndex < lastIndex ? [currentIndex, lastIndex] : [lastIndex, currentIndex];
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
    if (!nextPath || nextPath === path || isLoading) {
      setPathDraft(path);
      return;
    }

    setRecentMenuOpen(false);
    await onPathSubmit?.(nextPath);
  }

  function dragPayloadFor(fileName: string) {
    return selectedNames.includes(fileName) ? selectedNames : [fileName];
  }

  function handleDragStart(fileName: string, event: ReactDragEvent<HTMLDivElement>) {
    if (isLoading || editingName === fileName) {
      event.preventDefault();
      return;
    }

    const names = dragPayloadFor(fileName);
    onSelectionChange?.(names);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      "application/x-kkterm-sftp-items",
      JSON.stringify({ side, names }),
    );
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
      const payload = JSON.parse(
        event.dataTransfer.getData("application/x-kkterm-sftp-items"),
      ) as { side?: FilePaneSide; names?: string[] };
      if (payload.side && payload.side !== side && payload.names?.length) {
        onDropTransfer?.(side, payload.names);
      }
    } catch {
      return;
    }
  }

  return (
    <article
      className="file-pane"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setRecentMenuOpen(false);
        }
      }}
      data-tutorial-id={side === "local" ? "sftp.localPane" : "sftp.remotePane"}
    >
      <header>
        <div className="file-pane-path-row">
          <strong>{title}</strong>
          <div className="file-pane-path-control">
            <input
              aria-label={t("sftp.pathInputAria", { pane: title.toLowerCase() })}
              className="file-pane-path-input"
              disabled={!onPathSubmit || isLoading}
              list={pathSuggestions.length > 0 ? pathSuggestionsId : undefined}
              onBlur={() => setPathDraft(path)}
              onChange={(event) => setPathDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const nextPath = event.currentTarget.value;
                  void commitPathDraft(nextPath);
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setPathDraft(path);
                  setRecentMenuOpen(false);
                  event.currentTarget.blur();
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
            <button
              aria-expanded={recentMenuOpen}
              aria-label={t("sftp.recentPathsAria", { pane: title.toLowerCase() })}
              className="icon-button file-pane-recent-button"
              disabled={recentPaths.length === 0 || isLoading || !onPathSubmit}
              onClick={() => setRecentMenuOpen((open) => !open)}
              title={t("sftp.recentPathsAria", { pane: title.toLowerCase() })}
              type="button"
            >
              <History size={14} />
            </button>
            {recentMenuOpen && recentPaths.length > 0 ? (
              <div className="file-pane-recent-menu" role="menu">
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
        </div>
        <div className="file-pane-actions">
          <button
            className="icon-button"
            aria-label={t("sftp.openParentFolderAria", { pane: title.toLowerCase() })}
            disabled={!onGoUp || isLoading}
            onClick={onGoUp}
            title={t("sftp.openParentFolderAria", { pane: title.toLowerCase() })}
            type="button"
          >
            <ChevronDown className="up-icon" size={15} />
          </button>
          {hasMutationActions && (
            <>
              <button
                className="icon-button"
                aria-label={t("sftp.createFolderAria", { pane: title.toLowerCase() })}
                disabled={!onCreateFolder || isLoading}
                onClick={onCreateFolder}
                title={t("sftp.createFolderAria", { pane: title.toLowerCase() })}
                type="button"
              >
                <FolderPlus size={15} />
              </button>
              <button
                className="icon-button"
                aria-label={t("sftp.renameSelectedAria", { pane: title.toLowerCase() })}
                disabled={!canRenameSelected}
                onClick={() => beginRename()}
                title={t("sftp.renameSelectedAria", { pane: title.toLowerCase() })}
                type="button"
              >
                <Pencil size={15} />
              </button>
              <button
                className="icon-button"
                aria-label={t("sftp.deleteSelectedAria", { pane: title.toLowerCase() })}
                disabled={!onDeleteSelected || selectedNames.length === 0 || isLoading}
                onClick={onDeleteSelected}
                title={t("sftp.deleteSelectedAria", { pane: title.toLowerCase() })}
                type="button"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
          <button
            className="icon-button file-sort-button"
            aria-label={t("sftp.sortByAria", { pane: title.toLowerCase(), key: nextSortKey })}
            onClick={() => setSortKey(nextSortKey)}
            title={t("sftp.sortByTitle", { key: nextSortKey })}
            type="button"
          >
            <ArrowDown size={15} />
            <span>{fileSortLabel(sortKey)}</span>
          </button>
          <button
            className="icon-button"
            aria-label={t("sftp.refreshFilesAria", { pane: title.toLowerCase() })}
            disabled={!onRefresh || isLoading}
            onClick={onRefresh}
            title={t("sftp.refreshFilesAria", { pane: title.toLowerCase() })}
            type="button"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </header>
      <div
        className={`file-table${isDropTarget ? " drop-target" : ""}`}
        onContextMenu={(event) => onContextMenuRequest?.(side, selectedNames, event)}
        onDragLeave={() => setIsDropTarget(false)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isLoading && <div className="file-row file-row-muted">{t("sftp.loading")}</div>}
        {!isLoading && status && <div className="file-row file-row-muted">{status}</div>}
        {!isLoading && !status && sortedFiles.length === 0 && (
          <div className="file-row file-row-muted">{t("sftp.noFiles")}</div>
        )}
        {sortedFiles.map((file) => {
          const isEditing = editingName === file.name;
          const isSelected = selectedNames.includes(file.name);
          const fileTitle = file.kind === "folder" ? t("sftp.doubleClickToOpenFile", { name: file.name }) : file.name;
          const fileContents = (
            <>
              <FileTypeIcon file={file} />
              {isEditing ? (
                <input
                  aria-label={t("sftp.renameFileAria", { name: file.name })}
                  className="file-rename-input"
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
              ) : (
                <span>{file.name}</span>
              )}
              <small>{file.size}</small>
              <small>{file.modified}</small>
            </>
          );

          if (isEditing) {
            return (
              <div
                className={`file-row file-row-interactive${isSelected ? " selected" : ""}`}
                draggable={false}
                key={file.name}
                title={fileTitle}
              >
                {fileContents}
              </div>
            );
          }

          return (
            <div
              className={`file-row file-row-interactive${isSelected ? " selected" : ""}`}
              draggable={!isLoading}
              key={file.name}
              onClick={(event) => {
                if (!isLoading) {
                  selectFile(file.name, event);
                }
              }}
              onDoubleClick={() => {
                if (!isLoading && file.kind === "folder") {
                  onOpenFolder?.(file.name);
                }
              }}
              onContextMenu={(event) => {
                if (isLoading) {
                  return;
                }

                event.stopPropagation();
                const names = isSelected ? selectedNames : [file.name];
                onContextMenuRequest?.(side, names, event);
              }}
              onDragStart={(event) => handleDragStart(file.name, event)}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && !isLoading) {
                  event.preventDefault();
                  selectFile(file.name, event);
                  if (event.key === "Enter" && file.kind === "folder") {
                    onOpenFolder?.(file.name);
                  }
                }
              }}
              role="button"
              tabIndex={isLoading ? -1 : 0}
              title={fileTitle}
            >
              {fileContents}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function sortFileEntries(files: FileEntry[], sortKey: FileSortKey) {
  return [...files].sort((left, right) => {
    if (left.kind === "folder" && right.kind !== "folder") {
      return -1;
    }
    if (left.kind !== "folder" && right.kind === "folder") {
      return 1;
    }

    if (sortKey === "date") {
      const leftTime = left.modifiedTimestamp ?? 0;
      const rightTime = right.modifiedTimestamp ?? 0;
      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }
    }

    return left.name.localeCompare(right.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function fileSortLabel(sortKey: FileSortKey) {
  return sortKey === "name" ? i18next.t("sftp.name") : i18next.t("sftp.date");
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

  const separator = pathSeparatorFor(side, currentPath || draft);
  const splitPattern = side === "local" ? /[\\/]/ : /\//;
  const parts = draft.split(splitPattern);
  const typedName = parts[parts.length - 1] ?? "";
  const typedParent = parts.length > 1 ? draft.slice(0, draft.length - typedName.length) : "";
  const parentPath = typedParent || appendPathSeparator(currentPath, separator);
  const normalizedTypedName = typedName.toLocaleLowerCase();

  return folders
    .filter((folder) => folder.name.toLocaleLowerCase().startsWith(normalizedTypedName))
    .slice(0, 8)
    .map((folder) => `${parentPath}${folder.name}${separator}`);
}

function pathSeparatorFor(side: FilePaneSide, path: string) {
  return side === "local" && path.includes("\\") ? "\\" : "/";
}

function appendPathSeparator(path: string, separator: string) {
  if (!path) {
    return "";
  }
  if (path.endsWith("/") || path.endsWith("\\")) {
    return path;
  }
  return `${path}${separator}`;
}
