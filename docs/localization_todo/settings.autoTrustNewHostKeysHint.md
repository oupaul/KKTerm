# settings.autoTrustNewHostKeysHint

- **English value**: `Skip the fingerprint confirmation when connecting to a host for the first time and record its key automatically. Changed host keys still show a warning.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/SshSettings.tsx`
- **UI role**: `tooltip`
- **User flow**: Hint under the `settings.autoTrustNewHostKeys` toggle in Settings → SSH.
- **Tone**: direct setup guidance
- **Placeholders**: none
- **Context/meaning**: The second sentence is a security guarantee that must survive translation: a key that CHANGED for an already-trusted host always keeps the warning dialog, because that is the man-in-the-middle signal.
- **Domain notes**: "Fingerprint" is the SSH host key fingerprint (hash), not biometrics; keep the SSH sense in every locale.

<!--
Filename: settings.autoTrustNewHostKeysHint.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
