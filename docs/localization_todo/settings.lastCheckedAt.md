# settings.lastCheckedAt

- **English value**: `Last checked {{time}}`
- **Namespace**: `settings`
- **File/component**: `src/settings/AboutSettings.tsx`
- **UI role**: `status`
- **User flow**: Shown beside the "Check for Updates" button in Settings → About to indicate when the app last contacted GitHub for a release check. Updates after every manual or startup check, regardless of outcome.
- **Tone**: concise, neutral, status-line tone (similar in feel to "Last synced …" labels).
- **Placeholders**: `{{time}}` — a fully formatted localized date+time string (already produced by `Date.toLocaleString` with the active locale).
- **Domain notes**: Refers to the app's GitHub-release update check, not any remote-host connection check. Keep "Last checked" short — it sits inline next to a button.
