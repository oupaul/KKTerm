# installer.confirm.uninstallDependentsBody

- **English value**: `Uninstalling {{name}} will leave these installed tools without a prerequisite:`
- **Namespace**: `installer`
- **File/component**: `src/modules/installer/ToolRow.tsx`
- **UI role**: `fragment`
- **User flow**: Body sentence inside the uninstall confirm dialog when other installed tools depend on this one. {{name}} is the tool being uninstalled.
- **Tone**: direct setup guidance
- **Placeholders**: {{name}}
- **Domain notes**: "Installer Helper" is the capital-M Module name on the Activity Rail; keep the proper noun phrasing recognisable. Technical terms like UAC, WSL, PATH, npm, winget, MSI typically stay English. "Update all" is the canonical button label.

<!--
Filename: installer.confirm.uninstallDependentsBody.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
