# settings.rdpRemoteResolutionSmartSizing

- **English value**: `Smart Sizing`
- **Namespace**: `settings`
- **File/component**: `src/settings/RdpSettings.tsx` and `src/connections/ConnectionSidebar.tsx`
- **UI role**: `label` (dropdown option)
- **User flow**: Selected when the user wants KKTerm to enable the Microsoft RDP ActiveX `SmartSizing` property so the remote framebuffer is scaled to fit the pane. The remote desktop size is initially set to the pane's physical pixel size and then locked; subsequent pane resizes just rescale the existing framebuffer.
- **Tone**: short two-word dropdown label
- **Placeholders**: none
- **Domain notes**: "Smart Sizing" is the verbatim Microsoft mstsc option name; keep it English unless a localized Windows translation is well-known (e.g. Microsoft's own "智能调整大小" in zh-CN). When in doubt, leave it English.
