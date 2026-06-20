# connections.environmentVariablesMalformed

- **English value**: `KKTerm cannot safely edit the existing managed environment block. Fix or remove it in the Startup script first.`
- **Namespace**: `connections`
- **File/component**: `src/modules/workspace/connections/connection-dialog/EnvironmentVariablesDialog.tsx`
- **UI role**: `error`
- **User flow**: Blocks Apply when an existing KKTerm-managed block cannot be parsed safely.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: Managed block means KKTerm's marked section inside the Local Connection Startup script.
- **Domain notes**: Local Connection variables are non-secret and persist through the Connection Startup script.
