# settings.autoRecordSessions

- **English value**: `Auto-record terminal Sessions`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/TerminalSettings.tsx`
- **UI role**: `label`
- **User flow**: Toggle in Settings → Terminal → Session defaults. When enabled, every new terminal Session starts with recording active, as if the record button was pressed.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: "Auto-record" means automatically writing the terminal output to a local text file (the existing per-Pane recording feature), not video/screen capture.
- **Domain notes**: "Session" is KKTerm's live runtime instance (capitalized product term); "record/recording" matches the existing `terminal.startRecording` feature wording in each locale.

<!--
Filename: settings.autoRecordSessions.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
