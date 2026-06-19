# settings.customFontsHint

- **English value**: `Press the refresh button to get system fonts. To use custom fonts, put them in the fonts folder.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/AppearanceSettings.tsx`, `src/modules/settings/TerminalSettings.tsx`
- **UI role**: `hint`
- **User flow**: The user sees this shared hint below the Appearance and Terminal font pickers every time those settings sections are open.
- **Tone**: concise guidance
- **Placeholders**: none
- **Context/meaning**: Shared helper text for the font pickers. It explains the refresh action for system fonts and where KKTerm looks for custom fonts.
- **Domain notes**: The "fonts folder" is KKTerm's app-owned custom-font directory. This text is reused in both Settings font sections and should stay synchronized across them.

<!--
Filename: settings.customFontsHint.md (e.g. ai.dashboardToolsDisabledTitle.md)
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
