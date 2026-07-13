# 09 — Remote Desktop (RDP and VNC)

## AI grep hints

- Keys: `remoteDesktop.*` (full namespace), `connections.windowsRdp`, `connections.screenControl`, `settings.rdpRemoteResolution*`, `settings.remoteDesktopViewMode*`, `settings.rdpShareLocalFolder`, `settings.rdpAllLocalDrives`, `settings.rdpChooseDrives`, `settings.submitAiAttachmentsDirectly`, `workspace.sendEntirePanelToAi`, `ai.directAttachmentPrompt`
- Topics: RDP via mstscax ActiveX, RDP via IronRDP, Windows drive redirection, macOS/Linux shared local folder, VNC via vnc-rs, Ctrl+Alt+Del, Ctrl+Alt+End hotkey hint, remote resolution (Automatic / fixed `WxH`), view mode scaling, reconnect, framebuffer waiting, tutorial targets `remoteDesktop.toolbar`, `remoteDesktop.viewMode`, `remoteDesktop.sendCtrlAltDel`, `remoteDesktop.reconnect`, `remoteDesktop.sendToAi`, `remoteDesktop.surface`, `settings.rdpRemoteResolution`
- Synonyms: "remote desktop", "screen sharing", "mstsc", "IronRDP", "drive mapping", "redirect drives", "share local folder", "VNC viewer", "send three-finger salute", "high DPI scaling", "remote screen size"

## Connection kinds

- **RDP** (`connections.windowsRdp`) — remote desktop Session. On Windows it uses the Microsoft RDP ActiveX control in `mstscax.dll`, rendered to a native child HWND positioned over its Tab. On macOS and Linux it uses the in-app IronRDP client, rendered into the workspace canvas like VNC.
- **VNC** (`connections.screenControl`) — RFB / VNC Session via the Rust `vnc-rs` client. Renders the remote framebuffer into the workspace canvas.

Both store host, optional port, and non-secret account metadata in SQLite; passwords are in the Windows Credential Manager.

Type label: `remoteDesktop.typeLabel`. Generic Session label: `remoteDesktop.session`. Display accessible label: `remoteDesktop.displayAria`.

Tutorial target: `remoteDesktop.surface`.

## Connection lifecycle

- `remoteDesktop.connecting` → `remoteDesktop.preparingDisplay` → `remoteDesktop.connected`.
- For VNC: while the first framebuffer is awaited, `remoteDesktop.waitingFramebuffer`.
- `remoteDesktop.disconnected` after the session ends.
- `remoteDesktop.reconnect` / `remoteDesktop.reconnecting` reissue the connect with the same Connection settings.
- RDP command and startup failures surface as Status Bar errors through `remoteDesktop.rdpErrorStatus` even when Advanced Debugging is off.
- If Windows policy disables saved Remote Desktop passwords, the Microsoft RDP ActiveX control may show its own credential prompt. KKTerm lets that prompt complete and keeps reapplying the RDP display-size sync for a short post-connect window so the remote desktop size is corrected after login.

Runtime checks:

- `remoteDesktop.rdpDesktopRequired` — RDP cannot start outside the Tauri desktop runtime.
- `remoteDesktop.vncDesktopRequired` — same for VNC.
- `remoteDesktop.transportUnavailable` — the relevant transport (mstscax / vnc-rs) is missing.

Transport labels for status messages: `remoteDesktop.rdpActiveX`, `remoteDesktop.vncFramebuffer`.

## Toolbar actions

- `remoteDesktop.viewModeButton` — scaling icon in the toolbar. Opens a native menu with common viewer modes: `settings.remoteDesktopViewModeFit`, `settings.remoteDesktopViewModeStretch`, `settings.remoteDesktopViewModeActualSize`, `settings.remoteDesktopViewModeFitWidth`, and `settings.remoteDesktopViewModeFitHeight`. The selected mode is saved as a per-Connection override and uses the Settings default until changed from the toolbar or Connection options. For VNC, `settings.remoteDesktopViewModeActualSize` keeps the remote framebuffer at 1:1 size and enables workspace scrollbars, which is useful for dual-monitor servers that would otherwise be squeezed into one Pane. For RDP, changing the mode saves the Connection and reconnects so the native ActiveX display settings are re-created cleanly.

- `remoteDesktop.sendCtrlAltDel` — keyboard icon in the toolbar.
  - **RDP**: clicking opens a native context menu with the hint `remoteDesktop.sendCtrlAltDelHint` ("Press CTRL+ALT+END to Send CTRL+ALT+DEL"). The embedded Microsoft RDP ActiveX control cannot reliably synthesize the Secure Attention Sequence from outside its own keyboard hook, so the local Ctrl+Alt+End hotkey (set via `HotKeyCtrlAltDel = VK_END`) is the supported path.
  - **macOS/Linux RDP**: clicking sends Ctrl+Alt+Delete directly through the IronRDP canvas session.
  - **VNC**: the same button still calls `send_vnc_ctrl_alt_delete` directly.
