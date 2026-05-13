# connections.ftpTlsImplicit

- **English value**: `Implicit (port 990)`
- **Namespace**: `connections`
- **File/component**: `src/connections/ConnectionSidebar.tsx`
- **UI role**: `label`
- **User flow**: Option in the TLS-mode dropdown. Selecting Implicit makes the client open a TLS connection from byte one, traditionally on port 990 — no plaintext AUTH TLS step.
- **Tone**: concise/neutral.
- **Placeholders**: none
- **Domain notes**: "port 990" is the legacy implicit-FTPS port number and stays digits. Translators may localize "Implicit" while keeping "(port 990)" verbatim. (Note: currently implicit FTPS is rejected at runtime in this build; the option is present for forward-compatibility.)
