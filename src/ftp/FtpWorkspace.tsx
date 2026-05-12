import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import {
  ArrowUp,
  Download,
  Folder,
  FolderPlus,
  File as FileIcon,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useWorkspaceStore } from "../store";
import {
  invokeCommand,
  isTauriRuntime,
  type FtpDirectoryEntry,
  type FtpTransferProgress,
} from "../lib/tauri";
import type { WorkspaceTab } from "../types";

interface FtpWorkspaceProps {
  tab: WorkspaceTab;
  isActive: boolean;
}

interface RemoteRow {
  name: string;
  kind: FtpDirectoryEntry["kind"];
  size?: number;
  modified?: number;
}

function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatTime(unix: number | undefined): string {
  if (!unix) return "";
  return new Date(unix * 1000).toLocaleString();
}

function joinPath(base: string, child: string): string {
  if (child === "..") {
    if (!base || base === "/") return "/";
    const trimmed = base.replace(/\/+$/, "");
    const idx = trimmed.lastIndexOf("/");
    return idx <= 0 ? "/" : trimmed.slice(0, idx);
  }
  if (base.endsWith("/")) return `${base}${child}`;
  return `${base}/${child}`;
}

export function FtpWorkspace({ tab, isActive }: FtpWorkspaceProps) {
  const connection = tab.connection;
  const sftpSettings = useWorkspaceStore((state) => state.sftpSettings);
  const overwriteBehavior = sftpSettings.overwriteBehavior;

  const sessionIdRef = useRef<string | null>(null);
  const [path, setPath] = useState<string>("/");
  const [rows, setRows] = useState<RemoteRow[]>([]);
  const [status, setStatus] = useState<string>("Connecting…");
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [progress, setProgress] = useState<FtpTransferProgress | null>(null);

  const protocolLabel = useMemo(() => {
    const proto = connection?.ftpOptions?.protocol ?? "ftp";
    const tlsMode = connection?.ftpOptions?.tlsMode;
    if (proto === "ftps") {
      return tlsMode === "implicit" ? "FTPS (implicit)" : "FTPS (explicit)";
    }
    if (proto === "sftp") return "SFTP";
    return "FTP";
  }, [connection]);

  const refresh = useCallback(
    async (targetPath: string) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId || !isTauriRuntime()) return;
      setIsBusy(true);
      try {
        const listing = await invokeCommand("list_ftp_directory", {
          request: { sessionId, path: targetPath },
        });
        setPath(listing.path);
        setRows(
          listing.entries.map((entry) => ({
            name: entry.name,
            kind: entry.kind,
            size: entry.size,
            modified: entry.modified,
          })),
        );
        setStatus("Connected");
      } catch (error) {
        setStatus(String(error));
      } finally {
        setIsBusy(false);
      }
    },
    [],
  );

  // Open and close session lifecycle
  useEffect(() => {
    if (!connection || connection.type !== "ftp" || !isTauriRuntime()) {
      return;
    }
    let disposed = false;
    const requestedSessionId = tab.id;
    let sessionStarted = false;

    (async () => {
      try {
        setStatus("Connecting…");
        setIsBusy(true);
        const options = connection.ftpOptions ?? {
          protocol: "ftp" as const,
          mode: "passive" as const,
          transferType: "binary" as const,
          utf8: true,
          showHidden: false,
          ignoreCertErrors: false,
        };
        const result = await invokeCommand("start_ftp_session", {
          request: {
            sessionId: requestedSessionId,
            title: connection.name,
            host: connection.host,
            user: connection.user,
            port: connection.port,
            secretOwnerId: connection.id,
            path: "/",
            options,
          },
        });
        if (disposed) {
          void invokeCommand("close_ftp_session", { sessionId: result.sessionId });
          return;
        }
        sessionIdRef.current = result.sessionId;
        sessionStarted = true;
        setPath(result.path);
        setRows(
          result.entries.map((entry) => ({
            name: entry.name,
            kind: entry.kind,
            size: entry.size,
            modified: entry.modified,
          })),
        );
        setStatus(`Connected via ${protocolLabel}`);
      } catch (error) {
        if (!disposed) {
          setStatus(String(error));
        }
      } finally {
        if (!disposed) setIsBusy(false);
      }
    })();

    return () => {
      disposed = true;
      const sessionId = sessionIdRef.current ?? requestedSessionId;
      if (sessionId && sessionStarted) {
        void invokeCommand("close_ftp_session", { sessionId });
      }
      sessionIdRef.current = null;
    };
  }, [connection, protocolLabel, tab.id]);

  // Transfer progress events
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    if (!isTauriRuntime()) return;
    void listen<FtpTransferProgress>("ftp://transfer-progress", (event) => {
      setProgress(event.payload);
    }).then((un) => {
      unlisten = un;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const handleEntryDoubleClick = useCallback(
    (entry: RemoteRow) => {
      if (entry.kind === "directory") {
        const next = joinPath(path, entry.name);
        void refresh(next);
      }
    },
    [path, refresh],
  );

  const goUp = useCallback(() => {
    void refresh(joinPath(path, ".."));
  }, [path, refresh]);

  const reload = useCallback(() => {
    void refresh(path);
  }, [path, refresh]);

  const handleDelete = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !selected) return;
    const target = joinPath(path, selected);
    if (!window.confirm(`Delete ${target}?`)) return;
    try {
      setIsBusy(true);
      await invokeCommand("delete_ftp_path", {
        request: { sessionId, path: target },
      });
      setSelected(null);
      await refresh(path);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setIsBusy(false);
    }
  }, [path, refresh, selected]);

  const handleMkdir = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    const name = window.prompt("New folder name");
    if (!name) return;
    try {
      setIsBusy(true);
      await invokeCommand("create_ftp_folder", {
        request: { sessionId, parentPath: path, name },
      });
      await refresh(path);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setIsBusy(false);
    }
  }, [path, refresh]);

  const handleUpload = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    const picked = await openFileDialog({ multiple: false });
    if (!picked || typeof picked !== "string") return;
    try {
      setIsBusy(true);
      setStatus("Uploading…");
      const transferId = `ftp-upload-${Date.now()}`;
      await invokeCommand("upload_ftp_path", {
        request: {
          sessionId,
          transferId,
          localPath: picked,
          remoteDirectory: path,
          overwriteBehavior,
        },
      });
      setStatus("Upload complete");
      setProgress(null);
      await refresh(path);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setIsBusy(false);
    }
  }, [overwriteBehavior, path, refresh]);

  const handleDownload = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !selected) return;
    const picked = await openFileDialog({ directory: true });
    if (!picked || typeof picked !== "string") return;
    try {
      setIsBusy(true);
      setStatus("Downloading…");
      const transferId = `ftp-download-${Date.now()}`;
      await invokeCommand("download_ftp_path", {
        request: {
          sessionId,
          transferId,
          remotePath: joinPath(path, selected),
          localDirectory: picked,
          overwriteBehavior,
        },
      });
      setStatus("Download complete");
      setProgress(null);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setIsBusy(false);
    }
  }, [overwriteBehavior, path, selected]);

  if (!connection || connection.type !== "ftp") {
    return null;
  }

  return (
    <section
      className={isActive ? "sftp-workspace active" : "sftp-workspace"}
      data-tab-id={tab.id}
    >
      <header className="sftp-toolbar">
        <span className="sftp-toolbar-title">
          {connection.name} <small>({protocolLabel})</small>
        </span>
        <div className="sftp-toolbar-actions">
          <button onClick={goUp} disabled={isBusy} aria-label="Up">
            <ArrowUp size={14} />
          </button>
          <button onClick={reload} disabled={isBusy} aria-label="Refresh">
            <RefreshCw size={14} />
          </button>
          <button onClick={handleUpload} disabled={isBusy} aria-label="Upload">
            <Upload size={14} />
          </button>
          <button
            onClick={handleDownload}
            disabled={isBusy || !selected}
            aria-label="Download"
          >
            <Download size={14} />
          </button>
          <button onClick={handleMkdir} disabled={isBusy} aria-label="New folder">
            <FolderPlus size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isBusy || !selected}
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </header>
      <div className="sftp-path-bar">{path}</div>
      <div className="sftp-listing">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Modified</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.name}
                className={selected === row.name ? "selected" : undefined}
                onClick={() => setSelected(row.name)}
                onDoubleClick={() => handleEntryDoubleClick(row)}
              >
                <td>
                  {row.kind === "directory" ? (
                    <Folder size={14} />
                  ) : (
                    <FileIcon size={14} />
                  )}
                  &nbsp;{row.name}
                </td>
                <td>{row.kind === "directory" ? "—" : formatSize(row.size)}</td>
                <td>{formatTime(row.modified)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="sftp-status">
        <span>{status}</span>
        {progress ? (
          <span>
            {progress.progress}% ({formatSize(progress.transferredBytes)} /{" "}
            {formatSize(progress.totalBytes)})
          </span>
        ) : null}
      </footer>
    </section>
  );
}
