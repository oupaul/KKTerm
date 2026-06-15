# settings.secretSaveFailed

- **English value**: `Couldn't save the credential to the secret store: {{error}}`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/AiSettings.tsx`
- **UI role**: `error`
- **User flow**: Shown in the bottom Status Bar when saving the AI Assistant settings fails because a secret (API key, search key, or email credential) could not be written to the OS keychain or encrypted file secret store — for example when macOS Keychain access was denied.
- **Tone**: `concise/neutral, actionable error`
- **Placeholders**: `{{error}}` — the underlying secret-store error message (often already prefixed with "OS keychain error:"). Keep the token unchanged in every locale; one full sentence with the cause appended after the colon.
- **Context/meaning**: "credential" = the secret being saved (API key or password), not a stored Connection. "secret store" = the OS keychain or encrypted file backend KKTerm uses for secrets.
- **Domain notes**: Keep "API key"/secret-store terminology consistent with the Credentials and AI Assistant settings. Technical terms like API and URL typically stay English.

<!--
Filename: settings.secretSaveFailed.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
