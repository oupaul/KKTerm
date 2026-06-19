import assert from "node:assert/strict";
import test from "node:test";

import {
  getRecommendedFontOptions,
  refreshSharedFontCatalog,
  subscribeSystemFontCatalog,
  systemFontCatalogSnapshot,
} from "../src/lib/fontCatalog.ts";

test("recommended font options follow the current platform", () => {
  const macUi = getRecommendedFontOptions("app-ui", "macos").map((option) => option.family);
  const macTerminal = getRecommendedFontOptions("terminal", "macos").map((option) => option.family);
  const linuxUi = getRecommendedFontOptions("app-ui", "linux").map((option) => option.family);
  const linuxTerminal = getRecommendedFontOptions("terminal", "linux").map((option) => option.family);

  assert.deepEqual(macUi, [undefined, "Inter", "SF Pro Text", "Helvetica Neue"]);
  assert.deepEqual(macTerminal, [undefined, "SF Mono", "Menlo", "JetBrains Mono", "Fira Code"]);
  assert.deepEqual(linuxUi, [undefined, "Inter", "Adwaita Sans", "Ubuntu Sans", "Cantarell", "Noto Sans"]);
  assert.deepEqual(linuxTerminal, [
    undefined,
    "Adwaita Mono",
    "Ubuntu Mono",
    "JetBrains Mono",
    "Fira Code",
    "Source Code Pro",
    "DejaVu Sans Mono",
  ]);
});

test("known system fonts prune unavailable recommendations but preserve defaults and bundled Inter", () => {
  const options = getRecommendedFontOptions("app-ui", "linux", ["Ubuntu Sans"]);

  assert.deepEqual(options.map((option) => option.family), [undefined, "Inter", "Ubuntu Sans"]);
});

test("one refresh publishes system and custom fonts to every subscriber", async () => {
  let notifications = 0;
  assert.equal(systemFontCatalogSnapshot().recommendationsSynced, false);
  const unsubscribeA = subscribeSystemFontCatalog(() => notifications += 1);
  const unsubscribeB = subscribeSystemFontCatalog(() => notifications += 1);

  try {
    await refreshSharedFontCatalog(
      async () => ["SF Mono", "Menlo"],
      async () => [{
        cssFamily: "kkterm-custom-test",
        cssValue: '"kkterm-custom-test", "Test Font", sans-serif',
        name: "Test Font",
        path: "C:/fonts/TestFont.otf",
      }],
    );
    assert.deepEqual(systemFontCatalogSnapshot().systemFonts, ["SF Mono", "Menlo"]);
    assert.deepEqual(systemFontCatalogSnapshot().customFonts.map((font) => font.name), ["Test Font"]);
    assert.equal(systemFontCatalogSnapshot().refreshing, false);
    assert.equal(systemFontCatalogSnapshot().recommendationsSynced, true);
    assert.equal(notifications, 4);
  } finally {
    unsubscribeA();
    unsubscribeB();
  }
});
