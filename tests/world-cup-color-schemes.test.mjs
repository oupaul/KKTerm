import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const worldCupSchemes = [
  ["canarinho", "settings.schemeCanarinho", "Canarinho"],
  ["la-albiceleste", "settings.schemeLaAlbiceleste", "La Albiceleste"],
  ["les-bleus", "settings.schemeLesBleus", "Les Bleus"],
  ["oranje", "settings.schemeOranje", "Oranje"],
  ["die-mannschaft", "settings.schemeDieMannschaft", "Die Mannschaft"],
  ["la-roja", "settings.schemeLaRoja", "La Roja"],
  ["os-navegadores", "settings.schemeOsNavegadores", "Os Navegadores"],
  ["vatreni", "settings.schemeVatreni", "Vatreni"],
  ["el-tri", "settings.schemeElTri", "El Tri"],
  ["three-lions", "settings.schemeThreeLions", "Three Lions"],
  ["samurai-blue", "settings.schemeSamuraiBlue", "Samurai Blue"],
  ["stars-and-stripes", "settings.schemeStarsAndStripes", "The Stars and Stripes"],
];

test("World Cup color schemes are registered across picker, CSS, labels, and storage", async () => {
  const [typesSource, gridSource, cssSource, localeSource, storageSource] = await Promise.all([
    readFile(new URL("../src/types.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/modules/settings/ThemeSchemeGrid.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/colorSchemes.css", import.meta.url), "utf8"),
    readFile(new URL("../src/i18n/locales/en.json", import.meta.url), "utf8"),
    readFile(new URL("../src-tauri/src/storage.rs", import.meta.url), "utf8"),
  ]);

  for (const [id, labelKey, label] of worldCupSchemes) {
    assert.match(typesSource, new RegExp(`\\| "${id}"`), `${id} should be part of ColorScheme`);
    assert.match(gridSource, new RegExp(`\\{ value: "${id}", labelKey: "${labelKey}" \\}`));
    assert.match(cssSource, new RegExp(`\\[data-color-scheme="${id}"\\]`));
    assert.match(localeSource, new RegExp(`"${labelKey.replace("settings.", "")}": "${label}"`));
    assert.match(storageSource, new RegExp(`"${id}"`), `${id} should be accepted by storage validation`);
  }

  assert.match(gridSource, /worldcup:\s*true/);
  assert.match(gridSource, /<WorldCupTrophy \/>/);
});
