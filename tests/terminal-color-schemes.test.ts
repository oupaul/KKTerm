import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_TERMINAL_COLOR_SCHEME_ID,
  TERMINAL_COLOR_SCHEMES,
  hexColorWithAlpha,
  resolveTerminalColorScheme,
} from "../src/modules/workspace/connections/terminal/colorSchemes";

test("scheme ids are unique and include the built-in default", () => {
  const ids = TERMINAL_COLOR_SCHEMES.map((scheme) => scheme.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate scheme id");
  assert.ok(ids.includes(DEFAULT_TERMINAL_COLOR_SCHEME_ID));
});

test("every palette entry is a six-digit hex color", () => {
  for (const scheme of TERMINAL_COLOR_SCHEMES) {
    for (const [slot, value] of Object.entries(scheme.palette)) {
      assert.match(
        value,
        /^#[0-9a-f]{6}$/,
        `${scheme.id}.${slot} must be lowercase #rrggbb, got ${value}`,
      );
    }
  }
});

test("resolveTerminalColorScheme falls back to the KKTerm default", () => {
  assert.equal(resolveTerminalColorScheme(null).id, DEFAULT_TERMINAL_COLOR_SCHEME_ID);
  assert.equal(resolveTerminalColorScheme(undefined).id, DEFAULT_TERMINAL_COLOR_SCHEME_ID);
  assert.equal(resolveTerminalColorScheme("no-such-scheme").id, DEFAULT_TERMINAL_COLOR_SCHEME_ID);
  assert.equal(resolveTerminalColorScheme("dracula").id, "dracula");
});

test("hexColorWithAlpha converts hex and clamps alpha", () => {
  assert.equal(hexColorWithAlpha("#0c1219", 1), "rgba(12, 18, 25, 1)");
  assert.equal(hexColorWithAlpha("#ffffff", 0.5), "rgba(255, 255, 255, 0.5)");
  assert.equal(hexColorWithAlpha("#000000", 2), "rgba(0, 0, 0, 1)");
  assert.equal(hexColorWithAlpha("not-a-color", 0.5), "not-a-color");
});
