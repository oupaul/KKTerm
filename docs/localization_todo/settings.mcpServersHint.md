# settings.mcpServersHint

- **English value**: `Connect to remote Model Context Protocol servers so the AI assistant and Dashboard widgets can call their tools. KKTerm supports HTTP streamable MCP servers only; stdio configurations that spawn local processes are not supported.`
- **Namespace**: `settings`
- **File/component**: `src/settings/McpServers.tsx` and `src/settings/AddMcpServerDialog.tsx`
- **UI role**: `fragment`
- **User flow**: Settings -> AI -> MCP section intro paragraph.
- **Tone**: concise/neutral, matches surrounding KKTerm settings UI
- **Placeholders**: 
- **Domain notes**: "MCP" = Model Context Protocol, "remote MCP" = HTTP-streamable transport (not stdio). KKTerm uses "server" not "client". The literal `{SECRET}` placeholder is a template token and must not be translated. "Keychain" refers to the OS-level credential store (Windows Credential Manager, etc.).
