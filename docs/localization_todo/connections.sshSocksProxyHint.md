# connections.sshSocksProxyHint

- **English value**: `Routes this Connection's terminals, tmux, and SFTP through a SOCKS proxy natively. Cannot be combined with ProxyJump.`
- **Namespace**: `connections`
- **File/component**: `src/modules/workspace/connections/connection-dialog/SshConnectionFields.tsx`
- **UI role**: `hint`
- **User flow**: `Shown below the per-Connection SOCKS proxy field in the SSH add/edit Connection dialog.`
- **Tone**: `direct setup guidance`
- **Placeholders**: `none`
- **Context/meaning**: `Explains that the SOCKS proxy is applied by the native SSH transport (no external tools) and is mutually exclusive with ProxyJump.`
- **Domain notes**: `SOCKS, SSH, tmux, SFTP, ProxyJump, and Connection are KKTerm technical/domain terms.`
