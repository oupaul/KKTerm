// Typed wrappers around the Git Browser Tauri commands. Components call these
// instead of `invokeCommand` directly so the request shapes stay in one place.

import { invokeCommand } from "../../lib/tauri";
import type {
  GitChangedFile,
  GitCommit,
  GitDetect,
  GitDiffLine,
  GitOverview,
  GitStatus,
  GitWorktree,
} from "./gitTypes";

export function gitDetectRepo(path: string): Promise<GitDetect> {
  return invokeCommand("git_detect_repo", { request: { path } });
}

export function gitRepoOverview(repoRoot: string): Promise<GitOverview> {
  return invokeCommand("git_repo_overview", { request: { repoRoot } });
}

export function gitLogGraph(
  repoRoot: string,
  options?: { limit?: number; allRefs?: boolean },
): Promise<GitCommit[]> {
  return invokeCommand("git_log_graph", { request: { repoRoot, ...options } });
}

export function gitCommitFiles(repoRoot: string, sha: string): Promise<GitChangedFile[]> {
  return invokeCommand("git_commit_files", { request: { repoRoot, sha } });
}

export function gitDiffCommit(
  repoRoot: string,
  sha: string,
  path: string,
  options?: { fullContext?: boolean },
): Promise<GitDiffLine[]> {
  return invokeCommand("git_diff_commit", { request: { repoRoot, sha, path, ...options } });
}

export function gitDiffWorktree(
  repoRoot: string,
  path: string,
  options?: { staged?: boolean; untracked?: boolean; fullContext?: boolean },
): Promise<GitDiffLine[]> {
  return invokeCommand("git_diff_worktree", { request: { repoRoot, path, ...options } });
}

/** Diff two arbitrary local files (outside any repo) via `git diff --no-index`.
 * Used by the File Compare overlay. */
export function gitDiffNoIndex(
  left: string,
  right: string,
  options?: { fullContext?: boolean },
): Promise<GitDiffLine[]> {
  return invokeCommand("git_diff_no_index", { request: { left, right, ...options } });
}

export function gitStatus(repoRoot: string): Promise<GitStatus> {
  return invokeCommand("git_status", { request: { repoRoot } });
}

export function gitStage(repoRoot: string, paths: string[]): Promise<string> {
  return invokeCommand("git_stage", { request: { repoRoot, paths } });
}

export function gitUnstage(repoRoot: string, paths: string[]): Promise<string> {
  return invokeCommand("git_unstage", { request: { repoRoot, paths } });
}

export function gitStageAll(repoRoot: string): Promise<string> {
  return invokeCommand("git_stage_all", { request: { repoRoot } });
}

export function gitUnstageAll(repoRoot: string): Promise<string> {
  return invokeCommand("git_unstage_all", { request: { repoRoot } });
}

export function gitCommit(
  repoRoot: string,
  message: string,
  amend?: boolean,
): Promise<string> {
  return invokeCommand("git_commit", { request: { repoRoot, message, amend } });
}

export function gitCheckout(repoRoot: string, reference: string): Promise<string> {
  return invokeCommand("git_checkout", { request: { repoRoot, reference } });
}

export function gitCreateBranch(
  repoRoot: string,
  name: string,
  options?: { startPoint?: string; checkout?: boolean },
): Promise<string> {
  return invokeCommand("git_create_branch", { request: { repoRoot, name, ...options } });
}

export function gitDeleteBranch(
  repoRoot: string,
  name: string,
  force?: boolean,
): Promise<string> {
  return invokeCommand("git_delete_branch", { request: { repoRoot, name, force } });
}

export function gitRenameBranch(
  repoRoot: string,
  name: string,
  newName: string,
): Promise<string> {
  return invokeCommand("git_rename_branch", { request: { repoRoot, name, newName } });
}

export function gitCreateTag(
  repoRoot: string,
  name: string,
  options?: { sha?: string; message?: string },
): Promise<string> {
  return invokeCommand("git_create_tag", { request: { repoRoot, name, ...options } });
}

export function gitMerge(repoRoot: string, reference: string): Promise<string> {
  return invokeCommand("git_merge", { request: { repoRoot, reference } });
}

export function gitCherryPick(repoRoot: string, sha: string): Promise<string> {
  return invokeCommand("git_cherry_pick", { request: { repoRoot, sha } });
}

export function gitRevert(repoRoot: string, sha: string): Promise<string> {
  return invokeCommand("git_revert", { request: { repoRoot, sha } });
}

export function gitStashPush(
  repoRoot: string,
  options?: { message?: string; includeUntracked?: boolean },
): Promise<string> {
  return invokeCommand("git_stash_push", { request: { repoRoot, ...options } });
}

export function gitStashPop(repoRoot: string, index: number): Promise<string> {
  return invokeCommand("git_stash_pop", { request: { repoRoot, index } });
}

export function gitStashApply(repoRoot: string, index: number): Promise<string> {
  return invokeCommand("git_stash_apply", { request: { repoRoot, index } });
}

export function gitStashDrop(repoRoot: string, index: number): Promise<string> {
  return invokeCommand("git_stash_drop", { request: { repoRoot, index } });
}

export function gitFetch(
  repoRoot: string,
  options?: { remote?: string; prune?: boolean },
): Promise<string> {
  return invokeCommand("git_fetch", { request: { repoRoot, ...options } });
}

export function gitPull(
  repoRoot: string,
  options?: { remote?: string; branch?: string; rebase?: boolean },
): Promise<string> {
  return invokeCommand("git_pull", { request: { repoRoot, ...options } });
}

export function gitPush(
  repoRoot: string,
  options?: { remote?: string; branch?: string; force?: boolean; setUpstream?: boolean },
): Promise<string> {
  return invokeCommand("git_push", { request: { repoRoot, ...options } });
}

export function gitDiscard(
  repoRoot: string,
  paths: string[],
  untracked?: string[],
): Promise<string> {
  return invokeCommand("git_discard", { request: { repoRoot, paths, untracked } });
}

export function gitReset(
  repoRoot: string,
  sha: string,
  mode: "soft" | "mixed" | "hard",
): Promise<string> {
  return invokeCommand("git_reset", { request: { repoRoot, sha, mode } });
}

export function gitWorktreeList(repoRoot: string): Promise<GitWorktree[]> {
  return invokeCommand("git_worktree_list", { request: { repoRoot } });
}

export function gitWorktreeAdd(
  repoRoot: string,
  path: string,
  reference?: string,
): Promise<string> {
  return invokeCommand("git_worktree_add", { request: { repoRoot, path, reference } });
}

export function gitWorktreeRemove(
  repoRoot: string,
  path: string,
  force?: boolean,
): Promise<string> {
  return invokeCommand("git_worktree_remove", { request: { repoRoot, path, force } });
}
