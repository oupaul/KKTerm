# installer.confirm.updateTitle

- **English value**: `Update {{name}}?`
- **Namespace**: `workspace`
- **File/component**: `src/modules/installer/InstallerToolDialog.tsx`
- **UI role**: `heading`
- **User flow**: Title of the single-tool update confirmation dialog in the Install Helper (currently shown for Chocolatey tools, whose update elevates via UAC). `{{name}}` is the tool's brand name.
- **Tone**: concise/neutral, question heading
- **Placeholders**: `{{name}}` — the tool's display name (e.g. "Chocolatey", "ripgrep"); must survive unchanged in every locale.
- **Context/meaning**: "Update" = upgrade an already-installed tool to a newer version. Distinct from `installer.confirm.updateAllTitle` which covers all tools at once.
- **Domain notes**: Tool names are brand/proper nouns and stay untranslated. zh-TW use 更新 for "Update"; keep the {{name}} token.
