# settings.autoRecordSessionsHint

- **English value**: `New terminal Sessions start recording automatically, as if the record button was pressed. Each Session records to its own text file under the app data folder; recording can be stopped anytime from the terminal toolbar.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/TerminalSettings.tsx`
- **UI role**: `tooltip`
- **User flow**: Hint under the `settings.autoRecordSessions` toggle in Settings → Terminal → Session defaults.
- **Tone**: direct setup guidance
- **Placeholders**: none
- **Context/meaning**: Explains that auto-recording behaves exactly like pressing the record button at Session start, that each Session (each Tab/Pane) gets its own text file, and that the user can still stop recording manually.
- **Domain notes**: "Session" is the KKTerm runtime term; "record button" refers to `terminal.startRecording` on the Pane toolbar; "app data folder" is the local KKTerm data directory.

<!--
Filename: settings.autoRecordSessionsHint.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
