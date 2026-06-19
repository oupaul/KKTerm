# terminal.sshPortForwardBindConflict

- **English value**: `{{address}}:{{port}} is already in use by another SSH forward.`
- **Namespace**: `terminal`
- **File/component**: `src/modules/workspace/connections/terminal/SshPortForwardingDialog.tsx`
- **UI role**: `error`
- **User flow**: `Shown when an enabled SSH forwarding mapping already owns an overlapping local bind address and port.`
- **Tone**: `concise/neutral`
- **Placeholders**: `{{address}}, {{port}}`
- **Context/meaning**: `Explains that KKTerm rejected a duplicate local listener endpoint before saving or starting it.`
- **Domain notes**: `SSH forward means an SSH port-forwarding mapping. Preserve both placeholders exactly.`

<!--
Filename: terminal.sshPortForwardBindConflict.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
