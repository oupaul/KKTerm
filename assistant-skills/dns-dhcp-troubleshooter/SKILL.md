---
name: dns-dhcp-troubleshooter
description: Diagnose DNS and DHCP problems in KKTerm, including failed hostname lookup, wrong records, split DNS, stale cache, DHCP lease issues, gateway/DNS option problems, and VPN DNS behavior.
---

# DNS and DHCP Troubleshooter

Use this skill when a hostname resolves incorrectly, only works on some networks, fails after VPN changes, or the local machine has suspicious IP/gateway/DNS settings.

## Workflow

1. Determine whether the symptom is DNS, DHCP, or both: name lookup failure, wrong address, search suffix issue, no lease, wrong gateway, or wrong DNS server.
2. Identify the resolver path: Windows DNS client, WSL resolver, VPN-provided DNS, remote SSH host resolver, or application-specific proxy.
3. Ask for the exact hostname and expected network context, but do not ask for secrets or private zone contents beyond what is needed.
4. Compare authoritative intent vs client result when available: expected record, actual answer, resolver used, TTL/cache behavior, and search suffix expansion.
5. For split DNS, check whether the user is on the right VPN or network and whether the query is being sent to the internal resolver.
6. For DHCP, inspect lease address, subnet mask, gateway, DNS servers, and lease age before suggesting renew/release actions.
7. Avoid telling users to hard-code public DNS servers when private zones, VPNs, domain controllers, or corporate policy may be required.
8. If flushing cache is suggested, explain that it removes cached client answers but does not fix authoritative records or resolver policy.

## Command Guidance

- Windows DNS: `Resolve-DnsName <host>`, `nslookup <host>`, `Get-DnsClientCache`, `Get-DnsClientServerAddress`.
- Windows DHCP/interface: `Get-NetIPConfiguration`, `ipconfig /all`, `ipconfig /renew` only after confirming a local lease problem.
- WSL/POSIX: `getent hosts <host>`, `resolvectl query <host>` when available, `cat /etc/resolv.conf`.
- Remote SSH vantage point: run resolver checks on the remote host only when the question is about that remote network.

## KKTerm Boundaries

- DNS behavior can differ between local Windows terminal Sessions, WSL, SSH Sessions, and WebView2 URL Connections.
- A Connection hostname is durable data, but DNS answers are runtime environment state.
- Do not rewrite Connection hosts from names to IPs unless the user explicitly wants that tradeoff.
