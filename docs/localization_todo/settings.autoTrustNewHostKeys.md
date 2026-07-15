# settings.autoTrustNewHostKeys

- **English value**: `Automatically trust new host keys`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/SshSettings.tsx`
- **UI role**: `label`
- **User flow**: Toggle in Settings → SSH → Connection defaults. When enabled, connecting to a host KKTerm has never seen skips the fingerprint confirmation dialog and records the host key automatically.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: "New" means a host key never seen before (trust-on-first-use); it does NOT cover a key that changed for a known host — those still warn.
- **Domain notes**: "Host key" is the SSH server identity key; keep established SSH terminology per locale (e.g. zh-TW 主機金鑰, zh-CN 主机密钥).

<!--
Filename: settings.autoTrustNewHostKeys.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
