# 03 — Connections

## AI grep hints

- Keys: `connections.*` (full namespace), `app.connectionRail`
- Topics: Connection Tree, Child Connection Tabs, folders, search, Quick Connect, Add Connection, tutorial targets `connections.panel`, `connections.search`, `connections.quickConnect`, `connections.addConnection`, `connections.folderControls`, `connections.tree`, rename, delete, duplicate, pin to rail, drag/drop, properties dialog, icon image, icon background
- Synonyms: "child tab", "connection tree tab", "saved tab", "named tab under a connection", "sub tab"
- Synonyms: "saved host", "profile", "ssh entry", "create folder", "favourites", "icon color", "connection color"

> **Term:** "Connection" is the canonical name for a durable openable resource. Do not use "profile", "host entry", or "saved session". A Connection only becomes a live **Session** when opened; switching Tabs does not end the Session.

## Connection kinds

| Kind | i18n label | Notes |
|------|------------|-------|
| Local terminal | `connections.localShell` | Local PTY (ConPTY/`portable_pty`). |
| SSH terminal | `connections.secureShell`, type label `connections.ssh` | Backed by the `NativeSsh` transport. May persist tmux launch prefs. |
| Telnet | `connections.telnetShell`, type label `connections.telnet` | Password terminal. |
| Serial | `connections.serialLine`, type label `connections.serial` | Serial line. |
| URL | `connections.embeddedWebApp` | Embedded WebView2. See [08-url-webview.md](08-url-webview.md). |
| RDP | `connections.windowsRdp` | Windows native via mstscax. See [09-remote-desktop.md](09-remote-desktop.md). |
| VNC | `connections.screenControl` | RFB through `vnc-rs`. |
| FTP/FTPS | `connections.ftp` | Standalone file-transfer Connection routed through the SFTP/FTP browser surface. |

SFTP is not a standalone Connection kind — it is opened from an SSH Connection (`terminal.openSftp`, `terminal.sftp`).

## Connections Panel UI

Header row (top of the panel):

- Title: `connections.title`
- Add Connection: `connections.addConnection`, tutorial target `connections.addConnection`
- Quick Connect: `connections.quickConnect`
- New Folder: `connections.newFolder`
- Collapse / Expand all: `connections.collapseAll`, `connections.expandAll`
- Show All: `connections.showAll`; flattens the Connection Tree across folders, shows the button in its pressed state while enabled, and persists the preference in the Settings database across app relaunches.
- Search box: placeholder `connections.searchPlaceholder`. While a search is active, matching folders are shown expanded so nested result rows are immediately visible; clearing search restores the folder collapse/expand state from before the search.
- Column toggle: custom title-bar `app.connections` icon or Workspace icon on the Activity Rail

Tree accessible label: `connections.connectionTree`. Expand/collapse chevrons use `connections.expand` / `connections.collapse`.

Tutorial targets: `connections.panel`, `connections.search`, `connections.quickConnect`, `connections.addConnection`, `connections.folderControls`, `connections.tree`.

## Right-click context menu (native Tauri menu)

Driven by `src/lib/nativeContextMenu.ts`. On a Connection or folder node:

- `connections.newConnection`
- `connections.newSubfolderIn` (when the right-clicked node is a folder)
- `connections.rename`, dialogs `connections.renameFolder` / `connections.renameConnection`
- `connections.delete`, confirmation copy `connections.deleteFolderConfirm` or `connections.deleteConnectionConfirm`, with caveat `connections.cannotBeUndone`
- Pin to rail: `connections.pinToRail` / `connections.unpinFromRail`. Status: `connections.pinnedToRailStatus`, `connections.unpinnedFromRailStatus`. Error: `connections.pinRailError`.
- Top-level `workspace.newTab` on Connection rows. This opens the same new Tab flow as the Add-to-folder `workspace.newTab` entry and remains available in both places.
- Add to folder: `connections.addTo`, including `workspace.newTab` with shortcut hint `connections.newTabShortcut`, then pane placement directions `connections.left`, `connections.right`, `connections.lower`, `connections.upper`.
- Layout (Pane placement when opening): `connections.layout` with directions `connections.left`, `connections.right`, `connections.lower`, `connections.upper`
- `connections.properties`

