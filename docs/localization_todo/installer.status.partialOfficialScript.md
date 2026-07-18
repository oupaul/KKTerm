# installer.status.partialOfficialScript

- **English value**: `Partially installed ({{installed}}/{{total}}, official script)`
- **Namespace**: `installer`
- **File/component**: `src/modules/installer/ToolRow.tsx`, `src/modules/installer/InstallerListRow.tsx`
- **UI role**: status
- **User flow**: Shown when the Python (uv) bundle detects Astral's standalone uv install but Python 3.13 is not yet available through uv.
- **Tone**: concise/neutral status label
- **Placeholders**: `{{installed}}`, `{{total}}` — both must survive unchanged; keep one full sentence/phrase so translators can reorder numerals and the source note.
- **Context/meaning**: Same "partially installed N/M" sense as `installer.status.partial`, plus the install-source note "official script" (Astral standalone installer), not a user-written script.
- **Domain notes**: Preserve the N/M count placeholders; "official script" is the install source label for Astral `install.ps1`.
