# settings.rdpWebviewStabilityHint

- **English value**: `Force software rendering so KKTerm stays responsive inside an RDP host across reconnects. Disables GPU acceleration, so leave it off for local installs. Restart to apply.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/GeneralSettings.tsx`
- **UI role**: `status`
- **User flow**: Description line under a General settings toggle. Shortened in this change; other locales still hold the older, longer wording and need re-translating to the concise form.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: Toggle help text in Settings -> General. Keep the original meaning; just tighter.
- **Domain notes**: Technical terms (KKTerm, tray, Windows, DXGI, GDI, RDP, GPU, MCP) stay as-is per locale convention.

<!--
Filename: settings.rdpWebviewStabilityHint.md
Delete this file once every non-English locale under src/i18n/locales/ has the key re-translated.
-->
