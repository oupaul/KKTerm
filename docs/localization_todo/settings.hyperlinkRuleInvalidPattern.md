# settings.hyperlinkRuleInvalidPattern

- **English value**: `The pattern \"{{pattern}}\" is not a valid regular expression.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/TerminalSettings.tsx`
- **UI role**: `error`
- **User flow**: Validation error when a hyperlink rule's regex does not compile.
- **Tone**: concise/neutral
- **Placeholders**: {{pattern}} — each {{…}} token must survive unchanged in every locale
- **Context/meaning**: Straightforward; no conflicting senses elsewhere.
- **Domain notes**: Technical terms (OSC, Sixel, iTerm2, URL, Ctrl, Esc, regex tokens like $0–$9) stay English; terminal color scheme names are proper nouns and stay untranslated. Best-effort translations were added for all 13 locales in the same change and still need a verified localization pass.
