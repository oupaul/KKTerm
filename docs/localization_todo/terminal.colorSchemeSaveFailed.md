# terminal.colorSchemeSaveFailed

- **English value**: `Saving the color scheme failed: {{message}}`
- **Namespace**: `terminal`
- **File/component**: `src/modules/workspace/connections/terminal/TerminalWorkspace.tsx`
- **UI role**: `error`
- **User flow**: Status Bar notice when persisting the per-Connection color scheme override fails.
- **Tone**: concise/neutral
- **Placeholders**: {{message}} — each {{…}} token must survive unchanged in every locale
- **Context/meaning**: Backend error text is appended verbatim.
- **Domain notes**: Technical terms (OSC, Sixel, iTerm2, URL, Ctrl, Esc, regex tokens like $0–$9) stay English; terminal color scheme names are proper nouns and stay untranslated. Best-effort translations were added for all 13 locales in the same change and still need a verified localization pass.
