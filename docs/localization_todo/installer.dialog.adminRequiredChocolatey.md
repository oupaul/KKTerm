# installer.dialog.adminRequiredChocolatey

- **English value**: `Chocolatey runs as Administrator (UAC) and installs machine-wide for all users.`
- **Namespace**: `workspace`
- **File/component**: `src/modules/installer/InstallerToolDialog.tsx`
- **UI role**: `status`
- **User flow**: Shown in the Install Helper tool dialog when the selected provider is Chocolatey — both as an inline scope hint on the not-installed dialog and as the body of the update confirmation. Tells the user the operation will elevate and affect all users.
- **Tone**: concise/neutral, factual requirement statement
- **Placeholders**: none
- **Context/meaning**: "Administrator" = Windows admin elevation (UAC prompt); "machine-wide" = system scope, not per-user. This is a requirement notice, not an error.
- **Domain notes**: Chocolatey, UAC stay English/proper nouns. zh-TW must use Taiwan terms: 系統管理員 (Administrator), 使用者 (not 用戶). "machine-wide / all users" → 整台電腦／所有使用者.
