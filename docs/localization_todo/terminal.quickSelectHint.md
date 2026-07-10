# terminal.quickSelectHint

- **English value**: `Type a label to copy it. Esc to cancel.`
- **Namespace**: `terminal`
- **File/component**: `src/modules/workspace/connections/terminal/TerminalWorkspace.tsx`
- **UI role**: `status`
- **User flow**: Help pill shown at the bottom of the Quick Select overlay while it is active.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: "Label" means the two-letter hint shown next to each match. Esc is the keyboard key and stays as-is.
- **Domain notes**: Technical terms (OSC, Sixel, iTerm2, URL, Ctrl, Esc, regex tokens like $0–$9) stay English; terminal color scheme names are proper nouns and stay untranslated. Best-effort translations were added for all 13 locales in the same change and still need a verified localization pass.
