# settings.mcpPasteHint

- **English value**: `Paste an HTTP MCP server JSON config. Common shapes work: a single { "url": ..., "headers": ... } object or a Claude Desktop-style { "mcpServers": { "name": { ... } } } map.`
- **Namespace**: `settings`
- **File/component**: `src/settings/McpServers.tsx` and `src/settings/AddMcpServerDialog.tsx`
- **UI role**: `fragment`
- **User flow**: Help text above the JSON paste textarea in the add-server dialog.
- **Tone**: concise/neutral, matches surrounding KKTerm settings UI
- **Placeholders**: 
- **Domain notes**: "MCP" = Model Context Protocol, "remote MCP" = HTTP-streamable transport (not stdio). KKTerm uses "server" not "client". The literal `{SECRET}` placeholder is a template token and must not be translated. "Keychain" refers to the OS-level credential store (Windows Credential Manager, etc.).
