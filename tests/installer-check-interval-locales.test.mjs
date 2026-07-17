import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("every Install Helper check interval has a label in every locale", async () => {
  const intervalSource = await readFile(
    new URL("../src/modules/installer/checkInterval.ts", import.meta.url),
    "utf8",
  );
  const optionList = intervalSource.match(
    /INSTALLER_CHECK_INTERVAL_OPTIONS\s*=\s*\[([^\]]+)\]/,
  );
  assert.ok(optionList, "Install Helper interval catalog should remain discoverable");

  const intervals = [...optionList[1].matchAll(/^\s*(\d[\d_]*)/gm)].map((match) =>
    Number(match[1].replaceAll("_", "")),
  );
  assert.deepEqual(intervals, [3600, 86400, 604800, 2592000]);

  const localeDirectory = new URL("../src/i18n/locales/", import.meta.url);
  const localeFiles = (await readdir(localeDirectory)).filter((name) => name.endsWith(".json"));
  assert.equal(localeFiles.length, 14);

  for (const localeFile of localeFiles) {
    const locale = JSON.parse(await readFile(new URL(localeFile, localeDirectory), "utf8"));
    for (const seconds of intervals) {
      const key = `installerCheckInterval${seconds}`;
      assert.equal(
        typeof locale.settings[key],
        "string",
        `${localeFile} is missing settings.${key}`,
      );
      assert.notEqual(locale.settings[key], `settings.${key}`);
    }
  }
});
