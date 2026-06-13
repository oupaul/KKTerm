# sftp.transferringStatus

- **English value**: `{{count}} transferring · {{percent}}%`
- **Namespace**: `sftp`
- **File/component**: `src/modules/workspace/connections/sftp/SftpWorkspace.tsx`
- **UI role**: `status`
- **User flow**: Collapsed transfer-activity bar summary while transfers run, showing how many are in flight and average progress.
- **Tone**: concise/neutral
- **Placeholders**: {{count}} = number of active transfers; {{percent}} = average percent complete. Keep both tokens.
- **Context/meaning**: Live progress summary; the middle-dot separates the two facts.
- **Domain notes**: SFTP/SF Pro/Inter are product/technical terms that stay in English. "Gallery"/"List" are file-view modes. "Pane" is one side of the dual-pane file browser.

<!--
Filename: sftp.transferringStatus.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
