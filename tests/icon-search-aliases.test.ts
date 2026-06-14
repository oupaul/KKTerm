import assert from "node:assert/strict";
import test from "node:test";

import { searchMaterialIcons } from "../src/lib/iconCatalog.ts";
import { buildIconSearchGroups } from "../src/lib/iconSearchAliases.ts";

test("English (and unknown languages) keep one raw token per group", () => {
  assert.deepEqual(buildIconSearchGroups("folder server"), [["folder"], ["server"]]);
  assert.deepEqual(buildIconSearchGroups("folder server", "en"), [["folder"], ["server"]]);
});

test("localized words expand to the catalog's English keywords", () => {
  // Traditional Chinese "資料夾" => folder
  const zhTw = buildIconSearchGroups("資料夾", "zh-TW");
  assert.equal(zhTw.length, 1);
  assert.ok(zhTw[0].includes("folder"), "資料夾 should map to folder");

  // Spanish "carpeta" => folder
  assert.ok(buildIconSearchGroups("carpeta", "es")[0]?.includes("folder"));

  // Regional codes fall back to the base language (es-MX -> es).
  assert.ok(buildIconSearchGroups("carpeta", "es-MX")[0]?.includes("folder"));
});

test("material search finds icons by a localized query", () => {
  const englishHits = searchMaterialIcons("folder", 200);
  assert.ok(englishHits.length > 0, "sanity: folder matches in English");

  const localizedHits = searchMaterialIcons("資料夾", 200, "zh-TW");
  assert.ok(
    localizedHits.some((icon) => englishHits.some((hit) => hit.id === icon.id)),
    "Chinese 資料夾 should surface the same folder icons as English folder",
  );
});

test("unmapped localized text does not match everything", () => {
  // A token with no alias stays literal, so a nonsense string finds nothing.
  assert.equal(searchMaterialIcons("zzzznotarealicon", 50, "zh-TW").length, 0);
});

test("search is bilingual: English works under a non-English UI", () => {
  // A user on a non-English UI can still search in English; the raw token is
  // kept and matches the English catalog directly.
  assert.deepEqual(buildIconSearchGroups("folder", "zh-TW"), [["folder"]]);
  assert.deepEqual(buildIconSearchGroups("settings", "ja"), [["settings"]]);
  assert.ok(searchMaterialIcons("folder", 200, "zh-TW").length > 0);
  assert.ok(searchMaterialIcons("database", 200, "vi").length > 0);
});

test("multi-word localized phrases resolve as a unit", () => {
  // Greedy longest-match so the phrase maps to its concept instead of each word
  // colliding with unrelated concepts (e.g. vi "thư" alone means mail).
  const vi = buildIconSearchGroups("thư mục", "vi");
  assert.equal(vi.length, 1, "the two-word phrase should form a single group");
  assert.ok(vi[0].includes("folder"), "thư mục should map to folder");

  const es = buildIconSearchGroups("base de datos", "es");
  assert.equal(es.length, 1);
  assert.ok(es[0].includes("database"));

  const englishFolder = searchMaterialIcons("folder", 300).map((icon) => icon.id);
  assert.ok(
    searchMaterialIcons("thư mục", 300, "vi").some((icon) => englishFolder.includes(icon.id)),
    "Vietnamese thư mục should surface the same folder icons as English folder",
  );
});
