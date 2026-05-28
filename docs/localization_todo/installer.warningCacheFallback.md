# installer.warningCacheFallback

- **English value**: `Could not refresh catalog ({{reason}}). Using cached copy.`
- **Namespace**: `installer`
- **File/component**: `src/modules/installer/InstallerPage.tsx`
- **UI role**: `status`
- **User flow**: Status Bar / page-level warning shown when the fresh catalog fetch failed and the app fell back to its cached copy. {{reason}} is the underlying error.
- **Tone**: concise neutral warning
- **Placeholders**: {{reason}}
- **Domain notes**: "Installer Helper" is the capital-M Module name on the Activity Rail; keep the proper noun phrasing recognisable. Technical terms like UAC, WSL, PATH, npm, winget, MSI typically stay English. "Update all" is the canonical button label.

<!--
Filename: installer.warningCacheFallback.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
