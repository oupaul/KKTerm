# settings.sshSocksProxyHint

- **English value**: `Optional SOCKS proxy for SSH Connections, applied to terminals, tmux, and SFTP. Use the username and password fields for authenticated proxies; username:password@host:port is still accepted in the address field if you do not need encrypted password storage.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/SshSettings.tsx`
- **UI role**: `hint`
- **User flow**: Shown under the default SSH SOCKS proxy address field on the SSH settings page. It explains the proxy scope and the secure credential option while preserving the inline credential fallback.
- **Tone**: concise/neutral setup guidance.
- **Placeholders**: none.
- **Context/meaning**: Explains SOCKS proxy behavior for SSH Connections; “username and password fields” means the adjacent authenticated proxy fields, not SSH login credentials.
- **Domain notes**: Keep technical terms such as SSH, SOCKS, SOCKS5, SFTP, tmux, ProxyJump, Connection, keychain, and `username:password@host:port` in English or translate only according to established locale conventions.

<!--
Filename: settings.sshSocksProxyHint.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
