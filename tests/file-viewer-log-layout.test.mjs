import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
  new URL("../src/modules/workspace/connections/file-viewer/file-viewer.css", import.meta.url),
  "utf8",
);

test("log viewer line-number column is content-sized instead of fixed wide", () => {
  assert.match(css, /\.fv-logrow\s*\{[\s\S]*grid-template-columns:\s*max-content\s+minmax\(0,\s*max-content\)\s+minmax\(0,\s*1fr\)/);
  assert.doesNotMatch(css, /\.fv-logrow\s*\{[\s\S]*grid-template-columns:\s*52px\s+58px\s+1fr/);
  assert.doesNotMatch(css, /\.fv-logrow\s*\{[\s\S]*grid-template-columns:\s*max-content\s+46px\s+minmax\(0,\s*1fr\)/);
});

test("Document status bar text is centered in the global status bar", () => {
  const rule = css.match(/\.status-bar-document\s*\{(?<body>[\s\S]*?)\}/)?.groups?.body ?? "";
  assert.match(rule, /justify-content:\s*center;/);
});
