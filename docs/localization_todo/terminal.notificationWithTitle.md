# terminal.notificationWithTitle

- **English value**: `Notification from {{name}}: {{title}} — {{message}}`
- **Namespace**: `terminal`
- **File/component**: `src/modules/workspace/connections/terminal/TerminalWorkspace.tsx`
- **UI role**: `status`
- **User flow**: Status Bar notice raised when a program in the terminal sends an OSC 777 notification with a title and body.
- **Tone**: concise/neutral
- **Placeholders**: {{name}}, {{title}}, {{message}} — each {{…}} token must survive unchanged in every locale
- **Context/meaning**: {{name}} is the Connection name; title and body are program-provided text.
- **Domain notes**: Technical terms (OSC, Sixel, iTerm2, URL, Ctrl, Esc, regex tokens like $0–$9) stay English; terminal color scheme names are proper nouns and stay untranslated. Best-effort translations were added for all 13 locales in the same change and still need a verified localization pass.
