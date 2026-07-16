import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSettingsSearchResults,
  SETTINGS_SEARCH_KEYS,
  type SettingsSearchSection,
} from "../src/modules/settings/settingsSearch";

const sections: readonly SettingsSearchSection[] = [
  {
    id: "general-settings",
    labelKey: "settings.sectionGeneral",
    searchKeys: ["settings.language"],
  },
  {
    id: "terminal-settings",
    labelKey: "settings.sectionTerminal",
    searchKeys: ["settings.fontFamily", "settings.fontSize"],
  },
];

const translations: Record<string, Record<string, string>> = {
  en: {
    "settings.sectionGeneral": "General",
    "settings.language": "Language",
    "settings.sectionTerminal": "Terminal",
    "settings.fontFamily": "Font family",
    "settings.fontFamilyHint": "Choose the typeface.",
    "settings.fontSize": "Font size",
  },
  "zh-TW": {
    "settings.sectionGeneral": "一般",
    "settings.language": "語言",
    "settings.sectionTerminal": "終端機",
    "settings.fontFamily": "字型系列",
    "settings.fontFamilyHint": "選擇顯示字型。",
    "settings.fontSize": "字型大小",
  },
};

function search(query: string) {
  return buildSettingsSearchResults({
    activeLanguage: "zh-TW",
    query,
    sections,
    translate: (key, language) => translations[language]?.[key] ?? key,
  });
}

test("Settings search matches English navigation labels in another UI language", () => {
  assert.deepEqual(search("terminal"), [{
    id: "terminal-settings",
    label: "終端機",
    matches: [],
  }]);
});

test("Settings search shows localized control hits under their owning section", () => {
  assert.deepEqual(search("font"), [{
    id: "terminal-settings",
    label: "終端機",
    matches: [
      { key: "settings.fontFamily", label: "字型系列" },
      { key: "settings.fontSize", label: "字型大小" },
    ],
  }]);
  assert.equal(search("語言")[0]?.id, "general-settings");
});

test("Settings search includes visible hint text in both languages", () => {
  assert.deepEqual(search("typeface")[0]?.matches, [{
    key: "settings.fontFamilyHint",
    label: "選擇顯示字型。",
  }]);
});

test("Settings search is case-insensitive and ignores diacritics", () => {
  const results = buildSettingsSearchResults({
    activeLanguage: "fr",
    query: "PARAMETRES",
    sections: [{
      id: "general-settings",
      labelKey: "settings.sectionGeneral",
      searchKeys: [],
    }],
    translate: (_key, language) => language === "en" ? "General" : "Paramètres",
  });

  assert.equal(results[0]?.label, "Paramètres");
});

test("every indexed Settings search key resolves to a string", () => {
  const locale = JSON.parse(readFileSync(
    new URL("../src/i18n/locales/en.json", import.meta.url),
    "utf8",
  ));
  const indexedKeys = Object.values(SETTINGS_SEARCH_KEYS).flat();

  for (const key of indexedKeys) {
    const value = key.split(".").reduce<unknown>((current, part) =>
      typeof current === "object" && current !== null
        ? (current as Record<string, unknown>)[part]
        : undefined,
    locale);
    assert.equal(typeof value, "string", `${key} must resolve to a string`);
  }
});

test("Settings sidebar shows a conditional clear action and routes result clicks", () => {
  const source = readFileSync(
    new URL("../src/modules/settings/SettingsPage.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /\{searchQuery \? \(\s*<button[\s\S]*?aria-label=\{t\("common\.clear"\)\}/);
  assert.match(source, /function clearSearch\(\)[\s\S]*?setSearchQuery\(""\)/);
  assert.match(source, /onClick=\{\(\) => handleSearchResultClick\(result\.id, match\.key\)\}/);
  assert.match(source, /onActiveSectionChange\(sectionId\)/);
});
