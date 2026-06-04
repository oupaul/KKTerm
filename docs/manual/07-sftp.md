# 07 — SFTP

## AI grep hints

- Keys: `sftp.*` (full namespace), `terminal.openSftp`, `terminal.sftp`
- Topics: dual-pane browser, upload, download, conflicts, rename, delete, new folder, properties, chmod/chown, sort, transfer queue, tutorial targets `sftp.toolbar`, `sftp.upload`, `sftp.download`, `sftp.terminal`, `sftp.localPane`, `sftp.remotePane`, `sftp.transferQueue`
- Synonyms: "file transfer", "scp", "upload to server", "download from server", "remote files"

## Opening an SFTP browser

SFTP is not a standalone Connection kind. Open an SFTP browser popup from an SSH Pane's toolbar (`terminal.openSftp` / `terminal.sftp`) or open an SFTP Pane from the SSH Connection's right-click menu in the Connection Tree.

The SSH Pane toolbar popup behaves the same whether the top Tab Strip is visible or hidden.

Startup states:

- `sftp.connecting`
- `sftp.verifyingHost` (SSH host key verification — see [06-ssh-and-tmux.md](06-ssh-and-tmux.md))
- `sftp.openingSftp`
- `sftp.connected`
- `sftp.refreshing`
- `sftp.openingFolder`
- `sftp.noSshConnection` (cannot resolve the parent SSH Connection)
- `sftp.tauriUnavailable` (runtime check)
- `sftp.sessionUnavailable`

## Layout

Two columns:

Each pane header keeps the pane label and editable path field on one row. Type a local or remote path into the expanding path field and press Enter to navigate. Press Escape or leave the field without Enter to keep the current path. Folder-name autocomplete suggests folders from the current listing and inserts the selected folder path with a trailing slash. The recent-path icon (`sftp.recentPathsAria`) opens up to the last five visited paths for that local or remote pane. The path input accessibility label is `sftp.pathInputAria`.

- **Local** (`sftp.local`, `sftp.localFiles`) — loading state `sftp.loadingLocal`. On Windows, opening the parent of a drive root shows the drive picker path label `sftp.windowsDrives`, where double-clicking a drive opens that drive root.
- **Remote** (`sftp.remote`) — empty state `sftp.noFiles`, loading `sftp.loading`.

A bottom strip shows the **Transfer Activity** queue (`sftp.transferActivity`):

- Counts: `sftp.active`, `sftp.transferCountActive`
- Clear completed: `sftp.clear`
- Empty state: `sftp.noTransfers`

Tutorial targets: `sftp.toolbar`, `sftp.localPane`, `sftp.remotePane`, `sftp.transferQueue`.

## Per-pane toolbar

Both panes share the same set of actions (with `Aria` siblings for accessibility):

- Open parent: `sftp.openParent` (`sftp.openParentFolderAria`)
- New folder: `sftp.createFolder` (`sftp.createFolderAria`). Remote new folder dialog `sftp.newRemoteFolder` — empty input warning `sftp.folderNameBlank`. Creation in-flight: `sftp.creatingFolder`.
- Rename selected: `sftp.renameSelected` (`sftp.renameSelectedAria`). Dialog `sftp.renameItem`; rename file aria `sftp.renameFileAria`. Empty warning `sftp.remoteNameBlank`. In-flight: `sftp.renaming`.
- Delete selected: `sftp.deleteSelected` (`sftp.deleteSelectedAria`). Confirm copy `sftp.deleteRemoteConfirm`, `sftp.deleteRemoteItemConfirm`, `sftp.deleteRemoteItemsConfirm`, `sftp.deleteRemoteItemsMultiple`. In-flight: `sftp.deleting`.
- Refresh files: `sftp.refreshFiles` (`sftp.refreshFilesAria`)
- Sort: `sftp.sortBy` (`sftp.sortByAria`, title `sftp.sortByTitle`). Modes: `sftp.name`, `sftp.date`.

Double-click affordance hint: `sftp.doubleClickToOpen`, `sftp.doubleClickToOpenFile`. Remote symbolic links that resolve to directories are listed as openable folder entries so double-clicking enters the resolved target directory.

## Transferring files

Use drag/drop between panes or the explicit toolbar buttons `sftp.upload` and `sftp.download`. Standalone SFTP panes expose a `sftp.terminal` action that reopens the parent SSH terminal in the originating Pane; SFTP popups opened from an active SSH terminal omit that action because closing the popup returns to the parent terminal. Inline SFTP popups also omit the screenshot toolbar action, while standalone SFTP panes keep the screenshot target `sftp.screenshotTarget`.

Tutorial targets: `sftp.upload`, `sftp.download`, `sftp.terminal`.

Each transfer flows through this lifecycle, reflected in the transfer queue:

`sftp.queued` → `sftp.preparing` → `sftp.waiting` → in-progress (with bytes/percent) → `sftp.done` / `sftp.failed` / `sftp.canceled`.

Per-transfer controls:

- Cancel: `sftp.cancelTransfer` / `sftp.cancelTransferName`, in-flight `sftp.canceling`, post-state `sftp.canceledBeforeStart` or `sftp.transferCanceled`.
- Skip existing target: `sftp.skippedExisting`.

## Conflict resolution

When a transfer would overwrite an existing target, KKTerm shows an app-owned dialog (`sftp.transferConflict`):

- Target-exists copy: `sftp.targetExists`, detail `sftp.targetExistsDetail`.
- Per-direction variants: `sftp.uploadConflict`, `sftp.downloadConflict`. Generic existence labels: `sftp.folderExists`, `sftp.fileExists`.
- Actions: `sftp.skip`, `sftp.overwrite`, `sftp.overwriteAll`.
- More-conflicts indicator: `sftp.moreConflicts`, `sftp.moreConflictsDetail`.
- Cancel from inside the conflict prompt: `sftp.cancelTransferConflict`.
- Resolution status during wait: `sftp.waitingToOverwrite`.

## Properties / chmod / chown

Right-click a remote item → `sftp.properties`. Dialog `sftp.sftpProperties` (close `sftp.closeProperties`). Fields:

- `sftp.type` (`sftp.fileTypeLabel`), `sftp.size`, `sftp.modified`, `sftp.accessed`
- `sftp.owner`, `sftp.group`
- `sftp.mode` — change with `sftp.chmod`. Help: `sftp.modeHint`.
- Numeric UID / GID change: `sftp.chownUid`, `sftp.chownGid`. Validation: `sftp.ownerMustBeNumber`, `sftp.groupMustBeNumber`.
- Save: `sftp.save`.

Item-kind labels for selection and properties: `sftp.folder`, `sftp.file`, `sftp.symlink`. Generic delete-button label: `sftp.deleteLabel`. Transfer labels in summaries: `sftp.transfer`, `sftp.transferUpload`, `sftp.transferDownload`. External file fallthrough indicator: `sftp.extFile`.

Screenshot targeting label (used by [14-screenshots.md](14-screenshots.md)): `sftp.screenshotTarget`.
