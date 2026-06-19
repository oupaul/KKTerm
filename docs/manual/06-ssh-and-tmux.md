# 06 — SSH and tmux

## AI grep hints

- Keys: `terminal.verifyingHostKey`, `terminal.sshHostKeyChanged`, `terminal.sshHostKeyChangedDetail`, `terminal.sshHostKeyChangeDetail`, `terminal.trustHostKey`, `terminal.hostKeyNotTrusted`, `terminal.selectKeyFile`, `terminal.sshContextUnavailable`, `terminal.showTmux`, `terminal.editTmuxSession`, `terminal.tmuxSessionName`, `terminal.tmuxSessionNameRequired`, `terminal.tmuxSessionNameInvalid`, `terminal.tmuxSessionRenamed`, `terminal.tmuxSessions`, `terminal.refreshTmux`, `terminal.noTmuxSessions`, `terminal.attached`, `terminal.detached`, `terminal.detachTmux`, `terminal.closeTmux`, `terminal.openInPane`, `terminal.openLeft`, `terminal.openRight`, `terminal.openAbove`, `terminal.openBelow`, `terminal.mouseOn`, `terminal.mouseOff`, `terminal.sshPortRedirect`, `terminal.sshPortForwardingTitle`, `terminal.addForward`, `terminal.localListener`, `terminal.remoteListener`, `terminal.destination`, `terminal.forwardTo`, `terminal.bindAddress`, `terminal.listenPort`, `terminal.socksPort`, `terminal.runningForwards`, `terminal.noSshForwards`, `terminal.sshPortForwardOpened`, `settings.xServer`, `settings.xServerManaged`, `settings.xServerLaunch`
- Topics: SSH host key trust, tmux session list, attach / detach / rename tmux, Child Connection Tab tmux resume, SSH local port forward for remote loopback services, SOCKS proxy troubleshooting, managed VcXsrv launch for local X11 windows, tutorial targets `terminal.tmuxSessions`, `terminal.sshPortRedirect`
- Synonyms: "trust this host", "key fingerprint changed", "MITM warning", "tmux session", "screen", "child tmux tab", "saved tmux tab", "port forward", "tunnel", "SOCKS", "proxy", "early eof", "Tinyproxy", "PuTTY", "X11", "X forwarding", "X server", "VcXsrv"

## Host key trust

When connecting to an SSH host, the user sees `terminal.verifyingHostKey`. Host-key verification runs before authentication regardless of the auth method (password, key file, or agent).

For a host that has never been trusted, KKTerm shows an app-owned dialog:

- Trust action title: `terminal.trustHostKey`
- Untrusted state status: `terminal.hostKeyNotTrusted`

If the host key no longer matches a previously trusted key, KKTerm shows a stronger warning dialog instead of failing outright:

- Title: `terminal.replaceChangedHostKeyTitle`
- Body: `terminal.replaceChangedHostKeyWarning`

