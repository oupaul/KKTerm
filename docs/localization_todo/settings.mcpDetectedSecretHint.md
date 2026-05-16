# settings.mcpDetectedSecretHint

- **English value**: `An authentication header was detected. The token will be stored in the OS keychain; only a {SECRET} placeholder is persisted in the SQLite config.`
- **Namespace**: `settings`
- **File/component**: `src/settings/McpServers.tsx` and `src/settings/AddMcpServerDialog.tsx`
- **UI role**: `fragment`
- **User flow**: Help text on the secret-detection step of the add dialog. The {SECRET} placeholder is literal and must not be translated.
- **Tone**: concise/neutral, matches surrounding KKTerm settings UI
- **Placeholders**: 
- **Domain notes**: "MCP" = Model Context Protocol, "remote MCP" = HTTP-streamable transport (not stdio). KKTerm uses "server" not "client". The literal `{SECRET}` placeholder is a template token and must not be translated. "Keychain" refers to the OS-level credential store (Windows Credential Manager, etc.).
