---
name: tls-certificate-troubleshooter
description: Diagnose TLS and certificate problems in KKTerm, including HTTPS URL Connection errors, expired certificates, untrusted roots, hostname mismatch, SNI, chain issues, corporate inspection, and TLS handshake failures.
---

# TLS Certificate Troubleshooter

Use this skill when HTTPS, API, URL Connection, proxy, or secure service access fails with certificate, trust, hostname, or TLS handshake errors.

## Workflow

1. Identify the failing client and target: WebView2 URL Connection, terminal command, SSH remote host, dashboard widget network request, or another tool.
2. Capture the exact error class: expired certificate, hostname mismatch, unknown issuer, incomplete chain, revoked certificate, protocol version, cipher, or handshake timeout.
3. Separate TLS certificate trust from SSH host key trust. They are different trust systems and should not share remediation steps.
4. Check the hostname used by the client. Certificate validation follows the requested DNS name, not a convenient alias or raw IP address.
5. For corporate inspection or proxy environments, ask whether the issuing CA is expected and managed before suggesting trust changes.
6. Treat clock skew as a first-class cause when certificates appear not-yet-valid or unexpectedly expired.
7. Avoid telling users to disable certificate validation. If a temporary bypass is discussed, label it unsafe and keep it out of saved app settings.
8. For internal services, prefer fixing the certificate chain, SANs, and server configuration over pinning brittle workarounds.

## Command Guidance

- Windows certificate/date context: `Get-Date`, browser/WebView2 error text, and certificate viewer details when available.
- PowerShell HTTPS check: `Invoke-WebRequest https://<host> -Method Head` for a simple client-side error, without adding validation bypasses.
- OpenSSL check when installed: `openssl s_client -connect <host>:443 -servername <host> -showcerts`.
- POSIX remote check: `curl -Iv https://<host>` to view TLS and certificate errors without downloading a body.
- For non-443 services, use the service port and correct SNI/server name when the tool supports it.

## KKTerm Boundaries

- URL Connections use WebView2, which follows Windows trust and proxy behavior.
- Dashboard AI Created Widgets may make network requests only when their permissions allow it and Settings permits widget network tools.
- Secrets and private keys must not be pasted into chat.
- SSH host key warnings belong to SSH troubleshooting, not TLS certificate repair.
