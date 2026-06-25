# terminal.sshPortForwardSomeFailed

- **English value**: `Some port forwards failed to start.`
- **Namespace**: `terminal`
- **File/component**: `src/modules/workspace/connections/terminal/TerminalWorkspace.tsx`
- **UI role**: `tooltip`
- **User flow**: Shown as the title of the SSH port-forwarding toolbar button in a terminal Pane when one or more saved port forwards failed to start (e.g. the listen port is already in use); the button turns amber instead of green.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: A warning that at least one SSH port forward could not be bound/started for this live Session. "port forwards" are SSH `-L`/`-R`/`-D` forwards.
- **Domain notes**: SSH stays English. "port forward" is the SSH tunneling feature (Local/Remote/Dynamic forwarding), not a generic network setting.

<!--
Filename: terminal.sshPortForwardSomeFailed.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
