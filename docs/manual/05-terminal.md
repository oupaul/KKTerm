# 05 — Terminal

## AI grep hints

- Keys: `terminal.actions`, `terminal.copy`, `terminal.copyShortcut`, `terminal.paste`, `terminal.pasteMultilineConfirm`, `terminal.find`, `terminal.findInScrollback`, `terminal.noResults`, `terminal.closeSearch`, `terminal.previousSearch`, `terminal.nextSearch`, `terminal.font`, `terminal.increaseSize`, `terminal.decreaseSize`, `terminal.resetSize`, `terminal.opacity`, `terminal.opacityValue`, `terminal.background`, `terminal.backgroundDefaultHint`, `terminal.appearanceSaveFailed`, `terminal.save`, `terminal.saveBuffer`, `terminal.bufferSaveFailed`, `terminal.startRecording`, `terminal.stopRecording`, `terminal.recording`, `terminal.openRecordings`, `terminal.recordingsTitle`, `terminal.openRecordingsFolder`, `terminal.noRecordings`, `terminal.logFiles`, `terminal.textFiles`, `terminal.quickCommandsShow`, `terminal.quickCommandsHide`, `terminal.quickCommandsManage`, `terminal.quickCommandsLibrary`, `terminal.quickCommandLibrary`, `terminal.quickCommandsCustomCommand`, `terminal.quickCommandsGenerateWithAi`, `terminal.quickCommandsAiPromptLabel`, `terminal.quickCommandsAiPromptPlaceholder`, `terminal.quickCommandsNoPane`, `terminal.starting`, `terminal.sessionFor`, `terminal.startingSessionFor`, `terminal.failedToStart`, `terminal.failedToStartDetail`, `terminal.desktopRuntimeRequired`, `terminal.tauriRequired`, `terminal.noSaveDialog`, `terminal.saveDialog`, `terminal.connectLabel`, `terminal.targetLabel`, `workspace.takeScreenshot`, `settings.submitAiAttachmentsDirectly`
- Topics: terminal external links, copy/paste, multiline paste confirmation, find in scrollback, font size, Quick Command Bar, quick commands, save buffer to file, recording terminal output, starting state, tutorial targets `terminal.pane`, `terminal.startRecording`, `terminal.openSftp`, `terminal.copySelection`, `terminal.sendToAi`, `terminal.actions`, `terminal.searchBar`, `terminal.surface`
- Synonyms: "open link in browser", "external browser", "highlight text", "search terminal", "zoom terminal", "shrink font", "terminal opacity", "transparent terminal", "terminal wallpaper", "terminal background", "quick command bar", "quick command", "command shortcut", "export log", "record session", "terminal recording", "transcript"

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
- Send terminal buffer to AI: `terminal.sendToAi`. By default `settings.submitAiAttachmentsDirectly` submits the buffer with `ai.directAttachmentPrompt`; when disabled, the button only attaches the buffer to the composer.

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

## Appearance controls

The Pane hamburger menu (`terminal.actions`) includes per-Connection appearance controls for local, SSH, WSL/PowerShell, Telnet, and other xterm-backed terminal Connections:

- `terminal.opacity` opens a Transparency slider labelled by `terminal.opacityValue`. New terminal Connections default to 50% transparency; Settings - SSH and Settings - Terminal expose `settings.defaultTransparency` to change the starting value for newly-created SSH or local/Telnet/Serial terminal surfaces.
- `terminal.background` opens the same shared background picker used by Dashboard Views. It reuses the Dashboard background modes, shared background picker datasource, media picker, fit, dim labels, and dynamic-background registry, and `terminal.backgroundDefaultHint` describes returning to the default terminal background.

