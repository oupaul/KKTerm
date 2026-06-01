# settings.rdpWebviewStabilityHint

- **English value**: `Forces software rendering and disables window occlusion throttling so KKTerm stays responsive when it runs inside a Remote Desktop (RDP) host and the client disconnects and reconnects. Applied automatically when KKTerm detects it is running in a remote session; turn this on to force it. Disables GPU acceleration, so leave it off for local installs. Takes effect after restarting KKTerm.`
- **Namespace**: `settings`
- **File/component**: `src/modules/settings/GeneralSettings.tsx`
- **UI role**: `fragment`
- **User flow**: Help text under the "RDP session stability (WebView2)" toggle in Settings → General → Debug.
- **Tone**: `concise/neutral, direct setup guidance`
- **Placeholders**: `none`
- **Domain notes**: `RDP` (Remote Desktop Protocol), `Remote Desktop`, `WebView2`, and `GPU` typically stay English. "remote session" means a Windows RDP session, not a KKTerm Session.

<!--
Filename: settings.rdpWebviewStabilityHint.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
