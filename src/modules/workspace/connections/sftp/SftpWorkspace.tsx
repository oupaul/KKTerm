import { confirmTrustedSshHostKey, connectionToolbarTitle, uniqueRuntimeId, usesNativeSshHostKeyVerification } from "../utils";

import { Terminal, X } from "lucide-react";
import { DIcon } from "../../../../app/ui/dialog";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MouseEvent as ReactMouseEvent } from "react";
import { resolveAppliedColorScheme } from "../../../../app/appShellEffects";
import { invokeCommand, isTauriRuntime, openFilesystemPath, type LocalDirectoryEntry, type LocalFileClipboardOperation, type SftpDirectoryEntry, type SftpPathProperties, type SftpTransferProgress } from "../../../../lib/tauri";
import {
  fileBrowserCommandsFor,
  type FileBrowserCommands,
} from "../../../../lib/fileBrowserCommands";
import {
  registerFileBrowserController,
  unregisterFileBrowserController,
  type FileBrowserController,
} from "../../paneRegistry";
import { useWorkspaceStore } from "../../../../store";
import type { FileEntry, SftpSettings, WorkspaceTab } from "../../../../types";
import { FilePane } from "./SftpFilePane";
import { fileBrowserConnectionIconSrc } from "../fileBrowserConnectionIcons";
import {
  ConfirmRemoteDeleteDialog,
  NewRemoteFolderDialog,
  SftpContextMenu,
  SftpPropertiesPopup,
  TransferConflictDialog,
} from "./SftpOverlays";
import { formatFileSize, formatMode, formatRemoteTime, formatTransferResult, joinLocalPath, joinRemotePath } from "./format";
import type {
  DeleteRequest,
  FilePaneSide,
  FilePropertiesState,
  SftpContextMenuState,
  TransferConflictDecision,
  TransferConflictState,
  TransferDirection,
  TransferRecord,
} from "./types";

const TRANSFER_HISTORY_STATES: TransferRecord["state"][] = ["canceled", "done", "failed"];
const WINDOWS_DRIVES_PATH = "__KKTERM_WINDOWS_DRIVES__";
const FILE_BROWSER_RECENT_PATHS_STORAGE_KEY = "kkterm.fileBrowserRecentPaths.v1";
const RECENT_PATH_LIMIT = 5;

type FileClipboard = {
  operation: LocalFileClipboardOperation;
  side: FilePaneSide;
  paths: string[];
  names: string[];
};

