# 07 — SFTP

## AI grep hints

- Keys: `sftp.*` (full namespace), `terminal.openSftp`, `terminal.sftp`
- Topics: symmetric dual-pane browser, breadcrumb navigation, list/gallery view switch, upload, download, conflicts, rename, delete, copy path, new folder, properties, chmod/chown, sort, collapsible transfer activity bar, tutorial targets `sftp.toolbar`, `sftp.upload`, `sftp.download`, `sftp.terminal`, `sftp.localPane`, `sftp.remotePane`, `sftp.transferQueue`
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

The browser follows the KKTerm design language (see [DESIGN_LANGUAGE.md](../DESIGN_LANGUAGE.md)): a symmetric dual-pane file manager with a center transfer-arrow gutter and a collapsible transfer-activity bar at the bottom. The host workspace toolbar shows the connection title and a connected-status pill (`sftp.connected` / `sftp.connecting`).

Each pane header shows the pane label, a **breadcrumb** path, and per-pane actions. Click a breadcrumb segment to jump to that ancestor folder. **Double-click the breadcrumb** (`sftp.editPathTitle`) to switch it to an editable path field: type a local or remote path and press Enter to navigate, or Escape to cancel. Folder-name autocomplete suggests folders from the current listing and inserts the selected folder path with a trailing slash. The recent-path icon (`sftp.recentPathsAria`) opens up to the last five visited paths for that pane. The path input accessibility label is `sftp.pathInputAria`.

Each pane offers a **view switch** (`sftp.viewMode`) between list (`sftp.listView`) and gallery (`sftp.galleryView`). List view has sortable column headers for `sftp.name`, `sftp.size`, and `sftp.date` (click a header to toggle ascending/descending).

- **Local** (`sftp.local`, `sftp.localFiles`) — loading state `sftp.loadingLocal`. On Windows, opening the parent of a drive root shows the drive picker path label `sftp.windowsDrives`, where double-clicking a drive opens that drive root.
- **Remote** (`sftp.remote`) — empty state `sftp.noFiles`, loading `sftp.loading`.

The bottom **Transfer Activity** bar (`sftp.transferActivity`, tutorial target `sftp.transferQueue`) is collapsible. Its summary shows `sftp.transferringStatus` while transfers run, `sftp.transfersIdleStatus` once they finish, or `sftp.noTransfers` when empty; the expanded panel hint is `sftp.transferHint`. Clear completed: `sftp.clear`.

Tutorial targets: `sftp.toolbar`, `sftp.localPane`, `sftp.remotePane`, `sftp.transferQueue`.

## Per-pane toolbar

Each pane header carries (with `Aria` siblings for accessibility):

- Open parent: `sftp.openParent` (`sftp.openParentFolderAria`)
- New folder (remote): `sftp.createFolder` (`sftp.createFolderAria`). Remote new folder dialog `sftp.newRemoteFolder` — empty input warning `sftp.folderNameBlank`. Creation in-flight: `sftp.creatingFolder`.
- Recent paths (`sftp.recentPathsAria`) and Refresh files: `sftp.refreshFiles` (`sftp.refreshFilesAria`)
- View switch: list / gallery (`sftp.viewMode`).

Rename, Copy Path, Delete, and Get Info are on the right-click context menu (see below). Pressing **Delete** or **Backspace** with a remote selection deletes it (confirm copy `sftp.deleteRemoteConfirm`, `sftp.deleteRemoteItemConfirm`, `sftp.deleteRemoteItemsMultiple`; in-flight `sftp.deleting`). Rename in-flight `sftp.renaming` / empty warning `sftp.remoteNameBlank`; rename file aria `sftp.renameFileAria`.

Double-click affordance hint: `sftp.doubleClickToOpenFile`. Remote symbolic links that resolve to directories are listed as openable folder entries so double-clicking enters the resolved target directory.

## Transferring files

Use drag/drop between panes or the **center transfer arrows** (`sftp.upload` to the remote pane, `sftp.download` to the local pane). In the Tauri desktop runtime, dropping local files or folders from the operating system onto the remote Pane also queues uploads to the current remote path. Standalone SFTP panes expose a `sftp.terminal` action that reopens the parent SSH terminal in the originating Pane; SFTP popups opened from an active SSH terminal omit that action because closing the popup returns to the parent terminal. Inline SFTP popups also omit the screenshot toolbar action, while standalone SFTP panes keep the screenshot target `sftp.screenshotTarget`.

Tutorial targets: `sftp.upload`, `sftp.download`, `sftp.terminal`.

Each transfer flows through this lifecycle, reflected in the transfer-activity list (per-row state labels `sftp.transferState.queued` / `active` / `done` / `failed` / `canceled`):

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

## Context menu

Right-click an item for: transfer (`sftp.upload` / `sftp.download`), Rename (`sftp.renameItem`, remote single selection), Copy Path (`sftp.copyPath`, copies the item's full path to the clipboard), Delete (`sftp.deleteLabel`, remote), and Get Info (`sftp.getInfo`, opens properties). The menu is a styled app-owned DOM menu — a documented exception to the native-menu preference (see [DESIGN_LANGUAGE.md](../DESIGN_LANGUAGE.md)).

## Properties / chmod / chown

Open via the context menu's Get Info (`sftp.getInfo`). Dialog `sftp.sftpProperties`. Fields:

- `sftp.type` (`sftp.fileTypeLabel`), `sftp.size`, `sftp.modified`, `sftp.accessed`
- `sftp.owner`, `sftp.group`
- `sftp.mode` — change with `sftp.chmod`. Help: `sftp.modeHint`.
- Numeric UID / GID change: `sftp.chownUid`, `sftp.chownGid`. Validation: `sftp.ownerMustBeNumber`, `sftp.groupMustBeNumber`.
- Save: `sftp.save`.

Item-kind labels for selection and properties: `sftp.folder`, `sftp.file`, `sftp.symlink`. Generic delete-button label: `sftp.deleteLabel`. Transfer labels in summaries: `sftp.transfer`, `sftp.transferUpload`, `sftp.transferDownload`. External file fallthrough indicator: `sftp.extFile`.

Screenshot targeting label (used by [14-screenshots.md](14-screenshots.md)): `sftp.screenshotTarget`.
