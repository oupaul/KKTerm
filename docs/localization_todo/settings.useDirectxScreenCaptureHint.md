# settings.useDirectxScreenCaptureHint

- **English value**: `Use Windows Graphics Capture when available, with GDI fallback.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/ScreenshotsSettings.tsx`
- **UI role**: `tooltip`
- **User flow**: Hint under the "Use DirectX for screen capture" toggle in Settings → Screenshots, explaining what the accelerated capture engine does when the toggle is on.
- **Tone**: concise/neutral
- **Placeholders**: none
- **Context/meaning**: The English value changed from "Use DXGI Desktop Duplication when available, with GDI fallback." after the capture engine moved from DXGI Desktop Duplication to Windows Graphics Capture (via the xcap crate). Best-effort translations were updated in the same change by substituting the API name; verify each locale still reads naturally.
- **Domain notes**: "Windows Graphics Capture" and "GDI" are Windows API proper nouns and stay in English in every locale, as "DXGI Desktop Duplication" did before.

<!--
Filename: settings.useDirectxScreenCaptureHint.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
