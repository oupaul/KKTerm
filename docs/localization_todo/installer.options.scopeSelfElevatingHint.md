# installer.options.scopeSelfElevatingHint

- **English value**: `This installer may still show UAC in per-user scope.`
- **Namespace**: `installer`
- **File/component**: `src/modules/installer/InstallerToolDialog.tsx`
- **UI role**: `fragment`
- **User flow**: `Shown under the Installer Helper scope picker for known winget packages whose upstream manifests declare a user-scope installer that still self-elevates. It warns that choosing per-user does not guarantee a no-UAC install for those packages.`
- **Tone**: `concise/neutral warning`
- **Placeholders**: `none`
- **Domain notes**: `Installer Helper is a built-in Module name. UAC means Windows User Account Control and may be preserved as the platform term. Per-user scope means the current Windows user rather than all users, but the underlying installer can still request elevation.`

<!--
Filename: installer.options.scopeSelfElevatingHint.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
