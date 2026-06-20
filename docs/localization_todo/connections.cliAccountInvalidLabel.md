# connections.cliAccountInvalidLabel

- **English value**: `Enter an account label containing a letter or number.`
- **Namespace**: `connections`
- **File/component**: `src/modules/workspace/connections/connection-dialog/LocalConnectionFields.tsx`
- **UI role**: `error`
- **User flow**: Blocks applying the helper when no safe directory slug can be derived.
- **Tone**: direct validation guidance
- **Placeholders**: none
- **Context/meaning**: Requires usable label content without requesting account credentials.
- **Domain notes**: The implementation currently accepts ASCII letters and numbers for the generated slug.