- `remoteDesktop.reconnect` — explicit reconnect button.
- `workspace.sendEntirePanelToAi` — captures the visible remote desktop Pane for AI Assistant. By default `settings.submitAiAttachmentsDirectly` submits the screenshot with `ai.directAttachmentPrompt`; when disabled, the button only attaches the screenshot to the composer.

Tutorial targets: `remoteDesktop.toolbar`, `remoteDesktop.viewMode`, `remoteDesktop.sendCtrlAltDel`, `remoteDesktop.reconnect`, `remoteDesktop.sendToAi`.

## RDP overlay parking (implementation note)

The native HWND backing an RDP Session does not obey DOM z-index. When an app-owned DOM overlay intersects the RDP host rectangle, KKTerm:

1. Captures the visible RDP host via a typed screenshot Tauri command.
2. Shows that bitmap underneath the DOM overlay.
3. Hides ("parks") the ActiveX HWND until the overlay closes.

This behaviour is **RDP-only**. WebView2, VNC, terminal, and SFTP surfaces never use overlay parking. Geometry-scoped detection lives in `src/modules/workspace/nativeOverlay.ts`; app dialog backdrops (`.kk-dlg-backdrop`) participate so a confirmation such as the large-Panorama warning cannot sit underneath an ActiveX surface. Do not extend this workaround to other surfaces.

In dense Panorama layouts, KKTerm intersects the RDP surface with its owning embedded Pane before sending bounds to the native ATL host. This prevents an overflowing descendant DOM box from expanding the native RDP window over adjacent Connection Panes.

## RDP debug logging

Debug builds write RDP startup, ActiveX control creation, display-size sync, and main-thread command timing records to `rdp.debug.log` beside `kkterm.log`. Release builds write the same JSONL log only when Settings → General → Debug → `settings.advancedDebugging` is enabled. Records include non-secret Connection details such as host, username, port, RDP options, bounds, selected ActiveX ProgID, display size, scale factors, and command errors. Correlated `rdp.geometry.frontend` and `rdp.geometry.native` records in `ui.debug.log` compare DOM/viewport sizing with the owning embedded Pane clip, requested physical rectangle, actual ATL host and hosted ActiveX object window/client rectangles, SmartSizing, and remote desktop dimensions. Password-like, secret-like, token-like, and credential-like fields are redacted defensively; users should still review the files before sharing because hostnames and usernames may be sensitive.

## RDP / VNC settings

Per-kind defaults (resolution, view mode, colour depth, etc.) live in Settings → RDP (`settings.sectionRdp`) and Settings → VNC (`settings.sectionVnc`). See [15-settings.md](15-settings.md).

### RDP local resources

`settings.rdpRedirectDrives` remains disabled by default and is available both as a global RDP default and as a per-Connection override.

- On Windows, enabling it defaults to `settings.rdpAllLocalDrives`. `settings.rdpChooseDrives` opens an app-owned Sheet where the user can retain all drives or choose individual drive roots such as C: and D:. Saved selections are applied through the ActiveX drive collection. A selected drive that is currently disconnected remains in the saved selection and is labelled with `settings.rdpUnavailableDrive`.
- On macOS and Linux, the same setting is presented as `settings.rdpShareLocalFolder`. IronRDP redirects exactly one folder selected through `settings.rdpChooseFolder`; it never exposes the whole filesystem implicitly. Enabling the option without selecting a folder is rejected with `settings.rdpSharedFolderRequired`. The native RDPDR filesystem backend validates remote paths against the canonical selected root before file operations.

When a Connection inherits RDP defaults, its selector is disabled and summarizes the inherited value. Choosing Connection-specific settings enables its own drive subset or shared folder without changing the global default.

### View mode (`settings.remoteDesktopViewMode`)

Controls how the remote screen is fitted into a workspace Pane. Available both as a global default (Settings → RDP / VNC) and as a per-Connection override. Toolbar changes save the selected Connection-specific mode. VNC supports visible scrollbars in `settings.remoteDesktopViewModeActualSize`; this is the recommended mode when a remote dual-monitor framebuffer is too wide to read after being scaled down.

### Remote resolution (`settings.rdpRemoteResolution`)

Controls the desktop size and scaling KKTerm asks the RDP ActiveX control to apply. Available both as a global default (Settings → RDP) and as a per-connection override.

- `settings.rdpRemoteResolutionAutomatic` (default) — push the Pane's physical pixel size as `DesktopWidth`/`DesktopHeight`, forward the host display scale factor as the RDP `DesktopScaleFactor` (so the remote OS renders UI at the host DPI), and keep the remote desktop matched to the visible Pane while `SmartSizing` normally stays off. If either physical Pane dimension is below the ActiveX desktop minimum of 200 pixels, KKTerm requests the 200-pixel minimum and temporarily enables `SmartSizing` to fit the native surface within the smaller Pane. On a 4K monitor at 150% scaling the remote desktop looks the same size as native host apps and pointer coordinates stay 1:1.
- Fixed resolutions (`1440x900` through `3840x2400`) — push the chosen size as `DesktopWidth`/`DesktopHeight` on connect and enable `SmartSizing` so the framebuffer scales to fill the Pane. Subsequent Pane resizes do not change the remote desktop size.
