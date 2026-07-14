import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KuaiKuaiBag, kuaiKuaiNoteLines } from "../src/modules/itops/KuaiKuaiBag";

test("kuaiKuaiNoteLines is empty for missing or blank notes", () => {
  assert.deepEqual(kuaiKuaiNoteLines(null), []);
  assert.deepEqual(kuaiKuaiNoteLines(""), []);
  assert.deepEqual(kuaiKuaiNoteLines("   \n  \n"), []);
});

test("kuaiKuaiNoteLines keeps short notes and user line breaks", () => {
  assert.deepEqual(kuaiKuaiNoteLines("no crash"), ["no crash"]);
  assert.deepEqual(kuaiKuaiNoteLines("swapped PSU\r\n2026-07-01"), ["swapped PSU", "2026-07-01"]);
});

test("kuaiKuaiNoteLines wraps long latin text at word boundaries", () => {
  const lines = kuaiKuaiNoteLines("replaced the failing fan tray after the last maintenance window");
  assert.ok(lines.length > 1, `expected wrapping, got ${JSON.stringify(lines)}`);
  // No word is split mid-way: rejoining on spaces reproduces the original.
  assert.equal(lines.join(" "), "replaced the failing fan tray after the last maintenance window");
});

test("kuaiKuaiNoteLines wraps CJK notes per character", () => {
  const lines = kuaiKuaiNoteLines("乖乖保佑機房平安順利不當機".repeat(3));
  assert.ok(lines.length > 1, `expected wrapping, got ${JSON.stringify(lines)}`);
  assert.ok(lines[0].length <= 16, `expected ~15 CJK chars per line, got ${lines[0].length}`);
});

test("kuaiKuaiNoteLines caps at three ruled lines with an ellipsis", () => {
  const lines = kuaiKuaiNoteLines("one\ntwo\nthree\nfour");
  assert.equal(lines.length, 3);
  assert.deepEqual(lines.slice(0, 2), ["one", "two"]);
  assert.ok(lines[2].endsWith("…"), `expected ellipsis, got ${JSON.stringify(lines[2])}`);
});

test("KuaiKuaiBag scribbles notes onto the white note panel", () => {
  const withNotes = renderToStaticMarkup(createElement(KuaiKuaiBag, { notes: "guard the uptime" }));
  assert.match(withNotes, /kk-bag-notes/);
  assert.match(withNotes, /guard the uptime/);
  const without = renderToStaticMarkup(createElement(KuaiKuaiBag, {}));
  assert.doesNotMatch(without, /kk-bag-notes/);
});
