# app.trayDontSleep

- **English value**: `Don't Sleep`
- **Namespace**: `app`
- **File/component**: `src/app/trayMenu.ts` (pushed to the native tray menu via the `update_tray_menu` command)
- **UI role**: `label`
- **User flow**: Shown as a checkable item in the OS notification-area (system tray) right-click menu. Checked when Don't Sleep mode is currently enabled; selecting it toggles the mode.
- **Tone**: concise/neutral, matches the existing in-app Don't Sleep control
- **Placeholders**: none
- **Domain notes**: "Don't Sleep" is KKTerm's mode that keeps Windows awake (blocks system/display sleep) while the app runs. Should match the wording already used for the existing `app.dontSleep` key in this locale.

<!--
Filename: app.trayDontSleep.md
Delete this file once every non-English locale under src/i18n/locales/ has the key translated.
-->
