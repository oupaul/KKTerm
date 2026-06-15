# connections.passwordOptionalHint

- **English value**: `Leave blank to enter the password in the terminal`
- **Namespace**: `connections`
- **File/component**: `src/modules/workspace/connections/connection-dialog/SshConnectionFields.tsx`, `src/modules/workspace/connections/connection-dialog/TelnetConnectionFields.tsx`
- **UI role**: `placeholder`
- **User flow**: Shown in the Add Connection dialog as the placeholder of the SSH (password auth) and Telnet password field when no password has been entered yet. Tells the user that leaving the field blank is allowed and that they will be prompted for the password inside the terminal on each connect.
- **Tone**: concise/neutral, direct setup guidance
- **Placeholders**: none
- **Context/meaning**: "terminal" here means the interactive terminal Pane/Session where the remote host's own login prompt is answered, not the local OS terminal app. The password is no longer a required field.
- **Domain notes**: "terminal" is the live terminal Session surface; SSH/Telnet stay English.

<!--
Filename: connections.passwordOptionalHint.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
