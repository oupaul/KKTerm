// Shared types for the Git Browser. These mirror the serde shapes returned by
// the Rust `git` module (camelCase) and are referenced by the typed command
// map in `src/lib/tauri.ts` and by the UI components.

export interface GitDetect {
  available: boolean;
  repoRoot: string | null;
  currentBranch: string | null;
}

export type GitRefType = "head" | "branch" | "remote" | "tag";

export interface GitRef {
  type: GitRefType;
  name: string;
}

export interface GitCommit {
  id: string;
  shortId: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  subject: string;
  body: string;
  isoDate: string;
  when: string;
  refs: GitRef[];
}

export interface GitBranch {
  name: string;
  current: boolean;
  ahead: number;
  behind: number;
  upstream: string | null;
  lane: number;
}

export interface GitRemote {
  name: string;
  branches: string[];
}

export interface GitStash {
  index: number;
  name: string;
  message: string;
}

export interface GitWorktree {
  path: string;
  branch: string | null;
  head: string | null;
  isCurrent: boolean;
  locked: boolean;
}

export interface GitOverview {
  currentBranch: string | null;
  /** Repository default branch (short name); pinned to the top of the sidebar. */
  defaultBranch: string | null;
  localBranches: GitBranch[];
  remotes: GitRemote[];
  tags: string[];
  stashes: GitStash[];
  worktrees: GitWorktree[];
}

export interface GitChangedFile {
  status: string;
  path: string;
  oldPath: string | null;
  add: number;
  del: number;
}

export interface GitDiffLine {
  t: "hunk" | "ctx" | "add" | "del";
  o: number | null;
  n: number | null;
  c: string;
}

export interface GitStatus {
  staged: GitChangedFile[];
  unstaged: GitChangedFile[];
}

/** A commit annotated with its computed graph column (see `lane.ts`). */
export interface GraphCommit extends GitCommit {
  lane: number;
}

/** What the overlay was opened against. */
export interface GitBrowserTarget {
  repoRoot: string;
  /** Short repo label shown in the title bar (usually the folder name). */
  label: string;
}
