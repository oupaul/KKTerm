# 05 — Terminal

## AI grep hints

- Keys: `terminal.actions`, `terminal.copy`, `terminal.copyShortcut`, `terminal.paste`, `terminal.pasteMultilineConfirm`, `terminal.find`, `terminal.findInScrollback`, `terminal.noResults`, `terminal.closeSearch`, `terminal.previousSearch`, `terminal.nextSearch`, `terminal.font`, `terminal.increaseSize`, `terminal.decreaseSize`, `terminal.resetSize`, `terminal.opacity`, `terminal.opacityValue`, `terminal.background`, `terminal.backgroundDefaultHint`, `terminal.appearanceSaveFailed`, `terminal.save`, `terminal.saveBuffer`, `terminal.bufferSaveFailed`, `terminal.startRecording`, `terminal.stopRecording`, `terminal.recording`, `terminal.openRecordings`, `terminal.recordingsTitle`, `terminal.openRecordingsFolder`, `terminal.noRecordings`, `terminal.logFiles`, `terminal.textFiles`, `terminal.quickCommandsShow`, `terminal.quickCommandsHide`, `terminal.quickCommandsManage`, `terminal.quickCommandsLibrary`, `terminal.quickCommandLibrary`, `terminal.quickCommandsCustomCommand`, `terminal.quickCommandsGenerateWithAi`, `terminal.quickCommandsAiPromptLabel`, `terminal.quickCommandsAiPromptPlaceholder`, `terminal.quickCommandsNoPane`, `terminal.starting`, `terminal.sessionFor`, `terminal.startingSessionFor`, `terminal.failedToStart`, `terminal.failedToStartDetail`, `terminal.desktopRuntimeRequired`, `terminal.tauriRequired`, `terminal.noSaveDialog`, `terminal.saveDialog`, `terminal.connectLabel`, `terminal.targetLabel`, `workspace.takeScreenshot`, `settings.submitAiAttachmentsDirectly`, `connections.wslDistribution`
- Keys (WezTerm-inspired batch): `terminal.colorScheme`, `terminal.colorSchemeGlobalDefault`, `terminal.colorSchemeSaveFailed`, `terminal.quickSelect`, `terminal.quickSelectHint`, `terminal.quickSelectNoMatches`, `terminal.quickSelectCopied`, `terminal.notification`, `terminal.notificationWithTitle`
- Topics: terminal external links, copy/paste, multiline paste confirmation, find in scrollback, font size, Quick Command Bar, quick commands, save buffer to file, recording terminal output, starting state, quick select, prompt navigation, shell integration, inline images, terminal notifications, color schemes, tutorial targets `terminal.pane`, `terminal.startRecording`, `terminal.openSftp`, `terminal.copySelection`, `terminal.sendToAi`, `terminal.actions`, `terminal.searchBar`, `terminal.surface`
- Synonyms: "open link in browser", "external browser", "highlight text", "search terminal", "zoom terminal", "shrink font", "terminal opacity", "transparent terminal", "terminal wallpaper", "terminal background", "quick command bar", "quick command", "command shortcut", "export log", "record session", "terminal recording", "transcript", "copy url without mouse", "hint labels", "jump to previous command", "OSC 133", "sixel", "imgcat", "terminal theme", "dracula", "solarized"

## Rendering

Terminal Panes are rendered by xterm.js. Local terminals use ConPTY through `portable_pty`; SSH terminals use KKTerm's `NativeSsh` transport. Both run through the real Tauri runtime — a Vite browser preview cannot host them. Behaviour like focus and input must be validated against `npm run tauri dev` or the built `kkterm.exe`.

Tutorial targets: `terminal.pane`, `terminal.surface`.

## Starting state

While a Session is starting up, the Pane shows:

- `terminal.starting` (spinner)
- `terminal.sessionFor` or `terminal.startingSessionFor` with the target name
- For SSH: `terminal.verifyingHostKey` while the host key is verified.

Failure shows `terminal.failedToStart` / `terminal.failedToStartDetail`. Outside the Tauri runtime (e.g. browser preview), `terminal.desktopRuntimeRequired` or `terminal.tauriRequired` is shown instead.

## Local WSL Connections

When adding or editing a Local Terminal Connection, choosing WSL from `connections.shell` makes KKTerm query the installed WSL distributions with the same `installer_wsl_list_distros` backend used by the Install Helper manager. If distributions are available, the form shows `connections.wslDistribution`; choosing one stores the shell as `wsl.exe --distribution <name>` so the Connection opens that distro directly. Leaving the field at `connections.default` keeps plain `wsl.exe` and follows the Windows default distribution. The terminal toolbar still shows the saved Connection name, such as `WSL - Ubuntu`, rather than the stored launch command. During new Connection creation, an explicit distro choice also seeds the Connection icon from the bundled OS icon set when a matching distro logo exists, unless the user picks an icon manually.

## Telnet compatibility

