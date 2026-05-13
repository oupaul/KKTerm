# connections.ftpIgnoreCertErrors

- **English value**: `Allow invalid TLS certificates`
- **Namespace**: `connections`
- **File/component**: `src/connections/ConnectionSidebar.tsx`
- **UI role**: `label`
- **User flow**: Checkbox label inside the FTP options fieldset, only meaningful when Protocol is FTPS. When enabled, the TLS connector skips certificate and hostname verification — used for self-signed lab servers.
- **Tone**: concise/neutral but the label should not feel inviting; this is a security trade-off the user is explicitly opting into.
- **Placeholders**: none
- **Domain notes**: "TLS" stays English. Translators should preserve the security-warning tone — e.g. avoid wording like "trust everything" or "skip checks" that downplays the risk. Match the convention used in any existing "ignore TLS errors" labels elsewhere in the app, if present.
