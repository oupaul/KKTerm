# installer.wslReboot

- **English value**: `WSL was enabled this session. Reboot Windows before installing Docker Desktop.`
- **Namespace**: `installer`
- **File/component**: `src/modules/installer/ToolRow.tsx`
- **UI role**: `status`
- **User flow**: Inline hint shown on tool rows that need WSL (e.g. Docker Desktop) after the user enabled WSL this session but has not rebooted yet.
- **Tone**: short cautionary phrase
- **Placeholders**: none
- **Domain notes**: "Installer Helper" is the capital-M Module name on the Activity Rail; keep the proper noun phrasing recognisable. Technical terms like UAC, WSL, PATH, npm, winget, MSI typically stay English. "Update all" is the canonical button label.

<!--
Filename: installer.wslReboot.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
