# 14 — Screenshots

## AI grep hints

- Keys: `screenshots.title`, `screenshots.railLabel`, `screenshots.captureRegion`, `screenshots.captureWindow`, `screenshots.captureFullscreen`, `screenshots.delay.label`, `screenshots.view.thumbnails`, `screenshots.view.details`, `screenshots.sort.label`, `screenshots.group.label`, `screenshots.selectedCount`, `screenshots.batch.resize`, `screenshots.batch.convert`, `screenshots.batch.delete`, `screenshots.editor.pan`, `screenshots.editor.arrow`, `screenshots.editor.rectangle`, `screenshots.editor.ellipse`, `screenshots.editor.text`, `screenshots.editor.mosaic`, `screenshots.editor.appFont`, `screenshots.editor.bold`, `screenshots.editor.resizeDialog`, `screenshots.editor.unsavedTitle`, `screenshots.editor.dontSave`, `screenshots.openFolder`, `screenshots.menu.openExternal`, `screenshots.menu.copy`, `screenshots.menu.reveal`, `screenshots.menu.rename`, `screenshots.captureSaved`, `screenshots.captureCopied`, `screenshots.captureSavedAndCopied`, `screenshots.emptyTitle`, `settings.sectionScreenshots`, `settings.screenshotsFolder`, `settings.screenshotsCaptureMode`, `settings.screenshotsFormat`, `settings.screenshotsQuality`, `settings.screenshotsShortcuts`, `settings.useDirectxScreenCapture`, `workspace.takeScreenshot`, `workspace.copyRegion`, `workspace.copyEntirePanel`, `workspace.sendRegionToAi`, `workspace.sendEntirePanelToAi`, `workspace.sentToAi`, `workspace.copied`, `workspace.selectRegion`, `workspace.screenshot`, `workspace.screenshotsRequireRuntime`, `workspace.screenshotCaptureError`, `sftp.screenshotTarget`, `webview.screenshotTarget`
- Topics: Screenshots Module, screenshot library, capture region / window / fullscreen, thumbnails / details views, tray capture menu, global capture shortcuts, hotkeys, PNG / JPEG format, screenshots folder, rename / delete / copy screenshot, unified image viewer/editor, zoom, send to AI, copy to clipboard
- Tutorial targets: `app.activityRailScreenshots`, `screenshots.captureRegion`, `screenshots.captureWindow`, `screenshots.captureFullscreen`, `screenshots.viewSwitch`, `screenshots.library`, `settings.screenshotsFolder`, `settings.screenshotsFormat`, `settings.screenshotsShortcuts`, `settings.useDirectxScreenCapture`, `workspace.screenshotMenu`
- Synonyms: "snip", "grab", "screen capture", "screenshot gallery", "print screen", "snipping tool", "ShareX", "send to AI"

## The Screenshots Module

The **Screenshots Module** is an Activity Rail destination (`screenshots.railLabel`, tutorial target `app.activityRailScreenshots`) that captures screenshots into a library folder and lists them newest-first. Settings → General → `settings.activityRail` controls whether the Module appears; it is visible by default.

Capture actions live in the single-row Module header toolbar and follow `settings.screenshotsCaptureMode` on Windows, macOS, and Linux:

- `screenshots.captureRegion` (tutorial target `screenshots.captureRegion`) — native full-desktop overlay; drag to select a rectangle, Esc cancels. On Windows, the area outside the selection is dimmed while the selected pixels stay clear. Linux prefers the desktop screenshot portal and falls back to an installed desktop selector.
- `screenshots.captureWindow` (tutorial target `screenshots.captureWindow`) — native window picker on Windows/macOS; the Windows picker dims everything outside the highlighted window. On Linux it captures the foreground desktop window after KKTerm minimizes.
- `screenshots.captureFullscreen` (tutorial target `screenshots.captureFullscreen`) — captures the entire virtual desktop across all monitors.

The KKTerm window minimizes out of the way during a capture and restores afterwards. Capture Mode defaults to `settings.screenshotsCaptureModeBoth`, which saves the image to the library and copies it to the clipboard. Folder-only uses `screenshots.captureSaved`, clipboard-only uses `screenshots.captureCopied`, and Both uses `screenshots.captureSavedAndCopied`; only captures saved to the folder are prepended to the library.

The Module header toolbar also has `screenshots.delay.label`. Its presets are Instant (default), 3, 5, 15, 30, and 60 seconds. The delay applies to captures started from the Module header toolbar; tray-menu and global-hotkey captures remain immediate.

### Library views

The Module header view switch (tutorial target `screenshots.viewSwitch`) offers two layouts, remembered across launches: `screenshots.view.thumbnails` (card grid, default) and `screenshots.view.details` (table with `screenshots.details.type`, `screenshots.details.dimensions`, `screenshots.details.size`, and `screenshots.details.date` columns). The default cosmetic preferences are Date descending for `screenshots.sort.label` and Date for `screenshots.group.label`; both controls remember later changes in `localStorage`. Sort supports Name, Date, or Type in either direction. Group supports Name, Date, Type, Size, Date created, Date modified, Date taken, or Dimensions. Listing is paginated; `screenshots.loadMore` fetches the next page. The library (tutorial target `screenshots.library`) re-reads the folder on every Module activation, so files added or removed outside KKTerm show up on return.

