# ai.cursorCliRequired

- **English value**: `Enable Cursor Agent CLI in Settings before AI Assistant can chat.`
- **Namespace**: `ai`
- **File/component**: `src/ai/providers.ts`
- **UI role**: error
- **User flow**: Shown when the user tries to chat with the Cursor provider while the Cursor Agent CLI toggle is off.
- **Tone**: concise/neutral setup guidance
- **Placeholders**: none
- **Context/meaning**: Blocking validation error — Cursor has no HTTP API-key path in KKTerm, so the CLI toggle must be enabled.
- **Domain notes**: Keep “Cursor Agent CLI” and “AI Assistant” / Settings as product terms consistent with other AI provider errors.
