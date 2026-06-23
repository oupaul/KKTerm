# settings.copilotCliStatusMissing

- **English value**: `Copilot CLI not found. Install it or set COPILOT_CLI_PATH.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/AiSettings.tsx`
- **UI role**: `status`
- **User flow**: Shown in the AI Assistant → GitHub Copilot settings panel when the externally-installed Copilot CLI could not be resolved on the system.
- **Tone**: direct setup guidance
- **Placeholders**: none
- **Context/meaning**: Tells the user the Copilot CLI binary was not found and how to fix it.
- **Domain notes**: Keep "Copilot CLI" and the literal environment variable name "COPILOT_CLI_PATH" unchanged. Best-effort translations were added to all locales and need native review.
