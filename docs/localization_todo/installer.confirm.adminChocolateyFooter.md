# installer.confirm.adminChocolateyFooter

- **English value**: `Chocolatey requires Administrator — you'll see a UAC prompt, and the change affects all users on this machine.`
- **Namespace**: `workspace`
- **File/component**: `src/modules/installer/InstallerToolDialog.tsx`
- **UI role**: `status`
- **User flow**: Footer line in the Install Helper confirmation dialog for Chocolatey update and uninstall operations, shown just before the user confirms and the UAC prompt appears.
- **Tone**: concise/neutral, factual requirement statement
- **Placeholders**: none
- **Context/meaning**: Warns that confirming will trigger a Windows UAC elevation prompt and that the operation is machine-wide (affects every user account). Not an error.
- **Domain notes**: Chocolatey, UAC stay English/proper nouns. zh-TW must use Taiwan terms: 系統管理員 (Administrator), 使用者 (not 用戶), 整台電腦 / 這台電腦 (this machine). Do not copy from zh-CN.