Single-click selects an item, Ctrl/Cmd-click toggles it, Shift-click extends a range, and double-click opens the unified image viewer/editor. Right-click preserves the current multi-selection when the clicked item is already selected. The native context menu provides the single-item actions `common.open`, `common.edit`, `screenshots.menu.openExternal`, `screenshots.menu.copy`, `screenshots.menu.reveal`, and `screenshots.menu.rename`, plus `screenshots.batch.resize`, `screenshots.batch.convert`, and selection-based delete. Open and Edit enter the same unified dialog. Resize and conversion save new copies and leave originals unchanged. Delete confirms through the standard confirmation sheet and permanently removes the selected files. The toolbar's icon-only `screenshots.openFolder` and `common.refresh` actions open the library folder and reload it.

The unified dialog uses the shared `Sheet`, opens at 80% of the app window, and can be resized from its bottom-right handle (`screenshots.editor.resizeDialog`). Its icon-only top toolbar contains previous/next, `screenshots.editor.undo`, `screenshots.menu.copy`, `screenshots.menu.openExternal`, `screenshots.menu.reveal`, delete, pan, annotation tools, and zoom controls. The hand-shaped `screenshots.editor.pan` tool sits immediately before `screenshots.editor.arrow` and drags the scrollable image viewport without changing the image. Dimensions and file size stay centered in the bottom bar. It starts in Fit mode so the complete image remains inside the available stage without scrollbars; `workspace.fileViewer.zoomOut`, `workspace.fileViewer.zoomIn`, and `workspace.fileViewer.fit` provide 25–200% zoom with scrolling at explicit sizes. It can place `screenshots.editor.arrow`, `screenshots.editor.rectangle`, `screenshots.editor.ellipse`, and formatted `screenshots.editor.text` annotations or pixelate a dragged region with `screenshots.editor.mosaic`. The text mini editor controls the text, app/generic font family, size, custom color, and bold weight. Save creates a new PNG copy in the library and does not overwrite the original. Closing or navigating to the previous/next screenshot with edits opens `screenshots.editor.unsavedTitle`, offering Save, `screenshots.editor.dontSave`, or Cancel; Cancel keeps the current screenshot open.

### Tray captures and global shortcuts

The tray icon menu carries the same three capture items (`screenshots.captureRegion`, `screenshots.captureWindow`, `screenshots.captureFullscreen`) and shows each currently enabled shortcut beside its command. They work while the main window is hidden in the tray, and the window stays hidden after the capture.

Settings → `settings.sectionScreenshots` → `settings.screenshotsShortcuts` defines three system-wide capture hotkeys (defaults `Ctrl+Alt+R` region, `Ctrl+Alt+W` window, `Ctrl+Alt+F` fullscreen). The same three bindings also appear in Settings → Shortcuts and share one draft, so editing either location updates the other immediately. Click a binding and press a valid key combination to replace and enable it; Escape or focus loss cancels recording. The per-row `settings.shortcutClear` action clears and disables a binding. Registration conflicts with other applications are reported when saving.

### Screenshots settings

Settings → `settings.sectionScreenshots` owns the library folder (`settings.screenshotsFolder`, default: the platform Pictures/Screenshots folder), Capture Mode (`settings.screenshotsCaptureMode`: folder, clipboard, or Both by default), image format (`settings.screenshotsFormat`: PNG by default or JPEG), the shared 1–100 `settings.screenshotsQuality` control, Windows-only DirectX capture acceleration (`settings.useDirectxScreenCapture`), and the global shortcuts. JPEG interprets Quality as lossy image quality. PNG remains lossless and maps Quality to compression effort.

## Capture from a Pane

Each workspace surface exposes a screenshot toolbar menu (native Tauri context menu). The menu label is `workspace.takeScreenshot`. Variants:

- `workspace.copyRegion` — region capture → clipboard. Status `workspace.copied`.
- `workspace.copyEntirePanel` — whole window/Pane → clipboard.
- `workspace.sendRegionToAi` — region capture → AI Assistant input. Status `workspace.sentToAi`.
- `workspace.sendEntirePanelToAi` — whole Pane → AI Assistant input.

Tutorial target: `workspace.screenshotMenu`.

Region selection overlay accessible label: `workspace.selectRegion`. Generic noun: `workspace.screenshot`.

Per-surface "screenshot target" labels used in dialog headings:

- SFTP: `sftp.screenshotTarget`
- WebView (URL Connections): `webview.screenshotTarget`; direct toolbar send uses tutorial target `webview.sendToAi`.

Failure: `workspace.screenshotCaptureError`. Outside the Tauri runtime: `workspace.screenshotsRequireRuntime`.

## Capture targets

Pane captures are transient by design: a capture is either copied to the clipboard or attached to the AI Assistant context; they do not enter the Screenshots Module library. Screenshots Module region/window/fullscreen actions follow Capture Mode and can save to the library, copy to the clipboard, or do both.

## RDP screenshots

RDP captures use a dedicated typed Tauri command that asks the OS for the visible RDP host bitmap, because the native HWND behind RDP cannot be composited into a normal DOM screenshot. URL Connections use the standard capture path; while `workspace.selectRegion` is active, the URL overlay WebView2 is hidden behind a captured placeholder so the Region controls stay above it. Do not generalise the RDP screenshot code path to other surfaces — see [09-remote-desktop.md](09-remote-desktop.md).

On macOS, RDP renders through the IronRDP canvas path, so RDP and VNC screenshots are cropped from the mounted remote-desktop canvas instead of using the Windows-only OS capture command.
