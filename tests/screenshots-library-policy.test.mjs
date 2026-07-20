import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Screenshots Module exposes only thumbnail and details views", async () => {
  const [page, library, styles] = await Promise.all([
    read("src/modules/screenshots/ScreenshotsPage.tsx"),
    read("src/modules/screenshots/LibraryView.tsx"),
    read("src/modules/screenshots/screenshots.css"),
  ]);

  assert.match(library, /ScreenshotsViewMode = "thumbnails" \| "details"/);
  assert.doesNotMatch(page, /changeViewMode\("list"\)/);
  assert.doesNotMatch(page, /screenshots\.clearAll/);
  assert.match(page, /screenshots\.sort\.label/);
  assert.match(page, /screenshots\.group\.label/);
  assert.match(page, /return \{ by: "date", direction: "desc" \}/);
  assert.match(page, /\? value\s*:\s*"date"/);
  assert.match(page, /persist\(SORT_STORAGE_KEY/);
  assert.match(page, /persist\(GROUP_STORAGE_KEY/);
  assert.doesNotMatch(styles, /screenshots-header-toolbar select:focus-visible[\s\S]*?var\(--accent\)/);
  assert.match(styles, /screenshots-toolbar-select option:checked/);
});

test("capture delay and selection-based batch actions stay connected", async () => {
  const [page, bridge, state, tauri] = await Promise.all([
    read("src/modules/screenshots/ScreenshotsPage.tsx"),
    read("src/modules/screenshots/captureBridge.ts"),
    read("src/modules/screenshots/state.ts"),
    read("src/lib/tauri.ts"),
  ]);

  assert.match(page, /CAPTURE_DELAYS = \[0, 3, 5, 15, 30, 60\]/);
  assert.match(page, /performScreenshotCapture\(mode, t, captureDelay\)/);
  assert.match(bridge, /delaySeconds \* 1000/);
  assert.match(state, /refreshGeneration/);
  assert.match(state, /generation !== refreshGeneration/);
  assert.match(page, /delete_screenshots/);
  assert.match(page, /ResizeScreenshotsDialog/);
  assert.match(page, /ConvertScreenshotsDialog/);
  assert.match(tauri, /resize_screenshots:/);
  assert.match(tauri, /convert_screenshots:/);
  assert.match(tauri, /save_edited_screenshot:/);
});

test("unified screenshot dialog follows the Sheet contract and bounds image zoom", async () => {
  const [editor, page, styles] = await Promise.all([
    read("src/modules/screenshots/ScreenshotEditor.tsx"),
    read("src/modules/screenshots/ScreenshotsPage.tsx"),
    read("src/modules/screenshots/screenshots.css"),
  ]);

  for (const tool of ["pan", "arrow", "rectangle", "ellipse", "text", "mosaic"]) {
    assert.match(editor, new RegExp(`id: "${tool}"`));
  }
  assert.match(editor, /id: "pan", icon: Hand[\s\S]*?id: "arrow"/);
  assert.match(editor, /stage\.scrollLeft = pan\.scrollLeft/);
  assert.match(editor, /stage\.scrollTop = pan\.scrollTop/);
  assert.match(editor, /<Sheet/);
  assert.match(editor, /<Actions/);
  assert.match(editor, /ZOOM_STEPS = \[25, 50, 75, 100, 125, 150, 200\]/);
  assert.match(editor, /setZoom\("fit"\)/);
  assert.match(editor, /screenshots-editor__canvas-wrap/);
  assert.match(editor, /hasPrevious/);
  assert.doesNotMatch(page, /ScreenshotViewer/);
  assert.doesNotMatch(page, /editorTarget/);
  assert.match(editor, /save_edited_screenshot/);
  assert.match(editor, /unique|toDataURL\("image\/png"\)/);
  assert.match(editor, /window\.innerWidth \* 0\.8/);
  assert.match(editor, /screenshots-editor__resizer/);
  assert.match(editor, /<ColorPalettePicker/);
  assert.doesNotMatch(editor, /zoom === "fit" \? t\("workspace\.fileViewer\.fit"\)/);
  assert.match(editor, /screenshots\.editor\.unsavedTitle/);
  assert.match(editor, /zClassName="kk-qc-subdialog"/);
  assert.match(editor, /onClose=\{requestClose\}/);
  assert.match(editor, /type PendingEditorAction = "close" \| -1 \| 1/);
  assert.match(editor, /function requestNavigation\(direction: -1 \| 1\)/);
  assert.doesNotMatch(editor, /disabled=\{!hasPrevious \|\| dirty \|\| saving\}/);
  assert.doesNotMatch(editor, /disabled=\{!hasNext \|\| dirty \|\| saving\}/);
  assert.match(editor, /onCancel=\{\(\) => setPendingAction\(null\)\}/);
  assert.match(page, /setViewerId\(navigationTarget\?\.id \?\? null\)/);
  assert.match(styles, /screenshots-editor__canvas-wrap \{[\s\S]*?box-sizing: border-box/);
  assert.match(styles, /screenshots-editor__footer-meta[\s\S]*left: 50%/);
});

test("macOS and Linux screenshot delivery use xcap-backed images and native image clipboard support", async () => {
  const [backend, cargo] = await Promise.all([
    read("src-tauri/src/screenshot.rs"),
    read("src-tauri/Cargo.toml"),
  ]);

  assert.doesNotMatch(backend, /screenshot capture is currently available on Windows/);
  assert.doesNotMatch(backend, /screenshot clipboard is currently available on Windows/);
  assert.match(backend, /capture_fullscreen_to_library[\s\S]*capture_engine::capture_virtual_screen/);
  assert.match(backend, /capture_focused_window_image/);
  assert.match(backend, /capture_macos_selection/);
  assert.match(backend, /capture_linux_region_selection/);
  assert.match(backend, /org\.freedesktop\.portal\.Screenshot/);
  assert.match(backend, /"interactive", Value::from\(true\)/);
  assert.match(backend, /arboard::ImageData/);
  assert.match(cargo, /arboard = \{ version = "3\.6\.1"/);
});

test("Windows native screenshot selection paints dimmed frames atomically", async () => {
  const backend = await read("src-tauri/src/screenshot.rs");

  assert.match(backend, /BeginBufferedPaint/);
  assert.match(backend, /EndBufferedPaint/);
  assert.match(backend, /AlphaBlend/);
  assert.match(backend, /SourceConstantAlpha: SCREENSHOT_DIM_ALPHA/);
  assert.match(backend, /if overlay\.hover != next_hover/);
});
