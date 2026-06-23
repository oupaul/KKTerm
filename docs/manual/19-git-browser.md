# 19 — Git Browser

## AI grep hints

- Keys: `git.*` (full namespace), `git.openBrowser`, `git.history`, `git.commit`, `git.fetch`, `git.pull`, `git.push`, `git.branch`, `git.merge`, `git.stash`, `git.checkoutCommit`, `git.cherryPick`, `git.revertCommit`, `git.gitNeededTitle`
- Files: `src/modules/git/` (overlay), `src-tauri/src/git.rs` (backend), entry points in `src/modules/workspace/connections/terminal/TerminalWorkspace.tsx` and `src/modules/workspace/connections/sftp/SftpWorkspace.tsx`
- Topics: commit graph, commit history, staging, committing, branches, tags, stashes, fetch/pull/push, diff viewer
- Synonyms: "git client", "source control", "version control", "commit graph", "git log", "git GUI"

## Opening the Git Browser

The Git Browser is a full-window overlay, not a Tab. A Git icon (`git.openBrowser`) appears in two places, only when the current directory is inside a git work tree:

- **Local terminal Pane toolbar** — when a local terminal's tracked working directory is inside a repository. Remote (SSH) terminals are not covered: git there runs on the remote host.
- **File Explorer toolbar** — when the File Explorer (`localFiles`) Connection's current directory is inside a repository.

Clicking the icon opens the overlay against that repository's root. Press `Escape` or the close control to dismiss it; the workspace underneath is untouched.

The browser shells out to the system `git` binary, so it uses your existing git configuration, OS credential manager, and SSH agent for authentication. If no `git` binary is found, the overlay shows an install gate (`git.gitNeededTitle`, `git.gitNeededBody`) that offers an on-demand install through the Install Helper (`git` catalog tool) on Windows.

## History view

The default view (`git.history`) shows a GitKraken-style commit graph with colorful lanes:

- The graph column routes curved connectors between each commit and its parents; lane color is derived from the branch topology.
- Ref badges show the current branch (`head`), other local branches, remote-tracking branches, and tags.
- A dashed **Working tree** row (`git.workingTree`) at the top represents uncommitted changes.
- Selecting a commit fills the right-hand inspector with the message, author, exact date, commit/parent SHAs (with copy), the changed-files list (`git.changedFiles`), and a unified diff viewer.

Right-click a commit for actions: `git.checkoutCommit`, `git.createBranchHere`, `git.createTag`, `git.cherryPick`, `git.revertCommit`, `git.copySha`, `git.copyMessage`. Destructive actions (checkout/detach, cherry-pick, revert) confirm first through the standard `ConfirmSheet`.

Use the search box (`git.searchCommits`) to filter the visible commits by message, short SHA, or author.

## Commit view

Switch to `git.commit` to stage and commit. The working-tree pane lists **Staged** (`git.staged`) and **Changes** (`git.changes`) sections. Toggle a file's checkbox to stage/unstage it, or use `git.stageAll` / `git.unstageAll`. Selecting a file shows its diff. Enter a message (`git.commitMessagePlaceholder`), optionally tick `git.amend`, and commit with the button (`git.commitFiles`).

## Toolbar actions

- `git.fetch` — fetch from all remotes (with prune).
- `git.pull` — pull the current branch.
- `git.push` — push the current branch; confirms first (`git.pushConfirmTitle`). The push button shows the ahead-count badge.
- `git.branch` — create and check out a new branch.
- `git.merge` — merge a named branch or commit into the current branch.
- `git.stash` — stash all changes including untracked files.

The sidebar lists local branches (with ahead/behind), remotes and their branches, tags, and stashes; clicking a branch or tag checks it out, and stash rows expose apply/pop/drop.

All outcomes — success and failure — are reported through the bottom **Status Bar** notice popup. Git's own stderr is surfaced verbatim on failure (for example, merge conflicts or rejected pushes).
