# installer.status.failed

- **English value**: `Failed: {{message}}`
- **Namespace**: `installer`
- **File/component**: `src/modules/installer/ToolRow.tsx`
- **UI role**: `status`
- **User flow**: Terminal badge shown on a tool row when its install or uninstall failed; carries the underlying error message.
- **Tone**: short error label
- **Placeholders**: {{message}}
- **Domain notes**: "Installer Helper" is the capital-M Module name on the Activity Rail; keep the proper noun phrasing recognisable. Technical terms like UAC, WSL, PATH, npm, winget, MSI typically stay English. "Update all" is the canonical button label.

<!--
Filename: installer.status.failed.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
