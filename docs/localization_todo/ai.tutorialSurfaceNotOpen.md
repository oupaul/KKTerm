# ai.tutorialSurfaceNotOpen

- **English value**: `That control lives inside a Tab that is not open right now.`
- **Namespace**: `ai`
- **File/component**: `src/App.tsx`
- **UI role**: `error`
- **User flow**: Returned to the AI Assistant when it asks to highlight a tutorial control that lives inside a Workspace Tab surface (terminal, SFTP, WebView, or remote desktop) while no Tab of that kind is open. The assistant relays this so it tells the user the surface isn't open instead of pointing at a control that isn't on screen.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Domain notes**: "Tab" is the frontend Workspace container (see CONTEXT.md), not a browser tab; keep the KKTerm Tab meaning.
