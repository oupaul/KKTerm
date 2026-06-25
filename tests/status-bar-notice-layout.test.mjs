import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workspaceCss = await readFile(
  new URL("../src/modules/workspace/workspace.css", import.meta.url),
  "utf8",
);

test("status popup messages can wrap to three lines before truncation", () => {
  const rule = workspaceCss.match(/\.status-popup-message\s*\{(?<body>[\s\S]*?)\}/)
    ?.groups?.body;

  assert.ok(rule, "Expected a .status-popup-message CSS rule.");
  assert.match(rule, /display:\s*-webkit-box;/);
  assert.match(rule, /-webkit-line-clamp:\s*3;/);
  assert.match(rule, /-webkit-box-orient:\s*vertical;/);
  assert.match(rule, /white-space:\s*normal;/);
  assert.doesNotMatch(rule, /white-space:\s*nowrap;/);
});
