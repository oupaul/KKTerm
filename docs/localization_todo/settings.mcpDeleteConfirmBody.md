# settings.mcpDeleteConfirmBody

- **English value**: `Remove the "{{name}}" MCP server? Its auth secret will be deleted from the keychain and widgets that reference this server will fail until reconfigured.`
- **Namespace**: `settings`
- **File/component**: `src/settings/McpServers.tsx` and `src/settings/AddMcpServerDialog.tsx`
- **UI role**: `fragment`
- **User flow**: Body text in the delete-confirm dialog.
- **Tone**: concise/neutral, matches surrounding KKTerm settings UI
- **Placeholders**: {{name}}
- **Domain notes**: "MCP" = Model Context Protocol, "remote MCP" = HTTP-streamable transport (not stdio). KKTerm uses "server" not "client". The literal `{SECRET}` placeholder is a template token and must not be translated. "Keychain" refers to the OS-level credential store (Windows Credential Manager, etc.).
