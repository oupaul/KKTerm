# settings.aiTools.memory.description

- **English value**: `Let the assistant save and recall short notes about your hosts and preferences across chats. Never stores secrets.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/AiSettings.tsx`
- **UI role**: `description`
- **User flow**: Helper text under the Assistant memory toggle in Settings → AI Assistant, explaining what the memory tools do and the secrets guarantee.
- **Tone**: concise/neutral, reassuring on privacy
- **Placeholders**: none
- **Context/meaning**: Describes durable per-host/global notes the assistant accumulates and recalls in later chats. "secrets" = passwords/API keys/tokens, which are stored only in the OS keychain and never as memory notes.
- **Domain notes**: "hosts" = SSH/RDP/VNC/SFTP targets behind KKTerm Connections. Best-effort translations were added to all locales in the same change; verify nuance before deleting this file.

<!--
Filename: settings.aiTools.memory.description.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