Telnet Sessions negotiate binary transfer, remote echo, suppress-go-ahead character mode, terminal type, and character-cell window size. KKTerm identifies its xterm.js surface as `XTERM`; when a server repeats the terminal-type request to ask for an alternative, KKTerm answers `VT100`, repeats that final fallback once to mark the end of the list, then cycles back to `XTERM` if the server asks again. LINEMODE and unsupported options are refused so legacy hosts can fall back to interactive character mode. Input escapes Telnet command bytes and follows NVT newline rules until binary mode is enabled. Pane resizes are sent after the server enables NAWS.

For troubleshooting, enable `settings.advancedDebugging` and inspect `telnet.debug.log` from `settings.openLogFolder`. The log records option names/codes, negotiation decisions, selected terminal type, window sizes, lifecycle errors, and byte counts. It deliberately omits terminal contents, typed input, and credential values.

## Copy and paste

Ctrl-click an `http` or `https` link rendered in any terminal Pane to open it in the OS default browser through KKTerm's external opener. This applies to local, SSH, Telnet, and Serial terminal Sessions because they share the same xterm.js renderer.

- Copy selected text with `terminal.copy` (shortcut hint `terminal.copyShortcut`) or Right-click → `terminal.copy`. When `settings.copyOnSelect` is enabled, completing a mouse selection copies it to the system clipboard automatically; in tmux mouse mode, hold Shift while selecting so xterm.js performs a local selection instead of forwarding the drag to tmux.
- Paste: `terminal.paste`. Multi-line pastes prompt a confirmation `terminal.pasteMultilineConfirm` to prevent accidental command execution.
- Send terminal buffer to AI: `terminal.sendToAi`. By default `settings.submitAiAttachmentsDirectly` submits the buffer with `ai.directAttachmentPrompt`; when disabled, the button only attaches the buffer to the composer.

Do not use `window.prompt` / `window.confirm` for paste confirmation; the implementation is an app-owned dialog with translated strings.

## Quick Select

`terminal.quickSelect` (Pane toolbar immediately left of `terminal.copySelection`, or Ctrl+Shift+Space) scans the visible terminal screen for copyable tokens — URLs, file paths, IPv4 addresses, MAC addresses, git hashes, UUIDs, and email addresses — and overlays a two-letter hint button on each match. Typing a label or clicking its button copies that token to the clipboard and reports `terminal.quickSelectCopied` through the Status Bar. Ctrl-clicking or Shift-clicking an `http` or `https` match opens it directly in the external browser; modified clicks on any other token copy it normally. Esc or a click on empty overlay space cancels (`terminal.quickSelectHint` is shown while active). If nothing on screen matches, the Status Bar shows `terminal.quickSelectNoMatches`. Matches are labelled bottom-up so the most recent output gets the shortest reachable labels.

## Shell integration (OSC 133)

When the shell emits OSC 133 command marks (as the WezTerm/VS Code shell-integration snippets for bash, zsh, fish, and PowerShell do), a command that exits non-zero gets a small red mark in the left gutter at the line where it finished (requires `D;exitCode`). Without shell integration this is simply inert — no configuration is required. tmux does not forward OSC 133 from the inner shell, so tmux-backed Panes do not surface it.

The prompt-to-prompt scrollback navigation and copy-last-command-output menu surfaces were removed/hidden because too few shells emit the marks by default; the renderer still tracks command-output zones so both can return once KKTerm can inject shell integration itself (see the roadmap).

## Inline images

When `settings.enableInlineImages` is on (default), programs can draw images directly into the terminal using the Sixel or iTerm2 inline image protocols (e.g. `imgcat photo.png` over SSH). Turning the toggle off applies to newly opened terminal Panes.

## Terminal notifications

When `settings.allowTerminalNotifications` is on (default), a program that raises an OSC 9 or OSC 777 notification (for example a long build signalling completion) surfaces it as a Status Bar notice using `terminal.notification` or `terminal.notificationWithTitle`, prefixed with the Connection name. Turning the toggle off silences already-open terminals immediately.

## Sync input to all terminals

Each terminal Pane toolbar has a `workspace.syncInput` toggle, immediately left of the Quick Command Bar toggle. When on, keystrokes typed into the focused terminal Pane are mirrored to every other open terminal Pane, for running the same command across many Sessions at once. Only real keyboard, IME, and paste text is mirrored — mouse and focus control sequences (clicks, drags, scroll, focus reports) are filtered out so they do not arrive as garbled coordinates in other Panes or in shells that never enabled mouse mode. Mirrored input goes straight to each target Pane's PTY, so multi-line paste confirmation still applies once on the Pane the user types in. Because input also reaches terminal Panes on Tabs that are not currently visible, enabling the toggle shows the warning popup `workspace.syncInputEnabledNotice`, the toggle pulses green on every terminal Pane, each receiving Pane shows a pulsing green outline, and connected terminal Connections in the Connection Tree replace their green status dot with a pulsing radio indicator. Activating either the sync-input toggle or the Quick Command Bar toggle returns text focus to the terminal Pane. Closing any participating terminal Pane turns the mode off immediately; closing a non-terminal Pane does not. The mode is runtime-only and off by default after launch.

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

