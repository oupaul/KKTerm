// Source guard for the macOS overlay title-bar wiring (Option B). This invariant
// spans three files that must stay in agreement, and the regressions are subtle
// and silent (e.g. re-adding an unconditional `set_decorations(false)` would
// erase the native traffic lights on macOS without breaking any other test).
// There is no JS-reachable behavior to assert for the Rust side, so this checks
// the source wiring directly, in the spirit of titlebar-app-icon.test.mjs.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("macOS keeps native window controls via the overlay title bar", async () => {
  const [titleBar, lib, windowEffects] = await Promise.all([
    readFile(new URL("../src/app/TitleBar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src-tauri/src/lib.rs", import.meta.url), "utf8"),
    readFile(new URL("../src-tauri/src/window_effects.rs", import.meta.url), "utf8"),
  ]);

  // Frontend: the custom min/max/close buttons are gated so macOS shows none of
  // them (the native traffic lights replace them).
  assert.match(
    titleBar,
    /usesNativeWindowControls/,
    "TitleBar must decide window-control rendering from usesNativeWindowControls()",
  );

  // Rust builder: macOS uses the overlay title-bar style + hidden title instead
  // of dropping decorations.
  assert.match(
    lib,
    /#\[cfg\(target_os = "macos"\)\][\s\S]*?title_bar_style\(\s*tauri::TitleBarStyle::Overlay\s*\)[\s\S]*?hidden_title\(true\)/,
    "main window must use the Overlay title-bar style with a hidden title on macOS",
  );
  assert.match(
    lib,
    /#\[cfg\(not\(target_os = "macos"\)\)\][\s\S]*?\.decorations\(false\)/,
    "non-macOS platforms must still drop system decorations for the custom bar",
  );

  // Runtime helper: decorations must NOT be stripped on macOS, otherwise the
  // overlay style is undone and the traffic lights disappear.
  assert.match(
    windowEffects,
    /#\[cfg\(not\(target_os = "macos"\)\)\]\s*\n\s*if let Err\(error\) = window\.set_decorations\(false\)/,
    "apply_title_bar_mode must only strip decorations off macOS",
  );
});
