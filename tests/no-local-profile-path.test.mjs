import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("frontend defaults and locale examples do not expose a local developer profile path", async () => {
  const sources = await Promise.all([
    readFile(new URL("../src/app-defaults.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/i18n/locales/en.json", import.meta.url), "utf8"),
  ]);
  const localDeveloperProfilePattern = new RegExp(
    String.raw`C:\\Users\\` + "ryan",
    "i",
  );

  for (const source of sources) {
    assert.doesNotMatch(source, localDeveloperProfilePattern);
  }
});
