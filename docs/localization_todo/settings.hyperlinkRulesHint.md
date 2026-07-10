# settings.hyperlinkRulesHint

- **English value**: `Turn matching terminal text into Ctrl+click links. $0–$9 in the URL insert capture groups.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/TerminalSettings.tsx`
- **UI role**: `fragment`
- **User flow**: Hint under the Hyperlink rules legend.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: $0–$9 are literal substitution tokens and must stay unchanged.
- **Domain notes**: Technical terms (OSC, Sixel, iTerm2, URL, Ctrl, Esc, regex tokens like $0–$9) stay English; terminal color scheme names are proper nouns and stay untranslated. Best-effort translations were added for all 13 locales in the same change and still need a verified localization pass.
