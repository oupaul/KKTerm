# settings.lastCheckedNever

- **English value**: `Never checked`
- **Namespace**: `settings`
- **File/component**: `src/settings/AboutSettings.tsx`
- **UI role**: `status`
- **User flow**: Shown beside the "Check for Updates" button in Settings → About when no update check has ever been recorded on this machine (clean install, cleared storage, or runtime that disables checks). Replaced by `settings.lastCheckedAt` once a check completes.
- **Tone**: concise, neutral, status-line tone.
- **Placeholders**: none
- **Domain notes**: Refers to the app's GitHub-release update check, not any remote-host connection check.
