# connections.openPanoramaConfirmTitle

- **English value**: `Open {{count}} Connections?`
- **Namespace**: `connections`
- **File/component**: `src/modules/workspace/connections/ConnectionSidebar.tsx`
- **UI role**: `heading`
- **User flow**: Titles the confirmation shown before Panorama starts more than ten new Sessions.
- **Tone**: `concise warning`
- **Placeholders**: `{{count}}`; it must survive unchanged in every locale.
- **Context/meaning**: Count is the unopened durable Connections that would start, not existing Sessions.
- **Domain notes**: Connection is durable; Session is live runtime state; Panorama is the Workspace layout.
