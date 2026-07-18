# installer.status.installedOfficialScript

- **English value**: `Installed (official script)`
- **Namespace**: `installer`
- **File/component**: `src/modules/installer/ToolRow.tsx`, `src/modules/installer/InstallerListRow.tsx`
- **UI role**: status
- **User flow**: Shown on an Install Helper tile/list badge when uv (or the Python (uv) bundle) was detected from Astral's standalone install.ps1 rather than WinGet.
- **Tone**: concise/neutral status label
- **Placeholders**: none
- **Context/meaning**: "Installed" status with an install-source note. "Official script" means the vendor's standalone installer script (Astral `install.ps1`), not a theatrical script and not "script" as in automation code the user wrote.
- **Domain notes**: Keep "official script" as the install-source label; do not replace with WinGet/Chocolatey package-manager names.
