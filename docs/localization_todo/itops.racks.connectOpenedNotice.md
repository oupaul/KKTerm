# itops.racks.connectOpenedNotice

- **English value**: `Opened {{name}} in the Workspace.`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/RackItemConnectPopover.tsx`
- **UI role**: `status`
- **User flow**: Transient Status Bar notice shown after connecting to a Connection from the rack-device connect popover while staying on the IT Ops page; the Session tab opened in the background in the Workspace Module.
- **Tone**: short success confirmation, full sentence
- **Placeholders**: `{{name}}` — the Connection's display name; must survive unchanged in every locale.
- **Context/meaning**: Tells the user where the Session went (the Workspace Module) since the UI intentionally stays on IT Ops.
- **Domain notes**: "Workspace" is the top-level Module name — use the locale's established translation (see `dashboard.connectionWidgetNoConnectionsHint`). Best-effort translations for all 13 locales were added in the same change — review them.

<!--
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
