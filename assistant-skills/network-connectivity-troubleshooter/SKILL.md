---
name: network-connectivity-troubleshooter
description: Diagnose general network connectivity failures in KKTerm, including unreachable hosts, routing, gateway, VPN, proxy, packet loss, latency, MTU, and local-vs-remote reachability checks.
---

# Network Connectivity Troubleshooter

Use this skill when the user asks why a host, service, Connection, URL, or remote network path is unreachable or unreliable.

## Workflow

1. Identify the vantage point: local Windows shell, WSL, SSH Session, remote host, VPN, or another network segment.
2. Clarify the target as narrowly as possible: host/IP, port/protocol if known, and whether the failure is total, intermittent, slow, or one app only.
3. Separate layers before suggesting fixes: name resolution, local interface, default gateway, route, VPN/proxy, firewall, remote listener, and application protocol.
4. Prefer read-only checks first: interface state, IP address, route table, DNS answer, ping when allowed, TCP connect test, and traceroute/path trace.
5. Compare at least two vantage points when possible, such as local KKTerm terminal vs SSH Session from a nearby host.
6. Treat ICMP results carefully. A failed ping does not prove TCP is blocked, and a successful ping does not prove the service is healthy.
7. For intermittent loss or latency, ask for timing, affected destinations, wired vs wireless/VPN state, and recent network changes before recommending resets.
8. For MTU symptoms, look for large transfers hanging, VPN-only failures, TLS stalls, or SSH/SFTP freezes after login.
9. Avoid broad reset commands until targeted evidence points to local network stack corruption.

## Command Guidance

- Windows reachability: `Test-NetConnection <host> -Port <port>` for TCP, `Resolve-DnsName <host>` for DNS, and `tracert <host>` for path checks.
- PowerShell interface/routing: `Get-NetIPConfiguration`, `Get-NetRoute`, `Get-DnsClientServerAddress`.
- POSIX/SSH vantage point: `ip addr`, `ip route`, `getent hosts <host>`, `nc -vz <host> <port>`, `tracepath <host>` or `traceroute <host>` when installed.
- Keep commands read-only unless the user explicitly asks to change adapter, VPN, proxy, or route configuration.

## KKTerm Boundaries

- Stored targets are Connections; live failures happen in Sessions.
- Quick Connect failures may come from draft fields that are not saved yet.
- URL Connections use embedded WebView2 and may be affected by OS proxy, TLS, or corporate inspection.
- SSH, SFTP, RDP, VNC, URL, and local terminal checks can all provide different network vantage points.
