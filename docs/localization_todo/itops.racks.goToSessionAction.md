# itops.racks.goToSessionAction

- **English value**: `Go to session`
- **Namespace**: `itops`
- **File/component**: `src/modules/itops/RackItemConnectPopover.tsx`
- **UI role**: `button`
- **User flow**: Replaces the "Connect" action on a connect-popover row whose Connection already has an open Session tab. Clicking it navigates to the Workspace Module and activates that tab.
- **Tone**: concise action phrase
- **Placeholders**: none
- **Context/meaning**: "Session" is the live runtime state of an open Connection (KKTerm domain term); "go to" = switch the UI to it, not create a new one.
- **Domain notes**: Use the locale's established translation of "Session" (see `workspace.noActiveSession`). Best-effort translations for all 13 locales were added in the same change — review them.

<!--
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
