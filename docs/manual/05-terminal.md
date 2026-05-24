# 05 — Terminal

## AI grep hints

- Keys: `terminal.actions`, `terminal.copy`, `terminal.copyShortcut`, `terminal.paste`, `terminal.pasteMultilineConfirm`, `terminal.find`, `terminal.findInScrollback`, `terminal.noResults`, `terminal.closeSearch`, `terminal.previousSearch`, `terminal.nextSearch`, `terminal.font`, `terminal.increaseSize`, `terminal.decreaseSize`, `terminal.resetSize`, `terminal.save`, `terminal.saveBuffer`, `terminal.bufferSaveFailed`, `terminal.startRecording`, `terminal.stopRecording`, `terminal.recording`, `terminal.openRecordings`, `terminal.recordingsTitle`, `terminal.openRecordingsFolder`, `terminal.noRecordings`, `terminal.logFiles`, `terminal.textFiles`, `terminal.starting`, `terminal.sessionFor`, `terminal.startingSessionFor`, `terminal.failedToStart`, `terminal.failedToStartDetail`, `terminal.desktopRuntimeRequired`, `terminal.tauriRequired`, `terminal.noSaveDialog`, `terminal.saveDialog`, `terminal.connectLabel`, `terminal.targetLabel`
- Topics: terminal external links, copy/paste, multiline paste confirmation, find in scrollback, font size, save buffer to file, recording terminal output, starting state, tutorial targets `terminal.pane`, `terminal.startRecording`, `terminal.openSftp`, `terminal.copySelection`, `terminal.sendToAi`, `terminal.actions`, `terminal.searchBar`, `terminal.surface`
- Synonyms: "open link in browser", "external browser", "highlight text", "search terminal", "zoom terminal", "shrink font", "export log", "record session", "terminal recording", "transcript"

## Rendering

Terminal Panes are rendered by xterm.js. Local terminals use ConPTY through `portable_pty`; SSH terminals use KKTerm's `NativeSsh` transport. Both run through the real Tauri runtime — a Vite browser preview cannot host them. Behaviour like focus and input must be validated against `npm run tauri dev` or the built `kkterm.exe`.

Tutorial targets: `terminal.pane`, `terminal.surface`.

## Starting state

While a Session is starting up, the Pane shows:

- `terminal.starting` (spinner)
- `terminal.sessionFor` or `terminal.startingSessionFor` with the target name
- For SSH: `terminal.verifyingHostKey` while the host key is verified.

Failure shows `terminal.failedToStart` / `terminal.failedToStartDetail`. Outside the Tauri runtime (e.g. browser preview), `terminal.desktopRuntimeRequired` or `terminal.tauriRequired` is shown instead.

## Copy and paste

Ctrl-click an `http` or `https` link rendered in any terminal Pane to open it in the OS default browser through KKTerm's external opener. This applies to local, SSH, Telnet, and Serial terminal Sessions because they share the same xterm.js renderer.

- Selecting text with the mouse copies via `terminal.copy` (shortcut hint `terminal.copyShortcut`). Right-click → `terminal.copy` is also available.
- Paste: `terminal.paste`. Multi-line pastes prompt a confirmation `terminal.pasteMultilineConfirm` to prevent accidental command execution.
- "Send selection to AI": `terminal.sendToAi` (see [04-workspace-tabs-panes.md](04-workspace-tabs-panes.md)).

Do not use `window.prompt` / `window.confirm` for paste confirmation; the implementation is an app-owned dialog with translated strings.

## Find in scrollback

- Toggle search with the Pane toolbar; placeholder `terminal.findInScrollback`.
- Next / previous match: `terminal.nextSearch` / `terminal.previousSearch`.
- No matches: `terminal.noResults`.
- Close: `terminal.closeSearch`.

Tutorial target: `terminal.searchBar`.

## Font controls

In the Pane toolbar group `terminal.font` (Actions submenu `terminal.actions`):

- `terminal.increaseSize`
- `terminal.decreaseSize`
- `terminal.resetSize`

Font family, default size, ligature settings, and cursor style are configured globally in Settings → Terminal (see [15-settings.md](15-settings.md) §Terminal).

## View submenu

`terminal.view` toggles per-Pane rendering preferences exposed by the terminal Pane (cursor, line height, etc.).

## Saving the buffer

`terminal.save` / `terminal.saveBuffer` writes the current scrollback to a file. Dialog title `terminal.saveDialog`. File filters `terminal.logFiles` and `terminal.textFiles`. Failures surface as `terminal.bufferSaveFailed`. If no save dialog is available (non-Tauri runtime), the status is `terminal.noSaveDialog`.

## Recording output

`terminal.startRecording` starts a local text recording for the current terminal Pane. KKTerm first writes the current frontend terminal buffer, then appends live output until recording stops. While active, the toolbar shows `terminal.recording`, the button changes to `terminal.stopRecording`, and the terminal Pane has a red outer border.

Stopping the recording, closing the Pane, or ending the terminal Session finalizes the text file under KKTerm app data. The terminal actions menu item `terminal.openRecordings` opens `terminal.recordingsTitle`, listing saved `.txt` files for that Connection. `terminal.openRecordingsFolder` opens the Connection's local recordings folder. Deleting a Connection does not delete its recording files.

Tutorial targets: `terminal.startRecording`, `terminal.actions`.

## SSH-specific behaviour

Covered in [06-ssh-and-tmux.md](06-ssh-and-tmux.md).

## SFTP shortcut

From an SSH Pane: `terminal.openSftp` / `terminal.sftp` opens an SFTP browser Pane targeted at the same SSH Connection. See [07-sftp.md](07-sftp.md).

Tutorial targets: `terminal.openSftp`, `terminal.copySelection`, `terminal.sendToAi`.

## Connect / target labels

Generic placeholders used in error / status surfaces: `terminal.connectLabel`, `terminal.targetLabel`.
