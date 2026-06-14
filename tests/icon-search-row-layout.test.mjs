import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Regression guard: dialog form-field labels use a stacked grid layout
// (`.connection-dialog label { display: grid }`). The icon-picker search is a
// `<label class="search-box icon-library-search">`, so without a more specific
// override it inherits that grid and stacks the magnifier above the input,
// which clips/overflows the typed text. A `label.search-box` override must keep
// search boxes laid out as a horizontal flex row.
test("search-box labels stay a horizontal flex row inside dialogs", async () => {
  const baseCss = await readFile(
    new URL("../src/styles/base.css", import.meta.url),
    "utf8",
  );

  assert.match(
    baseCss,
    /\.connection-dialog label,\s*\.settings-section label\s*\{[^}]*display:\s*grid/,
    "form-field labels are expected to use a stacked grid (the cause of the bug)",
  );

  const overrideMatch = baseCss.match(
    /\.connection-dialog label\.search-box,\s*\.settings-section label\.search-box\s*\{([^}]*)\}/,
  );
  assert.ok(overrideMatch, "a label.search-box override should exist");
  assert.match(
    overrideMatch[1],
    /display:\s*flex/,
    "search boxes must be forced back to a horizontal flex row",
  );
});
