# settings.sshSocksProxyHint

- **English value**: `Optional SOCKS proxy for SSH Connections, applied to terminals, tmux, and SFTP. Routed natively with no external tools required, and cannot be combined with ProxyJump.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/SshSettings.tsx`
- **UI role**: `hint`
- **User flow**: `Shown below the global SSH SOCKS proxy field to explain how the setting is applied.`
- **Tone**: `direct setup guidance`
- **Placeholders**: `none`
- **Context/meaning**: `Explains that SSH SOCKS proxying is handled by the native in-process SSH transport (no external tools) and is mutually exclusive with ProxyJump.`
- **Domain notes**: `SSH, SOCKS, Connection, and ProxyCommand are technical/domain terms.`
