# connections.vncUsername

- **English value**: `Username (Apple Remote Desktop)`
- **Namespace**: `connections`
- **File/component**: `src/modules/workspace/connections/connection-dialog/VncConnectionFields.tsx`
- **UI role**: `label`
- **User flow**: `Shown as the field label for the optional username input in the VNC Connection properties dialog. The user sees this when creating or editing a VNC Connection.`
- **Tone**: `concise/neutral`
- **Placeholders**: `none`
- **Context/meaning**: `Label for the username field specific to VNC connections, calling out Apple Remote Desktop as the primary use case. "Apple Remote Desktop" and "VNC" are product/protocol names and should not be translated.`
- **Domain notes**: `VNC is the remote framebuffer protocol; Apple Remote Desktop is macOS's built-in Screen Sharing server. The Connection dialog stores this value as non-secret metadata (like host/port), not in the OS keychain.`

<!--
Filename: connections.vncUsername.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
