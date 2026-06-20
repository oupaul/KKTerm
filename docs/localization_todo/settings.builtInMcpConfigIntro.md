# settings.builtInMcpConfigIntro

- **English value**: `Paste one of these snippets into an MCP-capable tool, or use a setup command below. The command path uses the kkterm-cli binary beside your running KKTerm app.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/AiSettings.tsx`
- **UI role**: `fragment`
- **User flow**: Shown at the top of the Built-in MCP Server "Show config" dialog (Settings → AI Assistant), which now appears on Windows, macOS, and Linux. Explains how to point an external MCP client at the bundled `kkterm-cli`.
- **Tone**: direct setup guidance, concise/neutral
- **Placeholders**: none
- **Context/meaning**: Reworded from the previous Windows-only phrasing ("kkterm-cli.exe beside your running KKTerm.exe") to be platform-neutral now that the built-in MCP bridge is cross-platform. "binary" = the executable; "app" = the running KKTerm application.
- **Domain notes**: `kkterm-cli`, `KKTerm`, and `MCP` stay English. Do not reintroduce the `.exe` suffix — the surface is cross-platform.

<!--
Filename: settings.builtInMcpConfigIntro.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