export function SftpWorkspace({
  isActive,
  tab,
  commands: commandsProp,
  inline = false,
  onClose,
}: {
  isActive: boolean;
  tab: WorkspaceTab;
  commands?: FileBrowserCommands;
  inline?: boolean;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const appearanceSettings = useWorkspaceStore((state) => state.appearanceSettings);
  const openTerminalHere = useWorkspaceStore((state) => state.openTerminalHere);
  const connection = tab.connection;
  const isLocalFilesBrowser = tab.kind === "localFiles";
  const commands = useMemo<FileBrowserCommands | null>(
    () => (commandsProp ?? (connection ? fileBrowserCommandsFor(connection) : null)),
    [commandsProp, connection],
  );
  const workspaceRef = useRef<HTMLElement | null>(null);
  const [localPath, setLocalPath] = useState("");
  const [localFiles, setLocalFiles] = useState<FileEntry[]>([]);
  const [remotePath, setRemotePath] = useState(".");
  const [remoteFiles, setRemoteFiles] = useState<FileEntry[]>([]);
  const [recentLocalPaths, setRecentLocalPaths] = useState<string[]>(() => readRecentPaths("local"));
  const [recentRemotePaths, setRecentRemotePaths] = useState<string[]>(() =>
    readRecentPaths("remote", connection?.id),
  );
  const [status, setStatus] = useState(t("sftp.connecting"));
  const [remoteError, setRemoteError] = useState("");
  const [localStatus, setLocalStatus] = useState("");
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [selectedLocalNames, setSelectedLocalNames] = useState<string[]>([]);
  const [selectedRemoteNames, setSelectedRemoteNames] = useState<string[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [fileClipboard, setFileClipboard] = useState<FileClipboard | null>(null);
  const [contextMenu, setContextMenu] = useState<SftpContextMenuState | null>(null);
  const [propertiesState, setPropertiesState] = useState<FilePropertiesState | null>(null);
  const [transferConflict, setTransferConflict] = useState<TransferConflictState | null>(null);
  const [newRemoteFolderOpen, setNewRemoteFolderOpen] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [isRemoteDropTarget, setIsRemoteDropTarget] = useState(false);
  const [renameRequest, setRenameRequest] = useState<{
    side: FilePaneSide;
    name: string;
    requestId: number;
  } | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const activeTransferIdRef = useRef<string | null>(null);
  const enqueueDroppedLocalPathsRef = useRef<(paths: string[]) => void>(() => {});
  const transferConflictResolverRef = useRef<
    ((decision: TransferConflictDecision) => void) | null
  >(null);
  const overwriteAllConflictsRef = useRef<Record<TransferDirection, boolean>>({
    upload: false,
    download: false,
  });
  const markConnectionSessionStarted = useWorkspaceStore(
    (state) => state.markConnectionSessionStarted,
  );
  const markConnectionSessionEnded = useWorkspaceStore(
    (state) => state.markConnectionSessionEnded,
  );

  useEffect(() => {
    void loadLocalDirectory(isLocalFilesBrowser ? connection?.localStartupDirectory : undefined);
  }, [connection?.localStartupDirectory, isLocalFilesBrowser]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let dispose: (() => void) | undefined;
    let disposed = false;
    const progressEvent = commands?.transferProgressEvent ?? "sftp-transfer-progress";
    void listen<SftpTransferProgress>(progressEvent, (event) => {
      const progress = event.payload;
      setTransfers((current) =>
        current.map((transfer) =>
          transfer.id === progress.transferId
            ? {
                ...transfer,
                progress: progress.progress,
                detail:
                  progress.totalBytes > 0
                    ? `${formatFileSize(progress.transferredBytes)} / ${formatFileSize(
                        progress.totalBytes,
                      )}`
                    : `${formatFileSize(progress.transferredBytes)} transferred`,
              }
            : transfer,
        ),
      );
    }).then((unlisten) => {
      if (disposed) {
        unlisten();
        return;
      }
      dispose = unlisten;
    });

    return () => {
      disposed = true;
      dispose?.();
    };
  }, [commands]);

  useEffect(() => {
    setRecentRemotePaths(readRecentPaths("remote", connection?.id));
  }, [connection?.id]);

  const rememberLocalPath = (path: string) => {
    const nextPaths = writeRecentPaths("local", path);
    setRecentLocalPaths(nextPaths);
  };

  const rememberRemotePath = (path: string) => {
    const nextPaths = writeRecentPaths("remote", path, connection?.id);
    setRecentRemotePaths(nextPaths);
  };

  const loadLocalDirectory = async (path?: string) => {
    if (!isTauriRuntime()) {
      setLocalStatus(t("sftp.tauriUnavailable"));
      setLocalFiles([]);
      return;
    }

    setIsLocalLoading(true);
    setLocalStatus(path ? t("sftp.openingFolder") : t("sftp.loadingLocal"));
    try {
      const result = await invokeCommand("list_local_directory", {
        request: { path },
      });
      setLocalPath(result.path);
      setLocalFiles(result.entries.map(localEntryToFileEntry));
      rememberLocalPath(result.path);
      setSelectedLocalNames([]);
      setLocalStatus("");
    } catch (error) {
      setLocalStatus(String(error));
      setLocalFiles([]);
    } finally {
      setIsLocalLoading(false);
    }
  };

  useEffect(() => {
    if (isLocalFilesBrowser) {
      sessionIdRef.current = null;
      setIsRemoteLoading(false);
      setRemoteError("");
      setRemoteFiles([]);
      setSelectedRemoteNames([]);
      setStatus("");
      return;
    }

    if (!connection) {
      setStatus(t("sftp.noSshConnection"));
      return;
    }

    if (!isTauriRuntime()) {
      setStatus(t("sftp.tauriUnavailable"));
      return;
    }

    let disposed = false;
    let sessionStarted = false;
    const requestedSessionId = uniqueRuntimeId(`${connection.id}-sftp`);
    sessionIdRef.current = requestedSessionId;
    setIsRemoteLoading(true);
    setRemoteError("");
    setStatus(t("sftp.verifyingHost"));

    (async () => {
      try {
        if (!commands) {
          throw new Error("file-browser commands adapter not initialized");
        }
        if (commands.capabilities.verifySshHostKey && usesNativeSshHostKeyVerification(connection)) {
          const preview = await invokeCommand("inspect_ssh_host_key", {
            request: {
              host: connection.host,
              port: connection.port,
            },
          });
          await confirmTrustedSshHostKey(preview);
        }

        setStatus(t("sftp.openingSftp"));
        const result = await commands.startSession({
          sessionId: requestedSessionId,
          path: ".",
        });

        if (disposed) {
          void commands.closeSession(result.sessionId);
          return;
        }

        sessionIdRef.current = result.sessionId;
        sessionStarted = true;
        markConnectionSessionStarted(connection.id);
        setRemotePath(result.path);
        setRemoteFiles(result.entries.map(remoteEntryToFileEntry));
        rememberRemotePath(result.path);
        setSelectedRemoteNames([]);
        setStatus(t("sftp.connected"));
      } catch (error) {
        if (!disposed) {
          const message = error instanceof Error ? error.message : String(error);
          setStatus(message);
          setRemoteError(message);
          setRemoteFiles([]);
        }
      } finally {
        if (!disposed) {
          setIsRemoteLoading(false);
        }
      }
    })();

    return () => {
      disposed = true;
      const sessionId =
        sessionIdRef.current === requestedSessionId ? sessionIdRef.current : requestedSessionId;
      if (sessionId && commands) {
        void commands.closeSession(sessionId);
      }
      if (sessionStarted) {
        markConnectionSessionEnded(connection.id);
      }
      if (sessionIdRef.current === requestedSessionId) {
        sessionIdRef.current = null;
      }
    };
  }, [commands, connection, isLocalFilesBrowser, markConnectionSessionEnded, markConnectionSessionStarted, t]);

  const refreshRemoteDirectory = async () => {
    await loadRemoteDirectory(remotePath, t("sftp.refreshing"));
  };

  const loadRemoteDirectory = async (path: string, loadingStatus = t("sftp.openingFolder")) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !isTauriRuntime() || !commands) {
      return;
    }

    setIsRemoteLoading(true);
    setStatus(loadingStatus);
    try {
      const result = await commands.listDirectory({ sessionId, path });
      setRemotePath(result.path);
      setRemoteFiles(result.entries.map(remoteEntryToFileEntry));
      rememberRemotePath(result.path);
      setSelectedRemoteNames([]);
      setStatus(t("sftp.connected"));
    } catch (error) {
      setStatus(String(error));
    } finally {
      setIsRemoteLoading(false);
    }
  };

  const openRemoteFolder = async (folderName: string) => {
    await loadRemoteDirectory(joinRemotePath(remotePath, folderName));
  };

  const openRemoteParent = async () => {
    await loadRemoteDirectory(joinRemotePath(remotePath, ".."));
  };

  const isLocalDrivePicker = localPath === WINDOWS_DRIVES_PATH;

  const refreshLocalDirectory = async () => {
    await loadLocalDirectory(localPath || undefined);
  };

  const openLocalFolder = async (folderName: string) => {
    await loadLocalDirectory(
      isLocalDrivePicker ? folderName : joinLocalPath(localPath, folderName),
    );
  };

  const openLocalParent = async () => {
    await loadLocalDirectory(
      isLocalDrivePicker || isWindowsDriveRoot(localPath)
        ? WINDOWS_DRIVES_PATH
        : joinLocalPath(localPath, ".."),
    );
  };

  const setTransferState = (id: string, patch: Partial<TransferRecord>) => {
    setTransfers((current) =>
      current.map((transfer) => (transfer.id === id ? { ...transfer, ...patch } : transfer)),
    );
  };

  const resolveTransferConflict = (decision: TransferConflictDecision) => {
    transferConflictResolverRef.current?.(decision);
    transferConflictResolverRef.current = null;
    setTransferConflict(null);
  };

  const promptTransferConflict = (conflict: TransferConflictState) =>
    new Promise<TransferConflictDecision>((resolve) => {
      transferConflictResolverRef.current = resolve;
      setTransferConflict(conflict);
    });

  const conflictTargetPath = (direction: TransferDirection, fileName: string) =>
    direction === "upload" ? joinRemotePath(remotePath, fileName) : joinLocalPath(localPath, fileName);

  const destinationHasVisibleConflict = (direction: TransferDirection, fileName: string) => {
    const targetFiles = direction === "upload" ? remoteFiles : localFiles;
    return targetFiles.some((file) =>
      direction === "download"
        ? file.name.localeCompare(fileName, undefined, { sensitivity: "accent" }) === 0
        : file.name === fileName,
    );
  };

  const isExistingDestinationError = (message: string) =>
    /already exists/i.test(message) || /destination .*exists/i.test(message);

  const conflictPathFromError = (message: string, fallbackPath: string) => {
    const match = message.match(/already exists:\s*(.+)$/i);
    return match?.[1]?.trim() || fallbackPath;
  };

  const runQueuedTransfer = async (transfer: TransferRecord) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !isTauriRuntime()) {
      setTransferState(transfer.id, {
        state: "failed",
        progress: 100,
        detail: t("sftp.sessionUnavailable"),
      });
      activeTransferIdRef.current = null;
      return;
    }

    setTransferState(transfer.id, {
      state: "active",
      detail: t("sftp.preparing"),
    });

    try {
      if (!commands) throw new Error("commands adapter not initialized");
      const result =
        transfer.direction === "upload"
          ? await commands.uploadPath({
              sessionId,
              transferId: transfer.id,
              localPath: transfer.localPath ?? "",
              remoteDirectory: transfer.remoteDirectory ?? remotePath,
              overwriteBehavior: transfer.overwriteBehavior,
            })
          : await commands.downloadPath({
              sessionId,
              transferId: transfer.id,
              remotePath: transfer.remotePath ?? "",
              localDirectory: transfer.localDirectory ?? localPath,
              overwriteBehavior: transfer.overwriteBehavior,
            });

      if (transfer.deleteSourceWhenDone) {
        if (transfer.deleteSourceWhenDone.side === "local") {
          await invokeCommand("delete_local_path", {
            request: { path: transfer.deleteSourceWhenDone.path },
          });
        } else {
          await commands.deletePath({
            sessionId,
            path: transfer.deleteSourceWhenDone.path,
          });
        }
      }

      setTransferState(transfer.id, {
        state: "done",
        progress: 100,
        detail: formatTransferResult(result),
      });

      if (transfer.direction === "upload") {
        await refreshRemoteDirectory();
        if (transfer.deleteSourceWhenDone?.side === "local") {
          await refreshLocalDirectory();
        }
      } else {
        await refreshLocalDirectory();
        if (transfer.deleteSourceWhenDone?.side === "remote") {
          await refreshRemoteDirectory();
        }
        if (transfer.openWhenDone) {
          await openFilesystemPath(transfer.openWhenDone);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        transfer.overwriteBehavior !== "overwrite" &&
        isExistingDestinationError(message) &&
        overwriteAllConflictsRef.current[transfer.direction]
      ) {
        setTransferState(transfer.id, {
          state: "queued",
          progress: 0,
          detail: t("sftp.waitingToOverwrite"),
          overwriteBehavior: "overwrite",
        });
        return;
      }

      if (
        transfer.overwriteBehavior !== "overwrite" &&
        isExistingDestinationError(message) &&
        !overwriteAllConflictsRef.current[transfer.direction]
      ) {
        const decision = await promptTransferConflict({
          direction: transfer.direction,
          name: transfer.name,
          targetPath: conflictPathFromError(
            message,
            transfer.direction === "upload"
              ? joinRemotePath(transfer.remoteDirectory ?? remotePath, transfer.name)
              : joinLocalPath(transfer.localDirectory ?? localPath, transfer.name),
          ),
          isFolder: false,
          remainingConflicts: transfers.filter(
            (queuedTransfer) =>
              queuedTransfer.direction === transfer.direction && queuedTransfer.state === "queued",
          ).length,
        });

        if (decision === "overwrite" || decision === "overwriteAll") {
          if (decision === "overwriteAll") {
            overwriteAllConflictsRef.current[transfer.direction] = true;
            setTransfers((current) =>
              current.map((queuedTransfer) =>
                queuedTransfer.direction === transfer.direction && queuedTransfer.state === "queued"
                  ? { ...queuedTransfer, overwriteBehavior: "overwrite" }
                  : queuedTransfer,
              ),
            );
          }
          setTransferState(transfer.id, {
            state: "queued",
            progress: 0,
            detail: t("sftp.waitingToOverwrite"),
            overwriteBehavior: "overwrite",
          });
          return;
        }

        setTransferState(transfer.id, {
          state: decision === "skip" ? "canceled" : "failed",
          progress: 100,
          detail: decision === "skip" ? t("sftp.skippedExisting") : t("sftp.transferCanceled"),
        });
        return;
      }

      setTransferState(transfer.id, {
        state: message.includes("transfer canceled") ? "canceled" : "failed",
        progress: 100,
        detail: message.includes("transfer canceled") ? t("sftp.canceled") : message,
      });
    } finally {
      activeTransferIdRef.current = null;
      setTransfers((current) => [...current]);
    }
  };

  useEffect(() => {
    if (activeTransferIdRef.current) {
      return;
    }

    const nextTransfer = transfers.find((transfer) => transfer.state === "queued");
    if (!nextTransfer) {
      return;
    }

    activeTransferIdRef.current = nextTransfer.id;
    void runQueuedTransfer(nextTransfer);
  }, [transfers]);

  useEffect(() => {
    if (transfers.some((transfer) => transfer.state === "queued" || transfer.state === "active")) {
      return;
    }

    overwriteAllConflictsRef.current = {
      upload: false,
      download: false,
    };
  }, [transfers]);

  const enqueueTransfers = async (direction: TransferDirection, names: string[]) => {
    const sessionId = sessionIdRef.current;
    const selected =
      direction === "upload"
        ? localFiles.filter((file) => names.includes(file.name))
        : remoteFiles.filter((file) => names.includes(file.name));
    if (!sessionId || selected.length === 0 || !localPath || !isTauriRuntime()) {
      return;
    }
    if (direction === "upload" && isLocalDrivePicker) {
      return;
    }

    const visibleConflictCount = selected.filter((file) =>
      destinationHasVisibleConflict(direction, file.name),
    ).length;
    let batchOverwriteAll = overwriteAllConflictsRef.current[direction];
    let promptedConflictCount = 0;
    const nextTransfers: TransferRecord[] = [];

    for (const file of selected) {
      let overwriteBehavior: SftpSettings["overwriteBehavior"] = "fail";
      if (destinationHasVisibleConflict(direction, file.name)) {
        if (!batchOverwriteAll) {
          const decision = await promptTransferConflict({
            direction,
            name: file.name,
            targetPath: conflictTargetPath(direction, file.name),
            isFolder: file.kind === "folder",
            remainingConflicts: Math.max(visibleConflictCount - promptedConflictCount - 1, 0),
          });
          promptedConflictCount += 1;

          if (decision === "cancel") {
            break;
          }
          if (decision === "skip") {
            continue;
          }
          if (decision === "overwriteAll") {
            batchOverwriteAll = true;
            overwriteAllConflictsRef.current[direction] = true;
          }
        }

        overwriteBehavior = "overwrite";
      }

      nextTransfers.push({
        id: uniqueRuntimeId(direction),
        direction,
        name: file.name,
        state: "queued",
        progress: 0,
        detail: t("sftp.waiting"),
        overwriteBehavior,
        localPath: direction === "upload" ? joinLocalPath(localPath, file.name) : undefined,
        remoteDirectory: direction === "upload" ? remotePath : undefined,
        remotePath: direction === "download" ? joinRemotePath(remotePath, file.name) : undefined,
        localDirectory: direction === "download" ? localPath : undefined,
      });
    }

    if (nextTransfers.length > 0) {
      setTransfers((current) => [...current, ...nextTransfers]);
    }
  };

  const handleUpload = (names = selectedLocalNames) => {
    void enqueueTransfers("upload", names);
  };

  const enqueueDroppedLocalPaths = async (paths: string[]) => {
    const sessionId = sessionIdRef.current;
    const uniquePaths = Array.from(new Set(paths.map((path) => path.trim()).filter(Boolean)));
    if (!sessionId || uniquePaths.length === 0 || !isTauriRuntime()) {
      return;
    }

    const nextTransfers = uniquePaths.flatMap((path): TransferRecord[] => {
      const name = localNameFromPath(path);
      return name
        ? [
            {
              id: uniqueRuntimeId("upload"),
              direction: "upload",
              name,
              state: "queued",
              progress: 0,
              detail: t("sftp.waiting"),
              overwriteBehavior: "fail",
              localPath: path,
              remoteDirectory: remotePath,
            },
          ]
        : [];
    });

    if (nextTransfers.length > 0) {
      setTransfers((current) => [...current, ...nextTransfers]);
    }
  };
  enqueueDroppedLocalPathsRef.current = (paths) => {
    void enqueueDroppedLocalPaths(paths);
  };

  const handleDownload = (names = selectedRemoteNames) => {
    void enqueueTransfers("download", names);
  };

  const selectedPathsForMenu = (menu: SftpContextMenuState) => {
    const files = menu.side === "local" ? localFiles : remoteFiles;
    return menu.names
      .filter((name) => files.some((file) => file.name === name))
      .map((name) =>
        menu.side === "local"
          ? isLocalDrivePicker
            ? name
            : joinLocalPath(localPath, name)
          : joinRemotePath(remotePath, name),
      );
  };

  const writeFileClipboard = async (
    menu: SftpContextMenuState,
    operation: LocalFileClipboardOperation,
  ) => {
    const paths = selectedPathsForMenu(menu);
    if (paths.length === 0) {
      return;
    }

    setFileClipboard({
      operation,
      side: menu.side,
      paths,
      names: menu.names,
    });

    if (menu.side === "local" && isTauriRuntime()) {
      await invokeCommand("set_local_file_clipboard", {
        request: { operation, paths },
      }).catch(() => undefined);
    }
  };

  const readClipboardForPaste = async () => {
    if (!isTauriRuntime()) {
      return fileClipboard;
    }
    if (fileClipboard?.side === "remote") {
      return fileClipboard;
    }

    const nativeClipboard = await invokeCommand("read_local_file_clipboard").catch(() => null);
    if (nativeClipboard?.paths.length) {
      return {
        operation: nativeClipboard.operation,
        side: "local" as const,
        paths: nativeClipboard.paths,
        names: nativeClipboard.paths.map(localNameFromPath).filter(Boolean),
      };
    }

    return fileClipboard;
  };

  const pasteLocalPaths = async (
    operation: LocalFileClipboardOperation,
    paths: string[],
    targetSide: FilePaneSide,
  ) => {
    const uniquePaths = Array.from(new Set(paths.map((path) => path.trim()).filter(Boolean)));
    if (uniquePaths.length === 0 || !isTauriRuntime()) {
      return;
    }

    if (targetSide === "local") {
      if (!localPath || isLocalDrivePicker) {
        return;
      }
      setIsLocalLoading(true);
      setLocalStatus(t("sftp.waiting"));
      try {
        for (const path of uniquePaths) {
          await invokeCommand(operation === "cut" ? "move_local_path" : "copy_local_path", {
            request: { sourcePath: path, destinationDirectory: localPath },
          });
        }
        await refreshLocalDirectory();
        if (operation === "cut") {
          setFileClipboard(null);
        }
      } catch (error) {
        setLocalStatus(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLocalLoading(false);
      }
      return;
    }

    if (!sessionIdRef.current || !commands || isLocalFilesBrowser || isTransferring) {
      return;
    }

    const nextTransfers = uniquePaths.flatMap((path): TransferRecord[] => {
      const name = localNameFromPath(path);
      return name
        ? [
            {
              id: uniqueRuntimeId("upload"),
              direction: "upload",
              name,
              state: "queued",
              progress: 0,
              detail: t("sftp.waiting"),
              overwriteBehavior: "fail",
              localPath: path,
              remoteDirectory: remotePath,
              deleteSourceWhenDone: operation === "cut" ? { side: "local", path } : undefined,
            },
          ]
        : [];
    });
    if (nextTransfers.length > 0) {
      setTransfers((current) => [...current, ...nextTransfers]);
      if (operation === "cut") {
        setFileClipboard(null);
      }
    }
  };

  const pasteRemotePaths = async (
    operation: LocalFileClipboardOperation,
    paths: string[],
    targetSide: FilePaneSide,
  ) => {
    if (targetSide !== "local" || !localPath || isLocalDrivePicker || !sessionIdRef.current || !commands) {
      return;
    }
    const selected = paths
      .map((path) => ({ path, name: remoteNameFromPath(path) }))
      .filter((entry) => entry.name.length > 0);
    const nextTransfers = selected.map((entry): TransferRecord => ({
      id: uniqueRuntimeId("download"),
      direction: "download",
      name: entry.name,
      state: "queued",
      progress: 0,
      detail: t("sftp.waiting"),
      overwriteBehavior: "fail",
      remotePath: entry.path,
      localDirectory: localPath,
      deleteSourceWhenDone: operation === "cut" ? { side: "remote", path: entry.path } : undefined,
    }));
    if (nextTransfers.length > 0) {
      setTransfers((current) => [...current, ...nextTransfers]);
      if (operation === "cut") {
        setFileClipboard(null);
      }
    }
  };

  const handleOpenLocalFile = async (fileName: string) => {
    const file = localFiles.find((entry) => entry.name === fileName);
    if (!file || file.kind !== "file" || !localPath || isLocalDrivePicker || !isTauriRuntime()) {
      return;
    }

    try {
      await openFilesystemPath(joinLocalPath(localPath, file.name));
    } catch (error) {
      setLocalStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const handleRenameLocalPath = async (currentName: string, newName: string) => {
    const selected = localFiles.find((file) => file.name === currentName);
    if (!selected || !localPath || isLocalDrivePicker || !isTauriRuntime()) {
      return;
    }

    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === selected.name) {
      return;
    }

    setIsLocalLoading(true);
    setLocalStatus(t("sftp.renaming"));
    try {
      await invokeCommand("rename_local_path", {
        request: {
          path: joinLocalPath(localPath, selected.name),
          newName: trimmedName,
        },
      });
      await refreshLocalDirectory();
    } catch (error) {
      setLocalStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handleDeleteLocalPath = async (names = selectedLocalNames) => {
    const selected = localFiles.filter((file) => names.includes(file.name));
    if (!localPath || isLocalDrivePicker || selected.length === 0 || !isTauriRuntime()) {
      return;
    }

    setDeleteRequest({
      side: "local",
      items: selected.map((item) => ({ kind: item.kind, name: item.name })),
    });
  };

  const handleOpenRemoteFile = async (fileName: string) => {
    const file = remoteFiles.find((entry) => entry.name === fileName);
    const sessionId = sessionIdRef.current;
    if (!file || file.kind !== "file" || !sessionId || !localPath || isLocalDrivePicker || !isTauriRuntime() || !commands) {
      return;
    }

    const remoteFilePath = joinRemotePath(remotePath, file.name);
    const localFilePath = joinLocalPath(localPath, file.name);
    let overwriteBehavior: SftpSettings["overwriteBehavior"] = "fail";
    if (destinationHasVisibleConflict("download", file.name)) {
      const decision = await promptTransferConflict({
        direction: "download",
        name: file.name,
        targetPath: localFilePath,
        isFolder: false,
        remainingConflicts: 0,
      });
      if (decision === "cancel" || decision === "skip") {
        setTransfers((current) => [
          ...current,
          {
            id: uniqueRuntimeId("download"),
            direction: "download",
            name: file.name,
            state: "canceled",
            progress: 100,
            detail: decision === "skip" ? t("sftp.skippedExisting") : t("sftp.transferCanceled"),
            overwriteBehavior,
            remotePath: remoteFilePath,
            localDirectory: localPath,
          },
        ]);
        return;
      }
      overwriteBehavior = "overwrite";
    }

    const transfer: TransferRecord = {
      id: uniqueRuntimeId("download"),
      direction: "download",
      name: file.name,
      state: "queued",
      progress: 0,
      detail: t("sftp.waiting"),
      overwriteBehavior,
      remotePath: remoteFilePath,
      localDirectory: localPath,
      openWhenDone: localFilePath,
    };
    setTransfers((current) => [...current, transfer]);
  };

  const handleCancelTransfer = async (transfer: TransferRecord) => {
    if (transfer.state === "queued") {
      setTransferState(transfer.id, {
        state: "canceled",
        progress: 100,
        detail: t("sftp.canceledBeforeStart"),
      });
      return;
    }

    if (transfer.state !== "active") {
      return;
    }

    setTransferState(transfer.id, { detail: t("sftp.canceling") });
    try {
      if (!commands) throw new Error("commands adapter not initialized");
      await commands.cancelTransfer({ transferId: transfer.id });
    } catch (error) {
      setTransferState(transfer.id, {
        state: "failed",
        progress: 100,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleCreateRemoteFolder = () => {
    if (!sessionIdRef.current || !isTauriRuntime() || !commands) {
      return;
    }

    setNewRemoteFolderOpen(true);
  };

  const handleConfirmCreateRemoteFolder = async (name: string) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !isTauriRuntime() || !commands) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setStatus(t("sftp.folderNameBlank"));
      return;
    }

    setNewRemoteFolderOpen(false);
    setIsRemoteLoading(true);
    setStatus(t("sftp.creatingFolder"));
    try {
      await commands.createFolder({
        sessionId,
        parentPath: remotePath,
        name: trimmedName,
      });
      await refreshRemoteDirectory();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRemoteLoading(false);
    }
  };

  const handleRenameRemotePath = async (currentName: string, newName: string) => {
    const sessionId = sessionIdRef.current;
    const selected = remoteFiles.find((file) => file.name === currentName);
    if (!sessionId || !selected || !isTauriRuntime() || !commands) {
      return;
    }

    const trimmedName = newName.trim();
    if (!trimmedName) {
      setStatus(t("sftp.remoteNameBlank"));
      return;
    }
    if (trimmedName === selected.name) {
      return;
    }

    setIsRemoteLoading(true);
    setStatus(t("sftp.renaming"));
    try {
      await commands.renamePath({
        sessionId,
        path: joinRemotePath(remotePath, selected.name),
        newName: trimmedName,
      });
      await refreshRemoteDirectory();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRemoteLoading(false);
    }
  };

  const handleDeleteRemotePath = async (names = selectedRemoteNames) => {
    const selected = remoteFiles.filter((file) => names.includes(file.name));
    if (!sessionIdRef.current || selected.length === 0 || !isTauriRuntime() || !commands) {
      return;
    }

    setDeleteRequest({
      side: "remote",
      items: selected.map((item) => ({ kind: item.kind, name: item.name })),
    });
  };

  const handleConfirmDeletePath = async () => {
    const sessionId = sessionIdRef.current;
    const request = deleteRequest;
    if (!request || !isTauriRuntime()) {
      return;
    }

    setDeleteRequest(null);
    try {
      if (request.side === "local") {
        setIsLocalLoading(true);
        setLocalStatus(t("sftp.deleting"));
        for (const item of request.items) {
          await invokeCommand("delete_local_path", {
            request: { path: joinLocalPath(localPath, item.name) },
          });
        }
        await refreshLocalDirectory();
        return;
      }

      if (!sessionId || !commands) {
        return;
      }
      setIsRemoteLoading(true);
      setStatus(t("sftp.deleting"));
      for (const item of request.items) {
        await commands.deletePath({
          sessionId,
          path: joinRemotePath(remotePath, item.name),
        });
      }
      await refreshRemoteDirectory();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (request.side === "local") {
        setLocalStatus(message);
      } else {
        setStatus(message);
      }
    } finally {
      setIsLocalLoading(false);
      setIsRemoteLoading(false);
    }
  };

  const handleOpenTerminalHere = () => {
    if (!connection || !isConnected || !commands?.capabilities.openTerminalHere) {
      return;
    }

    openTerminalHere(connection, remotePath);
  };

  const selectedLocalFiles = localFiles.filter((file) => selectedLocalNames.includes(file.name));
  const selectedRemoteFiles = remoteFiles.filter((file) => selectedRemoteNames.includes(file.name));

  const handleDropTransfer = (targetSide: FilePaneSide, names: string[]) => {
    if (targetSide === "remote") {
      handleUpload(names);
      return;
    }

    if (!isLocalDrivePicker) {
      handleDownload(names);
    }
  };

  const handleOpenContextMenu = (
    side: FilePaneSide,
    names: string[],
    event: ReactMouseEvent,
  ) => {
    event.preventDefault();
    const fallbackNames = side === "local" ? selectedLocalNames : selectedRemoteNames;
    const nextNames = names.length > 0 ? names : fallbackNames;

    if (side === "local" && nextNames.length > 0) {
      setSelectedLocalNames(nextNames);
    } else if (side === "remote" && nextNames.length > 0) {
      setSelectedRemoteNames(nextNames);
    }

    setContextMenu({
      side,
      names: nextNames,
      x: event.clientX,
      y: event.clientY,
      mutable: side === "local" ? !isLocalDrivePicker : isConnected && !isTransferring,
      canPaste: side === "local" ? !isLocalDrivePicker : isConnected && !isTransferring,
      openable:
        nextNames.length === 1 &&
        (side === "local" ? localFiles : remoteFiles).some(
          (file) => file.name === nextNames[0] && file.kind === "file",
        ),
    });
  };

  const handleContextTransfer = (menu: SftpContextMenuState) => {
    if (menu.side === "local") {
      handleUpload(menu.names);
    } else {
      handleDownload(menu.names);
    }
    setContextMenu(null);
  };

  const handleContextOpen = (menu: SftpContextMenuState) => {
    const name = menu.names[0];
    if (name) {
      if (menu.side === "local") {
        void handleOpenLocalFile(name);
      } else {
        void handleOpenRemoteFile(name);
      }
    }
    setContextMenu(null);
  };

  const handleContextRename = (menu: SftpContextMenuState) => {
    if (menu.side === "local" && menu.names.length === 1 && menu.mutable) {
      setSelectedLocalNames(menu.names);
      setRenameRequest({
        side: "local",
        name: menu.names[0],
        requestId: Date.now(),
      });
    } else if (menu.side === "remote" && menu.names.length === 1 && menu.mutable) {
      setSelectedRemoteNames(menu.names);
      setRenameRequest({
        side: "remote",
        name: menu.names[0],
        requestId: Date.now(),
      });
    }
    setContextMenu(null);
  };

  const handleContextCut = (menu: SftpContextMenuState) => {
    void writeFileClipboard(menu, "cut");
    setContextMenu(null);
  };

  const handleContextCopy = (menu: SftpContextMenuState) => {
    void writeFileClipboard(menu, "copy");
    setContextMenu(null);
  };

  const handleContextPaste = (menu: SftpContextMenuState) => {
    void (async () => {
      const clipboard = await readClipboardForPaste();
      if (!clipboard || clipboard.paths.length === 0) {
        return;
      }
      if (clipboard.side === "local") {
        await pasteLocalPaths(clipboard.operation, clipboard.paths, menu.side);
      } else {
        await pasteRemotePaths(clipboard.operation, clipboard.paths, menu.side);
      }
    })();
    setContextMenu(null);
  };

  const handleContextCopyPath = (menu: SftpContextMenuState) => {
    const name = menu.names[0];
    if (name) {
      const fullPath =
        menu.side === "local"
          ? isLocalDrivePicker
            ? name
            : joinLocalPath(localPath, name)
          : joinRemotePath(remotePath, name);
      void navigator.clipboard?.writeText(fullPath);
    }
    setContextMenu(null);
  };

  const handleContextDelete = (menu: SftpContextMenuState) => {
    if (menu.side === "local") {
      void handleDeleteLocalPath(menu.names);
    } else if (menu.side === "remote") {
      void handleDeleteRemotePath(menu.names);
    }
    setContextMenu(null);
  };

  const handleOpenProperties = async (side: FilePaneSide, names: string[]) => {
    const name = names[0];
    const entry =
      side === "local"
        ? localFiles.find((file) => file.name === name)
        : remoteFiles.find((file) => file.name === name);
    if (!entry) {
      return;
    }

    const path =
      side === "local"
        ? isLocalDrivePicker
          ? entry.name
          : joinLocalPath(localPath, entry.name)
        : joinRemotePath(remotePath, entry.name);
    let remoteProperties: SftpPathProperties | undefined;
    if (side === "remote") {
      const sessionId = sessionIdRef.current;
      if (!sessionId || !isTauriRuntime() || !commands) {
        setStatus(t("sftp.sessionUnavailable"));
        return;
      }

      try {
        remoteProperties = await commands.pathProperties({ sessionId, path });
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error));
      }
    }

    setPropertiesState({ side, entry, path, remoteProperties });
  };

  const handleContextProperties = (menu: SftpContextMenuState) => {
    void handleOpenProperties(menu.side, menu.names);
    setContextMenu(null);
  };

  const handleUpdateRemoteProperties = async (request: {
    permissions?: string;
    uid?: number;
    gid?: number;
  }) => {
    const sessionId = sessionIdRef.current;
    if (
      !sessionId ||
      !propertiesState ||
      propertiesState.side !== "remote" ||
      !isTauriRuntime() ||
      !commands ||
      !commands.capabilities.editPermissions
    ) {
      return;
    }

    try {
      const remoteProperties = await commands.updatePathProperties({
        sessionId,
        path: propertiesState.path,
        ...request,
      });
      setPropertiesState((current) =>
        current ? { ...current, remoteProperties } : current,
      );
      await refreshRemoteDirectory();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const isConnected = status === t("sftp.connected") && Boolean(sessionIdRef.current);
  const isTransferring = transfers.some((transfer) => transfer.state === "active");
  const clearableTransferCount = transfers.filter((transfer) =>
    TRANSFER_HISTORY_STATES.includes(transfer.state),
  ).length;
  const toolbarTitle = tab.toolbarTitle ?? (connection ? connectionToolbarTitle(connection) : tab.title);
  const kindLabel =
    tab.kind === "ftp"
      ? t("sftp.protocolFtp")
      : tab.kind === "localFiles"
        ? t("sftp.protocolFiles")
        : t("sftp.protocolSftp");
  const kindIconSrc = fileBrowserConnectionIconSrc(
    tab.kind === "localFiles" ? "localFiles" : tab.kind === "ftp" ? "ftp" : "sftp",
  );
  const hasRemoteHost = !isLocalFilesBrowser && Boolean(connection);
  const hostLabel = tab.subtitle || toolbarTitle;
  const connectionStatusLabel = isConnected
    ? t("sftp.connected")
    : remoteError
      ? t("sftp.notConnected")
      : t("sftp.connecting");
  const connectionStatusState = isConnected ? "connected" : remoteError ? "error" : "connecting";

  useEffect(() => {
    if (isLocalFilesBrowser || !isActive || !isConnected || isTransferring || !isTauriRuntime()) {
      setIsRemoteDropTarget(false);
      return;
    }

    let disposed = false;
    let unlisten: (() => void) | null = null;
    void getCurrentWebview().onDragDropEvent((event) => {
      if (disposed) {
        return;
      }

      if (event.payload.type === "over") {
        const isOverRemotePane = isPositionOverRemotePane(event.payload.position.x, event.payload.position.y);
        setIsRemoteDropTarget(isOverRemotePane);
      } else if (event.payload.type === "drop") {
        const isOverRemotePane = isPositionOverRemotePane(event.payload.position.x, event.payload.position.y);
        setIsRemoteDropTarget(false);
        if (isOverRemotePane) {
          enqueueDroppedLocalPathsRef.current(event.payload.paths);
        }
      } else {
        setIsRemoteDropTarget(false);
      }
    }).then((dispose) => {
      if (disposed) {
        dispose();
      } else {
        unlisten = dispose;
      }
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [isActive, isConnected, isLocalFilesBrowser, isTransferring]);

  useEffect(() => {
    if (isLocalFilesBrowser || !commands || !isTauriRuntime()) {
      return;
    }
    const controller: FileBrowserController = {
      kind: tab.kind === "ftp" ? "ftp" : "sftp",
      list: async (path) => {
        const sessionId = sessionIdRef.current;
        if (!sessionId) {
          throw new Error(t("sftp.sessionUnavailable"));
        }
        return commands.listDirectory({ sessionId, path: path?.trim() || remotePath });
      },
      createFolder: async (parentPath, name) => {
        const sessionId = sessionIdRef.current;
        if (!sessionId) {
          throw new Error(t("sftp.sessionUnavailable"));
        }
        const result = await commands.createFolder({ sessionId, parentPath, name });
        await refreshRemoteDirectory();
        return result ?? { ok: true };
      },
      rename: async (path, newName) => {
        const sessionId = sessionIdRef.current;
        if (!sessionId) {
          throw new Error(t("sftp.sessionUnavailable"));
        }
        const result = await commands.renamePath({ sessionId, path, newName });
        await refreshRemoteDirectory();
        return result ?? { ok: true };
      },
      deletePath: async (path) => {
        const sessionId = sessionIdRef.current;
        if (!sessionId) {
          throw new Error(t("sftp.sessionUnavailable"));
        }
        const result = await commands.deletePath({ sessionId, path });
        await refreshRemoteDirectory();
        return result ?? { ok: true };
      },
      snapshot: () => ({
        kind: tab.kind === "ftp" ? "ftp" : "sftp",
        tabId: tab.id,
        connectionId: connection?.id,
        connectionName: connection?.name,
        remotePath,
        remoteFiles,
        selectedRemoteNames,
        status,
      }),
    };
    registerFileBrowserController(tab.id, controller);
    return () => unregisterFileBrowserController(tab.id, controller);
  }, [commands, connection?.id, connection?.name, isLocalFilesBrowser, remoteFiles, remotePath, selectedRemoteNames, status, t, tab.id, tab.kind]);

  return (
    <section
      className={isActive ? "sftp-workspace active" : "sftp-workspace"}
      data-color-scheme={resolveAppliedColorScheme(appearanceSettings.colorScheme)}
      data-selected-color-scheme={appearanceSettings.colorScheme}
      ref={workspaceRef}
    >
      <div className="workspace-toolbar sftp-toolbar" data-tutorial-id="sftp.toolbar">
        <span className="sftp-bar-left">
          <span className="sftp-bar-kind">
            <img alt="" aria-hidden="true" draggable={false} height={18} src={kindIconSrc} width={18} />
            {kindLabel}
          </span>
          {hasRemoteHost ? (
            <span className="sftp-conn-pill" data-state={connectionStatusState}>
              <span className="dot" />
              {connectionStatusLabel}
            </span>
          ) : null}
        </span>
        <span className="sftp-bar-center" title={hasRemoteHost ? hostLabel : undefined}>
          {hasRemoteHost ? hostLabel : null}
        </span>
        <span className="sftp-bar-right">
          {!inline && commands?.capabilities.openTerminalHere ? (
            <button
              className="toolbar-button"
              data-tutorial-id="sftp.terminal"
              disabled={!isConnected}
              onClick={handleOpenTerminalHere}
              type="button"
            >
              <Terminal size={15} />
              {t("sftp.terminal")}
            </button>
          ) : null}
          {onClose ? (
            <button
              className="sftp-bar-close"
              aria-label={t("common.close")}
              onClick={onClose}
              type="button"
            >
              <X size={16} />
            </button>
          ) : null}
        </span>
      </div>

      <div className={isLocalFilesBrowser ? "sftp-panes sftp-panes-single" : "sftp-panes"}>
        <FilePane
          side="local"
          title={t("sftp.local")}
          path={isLocalDrivePicker ? t("sftp.windowsDrives") : localPath || localStatus || t("sftp.localFiles")}
          files={localFiles}
          isLoading={isLocalLoading}
          status={localStatus}
          selectedNames={selectedLocalNames}
          onRefresh={refreshLocalDirectory}
          onGoUp={openLocalParent}
          onRenameSelected={!isLocalDrivePicker ? handleRenameLocalPath : undefined}
          onDeleteSelected={!isLocalDrivePicker ? handleDeleteLocalPath : undefined}
          onOpenFolder={openLocalFolder}
          onOpenFile={(fileName) => void handleOpenLocalFile(fileName)}
          onPathSubmit={(path) => void loadLocalDirectory(path)}
          recentPaths={recentLocalPaths}
          onSelectionChange={setSelectedLocalNames}
          onContextMenuRequest={handleOpenContextMenu}
          onDropTransfer={
            !isLocalFilesBrowser && isConnected && !isTransferring && !isLocalDrivePicker ? handleDropTransfer : undefined
          }
          renameRequest={renameRequest?.side === "local" ? renameRequest : undefined}
        />
        {!isLocalFilesBrowser ? (
          <>
            <div className="sftp-gutter">
              <button
                className="sftp-xfer-arrow"
                data-tutorial-id="sftp.upload"
                aria-label={t("sftp.upload")}
                title={t("sftp.upload")}
                disabled={!isConnected || isLocalDrivePicker || selectedLocalFiles.length === 0}
                onClick={() => handleUpload()}
                type="button"
              >
                <DIcon name="forward" size={18} />
              </button>
              <button
                className="sftp-xfer-arrow"
                data-tutorial-id="sftp.download"
                aria-label={t("sftp.download")}
                title={t("sftp.download")}
                disabled={!isConnected || selectedRemoteFiles.length === 0 || !localPath || isLocalDrivePicker}
                onClick={() => handleDownload()}
                type="button"
              >
                <DIcon name="back" size={18} />
              </button>
            </div>
            <FilePane
              side="remote"
              title={t("sftp.remote")}
              path={remotePath}
              files={remoteFiles}
              isLoading={isRemoteLoading}
              status={remoteError ? t("sftp.notConnected") : status === t("sftp.connected") ? "" : status}
              selectedNames={selectedRemoteNames}
              onRefresh={refreshRemoteDirectory}
              onGoUp={openRemoteParent}
              onCreateFolder={isConnected && !isTransferring ? handleCreateRemoteFolder : undefined}
              onRenameSelected={isConnected && !isTransferring ? handleRenameRemotePath : undefined}
              onDeleteSelected={isConnected && !isTransferring ? handleDeleteRemotePath : undefined}
              onOpenFolder={openRemoteFolder}
              onOpenFile={(fileName) => void handleOpenRemoteFile(fileName)}
              onPathSubmit={(path) => void loadRemoteDirectory(path)}
              recentPaths={recentRemotePaths}
              onSelectionChange={setSelectedRemoteNames}
              onContextMenuRequest={handleOpenContextMenu}
              onDropTransfer={isConnected && !isTransferring ? handleDropTransfer : undefined}
              forceDropTarget={isRemoteDropTarget}
              renameRequest={renameRequest?.side === "remote" ? renameRequest : undefined}
            />
          </>
        ) : null}
      </div>

      {!isLocalFilesBrowser ? (
        <TransferArea
          transfers={transfers}
          clearableCount={clearableTransferCount}
          error={remoteError}
          onClear={() =>
            setTransfers((current) =>
              current.filter((transfer) => !TRANSFER_HISTORY_STATES.includes(transfer.state)),
            )
          }
          onCancel={(transfer) => void handleCancelTransfer(transfer)}
        />
      ) : null}
      {contextMenu ? (
        <SftpContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onCopy={handleContextCopy}
          onCopyPath={handleContextCopyPath}
          onCut={handleContextCut}
          onDelete={handleContextDelete}
          onOpen={handleContextOpen}
          onPaste={handleContextPaste}
          onProperties={handleContextProperties}
          onRename={handleContextRename}
          showTransfer={!isLocalFilesBrowser}
          onTransfer={handleContextTransfer}
        />
      ) : null}
      {propertiesState ? (
        <SftpPropertiesPopup
          properties={propertiesState}
          onClose={() => setPropertiesState(null)}
          onSave={(request) => void handleUpdateRemoteProperties(request)}
        />
      ) : null}
      {newRemoteFolderOpen ? (
        <NewRemoteFolderDialog
          onCancel={() => setNewRemoteFolderOpen(false)}
          onCreate={(name) => void handleConfirmCreateRemoteFolder(name)}
        />
      ) : null}
      {deleteRequest ? (
        <ConfirmRemoteDeleteDialog
          request={deleteRequest}
          onCancel={() => setDeleteRequest(null)}
          onConfirm={() => void handleConfirmDeletePath()}
        />
      ) : null}
      {transferConflict ? (
        <TransferConflictDialog
          conflict={transferConflict}
          onDecision={resolveTransferConflict}
        />
      ) : null}
    </section>
  );
}

function TransferArea({
  transfers,
  clearableCount,
  error,
  onClear,
  onCancel,
}: {
  transfers: TransferRecord[];
  clearableCount: number;
  error?: string;
  onClear: () => void;
  onCancel: (transfer: TransferRecord) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const active = transfers.filter(
    (transfer) => transfer.state === "active" || transfer.state === "queued",
  );
  const doneCount = transfers.filter((transfer) => transfer.state === "done").length;
  const averageProgress = active.length
    ? Math.round(active.reduce((sum, transfer) => sum + transfer.progress, 0) / active.length)
    : 0;

  useEffect(() => {
    if (active.length > 0) {
      setOpen(true);
    }
  }, [active.length]);

  let status: string;
  if (error) {
    status = error;
  } else if (active.length) {
    status = t("sftp.transferringStatus", { count: active.length, percent: averageProgress });
  } else if (transfers.length) {
    status = t("sftp.transfersIdleStatus", { count: doneCount });
  } else {
    status = t("sftp.noTransfers");
  }

  return (
    <div className={`sftp-xfer${open ? " open" : ""}${error ? " has-error" : ""}`} data-tutorial-id="sftp.transferQueue">
      <div
        className="sftp-xfer-bar"
        onClick={() => setOpen((value) => !value)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
      >
        <div className="lead">
          <DIcon name={error ? "alert" : active.length ? "refresh" : "check"} size={15} />
          <span className="status" title={error || undefined}>{status}</span>
        </div>
        {active.length > 0 ? (
          <div className="mini-track">
            <div className="mini-fill" style={{ width: `${averageProgress}%` }} />
          </div>
        ) : null}
        <div className="right">
          {transfers.length > 0 ? (
            <button
              className="sftp-icon-btn"
              disabled={clearableCount === 0}
              title={t("sftp.clear")}
              aria-label={t("sftp.clear")}
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
              type="button"
            >
              <DIcon name="trash" size={14} />
            </button>
          ) : null}
          <span className="sftp-xfer-chev">
            <DIcon name="chevdown" size={16} />
          </span>
        </div>
      </div>
      <div className="sftp-xfer-panel">
        <div className="sftp-xfer-panel-inner">
          {transfers.length === 0 ? (
            <div className="sftp-xfer-empty">{t("sftp.transferHint")}</div>
          ) : null}
          {transfers.map((transfer) => (
            <div className="sftp-xfer-row" key={transfer.id}>
              <span className="dir">
                <DIcon name={transfer.direction === "upload" ? "upload" : "download"} size={16} />
              </span>
              <div className="meta">
                <div className="nm">{transfer.name}</div>
                <div className="track">
                  <div className={`fill ${transfer.state}`} style={{ width: `${transfer.progress}%` }} />
                </div>
              </div>
              <span className={`st ${transfer.state}`}>
                {transfer.state === "active"
                  ? `${Math.round(transfer.progress)}%`
                  : t(`sftp.transferState.${transfer.state}`)}
              </span>
              {transfer.state === "active" || transfer.state === "queued" ? (
                <button
                  className="sftp-icon-btn"
                  title={t("sftp.cancelTransferName", { name: transfer.name })}
                  aria-label={t("sftp.cancelTransferName", { name: transfer.name })}
                  onClick={() => onCancel(transfer)}
                  type="button"
                >
                  <DIcon name="close" size={13} />
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function isWindowsDriveRoot(path: string) {
  return /^[A-Za-z]:[\\/]?$/.test(path.trim());
}

function isPositionOverRemotePane(x: number, y: number) {
  return Boolean(
    document
      .elementFromPoint(x, y)
      ?.closest('[data-sftp-pane-side="remote"]'),
  );
}

function localNameFromPath(path: string) {
  const trimmedPath = path.trim().replace(/[\\/]+$/, "");
  const parts = trimmedPath.split(/[\\/]/);
  return parts[parts.length - 1] ?? "";
}

function remoteNameFromPath(path: string) {
  const trimmedPath = path.trim().replace(/\/+$/, "");
  const parts = trimmedPath.split("/");
  return parts[parts.length - 1] ?? "";
}


function readRecentPaths(side: FilePaneSide, connectionId?: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const state = JSON.parse(
      window.localStorage.getItem(FILE_BROWSER_RECENT_PATHS_STORAGE_KEY) || "{}",
    ) as RecentFileBrowserPaths;
    if (side === "local") {
      return normalizeRecentPaths(state.local);
    }

    return normalizeRecentPaths(state.remote?.[remoteRecentPathKey(connectionId)]);
  } catch {
    return [];
  }
}

function writeRecentPaths(side: FilePaneSide, path: string, connectionId?: string) {
  const trimmedPath = path.trim();
  if (!trimmedPath || trimmedPath === WINDOWS_DRIVES_PATH || typeof window === "undefined") {
    return readRecentPaths(side, connectionId);
  }

  let state: RecentFileBrowserPaths = {};
  try {
    state = JSON.parse(
      window.localStorage.getItem(FILE_BROWSER_RECENT_PATHS_STORAGE_KEY) || "{}",
    ) as RecentFileBrowserPaths;
  } catch {
    state = {};
  }

  const currentPaths = side === "local"
    ? normalizeRecentPaths(state.local)
    : normalizeRecentPaths(state.remote?.[remoteRecentPathKey(connectionId)]);
  const nextPaths = [
    trimmedPath,
    ...currentPaths.filter((entry) => entry !== trimmedPath),
  ].slice(0, RECENT_PATH_LIMIT);

  if (side === "local") {
    state = { ...state, local: nextPaths };
  } else {
    state = {
      ...state,
      remote: {
        ...(state.remote ?? {}),
        [remoteRecentPathKey(connectionId)]: nextPaths,
      },
    };
  }

  window.localStorage.setItem(FILE_BROWSER_RECENT_PATHS_STORAGE_KEY, JSON.stringify(state));
  return nextPaths;
}

function normalizeRecentPaths(paths: unknown) {
  return Array.isArray(paths)
    ? paths.filter((path): path is string => typeof path === "string" && path.length > 0).slice(0, RECENT_PATH_LIMIT)
    : [];
}

function remoteRecentPathKey(connectionId?: string) {
  return connectionId || "default";
}

type RecentFileBrowserPaths = {
  local?: string[];
  remote?: Record<string, string[]>;
};

function localEntryToFileEntry(entry: LocalDirectoryEntry): FileEntry {
  return {
    name: entry.name,
    kind: entry.kind,
    size: entry.kind === "folder" ? "-" : formatFileSize(entry.size),
    sizeBytes: entry.size,
    modified: formatRemoteTime(entry.modified),
    modifiedTimestamp: entry.modified,
  };
}

function remoteEntryToFileEntry(entry: SftpDirectoryEntry): FileEntry {
  return {
    name: entry.name,
    kind: entry.kind,
    size: entry.kind === "folder" ? "-" : formatFileSize(entry.size),
    sizeBytes: entry.size,
    modified: formatRemoteTime(entry.modified),
    modifiedTimestamp: entry.modified,
    accessedTimestamp: entry.accessed,
    permissions: entry.permissions,
    mode: entry.permissions === undefined ? undefined : formatMode(entry.permissions),
    uid: entry.uid,
    user: entry.user,
    gid: entry.gid,
    group: entry.group,
  };
}
