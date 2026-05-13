# connections.ftpUtf8

- **English value**: `Negotiate UTF-8 paths`
- **Namespace**: `connections`
- **File/component**: `src/connections/ConnectionSidebar.tsx`
- **UI role**: `label`
- **User flow**: Checkbox label inside the FTP options fieldset. When enabled and the server advertises UTF-8 in `FEAT`, KKTerm issues `SITE UTF8 ON` after login so paths exchange as UTF-8.
- **Tone**: concise/neutral, slightly technical (this is power-user territory).
- **Placeholders**: none
- **Domain notes**: "UTF-8" stays English. "Negotiate" here means "agree with the server" via the `FEAT` listing — translators should pick a verb that conveys "advertise / opt-in" rather than "force".
