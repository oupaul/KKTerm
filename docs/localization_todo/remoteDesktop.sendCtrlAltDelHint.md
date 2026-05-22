# remoteDesktop.sendCtrlAltDelHint

- **English value**: `Press CTRL+ALT+END to Send CTRL+ALT+DEL`
- **Namespace**: `remoteDesktop`
- **File/component**: `src/remote-desktop/RemoteDesktopWorkspace.tsx`
- **UI role**: `tooltip` (also shown as the single disabled item in a native context menu popped from the keyboard icon in the RDP toolbar)
- **User flow**: Shown on the RDP workspace toolbar's keyboard icon. Hovering shows it as a tooltip; clicking opens a native menu containing this single, disabled hint. It explains that the user must press the local Ctrl+Alt+End hotkey to send Ctrl+Alt+Delete to the remote Windows desktop, because the embedded Microsoft RDP ActiveX control cannot reliably synthesize the SAS sequence.
- **Tone**: short, imperative instruction; mirrors Microsoft mstsc conventions
- **Placeholders**: none
- **Domain notes**: `CTRL+ALT+END` and `CTRL+ALT+DEL` are Windows keyboard shortcuts and must stay in English/uppercase across all locales — they refer to physical keys. Do not translate the key names. The verb "Press"/"Send" may be localized.
