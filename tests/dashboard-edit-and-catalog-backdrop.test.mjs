import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Dashboard edit action is labeled Edit and catalog backdrop matches Settings blur", async () => {
  const [localeSource, dashboardCss, settingsCss] = await Promise.all([
    readFile(new URL("../src/i18n/locales/en.json", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/dashboard/dashboard.css", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/settings/settings.css", import.meta.url), "utf8"),
  ]);
  const locale = JSON.parse(localeSource);

  assert.equal(locale.dashboard.editLayout, "Edit");

  const catalogBackdrop = dashboardCss.match(/\.dw-catalog-backdrop\s*\{(?<body>[\s\S]*?)\n\}/)
    ?.groups?.body;
  const settingsBackdrop = settingsCss.match(/\.settings-backdrop\s*\{(?<body>[\s\S]*?)\n\}/)
    ?.groups?.body;

  assert.ok(catalogBackdrop, "Dashboard catalog backdrop CSS should exist");
  assert.ok(settingsBackdrop, "Settings backdrop CSS should exist");
  assert.match(settingsBackdrop, /backdrop-filter:\s*blur\(1px\);/);
  assert.match(catalogBackdrop, /backdrop-filter:\s*blur\(1px\);/);
  assert.doesNotMatch(catalogBackdrop, /backdrop-filter:\s*blur\(8px\);/);
});

test("Dashboard catalog dialog uses a compact shadow", async () => {
  const dashboardCss = await readFile(new URL("../src/modules/dashboard/dashboard.css", import.meta.url), "utf8");
  const catalog = dashboardCss.match(/\.dw-catalog\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body;

  assert.ok(catalog, "Dashboard catalog dialog CSS should exist");
  assert.doesNotMatch(catalog, /0\s+30px\s+80px\s+-20px\s+rgb\(0 0 0 \/ 25%\)/);
  assert.match(catalog, /0\s+18px\s+44px\s+-28px\s+rgb\(0 0 0 \/ 14%\)/);
});
