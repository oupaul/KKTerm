import type { SftpPathProperties } from "../../../../lib/tauri";
import type { FileEntry, SftpSettings } from "../../../../types";

export type TransferRecord = {
  id: string;
  direction: "upload" | "download";
  name: string;
  state: "queued" | "active" | "done" | "failed" | "canceled";
  progress: number;
  detail: string;
  overwriteBehavior: SftpSettings["overwriteBehavior"];
  localPath?: string;
  remoteDirectory?: string;
  remotePath?: string;
  localDirectory?: string;
  openWhenDone?: string;
  deleteSourceWhenDone?: {
    side: FilePaneSide;
    path: string;
  };
};

export type TransferDirection = TransferRecord["direction"];

export type TransferConflictDecision = "overwrite" | "overwriteAll" | "skip" | "cancel";

export type TransferConflictState = {
  direction: TransferDirection;
  name: string;
  targetPath: string;
  isFolder: boolean;
  remainingConflicts: number;
};

export type FileSortKey = "name" | "date";

export type FilePaneSide = "local" | "remote";

// A user-pinned local folder shown in the File Explorer sidebar's Favorites
// section. Persisted globally (favorites describe the local filesystem, not a
// specific connection).
export type LocalFavorite = {
  id: string;
  label: string;
  path: string;
  icon: string;
};

export type SftpContextMenuState = {
  side: FilePaneSide;
  x: number;
  y: number;
  names: string[];
  openable: boolean;
  mutable: boolean;
  canPaste: boolean;
};

export type FilePropertiesState = {
  side: FilePaneSide;
  entry: FileEntry;
  path: string;
  remoteProperties?: SftpPathProperties;
};

export type DeleteRequest = {
  side: FilePaneSide;
  items: Array<Pick<FileEntry, "kind" | "name">>;
};
