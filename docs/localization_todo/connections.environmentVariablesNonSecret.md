# connections.environmentVariablesNonSecret

- **English value**: `Values are stored in the Startup script. Do not store passwords, tokens, or API keys here.`
- **Namespace**: `connections`
- **File/component**: `src/modules/workspace/connections/connection-dialog/EnvironmentVariablesDialog.tsx`
- **UI role**: `warning`
- **User flow**: Warns before users enter values in the manager.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: Values are plain Startup script configuration, not keychain-backed secrets.
- **Domain notes**: Local Connection variables are non-secret and persist through the Connection Startup script.
