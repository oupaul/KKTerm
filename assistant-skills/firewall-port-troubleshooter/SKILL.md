---
name: firewall-port-troubleshooter
description: Diagnose firewall, NAT, listener, and port reachability problems in KKTerm, including blocked SSH, RDP, VNC, HTTP(S), SFTP, custom ports, Windows Firewall, and remote service binding issues.
---

# Firewall and Port Troubleshooter

Use this skill when a host is reachable but a service port fails, times out, refuses connections, or works from one network but not another.

## Workflow

1. Identify the protocol and port, including defaults only when the user has not provided one: SSH/SFTP 22, RDP 3389, VNC 5900+, HTTP 80, HTTPS 443.
2. Distinguish timeout, connection refused, reset, TLS/application error, and authentication failure. They point to different layers.
3. Check both sides: client-to-target reachability and whether the target service is actually listening on the expected address and port.
4. Consider path controls: Windows Firewall, host firewall, router/NAT, VPN ACL, cloud security group, corporate proxy, and service allowlists.
5. Prefer targeted allow rules or service binding fixes. Do not recommend disabling a firewall globally except as a short, explicit, user-approved test in a controlled environment.
6. For NAT/port forwarding, verify public/private address, forward target, hairpin NAT expectations, and whether the service is bound to localhost only.
7. For "works locally but not remotely," inspect listen address, firewall profile, and network classification before changing application credentials.
8. Avoid port scans beyond the named target and small named port set unless the user explicitly authorizes broader discovery.

## Command Guidance

- Client test on Windows: `Test-NetConnection <host> -Port <port>`.
- Client test on POSIX/SSH: `nc -vz <host> <port>` or `timeout 5 bash -c '</dev/tcp/<host>/<port>'` when netcat is unavailable.
- Windows listener check: `Get-NetTCPConnection -LocalPort <port> -State Listen` and `Get-Process -Id <pid>` after mapping the owning process.
- POSIX listener check: `ss -ltnp | grep ':<port>'`.
- Windows Firewall read-only check: `Get-NetFirewallRule -Enabled True` filtered by DisplayName, Direction, Profile, or Program.

## KKTerm Boundaries

- SFTP uses the SSH Connection transport; do not diagnose it as a separate open port.
- RDP and VNC are different protocols even when both are remote desktop Sessions.
- A failed port check can explain a Session startup failure, but it does not mutate the stored Connection.
