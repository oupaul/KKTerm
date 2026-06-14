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
const coffeeSvg = await readFile(
  new URL("../src/assets/dontsleep/coffee.svg", import.meta.url),
  "utf8",
);
const sleepSvg = await readFile(
  new URL("../src/assets/dontsleep/sleep.svg", import.meta.url),
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

test("Don't Sleep rail uses state-specific tooltip copy and transition SVG assets", () => {
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
  assert.equal(localeEn.app.dontSleepAnimationEnabledLabel, "Enabled");
  assert.equal(localeEn.app.dontSleepAnimationDisabledLabel, "Disabled");
  assert.match(activityRailSource, /import coffeeAnimationUrl from "\.\.\/assets\/dontsleep\/coffee\.svg\?url";/);
  assert.match(activityRailSource, /import sleepAnimationUrl from "\.\.\/assets\/dontsleep\/sleep\.svg\?url";/);
  assert.match(activityRailSource, /RailTooltip label=\{dontSleepTooltip\}/);
  assert.match(activityRailSource, /dont-sleep-animation/);
  assert.match(activityRailSource, /dontSleepAnimation\.enabled[\s\S]*app\.dontSleepAnimationEnabledLabel[\s\S]*app\.dontSleepAnimationDisabledLabel/);
  assert.match(appCss, /\.dont-sleep-animation[\s\S]*left:\s*calc\(100% \+ 22px\);/);
  assert.match(appCss, /\.dont-sleep-animation-image[\s\S]*width:\s*40px;[\s\S]*height:\s*40px;/);
  assert.match(appCss, /\.dont-sleep-animation-label/);
  assert.match(appCss, /\.rail-button-dont-sleep\.dont-sleep-enabled svg[\s\S]*color:\s*var\(--green\);[\s\S]*stroke:\s*currentColor;/);
  assert.match(coffeeSvg, /viewBox="760 900 1550 1250"/);
  assert.match(coffeeSvg, /#15915f/);
  assert.match(coffeeSvg, /#34c759/);
  assert.match(sleepSvg, /viewBox="80 150 650 500"/);
  assert.match(sleepSvg, /#4b5563/);
  assert.doesNotMatch(sleepSvg, /#0066ff/i);
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
