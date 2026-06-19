# SSH Remote Forward Listener UX Design

## Goal

Make Remote (`-R`) forwarding accurately present and assist both ends of the mapping: a local destination on this PC and a listener on the SSH server.

## Local destination suggestions

Add a typed Tauri command in the SSH Session area that returns local TCP listeners as address/port records. In Remote mode, the left destination-port dropdown filters those records against the selected local destination host:

- `localhost`, `127.0.0.1`, and `::1` include matching loopback listeners and compatible wildcard listeners.
- A concrete local address includes listeners bound to that address and compatible wildcard listeners.
- IPv4 and IPv6 address families remain separate.
- Suggested ports are deduplicated and sorted. Existing defaults and saved mapping ports remain available.

Listener discovery failure is non-fatal: the fields remain editable and simply omit discovered suggestions.

## Established mapping presentation

Remote mapping rows show the local destination (`destHost:destPort`) on the left and the remote listener (`bind:listenPort`) on the right, matching the dialog diagram and field groups.

The right endpoint is clickable only when the enabled remote listener is reachable from this PC:

- A concrete non-loopback bind opens that address.
- `0.0.0.0` and `::` open the SSH Connection host instead of the wildcard address.
- Remote loopback binds (`localhost`, `127.0.0.1`, `::1`, or another loopback IP) remain plain text because they are only reachable from the server itself.
- Ports 443 and 8443 use HTTPS; all other ports use HTTP.
- IPv6 URL hosts are bracketed.

Local forwarding keeps its existing clickable local-listener behavior. Dynamic mappings remain non-clickable.

## Listening indicator

The shared Listening chip in the diagram uses the existing green design tokens for every forwarding mode. No hard-coded colors are introduced.

## GatewayPorts reminder

Remote mode shows a muted bottom-left footer reminder: “Remote wildcard listeners require `GatewayPorts clientspecified`; `GatewayPorts no` restricts them to loopback.” The Add Forward action remains bottom-right. Local and Dynamic modes do not show this server-specific reminder.

## Boundaries and documentation

The local listener query lives behind the typed wrapper in `src/lib/tauri.ts`; the dialog does not execute platform commands. Durable `SshPortForwarding` data and runtime forwarding semantics do not change. Update `docs/manual/06-ssh-and-tmux.md` because the behavior is in that manual chapter's scope.

## Verification

- Backend tests cover local-listener parsing and address-family/wildcard matching.
- Frontend model tests cover Remote row ordering and browser URL eligibility/normalization.
- Dialog tests cover local-port discovery wiring and the shared green Listening chip.
- Run the focused tests, TypeScript checking, and Rust tests for the touched backend module.
- Real Tauri validation should confirm the local listener dropdown and browser opening against a reachable SSH server.
