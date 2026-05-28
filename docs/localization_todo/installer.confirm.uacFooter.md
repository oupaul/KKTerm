# installer.confirm.uacFooter

- **English value**: `May show up to {{count}} UAC prompt(s).`
- **Namespace**: `installer`
- **File/component**: `src/modules/installer/InstallerConfirmDialog.tsx`
- **UI role**: `fragment`
- **User flow**: Footer sentence inside install or update confirm dialogs warning about likely UAC prompts. {{count}} is the estimated number of prompts.
- **Tone**: direct setup guidance
- **Placeholders**: {{count}}
- **Domain notes**: "Installer Helper" is the capital-M Module name on the Activity Rail; keep the proper noun phrasing recognisable. Technical terms like UAC, WSL, PATH, npm, winget, MSI typically stay English. "Update all" is the canonical button label.

<!--
Filename: installer.confirm.uacFooter.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
