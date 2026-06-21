# 07 — SFTP

## AI grep hints

- Keys: `sftp.*` (full namespace), `terminal.openSftp`, `terminal.sftp`
- Topics: symmetric dual-pane browser, breadcrumb navigation, list/gallery view switch, per-pane view-options (hamburger) menu with item zoom + content-view background, upload, download, conflicts, cut/copy/paste, rename, delete, copy path, new folder, properties, chmod/chown, sort, collapsible transfer activity bar, tutorial targets `sftp.toolbar`, `sftp.upload`, `sftp.download`, `sftp.terminal`, `sftp.localPane`, `sftp.remotePane`, `sftp.transferQueue`
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

The browser follows the KKTerm design language (see [DESIGN_LANGUAGE.md](../DESIGN_LANGUAGE.md)): a symmetric dual-pane file manager with a center transfer-arrow gutter and a collapsible transfer-activity bar at the bottom. A single-row titlebar shows, left to right: a transfer glyph + the protocol kind (`sftp.protocolSftp` / `sftp.protocolFtp` / `sftp.protocolFiles`) followed by the connection status (`sftp.connected` / `sftp.connecting` / `sftp.notConnected`); the `user@host` centered; and the right-side actions (the `sftp.terminal` action for standalone panes, and a `common.close` button shown for the SFTP popup and for standalone SFTP / File Explorer Tabs whenever `settings.hideTopTabButtons` hides the top Tab Strip's per-Tab close). When a connection fails, the titlebar status shows `sftp.notConnected` (red) and the detailed error is surfaced in the bottom transfer-activity bar in red rather than in the titlebar.

File Explorer Connections (`localFiles`) reuse this browser shell as a single-pane local browser: the titlebar shows the saved Connection name, and only the local file pane is shown, with no remote pane, center transfer gutter, connection-status pill, or bottom Transfer Activity bar.

Each pane header shows the pane label, a **breadcrumb** path, and per-pane actions. Click a breadcrumb segment to jump to that ancestor folder. **Double-click the breadcrumb** (`sftp.editPathTitle`) to switch it to an editable path field: type a local or remote path and press Enter to navigate, or Escape to cancel. Folder-name autocomplete suggests folders from the current listing and inserts the selected folder path with a trailing slash. The local pane's terminal icon (`sftp.openTerminalHereAria`) opens a runtime-only terminal popup in the current local folder using the dedicated Settings → File Explorer terminal preference (`settings.fileExplorerTerminal`). The popup follows the SSH toolbar SFTP popup model: it does not create a workspace Tab or connected Activity Rail item, renders the terminal edge-to-edge without a light dialog gutter, and puts its `terminal.closePane` action at the top-right of the terminal toolbar. Closing it ends the terminal Session. Windows offers normal and administrator variants of Command Prompt, PowerShell, and PowerShell 7; macOS defaults to zsh; Linux defaults to bash; reusable custom shells come from Terminal settings. In SFTP/FTP browsers this action is local-side only and is not shown on the remote pane. The recent-path icon (`sftp.recentPathsAria`) opens up to the last five visited paths for that pane. The path input accessibility label is `sftp.pathInputAria`.

The editable path and inline rename fields disable OS autocorrect,
autocapitalization, and spellcheck in the WebView on Windows and macOS so file
names and paths are entered exactly as typed. Platform keyboard/IME suggestion
UI may still appear outside KKTerm's DOM controls.

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
- View options (`sftp.viewOptions`) — a hamburger button to the right of the search box opens a per-pane menu with two controls: **Zoom** (`sftp.zoom`, slider aria `sftp.zoomAria`) scales the file/folder items in that pane's content view smaller or bigger, and **Background** (`sftp.background`) opens the shared background picker (same options as a Dashboard view background; default-mode hint `sftp.backgroundDefaultHint`) and applies the chosen preset / image / video / dynamic background within that pane's content view only. Both panes of an SFTP/FTP browser carry their own menu. These settings persist per Connection and per pane side, except in the ephemeral SSH-toolbar SFTP popup, where they are kept in memory only and forgotten when the popup closes.

Cut, Copy, Paste, Rename, Copy Path, Delete, and Get Info are on the right-click context menu (see below). Pressing **Delete** or **Backspace** with a mutable local or remote selection starts the delete flow (remote confirm copy `sftp.deleteRemoteConfirm`, `sftp.deleteRemoteItemConfirm`, `sftp.deleteRemoteItemsMultiple`; local confirm copy reuses `sftp.deleteLabel` / `sftp.deleteSelected`; in-flight `sftp.deleting`). Rename in-flight `sftp.renaming` / empty warning `sftp.remoteNameBlank`; rename file aria `sftp.renameFileAria`.

Double-click affordance hint: `sftp.doubleClickToOpenFile`. Double-clicking a local file runs the operating system's normal Open action for that file. Double-clicking a remote file downloads it to the current local pane directory, then runs the operating system Open action only after the transfer completes successfully; canceled, skipped, or failed downloads do not open. Remote symbolic links that resolve to directories are listed as openable folder entries so double-clicking enters the resolved target directory.

## Transferring files

Use drag/drop between panes or the **center transfer arrows** (`sftp.upload` to the remote pane, `sftp.download` to the local pane). Dropping files directly from the OS file manager onto the remote Pane is not supported, because KKTerm runs with the webview's native drag-drop handler disabled (required so in-app HTML5 drag-and-drop works on Windows), which means OS file drops never report a path — drag from the local pane or use the transfer arrows instead. Standalone SFTP panes expose a `sftp.terminal` action that reopens the parent SSH terminal in the originating Pane; SFTP popups opened from an active SSH terminal omit that action because closing the popup returns to the parent terminal. The SFTP browser and File Explorer (`localFiles`) do not show a screenshot / send-to-AI toolbar action.

The right-click file clipboard uses `common.cut`, `common.copy`, and `common.paste`. Local file selections are also written to the Windows Explorer file clipboard, so Explorer can paste copied/cut local items from KKTerm and KKTerm can paste copied/cut local items from Explorer. Cross-pane local-to-remote and remote-to-local paste queues normal transfers; cut deletes the original only after the transfer completes successfully. Remote-to-remote paste is not a server-side copy operation.

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

Right-click an item for: transfer (`sftp.upload` / `sftp.download`, hidden in File Explorer), Open (`common.open`, single file selection), Cut (`common.cut`), Copy (`common.copy`), Paste (`common.paste`, also available from empty pane space), Rename (`sftp.renameItem`, single mutable local or remote selection), Copy Path (`sftp.copyPath`, copies the item's full path to the clipboard), Delete (`sftp.deleteLabel`, mutable local or remote selections), and Get Info (`sftp.getInfo`, opens properties). File Explorer's local Open action follows Settings -> Workspace -> `settings.fileExplorerOpenMode`: `settings.fileExplorerOpenModeExternal` opens through the OS default app, while `settings.fileExplorerOpenModeInlineEditor` opens the file in KKTerm's inline Document/light editor. The menu is a styled app-owned DOM menu — a documented exception to the native-menu preference (see [DESIGN_LANGUAGE.md](../DESIGN_LANGUAGE.md)).

## Properties / chmod / chown

Open via the context menu's Get Info (`sftp.getInfo`). Dialog `sftp.sftpProperties`. Fields:

- `sftp.type` (`sftp.fileTypeLabel`), `sftp.size`, `sftp.modified`, `sftp.accessed`
- `sftp.owner`, `sftp.group`
- `sftp.mode` — change with `sftp.chmod`. Help: `sftp.modeHint`.
- Numeric UID / GID change: `sftp.chownUid`, `sftp.chownGid`. Validation: `sftp.ownerMustBeNumber`, `sftp.groupMustBeNumber`.
- Save: `sftp.save`.

Item-kind labels for selection and properties: `sftp.folder`, `sftp.file`, `sftp.symlink`. Generic delete-button label: `sftp.deleteLabel`. Transfer labels in summaries: `sftp.transfer`, `sftp.transferUpload`, `sftp.transferDownload`. External file fallthrough indicator: `sftp.extFile`.
