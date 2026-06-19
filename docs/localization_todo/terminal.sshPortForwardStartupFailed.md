# terminal.sshPortForwardStartupFailed

- **English value**: `SSH connected, but one or more saved port forwards failed to start: {{message}}`
- **Namespace**: `terminal`
- **File/component**: `src/modules/workspace/connections/terminal/TerminalWorkspace.tsx`
- **UI role**: `status`
- **User flow**: Shown as a warning in the Status Bar when an SSH Session connects but at least one saved enabled port forwarding mapping cannot start automatically. Other mappings continue starting and the SSH Session remains connected.
- **Tone**: concise warning with actionable technical detail
- **Placeholders**: `{{message}}` — the runtime forwarding error; preserve this token unchanged in every locale
- **Context/meaning**: `connected` refers to the SSH Session succeeding even though an ancillary saved port forwarding mapping failed.
- **Domain notes**: Preserve SSH terminology and distinguish the live SSH Session from its saved port forwarding mappings.

<!--
Filename: terminal.sshPortForwardStartupFailed.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
