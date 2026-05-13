# connections.ftpConnectTimeoutSecs

- **English value**: `Connect timeout (s)`
- **Namespace**: `connections`
- **File/component**: `src/connections/ConnectionSidebar.tsx`
- **UI role**: `label`
- **User flow**: Label above a numeric input in the FTP options fieldset. Controls how long the FTP control-channel TCP connect waits before failing. Default 30 seconds.
- **Tone**: concise/neutral, abbreviated unit "(s)" to keep the label one line.
- **Placeholders**: none
- **Domain notes**: Seconds, integer. Maps to the `connect_timeout_secs` field in the persisted `FtpConnectionOptions`. Translators can localize "Connect timeout" but should keep "(s)" or substitute with the equivalent local short-form for seconds — the input is narrow and needs a compact label.
