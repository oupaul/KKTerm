# settings.keychainResetHint

- **English value**: `Reset removes the stored entry and saves again, which asks the operating system to grant access. On macOS, choose Allow when the keychain prompt appears.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/AiSettings.tsx`
- **UI role**: `status`
- **User flow**: Body text in the keychain-save recovery dialog, explaining what the "Reset & retry" action does before the user confirms it.
- **Tone**: `direct setup guidance`
- **Placeholders**: none
- **Context/meaning**: "Reset" here = delete the stored secret entry and re-write it to re-trigger the OS permission prompt; not a factory reset. "keychain prompt" = the macOS Allow/Deny dialog for keychain access.
- **Domain notes**: "macOS" and "Allow" (the macOS button label) should match the platform's own wording. Keep "keychain" lowercase as in macOS UI.

<!--
Filename: settings.keychainResetHint.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
