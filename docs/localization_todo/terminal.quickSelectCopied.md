# terminal.quickSelectCopied

- **English value**: `Copied {{text}}`
- **Namespace**: `terminal`
- **File/component**: `src/modules/workspace/connections/terminal/TerminalWorkspace.tsx`
- **UI role**: `status`
- **User flow**: Status Bar success notice after Quick Select copies the chosen token to the clipboard.
- **Tone**: concise/neutral
- **Placeholders**: {{text}} — each {{…}} token must survive unchanged in every locale
- **Context/meaning**: {{text}} is the (possibly truncated) copied token.
- **Domain notes**: Technical terms (OSC, Sixel, iTerm2, URL, Ctrl, Esc, regex tokens like $0–$9) stay English; terminal color scheme names are proper nouns and stay untranslated. Best-effort translations were added for all 13 locales in the same change and still need a verified localization pass.
