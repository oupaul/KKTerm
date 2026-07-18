# settings.useCursorCliHint

- **English value**: `Use the local Cursor Agent CLI (cursor-agent / agent) as the Cursor backend. Cursor CLI authentication is used instead of an API key.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/AiSettings.tsx`
- **UI role**: hint
- **User flow**: Supporting hint under `settings.useCursorCli` explaining that KKTerm uses the installed Cursor Agent binary and its login, not an API key field.
- **Tone**: direct setup guidance
- **Placeholders**: none
- **Context/meaning**: Explains CLI-backed Cursor provider mode; `cursor-agent` and `agent` are binary names and should stay Latin/command-like.
- **Domain notes**: Preserve binary names `cursor-agent` and `agent`. “Backend” means the AI Assistant runtime path, not a UI panel.
