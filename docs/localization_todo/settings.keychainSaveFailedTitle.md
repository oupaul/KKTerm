# settings.keychainSaveFailedTitle

- **English value**: `Couldn't save to the secret store`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/AiSettings.tsx`
- **UI role**: `heading`
- **User flow**: Title of the recovery dialog shown when saving the AI Assistant settings fails because a secret could not be written to the OS keychain or encrypted file secret store.
- **Tone**: `concise/neutral`
- **Placeholders**: none
- **Context/meaning**: "secret store" = the OS keychain or encrypted file backend KKTerm uses for secrets. Title of an error/recovery dialog, not a success state.
- **Domain notes**: Keep terminology consistent with the Credentials settings secret-store selector. Technical terms like API/URL stay English.

<!--
Filename: settings.keychainSaveFailedTitle.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