Icons are rasterized to 16 px PNG bytes via `src/lib/nativeContextMenu.ts`. Do not pass raw SVG paths to Tauri menu APIs.

## Child Connection Tabs

A **Child Connection Tab** is a saved Tab entry shown as an italic child row below its parent Connection when `settings.hideTopTabButtons` is enabled. It is a Workspace presentation/reopen record, not a nested durable Connection. The parent Connection still owns host, protocol, credential metadata, and folder placement.

New Tabs opened from a saved Connection become Child Connection Tabs in this mode. They persist across app launches but open lazily: KKTerm starts the live Session only when the user selects the child row. Right-clicking a child row offers `connections.rename` and `connections.properties`; the properties dialog title is `connections.childConnectionProperties` and edits the child Tab name, icon image, and icon background without changing the parent Connection.

Clicking a parent Connection with Child Connection Tabs opens all of its children together in one split workspace Tab when none of those children are already live. If a child Tab is already open, KKTerm focuses the existing child Tab/Pane instead of reconnecting.

## Add Connection / Quick Connect dialogs

Both are app-owned DOM dialogs (not browser-native `prompt`).

**Quick Connect** (`connections.quickConnectDialog`) is an unsaved one-off draft that starts a single Session. Fields shown depend on the chosen kind:

- Hostname (`connections.hostname`, placeholder `connections.exampleHost`)
- Port (`connections.port`)
- Connect button (`connections.connect`), Cancel (`connections.cancel`)
- Permission tier toggle: `connections.normal` / `connections.admin`
- Recently used Connections list, empty state `connections.noRecent`

Opening a saved Connection or Quick Connect starts the live Session asynchronously. If a remote host is unreachable, host-key verification or startup can fail in the target Tab, but the Activity Rail, Connection Tree, Settings, and other open Tabs should remain usable while the attempt is pending.

For local Command Prompt and PowerShell Quick Connect entries, `connections.admin`
depends on how KKTerm itself is running. If KKTerm is already elevated, the
admin shell opens as an embedded local terminal Session and the draft shell is
labelled with the admin tier. If KKTerm is not elevated, KKTerm launches an
external elevated Command Prompt or PowerShell process through the Windows UAC
path.

**Add Connection** uses the same form shape but persists to SQLite. The Type selector label is `connections.type`.

For SSH, Telnet, RDP, VNC, and FTP Connections, the password area can reuse saved Connection password credentials from the same Connection type. The dropdown label is `connections.savedPassword`; each option shows the saved credential's username and original host. Choosing `connections.typeNewPassword` and typing a password creates a new OS-keychain credential for the saved Connection. If another credential already exists for the exact same host and Connection type, the generated credential label appends `#2`, `#3`, and so on.

For saved Connections, the properties/Add Connection header includes Connection icon presentation controls. `connections.editIcon` changes the icon image through default protocol icons, Lucide icon choices (`connections.lucideIcons` / `connections.selectLucideIcon`), saved images, or a newly chosen image. `connections.editIconBackground` opens the circular icon background picker; `connections.iconBackground` labels the picker, `connections.transparentIconBackground` clears the color back to the default transparent state, and `connections.selectIconBackground` applies a palette color. The chosen background is shown behind Connection icons in the Connection Tree and on pinned/connected Activity Rail Connection shortcuts. Workspace Tab rename is runtime-only Tab UI state and does not update the saved Connection `name`, icon, background, or `tabTitle`.

## Drag and drop

Drag a Connection onto a folder to move it; drag onto another Connection to reorder. Folders can be nested. Order is persisted.

## Status badges

Each Connection in the tree shows a live status dot when it has one or more Sessions open. The dot is derived from `withLiveConnectionStatuses` in `src/modules/workspace/connections/treeUtils.ts` and is **display-only**. Do not pass the live-status Connection to workspace components that own Session lifecycle (TerminalWorkspace, WebViewWorkspace, RemoteDesktopWorkspace, SftpWorkspace) — they look up the stable Connection by id from the raw tree. See `src/modules/dashboard/widgets/ConnectionWidgetBody.tsx` for the safe pattern.

## Pinned Connections on the Activity Rail

Pinning a Connection (`connections.pinToRail`) adds it to the `app.connectedConnectionsRail` group on the Activity Rail. Pinned icons survive launches; status dots reflect live Sessions. Unpinning is reversible — Connections themselves are not affected.
