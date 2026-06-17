import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const SUPPORTED_LOCALES = [
  "fr",
  "it",
  "de",
  "es",
  "es-MX",
  "pt-BR",
  "zh-TW",
  "zh-CN",
  "ja",
  "ko",
  "th",
  "id",
  "vi",
];

const catalog = JSON.parse(
  await readFile(new URL("../installer/catalog.v1.json", import.meta.url), "utf8"),
);

test("every Install Helper recipe has localized descriptions", () => {
  for (const recipe of catalog.recipes) {
    assert.equal(typeof recipe.descriptionEn, "string", `${recipe.id} should have English text`);
    assert.notEqual(recipe.descriptionEn.trim(), "", `${recipe.id} English text should not be empty`);
    assert.equal(
      typeof recipe.descriptionLocales,
      "object",
      `${recipe.id} should have descriptionLocales`,
    );

    for (const locale of SUPPORTED_LOCALES) {
      assert.equal(
        typeof recipe.descriptionLocales[locale],
        "string",
        `${recipe.id} should have ${locale} description`,
      );
      assert.notEqual(
        recipe.descriptionLocales[locale].trim(),
        "",
        `${recipe.id} ${locale} description should not be empty`,
      );
    }
  }
});
