# Update Progress and SSH Forwarding Design

## Goal

Make app-update progress visually determinate in the Status Bar and make local SSH forwarding behave correctly for interactive-password Connections while preventing overlapping local listeners.

## Scope

This change covers three behaviors:

1. Render the app-update message, filling progress track, and percentage on one horizontal line.
2. Start a local SSH forward through the authenticated native SSH Session belonging to the Pane that opened the forwarding dialog, including Sessions authenticated with an interactively entered password.
3. Reject a new enabled forwarding mapping when its local listener overlaps another enabled mapping.

Remote (`-R`) and Dynamic (`-D`) runtime support remain out of scope. Saved disabled mappings do not reserve a local endpoint.

## Update Progress UI

`StatusNoticePopup` keeps the existing `StatusBarNotice.progress` value, clamping, percentage rounding, cancellation behavior, and `role="progressbar"` accessibility attributes. Its progress presentation changes from a two-row content grid to one row:

`updateDownloading` message -> flexible progress track -> fixed-width percentage

The track fill width remains the clamped progress percentage. The message and percentage must remain readable while the track shrinks on narrow windows. No new user-visible string is required.

## Authenticated Session Reuse

### Root cause

Normal SSH terminal startup permits native SSH password authentication without a stored password because the terminal channel can collect the password interactively. Local forwarding currently creates a second SSH connection and calls native eligibility with interactive password authentication disabled. An empty-password Connection is therefore rejected before listener startup with the generic native-SSH/ProxyJump error.

### Data flow

The Pane that opens `SshPortForwardingDialog` supplies its live terminal Session id. The frontend includes that Session id when starting a mapping. The backend resolves the id to a live `NativeSsh` transport and sends a forwarding request to that transport's existing worker, following the established live-session command-handle pattern.

The native SSH worker owns the authenticated `russh` Session. It creates the local listener and, for each accepted TCP connection, opens a `direct-tcpip` channel on that same authenticated Session. Closing a mapping stops its listener without closing the terminal Session. Closing the terminal Session stops every forwarding listener attached to it.

This path does not persist, re-request, or transmit the interactive password. It also avoids creating a second SSH connection. If the supplied Session id is missing, closed, or not a native SSH Session, startup returns a specific localized forwarding error and does not save a newly submitted mapping as active.

Existing ProxyJump Sessions that use the system SSH fallback remain unsupported because they do not expose a reusable native `russh` Session.

## Local Bind Conflict Rules

Before persistence, the dialog compares the proposed enabled mapping with all other enabled mappings. The backend repeats the validation immediately before binding so concurrent requests cannot bypass it.

Two listeners conflict when their ports match and their addresses overlap:

- Identical normalized addresses conflict.
- IPv4 wildcard `0.0.0.0` conflicts with every IPv4 address on the same port.
- IPv6 wildcard `::` conflicts with every IPv6 address on the same port.
- IPv4 and IPv6 addresses otherwise remain separate families.
- Host aliases are normalized for the known bind choices: `localhost` is loopback, and equivalent parsed IP spellings compare as their canonical IP values.

The check applies across all enabled mapping modes because local and dynamic forwarding both own local listeners. Disabled mappings do not conflict. Editing or restarting a mapping ignores that mapping's own stable forward id.

On conflict, the dialog leaves the draft unchanged, does not persist or start it, and shows a localized inline error naming the occupied bind address and port. The backend returns the same semantic error as a race-safe backstop. The operating system bind error remains the final fallback for conflicts with listeners outside KKTerm.

## Storage and Runtime State

Saved forwarding mappings remain non-secret per-Connection settings. Live listener ownership stays runtime-only and must not be added to the durable Connection model. Forward ids remain stable identifiers for start/stop and deduplication.

## Documentation

Update `docs/manual/06-ssh-and-tmux.md` to state that local forwarding reuses the authenticated Pane Session, supports an interactively entered password, and rejects overlapping enabled local listeners.

## Tests

Focused regressions will verify:

- The Status Bar source renders message, progress track, and percentage in one inline progress row while retaining progressbar ARIA attributes.
- The forwarding dialog sends the opening Pane's live Session id.
- Duplicate exact binds are rejected before persistence.
- IPv4 and IPv6 wildcard overlap rules are enforced, while distinct non-wildcard addresses and address families are allowed.
- A blank-password native SSH Session is eligible for forwarding through Session reuse without creating a second authenticated SSH connection.
- A missing, closed, or non-native Session returns the targeted error.
- Closing a mapping stops only its listener, while closing its SSH Session cleans up attached listeners.

## Success Criteria

- Update progress visibly fills between the translated download message and percentage.
- A macOS SSH Connection authenticated by entering its password in the terminal can start a local forward from that Pane without another password prompt.
- KKTerm cannot persist or start two enabled mappings whose local bind endpoints overlap.
- Existing stored-password, key-file, and agent native SSH forwarding behavior remains functional.
- ProxyJump forwarding remains explicitly unsupported.
