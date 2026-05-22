# settings.rdpRemoteResolutionDpiZoom

- **English value**: `DPI Zoom`
- **Namespace**: `settings`
- **File/component**: `src/settings/RdpSettings.tsx` and `src/connections/ConnectionSidebar.tsx`
- **UI role**: `label` (dropdown option)
- **User flow**: Selected when the user wants the remote desktop to render at the pane's native physical pixel size and have the RDP ActiveX's `ZoomLevel` set to the host's DPI scale (e.g. 150 on a 150% display). The remote OS renders at native pixel density and the client zooms.
- **Tone**: short two-word dropdown label
- **Placeholders**: none
- **Domain notes**: "DPI" is the universal abbreviation for dots per inch and stays English. "Zoom" may be localized using the same word Microsoft uses for the RDP zoom level menu in mstsc.
