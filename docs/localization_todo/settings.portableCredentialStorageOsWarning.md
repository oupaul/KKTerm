# settings.portableCredentialStorageOsWarning

- **English value**: `OS keystore secrets stay with this Windows account and do not travel with the portable folder.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/CredentialsSettings.tsx`
- **UI role**: `warning`
- **User flow**: Shown when a portable user explicitly selects the OS keystore.
- **Tone**: direct safety guidance
- **Placeholders**: none
- **Context/meaning**: Warns that secrets are machine/account-bound.
- **Domain notes**: OS keystore is the Windows credential backend.
