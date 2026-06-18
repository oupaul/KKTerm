# settings.systemFontsUnavailable

- **English value**: `System font detection isn't available in this app build.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/AppearanceSettings.tsx`, `src/modules/settings/TerminalSettings.tsx`
- **UI role**: `error`
- **User flow**: Status Bar error notice shown when the user clicks the refresh icon but the runtime cannot enumerate OS fonts (e.g. the browser preview outside the desktop app).
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: Explains the system font refresh cannot run in the current runtime; curated and custom fonts remain available.
- **Domain notes**: none