These controls apply the new size to every Pane in the current Tab and save it as
the global terminal font size, so the change is preserved across app launches. When `settings.hideTopTabButtons` is enabled and the focused Pane belongs to a Child Connection Tab, the font-size change is stored on that Child Connection Tab instead of the parent Connection or global terminal settings.

Font family, default size, ligature settings, and cursor style are configured globally in Settings → Terminal (see [15-settings.md](15-settings.md) §Terminal).

## View submenu

`terminal.view` toggles per-Pane rendering preferences exposed by the terminal Pane (cursor, line height, etc.).

## Appearance controls

The Pane hamburger menu (`terminal.actions`) includes per-Connection appearance controls for local, SSH, WSL/PowerShell, Telnet, and other xterm-backed terminal Connections:

- `terminal.opacity` opens a Transparency slider labelled by `terminal.opacityValue`. New terminal Connections default to 50% transparency; Settings - SSH and Settings - Terminal expose `settings.defaultTransparency` to change the starting value for newly-created SSH or local/Telnet/Serial terminal surfaces.
- `terminal.background` opens the same shared background picker used by Dashboard Views. It reuses the Dashboard background modes, shared background picker datasource, media picker (PNG/JPEG/WebP/GIF/BMP/SVG images and MP4/WebM/MOV/M4V/OGV videos), fit, dim labels, dynamic-background registry, and Dynamic-tab live preview dialog (`dashboard.backgroundLivePreview` / `dashboard.backgroundLivePreviewTitle`). `terminal.backgroundDefaultHint` describes returning to the default terminal background.

- `terminal.colorScheme` opens the bundled 117-scheme catalog: KKTerm's original palettes plus every TerminalColors downloadable variant that is not already represented. Scheme names are proper nouns and stay untranslated. Every row uses the scheme's own background and foreground colors as an at-a-glance sample. Hovering a menu item previews that scheme in the current terminal Pane without saving it; moving out of the submenu restores the saved scheme. `terminal.colorSchemeGlobalDefault` clears the per-Connection override so the global default from Settings → Terminal (`settings.terminalColorScheme`) applies. Picking a scheme applies it live to every open Pane of the Connection and saves the override on the durable Connection record; save failures surface as `terminal.colorSchemeSaveFailed`. The scheme's background respects the Pane's transparency setting. The generated catalog is refreshed from `https://terminalcolors.com/` with `npm run terminal-colors:sync`; the app never fetches palettes at runtime.

Transparency and the default shared background are saved on the durable Connection record and are restored when that Connection opens again. Child Connection Tabs save terminal font size, transparency, and background separately from their parent Connection, so a child row can relaunch with its own appearance. By default, one background is painted once behind the terminal workspace content area for the active Connection Tab, so split terminal Panes share a continuous backdrop. In Settings > Workspace, `settings.separateSplitTerminalBackgrounds` enables per-Pane terminal backgrounds for split layouts; single-terminal Tabs behave the same as the default shared mode. Per-Pane terminal backgrounds are stored with the saved terminal layout and are restored with that layout after app launch. Settings - SSH and Settings - Terminal also expose `settings.randomDynamicBackgroundOnCreate`; when on, new terminal Connections, top-strip new Tabs, and new Child Connection Tabs start with a random dynamic background from the shared registry. Save failures are reported through the Status Bar with `terminal.appearanceSaveFailed`.

## Quick Command Bar

The **Quick Command Bar** is the optional bottom bar for terminal Tabs. `terminal.quickCommandsShow` / `terminal.quickCommandsHide` toggles it. The default is off. The visible state is remembered per Connection id in frontend workspace storage and restored when that Connection is opened again.

The Quick Command Bar shows the active Connection's saved Quick Commands and sends one to the focused terminal Pane. If the Tab has no active terminal Pane, KKTerm reports `terminal.quickCommandsNoPane` through the Status Bar. Quick Commands can optionally append Enter to the command text, and commands marked as risky show the app-owned confirmation dialog `terminal.quickCommandsConfirmTitle` / `terminal.quickCommandsConfirm` before sending input.

`terminal.quickCommandsManage` opens the manager dialog for the current Connection's Quick Command Bar. The Add menu offers `terminal.quickCommandsCustomCommand` and `terminal.quickCommandsLibrary` (From Library). Custom commands let the user choose a built-in icon, an app palette color, or a custom color from the shared rainbow selector, and decide whether confirmation is required. If an AI API key is configured, `terminal.quickCommandsGenerateWithAi` can turn a short request such as `terminal.quickCommandsAiPromptPlaceholder` into a single command using the active Connection context, then inserts the generated text into the Command field without running it. Presets add common executable snippets to that Connection only.

Quick Command command, label, search, and AI-generation prompt fields use the
app's technical-input behaviour: OS autocorrect, autocapitalization, and
spellcheck are disabled in the WebView on Windows and macOS so shell text is not
rewritten while editing. Keyboard/IME suggestions outside the WebView remain
owned by the OS.

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
