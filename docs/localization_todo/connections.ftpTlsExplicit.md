# connections.ftpTlsExplicit

- **English value**: `Explicit (AUTH TLS)`
- **Namespace**: `connections`
- **File/component**: `src/connections/ConnectionSidebar.tsx`
- **UI role**: `label`
- **User flow**: Option in the TLS-mode dropdown. Selecting Explicit connects plaintext on the standard FTP port and upgrades to TLS via the `AUTH TLS` command (RFC 4217).
- **Tone**: concise/neutral.
- **Placeholders**: none
- **Domain notes**: "AUTH TLS" is the literal FTP control command name and stays English/uppercase. Translators may localize "Explicit" while keeping "(AUTH TLS)" verbatim.