Transparency and the default shared background are saved on the durable Connection record and are restored when that Connection opens again. Child Connection Tabs save terminal transparency and background separately from their parent Connection, so a child row can relaunch with its own appearance. By default, one background is painted once behind the terminal workspace content area for the active Connection Tab, so split terminal Panes share a continuous backdrop. In Settings > Workspace, `settings.separateSplitTerminalBackgrounds` enables per-Pane terminal backgrounds for split layouts; single-terminal Tabs behave the same as the default shared mode. Per-Pane terminal backgrounds are stored with the saved terminal layout and are restored with that layout after app launch. Settings - SSH and Settings - Terminal also expose `settings.randomDynamicBackgroundOnCreate`; when on, new terminal Connections, top-strip new Tabs, and new Child Connection Tabs start with a random dynamic background from the shared registry. Save failures are reported through the Status Bar with `terminal.appearanceSaveFailed`.

## Quick Command Bar

The **Quick Command Bar** is the optional bottom bar for terminal Tabs. `terminal.quickCommandsShow` / `terminal.quickCommandsHide` toggles it. The default is off. The visible state is remembered per Connection id in frontend workspace storage and restored when that Connection is opened again.

The Quick Command Bar shows the active Connection's saved Quick Commands and sends one to the focused terminal Pane. If the Tab has no active terminal Pane, KKTerm reports `terminal.quickCommandsNoPane` through the Status Bar. Quick Commands can optionally append Enter to the command text, and commands marked as risky show the app-owned confirmation dialog `terminal.quickCommandsConfirmTitle` / `terminal.quickCommandsConfirm` before sending input.

`terminal.quickCommandsManage` opens the manager dialog for the current Connection's Quick Command Bar. The Add menu offers `terminal.quickCommandsCustomCommand` and `terminal.quickCommandsLibrary` (From Library). Custom commands let the user choose a built-in icon and app palette color from compact picker dialogs, and decide whether confirmation is required. If an AI API key is configured, `terminal.quickCommandsGenerateWithAi` can turn a short request such as `terminal.quickCommandsAiPromptPlaceholder` into a single command using the active Connection context, then inserts the generated text into the Command field without running it. Presets add common executable snippets to that Connection only.

The AI Assistant and built-in MCP bridge can also inspect Quick Commands through `quick_command_list` / `quick_command_read`, create saved entries through `quick_command_create`, and update existing entries through `quick_command_edit`. Creating or editing a Quick Command saves it to the target Connection's Quick Command Bar but does not run it. In Prompt tool-permission mode, `quick_command_create` and `quick_command_edit` use the normal in-chat approval card before saving.

The From Library dialog keeps `terminal.quickCommandsSearch` at the top as a global filter, then organizes results with `terminal.quickCommandLibrary.categoryTabs` and `terminal.quickCommandLibrary.subcategoryTabs`. Built-in category tabs use the `terminal.quickCommandLibrary.categories.*` keys. Risky or state-changing entries show the `terminal.quickCommandsDangerous` tag, use red command emphasis, and are saved with confirmation enabled so they show `terminal.quickCommandsConfirmTitle` / `terminal.quickCommandsConfirm` before sending input.

Each library entry has `terminal.quickCommandsAdd` to save it to the current Connection and `terminal.quickCommandsRun` to run it once in the selected terminal Pane without saving. One-shot runs close the library dialog first, then use the same confirmation prompt for risky entries. Entries with placeholders such as container, pod, commit, domain, key, or value keep Send Enter disabled by default so the user can edit the command before submitting.

Saved commands can be reordered with drag-and-drop from the grip handle or the `terminal.quickCommandsMoveUp` / `terminal.quickCommandsMoveDown` buttons.

## Saving the buffer

`terminal.save` / `terminal.saveBuffer` writes the current scrollback to a file. Dialog title `terminal.saveDialog`. File filters `terminal.logFiles` and `terminal.textFiles`. Failures surface as `terminal.bufferSaveFailed`. If no save dialog is available (non-Tauri runtime), the status is `terminal.noSaveDialog`. The same `terminal.actions` menu contains `workspace.takeScreenshot`, which opens the Region / entire Pane screenshot capture choices.

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
