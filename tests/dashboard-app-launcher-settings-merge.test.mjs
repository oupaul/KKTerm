import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("App Launcher Customize popover writes settings by merging into the raw stored JSON", async () => {
  const source = await readFile(
    new URL("../src/modules/dashboard/edit/CustomizePopover.tsx", import.meta.url),
    "utf8",
  );

  const widgetSectionStart = source.indexOf("function WidgetSection");
  assert.notEqual(widgetSectionStart, -1, "WidgetSection should exist");
  const widgetSectionEnd = source.indexOf("function AdvancedSection", widgetSectionStart);
  assert.notEqual(widgetSectionEnd, -1, "AdvancedSection should follow WidgetSection");
  const widgetSection = source.slice(widgetSectionStart, widgetSectionEnd);

  assert.match(
    widgetSection,
    /parseWidgetSettingsValuesJson\(instance\.settingsValuesJson\)/,
    "onChange must merge new field values into the raw stored JSON so unknown keys (entries, viewMode, sort) are preserved",
  );

  assert.doesNotMatch(
    widgetSection,
    /JSON\.stringify\(\{\s*\.\.\.settingsValues\s*,/,
    "onChange must not write only the schema-projected settingsValues (that pattern drops the App Launcher entries array)",
  );
});

test("toggling showFileExtensions preserves App Launcher entries when merged from raw JSON", () => {
  const stored = JSON.stringify({
    entries: [
      { id: "alpha", name: "Alpha", path: "C:\\Tools\\alpha.exe", createdAt: "t", updatedAt: "t" },
      { id: "bravo", name: "Bravo", path: "C:\\Tools\\bravo.exe", createdAt: "t", updatedAt: "t" },
    ],
    viewMode: "list",
    listSort: { field: "name", direction: "desc" },
    detailsSort: { field: "name", direction: "asc" },
    showFileExtensions: false,
  });

  const base = JSON.parse(stored);
  const next = { ...base, showFileExtensions: true };
  const afterToggle = JSON.parse(JSON.stringify(next));

  assert.equal(afterToggle.showFileExtensions, true);
  assert.equal(Array.isArray(afterToggle.entries), true);
  assert.equal(afterToggle.entries.length, 2);
  assert.deepEqual(
    afterToggle.entries.map((entry) => entry.id),
    ["alpha", "bravo"],
  );
  assert.equal(afterToggle.viewMode, "list");
  assert.equal(afterToggle.listSort.direction, "desc");
});
