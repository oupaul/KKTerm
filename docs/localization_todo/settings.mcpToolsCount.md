# settings.mcpToolsCount

- **English value**: `{{count}} tools`
- **Namespace**: `settings`
- **File/component**: `src/settings/McpServers.tsx` and `src/settings/AddMcpServerDialog.tsx`
- **UI role**: `status`
- **User flow**: Tool count badge; uses i18next plural form (see mcpToolsCount_one).
- **Tone**: concise/neutral, matches surrounding KKTerm settings UI
- **Placeholders**: {{count}}
- **Domain notes**: "MCP" = Model Context Protocol, "remote MCP" = HTTP-streamable transport (not stdio). KKTerm uses "server" not "client". The literal `{SECRET}` placeholder is a template token and must not be translated. "Keychain" refers to the OS-level credential store (Windows Credential Manager, etc.).
