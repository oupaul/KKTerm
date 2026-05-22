# settings.rdpRemoteResolution

- **English value**: `Remote resolution`
- **Namespace**: `settings`
- **File/component**: `src/settings/RdpSettings.tsx` (also reused in `src/connections/ConnectionSidebar.tsx` per-connection RDP options)
- **UI role**: `label`
- **User flow**: Label for the new RDP "Remote resolution" dropdown shown in Settings → RDP, and also in the Connection editor's per-connection RDP options panel when "Inherit defaults" is off.
- **Tone**: concise/neutral, matches the existing RDP Settings labels ("Color depth", "Performance flags")
- **Placeholders**: none
- **Domain notes**: refers to the desktop resolution that KKTerm asks the remote Windows host to render at. "RDP" stays English. Pair with the three mode keys (`rdpRemoteResolutionAutomatic`, `rdpRemoteResolutionSmartSizing`, `rdpRemoteResolutionDpiZoom`) plus a list of fixed `WIDTHxHEIGHT` items that are not translated.
