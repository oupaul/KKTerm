import type { SftpPathProperties } from "../lib/tauri";
import type { FileEntry, SftpSettings } from "../types";

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

export type SftpContextMenuState = {
  side: FilePaneSide;
  x: number;
  y: number;
  names: string[];
};

export type FilePropertiesState = {
  side: FilePaneSide;
  entry: FileEntry;
  path: string;
  remoteProperties?: SftpPathProperties;
};

export type RemoteDeleteRequest = {
  items: Array<Pick<FileEntry, "kind" | "name">>;
};
