import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const activityRailSource = await readFile(
  new URL("../src/app/ActivityRail.tsx", import.meta.url),
  "utf8",
);
const settingsPageSource = await readFile(
  new URL("../src/modules/settings/SettingsPage.tsx", import.meta.url),
  "utf8",
);
const appCss = await readFile(new URL("../src/app/app.css", import.meta.url), "utf8");
const workspaceCss = await readFile(
  new URL("../src/modules/workspace/workspace.css", import.meta.url),
  "utf8",
);
const statusBarSource = await readFile(
  new URL("../src/modules/workspace/StatusBar.tsx", import.meta.url),
  "utf8",
);
const nativeOverlaySource = await readFile(
  new URL("../src/modules/workspace/nativeOverlay.ts", import.meta.url),
  "utf8",
);
const localeEn = JSON.parse(
  await readFile(new URL("../src/i18n/locales/en.json", import.meta.url), "utf8"),
);
const localeZhTw = JSON.parse(
  await readFile(new URL("../src/i18n/locales/zh-TW.json", import.meta.url), "utf8"),
);
const defaultsSource = await readFile(
  new URL("../src/app-defaults.ts", import.meta.url),
  "utf8",
);

test("Don't Sleep rail uses state-specific tooltip copy and shared Pulse status popup", () => {
  assert.equal(
    localeEn.app.dontSleepEnabledTooltip,
    "Don't Sleep enabled, click to disable",
  );
  assert.equal(
    localeEn.app.dontSleepDisabledTooltip,
    "Don't Sleep disabled, clicked to enable",
  );
  assert.equal(localeZhTw.app.dontSleepEnabledTooltip, "不讓你睡啓用中！按一下停用");
  assert.equal(localeZhTw.app.dontSleepDisabledTooltip, "不讓你睡停用中！按一下啓用");
  assert.doesNotMatch(activityRailSource, /assets\/dontsleep/);
  assert.match(activityRailSource, /RailTooltip label=\{dontSleepTooltip\}/);
  assert.doesNotMatch(activityRailSource, /dontSleepAnimation|dont-sleep-animation/);
  assert.doesNotMatch(appCss, /dont-sleep-animation/);
  assert.match(appCss, /\.rail-button-dont-sleep\.dont-sleep-enabled svg[\s\S]*color:\s*var\(--green\);[\s\S]*stroke:\s*currentColor;/);
  assert.match(statusBarSource, /function StatusNoticePopup/);
  for (const iconName of ["CircleCheck", "Info", "TriangleAlert", "CircleX"]) {
    assert.match(statusBarSource, new RegExp(`\\b${iconName}\\b`));
  }
  assert.match(workspaceCss, /\.status-popup-pulse[\s\S]*blur\(24px\) saturate\(180%\)/);
  assert.match(workspaceCss, /@keyframes status-popup-enter-pulse[\s\S]*translateY\(12px\) scale\(0\.78\)/);
  assert.match(workspaceCss, /\.status-bar-notice-area[\s\S]*bottom:\s*28px;[\s\S]*z-index:\s*9999;/);
  assert.match(nativeOverlaySource, /"\.status-bar-notice-area"/);
});

test("Don't Sleep has its own foreground-only Settings section", () => {
  assert.match(defaultsSource, /dontSleepForegroundOnly:\s*true/);
  assert.equal(localeEn.settings.sectionDontSleep, "Don't Sleep");
  assert.equal(
    localeEn.settings.dontSleepForegroundOnly,
    "Enable Don't Sleep only when app is in foreground",
  );
  assert.match(settingsPageSource, /"dont-sleep-settings"/);
  assert.match(settingsPageSource, /<DontSleepSettings \/>/);
  assert.match(
    settingsPageSource,
    /id: "vnc-settings"[\s\S]*id: "dont-sleep-settings"[\s\S]*id: "about-settings"/,
  );
});
