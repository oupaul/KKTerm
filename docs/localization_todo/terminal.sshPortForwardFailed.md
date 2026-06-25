# terminal.sshPortForwardFailed

- **English value**: `Failed to start`
- **Namespace**: `terminal`
- **File/component**: `src/modules/workspace/connections/terminal/SshPortForwardingDialog.tsx`
- **UI role**: `status`
- **User flow**: Shown in the SSH Port Forwarding dialog's running-forwards list, next to an amber exclamation icon, for a forward whose live start failed (e.g. the listen port is already in use). Replaces the usual "active"/"disabled" status text for that row.
- **Tone**: short status phrase
- **Placeholders**: none
- **Context/meaning**: The live SSH forward could not be started/bound. "start" here means bringing the forward up on the live Session, not launching an app.
- **Domain notes**: SSH stays English. Row refers to one SSH port-forward rule (Local/Remote/Dynamic).

<!--
Filename: terminal.sshPortForwardFailed.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
