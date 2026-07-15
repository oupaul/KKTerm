# settings.rightClickPasteHint

- **English value**: `Right-clicking the terminal pastes the clipboard instead of opening the context menu. Hold Shift and right-click to open the menu.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/TerminalSettings.tsx`
- **UI role**: `tooltip`
- **User flow**: Hint under the `settings.rightClickPaste` toggle in Settings → Terminal → Clipboard and paste.
- **Tone**: direct setup guidance
- **Placeholders**: none
- **Context/meaning**: Second sentence documents the escape hatch: with the option on, Shift+right-click still opens the terminal context menu.
- **Domain notes**: "Shift" stays untranslated as a key name; "context menu" is the app-owned right-click menu, not the OS menu.

<!--
Filename: settings.rightClickPasteHint.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
