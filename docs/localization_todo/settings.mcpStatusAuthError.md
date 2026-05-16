# settings.mcpStatusAuthError

- **English value**: `Auth error`
- **Namespace**: `settings`
- **File/component**: `src/settings/McpServers.tsx` and `src/settings/AddMcpServerDialog.tsx`
- **UI role**: `status`
- **User flow**: Status badge for HTTP 401/403 from the server.
- **Tone**: concise/neutral, matches surrounding KKTerm settings UI
- **Placeholders**: 
- **Domain notes**: "MCP" = Model Context Protocol, "remote MCP" = HTTP-streamable transport (not stdio). KKTerm uses "server" not "client". The literal `{SECRET}` placeholder is a template token and must not be translated. "Keychain" refers to the OS-level credential store (Windows Credential Manager, etc.).
