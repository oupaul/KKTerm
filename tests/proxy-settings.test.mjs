import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [proxySettings, generalSettings, settingsPage, assistantContext, navigationModel] =
  await Promise.all(
    [
      "../src/modules/settings/ProxySettings.tsx",
      "../src/modules/settings/GeneralSettings.tsx",
      "../src/modules/settings/SettingsPage.tsx",
      "../src/modules/settings/settingsAssistantContext.ts",
      "../src/app/tutorialNavigationModel.ts",
    ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );

test("Proxy has its own colored navigation section above About", () => {
  assert.match(settingsPage, /"proxy-settings"/);
  assert.match(
    settingsPage,
    /id: "proxy-settings", Icon: Waypoints, color: "#[0-9a-f]{6}", labelKey: "settings\.proxy"/i,
  );
  assert.match(
    settingsPage,
    /renderSettingsSection\("proxy-settings", <ProxySettings \/>\)/,
  );
  // Proxy must sit directly above About in the nav order.
  assert.match(
    settingsPage,
    /id: "proxy-settings",[\s\S]*?\n\s*\{ id: "about-settings"/,
  );
});

test("Proxy settings logic moved out of General and preserves explicit ports", () => {
  assert.doesNotMatch(generalSettings, /proxyMode|proxyUrl|splitAppProxy|proxyHost/);
  assert.match(
    proxySettings,
    /function explicitPortFromProxyValue\(value: string\)[\s\S]*authority\.startsWith\("\["\)[\s\S]*authority\.match\(\s*\/\^\\\[\[\^\\\]\]\+\\\]:\(\\d\+\)\$\/\s*\)/,
    "Proxy settings must extract explicit ports from raw bracketed IPv6 authorities.",
  );
  assert.match(
    proxySettings,
    /port:\s*explicitPortFromProxyValue\(value\)/,
    "Manual proxy editor must preserve explicit default ports such as :80 and :443 instead of using URL.port.",
  );
});

test("Proxy section follows UI conventions and is discoverable by the assistant", () => {
  // No icon in the fieldset legend, per the Settings page convention.
  assert.doesNotMatch(proxySettings, /<legend>\s*<[A-Z]/);
  assert.match(proxySettings, /data-tutorial-id="settings\.proxy"/);
  assert.match(assistantContext, /"proxy-settings"/);
  assert.match(navigationModel, /"settings\.proxy": "proxy-settings"/);
});
