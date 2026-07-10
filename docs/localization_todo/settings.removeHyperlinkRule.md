# settings.removeHyperlinkRule

- **English value**: `Remove rule {{pattern}}`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/TerminalSettings.tsx`
- **UI role**: `tooltip`
- **User flow**: aria-label/tooltip of the delete button on a hyperlink rule row.
- **Tone**: concise/neutral
- **Placeholders**: {{pattern}} — each {{…}} token must survive unchanged in every locale
- **Context/meaning**: {{pattern}} is the rule's regex (or the settings.hyperlinkRule fallback noun).
- **Domain notes**: Technical terms (OSC, Sixel, iTerm2, URL, Ctrl, Esc, regex tokens like $0–$9) stay English; terminal color scheme names are proper nouns and stay untranslated. Best-effort translations were added for all 13 locales in the same change and still need a verified localization pass.
