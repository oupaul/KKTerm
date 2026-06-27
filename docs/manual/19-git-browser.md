# 19 — Git Browser

## AI grep hints

- Keys: `git.*` (full namespace), `git.openBrowser`, `git.history`, `git.commit`, `git.fetch`, `git.pull`, `git.push`, `git.sync`, `git.branch`, `git.merge`, `git.stash`, `git.checkoutCommit`, `git.cherryPick`, `git.revertCommit`, `git.reset`, `git.discard`, `git.renameBranch`, `git.deleteBranch`, `git.worktrees`, `git.addWorktree`, `git.switchWorktree`, `git.switchRefConfirmTitle`, `git.gitNeededTitle`, `git.advancedDiffTitle`, `git.searchDiff`, `git.previousDifference`, `git.nextDifference`
- Files: `src/modules/git/` (overlay; layout in `useGitLayout.ts` + `GitResizeHandle.tsx`), `src-tauri/src/git.rs` (backend), entry points in `src/modules/workspace/connections/terminal/TerminalWorkspace.tsx` and `src/modules/workspace/connections/sftp/SftpWorkspace.tsx`
- Topics: commit graph, commit history, staging, committing, branches, tags, stashes, worktrees, fetch/pull/push/sync, reset, discard, unified diff viewer, side-by-side diff viewer, resizable panes
- Synonyms: "git client", "source control", "version control", "commit graph", "git log", "git GUI", "worktree"

## Opening the Git Browser

The Git Browser is a full-window overlay, not a Tab. A Git icon (`git.openBrowser`) appears in two places, only when the current directory is inside a git work tree:

- **Local terminal Pane toolbar** — when a local terminal's tracked working directory is inside a repository. Remote (SSH) terminals are not covered: git there runs on the remote host.
- **File Explorer toolbar** — when the File Explorer (`localFiles`) Connection's current directory is inside a repository.

Clicking the icon opens the overlay against that repository's root. Press `Escape` or the close control to dismiss it; the workspace underneath is untouched.

The overlay window is resizable: drag the right/bottom edges or the bottom-right corner grip (`git.resizeWindow`). The inline panes resize too — drag the splitter between the sidebar and the graph/working-tree (`git.resizeSidebar`), the graph and the detail pane (`git.resizeDetail`), or the working-tree and the diff (`git.resizeWorktree`). The window size and pane widths persist across sessions.

The browser shells out to the system `git` binary, so it uses your existing git configuration, OS credential manager, and SSH agent for authentication. If no `git` binary is found, the overlay shows an install gate (`git.gitNeededTitle`, `git.gitNeededBody`) that offers an on-demand install through the Install Helper (`git` catalog tool) on Windows.

## History view

The default view (`git.history`) shows a GitKraken-style commit graph with colorful lanes:

- The graph column routes curved connectors between each commit and its parents; lane color is derived from the branch topology.
- Ref badges show the current branch (`head`), other local branches, remote-tracking branches, and tags.
- A dashed **Working tree** row (`git.workingTree`) at the top represents uncommitted changes.
- Selecting a commit fills the right-hand inspector with the message, author, exact date, commit/parent SHAs (with copy), the changed-files list (`git.changedFiles`), and a unified diff viewer. Double-click a changed file to open the advanced side-by-side diff dialog (`git.advancedDiffTitle`) with original/modified columns (`git.diffOriginal`, `git.diffModified`), text search (`git.searchDiff`), and previous/next difference navigation (`git.previousDifference`, `git.nextDifference`).

Right-click a commit for actions: `git.checkoutCommit`, `git.createBranchHere`, `git.createTag`, `git.cherryPick`, `git.revertCommit`, `git.resetSoft` / `git.resetMixed` / `git.resetHard`, `git.copySha`, `git.copyMessage`. Destructive actions (checkout/detach, cherry-pick, revert, reset) confirm first through the standard `ConfirmSheet`; hard reset uses the danger tone.

Use the search box (`git.searchCommits`) to filter the visible commits by message, short SHA, or author.

## Commit view

Switch to `git.commit` to stage and commit. The working-tree pane lists **Staged** (`git.staged`) and **Changes** (`git.changes`) sections. Toggle a file's checkbox to stage/unstage it, or use `git.stageAll` / `git.unstageAll`. Selecting a file shows its diff; double-clicking a file opens the advanced side-by-side diff dialog (`git.advancedDiffTitle`). Enter a message (`git.commitMessagePlaceholder`), optionally tick `git.amend`, and commit with the button (`git.commitFiles`).

Discard changes from the Changes section: hover a file for its discard control (`git.discard`) or use `git.discardAll`. Both confirm first (`git.discardConfirmTitle`); tracked files are restored to HEAD and untracked files are deleted, so the action cannot be undone.

## Toolbar actions

- `git.fetch` — fetch from all remotes (with prune).
- `git.pull` — pull the current branch.
- `git.push` — push the current branch; confirms first (`git.pushConfirmTitle`). The push button shows the ahead-count badge.
- `git.sync` — pull with rebase, then push, behind a single confirm (`git.syncConfirmTitle`). Push runs only if the rebase-pull succeeds.
- `git.branch` — create and check out a new branch.
- `git.merge` — merge a named branch or commit into the current branch.
- `git.stash` — stash all changes including untracked files.

## Sidebar

The sidebar lists local branches (with ahead/behind), remotes and their branches, tags, worktrees, and stashes. The repository default branch (`git.defaultBranch`) is pinned to the top of the local-branch list.

- **Single click** selects a row; **double click** activates it behind a confirmation (`git.switchRefConfirmTitle`) — branches and tags check out, and a remote branch creates/​checks out a local tracking branch (`git.trackRemoteConfirmBody`) rather than detaching HEAD.
- **Right-click a branch** for `git.checkout`, `git.renameBranch`, and `git.deleteBranch` (the current branch cannot be deleted).
- Stash rows expose apply/pop/drop.

## Worktrees

The **Worktrees** section (`git.worktrees`) lists every linked worktree with its branch; the current worktree is marked. Double-click a worktree to re-point the Git Browser at it (`git.switchWorktreeConfirmTitle`). Use **+** in the section header to add one (`git.addWorktreeTitle`), or right-click a worktree to remove it (`git.removeWorktreeConfirmTitle`). The current worktree cannot be removed.

All outcomes — success and failure — are reported through the bottom **Status Bar** notice popup. Git's own stderr is surfaced verbatim on failure (for example, merge conflicts or rejected pushes).
