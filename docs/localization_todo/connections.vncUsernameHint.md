# connections.vncUsernameHint

- **English value**: `Optional. Use the Mac account name for macOS Screen Sharing / Apple Remote Desktop login. Leave blank for password-only VNC.`
- **Namespace**: `connections`
- **File/component**: `src/modules/workspace/connections/connection-dialog/VncConnectionFields.tsx`
- **UI role**: `tooltip`
- **User flow**: `Shown as hint text beneath the username input in the VNC Connection properties dialog. Guides the user on when to fill in the username versus leaving it blank.`
- **Tone**: `direct setup guidance`
- **Placeholders**: `none`
- **Context/meaning**: `Explains that the username field is optional and is specifically for macOS Screen Sharing / Apple Remote Desktop (ARD) authentication, which requires both a Mac account name and a password. For standard password-only VNC servers, the field should be left blank. "Mac", "macOS Screen Sharing", "Apple Remote Desktop", and "VNC" are product/protocol names and should not be translated.`
- **Domain notes**: `Apple Remote Desktop uses a Diffie-Hellman key exchange with the macOS account name; standard VNC uses password-only authentication. Both are VNC Connection types in KKTerm.`

<!--
Filename: connections.vncUsernameHint.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
