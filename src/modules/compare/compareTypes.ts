// Shared types for the File Compare overlay. A compare endpoint always resolves
// to a real local path the backend can read: local files use their own path,
// remote (SFTP/FTP) files are downloaded to a temp staging dir at selection time.

export interface CompareEndpoint {
  /** A local path the backend can read directly (a temp path for remote files). */
  localPath: string;
  /** Display name, e.g. "config.json". */
  label: string;
  /** Human-readable origin subtitle, e.g. "/home/u @ host" or a local directory. */
  origin: string;
  /** True when this endpoint is a directory; drives Folder Compare vs File Compare. */
  isDirectory?: boolean;
}

export interface CompareView {
  left: CompareEndpoint;
  right: CompareEndpoint;
}

/** Two local folders being compared in the Beyond Compare-style folder view. */
export interface FolderCompareTarget {
  left: CompareEndpoint;
  right: CompareEndpoint;
}
