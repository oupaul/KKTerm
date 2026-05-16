# settings.mcpPastePlaceholder

- **English value**: `{\n  "url": "https://example.com/mcp",\n  "headers": {\n    "Authorization": "Bearer ..."\n  }\n}`
- **Namespace**: `settings`
- **File/component**: `src/settings/McpServers.tsx` and `src/settings/AddMcpServerDialog.tsx`
- **UI role**: `placeholder`
- **User flow**: Textarea placeholder showing the minimum JSON shape.
- **Tone**: concise/neutral, matches surrounding KKTerm settings UI
- **Placeholders**: 
- **Domain notes**: "MCP" = Model Context Protocol, "remote MCP" = HTTP-streamable transport (not stdio). KKTerm uses "server" not "client". The literal `{SECRET}` placeholder is a template token and must not be translated. "Keychain" refers to the OS-level credential store (Windows Credential Manager, etc.).
