# settings.sshCompressionHint

- **English value**: `Default transport compression for SSH Connections (matches ssh -XC). Fast is recommended for X11 forwarding and slow links; individual Connections can override this.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/SshSettings.tsx`
- **UI role**: `tooltip`
- **User flow**: Field hint under the global SSH compression selector in Settings.
- **Tone**: direct setup guidance
- **Placeholders**: none
- **Context/meaning**: Explains the global default; "override" means a per-Connection setting takes precedence.
- **Domain notes**: `ssh -XC`, X11, SSH stay English/verbatim. Best-effort translations were added to every locale; please review.