Confirming this dialog replaces the stored trusted key (the conflicting entry in KKTerm's `ssh_known_hosts` file is removed and the new key is learned); cancelling aborts with `terminal.hostKeyNotTrusted`. This is the fallback path for legitimate key rotation (server reinstall, rotated host keys). `terminal.sshHostKeyChanged`, `terminal.sshHostKeyChangedDetail`, and `terminal.sshHostKeyChangeDetail` remain for descriptive messaging.

This is not a `window.confirm`. Users explicitly approve the new key; the trusted key set is persisted with the Connection's metadata.

`terminal.selectKeyFile` is used by the keyfile picker when authenticating with a private key file. `terminal.sshContextUnavailable` is shown when the SSH transport cannot be reached (rare; surface to user as transport error, not a bug to silently retry).

## Idle behaviour

A live SSH Session has **no app-side idle timeout**. Quiet and unfocused Sessions stay connected until the remote, network, or an explicit user close ends them.

For tmux-enabled SSH Sessions, an unexpected channel close may silently attempt a small bounded reattach to the same Pane tmux id. New Pane tmux ids are drawn directly from the active locale's `ai.tmuxSessionLabels` pool, so the actual remote tmux session name is localized. The Pane tmux id lives in frontend workspace storage; it is not durable Connection model state.

## SOCKS proxy troubleshooting

`settings.sshSocksProxy` and per-Connection SOCKS overrides expect a SOCKS5 server endpoint, such as `host:port` or `username:password@host:port`. They are not HTTP proxy URLs. Some proxy packages, including Tinyproxy, primarily expose an HTTP/HTTPS CONNECT proxy listener and can use SOCKS as an upstream target; that listener is not the same thing as the SOCKS5 endpoint KKTerm dials.

When `ssh.debug.log` shows `connection.socks.connect_ok`, followed later by `connection.disconnected.error` with `error` set to `early eof`, the SOCKS handshake succeeded and the underlying SSH byte stream was closed without a clean SSH disconnect. If PuTTY or OpenSSH reproduces the same disconnect through the same SOCKS server, treat the proxy or network path as the failing component rather than adding KKTerm-specific reconnect workarounds. Check the proxy's listener type, ACLs, upstream rules, timeout/idle settings, connection lifetime limits, and proxy-side logs.

KKTerm keeps tmux recovery intentionally bounded: an existing tmux Session may reattach after a short-lived channel drop, but persistent proxy-side closes should remain visible in the Pane and in `ssh.debug.log`.

## tmux sessions

SSH Connections may opt into tmux. When tmux is enabled, opening the Connection starts (or attaches to) a named tmux session on the remote host. If `tmux` is not installed on the remote, the Pane silently falls back to the normal shell — no error dialog — and the Pane toolbar stops showing tmux controls for that live shell.

When a tmux-enabled SSH Connection is opened through the Connection Tree `workspace.newTab` path (`connections.newTabShortcut`), KKTerm first asks the remote for tmux sessions and picks the newest unattached session by `session_created`, excluding tmux Session ids that are already present in current workspace Panes. If no eligible session is available, or if the tmux listing fails, the new Tab falls through to the normal new-Pane tmux naming path.

When Child Connection Tabs are enabled through `settings.hideTopTabButtons`, a tmux-enabled SSH child uses its tmux session id as the default Child Connection Tab name. The child stores that tmux session id so reopening the child row after app launch attaches to the same remote tmux session instead of allocating a new one. This child record is still frontend Workspace state; the saved SSH Connection stores only the tmux launch preference.

### Tmux session list popover

Opened from the Pane toolbar `terminal.showTmux`.

Tutorial target: `terminal.tmuxSessions`.

- Header: `terminal.tmuxSessions`
- Refresh: `terminal.refreshTmux`
- Loading state: `terminal.loading`
- Empty: `terminal.noTmuxSessions`
- Each row: tmux session name, status `terminal.attached` / `terminal.detached`, tmux-reported last attached time when available, tmux-reported session path when available, and an open action.

Open actions for an unattached session: `terminal.openInPane`, and split-spawn variants `terminal.openLeft`, `terminal.openRight`, `terminal.openAbove`, `terminal.openBelow`.

Per-row actions:

- `terminal.editTmuxSession` — rename. Dialog field `terminal.tmuxSessionName`. Validation: empty (`terminal.tmuxSessionNameRequired`), invalid characters (`terminal.tmuxSessionNameInvalid`). Success status: `terminal.tmuxSessionRenamed`.
- `terminal.detachTmux` — detach the current Pane from the tmux session without ending it.
- `terminal.closeTmux` — terminate the tmux session.

### Tmux mouse toggle

`terminal.mouseOn` / `terminal.mouseOff` enables or disables tmux mouse mode in the attached session.
When tmux mouse mode is off, wheel input over the Pane is kept in KKTerm's terminal scrollback path instead of being sent to the remote shell as cursor-key input.

## SSH local port forwarding

For SSH port forwarding:

- Open `terminal.sshPortRedirect` from the terminal action menu. Once the Connection has one or more enabled mappings, the Pane toolbar also shows a green tunnel button beside `terminal.startRecording`; clicking it opens the same centered dialog.
- The centered dialog title is `terminal.sshPortForwardingTitle`.
- The dialog has Local (`-L`), Remote (`-R`), and Dynamic (`-D`) mode tabs. Counts on the tabs show enabled mappings for the saved SSH Connection.
- Bind address, listener port, destination host, and destination port remain editable text fields with dropdown suggestions. Bind suggestions include loopback, all-interface, and detected local interface addresses. A loopback destination in Local mode suggests listening ports discovered on the remote SSH host.
- Mappings are non-secret per-Connection settings. Child Connection Tabs, split Panes, additional Tabs, and Dashboard-spawned surfaces share the parent SSH Connection's mapping list instead of owning independent forwarding settings.
- Starting an already-running mapping reuses that mapping's stable forward id, so opening additional child/pane/tab surfaces for the same parent Connection does not recreate duplicate local tunnels.
- The current runtime can start Local forwards. Remote and Dynamic mappings can be saved in the dialog but return an unsupported-runtime error if started until those tunnel modes are implemented in the backend.
- Deleting the last enabled mapping removes the green toolbar tunnel button from open SSH Panes after the Connection metadata refreshes.

Tutorial target: `terminal.sshPortRedirect`.

The Local forward runtime uses native SSH forwarding and does not create a second terminal Pane or tmux shell.

## Local X server launcher

Settings - SSH exposes `settings.xServer` for a managed VcXsrv launcher. When `settings.xServerManaged` is enabled, KKTerm detects whether `vcxsrv.exe` is already running the first time it needs the local X server during an app run, then reuses that known-running state for later SSH Sessions instead of probing process status on each open. If VcXsrv is not already running, KKTerm starts it with the configured display number and launch arguments. The Status Bar X indicator reflects that managed X server setting, not live process polling. `settings.xServerLaunch` saves the current SSH settings draft and launches VcXsrv immediately so users can verify the local X server outside an SSH Session.

X11 forwarding is negotiated while a new native SSH Session starts, before the remote shell opens, and the X11 indicator reflects whether the server accepted or rejected that request. SSH Sessions that were already open before enabling or restarting VcXsrv need to be reconnected or opened again before remote X11 apps receive `DISPLAY`. If the Session attaches to an existing tmux pane, that pane's already-running shell may still have the old environment; open a new tmux pane/window or export the new `DISPLAY` inside that shell.

The launcher manages only the local Windows X server process. It does not create a durable Connection and does not store live process state in the Connection model.
