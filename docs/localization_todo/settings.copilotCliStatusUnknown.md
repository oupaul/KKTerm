# settings.copilotCliStatusUnknown

- **English value**: `Copilot CLI status has not been checked.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/AiSettings.tsx`
- **UI role**: `status`
- **User flow**: Shown in the AI Assistant → GitHub Copilot settings panel before the app has probed the system for the externally-installed Copilot CLI.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: "Copilot CLI" is the external GitHub Copilot command-line tool KKTerm calls (never bundles). "checked" = the detection probe has not run yet.
- **Domain notes**: Keep "Copilot CLI" and "COPILOT_CLI_PATH" unchanged. Best-effort translations were added to all locales and need native review.
