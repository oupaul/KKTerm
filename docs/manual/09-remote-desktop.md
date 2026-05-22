# 09 — Remote Desktop (RDP and VNC)

## AI grep hints

- Keys: `remoteDesktop.*` (full namespace), `connections.windowsRdp`, `connections.screenControl`, `settings.rdpRemoteResolution*`
- Topics: RDP via mstscax ActiveX, VNC via vnc-rs, Ctrl+Alt+Del, Ctrl+Alt+End hotkey hint, remote resolution (Automatic / Smart Sizing / DPI Zoom / fixed `WxH`), reconnect, framebuffer waiting, tutorial targets `remoteDesktop.toolbar`, `remoteDesktop.sendCtrlAltDel`, `remoteDesktop.reconnect`, `remoteDesktop.sendToAi`, `remoteDesktop.surface`, `settings.rdpRemoteResolution`
- Synonyms: "remote desktop", "screen sharing", "mstsc", "VNC viewer", "send three-finger salute", "high DPI scaling", "smart sizing", "remote screen size"

## Connection kinds

- **RDP** (`connections.windowsRdp`) — Windows-native remote desktop Session via the Microsoft RDP ActiveX control in `mstscax.dll`. Renders to a native child HWND positioned over its Tab.
- **VNC** (`connections.screenControl`) — RFB / VNC Session via the Rust `vnc-rs` client. Renders the remote framebuffer into the workspace canvas.

Both store host, optional port, and non-secret account metadata in SQLite; passwords are in the Windows Credential Manager.

Type label: `remoteDesktop.typeLabel`. Generic Session label: `remoteDesktop.session`. Display accessible label: `remoteDesktop.displayAria`.

Tutorial target: `remoteDesktop.surface`.

## Connection lifecycle

- `remoteDesktop.connecting` → `remoteDesktop.preparingDisplay` → `remoteDesktop.connected`.
- For VNC: while the first framebuffer is awaited, `remoteDesktop.waitingFramebuffer`.
- `remoteDesktop.disconnected` after the session ends.
- `remoteDesktop.reconnect` / `remoteDesktop.reconnecting` reissue the connect with the same Connection settings.

Runtime checks:

- `remoteDesktop.rdpDesktopRequired` — RDP cannot start outside the Tauri desktop runtime.
- `remoteDesktop.vncDesktopRequired` — same for VNC.
- `remoteDesktop.transportUnavailable` — the relevant transport (mstscax / vnc-rs) is missing.

Transport labels for status messages: `remoteDesktop.rdpActiveX`, `remoteDesktop.vncFramebuffer`.

## Toolbar actions

- `remoteDesktop.sendCtrlAltDel` — keyboard icon in the toolbar.
  - **RDP**: clicking opens a native context menu with the hint `remoteDesktop.sendCtrlAltDelHint` ("Press CTRL+ALT+END to Send CTRL+ALT+DEL"). The embedded Microsoft RDP ActiveX control cannot reliably synthesize the Secure Attention Sequence from outside its own keyboard hook, so the local Ctrl+Alt+End hotkey (set via `HotKeyCtrlAltDel = VK_END`) is the supported path.
  - **VNC**: the same button still calls `send_vnc_ctrl_alt_delete` directly.
- `remoteDesktop.reconnect` — explicit reconnect button.

Tutorial targets: `remoteDesktop.toolbar`, `remoteDesktop.sendCtrlAltDel`, `remoteDesktop.reconnect`, `remoteDesktop.sendToAi`.

## RDP overlay parking (implementation note)

The native HWND backing an RDP Session does not obey DOM z-index. When an app-owned DOM overlay intersects the RDP host rectangle, KKTerm:

1. Captures the visible RDP host via a typed screenshot Tauri command.
2. Shows that bitmap underneath the DOM overlay.
3. Hides ("parks") the ActiveX HWND until the overlay closes.

This behaviour is **RDP-only**. WebView2, VNC, terminal, and SFTP surfaces never use overlay parking. Geometry-scoped detection lives in `src/workspace/nativeOverlay.ts`. Do not extend this workaround to other surfaces.

## RDP / VNC settings

Per-kind defaults (resolution, colour depth, etc.) live in Settings → RDP (`settings.sectionRdp`) and Settings → VNC (`settings.sectionVnc`). See [15-settings.md](15-settings.md).

### Remote resolution (`settings.rdpRemoteResolution`)

Controls the desktop size and scaling KKTerm asks the RDP ActiveX control to apply. Available both as a global default (Settings → RDP) and as a per-connection override.

- `settings.rdpRemoteResolutionAutomatic` (default) — push the pane's logical (DIP) size as `DesktopWidth`/`DesktopHeight`. Smart Sizing stays off. Best on high-DPI displays because it stops the remote UI from rendering at physical pixel density and looking too small.
- `settings.rdpRemoteResolutionSmartSizing` — push the pane's physical pixel size once and enable the ActiveX `SmartSizing` property. The framebuffer is then stretched to fit subsequent pane resizes.
- `settings.rdpRemoteResolutionDpiZoom` — push the pane's physical pixel size and set `ZoomLevel` to `round(scale_factor * 100)`. The remote OS renders at native DPI; the client scales the framebuffer.
- Fixed resolutions (`1440x900` through `3840x2400`) — push the chosen size as `DesktopWidth`/`DesktopHeight` and enable `SmartSizing` so the framebuffer is letterboxed/scaled to fit the pane. Subsequent pane resizes do not change the remote desktop size.
