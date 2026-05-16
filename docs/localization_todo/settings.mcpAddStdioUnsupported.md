# settings.mcpAddStdioUnsupported

- **English value**: `This MCP server uses local process execution (stdio transport), which KKTerm does not support.`
- **Namespace**: `settings`
- **File/component**: `src/settings/McpServers.tsx` and `src/settings/AddMcpServerDialog.tsx`
- **UI role**: `error`
- **User flow**: Shown when the pasted config has a command field; we explicitly reject stdio MCPs for security.
- **Tone**: concise/neutral, matches surrounding KKTerm settings UI
- **Placeholders**: 
- **Domain notes**: "MCP" = Model Context Protocol, "remote MCP" = HTTP-streamable transport (not stdio). KKTerm uses "server" not "client". The literal `{SECRET}` placeholder is a template token and must not be translated. "Keychain" refers to the OS-level credential store (Windows Credential Manager, etc.).
