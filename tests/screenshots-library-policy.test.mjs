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
  const [editor, page] = await Promise.all([
    read("src/modules/screenshots/ScreenshotEditor.tsx"),
    read("src/modules/screenshots/ScreenshotsPage.tsx"),
  ]);

  for (const tool of ["arrow", "rectangle", "ellipse", "text", "mosaic"]) {
    assert.match(editor, new RegExp(`id: "${tool}"`));
  }
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
});
