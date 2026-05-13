# connections.ftpKeepaliveSecs

- **English value**: `Keepalive (s, 0 = off)`
- **Namespace**: `connections`
- **File/component**: `src/connections/ConnectionSidebar.tsx`
- **UI role**: `label`
- **User flow**: Label above a numeric input in the FTP options fieldset. The value is persisted with the Connection so a future build can drive a background NOOP at this interval to keep the control channel from being closed by an aggressive NAT or idle-timeout middlebox. 0 disables keepalive. (In this build the value is stored but not yet wired to a background task — opt-in keepalive behavior is a follow-up slice.)
- **Tone**: concise/neutral. The "(s, 0 = off)" hint disambiguates units and the "off" meaning of 0 — keep that semantic in translation.
- **Placeholders**: none (the "0 = off" is part of the static label, not an interpolation)
- **Domain notes**: Seconds, integer. NOOP is the literal FTP command name and is implied here; the user-facing label should not mention NOOP. Translators may localize "Keepalive" using the term their local network admins recognise; "(s, 0 = off)" can be adapted but the "0 disables" semantic must remain clear.
