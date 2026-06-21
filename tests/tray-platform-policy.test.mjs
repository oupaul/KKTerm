import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("minimize-to-tray setting is Windows-only in Settings", async () => {
  const generalSettings = await readFile(
    new URL("../src/modules/settings/GeneralSettings.tsx", import.meta.url),
    "utf8",
  );

  assert.match(generalSettings, /supportsMinimizeToTray/);
  assert.match(
    generalSettings,
    /const\s+minimizeToTraySupported\s*=\s*supportsMinimizeToTray\(\)/,
  );
  assert.match(
    generalSettings,
    /const\s+showWindowSettings\s*=\s*windowsPlatform\s*\|\|\s*minimizeToTraySupported/,
  );
  assert.match(
    generalSettings,
    /showWindowSettings\s*\?\s*\([\s\S]*?<legend>\{t\("settings\.workspaceAccess"\)\}<\/legend>[\s\S]*?\)\s*:\s*null/,
  );
  assert.match(
    generalSettings,
    /minimizeToTraySupported\s*\?\s*\([\s\S]*?draft\.minimizeToTray[\s\S]*?\)\s*:\s*null/,
  );
});

test("macOS tray icon uses a template image", async () => {
  const appTray = await readFile(
    new URL("../src-tauri/src/app_tray.rs", import.meta.url),
    "utf8",
  );

  assert.match(appTray, /#\[cfg\(target_os = "macos"\)\]/);
  assert.match(appTray, /tray_template_icon/);
  assert.match(appTray, /\.icon_as_template\(true\)/);
  assert.match(appTray, /tray_icon\(app\)/);
  assert.match(appTray, /const WIDTH: usize = 24/);
  assert.match(appTray, /const HEIGHT: usize = 18/);
  assert.match(appTray, /"000110001100011000110000"/);
});
