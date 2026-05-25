# 06 — SSH and tmux

## AI grep hints

- Keys: `terminal.verifyingHostKey`, `terminal.sshHostKeyChanged`, `terminal.sshHostKeyChangedDetail`, `terminal.sshHostKeyChangeDetail`, `terminal.trustHostKey`, `terminal.hostKeyNotTrusted`, `terminal.selectKeyFile`, `terminal.sshContextUnavailable`, `terminal.showTmux`, `terminal.editTmuxSession`, `terminal.tmuxSessionName`, `terminal.tmuxSessionNameRequired`, `terminal.tmuxSessionNameInvalid`, `terminal.tmuxSessionRenamed`, `terminal.tmuxSessions`, `terminal.refreshTmux`, `terminal.noTmuxSessions`, `terminal.attached`, `terminal.detached`, `terminal.detachTmux`, `terminal.closeTmux`, `terminal.openInPane`, `terminal.openLeft`, `terminal.openRight`, `terminal.openAbove`, `terminal.openBelow`, `terminal.mouseOn`, `terminal.mouseOff`, `terminal.sshPortRedirect`, `terminal.remoteLoopbackPorts`, `terminal.refreshPorts`, `terminal.scanningPorts`, `terminal.noRemoteLoopbackPorts`, `terminal.remoteLoopbackPort`, `terminal.openPortInBrowser`, `terminal.sshPortForwardOpened`
- Topics: SSH host key trust, tmux session list, attach / detach / rename tmux, SSH local port forward for remote loopback services, tutorial targets `terminal.tmuxSessions`, `terminal.sshPortRedirect`
- Synonyms: "trust this host", "key fingerprint changed", "MITM warning", "tmux session", "screen", "port forward", "tunnel"

## Host key trust

When connecting to an SSH host, the user sees `terminal.verifyingHostKey`. If the host key does not match a previously trusted key, KKTerm shows an app-owned dialog:

- Title: `terminal.sshHostKeyChanged`
- Body: `terminal.sshHostKeyChangedDetail` (long form) or `terminal.sshHostKeyChangeDetail`
- Trust action: `terminal.trustHostKey`
- Untrusted state status: `terminal.hostKeyNotTrusted`

This is not a `window.confirm`. Users explicitly approve the new key; the trusted key set is persisted with the Connection's metadata.

`terminal.selectKeyFile` is used by the keyfile picker when authenticating with a private key file. `terminal.sshContextUnavailable` is shown when the SSH transport cannot be reached (rare; surface to user as transport error, not a bug to silently retry).

## Idle behaviour

A live SSH Session has **no app-side idle timeout**. Quiet and unfocused Sessions stay connected until the remote, network, or an explicit user close ends them.

For tmux-enabled SSH Sessions, an unexpected channel close may silently attempt a small bounded reattach to the same Pane tmux id. New Pane tmux ids are drawn directly from the active locale's `ai.tmuxSessionLabels` pool, so the actual remote tmux session name is localized. The Pane tmux id lives in frontend workspace storage; it is not durable Connection model state.

## tmux sessions

SSH Connections may opt into tmux. When tmux is enabled, opening the Connection starts (or attaches to) a named tmux session on the remote host. If `tmux` is not installed on the remote, the Pane silently falls back to the normal shell — no error dialog.

When a tmux-enabled SSH Connection is opened through the Connection Tree `workspace.newTab` path (`connections.newTabShortcut`), KKTerm first asks the remote for tmux sessions and picks the newest unattached session by `session_created`, excluding tmux Session ids that are already present in current workspace Panes. If no eligible session is available, or if the tmux listing fails, the new Tab falls through to the normal new-Pane tmux naming path.

### Tmux session list popover

Opened from the Pane toolbar `terminal.showTmux`.

Tutorial target: `terminal.tmuxSessions`.

- Header: `terminal.tmuxSessions`
- Refresh: `terminal.refreshTmux`
- Loading state: `terminal.loading`
- Empty: `terminal.noTmuxSessions`
- Each row: tmux session name, status `terminal.attached` / `terminal.detached`, an open action.

Open actions for an unattached session: `terminal.openInPane`, and split-spawn variants `terminal.openLeft`, `terminal.openRight`, `terminal.openAbove`, `terminal.openBelow`.

Per-row actions:

- `terminal.editTmuxSession` — rename. Dialog field `terminal.tmuxSessionName`. Validation: empty (`terminal.tmuxSessionNameRequired`), invalid characters (`terminal.tmuxSessionNameInvalid`). Success status: `terminal.tmuxSessionRenamed`.
- `terminal.detachTmux` — detach the current Pane from the tmux session without ending it.
- `terminal.closeTmux` — terminate the tmux session.

### Tmux mouse toggle

`terminal.mouseOn` / `terminal.mouseOff` enables or disables tmux mouse mode in the attached session.
When tmux mouse mode is off, wheel input over the Pane is kept in KKTerm's terminal scrollback path instead of being sent to the remote shell as cursor-key input.

## SSH local port forwarding

For probing a remote service exposed on the remote's loopback interface:

- Open the toolbar action `terminal.sshPortRedirect`.
- The popover header is `terminal.remoteLoopbackPorts`.
- `terminal.refreshPorts` rescans the remote for listening loopback ports. While scanning: `terminal.scanningPorts`. Empty state: `terminal.noRemoteLoopbackPorts`.
- Each row uses `terminal.remoteLoopbackPort` and provides `terminal.openPortInBrowser`, which sets up a local port forward to `127.0.0.1:<port>` and opens it.
- Confirmation: `terminal.sshPortForwardOpened`.

Tutorial target: `terminal.sshPortRedirect`.

This path uses the existing SSH channel for the tunnel — it does not create a second SSH login.
