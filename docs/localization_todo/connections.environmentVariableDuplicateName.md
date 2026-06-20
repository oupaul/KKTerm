# connections.environmentVariableDuplicateName

- **English value**: `Each variable name must be unique.`
- **Namespace**: `connections`
- **File/component**: `src/modules/workspace/connections/connection-dialog/EnvironmentVariablesDialog.tsx`
- **UI role**: `error`
- **User flow**: Shown when rows repeat a variable name, ignoring case.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: Duplicate names are ambiguous across Windows and POSIX shells.
- **Domain notes**: Local Connection variables are non-secret and persist through the Connection Startup script.
